import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchMovementsByPeriod } from '@/app/lib/data/movements';
import { CardGrid, type CardData } from '@/app/ui/dashboard/cards';
import styles from './page.module.css';

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

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

export default async function DashboardPage() {
  const period = getCurrentPeriod();
  const [accounts, movements] = await Promise.all([
    fetchAccounts(),
    fetchMovementsByPeriod(period),
  ]);

  let totalIncomePesos = 0;
  let totalIncomeDollars = 0;
  let totalExpensePesos = 0;
  let totalExpenseDollars = 0;

  for (const m of movements) {
    if (m.record_type === 'income') {
      totalIncomePesos += m.amount_pesos;
      totalIncomeDollars += m.amount_dollars;
    } else if (
      (m.record_type === 'variable_payment' || m.record_type === 'fixed_payment') &&
      m.status === true
    ) {
      totalExpensePesos += m.amount_pesos;
      totalExpenseDollars += m.amount_dollars;
    }
  }

  const cards: CardData[] = [
    ...accounts.map((a) => ({
      type: 'account' as const,
      title: a.name,
      valuePesos: a.balance_pesos,
      valueDollars: a.balance_dollars,
    })),
    {
      type: 'income' as const,
      title: 'Total ingresos del periodo',
      value: `${formatPesos(totalIncomePesos)} / ${formatDollars(totalIncomeDollars)}`,
    },
    {
      type: 'expense' as const,
      title: 'Total gastos del periodo',
      value: `${formatPesos(totalExpensePesos)} / ${formatDollars(totalExpenseDollars)}`,
    },
  ];

  const periodLabel = formatPeriodLabel(period);
  const capitalizedPeriod =
    periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);

  return (
    <div>
      <h1 className={styles.title}>Resumen</h1>
      <p className={styles.period}>{capitalizedPeriod}</p>
      <section>
        <h2 className={styles.sectionTitle}>Saldos y totales</h2>
        <CardGrid cards={cards} />
      </section>
    </div>
  );
}
