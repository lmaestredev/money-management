import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import MovementForm from '@/app/ui/movements/MovementForm';
import styles from './page.module.css';

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function NuevoMovimientoPage({ searchParams }: Props) {
  const { period: periodParam } = await searchParams;
  const period =
    periodParam && /^\d{4}-\d{2}$/.test(periodParam)
      ? periodParam
      : getCurrentPeriod();

  const [accounts, cards, categories] = await Promise.all([
    fetchAccounts(),
    fetchActiveCreditCards(),
    fetchCategories(),
  ]);

  return (
    <div>
      <h1 className={styles.title}>
        Nuevo movimiento
      </h1>
      <MovementForm
        period={period}
        accounts={accounts}
        cards={cards}
        categories={categories}
        defaultPaymentDate={getTodayISO()}
      />
    </div>
  );
}
