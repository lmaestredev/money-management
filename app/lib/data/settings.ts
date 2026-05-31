import { sql } from '../db';
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

/** Lee toda la configuración, completando con defaults las claves ausentes. */
export async function getSettings(): Promise<AppSettings> {
  const rows = (await sql`SELECT key, value FROM settings`) as { key: string; value: string | null }[];
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
}

function serialize(key: keyof AppSettings, value: AppSettings[keyof AppSettings]): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/** Upsertea solo las claves provistas. */
export async function updateSettings(update: SettingsUpdate): Promise<void> {
  const entries = Object.entries(update) as [keyof AppSettings, AppSettings[keyof AppSettings]][];
  if (entries.length === 0) return;

  await sql.begin(async (tx) => {
    for (const [key, value] of entries) {
      const serialized = serialize(key, value);
      await tx`
        INSERT INTO settings (key, value, updated_at)
        VALUES (${key}, ${serialized}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${serialized}, updated_at = NOW()
      `;
    }
  });
}
