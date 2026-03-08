'use client';

import { useCallback } from 'react';
import styles from './MovementsFiltersBar.module.css';

export type TypeFilter = 'all' | 'income' | 'expense';

type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter: TypeFilter;
  onTypeChange: (value: TypeFilter) => void;
};

export default function MovementsFiltersBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
}: Props) {
  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  return (
    <div className={styles.filtersBar}>
      <div className={styles.searchBox}>
        <span className={styles.searchIcon} aria-hidden>
          🔍
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Buscar movimiento, categoría, cuenta…"
          className={styles.searchInput}
          aria-label="Buscar movimientos"
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

      <div className={styles.chips}>
        <button type="button" className={styles.filterChip} aria-label="Filtrar por cuenta">
          🏦 Todas las cuentas ▾
        </button>
        <button type="button" className={styles.filterChip} aria-label="Filtrar por categoría">
          🏷️ Categoría ▾
        </button>
        <button type="button" className={styles.filterChip} aria-label="Filtrar por estado">
          ⚡ Estado ▾
        </button>
      </div>
    </div>
  );
}
