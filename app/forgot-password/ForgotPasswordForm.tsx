'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import styles from './page.module.css';

export default function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message || 'No se pudo enviar el email. Intenta de nuevo en unos minutos.');
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className={styles.form}>
        <div className={styles.success} role="status">
          Si el email está registrado, te enviamos un enlace para restablecer tu contraseña.
          Revisa tu bandeja de entrada (y spam).
        </div>
        <Link href="/login" className={styles.backLink}>
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
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
      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>
      <Link href="/login" className={styles.backLink}>
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
