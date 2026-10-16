require('reflect-metadata');
const { test } = require('node:test'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { digest } = require('../dist/security');
const { ReceiptFixtureProvider, receiptFixturePdf, receiptFixtureKind } = require('../dist/receipt-assistance/fixture-provider');
const input = kind => { const bytes = receiptFixturePdf(kind); return { bytes, snapshot: { documentId: randomUUID(), documentVersion: 1, documentSha256: digest(bytes) } }; };

test('Receipt simulation: actual PDF subprocess and citation validation before returning proposals', async () => {
  const provider = new ReceiptFixtureProvider(), doc = input('purchase');
  assert.equal(provider.isSimulation, true); assert.equal(receiptFixtureKind(doc.snapshot.documentSha256), 'purchase');
  const result = await provider.analyze(doc, '2026-10-16');
  assert.equal(result.fields.brand.value, 'Lume'); assert.equal(result.fields.model.value, 'Mini 90');
  assert.equal(result.fields.documentDate.value, '2026-09-15'); assert.equal(result.total.amountCents, 17990);
  assert.equal(result.total.sources[0].excerpt, 'Totale documento: 179,90 EUR');
  assert.equal(result.total.sources[0].documentId, doc.snapshot.documentId); assert.equal(result.total.sources[0].sha256, doc.snapshot.documentSha256);
});
test('Receipt simulation rejects unknown hashes before invoking parser; no filename or marker fallback', async () => {
  let calls = 0; const provider = new ReceiptFixtureProvider({ extract: async () => { calls++; throw Error('Must not parse'); } });
  const doc = input('purchase'); doc.snapshot.documentSha256 = digest(Buffer.from('Unknown real document'));
  await assert.rejects(() => provider.analyze(doc, '2026-10-16'), e => e.code === 'provider_fixture_unsupported'); assert.equal(calls, 0);
});
test('Receipt simulation checks exact original bytes, not only claimed fixture metadata', async () => {
  const doc = input('purchase'); doc.bytes = Buffer.from('Not the approved PDF');
  await assert.rejects(() => new ReceiptFixtureProvider().analyze(doc, '2026-10-16'), e => e.code === 'storage_unavailable');
});
test('Receipt simulation: multiple articles and unrelated property document never yield purchase proposals', async () => {
  const provider = new ReceiptFixtureProvider();
  await assert.rejects(() => provider.analyze(input('multiple'), '2026-10-16'), e => e.code === 'receipt_multiple_items_unsupported');
  await assert.rejects(() => provider.analyze(input('unsupported'), '2026-10-16'), e => e.code === 'receipt_document_unsupported');
});
test('Receipt simulation: real blank PDF has no text; manual path must stay available', async () => {
  await assert.rejects(() => new ReceiptFixtureProvider().analyze(input('unreadable'), '2026-10-16'), e => e.code === 'pdf_text_unavailable');
});
