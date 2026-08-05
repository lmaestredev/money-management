-- Agrega user_id a settings y cambia la PK a (key, user_id).

ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

DO $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios en auth.users.';
  END IF;
  UPDATE settings SET user_id = v_user_id WHERE user_id IS NULL;
END $$;

ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL;

-- Cambiar PK de (key) a (key, user_id)
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE settings ADD PRIMARY KEY (key, user_id);

CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id);
