/**
 * Validación de servidor compartida (zod). Nunca confiar en el cliente: los
 * importes, días y tasas que llegan de formularios o de la API pasan por acá.
 *
 * Los formularios envían strings; `Number()` (a diferencia de `parseFloat`)
 * rechaza basura como "12abc" y los valores no finitos ("Infinity", "1e999").
 */
import { z } from 'zod';

/** Las columnas son DECIMAL(18,2): este tope evita desbordes y cifras absurdas. */
export const MAX_AMOUNT = 1_000_000_000_000;
export const MAX_RATE = 1_000_000;
export const MAX_DESCRIPTION = 500;
export const MAX_COMMENT = 2000;

const isBlank = (v: unknown): boolean => v == null || (typeof v === 'string' && v.trim() === '');

/** Importe >= 0, finito y acotado. Coerciona strings ("12.5"). Rechaza NaN/Infinity. */
export const amount = z.coerce.number().finite().min(0).max(MAX_AMOUNT);
/** Igual que `amount` pero estricto: para JSON de la API (no acepta "12", null ni true). */
export const strictAmount = z.number().finite().min(0).max(MAX_AMOUNT);
/** Importe con signo, para saldos: una cuenta puede estar en descubierto. */
export const signedAmount = z.coerce.number().finite().min(-MAX_AMOUNT).max(MAX_AMOUNT);
/** Día del mes, entero 1..31. */
export const dayOfMonth = z.coerce.number().int().min(1).max(31);
/** Fecha calendario 'YYYY-MM-DD' válida (rechaza 2026-02-30). */
export const isoDate = z.string().date();
/** Tasa de cambio > 0. */
export const rate = z.coerce.number().finite().gt(0).max(MAX_RATE);
export const strictRate = z.number().finite().gt(0).max(MAX_RATE);
/** Período 'YYYY-MM' con mes 01..12. */
export const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'period must be YYYY-MM');
/** Cantidad de cuotas, entero >= 1. */
export const installmentCount = z.coerce.number().int().min(1).max(360);

/** Campo de formulario de importe opcional: vacío o ausente vale 0. */
export const formAmount = z.preprocess((v) => (isBlank(v) ? 0 : v), amount);
/** Campo de formulario de saldo: vacío o ausente vale 0; admite negativos. */
export const formSignedAmount = z.preprocess((v) => (isBlank(v) ? 0 : v), signedAmount);
/** Campo de formulario de día opcional: vacío o ausente vale null. */
export const formOptionalDay = z.preprocess((v) => (isBlank(v) ? null : v), dayOfMonth.nullable());

/** Parsea un importe de formulario. null si no es válido. */
export function parseAmount(raw: unknown): number | null {
  const r = amount.safeParse(raw);
  return r.success ? r.data : null;
}

/** Tasa opcional de formulario: vacío -> null; inválida -> ok:false. */
export function parseOptionalRate(
  raw: unknown
): { ok: true; value: number | null } | { ok: false } {
  if (isBlank(raw)) return { ok: true, value: null };
  const r = rate.safeParse(raw);
  return r.success ? { ok: true, value: r.data } : { ok: false };
}

/** Exactamente una de las dos monedas tiene importe > 0. */
export function hasExactlyOneCurrency(pesos: number, dollars: number): boolean {
  return pesos > 0 !== dollars > 0;
}

/**
 * Regla de importes de un movimiento: una sola moneda con importe > 0 (si no, el
 * resumen USD suma doble). Las conversiones peso<->dólar llevan ambas, así que
 * solo exigen que alguna sea > 0.
 */
export function hasValidMovementAmounts(
  recordType: string,
  pesos: number,
  dollars: number
): boolean {
  return recordType === 'conversion' ? pesos + dollars > 0 : hasExactlyOneCurrency(pesos, dollars);
}

export const recordType = z.enum(['income', 'conversion', 'variable_payment', 'fixed_payment']);

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

/** Cuerpo de POST /api/movements (bot de Telegram). */
export const movementApiSchema = z
  .object({
    period,
    record_type: recordType,
    account_id: z.string().uuid(),
    category_id: z.string().uuid().optional().nullable(),
    description: optionalText(MAX_DESCRIPTION),
    status: z.boolean().optional().nullable(),
    amount_pesos: strictAmount,
    amount_dollars: strictAmount,
    payment_date: isoDate.optional().nullable(),
    dollar_rate: strictRate.optional().nullable(),
    exchange_rate: strictRate.optional().nullable(),
    comment: optionalText(MAX_COMMENT),
  })
  .superRefine((d, ctx) => {
    if (!hasValidMovementAmounts(d.record_type, d.amount_pesos, d.amount_dollars)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount_pesos'],
        message:
          d.record_type === 'conversion'
            ? 'Una conversión necesita al menos un importe mayor a 0'
            : 'Debe haber exactamente una moneda con importe mayor a 0 (amount_pesos o amount_dollars)',
      });
    }
  });
