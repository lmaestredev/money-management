import { withAuthenticatedTx } from '../db';
import type { AppSettings, RateSource, SettingsUpdate } from '../definitions';

const DEFAULTS: AppSettings = {
  budget_total_usd: 3500,
  budget_variable_usd: 500,
  rate_source: 'blue',
  manual_rate_enabled: false,
  manual_rate_value: null,
};

function parseNumber(value: string | null | undefined, fallback: number): number {
  if (value == null || value.trim() === '') return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function getSettings(userId: string): Promise<AppSettings> {
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = (await tx`SELECT key, value FROM settings`) as { key: string; value: string | null }[];
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const rateSourceRaw = map.get('rate_source');
    const rate_source: RateSource = rateSourceRaw === 'oficial' ? 'oficial' : 'blue';

    const manualRaw = map.get('manual_rate_value');
    const manual_rate_value =
      manualRaw != null && manualRaw.trim() !== '' && Number.isFinite(parseFloat(manualRaw))
        ? parseFloat(manualRaw)
        : null;

    return {
      budget_total_usd: parseNumber(map.get('budget_total_usd'), DEFAULTS.budget_total_usd),
      budget_variable_usd: parseNumber(map.get('budget_variable_usd'), DEFAULTS.budget_variable_usd),
      rate_source,
      manual_rate_enabled: map.get('manual_rate_enabled') === 'true',
      manual_rate_value,
    };
  });
}

function serialize(key: keyof AppSettings, value: AppSettings[keyof AppSettings]): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export async function updateSettings(userId: string, update: SettingsUpdate): Promise<void> {
  const entries = Object.entries(update) as [keyof AppSettings, AppSettings[keyof AppSettings]][];
  if (entries.length === 0) return;

  await withAuthenticatedTx(userId, async (tx) => {
    for (const [key, value] of entries) {
      const serialized = serialize(key, value);
      await tx`
        INSERT INTO settings (key, value, user_id, updated_at)
        VALUES (${key}, ${serialized}, ${userId}, NOW())
        ON CONFLICT (key, user_id) DO UPDATE SET value = ${serialized}, updated_at = NOW()
      `;
    }
  });
}

// Último intento de actualizar la cotización a mano, por usuario. Se guarda ANTES de
// llamar a la API para que el límite de 1 por minuto también frene los reintentos
// cuando la API está caída (el updated_at de las cotizaciones solo cambia si sale bien).
const RATES_ATTEMPT_KEY = 'rates_last_refresh_attempt';

export async function getLastRefreshAttempt(userId: string): Promise<string | null> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`SELECT value FROM settings WHERE key = ${RATES_ATTEMPT_KEY}`;
    return (row?.value as string | null) ?? null;
  });
}

export async function recordRefreshAttempt(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await withAuthenticatedTx(userId, async (tx) => {
    await tx`
      INSERT INTO settings (key, value, user_id, updated_at)
      VALUES (${RATES_ATTEMPT_KEY}, ${now}, ${userId}, NOW())
      ON CONFLICT (key, user_id) DO UPDATE SET value = ${now}, updated_at = NOW()
    `;
  });
}
