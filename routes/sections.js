const express = require('express');
const router = express.Router();
const db = require('../db');

// Utilidad simple para respuestas JSON
const sendResponse = (res, success, dataOrError, statusCode = 200) => {
  if (success) {
    return res.status(statusCode).json(dataOrError);
  }
  return res.status(statusCode).json({ success: false, error: dataOrError, message: dataOrError });
};

const mapSectionToClient = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  order: row.display_order,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// Obtener todas las secciones (activas e inactivas, o solo activas dependiendo del caso. Devolvemos todas ordenadas)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM sections ORDER BY display_order ASC, id ASC');
    sendResponse(res, true, result.rows.map(mapSectionToClient));
  } catch (err) {
    console.error('Error GET /api/sections:', err);
    sendResponse(res, false, 'Error al obtener las secciones', 500);
  }
});

// Obtener una sección por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM sections WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, 'Sección no encontrada', 404);
    }
    
    sendResponse(res, true, mapSectionToClient(result.rows[0]));
  } catch (err) {
    console.error('Error GET /api/sections/:id:', err);
    sendResponse(res, false, 'Error al obtener la sección', 500);
  }
});

// Crear una nueva sección
router.post('/', async (req, res) => {
  try {
    const { name, slug, order = 0, isActive = true } = req.body;
    
    // Validación mínima obligatoria
    if (!name || !slug) {
      return sendResponse(res, false, 'El nombre y el slug son obligatorios', 400);
    }

    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
       return sendResponse(res, false, 'El slug solo puede contener minúsculas, números y guiones', 400);
    }

    const query = `
      INSERT INTO sections (name, slug, display_order, is_active) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *;
    `;
    const values = [name, slug, order, isActive];
    
    const result = await db.query(query, values);
    sendResponse(res, true, mapSectionToClient(result.rows[0]), 201);
  } catch (err) {
    console.error('Error POST /api/sections:', err);
    // Si hay error de llave única (ej. slug duplicado en Postgres es 23505)
    if (err.code === '23505') {
      return sendResponse(res, false, 'El slug de esta sección ya existe', 400);
    }
    sendResponse(res, false, 'Error al crear la sección', 500);
  }
});

// Actualizar una sección
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, order, isActive } = req.body;
    
    // Validación de obligatorios si vienen
    if (!name || !slug) {
      return sendResponse(res, false, 'El nombre y el slug son obligatorios para actualizar', 400);
    }

    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
       return sendResponse(res, false, 'El slug solo puede contener minúsculas, números y guiones', 400);
    }

    const query = `
      UPDATE sections 
      SET 
        name = $1, 
        slug = $2, 
        display_order = COALESCE($3, display_order), 
        is_active = COALESCE($4, is_active), 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 
      RETURNING *;
    `;
    const values = [name, slug, order, isActive, id];
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, 'Sección no encontrada para actualizar', 404);
    }

    sendResponse(res, true, mapSectionToClient(result.rows[0]));
  } catch (err) {
    console.error('Error PUT /api/sections/:id:', err);
    if (err.code === '23505') {
      return sendResponse(res, false, 'El slug proporcionado ya está en uso', 400);
    }
    sendResponse(res, false, 'Error al actualizar la sección', 500);
  }
});

// Eliminar (Desactivación lógica)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Actualizamos is_active = false
    const query = `
      UPDATE sections 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *;
    `;
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, 'Sección no encontrada para desactivar', 404);
    }
    
    sendResponse(res, true, { message: 'Sección desactivada correctamente', section: mapSectionToClient(result.rows[0]) });
  } catch (err) {
    console.error('Error DELETE /api/sections/:id:', err);
    sendResponse(res, false, 'Error al desactivar la sección', 500);
  }
});

module.exports = router;
module.exports.mapSectionToClient = mapSectionToClient;
