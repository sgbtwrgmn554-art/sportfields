import { kv } from '@vercel/kv';
import webpush from 'web-push';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Priority repeat intervals (minutes)
const PRIORITY_INTERVALS = { 1: 15, 2: 60, 3: 1440, 4: 2880, 5: null };

// On-hold multiplier: double the interval for waiting tasks
const ON_HOLD_MULTIPLIER = 2;

function getIsraelHour() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour12: false });
  return new Date(s).getHours();
}

/**
 * Determine if a task should be notified right now.
 * Returns { should: bool, reason: string }
 */
function shouldNotify(task, nowMs, profile) {
  const activeStart = parseInt((profile?.activeStart || '08:00').split(':')[0], 10);
  const activeEnd   = parseInt((profile?.activeEnd   || '19:00').split(':')[0], 10);

  // Check active window
  const israelH = getIsraelHour();
  if (israelH < activeStart || israelH >= activeEnd) {
    return { should: false, reason: 'outside_window' };
  }

  // Skip cancelled/completed
  if (task.status === 'completed' || task.status === 'cancelled') {
    return { should: false, reason: 'not_active' };
  }

  // No reminder time set
  if (!task.reminderTime && !task.adjustedReminderTime) {
    return { should: false, reason: 'no_time' };
  }

  const reminderMs = new Date(task.adjustedReminderTime || task.reminderTime).getTime();

  // Not yet time for first notification
  if (reminderMs > nowMs) {
    return { should: false, reason: 'future' };
  }

  // Snooze active
  if (task.snoozeUntil && new Date(task.snoozeUntil).getTime() > nowMs) {
    return { should: false, reason: 'snoozed' };
  }

  // Expired
  if (task.expiresAt && new Date(task.expiresAt).getTime() < nowMs) {
    return { should: false, reason: 'expired' };
  }

  // Max notifications reached
  if (task.maxNotifications && task.notifiedCount >= task.maxNotifications) {
    return { should: false, reason: 'max_reached' };
  }

  // Get repeat interval
  let intervalMin = task.repeatInterval !== undefined && task.repeatInterval !== null
    ? task.repeatInterval
    : PRIORITY_INTERVALS[task.priority] ?? 1440;

  // Priority 5 (no repeat) – notify only once
  if (task.priority === 5 || intervalMin === null) {
    if (task.notifiedCount > 0) return { should: false, reason: 'p5_once' };
    return { should: true, reason: 'p5_first' };
  }

  // On-hold tasks: slower cadence
  if (task.status === 'on_hold') {
    intervalMin = intervalMin * ON_HOLD_MULTIPLIER;
  }

  // Never notified yet
  if (!task.lastNotifiedAt || task.notifiedCount === 0) {
    return { should: true, reason: 'first_notification' };
  }

  // Check interval since last notification
  const lastMs = new Date(task.lastNotifiedAt).getTime();
  const diffMin = (nowMs - lastMs) / 60000;
  if (diffMin >= intervalMin) {
    return { should: true, reason: 'interval_elapsed' };
  }

  return { should: false, reason: `wait_${Math.ceil(intervalMin - diffMin)}min` };
}

/** Build push payload for a task */
function buildPayload(task) {
  const PRIORITY_LABELS = { 1: '🔴 קריטי', 2: '🟠 חשוב', 3: '🔵 רגיל', 4: '🟢 נמוך', 5: '⚪' };
  const CAT_ICONS = { work: '💼', personal: '👤', clients: '🤝', study: '📚', admin: '📋' };

  const pLabel = PRIORITY_LABELS[task.priority] || '';
  const catIcon = CAT_ICONS[task.category] || '📋';
  const countNote = task.notifiedCount > 0 ? ` (תזכורת ${task.notifiedCount + 1})` : '';
  const waitNote = task.waitingFor ? ` | ממתין ל${task.waitingFor}` : '';

  return JSON.stringify({
    title: `${pLabel} תזכורת משימה`,
    body: `${catIcon} ${task.cleanTitle}${waitNote}${countNote}`,
    tag: `task-${task.taskId}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      taskId: task.taskId,
      userId: task.userId,
      priority: task.priority,
      url: '/',
    },
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  // Auth check
  const auth = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
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

  const nowMs = Date.now();
  const results = { checked: 0, sent: 0, skipped: 0, errors: 0, expired: 0 };

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

    // Load user profile (for active hours)
    const profileRaw = await kv.get(`profile:${userId}`).catch(() => null);
    const profile = profileRaw ? (typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw) : {};

    // Load push subscription
    const subRaw = await kv.get(`sub:${userId}`).catch(() => null);
    if (!subRaw) continue;
    const subRecord = typeof subRaw === 'string' ? JSON.parse(subRaw) : subRaw;
    const subscription = subRecord?.subscription;
    if (!subscription) continue;

    // Load task list
    const idxRaw = await kv.get(userKey).catch(() => null);
    if (!idxRaw) continue;
    const taskIds = typeof idxRaw === 'string' ? JSON.parse(idxRaw) : idxRaw;

    for (const taskId of taskIds) {
      const raw = await kv.get(`task:${userId}:${taskId}`).catch(() => null);
      if (!raw) continue;
      const task = typeof raw === 'string' ? JSON.parse(raw) : raw;

      results.checked++;

      // Check if expired and auto-cancel
      if (task.expiresAt && new Date(task.expiresAt).getTime() < nowMs && task.status === 'active') {
        task.status = 'cancelled';
        task.updatedAt = new Date().toISOString();
        await kv.set(`task:${userId}:${taskId}`, JSON.stringify(task)).catch(() => {});
        results.expired++;
        continue;
      }

      const { should, reason } = shouldNotify(task, nowMs, profile);

      if (!should) {
        results.skipped++;
        continue;
      }

      // Send notification
      const payload = buildPayload(task);
      try {
        await webpush.sendNotification(subscription, payload);

        // Update task record
        task.notifiedCount = (task.notifiedCount || 0) + 1;
        task.lastNotifiedAt = new Date().toISOString();
        await kv.set(`task:${userId}:${taskId}`, JSON.stringify(task));
        results.sent++;
      } catch (e) {
        if (e.statusCode === 410) {
          // Subscription expired
          await kv.del(`sub:${userId}`).catch(() => {});
          break; // Stop processing this user
        }
        results.errors++;
      }
    }
  }

  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    israelHour: getIsraelHour(),
    ...results,
  });
}
