/**
 * Formatea un monto en USD con el símbolo "u$d" para distinguirlo del peso.
 * Ej: 1234.5 → "u$d 1.234,50"
 */
export function formatUsd(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '−' : '';
  return `${sign}u$d ${formatted}`;
}

/**
 * Equivalente en pesos de un monto ya calculado en USD, usando la tasa
 * efectiva. Preferir esto sobre sumar amount_pesos crudo cuando el monto
 * puede venir mezclado (parte en pesos, parte cargada directo en dólares,
 * p. ej. un alquiler en USD): así ese componente en dólares no queda
 * invisible en la vista "primaria en pesos". Si no hay tasa, se cae al
 * crudo en pesos (mejor que mostrar $0 para todo).
 */
export function arsEquivalent(usdAmount: number, rawPesos: number, rate: number | null): number {
  return rate ? usdAmount * rate : rawPesos;
}

/**
 * Formatea un monto en pesos argentinos.
 * Ej: 150000 → "$ 150.000"
 */
export function formatArs(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
