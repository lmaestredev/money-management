-- Gastos fijos recurrentes ("GASTOS FIJOS" del Excel): plantillas mensuales
-- (alquiler, expensas, servicios, suscripciones...) que se materializan cada
-- mes como movimientos con estado pagado/pendiente.
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES categories(id),
  account_id UUID REFERENCES accounts(id),     -- cuenta desde la que se paga
  amount_pesos DECIMAL(18,2) NOT NULL DEFAULT 0,
  amount_dollars DECIMAL(18,2) NOT NULL DEFAULT 0,
  pay_before_day INT,
  active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_expenses(active);

-- Enlazar el pago mensual de un gasto fijo a su plantilla (idempotente).
DO $$
BEGIN
  ALTER TABLE movements ADD COLUMN recurring_expense_id UUID REFERENCES recurring_expenses(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_movements_recurring ON movements(recurring_expense_id);
