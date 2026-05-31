import postgres from 'postgres';

/**
 * Conexión a Supabase vía Session Pooler (5432) en todos los entornos.
 *
 * El Session Pooler da una conexión dedicada, soporta prepared statements y
 * maneja bien varias consultas en paralelo (el dashboard hace Promise.all de
 * varias queries). El Transaction Pooler (6543, modo transacción de pgBouncer)
 * no pipelinea bien múltiples queries sobre una conexión y termina cancelando
 * por "statement timeout" (Postgres 57014). Para esta app de uso personal el
 * Session Pooler es la opción correcta también en serverless.
 *
 * Se prefiere POSTGRES_URL_NON_POOLING (5432); POSTGRES_URL queda como fallback.
 */
const sessionUrl = process.env.POSTGRES_URL_NON_POOLING; // 5432 (preferida)
const transactionUrl = process.env.POSTGRES_URL; // 6543 (fallback)

const connectionString = sessionUrl ?? transactionUrl;

if (!connectionString) {
  throw new Error(
    'Falta la conexión a la base de datos. Define POSTGRES_URL_NON_POOLING (Session Pooler 5432) y/o POSTGRES_URL en las variables de entorno.'
  );
}

const { hostname, port } = new URL(connectionString);
const isLocal = /localhost|127\.0\.0\.1/.test(hostname);
// pgBouncer en modo transacción (6543) no soporta prepared statements.
const isTransactionPooler = port === '6543';

// Next.js re-evalúa este módulo en cada recompilación de ruta (dev) y una vez
// por instancia (serverless). Cacheamos el cliente en globalThis para reutilizar
// un único pool y no agotar el pooler.
const globalForDb = globalThis as unknown as {
  _sql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForDb._sql ??
  postgres(connectionString, {
    ssl: isLocal ? false : 'require',
    prepare: !isTransactionPooler,
    // Session Pooler (5432): postgres.js pipelinea las queries en paralelo de
    // cada página (el Promise.all del dashboard) sobre UNA sola conexión, así que
    // no hace falta un pool grande para servirlas. En serverless el límite de 15
    // clientes en modo sesión de Supavisor se reparte entre TODOS los entornos
    // conectados (dev local + cada instancia de Vercel); con max:5 por instancia
    // bastan ~3 instancias para agotarlo (EMAXCONNSESSION). max:1 por instancia
    // permite hasta 15 instancias concurrentes sin pasarnos.
    max: isLocal ? 5 : 1,
    // Liberar conexiones rápido para que otras instancias puedan reusar el cupo.
    idle_timeout: isLocal ? 30 : 10,
    max_lifetime: 60 * 30,
    connect_timeout: 15,
  });

globalForDb._sql = sql;
