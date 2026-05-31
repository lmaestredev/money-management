import Link from 'next/link';
import type { CreditCard } from '@/app/lib/definitions';
import styles from './CreditCardsCard.module.css';

type Props = {
  cards?: CreditCard[];
};

function formatMoney(amount: number, currency: 'peso' | 'dollar'): string {
  if (currency === 'peso') {
    return amount.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CreditCardsCard({ cards = [] }: Props) {
  const withDebt = cards.filter(
    (c) => c.current_balance_pesos !== 0 || c.current_balance_dollars !== 0 || c.active
  );

  const totalPesos = cards.reduce((sum, c) => sum + c.current_balance_pesos, 0);
  const totalDollars = cards.reduce((sum, c) => sum + c.current_balance_dollars, 0);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Gastos por tarjeta</h2>
          <p className={styles.cardSubtitle}>Deuda acumulada del mes</p>
        </div>
        <Link href="/dashboard/tarjetas" className={styles.headerLink}>
          Ver todas
        </Link>
      </div>
      {withDebt.length > 0 ? (
        <>
          <div className={styles.list}>
            {withDebt.map((c) => {
              const cur = c.currency === 'dollar' ? 'dollar' : 'peso';
              const debt = cur === 'dollar' ? c.current_balance_dollars : c.current_balance_pesos;
              const limit = c.credit_limit;
              const pct = limit > 0 ? Math.min(100, (debt / limit) * 100) : 0;
              const over = limit > 0 && debt > limit;
              return (
                <div key={c.id} className={styles.creditCard}>
                  <div className={styles.ccHeader}>
                    <span className={styles.ccName}>{c.name}</span>
                    <span className={styles.ccIcon} aria-hidden>💳</span>
                  </div>
                  <div className={styles.ccAmount}>{formatMoney(debt, cur)}</div>
                  <div className={styles.ccLimit}>
                    {limit > 0 ? `Límite: ${formatMoney(limit, cur)}` : 'Sin límite definido'}
                  </div>
                  {limit > 0 && (
                    <div className={styles.ccProgress}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${pct}%`, background: over ? '#dc2626' : undefined }}
                        />
                      </div>
                      <span className={styles.ccPct}>{Math.round(pct)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className={styles.totalBlock}>
            <div className={styles.totalLabel}>Deuda total en tarjetas</div>
            <div className={styles.totalAmount}>
              {totalPesos !== 0 && formatMoney(totalPesos, 'peso')}
              {totalPesos !== 0 && totalDollars !== 0 && ' · '}
              {totalDollars !== 0 && formatMoney(totalDollars, 'dollar')}
              {totalPesos === 0 && totalDollars === 0 && formatMoney(0, 'peso')}
            </div>
          </div>
        </>
      ) : (
        <p className={styles.placeholder}>
          No hay tarjetas de crédito registradas.{' '}
          <Link href="/dashboard/tarjetas/nueva" className={styles.placeholderLink}>
            Registrar una
          </Link>
        </p>
      )}
    </section>
  );
}
