import { sql } from '../db';
import type { Person } from '../definitions';

function rowToPerson(row: Record<string, unknown>): Person {
  return {
    id: row.id as string,
    name: row.name as string,
    sort_order: Number(row.sort_order ?? 0),
  };
}

export async function fetchPeople(): Promise<Person[]> {
  const rows = await sql`
    SELECT id, name, sort_order
    FROM people
    ORDER BY sort_order ASC, name ASC
  `;
  return rows.map((r) => rowToPerson(r as Record<string, unknown>));
}
