const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Dependiendo de tu URL en Railway, a veces es necesario el SSL. 
  // Solo aplicamos SSL si no estamos en localhost (o si forzamos vía NODE_ENV)
  ...(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && {
    ssl: { rejectUnauthorized: false }
  })
});

pool.on('error', (err) => {
  console.error('Error inesperado de PostgreSQL:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
