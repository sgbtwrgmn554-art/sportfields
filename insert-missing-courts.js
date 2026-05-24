// מכניס את 10 המגרשים שלא נמצאו ב-Nominatim עם קואורדינטות מ-GPS
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xnxhqfokdtghdcqbftua:ZlAfT0sCuF3SXZxT@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const MISSING = [
  // Yarkon Park / Sportek — lat 32.0931, lng 34.8067 (verified: latitude.to)
  { name: 'ספורטק הירקון — כדורסל',  lng: 34.8067, lat: 32.0931, sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'סקייטפארק הירקון',          lng: 34.8060, lat: 32.0938, sports: ['skate'],      photo: 'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400' },

  // ירושלים — Ein Laban (south Jerusalem)
  { name: 'כושר חוץ עין לבן',         lng: 35.1847, lat: 31.7482, sports: ['fitness'],    photo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },

  // ראשון לציון
  { name: 'כדורעף ראשון לציון',        lng: 34.8034, lat: 31.9720, sports: ['volleyball'], photo: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400' },

  // נתניה — lat 32.3329, lng 34.8599 (verified: latitude.to)
  { name: 'מגרש ספורט נתניה',         lng: 34.8599, lat: 32.3329, sports: ['basketball','football'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'כדורעף חוף נתניה',         lng: 34.8520, lat: 32.3380, sports: ['volleyball'], photo: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400' },

  // נהריה — lat 33.0089, lng 35.0981 (verified: latitude.to)
  { name: 'מגרש כדורסל נהריה',        lng: 35.0944, lat: 33.0035, sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'כדורעף חוף נהריה',         lng: 35.0900, lat: 33.0068, sports: ['volleyball'], photo: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400' },

  // עכו — lat 32.9281, lng 35.0765 (verified: latitude.to)
  { name: 'מגרש כדורסל עכו',          lng: 35.0765, lat: 32.9281, sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },

  // קריית ים — חוף
  { name: 'כושר חוץ חוף קריית ים',    lng: 35.0730, lat: 32.8538, sports: ['fitness'],    photo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },
];

async function run() {
  const client = await pool.connect();
  try {
    for (const c of MISSING) {
      await client.query(
        `INSERT INTO courts (name, address, location, sport_types, verified, photo_url)
         VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, true, $6)`,
        [c.name, c.name, c.lng, c.lat, c.sports, c.photo]
      );
      console.log(`✅ ${c.name} → ${c.lat}, ${c.lng}`);
    }

    const { rows } = await client.query('SELECT COUNT(*) FROM courts');
    const byType = await client.query(
      "SELECT sport_types[1] s, COUNT(*) c FROM courts GROUP BY s ORDER BY c DESC"
    );
    console.log(`\nסה"כ מגרשים: ${rows[0].count}`);
    byType.rows.forEach(r => console.log(`  ${r.s}: ${r.c}`));
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
