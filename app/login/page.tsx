import LoginForm from './LoginForm';
import styles from './page.module.css';

export default function LoginPage() {
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>Money Management</h1>
        <p className={styles.subtitle}>Inicia sesión para continuar</p>
        <LoginForm />
      </div>
    </main>
  );
}
