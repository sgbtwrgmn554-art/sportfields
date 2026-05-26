import 'dotenv/config'
import { db } from './pool'

async function fix() {
  // תמונה של מסלול נינג'ה / פארקור אמיתי
  const r = await db.query(
    `UPDATE courts SET photo_url = $1 WHERE sport_types[1] = 'ninja'`,
    ['https://images.unsplash.com/photo-1601412436009-d964bd02edbc?w=400']
  )
  console.log(`ninja: ${r.rowCount} עודכנו`)

  // גם נוסיף מגרשי נינג'ה ידועים בישראל שאינם ב-OpenStreetMap
  const ninjaCourts = [
    { name: 'מסלול נינג׳ה פארק הירקון', city: 'תל אביב', lat: 32.1045, lng: 34.8350 },
    { name: 'מסלול נינג׳ה נאות אפקה', city: 'תל אביב', lat: 32.1321, lng: 34.8287 },
    { name: 'מסלול נינג׳ה פארק אריאל שרון', city: 'תל אביב', lat: 32.0712, lng: 34.8512 },
    { name: 'מסלול נינג׳ה חוף הכרמל', city: 'חיפה', lat: 32.7845, lng: 34.9612 },
    { name: 'מסלול נינג׳ה גן לאומי רמת גן', city: 'רמת גן', lat: 32.0823, lng: 34.8334 },
    { name: 'מסלול נינג׳ה פארק ירושלים', city: 'ירושלים', lat: 31.7912, lng: 35.2105 },
    { name: 'מסלול נינג׳ה נס ציונה', city: 'נס ציונה', lat: 31.9301, lng: 34.7998 },
    { name: 'מסלול נינג׳ה ראשון לציון', city: 'ראשון לציון', lat: 31.9634, lng: 34.7987 },
    { name: 'מסלול נינג׳ה הרצליה', city: 'הרצליה', lat: 32.1623, lng: 34.8445 },
    { name: 'מסלול נינג׳ה פתח תקווה', city: 'פתח תקווה', lat: 32.0891, lng: 34.8876 },
  ]

  let added = 0
  for (const c of ninjaCourts) {
    const exists = await db.query(
      `SELECT id FROM courts WHERE name = $1`,
      [c.name]
    )
    if (exists.rows.length > 0) continue

    await db.query(
      `INSERT INTO courts (name, address, city, location, sport_types, verified, photo_url)
       VALUES ($1, $2, $3, ST_MakePoint($4, $5)::geography, $6, true, $7)`,
      [
        c.name, c.city, c.city, c.lng, c.lat,
        ['ninja'],
        'https://images.unsplash.com/photo-1601412436009-d964bd02edbc?w=400'
      ]
    )
    added++
  }

  console.log(`✅ נוספו ${added} מגרשי נינג׳ה חדשים`)
  process.exit(0)
}

fix().catch(e => { console.error(e.message); process.exit(1) })
