'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import styles from './SubmitButton.module.css';

type Props = {
  children: React.ReactNode;
  /** Clases extra para el contenedor del botón. */
  className?: string;
};

/**
 * Botón de submit animado: al enviarse el formulario muestra un spinner y, si la
 * acción termina sin navegar, un check de confirmación. Debe renderizarse dentro
 * de un <form> (lee el estado de envío con useFormStatus).
 */
export default function SubmitButton({ children, className }: Props) {
  const { pending } = useFormStatus();
  const [phase, setPhase] = useState<'idle' | 'loaded' | 'finished'>('idle');
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      setPhase('idle');
      return;
    }
    // El envío recién terminó (sin navegar): reproducir el check.
    if (wasPending.current) {
      wasPending.current = false;
      setPhase('loaded');
      const toFinished = setTimeout(() => setPhase('finished'), 700);
      const toIdle = setTimeout(() => setPhase('idle'), 700 + 1500);
      return () => {
        clearTimeout(toFinished);
        clearTimeout(toIdle);
      };
    }
  }, [pending]);

  const classes = [
    styles.expand,
    pending ? styles.loading : '',
    phase !== 'idle' ? styles.loaded : '',
    phase === 'finished' ? styles.finished : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="submit" className={classes} disabled={pending} aria-busy={pending}>
      {children}
      <span className={styles.expandIcon}>
        <svg
          className={styles.first}
          xmlns="http://www.w3.org/2000/svg"
          fill="#fff"
          viewBox="0 0 32 32"
          version="1.1"
        >
          <path d="M8.489 31.975c-0.271 0-0.549-0.107-0.757-0.316-0.417-0.417-0.417-1.098 0-1.515l14.258-14.264-14.050-14.050c-0.417-0.417-0.417-1.098 0-1.515s1.098-0.417 1.515 0l14.807 14.807c0.417 0.417 0.417 1.098 0 1.515l-15.015 15.022c-0.208 0.208-0.486 0.316-0.757 0.316z" />
        </svg>
        <span className={styles.loader} />
        <svg
          className={styles.second}
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
        >
          <path
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17 5L8 15l-5-4"
          />
        </svg>
      </span>
    </button>
  );
}
