import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSummary, countsAsExpense, toUsd } from './summary';
import type { Movement } from './definitions';

let n = 0;
function mv(o: Partial<Movement>): Movement {
  n += 1;
  return {
    id: `m${n}`,
    period: '2026-10',
    financial_period_id: 'fp',
    record_type: 'variable_payment',
    account_id: 'acc',
    credit_card_id: null,
    statement_id: null,
    category_id: null,
    category_name: null,
    description: null,
    status: null,
    amount_pesos: 0,
    amount_dollars: 0,
    payment_date: null,
    dollar_rate: null,
    exchange_rate: null,
    comment: null,
    created_at: '2026-10-01T00:00:00Z',
    user_id: 'u',
    source: 'app',
    is_statement_payment: false,
    ...o,
  };
}
const RATE = 1000; // 1000 pesos por USD

test('cargo con tarjeta sin status cuenta como gasto', () => {
  const cargo = mv({ credit_card_id: 'card', account_id: null, status: null, amount_dollars: 100 });
  assert.equal(countsAsExpense(cargo), true);
  const s = computeSummary([cargo], RATE);
  assert.equal(s.totalExpense, 100);
  assert.equal(s.expenseCount, 1);
});

test('cargo con tarjeta con status false también cuenta', () => {
  assert.equal(computeSummary([mv({ credit_card_id: 'card', account_id: null, status: false, amount_dollars: 50 })], RATE).totalExpense, 50);
});

test('el pago del resumen NO cuenta: el gasto no se duplica', () => {
  const cargo = mv({ credit_card_id: 'card', account_id: null, amount_dollars: 100 });
  const pago = mv({ record_type: 'fixed_payment', status: true, amount_dollars: 100, is_statement_payment: true });
  const s = computeSummary([cargo, pago], RATE);
  assert.equal(s.totalExpense, 100, 'se cuenta una sola vez');
  assert.equal(s.fixedTotal, 0, 'el pago del resumen tampoco entra como gasto fijo');
  assert.equal(s.expenseCount, 1, 'el pago de resumen no suma al contador de egresos');
  assert.equal(countsAsExpense(pago), false);
});

test('gasto en pesos se convierte con la tasa y conserva los pesos crudos', () => {
  const gasto = mv({ status: true, amount_pesos: 600_000 });
  assert.equal(toUsd(gasto, RATE), 600);
  const s = computeSummary([gasto], RATE);
  assert.equal(s.totalExpense, 600);
  assert.equal(s.totalExpensePesos, 600_000);
  assert.equal(s.variableTotalPesos, 600_000);
});

test('ingreso en pesos: el balance no queda en 0 (sueldo 1.000.000 y gastos 600.000)', () => {
  const sueldo = mv({ record_type: 'income', amount_pesos: 1_000_000 });
  const gasto = mv({ status: true, amount_pesos: 600_000 });
  const s = computeSummary([sueldo, gasto], RATE);
  assert.equal(s.totalIncome, 1000);
  assert.equal(s.totalExpense, 600);
  assert.equal(s.balance, 400);
  assert.equal(s.totalIncomePesos, 1_000_000);
  assert.equal(s.incomeCount, 1);
});

test('egreso común pendiente (sin tarjeta, status distinto de true) no cuenta todavía', () => {
  for (const status of [null, false]) {
    const pendiente = mv({ status, amount_dollars: 80 });
    assert.equal(countsAsExpense(pendiente), false);
    const s = computeSummary([pendiente], RATE);
    assert.equal(s.totalExpense, 0);
    assert.equal(s.expenseCount, 1, 'sí se cuenta como egreso registrado');
  }
  assert.equal(computeSummary([mv({ status: true, amount_dollars: 80 })], RATE).totalExpense, 80);
});

test('sin tasa, los pesos aportan 0 y los dólares se mantienen', () => {
  const s = computeSummary([mv({ status: true, amount_pesos: 500_000, amount_dollars: 0 }), mv({ status: true, amount_dollars: 20 })], null);
  assert.equal(s.totalExpense, 20);
  assert.equal(s.totalExpensePesos, 500_000);
});

test('separa fijos y variables y agrupa por categoría ordenado por monto', () => {
  const s = computeSummary(
    [
      mv({ record_type: 'fixed_payment', status: true, amount_dollars: 300, category_name: 'Vivienda' }),
      mv({ status: true, amount_dollars: 100, category_name: ' Hogar ' }),
      mv({ status: true, amount_dollars: 50 }),
    ],
    RATE
  );
  assert.equal(s.fixedTotal, 300);
  assert.equal(s.variableTotal, 150);
  assert.deepEqual(s.categoryTotals, [
    { name: 'Vivienda', amount: 300 },
    { name: 'Hogar', amount: 100 },
    { name: 'Sin categoría', amount: 50 },
  ]);
});

test('las conversiones no son ni ingreso ni gasto', () => {
  const s = computeSummary([mv({ record_type: 'conversion', amount_pesos: 100_000, amount_dollars: 100 })], RATE);
  assert.equal(s.totalIncome + s.totalExpense + s.incomeCount + s.expenseCount, 0);
});

test('sin cotización: el USD con pesos queda marcado como incompleto', () => {
  const s = computeSummary(
    [
      mv({ record_type: 'income', amount_pesos: 1_000_000 }),
      mv({ status: true, amount_pesos: 600_000 }), // variable en pesos
      mv({ record_type: 'fixed_payment', status: true, amount_pesos: 100_000 }), // fijo en pesos
    ],
    null
  );
  assert.deepEqual(s.incomplete, { income: true, expense: true, variable: true, fixed: true, balance: true });
  assert.equal(s.totalIncome, 0, 'los pesos no se convirtieron');
});

test('sin cotización pero todo en dólares: el USD es exacto y NO se marca incompleto', () => {
  const s = computeSummary(
    [mv({ record_type: 'income', amount_dollars: 5000 }), mv({ status: true, amount_dollars: 200 })],
    null
  );
  assert.deepEqual(s.incomplete, { income: false, expense: false, variable: false, fixed: false, balance: false });
  assert.equal(s.balance, 4800);
});

test('con cotización válida nada queda incompleto aunque haya pesos', () => {
  const s = computeSummary([mv({ record_type: 'income', amount_pesos: 1_000_000 }), mv({ status: true, amount_pesos: 1000 })], 1500);
  assert.equal(Object.values(s.incomplete).some(Boolean), false);
  for (const bad of [0, -5, Number.NaN]) {
    assert.equal(computeSummary([mv({ status: true, amount_pesos: 10 })], bad as number).incomplete.expense, true, `tasa ${bad}`);
  }
});

test('sin cotización: solo se marca lo que realmente tiene pesos', () => {
  const s = computeSummary([mv({ record_type: 'income', amount_dollars: 100 }), mv({ status: true, amount_pesos: 50_000 })], null);
  assert.equal(s.incomplete.income, false);
  assert.equal(s.incomplete.expense, true);
  assert.equal(s.incomplete.variable, true);
  assert.equal(s.incomplete.fixed, false);
  assert.equal(s.incomplete.balance, true);
});
