import Link from 'next/link';
import { updateAccountAction } from '@/app/lib/actions/accounts';
import { getAccountBalance } from '@/app/lib/data/accounts';
import { fetchPeople } from '@/app/lib/data/people';
import SubmitButton from '@/app/ui/SubmitButton';
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
      <div className={styles.field}>
        <label htmlFor="currency" className={styles.label}>
          Moneda
        </label>
        <select
          id="currency"
          name="currency"
          className={styles.select}
          defaultValue={account.currency}
          required
        >
          <option value="peso">Peso (ARS)</option>
          <option value="dollar">Dólar (USD)</option>
          <option value="crypto">Cripto</option>
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="balance" className={styles.label}>
          Saldo actual
        </label>
        <input
          id="balance"
          name="balance"
          type="number"
          step="0.00000001"
          className={styles.input}
          defaultValue={balance}
          required
        />
      </div>
      <div className={styles.actions}>
        <SubmitButton>Guardar cambios</SubmitButton>
        <Link href="/dashboard/cuentas" className={`${styles.button} ${styles.buttonSecondary}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
