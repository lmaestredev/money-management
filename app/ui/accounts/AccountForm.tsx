import Link from 'next/link';
import { createAccountAction } from '@/app/lib/actions/accounts';
import styles from './AccountForm.module.css';

export default function AccountForm() {
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
          placeholder="Ej. Banco Galicia, Mercado Pago, Binance"
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="currency" className={styles.label}>
          Moneda
        </label>
        <select id="currency" name="currency" className={styles.select} required>
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
          min="0"
          className={styles.input}
          placeholder="0"
          required
        />
      </div>
      <div className={styles.actions}>
        <button type="submit" className={styles.button}>
          Guardar cuenta
        </button>
        <Link href="/dashboard/cuentas" className={`${styles.button} ${styles.buttonSecondary}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
