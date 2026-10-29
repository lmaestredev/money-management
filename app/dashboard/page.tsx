import Link from 'next/link';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchMovementsByFinancialPeriod } from '@/app/lib/data/movements';
import { fetchCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCurrentPeriod } from '@/app/lib/data/financial-periods';
import { computeSummary } from '@/app/lib/summary';
import { getSettings } from '@/app/lib/data/settings';
import { getEffectiveRate, refreshExchangeRatesIfStale } from '@/app/lib/data/exchange-rates';
import { isRateOld, rateAgeLabel } from '@/app/lib/rates-refresh';
import { createClient } from '@/app/lib/supabase/server';
import ExchangeRateBadge from '@/app/ui/dashboard/ExchangeRateBadge';
import DashboardAlert from '@/app/ui/dashboard/DashboardAlert';
import PeriodBadge from '@/app/ui/financial-periods/PeriodBadge';
import MonthOverview from '@/app/ui/dashboard/MonthOverview';
import ExpenseSplit from '@/app/ui/dashboard/ExpenseSplit';
import QuickGlance from '@/app/ui/dashboard/QuickGlance';
import ClosePeriodButton from '@/app/ui/financial-periods/ClosePeriodButton';
import styles from './page.module.css';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const userId = user.id;

  // Fuera del render: se responde con la cotización guardada y se actualiza por detrás
  // (si quedó vieja). Un fallo acá no debe afectar la página, solo se registra.
  after(async () => {
    try {
      await refreshExchangeRatesIfStale();
    } catch (err) {
      console.error('[rates] falló el refresco en segundo plano:', err);
    }
  });

  const currentFinancialPeriod = await fetchCurrentPeriod(userId);
  const currentFinancialPeriodId = currentFinancialPeriod?.id ?? '';

  const [accounts, movements, creditCards, settings, effectiveRate] = await Promise.all([
    fetchAccounts(userId),
    fetchMovementsByFinancialPeriod(currentFinancialPeriodId, userId),
    fetchCreditCards(userId),
    getSettings(userId),
    getEffectiveRate(userId),
  ]);

  const rate = effectiveRate?.rate ?? null;
  const summary = computeSummary(movements, rate);

  const noRate = rate == null;
  // La app conserva la última cotización buena si dolarapi falla: avisamos si quedó vieja.
  const nowMs = Date.now();
  const rateOld = isRateOld(effectiveRate?.fetchedAt ?? null, nowMs);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Inicio</h1>
          <p className={styles.pageSubtitle}>Cómo vas este mes</p>
        </div>
        <div className={styles.headerActions}>
          <ExchangeRateBadge effective={effectiveRate} />
          <PeriodBadge period={currentFinancialPeriod} />
          <ClosePeriodButton />
        </div>
      </header>

      {noRate && (
        <DashboardAlert
          message={
            <>
              <strong>Falta la cotización del dólar:</strong> los montos en pesos no se pueden
              pasar a dólares.{' '}
              <Link href="/dashboard/configuracion" className={styles.alertLink}>
                Actualizala en Configuración
              </Link>
              .
            </>
          }
        />
      )}

      {rateOld && effectiveRate?.fetchedAt && (
        <DashboardAlert
          message={
            <>
              <strong>Cotización vieja:</strong> la última se guardó{' '}
              {rateAgeLabel(effectiveRate.fetchedAt, nowMs)}, así que los montos en dólares pueden
              no coincidir con el dólar de hoy.{' '}
              <Link href="/dashboard/configuracion" className={styles.alertLink}>
                Actualizala en Configuración
              </Link>
              .
            </>
          }
        />
      )}

      <MonthOverview
        incomeUsd={summary.totalIncome}
        expenseUsd={summary.totalExpense}
        budgetUsd={settings.budget_total_usd}
        rate={rate}
        incomeIncomplete={summary.incomplete.income}
        expenseIncomplete={summary.incomplete.expense}
      />

      <ExpenseSplit
        installments={{ usd: summary.installmentsTotal, incomplete: summary.incomplete.installments }}
        fixed={{ usd: summary.fixedExpensesTotal, incomplete: summary.incomplete.fixedExpenses }}
        other={{ usd: summary.variableTotal, incomplete: summary.incomplete.variable }}
        rate={rate}
      />

      <QuickGlance
        accounts={accounts}
        creditCards={creditCards}
        categories={summary.categoryTotals}
        rate={rate}
      />
    </div>
  );
}
