'use client';

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import styles from './ToastProvider.module.css';

type ToastType = 'success' | 'error';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
};

type ToastContextValue = {
  /** Muestra un toast. `type` por defecto 'success'. */
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  }
  return ctx;
}

const VISIBLE_MS = 4000; // tiempo visible antes de empezar a salir
const EXIT_MS = 300; // duración de la animación de salida

/**
 * Dispara un toast cuando llega un parámetro `?toast=...` en la URL (lo usan las
 * acciones que redirigen tras guardar/borrar). Luego limpia los params.
 */
function ToastFromParams() {
  const { toast } = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const message = params.get('toast');
    if (!message) return;

    const key = `${pathname}?${params.toString()}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    const type = params.get('toastType') === 'error' ? 'error' : 'success';
    toast(message, type);

    const next = new URLSearchParams(params.toString());
    next.delete('toast');
    next.delete('toastType');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router, toast]);

  return null;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    // Marca el toast como "saliendo" (dispara el fade-out) y lo quita al terminar.
    setToasts((cur) => cur.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, EXIT_MS);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = counter.current++;
      setToasts((cur) => [...cur, { id, message, type, exiting: false }]);
      setTimeout(() => remove(id), VISIBLE_MS);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Suspense fallback={null}>
        <ToastFromParams />
      </Suspense>
      <div className={styles.container} aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`${styles.toast} ${styles.professional} ${t.exiting ? styles.exit : ''}`}
          >
            {t.type === 'success' ? (
              <CheckCircleIcon className={`${styles.icon} ${styles.iconSuccess}`} aria-hidden />
            ) : (
              <ExclamationCircleIcon className={`${styles.icon} ${styles.iconError}`} aria-hidden />
            )}
            <span className={styles.message}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
