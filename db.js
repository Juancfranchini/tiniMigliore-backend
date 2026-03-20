const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Dependiendo de tu URL en Railway, a veces es necesario el SSL. 
  // Configuramos rejectUnauthorized en false para evitar errores de certificados autofirmados.
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  console.error('Error inesperado de PostgreSQL:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
