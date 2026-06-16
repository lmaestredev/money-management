import type { Movement } from '@/app/lib/definitions';

export type MovementStatusLabel = 'paid' | 'pending' | 'overdue';

export function getMovementStatus(m: Movement): MovementStatusLabel {
  if (m.record_type === 'income') return 'paid';
  if (m.status === true) return 'paid';
  if (m.status === false && m.payment_date) {
    const due = new Date(m.payment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
  }
  return 'pending';
}
