require('reflect-metadata');
const { test } = require('node:test'), assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
const { intakeManifest, classificationParts, collectionsFor, organizationSelection, identicalOriginal, INTAKE_LIMITS } = require('../dist/document-intake/domain');
const file = (over = {}) => ({ clientItemId: randomUUID(), filename: 'APE.pdf', mimeType: 'application/pdf', byteSize: 100, ...over });
const parts = [{ kind: 'cila', pageFrom: 1, pageTo: 10 }, { kind: 'agibility', pageFrom: 11, pageTo: 14 }];
const selection = (over = {}) => ({ action: 'organize', title: 'CILA e agibilità', parts, target: { kind: 'home' }, ...over });

test('Intake manifest: independent identities, accepted file types and additive limits without reading files', () => {
  const items = [file(), file({ filename: 'Schema.png', mimeType: 'image/png' }), file({ filename: 'Foto.jpg', mimeType: 'image/jpeg' })];
  assert.deepEqual(intakeManifest({ items }), { items });
  assert.throws(() => intakeManifest({ items: [] })); assert.throws(() => intakeManifest({ items: Array.from({ length: 21 }, () => file()) }));
  assert.throws(() => intakeManifest({ items: [items[0], items[0]] }));
  for (const over of [{ byteSize: 0 }, { byteSize: 1.5 }, { byteSize: INTAKE_LIMITS.maxFileBytes + 1 }, { mimeType: 'application/zip' }, { filename: '../APE.pdf' }, { filename: 'APE\u0000.pdf' }, { clientItemId: 'wrong' }]) assert.throws(() => intakeManifest({ items: [file(over)] }));
  assert.throws(() => intakeManifest({ items, accountId: randomUUID() }));
});
test('Intake manifest: total bytes bounded independently of per-file limit', () => {
  const items = Array.from({ length: 10 }, () => file({ byteSize: 20 * 1024 * 1024 })); assert.equal(intakeManifest({ items }).items.length, 10);
  assert.throws(() => intakeManifest({ items: [...items, file()] }), error => error.getResponse().code === 'intake_batch_limit_exceeded');
});
test('Classification: one multi-content document, exact derived collections and no expense families', () => {
  assert.deepEqual(classificationParts(parts, 14, 'extraction'), parts); assert.deepEqual(collectionsFor(parts), ['building']);
  assert.deepEqual(collectionsFor([{ kind: 'ape' }, { kind: 'condominium_rules' }, { kind: 'receipt' }]), ['energy', 'condominium', 'purchases']);
  assert.throws(() => classificationParts([...parts, parts[0]], 14, 'extraction'));
  assert.throws(() => classificationParts([{ kind: 'constructor', pageFrom: 1, pageTo: 1 }], 1, 'extraction'));
});
test('Classification: ranges bounded by known pages, no fabricated page on extracted output', () => {
  for (const [pageFrom, pageTo] of [[0, 1], [2, 1], [1, 15], [1.5, 2], [null, 2], [1, null]]) assert.throws(() => classificationParts([{ kind: 'ape', pageFrom, pageTo }], 14, 'extraction'));
  assert.throws(() => classificationParts([{ kind: 'ape', pageFrom: null, pageTo: null }], null, 'extraction'));
  assert.throws(() => classificationParts(parts, null, 'extraction'));
  assert.deepEqual(classificationParts([{ kind: 'other', pageFrom: null, pageTo: null }], null, 'user_declared'), [{ kind: 'other', pageFrom: null, pageTo: null }]);
});
test('Organization: house documents need no target asset, expense or share, and defer is independent', () => {
  assert.deepEqual(organizationSelection(selection(), 14), selection()); assert.deepEqual(organizationSelection({ action: 'defer' }, null), { action: 'defer' });
  for (const over of [{ visibility: 'home' }, { accountId: randomUUID() }, { createExpense: true }, { title: '' }, { title: 'x'.repeat(121) }, { title: 'APE\u0000' }]) assert.throws(() => organizationSelection(selection(over), 14));
  assert.throws(() => organizationSelection({ action: 'defer', title: 'Ignored silently?' }, null));
});
test('Organization: existing target must be explicit and versioned; no implicit new object or overwrite', () => {
  for (const kind of ['object', 'boiler']) { const target = { kind, id: randomUUID(), expectedVersion: 2 }; assert.deepEqual(organizationSelection(selection({ target }), 14).target, target); }
  for (const target of [{ kind: 'new_object' }, { kind: 'object', id: randomUUID() }, { kind: 'home', id: randomUUID() }, { kind: 'boiler', id: randomUUID(), expectedVersion: 0 }]) assert.throws(() => organizationSelection(selection({ target }), 14));
});
test('Duplicate candidate requires exact content hash and byte count, never filename matching', () => {
  const a = { sha256: 'a'.repeat(64), byteSize: 100 }; assert.equal(identicalOriginal(a, { ...a }), true);
  assert.equal(identicalOriginal(a, { ...a, sha256: 'b'.repeat(64) }), false); assert.equal(identicalOriginal(a, { ...a, byteSize: 101 }), false);
  assert.equal(identicalOriginal({ ...a, sha256: 'invalid' }, { ...a, sha256: 'invalid' }), false); assert.equal(identicalOriginal({ ...a, byteSize: 0 }, { ...a, byteSize: 0 }), false);
});
