import type { Movement } from '@/app/lib/definitions';

const MOVIMIENTOS_RETURN = '/dashboard/movimientos';

export function getMovementEditHref(movement: Movement): string {
  if (movement.recurring_income_id) {
    return `/dashboard/ingresos/editar/${movement.recurring_income_id}?return=${encodeURIComponent(MOVIMIENTOS_RETURN)}`;
  }
  if (movement.recurring_expense_id) {
    return `/dashboard/gastos-fijos/editar/${movement.recurring_expense_id}?return=${encodeURIComponent(MOVIMIENTOS_RETURN)}`;
  }
  if (movement.installment_id) {
    return `/dashboard/cuotas/editar/${movement.installment_id}?return=${encodeURIComponent(MOVIMIENTOS_RETURN)}`;
  }
  return `/dashboard/movimientos/editar/${movement.id}?period=${movement.period}`;
}
