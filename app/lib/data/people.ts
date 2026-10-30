import { withAuthenticatedTx } from '../db';
import type { Person } from '../definitions';

function rowToPerson(row: Record<string, unknown>): Person {
  return {
    id: row.id as string,
    name: row.name as string,
    sort_order: Number(row.sort_order ?? 0),
    user_id: row.user_id as string,
  };
}

export async function fetchPeople(userId: string): Promise<Person[]> {
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = await tx`
      SELECT id, name, sort_order, user_id
      FROM people
      ORDER BY sort_order ASC, name ASC
    `;
    return rows.map((r) => rowToPerson(r as Record<string, unknown>));
  });
}
