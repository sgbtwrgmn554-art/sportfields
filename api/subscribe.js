import { kv } from '@vercel/kv';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Set CORS headers on all responses
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const { action } = body || {};

  // ── get-public-key ──────────────────────────────────────────────
  if (action === 'get-public-key') {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      res.status(500).json({ error: 'VAPID_PUBLIC_KEY not configured' });
      return;
    }
    res.status(200).json({ publicKey });
    return;
  }

  // ── subscribe ───────────────────────────────────────────────────
  if (action === 'subscribe') {
    const { subscription, reminderTime, reminderDays, profileId, profileName } = body;
    if (!subscription || !profileId) {
      res.status(400).json({ error: 'Missing subscription or profileId' });
      return;
    }
    const record = {
      subscription,
      reminderTime: reminderTime || '19:00',
      reminderDays: reminderDays || [0, 1, 2, 3, 4, 5, 6],
      profileName: profileName || 'משתמש',
      profileId,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`sub:${profileId}`, JSON.stringify(record));
    res.status(200).json({ ok: true });
    return;
  }

  // ── update ──────────────────────────────────────────────────────
  if (action === 'update') {
    const { profileId, reminderTime, reminderDays } = body;
    if (!profileId) {
      res.status(400).json({ error: 'Missing profileId' });
      return;
    }
    const existing = await kv.get(`sub:${profileId}`);
    if (!existing) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }
    let record;
    try {
      record = typeof existing === 'string' ? JSON.parse(existing) : existing;
    } catch (e) {
      res.status(500).json({ error: 'Corrupt record' });
      return;
    }
    if (reminderTime !== undefined) record.reminderTime = reminderTime;
    if (reminderDays !== undefined) record.reminderDays = reminderDays;
    record.updatedAt = new Date().toISOString();
    await kv.set(`sub:${profileId}`, JSON.stringify(record));
    res.status(200).json({ ok: true });
    return;
  }

  // ── unsubscribe ─────────────────────────────────────────────────
  if (action === 'unsubscribe') {
    const { profileId } = body;
    if (!profileId) {
      res.status(400).json({ error: 'Missing profileId' });
      return;
    }
    await kv.del(`sub:${profileId}`);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(400).json({ error: 'Unknown action' });
}
