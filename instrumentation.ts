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
  try {
    const { sql } = await import('./app/lib/db');
    await sql`SELECT 1 FROM _migrations LIMIT 1`;
    console.log('[DB] ✓ Schema OK (migraciones aplicadas)');
  } catch (err) {
    // No tumbar la app por el chequeo: solo avisar. Si la BD no es accesible,
    // las páginas que la usan mostrarán el error correspondiente.
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DB] ✗ La base de datos no es accesible o no está migrada:', msg);
    console.error('[DB] Verifica POSTGRES_URL / POSTGRES_URL_NON_POOLING y ejecuta: npm run db:migrate');
  }
}
