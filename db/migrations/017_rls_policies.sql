-- Habilita RLS y crea políticas por user_id en todas las tablas de datos.

-- ─── accounts ───────────────────────────────────────────────────────────────
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounts_select ON accounts;
DROP POLICY IF EXISTS accounts_insert ON accounts;
DROP POLICY IF EXISTS accounts_update ON accounts;
DROP POLICY IF EXISTS accounts_delete ON accounts;

CREATE POLICY accounts_select ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY accounts_insert ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY accounts_update ON accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY accounts_delete ON accounts FOR DELETE USING (auth.uid() = user_id);

-- ─── credit_cards ────────────────────────────────────────────────────────────
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_cards_select ON credit_cards;
DROP POLICY IF EXISTS credit_cards_insert ON credit_cards;
DROP POLICY IF EXISTS credit_cards_update ON credit_cards;
DROP POLICY IF EXISTS credit_cards_delete ON credit_cards;

CREATE POLICY credit_cards_select ON credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY credit_cards_insert ON credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY credit_cards_update ON credit_cards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY credit_cards_delete ON credit_cards FOR DELETE USING (auth.uid() = user_id);

-- ─── credit_card_statements ──────────────────────────────────────────────────
ALTER TABLE credit_card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_statements FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS statements_select ON credit_card_statements;
DROP POLICY IF EXISTS statements_insert ON credit_card_statements;
DROP POLICY IF EXISTS statements_update ON credit_card_statements;
DROP POLICY IF EXISTS statements_delete ON credit_card_statements;

CREATE POLICY statements_select ON credit_card_statements FOR SELECT
  USING (credit_card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));
CREATE POLICY statements_insert ON credit_card_statements FOR INSERT
  WITH CHECK (credit_card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));
CREATE POLICY statements_update ON credit_card_statements FOR UPDATE
  USING (credit_card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()))
  WITH CHECK (credit_card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));
CREATE POLICY statements_delete ON credit_card_statements FOR DELETE
  USING (credit_card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

-- ─── movements ───────────────────────────────────────────────────────────────
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS movements_select ON movements;
DROP POLICY IF EXISTS movements_insert ON movements;
DROP POLICY IF EXISTS movements_update ON movements;
DROP POLICY IF EXISTS movements_delete ON movements;

CREATE POLICY movements_select ON movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY movements_insert ON movements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY movements_update ON movements FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY movements_delete ON movements FOR DELETE USING (auth.uid() = user_id);

-- ─── installment_purchases ───────────────────────────────────────────────────
ALTER TABLE installment_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_purchases FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS installments_select ON installment_purchases;
DROP POLICY IF EXISTS installments_insert ON installment_purchases;
DROP POLICY IF EXISTS installments_update ON installment_purchases;
DROP POLICY IF EXISTS installments_delete ON installment_purchases;

CREATE POLICY installments_select ON installment_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY installments_insert ON installment_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY installments_update ON installment_purchases FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY installments_delete ON installment_purchases FOR DELETE USING (auth.uid() = user_id);

-- ─── recurring_expenses ──────────────────────────────────────────────────────
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_expenses_select ON recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_insert ON recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_update ON recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_delete ON recurring_expenses;

CREATE POLICY recurring_expenses_select ON recurring_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY recurring_expenses_insert ON recurring_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY recurring_expenses_update ON recurring_expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY recurring_expenses_delete ON recurring_expenses FOR DELETE USING (auth.uid() = user_id);

-- ─── recurring_incomes ───────────────────────────────────────────────────────
ALTER TABLE recurring_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_incomes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_incomes_select ON recurring_incomes;
DROP POLICY IF EXISTS recurring_incomes_insert ON recurring_incomes;
DROP POLICY IF EXISTS recurring_incomes_update ON recurring_incomes;
DROP POLICY IF EXISTS recurring_incomes_delete ON recurring_incomes;

CREATE POLICY recurring_incomes_select ON recurring_incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY recurring_incomes_insert ON recurring_incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY recurring_incomes_update ON recurring_incomes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY recurring_incomes_delete ON recurring_incomes FOR DELETE USING (auth.uid() = user_id);

-- ─── people ──────────────────────────────────────────────────────────────────
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE people FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS people_select ON people;
DROP POLICY IF EXISTS people_insert ON people;
DROP POLICY IF EXISTS people_update ON people;
DROP POLICY IF EXISTS people_delete ON people;

CREATE POLICY people_select ON people FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY people_insert ON people FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY people_update ON people FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY people_delete ON people FOR DELETE USING (auth.uid() = user_id);

-- ─── financial_periods ───────────────────────────────────────────────────────
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_periods FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fp_select ON financial_periods;
DROP POLICY IF EXISTS fp_insert ON financial_periods;
DROP POLICY IF EXISTS fp_update ON financial_periods;
DROP POLICY IF EXISTS fp_delete ON financial_periods;

CREATE POLICY fp_select ON financial_periods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY fp_insert ON financial_periods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY fp_update ON financial_periods FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY fp_delete ON financial_periods FOR DELETE USING (auth.uid() = user_id);

-- ─── settings ────────────────────────────────────────────────────────────────
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settings_select ON settings;
DROP POLICY IF EXISTS settings_insert ON settings;
DROP POLICY IF EXISTS settings_update ON settings;
DROP POLICY IF EXISTS settings_delete ON settings;

CREATE POLICY settings_select ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY settings_insert ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY settings_update ON settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY settings_delete ON settings FOR DELETE USING (auth.uid() = user_id);

-- ─── categories (datos globales, solo lectura autenticada) ───────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_select ON categories;
CREATE POLICY categories_select ON categories FOR SELECT USING (auth.role() = 'authenticated');

-- ─── exchange_rates (datos globales, solo lectura autenticada) ───────────────
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exchange_rates_select ON exchange_rates;
DROP POLICY IF EXISTS exchange_rates_insert ON exchange_rates;
DROP POLICY IF EXISTS exchange_rates_update ON exchange_rates;
CREATE POLICY exchange_rates_select ON exchange_rates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY exchange_rates_insert ON exchange_rates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY exchange_rates_update ON exchange_rates FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
