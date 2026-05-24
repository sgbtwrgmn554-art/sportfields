const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.xnxhqfokdtghdcqbftua:ZlAfT0sCuF3SXZxT@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const sql = `
ALTER TABLE courts ADD COLUMN IF NOT EXISTS rating_sum INTEGER DEFAULT 0;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS court_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(court_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_points (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  checkin_count INTEGER DEFAULT 0,
  badge TEXT DEFAULT 'מתחיל',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

pool.query(sql)
  .then(() => { console.log('✅ DB עודכן בהצלחה!'); pool.end(); })
  .catch(e => { console.error('❌', e.message); pool.end(); });
