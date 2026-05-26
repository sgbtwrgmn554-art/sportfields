import 'dotenv/config'
import * as path from 'path'
import * as fs from 'fs'
import { db } from './pool'

interface CourtSeed {
  name: string
  address: string
  lat: number
  lng: number
  sport_types: string[]
  city: string
  notes?: string
}

const SPORT_PHOTO: Record<string, string> = {
  basketball: 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400',
  football:   'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400',
  tennis:     'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400',
  volleyball: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400',
  fitness:    'https://images.unsplash.com/photo-1598971457999-ca4ef48a9a71?w=400',
  skate:      'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=400',
  padel:      'https://images.unsplash.com/photo-1667226935543-742afdfe5a40?w=400',
  pingpong:   'https://images.unsplash.com/photo-1611251135345-18c56206b863?w=400',
  pumptrack:  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  ninja:      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
}

async function seedCourts(city: string, file: string) {
  const filePath = path.resolve(__dirname, '../data', file)
  if (!fs.existsSync(filePath)) {
    console.error(`❌ קובץ לא נמצא: ${filePath}`)
    process.exit(1)
  }

  const courts: CourtSeed[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  console.log(`🏙️  מוסיף ${courts.length} מגרשים ל-${city}...`)

  let added = 0
  let updated = 0

  for (const court of courts) {
    const sport = court.sport_types[0]
    const photoUrl = SPORT_PHOTO[sport] ?? SPORT_PHOTO['basketball']

    // בדוק אם המגרש כבר קיים לפי שם ועיר
    const existing = await db.query(
      `SELECT id FROM courts WHERE name = $1 AND city = $2`,
      [court.name, court.city]
    )

    if (existing.rows.length > 0) {
      // עדכן מיקום אם כבר קיים
      await db.query(
        `UPDATE courts
         SET location = ST_MakePoint($1, $2)::geography,
             address = $3,
             sport_types = $4,
             photo_url = $5,
             verified = true
         WHERE id = $6`,
        [court.lng, court.lat, court.address, court.sport_types, photoUrl, existing.rows[0].id]
      )
      updated++
    } else {
      // הוסף חדש
      await db.query(
        `INSERT INTO courts (name, address, location, sport_types, city, photo_url, verified, added_by)
         VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, $6, $7, true, NULL)`,
        [court.name, court.address, court.lng, court.lat, court.sport_types, court.city, photoUrl]
      )
      added++
    }
  }

  console.log(`✅ הסתיים! נוספו: ${added} | עודכנו: ${updated}`)
  await db.end()
}

// הפעלה: npx ts-node src/db/seed-courts.ts tel-aviv
const cityArg = process.argv[2] ?? 'tel-aviv'
const fileMap: Record<string, string> = {
  'tel-aviv': 'courts-tel-aviv.json',
}

if (!fileMap[cityArg]) {
  console.error(`❌ עיר לא מוכרת: ${cityArg}. אפשרויות: ${Object.keys(fileMap).join(', ')}`)
  process.exit(1)
}

seedCourts(cityArg, fileMap[cityArg]).catch(console.error)
