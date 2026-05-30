import { login } from '@/app/lib/actions/auth';
import styles from './page.module.css';

const ERROR_MESSAGES: Record<string, string> = {
  credentials: 'Email o contraseña incorrectos (o el usuario no está confirmado en Supabase).',
  config:
    'Error de configuración del servidor. Revisá las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel.',
  format: 'Email o contraseña inválidos.',
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.credentials : null;

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>Money Management</h1>
        <p className={styles.subtitle}>Inicia sesión para continuar</p>

        {errorMessage && (
          <div className={styles.error} role="alert">
            {errorMessage}
          </div>
        )}

        <form action={login} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={styles.input}
              placeholder="tu@email.com"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={styles.input}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className={styles.button}>
            Iniciar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
