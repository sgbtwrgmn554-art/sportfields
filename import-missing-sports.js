/**
 * import-missing-sports.js
 * מייבא מכשירי כושר חוץ, סקייטפארקים, פאמפטרקים מ-OpenStreetMap
 * לא מוחק מגרשים קיימים — רק מוסיף חדשים!
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xnxhqfokdtghdcqbftua:ZlAfT0sCuF3SXZxT@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const SPORT_PHOTOS = {
  fitness:   'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
  skate:     'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400',
  pumptrack: 'https://images.unsplash.com/photo-1606131731446-5568d87113aa?w=400',
  ninja:     'https://images.unsplash.com/photo-1549476464-37392f717541?w=400',
  volleyball:'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400',
};

const SPORT_NAMES_HE = {
  fitness:   'כושר חוץ',
  skate:     'סקייטפארק',
  pumptrack: 'פאמפטרק',
  ninja:     'נינג׳ה',
  volleyball:'כדורעף',
};

// ישראל bbox: min_lat=29.5, min_lon=34.2, max_lat=33.4, max_lon=35.9
const BBOX = '(29.5,34.2,33.4,35.9)';

const QUERY = `[out:json][timeout:90];
(
  node["leisure"="fitness_station"]${BBOX};
  way["leisure"="fitness_station"]${BBOX};
  node["amenity"="gym"]["access"~"yes|public"]${BBOX};
  node["leisure"="outdoor_gym"]${BBOX};
  way["leisure"="outdoor_gym"]${BBOX};
  node["sport"="fitness"]["leisure"!="pitch"]${BBOX};
  node["leisure"="skate_park"]${BBOX};
  way["leisure"="skate_park"]${BBOX};
  node["sport"="skateboard"]${BBOX};
  way["sport"="skateboard"]${BBOX};
  node["sport"="bmx"]${BBOX};
  way["sport"="bmx"]${BBOX};
  way["leisure"="track"]["sport"="cycling"]${BBOX};
  way["highway"="cycleway"]["name"~"pump|pumptrack|פאמפ",i]${BBOX};
  node["sport"="gymnastics"]["leisure"!="pitch"]${BBOX};
  node["sport"="ninja"]${BBOX};
  node["leisure"="pitch"]["sport"="volleyball"]${BBOX};
  way["leisure"="pitch"]["sport"="volleyball"]${BBOX};
);
out center tags;`;

function parseSportType(el) {
  const tags = el.tags || {};
  const leisure = tags.leisure || '';
  const sport = tags.sport || '';
  const name = (tags.name || '').toLowerCase();

  if (leisure === 'skate_park' || sport === 'skateboard') return 'skate';
  if (sport === 'bmx' || name.includes('pump') || name.includes('פאמפ')) return 'pumptrack';
  if (sport === 'cycling' && leisure === 'track') return 'pumptrack';
  if (leisure === 'fitness_station' || leisure === 'outdoor_gym' || sport === 'fitness') return 'fitness';
  if (sport === 'gymnastics' || sport === 'ninja') return 'ninja';
  if (sport === 'volleyball') return 'volleyball';
  return null;
}

async function fetchOSM() {
  console.log('🌍 שולח שאילתה ל-OpenStreetMap...');
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(QUERY),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'SportFields-IL/1.0',
    },
    signal: AbortSignal.timeout(100000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + await res.text());
  const data = await res.json();
  console.log(`📦 התקבלו ${data.elements.length} אלמנטים`);
  return data.elements;
}

async function run() {
  const elements = await fetchOSM();

  const raw = elements.map(el => {
    const sportType = parseSportType(el);
    if (!sportType) return null;

    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!lat || !lng) return null;

    const tags = el.tags || {};
    const name = tags['name:he'] || tags.name || tags['name:en']
      || `מתקן ${SPORT_NAMES_HE[sportType] || sportType}`;
    const city   = tags['addr:city'] || tags['is_in:city'] || tags['addr:place'] || null;
    const street = tags['addr:street'] || null;
    const address = [street, city].filter(Boolean).join(', ') || null;

    return { name, address, lat, lng, sportType };
  }).filter(Boolean);

  // הסרת כפילויות לפי GPS
  const seen = new Set();
  const courts = raw.filter(c => {
    const key = `${c.lat.toFixed(4)}_${c.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n✅ ${courts.length} מתקנים ייחודיים:`);
  const summary = {};
  courts.forEach(c => { summary[c.sportType] = (summary[c.sportType] || 0) + 1; });
  Object.entries(summary).sort((a,b) => b[1]-a[1])
    .forEach(([s, n]) => console.log(`   ${SPORT_NAMES_HE[s] || s}: ${n}`));

  const client = await pool.connect();
  try {
    let inserted = 0;
    let skipped  = 0;

    for (const c of courts) {
      // בדיקה אם כבר קיים מגרש ליד אותו GPS (100 מטר)
      const exists = await client.query(
        `SELECT id FROM courts
         WHERE ST_DWithin(location, ST_MakePoint($1,$2)::geography, 100)
         LIMIT 1`,
        [c.lng, c.lat]
      );
      if (exists.rows.length) { skipped++; continue; }

      await client.query(
        `INSERT INTO courts (name, address, location, sport_types, verified, photo_url)
         VALUES ($1, $2, ST_MakePoint($3,$4)::geography, $5, true, $6)`,
        [c.name, c.address, c.lng, c.lat, [c.sportType], SPORT_PHOTOS[c.sportType]]
      );
      inserted++;
    }

    console.log(`\n💾 נוספו: ${inserted} | דולגו (כפולים): ${skipped}`);
    const total = await client.query('SELECT COUNT(*) FROM courts');
    console.log(`🏟️  סה"כ מגרשים בDB: ${total.rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('❌ שגיאה:', err.message); process.exit(1); });
