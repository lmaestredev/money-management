import { sql, withAuthenticatedTx } from '../db';
import { getBalanceDeltas, getCardDeltas } from './movements';
import { applyCardCharge, resolveOrCreateStatement } from './credit-cards';
import type { InstallmentInsert, InstallmentPurchase, InstallmentStatus } from '../definitions';

function rowToInstallment(row: Record<string, unknown>): InstallmentPurchase {
  const total = Number(row.total_installments);
  const paid = Number(row.paid_installments);
  const remaining = Math.max(0, total - paid);
  const monthlyPesos = Number(row.monthly_amount_pesos);
  const monthlyDollars = Number(row.monthly_amount_dollars);
  const status = (row.status as string) === 'finished' ? 'finished' : 'active';

  return {
    id: row.id as string,
    name: row.name as string,
    account_id: (row.account_id as string) ?? null,
    account_name: (row.account_name as string) ?? null,
    credit_card_id: (row.credit_card_id as string) ?? null,
    credit_card_name: (row.credit_card_name as string) ?? null,
    category_id: (row.category_id as string) ?? null,
    category_name: (row.category_name as string) ?? null,
    total_installments: total,
    paid_installments: paid,
    monthly_amount_pesos: monthlyPesos,
    monthly_amount_dollars: monthlyDollars,
    total_amount_pesos: Number(row.total_amount_pesos),
    total_amount_dollars: Number(row.total_amount_dollars),
    pay_before_day: row.pay_before_day != null ? Number(row.pay_before_day) : null,
    start_period: (row.start_period as string) ?? null,
    status: status as InstallmentStatus,
    user_id: row.user_id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    remaining_installments: remaining,
    remaining_amount_pesos: monthlyPesos * remaining,
    remaining_amount_dollars: monthlyDollars * remaining,
  };
}

const SELECT_COLUMNS = sql`
  i.id, i.name, i.account_id, a.name AS account_name,
  i.credit_card_id, cc.name AS credit_card_name,
  i.category_id, c.name AS category_name,
  i.total_installments, i.paid_installments,
  i.monthly_amount_pesos, i.monthly_amount_dollars,
  i.total_amount_pesos, i.total_amount_dollars,
  i.pay_before_day, i.start_period, i.status, i.user_id,
  i.created_at, i.updated_at
`;

export async function fetchInstallments(userId: string): Promise<InstallmentPurchase[]> {
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = await tx`
      SELECT ${SELECT_COLUMNS}
      FROM installment_purchases i
      LEFT JOIN accounts a ON i.account_id = a.id
      LEFT JOIN credit_cards cc ON i.credit_card_id = cc.id
      LEFT JOIN categories c ON i.category_id = c.id
      ORDER BY (i.status = 'active') DESC, i.name ASC
    `;
    return rows.map((r) => rowToInstallment(r as Record<string, unknown>));
  });
}

export async function fetchActiveInstallments(userId: string): Promise<InstallmentPurchase[]> {
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = await tx`
      SELECT ${SELECT_COLUMNS}
      FROM installment_purchases i
      LEFT JOIN accounts a ON i.account_id = a.id
      LEFT JOIN credit_cards cc ON i.credit_card_id = cc.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.status = 'active' AND i.paid_installments < i.total_installments
      ORDER BY i.name ASC
    `;
    return rows.map((r) => rowToInstallment(r as Record<string, unknown>));
  });
}

export async function fetchInstallmentById(id: string, userId: string): Promise<InstallmentPurchase | null> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      SELECT ${SELECT_COLUMNS}
      FROM installment_purchases i
      LEFT JOIN accounts a ON i.account_id = a.id
      LEFT JOIN credit_cards cc ON i.credit_card_id = cc.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.id = ${id}
    `;
    if (!row) return null;
    return rowToInstallment(row as Record<string, unknown>);
  });
}

export async function fetchInstallmentPaidIds(financialPeriodId: string, userId: string): Promise<Set<string>> {
  if (!financialPeriodId) return new Set();
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = (await tx`
      SELECT DISTINCT installment_id
      FROM movements
      WHERE financial_period_id = ${financialPeriodId} AND installment_id IS NOT NULL
    `) as { installment_id: string }[];
    return new Set(rows.map((r) => r.installment_id));
  });
}

export async function createInstallment(
  data: InstallmentInsert,
  userId: string
): Promise<InstallmentPurchase> {
  const insertedId = await withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      INSERT INTO installment_purchases (
        name, account_id, credit_card_id, category_id, total_installments, paid_installments,
        monthly_amount_pesos, monthly_amount_dollars,
        total_amount_pesos, total_amount_dollars,
        pay_before_day, start_period, user_id
      )
      VALUES (
        ${data.name},
        ${data.account_id ?? null},
        ${data.credit_card_id ?? null},
        ${data.category_id ?? null},
        ${data.total_installments},
        ${data.paid_installments ?? 0},
        ${data.monthly_amount_pesos ?? 0},
        ${data.monthly_amount_dollars ?? 0},
        ${data.total_amount_pesos ?? 0},
        ${data.total_amount_dollars ?? 0},
        ${data.pay_before_day ?? null},
        ${data.start_period ?? null},
        ${userId}
      )
      RETURNING id
    `;
    return (row as { id: string }).id;
  });
  const created = await fetchInstallmentById(insertedId, userId);
  return created!;
}

export type PayInstallmentResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'completed' | 'already_paid' | 'no_account' };

export async function payInstallment(
  installmentId: string,
  period: string,
  financialPeriodId: string,
  userId: string
): Promise<PayInstallmentResult> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [inst] = await tx`
      SELECT id, name, account_id, credit_card_id, category_id,
             total_installments, paid_installments,
             monthly_amount_pesos, monthly_amount_dollars, status
      FROM installment_purchases
      WHERE id = ${installmentId}
      FOR UPDATE
    `;
    if (!inst) return { ok: false, reason: 'not_found' as const };
    if (!inst.account_id && !inst.credit_card_id) {
      return { ok: false, reason: 'no_account' as const };
    }

    const total = Number(inst.total_installments);
    const paid = Number(inst.paid_installments);
    if (paid >= total || inst.status === 'finished') {
      return { ok: false, reason: 'completed' as const };
    }

    const [existing] = await tx`
      SELECT id FROM movements
      WHERE installment_id = ${installmentId} AND financial_period_id = ${financialPeriodId}
      LIMIT 1
    `;
    if (existing) return { ok: false, reason: 'already_paid' as const };

    const nextNumber = paid + 1;
    const amountPesos = Number(inst.monthly_amount_pesos);
    const amountDollars = Number(inst.monthly_amount_dollars);
    const description = `${inst.name} (cuota ${nextNumber}/${total})`;

    if (inst.credit_card_id) {
      const st = await resolveOrCreateStatement(tx, inst.credit_card_id as string, new Date());
      await tx`
        INSERT INTO movements (
          period, financial_period_id, record_type, credit_card_id, statement_id, category_id,
          description, status,
          amount_pesos, amount_dollars, payment_date, comment, source, installment_id, user_id
        )
        VALUES (
          ${period}, ${financialPeriodId}, 'fixed_payment', ${inst.credit_card_id}, ${st.id}, ${inst.category_id ?? null},
          ${description}, true, ${amountPesos}, ${amountDollars}, NULL, NULL, 'app',
          ${installmentId}, ${userId}
        )
      `;
      const card = getCardDeltas('fixed_payment', amountPesos, amountDollars);
      await applyCardCharge(tx, inst.credit_card_id as string, st.id, card.deltaPesos, card.deltaDollars);
    } else {
      await tx`
        INSERT INTO movements (
          period, financial_period_id, record_type, account_id, category_id, description, status,
          amount_pesos, amount_dollars, payment_date, comment, source, installment_id, user_id
        )
        VALUES (
          ${period}, ${financialPeriodId}, 'fixed_payment', ${inst.account_id}, ${inst.category_id ?? null},
          ${description}, true, ${amountPesos}, ${amountDollars}, NULL, NULL, 'app',
          ${installmentId}, ${userId}
        )
      `;

      const { deltaPesos, deltaDollars } = getBalanceDeltas(
        'fixed_payment',
        true,
        amountPesos,
        amountDollars
      );
      if (deltaPesos !== 0 || deltaDollars !== 0) {
        await tx`
          UPDATE accounts
          SET balance_pesos = balance_pesos + ${deltaPesos},
              balance_dollars = balance_dollars + ${deltaDollars},
              updated_at = NOW()
          WHERE id = ${inst.account_id}
        `;
      }
    }

    const finished = nextNumber >= total;
    await tx`
      UPDATE installment_purchases
      SET paid_installments = ${nextNumber},
          status = ${finished ? 'finished' : 'active'},
          updated_at = NOW()
      WHERE id = ${installmentId}
    `;

    return { ok: true as const };
  });
}
