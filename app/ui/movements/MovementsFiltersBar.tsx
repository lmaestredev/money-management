'use client';

import { useCallback } from 'react';
import type { StatusFilter, TypeFilter } from '@/app/lib/utils/movement-filters';
import styles from './MovementsFiltersBar.module.css';

export type { TypeFilter, StatusFilter } from '@/app/lib/utils/movement-filters';

type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter: TypeFilter;
  onTypeChange: (value: TypeFilter) => void;
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  resultCount: number;
  totalCount: number;
  isFiltering: boolean;
};

export default function MovementsFiltersBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  statusFilter,
  onStatusChange,
  resultCount,
  totalCount,
  isFiltering,
}: Props) {
  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.filtersBar}>
      <div className={styles.searchBox}>
        <span className={styles.searchIcon} aria-hidden>
          🔍
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Buscar en todas las listas…"
          className={styles.searchInput}
          aria-label="Buscar en ingresos, gastos, cuotas y listado"
        />
      </div>

      <div
        className={styles.typeTabs}
        role="tablist"
        aria-label="Filtrar por tipo de movimiento"
      >
        <button
          type="button"
          role="tab"
          aria-selected={typeFilter === 'all'}
          className={`${styles.typeTab} ${typeFilter === 'all' ? styles.typeTabActive : ''}`}
          onClick={() => onTypeChange('all')}
        >
          Todos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={typeFilter === 'income'}
          className={`${styles.typeTab} ${styles.typeTabIncome} ${typeFilter === 'income' ? styles.typeTabIncomeActive : ''}`}
          onClick={() => onTypeChange('income')}
        >
          Ingresos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={typeFilter === 'expense'}
          className={`${styles.typeTab} ${styles.typeTabExpense} ${typeFilter === 'expense' ? styles.typeTabExpenseActive : ''}`}
          onClick={() => onTypeChange('expense')}
        >
          Egresos
        </button>
      </div>

      <div className={styles.statusTabs} role="tablist" aria-label="Filtrar por estado">
        {(
          [
            ['all', 'Todos'],
            ['paid', 'Pagado'],
            ['pending', 'Pendiente'],
            ['overdue', 'Vencido'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={statusFilter === value}
            className={`${styles.statusTab} ${statusFilter === value ? styles.statusTabActive : ''}`}
            onClick={() => onStatusChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      </div>
      {isFiltering && (
        <p className={styles.resultHint} aria-live="polite">
          Mostrando {resultCount} de {totalCount} ítems
        </p>
      )}
    </div>
  );
}
