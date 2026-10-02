import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, currentPeriodAR, dateOnly, formatDateAR, parseISODate, todayAR } from './dates';

test('todayAR usa la fecha de Argentina, no la de UTC', () => {
  // 15/10 22:00 ART = 16/10 01:00 UTC
  assert.equal(todayAR(new Date('2026-10-16T01:00:00Z')), '2026-10-15');
  // 16/10 00:00 ART = 16/10 03:00 UTC
  assert.equal(todayAR(new Date('2026-10-16T03:00:00Z')), '2026-10-16');
});

test('currentPeriodAR no salta de mes antes de medianoche argentina', () => {
  // 31/10 23:00 ART = 01/11 02:00 UTC
  assert.equal(currentPeriodAR(new Date('2026-11-01T02:00:00Z')), '2026-10');
  assert.equal(currentPeriodAR(new Date('2026-11-01T03:00:00Z')), '2026-11');
});

test('addDays cruza mes, año y bisiestos', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
  assert.equal(addDays('2026-10-10', 0), '2026-10-10');
});

test('parseISODate acepta sufijo de hora y rechaza fechas inválidas', () => {
  assert.deepEqual(parseISODate('2026-10-10T23:00:00Z'), { year: 2026, month: 10, day: 10 });
  assert.throws(() => parseISODate('2026-02-30'));
  assert.throws(() => parseISODate('2026-13-01'));
  assert.throws(() => parseISODate('abc'));
});

test('dateOnly lee un Date de columna DATE por su fecha UTC', () => {
  assert.equal(dateOnly(new Date('2026-10-10T00:00:00Z')), '2026-10-10');
  assert.equal(dateOnly('2026-10-10'), '2026-10-10');
  assert.equal(dateOnly('2026-10-10T00:00:00.000Z'), '2026-10-10');
  assert.throws(() => dateOnly(new Date('x')));
});

test('formatDateAR: el vencimiento 10/10 se muestra "10 oct" (no "9 oct")', () => {
  const short = { day: '2-digit', month: 'short' } as const;
  for (const v of ['2026-10-10', new Date('2026-10-10T00:00:00Z')]) {
    const out = formatDateAR(v, short);
    assert.match(out, /^10[ -]oct/i);
  }
  assert.match(formatDateAR('2026-10-01', { day: 'numeric', month: 'long' }, 'es-ES'), /^1 de octubre/);
});
