-- Enlazar gastos, cuotas y gastos fijos a una tarjeta de crédito. Un gasto se
-- carga a una cuenta (account_id) O a una tarjeta (credit_card_id), no a ambas.
-- Cuando se carga a una tarjeta no se debita ninguna cuenta: suma a la deuda de
-- la tarjeta y se asocia al resumen del periodo (statement_id).

-- movements: cargo asociable a una tarjeta y al resumen al que pertenece.
DO $$
BEGIN
  ALTER TABLE movements ADD COLUMN credit_card_id UUID REFERENCES credit_cards(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE movements ADD COLUMN statement_id UUID REFERENCES credit_card_statements(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Un cargo de tarjeta no tiene cuenta hasta que se paga el resumen: account_id
-- pasa a ser opcional (se conserva NOT NULL para los movimientos ya existentes
-- vía el CHECK de abajo, que exige al menos uno de los dos).
DO $$
BEGIN
  ALTER TABLE movements ALTER COLUMN account_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Exigir que todo movimiento apunte a una cuenta o a una tarjeta (al menos uno).
DO $$
BEGIN
  ALTER TABLE movements
    ADD CONSTRAINT movements_account_or_card
    CHECK (account_id IS NOT NULL OR credit_card_id IS NOT NULL);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_movements_credit_card ON movements(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_movements_statement ON movements(statement_id);

-- installment_purchases: la cuota mensual puede cargarse a una tarjeta.
DO $$
BEGIN
  ALTER TABLE installment_purchases ADD COLUMN credit_card_id UUID REFERENCES credit_cards(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_installments_credit_card ON installment_purchases(credit_card_id);

-- recurring_expenses: el gasto fijo puede cargarse a una tarjeta.
DO $$
BEGIN
  ALTER TABLE recurring_expenses ADD COLUMN credit_card_id UUID REFERENCES credit_cards(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_recurring_credit_card ON recurring_expenses(credit_card_id);
