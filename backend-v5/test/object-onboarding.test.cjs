require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { productExtraction, productCandidates, productChoices, productConfirmation } = require('../dist/object-onboarding/domain');
const { ObjectOnboardingAnthropicProvider } = require('../dist/object-onboarding/anthropic-provider');
const { AnthropicTransport } = require('../dist/review/anthropic');
const { PdfTextExtractor } = require('../dist/review/pdf-text');
const { receiptFixturePdf } = require('../dist/receipt-assistance/fixture-provider');
const { digest } = require('../dist/security');
const snapshot = { documentId: randomUUID(), documentVersion: 1, documentSha256: digest('synthetic only') };
const label = 'Lume Speaker Mini', line = label + '\nMarca: Lume\nModello: Mini\nQuantità: 1';
const textContext = { kind: 'text', snapshot, pages: [line] };
const imageContext = { kind: 'image', snapshot };
const proof = (excerpt, image = false) => ({ page: 1, excerpt, region: image ? { x: .1, y: .2, width: .8, height: .1 } : null });
const field = (value, image = false) => ({ value, evidence: proof(value, image) });
const raw = (image = false) => ({ documentKind: 'delivery_notice', hasMoreItems: false, items: [{ fields: { name: field(label, image), brand: field('Lume', image), model: field('Mini', image) }, quantity: { value: 1, evidence: proof('Quantità: 1', image) }, nameTruncated: false, disposition: 'household_object', confidence: 'high' }] });
const fails = (fn, code) => assert.throws(fn, error => code ? error.code === code : !!error);

test('delivery without price proposes an object, never a cost or delivered status', () => {
  const result = productExtraction(raw(), textContext);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].fields.name.value, label);
  assert.equal(result.items[0].fields.name.source.basis, 'verified_text');
  assert.deepEqual(Object.keys(result).sort(), ['documentKind', 'items', 'needsReview']);
  const plan = productChoices([{ itemId: result.items[0].id, action: 'create', name: label, units: 1 }], result);
  assert.equal(plan.newObjects, 1); assert.equal(plan.expenses, 0);
});
test('image observation is bound to the original, explicitly not text-verified', () => {
  const result = productExtraction(raw(true), imageContext);
  const source = result.items[0].fields.name.source;
  assert.equal(source.basis, 'provider_observed_image');
  assert.equal(source.sha256, snapshot.documentSha256); assert.equal(source.documentId, snapshot.documentId);
  assert.deepEqual(source.region, { x: .1, y: .2, width: .8, height: .1 });
});
test('invalid region/page, forged image citations and invented text claims are rejected', () => {
  for (const region of [null, { x: .9, y: .1, width: .5, height: .2 }, { x: 0, y: 0, width: 0, height: .3 }]) {
    const data = raw(true); data.items[0].fields.name.evidence.region = region;
    fails(() => productExtraction(data, imageContext), 'analysis_invalid_output');
  }
  const data = raw(true); data.items[0].fields.name.evidence.page = 2;
  fails(() => productExtraction(data, imageContext), 'analysis_invalid_output');
  const invented = raw(); invented.items[0].fields.model = field('Max');
  fails(() => productExtraction(invented, textContext), 'evidence_unverified');
  invented.items[0].fields.model.evidence.documentId = randomUUID();
  fails(() => productExtraction(invented, textContext), 'analysis_invalid_output');
});
test('multiple items survive independently; identical repeated row and silent truncation fail', () => {
  const data = raw(), second = structuredClone(data.items[0]);
  second.fields.name = field('Lume Lamp'); second.fields.model = field('Lamp');
  data.items.push(second);
  const result = productExtraction(data, { ...textContext, pages: [line + '\nLume Lamp\nLamp'] });
  assert.equal(result.items.length, 2); assert.notEqual(result.items[0].id, result.items[1].id);
  data.items.push(structuredClone(second));
  fails(() => productExtraction(data, { ...textContext, pages: [line + '\nLume Lamp\nLamp'] }), 'object_onboarding_repeated_item');
  fails(() => productExtraction({ ...raw(), hasMoreItems: true }, textContext), 'object_onboarding_too_many_items');
});
test('low confidence yields no arbitrary object; house-only documents can have no products', () => {
  const data = raw(); data.items[0].confidence = 'low';
  const result = productExtraction(data, textContext);
  assert.equal(result.items.length, 0); assert.equal(result.needsReview, true);
  assert.deepEqual(productExtraction({ documentKind: 'unsupported', hasMoreItems: false, items: [] }, textContext).items, []);
});
test('quantity must be explicit and refer to a supported labelled quantity', () => {
  const data = raw(); data.items[0].quantity = null;
  assert.equal(productExtraction(data, textContext).items[0].quantity, null);
  for (const [value, excerpt] of [[2, 'Quantità: 1'], [1, 'Ordine 1'], [1, 'Quantità: 1 Quantità: 2']]) {
    data.items[0].quantity = { value, evidence: proof(excerpt) };
    fails(() => productExtraction(data, { ...textContext, pages: [line + '\n' + excerpt] }), 'evidence_unverified');
  }
});
test('stable item keys survive replay, source copies share fingerprint but not local row id', () => {
  const first = productExtraction(raw(), textContext).items[0];
  assert.equal(productExtraction(raw(), textContext).items[0].id, first.id);
  const copy = productExtraction(raw(), { ...textContext, snapshot: { ...snapshot, documentId: randomUUID() } }).items[0];
  assert.equal(copy.fingerprint, first.fingerprint); assert.notEqual(copy.id, first.id);
});
const scope = { accountId: randomUUID(), homeId: randomUUID() };
const candidate = (overrides = {}) => ({ ...scope, id: randomUUID(), version: 1, name: label, brand: 'Lume', model: 'Mini', state: 'active', confirmedItemFingerprints: [], ...overrides });
test('matching keeps all plausible same-model objects; never preselects or uses other accounts', () => {
  const item = productExtraction(raw(), textContext).items[0];
  const a = candidate(), b = candidate();
  const result = productCandidates(item, [a, b, candidate({ accountId: randomUUID() }), candidate({ homeId: randomUUID() }), candidate({ state: 'archived' })], scope);
  assert.equal(result.length, 2); assert(result.every(row => row.reasons.includes('same_brand_model')));
  assert(result.every(row => !Object.hasOwn(row, 'selected')));
});
test('same name with conflicting model, truncated name and brand/store alone do not match', () => {
  const item = productExtraction(raw(), textContext).items[0];
  assert.equal(productCandidates(item, [candidate({ model: 'Max' })], scope).length, 0);
  const truncated = { ...item, nameTruncated: true, fields: { name: item.fields.name } };
  assert.equal(productCandidates(truncated, [candidate({ brand: null, model: null })], scope).length, 0);
  assert.equal(productCandidates(item, [candidate({ name: 'Other', model: null })], scope).length, 0);
});
test('item identity is stronger than document association, per-product confirmed proof only', () => {
  const item = productExtraction(raw(), textContext).items[0];
  const wrong = candidate({ name: 'Different', brand: null, model: null, confirmedItemFingerprints: ['another-item'] });
  assert.equal(productCandidates(item, [wrong], scope).length, 0);
  const result = productCandidates(item, [{ ...wrong, confirmedItemFingerprints: [item.fingerprint] }], scope);
  assert.deepEqual(result[0].reasons, ['confirmed_item']);
});
test('create/link/skip are independent explicit choices, duplicate or foreign item ids fail', () => {
  const result = productExtraction(raw(), textContext), itemId = result.items[0].id;
  assert.equal(productChoices([{ itemId, action: 'link', objectId: randomUUID(), expectedVersion: 2 }], result).newObjects, 0);
  assert.equal(productChoices([{ itemId, action: 'skip' }], result).expenses, 0);
  for (const choices of [[{ itemId: 'foreign', action: 'skip' }], [{ itemId, action: 'skip' }, { itemId, action: 'skip' }], [{ itemId, action: 'skip', name: label }], [{ itemId, action: 'create', units: 1, name: label, amountCents: 100 }]]) fails(() => productChoices(choices, result));
});
test('consumable cannot create automatically, and multiple units require explicit count', () => {
  const data = raw(); data.items[0].disposition = 'consumable';
  const consumable = productExtraction(data, textContext);
  fails(() => productChoices([{ itemId: consumable.items[0].id, action: 'create', name: label, units: 1 }], consumable));
  data.items[0].disposition = 'household_object'; data.items[0].quantity = { value: 2, evidence: proof('Quantità: 2') };
  const result = productExtraction(data, { ...textContext, pages: [line + '\nQuantità: 2'] });
  fails(() => productChoices([{ itemId: result.items[0].id, action: 'create', name: label, units: 1 }], result));
  assert.equal(productChoices([{ itemId: result.items[0].id, action: 'create', name: label, units: 2 }], result).newObjects, 2);
});
test('two distinct products cannot silently collapse onto the same existing object', () => {
  const data = raw(), second = structuredClone(data.items[0]);
  second.fields.name = field('Lume Lamp'); second.fields.model = field('Lamp'); data.items.push(second);
  const result = productExtraction(data, { ...textContext, pages: [line + '\nLume Lamp\nLamp'] });
  const objectId = randomUUID();
  fails(() => productChoices(result.items.map(item => ({ itemId: item.id, action: 'link', objectId, expectedVersion: 1 })), result));
});
test('confirmation binds source/version and refuses injected account, costs or confirmed fields', () => {
  const extraction = productExtraction(raw(), textContext);
  const body = { expectedVersion: 1, source: { documentId: snapshot.documentId, documentVersion: snapshot.documentVersion, sha256: snapshot.documentSha256 }, choices: [{ itemId: extraction.items[0].id, action: 'skip' }] };
  assert.equal(productConfirmation(body, extraction, snapshot).expenses, 0);
  for (const patch of [{ accountId: randomUUID() }, { homeId: randomUUID() }, { expense: { amountCents: 100 } }, { expectedVersion: 0 }, { source: { ...body.source, sha256: digest('changed') } }]) fails(() => productConfirmation({ ...body, ...patch }, extraction, snapshot));
});

// The transport below records requests only. No live fetch, credentials or personal files.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRsQAAAAASUVORK5CYII=', 'base64');
const imageInput = () => ({ snapshot: { ...snapshot, documentSha256: digest(png) }, mimeType: 'image/png', bytes: png });
const model = 'offline-model';
function offlineTransport(calls) {
  const transport = new AnthropicTransport({ headers: () => ({}) });
  transport.fetchImpl = async (url, init) => {
    calls.push({ url, body: init.body && JSON.parse(init.body) });
    if (url.endsWith('/models/' + model)) return Response.json({ id: model });
    if (url.endsWith('/messages/count_tokens')) return Response.json({ input_tokens: 1000 });
    throw new Error('Unexpected request, live network prohibited');
  };
  return transport;
}
test('image request uses original base64 with explicit transfer checks before count_tokens', async () => {
  const calls = [], provider = new ObjectOnboardingAnthropicProvider(new PdfTextExtractor(), offlineTransport(calls));
  let checks = 0;
  const input = imageInput();
  const prepared = await provider.prepare(input, model, new AbortController().signal, async () => { checks++; });
  assert.equal(checks, 2); assert.equal(calls.length, 2);
  const blocks = prepared.request.messages[0].content;
  assert.equal(blocks[0].source.data, png.toString('base64')); assert.equal(blocks[0].source.media_type, 'image/png');
  const sent = JSON.stringify(calls);
  assert(!sent.includes(snapshot.documentId)); assert(!sent.includes(input.snapshot.documentSha256));
  assert.equal(calls.filter(call => call.url.endsWith('/messages')).length, 0);
});
test('missing authorization, wrong hash, type mismatch and oversized images send nothing', async () => {
  for (const modify of [input => input, input => ({ ...input, snapshot }), input => ({ ...input, mimeType: 'image/jpeg' }), input => ({ ...input, mimeType: 'text/plain' }), input => { const bytes = Buffer.alloc(5 * 1024 * 1024 + 1); return { ...input, bytes, snapshot: { ...snapshot, documentSha256: digest(bytes) } }; }]) {
    const calls = [], provider = new ObjectOnboardingAnthropicProvider(new PdfTextExtractor(), offlineTransport(calls));
    await assert.rejects(provider.prepare(modify(imageInput()), model, new AbortController().signal, async () => { throw Error('Not authorized'); }));
    assert.equal(calls.length, 0);
  }
});
test('PDF path really extracts text but transmits neither PDF bytes nor local identifiers', async () => {
  const bytes = receiptFixturePdf('purchase'), calls = [];
  const provider = new ObjectOnboardingAnthropicProvider(new PdfTextExtractor(), offlineTransport(calls));
  const prepared = await provider.prepare({ bytes, mimeType: 'application/pdf', snapshot: { ...snapshot, documentSha256: digest(bytes) } }, model, new AbortController().signal, async () => {});
  assert.equal(prepared.context.kind, 'text'); assert(prepared.context.pages[0].includes('Lume'));
  assert(!JSON.stringify(calls).includes(bytes.toString('base64')));
});
test('decoder preserves visual origin, rejects malformed output and invalid usage', () => {
  const provider = new ObjectOnboardingAnthropicProvider(new PdfTextExtractor(), {});
  const prepared = { request: { model, max_tokens: 4096 }, context: imageContext };
  const response = { id: 'msg_offline', model, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(raw(true)) }], usage: { input_tokens: 1000, output_tokens: 100 } };
  assert.equal(provider.decode(response, prepared).output.items.length, 1);
  fails(() => provider.decode({ ...response, stop_reason: 'max_tokens' }, prepared), 'analysis_invalid_output');
  fails(() => provider.decode({ ...response, usage: { input_tokens: 1000, output_tokens: -1 } }, prepared), 'analysis_invalid_output');
  fails(() => provider.decode({ ...response, content: [{ type: 'text', text: '{}' }] }, prepared), 'analysis_invalid_output');
});
