import styles from './CuentasSummaryCards.module.css';

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type CuentasSummaryCardsProps = {
  totalPesos: number;
  totalDollars: number;
  countPesos: number;
  countDollars: number;
  countTotal: number;
};

export default function CuentasSummaryCards({
  totalPesos,
  totalDollars,
  countPesos,
  countDollars,
  countTotal,
}: CuentasSummaryCardsProps) {
  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardLabel}>Total en cuentas</span>
          <div className={styles.cardIcon}>💰</div>
        </div>
        <div className={styles.cardAmount}>
          {countTotal} {countTotal === 1 ? 'cuenta' : 'cuentas'}
        </div>
        <div className={styles.cardMeta}>cuentas activas</div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardLabel}>En pesos</span>
          <div className={styles.cardIcon}>🏦</div>
        </div>
        <div className={styles.cardAmount}>{formatPesos(totalPesos)}</div>
        <div className={styles.cardMeta}>
          {countPesos} {countPesos === 1 ? 'cuenta' : 'cuentas'}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardLabel}>En dólares / efectivo</span>
          <div className={styles.cardIcon}>💵</div>
        </div>
        <div className={styles.cardAmount}>{formatDollars(totalDollars)}</div>
        <div className={styles.cardMeta}>
          {countDollars} {countDollars === 1 ? 'cuenta' : 'cuentas'}
        </div>
      </div>
    </div>
  );
}
