import postgres from 'postgres';
import { sql } from '../db';
import { getBalanceDeltas } from './movements';
import type {
  AccountCurrency,
  CardBrand,
  CardStatement,
  CreditCard,
  CreditCardInsert,
  StatementStatus,
} from '../definitions';

type Tx = postgres.TransactionSql<Record<string, never>>;

const CURRENCIES: AccountCurrency[] = ['peso', 'dollar', 'crypto'];
const BRANDS: CardBrand[] = ['visa', 'mastercard', 'amex', 'otra'];

function rowToCard(row: Record<string, unknown>): CreditCard {
  const currency = row.currency as string;
  const brand = row.brand as string | null;
  return {
    id: row.id as string,
    name: row.name as string,
    bank: (row.bank as string) ?? null,
    brand: brand && BRANDS.includes(brand as CardBrand) ? (brand as CardBrand) : null,
    currency: CURRENCIES.includes(currency as AccountCurrency) ? (currency as AccountCurrency) : 'peso',
    credit_limit: Number(row.credit_limit),
    closing_day: row.closing_day != null ? Number(row.closing_day) : null,
    due_day: row.due_day != null ? Number(row.due_day) : null,
    current_balance_pesos: Number(row.current_balance_pesos),
    current_balance_dollars: Number(row.current_balance_dollars),
    owner_id: (row.owner_id as string) ?? null,
    owner_name: (row.owner_name as string) ?? null,
    active: Boolean(row.active),
    user_id: (row.user_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToStatement(row: Record<string, unknown>): CardStatement {
  const status = row.status as string;
  return {
    id: row.id as string,
    credit_card_id: row.credit_card_id as string,
    period: row.period as string,
    closing_date: (row.closing_date as string) ?? null,
    due_date: (row.due_date as string) ?? null,
    total_pesos: Number(row.total_pesos),
    total_dollars: Number(row.total_dollars),
    status: (['open', 'closed', 'paid'].includes(status) ? status : 'open') as StatementStatus,
    paid_movement_id: (row.paid_movement_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Lógica de ciclo de facturación
// ---------------------------------------------------------------------------

function clampDay(year: number, month0: number, day: number): number {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  return Math.min(day, daysInMonth);
}

function toISODate(year: number, month0: number, day: number): string {
  const d = clampDay(year, month0, day);
  const mm = String(month0 + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export type Cycle = { period: string; closingDate: string | null; dueDate: string | null };

/**
 * Resuelve a qué resumen (ciclo) pertenece un cargo hecho en `chargeDate`.
 * - El cargo cae en el resumen que cierra el próximo closing_day >= fecha del cargo.
 * - El vencimiento es el due_day del mes correspondiente (mes siguiente al cierre
 *   si due_day <= closing_day).
 * - Sin closing_day: el resumen es el mes calendario del cargo.
 */
export function resolveCycle(
  chargeDate: Date,
  closingDay: number | null,
  dueDay: number | null
): Cycle {
  const year = chargeDate.getFullYear();
  const month0 = chargeDate.getMonth();
  const day = chargeDate.getDate();

  if (!closingDay) {
    const period = `${year}-${String(month0 + 1).padStart(2, '0')}`;
    return { period, closingDate: null, dueDate: null };
  }

  // Si el cargo es posterior al cierre de este mes, cierra el mes siguiente.
  let closingYear = year;
  let closingMonth0 = month0;
  if (day > clampDay(year, month0, closingDay)) {
    closingMonth0 += 1;
    if (closingMonth0 > 11) {
      closingMonth0 = 0;
      closingYear += 1;
    }
  }

  const closingDate = toISODate(closingYear, closingMonth0, closingDay);
  const period = `${closingYear}-${String(closingMonth0 + 1).padStart(2, '0')}`;

  let dueDate: string | null = null;
  if (dueDay) {
    let dueYear = closingYear;
    let dueMonth0 = closingMonth0;
    if (dueDay <= closingDay) {
      dueMonth0 += 1;
      if (dueMonth0 > 11) {
        dueMonth0 = 0;
        dueYear += 1;
      }
    }
    dueDate = toISODate(dueYear, dueMonth0, dueDay);
  }

  return { period, closingDate, dueDate };
}

// ---------------------------------------------------------------------------
// Helpers transaccionales: cargar / revertir un cargo a la tarjeta
// ---------------------------------------------------------------------------

/** Encuentra (o crea) el resumen abierto al que pertenece un cargo, dentro de una tx. */
export async function resolveOrCreateStatement(
  tx: Tx,
  cardId: string,
  chargeDate: Date
): Promise<{ id: string; period: string }> {
  const [card] = await tx`
    SELECT closing_day, due_day FROM credit_cards WHERE id = ${cardId}
  `;
  const closingDay = card?.closing_day != null ? Number(card.closing_day) : null;
  const dueDay = card?.due_day != null ? Number(card.due_day) : null;
  const { period, closingDate, dueDate } = resolveCycle(chargeDate, closingDay, dueDay);

  const [existing] = await tx`
    SELECT id FROM credit_card_statements
    WHERE credit_card_id = ${cardId} AND period = ${period}
    LIMIT 1
  `;
  if (existing) return { id: existing.id as string, period };

  const [created] = await tx`
    INSERT INTO credit_card_statements (credit_card_id, period, closing_date, due_date, status)
    VALUES (${cardId}, ${period}, ${closingDate}, ${dueDate}, 'open')
    RETURNING id
  `;
  return { id: created.id as string, period };
}

/** Suma un cargo a la deuda de la tarjeta y al total del resumen (dentro de una tx). */
export async function applyCardCharge(
  tx: Tx,
  cardId: string,
  statementId: string,
  amountPesos: number,
  amountDollars: number
): Promise<void> {
  if (amountPesos === 0 && amountDollars === 0) return;
  await tx`
    UPDATE credit_cards
    SET current_balance_pesos = current_balance_pesos + ${amountPesos},
        current_balance_dollars = current_balance_dollars + ${amountDollars},
        updated_at = NOW()
    WHERE id = ${cardId}
  `;
  await tx`
    UPDATE credit_card_statements
    SET total_pesos = total_pesos + ${amountPesos},
        total_dollars = total_dollars + ${amountDollars},
        updated_at = NOW()
    WHERE id = ${statementId}
  `;
}

/** Revierte un cargo de la deuda de la tarjeta y del total de su resumen (dentro de una tx). */
export async function reverseCardCharge(
  tx: Tx,
  cardId: string,
  statementId: string | null,
  amountPesos: number,
  amountDollars: number
): Promise<void> {
  if (amountPesos === 0 && amountDollars === 0) return;
  await tx`
    UPDATE credit_cards
    SET current_balance_pesos = current_balance_pesos - ${amountPesos},
        current_balance_dollars = current_balance_dollars - ${amountDollars},
        updated_at = NOW()
    WHERE id = ${cardId}
  `;
  if (statementId) {
    await tx`
      UPDATE credit_card_statements
      SET total_pesos = total_pesos - ${amountPesos},
          total_dollars = total_dollars - ${amountDollars},
          updated_at = NOW()
      WHERE id = ${statementId}
    `;
  }
}

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

const SELECT_COLUMNS = sql`
  cc.id, cc.name, cc.bank, cc.brand, cc.currency, cc.credit_limit,
  cc.closing_day, cc.due_day,
  cc.current_balance_pesos, cc.current_balance_dollars,
  cc.owner_id, p.name AS owner_name, cc.active, cc.user_id,
  cc.created_at, cc.updated_at
`;

export async function fetchCreditCards(): Promise<CreditCard[]> {
  const rows = await sql`
    SELECT ${SELECT_COLUMNS}
    FROM credit_cards cc
    LEFT JOIN people p ON p.id = cc.owner_id
    ORDER BY cc.active DESC, cc.name ASC
  `;
  return rows.map((r) => rowToCard(r as Record<string, unknown>));
}

export async function fetchActiveCreditCards(): Promise<CreditCard[]> {
  const rows = await sql`
    SELECT ${SELECT_COLUMNS}
    FROM credit_cards cc
    LEFT JOIN people p ON p.id = cc.owner_id
    WHERE cc.active = true
    ORDER BY cc.name ASC
  `;
  return rows.map((r) => rowToCard(r as Record<string, unknown>));
}

export async function fetchCreditCardById(id: string): Promise<CreditCard | null> {
  const [row] = await sql`
    SELECT ${SELECT_COLUMNS}
    FROM credit_cards cc
    LEFT JOIN people p ON p.id = cc.owner_id
    WHERE cc.id = ${id}
  `;
  if (!row) return null;
  return rowToCard(row as Record<string, unknown>);
}

/** Resúmenes con deuda pendiente (no pagados y con total > 0), de todas las tarjetas. */
export async function fetchUnpaidStatements(): Promise<CardStatement[]> {
  const rows = await sql`
    SELECT id, credit_card_id, period, closing_date, due_date,
           total_pesos, total_dollars, status, paid_movement_id, created_at, updated_at
    FROM credit_card_statements
    WHERE status <> 'paid' AND (total_pesos <> 0 OR total_dollars <> 0)
    ORDER BY period ASC
  `;
  return rows.map((r) => rowToStatement(r as Record<string, unknown>));
}

/** IDs de los movimientos que son pago de resumen (liquidación, no gasto nuevo). */
export async function fetchStatementPaymentIds(): Promise<Set<string>> {
  const rows = (await sql`
    SELECT paid_movement_id FROM credit_card_statements WHERE paid_movement_id IS NOT NULL
  `) as { paid_movement_id: string }[];
  return new Set(rows.map((r) => r.paid_movement_id));
}

export async function fetchStatementsByCard(cardId: string): Promise<CardStatement[]> {
  const rows = await sql`
    SELECT id, credit_card_id, period, closing_date, due_date,
           total_pesos, total_dollars, status, paid_movement_id, created_at, updated_at
    FROM credit_card_statements
    WHERE credit_card_id = ${cardId}
    ORDER BY period DESC
  `;
  return rows.map((r) => rowToStatement(r as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

export async function createCreditCard(data: CreditCardInsert): Promise<CreditCard> {
  const [row] = await sql`
    INSERT INTO credit_cards (
      name, bank, brand, currency, credit_limit, closing_day, due_day,
      current_balance_pesos, current_balance_dollars, owner_id, active, user_id
    )
    VALUES (
      ${data.name},
      ${data.bank ?? null},
      ${data.brand ?? null},
      ${data.currency ?? 'peso'},
      ${data.credit_limit ?? 0},
      ${data.closing_day ?? null},
      ${data.due_day ?? null},
      ${data.current_balance_pesos ?? 0},
      ${data.current_balance_dollars ?? 0},
      ${data.owner_id ?? null},
      ${data.active ?? true},
      ${data.user_id ?? null}
    )
    RETURNING id
  `;
  const created = await fetchCreditCardById((row as { id: string }).id);
  return created!;
}

export type CreditCardUpdate = {
  name: string;
  bank?: string | null;
  brand?: CardBrand | null;
  currency: AccountCurrency;
  credit_limit: number;
  closing_day?: number | null;
  due_day?: number | null;
  owner_id?: string | null;
  active?: boolean;
};

export async function updateCreditCard(
  id: string,
  data: CreditCardUpdate
): Promise<CreditCard | null> {
  const [row] = await sql`
    UPDATE credit_cards SET
      name = ${data.name},
      bank = ${data.bank ?? null},
      brand = ${data.brand ?? null},
      currency = ${data.currency},
      credit_limit = ${data.credit_limit},
      closing_day = ${data.closing_day ?? null},
      due_day = ${data.due_day ?? null},
      owner_id = ${data.owner_id ?? null},
      active = ${data.active ?? true},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  if (!row) return null;
  return fetchCreditCardById((row as { id: string }).id);
}

export type DeleteCreditCardResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'has_movements' };

/**
 * Elimina una tarjeta. Se bloquea si tiene movimientos asociados (no se puede
 * orfanar el historial). Las cuotas y gastos fijos que la referencian se
 * desvinculan; sus resúmenes se borran en cascada.
 */
export async function deleteCreditCard(id: string): Promise<DeleteCreditCardResult> {
  return sql.begin(async (tx) => {
    const [card] = await tx`SELECT id FROM credit_cards WHERE id = ${id} FOR UPDATE`;
    if (!card) return { ok: false, reason: 'not_found' as const };

    const [{ count }] = await tx`
      SELECT COUNT(*)::int AS count FROM movements WHERE credit_card_id = ${id}
    `;
    if (Number(count) > 0) return { ok: false, reason: 'has_movements' as const };

    await tx`UPDATE installment_purchases SET credit_card_id = NULL WHERE credit_card_id = ${id}`;
    await tx`UPDATE recurring_expenses SET credit_card_id = NULL WHERE credit_card_id = ${id}`;
    await tx`DELETE FROM credit_cards WHERE id = ${id}`;
    return { ok: true as const };
  });
}

// ---------------------------------------------------------------------------
// Pago de resumen
// ---------------------------------------------------------------------------

export type PayStatementResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'already_paid' | 'empty' | 'no_account' };

/**
 * Paga el resumen de una tarjeta: crea un movimiento que debita la cuenta
 * bancaria elegida por el total del resumen, baja la deuda de la tarjeta y marca
 * el resumen como pagado. Atómico.
 */
export async function payStatement(
  statementId: string,
  accountId: string | null
): Promise<PayStatementResult> {
  if (!accountId) return { ok: false, reason: 'no_account' };

  return sql.begin(async (tx) => {
    const [st] = await tx`
      SELECT id, credit_card_id, period, total_pesos, total_dollars, status
      FROM credit_card_statements
      WHERE id = ${statementId}
      FOR UPDATE
    `;
    if (!st) return { ok: false, reason: 'not_found' as const };
    if (st.status === 'paid') return { ok: false, reason: 'already_paid' as const };

    const totalPesos = Number(st.total_pesos);
    const totalDollars = Number(st.total_dollars);
    if (totalPesos === 0 && totalDollars === 0) {
      return { ok: false, reason: 'empty' as const };
    }

    const [card] = await tx`SELECT name FROM credit_cards WHERE id = ${st.credit_card_id}`;
    const cardName = (card?.name as string) ?? 'Tarjeta';
    const description = `Pago resumen ${cardName} (${st.period})`;

    const [mov] = await tx`
      INSERT INTO movements (
        period, record_type, account_id, description, status,
        amount_pesos, amount_dollars, payment_date, source
      )
      VALUES (
        ${st.period}, 'fixed_payment', ${accountId}, ${description}, true,
        ${totalPesos}, ${totalDollars}, NULL, 'app'
      )
      RETURNING id
    `;

    const { deltaPesos, deltaDollars } = getBalanceDeltas(
      'fixed_payment',
      true,
      totalPesos,
      totalDollars
    );
    if (deltaPesos !== 0 || deltaDollars !== 0) {
      await tx`
        UPDATE accounts
        SET balance_pesos = balance_pesos + ${deltaPesos},
            balance_dollars = balance_dollars + ${deltaDollars},
            updated_at = NOW()
        WHERE id = ${accountId}
      `;
    }

    await tx`
      UPDATE credit_cards
      SET current_balance_pesos = current_balance_pesos - ${totalPesos},
          current_balance_dollars = current_balance_dollars - ${totalDollars},
          updated_at = NOW()
      WHERE id = ${st.credit_card_id}
    `;

    await tx`
      UPDATE credit_card_statements
      SET status = 'paid', paid_movement_id = ${(mov as { id: string }).id}, updated_at = NOW()
      WHERE id = ${statementId}
    `;

    return { ok: true as const };
  });
}
