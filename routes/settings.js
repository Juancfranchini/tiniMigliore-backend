const express = require('express');
const router = express.Router();
const db = require('../db');

const DEFAULT_SETTINGS = {
  'branding.businessName': 'Tini Migliore',
  'branding.logoUrl': '',
  'contacto.instagramUrl': '',
  'contacto.tiktokUrl': '',
  'contacto.whatsappUrl': '',
  'contacto.email': '',
  'media.cloudinaryCloudName': '',
  'media.cloudinaryUploadPreset': '',
  'media.cloudinaryFolder': '',
  'checkout.defaultShippingFee': 0,
  'checkout.pickupEnabled': true,
  'checkout.deliveryEnabled': true,
  'notifications.senderName': 'Tini Migliore',
  'notifications.supportEmail': ''
};

// Inicializar configuraciones por defecto si no existen
const initDefaultSettings = async () => {
  console.log('Verificando inicialización de configuraciones...');
  try {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const stringValue = JSON.stringify(value);
      // Insertará solo si la clave no existe (ON CONFLICT DO NOTHING)
      await db.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        [key, stringValue]
      );
    }
    console.log('Configuraciones por defecto sincronizadas correctamente.');
  } catch (err) {
    console.error('Error inicializando settings en BD:', err);
  }
};

// Arrancamos la inicialización al cargar el módulo de rutas
initDefaultSettings();

// Helper: Convierte un objeto plano con sintaxis de punto a un objeto anidado
// ej: { "branding.businessName": "Tini" } -> { branding: { businessName: "Tini" } }
function unflatten(data) {
  const result = {};
  for (const key in data) {
    const keys = key.split('.');
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const part = keys[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    current[keys[keys.length - 1]] = data[key];
  }
  return result;
}

// GET /api/settings
// Obtiene todas las configuraciones y las devuelve como un objeto JSON anidado
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM settings');
    const flatData = {};
    
    result.rows.forEach(row => {
      let parsedValue;
      try {
        parsedValue = JSON.parse(row.value);
      } catch (e) {
        // En caso de que se haya guardado como un texto literal sin comillas (fallback)
        parsedValue = row.value;
      }
      flatData[row.key] = parsedValue;
    });

    const nestedData = unflatten(flatData);
    res.json(nestedData);
  } catch (error) {
    console.error('Error obteniendo settings:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener settings' });
  }
});

// GET /api/settings/:key
// Obtiene una configuración específica usando su clave plana (ej: /api/settings/branding.businessName)
router.get('/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const result = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting no encontrado' });
    }
    
    let parsedValue;
    try {
      parsedValue = JSON.parse(result.rows[0].value);
    } catch (e) {
      parsedValue = result.rows[0].value;
    }
    
    res.json({ key, value: parsedValue });
  } catch (error) {
    console.error(`Error obteniendo el setting ${key}:`, error);
    res.status(500).json({ error: 'Error interno al obtener el setting' });
  }
});

// PUT /api/settings/:key
// Actualiza o crea una configuración usando su clave plana
router.put('/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  if (value === undefined) {
    return res.status(400).json({ error: 'Debes proveer la propiedad "value" en el cuerpo de la petición' });
  }

  try {
    // Stringify preserves proper types like integers and booleans as text
    const stringValue = JSON.stringify(value);
    
    await db.query(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES ($1, $2, CURRENT_TIMESTAMP) 
      ON CONFLICT (key) 
      DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
    `, [key, stringValue]);
    
    res.json({ key, value });
  } catch (error) {
    console.error(`Error actualizando el setting ${key}:`, error);
    res.status(500).json({ error: 'Error interno al actualizar el setting' });
  }
});

module.exports = router;
