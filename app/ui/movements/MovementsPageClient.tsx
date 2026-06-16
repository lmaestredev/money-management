'use client';

import { useState, useMemo } from 'react';
import type { Account, InstallmentPurchase, Movement, RecurringExpense, RecurringIncome } from '@/app/lib/definitions';
import {
  countPageItems,
  filterInstallments,
  filterMovements,
  filterRecurringExpenses,
  filterRecurringIncomes,
  type StatusFilter,
  type TypeFilter,
} from '@/app/lib/utils/movement-filters';
import MovementsFiltersBar from './MovementsFiltersBar';
import MovementList from './MovementList';
import MonthlyIncomesSection from '@/app/ui/recurring-incomes/MonthlyIncomesSection';
import MonthlyFixedExpensesSection from '@/app/ui/recurring/MonthlyFixedExpensesSection';
import MonthlyInstallmentsSection from '@/app/ui/installments/MonthlyInstallmentsSection';

export type AccountNames = Record<string, string>;
export type CardNames = Record<string, string>;

type MonthlyData = {
  incomes: RecurringIncome[];
  receivedIncomeIds: string[];
  expenses: RecurringExpense[];
  paidRecurringIds: string[];
  installments: InstallmentPurchase[];
  paidInstallmentIds: string[];
  period: string;
  accounts: Account[];
};

type Props = {
  movements: Movement[];
  accountNames: AccountNames;
  cardNames: CardNames;
  rate: number | null;
  monthly?: MonthlyData;
  readOnly?: boolean;
};

export default function MovementsPageClient({
  movements,
  accountNames,
  cardNames,
  rate,
  monthly,
  readOnly = false,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const receivedIncomeIds = useMemo(
    () => new Set(monthly?.receivedIncomeIds ?? []),
    [monthly?.receivedIncomeIds]
  );
  const paidRecurringIds = useMemo(
    () => new Set(monthly?.paidRecurringIds ?? []),
    [monthly?.paidRecurringIds]
  );
  const paidInstallmentIds = useMemo(
    () => new Set(monthly?.paidInstallmentIds ?? []),
    [monthly?.paidInstallmentIds]
  );

  const pendingIncomes = useMemo(
    () => (monthly?.incomes ?? []).filter((i) => !receivedIncomeIds.has(i.id)),
    [monthly?.incomes, receivedIncomeIds]
  );
  const pendingExpenses = useMemo(
    () => (monthly?.expenses ?? []).filter((e) => !paidRecurringIds.has(e.id)),
    [monthly?.expenses, paidRecurringIds]
  );
  const pendingInstallments = useMemo(
    () => (monthly?.installments ?? []).filter((i) => !paidInstallmentIds.has(i.id)),
    [monthly?.installments, paidInstallmentIds]
  );

  const filteredMovements = useMemo(
    () => filterMovements(movements, accountNames, cardNames, searchQuery, typeFilter, statusFilter),
    [movements, accountNames, cardNames, searchQuery, typeFilter, statusFilter]
  );

  const filteredIncomes = useMemo(
    () => filterRecurringIncomes(pendingIncomes, searchQuery, typeFilter, statusFilter),
    [pendingIncomes, searchQuery, typeFilter, statusFilter]
  );

  const filteredExpenses = useMemo(
    () => filterRecurringExpenses(pendingExpenses, searchQuery, typeFilter, statusFilter),
    [pendingExpenses, searchQuery, typeFilter, statusFilter]
  );

  const filteredInstallments = useMemo(
    () => filterInstallments(pendingInstallments, searchQuery, typeFilter, statusFilter),
    [pendingInstallments, searchQuery, typeFilter, statusFilter]
  );

  const totalCount = useMemo(
    () =>
      countPageItems({
        movements: movements.length,
        pendingIncomes: pendingIncomes.length,
        pendingExpenses: pendingExpenses.length,
        pendingInstallments: pendingInstallments.length,
      }),
    [movements.length, pendingIncomes.length, pendingExpenses.length, pendingInstallments.length]
  );

  const resultCount = useMemo(
    () =>
      countPageItems({
        movements: filteredMovements.length,
        pendingIncomes: filteredIncomes.length,
        pendingExpenses: filteredExpenses.length,
        pendingInstallments: filteredInstallments.length,
      }),
    [
      filteredMovements.length,
      filteredIncomes.length,
      filteredExpenses.length,
      filteredInstallments.length,
    ]
  );

  const isFiltering =
    searchQuery.trim() !== '' || typeFilter !== 'all' || statusFilter !== 'all';

  const showGlobalFilterEmpty = isFiltering && resultCount === 0;
  const showMovementList =
    filteredMovements.length > 0 || (!isFiltering && resultCount === 0);

  return (
    <>
      <MovementsFiltersBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        resultCount={resultCount}
        totalCount={totalCount}
        isFiltering={isFiltering}
      />

      {!showGlobalFilterEmpty && monthly && (
        <>
          <MonthlyIncomesSection
            incomes={monthly.incomes}
            pendingIncomes={filteredIncomes}
            receivedIds={receivedIncomeIds}
            period={monthly.period}
            accounts={monthly.accounts}
            rate={rate}
          />

          <MonthlyFixedExpensesSection
            expenses={monthly.expenses}
            pendingExpenses={filteredExpenses}
            paidIds={paidRecurringIds}
            period={monthly.period}
            accounts={monthly.accounts}
            rate={rate}
          />

          <MonthlyInstallmentsSection
            installments={monthly.installments}
            pendingInstallments={filteredInstallments}
            paidIds={paidInstallmentIds}
            period={monthly.period}
            rate={rate}
          />
        </>
      )}

      {showGlobalFilterEmpty && (
        <MovementList
          movements={[]}
          accountNames={accountNames}
          cardNames={cardNames}
          rate={rate}
          readOnly={readOnly}
          isFiltering
          showFilterEmpty
        />
      )}

      {showMovementList && !showGlobalFilterEmpty && (
        <MovementList
          movements={filteredMovements}
          accountNames={accountNames}
          cardNames={cardNames}
          rate={rate}
          readOnly={readOnly}
        />
      )}
    </>
  );
}
