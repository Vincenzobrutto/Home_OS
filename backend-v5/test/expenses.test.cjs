const { test } = require('node:test');
const assert = require('node:assert/strict');
const d = require('../dist/expenses/domain');
const today = '2026-10-14';
test('H3: importi centesimi esatti e limiti senza coercizioni', () => {
  assert.equal(d.amountCents(10) + d.amountCents(20), 30);
  for (const value of [0, -1, 1.1, NaN, Infinity, '100', null, 1000000000]) assert.throws(() => d.amountCents(value));
  assert.equal(d.amountCents(999999999), 999999999);
});
test('H3: date di calendario sostenute, non future o impossibili', () => {
  assert.equal(d.spentOn('2000-02-29', today), '2000-02-29');
  assert.equal(d.spentOn('0001-01-01', today), '0001-01-01');
  for (const value of ['2026-02-29', '2026-10-15', null, '', '2026-10-14T00:00:00Z']) assert.throws(() => d.spentOn(value, today));
});
test('H3: campi personali, NFC e modifiche esplicite senza valuta/stato fidati dal client', () => {
  const base = { title: '  caffe\u0301  ', amountCents: 123450, spentOn: today };
  assert.equal(d.createExpense(base, today).title, 'caffé');
  for (const extra of [{ currency: 'USD' }, { state: 'archived' }, { accountId: 'other' }, { origin: 'document' }]) assert.throws(() => d.createExpense({ ...base, ...extra }, today));
  assert.throws(() => d.updateExpense({ expectedVersion: 1 }, today));
  assert.deepEqual(d.updateExpense({ expectedVersion: 2, documentId: null, note: '' }, today), { expectedVersion: 2, documentId: null, note: null });
  assert.throws(() => d.createExpense({ ...base, title: '🏠'.repeat(121) }, today));
});
test('H3: query ripetute/sconosciute e cursor non valido rifiutati', () => {
  for (const query of [{ year: ['2026'] }, { limit: '51' }, { state: 'paid' }, { source: 'estimate' }, { year: '0000' }, { amount: '1' }, { cursor: '!' }]) assert.throws(() => d.expenseQuery(query));
  assert.equal(d.expenseQuery({ year: '0001', limit: '50' }).year, '0001');
  assert.throws(() => d.expenseQuery({ state: 'active' }, true));
  assert.throws(() => d.expenseQuery({ year: '2026' }, false, true));
});
