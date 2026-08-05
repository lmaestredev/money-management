-- Repuntar user_id de todas las tablas al usuario real de auth.users.
-- Se asume que public.users fue eliminada (con o sin CASCADE).
-- Usar IF EXISTS en los DROP para idempotencia.

-- accounts
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;
ALTER TABLE accounts ADD CONSTRAINT accounts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- credit_cards
ALTER TABLE credit_cards DROP CONSTRAINT IF EXISTS credit_cards_user_id_fkey;
ALTER TABLE credit_cards ADD CONSTRAINT credit_cards_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- movements
ALTER TABLE movements DROP CONSTRAINT IF EXISTS movements_user_id_fkey;
ALTER TABLE movements ADD CONSTRAINT movements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- installment_purchases
ALTER TABLE installment_purchases DROP CONSTRAINT IF EXISTS installment_purchases_user_id_fkey;
ALTER TABLE installment_purchases ADD CONSTRAINT installment_purchases_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- recurring_expenses
ALTER TABLE recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_user_id_fkey;
ALTER TABLE recurring_expenses ADD CONSTRAINT recurring_expenses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- recurring_incomes
ALTER TABLE recurring_incomes DROP CONSTRAINT IF EXISTS recurring_incomes_user_id_fkey;
ALTER TABLE recurring_incomes ADD CONSTRAINT recurring_incomes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Backfill: asignar el único usuario existente a todos los registros sin user_id.
DO $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios en auth.users. Crear el usuario primero.';
  END IF;
  UPDATE accounts          SET user_id = v_user_id WHERE user_id IS NULL;
  UPDATE credit_cards      SET user_id = v_user_id WHERE user_id IS NULL;
  UPDATE movements         SET user_id = v_user_id WHERE user_id IS NULL;
  UPDATE installment_purchases SET user_id = v_user_id WHERE user_id IS NULL;
  UPDATE recurring_expenses    SET user_id = v_user_id WHERE user_id IS NULL;
  UPDATE recurring_incomes     SET user_id = v_user_id WHERE user_id IS NULL;
END $$;

-- NOT NULL ahora que no hay NULLs.
ALTER TABLE accounts             ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE credit_cards         ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE movements            ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE installment_purchases ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE recurring_expenses   ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE recurring_incomes    ALTER COLUMN user_id SET NOT NULL;

-- Índices de acceso por tenant.
CREATE INDEX IF NOT EXISTS idx_accounts_user             ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user         ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_user            ON movements(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_user         ON installment_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user   ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_incomes_user    ON recurring_incomes(user_id);
