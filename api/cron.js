import { kv } from '@vercel/kv';
import webpush from 'web-push';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Push payload for workout reminder
const PUSH_PAYLOAD = JSON.stringify({
  title: '💪 כושר',
  body: 'זמן לאמן! 5 דקות זה מספיק 🔥',
  icon: '/icon-192.png',
  badge: '/icon-192.png',
  tag: 'reminder',
});

function getIsraelTime() {
  const now = new Date();
  // Get current time in Asia/Jerusalem timezone
  const israelStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
  const israelDate = new Date(israelStr);
  const hh = israelDate.getHours().toString().padStart(2, '0');
  const mm = israelDate.getMinutes().toString().padStart(2, '0');
  const day = israelDate.getDay(); // 0 = Sunday
  return { hhmm: `${hh}:${mm}`, day };
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verify authorization
  const auth = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Configure web-push VAPID details
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    res.status(500).json({ error: 'VAPID keys not configured' });
    return;
  }

  webpush.setVapidDetails(
    'mailto:admin@sportfields.app',
    vapidPublic,
    vapidPrivate
  );

  // Get Israel time
  const { hhmm, day } = getIsraelTime();

  // Scan all sub:* keys
  let keys = [];
  try {
    // Use kv.keys to scan for matching keys
    keys = await kv.keys('sub:*');
  } catch (e) {
    res.status(500).json({ error: 'KV scan failed', details: e.message });
    return;
  }

  const results = { sent: 0, skipped: 0, deleted: 0, errors: 0 };

  for (const key of keys) {
    let raw;
    try {
      raw = await kv.get(key);
    } catch (e) {
      results.errors++;
      continue;
    }
    if (!raw) continue;

    let record;
    try {
      record = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      results.errors++;
      continue;
    }

    const { subscription, reminderTime, reminderDays } = record;

    // Check if this subscription is due now
    const daysToCheck = Array.isArray(reminderDays) ? reminderDays : [0, 1, 2, 3, 4, 5, 6];
    if (reminderTime !== hhmm || !daysToCheck.includes(day)) {
      results.skipped++;
      continue;
    }

    // Send push notification
    try {
      await webpush.sendNotification(subscription, PUSH_PAYLOAD);
      results.sent++;
    } catch (e) {
      // 410 Gone = subscription expired, delete it
      if (e.statusCode === 410) {
        await kv.del(key);
        results.deleted++;
      } else {
        results.errors++;
      }
    }
  }

  res.status(200).json({
    ok: true,
    time: hhmm,
    day,
    ...results,
  });
}
