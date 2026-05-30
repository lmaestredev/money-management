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
    installment_id: (row.installment_id as string) ?? null,
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

export async function fetchMovementById(id: string): Promise<Movement | null> {
  const [row] = await sql`
    SELECT m.id, m.period, m.record_type, m.account_id, m.category_id,
           c.name AS category_name,
           m.description, m.status, m.amount_pesos, m.amount_dollars,
           m.payment_date, m.dollar_rate, m.exchange_rate, m.comment,
           m.created_at, m.user_id, m.source, m.installment_id
    FROM movements m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.id = ${id}
  `;
  if (!row) return null;
  return rowToMovement(row as Record<string, unknown>);
}

export function getBalanceDeltas(
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

/**
 * Edita un movimiento ajustando saldos de forma atómica: revierte el efecto del
 * movimiento anterior (sobre su cuenta original) y aplica el nuevo (sobre la
 * cuenta nueva). Preserva los vínculos a cuota/gasto fijo (installment_id,
 * recurring_expense_id) y el periodo.
 */
export async function updateMovement(
  id: string,
  data: MovementInsert
): Promise<Movement | null> {
  return sql.begin(async (tx) => {
    const [old] = await tx`
      SELECT account_id, record_type, status, amount_pesos, amount_dollars
      FROM movements
      WHERE id = ${id}
      FOR UPDATE
    `;
    if (!old) return null;

    // Revertir efecto del movimiento anterior sobre su cuenta original.
    const oldDelta = getBalanceDeltas(
      old.record_type as RecordType,
      old.status as boolean | null,
      Number(old.amount_pesos),
      Number(old.amount_dollars)
    );
    if ((oldDelta.deltaPesos !== 0 || oldDelta.deltaDollars !== 0) && old.account_id) {
      await tx`
        UPDATE accounts
        SET balance_pesos = balance_pesos - ${oldDelta.deltaPesos},
            balance_dollars = balance_dollars - ${oldDelta.deltaDollars},
            updated_at = NOW()
        WHERE id = ${old.account_id}
      `;
    }

    // Aplicar efecto del movimiento nuevo sobre la cuenta nueva.
    const newDelta = getBalanceDeltas(
      data.record_type,
      data.status ?? null,
      data.amount_pesos,
      data.amount_dollars
    );
    if ((newDelta.deltaPesos !== 0 || newDelta.deltaDollars !== 0) && data.account_id) {
      await tx`
        UPDATE accounts
        SET balance_pesos = balance_pesos + ${newDelta.deltaPesos},
            balance_dollars = balance_dollars + ${newDelta.deltaDollars},
            updated_at = NOW()
        WHERE id = ${data.account_id}
      `;
    }

    const [row] = await tx`
      UPDATE movements SET
        record_type = ${data.record_type},
        account_id = ${data.account_id},
        category_id = ${data.category_id ?? null},
        description = ${data.description ?? null},
        status = ${data.status ?? null},
        amount_pesos = ${data.amount_pesos},
        amount_dollars = ${data.amount_dollars},
        payment_date = ${data.payment_date ?? null},
        dollar_rate = ${data.dollar_rate ?? null}
      WHERE id = ${id}
      RETURNING id, period, record_type, account_id, category_id, description, status,
                amount_pesos, amount_dollars, payment_date, dollar_rate, exchange_rate,
                comment, created_at, user_id, source, installment_id
    `;
    return rowToMovement((row ?? {}) as Record<string, unknown>);
  });
}

/**
 * Elimina un movimiento revirtiendo sus efectos de forma atómica:
 * - Devuelve al saldo de la cuenta el delta que se aplicó al crearlo.
 * - Si era el pago de una cuota, descuenta paid_installments y la reactiva.
 * (Los pagos de gastos fijos se detectan por la existencia del movimiento en el
 * periodo, así que al borrarlo vuelven a quedar "pendientes" automáticamente.)
 */
export async function deleteMovement(id: string): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [mov] = await tx`
      SELECT id, account_id, record_type, status, amount_pesos, amount_dollars, installment_id
      FROM movements
      WHERE id = ${id}
      FOR UPDATE
    `;
    if (!mov) return false;

    const { deltaPesos, deltaDollars } = getBalanceDeltas(
      mov.record_type as RecordType,
      mov.status as boolean | null,
      Number(mov.amount_pesos),
      Number(mov.amount_dollars)
    );
    if ((deltaPesos !== 0 || deltaDollars !== 0) && mov.account_id) {
      await tx`
        UPDATE accounts
        SET balance_pesos = balance_pesos - ${deltaPesos},
            balance_dollars = balance_dollars - ${deltaDollars},
            updated_at = NOW()
        WHERE id = ${mov.account_id}
      `;
    }

    if (mov.installment_id) {
      await tx`
        UPDATE installment_purchases
        SET paid_installments = GREATEST(0, paid_installments - 1),
            status = 'active',
            updated_at = NOW()
        WHERE id = ${mov.installment_id}
      `;
    }

    await tx`DELETE FROM movements WHERE id = ${id}`;
    return true;
  });
}
