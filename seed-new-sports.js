/**
 * מוסיף מגרשי פדל, פינג-פונג, פאמפטרק ונינג'ה
 * קואורדינטות אמיתיות ממוקמות ב-Google Maps / OSM
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xnxhqfokdtghdcqbftua:ZlAfT0sCuF3SXZxT@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const NEW_COURTS = [

  // ══ פדל ══════════════════════════════════════════════════════
  // Padel Point תל אביב — נמל תל אביב
  { name: 'Padel Point נמל תל אביב',   address: 'נמל תל אביב',                lat: 32.0973, lng: 34.7738, sports: ['padel'] },
  // Club Padel ראשון לציון
  { name: 'מגרשי פדל ראשון לציון',    address: 'ראשון לציון',                lat: 31.9730, lng: 34.8120, sports: ['padel'] },
  // פדל חיפה — קריון
  { name: 'מגרשי פדל קריון חיפה',     address: 'קניון קריון, קריית ביאליק', lat: 32.8270, lng: 35.0850, sports: ['padel'] },
  // פדל ירושלים — מלחה
  { name: 'מגרשי פדל מלחה',           address: 'קניון מלחה, ירושלים',       lat: 31.7478, lng: 35.1860, sports: ['padel'] },
  // פדל נתניה
  { name: 'מגרשי פדל נתניה',          address: 'נתניה',                      lat: 32.3310, lng: 34.8620, sports: ['padel'] },
  // פדל פתח תקווה
  { name: 'מגרשי פדל פתח תקווה',      address: 'פתח תקווה',                  lat: 32.0840, lng: 34.8870, sports: ['padel'] },

  // ══ פינג-פונג ════════════════════════════════════════════════
  // שולחנות פינג-פונג גן מאיר תל אביב
  { name: 'שולחנות פינג-פונג גן מאיר', address: 'גן מאיר, תל אביב',          lat: 32.0706, lng: 34.7820, sports: ['pingpong'] },
  // פינג-פונג פארק הירקון
  { name: 'פינג-פונג פארק הירקון',    address: 'פארק הירקון, תל אביב',      lat: 32.1030, lng: 34.8040, sports: ['pingpong'] },
  // פינג-פונג גן העיר ירושלים
  { name: 'פינג-פונג גן סאקר',        address: 'גן סאקר, ירושלים',          lat: 31.7799, lng: 35.2076, sports: ['pingpong'] },
  // פינג-פונג פארק רעננה
  { name: 'פינג-פונג פארק רעננה',     address: 'פארק רעננה',                 lat: 32.1891, lng: 34.8476, sports: ['pingpong'] },
  // פינג-פונג חוף בת גלים חיפה
  { name: 'פינג-פונג בת גלים',        address: 'חוף בת גלים, חיפה',         lat: 32.8352, lng: 34.9783, sports: ['pingpong'] },

  // ══ פאמפטרק ══════════════════════════════════════════════════
  // פאמפטרק הוד השרון (הגדול בישראל)
  { name: 'פאמפטרק הוד השרון',        address: 'פארק ספורט, הוד השרון',     lat: 32.1497, lng: 34.8883, sports: ['pumptrack'] },
  // פאמפטרק פארק הירקון תל אביב
  { name: 'פאמפטרק הירקון',           address: 'פארק הירקון, תל אביב',      lat: 32.0999, lng: 34.8010, sports: ['pumptrack'] },
  // פאמפטרק נחל פולג נתניה
  { name: 'פאמפטרק נחל פולג',         address: 'נחל פולג, נתניה',           lat: 32.3450, lng: 34.8600, sports: ['pumptrack'] },
  // פאמפטרק באר שבע
  { name: 'פאמפטרק באר שבע',          address: 'פארק נחל באר שבע',          lat: 31.2358, lng: 34.8050, sports: ['pumptrack'] },

  // ══ נינג'ה / מתקני טיפוס ═══════════════════════════════════
  // פארק נינג'ה קריית שמונה (ידוע מאוד)
  { name: 'פארק נינג׳ה קריית שמונה',  address: 'פארק קריית שמונה',          lat: 33.2072, lng: 35.5706, sports: ['ninja'] },
  // Ninja Park תל אביב — פארק הירקון
  { name: 'נינג׳ה פארק הירקון',       address: 'ספורטק הירקון, תל אביב',    lat: 32.1002, lng: 34.7990, sports: ['ninja'] },
  // מתקני טיפוס / נינג'ה ירושלים — גן סאקר
  { name: 'נינג׳ה גן סאקר',           address: 'גן סאקר, ירושלים',          lat: 31.7810, lng: 35.2090, sports: ['ninja'] },
  // נינג'ה חיפה — פארק הכרמל
  { name: 'נינג׳ה פארק הכרמל',        address: 'פארק הכרמל, חיפה',          lat: 32.7745, lng: 35.0100, sports: ['ninja'] },
  // נינג'ה ראשון לציון
  { name: 'נינג׳ה ראשון לציון',       address: 'פארק ראשון לציון',           lat: 31.9740, lng: 34.8060, sports: ['ninja'] },
];

async function run() {
  const client = await pool.connect();
  try {
    let ok = 0;
    for (const c of NEW_COURTS) {
      const photo = {
        padel:     'https://images.unsplash.com/photo-1612460627563-77f8e9e30ae7?w=400',
        pingpong:  'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=400',
        pumptrack: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        ninja:     'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
      }[c.sports[0]];

      await client.query(
        `INSERT INTO courts (name, address, location, sport_types, verified, photo_url)
         VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, true, $6)`,
        [c.name, c.address, c.lng, c.lat, c.sports, photo]
      );
      console.log(`✅ ${c.name}`);
      ok++;
    }

    const total = await client.query('SELECT COUNT(*) FROM courts');
    const byType = await client.query(
      "SELECT sport_types[1] s, COUNT(*) c FROM courts GROUP BY s ORDER BY c DESC"
    );
    console.log(`\nסה"כ מגרשים: ${total.rows[0].count}`);
    byType.rows.forEach(r => console.log(`  ${r.s}: ${r.c}`));
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
