import { sql } from '../db';
import type {
  Movement,
  MovementInsert,
  MovementSource,
  RecordType,
} from '../definitions';

function rowToMovement(row: Record<string, unknown>): Movement {
  return {
    id: row.id as string,
    period: row.period as string,
    record_type: row.record_type as RecordType,
    account_id: row.account_id as string,
    category_id: (row.category_id as string) ?? null,
    category_name: (row.category_name as string) ?? null,
    description: (row.description as string) ?? null,
    status: row.status as boolean | null,
    amount_pesos: Number(row.amount_pesos),
    amount_dollars: Number(row.amount_dollars),
    payment_date: (row.payment_date as string) ?? null,
    dollar_rate: row.dollar_rate != null ? Number(row.dollar_rate) : null,
    exchange_rate: row.exchange_rate != null ? Number(row.exchange_rate) : null,
    comment: (row.comment as string) ?? null,
    created_at: row.created_at as string,
    user_id: (row.user_id as string) ?? null,
    source: (row.source as MovementSource) ?? null,
  };
}

export async function fetchMovementsByPeriod(period: string): Promise<Movement[]> {
  const rows = await sql`
    SELECT m.id, m.period, m.record_type, m.account_id, m.category_id,
           c.name AS category_name,
           m.description, m.status, m.amount_pesos, m.amount_dollars,
           m.payment_date, m.dollar_rate, m.exchange_rate, m.comment,
           m.created_at, m.user_id, m.source
    FROM movements m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.period = ${period}
    ORDER BY m.record_type, m.created_at ASC
  `;
  return rows.map((r) => rowToMovement(r as Record<string, unknown>));
}

export async function fetchMovementsByPeriodAndType(
  period: string,
  recordType: RecordType
): Promise<Movement[]> {
  const rows = await sql`
    SELECT m.id, m.period, m.record_type, m.account_id, m.category_id,
           c.name AS category_name,
           m.description, m.status, m.amount_pesos, m.amount_dollars,
           m.payment_date, m.dollar_rate, m.exchange_rate, m.comment,
           m.created_at, m.user_id, m.source
    FROM movements m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.period = ${period} AND m.record_type = ${recordType}
    ORDER BY m.created_at ASC
  `;
  return rows.map((r) => rowToMovement(r as Record<string, unknown>));
}

function getBalanceDeltas(
  recordType: RecordType,
  status: boolean | null,
  amountPesos: number,
  amountDollars: number
): { deltaPesos: number; deltaDollars: number } {
  switch (recordType) {
    case 'income':
      return { deltaPesos: amountPesos, deltaDollars: amountDollars };
    case 'variable_payment':
    case 'fixed_payment':
      if (status === true) {
        return { deltaPesos: -amountPesos, deltaDollars: -amountDollars };
      }
      return { deltaPesos: 0, deltaDollars: 0 };
    case 'conversion':
      return { deltaPesos: amountPesos, deltaDollars: -amountDollars };
    default:
      return { deltaPesos: 0, deltaDollars: 0 };
  }
}

export async function createMovement(
  data: MovementInsert,
  source: MovementSource = 'app'
): Promise<Movement> {
  const sourceValue = data.source ?? source;

  const [row] = await sql.begin(async (tx) => {
    const [inserted] = await tx`
      INSERT INTO movements (
        period, record_type, account_id, category_id, description, status,
        amount_pesos, amount_dollars, payment_date, dollar_rate, exchange_rate,
        comment, user_id, source
      )
      VALUES (
        ${data.period},
        ${data.record_type},
        ${data.account_id},
        ${data.category_id ?? null},
        ${data.description ?? null},
        ${data.status ?? null},
        ${data.amount_pesos},
        ${data.amount_dollars},
        ${data.payment_date ?? null},
        ${data.dollar_rate ?? null},
        ${data.exchange_rate ?? null},
        ${data.comment ?? null},
        ${data.user_id ?? null},
        ${sourceValue}
      )
      RETURNING id, period, record_type, account_id, category_id, description, status,
                amount_pesos, amount_dollars, payment_date, dollar_rate, exchange_rate,
                comment, created_at, user_id, source
    `;

    const { deltaPesos, deltaDollars } = getBalanceDeltas(
      data.record_type,
      data.status ?? null,
      data.amount_pesos,
      data.amount_dollars
    );

    if (deltaPesos !== 0 || deltaDollars !== 0) {
      await tx`
        UPDATE accounts
        SET 
          balance_pesos = balance_pesos + ${deltaPesos},
          balance_dollars = balance_dollars + ${deltaDollars},
          updated_at = NOW()
        WHERE id = ${data.account_id}
      `;
    }

    return [inserted];
  });

  return rowToMovement((row ?? {}) as Record<string, unknown>);
}
