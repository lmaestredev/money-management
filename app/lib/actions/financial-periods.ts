'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  fetchCurrentPeriod,
  closePeriodRecord,
} from '@/app/lib/data/financial-periods';
import {
  fetchActiveInstallments,
  fetchInstallmentPaidIds,
  payInstallment,
} from '@/app/lib/data/installments';
import {
  fetchActiveRecurringExpenses,
  fetchRecurringPaidIds,
  payRecurringExpense,
} from '@/app/lib/data/recurring';
import {
  fetchActiveRecurringIncomes,
  fetchRecurringIncomeReceivedIds,
  receiveRecurringIncome,
} from '@/app/lib/data/recurring-incomes';
import { createClient } from '@/app/lib/supabase/server';
import type { FinancialPeriod } from '@/app/lib/definitions';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

export type SkippedItem = {
  id: string;
  name: string;
  reason: 'already_paid' | 'no_account' | 'completed' | 'error';
};

export type ManualItem = {
  id: string;
  name: string;
  hint: string;
};

export type ClosePeriodSummary = {
  installmentsPaid: number;
  installmentsSkipped: SkippedItem[];
  fixedExpensesPaid: number;
  fixedExpensesManual: ManualItem[];
  fixedExpensesSkipped: SkippedItem[];
  incomeReceived: number;
  incomeManual: ManualItem[];
  incomeSkipped: SkippedItem[];
  closedPeriod: FinancialPeriod;
  nextPeriod: FinancialPeriod;
};

export type ClosePeriodResult =
  | { ok: true; summary: ClosePeriodSummary }
  | { ok: false; reason: 'no_open_period' | 'error'; error?: string };

function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function todayPeriod(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}`;
}

export async function closePeriodAction(): Promise<ClosePeriodResult> {
  const user = await requireUser();
  const userId = user.id;

  const currentPeriod = await fetchCurrentPeriod(userId);
  if (!currentPeriod) {
    return { ok: false, reason: 'no_open_period' };
  }

  const fpId = currentPeriod.id;
  const period = todayPeriod();

  try {
    const [
      activeInstallments,
      activeRecurring,
      activeIncomes,
      paidInstallmentIds,
      paidRecurringIds,
      receivedIncomeIds,
    ] = await Promise.all([
      fetchActiveInstallments(userId),
      fetchActiveRecurringExpenses(userId),
      fetchActiveRecurringIncomes(userId),
      fetchInstallmentPaidIds(fpId, userId),
      fetchRecurringPaidIds(fpId, userId),
      fetchRecurringIncomeReceivedIds(fpId, userId),
    ]);

    const installmentsPaid: number[] = [];
    const installmentsSkipped: SkippedItem[] = [];

    for (const inst of activeInstallments) {
      if (paidInstallmentIds.has(inst.id)) {
        installmentsSkipped.push({ id: inst.id, name: inst.name, reason: 'already_paid' });
        continue;
      }
      const result = await payInstallment(inst.id, period, fpId, userId);
      if (result.ok) {
        installmentsPaid.push(1);
      } else {
        installmentsSkipped.push({
          id: inst.id,
          name: inst.name,
          reason: result.reason === 'already_paid' ? 'already_paid'
            : result.reason === 'completed' ? 'completed'
            : result.reason === 'no_account' ? 'no_account'
            : 'error',
        });
      }
    }

    const fixedPaid: number[] = [];
    const fixedManual: ManualItem[] = [];
    const fixedSkipped: SkippedItem[] = [];

    for (const exp of activeRecurring) {
      if (paidRecurringIds.has(exp.id)) {
        fixedSkipped.push({ id: exp.id, name: exp.name, reason: 'already_paid' });
        continue;
      }
      if (exp.is_cash) {
        fixedManual.push({
          id: exp.id,
          name: exp.name,
          hint: 'Se paga en efectivo — elegí la cuenta al confirmar el pago.',
        });
        continue;
      }
      if (!exp.account_id && !exp.credit_card_id) {
        fixedManual.push({
          id: exp.id,
          name: exp.name,
          hint: 'No tiene cuenta ni tarjeta asignada.',
        });
        continue;
      }
      const result = await payRecurringExpense(exp.id, period, fpId, userId);
      if (result.ok) {
        fixedPaid.push(1);
      } else {
        fixedSkipped.push({
          id: exp.id,
          name: exp.name,
          reason: result.reason === 'already_paid' ? 'already_paid'
            : result.reason === 'no_account' ? 'no_account'
            : 'error',
        });
      }
    }

    const incomePaid: number[] = [];
    const incomeManual: ManualItem[] = [];
    const incomeSkipped: SkippedItem[] = [];

    for (const inc of activeIncomes) {
      if (receivedIncomeIds.has(inc.id)) {
        incomeSkipped.push({ id: inc.id, name: inc.name, reason: 'already_paid' });
        continue;
      }
      if (!inc.account_id) {
        incomeManual.push({
          id: inc.id,
          name: inc.name,
          hint: 'No tiene cuenta asignada — elegí la cuenta al confirmar el cobro.',
        });
        continue;
      }
      const result = await receiveRecurringIncome(inc.id, period, fpId, userId);
      if (result.ok) {
        incomePaid.push(1);
      } else {
        incomeSkipped.push({
          id: inc.id,
          name: inc.name,
          reason: result.reason === 'already_received' ? 'already_paid'
            : result.reason === 'no_account' ? 'no_account'
            : 'error',
        });
      }
    }

    const today = todayIso();
    const { closed, next } = await closePeriodRecord(fpId, today, today, userId);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/movimientos');
    revalidatePath('/dashboard/cuotas');
    revalidatePath('/dashboard/gastos-fijos');
    revalidatePath('/dashboard/ingresos');
    revalidatePath('/dashboard/historial');

    return {
      ok: true,
      summary: {
        installmentsPaid: installmentsPaid.length,
        installmentsSkipped,
        fixedExpensesPaid: fixedPaid.length,
        fixedExpensesManual: fixedManual,
        fixedExpensesSkipped: fixedSkipped,
        incomeReceived: incomePaid.length,
        incomeManual,
        incomeSkipped,
        closedPeriod: closed,
        nextPeriod: next,
      },
    };
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      error: err instanceof Error ? err.message : 'Error desconocido',
    };
  }
}

export async function previewClosePeriod(): Promise<{
  installmentsPending: number;
  fixedExpensesPending: number;
  fixedExpensesManual: number;
  incomesPending: number;
  incomesManual: number;
  currentPeriod: FinancialPeriod | null;
}> {
  const user = await requireUser();
  const userId = user.id;

  const currentPeriod = await fetchCurrentPeriod(userId);
  if (!currentPeriod) {
    return {
      installmentsPending: 0,
      fixedExpensesPending: 0,
      fixedExpensesManual: 0,
      incomesPending: 0,
      incomesManual: 0,
      currentPeriod: null,
    };
  }

  const fpId = currentPeriod.id;

  const [
    activeInstallments,
    activeRecurring,
    activeIncomes,
    paidInstallmentIds,
    paidRecurringIds,
    receivedIncomeIds,
  ] = await Promise.all([
    fetchActiveInstallments(userId),
    fetchActiveRecurringExpenses(userId),
    fetchActiveRecurringIncomes(userId),
    fetchInstallmentPaidIds(fpId, userId),
    fetchRecurringPaidIds(fpId, userId),
    fetchRecurringIncomeReceivedIds(fpId, userId),
  ]);

  const installmentsPending = activeInstallments.filter(
    (i) => !paidInstallmentIds.has(i.id)
  ).length;

  const unpaidFixed = activeRecurring.filter((e) => !paidRecurringIds.has(e.id));
  const fixedExpensesManual = unpaidFixed.filter(
    (e) => e.is_cash || (!e.account_id && !e.credit_card_id)
  ).length;
  const fixedExpensesPending = unpaidFixed.length - fixedExpensesManual;

  const unreceived = activeIncomes.filter((i) => !receivedIncomeIds.has(i.id));
  const incomesManual = unreceived.filter((i) => !i.account_id).length;
  const incomesPending = unreceived.length - incomesManual;

  return {
    installmentsPending,
    fixedExpensesPending,
    fixedExpensesManual,
    incomesPending,
    incomesManual,
    currentPeriod,
  };
}
