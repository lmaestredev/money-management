import type { Account, RecurringIncome } from '@/app/lib/definitions';
import { amountsToUsd } from '@/app/lib/utils/currency';
import { formatUsd } from '@/app/lib/utils';
import { receiveRecurringIncomeAction } from '@/app/lib/actions/recurring-incomes';
import DeleteRecurringIncomeButton from '@/app/ui/recurring-incomes/DeleteRecurringIncomeButton';
import ItemActions from '@/app/ui/movements/ItemActions';
import styles from './MonthlyIncomesSection.module.css';

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

type Props = {
  incomes: RecurringIncome[];
  pendingIncomes: RecurringIncome[];
  receivedIds: Set<string>;
  period: string;
  accounts: Account[];
  rate: number | null;
};

export default function MonthlyIncomesSection({
  incomes,
  pendingIncomes,
  receivedIds,
  period,
  accounts,
  rate,
}: Props) {
  if (pendingIncomes.length === 0) return null;

  const pending = pendingIncomes;
  const receivedCount = incomes.filter((i) => receivedIds.has(i.id)).length;
  const pendingCount = incomes.length - receivedCount;
  const totalCount = incomes.length;

  const pendingTotal = pending.reduce(
    (sum, i) => sum + amountsToUsd(i.amount_pesos, i.amount_dollars, rate),
    0
  );

  return (
    <section className={styles.section} aria-labelledby="ingresos-mes">
      <div className={styles.sectionHeader}>
        <h2 id="ingresos-mes" className={styles.sectionTitle}>
          Ingresos del mes
          <span className={styles.countBadge}>
            {pendingCount}/{totalCount} pendiente
          </span>
        </h2>
        <span className={styles.pendingTotal}>Por cobrar: {formatUsd(pendingTotal)}</span>
      </div>

      <div className={styles.list}>
        {pending.map((i) => {
          const hasPresetAccount = !!i.account_id;
          return (
            <div key={i.id} className={styles.row}>
              <div className={styles.icon} aria-hidden>
                💰
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{i.name}</div>
                <div className={styles.meta}>
                  <span>{i.category_name ?? 'Sin categoría'}</span>
                  <span>🏦 {i.account_name ?? 'Se elige al cobrar'}</span>
                </div>
              </div>
              <div className={styles.amounts}>
                <div className={styles.amountPrimary}>
                  +{formatUsd(amountsToUsd(i.amount_pesos, i.amount_dollars, rate))}
                </div>
                {i.amount_pesos > 0 && (
                  <div className={styles.amountSecondary}>{formatPesos(i.amount_pesos)}</div>
                )}
              </div>
              <div className={styles.action}>
                {hasPresetAccount ? (
                  <form action={receiveRecurringIncomeAction}>
                    <input type="hidden" name="recurring_income_id" value={i.id} />
                    <input type="hidden" name="period" value={period} />
                    <button type="submit" className={styles.receiveBtn}>
                      Registrar cobro
                    </button>
                  </form>
                ) : accounts.length === 0 ? (
                  <span
                    className={styles.statusHint}
                    title="Registra una cuenta para poder confirmar el cobro"
                  >
                    Sin cuentas
                  </span>
                ) : (
                  <form action={receiveRecurringIncomeAction} className={styles.receiveForm}>
                    <input type="hidden" name="recurring_income_id" value={i.id} />
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
                    <button type="submit" className={styles.receiveBtn}>
                      Confirmar
                    </button>
                  </form>
                )}
              </div>
              <ItemActions
                editHref={`/dashboard/ingresos/editar/${i.id}?return=/dashboard/movimientos`}
                editLabel={`Editar ${i.name}`}
                deleteSlot={
                  <DeleteRecurringIncomeButton
                    id={i.id}
                    name={i.name}
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
