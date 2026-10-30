import ResetPasswordForm from './ResetPasswordForm';
import styles from './page.module.css';

export default function ResetPasswordPage() {
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>Restablecer contraseña</h1>
        <p className={styles.subtitle}>Elegí una nueva contraseña para tu cuenta.</p>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
