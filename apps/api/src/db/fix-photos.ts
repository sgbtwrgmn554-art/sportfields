import 'dotenv/config'
import { db } from './pool'

const SPORT_PHOTO: Record<string, string> = {
  fitness:  'https://images.unsplash.com/photo-1598971457999-ca4ef48a9a71?w=400',
  skate:    'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=400',
  padel:    'https://images.unsplash.com/photo-1667226935543-742afdfe5a40?w=400',
  pingpong: 'https://images.unsplash.com/photo-1611251135345-18c56206b863?w=400',
  ninja:    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
}

async function fix() {
  for (const [sport, url] of Object.entries(SPORT_PHOTO)) {
    const r = await db.query(
      `UPDATE courts SET photo_url = $1 WHERE sport_types[1] = $2`,
      [url, sport]
    )
    console.log(`${sport}: ${r.rowCount} עודכנו`)
  }
  console.log('✅ סיים!')
  process.exit(0)
}

fix().catch(e => { console.error(e.message); process.exit(1) })
