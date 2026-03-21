require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const sectionsRouter = require('./routes/sections');
const productsRouter = require('./routes/products');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
}));

app.use(express.json());

app.use('/api/sections', sectionsRouter);
app.use('/api/products', productsRouter);
app.use('/api/settings', settingsRouter);

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