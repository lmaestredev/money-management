'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import styles from './page.module.css';

type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordForm() {
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function consumeRecoveryLink() {
      // Si el navegador ya tenía una sesión activa (de otra cuenta logueada),
      // hay que descartarla: si no, el formulario terminaría actualizando la
      // contraseña de esa cuenta en vez de la del link de recuperación.
      await supabase.auth.signOut();
      if (cancelled) return;

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const code = queryParams.get('code');
      const tokenHash = queryParams.get('token_hash');
      const type = queryParams.get('type');

      let ok = false;
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        ok = !error;
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        ok = !error;
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as 'recovery',
          token_hash: tokenHash,
        });
        ok = !error;
      }

      // Limpia el token/código de la URL para que no quede visible ni se reuse.
      window.history.replaceState(null, '', window.location.pathname);

      if (!cancelled) setLinkState(ok ? 'valid' : 'invalid');
    }

    consumeRecoveryLink();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirm_password') ?? '');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || 'No se pudo actualizar la contraseña. Intenta de nuevo.');
      return;
    }

    await supabase.auth.signOut();
    setDone(true);
  }

  if (done) {
    return (
      <div className={styles.form}>
        <div className={styles.success} role="status">
          Contraseña actualizada. Ya podés iniciar sesión con tu nueva contraseña.
        </div>
        <Link href="/login" className={styles.backLink}>
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  if (linkState === 'checking') {
    return <p className={styles.verifying}>Verificando el enlace…</p>;
  }

  if (linkState === 'invalid') {
    return (
      <div className={styles.form}>
        <div className={styles.error} role="alert">
          El enlace no es válido o expiró. Solicita uno nuevo.
        </div>
        <Link href="/forgot-password" className={styles.backLink}>
          Solicitar nuevo enlace
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
        <label htmlFor="password" className={styles.label}>
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={styles.input}
          placeholder="••••••••"
        />
        <span className={styles.hint}>Mínimo 6 caracteres.</span>
      </div>
      <div className={styles.field}>
        <label htmlFor="confirm_password" className={styles.label}>
          Confirmar contraseña
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={styles.input}
          placeholder="••••••••"
        />
      </div>
      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
      </button>
    </form>
  );
}
