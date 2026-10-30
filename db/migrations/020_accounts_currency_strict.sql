-- Follow-up de E06: las 2 cuentas heredadas con currency 'dual' se migraron a
-- 'peso' / 'dollar' (una se dividió en dos), así que el constraint deja de
-- admitir 'dual' y vuelve a coincidir con el tipo AccountCurrency de la app.
-- No modifica datos: si quedara alguna fila 'dual', VALIDATE falla y no se aplica.
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_accounts_currency;
ALTER TABLE accounts ADD CONSTRAINT chk_accounts_currency
  CHECK (currency IN ('peso', 'dollar', 'crypto')) NOT VALID;
ALTER TABLE accounts VALIDATE CONSTRAINT chk_accounts_currency;
