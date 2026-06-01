-- Períodos financieros personalizados.
-- Un período tiene fecha de inicio y cierre arbitrarias (no atadas al mes
-- calendario). Siempre existe exactamente uno con status = 'open' (el activo).
-- Al cerrar un período, se sella con end_date y se crea uno nuevo.
CREATE TABLE IF NOT EXISTS financial_periods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE,                              -- NULL mientras está abierto
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open | closed
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_periods_status ON financial_periods(status);

-- Primer período: arrancó el 1° de mayo de 2025, actualmente abierto.
INSERT INTO financial_periods (start_date, status)
VALUES ('2025-05-01', 'open')
ON CONFLICT DO NOTHING;
