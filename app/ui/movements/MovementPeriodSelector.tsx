'use client';

import { useRouter, useSearchParams } from 'next/navigation';

function getPeriods(): { value: string; label: string }[] {
  const list: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    const label = d.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
    list.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return list;
}

const PERIODS = getPeriods();

type Props = {
  currentPeriod: string;
};

export default function MovementPeriodSelector({ currentPeriod }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const period = e.target.value;
    const next = new URLSearchParams(searchParams.toString());
    next.set('period', period);
    router.replace(`/dashboard/movimientos?${next.toString()}`);
  }

  return (
    <select
      value={currentPeriod}
      onChange={handleChange}
      style={{
        padding: '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid var(--color-surface-dark)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-bg-dark)',
        fontSize: '0.875rem',
      }}
      aria-label="Seleccionar periodo"
    >
      {PERIODS.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
