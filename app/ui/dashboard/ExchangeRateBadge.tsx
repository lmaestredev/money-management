import type { EffectiveRate } from '@/app/lib/data/exchange-rates';
import { isRateOld, rateAgeLabel } from '@/app/lib/rates-refresh';
import styles from './ExchangeRateBadge.module.css';

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  effective: EffectiveRate | null;
};

export default function ExchangeRateBadge({ effective }: Props) {
  if (!effective) return null;

  // Edad de la cotización guardada (la tasa manual no tiene).
  const now = Date.now();
  const age = effective.fetchedAt ? rateAgeLabel(effective.fetchedAt, now) : null;
  const old = isRateOld(effective.fetchedAt, now);

  return (
    <div className={styles.badge}>
      <span className={styles.label}>Dólar</span>
      <span className={styles.value}>u$d 1 = ${formatPesos(effective.rate)}</span>
      {age && (
        <span className={old ? `${styles.age} ${styles.ageOld}` : styles.age}>
          {old ? '⚠️ ' : ''}Actualizada {age}
        </span>
      )}
    </div>
  );
}
