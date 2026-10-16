const { test } = require('node:test');
const assert = require('node:assert/strict');
const d = require('../dist/receipt-assistance/domain');
const snapshot = { documentId: '00000000-0000-4000-8000-000000000001', documentVersion: 1, documentSha256: 'a'.repeat(64) };
const page = 'Marca Lume\nModello Mini 90\n15 settembre 2026\nTotale EUR 179,90\nIVA EUR 32,44';
const source = excerpt => ({ documentId: snapshot.documentId, documentVersion: 1, sha256: snapshot.documentSha256, page: 1, excerpt });
const proposed = (value, excerpt) => ({ value, sources: [source(excerpt)] });
const input = () => ({ documentKind: 'purchase_receipt', multipleItems: false, fields: { brand: proposed('Lume', 'Marca Lume'), model: proposed('Mini 90', 'Modello Mini 90') }, total: { amountCents: 17990, sources: [source('Totale EUR 179,90')] } });
const parse = row => d.receiptExtraction(row, [page], snapshot, '2026-10-16');
const fails = (fn, code) => assert.throws(fn, error => error.code === code);

test('receipt: exact evidence and total; absent optional fields remain absent', () => {
  const result = parse(input());
  assert.equal(result.fields.brand.value, 'Lume');
  assert.equal(result.total.amountCents, 17990);
  assert.equal(result.fields.supplier, undefined);
  assert.equal(parse({ ...input(), total: null }).total, null);
});
test('receipt: wrong source snapshot, fabricated excerpt/value and fields rejected', () => {
  const value = input(); value.fields.brand.sources[0].sha256 = 'b'.repeat(64);
  fails(() => parse(value), 'evidence_unverified');
  for (const field of [proposed('Inventata', 'Marca Lume'), proposed('Lume', 'Testo mai presente')]) {
    fails(() => parse({ ...input(), fields: { brand: field } }), 'evidence_unverified');
  }
  fails(() => parse({ ...input(), fields: { warranty: proposed('2 anni', page) } }), 'analysis_invalid_output');
});
test('receipt: multiple items and no data explicitly rejected', () => {
  fails(() => parse({ ...input(), multipleItems: true }), 'receipt_multiple_items_unsupported');
  fails(() => parse({ ...input(), fields: {}, total: null }), 'receipt_no_supported_data');
  fails(() => parse({ ...input(), multipleItems: undefined }), 'analysis_invalid_output');
});
test('receipt: tax and incorrect totals cannot become the purchase cost', () => {
  fails(() => parse({ ...input(), total: { amountCents: 3244, sources: [source('IVA EUR 32,44')] } }), 'evidence_unverified');
  fails(() => parse({ ...input(), total: { amountCents: 17991, sources: [source('Totale EUR 179,90')] } }), 'evidence_unverified');
  for (const amountCents of [0, -1, 1.5, '17990', 1000000000]) fails(() => parse({ ...input(), total: { amountCents, sources: [source('Totale EUR 179,90')] } }), 'analysis_invalid_output');
});
test('receipt: date needs printed evidence and cannot be future', () => {
  assert.equal(parse({ ...input(), fields: { documentDate: proposed('2026-09-15', '15 settembre 2026') } }).fields.documentDate.value, '2026-09-15');
  fails(() => parse({ ...input(), fields: { documentDate: proposed('2026-10-17', '15 settembre 2026') } }), 'analysis_invalid_output');
  fails(() => parse({ ...input(), fields: { documentDate: proposed('2026-09-16', '15 settembre 2026') } }), 'evidence_unverified');
});
test('receipt: fill empty field with evidence or manual origin, never invented citations', () => {
  const p = parse(input()).fields.brand;
  assert.equal(d.resolveReceiptField('brand', null, p, { action: 'accept' }).value.origin, 'extraction_confirmed');
  const manual = d.resolveReceiptField('brand', null, p, { action: 'manual', value: '  Aurora ' });
  assert.deepEqual(manual.value, { value: 'Aurora', origin: 'user_declared', sources: [] });
  assert.throws(() => d.resolveReceiptField('brand', null, null, { action: 'accept' }));
});
test('receipt: confirmed fields retained, conflict decision explicit and deferred proposal kept', () => {
  const old = { value: 'Aurora', origin: 'user_declared', sources: [] }, p = parse(input()).fields.brand;
  assert.equal(d.resolveReceiptField('brand', old, p, { action: 'keep_existing' }).value, old);
  assert.deepEqual(d.resolveReceiptField('brand', old, p, { action: 'defer' }), { value: old, state: 'deferred', pending: p });
  for (const action of ['accept', 'manual']) assert.throws(() => d.resolveReceiptField('brand', old, p, { action, ...(action === 'manual' ? { value: 'Lume' } : {}) }), e => e.getResponse().code === 'receipt_field_conflict');
  assert.throws(() => d.resolveReceiptField('brand', old, p, {}));
  assert.throws(() => d.resolveReceiptField('brand', old, p, { action: 'keep_existing', value: 'Lume' }));
});
test('receipt: identical confirmation keeps its old provenance; skip never removes a value', () => {
  const old = { value: 'Lume', origin: 'user_declared', sources: [] }, p = parse(input()).fields.brand;
  assert.equal(d.resolveReceiptField('brand', old, p, { action: 'accept' }).value, old);
  assert.equal(d.resolveReceiptField('brand', old, p, { action: 'skip' }).value, old);
  assert.throws(() => d.resolveReceiptField('brand', old, p, { action: 'defer' }));
});
test('receipt: candidate scope and explicit source priority, no name-only matching', () => {
  const scope = { accountId: 'a', homeId: 'h', documentId: snapshot.documentId };
  const row = { id: 'linked', accountId: 'a', homeId: 'h', state: 'active', name: 'Macchina del caffè', brand: null, model: null, documentIds: [scope.documentId] };
  const matched = { ...row, id: 'matched', documentIds: [], brand: 'lume', model: 'Mini 90' };
  const rows = [matched, row, { ...row, id: 'name-only', documentIds: [] }, { ...row, id: 'private-other', accountId: 'b' }, { ...matched, id: 'other-home', homeId: 'other' }, { ...row, id: 'archived', state: 'archived' }];
  assert.deepEqual(d.receiptObjectCandidates(rows, scope, parse(input())), [{ id: 'linked', reasons: ['same_document'] }, { id: 'matched', reasons: ['same_brand_model'] }]);
});
test('receipt: multiple authorized explicit candidates remain a choice, not the first row', () => {
  const scope = { accountId: 'a', homeId: 'h', documentId: snapshot.documentId };
  const row = { id: 'kitchen', accountId: 'a', homeId: 'h', state: 'active', name: 'Macchina', brand: null, model: null, documentIds: [scope.documentId] };
  assert.equal(d.receiptObjectCandidates([row, { ...row, id: 'studio' }], scope, parse(input())).length, 2);
});

const { receiptConfirmation } = require('../dist/receipt-assistance/confirmation');
const manualChoice = () => ({ expectedVersion: 1, object: { action: 'create', values: { name: 'Coffee', brand: null, model: null }, origins: { name: 'manual', brand: null, model: null } }, expense: { action: 'skip' } });
test('receipt confirmation: strict actions, canonical names and no injected citations/counts', () => {
  const base = manualChoice();
  assert.equal(receiptConfirmation({ ...base, object: { ...base.object, values: { ...base.object.values, name: ' Cafe\u0301  prova ' } } }, '2026-10-16').object.values.name, 'Café prova');
  for (const body of [{ ...base, accountId: 'foreign' }, { ...base, sources: [] }, { ...base, newObjects: 1 }, { ...base, object: { action: 'skip', targetId: snapshot.documentId } }]) assert.throws(() => receiptConfirmation(body, '2026-10-16'));
  assert.throws(() => receiptConfirmation({ ...base, object: { ...base.object, origins: { ...base.object.origins, brand: 'extraction' } } }, '2026-10-16'));
  assert.throws(() => receiptConfirmation({ ...base, object: { action: 'reuse', targetId: snapshot.documentId, targetVersion: 1, fields: [{ field: 'brand', action: 'skip' }, { field: 'brand', action: 'defer' }] } }, '2026-10-16'));
});
test('receipt confirmation: bounded cost, calendar and reuse versions authoritative', () => {
  const base = manualChoice(), expense = { action: 'create', values: { title: 'Coffee', amountCents: 100, spentOn: '2026-09-15', supplier: null }, origins: { title: 'manual', amount: 'manual', date: 'manual', supplier: null } };
  assert.equal(receiptConfirmation({ ...base, expense }, '2026-10-16').expense.values.amountCents, 100);
  for (const values of [{ ...expense.values, amountCents: 0 }, { ...expense.values, spentOn: '2026-02-30' }, { ...expense.values, spentOn: '2026-10-17' }]) assert.throws(() => receiptConfirmation({ ...base, expense: { ...expense, values } }, '2026-10-16'));
  assert.throws(() => receiptConfirmation({ ...base, expense: { action: 'reuse', targetId: snapshot.documentId, targetVersion: '1' } }, '2026-10-16'));
});
