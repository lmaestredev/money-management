-- E09: marca los movimientos que son el PAGO de un resumen de tarjeta. Esos pagos no
-- cuentan como gasto (el gasto ya se contó al hacer el cargo con la tarjeta), así que
-- cada pantalla debe poder excluirlos sin consultar credit_card_statements.
--
-- Backfill: se deriva de credit_card_statements.paid_movement_id. Detección previa:
--   1 resumen pagado, 1 movimiento a marcar (fixed_payment), 0 resúmenes pagados sin movimiento.
-- No borra ni modifica importes; solo agrega la columna y marca esas filas.
ALTER TABLE movements ADD COLUMN IF NOT EXISTS is_statement_payment BOOLEAN NOT NULL DEFAULT false;

UPDATE movements
SET is_statement_payment = true
WHERE id IN (
  SELECT paid_movement_id FROM credit_card_statements WHERE paid_movement_id IS NOT NULL
);
