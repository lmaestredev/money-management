import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { refreshRatesAction } from '@/app/lib/actions/settings';
import type { ExchangeRate } from '@/app/lib/definitions';
import styles from './RatesPanel.module.css';

type Props = {
  rates: ExchangeRate[];
};

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const LABELS: Record<string, string> = { blue: 'Blue', oficial: 'Oficial' };

export default function RatesPanel({ rates }: Props) {
  const blue = rates.find((r) => r.source === 'blue') ?? null;
  const oficial = rates.find((r) => r.source === 'oficial') ?? null;

  // Brecha = (blue − oficial) / oficial, sobre el valor de venta.
  const gap =
    blue && oficial && oficial.venta > 0
      ? ((blue.venta - oficial.venta) / oficial.venta) * 100
      : null;

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Cotización actual</h2>
          <p className={styles.subtitle}>Fuente: dolarapi.com</p>
        </div>
        <form action={refreshRatesAction}>
          <button type="submit" className={styles.refreshBtn}>
            <ArrowPathIcon className={styles.refreshIcon} aria-hidden />
            Actualizar ahora
          </button>
        </form>
      </div>

      {rates.length === 0 ? (
        <p className={styles.empty}>
          Todavía no hay cotizaciones. Tocá “Actualizar ahora” para traerlas.
        </p>
      ) : (
        <>
          <div className={styles.grid}>
            {[blue, oficial].filter((r): r is ExchangeRate => r != null).map((r) => (
              <div key={r.source} className={styles.rateCard}>
                <div className={styles.rateName}>{LABELS[r.source] ?? r.source}</div>
                <div className={styles.rateValues}>
                  <div className={styles.rateValueBlock}>
                    <span className={styles.rateValueLabel}>Compra</span>
                    <span className={styles.rateValue}>{formatPesos(r.compra)}</span>
                  </div>
                  <div className={styles.rateValueBlock}>
                    <span className={styles.rateValueLabel}>Venta</span>
                    <span className={styles.rateValue}>{formatPesos(r.venta)}</span>
                  </div>
                </div>
                <div className={styles.rateUpdated}>
                  Actualizado: {formatDateTime(r.source_updated_at ?? r.updated_at)}
                </div>
              </div>
            ))}
          </div>
          {gap != null && (
            <div className={styles.gapBlock}>
              <span className={styles.gapLabel}>Brecha blue / oficial</span>
              <span className={styles.gapValue}>{gap.toFixed(1)}%</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
