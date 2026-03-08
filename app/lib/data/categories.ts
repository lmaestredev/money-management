import { sql } from '../db';
import type { Category } from '../definitions';

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    sort_order: Number(row.sort_order ?? 0),
  };
}

export async function fetchCategories(): Promise<Category[]> {
  const rows = await sql`
    SELECT id, name, sort_order
    FROM categories
    ORDER BY sort_order ASC, name ASC
  `;
  return rows.map((r) => rowToCategory(r as Record<string, unknown>));
}

export async function fetchCategoryById(id: string): Promise<Category | null> {
  const [row] = await sql`
    SELECT id, name, sort_order
    FROM categories
    WHERE id = ${id}
  `;
  if (!row) return null;
  return rowToCategory(row as Record<string, unknown>);
}
