import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchCreditCards, fetchUnpaidStatements } from '@/app/lib/data/credit-cards';
import { formatUsd } from '@/app/lib/utils';
import { fetchAccounts } from '@/app/lib/data/accounts';
import CreditCardItem from '@/app/ui/credit-cards/CreditCardItem';
import styles from './page.module.css';

const ERROR_MESSAGES: Record<string, string> = {
  has_movements:
    'No se puede eliminar la tarjeta porque tiene movimientos asociados. Elimina o reasigna esos movimientos primero.',
  notfound: 'La tarjeta no existe o ya fue eliminada.',
  delete: 'No se pudo eliminar la tarjeta. Intenta de nuevo.',
  already_paid: 'Ese resumen ya estaba pagado.',
  empty: 'El resumen no tiene saldo para pagar.',
  no_account: 'Selecciona una cuenta para pagar el resumen.',
  validation: 'Solicitud inválida.',
};

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function TarjetasPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null;

  const [cards, accounts, unpaidStatements] = await Promise.all([
    fetchCreditCards(),
    fetchAccounts(),
    fetchUnpaidStatements(),
  ]);

  const statementsByCard = new Map<string, typeof unpaidStatements>();
  for (const st of unpaidStatements) {
    const list = statementsByCard.get(st.credit_card_id) ?? [];
    list.push(st);
    statementsByCard.set(st.credit_card_id, list);
  }

  const totalDebtPesos = cards.reduce((sum, c) => sum + c.current_balance_pesos, 0);
  const totalDebtDollars = cards.reduce((sum, c) => sum + c.current_balance_dollars, 0);
  const activeCount = cards.filter((c) => c.active).length;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Tarjetas de crédito</h1>
          <p className={styles.pageSubtitle}>Deuda acumulada y resúmenes por tarjeta</p>
        </div>
        <Link href="/dashboard/tarjetas/nueva" className={styles.newLink}>
          <PlusIcon className={styles.newLinkIcon} aria-hidden />
          Registrar tarjeta
        </Link>
      </header>

      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          <span aria-hidden>⛔</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {cards.length > 0 && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Tarjetas activas</span>
            <span className={styles.summaryValue}>{activeCount}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Deuda total (pesos)</span>
            <span className={styles.summaryValueExpense}>{formatPesos(totalDebtPesos)}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Deuda total (dólares)</span>
            <span className={styles.summaryValueExpense}>{formatUsd(totalDebtDollars)}</span>
          </div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Listado</h2>
        {cards.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden>💳</span>
            <p className={styles.emptyText}>No hay tarjetas registradas</p>
            <p className={styles.emptySub}>
              Registra una tarjeta para asociarle gastos, cuotas y pagar sus resúmenes.
            </p>
            <Link href="/dashboard/tarjetas/nueva" className={styles.emptyLink}>
              Registrar tarjeta
            </Link>
          </div>
        ) : (
          <ul className={styles.grid}>
            {cards.map((card) => (
              <li key={card.id}>
                <CreditCardItem
                  card={card}
                  accounts={accounts}
                  statements={statementsByCard.get(card.id) ?? []}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
