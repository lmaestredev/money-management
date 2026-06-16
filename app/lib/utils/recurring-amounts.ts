import type { AccountCurrency } from '@/app/lib/definitions';

/**
 * Normaliza montos de plantillas recurrentes en columnas semánticas:
 * amount_pesos = ARS, amount_dollars = USD.
 * La moneda de la cuenta/tarjeta no cambia estas columnas.
 */
export function normalizeRecurringAmounts(
  _currency: AccountCurrency | null | undefined,
  amountPesos: number,
  amountDollars: number
): { amount_pesos: number; amount_dollars: number } {
  if (amountPesos > 0 && amountDollars > 0) {
    return { amount_pesos: amountPesos, amount_dollars: amountDollars };
  }
  if (amountPesos > 0) {
    return { amount_pesos: amountPesos, amount_dollars: 0 };
  }
  if (amountDollars > 0) {
    return { amount_pesos: 0, amount_dollars: amountDollars };
  }
  return { amount_pesos: 0, amount_dollars: 0 };
}
