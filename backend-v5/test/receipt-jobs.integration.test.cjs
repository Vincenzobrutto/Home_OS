require('reflect-metadata');
const { test } = require('node:test'), assert = require('node:assert/strict'), { randomUUID, randomBytes } = require('node:crypto');
const { Module, ServiceUnavailableException } = require('@nestjs/common'), { NestFactory } = require('@nestjs/core'), cookieParser = require('cookie-parser');
const { InfrastructureModule } = require('../dist/app.module'), { DocumentsModule } = require('../dist/documents/documents.module');
const { PrismaService, assertDevelopmentDatabase } = require('../dist/prisma.service'), { ReviewService } = require('../dist/review/review.service');
const { ReceiptAssistanceService } = require('../dist/receipt-assistance/receipt.service'), { ReceiptAssistanceController } = require('../dist/receipt-assistance/receipt.controller');
const { ReceiptJobService } = require('../dist/receipt-assistance/jobs.service'), { ReceiptJobWorker } = require('../dist/receipt-assistance/jobs.worker'), { ReceiptJobsController } = require('../dist/receipt-assistance/jobs.controller');
const { ReceiptFixtureProvider, receiptFixturePdf } = require('../dist/receipt-assistance/fixture-provider');
const { ReceiptAssistanceModule } = require('../dist/receipt-assistance/receipt.module');
const { ApiErrorFilter } = require('../dist/main'), { digest, COOKIE } = require('../dist/security');
const clock = { now: () => new Date('2026-10-16T12:00:00Z') };

test('Receipt jobs: real HTTP/DB/PDF subprocess, synthetic in-memory storage, no external provider', { timeout: 60000 }, async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL);
  const content = new Map(); let reads = 0;
  const storage = { read: async key => { reads++; const bytes = content.get(key); if (!bytes) throw new ServiceUnavailableException(); return bytes; } };
  const provider = new ReceiptFixtureProvider();
  class JobsHarness {}
  Module({ imports: [InfrastructureModule, DocumentsModule], controllers: [ReceiptAssistanceController, ReceiptJobsController], providers: [
    { provide: ReceiptAssistanceService, useFactory: db => new ReceiptAssistanceService(db, new ReviewService(db, {}), clock), inject: [PrismaService] },
    { provide: ReceiptJobService, useFactory: (db, receipts) => new ReceiptJobService(db, receipts, storage, provider, clock), inject: [PrismaService, ReceiptAssistanceService] },
  ] })(JobsHarness);
  const app = await NestFactory.create(JobsHarness, { logger: false }); app.setGlobalPrefix('api/v5'); app.use(cookieParser()); app.useGlobalFilters(new ApiErrorFilter()); await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService), jobs = app.get(ReceiptJobService), receipts = app.get(ReceiptAssistanceService), worker = new ReceiptJobWorker(jobs);
  const base = (await app.getUrl()) + '/api/v5', accounts = [], homes = [], files = [];
  t.after(async () => {
    const where = { accountId: { in: accounts } };
    await db.receiptAnalysisJob.deleteMany({ where }); await db.receiptRequest.deleteMany({ where }); await db.receiptDraft.deleteMany({ where });
    await db.session.deleteMany({ where }); await db.documentVersion.deleteMany({ where: { document: { uploaderId: { in: accounts } } } });
    await db.document.deleteMany({ where: { uploaderId: { in: accounts } } }); await db.storedFile.deleteMany({ where: { id: { in: files } } });
    await db.homeMembership.deleteMany({ where: { homeId: { in: homes } } }); await db.home.deleteMany({ where: { id: { in: homes } } }); await db.account.deleteMany({ where: { id: { in: accounts } } }); await app.close();
  });
  const sessions = [];
  for (const name of ['A', 'B']) {
    const account = await db.account.create({ data: { name: 'Receipt jobs synthetic ' + name, email: randomUUID() + '@example.test', passwordHash: 'not-login' } }); accounts.push(account.id);
    const raw = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
    await db.session.create({ data: { id: digest(raw), accountId: account.id, csrfToken: csrf, expiresAt: new Date(Date.now() + 3600000) } }); sessions.push({ account, raw, csrf });
  }
  const [A, B] = sessions;
  for (let i = 0; i < 2; i++) homes.push((await db.home.create({ data: { name: 'Receipt jobs synthetic home ' + i, address: 'Via Fixture' } })).id);
  const [home, other] = homes;
  await db.homeMembership.createMany({ data: [{ accountId: A.account.id, homeId: home, role: 'owner' }, { accountId: B.account.id, homeId: home, role: 'member' }, { accountId: A.account.id, homeId: other, role: 'owner' }] });
  const document = async (who, kind = 'purchase', visibility = 'private', options = {}) => {
    const bytes = kind === 'unknown' ? Buffer.from('Synthetic unknown, not a personal document') : receiptFixturePdf(kind), key = randomUUID() + '.bin'; content.set(key, bytes);
    const row = await db.document.create({ data: { homeId: home, uploaderId: who.account.id, name: 'Synthetic receipt ' + kind, visibility, original: { create: { originalFilename: 'synthetic.pdf', mimeType: options.mimeType ?? 'application/pdf', byteSize: options.byteSize ?? bytes.length, sha256: digest(bytes), file: { create: { storageKey: key } } } } }, include: { original: true } }); files.push(row.original.fileId); return row;
  };
  const path = suffix => `/homes/${home}/receipt-assistance/${suffix}`;
  async function call(who, url, method = 'GET', body, key = randomUUID(), headers = {}) {
    const result = await fetch(base + url, { method, headers: { Origin: 'http://127.0.0.1:5174', ...(who ? { Cookie: COOKIE + '=' + who.raw, 'X-Account-Context': who.account.id, 'X-CSRF-Token': who.csrf } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json', 'Idempotency-Key': key } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: result.status, body: await result.json() };
  }
  const request = doc => ({ documentId: doc.id, provider: 'receipt_fixture_v1', consentToProviderTransfer: false });
  const start = (doc, who = A, key, body = request(doc)) => call(who, path('jobs'), 'POST', body, key);
  const aiBefore = [await db.aiAttempt.count(), await db.economicAiAttempt.count()];
  await t.test('Full isolated module constructs all dependencies without starting queue workers', async () => {
    class ConstructionOnly {}
    Module({ imports: [InfrastructureModule, ReceiptAssistanceModule] })(ConstructionOnly);
    const probe = await NestFactory.create(ConstructionOnly, { logger: false });
    try { assert(probe.get(ReceiptJobService)); assert.equal(probe.get(ReceiptJobWorker).timer, undefined); }
    finally { await probe.close(); }
  });
  await t.test('Start validates auth/CSRF/provider/type/hash before any original read; manual is independent', async () => {
    const known = await document(A), unknown = await document(A, 'unknown'), image = await document(A, 'purchase', 'private', { mimeType: 'image/png' }), large = await document(A, 'purchase', 'private', { byteSize: 11 * 1024 * 1024 });
    assert.equal((await call(null, path('jobs'), 'POST', request(known))).status, 401);
    assert.equal((await call(A, path('jobs'), 'POST', request(known), randomUUID(), { 'X-CSRF-Token': 'invalid' })).status, 403);
    assert.equal((await start(known, A, undefined, { ...request(known), provider: 'anthropic' })).body.error.code, 'ai_provider_disabled');
    assert.equal((await start(known, A, undefined, { ...request(known), consentToProviderTransfer: true })).status, 422);
    assert.equal((await start(known, A, undefined, { ...request(known), accountId: B.account.id })).status, 422);
    assert.equal((await start(image)).body.error.code, 'receipt_pdf_required'); assert.equal((await start(large)).body.error.code, 'analysis_limits_exceeded');
    assert.equal((await start(unknown)).body.error.code, 'provider_fixture_unsupported'); assert.equal(reads, 0);
    const manual = await call(A, path('manual-drafts'), 'POST', { documentId: unknown.id }); assert.equal(manual.status, 201); assert.deepEqual(manual.body.draft.fields, {});
    assert.equal(await db.receiptAnalysisJob.count({ where: { accountId: A.account.id } }), 0);
  });
  await t.test('Concurrent replay stores one job; another key cannot duplicate active analysis; state survives new service', async () => {
    const doc = await document(A), key = randomUUID();
    const results = await Promise.all([start(doc, A, key), start(doc, A, key)]);
    assert(results.every(result => result.status === 202)); assert.deepEqual(results[0].body, results[1].body);
    const job = results[0].body.job; assert.equal(job.state, 'queued'); assert.equal(job.isSimulation, true); assert.equal(job.draftId, null);
    assert.equal((await start(doc)).body.error.code, 'receipt_analysis_already_running');
    const changed = await document(A); assert.equal((await start(changed, A, key)).body.error.code, 'idempotency_conflict');
    const restarted = new ReceiptJobService(db, receipts, storage, provider, clock); assert.deepEqual((await restarted.get(A.account.id, home, job.id, {})).job, job);
    assert.equal((await call(B, path('jobs/' + job.id))).status, 403);
    assert.equal((await call(A, `/homes/${other}/receipt-assistance/jobs/${job.id}`)).status, 403);
    await worker.tick(job.id);
    const done = await call(A, path('jobs/' + job.id)); assert.equal(done.body.job.state, 'succeeded'); assert(done.body.job.draftId);
    const draft = (await call(A, path('drafts/' + done.body.job.draftId))).body.draft;
    assert.equal(draft.mode, 'extraction'); assert.equal(draft.fields.brand.value, 'Lume'); assert.equal(draft.total.amountCents, 17990);
    assert.equal(draft.fields.brand.sources[0].documentId, doc.id); assert.equal(await db.receiptDraft.count({ where: { documentId: doc.id } }), 1);
    assert.equal((await start(doc, A, key)).body.job.state, 'succeeded'); await worker.tick(job.id); assert.equal(await db.receiptDraft.count({ where: { documentId: doc.id } }), 1);
    for (const privateKey of ['leaseToken', 'leaseUntil', 'digest', 'storageKey', 'key']) assert(!Object.hasOwn(done.body.job, privateKey));
  });
  await t.test('Unsupported/multiple/blank originals fail explicitly and create no partial draft', async () => {
    for (const [kind, reason] of [['multiple', 'receipt_multiple_items_unsupported'], ['unreadable', 'pdf_text_unavailable'], ['unsupported', 'receipt_document_unsupported']]) {
      const doc = await document(A, kind), result = await start(doc); assert.equal(result.status, 202); await worker.tick(result.body.job.id);
      const failed = (await call(A, path('jobs/' + result.body.job.id))).body.job; assert.equal(failed.state, 'failed'); assert.equal(failed.errorCode, reason); assert.equal(failed.draftId, null);
      assert.equal(await db.receiptDraft.count({ where: { documentId: doc.id } }), 0);
      assert.equal((await call(A, path('manual-drafts'), 'POST', { documentId: doc.id })).status, 201);
    }
  });
  await t.test('Source revocation and changed original stop queued work without a storage read', async () => {
    const shared = await document(B, 'purchase', 'home'), result = await start(shared), before = reads;
    await db.document.update({ where: { id: shared.id }, data: { visibility: 'private' } }); await worker.tick(result.body.job.id);
    const hidden = await call(A, path('jobs/' + result.body.job.id)); assert.equal(hidden.body.job.state, 'unavailable'); assert.equal(hidden.body.job.documentLink.document, null); assert.equal(hidden.body.job.draftId, null); assert.equal(hidden.body.job.errorCode, null);
    assert(!JSON.stringify(hidden.body).includes(shared.id)); assert(!JSON.stringify(hidden.body).includes(shared.name)); assert.equal(reads, before);
    const dbJob = await db.receiptAnalysisJob.findUnique({ where: { id: result.body.job.id } }); assert.equal(dbJob.state, 'failed'); assert.equal(dbJob.errorCode, 'access_revoked');
    const changed = await document(A), next = await start(changed);
    await db.documentVersion.update({ where: { documentId: changed.id }, data: { sha256: digest('Changed synthetic bytes') } }); await worker.tick(next.body.job.id); assert.equal(reads, before);
    assert.equal((await call(A, path('jobs/' + next.body.job.id))).body.job.state, 'unavailable');
  });
  await t.test('Publication rechecks privacy after PDF processing, with no draft on revocation', async () => {
    const doc = await document(B, 'purchase', 'home'), result = await start(doc);
    const racingProvider = { analyze: async (...args) => { const output = await provider.analyze(...args); await db.document.update({ where: { id: doc.id }, data: { visibility: 'private' } }); return output; } };
    const racing = new ReceiptJobService(db, receipts, storage, racingProvider, clock), claimed = await racing.claim(result.body.job.id); await racing.run(claimed);
    const row = await db.receiptAnalysisJob.findUnique({ where: { id: result.body.job.id } }); assert.equal(row.state, 'failed'); assert.equal(row.errorCode, 'access_revoked');
    assert.equal(await db.receiptDraft.count({ where: { documentId: doc.id } }), 0);
  });
  await t.test('Leases limit concurrent workers, stale ownership cannot publish, expired work needs explicit retry', async () => {
    const docs = await Promise.all([document(A), document(A), document(B)]), queued = [];
    for (const [index, doc] of docs.entries()) { const result = await start(doc, index === 2 ? B : A); assert.equal(result.status, 202); queued.push(result.body.job); }
    const [one, two] = await Promise.all([jobs.claim(queued[0].id), jobs.claim(queued[1].id)]); assert(one); assert(two); assert.equal(await jobs.claim(queued[2].id), null);
    await Promise.all([jobs.run(one), jobs.run(two)]); await worker.tick(queued[2].id);
    const lostDoc = await document(A), lost = (await start(lostDoc)).body.job, claimed = await jobs.claim(lost.id), before = reads;
    await db.receiptAnalysisJob.update({ where: { id: lost.id }, data: { leaseUntil: new Date(Date.now() - 1) } }); await jobs.claim(lost.id); await jobs.run(claimed);
    assert.equal(reads, before); assert.equal((await call(A, path('jobs/' + lost.id))).body.job.errorCode, 'analysis_timeout'); assert.equal(await db.receiptDraft.count({ where: { documentId: lostDoc.id } }), 0);
    const retry = await start(lostDoc); assert.equal(retry.status, 202); assert.notEqual(retry.body.job.id, lost.id); await worker.tick(retry.body.job.id);
    assert.equal((await call(A, path('jobs/' + retry.body.job.id))).body.job.state, 'succeeded');
  });
  await t.test('Account quota is enforced before queueing; rejected request has no ledger/job side effect', async () => {
    const docs = await Promise.all([document(A), document(A), document(A)]), queued = [];
    for (const doc of docs.slice(0, 2)) queued.push((await start(doc)).body.job);
    const before = await db.receiptAnalysisJob.count({ where: { accountId: A.account.id } });
    const rejected = await start(docs[2]); assert.equal(rejected.status, 503); assert.equal(rejected.body.error.code, 'receipt_analysis_busy');
    assert.equal(await db.receiptAnalysisJob.count({ where: { accountId: A.account.id } }), before);
    for (const job of queued) await worker.tick(job.id);
  });
  await t.test('Global queue quota applies independently of the requesting account quota', async () => {
    const first = await document(A), queued = await start(first); assert.equal(queued.status, 202);
    const seeded = [];
    for (let i = 0; i < 7; i++) {
      const doc = await document(B), body = request(doc);
      seeded.push((await db.receiptAnalysisJob.create({ data: { accountId: B.account.id, homeId: home, documentId: doc.id, documentVersion: 1, documentSha256: doc.original.sha256, provider: 'receipt_fixture_v1', key: randomUUID(), digest: digest(JSON.stringify(body)) } })).id);
    }
    const rejected = await start(await document(A)); assert.equal(rejected.status, 503); assert.equal(rejected.body.error.code, 'receipt_analysis_busy');
    // Only the synthetic queue rows seeded by this subtest are removed.
    await db.receiptAnalysisJob.deleteMany({ where: { id: { in: seeded } } }); await worker.tick(queued.body.job.id);
  });
  await t.test('Corrupted or missing original and lease loss during parsing cannot publish a draft', async () => {
    for (const mode of ['corrupted', 'missing']) {
      const doc = await document(A), result = await start(doc), file = await db.storedFile.findUnique({ where: { id: doc.original.fileId } });
      if (mode === 'corrupted') content.set(file.storageKey, Buffer.from('Corrupted synthetic original')); else content.delete(file.storageKey);
      await worker.tick(result.body.job.id);
      const failed = (await call(A, path('jobs/' + result.body.job.id))).body.job; assert.equal(failed.state, 'failed'); assert.equal(failed.errorCode, 'storage_unavailable');
      assert.equal(await db.receiptDraft.count({ where: { documentId: doc.id } }), 0);
    }
    const doc = await document(A), result = await start(doc);
    const staleProvider = { analyze: async (...args) => { const output = await provider.analyze(...args); await db.receiptAnalysisJob.update({ where: { id: result.body.job.id }, data: { leaseToken: randomUUID() } }); return output; } };
    const stale = new ReceiptJobService(db, receipts, storage, staleProvider, clock), claimed = await stale.claim(result.body.job.id); await stale.run(claimed);
    assert.equal(await db.receiptDraft.count({ where: { documentId: doc.id } }), 0);
    await db.receiptAnalysisJob.update({ where: { id: result.body.job.id }, data: { leaseUntil: new Date(Date.now() - 1) } }); await jobs.claim(result.body.job.id);
  });
  await t.test('The deadline also bounds stalled storage; a late read cannot start parsing or publish', async () => {
    const doc = await document(A), result = await start(doc); await jobs.claim(result.body.job.id);
    const claimed = await db.receiptAnalysisJob.update({ where: { id: result.body.job.id }, data: { firstStartedAt: new Date(Date.now() - 29000) } });
    let release, parses = 0;
    const stalled = { read: async () => new Promise(resolve => { release = resolve; }) };
    const guarded = { analyze: async (...args) => { parses++; return provider.analyze(...args); } };
    await new ReceiptJobService(db, receipts, stalled, guarded, clock).run(claimed);
    assert.equal((await call(A, path('jobs/' + claimed.id))).body.job.errorCode, 'analysis_timeout');
    assert.equal(typeof release, 'function'); release(receiptFixturePdf('purchase')); await new Promise(resolve => setImmediate(resolve));
    assert.equal(parses, 0); assert.equal(await db.receiptDraft.count({ where: { documentId: doc.id } }), 0);
  });
  await t.test('Changed role and membership revoke old jobs; no canonical objects/costs or paid attempts created', async () => {
    const doc = await document(A), result = await start(doc), before = reads;
    const where = { accountId_homeId: { accountId: A.account.id, homeId: home } };
    await db.homeMembership.update({ where, data: { role: 'viewer' } }); assert.equal((await start(await document(A))).status, 403); await worker.tick(result.body.job.id); assert.equal(reads, before);
    assert.equal((await call(A, path('jobs/' + result.body.job.id))).body.job.errorCode, 'access_revoked');
    await db.homeMembership.update({ where, data: { revokedAt: new Date() } }); assert.equal((await call(A, path('jobs/' + result.body.job.id))).status, 403);
    assert.equal(await db.homeObject.count({ where: { accountId: { in: accounts } } }), 0); assert.equal(await db.homeExpense.count({ where: { accountId: { in: accounts } } }), 0);
    assert.deepEqual([await db.aiAttempt.count(), await db.economicAiAttempt.count()], aiBefore);
  });
});
