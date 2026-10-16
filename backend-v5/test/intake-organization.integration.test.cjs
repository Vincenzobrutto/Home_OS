// B2 HTTP + dedicated DB. Originals are synthetic metadata fixtures; no scanner,
// physical storage, AI or personal-document IO is exercised by this harness.
require('reflect-metadata');
const { test } = require('node:test'), assert = require('node:assert/strict'), { randomUUID, randomBytes } = require('node:crypto');
const { Module } = require('@nestjs/common'), { NestFactory } = require('@nestjs/core'), cookieParser = require('cookie-parser');
const { InfrastructureModule } = require('../dist/app.module'), { PrismaService, assertDevelopmentDatabase } = require('../dist/prisma.service');
const { DocumentPolicy, DocumentAccessGuard } = require('../dist/documents/access');
const { IntakeBatchesService } = require('../dist/document-intake/batches.service'), { IntakeUploadsService } = require('../dist/document-intake/uploads.service'), { DocumentIntakeController } = require('../dist/document-intake/intake.module');
const { DocumentsService } = require('../dist/documents/documents.service'), { PersonalExportService } = require('../dist/personal-export/personal-export.service');
const { ApiErrorFilter } = require('../dist/main'), { COOKIE, digest } = require('../dist/security');
test('B2 durable personal organization, recoverable partial confirmation and document collections', { timeout: 60000 }, async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL);
  class Harness {}
  Module({ imports: [InfrastructureModule], controllers: [DocumentIntakeController], providers: [DocumentPolicy, DocumentAccessGuard, IntakeBatchesService, { provide: IntakeUploadsService, useValue: {} }] })(Harness);
  const app = await NestFactory.create(Harness, { logger: false }); app.setGlobalPrefix('api/v5'); app.use(cookieParser()); app.useGlobalFilters(new ApiErrorFilter()); await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService), service = app.get(IntakeBatchesService), policy = app.get(DocumentPolicy), base = await app.getUrl();
  const accounts = [], docs = [], fileIds = [], users = [], bytes = Buffer.from('%PDF-1.4\nSYNTHETIC ORGANIZATION ONLY');
  const home = await db.home.create({ data: { name: 'B2 SYNTHETIC ONLY', address: 'Via sintetica' } });
  t.after(async () => {
    const own = { homeId: home.id };
    await db.documentIntakeRequest.deleteMany({ where: { batch: own } }); await db.documentIntakeItem.deleteMany({ where: { batch: own } }); await db.documentIntakeBatch.deleteMany({ where: own });
    await db.documentOrganization.deleteMany({ where: own }); await db.objectEvent.deleteMany({ where: own }); await db.objectResourceLink.deleteMany({ where: own }); await db.homeObject.deleteMany({ where: own });
    await db.documentVersion.deleteMany({ where: { documentId: { in: docs } } }); await db.document.deleteMany({ where: { id: { in: docs } } }); await db.storedFile.deleteMany({ where: { id: { in: fileIds } } });
    await db.homeMembership.deleteMany({ where: own }); await db.home.delete({ where: { id: home.id } }); await db.session.deleteMany({ where: { accountId: { in: accounts } } }); await db.account.deleteMany({ where: { id: { in: accounts } } }); await app.close();
  });
  for (const label of ['A', 'B']) {
    const account = await db.account.create({ data: { name: 'Synthetic ' + label, email: randomUUID() + '@example.test', passwordHash: 'not-login' } }); accounts.push(account.id);
    const raw = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url'); await db.session.create({ data: { id: digest(raw), accountId: account.id, csrfToken: csrf, expiresAt: new Date(Date.now() + 3600000) } });
    await db.homeMembership.create({ data: { accountId: account.id, homeId: home.id, role: 'owner' } }); users.push({ a: account.id, raw, csrf });
  }
  const [A, B] = users, h = home.id, path = '/api/v5/homes/' + h + '/document-intake', list = new DocumentsService(db, { read: async () => bytes }, policy);
  const ledgers = async () => Promise.all([db.aiAttempt.count(), db.economicAiAttempt.count(), db.receiptAiAttempt.count(), db.homeExpense.count()]); const before = await ledgers();
  const organize = (title = 'APE sintetico', kinds = ['ape'], target = { kind: 'home' }) => ({ action: 'organize', title, parts: kinds.map(kind => ({ kind, pageFrom: null, pageTo: null })), target });
  const get = batch => service.get(A.a, h, batch.id, {}).then(x => x.batch);
  async function fixture(count = 1, documentId) {
    const batch = (await service.create(A.a, h, { items: Array.from({ length: count }, () => ({ clientItemId: randomUUID(), filename: 'Originale sintetico.pdf', byteSize: bytes.length, mimeType: 'application/pdf' })) }, randomUUID())).batch;
    for (const item of batch.items) {
      let doc = documentId && await db.document.findUnique({ where: { id: documentId }, include: { original: true } });
      if (!doc) { doc = await db.document.create({ data: { homeId: h, uploaderId: A.a, name: 'Titolo originale', original: { create: { originalFilename: item.filename, mimeType: item.mimeType, byteSize: bytes.length, sha256: digest(bytes), file: { create: { storageKey: randomUUID() + '.bin' } } } } }, include: { original: true } }); docs.push(doc.id); fileIds.push(doc.original.fileId); }
      await db.documentIntakeItem.update({ where: { id: item.id }, data: { uploadState: documentId ? 'duplicate' : 'stored', documentId: doc.id, documentVersion: doc.original.version, documentSha256: doc.original.sha256 } });
    }
    return get(batch);
  }
  const review = (batch, i, selection, overrides = {}, key = randomUUID()) => service.review(A.a, h, batch.id, batch.items[i].id, { expectedVersion: batch.items[i].version, expectedOrganizationVersion: batch.items[i].organizationVersion, replaceOrganization: false, selection, ...overrides }, key).then(x => x.batch);
  const confirm = (batch, indexes = [0], key = randomUUID()) => service.confirm(A.a, h, batch.id, { expectedVersion: batch.version, items: indexes.map(i => ({ id: batch.items[i].id, expectedVersion: batch.items[i].version })) }, key);
  const reject = (promise, code) => assert.rejects(promise, e => e.getResponse?.().code === code);
  async function call(who, suffix, body, csrf = who.csrf) {
    const r = await fetch(base + path + suffix, { method: 'POST', headers: { Origin: 'http://127.0.0.1:5174', Cookie: COOKIE + '=' + who.raw, 'X-Account-Context': who.a, 'X-CSRF-Token': csrf, 'Idempotency-Key': randomUUID(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() };
  }
  await t.test('HTTP account/CSRF guards, strict fields and source readiness precede saved decisions', async () => {
    const batch = await fixture(), body = { expectedVersion: 1, expectedOrganizationVersion: 0, replaceOrganization: false, selection: organize() }, url = '/batches/' + batch.id + '/items/' + batch.items[0].id + '/review';
    assert.equal((await call(B, url, body)).status, 403); assert.equal((await call(A, url, body, 'bad')).status, 403);
    assert.equal((await call(A, url, { ...body, visibility: 'home' })).status, 422);
    assert.equal((await call(A, url, body)).status, 201);
    assert.equal((await get(batch)).items[0].reviewState, 'saved'); assert.equal(await db.documentOrganization.count({ where: { homeId: h } }), 0);
  });
  await t.test('Save/defer survives a new instance; selected-only confirmation leaves deferred items open, replay is stable', async () => {
    let batch = await fixture(2), key = randomUUID(), original = batch;
    batch = await review(batch, 0, organize('Energia e pratica', ['ape', 'habitability']), {}, key);
    assert.equal((await review(original, 0, organize('Energia e pratica', ['ape', 'habitability']), {}, key)).items[0].version, batch.items[0].version);
    await reject(review(original, 0, organize('Diverso'), {}, key), 'idempotency_conflict');
    batch = await review(batch, 1, { action: 'defer' });
    const fresh = new IntakeBatchesService(db, policy); assert.equal((await fresh.get(A.a, h, batch.id, {})).batch.items[1].selection.action, 'defer');
    assert.equal((await fresh.reviewReceipt(A.a, h, batch.id, batch.items[0].id, key, {})).recorded, true); assert.equal((await fresh.reviewReceipt(A.a, h, batch.id, batch.items[0].id, randomUUID(), {})).recorded, false);
    const confirmKey = randomUUID(), result = await confirm(batch, [0], confirmKey); assert.equal(result.batch.state, 'open'); assert.equal(result.batch.items[0].reviewState, 'confirmed'); assert.equal(result.batch.items[1].reviewState, 'deferred');
    assert.deepEqual((await confirm(batch, [0], confirmKey)).results, result.results);
    assert.equal((await fresh.confirmation(A.a, h, batch.id, confirmKey, {})).results[batch.items[0].id].state, 'confirmed');
    const id = batch.items[0].documentLink.document.id, doc = await db.document.findUnique({ where: { id } }); assert.equal(doc.name, 'Titolo originale'); assert.equal(doc.visibility, 'private');
    for (const collection of ['energy', 'building']) assert((await list.list(A.a, h, { limit: 50, collection })).items.some(d => d.id === id));
    assert.equal((await list.get(A.a, h, id)).document.name, 'Energia e pratica');
    const json = JSON.parse((await new PersonalExportService(db, policy).export(A.a, h, async () => {})).toString()); assert.deepEqual(json.data.documents.find(d => d.id === id).organization.collections, ['energy', 'building']);
    const zip = await list.export(A.a, h, [id]); assert(zip.includes(Buffer.from('Energia e pratica'))); assert(zip.includes(Buffer.from('Originale sintetico.pdf')));
    batch = result.batch; batch = await review(batch, 1, organize('Regolamento', ['condominium_rules'])); const completed = await confirm(batch, [1]); assert.equal(completed.batch.state, 'completed');
  });
  await t.test('Explicit duplicate reuse completes just its manifest item without creating organization, links or original', async () => {
    const first = await fixture(), id = first.items[0].documentLink.document.id, batch = await fixture(1, id), key = randomUUID(), body = { expectedVersion: batch.items[0].version, action: 'reuse_reference' };
    const before = await db.document.count({ where: { homeId: h } });
    const r = await service.reuseDuplicate(A.a, h, batch.id, batch.items[0].id, body, key); assert.equal(r.batch.state, 'completed');
    assert.equal((await service.reuseDuplicate(A.a, h, batch.id, batch.items[0].id, body, key)).batch.items[0].version, r.batch.items[0].version);
    assert.equal(await db.document.count({ where: { homeId: h } }), before); assert.equal(await db.documentOrganization.count({ where: { documentId: id } }), 0);
  });
  await t.test('One stale saved decision does not roll back another valid selected file', async () => {
    let batch = await fixture(2); batch = await review(batch, 0, organize('Primo')); batch = await review(batch, 1, organize('Secondo'));
    await db.documentIntakeItem.update({ where: { id: batch.items[0].id }, data: { version: { increment: 1 } } });
    const r = await confirm(batch, [0, 1]); assert.equal(r.results[batch.items[0].id].state, 'rejected'); assert.equal(r.results[batch.items[1].id].state, 'confirmed'); assert.equal(r.batch.state, 'open');
  });
  await t.test('Target permissions/version, existing canonical links and concurrent same-key confirmation', async () => {
    const obj = await db.homeObject.create({ data: { accountId: A.a, homeId: h, name: 'Oggetto sintetico', type: 'other' } }), foreign = await db.homeObject.create({ data: { accountId: B.a, homeId: h, name: 'Privato B', type: 'other' } });
    let batch = await fixture(); await assert.rejects(review(batch, 0, organize('Ricevuta', ['receipt'], { kind: 'object', id: foreign.id, expectedVersion: 1 })), e => e.getStatus() === 403);
    await reject(review(batch, 0, organize('Ricevuta', ['receipt'], { kind: 'object', id: obj.id, expectedVersion: 2 })), 'target_version_conflict');
    const id = batch.items[0].documentLink.document.id; await db.objectResourceLink.create({ data: { accountId: A.a, homeId: h, objectId: obj.id, resourceType: 'document', resourceId: id, documentId: id } });
    batch = await review(batch, 0, organize('Ricevuta', ['receipt'], { kind: 'object', id: obj.id, expectedVersion: 1 }));
    const key = randomUUID(), results = await Promise.all([confirm(batch, [0], key), confirm(batch, [0], key)]); assert(results.every(r => r.batch.state === 'completed'));
    assert.equal(await db.objectResourceLink.count({ where: { documentId: id } }), 1); assert.equal((await db.documentOrganization.findFirst({ where: { documentId: id } })).version, 1);
    let stale = await fixture(); stale = await review(stale, 0, organize('Scelta da rivedere', ['receipt'], { kind: 'object', id: obj.id, expectedVersion: 1 }));
    await db.homeObject.update({ where: { id: obj.id }, data: { version: { increment: 1 } } });
    assert.equal((await get(stale)).items[0].selectionStale, true); assert.equal((await confirm(stale)).results[stale.items[0].id].code, 'target_version_conflict');
  });
  await t.test('Existing organization needs explicit replacement, stale organization fails only its item', async () => {
    let first = await fixture(); first = await review(first, 0, organize()); await confirm(first);
    const id = first.items[0].documentLink.document.id; let batch = await fixture(2, id);
    await reject(review(batch, 0, organize('Altro titolo'), { expectedOrganizationVersion: 0 }), 'organization_version_conflict');
    await reject(review(batch, 0, organize('Altro titolo')), 'organization_replace_required');
    batch = await review(batch, 0, organize('Altro titolo'), { replaceOrganization: true }); batch = await review(batch, 1, organize());
    await db.documentOrganization.update({ where: { accountId_homeId_documentId: { accountId: A.a, homeId: h, documentId: id } }, data: { version: { increment: 1 } } });
    const r = await confirm(batch, [0, 1]); assert(Object.values(r.results).every(x => x.state === 'rejected' && x.code === 'organization_version_conflict')); assert(r.batch.items.every(i => i.reviewState === 'saved'));
    assert.equal((await list.get(A.a, h, id)).document.name, 'APE sintetico');
    let changed = await fixture(1, id); changed = await review(changed, 0, organize('Titolo scelto esplicitamente'), { replaceOrganization: true }); await confirm(changed);
    assert.equal((await list.get(A.a, h, id)).document.organization.version, 3);
  });
  await t.test('Commit acknowledgement lost after organization is recoverable by GET/replay without second version or link', async () => {
    let batch = await fixture(); batch = await review(batch, 0, organize('Risposta persa')); const key = randomUUID(), authorize = service.authorized.bind(service); let dropped = false;
    service.authorized = async (...args) => { const r = await authorize(...args); if (!dropped && await db.documentIntakeItem.count({ where: { batchId: batch.id, reviewState: 'confirmed' } })) { dropped = true; throw Error('Synthetic lost acknowledgement'); } return r; };
    try { await assert.rejects(confirm(batch, [0], key), /lost acknowledgement/); } finally { service.authorized = authorize; }
    assert.equal((await service.confirmation(A.a, h, batch.id, key, {})).results[batch.items[0].id].state, 'confirmed');
    assert.equal((await confirm(batch, [0], key)).batch.state, 'completed'); assert.equal((await db.documentOrganization.findFirst({ where: { documentId: batch.items[0].documentLink.document.id } })).version, 1);
  });
  await t.test('Collection/search/cursor are personal; current source snapshots gate list, detail and export metadata', async () => {
    let batch = await fixture(); batch = await review(batch, 0, organize('Titolo personale %_', ['ape', 'scia'])); await confirm(batch);
    const id = batch.items[0].documentLink.document.id;
    assert.equal((await list.list(A.a, h, { limit: 50, q: 'personale %_', collection: 'energy' })).items.length, 1);
    await db.document.update({ where: { id }, data: { visibility: 'home' } });
    assert(!(await list.list(B.a, h, { limit: 50, collection: 'energy' })).items.some(d => d.id === id)); assert.equal((await list.get(B.a, h, id)).document.name, 'Titolo originale');
    const page = await list.list(A.a, h, { limit: 1, collection: 'energy' }); assert(page.nextCursor); await assert.rejects(list.list(A.a, h, { limit: 1, collection: 'building', cursor: page.nextCursor }), e => e.getStatus() === 422);
    await db.documentVersion.update({ where: { documentId: id }, data: { sha256: 'f'.repeat(64) } });
    assert.equal((await list.get(A.a, h, id)).document.organization, null); assert(!(await list.list(A.a, h, { limit: 50, collection: 'energy' })).items.some(d => d.id === id)); assert((await list.list(A.a, h, { limit: 50, collection: 'unclassified' })).items.some(d => d.id === id));
    const redacted = (await get(batch)).items[0]; assert.equal(redacted.filename, null); assert.equal(redacted.selection, null); assert.equal(redacted.organization, null);
    const data = JSON.parse((await new PersonalExportService(db, policy).export(A.a, h, async () => {})).toString()); assert(!data.data.documents.find(d => d.id === id).organization);
  });
  await t.test('Viewer and revoked membership cannot publish even an already-saved decision', async () => {
    let batch = await fixture(); batch = await review(batch, 0, organize('Non pubblicare'));
    const where = { accountId_homeId: { accountId: A.a, homeId: h } };
    try {
      await db.homeMembership.update({ where, data: { role: 'viewer' } }); await assert.rejects(confirm(batch), e => e.getStatus() === 403); assert.deepEqual((await get(batch)).permissions, ['read']);
      await db.homeMembership.update({ where, data: { revokedAt: new Date() } }); await assert.rejects(get(batch), e => e.getStatus() === 403);
    } finally { await db.homeMembership.update({ where, data: { role: 'owner', revokedAt: null } }); }
    assert.equal(await db.documentOrganization.count({ where: { documentId: batch.items[0].documentLink.document.id } }), 0);
  });
  assert.deepEqual(await ledgers(), before);
});
