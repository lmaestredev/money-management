import type { Account, RecurringExpense } from '@/app/lib/definitions';
import { amountsToUsd } from '@/app/lib/utils/currency';
import { recurringExpensePaymentLabel } from '@/app/lib/utils/installment-display';
import { formatUsd } from '@/app/lib/utils';
import { payRecurringExpenseAction } from '@/app/lib/actions/recurring';
import DeleteRecurringButton from '@/app/ui/recurring/DeleteRecurringButton';
import ItemActions from '@/app/ui/movements/ItemActions';
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
  pendingExpenses: RecurringExpense[];
  paidIds: Set<string>;
  period: string;
  accounts: Account[];
  rate: number | null;
};

export default function MonthlyFixedExpensesSection({
  expenses,
  pendingExpenses,
  paidIds,
  period,
  accounts,
  rate,
}: Props) {
  if (pendingExpenses.length === 0) return null;

  const pending = pendingExpenses;
  const doneCount = expenses.filter((e) => paidIds.has(e.id)).length;
  const totalCount = expenses.length;

  const pendingTotal = pending.reduce(
    (sum, e) => sum + amountsToUsd(e.amount_pesos, e.amount_dollars, rate),
    0
  );

  return (
    <section className={styles.section} aria-labelledby="gastos-fijos-mes">
      <div className={styles.sectionHeader}>
        <h2 id="gastos-fijos-mes" className={styles.sectionTitle}>
          Gastos fijos del mes
          <span className={styles.countBadge}>
            {doneCount}/{totalCount} pendiente
          </span>
        </h2>
        <span className={styles.pendingTotal}>Pendiente: {formatUsd(pendingTotal)}</span>
      </div>

      <div className={styles.list}>
        {pending.map((e) => {
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
                  <span>🏦 {recurringExpensePaymentLabel(e)}</span>
                </div>
              </div>
              <div className={styles.amounts}>
                <div className={styles.amountPrimary}>
                  −{formatUsd(amountsToUsd(e.amount_pesos, e.amount_dollars, rate))}
                </div>
                <div className={styles.amountSecondary}>{formatPesos(e.amount_pesos)}</div>
              </div>
              <div className={styles.action}>
                {hasPresetAccount ? (
                  <form action={payRecurringExpenseAction}>
                    <input type="hidden" name="recurring_expense_id" value={e.id} />
                    <input type="hidden" name="period" value={period} />
                    <button type="submit" className={styles.payBtn}>
                      Registrar pago
                    </button>
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
                    <button type="submit" className={styles.payBtn}>
                      Confirmar
                    </button>
                  </form>
                )}
              </div>
              <ItemActions
                editHref={`/dashboard/gastos-fijos/editar/${e.id}?return=/dashboard/movimientos`}
                editLabel={`Editar ${e.name}`}
                deleteSlot={
                  <DeleteRecurringButton
                    id={e.id}
                    name={e.name}
                    redirectTo="/dashboard/movimientos"
                  />
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
