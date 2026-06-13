const CACHE_STATIC = 'playgrounds-static-v22';
const CACHE_TILES  = 'playgrounds-tiles-v3';
const CACHE_DATA   = 'playgrounds-data-v2';

const ASSETS = [
  '/sportfields/playgrounds.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800;900&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => ![CACHE_STATIC, CACHE_TILES, CACHE_DATA].includes(k))
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // אריחי מפה — cache-first, נשמרים ל-offline
  if (url.includes('tile.openstreetmap.org') || url.includes('basemaps.cartocdn.com')) {
    e.respondWith(
      caches.open(CACHE_TILES).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch {
          return cached || new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // Overpass — שמור תגובה אחרונה ל-offline
  if (url.includes('overpass-api.de')) {
    e.respondWith(
      fetch(e.request.clone()).then(res => {
        if (res.ok) {
          caches.open(CACHE_DATA).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() =>
        caches.open(CACHE_DATA).then(c => c.match(e.request))
          .then(cached => cached || new Response(JSON.stringify({ elements: [], _offline: true }), {
            headers: { 'Content-Type': 'application/json' }
          }))
      )
    );
    return;
  }

  // Nominatim — network only (אין טעם לשמור)
  if (url.includes('nominatim.openstreetmap.org')) return;

  // playgrounds.html — network-first כדי תמיד לקבל גרסה חדשה
  if (url.includes('playgrounds.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE_STATIC).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // שאר הקבצים — cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
