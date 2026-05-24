/**
 * geocode-courts.js v2 — שמות פשוטים יותר לחיפוש Nominatim
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xnxhqfokdtghdcqbftua:ZlAfT0sCuF3SXZxT@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const COURTS = [
  // ══ תל אביב ══
  { name: 'מגרשי כדורסל גורדון',       search: 'Gordon Beach Tel Aviv',                      sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'ספורטק הירקון — כדורסל',    search: 'Sportek HaYarkon Tel Aviv',                   sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'ספורטק הירקון — כדורגל',    search: 'HaYarkon Park Tel Aviv',                      sports: ['football'],   photo: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400' },
  { name: 'ספורטק הירקון — טניס',      search: 'Yarkon Park Tel Aviv Israel',                  sports: ['tennis'],     photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400' },
  { name: 'ספורטק הירקון — כדורעף',   search: 'פארק הירקון תל אביב',                          sports: ['volleyball'], photo: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400' },
  { name: 'סקייטפארק הירקון',           search: 'Sportek Yarkon Park Israel',                   sports: ['skate'],      photo: 'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400' },
  { name: 'כדורעף חוף גורדון',         search: 'חוף גורדון תל אביב',                           sports: ['volleyball'], photo: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400' },
  { name: 'כושר חוץ חוף פרישמן',      search: 'Frishman Beach Tel Aviv Israel',               sports: ['fitness'],    photo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },
  { name: 'כושר חוץ חוף הצוק',        search: 'Hatzuk Beach Tel Aviv Israel',                 sports: ['fitness'],    photo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },

  // ══ ירושלים ══
  { name: 'גן סאקר — כדורסל וכדורגל', search: 'גן סאקר ירושלים',                              sports: ['basketball','football'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'כדורעף גן הפעמון',          search: 'Liberty Bell Park Jerusalem',                   sports: ['volleyball'], photo: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400' },
  { name: 'מגרש כדורסל קטמון',        search: 'Katamon Jerusalem Israel',                      sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'כושר חוץ עין לבן',         search: 'Ein Laban Jerusalem Israel',                    sports: ['fitness'],    photo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },

  // ══ חיפה ══
  { name: 'מגרש ספורט הדר',           search: 'Hadar HaCarmel Haifa Israel',                   sports: ['basketball','football'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'מגרשי טניס הכרמל',         search: 'Carmel Haifa Israel',                           sports: ['tennis'],     photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400' },
  { name: 'כושר חוץ חוף בת גלים',     search: 'Bat Galim Beach Haifa',                         sports: ['fitness'],    photo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },
  { name: 'סקייטפארק דדו',             search: 'Dado Beach Haifa Israel',                       sports: ['skate'],      photo: 'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400' },
  { name: 'כדורעף חוף חיפה',          search: 'Zamir Beach Haifa Israel',                      sports: ['volleyball'], photo: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400' },

  // ══ באר שבע ══
  { name: 'מגרש כדורסל פארק באר שבע', search: 'Beer Sheva Park Israel',                        sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'מגרש כדורגל באר שבע',      search: 'Beer Sheva stadium Israel',                     sports: ['football'],   photo: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400' },
  { name: 'כושר חוץ נחל באר שבע',     search: 'Nahal Beer Sheva Israel',                       sports: ['fitness'],    photo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },

  // ══ ראשון לציון ══
  { name: 'מגרש ספורט ראשון לציון',   search: 'Rishon LeZion Park Israel',                     sports: ['basketball','football'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'מגרשי טניס נחלת יהודה',    search: 'Nahalat Yehuda Rishon LeZion',                  sports: ['tennis'],     photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400' },
  { name: 'כדורעף ראשון לציון',        search: 'Rishon LeZion Israel beach volleyball',         sports: ['volleyball'], photo: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400' },

  // ══ נתניה ══
  { name: 'מגרש ספורט נתניה',         search: 'Independence Park Netanya Israel',               sports: ['basketball','football'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'כדורעף חוף נתניה',         search: 'Netanya Beach Israel',                           sports: ['volleyball'], photo: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400' },

  // ══ רעננה ══
  { name: 'פארק ספורט רעננה',          search: 'Raanana Park Israel',                            sports: ['basketball','tennis'],   photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400' },

  // ══ מרכז ══
  { name: 'מגרש כדורסל רמת גן',       search: 'National Park Ramat Gan Israel',                 sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'מגרש כדורגל גבעתיים',      search: 'Givatayim Park Israel',                          sports: ['football'],   photo: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400' },
  { name: 'מגרש ספורט פתח תקווה',     search: 'Afek Park Petah Tikva Israel',                   sports: ['basketball','football'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'סקייטפארק הוד השרון',       search: 'Hod HaSharon Israel park',                       sports: ['skate'],      photo: 'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400' },

  // ══ נהריה ══
  { name: 'מגרש כדורסל נהריה',        search: 'Nahariya sport Israel',                           sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'מגרשי טניס נהריה',         search: 'HaGaaton Boulevard Nahariya',                     sports: ['tennis'],     photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400' },
  { name: 'כדורעף חוף נהריה',         search: 'Nahariya Beach Israel',                            sports: ['volleyball'], photo: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400' },

  // ══ עכו ══
  { name: 'מגרש כדורסל עכו',          search: 'Acre Israel sport',                               sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'מגרש כדורגל עכו',          search: 'Acre Stadium Israel',                             sports: ['football'],   photo: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400' },

  // ══ הקריות ══
  { name: 'מגרש ספורט קריית אתא',     search: 'Kiryat Ata Israel',                               sports: ['basketball','football'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'מגרש כדורסל קריית ביאליק', search: 'Kiryat Bialik Israel',                             sports: ['basketball'], photo: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400' },
  { name: 'כושר חוץ חוף קריית ים',    search: 'Kiryat Yam Beach Israel',                          sports: ['fitness'],    photo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },
];

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=il`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SportFields-App/1.0' } });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const client = await pool.connect();
  try {
    console.log('🗑️  מוחק מגרשים ישנים...\n');
    await client.query('DELETE FROM courts WHERE added_by IS NULL');

    let ok = 0, failed = 0;
    const fallbacks = [];

    for (const court of COURTS) {
      process.stdout.write(`  🔍 ${court.name.padEnd(32)} `);
      const geo = await geocode(court.search);

      if (!geo) {
        console.log('❌');
        fallbacks.push(court.name + ' → ' + court.search);
        failed++;
      } else {
        await client.query(
          `INSERT INTO courts (name, address, location, sport_types, verified, photo_url)
           VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, true, $6)`,
          [court.name, court.search, geo.lng, geo.lat, court.sports, court.photo]
        );
        console.log(`✅  ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`);
        ok++;
      }
      await sleep(1200);
    }

    const total = await client.query('SELECT COUNT(*) FROM courts');
    const byType = await client.query(
      "SELECT sport_types[1] as s, COUNT(*) c FROM courts GROUP BY s ORDER BY c DESC"
    );

    console.log(`\n✅ נכנסו: ${ok}  ❌ נכשלו: ${failed}  סה"כ: ${total.rows[0].count}`);
    byType.rows.forEach(r => console.log(`  ${r.s}: ${r.c}`));

    if (fallbacks.length) {
      console.log('\n⚠️  לא נמצאו (צריך תיקון ידני):');
      fallbacks.forEach(f => console.log('  -', f));
    }

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
