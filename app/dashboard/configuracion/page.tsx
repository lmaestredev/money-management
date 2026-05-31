import { getSettings } from '@/app/lib/data/settings';
import { fetchExchangeRates } from '@/app/lib/data/exchange-rates';
import SettingsForm from '@/app/ui/settings/SettingsForm';
import RatesPanel from '@/app/ui/settings/RatesPanel';
import styles from './page.module.css';

type Props = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function ConfiguracionPage({ searchParams }: Props) {
  const { error, saved } = await searchParams;
  const [settings, rates] = await Promise.all([getSettings(), fetchExchangeRates()]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Configuración</h1>
        <p className={styles.pageSubtitle}>
          Presupuestos mensuales y cotización del dólar para tus reportes.
        </p>
      </header>

      {saved && (
        <div className={styles.successBanner} role="status">
          <span aria-hidden>✅</span>
          <span>Configuración guardada.</span>
        </div>
      )}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <span aria-hidden>⛔</span>
          <span>No se pudo guardar. Revisá los valores.</span>
        </div>
      )}

      <RatesPanel rates={rates} />
      <SettingsForm settings={settings} />
    </div>
  );
}
