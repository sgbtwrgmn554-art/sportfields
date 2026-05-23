import 'dotenv/config'
import { db } from './pool'

const SPORT_PHOTO: Record<string, string> = {
  basketball: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400',
  football: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400',
  tennis: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400',
}

const SPORT_MAP: Record<string, string> = {
  basketball: 'basketball',
  soccer: 'football',
  football: 'football',
  tennis: 'tennis',
}

async function fetchCourtsFromOSM() {
  // Overpass API — מושך מגרשי ספורט בישראל לפי bounding box
  const query = `
    [out:json][timeout:60];
    (
      node["leisure"="pitch"]["sport"~"basketball|soccer|football|tennis"](29.5,34.2,33.4,35.9);
      way["leisure"="pitch"]["sport"~"basketball|soccer|football|tennis"](29.5,34.2,33.4,35.9);
    );
    out center 300;
  `

  console.log('שולף מגרשים מ-OpenStreetMap...')
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  })

  const data = await res.json() as any
  const elements = data.elements as any[]

  const courts = elements
    .filter((el) => {
      const sport = el.tags?.sport
      return sport && SPORT_MAP[sport]
    })
    .map((el) => {
      const lat = el.lat ?? el.center?.lat
      const lng = el.lon ?? el.center?.lon
      const sport = SPORT_MAP[el.tags.sport]
      const name = el.tags?.name || el.tags?.['name:he'] || `מגרש ${el.tags.sport}`
      return { lat, lng, sport, name }
    })
    .filter((c) => c.lat && c.lng)

  console.log(`נמצאו ${courts.length} מגרשים`)

  // מחיקת מגרשים ישנים
  await db.query('DELETE FROM courts WHERE added_by IS NULL')

  // הוספת מגרשים חדשים
  let added = 0
  for (const court of courts) {
    await db.query(
      `INSERT INTO courts (name, location, sport_types, verified, photo_url)
       VALUES ($1, ST_MakePoint($2, $3)::geography, $4, true, $5)
       ON CONFLICT DO NOTHING`,
      [court.name, court.lng, court.lat, [court.sport], SPORT_PHOTO[court.sport]]
    )
    added++
  }

  console.log(`✅ נוספו ${added} מגרשים מ-OpenStreetMap`)
  await db.end()
}

fetchCourtsFromOSM().catch(console.error)
