import { kv } from '@vercel/kv';
import webpush from 'web-push';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  // Verify cron secret
  const auth = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Setup web-push
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    res.status(500).json({ error: 'VAPID keys not configured' });
    return;
  }
  webpush.setVapidDetails('mailto:admin@sportfields.app', vapidPublic, vapidPrivate);

  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5-minute window

  const results = { checked: 0, sent: 0, skipped: 0, errors: 0 };

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

    // Get push subscription for this user
    const subRaw = await kv.get(`sub:${userId}`).catch(() => null);
    if (!subRaw) continue;
    const subRecord = typeof subRaw === 'string' ? JSON.parse(subRaw) : subRaw;
    const subscription = subRecord?.subscription;
    if (!subscription) continue;

    // Get task list for this user
    const idxRaw = await kv.get(userKey).catch(() => null);
    if (!idxRaw) continue;
    const taskIds = typeof idxRaw === 'string' ? JSON.parse(idxRaw) : idxRaw;

    for (const taskId of taskIds) {
      const raw = await kv.get(`task:${userId}:${taskId}`).catch(() => null);
      if (!raw) continue;
      const task = typeof raw === 'string' ? JSON.parse(raw) : raw;

      results.checked++;

      // Skip completed or already notified
      if (task.status === 'done' || task.notified) {
        results.skipped++;
        continue;
      }

      // Check if reminder time is within the 5-minute window
      if (!task.reminderTime) {
        results.skipped++;
        continue;
      }
      const reminderMs = new Date(task.reminderTime).getTime();
      const diff = reminderMs - now;
      if (diff < 0 || diff > windowMs) {
        results.skipped++;
        continue;
      }

      // Send push notification
      const payload = JSON.stringify({
        title: '🎙️ תזכורת משימה',
        body: task.title,
        tag: `task-${task.taskId}`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { taskId: task.taskId, url: '/' },
      });

      try {
        await webpush.sendNotification(subscription, payload);
        // Mark as notified
        task.notified = true;
        task.notifiedAt = new Date().toISOString();
        await kv.set(`task:${userId}:${taskId}`, JSON.stringify(task));
        results.sent++;
      } catch (e) {
        if (e.statusCode === 410) {
          // Subscription expired - clean it up
          await kv.del(`sub:${userId}`).catch(() => {});
        }
        results.errors++;
      }
    }
  }

  res.status(200).json({ ok: true, timestamp: new Date().toISOString(), ...results });
}
