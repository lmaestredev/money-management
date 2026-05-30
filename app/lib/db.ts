import postgres from 'postgres';

/**
 * Selección de conexión según entorno (la forma correcta con Supabase):
 *
 * - Procesos PERSISTENTES (`next dev`, `next start`, self-hosted): Session
 *   Pooler (5432). Conexiones estables y prepared statements ON (más rápido).
 *   Usar aquí el Transaction Pooler provoca cuelgues: mantiene conexiones que
 *   el pooler recicla del lado servidor y postgres.js cree vivas (socket muerto
 *   → la query espera al timeout de TCP).
 *
 * - SERVERLESS/EDGE (Vercel): Transaction Pooler (6543) con prepared statements
 *   OFF, pensado para conexiones efímeras y muchas invocaciones concurrentes.
 */
const isServerless =
  !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const transactionUrl = process.env.POSTGRES_URL; // 6543 (serverless)
const sessionUrl = process.env.POSTGRES_URL_NON_POOLING; // 5432 (persistente)

const connectionString = isServerless
  ? transactionUrl ?? sessionUrl
  : sessionUrl ?? transactionUrl;

if (!connectionString) {
  throw new Error(
    'Falta la conexión a la base de datos. Define POSTGRES_URL (Transaction Pooler 6543) y POSTGRES_URL_NON_POOLING (Session Pooler 5432) en .env.'
  );
}

const { hostname, port } = new URL(connectionString);
const isLocal = /localhost|127\.0\.0\.1/.test(hostname);
// pgBouncer en modo transacción (6543) no soporta prepared statements.
const isTransactionPooler = port === '6543';

// En dev, Next.js re-evalúa este módulo en cada recompilación de ruta. Sin
// caché se crearían pools nuevos hasta agotar el límite del pooler. Cacheamos
// el cliente en globalThis para reutilizar un único pool.
const globalForDb = globalThis as unknown as {
  _sql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForDb._sql ??
  postgres(connectionString, {
    ssl: isLocal ? false : 'require',
    prepare: !isTransactionPooler,
    // Serverless: 1 conexión por invocación. Persistente: pool pequeño que
    // cubre las queries en paralelo de cada página con holgura.
    max: isServerless ? 1 : 10,
    // Reciclar conexiones ociosas para evitar sockets obsoletos a través del
    // pooler, y fallar rápido si una conexión no se establece (en vez de colgar).
    idle_timeout: 30,
    max_lifetime: 60 * 30,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb._sql = sql;
}
