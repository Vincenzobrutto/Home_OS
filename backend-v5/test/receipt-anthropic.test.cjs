// OFFLINE: parser is real; every Anthropic HTTP request is replaced by a local stub.
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ReceiptAnthropicProvider, RECEIPT_SYSTEM, RECEIPT_OUTPUT_SCHEMA } = require('../dist/receipt-assistance/anthropic-provider');
const { AnthropicTransport } = require('../dist/review/anthropic');
const { PdfTextExtractor } = require('../dist/review/pdf-text');
const { receiptFixturePdf } = require('../dist/receipt-assistance/fixture-provider');
const { digest } = require('../dist/security');
const model = 'offline-receipt-model', today = '2026-10-16';
const snapshot = { documentId: randomUUID(), documentVersion: 1, documentSha256: digest('offline document') };
const lines = ['Macchina caffe demo', 'Marca: Lume', 'Modello: Mini 90', 'Data documento: 2026-09-15', 'Totale documento: 179,90 EUR'];
const raw = () => ({ documentKind: 'purchase_receipt', multipleItems: false, currency: 'EUR', currencyEvidence: { page: 1, excerpt: lines[4] }, fields: [{ field: 'name', value: 'Macchina caffe demo', page: 1, excerpt: lines[0] }, { field: 'brand', value: 'Lume', page: 1, excerpt: lines[1] }, { field: 'model', value: 'Mini 90', page: 1, excerpt: lines[2] }, { field: 'documentDate', value: '2026-09-15', page: 1, excerpt: lines[3] }], totals: [{ amountCents: 17990, page: 1, excerpt: lines[4] }] });
const prepared = (pages = [lines.join('\n')]) => ({ request: { model, max_tokens: 4096 }, document: { snapshot, pages } });
const response = (data = raw(), extra = {}) => ({ id: 'msg_receipt_offline', model, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(data) }], usage: { input_tokens: 1200, output_tokens: 300 }, ...extra });
const adapter = () => new ReceiptAnthropicProvider(new PdfTextExtractor(), {});
const fails = (callback, code) => assert.throws(callback, error => error.code === code);

test('Receipt Anthropic: actual PDF parsing, stubbed transport; no IDs, hash, bytes or existing object data transmitted', async () => {
  const calls = [], transport = new AnthropicTransport({ headers: () => ({ 'content-type': 'application/json' }) });
  transport.fetchImpl = async (url, init) => { calls.push({ url, body: init.body && JSON.parse(init.body) }); if (url.endsWith('/models/' + model)) return Response.json({ id: model }); if (url.endsWith('/messages/count_tokens')) return Response.json({ input_tokens: 1200 }); if (url.endsWith('/messages')) return Response.json(response()); throw Error('Unexpected offline URL'); };
  let authorizationChecks = 0;
  const bytes = receiptFixturePdf('purchase'), original = { ...snapshot, documentSha256: digest(bytes) };
  const provider = new ReceiptAnthropicProvider(new PdfTextExtractor(), transport);
  const plan = await provider.prepare({ snapshot: original, bytes }, model, new AbortController().signal, async () => { authorizationChecks++; });
  assert.equal(authorizationChecks, 2); assert.equal(calls.length, 2);
  assert.deepEqual(plan.request.output_config.format.schema, RECEIPT_OUTPUT_SCHEMA);
  assert.match(RECEIPT_SYSTEM, /UNTRUSTED DATA/); assert.match(RECEIPT_SYSTEM, /No tool use/);
  const sent = JSON.stringify(calls); assert(!sent.includes(original.documentId)); assert(!sent.includes(original.documentSha256)); assert(!sent.includes(bytes.toString('base64')));
  assert.deepEqual(Object.keys(JSON.parse(plan.request.messages[0].content)), ['pages']);
  const answer = await transport.send(plan.request, new AbortController().signal);
  const result = provider.decode(answer, plan, today);
  assert.equal(result.output.total.amountCents, 17990); assert.equal(result.output.fields.model.value, 'Mini 90');
  assert.equal(result.output.fields.brand.sources[0].documentId, original.documentId);
  assert.equal(result.output.fields.brand.sources[0].sha256, original.documentSha256);
  assert.equal(calls.filter(c => c.url.endsWith('/messages')).length, 1);
});
test('Receipt decode: unsupported document, multiple objects and non-EUR never produce a receipt draft', () => {
  for (const [patch, code] of [[{ documentKind: 'unsupported' }, 'receipt_no_supported_data'], [{ multipleItems: true }, 'receipt_multiple_items_unsupported'], [{ currency: 'unsupported' }, 'receipt_currency_unsupported']]) fails(() => adapter().decode(response({ ...raw(), ...patch }), prepared(), today), code);
  fails(() => adapter().decode(response(), prepared([lines.join('\n') + '\nUSD 10.00']), today), 'evidence_unverified');
});
test('Receipt decode: name/model hallucinations, invalid pages and fabricated citations are rejected', () => {
  for (const patch of [{ value: 'Invented model' }, { page: 9 }, { excerpt: 'Printed somewhere else' }]) { const value = raw(); Object.assign(value.fields[2], patch); fails(() => adapter().decode(response(value), prepared(), today), 'evidence_unverified'); }
  const value = raw(); value.fields[0].value = 'A useful coffee machine'; fails(() => adapter().decode(response(value), prepared(), today), 'evidence_unverified');
});
test('Receipt decode: money must match the exact current total, not tax, subtotal, line amount or instalment', () => {
  const mismatch = raw(); mismatch.totals[0].amountCents = 17991; fails(() => adapter().decode(response(mismatch), prepared(), today), 'evidence_unverified');
  for (const line of ['IVA: 179,90 EUR', 'Subtotale: 179,90 EUR', 'Rata: 179,90 EUR', 'Acconto: 179,90 EUR']) { const value = raw(); value.totals[0].excerpt = line; value.currencyEvidence.excerpt = line; fails(() => adapter().decode(response(value), prepared([lines.join('\n') + '\n' + line]), today), 'evidence_unverified'); }
  const duplicates = raw(); duplicates.totals.push(duplicates.totals[0]); fails(() => adapter().decode(response(duplicates), prepared(), today), 'analysis_invalid_output');
});
test('Receipt decode: supports literal Italian dates and grouped cents, without inventing dates or currency', () => {
  const page = 'Macchina caffe demo\nMarca: Lume\nModello: Mini 90\nAcquisto 15 settembre 2026\nTotale ricevuta EUR 1.234,56';
  const value = raw(); value.fields[3] = { field: 'documentDate', value: '2026-09-15', page: 1, excerpt: 'Acquisto 15 settembre 2026' }; value.currencyEvidence.excerpt = 'Totale ricevuta EUR 1.234,56'; value.totals = [{ amountCents: 123456, page: 1, excerpt: value.currencyEvidence.excerpt }];
  assert.equal(adapter().decode(response(value), prepared([page]), today).output.total.amountCents, 123456);
  value.fields[3].value = '2026-09-16'; fails(() => adapter().decode(response(value), prepared([page]), today), 'evidence_unverified');
  value.fields[3].value = '2027-09-15'; fails(() => adapter().decode(response(value), prepared([page]), today), 'analysis_invalid_output');
});
test('Receipt decode: partial fields remain sparse; absent total stays absent, empty results fail', () => {
  const value = raw(); value.fields = [value.fields[1]]; value.totals = [];
  const result = adapter().decode(response(value), prepared(), today).output;
  assert.deepEqual(Object.keys(result.fields), ['brand']); assert.equal(result.total, null);
  value.fields = []; fails(() => adapter().decode(response(value), prepared(), today), 'receipt_no_supported_data');
});
test('Receipt decode: duplicate fields and forged local identifiers cannot enter the evidence chain', () => {
  const duplicate = raw(); duplicate.fields.push(duplicate.fields[0]); fails(() => adapter().decode(response(duplicate), prepared(), today), 'analysis_invalid_output');
  for (const patch of [{ documentId: 'attacker-doc' }, { sha256: 'forged' }, { objectId: 'another-object' }]) { const value = raw(); Object.assign(value.fields[0], patch); fails(() => adapter().decode(response(value), prepared(), today), 'analysis_invalid_output'); }
});
test('Receipt decode: refusal, tools, truncation, wrong model, caching or unsafe usage never publish partial output', () => {
  for (const patch of [{ stop_reason: 'max_tokens' }, { stop_reason: 'refusal' }, { model: 'another-model' }, { content: [{ type: 'tool_use' }] }, { content: [{ type: 'text', text: 'invalid json' }] }, { usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 5 } }]) fails(() => adapter().decode(response(raw(), patch), prepared(), today), 'analysis_invalid_output');
  fails(() => adapter().decode(response(raw(), { usage: { input_tokens: 49999, output_tokens: 300 } }), prepared(), today), 'analysis_limits_exceeded');
});
test('Receipt prepare: revoked permission and an aborted operation prevent parsing or any HTTP', async () => {
  let parsed = 0; const provider = new ReceiptAnthropicProvider({ extract: async () => { parsed++; throw Error('Should not parse'); } }, {});
  await assert.rejects(provider.prepare({}, model, new AbortController().signal, async () => { throw Error('Access revoked'); }), /Access revoked/); assert.equal(parsed, 0);
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(provider.prepare({}, model, aborted.signal, async () => {}), e => e.code === 'analysis_timeout'); assert.equal(parsed, 0);
});
test('Receipt prepare: permission rechecked before count_tokens; denied text never reaches HTTP', async () => {
  const calls = [], transport = new AnthropicTransport({ headers: () => ({}) });
  transport.fetchImpl = async url => { calls.push(url); return Response.json({ id: model }); };
  let checks = 0;
  const provider = new ReceiptAnthropicProvider({ extract: async () => [prepared().document] }, transport);
  await assert.rejects(provider.prepare({}, model, new AbortController().signal, async () => { if (++checks === 2) throw Error('Revoked during parse'); }), /Revoked during parse/);
  assert.equal(checks, 2); assert.equal(calls.length, 1); assert(calls[0].includes('/models/'));
});
