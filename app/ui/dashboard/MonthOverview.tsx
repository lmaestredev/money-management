import MoneyFigure from './MoneyFigure';
import { formatUsd } from '@/app/lib/utils';
import styles from './MonthOverview.module.css';

type Props = {
  incomeUsd: number;
  expenseUsd: number;
  /** Presupuesto total mensual en USD (Configuración). */
  budgetUsd: number;
  rate: number | null;
  incomeIncomplete: boolean;
  expenseIncomplete: boolean;
};

/** Lo primero que se ve: cuánto cobraste, cuánto gastaste y cuánto te queda del presupuesto. */
export default function MonthOverview({
  incomeUsd,
  expenseUsd,
  budgetUsd,
  rate,
  incomeIncomplete,
  expenseIncomplete,
}: Props) {
  const hasBudget = budgetUsd > 0;
  const remaining = budgetUsd - expenseUsd;
  const over = remaining < 0;
  const pct = hasBudget ? (expenseUsd / budgetUsd) * 100 : 0;
  const warning = pct >= 80;

  return (
    <section className={styles.overview}>
      <div className={styles.remaining}>
        <span className={styles.label}>{over ? 'Te pasaste del presupuesto' : 'Te quedan este mes'}</span>
        {!hasBudget ? (
          <p className={styles.hint}>
            Todavía no definiste un presupuesto mensual. Cargalo en Configuración para ver cuánto te
            queda.
          </p>
        ) : (
          <>
            <MoneyFigure
              usd={over ? -remaining : remaining}
              rate={rate}
              incomplete={expenseIncomplete}
              size="lg"
              tone={over ? 'expense' : 'default'}
            />
            {!expenseIncomplete && (
              <>
                <div
                  className={styles.track}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(pct))}
                  aria-label="Presupuesto usado"
                >
                  <div
                    className={`${styles.fill} ${warning ? styles.fillWarning : ''}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className={styles.caption}>
                  Usaste el {Math.round(pct)}% de tu presupuesto de {formatUsd(budgetUsd)}
                </p>
              </>
            )}
          </>
        )}
      </div>

      <div className={styles.tiles}>
        <div className={styles.tile}>
          <span className={styles.label}>Cobraste</span>
          <MoneyFigure usd={incomeUsd} rate={rate} incomplete={incomeIncomplete} tone="income" />
        </div>
        <div className={styles.tile}>
          <span className={styles.label}>Gastaste</span>
          <MoneyFigure usd={expenseUsd} rate={rate} incomplete={expenseIncomplete} tone="expense" />
        </div>
      </div>
    </section>
  );
}
