'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { extractExpenseFromImage, isSupportedImageType } from '@/app/lib/ai/extract-expense';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export type ExtractExpenseActionResult =
  | {
      ok: true;
      amount: number | null;
      currencyGuess: 'ARS' | 'USD' | null;
      merchant: string | null;
      date: string | null;
      accountId: string | null;
      creditCardId: string | null;
    }
  | { ok: false; error: string };

export async function extractExpenseFromImageAction(
  formData: FormData
): Promise<ExtractExpenseActionResult> {
  const user = await requireUser();

  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'No se recibió ninguna imagen.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'La imagen es demasiado grande (máximo 8MB).' };
  }
  if (!isSupportedImageType(file.type)) {
    return { ok: false, error: 'Formato de imagen no soportado. Usá JPG, PNG, WEBP o GIF.' };
  }

  const context = String(formData.get('context') ?? '');

  try {
    const [accounts, cards] = await Promise.all([
      fetchAccounts(user.id),
      fetchActiveCreditCards(user.id),
    ]);

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const result = await extractExpenseFromImage(
      base64,
      file.type,
      context,
      accounts.map((a) => ({ id: a.id, name: a.bank ? `${a.name} (${a.bank})` : a.name })),
      cards.map((c) => ({ id: c.id, name: c.bank ? `${c.name} (${c.bank})` : c.name }))
    );

    return {
      ok: true,
      amount: result.amount,
      currencyGuess: result.currency_guess,
      merchant: result.merchant,
      date: result.date,
      accountId: result.account_id,
      creditCardId: result.credit_card_id,
    };
  } catch (err) {
    console.error('extractExpenseFromImageAction failed:', err);
    return { ok: false, error: 'No se pudo analizar la imagen. Intentá de nuevo o cargá el monto manualmente.' };
  }
}
