import postgres from 'postgres';

// Cliente único de Postgres. En Fase 2 se puede mover a lib/db.ts.
// Las funciones de lectura/escritura por dominio irán en lib/data/*.
export const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
