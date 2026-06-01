-- Vincula cada movimiento al período financiero al que pertenece.
-- El campo reemplaza al filtro por period (YYYY-MM) para las consultas
-- del dashboard, que ahora se basan en el rango de fechas del período.
DO $$
BEGIN
  ALTER TABLE movements ADD COLUMN financial_period_id UUID REFERENCES financial_periods(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Asignar todos los movimientos históricos al único período existente (abierto).
-- Como el usuario va a recargar los datos, esta asignación bulk es suficiente.
UPDATE movements
SET financial_period_id = (
  SELECT id FROM financial_periods WHERE status = 'open' ORDER BY created_at LIMIT 1
)
WHERE financial_period_id IS NULL;

-- Con los datos migrados, hacemos el campo NOT NULL.
DO $$
BEGIN
  ALTER TABLE movements ALTER COLUMN financial_period_id SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_movements_financial_period ON movements(financial_period_id);

-- Las mismas columnas de tracking por período financiero en las tablas auxiliares.
-- Estas se usan para saber si ya se pagó/cobró un ítem en un período.
-- (El campo period YYYY-MM se mantiene para compatibilidad interna y referencia.)
