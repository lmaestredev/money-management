-- Ingresos recurrentes ("SUELDOS" del Excel): plantillas de ingreso mensual
-- (sueldos, honorarios...) que se materializan cada mes como movimientos de
-- tipo income con estado cobrado/pendiente. Todos suman al ingreso total; la
-- cuenta acreditada es lo único que diferencia a cada persona.
CREATE TABLE IF NOT EXISTS recurring_incomes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES categories(id),
  account_id UUID REFERENCES accounts(id),     -- cuenta donde se acredita
  amount_pesos DECIMAL(18,2) NOT NULL DEFAULT 0,
  amount_dollars DECIMAL(18,2) NOT NULL DEFAULT 0,
  receive_day INT,
  active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_incomes_active ON recurring_incomes(active);

-- Enlazar el cobro mensual de un ingreso a su plantilla (idempotente).
DO $$
BEGIN
  ALTER TABLE movements ADD COLUMN recurring_income_id UUID REFERENCES recurring_incomes(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_movements_recurring_income ON movements(recurring_income_id);
