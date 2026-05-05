-- ══════════════════════════════════════════
--  EXPENSES MODULE — Migration SQL
--  Run once against your Railway PostgreSQL
-- ══════════════════════════════════════════

-- Tabla de categorías de gastos
CREATE TABLE IF NOT EXISTS expense_categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  color       VARCHAR(20) DEFAULT '#6F5B72',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla principal de gastos
CREATE TABLE IF NOT EXISTS expenses (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category_id     INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
  payment_method  VARCHAR(50) DEFAULT 'efectivo',
  date            DATE NOT NULL CHECK (date <= CURRENT_DATE),
  is_fixed        BOOLEAN DEFAULT FALSE,
  tags            JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payment ON expenses(payment_method);
CREATE INDEX IF NOT EXISTS idx_expenses_fixed ON expenses(is_fixed);

-- Categorías por defecto
INSERT INTO expense_categories (name, color) VALUES
  ('Ingredientes',      '#A78AA6'),
  ('Packaging',         '#C4956A'),
  ('Equipamiento',      '#6F8FA6'),
  ('Marketing',         '#A6806F'),
  ('Envíos',            '#7BA68B'),
  ('Servicios',         '#A6A66F'),
  ('Otros',             '#B0A0B5')
ON CONFLICT (name) DO NOTHING;
