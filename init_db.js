require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && {
    ssl: { rejectUnauthorized: false }
  })
});

const initSql = `
-- Tabla sections
CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla settings
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function runInit() {
  console.log('Iniciando script de creación de tablas...');
  try {
    const res = await pool.query(initSql);
    console.log('¡Tablas creadas exitosamente!');
  } catch (error) {
    console.error('Error al crear las tablas:', error);
  } finally {
    await pool.end();
  }
}

runInit();
