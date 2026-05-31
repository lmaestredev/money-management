-- Tarjetas de crédito. A diferencia de una cuenta (accounts), una tarjeta no
-- guarda un saldo de dinero sino DEUDA acumulada: comprar con la tarjeta no
-- debita plata al instante, sino que suma a current_balance. Esa deuda se salda
-- al "pagar el resumen", que recién ahí debita una cuenta bancaria real.
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,                    -- "Visa Galicia"
  bank VARCHAR(255),
  brand VARCHAR(50),                             -- visa | mastercard | amex | otra
  currency VARCHAR(20) NOT NULL DEFAULT 'peso',  -- moneda principal (peso | dollar), para display
  credit_limit DECIMAL(18,2) NOT NULL DEFAULT 0,
  closing_day INT,                               -- día de cierre del ciclo (1–31)
  due_day INT,                                   -- día de vencimiento del pago (1–31)
  current_balance_pesos DECIMAL(18,2) NOT NULL DEFAULT 0,    -- deuda acumulada viva
  current_balance_dollars DECIMAL(18,2) NOT NULL DEFAULT 0,
  owner_id UUID REFERENCES people(id),           -- dueño (NULL = compartida / sin asignar)
  active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_active ON credit_cards(active);
CREATE INDEX IF NOT EXISTS idx_credit_cards_owner ON credit_cards(owner_id);

-- Resúmenes (estados de cuenta) por ciclo de facturación. Cada cargo a la
-- tarjeta cae en el resumen que cierra en su periodo; al pagarlo se marca 'paid'
-- y se enlaza el movimiento de pago que debitó la cuenta bancaria.
CREATE TABLE IF NOT EXISTS credit_card_statements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL,                    -- YYYY-MM del cierre
  closing_date DATE,
  due_date DATE,
  total_pesos DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_dollars DECIMAL(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',    -- open | closed | paid
  paid_movement_id UUID REFERENCES movements(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (credit_card_id, period)
);

CREATE INDEX IF NOT EXISTS idx_statements_card ON credit_card_statements(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_statements_status ON credit_card_statements(status);
