import type postgres from 'postgres';
import { applyCardCharge, reverseCardCharge } from './credit-cards';
import { getAccountBalanceDeltas, getCardChargeDeltas } from './movements';
import type {
  AccountCurrency,
  InstallmentInsert,
  RecurringExpenseInsert,
  RecurringIncomeInsert,
  RecordType,
} from '../definitions';

type Tx = postgres.TransactionSql<Record<string, never>>;

type SyncScope = {
  /** Si se indica, solo sincroniza movimientos del período financiero abierto. */
  financialPeriodId?: string | null;
  /** Tasa efectiva para convertir montos al debitar cuentas/tarjetas. */
  rate?: number | null;
};

type LinkedMovement = {
  id: string;
  account_id: string | null;
  credit_card_id: string | null;
  statement_id: string | null;
  record_type: string;
  status: boolean | null;
  amount_pesos: number;
  amount_dollars: number;
  description: string | null;
};

type MovementTarget = {
  account_id: string | null;
  credit_card_id: string | null;
  statement_id: string | null;
};

function mapLinkedMovement(row: Record<string, unknown>): LinkedMovement {
  return {
    id: row.id as string,
    account_id: (row.account_id as string) ?? null,
    credit_card_id: (row.credit_card_id as string) ?? null,
    statement_id: (row.statement_id as string) ?? null,
    record_type: row.record_type as string,
    status: row.status as boolean | null,
    amount_pesos: Number(row.amount_pesos),
    amount_dollars: Number(row.amount_dollars),
    description: (row.description as string) ?? null,
  };
}

async function fetchIncomeLinkedMovements(
  tx: Tx,
  recurringId: string,
  scope: SyncScope = {}
): Promise<LinkedMovement[]> {
  const rows = scope.financialPeriodId
    ? await tx`
        SELECT id, account_id, credit_card_id, statement_id, record_type, status,
               amount_pesos, amount_dollars, description
        FROM movements
        WHERE recurring_income_id = ${recurringId}
          AND financial_period_id = ${scope.financialPeriodId}
        FOR UPDATE
      `
    : await tx`
        SELECT id, account_id, credit_card_id, statement_id, record_type, status,
               amount_pesos, amount_dollars, description
        FROM movements
        WHERE recurring_income_id = ${recurringId}
        FOR UPDATE
      `;
  return rows.map((row) => mapLinkedMovement(row as Record<string, unknown>));
}

async function fetchExpenseLinkedMovements(
  tx: Tx,
  recurringId: string,
  scope: SyncScope = {}
): Promise<LinkedMovement[]> {
  const rows = scope.financialPeriodId
    ? await tx`
        SELECT id, account_id, credit_card_id, statement_id, record_type, status,
               amount_pesos, amount_dollars, description
        FROM movements
        WHERE recurring_expense_id = ${recurringId}
          AND financial_period_id = ${scope.financialPeriodId}
        FOR UPDATE
      `
    : await tx`
        SELECT id, account_id, credit_card_id, statement_id, record_type, status,
               amount_pesos, amount_dollars, description
        FROM movements
        WHERE recurring_expense_id = ${recurringId}
        FOR UPDATE
      `;
  return rows.map((row) => mapLinkedMovement(row as Record<string, unknown>));
}

async function fetchInstallmentLinkedMovements(
  tx: Tx,
  installmentId: string,
  scope: SyncScope = {}
): Promise<LinkedMovement[]> {
  const rows = scope.financialPeriodId
    ? await tx`
        SELECT id, account_id, credit_card_id, statement_id, record_type, status,
               amount_pesos, amount_dollars, description
        FROM movements
        WHERE installment_id = ${installmentId}
          AND financial_period_id = ${scope.financialPeriodId}
        FOR UPDATE
      `
    : await tx`
        SELECT id, account_id, credit_card_id, statement_id, record_type, status,
               amount_pesos, amount_dollars, description
        FROM movements
        WHERE installment_id = ${installmentId}
        FOR UPDATE
      `;
  return rows.map((row) => mapLinkedMovement(row as Record<string, unknown>));
}

async function revertMovementEffect(
  tx: Tx,
  mov: LinkedMovement,
  rate: number | null
): Promise<void> {
  if (mov.credit_card_id) {
    const [card] = await tx`
      SELECT currency FROM credit_cards WHERE id = ${mov.credit_card_id}
    `;
    const cardDelta = getCardChargeDeltas(
      (card?.currency as AccountCurrency) ?? null,
      mov.record_type as RecordType,
      mov.amount_pesos,
      mov.amount_dollars,
      rate
    );
    await reverseCardCharge(
      tx,
      mov.credit_card_id,
      mov.statement_id,
      cardDelta.deltaPesos,
      cardDelta.deltaDollars
    );
    return;
  }

  if (!mov.account_id) return;

  const currency = await resolveAccountCurrency(tx, mov.account_id);
  const delta = getAccountBalanceDeltas(
    currency,
    mov.record_type as RecordType,
    mov.status,
    mov.amount_pesos,
    mov.amount_dollars,
    rate
  );
  if (delta.deltaPesos === 0 && delta.deltaDollars === 0) return;

  await tx`
    UPDATE accounts
    SET balance_pesos = balance_pesos - ${delta.deltaPesos},
        balance_dollars = balance_dollars - ${delta.deltaDollars},
        updated_at = NOW()
    WHERE id = ${mov.account_id}
  `;
}

async function applyMovementEffectToTarget(
  tx: Tx,
  target: MovementTarget,
  recordType: RecordType,
  status: boolean | null,
  amountPesos: number,
  amountDollars: number,
  rate: number | null
): Promise<void> {
  if (target.credit_card_id) {
    const [card] = await tx`
      SELECT currency FROM credit_cards WHERE id = ${target.credit_card_id}
    `;
    const cardDelta = getCardChargeDeltas(
      (card?.currency as AccountCurrency) ?? null,
      recordType,
      amountPesos,
      amountDollars,
      rate
    );
    if (target.statement_id) {
      await applyCardCharge(
        tx,
        target.credit_card_id,
        target.statement_id,
        cardDelta.deltaPesos,
        cardDelta.deltaDollars
      );
    }
    return;
  }

  if (!target.account_id) return;

  const currency = await resolveAccountCurrency(tx, target.account_id);
  const delta = getAccountBalanceDeltas(
    currency,
    recordType,
    status,
    amountPesos,
    amountDollars,
    rate
  );
  if (delta.deltaPesos === 0 && delta.deltaDollars === 0) return;

  await tx`
    UPDATE accounts
    SET balance_pesos = balance_pesos + ${delta.deltaPesos},
        balance_dollars = balance_dollars + ${delta.deltaDollars},
        updated_at = NOW()
    WHERE id = ${target.account_id}
  `;
}

function installmentMovementDescription(
  oldDescription: string | null,
  name: string,
  totalInstallments: number
): string {
  const match = (oldDescription ?? '').match(/\(cuota\s+(\d+)\/(\d+)\)/i);
  if (match) {
    return `${name} (cuota ${match[1]}/${totalInstallments})`;
  }
  return name;
}

async function resolveAccountCurrency(
  tx: Tx,
  accountId: string | null
): Promise<AccountCurrency | null> {
  if (!accountId) return null;
  const [account] = await tx`
    SELECT currency FROM accounts WHERE id = ${accountId}
  `;
  const currency = account?.currency as string;
  if (currency === 'peso' || currency === 'dollar' || currency === 'crypto' || currency === 'dual') {
    return currency;
  }
  return null;
}

export async function syncRecurringIncomeLinkedMovements(
  tx: Tx,
  recurringId: string,
  data: RecurringIncomeInsert,
  scope: SyncScope = {}
): Promise<void> {
  const movements = await fetchIncomeLinkedMovements(tx, recurringId, scope);
  const amountPesos = data.amount_pesos ?? 0;
  const amountDollars = data.amount_dollars ?? 0;
  const rate = scope.rate ?? null;

  for (const mov of movements) {
    const targetAccountId = data.account_id ?? mov.account_id;

    await revertMovementEffect(tx, mov, rate);

    const target: MovementTarget = {
      account_id: targetAccountId,
      credit_card_id: null,
      statement_id: null,
    };
    await applyMovementEffectToTarget(
      tx,
      target,
      'income',
      true,
      amountPesos,
      amountDollars,
      rate
    );

    await tx`
      UPDATE movements
      SET description = ${data.name},
          category_id = ${data.category_id ?? null},
          account_id = ${targetAccountId},
          credit_card_id = NULL,
          statement_id = NULL,
          amount_pesos = ${amountPesos},
          amount_dollars = ${amountDollars}
      WHERE id = ${mov.id}
    `;
  }
}

export async function syncRecurringExpenseLinkedMovements(
  tx: Tx,
  recurringId: string,
  data: RecurringExpenseInsert,
  scope: SyncScope = {}
): Promise<void> {
  const movements = await fetchExpenseLinkedMovements(tx, recurringId, scope);
  const amountPesos = data.amount_pesos ?? 0;
  const amountDollars = data.amount_dollars ?? 0;
  const rate = scope.rate ?? null;

  for (const mov of movements) {
    const useCard = !!mov.credit_card_id;
    let target: MovementTarget;

    if (useCard) {
      const targetCardId = data.credit_card_id ?? mov.credit_card_id;
      target = {
        account_id: null,
        credit_card_id: targetCardId,
        statement_id: mov.statement_id,
      };
    } else {
      const targetAccountId = data.account_id ?? mov.account_id;
      target = {
        account_id: targetAccountId,
        credit_card_id: null,
        statement_id: null,
      };
    }

    await revertMovementEffect(tx, mov, rate);
    await applyMovementEffectToTarget(
      tx,
      target,
      'fixed_payment',
      true,
      amountPesos,
      amountDollars,
      rate
    );

    await tx`
      UPDATE movements
      SET description = ${data.name},
          category_id = ${data.category_id ?? null},
          account_id = ${target.account_id},
          credit_card_id = ${target.credit_card_id},
          amount_pesos = ${amountPesos},
          amount_dollars = ${amountDollars}
      WHERE id = ${mov.id}
    `;
  }
}

export async function syncInstallmentLinkedMovements(
  tx: Tx,
  installmentId: string,
  data: InstallmentInsert,
  scope: SyncScope = {}
): Promise<void> {
  const movements = await fetchInstallmentLinkedMovements(tx, installmentId, scope);
  const amountPesos = data.monthly_amount_pesos ?? 0;
  const amountDollars = data.monthly_amount_dollars ?? 0;
  const totalInstallments = data.total_installments;
  const rate = scope.rate ?? null;

  for (const mov of movements) {
    const description = installmentMovementDescription(
      mov.description,
      data.name,
      totalInstallments
    );

    const useCard = !!mov.credit_card_id;
    let target: MovementTarget;

    if (useCard) {
      const targetCardId = data.credit_card_id ?? mov.credit_card_id;
      target = {
        account_id: null,
        credit_card_id: targetCardId,
        statement_id: mov.statement_id,
      };
    } else {
      const targetAccountId = data.account_id ?? mov.account_id;
      target = {
        account_id: targetAccountId,
        credit_card_id: null,
        statement_id: null,
      };
    }

    await revertMovementEffect(tx, mov, rate);
    await applyMovementEffectToTarget(
      tx,
      target,
      'fixed_payment',
      true,
      amountPesos,
      amountDollars,
      rate
    );

    await tx`
      UPDATE movements
      SET description = ${description},
          category_id = ${data.category_id ?? null},
          account_id = ${target.account_id},
          credit_card_id = ${target.credit_card_id},
          amount_pesos = ${amountPesos},
          amount_dollars = ${amountDollars}
      WHERE id = ${mov.id}
    `;
  }
}
