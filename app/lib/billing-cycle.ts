import { daysInMonth, formatISODate, parseISODate } from './dates';

export type Cycle = { period: string; closingDate: string | null; dueDate: string | null };

function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/**
 * Resuelve a qué resumen de tarjeta pertenece un cargo.
 * `chargeDate` es 'YYYY-MM-DD' (fecha local Argentina). Función pura, sin DB.
 */
export function resolveCycle(
  chargeDate: string,
  closingDay: number | null,
  dueDay: number | null
): Cycle {
  const { year, month, day } = parseISODate(chargeDate);

  if (!closingDay) {
    return { period: `${year}-${String(month).padStart(2, '0')}`, closingDate: null, dueDate: null };
  }

  let closing = { year, month };
  if (day > clampDay(year, month, closingDay)) closing = nextMonth(year, month);

  const closingDate = formatISODate(
    closing.year,
    closing.month,
    clampDay(closing.year, closing.month, closingDay)
  );
  const period = `${closing.year}-${String(closing.month).padStart(2, '0')}`;

  let dueDate: string | null = null;
  if (dueDay) {
    const due = dueDay <= closingDay ? nextMonth(closing.year, closing.month) : closing;
    dueDate = formatISODate(due.year, due.month, clampDay(due.year, due.month, dueDay));
  }

  return { period, closingDate, dueDate };
}
