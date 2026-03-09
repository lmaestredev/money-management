'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import styles from './MovementPeriodSelector.module.css';

function getPrevPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getNextPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m, 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function periodToLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });
}

function getTodayPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

type Props = {
  currentPeriod: string;
  basePath?: string;
};

export default function MovementPeriodSelector({ currentPeriod, basePath = '/dashboard/movimientos' }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goTo(period: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    router.replace(`${basePath}?${params.toString()}`);
  }

  const prev = getPrevPeriod(currentPeriod);
  const next = getNextPeriod(currentPeriod);
  const todayPeriod = getTodayPeriod();
  const isNextFuture = next > todayPeriod;

  return (
    <div className={styles.wrapper} role="group" aria-label="Seleccionar mes">
      <button
        type="button"
        className={styles.button}
        onClick={() => goTo(prev)}
        aria-label="Mes anterior"
      >
        ◀
      </button>
      <span className={styles.label}>
        {periodToLabel(currentPeriod).charAt(0).toUpperCase() + periodToLabel(currentPeriod).slice(1)}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => goTo(next)}
        disabled={isNextFuture}
        aria-label="Mes siguiente"
      >
        ▶
      </button>
    </div>
  );
}
