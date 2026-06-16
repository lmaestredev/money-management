import type { Movement } from '@/app/lib/definitions';

/** Convierte montos en pesos y dólares a un total en USD usando la tasa efectiva. */
export function amountsToUsd(
  amountPesos: number,
  amountDollars: number,
  rate: number | null
): number {
  const pesosUsd = rate && rate > 0 ? amountPesos / rate : 0;
  return amountDollars + pesosUsd;
}

/** Valor del movimiento en USD (dólares directos + pesos convertidos). */
export function movementToUsd(m: Movement, rate: number | null): number {
  return amountsToUsd(m.amount_pesos, m.amount_dollars, rate);
}
