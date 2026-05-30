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
    // Pool chico: cubre con holgura las queries en paralelo de cada página.
    max: isLocal ? 10 : 5,
    idle_timeout: 30,
    max_lifetime: 60 * 30,
    connect_timeout: 15,
  });

globalForDb._sql = sql;
