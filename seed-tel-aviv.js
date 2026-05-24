require('dotenv').config({ path: 'apps/api/.env' })
const { Pool } = require('pg')
const fs = require('fs')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const SPORT_PHOTO = {
  basketball: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400',
  football:   'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400',
  tennis:     'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400',
  volleyball: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400',
}

const courts = JSON.parse(fs.readFileSync('apps/api/src/data/courts-tel-aviv.json', 'utf-8'))

async function seed() {
  let added = 0, updated = 0

  for (const court of courts) {
    const sport = court.sport_types[0]
    const photo = SPORT_PHOTO[sport] ?? SPORT_PHOTO.basketball

    const existing = await pool.query(
      `SELECT id FROM courts WHERE name = $1 AND city = $2`,
      [court.name, court.city]
    )

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE courts SET
           location = ST_MakePoint($1, $2)::geography,
           address = $3, sport_types = $4, photo_url = $5,
           city = $6, notes = $7, verified = true
         WHERE id = $8`,
        [court.lng, court.lat, court.address, court.sport_types,
         photo, court.city, court.notes ?? null, existing.rows[0].id]
      )
      updated++
    } else {
      await pool.query(
        `INSERT INTO courts (name, address, location, sport_types, city, photo_url, notes, verified)
         VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, $6, $7, $8, true)`,
        [court.name, court.address, court.lng, court.lat,
         court.sport_types, court.city, photo, court.notes ?? null]
      )
      added++
    }
  }

  console.log(`✅ תל אביב: נוספו ${added} מגרשים, עודכנו ${updated}`)
  await pool.end()
}

seed().catch(e => { console.error('❌ שגיאה:', e.message); process.exit(1) })
