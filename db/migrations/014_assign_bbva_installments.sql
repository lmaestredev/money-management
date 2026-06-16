-- Asigna la tarjeta de crédito BBVA a cuotas sin medio de pago.
UPDATE installment_purchases i
SET
  credit_card_id = cc.id,
  account_id = NULL,
  updated_at = NOW()
FROM (
  SELECT id
  FROM credit_cards
  WHERE active = true AND name ILIKE '%bbva%'
  ORDER BY created_at ASC
  LIMIT 1
) cc
WHERE i.credit_card_id IS NULL
  AND i.account_id IS NULL;

-- Sincroniza movimientos vinculados a esas cuotas.
UPDATE movements m
SET
  credit_card_id = i.credit_card_id,
  account_id = NULL
FROM installment_purchases i
WHERE m.installment_id = i.id
  AND i.credit_card_id IS NOT NULL
  AND m.credit_card_id IS NULL
  AND m.account_id IS NULL;
