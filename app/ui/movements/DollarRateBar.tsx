import { ArrowPathIcon } from '@heroicons/react/24/outline';
import type { EffectiveRate } from '@/app/lib/data/exchange-rates';
import { refreshRatesAction } from '@/app/lib/actions/settings';
import styles from './DollarRateBar.module.css';

const SOURCE_LABELS: Record<string, string> = {
  blue: 'Blue',
  oficial: 'Oficial',
  manual: 'Manual',
};

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  effective: EffectiveRate | null;
};

export default function DollarRateBar({ effective }: Props) {
  return (
    <div className={styles.bar}>
      <div className={styles.info}>
        <span className={styles.label}>Dólar</span>
        {effective ? (
          <>
            <span className={styles.rate}>1 USD = {formatPesos(effective.rate)}</span>
            <span className={styles.source}>
              ({SOURCE_LABELS[effective.source] ?? effective.source})
            </span>
          </>
        ) : (
          <span className={styles.missing}>Sin cotización — actualizá para convertir pesos</span>
        )}
      </div>
      <form action={refreshRatesAction}>
        <button type="submit" className={styles.refreshBtn}>
          <ArrowPathIcon className={styles.refreshIcon} aria-hidden />
          Actualizar
        </button>
      </form>
    </div>
  );
}
