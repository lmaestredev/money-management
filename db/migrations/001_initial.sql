-- Extension para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Cuentas bancarias
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  balance_pesos DECIMAL(18,2) NOT NULL DEFAULT 0,
  balance_dollars DECIMAL(18,2) NOT NULL DEFAULT 0,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorías
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- Movimientos (category_id se añade en 002 si se usa BD ya existente)
CREATE TABLE IF NOT EXISTS movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  period VARCHAR(7) NOT NULL,
  record_type VARCHAR(50) NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  description TEXT,
  status BOOLEAN,
  amount_pesos DECIMAL(18,2) NOT NULL,
  amount_dollars DECIMAL(18,2) NOT NULL,
  payment_date DATE,
  dollar_rate DECIMAL(18,4),
  exchange_rate DECIMAL(18,4),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  source VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_movements_period_record_type ON movements(period, record_type);
CREATE INDEX IF NOT EXISTS idx_movements_account_period ON movements(account_id, period);
