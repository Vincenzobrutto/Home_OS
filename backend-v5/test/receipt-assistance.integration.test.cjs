require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const cookieParser = require('cookie-parser');
const { InfrastructureModule } = require('../dist/app.module');
const { DocumentsModule } = require('../dist/documents/documents.module');
const { PrismaService, assertDevelopmentDatabase } = require('../dist/prisma.service');
const { ReceiptAssistanceController } = require('../dist/receipt-assistance/receipt.controller');
const { ReceiptAssistanceService } = require('../dist/receipt-assistance/receipt.service');
const { ReviewService } = require('../dist/review/review.service');
const { ApiErrorFilter } = require('../dist/main');
const { digest, COOKIE } = require('../dist/security');
class ReceiptHarness {}
Module({ imports: [InfrastructureModule, DocumentsModule], controllers: [ReceiptAssistanceController], providers: [
  { provide: ReceiptAssistanceService, useFactory: db => new ReceiptAssistanceService(db, new ReviewService(db, {}), { now: () => new Date('2026-10-16T12:00:00Z') }), inject: [PrismaService] },
] })(ReceiptHarness);

test('receipt foundation: real HTTP/controller/session/CSRF and dedicated DB, synthetic fixtures only', { timeout: 60000 }, async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL);
  const app = await NestFactory.create(ReceiptHarness, { logger: false });
  app.setGlobalPrefix('api/v5'); app.use(cookieParser());
  app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.useGlobalFilters(new ApiErrorFilter());
  await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService), base = (await app.getUrl()) + '/api/v5';
  const accounts = [], homes = [], files = [];
  t.after(async () => {
    const where = { accountId: { in: accounts } };
    await db.receiptComparison.deleteMany({ where }); await db.receiptObjectField.deleteMany({ where });
    await db.receiptRequest.deleteMany({ where }); await db.receiptDraft.deleteMany({ where });
    await db.session.deleteMany({ where });
    await db.documentVersion.deleteMany({ where: { document: { uploaderId: { in: accounts } } } });
    await db.document.deleteMany({ where: { uploaderId: { in: accounts } } });
    await db.storedFile.deleteMany({ where: { id: { in: files } } });
    await db.homeObject.deleteMany({ where: { accountId: { in: accounts } } });
    await db.homeMembership.deleteMany({ where: { homeId: { in: homes } } });
    await db.home.deleteMany({ where: { id: { in: homes } } });
    await db.account.deleteMany({ where: { id: { in: accounts } } });
    await app.close();
  });
  const a = await db.account.create({ data: { name: 'Receipt synthetic A', email: randomUUID() + '@example.test', passwordHash: 'not-login' } }); accounts.push(a.id);
  const b = await db.account.create({ data: { name: 'Receipt synthetic B', email: randomUUID() + '@example.test', passwordHash: 'not-login' } }); accounts.push(b.id);
  for (let i = 0; i < 2; i++) homes.push((await db.home.create({ data: { name: 'Receipt synthetic home ' + i, address: 'Via Fixture' } })).id);
  const [home, otherHome] = homes;
  await db.homeMembership.createMany({ data: [{ accountId: a.id, homeId: home, role: 'owner' }, { accountId: b.id, homeId: home, role: 'member' }, { accountId: a.id, homeId: otherHome, role: 'owner' }] });
  const sessions = [];
  for (const account of [a, b]) {
    const raw = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
    await db.session.create({ data: { id: digest(raw), accountId: account.id, csrfToken: csrf, expiresAt: new Date(Date.now() + 3600000) } });
    sessions.push({ account, raw, csrf });
  }
  const [A, B] = sessions;
  const document = async (account, name, visibility = 'private') => {
    const row = await db.document.create({ data: { homeId: home, uploaderId: account.id, name, visibility, original: { create: { originalFilename: 'synthetic.pdf', mimeType: 'application/pdf', byteSize: 16, sha256: 'a'.repeat(64), file: { create: { storageKey: randomUUID() + '.bin' } } } } }, include: { original: true } });
    files.push(row.original.fileId); return row;
  };
  const own = await document(a, 'Receipt own'), foreign = await document(b, 'Foreign secret receipt'), shared = await document(b, 'Shared secret receipt', 'home');
  const path = suffix => `/homes/${home}/receipt-assistance/${suffix}`;
  async function call(session, url, method = 'GET', body, key = randomUUID(), extra = {}) {
    const response = await fetch(base + url, { method, headers: { Origin: 'http://127.0.0.1:5174', ...(session ? { Cookie: COOKIE + '=' + session.raw, 'X-Account-Context': session.account.id, 'X-CSRF-Token': session.csrf } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json', 'Idempotency-Key': key } : {}), ...extra }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  let draft;
  const aiBefore = [await db.aiAttempt.count(), await db.economicAiAttempt.count()];
  await t.test('Auth and CSRF required; capability explicitly not enabled', async () => {
    assert.equal((await call(null, path('capabilities'))).status, 401);
    assert.equal((await call(A, path('manual-drafts'), 'POST', { documentId: own.id }, randomUUID(), { 'X-CSRF-Token': 'x'.repeat(43) })).status, 403);
    const cap = await call(A, path('capabilities'));
    assert.equal(cap.status, 200); assert.equal(cap.body.enabled, false); assert.equal(cap.body.manualEnabled, false);
    assert.equal(cap.body.today, '2026-10-16'); assert.equal(cap.headers.get('cache-control'), 'no-store');
  });
  await t.test('Manual draft empty and persistent; replay and new key do not duplicate', async () => {
    const key = randomUUID(), body = { documentId: own.id };
    const results = await Promise.all([call(A, path('manual-drafts'), 'POST', body, key), call(A, path('manual-drafts'), 'POST', body, key)]);
    assert(results.every(r => r.status === 201)); assert.deepEqual(results[0].body, results[1].body);
    draft = results[0].body.draft;
    assert.equal(draft.mode, 'manual'); assert.deepEqual(draft.fields, {}); assert.equal(draft.total, null);
    assert.equal(draft.documentLink.document.id, own.id); assert.equal(draft.version, 1);
    assert.equal((await call(A, path('manual-drafts'), 'POST', body)).body.draft.id, draft.id);
    assert.equal(await db.receiptDraft.count({ where: { accountId: a.id, documentId: own.id } }), 1);
    const changed = await call(A, path('manual-drafts'), 'POST', { documentId: shared.id }, key);
    assert.equal(changed.status, 409); assert.equal(changed.body.error.code, 'idempotency_conflict');
    assert.deepEqual((await call(A, path('drafts/' + draft.id))).body.draft, draft);
  });
  await t.test('Foreign account/home and private document never leak names or IDs', async () => {
    const forbidden = [await call(B, path('drafts/' + draft.id)), await call(A, `/homes/${otherHome}/receipt-assistance/drafts/${draft.id}`), await call(A, path('manual-drafts'), 'POST', { documentId: foreign.id })];
    for (const result of forbidden) { assert.equal(result.status, 403); assert(!JSON.stringify(result.body).includes('secret')); assert(!JSON.stringify(result.body).includes(foreign.id)); }
    assert.equal((await call(A, path('manual-drafts'), 'POST', { documentId: own.id, fields: { brand: 'Injected' } })).status, 422);
  });
  await t.test('Versioned park/reopen and request ledger remain atomic under concurrency', async () => {
    const attempts = await Promise.all([call(A, path('drafts/' + draft.id + '/park'), 'POST', { expectedVersion: 1 }), call(A, path('drafts/' + draft.id + '/park'), 'POST', { expectedVersion: 1 })]);
    assert.deepEqual(attempts.map(r => r.status).sort(), [200, 409]);
    const row = (await call(A, path('drafts/' + draft.id))).body.draft;
    assert.equal(row.state, 'parked'); assert.equal(row.version, 2);
    const key = randomUUID(), body = { expectedVersion: row.version };
    const first = await call(A, path('drafts/' + draft.id + '/reopen'), 'POST', body, key);
    assert.equal(first.status, 200); assert.equal(first.body.draft.version, 3);
    assert.deepEqual((await call(A, path('drafts/' + draft.id + '/reopen'), 'POST', body, key)).body, first.body);
    assert.equal((await call(A, path('drafts/' + draft.id + '/park'), 'POST', { expectedVersion: 1 })).status, 409);
  });
  await t.test('Revoked document redacts source and extracted data; replay is checked again', async () => {
    const key = randomUUID(), created = await call(A, path('manual-drafts'), 'POST', { documentId: shared.id }, key), id = created.body.draft.id;
    await db.receiptDraft.update({ where: { id }, data: { mode: 'extraction', fields: { brand: { value: 'Secret brand', sources: [{ excerpt: 'Private evidence' }] } }, total: { amountCents: 999 } } });
    await db.document.update({ where: { id: shared.id }, data: { visibility: 'private' } });
    const result = await call(A, path('drafts/' + id));
    assert.equal(result.status, 200); assert.equal(result.body.draft.documentLink.state, 'unavailable');
    assert.deepEqual(result.body.draft.fields, {}); assert.equal(result.body.draft.snapshot, null); assert.equal(result.body.draft.total, null);
    for (const secret of ['Secret brand', 'Private evidence', shared.id, shared.name]) assert(!JSON.stringify(result.body).includes(secret));
    assert.equal((await call(A, path('manual-drafts'), 'POST', { documentId: shared.id }, key)).status, 403);
  });
  await t.test('Object fields and deferred comparisons persist, paginate and resolve without overwrite', async () => {
    const obj = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Coffee fixture', type: 'appliance' } });
    for (const [fieldKey, value] of [['brand', 'Aurora'], ['model', 'Classica 30']]) await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: obj.id, fieldKey, value, origin: 'user_declared' } });
    const refs = [];
    for (const [fieldKey, value] of [['brand', 'Lume'], ['model', 'Mini 90']]) refs.push(await db.receiptComparison.create({ data: { accountId: a.id, homeId: home, draftId: draft.id, objectId: obj.id, fieldKey, targetVersion: 1, fingerprint: digest(fieldKey + value), proposed: { value, sources: [{ documentId: own.id, page: 1, excerpt: value }] } } }));
    await db.receiptDraft.update({ where: { id: draft.id }, data: { state: 'partially_resolved' } });
    const fields = await call(A, path('object-fields/' + obj.id));
    assert.equal(fields.status, 200); assert.equal(fields.body.fields.brand.value, 'Aurora');
    assert.equal((await call(B, path('object-fields/' + obj.id))).status, 403);
    const page = await call(A, path('comparisons?limit=1'));
    assert.equal(page.body.items.length, 1); assert(page.body.nextCursor);
    const next = await call(A, path('comparisons?limit=1&cursor=' + page.body.nextCursor));
    assert.equal(next.body.items.length, 1); assert.notEqual(next.body.items[0].id, page.body.items[0].id);
    assert.equal((await call(B, path('comparisons?limit=1&cursor=' + page.body.nextCursor))).status, 422);
    assert.equal((await call(A, path('comparisons?limit=0'))).status, 422);
    const key = randomUUID(), body = { expectedVersion: 1, action: 'keep_existing' };
    const resolved = await call(A, path('comparisons/' + refs[0].id + '/resolutions'), 'POST', body, key);
    assert.equal(resolved.status, 200); assert.equal(resolved.body.draft.state, 'partially_resolved');
    assert.equal((await call(A, path('comparisons/' + refs[0].id))).body.comparison.state, 'resolved');
    assert.equal((await call(A, path('comparisons/' + refs[0].id + '/resolutions'), 'POST', body, key)).status, 200);
    assert.equal((await call(A, path('comparisons/' + refs[0].id + '/resolutions'), 'POST', body)).status, 409);
    const deferred = await call(A, path('comparisons/' + refs[0].id + '/resolutions'), 'POST', { expectedVersion: 2, action: 'defer' });
    assert.equal(deferred.status, 200);
    for (const ref of refs) {
      const current = await db.receiptComparison.findUnique({ where: { id: ref.id } });
      assert.equal((await call(A, path('comparisons/' + ref.id + '/resolutions'), 'POST', { expectedVersion: current.version, action: 'keep_existing' })).status, 200);
    }
    assert.equal((await db.receiptDraft.findUnique({ where: { id: draft.id } })).state, 'confirmed');
    const persisted = await db.receiptObjectField.findMany({ where: { objectId: obj.id }, orderBy: { fieldKey: 'asc' } });
    assert.deepEqual(persisted.map(f => f.value), ['Aurora', 'Classica 30']);
    assert(persisted.every(f => f.origin === 'user_declared' && f.version === 1));
    assert.equal((await call(B, path('comparisons/' + refs[0].id))).status, 403);
    await db.homeObject.update({ where: { id: obj.id }, data: { version: { increment: 1 } } });
    const stale = await db.receiptComparison.findUnique({ where: { id: refs[0].id } });
    assert.equal((await call(A, path('comparisons/' + stale.id + '/resolutions'), 'POST', { expectedVersion: stale.version, action: 'defer' })).status, 409);
  });
  await t.test('Extracted fields and names are hidden when their source becomes private', async () => {
    const readable = await document(b, 'Field source secret', 'home');
    const obj = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Secret derived name', type: 'appliance' } });
    for (const [fieldKey, value] of [['name', 'Secret derived name'], ['brand', 'Secret extracted brand']]) await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: obj.id, fieldKey, value, origin: 'extraction_confirmed', documentId: readable.id, documentVersion: 1, documentSha256: readable.original.sha256, sources: [{ documentId: readable.id, page: 1, excerpt: value }] } });
    const comparison = await db.receiptComparison.create({ data: { accountId: a.id, homeId: home, draftId: draft.id, objectId: obj.id, fieldKey: 'brand', targetVersion: 1, fingerprint: digest(obj.id), proposed: { value: 'Public receipt proposal', sources: [] } } });
    assert.equal((await call(A, path('comparisons/' + comparison.id))).body.comparison.state, 'open');
    assert.equal((await call(A, path('object-fields/' + obj.id))).body.fields.brand.value, 'Secret extracted brand');
    await db.document.update({ where: { id: readable.id }, data: { visibility: 'private' } });
    const hidden = await call(A, path('object-fields/' + obj.id));
    assert.equal(hidden.body.object.name, null); assert.equal(hidden.body.fields.brand.state, 'unavailable');
    for (const secret of ['Secret derived name', 'Secret extracted brand', readable.id, readable.original.sha256]) assert(!JSON.stringify(hidden.body).includes(secret));
    const hiddenComparison = await call(A, path('comparisons/' + comparison.id));
    assert.equal(hiddenComparison.body.comparison.state, 'unavailable'); assert.equal(hiddenComparison.body.comparison.existing, null); assert.equal(hiddenComparison.body.comparison.proposed, null); assert.equal(hiddenComparison.body.comparison.object, null);
    assert.equal((await call(A, path('comparisons/' + comparison.id + '/resolutions'), 'POST', { expectedVersion: 1, action: 'keep_existing' })).status, 403);
  });
  await t.test('Changed original and viewer write denied; membership revocation blocks old requests', async () => {
    await db.documentVersion.update({ where: { documentId: own.id }, data: { version: { increment: 1 }, sha256: 'b'.repeat(64) } });
    const changed = await call(A, path('drafts/' + draft.id));
    assert.equal(changed.body.draft.documentLink.state, 'unavailable'); assert.equal(changed.body.draft.snapshot, null);
    assert.equal((await call(A, path('drafts/' + draft.id + '/park'), 'POST', { expectedVersion: 3 })).status, 403);
    await db.homeMembership.update({ where: { accountId_homeId: { accountId: a.id, homeId: home } }, data: { role: 'viewer' } });
    assert.equal((await call(A, path('manual-drafts'), 'POST', { documentId: own.id })).status, 403);
    await db.homeMembership.update({ where: { accountId_homeId: { accountId: a.id, homeId: home } }, data: { revokedAt: new Date() } });
    assert.equal((await call(A, path('drafts/' + draft.id))).status, 403);
  });
  assert.deepEqual([await db.aiAttempt.count(), await db.economicAiAttempt.count()], aiBefore);
});
