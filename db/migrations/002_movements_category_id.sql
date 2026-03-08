-- Añadir category_id a movements (nullable, FK a categories)
DO $$
BEGIN
  ALTER TABLE movements ADD COLUMN category_id UUID REFERENCES categories(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_movements_category_period ON movements(category_id, period);
