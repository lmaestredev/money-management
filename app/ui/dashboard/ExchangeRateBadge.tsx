import type { EffectiveRate } from '@/app/lib/data/exchange-rates';
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

  return (
    <div className={styles.badge}>
      <span className={styles.label}>Dólar</span>
      <span className={styles.value}>u$d 1 = ${formatPesos(effective.rate)}</span>
    </div>
  );
}
