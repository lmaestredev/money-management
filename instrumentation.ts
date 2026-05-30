export async function register() {
  // Solo en runtime Node real. Se omite durante el build (NEXT_PHASE) para no
  // conectar a la BD al generar páginas (en Vercel el sandbox de build no la
  // alcanza y el deploy caería por timeout).
  if (
    process.env.NEXT_RUNTIME !== 'nodejs' ||
    process.env.SKIP_DB_CHECK === '1' ||
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return;
  }
  const { sql } = await import('./app/lib/db');
  try {
    await sql`SELECT 1 FROM _migrations LIMIT 1`;
    console.log('[DB] ✓ Schema OK (migraciones aplicadas)');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DB] ✗ La base de datos no está migrada o no es accesible:', msg);
    console.error('[DB] Ejecuta: npm run db:migrate');
    throw new Error(`Base de datos no migrada: ${msg}. Ejecuta: npm run db:migrate`);
  }
}
