'use client';

import { useState } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import styles from './page.module.css';

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Email o contraseña incorrectos (o el usuario no está confirmado en Supabase).');
      setLoading(false);
      return;
    }

    // Navegación dura: garantiza que el servidor/middleware lean la cookie de
    // sesión recién escrita por el navegador.
    window.location.assign('/dashboard');
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
      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? 'Ingresando…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
