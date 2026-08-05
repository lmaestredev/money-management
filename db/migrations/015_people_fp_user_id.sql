-- Agrega user_id a people y financial_periods para multi-tenancy.

-- people
ALTER TABLE people ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

DO $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios en auth.users.';
  END IF;
  UPDATE people SET user_id = v_user_id WHERE user_id IS NULL;
END $$;

ALTER TABLE people ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_user ON people(user_id);

-- financial_periods
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

DO $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  UPDATE financial_periods SET user_id = v_user_id WHERE user_id IS NULL;
END $$;

ALTER TABLE financial_periods ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_periods_user ON financial_periods(user_id);
