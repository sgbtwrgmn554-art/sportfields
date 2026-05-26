import { kv } from '@vercel/kv';
import { randomUUID } from 'crypto';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ── Priority repeat intervals (minutes) ───────────────────────────
const PRIORITY_INTERVALS = { 1: 15, 2: 60, 3: 1440, 4: 2880, 5: null };

// ── Category definitions ───────────────────────────────────────────
const CATEGORIES = ['work', 'personal', 'clients', 'study', 'admin'];

// ── Israel time helper ─────────────────────────────────────────────
function israelNow() {
  return new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', hour12: false });
}

function toIsraelHour(isoString) {
  const dt = new Date(isoString);
  const s = dt.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour12: false });
  return new Date(s).getHours();
}

/** Enforce 08:00–19:00 active window. Returns ISO UTC string. */
function enforceWindow(isoString, startH = 8, endH = 19) {
  if (!isoString) return null;
  try {
    let dt = new Date(isoString);
    if (isNaN(dt)) return null;

    function getIsraelHour(d) {
      const s = d.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour12: false });
      return new Date(s).getHours();
    }

    const h = getIsraelHour(dt);

    if (h < startH) {
      // Before 08:00 → push to 08:00 same day
      const diffH = startH - h;
      dt = new Date(dt.getTime() + diffH * 3600000);
      dt.setUTCMinutes(0, 0, 0);
    } else if (h >= endH) {
      // After 19:00 → next day 08:00
      dt = new Date(dt.getTime() + 24 * 3600000);
      const nextH = getIsraelHour(dt);
      const diffH = startH - nextH;
      dt = new Date(dt.getTime() + diffH * 3600000);
      dt.setUTCMinutes(0, 0, 0);
    }

    // If still in the past, schedule tomorrow 09:00
    if (dt.getTime() < Date.now()) {
      const tomorrow = new Date(Date.now() + 86400000);
      const s = tomorrow.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour12: false });
      const tDt = new Date(s);
      const diffH = 9 - tDt.getHours();
      tomorrow.setUTCHours(tomorrow.getUTCHours() + diffH, 0, 0, 0);
      return tomorrow.toISOString();
    }

    return dt.toISOString();
  } catch {
    return null;
  }
}

/** AI parse via Claude – returns full task fields */
async function aiParseTask(text, apiKey, activeStart = '08:00', activeEnd = '19:00') {
  const now = israelNow();

  const systemPrompt = `אתה עוזר חכם לניתוח משימות בעברית.
תאריך ושעה נוכחיים בישראל: ${now}
שעות פעילות: ${activeStart}–${activeEnd}

כשמשתמש מדבר, חלץ:
1. cleanTitle – כותרת קצרה ומדויקת בעברית
2. reminderTime – ISO 8601 עם timezone ישראל (+02:00 או +03:00)
   - אם לפני ${activeStart} → הזזה ל-${activeStart} באותו יום
   - אם אחרי ${activeEnd} → ${activeStart} ביום המחרת
   - אם לא צוין → מחר ב-09:00
3. priority – מספר 1-5:
   - מילות דחיפות (דחוף/ASAP/קריטי/היום/עכשיו) → 1 או 2
   - ברירת מחדל → 3
4. category – אחת מ: work/personal/clients/study/admin
5. waitingFor – אם יש "ממתין ל..." → שם, אחרת null
6. hasTime – האם ציין שעה/תאריך ספציפי (true/false)

החזר JSON בלבד, ללא טקסט נוסף:
{"cleanTitle":"...","reminderTime":"ISO","priority":3,"category":"work","waitingFor":null,"hasTime":false}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: `"${text}"` }],
    }),
  });

  const data = await resp.json();
  const raw = data?.content?.[0]?.text?.trim() || '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON from AI');
  return JSON.parse(match[0]);
}

// ── Main handler ──────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const { action, userId } = body || {};
  if (!userId) { res.status(400).json({ error: 'Missing userId' }); return; }

  // ── parse ─────────────────────────────────────────────────────
  if (action === 'parse') {
    const { text, activeStart, activeEnd } = body;
    if (!text?.trim()) { res.status(400).json({ error: 'Missing text' }); return; }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'AI not configured' }); return; }
    try {
      const parsed = await aiParseTask(text, apiKey, activeStart, activeEnd);
      const safeTime = enforceWindow(parsed.reminderTime);
      res.status(200).json({ ...parsed, reminderTime: safeTime, adjustedReminderTime: safeTime });
    } catch (e) {
      res.status(500).json({ error: 'Parse failed', details: e.message });
    }
    return;
  }

  // ── create ────────────────────────────────────────────────────
  if (action === 'create') {
    const {
      rawText, cleanTitle, priority = 3, category = 'work',
      reminderTime, repeatInterval, waitingFor, maxNotifications,
      expiresAt,
    } = body;

    if (!cleanTitle) { res.status(400).json({ error: 'Missing cleanTitle' }); return; }

    // Get user profile for active window
    const profileRaw = await kv.get(`profile:${userId}`).catch(() => null);
    const profile = profileRaw ? (typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw) : {};
    const activeStart = parseInt((profile.activeStart || '08:00').split(':')[0], 10);
    const activeEnd   = parseInt((profile.activeEnd   || '19:00').split(':')[0], 10);

    const safeTime = enforceWindow(reminderTime, activeStart, activeEnd);
    const taskId = randomUUID();

    // Default repeat based on priority
    const defaultInterval = PRIORITY_INTERVALS[priority];

    const task = {
      taskId,
      userId,
      rawText: rawText || cleanTitle,
      cleanTitle,
      createdAt: new Date().toISOString(),
      reminderTime: safeTime,
      adjustedReminderTime: safeTime,
      priority: Math.min(5, Math.max(1, Number(priority))),
      status: 'active',
      repeatInterval: repeatInterval !== undefined ? repeatInterval : defaultInterval,
      category: CATEGORIES.includes(category) ? category : 'work',
      waitingFor: waitingFor || null,
      completedAt: null,
      notifiedCount: 0,
      lastNotifiedAt: null,
      maxNotifications: maxNotifications || null,
      expiresAt: expiresAt || null,
      snoozeUntil: null,
    };

    await kv.set(`task:${userId}:${taskId}`, JSON.stringify(task));

    // Update index
    const idxRaw = await kv.get(`tasks:${userId}`).catch(() => null);
    const idx = idxRaw ? (typeof idxRaw === 'string' ? JSON.parse(idxRaw) : idxRaw) : [];
    idx.unshift(taskId);
    await kv.set(`tasks:${userId}`, JSON.stringify(idx));

    res.status(200).json({ ok: true, task });
    return;
  }

  // ── list ──────────────────────────────────────────────────────
  if (action === 'list') {
    const { statusFilter, priorityFilter, categoryFilter, limit = 200 } = body;
    const idxRaw = await kv.get(`tasks:${userId}`).catch(() => null);
    const ids = idxRaw ? (typeof idxRaw === 'string' ? JSON.parse(idxRaw) : idxRaw) : [];

    const tasks = [];
    for (const id of ids.slice(0, Number(limit))) {
      const raw = await kv.get(`task:${userId}:${id}`).catch(() => null);
      if (!raw) continue;
      const t = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (statusFilter && t.status !== statusFilter) continue;
      if (priorityFilter && t.priority !== Number(priorityFilter)) continue;
      if (categoryFilter && t.category !== categoryFilter) continue;
      tasks.push(t);
    }

    // Sort: priority asc, then reminderTime asc
    tasks.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const ta = a.reminderTime ? new Date(a.reminderTime).getTime() : Infinity;
      const tb = b.reminderTime ? new Date(b.reminderTime).getTime() : Infinity;
      return ta - tb;
    });

    res.status(200).json({ tasks });
    return;
  }

  // ── update ────────────────────────────────────────────────────
  if (action === 'update') {
    const { taskId } = body;
    if (!taskId) { res.status(400).json({ error: 'Missing taskId' }); return; }
    const raw = await kv.get(`task:${userId}:${taskId}`).catch(() => null);
    if (!raw) { res.status(404).json({ error: 'Task not found' }); return; }
    const task = typeof raw === 'string' ? JSON.parse(raw) : raw;

    const fields = ['cleanTitle', 'priority', 'status', 'category', 'waitingFor',
      'reminderTime', 'repeatInterval', 'maxNotifications', 'expiresAt', 'snoozeUntil'];
    for (const f of fields) {
      if (body[f] !== undefined) task[f] = body[f];
    }

    // Re-enforce window if reminderTime changed
    if (body.reminderTime !== undefined) {
      const profileRaw = await kv.get(`profile:${userId}`).catch(() => null);
      const profile = profileRaw ? (typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw) : {};
      const aS = parseInt((profile.activeStart || '08:00').split(':')[0], 10);
      const aE = parseInt((profile.activeEnd   || '19:00').split(':')[0], 10);
      task.adjustedReminderTime = enforceWindow(body.reminderTime, aS, aE);
      task.reminderTime = task.adjustedReminderTime;
      task.notifiedCount = 0; // Reset so it notifies again
      task.lastNotifiedAt = null;
    }

    if (body.status === 'completed') {
      task.completedAt = new Date().toISOString();
    }
    task.updatedAt = new Date().toISOString();

    await kv.set(`task:${userId}:${taskId}`, JSON.stringify(task));
    res.status(200).json({ ok: true, task });
    return;
  }

  // ── snooze ────────────────────────────────────────────────────
  if (action === 'snooze') {
    const { taskId, minutes = 60 } = body;
    if (!taskId) { res.status(400).json({ error: 'Missing taskId' }); return; }
    const raw = await kv.get(`task:${userId}:${taskId}`).catch(() => null);
    if (!raw) { res.status(404).json({ error: 'Not found' }); return; }
    const task = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const snoozeUntil = new Date(Date.now() + minutes * 60000).toISOString();
    task.snoozeUntil = snoozeUntil;
    task.updatedAt = new Date().toISOString();
    await kv.set(`task:${userId}:${taskId}`, JSON.stringify(task));
    res.status(200).json({ ok: true, snoozeUntil });
    return;
  }

  // ── delete ────────────────────────────────────────────────────
  if (action === 'delete') {
    const { taskId } = body;
    if (!taskId) { res.status(400).json({ error: 'Missing taskId' }); return; }
    await kv.del(`task:${userId}:${taskId}`).catch(() => {});
    const idxRaw = await kv.get(`tasks:${userId}`).catch(() => null);
    if (idxRaw) {
      const idx = typeof idxRaw === 'string' ? JSON.parse(idxRaw) : idxRaw;
      await kv.set(`tasks:${userId}`, JSON.stringify(idx.filter(id => id !== taskId)));
    }
    res.status(200).json({ ok: true });
    return;
  }

  // ── profile get/set ───────────────────────────────────────────
  if (action === 'get-profile') {
    const raw = await kv.get(`profile:${userId}`).catch(() => null);
    const profile = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
    res.status(200).json({ profile });
    return;
  }

  if (action === 'save-profile') {
    const { name, activeStart, activeEnd, defaultPriority } = body;
    const profileRaw = await kv.get(`profile:${userId}`).catch(() => null);
    const profile = profileRaw ? (typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw) : {};
    if (name !== undefined) profile.name = name;
    if (activeStart !== undefined) profile.activeStart = activeStart;
    if (activeEnd !== undefined) profile.activeEnd = activeEnd;
    if (defaultPriority !== undefined) profile.defaultPriority = defaultPriority;
    profile.updatedAt = new Date().toISOString();
    await kv.set(`profile:${userId}`, JSON.stringify(profile));
    res.status(200).json({ ok: true, profile });
    return;
  }

  // ── stats ─────────────────────────────────────────────────────
  if (action === 'stats') {
    const idxRaw = await kv.get(`tasks:${userId}`).catch(() => null);
    const ids = idxRaw ? (typeof idxRaw === 'string' ? JSON.parse(idxRaw) : idxRaw) : [];
    const stats = { total: 0, active: 0, completed: 0, on_hold: 0, cancelled: 0, byPriority: {1:0,2:0,3:0,4:0,5:0} };
    for (const id of ids) {
      const raw = await kv.get(`task:${userId}:${id}`).catch(() => null);
      if (!raw) continue;
      const t = typeof raw === 'string' ? JSON.parse(raw) : raw;
      stats.total++;
      stats[t.status] = (stats[t.status] || 0) + 1;
      if (t.priority) stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;
    }
    res.status(200).json({ stats });
    return;
  }

  res.status(400).json({ error: 'Unknown action' });
}
