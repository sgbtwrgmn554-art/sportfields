/**
 * import-osm-courts.js
 * מייבא מגרשי ספורט אמיתיים מ-OpenStreetMap — GPS מדויק 100%
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xnxhqfokdtghdcqbftua:ZlAfT0sCuF3SXZxT@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const SPORT_MAP = {
  soccer: 'football', football: 'football',
  basketball: 'basketball', tennis: 'tennis',
  volleyball: 'volleyball', padel: 'padel',
  table_tennis: 'pingpong', skateboard: 'skate',
  multi: 'basketball',
};

const SPORT_NAMES_HE = {
  football: 'כדורגל', basketball: 'כדורסל', tennis: 'טניס',
  volleyball: 'כדורעף', padel: 'פדל', pingpong: 'פינג-פונג',
  skate: 'סקייטפארק', fitness: 'כושר חוץ',
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

// ישראל bbox: min_lat=29.5, min_lon=34.2, max_lat=33.4, max_lon=35.9
const OVERPASS_QUERY = `[out:json][timeout:55];
(
  node["leisure"="pitch"]["sport"~"soccer|football|basketball|tennis|volleyball|padel|table_tennis"](29.5,34.2,33.4,35.9);
  way["leisure"="pitch"]["sport"~"soccer|football|basketball|tennis|volleyball|padel|table_tennis"](29.5,34.2,33.4,35.9);
  node["leisure"="skate_park"](29.5,34.2,33.4,35.9);
  way["leisure"="skate_park"](29.5,34.2,33.4,35.9);
);
out center tags;`;

async function fetchOSM() {
  console.log('🌍 מוריד נתונים מ-OpenStreetMap...');
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(OVERPASS_QUERY),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'SportFields-IL/1.0',
    },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  console.log(`📦 התקבלו ${data.elements.length} אלמנטים גולמיים`);
  return data.elements;
}

function parseCourt(el) {
  const tags = el.tags || {};
  const leisure = tags.leisure || '';
  const sport = tags.sport || '';

  let sportType = null;
  if (leisure === 'skate_park') sportType = 'skate';
  else sportType = SPORT_MAP[sport] || null;
  if (!sportType) return null;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!lat || !lng) return null;

  // שם — עברית > אנגלית > שם ברירת מחדל לפי ספורט
  const name = tags['name:he'] || tags.name || tags['name:en']
    || `מגרש ${SPORT_NAMES_HE[sportType] || sportType}`;

  const city = tags['addr:city'] || tags['is_in:city'] || tags['addr:place'] || null;
  const street = tags['addr:street'] || null;
  const address = [street, city].filter(Boolean).join(', ') || city || null;

  return { name, address, lat, lng, sportType };
}

async function run() {
  const elements = await fetchOSM();

  // פרסור
  const raw = elements.map(parseCourt).filter(Boolean);

  // הסרת כפילויות (אותו מגרש כ-node + way)
  const seen = new Set();
  const courts = raw.filter(c => {
    const key = `${c.lat.toFixed(4)}_${c.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n✅ ${courts.length} מגרשים ייחודיים אחרי סינון כפילויות`);

  // סיכום לפי סוג
  const summary = {};
  courts.forEach(c => { summary[c.sportType] = (summary[c.sportType] || 0) + 1; });
  Object.entries(summary).sort((a,b) => b[1]-a[1])
    .forEach(([s, n]) => console.log(`   ${s}: ${n}`));

  const client = await pool.connect();
  try {
    console.log('\n🗑️  מוחק מגרשים ישנים...');
    await client.query('DELETE FROM courts WHERE added_by IS NULL');

    console.log('💾 מכניס מגרשי OSM...');
    let ok = 0;
    for (const c of courts) {
      await client.query(
        `INSERT INTO courts (name, address, location, sport_types, verified, photo_url)
         VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, true, $6)`,
        [c.name, c.address, c.lng, c.lat, [c.sportType], SPORT_PHOTOS[c.sportType]]
      );
      ok++;
    }

    const total = await client.query('SELECT COUNT(*) FROM courts');
    console.log(`\n🏟️  סה"כ מגרשי OSM בDB: ${total.rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
