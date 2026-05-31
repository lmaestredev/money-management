'use client';

import { useState, useMemo } from 'react';
import type { Movement } from '@/app/lib/definitions';
import SummaryCards from './SummaryCards';
import MovementsFiltersBar, { type TypeFilter } from './MovementsFiltersBar';
import MovementList from './MovementList';

export type MovementSummary = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  incomeCount: number;
  expenseCount: number;
};

type Props = {
  movements: Movement[];
  accountNames: Map<string, string>;
  summary: MovementSummary;
};

function filterMovements(
  movements: Movement[],
  accountNames: Map<string, string>,
  searchQuery: string,
  typeFilter: TypeFilter
): Movement[] {
  const q = searchQuery.trim().toLowerCase();
  let list = movements;

  if (typeFilter === 'income') {
    list = list.filter((m) => m.record_type === 'income');
  } else if (typeFilter === 'expense') {
    list = list.filter(
      (m) => m.record_type === 'variable_payment' || m.record_type === 'fixed_payment'
    );
  }

  if (q) {
    list = list.filter((m) => {
      const desc = (m.description ?? '').toLowerCase();
      const cat = (m.category_name ?? '').toLowerCase();
      const account = ((m.account_id && accountNames.get(m.account_id)) ?? '').toLowerCase();
      return desc.includes(q) || cat.includes(q) || account.includes(q);
    });
  }

  return list;
}

export default function MovementsPageClient({
  movements,
  accountNames,
  summary,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filteredMovements = useMemo(
    () => filterMovements(movements, accountNames, searchQuery, typeFilter),
    [movements, accountNames, searchQuery, typeFilter]
  );

  return (
    <>
      <SummaryCards
        balance={summary.balance}
        totalIncome={summary.totalIncome}
        totalExpense={summary.totalExpense}
        incomeCount={summary.incomeCount}
        expenseCount={summary.expenseCount}
      />

      <MovementsFiltersBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      <MovementList movements={filteredMovements} accountNames={accountNames} />
    </>
  );
}
