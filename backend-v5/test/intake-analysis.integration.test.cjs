require('reflect-metadata');
const { test } = require('node:test'), assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
const { PrismaClient } = require('../generated/client'), { assertDevelopmentDatabase } = require('../dist/prisma.service');
const { DocumentPolicy } = require('../dist/documents/access'), { IntakeBatchesService } = require('../dist/document-intake/batches.service');
const { IntakeAnalysisService } = require('../dist/document-intake/analysis.service'), { PdfTextExtractor } = require('../dist/review/pdf-text');
const { digest } = require('../dist/security'), { corpus } = require('./intake-fixtures.cjs');
test('B3 local persisted jobs use real PDF text, source locks, recovery and zero external ledger', { timeout: 60000 }, async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL); const db = new PrismaClient(); await db.$connect();
  const a = await db.account.create({ data: { name: 'Synthetic intake parser', email: randomUUID() + '@example.test', passwordHash: 'not-login' } }), b = await db.account.create({ data: { name: 'Synthetic other', email: randomUUID() + '@example.test', passwordHash: 'not-login' } });
  const h = await db.home.create({ data: { name: 'Local classification synthetic', address: 'Via test' } });
  await db.homeMembership.createMany({ data: [a, b].map(x => ({ accountId: x.id, homeId: h.id, role: 'owner' })) });
  const batches = new IntakeBatchesService(db, new DocumentPolicy(db)), content = new Map(), docs = [], fileIds = []; let readHook = null, reads = 0;
  const queueScope = 'synthetic-test-' + randomUUID(), storage = { read: async key => { reads++; if (readHook) await readHook(); return content.get(key); } }, worker = new IntakeAnalysisService(db, batches, storage, new PdfTextExtractor(), queueScope);
  t.after(async () => {
    await db.documentIntakeAnalysis.deleteMany({ where: { item: { batch: { homeId: h.id } } } }); await db.documentIntakeRequest.deleteMany({ where: { batch: { homeId: h.id } } }); await db.documentIntakeItem.deleteMany({ where: { batch: { homeId: h.id } } }); await db.documentIntakeBatch.deleteMany({ where: { homeId: h.id } });
    await db.documentOrganization.deleteMany({ where: { homeId: h.id } }); await db.documentVersion.deleteMany({ where: { documentId: { in: docs } } }); await db.document.deleteMany({ where: { id: { in: docs } } }); await db.storedFile.deleteMany({ where: { id: { in: fileIds } } }); await db.homeMembership.deleteMany({ where: { homeId: h.id } }); await db.home.delete({ where: { id: h.id } }); await db.account.deleteMany({ where: { id: { in: [a.id, b.id] } } }); await db.$disconnect();
  });
  const ledgers = async () => Promise.all([db.aiAttempt.count(), db.economicAiAttempt.count(), db.receiptAiAttempt.count(), db.homeExpense.count()]); const before = await ledgers();
  async function fixture(name = 'ape-sintetico.pdf', mime = 'application/pdf') {
    const bytes = corpus[name], key = randomUUID() + '.bin'; content.set(key, bytes);
    const doc = await db.document.create({ data: { homeId: h.id, uploaderId: a.id, name, original: { create: { originalFilename: name, byteSize: bytes.length, mimeType: mime, sha256: digest(bytes), file: { create: { storageKey: key } } } } }, include: { original: true } }); docs.push(doc.id); fileIds.push(doc.original.fileId);
    const batch = (await batches.create(a.id, h.id, { items: [{ clientItemId: randomUUID(), filename: name, byteSize: bytes.length, mimeType: mime }] }, randomUUID())).batch;
    await db.documentIntakeItem.update({ where: { id: batch.items[0].id }, data: { documentId: doc.id, documentVersion: 1, documentSha256: digest(bytes), uploadState: 'stored' } });
    return (await batches.get(a.id, h.id, batch.id, {})).batch;
  }
  const start = (batch, key = randomUUID(), account = a.id) => worker.start(account, h.id, batch.id, { provider: 'local_text_v1', items: batch.items.map(i => ({ id: i.id, expectedVersion: i.version })) }, key);
  const get = batch => batches.get(a.id, h.id, batch.id, {}).then(x => x.batch);
  await t.test('Queue is durable and idempotent; new worker parses actual bytes and publishes verified source without organization', async () => {
    const batch = await fixture('pratica-mista-sintetica.pdf'), key = randomUUID(), queued = await start(batch, key);
    assert.equal(queued.batch.items[0].analysisState, 'queued'); assert.equal((await start(batch, key)).batch.version, queued.batch.version);
    await assert.rejects(start(batch, key, b.id), e => e.getStatus() === 403);
    const fresh = new IntakeAnalysisService(db, batches, storage, new PdfTextExtractor(), queueScope); await Promise.all([fresh.workOne(), worker.workOne()]);
    const ready = await get(batch); assert.equal(ready.items[0].analysisState, 'ready'); assert.deepEqual(ready.items[0].proposal.parts.map(p => p.kind), ['cila', 'agibility']); assert.equal(ready.items[0].pageCount, 1);
    const parsed = await new PdfTextExtractor().parse(corpus['pratica-mista-sintetica.pdf']); for (const source of ready.items[0].proposal.sources) assert(parsed[source.page - 1].includes(source.excerpt));
    assert.equal(await db.documentOrganization.count({ where: { homeId: h.id } }), 0);
    corpus['technical-test-only.pdf'] = require('./intake-fixtures.cjs').pdf(['DIMORA SYNTHETIC ONLY', 'Schema impianto elettrico']);
    const technical = await fixture('technical-test-only.pdf'); await start(technical); await worker.workOne(); const needsChoice = await get(technical); assert.equal(needsChoice.items[0].analysisState, 'needs_choice'); assert.equal(needsChoice.items[0].selection, null);
    const doc = await db.document.findUnique({ where: { id: ready.items[0].documentLink.document.id } }); assert.equal(doc.name, 'pratica-mista-sintetica.pdf'); assert.equal(doc.visibility, 'private');
  });
  await t.test('An accessible identical copy can get a proposal without replacing its original or organization', async () => {
    corpus['visura-test-only.pdf'] = require('./intake-fixtures.cjs').pdf(["VISURA AGIBILITA'", 'NON COSTITUISCE CERTIFICAZIONE', 'Dati sintetici']);
    const batch = await fixture('visura-test-only.pdf'), itemId = batch.items[0].id, docId = batch.items[0].documentLink.document.id;
    await db.documentIntakeItem.update({ where: { id: itemId }, data: { uploadState: 'duplicate' } });
    const copy = await get(batch); await start(copy); await worker.workOne();
    const result = (await get(batch)).items[0];
    assert.equal(result.uploadState, 'duplicate'); assert.equal(result.analysisState, 'ready');
    assert.match(result.proposal.title, /^VISURA AGIBILITA['’]$/u); assert.equal(result.proposal.parts[0].kind, 'agibility_record');
    assert.equal(result.documentLink.document.id, docId); assert.equal(result.selection, null);
    assert.equal(await db.documentOrganization.count({ where: { documentId: docId } }), 0);
  });
  await t.test('Unreadable or non-PDF originals stay manual, independently of a previous successful file', async () => {
    corpus['other-test-only.pdf'] = require('./intake-fixtures.cjs').pdf(['DIMORA SYNTHETIC ONLY', 'Appunti vari della casa, nessun tipo riconoscibile.']);
    const unknown = await fixture('other-test-only.pdf'); await start(unknown); await worker.workOne(); assert.equal((await get(unknown)).items[0].analysisState, 'ready'); assert.equal((await get(unknown)).items[0].proposal, null); assert.equal((await get(unknown)).items[0].pageCount, 1);
    const unreadable = await fixture('senza-testo-sintetico.pdf'); await start(unreadable); await worker.workOne(); assert.equal((await get(unreadable)).items[0].analysisState, 'unreadable');
    const image = await fixture('ape-sintetico.pdf', 'image/png'), previous = reads; await start(image); await worker.workOne(); assert.equal((await get(image)).items[0].analysisState, 'unsupported'); assert.equal(reads, previous);
  });
  await t.test('Expired local lease recovers exactly one job; saved decisions cannot be replaced by new analysis', async () => {
    const batch = await fixture(); await start(batch);
    await db.documentIntakeAnalysis.updateMany({ where: { itemId: batch.items[0].id }, data: { state: 'running', leaseToken: randomUUID(), leaseUntil: new Date(0) } });
    await worker.workOne(); let ready = await get(batch); assert.equal(ready.items[0].analysisState, 'ready'); assert.equal(await db.documentIntakeAnalysis.count({ where: { itemId: batch.items[0].id } }), 1);
    ready = (await batches.review(a.id, h.id, batch.id, ready.items[0].id, { expectedVersion: ready.items[0].version, expectedOrganizationVersion: 0, replaceOrganization: false, selection: { action: 'defer' } }, randomUUID())).batch;
    assert.equal(ready.items[0].reviewState, 'deferred');
    await assert.rejects(worker.start(a.id, h.id, batch.id, { provider: 'anthropic', items: [] }, randomUUID()), e => e.getStatus() === 422);
  });
  await t.test('Source permission changes during IO cannot publish a proposal or cached filename', async () => {
    const batch = await fixture('regolamento-sintetico.pdf'); await start(batch);
    readHook = async () => { await db.document.update({ where: { id: batch.items[0].documentLink.document.id }, data: { uploaderId: b.id, visibility: 'private' } }); };
    try { await worker.workOne(); } finally { readHook = null; }
    const hidden = (await get(batch)).items[0]; assert.equal(hidden.proposal, null); assert.equal(hidden.filename, null);
    assert.equal((await db.documentIntakeAnalysis.findFirst({ where: { itemId: hidden.id } })).state, 'failed');
  });
  await t.test('List/resume is scoped, cursor-bound and cancellation does not delete existing originals', async () => {
    const page = await batches.list(a.id, h.id, {}); assert(page.items.length >= 4); assert.equal((await batches.list(b.id, h.id, {})).items.length, 0);
    const pending = (await batches.create(a.id, h.id, { items: [{ clientItemId: randomUUID(), filename: 'pending.pdf', byteSize: 1, mimeType: 'application/pdf' }] }, randomUUID())).batch, key = randomUUID();
    const result = await batches.cancelUpload(a.id, h.id, pending.id, pending.items[0].id, { expectedVersion: pending.items[0].version }, key); assert.equal(result.batch.items[0].uploadState, 'failed'); assert.equal((await batches.cancelUpload(a.id, h.id, pending.id, pending.items[0].id, { expectedVersion: pending.items[0].version }, key)).batch.version, result.batch.version);
  });
  assert.deepEqual(await ledgers(), before);
});
