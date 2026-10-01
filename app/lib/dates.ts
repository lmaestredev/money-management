/**
 * Fechas en zona horaria Argentina. El servidor (Vercel) corre en UTC, así que
 * "hoy" y el período actual se calculan con Intl y NO con getDate()/toISOString().
 * Las fechas se manejan como strings 'YYYY-MM-DD' sin pasar por Date, para que
 * no dependan de la zona horaria del proceso.
 */

export const AR_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export type ISODateParts = { year: number; month: number; day: number };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

const arFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: AR_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatISODate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parsea 'YYYY-MM-DD' (acepta un sufijo de hora, que se ignora). `month` es 1-12.
 * Lanza si el formato o la fecha no son válidos.
 */
export function parseISODate(iso: string): ISODateParts {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new Error(`Fecha inválida: "${iso}" (se esperaba YYYY-MM-DD)`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`Fecha inválida: "${iso}"`);
  }
  return { year, month, day };
}

/** Fecha de hoy en Argentina como 'YYYY-MM-DD'. `now` es inyectable para tests. */
export function todayAR(now: Date = new Date()): string {
  const parts = arFormatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Período actual en Argentina como 'YYYY-MM'. */
export function currentPeriodAR(now: Date = new Date()): string {
  return todayAR(now).slice(0, 7);
}

/** Suma (o resta, con n negativo) días a una fecha 'YYYY-MM-DD'. */
export function addDays(iso: string, n: number): string {
  const { year, month, day } = parseISODate(iso);
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return formatISODate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}
