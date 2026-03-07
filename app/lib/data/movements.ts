import { sql } from '../db';
import { updateAccountBalances } from './accounts';
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
    SELECT id, period, record_type, account_id, description, status,
           amount_pesos, amount_dollars, payment_date, dollar_rate, exchange_rate,
           comment, created_at, user_id, source
    FROM movements
    WHERE period = ${period}
    ORDER BY record_type, created_at ASC
  `;
  return rows.map((r) => rowToMovement(r as Record<string, unknown>));
}

export async function fetchMovementsByPeriodAndType(
  period: string,
  recordType: RecordType
): Promise<Movement[]> {
  const rows = await sql`
    SELECT id, period, record_type, account_id, description, status,
           amount_pesos, amount_dollars, payment_date, dollar_rate, exchange_rate,
           comment, created_at, user_id, source
    FROM movements
    WHERE period = ${period} AND record_type = ${recordType}
    ORDER BY created_at ASC
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
        period, record_type, account_id, description, status,
        amount_pesos, amount_dollars, payment_date, dollar_rate, exchange_rate,
        comment, user_id, source
      )
      VALUES (
        ${data.period},
        ${data.record_type},
        ${data.account_id},
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
      RETURNING id, period, record_type, account_id, description, status,
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
