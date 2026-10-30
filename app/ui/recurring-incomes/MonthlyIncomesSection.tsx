import type { Account, RecurringIncome } from '@/app/lib/definitions';
import { formatUsd } from '@/app/lib/utils';
import { receiveRecurringIncomeAction } from '@/app/lib/actions/recurring-incomes';
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
  receivedIds: Set<string>;
  period: string;
  accounts: Account[];
};

export default function MonthlyIncomesSection({ incomes, receivedIds, period, accounts }: Props) {
  if (incomes.length === 0) return null;

  const pendingTotal = incomes
    .filter((i) => !receivedIds.has(i.id))
    .reduce((sum, i) => sum + i.amount_dollars, 0);
  const receivedCount = incomes.filter((i) => receivedIds.has(i.id)).length;

  return (
    <section className={styles.section} aria-labelledby="ingresos-mes">
      <div className={styles.sectionHeader}>
        <h2 id="ingresos-mes" className={styles.sectionTitle}>
          Ingresos del mes
          <span className={styles.countBadge}>
            {receivedCount}/{incomes.length} cobrados
          </span>
        </h2>
        <span className={styles.pendingTotal}>Por cobrar: {formatUsd(pendingTotal)}</span>
      </div>

      <div className={styles.list}>
        {incomes.map((i) => {
          const isReceived = receivedIds.has(i.id);
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
                <div className={styles.amountPrimary}>+{formatUsd(i.amount_dollars)}</div>
                <div className={styles.amountSecondary}>{formatPesos(i.amount_pesos)}</div>
              </div>
              <div className={styles.action}>
                {isReceived ? (
                  <span className={styles.statusReceived}>
                    <span className={styles.statusDot} />
                    Cobrado
                  </span>
                ) : hasPresetAccount ? (
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
