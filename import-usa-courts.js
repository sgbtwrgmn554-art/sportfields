/**
 * import-usa-courts.js
 * מייבא מגרשי ספורט מארה"ב מ-OpenStreetMap
 * מחולק לאזורים כדי לא לחרוג ממגבלת Overpass
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xnxhqfokdtghdcqbftua:ZlAfT0sCuF3SXZxT@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const SPORT_MAP = {
  soccer: 'football', football: 'football', american_football: 'football',
  basketball: 'basketball', tennis: 'tennis', volleyball: 'volleyball',
  padel: 'padel', table_tennis: 'pingpong', skateboard: 'skate',
  fitness: 'fitness', baseball: 'football', multi: 'basketball',
};

const SPORT_PHOTOS = {
  football:   'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400',
  basketball: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400',
  tennis:     'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400',
  volleyball: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400',
  padel:      'https://images.unsplash.com/photo-1612460627563-77f8e9e30ae7?w=400',
  pingpong:   'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=400',
  skate:      'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400',
  fitness:    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
};

// אזורים עיקריים בארה"ב
const REGIONS = [
  { name: 'New York',      bbox: '40.4,-74.3,41.0,-73.6' },
  { name: 'Los Angeles',   bbox: '33.6,-118.7,34.4,-117.6' },
  { name: 'Chicago',       bbox: '41.6,-88.0,42.1,-87.5' },
  { name: 'Houston',       bbox: '29.5,-95.8,30.1,-95.0' },
  { name: 'Phoenix',       bbox: '33.2,-112.5,33.8,-111.7' },
  { name: 'Miami',         bbox: '25.5,-80.5,26.1,-80.0' },
  { name: 'Dallas',        bbox: '32.6,-97.0,33.0,-96.6' },
  { name: 'San Francisco', bbox: '37.6,-122.6,37.9,-122.3' },
  { name: 'Seattle',       bbox: '47.4,-122.5,47.8,-122.2' },
  { name: 'Boston',        bbox: '42.2,-71.2,42.5,-70.9' },
];

function buildQuery(bbox) {
  return `[out:json][timeout:30];
(
  node["leisure"="pitch"]["sport"~"soccer|football|basketball|tennis|volleyball|padel|table_tennis"](${bbox});
  way["leisure"="pitch"]["sport"~"soccer|football|basketball|tennis|volleyball|padel|table_tennis"](${bbox});
  node["leisure"="skate_park"](${bbox});
  node["leisure"="fitness_station"](${bbox});
  way["leisure"="fitness_station"](${bbox});
);
out center tags;`;
}

async function fetchRegion(region) {
  console.log(`  📡 מוריד ${region.name}...`);
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(buildQuery(region.bbox)),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SportFields/1.0' },
    signal: AbortSignal.timeout(35000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.elements.map(el => {
    const tags = el.tags || {};
    const leisure = tags.leisure || '';
    const sport = tags.sport || '';
    let sportType = null;
    if (leisure === 'skate_park') sportType = 'skate';
    else if (leisure === 'fitness_station') sportType = 'fitness';
    else sportType = SPORT_MAP[sport] || null;
    if (!sportType) return null;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!lat || !lng) return null;
    const name = tags['name'] || tags['name:en'] || `${sportType.charAt(0).toUpperCase() + sportType.slice(1)} Court`;
    const city = tags['addr:city'] || tags['addr:place'] || region.name;
    const street = tags['addr:street'] || null;
    const address = [street, city, 'USA'].filter(Boolean).join(', ');
    return { name, address, lat, lng, sportType, country: 'us' };
  }).filter(Boolean);
}

async function run() {
  console.log('🇺🇸 מייבא מגרשים מארה"ב...\n');
  const client = await pool.connect();

  // הוסף עמודת country אם לא קיימת
  await client.query(`ALTER TABLE courts ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'il'`).catch(() => {});
  // עדכן ישראל
  await client.query(`UPDATE courts SET country = 'il' WHERE country IS NULL`).catch(() => {});

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const region of REGIONS) {
    try {
      const courts = await fetchRegion(region);
      console.log(`  ✅ ${region.name}: ${courts.length} מגרשים`);

      const seen = new Set();
      for (const c of courts) {
        const key = `${c.lat.toFixed(4)}_${c.lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const exists = await client.query(
          `SELECT id FROM courts WHERE ST_DWithin(location, ST_MakePoint($1,$2)::geography, 50) LIMIT 1`,
          [c.lng, c.lat]
        );
        if (exists.rows.length) { totalSkipped++; continue; }

        await client.query(
          `INSERT INTO courts (name, address, location, sport_types, verified, photo_url, country)
           VALUES ($1,$2,ST_MakePoint($3,$4)::geography,$5,true,$6,$7)`,
          [c.name, c.address, c.lng, c.lat, [c.sportType], SPORT_PHOTOS[c.sportType], 'us']
        );
        totalInserted++;
      }
      await new Promise(r => setTimeout(r, 1500)); // pause between requests
    } catch (e) {
      console.log(`  ⚠️ ${region.name}: שגיאה — ${e.message}`);
    }
  }

  const total = await client.query('SELECT COUNT(*) FROM courts');
  console.log(`\n✅ נוספו: ${totalInserted} מגרשים אמריקאים`);
  console.log(`⏭️  דולגו (כפולים): ${totalSkipped}`);
  console.log(`🏟️  סה"כ בDB: ${total.rows[0].count}`);

  client.release();
  await pool.end();
}

run().catch(console.error);
