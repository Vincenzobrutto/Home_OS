// Dedicated local DB, synthetic PDFs, real parser. ALL provider HTTP is stubbed.
require('reflect-metadata');
const { test } = require('node:test'), assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
const { PrismaService, assertDevelopmentDatabase } = require('../dist/prisma.service');
const { ReceiptAiConfig, ReceiptAiBudget } = require('../dist/receipt-assistance/ai-budget');
const { ReceiptAiAnalysis, ReceiptAnthropicTransport } = require('../dist/receipt-assistance/ai-analysis');
const { ReceiptAnthropicProvider } = require('../dist/receipt-assistance/anthropic-provider');
const { ReceiptAssistanceService } = require('../dist/receipt-assistance/receipt.service');
const { ReceiptReleasePolicy } = require('../dist/receipt-assistance/release-policy');
const { ReceiptJobService } = require('../dist/receipt-assistance/jobs.service');
const { ReceiptFixtureProvider, receiptFixturePdf } = require('../dist/receipt-assistance/fixture-provider');
const { ReviewService } = require('../dist/review/review.service');
const { PdfTextExtractor } = require('../dist/review/pdf-text');
const { digest } = require('../dist/security');
const model = 'claude-sonnet-5-5', bytes = receiptFixturePdf('purchase'), hash = digest(bytes);
class OfflineConfig extends ReceiptAiConfig {
  constructor() { super(); this.env = { RECEIPT_AI_ENABLED: 'true', RECEIPT_AI_MODEL: model, RECEIPT_AI_CAMPAIGN_ID: 'receipt-offline-' + randomUUID(), RECEIPT_AI_BUDGET_USD: '1', RECEIPT_AI_MAX_CALLS: '3', RECEIPT_AI_ALLOWED_SHA256: hash, ANTHROPIC_API_KEY: 'offline-placeholder-not-a-key' }; }
  get environment() { return this.env; }
}
const raw = () => ({ documentKind: 'purchase_receipt', multipleItems: false, currency: 'EUR', currencyEvidence: { page: 1, excerpt: 'Totale documento: 179,90 EUR' }, fields: [{ field: 'brand', value: 'Lume', page: 1, excerpt: 'Marca: Lume' }], totals: [{ amountCents: 17990, page: 1, excerpt: 'Totale documento: 179,90 EUR' }] });
const code = expected => error => (error.getResponse?.().code ?? error.code) === expected;

test('Receipt AI config is separately opt-in, fail-closed and cannot reuse legacy campaigns or budgets', () => {
  const config = new OfflineConfig();
  assert.equal(config.settings().limitMicroUsd, 1000000);
  for (const [key, value] of [['RECEIPT_AI_ENABLED', 'false'], ['RECEIPT_AI_BUDGET_USD', '10.000001'], ['RECEIPT_AI_BUDGET_USD', 'NaN'], ['RECEIPT_AI_MAX_CALLS', '51'], ['RECEIPT_AI_CAMPAIGN_ID', 'm4-20261013'], ['RECEIPT_AI_ALLOWED_SHA256', 'invalid'], ['RECEIPT_AI_MODEL', 'unpriced-model']]) {
    const original = config.env[key]; config.env[key] = value; assert.throws(() => config.settings()); config.env[key] = original;
  }
  config.env = { M4_AI_ENABLED: 'true', M4_BUDGET_USD: '10', ANTHROPIC_API_KEY: 'offline' };
  assert.throws(() => config.settings(), code('ai_provider_disabled'));
});

test('Receipt AI jobs / budget / evidence / privacy: no real provider calls', { timeout: 60000 }, async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL);
  const db = new PrismaService(); await db.$connect();
  const accounts = [], homes = [], files = [], campaigns = [], content = new Map();
  const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
  let reads = 0, messages = 0, counted = 0, mode = 'ok', hook = null;
  const config = new OfflineConfig(), budget = new ReceiptAiBudget(db, config), transport = new ReceiptAnthropicTransport(config);
  // No fallback fetch: every allowed URL has an explicit local response.
  transport.fetchImpl = async url => {
    if (url.endsWith('/models/' + model)) return Response.json({ id: model });
    if (url.endsWith('/messages/count_tokens')) { counted++; if (hook) await hook(); return Response.json({ input_tokens: 1200 }); }
    if (url.endsWith('/messages')) {
      messages++; if (mode === 'lost') throw Error('Synthetic response lost after send');
      const data = raw(); if (mode === 'invalid') data.fields[0].value = 'Invented';
      return Response.json({ id: 'msg_offline_receipt', model, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(data) }], usage: { input_tokens: 1200, output_tokens: 300 } });
    }
    throw Error('Unexpected stub URL: ' + url);
  };
  const ai = new ReceiptAiAnalysis(db, new ReceiptAnthropicProvider(new PdfTextExtractor(), transport), transport, budget);
  const receipts = new ReceiptAssistanceService(db, new ReviewService(db, {}), clock, new ReceiptReleasePolicy(config), budget);
  const jobs = new ReceiptJobService(db, receipts, { read: async key => { reads++; return content.get(key); } }, new ReceiptFixtureProvider(), clock, ai);
  t.after(async () => {
    const where = { accountId: { in: accounts } };
    await db.receiptAiAttempt.deleteMany({ where: { job: where } });
    await db.receiptAnalysisJob.deleteMany({ where }); await db.receiptRequest.deleteMany({ where }); await db.receiptDraft.deleteMany({ where });
    await db.documentVersion.deleteMany({ where: { document: { uploaderId: { in: accounts } } } }); await db.document.deleteMany({ where: { uploaderId: { in: accounts } } });
    await db.storedFile.deleteMany({ where: { id: { in: files } } }); await db.homeMembership.deleteMany({ where: { homeId: { in: homes } } }); await db.home.deleteMany({ where: { id: { in: homes } } }); await db.account.deleteMany({ where: { id: { in: accounts } } });
    await db.receiptAiCampaign.deleteMany({ where: { id: { in: campaigns } } }); await db.$disconnect();
  });
  const A = await db.account.create({ data: { name: 'Synthetic receipt AI offline', email: randomUUID() + '@example.test', passwordHash: 'not-login' } }); accounts.push(A.id);
  const H = await db.home.create({ data: { name: 'Synthetic receipt offline', address: 'Via Fixture' } }); homes.push(H.id);
  await db.homeMembership.create({ data: { accountId: A.id, homeId: H.id, role: 'owner' } });
  const document = async () => {
    const key = randomUUID(); content.set(key, bytes);
    const doc = await db.document.create({ data: { homeId: H.id, uploaderId: A.id, name: 'OFFLINE synthetic receipt', visibility: 'private', original: { create: { originalFilename: 'synthetic.pdf', mimeType: 'application/pdf', byteSize: bytes.length, sha256: hash, file: { create: { storageKey: key } } } } }, include: { original: true } }); files.push(doc.original.fileId); return doc;
  };
  const reset = (limit = '1', calls = '3') => { config.env = new OfflineConfig().env; config.env.RECEIPT_AI_BUDGET_USD = limit; config.env.RECEIPT_AI_MAX_CALLS = calls; campaigns.push(config.campaign); mode = 'ok'; hook = null; };
  const start = (doc, key = randomUUID(), consent = true) => jobs.start(A.id, H.id, { documentId: doc.id, provider: 'anthropic', consentToProviderTransfer: consent }, key);
  const run = async doc => { const result = await start(doc); const claimed = await jobs.claim(result.job.id); assert(claimed); await jobs.run(claimed); return (await jobs.get(A.id, H.id, result.job.id, {})).job; };

  await t.test('Consent, hash allowlist and disabled config checked before storage or transmission', async () => {
    reset(); const doc = await document(), before = [reads, counted, messages];
    await assert.rejects(start(doc, randomUUID(), false));
    config.env.RECEIPT_AI_ALLOWED_SHA256 = '0'.repeat(64); await assert.rejects(start(doc), code('receipt_document_not_authorized'));
    config.env.RECEIPT_AI_ENABLED = 'false'; await assert.rejects(start(doc), code('ai_provider_disabled'));
    assert.deepEqual([reads, counted, messages], before); assert.equal(await db.receiptAnalysisJob.count({ where: { accountId: A.id } }), 0);
  });
  await t.test('Concurrent idempotency stores one attempt; successful extraction charges once and creates no object/cost', async () => {
    reset(); const doc = await document(), key = randomUUID(), before = messages;
    const [one, two] = await Promise.all([start(doc, key), start(doc, key)]); assert.equal(one.job.id, two.job.id);
    assert.equal(await db.receiptAiAttempt.count({ where: { jobId: one.job.id } }), 1);
    const claimed = await jobs.claim(one.job.id); await jobs.run(claimed); await jobs.run(claimed);
    const done = (await jobs.get(A.id, H.id, one.job.id, {})).job;
    assert.equal(done.state, 'succeeded'); assert.equal(done.isSimulation, false); assert.equal(done.billing.actualUsd, '0.005400'); assert.equal(messages - before, 1);
    const draft = (await receipts.get(A.id, H.id, done.draftId, {})).draft;
    assert.equal(draft.fields.brand.value, 'Lume'); assert.equal(draft.total.amountCents, 17990); assert.deepEqual(draft.analysis.billing, done.billing);
    assert.equal(await db.homeObject.count({ where: { homeId: H.id } }), 0); assert.equal(await db.homeExpense.count({ where: { homeId: H.id } }), 0);
    assert.equal((await start(doc, key)).job.state, 'succeeded'); assert.equal(messages - before, 1);
    await db.documentVersion.update({ where: { documentId: doc.id }, data: { sha256: digest('synthetic source replaced') } });
    const hidden = (await jobs.get(A.id, H.id, one.job.id, {})).job; assert.equal(hidden.state, 'unavailable'); assert.equal(hidden.billing, null); assert.equal(hidden.model, null);
  });
  await t.test('Call cap and reservation budget reject before creating a job; campaign limits cannot increase', async () => {
    reset('1', '1'); const first = await document(); await run(first); const before = messages;
    config.env.RECEIPT_AI_MAX_CALLS = '3';
    await assert.rejects(start(await document()), code('ai_evaluation_limit_reached')); assert.equal(messages, before);
    reset('0.10'); await assert.rejects(start(await document()), code('ai_budget_exhausted'));
  });
  await t.test('Invalid evidence remains charged but publishes no draft or canonical writes', async () => {
    reset(); mode = 'invalid'; const doc = await document(), done = await run(doc);
    assert.equal(done.state, 'failed'); assert.equal(done.errorCode, 'evidence_unverified'); assert.equal(done.billing.actualUsd, '0.005400');
    assert.equal(await db.receiptDraft.count({ where: { documentId: doc.id } }), 0);
    const attempt = await db.receiptAiAttempt.findUnique({ where: { jobId: done.id } }); assert.equal(attempt.output, null);
  });
  await t.test('Ambiguous transmission is durably reserved, blocks another key and permits manual review', async () => {
    reset(); mode = 'lost'; const doc = await document(), before = messages, done = await run(doc);
    assert.equal(done.state, 'uncertain'); assert.equal(done.billing.actualUsd, null); assert.equal(done.billing.state, 'uncertain');
    await assert.rejects(start(doc), code('analysis_outcome_unknown')); assert.equal(messages - before, 1);
    const caps = await receipts.capabilities(A.id, H.id, { documentId: doc.id }); assert.equal(caps.resume.jobId, done.id); assert.equal(caps.manualEnabled, true);
    assert((await receipts.manual(A.id, H.id, { documentId: doc.id }, randomUUID())).draft);
  });
  await t.test('Source changes during token counting stop Messages and release the unused reservation', async () => {
    reset(); const doc = await document(), before = messages;
    hook = () => db.documentVersion.update({ where: { documentId: doc.id }, data: { sha256: digest('synthetic changed original') } });
    const done = await run(doc); assert.equal(done.state, 'unavailable'); assert.equal(messages, before);
    const attempt = await db.receiptAiAttempt.findUnique({ where: { jobId: done.id } }); assert.equal(attempt.state, 'released'); assert.equal(attempt.actualMicroUsd, 0);
  });
  await t.test('Disabled configuration between queueing and dispatch releases budget without parsing', async () => {
    reset(); const doc = await document(), result = await start(doc), before = [reads, counted, messages];
    config.env.RECEIPT_AI_ENABLED = 'false'; const claimed = await jobs.claim(result.job.id); await jobs.run(claimed);
    const attempt = await db.receiptAiAttempt.findUnique({ where: { jobId: result.job.id } }); assert.equal(attempt.state, 'released'); assert.deepEqual([reads, counted, messages], before);
    assert.equal((await jobs.get(A.id, H.id, result.job.id, {})).job.errorCode, 'ai_provider_disabled');
  });
  await t.test('Expired paid lease after dispatch remains uncertain across a new worker; no automatic resend', async () => {
    reset(); const doc = await document(), result = await start(doc), claimed = await jobs.claim(result.job.id), before = messages;
    await db.receiptAiAttempt.update({ where: { jobId: claimed.id }, data: { state: 'sending', sentAt: new Date() } });
    await db.receiptAnalysisJob.update({ where: { id: claimed.id }, data: { leaseUntil: new Date(Date.now() - 1000) } });
    assert.equal(await jobs.claim(claimed.id), null);
    const done = (await jobs.get(A.id, H.id, claimed.id, {})).job; assert.equal(done.state, 'uncertain'); assert.equal(done.billing.maxReservedUsd, '0.250000');
    await jobs.run(claimed); await assert.rejects(start(doc), code('analysis_outcome_unknown')); assert.equal(messages, before);
  });
  await t.test('Configuration changed during preparation cannot dispatch a request under a different campaign', async () => {
    reset(); const doc = await document(), before = messages;
    hook = async () => { config.env.RECEIPT_AI_CAMPAIGN_ID = 'receipt-changed-' + randomUUID(); };
    const done = await run(doc); assert.equal(done.state, 'failed'); assert.equal(done.errorCode, 'ai_provider_disabled'); assert.equal(messages, before);
    assert.equal((await db.receiptAiAttempt.findUnique({ where: { jobId: done.id } })).state, 'released');
  });
});
