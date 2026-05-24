/**
 * מעדכן ומוסיף מגרשים עם קואורדינטות מאומתות
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xnxhqfokdtghdcqbftua:ZlAfT0sCuF3SXZxT@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

// מגרשים לעדכון (שם קיים → קואורדינטות מדויקות יותר)
const UPDATES = [
  { name: 'ספורטק הירקון — כדורגל',  lat: 32.1026, lng: 34.7812 }, // רוקח/ספורטק צפון
  { name: 'מגרשי כדורסל גורדון',      lat: 32.0832, lng: 34.7675 }, // גורדון מדויק יותר
  { name: 'מגרשי טניס הירקון',        lat: 32.1035, lng: 34.7910 }, // רוקח טניס
  { name: 'גן סאקר — כדורסל וכדורגל', lat: 31.7815, lng: 35.2075 }, // גן סאקר מדויק
  { name: 'מגרש ספורט הדר',           lat: 32.7919, lng: 35.0028 }, // ספורטק חיפה
  { name: 'סקייטפארק דדו',             lat: 32.8225, lng: 34.9562 }, // פארק הכט חיפה
  { name: 'כדורעף חוף חיפה',          lat: 32.8005, lng: 34.9541 }, // חוף דדו
  { name: 'מגרש ספורט ראשון לציון',   lat: 31.9831, lng: 34.7614 }, // ספורטק מערב
];

// מגרשים חדשים שלא היו לנו
const NEW_COURTS = [
  // סקייטפארק גלית — דרום תל אביב (שונה מספורטק הירקון!)
  {
    name: 'סקייטפארק גלית',
    address: 'פארק גלית, דרום תל אביב',
    lat: 32.0624, lng: 34.7951,
    sports: ['skate'],
    photo: 'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400'
  },
  // מרכז טניס קטמון ירושלים — מיקום מדויק יותר
  {
    name: 'מגרשי טניס קטמון',
    address: 'שכונת קטמון, ירושלים',
    lat: 31.7554, lng: 35.2098,
    sports: ['tennis'],
    photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'
  },
  // סקייטפארק גן סאקר ירושלים
  {
    name: 'סקייטפארק גן סאקר',
    address: 'גן סאקר, ירושלים',
    lat: 31.7792, lng: 35.2061,
    sports: ['skate'],
    photo: 'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400'
  },
];

async function run() {
  const client = await pool.connect();
  try {
    // עדכון קואורדינטות
    console.log('📍 מעדכן קואורדינטות...');
    for (const u of UPDATES) {
      const { rowCount } = await client.query(
        `UPDATE courts SET location = ST_MakePoint($1, $2)::geography WHERE name = $3`,
        [u.lng, u.lat, u.name]
      );
      console.log(`  ${rowCount > 0 ? '✅' : '⚠️ לא נמצא'} ${u.name}`);
    }

    // הוספת מגרשים חדשים
    console.log('\n➕ מוסיף מגרשים חדשים...');
    for (const c of NEW_COURTS) {
      // בדוק שלא קיים כבר
      const exists = await client.query('SELECT id FROM courts WHERE name = $1', [c.name]);
      if (exists.rows.length > 0) {
        console.log(`  ⏭️  קיים כבר: ${c.name}`);
        continue;
      }
      await client.query(
        `INSERT INTO courts (name, address, location, sport_types, verified, photo_url)
         VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, true, $6)`,
        [c.name, c.address, c.lng, c.lat, c.sports, c.photo]
      );
      console.log(`  ✅ ${c.name}`);
    }

    const total = await client.query('SELECT COUNT(*) FROM courts');
    console.log(`\nסה"כ מגרשים: ${total.rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
