-- E06: constraints de integridad e índices de idempotencia.
--
-- Cada CHECK se agrega NOT VALID y se valida enseguida (VALIDATE): si alguna fila
-- existente lo viola, la migración falla entera y no queda nada a medias.
-- Esta migración NO modifica ni borra datos.
--
-- Queries de detección (corridas contra la base antes de aplicar; todas dieron 0
-- filas, salvo accounts.currency = 'dual', que se permite de forma transitoria):
--   SELECT count(*) FROM movements WHERE amount_pesos < 0 OR amount_dollars < 0;
--   SELECT count(*) FROM movements WHERE record_type NOT IN ('income','conversion','variable_payment','fixed_payment');
--   SELECT count(*) FROM movements WHERE num_nonnulls(account_id, credit_card_id) <> 1;
--   SELECT count(*) FROM installment_purchases WHERE monthly_amount_pesos < 0 OR monthly_amount_dollars < 0 OR total_amount_pesos < 0 OR total_amount_dollars < 0;
--   SELECT count(*) FROM installment_purchases WHERE total_installments <= 0 OR paid_installments < 0 OR paid_installments > total_installments;
--   SELECT count(*) FROM installment_purchases WHERE pay_before_day IS NOT NULL AND pay_before_day NOT BETWEEN 1 AND 31;
--   SELECT count(*) FROM installment_purchases WHERE status NOT IN ('active','finished');
--   SELECT count(*) FROM recurring_expenses WHERE amount_pesos < 0 OR amount_dollars < 0 OR (pay_before_day IS NOT NULL AND pay_before_day NOT BETWEEN 1 AND 31);
--   SELECT count(*) FROM recurring_incomes WHERE amount_pesos < 0 OR amount_dollars < 0 OR (receive_day IS NOT NULL AND receive_day NOT BETWEEN 1 AND 31);
--   SELECT count(*) FROM credit_card_statements WHERE total_pesos < 0 OR total_dollars < 0 OR status NOT IN ('open','closed','paid');
--   SELECT count(*) FROM credit_cards WHERE credit_limit < 0 OR currency NOT IN ('peso','dollar','crypto')
--     OR (closing_day IS NOT NULL AND closing_day NOT BETWEEN 1 AND 31) OR (due_day IS NOT NULL AND due_day NOT BETWEEN 1 AND 31);
--   SELECT count(*) FROM accounts WHERE currency NOT IN ('peso','dollar','crypto','dual');   -- con 'dual' = 0; sin 'dual' = 2
--   SELECT count(*) FROM financial_periods WHERE status NOT IN ('open','closed');
--   SELECT user_id FROM financial_periods WHERE status = 'open' GROUP BY user_id HAVING count(*) > 1;
--   SELECT recurring_expense_id, financial_period_id FROM movements WHERE recurring_expense_id IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1;
--   SELECT installment_id, financial_period_id FROM movements WHERE installment_id IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1;
--   SELECT recurring_income_id, financial_period_id FROM movements WHERE recurring_income_id IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1;

-- ─── movements ──────────────────────────────────────────────────────────────
ALTER TABLE movements ADD CONSTRAINT chk_movements_amounts_nonneg
  CHECK (amount_pesos >= 0 AND amount_dollars >= 0) NOT VALID;
ALTER TABLE movements VALIDATE CONSTRAINT chk_movements_amounts_nonneg;

ALTER TABLE movements ADD CONSTRAINT chk_movements_record_type
  CHECK (record_type IN ('income', 'conversion', 'variable_payment', 'fixed_payment')) NOT VALID;
ALTER TABLE movements VALIDATE CONSTRAINT chk_movements_record_type;

-- Reemplaza en la práctica a movements_account_or_card (que solo exigía al menos una).
ALTER TABLE movements ADD CONSTRAINT chk_movements_one_source
  CHECK (num_nonnulls(account_id, credit_card_id) = 1) NOT VALID;
ALTER TABLE movements VALIDATE CONSTRAINT chk_movements_one_source;

-- ─── installment_purchases ──────────────────────────────────────────────────
ALTER TABLE installment_purchases ADD CONSTRAINT chk_installments_amounts_nonneg
  CHECK (monthly_amount_pesos >= 0 AND monthly_amount_dollars >= 0
         AND total_amount_pesos >= 0 AND total_amount_dollars >= 0) NOT VALID;
ALTER TABLE installment_purchases VALIDATE CONSTRAINT chk_installments_amounts_nonneg;

ALTER TABLE installment_purchases ADD CONSTRAINT chk_installments_counts
  CHECK (total_installments > 0 AND paid_installments BETWEEN 0 AND total_installments) NOT VALID;
ALTER TABLE installment_purchases VALIDATE CONSTRAINT chk_installments_counts;

ALTER TABLE installment_purchases ADD CONSTRAINT chk_installments_pay_day
  CHECK (pay_before_day IS NULL OR pay_before_day BETWEEN 1 AND 31) NOT VALID;
ALTER TABLE installment_purchases VALIDATE CONSTRAINT chk_installments_pay_day;

ALTER TABLE installment_purchases ADD CONSTRAINT chk_installments_status
  CHECK (status IN ('active', 'finished')) NOT VALID;
ALTER TABLE installment_purchases VALIDATE CONSTRAINT chk_installments_status;

-- ─── recurring_expenses / recurring_incomes ─────────────────────────────────
ALTER TABLE recurring_expenses ADD CONSTRAINT chk_recurring_expenses_amounts_nonneg
  CHECK (amount_pesos >= 0 AND amount_dollars >= 0) NOT VALID;
ALTER TABLE recurring_expenses VALIDATE CONSTRAINT chk_recurring_expenses_amounts_nonneg;

ALTER TABLE recurring_expenses ADD CONSTRAINT chk_recurring_expenses_pay_day
  CHECK (pay_before_day IS NULL OR pay_before_day BETWEEN 1 AND 31) NOT VALID;
ALTER TABLE recurring_expenses VALIDATE CONSTRAINT chk_recurring_expenses_pay_day;

ALTER TABLE recurring_incomes ADD CONSTRAINT chk_recurring_incomes_amounts_nonneg
  CHECK (amount_pesos >= 0 AND amount_dollars >= 0) NOT VALID;
ALTER TABLE recurring_incomes VALIDATE CONSTRAINT chk_recurring_incomes_amounts_nonneg;

ALTER TABLE recurring_incomes ADD CONSTRAINT chk_recurring_incomes_receive_day
  CHECK (receive_day IS NULL OR receive_day BETWEEN 1 AND 31) NOT VALID;
ALTER TABLE recurring_incomes VALIDATE CONSTRAINT chk_recurring_incomes_receive_day;

-- ─── credit_card_statements / credit_cards ──────────────────────────────────
ALTER TABLE credit_card_statements ADD CONSTRAINT chk_statements_totals_nonneg
  CHECK (total_pesos >= 0 AND total_dollars >= 0) NOT VALID;
ALTER TABLE credit_card_statements VALIDATE CONSTRAINT chk_statements_totals_nonneg;

ALTER TABLE credit_card_statements ADD CONSTRAINT chk_statements_status
  CHECK (status IN ('open', 'closed', 'paid')) NOT VALID;
ALTER TABLE credit_card_statements VALIDATE CONSTRAINT chk_statements_status;

ALTER TABLE credit_cards ADD CONSTRAINT chk_credit_cards_limit_nonneg
  CHECK (credit_limit >= 0) NOT VALID;
ALTER TABLE credit_cards VALIDATE CONSTRAINT chk_credit_cards_limit_nonneg;

ALTER TABLE credit_cards ADD CONSTRAINT chk_credit_cards_days
  CHECK ((closing_day IS NULL OR closing_day BETWEEN 1 AND 31)
     AND (due_day IS NULL OR due_day BETWEEN 1 AND 31)) NOT VALID;
ALTER TABLE credit_cards VALIDATE CONSTRAINT chk_credit_cards_days;

ALTER TABLE credit_cards ADD CONSTRAINT chk_credit_cards_currency
  CHECK (currency IN ('peso', 'dollar', 'crypto')) NOT VALID;
ALTER TABLE credit_cards VALIDATE CONSTRAINT chk_credit_cards_currency;

-- ─── accounts ───────────────────────────────────────────────────────────────
-- 'dual' es un valor heredado (2 cuentas) que la app no conoce. Se permite de forma
-- transitoria para no tocar datos; pendiente de decisión (ver ticket/hallazgos).
ALTER TABLE accounts ADD CONSTRAINT chk_accounts_currency
  CHECK (currency IN ('peso', 'dollar', 'crypto', 'dual')) NOT VALID;
ALTER TABLE accounts VALIDATE CONSTRAINT chk_accounts_currency;

-- ─── financial_periods ──────────────────────────────────────────────────────
ALTER TABLE financial_periods ADD CONSTRAINT chk_financial_periods_status
  CHECK (status IN ('open', 'closed')) NOT VALID;
ALTER TABLE financial_periods VALIDATE CONSTRAINT chk_financial_periods_status;

-- Un solo período abierto por usuario.
CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_periods_one_open_per_user
  ON financial_periods (user_id) WHERE status = 'open';

-- ─── idempotencia: a lo sumo un movimiento por plantilla y período ───────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_movements_recurring_expense_period
  ON movements (recurring_expense_id, financial_period_id) WHERE recurring_expense_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_movements_installment_period
  ON movements (installment_id, financial_period_id) WHERE installment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_movements_recurring_income_period
  ON movements (recurring_income_id, financial_period_id) WHERE recurring_income_id IS NOT NULL;
