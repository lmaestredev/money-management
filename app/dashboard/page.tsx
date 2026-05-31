import type { Movement } from '@/app/lib/definitions';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchMovementsByPeriod } from '@/app/lib/data/movements';
import { fetchInstallments } from '@/app/lib/data/installments';
import { fetchRecurringExpenses } from '@/app/lib/data/recurring';
import { fetchRecurringIncomes } from '@/app/lib/data/recurring-incomes';
import { fetchCreditCards, fetchStatementPaymentIds } from '@/app/lib/data/credit-cards';
import SummaryCards from '@/app/ui/movements/SummaryCards';
import MovementPeriodSelector from '@/app/ui/movements/MovementPeriodSelector';
import DashboardAlert from '@/app/ui/dashboard/DashboardAlert';
import ExpenseBreakdownCard from '@/app/ui/dashboard/ExpenseBreakdownCard';
import BudgetCard from '@/app/ui/dashboard/BudgetCard';
import DashboardAccountList from '@/app/ui/dashboard/DashboardAccountList';
import InstallmentsCard from '@/app/ui/installments/InstallmentsCard';
import RecurringExpensesCard from '@/app/ui/recurring/RecurringExpensesCard';
import RecurringIncomesCard from '@/app/ui/recurring-incomes/RecurringIncomesCard';
import CategoryBreakdownCard from '@/app/ui/dashboard/CategoryBreakdownCard';
import type { CategoryTotal } from '@/app/ui/dashboard/CategoryBreakdownCard';
import CreditCardsCard from '@/app/ui/dashboard/CreditCardsCard';
import styles from './page.module.css';

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatPeriodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function computeSummary(movements: Movement[], statementPaymentIds: Set<string>) {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let fixedTotal = 0;
  let variableTotal = 0;
  const categoryMap = new Map<string, number>();

  for (const m of movements) {
    if (m.record_type === 'income') {
      totalIncome += m.amount_dollars;
      incomeCount += 1;
    } else if (
      m.record_type === 'variable_payment' ||
      m.record_type === 'fixed_payment'
    ) {
      // El pago de un resumen de tarjeta es una liquidación de deuda, no un gasto
      // nuevo: se excluye del total para no duplicar los cargos del mes.
      if (statementPaymentIds.has(m.id)) {
        continue;
      }
      // Un cargo con tarjeta cuenta como gasto del mes aunque quede "pendiente"
      // (el gasto ya se hizo); un gasto contra cuenta cuenta cuando está pagado.
      const counts = m.credit_card_id ? true : m.status === true;
      if (counts) {
        totalExpense += m.amount_dollars;
        if (m.record_type === 'fixed_payment') fixedTotal += m.amount_dollars;
        else variableTotal += m.amount_dollars;
        const cat = m.category_name?.trim() || 'Sin categoría';
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + m.amount_dollars);
      }
      expenseCount += 1;
    }
  }

  const balance = totalIncome - totalExpense;
  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    balance,
    totalIncome,
    totalExpense,
    incomeCount,
    expenseCount,
    fixedTotal,
    variableTotal,
    categoryTotals,
  };
}

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const { period: periodParam } = await searchParams;
  const period =
    periodParam && /^\d{4}-\d{2}$/.test(periodParam)
      ? periodParam
      : getCurrentPeriod();

  const [
    accounts,
    movements,
    installments,
    recurringExpenses,
    recurringIncomes,
    creditCards,
    statementPaymentIds,
  ] = await Promise.all([
    fetchAccounts(),
    fetchMovementsByPeriod(period),
    fetchInstallments(),
    fetchRecurringExpenses(),
    fetchRecurringIncomes(),
    fetchCreditCards(),
    fetchStatementPaymentIds(),
  ]);

  const summary = computeSummary(movements, statementPaymentIds);
  const periodLabel = formatPeriodLabel(period);
  const capitalizedPeriod = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);

  const budgetTotal = 500;
  const budgetSpent = summary.variableTotal;
  const budgetAvailable = Math.max(0, budgetTotal - budgetSpent);
  const budgetPercentUsed = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;
  const showBudgetWarning = budgetPercentUsed >= 80;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Resumen de tu situación financiera</p>
        </div>
        <div className={styles.headerActions}>
          <MovementPeriodSelector currentPeriod={period} basePath="/dashboard" />
        </div>
      </header>

      {showBudgetWarning && (
        <DashboardAlert
          message={
            <>
              <strong>Presupuesto de gastos variables casi agotado:</strong> Has gastado $
              {budgetSpent.toFixed(2)} de ${budgetTotal} disponibles este mes.
            </>
          }
        />
      )}

      <SummaryCards
        balance={summary.balance}
        totalIncome={summary.totalIncome}
        totalExpense={summary.totalExpense}
        incomeCount={summary.incomeCount}
        expenseCount={summary.expenseCount}
        balanceLabel="Balance neto"
        balanceMeta={<span className={styles.balanceMetaTag}>Ingresos − Egresos</span>}
      />

      <div className={styles.grid2}>
        <ExpenseBreakdownCard
          periodLabel={capitalizedPeriod}
          fixedTotal={summary.fixedTotal}
          variableTotal={summary.variableTotal}
        />
        <BudgetCard
          available={budgetAvailable}
          total={budgetTotal}
          spent={budgetSpent}
          percentUsed={budgetPercentUsed}
          showWarning={showBudgetWarning}
        />
      </div>

      <div className={styles.grid2}>
        <DashboardAccountList accounts={accounts} />
        <InstallmentsCard installments={installments} />
      </div>

      <div className={styles.grid2}>
        <CreditCardsCard cards={creditCards} />
        <CategoryBreakdownCard items={summary.categoryTotals} />
      </div>

      <div className={styles.grid2}>
        <RecurringIncomesCard incomes={recurringIncomes} />
        <RecurringExpensesCard expenses={recurringExpenses} />
      </div>
    </div>
  );
}
