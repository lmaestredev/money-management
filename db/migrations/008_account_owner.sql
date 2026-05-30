-- Personas del hogar: dueños de las cuentas. Identificar al dueño permite
-- generar luego un reporte mensual por persona. Se siembran las dos personas
-- del hogar; agregar/quitar personas es solo un INSERT/UPDATE en esta tabla.
CREATE TABLE IF NOT EXISTS people (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO people (name, sort_order) VALUES ('Luis', 1), ('Valen', 2)
ON CONFLICT (name) DO NOTHING;

-- Dueño de la cuenta (opcional; NULL = compartida / sin asignar).
DO $$
BEGIN
  ALTER TABLE accounts ADD COLUMN owner_id UUID REFERENCES people(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_id);
