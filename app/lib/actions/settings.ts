'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { refreshExchangeRates } from '@/app/lib/data/exchange-rates';
import { updateSettings } from '@/app/lib/data/settings';
import type { RateSource } from '@/app/lib/definitions';

/** Botón "Actualizar ahora": refresca las cotizaciones contra dolarapi. */
export async function refreshRatesAction() {
  await refreshExchangeRates();
  revalidatePath('/dashboard/configuracion');
  revalidatePath('/dashboard');
}

const nonNegativeNumber = z
  .string()
  .optional()
  .transform((s) => {
    if (s == null || s.trim() === '') return 0;
    const n = parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });

const settingsFormSchema = z.object({
  budget_total_usd: nonNegativeNumber,
  budget_variable_usd: nonNegativeNumber,
  rate_source: z.enum(['blue', 'oficial']),
  manual_rate_enabled: z
    .string()
    .optional()
    .transform((s) => s === 'true'),
  manual_rate_value: z
    .string()
    .optional()
    .transform((s) => {
      if (s == null || s.trim() === '') return null;
      const n = parseFloat(s);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
});

export async function updateSettingsAction(formData: FormData) {
  const parsed = settingsFormSchema.safeParse({
    budget_total_usd: formData.get('budget_total_usd') ?? undefined,
    budget_variable_usd: formData.get('budget_variable_usd') ?? undefined,
    rate_source: formData.get('rate_source') ?? undefined,
    manual_rate_enabled: formData.get('manual_rate_enabled') ?? undefined,
    manual_rate_value: formData.get('manual_rate_value') ?? undefined,
  });
  if (!parsed.success) {
    redirect('/dashboard/configuracion?error=validation');
  }

  const d = parsed.data;
  await updateSettings({
    budget_total_usd: d.budget_total_usd,
    budget_variable_usd: d.budget_variable_usd,
    rate_source: d.rate_source as RateSource,
    manual_rate_enabled: d.manual_rate_enabled,
    manual_rate_value: d.manual_rate_value,
  });

  revalidatePath('/dashboard/configuracion');
  revalidatePath('/dashboard');
  redirect('/dashboard/configuracion?saved=1');
}
