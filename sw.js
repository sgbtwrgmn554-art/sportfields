const CACHE = 'voice-tasks-v1';
const FILES = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── Push notification handler ──────────────────────────────────────
self.addEventListener('push', e => {
  let data = {
    title: '🎙️ תזכורת משימה',
    body: 'יש לך משימה ממתינה',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'task-reminder',
  };

  if (e.data) {
    try {
      const parsed = e.data.json();
      data = { ...data, ...parsed };
    } catch (_) {
      data.body = e.data.text() || data.body;
    }
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      dir: 'rtl',
      lang: 'he',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'done', title: '✅ הושלם' },
        { action: 'snooze', title: '⏰ דחה שעה' },
      ],
      data: data.data || { url: self.registration.scope },
    })
  );
});

// ── Notification click handler ─────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || self.registration.scope;

  if (e.action === 'done') {
    // Mark task as done via API (fire and forget)
    const taskId = e.notification.data?.taskId;
    if (taskId) {
      // Post a message to the client to handle the completion
      clients.matchAll({ type: 'window' }).then(ws => {
        ws.forEach(w => w.postMessage({ type: 'TASK_DONE', taskId }));
      });
    }
    return;
  }

  if (e.action === 'snooze') {
    const taskId = e.notification.data?.taskId;
    if (taskId) {
      clients.matchAll({ type: 'window' }).then(ws => {
        ws.forEach(w => w.postMessage({ type: 'TASK_SNOOZE', taskId }));
      });
    }
    return;
  }

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
      for (const w of ws) {
        if (w.url === targetUrl && 'focus' in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
