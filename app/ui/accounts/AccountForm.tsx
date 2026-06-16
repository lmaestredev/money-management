import Link from 'next/link';
import { createAccountAction } from '@/app/lib/actions/accounts';
import { fetchPeople } from '@/app/lib/data/people';
import SubmitButton from '@/app/ui/SubmitButton';
import AccountCurrencyFields from './AccountCurrencyFields';
import styles from './AccountForm.module.css';

export default async function AccountForm() {
  const people = await fetchPeople();

  return (
    <form action={createAccountAction} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="bank" className={styles.label}>
          Banco o institución
        </label>
        <input
          id="bank"
          name="bank"
          type="text"
          className={styles.input}
          placeholder="Ej. Banco Galicia, Mercado Pago, Dolar App"
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="owner_id" className={styles.label}>
          Dueño
        </label>
        <select id="owner_id" name="owner_id" className={styles.select} defaultValue="">
          <option value="">Compartida / sin asignar</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>
      <AccountCurrencyFields />
      <div className={styles.actions}>
        <SubmitButton>Guardar cuenta</SubmitButton>
        <Link href="/dashboard/cuentas" className={`${styles.button} ${styles.buttonSecondary}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
