/**
 * Aplica migraciones SQL en db/migrations/ en orden.
 * Crea la tabla _migrations para registrar qué migraciones ya se aplicaron.
 * Salida: 0 si todo ok, 1 si falla (la app no debe arrancar).
 */
import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import postgres from 'postgres';

// Las migraciones (DDL) deben correr por una conexión que soporte prepared
// statements: Session pooler (5432, host *.pooler.supabase.com) o Direct
// connection (5432). NO usar el Transaction pooler (6543) aquí.
const POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
  console.error('[db:migrate] Define POSTGRES_URL_NON_POOLING (Session pooler / Direct, puerto 5432) o POSTGRES_URL en .env.');
  process.exit(1);
}

const { hostname, port } = new URL(POSTGRES_URL);
const isLocal = /localhost|127\.0\.0\.1/.test(hostname);
const isTransactionPooler = port === '6543';
const sql = postgres(POSTGRES_URL, {
  ssl: isLocal ? false : 'require',
  prepare: isTransactionPooler ? false : true,
  max: 1,
});

const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations');

async function ensureMigrationsTable() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function appliedVersions(): Promise<string[]> {
  const rows = (await sql`SELECT version FROM _migrations`) as { version: string }[];
  return rows.map((r) => r.version);
}

async function runMigration(version: string, content: string) {
  await sql.unsafe(content);
  await sql`INSERT INTO _migrations (version) VALUES (${version})`;
}

async function main() {
  try {
    await ensureMigrationsTable();
    const applied = await appliedVersions();

    const files = await readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      const version = file.replace(/\.sql$/, '');
      if (applied.includes(version)) {
        console.log(`[db:migrate] ${version} ya aplicada, se omite.`);
        continue;
      }
      const path = join(MIGRATIONS_DIR, file);
      const content = await readFile(path, 'utf-8');
      console.log(`[db:migrate] Aplicando ${version}...`);
      await runMigration(version, content);
      console.log(`[db:migrate] ${version} aplicada.`);
    }

    console.log('[db:migrate] Migraciones al día.');
    process.exit(0);
  } catch (err) {
    console.error('[db:migrate] Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
