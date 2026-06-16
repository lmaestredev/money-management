import type {
  InstallmentPurchase,
  Movement,
  RecurringExpense,
  RecurringIncome,
} from '@/app/lib/definitions';
import { getMovementStatus } from '@/app/lib/utils/movement-status';
import { movementPaymentLabel, recurringExpensePaymentLabel, installmentPaymentLabel } from '@/app/lib/utils/installment-display';

export type TypeFilter = 'all' | 'income' | 'expense';
export type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue';

const INCOME_TERMS = ['ingreso', 'ingresos'];
const EXPENSE_TERMS = ['egreso', 'egresos', 'gasto', 'gastos', 'gasto fijo', 'gastos fijos'];
const INSTALLMENT_TERMS = ['cuota', 'cuotas'];

function matchesTypeQuery(q: string, terms: string[]): boolean {
  return terms.some((t) => t.includes(q) || q.includes(t));
}

function matchesTextQuery(
  q: string,
  fields: (string | null | undefined)[],
  typeTerms: string[] = []
): boolean {
  if (!q) return true;
  if (matchesTypeQuery(q, typeTerms)) return true;
  return fields.some((f) => (f ?? '').toLowerCase().includes(q));
}

function passesTypeFilter(typeFilter: TypeFilter, kind: 'income' | 'expense' | 'installment'): boolean {
  if (typeFilter === 'all') return true;
  if (typeFilter === 'income') return kind === 'income';
  return kind === 'expense' || kind === 'installment';
}

function passesStatusFilter<T extends RecurringIncome | RecurringExpense | InstallmentPurchase>(
  statusFilter: StatusFilter,
  item: T,
  isOverdue: (item: T) => boolean
): boolean {
  if (statusFilter === 'all' || statusFilter === 'pending') return true;
  if (statusFilter === 'paid') return false;
  if (statusFilter === 'overdue') return isOverdue(item);
  return true;
}

function isIncomeOverdue(income: RecurringIncome): boolean {
  if (!income.receive_day) return false;
  return new Date().getDate() > income.receive_day;
}

function isExpenseOverdue(expense: RecurringExpense): boolean {
  if (!expense.pay_before_day) return false;
  return new Date().getDate() > expense.pay_before_day;
}

function isInstallmentOverdue(installment: InstallmentPurchase): boolean {
  if (!installment.pay_before_day) return false;
  return new Date().getDate() > installment.pay_before_day;
}

export function filterRecurringIncomes(
  incomes: RecurringIncome[],
  searchQuery: string,
  typeFilter: TypeFilter,
  statusFilter: StatusFilter
): RecurringIncome[] {
  const q = searchQuery.trim().toLowerCase();
  if (!passesTypeFilter(typeFilter, 'income')) return [];

  return incomes.filter((income) => {
    if (
      !passesStatusFilter(statusFilter, income, isIncomeOverdue)
    ) {
      return false;
    }
    return matchesTextQuery(
      q,
      [income.name, income.category_name, income.account_name],
      INCOME_TERMS
    );
  });
}

export function filterRecurringExpenses(
  expenses: RecurringExpense[],
  searchQuery: string,
  typeFilter: TypeFilter,
  statusFilter: StatusFilter
): RecurringExpense[] {
  const q = searchQuery.trim().toLowerCase();
  if (!passesTypeFilter(typeFilter, 'expense')) return [];

  return expenses.filter((expense) => {
    if (!passesStatusFilter(statusFilter, expense, isExpenseOverdue)) {
      return false;
    }
    return matchesTextQuery(
      q,
      [expense.name, expense.category_name, expense.account_name, expense.credit_card_name, recurringExpensePaymentLabel(expense)],
      [...EXPENSE_TERMS, ...(expense.is_cash ? ['efectivo', 'cash'] : [])]
    );
  });
}

export function filterInstallments(
  installments: InstallmentPurchase[],
  searchQuery: string,
  typeFilter: TypeFilter,
  statusFilter: StatusFilter
): InstallmentPurchase[] {
  const q = searchQuery.trim().toLowerCase();
  if (!passesTypeFilter(typeFilter, 'installment')) return [];

  return installments.filter((installment) => {
    if (!passesStatusFilter(statusFilter, installment, isInstallmentOverdue)) {
      return false;
    }
    return matchesTextQuery(
      q,
      [
        installment.name,
        installment.account_name,
        installment.credit_card_name,
        installment.category_name,
        installmentPaymentLabel(installment),
      ],
      [...EXPENSE_TERMS, ...INSTALLMENT_TERMS]
    );
  });
}

export function filterMovements(
  movements: Movement[],
  accountNames: Record<string, string>,
  cardNames: Record<string, string>,
  searchQuery: string,
  typeFilter: TypeFilter,
  statusFilter: StatusFilter
): Movement[] {
  const q = searchQuery.trim().toLowerCase();
  let list = movements;

  if (typeFilter === 'income') {
    list = list.filter((m) => m.record_type === 'income');
  } else if (typeFilter === 'expense') {
    list = list.filter(
      (m) => m.record_type === 'variable_payment' || m.record_type === 'fixed_payment'
    );
  }

  if (statusFilter !== 'all') {
    list = list.filter((m) => getMovementStatus(m) === statusFilter);
  }

  if (q) {
    list = list.filter((m) => {
      const desc = (m.description ?? '').toLowerCase();
      const cat = (m.category_name ?? '').toLowerCase();
      const account = movementPaymentLabel(m, cardNames, accountNames, '').toLowerCase();
      const typeLabels: Record<string, string> = {
        income: 'ingreso',
        variable_payment: 'egreso',
        fixed_payment: 'gasto fijo',
        conversion: 'conversión',
      };
      const typeLabel = typeLabels[m.record_type] ?? m.record_type;
      const typeTerms =
        m.record_type === 'income'
          ? INCOME_TERMS
          : m.record_type === 'fixed_payment'
            ? [...EXPENSE_TERMS]
            : m.record_type === 'variable_payment'
              ? ['egreso', 'egresos', 'gasto', 'gastos']
              : [];
      return (
        matchesTextQuery(q, [desc, cat, account, typeLabel], typeTerms)
      );
    });
  }

  return list;
}

export type PageItemCounts = {
  movements: number;
  pendingIncomes: number;
  pendingExpenses: number;
  activeCards?: number;
};

export function countPageItems({
  movements,
  pendingIncomes,
  pendingExpenses,
  activeCards = 0,
}: PageItemCounts): number {
  return movements + pendingIncomes + pendingExpenses + activeCards;
}
