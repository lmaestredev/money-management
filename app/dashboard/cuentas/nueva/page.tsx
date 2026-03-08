import AccountForm from '@/app/ui/accounts/AccountForm';
import styles from './page.module.css';

export default function NuevaCuentaPage() {
  return (
    <div>
      <h1 className={styles.title}>Registrar cuenta</h1>
      <p className={styles.subtitle}>
        Indica el banco o institución, la moneda y el saldo actual.
      </p>
      <AccountForm />
    </div>
  );
}
