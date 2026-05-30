/**
 * Morning Briefing Cron
 * Runs every day at 08:00 Israel time (06:00 UTC standard / 05:00 UTC DST)
 * Sends a smart morning push notification to each user with their task summary.
 */
import { kv } from '@vercel/kv';
import webpush from 'web-push';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function getIsraelHour() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour12: false });
  return new Date(s).getHours();
}

function getIsraelToday() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour12: false });
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return { start: d.getTime(), end: d.getTime() + 86400000 };
}

/**
 * Build the morning briefing notification payload.
 */
function buildBriefing(tasks, profile) {
  const name = profile?.name || '';
  const active  = tasks.filter(t => t.status === 'active');
  const onHold  = tasks.filter(t => t.status === 'on_hold');
  const nowMs   = Date.now();
  const { start, end } = getIsraelToday();

  const urgent   = active.filter(t => t.priority <= 2);
  const overdue  = active.filter(t => t.reminderTime && new Date(t.reminderTime).getTime() < nowMs);
  const todayTasks = active.filter(t => {
    if (!t.reminderTime) return false;
    const rt = new Date(t.reminderTime).getTime();
    return rt >= start && rt < end && rt >= nowMs;
  });

  const greeting = `🌅 בוקר טוב${name ? ', ' + name : ''}!`;

  if (!active.length && !onHold.length) {
    return {
      title: greeting,
      body: '✅ אין משימות פתוחות — יום מעולה לפניך!',
    };
  }

  const parts = [];
  if (overdue.length)    parts.push(`⚠️ ${overdue.length} עברו מועד`);
  if (urgent.length)     parts.push(`🔴 ${urgent.length} דחוף`);
  if (todayTasks.length) parts.push(`📅 ${todayTasks.length} להיום`);
  if (onHold.length)     parts.push(`⏳ ${onHold.length} ממתין`);

  let body = parts.join(' · ') || `${active.length} משימות פעילות`;

  // Highlight most urgent
  const top = urgent[0] || overdue[0] || todayTasks[0];
  if (top) body += `\n› ${top.cleanTitle}`;

  return { title: greeting, body };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  // Auth
  const auth = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Guard: only run if it's actually around 08:00 Israel time (allow 07:30–09:30)
  const israelH = getIsraelHour();
  if (israelH < 7 || israelH > 9) {
    res.status(200).json({ ok: true, skipped: true, reason: `israel_hour_${israelH}` });
    return;
  }

  // Setup web-push
  const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    res.status(500).json({ error: 'VAPID keys not configured' });
    return;
  }
  webpush.setVapidDetails('mailto:admin@sportfields.app', vapidPublic, vapidPrivate);

  const results = { sent: 0, skipped: 0, errors: 0 };
  const todayKey = new Date().toISOString().slice(0, 10);

  // Scan all user task indexes
  let userKeys = [];
  try {
    userKeys = await kv.keys('tasks:*');
  } catch (e) {
    res.status(500).json({ error: 'KV scan failed', details: e.message });
    return;
  }

  for (const userKey of userKeys) {
    const userId = userKey.replace('tasks:', '');

    // Prevent duplicate: check if already sent today
    const sentKey = `brief:${userId}:${todayKey}`;
    const alreadySent = await kv.get(sentKey).catch(() => null);
    if (alreadySent) { results.skipped++; continue; }

    // Get push subscription
    const subRaw = await kv.get(`sub:${userId}`).catch(() => null);
    if (!subRaw) { results.skipped++; continue; }
    const subRecord = typeof subRaw === 'string' ? JSON.parse(subRaw) : subRaw;
    const subscription = subRecord?.subscription;
    if (!subscription) { results.skipped++; continue; }

    // Get user profile
    const profileRaw = await kv.get(`profile:${userId}`).catch(() => null);
    const profile = profileRaw ? (typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw) : {};

    // Get tasks
    const idxRaw = await kv.get(userKey).catch(() => null);
    if (!idxRaw) { results.skipped++; continue; }
    const ids = typeof idxRaw === 'string' ? JSON.parse(idxRaw) : idxRaw;
    const tasks = [];
    for (const id of ids.slice(0, 100)) {
      const raw = await kv.get(`task:${userId}:${id}`).catch(() => null);
      if (raw) tasks.push(typeof raw === 'string' ? JSON.parse(raw) : raw);
    }

    // Build briefing message
    const { title, body } = buildBriefing(tasks, profile);

    // Send
    const payload = JSON.stringify({
      title,
      body,
      tag: `morning-brief-${todayKey}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/', type: 'morning_brief' },
    });

    try {
      await webpush.sendNotification(subscription, payload);
      // Mark as sent
      await kv.set(sentKey, '1', { ex: 86400 });
      results.sent++;
    } catch (e) {
      if (e.statusCode === 410) {
        await kv.del(`sub:${userId}`).catch(() => {});
      }
      results.errors++;
    }
  }

  res.status(200).json({
    ok: true,
    date: todayKey,
    israelHour: israelH,
    ...results,
  });
}
