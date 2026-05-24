const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xnxhqfokdtghdcqbftua:ZlAfT0sCuF3SXZxT@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const sql = fs.readFileSync('seed-courts-v3.sql', 'utf-8');
  const client = await pool.connect();
  try {
    console.log('מוחק מגרשים ישנים...');
    await client.query('DELETE FROM courts WHERE added_by IS NULL');

    const insertSql = sql.split('DELETE FROM courts WHERE added_by IS NULL;')[1];
    console.log('מכניס מגרשים חדשים...');
    await client.query(insertSql);

    const byType = await client.query(
      "SELECT sport_types[1] as sport, COUNT(*) FROM courts GROUP BY sport_types[1] ORDER BY sport_types[1]"
    );
    console.log('\nסה"כ לפי סוג ספורט:');
    byType.rows.forEach(r => console.log('  ' + r.sport + ': ' + r.count));

    const total = await client.query('SELECT COUNT(*) FROM courts');
    console.log('\nסה"כ מגרשים: ' + total.rows[0].count);
  } catch (err) {
    console.error('שגיאה:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
