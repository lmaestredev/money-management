import Link from 'next/link';
import type { EffectiveRate } from '@/app/lib/data/exchange-rates';
import styles from './RateInfoCard.module.css';

type Props = {
  effective: EffectiveRate | null;
  gapPercent: number | null;
};

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

export default function RateInfoCard({ effective, gapPercent }: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Tasa de cambio</h2>
          <p className={styles.subtitle}>Para convertir tus gastos en pesos a USD</p>
        </div>
        <Link href="/dashboard/configuracion" className={styles.configLink}>
          Configurar
        </Link>
      </div>

      {effective ? (
        <>
          <div className={styles.rateBlock}>
            <span className={styles.rateValue}>1 USD = {formatPesos(effective.rate)}</span>
            <span className={styles.rateSource}>
              {SOURCE_LABELS[effective.source] ?? effective.source}
            </span>
          </div>
          {gapPercent != null && (
            <div className={styles.gapRow}>
              <span className={styles.gapLabel}>Brecha blue / oficial</span>
              <span className={styles.gapValue}>{gapPercent.toFixed(1)}%</span>
            </div>
          )}
        </>
      ) : (
        <p className={styles.empty}>
          Sin cotización todavía.{' '}
          <Link href="/dashboard/configuracion" className={styles.configLink}>
            Actualizar
          </Link>{' '}
          para convertir los gastos en pesos.
        </p>
      )}
    </section>
  );
}
