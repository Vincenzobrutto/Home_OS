require('reflect-metadata');
const { test } = require('node:test'), assert = require('node:assert/strict');
const { digest } = require('../dist/security');
const { ReceiptReleasePolicy } = require('../dist/receipt-assistance/release-policy');
const { receiptFixturePdf } = require('../dist/receipt-assistance/fixture-provider');
const policy = new ReceiptReleasePolicy();
const source = kind => { const bytes = receiptFixturePdf(kind); return { original: { sha256: digest(bytes), mimeType: 'application/pdf', byteSize: bytes.length } }; };
test('Browser release accepts only four known synthetic PDF originals', () => {
  for (const kind of ['purchase', 'multiple', 'unreadable', 'unsupported']) { assert.equal(policy.allows(source(kind)), true); policy.require(source(kind)); }
  assert.equal(policy.allows({ original: { ...source('purchase').original, sha256: digest('personal receipt') } }), false);
  assert.throws(() => policy.require({ original: { ...source('purchase').original, sha256: digest('personal receipt') } }), e => e.getStatus() === 503 && e.getResponse().code === 'receipt_assistance_in_development');
});
test('Browser release rejects missing, mismatched-type and excessive source metadata', () => {
  assert.equal(policy.allows(null), false); assert.equal(policy.allows({ original: null }), false);
  for (const patch of [{ mimeType: 'image/png' }, { byteSize: 0 }, { byteSize: 11 * 1024 * 1024 }]) assert.equal(policy.allows({ original: { ...source('purchase').original, ...patch } }), false);
});
test('Browser provider is explicitly local simulation with no transfer consent or paid provider', () => {
  const providers = policy.providers(); assert.equal(providers.length, 1); assert.equal(providers[0].id, 'receipt_fixture_v1'); assert.equal(providers[0].requiresConsent, false); assert.match(providers[0].label, /Simulazione/);
});
