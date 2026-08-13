import { kv } from '@vercel/kv';

// ── Configuration (all overridable via env vars) ────────────────────
const DEFAULT_ORIGINS = [
  'https://sportfields.vercel.app',
  'https://sgbtwrgmn554-art.github.io',
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
const ORIGINS = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : DEFAULT_ORIGINS;

const ALLOWED_MODELS = (process.env.ALLOWED_MODELS || 'claude-sonnet-4-6')
  .split(',')
  .map(m => m.trim())
  .filter(Boolean);

const num = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const MAX_TOKENS_CAP = num(process.env.AI_MAX_TOKENS, 1024);
const LIMIT_IP_HOUR = num(process.env.AI_LIMIT_IP_HOUR, 20);
const LIMIT_IP_DAY = num(process.env.AI_LIMIT_IP_DAY, 60);
const LIMIT_GLOBAL_DAY = num(process.env.AI_LIMIT_GLOBAL_DAY, 500);

// Request-shape limits — sized to what the app actually sends
const MAX_BODY_BYTES = 4_000_000;   // Vercel caps the request body at ~4.5MB
const MAX_MESSAGES = 12;
const MAX_IMAGES = 2;
const MAX_IMAGE_BYTES = 3_500_000;  // base64 length of a single image
const MAX_TEXT_CHARS = 20_000;      // total across all text blocks
const MAX_SYSTEM_CHARS = 4_000;
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ── CORS ────────────────────────────────────────────────────────────
function originOf(url) {
  try { return new URL(url).origin; } catch (e) { return null; }
}

// A browser sends Origin on every cross-origin request and on same-origin
// POSTs. Referer is only a fallback for webviews that omit Origin.
// This blocks other sites from using the proxy from a browser; it is not a
// defence against a scripted client, which the rate limits below handle.
function resolveOrigin(req) {
  const origin = (req.headers.origin || '').replace(/\/$/, '');
  if (origin) return ORIGINS.includes(origin) ? origin : null;
  const referer = originOf(req.headers.referer || '');
  if (referer && ORIGINS.includes(referer)) return referer;
  return null;
}

function setCors(res, origin) {
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json');
}

// ── Rate limiting ───────────────────────────────────────────────────
// Vercel KV when configured (shared across instances), otherwise an
// in-memory counter that at least bounds a single warm instance.
const hasKV = () => Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const memCounters = new Map();

function memBump(key, windowSec, limit) {
  const now = Date.now();
  const entry = memCounters.get(key);
  if (!entry || entry.expires <= now) {
    memCounters.set(key, { count: 1, expires: now + windowSec * 1000 });
    if (memCounters.size > 5000) {
      for (const [k, v] of memCounters) if (v.expires <= now) memCounters.delete(k);
    }
    return { ok: true, retryAfter: windowSec };
  }
  entry.count++;
  return { ok: entry.count <= limit, retryAfter: Math.ceil((entry.expires - now) / 1000) };
}

async function bump(key, windowSec, limit) {
  if (!hasKV()) return memBump(key, windowSec, limit);
  try {
    const count = await kv.incr(key);
    if (count === 1) await kv.expire(key, windowSec);
    if (count <= limit) return { ok: true, retryAfter: windowSec };
    const ttl = await kv.ttl(key).catch(() => windowSec);
    return { ok: false, retryAfter: ttl > 0 ? ttl : windowSec };
  } catch (e) {
    // KV unavailable — fall back to the per-instance limiter rather than
    // letting the proxy run uncapped.
    return memBump(key, windowSec, limit);
  }
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length) return String(fwd[0]).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

// ── Body validation ─────────────────────────────────────────────────
// The upstream body is rebuilt from scratch, so anything the app does not
// send (tools, extended thinking, streaming, url image sources, …) never
// reaches the Anthropic API.
function buildUpstreamBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid body' };

  const model = body.model;
  if (typeof model !== 'string' || !ALLOWED_MODELS.includes(model)) {
    return { error: 'Model not allowed' };
  }

  const maxTokens = Number(body.max_tokens);
  if (!Number.isFinite(maxTokens) || maxTokens < 1) return { error: 'Invalid max_tokens' };

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) return { error: 'Invalid messages' };
  if (messages.length > MAX_MESSAGES) return { error: 'Too many messages' };

  let images = 0;
  let textChars = 0;
  const cleanMessages = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') return { error: 'Invalid message' };
    if (msg.role !== 'user' && msg.role !== 'assistant') return { error: 'Invalid role' };

    if (typeof msg.content === 'string') {
      textChars += msg.content.length;
      cleanMessages.push({ role: msg.role, content: msg.content });
      continue;
    }
    if (!Array.isArray(msg.content) || msg.content.length === 0) {
      return { error: 'Invalid message content' };
    }

    const blocks = [];
    for (const block of msg.content) {
      if (!block || typeof block !== 'object') return { error: 'Invalid content block' };

      if (block.type === 'text') {
        if (typeof block.text !== 'string') return { error: 'Invalid text block' };
        textChars += block.text.length;
        blocks.push({ type: 'text', text: block.text });
        continue;
      }

      if (block.type === 'image') {
        const src = block.source;
        if (!src || typeof src !== 'object' || src.type !== 'base64') {
          return { error: 'Only base64 images are allowed' };
        }
        if (!ALLOWED_MEDIA_TYPES.includes(src.media_type)) {
          return { error: 'Unsupported image type' };
        }
        if (typeof src.data !== 'string' || !src.data) return { error: 'Invalid image data' };
        if (src.data.length > MAX_IMAGE_BYTES) return { error: 'Image too large' };
        if (++images > MAX_IMAGES) return { error: 'Too many images' };
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: src.media_type, data: src.data },
        });
        continue;
      }

      return { error: 'Unsupported content block' };
    }
    cleanMessages.push({ role: msg.role, content: blocks });
  }

  if (textChars > MAX_TEXT_CHARS) return { error: 'Prompt too long' };

  const clean = {
    model,
    max_tokens: Math.min(Math.round(maxTokens), MAX_TOKENS_CAP),
    messages: cleanMessages,
  };
  if (typeof body.system === 'string' && body.system.length <= MAX_SYSTEM_CHARS) {
    clean.system = body.system;
  }
  if (typeof body.temperature === 'number' && body.temperature >= 0 && body.temperature <= 1) {
    clean.temperature = body.temperature;
  }
  return { body: clean };
}

// ── Handler ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const origin = resolveOrigin(req);
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(origin ? 204 : 403).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!origin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AI not configured' });
    return;
  }

  const declaredLength = Number(req.headers['content-length'] || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'Payload too large' });
    return;
  }

  let raw;
  try {
    raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const built = buildUpstreamBody(raw);
  if (built.error) {
    res.status(400).json({ error: built.error });
    return;
  }

  const payload = JSON.stringify(built.body);
  if (Buffer.byteLength(payload) > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'Payload too large' });
    return;
  }

  // Rate limits — checked only once the request is known to be well formed.
  const ip = clientIp(req);
  const day = new Date().toISOString().slice(0, 10);
  const hour = new Date().toISOString().slice(0, 13);

  const checks = [
    { key: `ai:ip:${ip}:h:${hour}`, window: 3600, limit: LIMIT_IP_HOUR },
    { key: `ai:ip:${ip}:d:${day}`, window: 86400, limit: LIMIT_IP_DAY },
    { key: `ai:global:d:${day}`, window: 86400, limit: LIMIT_GLOBAL_DAY },
  ];

  for (const check of checks) {
    const result = await bump(check.key, check.window, check.limit);
    if (!result.ok) {
      res.setHeader('Retry-After', String(result.retryAfter));
      res.status(429).json({ error: 'Rate limit exceeded', retryAfter: result.retryAfter });
      return;
    }
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: payload,
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Upstream error' });
  }
}
