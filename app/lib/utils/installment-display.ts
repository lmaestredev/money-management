import type { InstallmentPurchase, RecurringExpense, Movement } from '@/app/lib/definitions';

function paymentSourceLabel(
  creditCardName: string | null | undefined,
  accountName: string | null | undefined,
  fallback: string
): string {
  return creditCardName ?? accountName ?? fallback;
}

export function installmentPaymentLabel(
  i: Pick<InstallmentPurchase, 'credit_card_name' | 'account_name'>
): string {
  return paymentSourceLabel(i.credit_card_name, i.account_name, 'Sin tarjeta');
}

export function recurringExpensePaymentLabel(
  e: Pick<RecurringExpense, 'credit_card_name' | 'account_name' | 'is_cash'>
): string {
  return paymentSourceLabel(
    e.credit_card_name,
    e.account_name,
    e.is_cash ? 'Se elige al pagar' : 'Sin cuenta'
  );
}

export function movementPaymentLabel(
  m: Pick<Movement, 'credit_card_id' | 'account_id'>,
  cardNames: Record<string, string>,
  accountNames: Record<string, string>,
  fallback = '—'
): string {
  const cardName = m.credit_card_id ? cardNames[m.credit_card_id] : null;
  const accountName = m.account_id ? accountNames[m.account_id] : null;
  return paymentSourceLabel(cardName, accountName, fallback);
}
