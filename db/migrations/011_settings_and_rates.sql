-- Configuración de la app (clave-valor) y cotizaciones del dólar.

-- settings: pares clave-valor para presupuestos y preferencias de tasa.
-- Claves usadas:
--   budget_total_usd     -> presupuesto mensual total (USD)
--   budget_variable_usd  -> presupuesto mensual de gastos variables (USD)
--   rate_source          -> 'blue' | 'oficial' (cotización para convertir pesos→USD)
--   manual_rate_enabled  -> 'true' | 'false'
--   manual_rate_value    -> tasa manual (pesos por USD) cuando el override está activo
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(64) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Defaults (no se pisan si ya existen).
INSERT INTO settings (key, value) VALUES
  ('budget_total_usd', '3500'),
  ('budget_variable_usd', '500'),
  ('rate_source', 'blue'),
  ('manual_rate_enabled', 'false'),
  ('manual_rate_value', '')
ON CONFLICT (key) DO NOTHING;

-- exchange_rates: última cotización por casa (blue / oficial). Se upsertea en cada refresh.
CREATE TABLE IF NOT EXISTS exchange_rates (
  source VARCHAR(20) PRIMARY KEY,            -- 'blue' | 'oficial'
  compra DECIMAL(18,4) NOT NULL DEFAULT 0,   -- pesos por USD (compra)
  venta DECIMAL(18,4) NOT NULL DEFAULT 0,    -- pesos por USD (venta)
  source_updated_at TIMESTAMPTZ,             -- fechaActualizacion que reporta la API
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
