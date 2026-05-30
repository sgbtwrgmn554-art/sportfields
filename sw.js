const CACHE = 'dad-fit-v5';
const FILES = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

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
    title: '💪 כושר',
    body: 'זמן לאמן! 5 דקות זה מספיק 🔥',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'reminder',
  };

  if (e.data) {
    try {
      const parsed = e.data.json();
      data = { ...data, ...parsed };
    } catch (_) {
      data.body = e.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    dir: 'rtl',
    lang: 'he',
    requireInteraction: false,
    data: { url: self.registration.scope },
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification click handler ─────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();

  const targetUrl = (e.notification.data && e.notification.data.url) || self.registration.scope;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If the app is already open, focus it
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
