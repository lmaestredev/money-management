-- Cuentas que operan en pesos y dólares sin conversión automática (ej. Dolar App).
UPDATE accounts
SET currency = 'dual'
WHERE currency = 'dollar'
  AND (
    LOWER(COALESCE(bank, '')) LIKE '%dolar app%'
    OR LOWER(name) LIKE '%dolar app%'
  );
