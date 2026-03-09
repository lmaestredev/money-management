import styles from './CreditCardsCard.module.css';

type Props = {
  totalDebt?: number;
  items?: Array<{ name: string; amount: number; limit: number }>;
};

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CreditCardsCard({ totalDebt = 0, items = [] }: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Gastos por tarjeta</h2>
          <p className={styles.cardSubtitle}>Deuda acumulada en el mes</p>
        </div>
      </div>
      {items.length > 0 ? (
        <>
          <div className={styles.list}>
            {items.map((item, i) => {
              const pct = item.limit > 0 ? Math.min(100, (item.amount / item.limit) * 100) : 0;
              return (
                <div key={i} className={styles.creditCard}>
                  <div className={styles.ccHeader}>
                    <span className={styles.ccName}>{item.name}</span>
                    <span className={styles.ccIcon} aria-hidden>💳</span>
                  </div>
                  <div className={styles.ccAmount}>{formatDollars(item.amount)}</div>
                  <div className={styles.ccLimit}>Límite: {formatDollars(item.limit)}</div>
                  <div className={styles.ccProgress}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={styles.ccPct}>{Math.round(pct)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.totalBlock}>
            <div className={styles.totalLabel}>Total deuda en tarjetas</div>
            <div className={styles.totalAmount}>{formatDollars(totalDebt)}</div>
          </div>
        </>
      ) : (
        <p className={styles.placeholder}>
          No hay tarjetas de crédito registradas.
        </p>
      )}
    </section>
  );
}
