import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  MAX_AMOUNT,
  formAmount,
  formOptionalDay,
  formSignedAmount,
  hasExactlyOneCurrency,
  hasValidMovementAmounts,
  installmentCount,
  installmentScheduleFields,
  isoDate,
  movementApiSchema,
  parseAmount,
  parseOptionalRate,
  period,
  refineInstallment,
  refineOneCurrency,
} from './validation';

test('parseAmount acepta importes válidos y rechaza NaN, Infinity, negativos y basura', () => {
  assert.equal(parseAmount('12.5'), 12.5);
  assert.equal(parseAmount('0'), 0);
  for (const bad of ['-1', 'NaN', 'Infinity', '-Infinity', '1e999', '12abc', 'abc', undefined, String(MAX_AMOUNT * 10)]) {
    assert.equal(parseAmount(bad), null, `debería rechazar ${String(bad)}`);
  }
});

test('formAmount: vacío o ausente vale 0, pero lo inválido se rechaza', () => {
  assert.equal(formAmount.parse(''), 0);
  assert.equal(formAmount.parse(undefined), 0);
  assert.equal(formAmount.parse('150.75'), 150.75);
  assert.equal(formAmount.safeParse('-5').success, false);
  assert.equal(formAmount.safeParse('Infinity').success, false);
});

test('formSignedAmount admite saldos negativos pero no NaN ni Infinity', () => {
  assert.equal(formSignedAmount.parse('-500.25'), -500.25);
  assert.equal(formSignedAmount.parse(''), 0);
  assert.equal(formSignedAmount.safeParse('abc').success, false);
  assert.equal(formSignedAmount.safeParse('-Infinity').success, false);
});

test('formOptionalDay: vacío es null y fuera de 1..31 se rechaza', () => {
  assert.equal(formOptionalDay.parse(''), null);
  assert.equal(formOptionalDay.parse('15'), 15);
  for (const bad of ['0', '32', '-1', '1.5', 'x']) {
    assert.equal(formOptionalDay.safeParse(bad).success, false, bad);
  }
});

test('installmentCount, isoDate y period', () => {
  assert.equal(installmentCount.parse('12'), 12);
  assert.equal(installmentCount.safeParse('0').success, false);
  assert.equal(installmentCount.safeParse('2.5').success, false);
  assert.equal(isoDate.safeParse('2026-10-15').success, true);
  assert.equal(isoDate.safeParse('2026-02-30').success, false);
  assert.equal(period.safeParse('2026-10').success, true);
  assert.equal(period.safeParse('2026-13').success, false);
});

test('parseOptionalRate: vacío es null, <= 0 o inválida no pasa', () => {
  assert.deepEqual(parseOptionalRate(''), { ok: true, value: null });
  assert.deepEqual(parseOptionalRate('1200.5'), { ok: true, value: 1200.5 });
  for (const bad of ['0', '-3', 'abc', 'Infinity']) {
    assert.deepEqual(parseOptionalRate(bad), { ok: false }, bad);
  }
});

test('regla de una sola moneda', () => {
  assert.equal(hasExactlyOneCurrency(100, 0), true);
  assert.equal(hasExactlyOneCurrency(0, 5), true);
  assert.equal(hasExactlyOneCurrency(100, 5), false); // sumaría doble en el resumen USD
  assert.equal(hasExactlyOneCurrency(0, 0), false);
  // las conversiones llevan ambas monedas
  assert.equal(hasValidMovementAmounts('conversion', 100000, 100), true);
  assert.equal(hasValidMovementAmounts('conversion', 0, 0), false);
  assert.equal(hasValidMovementAmounts('variable_payment', 100, 5), false);
});

const validBody = {
  period: '2026-10',
  record_type: 'variable_payment',
  account_id: '11111111-1111-4111-8111-111111111111',
  amount_pesos: 1500,
  amount_dollars: 0,
};

test('API: un cuerpo válido pasa', () => {
  assert.equal(movementApiSchema.safeParse(validBody).success, true);
});

test('API: monto negativo, NaN, Infinity y strings devuelven error claro', () => {
  for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, '100', null, MAX_AMOUNT + 1]) {
    const r = movementApiSchema.safeParse({ ...validBody, amount_pesos: bad });
    assert.equal(r.success, false, `debería rechazar ${String(bad)}`);
    if (!r.success) assert.ok(r.error.flatten().fieldErrors.amount_pesos?.length);
  }
});

test('API: dos monedas a la vez, ambas en cero, fecha inválida y textos largos', () => {
  assert.equal(movementApiSchema.safeParse({ ...validBody, amount_dollars: 10 }).success, false);
  assert.equal(movementApiSchema.safeParse({ ...validBody, amount_pesos: 0 }).success, false);
  assert.equal(movementApiSchema.safeParse({ ...validBody, payment_date: '2026-02-30' }).success, false);
  assert.equal(movementApiSchema.safeParse({ ...validBody, payment_date: '15/10/2026' }).success, false);
  assert.equal(movementApiSchema.safeParse({ ...validBody, description: 'x'.repeat(501) }).success, false);
  assert.equal(movementApiSchema.safeParse({ ...validBody, dollar_rate: 0 }).success, false);
  assert.equal(
    movementApiSchema.safeParse({ ...validBody, record_type: 'conversion', amount_dollars: 10 }).success,
    true
  );
});

const installmentSchema = z.object(installmentScheduleFields).superRefine(refineInstallment);
const validInstallment = {
  total_installments: '12',
  paid_installments: '',
  monthly_amount_pesos: '1500.50',
  monthly_amount_dollars: '',
  total_amount_pesos: '',
  total_amount_dollars: '',
  pay_before_day: '10',
  start_period: '2026-10',
};

test('cuotas: un formulario válido pasa y normaliza vacíos', () => {
  const r = installmentSchema.safeParse(validInstallment);
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.paid_installments, 0);
    assert.equal(r.data.monthly_amount_dollars, 0);
    assert.equal(r.data.pay_before_day, 10);
  }
  const sinOpcionales = installmentSchema.safeParse({ ...validInstallment, pay_before_day: '', start_period: '' });
  assert.equal(sinOpcionales.success && sinOpcionales.data.pay_before_day, null);
});

test('cuotas: rechaza NaN, Infinity, negativos, doble moneda y cuotas inconsistentes', () => {
  const bad: Record<string, unknown>[] = [
    { monthly_amount_pesos: 'abc' },
    { monthly_amount_pesos: 'Infinity' },
    { monthly_amount_pesos: '-10' },
    { monthly_amount_dollars: '5' }, // pesos y dólares a la vez
    { monthly_amount_pesos: '0' }, // sin importe
    { total_amount_dollars: '100' }, // total en otra moneda
    { total_installments: '0' },
    { total_installments: '2.5' },
    { paid_installments: '13' }, // más pagadas que el total
    { paid_installments: '-1' },
    { pay_before_day: '32' },
    { start_period: '2026-13' },
  ];
  for (const override of bad) {
    assert.equal(
      installmentSchema.safeParse({ ...validInstallment, ...override }).success,
      false,
      JSON.stringify(override)
    );
  }
});

test('gastos fijos e ingresos recurrentes: una sola moneda', () => {
  const schema = z
    .object({ amount_pesos: formAmount, amount_dollars: formAmount })
    .superRefine((d, ctx) => refineOneCurrency(d.amount_pesos, d.amount_dollars, 'amount_pesos', ctx));
  assert.equal(schema.safeParse({ amount_pesos: '100', amount_dollars: '' }).success, true);
  assert.equal(schema.safeParse({ amount_pesos: '', amount_dollars: '20' }).success, true);
  assert.equal(schema.safeParse({ amount_pesos: '100', amount_dollars: '20' }).success, false);
  assert.equal(schema.safeParse({ amount_pesos: '', amount_dollars: '' }).success, false);
  assert.equal(schema.safeParse({ amount_pesos: '-1', amount_dollars: '' }).success, false);
  assert.equal(schema.safeParse({ amount_pesos: 'NaN', amount_dollars: '' }).success, false);
});
