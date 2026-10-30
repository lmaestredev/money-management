/**
 * Tasa (pesos por USD) con la que se convierte un período. Un período cerrado usa la tasa
 * que se congeló al cerrarlo, así sus totales no cambian cada vez que se mueve el dólar.
 * Si no tiene (períodos viejos o cerrados sin cotización) se usa la cotización actual y la
 * pantalla lo aclara. El período abierto siempre usa la actual.
 */
export type PeriodRate = { rate: number | null; frozen: boolean };

export function periodRate(
  closingRate: number | null | undefined,
  currentRate: number | null
): PeriodRate {
  if (closingRate != null && closingRate > 0) return { rate: closingRate, frozen: true };
  return { rate: currentRate, frozen: false };
}
