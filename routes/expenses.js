const express = require('express');
const router = express.Router();
const db = require('../db');

// ══════════════════════════════════════════
//  EXPENSES MODULE — Tini Migliore Backend
// ══════════════════════════════════════════

// ── HELPERS ──────────────────────────────

const validate = (body, isUpdate = false) => {
  const errors = [];
  if (!isUpdate || body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || !body.title.trim())
      errors.push('title es obligatorio');
  }
  if (!isUpdate || body.amount !== undefined) {
    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0)
      errors.push('amount debe ser un número positivo');
  }
  if (!isUpdate || body.date !== undefined) {
    if (!body.date) errors.push('date es obligatoria');
    else if (new Date(body.date) > new Date())
      errors.push('date no puede ser futura');
  }
  return errors;
};

const mapExpense = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  amount: parseFloat(row.amount),
  category: row.category_name || row.category || null,
  categoryId: row.category_id,
  categoryColor: row.category_color || null,
  paymentMethod: row.payment_method,
  date: row.date,
  isFixed: row.is_fixed,
  tags: row.tags || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── EXPENSE CATEGORIES ────────────────────

// GET /expenses/categories
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM expense_categories ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching expense categories:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /expenses/categories
router.post('/categories', async (req, res) => {
  const { name, color = '#6F5B72' } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: 'name es obligatorio' });
  try {
    const result = await db.query(
      'INSERT INTO expense_categories (name, color) VALUES ($1, $2) RETURNING *',
      [name.trim(), color]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    console.error('Error creating expense category:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /expenses/categories/:id
router.put('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  try {
    const result = await db.query(
      `UPDATE expense_categories
       SET name = COALESCE($1, name), color = COALESCE($2, color), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [name?.trim() || null, color || null, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating expense category:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /expenses/categories/:id
router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Desasociar gastos antes de eliminar
    await db.query('UPDATE expenses SET category_id = NULL WHERE category_id = $1', [id]);
    await db.query('DELETE FROM expense_categories WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting expense category:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── ANALYTICS ────────────────────────────

// GET /expenses/summary
router.get('/summary', async (req, res) => {
  try {
    const result = await db.query(`
      WITH current_month AS (
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
      ),
      prev_month AS (
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE - interval '1 month')
      ),
      ytd AS (
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE date_trunc('year', date) = date_trunc('year', CURRENT_DATE)
      )
      SELECT
        current_month.total AS current_month_total,
        prev_month.total AS prev_month_total,
        ytd.total AS year_to_date,
        CASE
          WHEN prev_month.total = 0 THEN NULL
          ELSE ROUND(((current_month.total - prev_month.total) / prev_month.total * 100)::numeric, 2)
        END AS variation_percent
      FROM current_month, prev_month, ytd
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /expenses/by-category
router.get('/by-category', async (req, res) => {
  const { from, to } = req.query;
  try {
    let whereClause = '';
    const params = [];
    if (from) { params.push(from); whereClause += ` AND e.date >= $${params.length}`; }
    if (to)   { params.push(to);   whereClause += ` AND e.date <= $${params.length}`; }

    const result = await db.query(`
      SELECT
        COALESCE(ec.name, 'Sin categoría') AS category,
        COALESCE(ec.color, '#A78AA6') AS color,
        COUNT(e.id) AS count,
        SUM(e.amount) AS total,
        ROUND(SUM(e.amount) / SUM(SUM(e.amount)) OVER () * 100, 2) AS percentage
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE 1=1 ${whereClause}
      GROUP BY ec.name, ec.color
      ORDER BY total DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching by-category:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /expenses/monthly
router.get('/monthly', async (req, res) => {
  const { months = 12 } = req.query;
  try {
    const result = await db.query(`
      SELECT
        TO_CHAR(date_trunc('month', date), 'YYYY-MM') AS month,
        TO_CHAR(date_trunc('month', date), 'Mon YYYY') AS month_label,
        COUNT(id) AS count,
        SUM(amount) AS total
      FROM expenses
      WHERE date >= CURRENT_DATE - ($1::int || ' months')::interval
      GROUP BY date_trunc('month', date)
      ORDER BY date_trunc('month', date) ASC
    `, [months]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching monthly:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── CRUD ─────────────────────────────────

// GET /expenses
router.get('/', async (req, res) => {
  const { from, to, category_id, payment_method, is_fixed, search, limit = 50, offset = 0 } = req.query;
  const params = [];
  const conditions = [];

  if (from)           { params.push(from);           conditions.push(`e.date >= $${params.length}`); }
  if (to)             { params.push(to);             conditions.push(`e.date <= $${params.length}`); }
  if (category_id)    { params.push(category_id);    conditions.push(`e.category_id = $${params.length}`); }
  if (payment_method) { params.push(payment_method); conditions.push(`e.payment_method = $${params.length}`); }
  if (is_fixed !== undefined) { params.push(is_fixed === 'true'); conditions.push(`e.is_fixed = $${params.length}`); }
  if (search) { params.push(`%${search}%`); conditions.push(`(e.title ILIKE $${params.length} OR e.description ILIKE $${params.length})`); }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM expenses e ${whereClause}`,
      params
    );

    params.push(Number(limit));
    params.push(Number(offset));

    const result = await db.query(`
      SELECT e.*, ec.name AS category_name, ec.color AS category_color
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      ${whereClause}
      ORDER BY e.date DESC, e.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      data: result.rows.map(mapExpense),
      total: parseInt(countResult.rows[0].count),
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /expenses/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT e.*, ec.name AS category_name, ec.color AS category_color
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.id = $1
    `, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json(mapExpense(result.rows[0]));
  } catch (err) {
    console.error('Error fetching expense:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /expenses
router.post('/', async (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { title, description, amount, category_id, payment_method = 'efectivo', date, is_fixed = false, tags = [] } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO expenses (title, description, amount, category_id, payment_method, date, is_fixed, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title.trim(), description || null, amount, category_id || null, payment_method, date, is_fixed, JSON.stringify(tags)]);

    const full = await db.query(`
      SELECT e.*, ec.name AS category_name, ec.color AS category_color
      FROM expenses e LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(mapExpense(full.rows[0]));
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /expenses/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const errors = validate(req.body, true);
  if (errors.length) return res.status(400).json({ errors });

  const { title, description, amount, category_id, payment_method, date, is_fixed, tags } = req.body;
  try {
    const result = await db.query(`
      UPDATE expenses SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        amount = COALESCE($3, amount),
        category_id = $4,
        payment_method = COALESCE($5, payment_method),
        date = COALESCE($6, date),
        is_fixed = COALESCE($7, is_fixed),
        tags = COALESCE($8, tags),
        updated_at = NOW()
      WHERE id = $9
      RETURNING id
    `, [
      title?.trim() || null,
      description !== undefined ? description : null,
      amount || null,
      category_id !== undefined ? category_id : undefined,
      payment_method || null,
      date || null,
      is_fixed !== undefined ? is_fixed : null,
      tags ? JSON.stringify(tags) : null,
      id
    ]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Gasto no encontrado' });

    const full = await db.query(`
      SELECT e.*, ec.name AS category_name, ec.color AS category_color
      FROM expenses e LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.id = $1
    `, [id]);

    res.json(mapExpense(full.rows[0]));
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /expenses/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
