import { redirect } from 'next/navigation';
import { getSettings } from '@/app/lib/data/settings';
import { fetchExchangeRates } from '@/app/lib/data/exchange-rates';
import { createClient } from '@/app/lib/supabase/server';
import SettingsForm from '@/app/ui/settings/SettingsForm';
import RatesPanel from '@/app/ui/settings/RatesPanel';
import styles from './page.module.css';

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [settings, rates] = await Promise.all([getSettings(user.id), fetchExchangeRates()]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Configuración</h1>
        <p className={styles.pageSubtitle}>
          Presupuestos mensuales y cotización del dólar para tus reportes.
        </p>
      </header>

      <RatesPanel rates={rates} />
      <SettingsForm settings={settings} />
    </div>
  );
}
