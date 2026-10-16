// Real HTTP multipart / dedicated V5 DB. Storage/scanner are explicit in-memory stubs.
require('reflect-metadata');
const { test } = require('node:test'), assert = require('node:assert/strict'), { randomUUID, randomBytes } = require('node:crypto');
const { Module, ServiceUnavailableException } = require('@nestjs/common'), { NestFactory } = require('@nestjs/core'), cookieParser = require('cookie-parser');
const { InfrastructureModule } = require('../dist/app.module'), { PrismaService, assertDevelopmentDatabase } = require('../dist/prisma.service');
const { DocumentPolicy, DocumentAccessGuard } = require('../dist/documents/access');
const { IntakeBatchesService } = require('../dist/document-intake/batches.service'), { IntakeUploadsService } = require('../dist/document-intake/uploads.service'), { DocumentIntakeController } = require('../dist/document-intake/intake.module');
const { receiptFixturePdf } = require('../dist/receipt-assistance/fixture-provider');
const { ApiErrorFilter } = require('../dist/main'), { COOKIE, digest } = require('../dist/security');

test('Intake B1b: multipart uploads, durable replay, canonical private originals and independent failures', { timeout: 60000 }, async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL);
  const content = new Map(), removed = []; let writes = 0, reads = 0, scannerFails = false, hook = null, readHook = null;
  const storage = {
    read: async key => { reads++; if (!content.has(key)) throw new ServiceUnavailableException({ code: 'storage_unavailable' }); const bytes = Buffer.from(content.get(key)); if (readHook) await readHook(); return bytes; },
    writeVerified: async bytes => { writes++; if (scannerFails) throw new ServiceUnavailableException({ code: 'file_check_unavailable' }); const key = randomUUID() + '.bin'; content.set(key, Buffer.from(bytes)); if (hook) await hook(); return { key, control: { engine: 'microsoft_defender', checkedAt: new Date(), signatureVersion: 'OFFLINE-STUB-NOT-A-REAL-SCAN' } }; },
    remove: async key => { removed.push(key); content.delete(key); },
  };
  class Harness {}
  Module({ imports: [InfrastructureModule], controllers: [DocumentIntakeController], providers: [DocumentPolicy, DocumentAccessGuard, IntakeBatchesService, { provide: IntakeUploadsService, useFactory: (db, batches) => new IntakeUploadsService(db, batches, storage), inject: [PrismaService, IntakeBatchesService] }] })(Harness);
  const app = await NestFactory.create(Harness, { logger: false }); app.setGlobalPrefix('api/v5'); app.use(cookieParser()); app.useGlobalFilters(new ApiErrorFilter()); await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService), batches = app.get(IntakeBatchesService), base = await app.getUrl(), accounts = [], users = [];
  const home = await db.home.create({ data: { name: 'Intake upload synthetic', address: 'Via Fixture' } });
  t.after(async () => {
    const docs = await db.document.findMany({ where: { homeId: home.id }, include: { original: true } });
    await db.documentIntakeItem.deleteMany({ where: { batch: { homeId: home.id } } }); await db.documentIntakeBatch.deleteMany({ where: { homeId: home.id } });
    await db.documentVersion.deleteMany({ where: { documentId: { in: docs.map(doc => doc.id) } } }); await db.document.deleteMany({ where: { homeId: home.id } }); await db.storedFile.deleteMany({ where: { id: { in: docs.flatMap(doc => doc.original ? [doc.original.fileId] : []) } } });
    await db.homeMembership.deleteMany({ where: { homeId: home.id } }); await db.home.delete({ where: { id: home.id } }); await db.session.deleteMany({ where: { accountId: { in: accounts } } }); await db.account.deleteMany({ where: { id: { in: accounts } } }); await app.close();
  });
  for (const label of ['A', 'B']) {
    const account = await db.account.create({ data: { name: 'Intake upload synthetic ' + label, email: randomUUID() + '@example.test', passwordHash: 'not-login' } }); accounts.push(account.id);
    const raw = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url'); await db.session.create({ data: { id: digest(raw), accountId: account.id, csrfToken: csrf, expiresAt: new Date(Date.now() + 3600000) } });
    await db.homeMembership.create({ data: { accountId: account.id, homeId: home.id, role: 'owner' } }); users.push({ account, raw, csrf });
  }
  const [A, B] = users, path = '/api/v5/homes/' + home.id + '/document-intake';
  const pdf = label => Buffer.concat([receiptFixturePdf('purchase'), Buffer.from('\n% SYNTHETIC ' + label)]);
  const fixture = (bytes = pdf(randomUUID()), filename = 'Synthetic.pdf') => ({ bytes, filename, mimeType: 'application/pdf', key: randomUUID() });
  async function call(who, suffix, method = 'GET', body, key, csrf = who?.csrf) {
    const result = await fetch(base + suffix, { method, headers: { Origin: 'http://127.0.0.1:5174', ...(who ? { Cookie: COOKIE + '=' + who.raw, 'X-Account-Context': who.account.id, 'X-CSRF-Token': csrf } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}) });
    return { status: result.status, body: await result.json() };
  }
  const make = async (files, who = A, overrides = {}) => {
    const result = await call(who, path + '/batches', 'POST', { items: files.map(f => ({ clientItemId: randomUUID(), filename: f.filename, byteSize: f.bytes.length, mimeType: f.mimeType, ...overrides })) }, randomUUID()); assert.equal(result.status, 201); return result.body.batch;
  };
  const upload = (batch, index, f, who = A, key = f.key, mutate, csrf) => { const form = new FormData(); form.append('file', new Blob([f.bytes], { type: f.mimeType }), f.filename); if (mutate) mutate(form); return call(who, path + '/batches/' + batch.id + '/items/' + batch.items[index].id + '/file', 'POST', form, key, csrf ?? who.csrf); };
  const get = async (batch, who = A) => call(who, path + '/batches/' + batch.id);
  const aiBefore = [await db.aiAttempt.count(), await db.economicAiAttempt.count(), await db.receiptAiAttempt.count()];

  await t.test('HTTP guards and multipart shape reject before storage; another member cannot upload into a personal batch', async () => {
    const f = fixture(), batch = await make([f]), before = writes;
    assert.equal((await upload(batch, 0, f, A, f.key, null, 'invalid')).status, 403);
    assert.equal((await upload(batch, 0, f, B)).status, 403);
    assert.equal((await upload(batch, 0, f, A, f.key, form => form.append('visibility', 'home'))).status, 422);
    assert.equal((await upload(batch, 0, f, A, f.key, form => form.append('file', new Blob([f.bytes]), 'extra.pdf'))).status, 422);
    assert.equal(writes, before); assert.equal((await get(batch)).body.batch.items[0].uploadState, 'pending');
    const large = fixture(Buffer.alloc(20 * 1024 * 1024 + 1), 'Too large.pdf'), largeBatch = await make([large], A, { byteSize: 20 * 1024 * 1024 });
    const rejected = await upload(largeBatch, 0, large); assert.equal(rejected.status, 413); assert.equal(rejected.body.error.code, 'file_too_large'); assert.equal(rejected.body.error.message, 'Il file supera 20 MiB.'); assert.equal(writes, before);
  });
  await t.test('Successful upload is byte-identical, private, and replay/new instance do not write a second original', async () => {
    const f = fixture(), batch = await make([f]), before = writes, result = await upload(batch, 0, f); assert.equal(result.status, 201);
    const item = result.body.batch.items[0]; assert.equal(item.uploadState, 'stored'); assert.equal(item.documentLink.state, 'linked');
    const doc = await db.document.findUnique({ where: { id: item.documentLink.document.id }, include: { original: { include: { file: true } } } });
    assert.equal(doc.visibility, 'private'); assert.equal(doc.uploaderId, A.account.id); assert.equal(doc.original.sha256, digest(f.bytes)); assert.deepEqual(content.get(doc.original.file.storageKey), f.bytes);
    assert.equal((await upload(batch, 0, f)).status, 201); assert.equal(writes, before + 1);
    assert.equal((await upload(batch, 0, f, A, randomUUID())).body.error.code, 'idempotency_conflict');
    const fresh = new IntakeBatchesService(db, new DocumentPolicy(db)); assert.equal((await fresh.get(A.account.id, home.id, batch.id, {})).batch.items[0].documentLink.document.id, doc.id);
    const encoded = JSON.stringify(result.body); for (const field of ['uploadLeaseToken', 'uploadKey', 'uploadDigest', 'storageKey', 'fileControlSignature']) assert(!encoded.includes(field));
  });
  await t.test('Known admitted private bytes deduplicate within and across batches before creating another storage object', async () => {
    const bytes = pdf(randomUUID()), files = [fixture(bytes, 'First.pdf'), fixture(bytes, 'Copy.pdf')], batch = await make(files), before = writes;
    const first = await upload(batch, 0, files[0]), second = await upload(batch, 1, files[1]); assert.equal(second.status, 201);
    const items = second.body.batch.items; assert.equal(items[1].uploadState, 'duplicate'); assert.equal(items[1].duplicate.itemId, items[0].id); assert.equal(items[1].documentLink.document.id, first.body.batch.items[0].documentLink.document.id); assert.equal(writes, before + 1);
    const third = fixture(bytes, 'Again.pdf'), otherBatch = await make([third]); assert.equal((await upload(otherBatch, 0, third)).body.batch.items[0].uploadState, 'duplicate'); assert.equal(writes, before + 1);
  });
  await t.test('Concurrent identical cold uploads keep one canonical document and remove only their redundant temporary file', async () => {
    const bytes = pdf(randomUUID()), files = [fixture(bytes, 'One.pdf'), fixture(bytes, 'Two.pdf')], batch = await make(files), beforeRemoved = removed.length;
    let entered = 0, release; const gate = new Promise(resolve => { release = resolve; }); const timer = setTimeout(release, 5000); timer.unref();
    hook = async () => { if (++entered === 2) release(); await gate; };
    try {
      const results = await Promise.all(files.map((f, i) => upload(batch, i, f))); assert(results.every(r => r.status === 201));
      const items = (await get(batch)).body.batch.items; assert.deepEqual(items.map(item => item.uploadState).sort(), ['duplicate', 'stored']); assert.equal(new Set(items.map(item => item.documentLink.document.id)).size, 1);
      assert.equal(removed.length, beforeRemoved + 1); assert.equal(await db.document.count({ where: { homeId: home.id, original: { sha256: digest(bytes) } } }), 1);
    } finally { hook = null; clearTimeout(timer); release(); }
  });
  await t.test('A failed file and scanner outage do not restart other elements; the same request can retry safely', async () => {
    const files = [fixture(), fixture()], batch = await make(files); scannerFails = true;
    try { const failed = await upload(batch, 0, files[0]); assert.equal(failed.status, 503); } finally { scannerFails = false; }
    let state = (await get(batch)).body.batch; assert.equal(state.items[0].uploadState, 'failed'); assert.equal(state.items[0].error.code, 'file_check_unavailable'); assert.equal(state.items[1].uploadState, 'pending');
    assert.equal((await upload(batch, 1, files[1])).status, 201); assert.equal((await upload(batch, 0, files[0])).status, 201);
    state = (await get(batch)).body.batch; assert(state.items.every(item => item.uploadState === 'stored')); assert(state.items.every(item => item.analysisState === 'not_started' && item.reviewState === 'unreviewed'));
    const mismatch = fixture(), bad = await make([mismatch], A, { byteSize: mismatch.bytes.length + 1 }); assert.equal((await upload(bad, 0, mismatch)).body.error.code, 'intake_manifest_mismatch');
  });
  await t.test('Only two account uploads hold active leases; another request waits without allocating a file', async () => {
    const files = [fixture(), fixture(), fixture()], batch = await make(files); let entered = 0, release, ready;
    const gate = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { ready = resolve; });
    const timer = setTimeout(() => { ready(); release(); }, 5000); timer.unref();
    hook = async () => { if (++entered === 2) ready(); await gate; };
    const running = [upload(batch, 0, files[0]), upload(batch, 1, files[1])];
    try {
      await started; assert.equal(entered, 2);
      const third = await upload(batch, 2, files[2]); assert.equal(third.status, 429); assert.equal(third.body.error.code, 'intake_upload_busy');
      const same = await upload(batch, 0, files[0]); assert.equal(same.body.error.code, 'intake_upload_in_progress');
      assert.equal((await get(batch)).body.batch.items[2].uploadState, 'pending');
    } finally { hook = null; clearTimeout(timer); release(); await Promise.all(running); }
    assert.equal((await upload(batch, 2, files[2])).status, 201);
  });
  await t.test('Private originals of another account and own shared originals are not silently merged', async () => {
    const f = fixture(), ba = await make([f]), first = await upload(ba, 0, f), id = first.body.batch.items[0].documentLink.document.id;
    const copy = fixture(f.bytes, 'Private B.pdf'), bb = await make([copy], B), second = await upload(bb, 0, copy, B); assert.equal(second.body.batch.items[0].uploadState, 'stored'); assert.notEqual(second.body.batch.items[0].documentLink.document.id, id);
    await db.document.update({ where: { id }, data: { visibility: 'home' } });
    const own = fixture(f.bytes, 'Private again.pdf'), bc = await make([own]), third = await upload(bc, 0, own); assert.equal(third.body.batch.items[0].uploadState, 'stored'); assert.notEqual(third.body.batch.items[0].documentLink.document.id, id);
  });
  await t.test('Lost commit acknowledgement preserves the committed file; GET and same-key retry recover it', async () => {
    const f = fixture(), batch = await make([f]), authorize = batches.authorized.bind(batches); let dropped = false;
    batches.authorized = async (...args) => { const result = await authorize(...args); if (result === undefined && !dropped) { dropped = true; throw new ServiceUnavailableException('Synthetic lost acknowledgement'); } return result; };
    try { assert.equal((await upload(batch, 0, f)).status, 503); } finally { batches.authorized = authorize; }
    const item = (await get(batch)).body.batch.items[0]; assert.equal(item.uploadState, 'stored');
    const doc = await db.document.findUnique({ where: { id: item.documentLink.document.id }, include: { original: { include: { file: true } } } }); assert(content.has(doc.original.file.storageKey));
    const before = writes; assert.equal((await upload(batch, 0, f)).status, 201); assert.equal(writes, before);
  });
  await t.test('Expired leases reject late publication and expose retryable state; no stray original remains', async () => {
    const f = fixture(), batch = await make([f]);
    hook = () => db.documentIntakeItem.update({ where: { id: batch.items[0].id }, data: { uploadLeaseUntil: new Date(Date.now() - 1000) } });
    try { assert.equal((await upload(batch, 0, f)).body.error.code, 'intake_upload_lease_expired'); } finally { hook = null; }
    assert.equal(await db.document.count({ where: { homeId: home.id, original: { sha256: digest(f.bytes) } } }), 0);
    assert.equal((await get(batch)).body.batch.items[0].error.code, 'intake_upload_lease_expired'); assert.equal((await upload(batch, 0, f)).status, 201);
  });
  await t.test('An unknown database outcome conservatively retains its temporary file for later reference-aware cleanup', async () => {
    const f = fixture(), batch = await make([f]), authorize = batches.authorized.bind(batches), before = new Set(content.keys()); let calls = 0;
    batches.authorized = async (...args) => { if (++calls === 3) throw Error('Synthetic unknown transport outcome'); return authorize(...args); };
    try { assert.equal((await upload(batch, 0, f)).status, 503); } finally { batches.authorized = authorize; }
    const staged = [...content.keys()].filter(key => !before.has(key)); assert.equal(staged.length, 1); assert(!removed.includes(staged[0]));
    assert.equal((await get(batch)).body.batch.items[0].uploadState, 'failed'); assert.equal((await upload(batch, 0, f)).status, 201);
  });
  await t.test('Deduplication rechecks a candidate changed during file integrity reading, without linking a now-private foreign document', async () => {
    const f = fixture(), originalBatch = await make([f]), original = await upload(originalBatch, 0, f), id = original.body.batch.items[0].documentLink.document.id;
    const copy = fixture(f.bytes, 'Copy changed.pdf'), batch = await make([copy]), before = writes;
    readHook = () => db.document.update({ where: { id }, data: { uploaderId: B.account.id } });
    try { const result = await upload(batch, 0, copy); assert.equal(result.status, 409); assert.equal(result.body.error.code, 'intake_source_changed'); } finally { readHook = null; }
    const item = (await get(batch)).body.batch.items[0]; assert.equal(item.documentLink.document, null); assert.equal(item.uploadState, 'failed'); assert.equal(item.duplicate, null); assert.equal(writes, before);
    // Explicit same-request retry now stores the uploader's own private original, not the foreign one.
    const done = await upload(batch, 0, copy); assert.equal(done.status, 201); assert.equal(done.body.batch.items[0].uploadState, 'stored'); assert.notEqual(done.body.batch.items[0].documentLink.document.id, id);
  });
  await t.test('Changed source redacts names/references and membership loss during storage prevents publication', async () => {
    const f = fixture(), batch = await make([f]), done = await upload(batch, 0, f), doc = done.body.batch.items[0].documentLink.document;
    await db.document.update({ where: { id: doc.id }, data: { uploaderId: B.account.id } });
    const hidden = (await get(batch)).body.batch.items[0]; assert.equal(hidden.filename, null); assert.equal(hidden.byteSize, null); assert.equal(hidden.documentLink.document, null); assert.equal(hidden.duplicate, null); assert.deepEqual(hidden.permissions, []); assert(!JSON.stringify(hidden).includes(doc.id));
    const next = fixture(), pending = await make([next]); hook = () => db.homeMembership.update({ where: { accountId_homeId: { accountId: A.account.id, homeId: home.id } }, data: { role: 'viewer' } });
    try { assert.equal((await upload(pending, 0, next)).status, 403); } finally { hook = null; }
    assert.equal(await db.document.count({ where: { homeId: home.id, original: { sha256: digest(next.bytes) } } }), 0);
    assert.deepEqual([await db.aiAttempt.count(), await db.economicAiAttempt.count(), await db.receiptAiAttempt.count()], aiBefore); assert(reads > 0);
  });
});
