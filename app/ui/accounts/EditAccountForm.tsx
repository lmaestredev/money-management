import Link from 'next/link';
import { updateAccountAction } from '@/app/lib/actions/accounts';
import { getAccountBalance } from '@/app/lib/data/accounts';
import { fetchPeople } from '@/app/lib/data/people';
import SubmitButton from '@/app/ui/SubmitButton';
import AccountCurrencyFields from './AccountCurrencyFields';
import type { Account } from '@/app/lib/definitions';
import styles from './AccountForm.module.css';

type Props = {
  account: Account;
};

export default async function EditAccountForm({ account }: Props) {
  const balance = getAccountBalance(account);
  const people = await fetchPeople();

  return (
    <form action={updateAccountAction} className={styles.form}>
      <input type="hidden" name="id" value={account.id} />
      <div className={styles.field}>
        <label htmlFor="bank" className={styles.label}>
          Banco o institución
        </label>
        <input
          id="bank"
          name="bank"
          type="text"
          className={styles.input}
          defaultValue={account.bank ?? account.name}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="owner_id" className={styles.label}>
          Dueño
        </label>
        <select
          id="owner_id"
          name="owner_id"
          className={styles.select}
          defaultValue={account.owner_id ?? ''}
        >
          <option value="">Compartida / sin asignar</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>
      <AccountCurrencyFields
        initialCurrency={account.currency}
        initialBalancePesos={account.balance_pesos}
        initialBalanceDollars={account.balance_dollars}
        initialSingleBalance={balance}
      />
      <div className={styles.actions}>
        <SubmitButton>Guardar cambios</SubmitButton>
        <Link href="/dashboard/cuentas" className={`${styles.button} ${styles.buttonSecondary}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
