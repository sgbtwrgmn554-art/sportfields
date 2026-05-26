import 'dotenv/config'
import { db } from './pool'

const PHOTOS: Record<string, string> = {
  beach:     'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
  pool:      'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=400',
  surf:      'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400',
  kayak:     'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400',
  waterpark: 'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=400',
  park:      'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400',
  hiking:    'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
  cycling:   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  dog:       'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
  picnic:    'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400',
}

const PLACES = [
  // ── חופים ──
  { name: 'חוף גורדון',        city: 'תל אביב',   lat: 32.0895, lng: 34.7679, type: 'beach' },
  { name: 'חוף הצוק',          city: 'תל אביב',   lat: 32.1089, lng: 34.7601, type: 'beach' },
  { name: 'חוף הלוחמים',       city: 'תל אביב',   lat: 32.0712, lng: 34.7601, type: 'beach' },
  { name: 'חוף נצרת עילית',    city: 'הרצליה',    lat: 32.1678, lng: 34.7889, type: 'beach' },
  { name: 'חוף שבת',           city: 'הרצליה',    lat: 32.1534, lng: 34.7812, type: 'beach' },
  { name: 'חוף כרמל',          city: 'חיפה',       lat: 32.7823, lng: 34.9534, type: 'beach' },
  { name: 'חוף בת גלים',       city: 'חיפה',       lat: 32.8201, lng: 34.9623, type: 'beach' },
  { name: 'חוף נהריה',         city: 'נהריה',      lat: 33.0089, lng: 35.0856, type: 'beach' },
  { name: 'חוף נתניה',         city: 'נתניה',      lat: 32.3312, lng: 34.8534, type: 'beach' },
  { name: 'חוף אשקלון',        city: 'אשקלון',     lat: 31.6712, lng: 34.5423, type: 'beach' },
  { name: 'חוף אשדוד',         city: 'אשדוד',      lat: 31.7923, lng: 34.6234, type: 'beach' },
  { name: 'חוף עכו',           city: 'עכו',        lat: 32.9234, lng: 35.0712, type: 'beach' },
  { name: 'חוף נהריה הצפוני',  city: 'נהריה',      lat: 33.0156, lng: 35.0823, type: 'beach' },

  // ── בריכות ──
  { name: 'בריכת ירקון',       city: 'תל אביב',   lat: 32.0989, lng: 34.8012, type: 'pool' },
  { name: 'בריכת גורדון',      city: 'תל אביב',   lat: 32.0867, lng: 34.7712, type: 'pool' },
  { name: 'בריכת עיריית חיפה', city: 'חיפה',       lat: 32.8056, lng: 34.9878, type: 'pool' },
  { name: 'בריכת מכבי ראשל"צ', city: 'ראשון לציון', lat: 31.9634, lng: 34.8023, type: 'pool' },
  { name: 'בריכת פתח תקווה',   city: 'פתח תקווה', lat: 32.0912, lng: 34.8912, type: 'pool' },
  { name: 'בריכת נתניה',       city: 'נתניה',      lat: 32.3256, lng: 34.8589, type: 'pool' },
  { name: 'בריכת הרצליה',      city: 'הרצליה',    lat: 32.1623, lng: 34.8445, type: 'pool' },
  { name: 'בריכת באר שבע',     city: 'באר שבע',   lat: 31.2534, lng: 34.7956, type: 'pool' },

  // ── גלישה ──
  { name: 'ספוט גלישה חוף הצוק',  city: 'תל אביב', lat: 32.1078, lng: 34.7589, type: 'surf' },
  { name: 'ספוט גלישה נהריה',      city: 'נהריה',   lat: 33.0112, lng: 35.0834, type: 'surf' },
  { name: 'ספוט גלישה חיפה',       city: 'חיפה',    lat: 32.7889, lng: 34.9512, type: 'surf' },

  // ── פארקים ──
  { name: 'פארק הירקון',        city: 'תל אביב',  lat: 32.1045, lng: 34.8234, type: 'park' },
  { name: 'גן לאומי רמת גן',    city: 'רמת גן',   lat: 32.0823, lng: 34.8334, type: 'park' },
  { name: 'פארק אריאל שרון',    city: 'תל אביב',  lat: 32.0712, lng: 34.8512, type: 'park' },
  { name: 'פארק הכרמל',         city: 'חיפה',      lat: 32.7523, lng: 35.0123, type: 'park' },
  { name: 'גן סאקר',            city: 'ירושלים',  lat: 31.7912, lng: 35.2105, type: 'park' },
  { name: 'פארק לאומי עין גדי',  city: 'עין גדי',  lat: 31.4623, lng: 35.3934, type: 'park' },

  // ── גינות כלבים ──
  { name: 'גינת כלבים נמל תל אביב', city: 'תל אביב', lat: 32.0978, lng: 34.7756, type: 'dog' },
  { name: 'גינת כלבים פארק הירקון',  city: 'תל אביב', lat: 32.1023, lng: 34.8189, type: 'dog' },
  { name: 'גינת כלבים הרצליה פיתוח', city: 'הרצליה',  lat: 32.1534, lng: 34.8012, type: 'dog' },
]

async function seed() {
  console.log('🌱 מוסיף מקומות מים וטבע...')
  let added = 0

  for (const p of PLACES) {
    const exists = await db.query(`SELECT id FROM courts WHERE name = $1`, [p.name])
    if (exists.rows.length > 0) { console.log(`  ⏭️  ${p.name}`); continue }

    await db.query(
      `INSERT INTO courts (name, address, city, location, sport_types, verified, photo_url)
       VALUES ($1, $2, $3, ST_MakePoint($4, $5)::geography, $6, true, $7)`,
      [p.name, p.city, p.city, p.lng, p.lat, [p.type], PHOTOS[p.type]]
    )
    console.log(`  ✅ ${p.name}`)
    added++
  }

  console.log(`\n✅ נוספו ${added} מקומות חדשים!`)
  process.exit(0)
}

seed().catch(e => { console.error(e.message); process.exit(1) })
