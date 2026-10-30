'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { refreshCooldownSeconds, refreshExchangeRates } from '@/app/lib/data/exchange-rates';
import {
  cooldownSecondsLeft,
  cooldownToast,
  refreshToast,
  type RefreshToast,
} from '@/app/lib/rates-refresh';
import { redirectWithToast } from '@/app/lib/toast-redirect';
import { getLastRefreshAttempt, recordRefreshAttempt, updateSettings } from '@/app/lib/data/settings';
import { createClient } from '@/app/lib/supabase/server';
import type { RateSource } from '@/app/lib/definitions';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

export async function refreshRatesAction() {
  const user = await requireUser();

  // Siempre termina con un toast: éxito, éxito parcial, falla o límite de 1 por minuto.
  let toast: RefreshToast;
  try {
    // Espera = lo que falte desde la última actualización exitosa O desde el último intento
    // de este usuario (así un fallo de la API tampoco permite reintentar sin límite).
    const lastAttempt = await getLastRefreshAttempt(user.id);
    const wait = Math.max(
      await refreshCooldownSeconds(),
      cooldownSecondsLeft(lastAttempt ? [lastAttempt] : [], Date.now())
    );
    if (wait > 0) {
      toast = cooldownToast(wait);
    } else {
      await recordRefreshAttempt(user.id);
      toast = refreshToast(await refreshExchangeRates());
    }
  } catch (err) {
    console.error('[rates] falló la actualización manual:', err);
    toast = refreshToast({ ok: false, failed: [] });
  }

  revalidatePath('/dashboard/configuracion');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/configuracion', toast.message, toast.type);
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

export type SettingsActionState = { ok: boolean; message: string } | null;

export async function updateSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const user = await requireUser();
  const parsed = settingsFormSchema.safeParse({
    budget_total_usd: formData.get('budget_total_usd') ?? undefined,
    budget_variable_usd: formData.get('budget_variable_usd') ?? undefined,
    rate_source: formData.get('rate_source') ?? undefined,
    manual_rate_enabled: formData.get('manual_rate_enabled') ?? undefined,
    manual_rate_value: formData.get('manual_rate_value') ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: 'No se pudo guardar. Revisá los valores.' };
  }

  const d = parsed.data;
  await updateSettings(user.id, {
    budget_total_usd: d.budget_total_usd,
    budget_variable_usd: d.budget_variable_usd,
    rate_source: d.rate_source as RateSource,
    manual_rate_enabled: d.manual_rate_enabled,
    manual_rate_value: d.manual_rate_value,
  });

  revalidatePath('/dashboard/configuracion');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Configuración guardada.' };
}
