require('dotenv').config({ path: 'apps/api/.env' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  await pool.query(`
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS photo_url TEXT;
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS notes TEXT;
    CREATE INDEX IF NOT EXISTS courts_city_idx ON courts(city);
  `)
  console.log('✅ Migration הצליחה! עמודות city, photo_url, notes נוספו.')
  await pool.end()
}

run().catch(e => { console.error('❌ Migration נכשלה:', e.message); process.exit(1) })
