import bcrypt from 'bcrypt';
import { sql } from '../lib/db';
import { users } from '../lib/placeholder-data';

async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );
}

async function seedAccounts() {
  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      balance_pesos DECIMAL(18,2) NOT NULL DEFAULT 0,
      balance_dollars DECIMAL(18,2) NOT NULL DEFAULT 0,
      user_id UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // Insertar cuentas de ejemplo (IDs fijos para referenciar en movimientos)
  const account1Id = 'a1111111-1111-4111-8111-111111111111';
  const account2Id = 'a2222222-2222-4222-8222-222222222222';

  await sql`
    INSERT INTO accounts (id, name, balance_pesos, balance_dollars)
    VALUES 
      (${account1Id}, 'Cuenta principal', 0, 0),
      (${account2Id}, 'Efectivo USD', 0, 0)
    ON CONFLICT (id) DO NOTHING;
  `;
  return { account1Id, account2Id };
}

async function seedMovements(accountIds: { account1Id: string; account2Id: string }) {
  await sql`
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
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_movements_period_record_type 
    ON movements(period, record_type);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_movements_account_period 
    ON movements(account_id, period);
  `;

  const period = '2026-03';
  const { account1Id, account2Id } = accountIds;

  // Un ingreso y un gasto fijo de ejemplo (los saldos se actualizarían con createMovement; aquí solo insertamos datos crudos para tener registros)
  await sql`
    INSERT INTO movements (period, record_type, account_id, description, status, amount_pesos, amount_dollars, source)
    VALUES 
      (${period}, 'income', ${account1Id}, 'Sueldo ejemplo', true, 8680000, 6200, 'app'),
      (${period}, 'fixed_payment', ${account1Id}, 'Alquiler', true, 1190000, 850, 'app');
  `;

  // Actualizar saldos de la cuenta de ejemplo (simulando el efecto de esos movimientos)
  await sql`
    UPDATE accounts 
    SET balance_pesos = 7490000, balance_dollars = 5350, updated_at = NOW()
    WHERE id = ${account1Id};
  `;
}

export async function GET() {
  try {
    await seedUsers();
    const accountIds = await seedAccounts();
    await seedMovements(accountIds);
    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
