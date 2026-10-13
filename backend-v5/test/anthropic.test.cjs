require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { digest } = require('../dist/security');
const { PdfTextExtractor } = require('../dist/review/pdf-text');
const { validateEvidence } = require('../dist/review/ai-evidence');
const { AnthropicTransport, responseData, responseUsage } = require('../dist/review/anthropic');
const { AiAnalysis } = require('../dist/review/ai-analysis');
const { AiBudget, billing, committedMicroUsd } = require('../dist/review/ai-budget');
const { ProviderFailure } = require('../dist/review/provider');
const { ReviewService } = require('../dist/review/review.service');
const model = 'claude-sonnet-5-5';
const snapshot = () => ({ documentId: randomUUID(), documentVersion: 1, documentSha256: 'abc' });
const documents = [{ snapshot: snapshot(), pages: ['Copertina sintetica', 'Marca: Termica Demo\nModello: TD-24\nPotenza utile al riscaldamento: 24 kW'] }];
const claim = (changes = {}) => ({ fieldKey: 'power', value: '24', documentIndex: 0, page: 2, excerpt: 'Potenza utile al riscaldamento: 24 kW', quantityLabel: 'Potenza utile al riscaldamento', ...changes });
const output = claims => ({ multipleAssets: false, claims });
const response = (data = output([claim()])) => ({ id: 'msg_test', model, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(data) }], usage: { input_tokens: 1000, output_tokens: 100 } });

test('Parser PDF reale: testo pagina fisica, hash e documento corrotto', async () => {
  const bytes = await readFile(resolve(__dirname, '../../docs/v5/fixtures/m3/libretto-caldaia-demo.pdf'));
  const extractor = new PdfTextExtractor();
  const parsed = await extractor.extract([{ bytes, snapshot: { ...snapshot(), documentSha256: digest(bytes) } }]);
  assert.equal(parsed[0].pages.length, 1); assert.match(parsed[0].pages[0], /24\s*kW/);
  await assert.rejects(extractor.extract([{ bytes, snapshot: snapshot() }]), e => e.code === 'storage_unavailable');
  await assert.rejects(extractor.parse(Buffer.from('%PDF-invalid')), e => e.code === 'pdf_invalid');
});
test('Evidenza pagina 2: potenza distinta, duplicati aggregati e campi assenti conservati assenti', () => {
  const result = validateEvidence(output([claim(), claim()]), documents);
  assert.equal(result.brand.length, 0); assert.equal(result.model.length, 0); assert.equal(result.power.length, 1);
  assert.equal(result.power[0].measurement.quantityCode, 'useful_heating'); assert.equal(result.power[0].sources[0].page, 2);
  assert.deepEqual(validateEvidence(output([]), documents), { brand: [], model: [], power: [] });
});
test('Parser PDF multipagina, scansione e PDF cifrato: pagine reali e fallimenti prima del provider', async () => {
  const extractor = new PdfTextExtractor();
  const dir = resolve(__dirname, '../../docs/v5/fixtures/m4');
  const pages = await extractor.parse(await readFile(resolve(dir, 'caldaia-multipagina.pdf')));
  assert.equal(pages.length, 3); assert.match(pages[1], /TS-30/); assert.match(pages[2], /30\s*kW/);
  await assert.rejects(extractor.parse(await readFile(resolve(dir, 'caldaia-solo-immagine.pdf'))), e => e.code === 'pdf_text_unavailable');
  await assert.rejects(extractor.parse(await readFile(resolve(dir, 'caldaia-protetta.pdf'))), e => e.code === 'pdf_encrypted');
});
test('Evidenza inventata, pagina diversa, numero parziale e denominazione inventata rifiutati', () => {
  for (const changes of [{ page: 1 }, { page: 3 }, { documentIndex: 1 }, { value: '4' }, { quantityLabel: 'Potenza nuova' }, { excerpt: 'Potenza utile al riscaldamento: 25 kW', value: '25' }]) {
    assert.throws(() => validateEvidence(output([claim(changes)]), documents), e => e.code === 'evidence_unverified');
  }
});
test('Output inatteso o più caldaie: intera analisi rifiutata senza proposta parziale', () => {
  assert.throws(() => validateEvidence({ ...output([claim()]), invented: true }, documents), e => e.code === 'analysis_invalid_output');
  assert.throws(() => validateEvidence({ multipleAssets: true, claims: [claim()] }, documents), e => e.code === 'multi_assets_unsupported');
  assert.throws(() => validateEvidence(output([claim({ fieldKey: 'warranty' })]), documents), e => e.code === 'analysis_invalid_output');
});
test('Risposta provider: rifiuto, troncamento e usage non valido non diventano dati', () => {
  for (const stop_reason of ['refusal', 'max_tokens']) assert.throws(() => responseData({ ...response(), stop_reason }), e => e.code === 'analysis_invalid_output');
  assert.throws(() => responseUsage({ ...response(), usage: { input_tokens: -1, output_tokens: 4 } }, model));
  assert.throws(() => responseUsage({ ...response(), model: 'unexpected' }, model));
  assert.deepEqual(responseData({ ...response(), content: [{ type: 'thinking' }, ...response().content] }), output([claim()]));
  assert.throws(() => responseData({ ...response(), content: [{ type: 'tool_use' }, ...response().content] }));
});
test('Transport mock: verifica modello, conta testo e una sola chiamata Messages, mai retry automatico', async () => {
  const calls = []; const transport = new AnthropicTransport({ headers: () => ({}) });
  transport.fetchImpl = async (url, options) => { calls.push({ url, body: options.body && JSON.parse(options.body) }); return new Response(JSON.stringify(url.includes('count_tokens') ? { input_tokens: 1000 } : url.includes('/models/') ? { id: model } : response())); };
  const prepared = await transport.prepare(model, documents, new AbortController().signal);
  assert.equal(prepared.output_config.format.type, 'json_schema'); assert.match(prepared.messages[0].content, /"page":2/);
  await transport.send(prepared, new AbortController().signal); assert.equal(calls.length, 3);
  transport.fetchImpl = async () => { calls.push({ error: true }); return new Response('hidden credentials', { status: 429 }); };
  await assert.rejects(transport.send(prepared, new AbortController().signal), e => e.code === 'provider_rate_limited');
  assert.equal(calls.length, 4);
});
test('Conteggio oltre limite blocca Messages prima di sostenere costo', async () => {
  const transport = new AnthropicTransport({ headers: () => ({}) }); let messages = 0;
  transport.fetchImpl = async url => { if (url.endsWith('/messages')) messages++; return new Response(JSON.stringify(url.includes('/models/') ? { id: model } : { input_tokens: 50000 })); };
  await assert.rejects(transport.prepare(model, documents, new AbortController().signal), e => e.code === 'analysis_limits_exceeded'); assert.equal(messages, 0);
});
test('Budget: un esito incerto conserva tutta la riserva e un fallimento prima di invio costa zero', async () => {
  assert.equal(committedMicroUsd({ state: 'uncertain', actualMicroUsd: null, reservedMicroUsd: 250000 }), 250000);
  assert.equal(committedMicroUsd({ state: 'released', actualMicroUsd: 0, reservedMicroUsd: 250000 }), 0);
  assert.equal(billing({ state: 'uncertain', actualMicroUsd: null, reservedMicroUsd: 250000 }).state, 'uncertain');
  let state = 'sending'; const db = { aiAttempt: { updateMany: async ({ where, data }) => { if (where.state === state) state = data.state; } } };
  await new AiBudget(db, {}).fail('id'); assert.equal(state, 'uncertain');
});
test('Client M3: replay della chiave precedente conserva la vecchia impronta senza inviare Anthropic', async () => {
  const accountId = randomUUID(), homeId = randomUUID(), documentId = randomUUID();
  const body = { documentIds: [documentId] }, saved = { job: { id: randomUUID(), provider: 'test_fixture_v1' } };
  const tx = { $queryRaw: async () => [], homeMembership: { findUnique: async () => ({ role: 'owner', validFrom: new Date(0) }) }, document: { findUnique: async () => ({ id: documentId, homeId, uploaderId: accountId, visibility: 'private', original: { version: 1, sha256: 'abc' } }) }, reviewRequest: { findUnique: async () => ({ digest: digest(JSON.stringify(body)), response: saved }) } };
  const review = new ReviewService({ $transaction: async fn => fn(tx) }, {});
  assert.deepEqual(await review.start(accountId, homeId, body, randomUUID()), saved);
});
test('Budget: tetto cumulativo e limite chiamate non superati da una nuova riserva', async () => {
  const config = { require: () => ({ input: 2, output: 10 }), campaign: 'test', limitMicroUsd: 1000000, maxCalls: 6 };
  let created = false;
  const tx = { $queryRaw: async () => [], aiCampaign: { upsert: async () => {}, findUniqueOrThrow: async () => ({ id: 'test', limitMicroUsd: 1000000, maxCalls: 6 }) }, aiAttempt: { findMany: async () => [{ state: 'uncertain', actualMicroUsd: null, reservedMicroUsd: 900000 }], create: async () => { created = true; } } };
  await assert.rejects(new AiBudget({}, config).reserve(tx, 'job', model), e => e.getResponse().code === 'ai_budget_exhausted'); assert.equal(created, false);
});
function analysisCase(attempt) {
  let calls = 0, checks = 0, failed = 0;
  const db = { aiAttempt: { findUnique: async () => attempt, updateMany: async ({ data }) => { Object.assign(attempt, data); return { count: 1 }; } }, analysisJob: { findUniqueOrThrow: async () => ({ state: 'running', leaseToken: 'lease' }) }, $queryRaw: async () => [], $transaction: async fn => fn(db) };
  const provider = { prepare: async () => { calls++; return {}; }, send: async () => { calls++; return response(); } };
  const ai = new AiAnalysis(db, { extract: async () => documents }, provider, { fail: async () => { failed++; } }, { require: () => {} });
  return { ai, provider, authorize: async () => { checks++; }, get calls() { return calls; }, get checks() { return checks; }, get failed() { return failed; } };
}
test('Sei chiamate iniziali: blocco distinto dal budget monetario, senza azzerare il saldo', async () => {
  const config = { campaign: 'test', limitMicroUsd: 10000000, maxCalls: 6 };
  const db = { aiCampaign: { findUnique: async () => ({ limitMicroUsd: 10000000, maxCalls: 6 }) }, aiAttempt: { findMany: async () => Array.from({ length: 6 }, () => ({ state: 'settled', actualMicroUsd: 10000, reservedMicroUsd: 250000 })) } };
  const snapshot = await new AiBudget(db, config).snapshot();
  assert.equal(snapshot.disabledReason, 'ai_evaluation_limit_reached'); assert.equal(snapshot.available, false); assert.equal(snapshot.remainingUsd, '9.940000');
});
test('Recupero dopo crash: invio incerto non viene reinviato; risposta persistita non ricontatta provider', async () => {
  const uncertain = analysisCase({ state: 'sending' });
  await assert.rejects(uncertain.ai.analyze({ id: 'job' }, [], new AbortController().signal, uncertain.authorize, 'lease'), e => e.code === 'analysis_outcome_unknown'); assert.equal(uncertain.calls, 0);
  const stored = analysisCase({ state: 'settled', response: response() });
  assert.equal((await stored.ai.analyze({ id: 'job' }, [], new AbortController().signal, stored.authorize, 'lease')).power.length, 1); assert.equal(stored.calls, 0);
});
test('Revoca prima di trasferire testo impedisce conteggio e Messages', async () => {
  const c = analysisCase({ state: 'reserved', model });
  await assert.rejects(c.ai.analyze({ id: 'job' }, [], new AbortController().signal, async () => { throw new ProviderFailure('access_revoked'); }, 'lease'), e => e.code === 'access_revoked'); assert.equal(c.calls, 0);
});
test('Usage e risposta persistiti prima della validazione: evidenza errata resta addebitata', async () => {
  const attempt = { id: 'attempt', state: 'reserved', model, inputMicroUsdPerToken: 2, outputMicroUsdPerToken: 10 };
  const c = analysisCase(attempt); c.provider.send = async () => response(output([claim({ page: 1 })]));
  await assert.rejects(c.ai.analyze({ id: 'job' }, [], new AbortController().signal, c.authorize, 'lease'), e => e.code === 'evidence_unverified');
  assert.equal(attempt.state, 'settled'); assert.equal(attempt.actualMicroUsd, 3000); assert(attempt.response); assert.equal(c.checks, 3);
});
