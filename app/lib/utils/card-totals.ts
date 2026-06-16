import type { CreditCard, InstallmentPurchase } from '@/app/lib/definitions';
import { amountsToUsd } from '@/app/lib/utils/currency';

export type CardDisplayDebt = {
  cardId: string;
  cardName: string;
  currency: CreditCard['currency'];
  pesos: number;
  dollars: number;
  balancePesos: number;
  balanceDollars: number;
  cuotaFloorPesos: number;
  cuotaFloorDollars: number;
  cuotaFloorApplied: boolean;
};

/** Suma de cuotas mensuales activas asociadas a una tarjeta (piso mínimo del resumen). */
export function getCardMonthlyInstallmentFloor(
  cardId: string,
  installments: InstallmentPurchase[]
): { pesos: number; dollars: number } {
  return installments
    .filter(
      (i) =>
        i.status === 'active' &&
        i.credit_card_id === cardId &&
        i.paid_installments < i.total_installments
    )
    .reduce(
      (acc, i) => ({
        pesos: acc.pesos + i.monthly_amount_pesos,
        dollars: acc.dollars + i.monthly_amount_dollars,
      }),
      { pesos: 0, dollars: 0 }
    );
}

/** Deuda visible de la tarjeta: max(saldo cargado, cuotas mensuales de esa tarjeta). */
export function getCardDisplayDebt(
  card: CreditCard,
  installments: InstallmentPurchase[]
): CardDisplayDebt {
  const floor = getCardMonthlyInstallmentFloor(card.id, installments);
  const pesos = Math.max(card.current_balance_pesos, floor.pesos);
  const dollars = Math.max(card.current_balance_dollars, floor.dollars);
  return {
    cardId: card.id,
    cardName: card.name,
    currency: card.currency,
    pesos,
    dollars,
    balancePesos: card.current_balance_pesos,
    balanceDollars: card.current_balance_dollars,
    cuotaFloorPesos: floor.pesos,
    cuotaFloorDollars: floor.dollars,
    cuotaFloorApplied:
      pesos > card.current_balance_pesos || dollars > card.current_balance_dollars,
  };
}

export function getActiveCardDisplayDebts(
  cards: CreditCard[],
  installments: InstallmentPurchase[]
): CardDisplayDebt[] {
  return cards
    .filter((c) => c.active)
    .map((c) => getCardDisplayDebt(c, installments))
    .filter((d) => d.pesos !== 0 || d.dollars !== 0);
}

export function cardDisplayDebtToUsd(debt: CardDisplayDebt, rate: number | null): number {
  return amountsToUsd(debt.pesos, debt.dollars, rate);
}
