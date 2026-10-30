import type { Account, RecurringExpense } from '@/app/lib/definitions';
import { formatUsd } from '@/app/lib/utils';
import { payRecurringExpenseAction } from '@/app/lib/actions/recurring';
import PayRecurringButton from './PayRecurringButton';
import styles from './MonthlyFixedExpensesSection.module.css';

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

type Props = {
  expenses: RecurringExpense[];
  paidIds: Set<string>;
  period: string;
  accounts: Account[];
};

export default function MonthlyFixedExpensesSection({
  expenses,
  paidIds,
  period,
  accounts,
}: Props) {
  if (expenses.length === 0) return null;

  const pendingExpenses = expenses.filter((e) => !paidIds.has(e.id));
  const pendingTotalPesos = pendingExpenses.reduce((sum, e) => sum + e.amount_pesos, 0);
  const pendingTotalDollars = pendingExpenses.reduce((sum, e) => sum + e.amount_dollars, 0);
  const paidCount = expenses.filter((e) => paidIds.has(e.id)).length;

  return (
    <section className={styles.section} aria-labelledby="gastos-fijos-mes">
      <div className={styles.sectionHeader}>
        <h2 id="gastos-fijos-mes" className={styles.sectionTitle}>
          Gastos fijos del mes
          <span className={styles.countBadge}>
            {paidCount}/{expenses.length} pagados
          </span>
        </h2>
        <span className={styles.pendingTotal}>
          Pendiente: {formatPesos(pendingTotalPesos)}
          {pendingTotalDollars > 0 && ` (${formatUsd(pendingTotalDollars)})`}
        </span>
      </div>

      <div className={styles.list}>
        {expenses.map((e) => {
          const isPaid = paidIds.has(e.id);
          const hasPresetAccount = !!e.account_id;
          return (
            <div key={e.id} className={styles.row}>
              <div className={styles.icon} aria-hidden>
                {e.is_cash ? '💵' : '🔒'}
              </div>
              <div className={styles.info}>
                <div className={styles.name}>
                  {e.name}
                  {e.is_cash && <span className={styles.cashBadge}>Efectivo</span>}
                </div>
                <div className={styles.meta}>
                  <span>{e.category_name ?? 'Sin categoría'}</span>
                  <span>🏦 {e.account_name ?? (e.is_cash ? 'Se elige al pagar' : 'Sin cuenta')}</span>
                </div>
              </div>
              <div className={styles.amounts}>
                <div className={styles.amountPrimary}>−{formatPesos(e.amount_pesos)}</div>
                {e.amount_dollars > 0 && (
                  <div className={styles.amountSecondary}>{formatUsd(e.amount_dollars)}</div>
                )}
              </div>
              <div className={styles.action}>
                {isPaid ? (
                  <span className={styles.statusPaid}>
                    <span className={styles.statusDot} />
                    Pagado
                  </span>
                ) : hasPresetAccount ? (
                  <form action={payRecurringExpenseAction}>
                    <input type="hidden" name="recurring_expense_id" value={e.id} />
                    <input type="hidden" name="period" value={period} />
                    <PayRecurringButton />
                  </form>
                ) : accounts.length === 0 ? (
                  <span
                    className={styles.statusHint}
                    title="Registra una cuenta para poder confirmar el pago"
                  >
                    Sin cuentas
                  </span>
                ) : (
                  <form action={payRecurringExpenseAction} className={styles.payForm}>
                    <input type="hidden" name="recurring_expense_id" value={e.id} />
                    <input type="hidden" name="period" value={period} />
                    <select name="account_id" className={styles.accountSelect} required defaultValue="">
                      <option value="" disabled>
                        Cuenta…
                      </option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <PayRecurringButton label="Confirmar" />
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
