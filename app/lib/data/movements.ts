import { sql } from '../db';
import {
  applyCardCharge,
  resolveOrCreateStatement,
  reverseCardCharge,
} from './credit-cards';
import { fetchCurrentPeriod } from './financial-periods';
import { getEffectiveRate } from './exchange-rates';
import { amountsToUsd } from '../utils/currency';
import type postgres from 'postgres';
import type {
  AccountCurrency,
  LegacyRecordType,
  Movement,
  MovementInsert,
  MovementSource,
  RecordType,
} from '../definitions';

function rowToMovement(row: Record<string, unknown>): Movement {
  return {
    id: row.id as string,
    period: row.period as string,
    financial_period_id: row.financial_period_id as string,
    record_type: row.record_type as LegacyRecordType,
    account_id: (row.account_id as string) ?? null,
    credit_card_id: (row.credit_card_id as string) ?? null,
    statement_id: (row.statement_id as string) ?? null,
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
    recurring_expense_id: (row.recurring_expense_id as string) ?? null,
    recurring_income_id: (row.recurring_income_id as string) ?? null,
  };
}

export async function fetchMovementsByPeriod(period: string): Promise<Movement[]> {
  const rows = await sql`
    SELECT m.id, m.period, m.financial_period_id, m.record_type, m.account_id, m.credit_card_id,
           m.statement_id, m.category_id,
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

/** Movimientos del período financiero (rango de fechas del período activo o cerrado). */
export async function fetchMovementsByFinancialPeriod(financialPeriodId: string): Promise<Movement[]> {
  const rows = await sql`
    SELECT m.id, m.period, m.financial_period_id, m.record_type, m.account_id, m.credit_card_id,
           m.statement_id, m.category_id,
           c.name AS category_name,
           m.description, m.status, m.amount_pesos, m.amount_dollars,
           m.payment_date, m.dollar_rate, m.exchange_rate, m.comment,
           m.created_at, m.user_id, m.source,
           m.installment_id, m.recurring_expense_id, m.recurring_income_id
    FROM movements m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.financial_period_id = ${financialPeriodId}
    ORDER BY m.record_type, m.created_at ASC
  `;
  return rows.map((r) => rowToMovement(r as Record<string, unknown>));
}

export async function fetchMovementsByPeriodAndType(
  period: string,
  recordType: RecordType
): Promise<Movement[]> {
  const rows = await sql`
    SELECT m.id, m.period, m.financial_period_id, m.record_type, m.account_id, m.credit_card_id,
           m.statement_id, m.category_id,
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
    SELECT m.id, m.period, m.financial_period_id, m.record_type, m.account_id, m.credit_card_id,
           m.statement_id, m.category_id,
           c.name AS category_name,
           m.description, m.status, m.amount_pesos, m.amount_dollars,
           m.payment_date, m.dollar_rate, m.exchange_rate, m.comment,
           m.created_at, m.user_id, m.source, m.installment_id,
           m.recurring_expense_id, m.recurring_income_id
    FROM movements m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.id = ${id}
  `;
  if (!row) return null;
  return rowToMovement(row as Record<string, unknown>);
}

export function getBalanceDeltas(
  recordType: LegacyRecordType,
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
      // Legado: suma pesos y resta dólares en la misma cuenta.
      return { deltaPesos: amountPesos, deltaDollars: -amountDollars };
    default:
      return { deltaPesos: 0, deltaDollars: 0 };
  }
}

/**
 * Delta de DEUDA para un cargo a tarjeta. A diferencia de las cuentas, un cargo
 * a tarjeta suma a la deuda apenas se hace (no depende del estado pagado/pendiente:
 * el resumen es lo que luego se paga). Solo aplica a egresos.
 */
export function getCardDeltas(
  recordType: LegacyRecordType,
  amountPesos: number,
  amountDollars: number
): { deltaPesos: number; deltaDollars: number } {
  if (recordType === 'variable_payment' || recordType === 'fixed_payment') {
    return { deltaPesos: amountPesos, deltaDollars: amountDollars };
  }
  return { deltaPesos: 0, deltaDollars: 0 };
}

function totalPesos(amountPesos: number, amountDollars: number, rate: number | null): number {
  return amountPesos + (rate && rate > 0 ? amountDollars * rate : 0);
}

/** Aplica el movimiento al saldo de una cuenta según su moneda nativa. */
export function getAccountBalanceDeltas(
  accountCurrency: AccountCurrency | null | undefined,
  recordType: LegacyRecordType,
  status: boolean | null,
  amountPesos: number,
  amountDollars: number,
  rate: number | null
): { deltaPesos: number; deltaDollars: number } {
  if (recordType === 'conversion') {
    return getBalanceDeltas(recordType, status, amountPesos, amountDollars);
  }

  const isIncome = recordType === 'income';
  const isExpense = recordType === 'variable_payment' || recordType === 'fixed_payment';
  if (!isIncome && !isExpense) {
    return { deltaPesos: 0, deltaDollars: 0 };
  }
  if (isExpense && status !== true) {
    return { deltaPesos: 0, deltaDollars: 0 };
  }

  const sign = isIncome ? 1 : -1;
  const usdTotal = amountsToUsd(amountPesos, amountDollars, rate);
  const pesoTotal = totalPesos(amountPesos, amountDollars, rate);

  if (accountCurrency === 'peso') {
    return { deltaPesos: sign * pesoTotal, deltaDollars: 0 };
  }
  if (accountCurrency === 'dual') {
    return getBalanceDeltas(recordType, status, amountPesos, amountDollars);
  }
  if (accountCurrency === 'dollar' || accountCurrency === 'crypto') {
    return { deltaPesos: 0, deltaDollars: sign * usdTotal };
  }

  return getBalanceDeltas(recordType, status, amountPesos, amountDollars);
}

/** Carga a la tarjeta en la moneda nativa de la tarjeta. */
export function getCardChargeDeltas(
  cardCurrency: AccountCurrency | null | undefined,
  recordType: RecordType,
  amountPesos: number,
  amountDollars: number,
  rate: number | null
): { deltaPesos: number; deltaDollars: number } {
  if (recordType !== 'variable_payment' && recordType !== 'fixed_payment') {
    return { deltaPesos: 0, deltaDollars: 0 };
  }

  const usdTotal = amountsToUsd(amountPesos, amountDollars, rate);
  const pesoTotal = totalPesos(amountPesos, amountDollars, rate);

  if (cardCurrency === 'peso') {
    return { deltaPesos: pesoTotal, deltaDollars: 0 };
  }
  if (cardCurrency === 'dual') {
    return getCardDeltas(recordType, amountPesos, amountDollars);
  }
  if (cardCurrency === 'dollar' || cardCurrency === 'crypto') {
    return { deltaPesos: 0, deltaDollars: usdTotal };
  }

  return getCardDeltas(recordType, amountPesos, amountDollars);
}

type Tx = postgres.TransactionSql<Record<string, never>>;

async function fetchAccountCurrencyTx(tx: Tx, accountId: string): Promise<AccountCurrency | null> {
  const [row] = await tx`SELECT currency FROM accounts WHERE id = ${accountId}`;
  return row ? (row.currency as AccountCurrency) : null;
}

async function fetchCardCurrencyTx(tx: Tx, cardId: string): Promise<AccountCurrency | null> {
  const [row] = await tx`SELECT currency FROM credit_cards WHERE id = ${cardId}`;
  return row ? (row.currency as AccountCurrency) : null;
}

async function applyAccountMovementDelta(
  tx: Tx,
  accountId: string,
  recordType: RecordType,
  status: boolean | null,
  amountPesos: number,
  amountDollars: number,
  rate: number | null
): Promise<void> {
  const currency = await fetchAccountCurrencyTx(tx, accountId);
  const { deltaPesos, deltaDollars } = getAccountBalanceDeltas(
    currency,
    recordType,
    status,
    amountPesos,
    amountDollars,
    rate
  );
  if (deltaPesos === 0 && deltaDollars === 0) return;
  await tx`
    UPDATE accounts
    SET
      balance_pesos = balance_pesos + ${deltaPesos},
      balance_dollars = balance_dollars + ${deltaDollars},
      updated_at = NOW()
    WHERE id = ${accountId}
  `;
}

async function revertAccountMovementDelta(
  tx: Tx,
  accountId: string,
  recordType: RecordType,
  status: boolean | null,
  amountPesos: number,
  amountDollars: number,
  rate: number | null
): Promise<void> {
  const currency = await fetchAccountCurrencyTx(tx, accountId);
  const { deltaPesos, deltaDollars } = getAccountBalanceDeltas(
    currency,
    recordType,
    status,
    amountPesos,
    amountDollars,
    rate
  );
  if (deltaPesos === 0 && deltaDollars === 0) return;
  await tx`
    UPDATE accounts
    SET
      balance_pesos = balance_pesos - ${deltaPesos},
      balance_dollars = balance_dollars - ${deltaDollars},
      updated_at = NOW()
    WHERE id = ${accountId}
  `;
}

async function applyCardMovementCharge(
  tx: Tx,
  cardId: string,
  statementId: string,
  recordType: RecordType,
  amountPesos: number,
  amountDollars: number,
  rate: number | null
): Promise<void> {
  const currency = await fetchCardCurrencyTx(tx, cardId);
  const cardDelta = getCardChargeDeltas(currency, recordType, amountPesos, amountDollars, rate);
  await applyCardCharge(tx, cardId, statementId, cardDelta.deltaPesos, cardDelta.deltaDollars);
}

async function revertCardMovementCharge(
  tx: Tx,
  cardId: string,
  statementId: string | null,
  recordType: RecordType,
  amountPesos: number,
  amountDollars: number,
  rate: number | null
): Promise<void> {
  const currency = await fetchCardCurrencyTx(tx, cardId);
  const cardDelta = getCardChargeDeltas(currency, recordType, amountPesos, amountDollars, rate);
  await reverseCardCharge(tx, cardId, statementId, cardDelta.deltaPesos, cardDelta.deltaDollars);
}

export async function createMovement(
  data: MovementInsert,
  source: MovementSource = 'app'
): Promise<Movement> {
  const sourceValue = data.source ?? source;
  const rate = (await getEffectiveRate())?.rate ?? null;

  // Resuelve el financial_period_id: usa el del data si viene (cierre automático),
  // si no, toma el período abierto activo.
  const financialPeriodId = data.financial_period_id
    ?? (await fetchCurrentPeriod())?.id
    ?? (() => { throw new Error('No hay período financiero abierto'); })();

  const [row] = await sql.begin(async (tx) => {
    // Cargo a tarjeta: ubica el resumen del ciclo; no se debita ninguna cuenta.
    let statementId: string | null = data.statement_id ?? null;
    if (data.credit_card_id) {
      const chargeDate = data.payment_date ? new Date(data.payment_date) : new Date();
      const st = await resolveOrCreateStatement(tx, data.credit_card_id, chargeDate);
      statementId = st.id;
    }

    const [inserted] = await tx`
      INSERT INTO movements (
        period, financial_period_id, record_type, account_id, credit_card_id, statement_id,
        category_id, description, status,
        amount_pesos, amount_dollars, payment_date, dollar_rate, exchange_rate,
        comment, user_id, source
      )
      VALUES (
        ${data.period},
        ${financialPeriodId},
        ${data.record_type},
        ${data.account_id ?? null},
        ${data.credit_card_id ?? null},
        ${statementId},
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
      RETURNING id, period, financial_period_id, record_type, account_id, credit_card_id, statement_id,
                category_id, description, status,
                amount_pesos, amount_dollars, payment_date, dollar_rate, exchange_rate,
                comment, created_at, user_id, source
    `;

    if (data.credit_card_id) {
      await applyCardMovementCharge(
        tx,
        data.credit_card_id,
        statementId!,
        data.record_type,
        data.amount_pesos,
        data.amount_dollars,
        rate
      );
    } else if (data.account_id) {
      await applyAccountMovementDelta(
        tx,
        data.account_id,
        data.record_type,
        data.status ?? null,
        data.amount_pesos,
        data.amount_dollars,
        rate
      );
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
  const rate = (await getEffectiveRate())?.rate ?? null;

  return sql.begin(async (tx) => {
    const [old] = await tx`
      SELECT account_id, credit_card_id, statement_id, record_type, status,
             amount_pesos, amount_dollars, recurring_income_id, recurring_expense_id,
             installment_id
      FROM movements
      WHERE id = ${id}
      FOR UPDATE
    `;
    if (!old) return null;

    // Revertir efecto del movimiento anterior (tarjeta o cuenta).
    if (old.credit_card_id) {
      await revertCardMovementCharge(
        tx,
        old.credit_card_id as string,
        (old.statement_id as string) ?? null,
        old.record_type as RecordType,
        Number(old.amount_pesos),
        Number(old.amount_dollars),
        rate
      );
    } else if (old.account_id) {
      await revertAccountMovementDelta(
        tx,
        old.account_id as string,
        old.record_type as RecordType,
        old.status as boolean | null,
        Number(old.amount_pesos),
        Number(old.amount_dollars),
        rate
      );
    }

    // Aplicar efecto del movimiento nuevo (tarjeta o cuenta).
    let statementId: string | null = data.statement_id ?? null;
    if (data.credit_card_id) {
      const chargeDate = data.payment_date ? new Date(data.payment_date) : new Date();
      const st = await resolveOrCreateStatement(tx, data.credit_card_id, chargeDate);
      statementId = st.id;
      await applyCardMovementCharge(
        tx,
        data.credit_card_id,
        statementId,
        data.record_type,
        data.amount_pesos,
        data.amount_dollars,
        rate
      );
    } else if (data.account_id) {
      await applyAccountMovementDelta(
        tx,
        data.account_id,
        data.record_type,
        data.status ?? null,
        data.amount_pesos,
        data.amount_dollars,
        rate
      );
    }

    const [row] = await tx`
      UPDATE movements SET
        record_type = ${data.record_type},
        account_id = ${data.account_id ?? null},
        credit_card_id = ${data.credit_card_id ?? null},
        statement_id = ${statementId},
        category_id = ${data.category_id ?? null},
        description = ${data.description ?? null},
        status = ${data.status ?? null},
        amount_pesos = ${data.amount_pesos},
        amount_dollars = ${data.amount_dollars},
        payment_date = ${data.payment_date ?? null},
        dollar_rate = ${data.dollar_rate ?? null}
      WHERE id = ${id}
      RETURNING id, period, record_type, account_id, credit_card_id, statement_id,
                category_id, description, status,
                amount_pesos, amount_dollars, payment_date, dollar_rate, exchange_rate,
                comment, created_at, user_id, source, installment_id,
                recurring_expense_id, recurring_income_id
    `;

    if (old.recurring_income_id) {
      await tx`
        UPDATE recurring_incomes
        SET name = ${data.description ?? ''},
            category_id = ${data.category_id ?? null},
            amount_pesos = ${data.amount_pesos},
            amount_dollars = ${data.amount_dollars},
            updated_at = NOW()
        WHERE id = ${old.recurring_income_id}
      `;
    } else if (old.recurring_expense_id) {
      await tx`
        UPDATE recurring_expenses
        SET name = ${data.description ?? ''},
            category_id = ${data.category_id ?? null},
            amount_pesos = ${data.amount_pesos},
            amount_dollars = ${data.amount_dollars},
            updated_at = NOW()
        WHERE id = ${old.recurring_expense_id}
      `;
    } else if (old.installment_id) {
      await tx`
        UPDATE installment_purchases
        SET name = ${data.description?.replace(/\s*\(cuota\s+\d+\/\d+\)\s*$/i, '') ?? ''},
            category_id = ${data.category_id ?? null},
            monthly_amount_pesos = ${data.amount_pesos},
            monthly_amount_dollars = ${data.amount_dollars},
            updated_at = NOW()
        WHERE id = ${old.installment_id}
      `;
    }

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
  const rate = (await getEffectiveRate())?.rate ?? null;

  return sql.begin(async (tx) => {
    const [mov] = await tx`
      SELECT id, account_id, credit_card_id, statement_id, record_type, status,
             amount_pesos, amount_dollars, installment_id
      FROM movements
      WHERE id = ${id}
      FOR UPDATE
    `;
    if (!mov) return false;

    if (mov.credit_card_id) {
      await revertCardMovementCharge(
        tx,
        mov.credit_card_id as string,
        (mov.statement_id as string) ?? null,
        mov.record_type as RecordType,
        Number(mov.amount_pesos),
        Number(mov.amount_dollars),
        rate
      );
    } else if (mov.account_id) {
      await revertAccountMovementDelta(
        tx,
        mov.account_id as string,
        mov.record_type as RecordType,
        mov.status as boolean | null,
        Number(mov.amount_pesos),
        Number(mov.amount_dollars),
        rate
      );
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
