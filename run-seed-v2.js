const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xnxhqfokdtghdcqbftua:ZlAfT0sCuF3SXZxT@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'seed-courts-v2.sql'), 'utf-8');
  const client = await pool.connect();
  try {
    console.log('🗑️  מוחק מגרשים קיימים...');
    await client.query('DELETE FROM courts WHERE added_by IS NULL');
    console.log('✅ נמחק');

    console.log('🏟️  מכניס 25 מגרשים חדשים...');
    // Run the INSERT part only
    const insertSql = sql.split('DELETE FROM courts WHERE added_by IS NULL;')[1];
    await client.query(insertSql);

    const { rows } = await client.query('SELECT COUNT(*) FROM courts');
    console.log(`✅ הוכנסו בהצלחה! סה"כ מגרשים במסד: ${rows[0].count}`);
  } catch (err) {
    console.error('❌ שגיאה:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
