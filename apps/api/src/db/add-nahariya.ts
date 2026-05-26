import 'dotenv/config'
import { db } from './pool'

async function add() {
  const courts = [
    { name: 'מסלול נינג׳ה נהריה', city: 'נהריה', lat: 33.0045, lng: 35.0923 },
  ]

  for (const c of courts) {
    const exists = await db.query(`SELECT id FROM courts WHERE name = $1`, [c.name])
    if (exists.rows.length > 0) { console.log('כבר קיים'); continue }

    await db.query(
      `INSERT INTO courts (name, address, city, location, sport_types, verified, photo_url)
       VALUES ($1, $2, $3, ST_MakePoint($4, $5)::geography, $6, true, $7)`,
      [c.name, c.city, c.city, c.lng, c.lat, ['ninja'],
       'https://images.unsplash.com/photo-1601412436009-d964bd02edbc?w=400']
    )
    console.log(`✅ נוסף: ${c.name}`)
  }
  process.exit(0)
}

add().catch(e => { console.error(e.message); process.exit(1) })
