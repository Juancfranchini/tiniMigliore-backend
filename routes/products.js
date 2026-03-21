const express = require('express');
const router = express.Router();
const db = require('../db');

// Utilidad simple para respuestas JSON consistentes
const sendResponse = (res, success, dataOrError, statusCode = 200) => {
  if (success) {
    return res.status(statusCode).json({ success: true, data: dataOrError });
  }
  return res.status(statusCode).json({ success: false, error: dataOrError });
};

// GET /api/products
router.get('/', async (req, res) => {
  try {
    // Retornamos todos los productos (se podría mejorar para solo traer activos, 
    // pero el panel de admin necesita ver todos, así que los traemos con JOIN a sections)
    const query = `
      SELECT p.*, s.name as section_name 
      FROM products p
      LEFT JOIN sections s ON p.section_id = s.id
      ORDER BY p.id ASC
    `;
    const result = await db.query(query);
    sendResponse(res, true, result.rows);
  } catch (err) {
    console.error('Error GET /api/products:', err);
    sendResponse(res, false, 'Error al obtener los productos', 500);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.*, s.name as section_name 
      FROM products p
      LEFT JOIN sections s ON p.section_id = s.id
      WHERE p.id = $1
    `;
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, 'Producto no encontrado', 404);
    }
    
    sendResponse(res, true, result.rows[0]);
  } catch (err) {
    console.error('Error GET /api/products/:id:', err);
    sendResponse(res, false, 'Error al obtener el producto', 500);
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const { section_id, name, description, price, image_url, is_active = true } = req.body;
    
    // Validación mínima
    if (!name || price === undefined) {
      return sendResponse(res, false, 'El nombre y el precio son obligatorios', 400);
    }

    const query = `
      INSERT INTO products (section_id, name, description, price, image_url, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *;
    `;
    const values = [section_id || null, name, description, price, image_url, is_active];
    
    const result = await db.query(query, values);
    sendResponse(res, true, result.rows[0], 201);
  } catch (err) {
    console.error('Error POST /api/products:', err);
    // Si falla por Foreign Key en section_id
    if (err.code === '23503') {
      return sendResponse(res, false, 'La sección especificada no existe', 400);
    }
    sendResponse(res, false, 'Error al crear el producto', 500);
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { section_id, name, description, price, image_url, is_active } = req.body;
    
    if (!name || price === undefined) {
      return sendResponse(res, false, 'El nombre y el precio son obligatorios para actualizar', 400);
    }

    const query = `
      UPDATE products 
      SET 
        section_id = COALESCE($1, section_id), 
        name = $2, 
        description = COALESCE($3, description), 
        price = $4, 
        image_url = COALESCE($5, image_url), 
        is_active = COALESCE($6, is_active), 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 
      RETURNING *;
    `;
    const values = [section_id || null, name, description, price, image_url, is_active, id];
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, 'Producto no encontrado para actualizar', 404);
    }

    sendResponse(res, true, result.rows[0]);
  } catch (err) {
    console.error('Error PUT /api/products/:id:', err);
    if (err.code === '23503') {
      return sendResponse(res, false, 'La sección especificada no existe', 400);
    }
    sendResponse(res, false, 'Error al actualizar el producto', 500);
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Eliminación física
    const query = `
      DELETE FROM products 
      WHERE id = $1 
      RETURNING *;
    `;
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return sendResponse(res, false, 'Producto no encontrado para eliminar', 404);
    }
    
    sendResponse(res, true, { message: 'Producto eliminado correctamente', product: result.rows[0] });
  } catch (err) {
    console.error('Error DELETE /api/products/:id:', err);
    sendResponse(res, false, 'Error al eliminar el producto', 500);
  }
});

module.exports = router;
