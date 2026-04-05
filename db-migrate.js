require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && {
    ssl: { rejectUnauthorized: false }
  })
});

const sql = `
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time_range TEXT;
`;

async function runInit() {
  try {
    await pool.query(sql);
    console.log('Migration OK');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runInit();
