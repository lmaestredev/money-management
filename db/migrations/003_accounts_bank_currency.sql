-- Banco y moneda por cuenta (peso, dolar, cripto)
DO $$
BEGIN
  ALTER TABLE accounts ADD COLUMN bank VARCHAR(255);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE accounts ADD COLUMN currency VARCHAR(20) NOT NULL DEFAULT 'peso';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
