import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatUsd, formatUsdOrDash } from './utils';

test('formatUsdOrDash muestra "—" solo cuando el importe está incompleto', () => {
  assert.equal(formatUsdOrDash(1234.5, true), '—');
  assert.equal(formatUsdOrDash(1234.5, false), formatUsd(1234.5));
  assert.equal(formatUsdOrDash(1234.5, undefined), formatUsd(1234.5));
  assert.notEqual(formatUsdOrDash(0, false), '—', 'un 0 real no es "—"');
});
