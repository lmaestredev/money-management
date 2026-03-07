export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { sql } = await import('./app/lib/db');
    try {
      await sql`SELECT 1`;
      console.log('[DB] ✓ Connected successfully to PostgreSQL');
    } catch (err) {
      console.error('[DB] ✗ Connection failed:', err instanceof Error ? err.message : err);
    }
  }
}
