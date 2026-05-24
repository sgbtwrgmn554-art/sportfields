// בדיקת Overpass API
const query = `[out:json][timeout:20];
node["leisure"="pitch"]["sport"~"basketball|soccer|football|tennis"](31.0,34.0,33.5,36.0);
out center tags 20;`;

async function test() {
  const body = 'data=' + encodeURIComponent(query);

  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  for (const url of mirrors) {
    try {
      console.log('Trying:', url);
      const res = await fetch(url, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'SportFields/1.0',
        },
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        console.log('  HTTP', res.status, res.statusText);
        continue;
      }

      const data = await res.json();
      console.log('  ✅ Got', data.elements?.length, 'elements');
      if (data.elements?.[0]) {
        const el = data.elements[0];
        console.log('  Sample:', el.tags?.name, el.lat || el.center?.lat, el.lon || el.center?.lon);
      }
      return;
    } catch (e) {
      console.log('  ❌', e.message);
    }
  }
}

test();
