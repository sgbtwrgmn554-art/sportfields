/**
 * seed.ts — מאכלס את ה-DB עם מגרשים ראשוניים בישראל
 * הרץ: npx tsx src/db/seed.ts
 */
import 'dotenv/config'
import { db } from './pool'

const COURTS = [
  { name: 'מגרש כדורגל פארק הירקון', address: 'פארק הירקון, תל אביב', lat: 32.109, lng: 34.834, sports: ['football'] },
  { name: 'מגרש כדורסל בן גוריון', address: 'שד׳ בן גוריון, תל אביב', lat: 32.080, lng: 34.781, sports: ['basketball'] },
  { name: 'כדורעף חוף גורדון', address: 'חוף גורדון, תל אביב', lat: 32.087, lng: 34.765, sports: ['volleyball'] },
  { name: 'סקייטפארק יפו', address: 'שדרות ירושלים, יפו', lat: 32.053, lng: 34.752, sports: ['skate'] },
  { name: 'כושר חוץ פארק לוינסקי', address: 'פארק לוינסקי, תל אביב', lat: 32.062, lng: 34.772, sports: ['fitness'] },
  { name: 'מגרשי טניס רמת גן', address: 'גן לאומי, רמת גן', lat: 32.068, lng: 34.822, sports: ['tennis'] },
  { name: 'מגרש כדורגל חיפה', address: 'שד׳ הנשיא, חיפה', lat: 32.813, lng: 34.990, sports: ['football'] },
  { name: 'מגרש כדורסל עיר התחתית', address: 'עיר התחתית, חיפה', lat: 32.820, lng: 34.988, sports: ['basketball'] },
  { name: 'מגרש כדורסל ירושלים', address: 'גן סאקר, ירושלים', lat: 31.785, lng: 35.213, sports: ['basketball'] },
  { name: 'מגרש כדורגל מלחה', address: 'מתחם מלחה, ירושלים', lat: 31.752, lng: 35.191, sports: ['football'] },
  { name: 'מגרש כדורגל נצרת', address: 'פארק המרכז, נצרת', lat: 32.699, lng: 35.303, sports: ['football'] },
  { name: 'מגרש כדורסל באר שבע', address: 'פארק גן הנשיא, באר שבע', lat: 31.245, lng: 34.791, sports: ['basketball'] },
  { name: 'מגרשי טניס פתח תקווה', address: 'קריית אריה, פתח תקווה', lat: 32.094, lng: 34.884, sports: ['tennis'] },
  { name: 'מגרש כדורגל נס ציונה', address: 'פארק גבעת כ"ג, נס ציונה', lat: 31.928, lng: 34.798, sports: ['football'] },
  { name: 'מגרש כדורסל ראשון לציון', address: 'פארק מנחמייה, ראשון לציון', lat: 31.964, lng: 34.804, sports: ['basketball'] },
]

async function seed() {
  console.log('🌱 מתחיל seed...')

  // בדוק שה-extension קיים
  await db.query('CREATE EXTENSION IF NOT EXISTS postgis')

  for (const court of COURTS) {
    // בדוק אם כבר קיים
    const exists = await db.query('SELECT id FROM courts WHERE name = $1', [court.name])
    if (exists.rows.length > 0) { console.log(`  ⏭️ קיים כבר: ${court.name}`); continue }

    await db.query(
      `INSERT INTO courts (name, address, location, sport_types, verified)
       VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, true)`,
      [court.name, court.address, court.lng, court.lat, court.sports]
    )
    console.log(`  ✅ ${court.name}`)
  }

  console.log(`\n✅ Seed הושלם! ${COURTS.length} מגרשים נוספו.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ שגיאה:', err.message)
  process.exit(1)
})
