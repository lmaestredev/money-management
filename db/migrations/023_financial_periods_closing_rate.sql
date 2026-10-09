-- E11: cotización de cierre del período (pesos por USD), para que un período cerrado
-- conserve sus totales en dólares y no cambie cada vez que se mueve el dólar.
--
-- NULL = el período no tiene tasa congelada; el historial usa la cotización actual y lo
-- aclara. Los períodos nuevos la guardan al cerrarse (closePeriodRecord).
-- Solo agrega la columna y su restricción: no modifica datos existentes.
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS closing_rate NUMERIC(18,4);

ALTER TABLE financial_periods ADD CONSTRAINT chk_financial_periods_closing_rate
  CHECK (closing_rate IS NULL OR closing_rate > 0) NOT VALID;
ALTER TABLE financial_periods VALIDATE CONSTRAINT chk_financial_periods_closing_rate;
