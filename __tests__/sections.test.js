const request = require('supertest');
const express = require('express');

jest.mock('../db');
const db = require('../db');
const sectionsRouter = require('../routes/sections');
const { mapSectionToClient } = require('../routes/sections');

const app = express();
app.use(express.json());
app.use('/api/sections', sectionsRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const sampleRow = {
  id: 1,
  name: 'Verano',
  slug: 'verano',
  display_order: 1,
  is_active: true,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

const sampleClient = {
  id: 1,
  name: 'Verano',
  slug: 'verano',
  order: 1,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

// ─── mapSectionToClient ───────────────────────────────────────────────────────

describe('mapSectionToClient', () => {
  it('correctly transforms a database row to a client-side section object', () => {
    expect(mapSectionToClient(sampleRow)).toEqual(sampleClient);
  });
});

// ─── GET /api/sections ────────────────────────────────────────────────────────

describe('GET /api/sections', () => {
  it('returns all sections mapped to client-side format', async () => {
    db.query.mockResolvedValueOnce({ rows: [sampleRow] });

    const res = await request(app).get('/api/sections');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([sampleClient]);
    expect(db.query).toHaveBeenCalledWith(
      'SELECT * FROM sections ORDER BY display_order ASC, id ASC'
    );
  });
});

// ─── GET /api/sections/:id ────────────────────────────────────────────────────

describe('GET /api/sections/:id', () => {
  it('returns a single section mapped to client-side format', async () => {
    db.query.mockResolvedValueOnce({ rows: [sampleRow] });

    const res = await request(app).get('/api/sections/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(sampleClient);
    expect(db.query).toHaveBeenCalledWith(
      'SELECT * FROM sections WHERE id = $1',
      ['1']
    );
  });

  it('returns 404 when the section does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/sections/999');

    expect(res.status).toBe(404);
  });
});

// ─── POST /api/sections ───────────────────────────────────────────────────────

describe('POST /api/sections', () => {
  it('creates a new section and returns it mapped to client-side format', async () => {
    db.query.mockResolvedValueOnce({ rows: [sampleRow] });

    const res = await request(app)
      .post('/api/sections')
      .send({ name: 'Verano', slug: 'verano', order: 1, isActive: true });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(sampleClient);
  });

  it('returns 400 when name or slug is missing', async () => {
    const res = await request(app)
      .post('/api/sections')
      .send({ name: 'Verano' });

    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

// ─── PUT /api/sections/:id ────────────────────────────────────────────────────

describe('PUT /api/sections/:id', () => {
  it('updates an existing section and returns it mapped to client-side format', async () => {
    db.query.mockResolvedValueOnce({ rows: [sampleRow] });

    const res = await request(app)
      .put('/api/sections/1')
      .send({ name: 'Verano', slug: 'verano', order: 1, isActive: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(sampleClient);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sections'),
      ['Verano', 'verano', 1, true, '1']
    );
  });

  it('returns 404 when the section to update does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/sections/999')
      .send({ name: 'Verano', slug: 'verano' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when name or slug is missing', async () => {
    const res = await request(app)
      .put('/api/sections/1')
      .send({ name: 'Verano' });

    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});
