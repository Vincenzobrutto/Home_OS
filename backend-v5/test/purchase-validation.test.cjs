global.fetch = async () => { throw Error('network_forbidden'); };
const { test } = require('node:test'), assert = require('node:assert/strict');
const { HttpException } = require('@nestjs/common');
const { validateProductQuantity, validateProductAmount, validatePurchaseTotal } = require('../dist/object-onboarding/purchase-validation');
const { ProductEvidenceFailure, productExtraction } = require('../dist/object-onboarding/domain');
const { ProviderFailure } = require('../dist/review/provider');
const { verifiedInvoiceLine } = require('../dist/object-onboarding/invoice-lines');
const snapshot = { documentId: '11111111-1111-4111-8111-111111111111', documentVersion: 1, documentSha256: 'a'.repeat(64) };
const name = 'Synthetic Unit Δ';
const source = excerpt => ({ documentId: snapshot.documentId, documentVersion: 1, sha256: snapshot.documentSha256, page: 1, excerpt, basis: 'verified_text', region: null });
const primary = { value: name, source: source(name) }, fields = { name: primary };
const context = { kind: 'text', snapshot, pages: [name] };
const proof = excerpt => ({ page: 1, excerpt, region: null });
const failure = (field, reason) => error => error instanceof ProductEvidenceFailure && error.code === 'evidence_unverified' && error.field === field && error.reason === reason;

test('quantity rejects invalid structure/value before citation; price and total retain citation-first error precedence', () => {
 let reads = 0; const unavailable = new ProviderFailure('storage_unavailable');
 const read = () => { reads++; throw unavailable; };
 assert.throws(() => validateProductQuantity({ value: 0, evidence: {} }, context, fields, primary, null, { maxUnits: 20 }, read), e => e instanceof HttpException && e.getStatus() === 422);
 assert.equal(reads, 0);
 assert.throws(() => validateProductAmount({ amountCents: 0, evidence: {} }, 'purchase_document', fields, null, read), e => e === unavailable);
 assert.throws(() => validatePurchaseTotal({ amountCents: 0, evidence: {} }, 'purchase_document', read), e => e === unavailable);
 assert.equal(reads, 2);
 assert.throws(() => validateProductAmount({ amountCents: 0, evidence: {}, forged: true }, 'purchase_document', fields, null, read), e => e instanceof HttpException);
 assert.equal(reads, 2);
});

test('explicit verified invoice row retains canonical source; mismatched quantity and price never replace it silently', () => {
 const row = name + ' Quantità: 2 99,80 EUR', ctx = { ...context, pages: ['Descrizione Quantità/periodo Importo\n' + row] };
 const line = verifiedInvoiceLine(ctx, name, 1); assert(line);
 const read = () => source(row);
 const quantity = validateProductQuantity({ value: 2, evidence: {} }, ctx, fields, primary, line, { maxUnits: 20 }, read);
 const price = validateProductAmount({ amountCents: 9980, evidence: {} }, 'purchase_document', fields, line, read);
 assert.equal(quantity.value, 2); assert.equal(quantity.source, line.source);
 assert.equal(price.amountCents, 9980); assert.equal(price.source, line.source);
 assert.throws(() => validateProductQuantity({ value: 1, evidence: {} }, ctx, fields, primary, line, { maxUnits: 20 }, read), failure('quantity', 'quantity'));
 assert.throws(() => validateProductAmount({ amountCents: 4990, evidence: {} }, 'purchase_document', fields, line, read), failure('purchaseTotal', 'total'));
});

test('price keeps integer EUR bounds and the historical purchaseTotal error classification', () => {
 const read = () => source(name + ' Totale riga: 49,90 EUR');
 assert.equal(validateProductAmount({ amountCents: 4990, evidence: {} }, 'order_confirmation', fields, null, read).amountCents, 4990);
 for (const amountCents of [0, -1, 1.5, NaN, Infinity, 1000000000, '4990']) assert.throws(() => validateProductAmount({ amountCents, evidence: {} }, 'purchase_document', fields, null, read), failure('purchaseTotal', 'total'));
 for (const documentKind of ['product_document', 'device_label', 'delivery_notice']) assert.throws(() => validateProductAmount({ amountCents: 4990, evidence: {} }, documentKind, fields, null, read), failure('purchaseTotal', 'total'));
 assert.throws(() => validateProductAmount({ amountCents: 4990, evidence: {} }, 'purchase_document', fields, null, () => source(name + ' Totale riga: 49,90 USD')), failure('purchaseTotal', 'total'));
});

test('document total accepts the printed grand total, never a row or an unprinted amount', () => {
 const read = () => source('Totale documento: 99,80 EUR');
 assert.equal(validatePurchaseTotal({ amountCents: 9980, evidence: {} }, 'purchase_document', read).amountCents, 9980);
 assert.throws(() => validatePurchaseTotal({ amountCents: 4990, evidence: {} }, 'purchase_document', read), failure('purchaseTotal', 'total'));
 assert.throws(() => validatePurchaseTotal({ amountCents: 9980, evidence: {} }, 'purchase_document', () => source(name + ' Totale riga: 99,80 EUR')), failure('purchaseTotal', 'total'));
});

test('orchestrator preserves optional-warning order, omits invalid explicit amounts and never divides a document total', () => {
 const row = name + ' Totale riga: 49,90 EUR', total = 'Totale documento: 99,80 EUR';
 const raw = { documentKind: 'purchase_document', hasMoreItems: false, items: [{ fields: { name: { value: name, evidence: proof(name) } }, quantity: { value: 0, evidence: proof('Quantità: 2') }, purchaseAmount: { amountCents: 5000, evidence: proof(row) }, nameTruncated: false, disposition: 'household_object', confidence: 'high' }], purchaseTotal: { amountCents: 123, evidence: proof(total) } };
 const out = productExtraction(raw, { ...context, pages: [[name, 'Quantità: 2', row, total].join('\n')] });
 assert.equal(out.items[0].quantity, null); assert.equal(out.items[0].purchaseAmount, undefined); assert.equal(out.purchaseTotal, null); assert.equal(out.needsReview, true);
 assert.deepEqual(out.reviewWarnings, [ { field: 'item:0:quantity', reason: 'unverified' }, { field: '0:purchaseAmount', reason: 'unverified' }, { field: 'purchaseTotal', reason: 'unverified' } ]);
});
