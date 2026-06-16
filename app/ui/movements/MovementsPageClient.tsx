'use client';

import { useState, useMemo } from 'react';
import type { Account, CreditCard, InstallmentPurchase, Movement, RecurringExpense, RecurringIncome } from '@/app/lib/definitions';
import {
  countPageItems,
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
import MonthlyCreditCardsSection from '@/app/ui/credit-cards/MonthlyCreditCardsSection';
import type { CardStatement } from '@/app/lib/definitions';

export type AccountNames = Record<string, string>;
export type CardNames = Record<string, string>;

type MonthlyData = {
  incomes: RecurringIncome[];
  receivedIncomeIds: string[];
  expenses: RecurringExpense[];
  paidRecurringIds: string[];
  cards: CreditCard[];
  installments: InstallmentPurchase[];
  unpaidStatements: CardStatement[];
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

/** Movimientos visibles: sin cargos a tarjeta ni pagos legacy de cuotas (van agregados por tarjeta). */
function listMovements(movements: Movement[]): Movement[] {
  return movements.filter((m) => !m.credit_card_id && !m.installment_id);
}

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

  const visibleMovements = useMemo(() => listMovements(movements), [movements]);

  const receivedIncomeIds = useMemo(
    () => new Set(monthly?.receivedIncomeIds ?? []),
    [monthly?.receivedIncomeIds]
  );
  const paidRecurringIds = useMemo(
    () => new Set(monthly?.paidRecurringIds ?? []),
    [monthly?.paidRecurringIds]
  );

  const pendingIncomes = useMemo(
    () => (monthly?.incomes ?? []).filter((i) => !receivedIncomeIds.has(i.id)),
    [monthly?.incomes, receivedIncomeIds]
  );
  const pendingExpenses = useMemo(
    () => (monthly?.expenses ?? []).filter((e) => !paidRecurringIds.has(e.id)),
    [monthly?.expenses, paidRecurringIds]
  );

  const filteredMovements = useMemo(
    () =>
      filterMovements(
        visibleMovements,
        accountNames,
        cardNames,
        searchQuery,
        typeFilter,
        statusFilter
      ),
    [visibleMovements, accountNames, cardNames, searchQuery, typeFilter, statusFilter]
  );

  const filteredIncomes = useMemo(
    () => filterRecurringIncomes(pendingIncomes, searchQuery, typeFilter, statusFilter),
    [pendingIncomes, searchQuery, typeFilter, statusFilter]
  );

  const filteredExpenses = useMemo(
    () => filterRecurringExpenses(pendingExpenses, searchQuery, typeFilter, statusFilter),
    [pendingExpenses, searchQuery, typeFilter, statusFilter]
  );

  const totalCount = useMemo(
    () =>
      countPageItems({
        movements: visibleMovements.length,
        pendingIncomes: pendingIncomes.length,
        pendingExpenses: pendingExpenses.length,
        activeCards: monthly?.cards.filter((c) => c.active).length ?? 0,
      }),
    [visibleMovements.length, pendingIncomes.length, pendingExpenses.length, monthly?.cards]
  );

  const resultCount = useMemo(
    () =>
      countPageItems({
        movements: filteredMovements.length,
        pendingIncomes: filteredIncomes.length,
        pendingExpenses: filteredExpenses.length,
        activeCards: monthly?.cards.filter((c) => c.active).length ?? 0,
      }),
    [
      filteredMovements.length,
      filteredIncomes.length,
      filteredExpenses.length,
      monthly?.cards,
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
          <MonthlyCreditCardsSection
            cards={monthly.cards}
            installments={monthly.installments}
            unpaidStatements={monthly.unpaidStatements}
            accounts={monthly.accounts}
            period={monthly.period}
            rate={rate}
          />

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
