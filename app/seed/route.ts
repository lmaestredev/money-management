/**
 * Inserta solo categorías de referencia (Hogar, Vivienda, etc.).
 * No crea usuarios, cuentas ni movimientos: esos se registran por formulario.
 * El esquema debe estar aplicado con pnpm db:migrate.
 */
import { sql } from '../lib/db';

const CATEGORIES = [
  { name: 'Hogar', sort_order: 1 },
  { name: 'Vivienda', sort_order: 2 },
  { name: 'Educación', sort_order: 3 },
  { name: 'Suscripciones', sort_order: 4 },
  { name: 'Ocio y personal', sort_order: 5 },
  { name: 'Deportes', sort_order: 6 },
  { name: 'Otros', sort_order: 7 },
] as const;

export async function GET() {
  try {
    for (const c of CATEGORIES) {
      await sql`
        INSERT INTO categories (name, sort_order)
        VALUES (${c.name}, ${c.sort_order})
        ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order;
      `;
    }
    return Response.json({
      message: 'Categorías insertadas correctamente',
      count: CATEGORIES.length,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json(
      { error: String(error), hint: 'Asegúrate de haber ejecutado pnpm db:migrate antes.' },
      { status: 500 }
    );
  }
}
