-- Gastos fijos pagados en efectivo: no tienen cuenta fija. La cuenta de la
-- que sale el dinero se elige al confirmar el pago en Movimientos.
DO $$
BEGIN
  ALTER TABLE recurring_expenses ADD COLUMN is_cash BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
