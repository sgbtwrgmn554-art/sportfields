const CACHE = 'voice-tasks-v2';
const FILES = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // API calls – always network
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// ── Push handler ──────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = {
    title: '🎙️ תזכורת משימה',
    body: 'יש לך משימה ממתינה',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'task',
    data: { url: self.registration.scope },
  };

  if (e.data) {
    try { Object.assign(data, e.data.json()); }
    catch { data.body = e.data.text() || data.body; }
  }

  // Priority-based vibration patterns
  const VIBRATE = {
    1: [300, 100, 300, 100, 300], // Critical
    2: [200, 100, 200],           // Important
    3: [150, 100, 150],           // Normal
    4: [100],                     // Low
    5: [100],                     // None
  };
  const vib = VIBRATE[data.data?.priority] || VIBRATE[3];

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      dir: 'rtl',
      lang: 'he',
      requireInteraction: data.data?.priority <= 2,
      vibrate: vib,
      actions: [
        { action: 'complete', title: '✅ הושלם' },
        { action: 'snooze',   title: '⏰ דחה שעה' },
      ],
      data: data.data || { url: self.registration.scope },
    })
  );
});

// ── Notification click ─────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { taskId, userId, url } = e.notification.data || {};
  const targetUrl = url || self.registration.scope;

  const broadcastAction = (type) => {
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(ws => ws.forEach(w => w.postMessage({ type, taskId, userId })));
  };

  if (e.action === 'complete') { broadcastAction('TASK_COMPLETE'); return; }
  if (e.action === 'snooze')   { broadcastAction('TASK_SNOOZE');   return; }

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
      for (const w of ws) {
        if ('focus' in w) { w.focus(); w.postMessage({ type: 'OPEN_TASK', taskId }); return; }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
