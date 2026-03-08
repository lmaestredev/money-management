/**
 * Aplica migraciones SQL en db/migrations/ en orden.
 * Crea la tabla _migrations para registrar qué migraciones ya se aplicaron.
 * Salida: 0 si todo ok, 1 si falla (la app no debe arrancar).
 */
import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import postgres from 'postgres';

const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
  console.error('[db:migrate] POSTGRES_URL no está definido. Configura .env o la variable de entorno.');
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/.test(new URL(POSTGRES_URL).hostname);
const sql = postgres(POSTGRES_URL, { ssl: isLocal ? false : 'require', max: 1 });

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
