require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS para permitir requests desde el frontend
app.use(cors({
  origin: 'http://localhost:5173' // Permitir localhost:5173
}));

// Middleware para parsear JSON
app.use(express.json());

// Endpoint GET "/"
app.get('/', (req, res) => {
  res.send('Backend funcionando');
});

// Endpoint GET "/api/health"
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
