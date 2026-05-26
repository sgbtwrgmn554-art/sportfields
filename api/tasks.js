import { kv } from '@vercel/kv';
import { randomUUID } from 'crypto';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

/** Israel current datetime string for AI prompt */
function israelNow() {
  const now = new Date();
  return now.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', hour12: false });
}

/** Enforce 08:00-19:00 window in Israel time.
 *  Returns an ISO string (UTC) for the enforced time. */
function enforceWindow(isoString) {
  if (!isoString) return null;
  try {
    const dt = new Date(isoString);
    if (isNaN(dt)) return null;

    // Convert to Israel time parts
    const israelStr = dt.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour12: false });
    const israelDt = new Date(israelStr); // local Israel time approximation
    const h = israelDt.getHours();
    const m = israelDt.getMinutes();

    const START_H = 8;
    const END_H = 19;

    if (h < START_H || (h === START_H && m === 0 && false)) {
      // Before 08:00 → move to 08:00 same day
      dt.setUTCHours(dt.getUTCHours() + (START_H - h));
      dt.setUTCMinutes(0);
      dt.setUTCSeconds(0);
      dt.setUTCMilliseconds(0);
    } else if (h >= END_H) {
      // After 19:00 → move to next day 08:00
      dt.setUTCDate(dt.getUTCDate() + 1);
      const nextIsraelStr = dt.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour12: false });
      const nextIsraelDt = new Date(nextIsraelStr);
      const diffH = START_H - nextIsraelDt.getHours();
      dt.setUTCHours(dt.getUTCHours() + diffH);
      dt.setUTCMinutes(0);
      dt.setUTCSeconds(0);
      dt.setUTCMilliseconds(0);
    }

    // If still in past, push to today 09:00 Israel or tomorrow
    const nowMs = Date.now();
    if (dt.getTime() < nowMs) {
      // Re-set to tomorrow 09:00 Israel
      const tomorrow = new Date(nowMs + 86400000);
      const tStr = tomorrow.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour12: false });
      const tDt = new Date(tStr);
      const diffH = 9 - tDt.getHours();
      tomorrow.setUTCHours(tomorrow.getUTCHours() + diffH);
      tomorrow.setUTCMinutes(0);
      tomorrow.setUTCSeconds(0);
      tomorrow.setUTCMilliseconds(0);
      return tomorrow.toISOString();
    }

    return dt.toISOString();
  } catch (e) {
    return null;
  }
}

/** Call Claude to parse the voice transcript */
async function parseWithClaude(text, apiKey) {
  const prompt = `אתה עוזר לניתוח משימות בעברית.
תאריך ושעה נוכחיים בישראל: ${israelNow()}

הטקסט שנאמר: "${text}"

חלץ מהטקסט:
1. כותרת משימה קצרה ובהירה בעברית (פועל + מושא, ללא "צריך" - ישיר וקצר)
2. זמן תזכורת - אם צוין בטקסט, החזר בפורמט ISO 8601 כולל offset ישראל (+02:00 או +03:00 לפי עונה)
3. האם המשתמש ציין שעה/תאריך ספציפי (true/false)

חוק חשוב: זמן התזכורת חייב להיות בין 08:00 ל-19:00 שעון ישראל.
- אם השעה לפני 08:00 → קבע ל-08:00 באותו יום
- אם השעה אחרי 19:00 → קבע ל-08:00 ביום המחרת
- אם לא צוין זמן → קבע ל-09:00 מחר בבוקר

החזר JSON בלבד, ללא כל טקסט אחר:
{"title":"כותרת המשימה","reminderTime":"ISO-8601","hasTime":true}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await resp.json();
  const raw = data?.content?.[0]?.text?.trim() || '';
  // Extract JSON from the response
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in AI response');
  return JSON.parse(match[0]);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const { action, userId } = body || {};
  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  // ── parse ─────────────────────────────────────────────────────────
  if (action === 'parse') {
    const { text } = body;
    if (!text?.trim()) {
      res.status(400).json({ error: 'Missing text' });
      return;
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'AI not configured' });
      return;
    }
    try {
      const parsed = await parseWithClaude(text, apiKey);
      // Enforce the 08:00-19:00 window
      const safe = enforceWindow(parsed.reminderTime);
      res.status(200).json({ ...parsed, reminderTime: safe });
    } catch (e) {
      res.status(500).json({ error: 'Parse failed', details: e.message });
    }
    return;
  }

  // ── create ────────────────────────────────────────────────────────
  if (action === 'create') {
    const { title, rawText, reminderTime } = body;
    if (!title) {
      res.status(400).json({ error: 'Missing title' });
      return;
    }
    const safeTime = enforceWindow(reminderTime);
    const taskId = randomUUID();
    const task = {
      taskId,
      userId,
      rawText: rawText || title,
      title,
      reminderTime: safeTime,
      status: 'pending',
      notified: false,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`task:${userId}:${taskId}`, JSON.stringify(task));
    // Add to user's index
    const idxRaw = await kv.get(`tasks:${userId}`);
    const idx = idxRaw ? (typeof idxRaw === 'string' ? JSON.parse(idxRaw) : idxRaw) : [];
    idx.unshift(taskId);
    await kv.set(`tasks:${userId}`, JSON.stringify(idx));
    res.status(200).json({ ok: true, task });
    return;
  }

  // ── list ──────────────────────────────────────────────────────────
  if (action === 'list') {
    const idxRaw = await kv.get(`tasks:${userId}`);
    const ids = idxRaw ? (typeof idxRaw === 'string' ? JSON.parse(idxRaw) : idxRaw) : [];
    const tasks = [];
    for (const id of ids.slice(0, 100)) {
      const raw = await kv.get(`task:${userId}:${id}`);
      if (raw) {
        tasks.push(typeof raw === 'string' ? JSON.parse(raw) : raw);
      }
    }
    res.status(200).json({ tasks });
    return;
  }

  // ── update ────────────────────────────────────────────────────────
  if (action === 'update') {
    const { taskId, status, title, reminderTime } = body;
    if (!taskId) { res.status(400).json({ error: 'Missing taskId' }); return; }
    const raw = await kv.get(`task:${userId}:${taskId}`);
    if (!raw) { res.status(404).json({ error: 'Task not found' }); return; }
    const task = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (status !== undefined) task.status = status;
    if (title !== undefined) task.title = title;
    if (reminderTime !== undefined) {
      task.reminderTime = enforceWindow(reminderTime);
      task.notified = false; // reset so it can be re-sent
    }
    task.updatedAt = new Date().toISOString();
    await kv.set(`task:${userId}:${taskId}`, JSON.stringify(task));
    res.status(200).json({ ok: true, task });
    return;
  }

  // ── delete ────────────────────────────────────────────────────────
  if (action === 'delete') {
    const { taskId } = body;
    if (!taskId) { res.status(400).json({ error: 'Missing taskId' }); return; }
    await kv.del(`task:${userId}:${taskId}`);
    const idxRaw = await kv.get(`tasks:${userId}`);
    if (idxRaw) {
      const idx = typeof idxRaw === 'string' ? JSON.parse(idxRaw) : idxRaw;
      await kv.set(`tasks:${userId}`, JSON.stringify(idx.filter(id => id !== taskId)));
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(400).json({ error: 'Unknown action' });
}
