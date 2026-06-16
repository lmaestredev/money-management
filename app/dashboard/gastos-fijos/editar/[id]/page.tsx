import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import { fetchRecurringExpenseById } from '@/app/lib/data/recurring';
import RecurringExpenseForm from '@/app/ui/recurring/RecurringExpenseForm';
import FormValidationBanner from '@/app/ui/FormValidationBanner';
import styles from '../../nuevo/page.module.css';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string; error?: string }>;
};

export default async function EditarGastoFijoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { return: returnTo, error } = await searchParams;
  const [expense, accounts, cards, categories] = await Promise.all([
    fetchRecurringExpenseById(id),
    fetchAccounts(),
    fetchActiveCreditCards(),
    fetchCategories(),
  ]);

  if (!expense) notFound();

  const backHref = returnTo || '/dashboard/gastos-fijos';

  return (
    <div>
      <Link href={backHref} className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver
      </Link>
      <h1 className={styles.title}>Editar gasto fijo</h1>
      <FormValidationBanner error={error} />
      <RecurringExpenseForm
        accounts={accounts}
        cards={cards}
        categories={categories}
        expense={expense}
        returnTo={returnTo}
      />
    </div>
  );
}
