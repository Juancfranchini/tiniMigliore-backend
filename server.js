require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const sectionsRouter = require('./routes/sections');
const productsRouter = require('./routes/products');
const settingsRouter = require('./routes/settings');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedSpecificOrigins = [
  'http://localhost:5173',
  'https://tini-migliore1.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origin (como Postman o curl)
    if (!origin) return callback(null, true);

    // Permitir orígenes permitidos explícitamente
    if (allowedSpecificOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Permitir dinámicamente cualquier subdominio de Vercel (deploy previews)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Mantener compatibilidad con otras URLs mediante variables de entorno
    if (process.env.FRONTEND_URLS) {
      const extraOrigins = process.env.FRONTEND_URLS.split(',').map(url => url.trim());
      if (extraOrigins.includes(origin)) {
        return callback(null, true);
      }
    }

    // Rechazar cualquier otro origen
    return callback(new Error('Bloqueado por reglas de CORS'), false);
  }
}));

app.use(express.json());

app.use('/api/sections', sectionsRouter);
app.use('/api/products', productsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/orders', ordersRouter);

app.get('/', (req, res) => {
  res.send('Backend funcionando');
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/db-test', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      ok: true,
      timestamp: result.rows[0].now,
      message: 'Conexión a PostgreSQL exitosa!'
    });
  } catch (error) {
    console.error('Error probando la BD:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'No se pudo conectar a la base de datos',
      details: error.message 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});