import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import { fetchInstallmentById } from '@/app/lib/data/installments';
import InstallmentForm from '@/app/ui/installments/InstallmentForm';
import styles from '../../nueva/page.module.css';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
};

export default async function EditarCuotaPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { return: returnTo } = await searchParams;
  const [installment, accounts, cards, categories] = await Promise.all([
    fetchInstallmentById(id),
    fetchAccounts(),
    fetchActiveCreditCards(),
    fetchCategories(),
  ]);

  if (!installment) notFound();

  const backHref = returnTo || '/dashboard/cuotas';

  return (
    <div>
      <Link href={backHref} className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver
      </Link>
      <h1 className={styles.title}>Editar compra en cuotas</h1>
      <InstallmentForm
        accounts={accounts}
        cards={cards}
        categories={categories}
        installment={installment}
        returnTo={returnTo}
      />
    </div>
  );
}
