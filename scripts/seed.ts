/**
 * Inserta las categorías de referencia (Hogar, Vivienda, etc.). Idempotente.
 * No crea usuarios, cuentas ni movimientos: esos se registran por formulario.
 * Requiere el esquema aplicado (pnpm db:migrate). Corre con el rol dueño de las
 * tablas (conexión de migraciones), que puede escribir en `categories` aunque su
 * RLS sea solo lectura. Nunca exponerlo como ruta HTTP.
 */
import 'dotenv/config';
import postgres from 'postgres';

const CATEGORIES = [
  { name: 'Hogar', sort_order: 1 },
  { name: 'Vivienda', sort_order: 2 },
  { name: 'Educación', sort_order: 3 },
  { name: 'Suscripciones', sort_order: 4 },
  { name: 'Ocio y personal', sort_order: 5 },
  { name: 'Deportes', sort_order: 6 },
  { name: 'Otros', sort_order: 7 },
] as const;

const POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
  console.error('[db:seed] Define POSTGRES_URL_NON_POOLING (Session pooler / Direct, puerto 5432) o POSTGRES_URL en .env.');
  process.exit(1);
}

const { hostname, port } = new URL(POSTGRES_URL);
const isLocal = /localhost|127\.0\.0\.1/.test(hostname);
const sql = postgres(POSTGRES_URL, {
  ssl: isLocal ? false : 'require',
  prepare: port !== '6543',
  max: 1,
});

async function main() {
  await sql.begin(async (tx) => {
    for (const c of CATEGORIES) {
      await tx`
        INSERT INTO categories (name, sort_order)
        VALUES (${c.name}, ${c.sort_order})
        ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order
      `;
    }
  });
  console.log(`[db:seed] ${CATEGORIES.length} categorías insertadas/actualizadas.`);
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error('[db:seed] Falló:', err instanceof Error ? err.message : err);
    await sql.end();
    process.exit(1);
  });
