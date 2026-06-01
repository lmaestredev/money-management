'use server';

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
import type { FinancialPeriod } from '@/app/lib/definitions';

export type SkippedItem = {
  id: string;
  name: string;
  reason: 'already_paid' | 'no_account' | 'completed' | 'error';
};

export type ManualItem = {
  id: string;
  name: string;
  /** Por qué requiere acción manual. */
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

/** Hoy en YYYY-MM-DD (sin conversión TZ). */
function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Periodo YYYY-MM de hoy (para el campo `period` de los movimientos). */
function todayPeriod(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}`;
}

/**
 * Cierra el período financiero activo:
 * 1. Auto-registra cuotas, gastos fijos e ingresos pendientes.
 * 2. Sella el período (end_date = hoy) y abre el siguiente (start_date = hoy).
 *
 * Los ítems en efectivo (is_cash) o sin cuenta/tarjeta asignada se reportan
 * como "manuales" — no se bloquea el cierre por ellos.
 */
export async function closePeriodAction(): Promise<ClosePeriodResult> {
  const currentPeriod = await fetchCurrentPeriod();
  if (!currentPeriod) {
    return { ok: false, reason: 'no_open_period' };
  }

  const fpId = currentPeriod.id;
  const period = todayPeriod(); // YYYY-MM para el campo legacy de movements

  try {
    // ── Fetch en paralelo ──────────────────────────────────────────────────
    const [
      activeInstallments,
      activeRecurring,
      activeIncomes,
      paidInstallmentIds,
      paidRecurringIds,
      receivedIncomeIds,
    ] = await Promise.all([
      fetchActiveInstallments(),
      fetchActiveRecurringExpenses(),
      fetchActiveRecurringIncomes(),
      fetchInstallmentPaidIds(fpId),
      fetchRecurringPaidIds(fpId),
      fetchRecurringIncomeReceivedIds(fpId),
    ]);

    // ── Cuotas ────────────────────────────────────────────────────────────
    const installmentsPaid: number[] = [];
    const installmentsSkipped: SkippedItem[] = [];

    for (const inst of activeInstallments) {
      if (paidInstallmentIds.has(inst.id)) {
        installmentsSkipped.push({ id: inst.id, name: inst.name, reason: 'already_paid' });
        continue;
      }
      const result = await payInstallment(inst.id, period, fpId);
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

    // ── Gastos fijos recurrentes ───────────────────────────────────────────
    const fixedPaid: number[] = [];
    const fixedManual: ManualItem[] = [];
    const fixedSkipped: SkippedItem[] = [];

    for (const exp of activeRecurring) {
      if (paidRecurringIds.has(exp.id)) {
        fixedSkipped.push({ id: exp.id, name: exp.name, reason: 'already_paid' });
        continue;
      }
      // Efectivo sin cuenta: requiere acción manual al pagar.
      if (exp.is_cash) {
        fixedManual.push({
          id: exp.id,
          name: exp.name,
          hint: 'Se paga en efectivo — elegí la cuenta al confirmar el pago.',
        });
        continue;
      }
      // Sin cuenta ni tarjeta asignada.
      if (!exp.account_id && !exp.credit_card_id) {
        fixedManual.push({
          id: exp.id,
          name: exp.name,
          hint: 'No tiene cuenta ni tarjeta asignada.',
        });
        continue;
      }
      const result = await payRecurringExpense(exp.id, period, fpId);
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

    // ── Ingresos recurrentes ───────────────────────────────────────────────
    const incomePaid: number[] = [];
    const incomeManual: ManualItem[] = [];
    const incomeSkipped: SkippedItem[] = [];

    for (const inc of activeIncomes) {
      if (receivedIncomeIds.has(inc.id)) {
        incomeSkipped.push({ id: inc.id, name: inc.name, reason: 'already_paid' });
        continue;
      }
      // Sin cuenta asignada: requiere acción manual al cobrar.
      if (!inc.account_id) {
        incomeManual.push({
          id: inc.id,
          name: inc.name,
          hint: 'No tiene cuenta asignada — elegí la cuenta al confirmar el cobro.',
        });
        continue;
      }
      const result = await receiveRecurringIncome(inc.id, period, fpId);
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

    // ── Cierre del período y apertura del siguiente ────────────────────────
    const today = todayIso();
    const { closed, next } = await closePeriodRecord(fpId, today, today);

    // Revalida todas las rutas afectadas.
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

/**
 * Devuelve un preview de lo que se procesaría al cerrar el período activo,
 * sin ejecutar ningún cambio. Útil para poblar el modal de confirmación.
 */
export async function previewClosePeriod(): Promise<{
  installmentsPending: number;
  fixedExpensesPending: number;
  fixedExpensesManual: number;
  incomesPending: number;
  incomesManual: number;
  currentPeriod: FinancialPeriod | null;
}> {
  const currentPeriod = await fetchCurrentPeriod();
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
    fetchActiveInstallments(),
    fetchActiveRecurringExpenses(),
    fetchActiveRecurringIncomes(),
    fetchInstallmentPaidIds(fpId),
    fetchRecurringPaidIds(fpId),
    fetchRecurringIncomeReceivedIds(fpId),
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
