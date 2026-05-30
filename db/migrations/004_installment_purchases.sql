-- Compras en cuotas ("Gastos temporales por bienes" del Excel).
-- Catálogo de artículos financiados: total de cuotas, cuotas pagadas, monto mensual y total.
CREATE TABLE IF NOT EXISTS installment_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  account_id UUID REFERENCES accounts(id),       -- tarjeta / cuenta
  category_id UUID REFERENCES categories(id),
  total_installments INT NOT NULL,
  paid_installments INT NOT NULL DEFAULT 0,
  monthly_amount_pesos DECIMAL(18,2) NOT NULL DEFAULT 0,
  monthly_amount_dollars DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount_pesos DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount_dollars DECIMAL(18,2) NOT NULL DEFAULT 0,
  pay_before_day INT,
  start_period VARCHAR(7),                        -- YYYY-MM
  status VARCHAR(20) NOT NULL DEFAULT 'active',   -- active | finished
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installments_status ON installment_purchases(status);

-- Enlazar el pago mensual de una cuota a su compra (idempotente).
DO $$
BEGIN
  ALTER TABLE movements ADD COLUMN installment_id UUID REFERENCES installment_purchases(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_movements_installment ON movements(installment_id);
