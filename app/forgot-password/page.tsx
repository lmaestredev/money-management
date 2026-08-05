import ForgotPasswordForm from './ForgotPasswordForm';
import styles from './page.module.css';

export default function ForgotPasswordPage() {
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>¿Olvidaste tu contraseña?</h1>
        <p className={styles.subtitle}>
          Ingresa tu email y te enviamos un enlace para restablecerla.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
