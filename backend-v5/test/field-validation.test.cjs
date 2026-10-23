global.fetch = async () => { throw Error('network_forbidden'); };
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateProductField, ProductEvidenceFailure } = require('../dist/object-onboarding/field-validation');
const domain = require('../dist/object-onboarding/domain');
const { ProviderFailure } = require('../dist/review/provider');
const { decodeDiagnostic, locateDecodeFailure } = require('../dist/object-onboarding/decode-diagnostic');
const context = { kind: 'text', snapshot: { documentId: '11111111-1111-4111-8111-111111111111', documentVersion: 1, documentSha256: 'a'.repeat(64) }, pages: ['Synthetic'] };

test('extracted evidence failure retains the public constructor and structured error contract', () => {
 assert.equal(domain.ProductEvidenceFailure, ProductEvidenceFailure);
 assert.throws(() => validateProductField('name', { value: 'Synthetic', evidence: {} }, 'product_document', context, () => { throw new ProviderFailure('evidence_unverified'); }), error => {
  assert(error instanceof domain.ProductEvidenceFailure);
  assert(error instanceof ProviderFailure);
  assert.equal(error.code, 'evidence_unverified');
  assert.equal(error.field, 'name');
  assert.equal(error.reason, 'citation');
  return true;
 });
});

test('invalid field shape is rejected before reading evidence; region errors retain their location', () => {
 let reads = 0;
 assert.throws(() => validateProductField('brand', { value: 42, evidence: {} }, 'product_document', context, () => { reads++; throw Error('unreachable'); }));
 assert.equal(reads, 0);
 const regionError = locateDecodeFailure(Error('PRIVATE'), { section: 'source_region' });
 assert.throws(() => validateProductField('name', { value: 'Synthetic', evidence: {} }, 'product_document', context, () => { throw regionError; }), error => {
  assert.equal(error, regionError);
  assert.equal(error.code, 'analysis_invalid_output');
  assert.deepEqual(decodeDiagnostic(error), { validationSection: 'source_region' });
  assert(!JSON.stringify(decodeDiagnostic(error)).includes('PRIVATE'));
  return true;
 });
});

test('optional invalid fields preserve input order of warnings while invalid identity still fails', () => {
 const proof = excerpt => ({ page: 1, excerpt, region: null });
 const raw = { documentKind: 'product_document', hasMoreItems: false, items: [{ fields: {
  name: { value: 'Synthetic', evidence: proof('Synthetic') },
  model: { value: 'Invented', evidence: proof('Synthetic') },
  powerWatts: { value: '100', evidence: proof('100 kg') },
 }, quantity: null, nameTruncated: false, disposition: 'household_object', confidence: 'high' }] };
 const c = { ...context, pages: ['Synthetic\n100 kg'] };
 const out = domain.productExtraction(raw, c);
 assert.equal(out.items[0].fields.model, undefined);
 assert.equal(out.items[0].fields.powerWatts, undefined);
 assert.deepEqual(out.reviewWarnings.filter(w => w.field.startsWith('item:')), [
  { field: 'item:0:model', reason: 'unverified' }, { field: 'item:0:powerWatts', reason: 'unverified' },
 ]);
 assert.equal(out.needsReview, true);
 raw.items[0].fields.name.value = 'Invented';
 assert.throws(() => domain.productExtraction(raw, c), error => error instanceof ProductEvidenceFailure && error.reason === 'value' && error.field === 'name');
});
test('voltage ranges retain the printed en dash and require the original unit', () => {
 const proof = excerpt => ({ page: 1, excerpt, region: null });
 const raw = { documentKind: 'product_document', hasMoreItems: false, items: [{ fields: {
  name: { value: 'Synthetic', evidence: proof('Synthetic') },
  voltageVolts: { value: '220–240', evidence: proof('220–240 V') },
 }, quantity: null, nameTruncated: false, disposition: 'household_object', confidence: 'high' }] };
 const c = { ...context, pages: ['Synthetic\n220–240 V\n220–240 W'] };
 assert.equal(domain.productExtraction(raw, c).items[0].fields.voltageVolts.value, '220–240');
 raw.items[0].fields.voltageVolts.evidence = proof('220–240 W');
 assert.equal(domain.productExtraction(raw, c).items[0].fields.voltageVolts, undefined);
});
