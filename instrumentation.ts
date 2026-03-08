export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.SKIP_DB_CHECK === '1') {
    return;
  }
  const { sql } = await import('./app/lib/db');
  try {
    await sql`SELECT 1 FROM _migrations LIMIT 1`;
    console.log('[DB] ✓ Schema OK (migraciones aplicadas)');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DB] ✗ La base de datos no está migrada o no es accesible:', msg);
    console.error('[DB] Ejecuta: pnpm db:migrate');
    throw new Error(`Base de datos no migrada: ${msg}. Ejecuta: pnpm db:migrate`);
  }
}
