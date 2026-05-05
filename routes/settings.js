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
  'notifications.supportEmail': '',
  'landing.theme': 'dark',
  'landing.heroTagline': 'Pastelería artesanal con alma',
  'landing.aboutTitle': 'Hecha con amor,\npensada en vos',
  'landing.aboutText1': 'Soy Tini, chef pastelera profesional. Cada torta, cada caja, cada alfajor que sale de mi cocina lleva tiempo, técnica y mucho cariño. No hago pastelería en serie — hago piezas únicas para momentos únicos.',
  'landing.aboutText2': 'Trabajo con ingredientes de primera calidad y elaboración artesanal. Desde una merienda especial hasta el postre de tu evento más importante, me encargo de que cada bocado sea una experiencia.',
  'landing.deliveryZone': 'CABA y GBA. Coordinamos día y horario por WhatsApp.',
  'landing.pickupZone': 'Sin costo adicional. Zona Palermo / Villa del Parque.',
  'landing.ctaTitle': '¿Te dio hambre?',
  'landing.ctaSubtitle': 'Explorá el catálogo completo y armá tu pedido.',
  'landing.specialty1Title': 'Tortas de diseño',
  'landing.specialty1Desc': 'Para cumpleaños, casamientos y celebraciones. Personalizadas a tu gusto.',
  'landing.specialty2Title': 'Bombones & tabletas',
  'landing.specialty2Desc': 'Chocolate de primera selección, rellenos artesanales únicos.',
  'landing.specialty3Title': 'Cajas de degustación',
  'landing.specialty3Desc': 'Alfajores, sablés y petit fours. Perfectas para regalar o compartir.',
  'landing.specialty4Title': 'Tartas & tarteletas',
  'landing.specialty4Desc': 'Masa casera, rellenos de temporada. Lemon curd, frangipane, dulce de leche.',
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

// Helper: Convierte un objeto anidado a un objeto plano con sintaxis de punto
function flatten(obj, prefix = '') {
  let result = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      const nested = flatten(obj[key], prefix + key + '.');
      result = { ...result, ...nested };
    } else {
      result[prefix + key] = obj[key];
    }
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

// PUT /api/settings
// Actualiza o crea múltiples configuraciones recibiendo un objeto JSON anidado
router.put('/', async (req, res) => {
  try {
    const nestedData = req.body;
    
    if (!nestedData || typeof nestedData !== 'object') {
      return res.status(400).json({ error: 'Debes enviar un objeto JSON en el body' });
    }

    const flatData = flatten(nestedData);
    const updatedKeys = [];

    // Iteramos y aplicamos un UPSERT en cada clave
    for (const [key, value] of Object.entries(flatData)) {
      const stringValue = JSON.stringify(value);
      await db.query(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP) 
        ON CONFLICT (key) 
        DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `, [key, stringValue]);
      updatedKeys.push(key);
    }
    
    res.json({ success: true, message: 'Configuraciones actualizadas en bloque', keys: updatedKeys });
  } catch (error) {
    console.error('Error actualizando configuraciones en bloque:', error);
    res.status(500).json({ error: 'Error interno al actualizar configuraciones' });
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
