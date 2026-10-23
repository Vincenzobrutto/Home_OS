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
const { ReceiptReleasePolicy } = require('../dist/receipt-assistance/release-policy');
const { receiptFixturePdf } = require('../dist/receipt-assistance/fixture-provider');
const { ReviewService } = require('../dist/review/review.service');
const { HomeObjectsService } = require('../dist/home-objects/home-objects.service');
const { EconomyPolicy } = require('../dist/economy/policy');
const { EconomyService } = require('../dist/economy/economy.service');
const { ExpensesService } = require('../dist/expenses/expenses.service');
const { PersonalExportService } = require('../dist/personal-export/personal-export.service');
const { DocumentPolicy } = require('../dist/documents/access');
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
    await db.objectEvent.deleteMany({ where }); await db.objectRequest.deleteMany({ where }); await db.objectResourceLink.deleteMany({ where });
    await db.expenseHistory.deleteMany({ where }); await db.expenseRequest.deleteMany({ where }); await db.homeExpense.deleteMany({ where });
    await db.receiptComparison.deleteMany({ where }); await db.receiptObjectField.deleteMany({ where });
    await db.receiptRequest.deleteMany({ where }); await db.receiptDraft.deleteMany({ where });
    await db.session.deleteMany({ where });
    await db.documentVersion.deleteMany({ where: { document: { uploaderId: { in: accounts } } } });
    await db.document.deleteMany({ where: { uploaderId: { in: accounts } } });
    await db.storedFile.deleteMany({ where: { id: { in: files } } });
    await db.objectPosition.deleteMany({ where });
    await db.homeObject.deleteMany({ where: { accountId: { in: accounts } } });
    await db.homeRoom.deleteMany({ where: { homeId: { in: homes } } });
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
  const document = async (account, name, visibility = 'private', sha256 = digest(randomUUID())) => {
    const row = await db.document.create({ data: { homeId: home, uploaderId: account.id, name, visibility, original: { create: { originalFilename: 'synthetic.pdf', mimeType: 'application/pdf', byteSize: 16, sha256, file: { create: { storageKey: randomUUID() + '.bin' } } } } }, include: { original: true } });
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
    assert.equal((await call(A, path('capabilities?documentId=' + own.id))).status, 200);
    assert.equal((await call(A, path('capabilities?documentId=' + randomUUID()))).status, 403);
    assert.equal((await call(A, path('capabilities?documentId=invalid'))).status, 422);
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
  await t.test('Browser release gate limits capability and writes to known synthetic originals without partial side effects', async () => {
    const limited = new ReceiptAssistanceService(db, new ReviewService(db, {}), { now: () => new Date('2026-10-16T12:00:00Z') }, new ReceiptReleasePolicy());
    const fixture = await document(a, 'Approved synthetic receipt', 'private', digest(receiptFixturePdf('purchase')));
    const cap = await limited.capabilities(a.id, home, { documentId: fixture.id });
    assert.equal(cap.enabled, true); assert.equal(cap.manualEnabled, true); assert.equal(cap.providers[0].id, 'receipt_fixture_v1');
    assert.equal((await limited.capabilities(a.id, home, {})).enabled, false);
    assert.equal((await limited.capabilities(a.id, home, { documentId: own.id })).manualEnabled, false);
    const before = await db.receiptDraft.count({ where: { accountId: a.id } });
    await assert.rejects(() => limited.manual(a.id, home, { documentId: own.id }, randomUUID()), e => e.getStatus() === 503);
    assert.equal(await db.receiptDraft.count({ where: { accountId: a.id } }), before);
    await assert.rejects(() => limited.confirm(a.id, home, draft.id, { expectedVersion: draft.version, object: { action: 'skip' }, expense: { action: 'skip' } }, randomUUID()), e => e.getStatus() === 503);
    assert.equal((await db.receiptDraft.findUnique({ where: { id: draft.id } })).state, 'open');
    const saved = (await limited.manual(a.id, home, { documentId: fixture.id }, randomUUID())).draft;
    assert.equal(saved.mode, 'manual');
    assert.deepEqual((await limited.capabilities(a.id, home, { documentId: fixture.id })).resume, { draftId: saved.id, jobId: null });
    await assert.rejects(() => limited.capabilities(b.id, home, { documentId: fixture.id }), e => e.getStatus() === 403);
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
    assert.equal(page.body.items[0].documentLink.document.id, own.id);
    assert.equal(page.body.items[0].draftId, draft.id);
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
    assert.equal(hiddenComparison.body.comparison.draftId, null);
    assert.deepEqual(hiddenComparison.body.comparison.documentLink, { state: 'unavailable', document: null });
    assert.equal(hiddenComparison.body.comparison.state, 'unavailable'); assert.equal(hiddenComparison.body.comparison.existing, null); assert.equal(hiddenComparison.body.comparison.proposed, null); assert.equal(hiddenComparison.body.comparison.object, null);
    assert.equal((await call(A, path('comparisons/' + comparison.id + '/resolutions'), 'POST', { expectedVersion: 1, action: 'keep_existing' })).status, 403);
  });
  const selection = () => ({ expectedVersion: 1, object: { action: 'create', values: { name: 'Manual coffee fixture', brand: 'Lume', model: 'Mini 90' }, origins: { name: 'manual', brand: 'manual', model: 'manual' } }, expense: { action: 'create', values: { title: 'Manual purchase fixture', amountCents: 17990, spentOn: '2026-09-15', supplier: 'Synthetic shop' }, origins: { title: 'manual', amount: 'manual', date: 'manual', supplier: 'manual' } } });
  const manualDraft = async doc => (await call(A, path('manual-drafts'), 'POST', { documentId: doc.id })).body.draft;
  const confirmation = (id, body, key) => call(A, path('drafts/' + id + '/confirmations'), 'POST', body, key);
  await t.test('Atomic 1/1 confirmation, concurrent replay and explicit outcome recovery', async () => {
    const doc = await document(a, 'Atomic receipt'), row = await manualDraft(doc), body = selection(), key = randomUUID();
    const sent = await Promise.all([confirmation(row.id, body, key), confirmation(row.id, body, key)]);
    assert(sent.every(r => r.status === 200)); assert.deepEqual(sent[0].body, sent[1].body);
    const result = sent[0].body.draft.confirmation;
    assert.equal(result.newObjects, 1); assert.equal(result.newExpenses, 1); assert.equal(result.openComparisons, 0);
    assert.equal(await db.homeExpense.count({ where: { accountId: a.id, documentId: doc.id } }), 1);
    assert.equal(await db.objectResourceLink.count({ where: { accountId: a.id, objectId: result.object.id, documentId: doc.id, state: 'active' } }), 1);
    assert.equal(await db.objectResourceLink.count({ where: { accountId: a.id, objectId: result.object.id, expenseId: result.expense.id, state: 'active' } }), 1);
    const fields = await db.receiptObjectField.findMany({ where: { objectId: result.object.id } });
    assert.equal(fields.length, 3); assert(fields.every(f => f.origin === 'user_declared' && f.documentId === null));
    assert.equal((await call(A, path('drafts/' + row.id + '/confirmation'), 'GET', undefined, key, { 'Idempotency-Key': key })).body.status, 'confirmed');
    assert.equal((await call(A, path('drafts/' + row.id + '/confirmation'), 'GET', undefined, randomUUID(), { 'Idempotency-Key': randomUUID() })).body.status, 'not_found');
    assert.equal((await confirmation(row.id, { ...body, expense: { action: 'skip' } }, key)).status, 409);
    assert.equal((await confirmation(row.id, body)).status, 409);
    assert.equal(await db.expenseHistory.count({ where: { expenseId: result.expense.id, kind: 'created' } }), 1);
    assert.equal((await call(B, path('drafts/' + row.id + '/confirmation'), 'GET', undefined, key, { 'Idempotency-Key': key })).status, 403);
  });
  await t.test('Late expense conflict rolls back object, fields, links and ledger', async () => {
    const doc = await document(a, 'Rollback receipt'), row = await manualDraft(doc), body = selection();
    const prior = await db.homeExpense.create({ data: { accountId: a.id, homeId: home, documentId: doc.id, title: 'Already registered', amountCents: 49900, spentOn: '2026-06-16' } });
    const before = await db.homeObject.count({ where: { accountId: a.id, homeId: home } }), key = randomUUID();
    const rejected = await confirmation(row.id, body, key);
    assert.equal(rejected.status, 409); assert.equal(rejected.body.error.code, 'receipt_expense_already_linked');
    assert.equal(await db.homeObject.count({ where: { accountId: a.id, homeId: home } }), before);
    assert.equal(await db.objectResourceLink.count({ where: { documentId: doc.id } }), 0);
    assert.equal(await db.receiptRequest.count({ where: { accountId: a.id, operation: 'confirm', key } }), 0);
    assert.equal((await db.receiptDraft.findUnique({ where: { id: row.id } })).state, 'open');
    const reused = await confirmation(row.id, { ...body, expense: { action: 'reuse', targetId: prior.id, targetVersion: prior.version } });
    assert.equal(reused.status, 200); assert.equal(reused.body.draft.confirmation.newExpenses, 0);
    const kept = await db.homeExpense.findUnique({ where: { id: prior.id } });
    assert.equal(kept.amountCents, 49900); assert.equal(kept.spentOn, '2026-06-16'); assert.equal(kept.title, 'Already registered');
    const retryDraft = await manualDraft(doc), existingObject = await db.homeObject.findUnique({ where: { id: reused.body.draft.confirmation.object.id } });
    const stable = { expectedVersion: 1, object: { action: 'reuse', targetId: existingObject.id, targetVersion: existingObject.version, fields: [] }, expense: { action: 'reuse', targetId: kept.id, targetVersion: prior.version } };
    assert.equal((await confirmation(retryDraft.id, stable)).status, 409);
    stable.expense.targetVersion = kept.version;
    const same = await confirmation(retryDraft.id, stable); assert.equal(same.status, 200); assert.equal(same.body.draft.confirmation.newObjects, 0); assert.equal(same.body.draft.confirmation.newExpenses, 0);
  });
  await t.test('Independent object/expense choices and both skipped preserve exact counts', async () => {
    for (const [objects, expenses] of [[1, 0], [0, 1], [0, 0]]) {
      const doc = await document(a, 'Independent receipt ' + objects + expenses), row = await manualDraft(doc), body = selection();
      if (!objects) body.object = { action: 'skip' }; if (!expenses) body.expense = { action: 'skip' };
      const sent = await confirmation(row.id, body);
      assert.equal(sent.status, 200); const result = sent.body.draft.confirmation;
      assert.equal(result.newObjects, objects); assert.equal(result.newExpenses, expenses);
      if (!objects) assert.equal(result.object, null); if (!expenses) assert.equal(result.expense, null);
      assert.equal(await db.homeExpense.count({ where: { documentId: doc.id } }), expenses);
    }
  });
  await t.test('Existing object conflicts persist, resolve on reanalysis and never overwrite', async () => {
    const doc = await document(a, 'Conflict receipt'), row = await manualDraft(doc);
    const object = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Existing coffee', type: 'appliance' } });
    for (const [fieldKey, value] of [['brand', 'Aurora'], ['model', 'Classica 30']]) await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: object.id, fieldKey, value, origin: 'user_declared' } });
    // Trusted worker output is seeded, not a claim of PDF/provider extraction quality.
    const fields = { brand: { value: 'Lume', sources: [{ documentId: doc.id, page: 1, excerpt: 'Lume' }] }, model: { value: 'Mini 90', sources: [{ documentId: doc.id, page: 1, excerpt: 'Mini 90' }] } };
    await db.receiptDraft.update({ where: { id: row.id }, data: { mode: 'extraction', fields } });
    const body = { expectedVersion: 1, object: { action: 'reuse', targetId: object.id, targetVersion: 1, fields: [{ field: 'brand', action: 'defer' }, { field: 'model', action: 'keep_existing' }] }, expense: { action: 'skip' } };
    const first = await confirmation(row.id, body);
    assert.equal(first.status, 200); assert.equal(first.body.draft.state, 'partially_resolved'); assert.equal(first.body.draft.confirmation.openComparisons, 1);
    assert.equal(await db.receiptComparison.count({ where: { objectId: object.id } }), 2);
    const next = await manualDraft(doc); await db.receiptDraft.update({ where: { id: next.id }, data: { mode: 'extraction', fields } });
    const second = await confirmation(next.id, { ...body, object: { ...body.object, fields: [{ field: 'brand', action: 'keep_existing' }, { field: 'model', action: 'keep_existing' }] } });
    assert.equal(second.status, 200); assert.equal(second.body.draft.confirmation.openComparisons, 0);
    assert.equal((await db.receiptDraft.findUnique({ where: { id: row.id } })).state, 'confirmed');
    const again = await manualDraft(doc); await db.receiptDraft.update({ where: { id: again.id }, data: { mode: 'extraction', fields } });
    assert.equal((await confirmation(again.id, body)).status, 200);
    assert.equal(await db.receiptComparison.count({ where: { objectId: object.id } }), 2);
    assert.equal(await db.receiptComparison.count({ where: { objectId: object.id, state: 'open' } }), 0);
    const saved = await db.receiptObjectField.findMany({ where: { objectId: object.id }, orderBy: { fieldKey: 'asc' } });
    assert.deepEqual(saved.map(f => f.value), ['Aurora', 'Classica 30']);
    const noOverwrite = await manualDraft(doc);
    assert.equal((await confirmation(noOverwrite.id, { ...body, object: { ...body.object, fields: [{ field: 'brand', action: 'manual', value: 'Override' }] } })).status, 422);
  });
  await t.test('Source, target versions and claimed extraction origin are checked before publication', async () => {
    const doc = await document(a, 'Guard receipt'), row = await manualDraft(doc), body = selection();
    body.object.origins.brand = 'extraction';
    assert.equal((await confirmation(row.id, body)).status, 422);
    assert.equal(await db.objectResourceLink.count({ where: { documentId: doc.id } }), 0);
    const obj = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Stale coffee', type: 'appliance', version: 2 } });
    const reuse = { expectedVersion: 1, object: { action: 'reuse', targetId: obj.id, targetVersion: 1, fields: [] }, expense: { action: 'skip' } };
    assert.equal((await confirmation(row.id, reuse)).status, 409);
    await db.documentVersion.update({ where: { documentId: doc.id }, data: { sha256: 'b'.repeat(64) } });
    assert.equal((await confirmation(row.id, selection())).status, 403);
  });
  await t.test('Foreign targets and expense relinking fail without partial writes', async () => {
    const doc = await document(a, 'Cross-target receipt'), row = await manualDraft(doc);
    const obj = await db.homeObject.create({ data: { accountId: b.id, homeId: home, name: 'Foreign object secret', type: 'appliance' } });
    const foreignCost = await db.homeExpense.create({ data: { accountId: b.id, homeId: home, title: 'Foreign cost secret', amountCents: 100, spentOn: '2026-09-15' } });
    const ownObjectCount = await db.homeObject.count({ where: { accountId: a.id, homeId: home } });
    const denied = await confirmation(row.id, { expectedVersion: 1, object: { action: 'reuse', targetId: obj.id, targetVersion: 1, fields: [] }, expense: { action: 'skip' } });
    assert.equal(denied.status, 403); assert(!JSON.stringify(denied.body).includes('Foreign object secret'));
    const costDenied = await confirmation(row.id, { ...selection(), expense: { action: 'reuse', targetId: foreignCost.id, targetVersion: 1 } });
    assert.equal(costDenied.status, 403); assert.equal(await db.homeObject.count({ where: { accountId: a.id, homeId: home } }), ownObjectCount);
    const otherDoc = await document(a, 'Other receipt for conflict');
    const unrelated = await db.homeExpense.create({ data: { accountId: a.id, homeId: home, documentId: otherDoc.id, title: 'Other registered cost', amountCents: 100, spentOn: '2026-09-15' } });
    assert.equal((await confirmation(row.id, { ...selection(), expense: { action: 'reuse', targetId: unrelated.id, targetVersion: 1 } })).status, 409);
    assert.equal(await db.objectResourceLink.count({ where: { documentId: doc.id } }), 0);
    assert.equal((await db.receiptDraft.findUnique({ where: { id: row.id } })).confirmation, null);
  });
  await t.test('Receipt-derived names obey revocation in G1 search, details, history, S1 links and export', async () => {
    const source = await document(b, 'Shared naming evidence', 'home');
    const object = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Derived confidential name', type: 'other' } });
    await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: object.id, fieldKey: 'name', value: object.name, origin: 'extraction_confirmed', documentId: source.id, documentVersion: 1, documentSha256: source.original.sha256, sources: [{ documentId: source.id, page: 1, excerpt: "Synthetic evidence" }] } });
    const access = new ReviewService(db, {}), g1 = new HomeObjectsService(db, access), economy = new EconomyPolicy(access);
    const s1 = new EconomyService(new ExpensesService(db, access, { now: () => new Date('2026-10-16T12:00:00Z') }), access);
    const room = await db.homeRoom.create({ data: { homeId: home, name: 'Receipt privacy room', type: 'other' } });
    await db.objectPosition.create({ data: { accountId: a.id, homeId: home, objectId: object.id, roomIds: [room.id] } });
    const cost = await db.homeExpense.create({ data: { accountId: a.id, homeId: home, title: 'Manual own cost', amountCents: 123, spentOn: '2026-10-16' } });
    await db.objectResourceLink.create({ data: { accountId: a.id, homeId: home, objectId: object.id, expenseId: cost.id, resourceType: 'expense', resourceId: cost.id } });
    const roomQuery = { from: '2026-10-01', to: '2026-10-31', roomId: room.id };
    assert.equal((await s1.summary(a.id, home, roomQuery)).totalCents, '123');
    const exporter = new PersonalExportService(db, new DocumentPolicy(db));
    const getExport = async () => JSON.parse((await exporter.export(a.id, home, async () => {})).toString());
    assert.equal((await g1.getObject(a.id, home, 'object', object.id, {})).object.name, object.name);
    assert.equal((await g1.objects(a.id, home, { q: 'Derived confidential', limit: '1' })).items[0].ref.id, object.id);
    assert((await getExport()).data.objects.some(row => row.id === object.id));
    const renamed = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Old derived secret', type: 'other' } });
    await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: renamed.id, fieldKey: 'name', value: renamed.name, origin: 'extraction_confirmed', documentId: source.id, documentVersion: 1, documentSha256: source.original.sha256, sources: [{ documentId: source.id, page: 1, excerpt: renamed.name }] } });
    const renameKey = randomUUID(), renameBody = { expectedVersion: 1, name: 'My manual name' };
    await g1.updateObject(a.id, home, renamed.id, renameBody, renameKey);
    await db.document.update({ where: { id: source.id }, data: { visibility: 'private' } });
    const page = await g1.objects(a.id, home, { q: 'Derived confidential', limit: '1' });
    assert.deepEqual(page, {
      items: [], nextCursor: null, total: 0,
      facets: { all: 0, unplaced: 0, rooms: [{ id: room.id, name: room.name, count: 0 }] },
      today: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }),
    });
    for (const read of [() => g1.getObject(a.id, home, 'object', object.id, {}), () => g1.history(a.id, home, 'object', object.id, {}), () => g1.links(a.id, home, 'object', object.id, { resourceType: 'document' })]) await assert.rejects(read, e => e.getStatus() === 403);
    assert.equal(await db.$transaction(tx => economy.subject(tx, a.id, home, { kind: 'object', id: object.id })), null);
    assert.equal((await s1.summary(a.id, home, roomQuery)).totalCents, '0');
    assert.equal((await s1.get(a.id, home, cost.id, {})).expense.amountCents, 123);
    const result = await getExport();
    assert(!JSON.stringify(result).includes(object.name)); assert(!result.data.objects.some(row => row.id === object.id));
    assert(result.limitations.includes('some_references_excluded'));
    assert(!JSON.stringify(result).includes(renamed.name));
    assert.equal((await g1.getObject(a.id, home, 'object', renamed.id, {})).object.name, 'My manual name');
    assert(!JSON.stringify(await g1.history(a.id, home, 'object', renamed.id, {})).includes(renamed.name));
    assert.equal((await g1.updateObject(a.id, home, renamed.id, renameBody, renameKey)).object.name, 'My manual name');
    const nameField = await db.receiptObjectField.findUnique({ where: { objectId_fieldKey: { objectId: renamed.id, fieldKey: 'name' } } });
    assert.equal(nameField.origin, 'user_declared'); assert.equal(nameField.documentId, null); assert.deepEqual(nameField.sources, []);
    // A manually named object remains readable even when only its extracted brand loses its source.
    const manual = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Manual safe name', type: 'other' } });
    await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: manual.id, fieldKey: 'brand', value: 'Hidden brand', origin: 'extraction_confirmed', documentId: source.id, documentVersion: 1, documentSha256: source.original.sha256, sources: [{ documentId: source.id, page: 1, excerpt: "Synthetic evidence" }] } });
    assert.equal((await g1.getObject(a.id, home, 'object', manual.id, {})).object.name, manual.name);
    assert(!JSON.stringify(await getExport()).includes('Hidden brand'));
    await db.document.update({ where: { id: source.id }, data: { visibility: 'home' } });
    await db.documentVersion.update({ where: { documentId: source.id }, data: { sha256: 'c'.repeat(64) } });
    await assert.rejects(() => g1.getObject(a.id, home, 'object', object.id, {}), e => e.getStatus() === 403);
  });
  await t.test('Export rechecks receipt name source after its RepeatableRead snapshot', async () => {
    const source = await document(b, 'Export race evidence', 'home');
    const object = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Race protected name', type: 'other' } });
    await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: object.id, fieldKey: 'name', value: object.name, origin: 'extraction_confirmed', documentId: source.id, documentVersion: 1, documentSha256: source.original.sha256, sources: [{ documentId: source.id, page: 1, excerpt: "Synthetic evidence" }] } });
    let first = true;
    const facade = { $transaction: async (fn, options) => {
      const result = await db.$transaction(fn, options);
      if (first) {
        first = false;
        // Replacing the current field cannot authorize a stale captured value.
        await db.receiptObjectField.update({ where: { objectId_fieldKey: { objectId: object.id, fieldKey: 'name' } }, data: { origin: 'user_declared', sources: [], documentId: null, documentVersion: null, documentSha256: null } });
        await db.document.update({ where: { id: source.id }, data: { visibility: 'private' } });
      }
      return result;
    } };
    const exporter = new PersonalExportService(facade, new DocumentPolicy(db));
    await assert.rejects(() => exporter.export(a.id, home, async () => {}), e => e.getStatus() === 403);
  });
  await t.test('Personal JSON exports receipt fields and deferred comparisons through explicit allowlists', async () => {
    const source = await document(a, 'Receipt export own evidence'), row = await manualDraft(source);
    const obj = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Receipt export object', type: 'other' } });
    const field = await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: obj.id, fieldKey: 'brand', value: 'Exported brand', origin: 'extraction_confirmed', documentId: source.id, documentVersion: 1, documentSha256: source.original.sha256, sources: [{ documentId: source.id, page: 1, excerpt: 'Exported brand', privateToken: 'Forbidden export raw token' }] } });
    const comparison = await db.receiptComparison.create({ data: { accountId: a.id, homeId: home, objectId: obj.id, draftId: row.id, fieldKey: 'brand', targetVersion: 1, fingerprint: digest(randomUUID()), proposed: { value: 'Different brand', privateToken: 'Forbidden export raw token', sources: [{ page: 1, excerpt: 'Different brand' }] } } });
    const exporter = new PersonalExportService(db, new DocumentPolicy(db));
    const exported = JSON.parse((await exporter.export(a.id, home, async () => {})).toString());
    const savedField = exported.data.receiptFields.find(f => f.id === field.id), savedComparison = exported.data.receiptComparisons.find(c => c.id === comparison.id);
    assert.equal(savedField.value, 'Exported brand'); assert.equal(savedField.sources[0].documentVersion, 1); assert.equal(savedField.sources[0].documentSha256, source.original.sha256);
    assert.equal(savedComparison.objectId, obj.id); assert.equal(savedComparison.state, 'open'); assert.equal(savedComparison.proposed.value, 'Different brand'); assert.equal(savedComparison.proposed.sources[0].documentId, source.id);
    assert(!JSON.stringify(exported).includes('Forbidden export raw token')); assert(!Object.hasOwn(savedComparison, 'fingerprint')); assert(!Object.hasOwn(savedComparison, 'draftId'));
    await db.documentVersion.update({ where: { documentId: source.id }, data: { sha256: 'd'.repeat(64) } });
    const changed = JSON.parse((await exporter.export(a.id, home, async () => {})).toString());
    assert(!changed.data.receiptFields.some(f => f.id === field.id)); assert(!changed.data.receiptComparisons.some(c => c.id === comparison.id));
    assert(changed.data.objects.some(o => o.id === obj.id));
  });
  await t.test('Candidate pages prioritize explicit links, preserve ambiguity and bind cursors to account/draft/kind', async () => {
    const source = await document(a, 'Candidate receipt'), row = await manualDraft(source);
    const linked = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Existing explicit coffee', type: 'other' } });
    const room = await db.homeRoom.create({ data: { homeId: home, name: 'Candidate kitchen', type: 'kitchen' } });
    await db.objectPosition.create({ data: { accountId: a.id, homeId: home, objectId: linked.id, roomIds: [room.id] } });
    await db.objectResourceLink.create({ data: { accountId: a.id, homeId: home, objectId: linked.id, documentId: source.id, resourceType: 'document', resourceId: source.id } });
    const matches = [];
    for (let i = 0; i < 2; i++) {
      const obj = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Ambiguous coffee ' + i, type: 'other' } }); matches.push(obj);
      for (const [fieldKey, value] of [['brand', 'Lume'], ['model', 'Mini 90']]) await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: obj.id, fieldKey, value, origin: 'user_declared' } });
    }
    const nameOnly = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Same proposed name', type: 'other' } });
    const foreignObject = await db.homeObject.create({ data: { accountId: b.id, homeId: home, name: 'Candidate foreign secret', type: 'other' } });
    const archived = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Candidate archived', type: 'other', state: 'archived' } });
    await db.receiptDraft.update({ where: { id: row.id }, data: { mode: 'extraction', fields: { name: { value: nameOnly.name, sources: [] }, brand: { value: ' lume ', sources: [] }, model: { value: 'Mini 90', sources: [] } } } });
    const first = await call(A, path('drafts/' + row.id + '/object-candidates?limit=1'));
    assert.equal(first.status, 200); assert.equal(first.body.linkedCount, 1); assert.equal(first.body.items[0].id, linked.id); assert.equal(first.body.items[0].roomName, room.name); assert.deepEqual(first.body.items[0].reasons, ['same_document']); assert(first.body.nextCursor);
    const seen = [...first.body.items]; let cursor = first.body.nextCursor;
    while (cursor) {
      const next = await call(A, path('drafts/' + row.id + '/object-candidates?limit=2&cursor=' + cursor));
      assert.equal(next.status, 200); seen.push(...next.body.items); cursor = next.body.nextCursor;
    }
    assert.equal(new Set(seen.map(item => item.id)).size, seen.length);
    for (const match of matches) {
      const index = seen.findIndex(item => item.id === match.id);
      assert(index > 0 && index < seen.findIndex(item => item.id === nameOnly.id));
    }
    assert(seen.filter(item => matches.some(match => match.id === item.id)).every(item => item.reasons.includes('same_brand_model') && !item.linkedToDocument));
    assert.deepEqual(seen.find(item => item.id === nameOnly.id).reasons, []);
    assert(!seen.some(item => [foreignObject.id, archived.id].includes(item.id))); assert(!JSON.stringify(seen).includes(foreignObject.name));
    for (const secret of ['Secret derived name', 'Derived confidential name', 'Secret extracted brand', 'Hidden brand']) assert(!JSON.stringify(seen).includes(secret));
    const secondLinked = matches[0];
    await db.objectResourceLink.create({ data: { accountId: a.id, homeId: home, objectId: secondLinked.id, documentId: source.id, resourceType: 'document', resourceId: source.id } });
    const partialLinkedPage = await call(A, path('drafts/' + row.id + '/object-candidates?limit=1'));
    assert.equal(partialLinkedPage.body.items.length, 1); assert.equal(partialLinkedPage.body.linkedCount, 2); assert(partialLinkedPage.body.nextCursor);
    assert.equal((await call(B, path('drafts/' + row.id + '/object-candidates?cursor=' + first.body.nextCursor))).status, 403);
    assert.equal((await call(A, path('drafts/' + row.id + '/expense-candidates?cursor=' + first.body.nextCursor))).status, 422);
    assert.equal((await call(A, path('drafts/' + row.id + '/object-candidates?limit=51'))).status, 422);
    assert.equal((await call(A, path('drafts/' + row.id + '/object-candidates?accountId=' + b.id))).status, 422);
    await db.receiptDraft.update({ where: { id: row.id }, data: { version: { increment: 1 } } });
    assert.equal((await call(A, path('drafts/' + row.id + '/object-candidates?cursor=' + first.body.nextCursor))).status, 422);
  });
  await t.test('Identical readable originals under different Document IDs reuse one object and cost', async () => {
    const original = await document(a, 'Original duplicate receipt'), row = await manualDraft(original);
    const first = await confirmation(row.id, selection()); assert.equal(first.status, 200);
    const saved = first.body.draft.confirmation;
    const duplicate = await document(a, 'Same original uploaded again', 'private', original.original.sha256), second = await manualDraft(duplicate);
    const objects = await call(A, path('drafts/' + second.id + '/object-candidates?limit=1'));
    const costs = await call(A, path('drafts/' + second.id + '/expense-candidates?limit=1'));
    assert.equal(objects.status, 200); assert.equal(costs.status, 200);
    assert.equal(objects.body.items[0].id, saved.object.id); assert.equal(costs.body.items[0].id, saved.expense.id);
    assert.equal(objects.body.linkedCount, 1); assert.equal(costs.body.linkedCount, 1);
    assert.deepEqual(objects.body.items[0].reasons, ['same_original']); assert.equal(costs.body.items[0].linkedToDocument, true);
    assert.equal((await confirmation(second.id, selection())).body.error.code, 'receipt_object_already_linked');
    assert.equal((await confirmation(second.id, { ...selection(), object: { action: 'skip' } })).body.error.code, 'receipt_expense_already_linked');
    const target = await db.homeObject.findUnique({ where: { id: saved.object.id } }), expense = await db.homeExpense.findUnique({ where: { id: saved.expense.id } });
    const body = { expectedVersion: 1, object: { action: 'reuse', targetId: target.id, targetVersion: target.version, fields: [] }, expense: { action: 'reuse', targetId: expense.id, targetVersion: expense.version } };
    const result = await confirmation(second.id, body); assert.equal(result.status, 200); assert.equal(result.body.draft.confirmation.newObjects, 0); assert.equal(result.body.draft.confirmation.newExpenses, 0);
    assert.equal(await db.homeExpense.count({ where: { accountId: a.id, documentId: { in: [original.id, duplicate.id] } } }), 1);
    const unchanged = await db.homeExpense.findUnique({ where: { id: expense.id } }); assert.deepEqual(unchanged, expense);
    assert.equal(await db.objectResourceLink.count({ where: { objectId: target.id, documentId: duplicate.id, state: 'active' } }), 1);
    assert.equal((await call(A, path('drafts/' + second.id + '/object-candidates?limit=1'))).body.items[0].reasons[0], 'same_document');
  });
  await t.test('Concurrent copies serialize to one purchase and copied evidence never reopens a resolved comparison', async () => {
    const original = await document(a, 'Concurrent duplicate original'), duplicate = await document(a, 'Concurrent duplicate copy', 'private', original.original.sha256);
    const drafts = await Promise.all([manualDraft(original), manualDraft(duplicate)]);
    const results = await Promise.all(drafts.map(row => confirmation(row.id, selection())));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    assert.equal(await db.homeExpense.count({ where: { accountId: a.id, documentId: { in: [original.id, duplicate.id] } } }), 1);
    const evidence = await document(a, 'Resolved evidence original'), copy = await document(a, 'Resolved evidence copy', 'private', evidence.original.sha256);
    const target = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Conflict copy coffee', type: 'other' } });
    await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: target.id, fieldKey: 'brand', value: 'Aurora', origin: 'user_declared' } });
    for (const [index, doc] of [evidence, copy].entries()) {
      const row = await manualDraft(doc);
      await db.receiptDraft.update({ where: { id: row.id }, data: { mode: 'extraction', fields: { brand: { value: 'Lume', sources: [{ documentId: doc.id, page: 1, excerpt: 'Lume' }] } } } });
      const result = await confirmation(row.id, { expectedVersion: 1, object: { action: 'reuse', targetId: target.id, targetVersion: 1, fields: [{ field: 'brand', action: index ? 'defer' : 'keep_existing' }] }, expense: { action: 'skip' } });
      assert.equal(result.status, 200); assert.equal(result.body.draft.confirmation.openComparisons, 0); assert.equal(result.body.draft.state, 'confirmed');
    }
    assert.equal(await db.receiptComparison.count({ where: { objectId: target.id } }), 1);
    assert.equal(await db.receiptComparison.count({ where: { objectId: target.id, state: 'resolved' } }), 1);
  });
  await t.test('Private unrelated original with matching hash does not reveal or block another account’s records', async () => {
    const hidden = await document(b, 'Hidden same hash source'), visible = await document(a, 'Own independent source', 'private', hidden.original.sha256);
    const hiddenObject = await db.homeObject.create({ data: { accountId: b.id, homeId: home, name: 'Hidden same hash object', type: 'other' } });
    await db.objectResourceLink.create({ data: { accountId: b.id, homeId: home, objectId: hiddenObject.id, documentId: hidden.id, resourceType: 'document', resourceId: hidden.id } });
    const hiddenCost = await db.homeExpense.create({ data: { accountId: b.id, homeId: home, title: 'Hidden same hash cost', amountCents: 17990, spentOn: '2026-09-15', documentId: hidden.id } });
    const row = await manualDraft(visible);
    for (const kind of ['object', 'expense']) {
      const result = await call(A, path('drafts/' + row.id + '/' + kind + '-candidates'));
      assert.equal(result.status, 200);
      for (const secret of [hidden.id, hiddenObject.id, hiddenCost.id, hiddenObject.name, hiddenCost.title]) assert(!JSON.stringify(result.body).includes(secret));
    }
    assert.equal((await confirmation(row.id, selection())).status, 200);
    // A revoked source cannot be used to enumerate candidates, even with an old draft.
    const shared = await document(b, 'Candidate revoked source', 'home'), old = await manualDraft(shared);
    await db.document.update({ where: { id: shared.id }, data: { visibility: 'private' } });
    assert.equal((await call(A, path('drafts/' + old.id + '/object-candidates'))).status, 403);
    assert.equal((await call(A, path('drafts/' + old.id + '/expense-candidates'))).status, 403);
  });
  await t.test('Park persists reviewed manual choices and replay; reopen restores them without canonical side effects', async () => {
    const doc = await document(a, 'Saved manual review'), row = await manualDraft(doc), chosen = selection();
    chosen.object.values.name = 'My saved coffee'; chosen.expense.values.title = 'My saved purchase'; chosen.expense.values.amountCents = 21500;
    const key = randomUUID(), body = { expectedVersion: 1, selection: { object: chosen.object, expense: chosen.expense } };
    const before = [await db.homeObject.count({ where: { accountId: a.id } }), await db.homeExpense.count({ where: { accountId: a.id } })];
    const parked = await call(A, path('drafts/' + row.id + '/park'), 'POST', body, key); assert.equal(parked.status, 200); assert.equal(parked.body.draft.state, 'parked');
    assert.deepEqual((await call(A, path('drafts/' + row.id + '/park'), 'POST', body, key)).body, parked.body);
    const saved = (await call(A, path('drafts/' + row.id))).body.draft;
    assert.equal(saved.review.form.values.name, 'My saved coffee'); assert.equal(saved.review.form.values.title, 'My saved purchase'); assert.equal(saved.review.form.values.amount, '215,00'); assert.equal(saved.review.form.values.date, '2026-09-15');
    assert.equal(saved.review.form.object.kind, 'create'); assert.equal(saved.review.form.expense.kind, 'create'); assert.deepEqual(saved.fields, {}); assert.equal(saved.total, null);
    assert.deepEqual([await db.homeObject.count({ where: { accountId: a.id } }), await db.homeExpense.count({ where: { accountId: a.id } })], before);
    assert.equal((await confirmation(row.id, { ...chosen, expectedVersion: 2 })).status, 409);
    const reopened = await call(A, path('drafts/' + row.id + '/reopen'), 'POST', { expectedVersion: 2 }); assert.equal(reopened.status, 200); assert.equal(reopened.body.draft.version, 3); assert.deepEqual(reopened.body.draft.review, saved.review);
    const done = await confirmation(row.id, { ...chosen, expectedVersion: 3 }); assert.equal(done.status, 200); assert.equal(done.body.draft.confirmation.expense.amountCents, 21500);
    assert.equal((await db.homeObject.findUnique({ where: { id: done.body.draft.confirmation.object.id } })).name, 'My saved coffee');
  });
  await t.test('Saved target changes reset selection and decisions, preserving manually reviewed cost values', async () => {
    const doc = await document(a, 'Saved target review'), row = await manualDraft(doc), target = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Selected own object', type: 'other' } });
    const chosen = selection(); chosen.object = { action: 'reuse', targetId: target.id, targetVersion: 1, fields: [] };
    const parked = await call(A, path('drafts/' + row.id + '/park'), 'POST', { expectedVersion: 1, selection: { object: chosen.object, expense: chosen.expense } }); assert.equal(parked.status, 200);
    assert.equal(parked.body.draft.review.form.object.id, target.id); assert.equal(parked.body.draft.review.targetVersions.object, 1);
    await db.homeObject.update({ where: { id: target.id }, data: { version: { increment: 1 }, name: 'Changed object name' } });
    const changed = (await call(A, path('drafts/' + row.id))).body.draft.review;
    assert.deepEqual(changed.form.object, { kind: 'unset' }); assert.deepEqual(changed.form.decisions, {}); assert.deepEqual(changed.staleTargets, ['object']); assert.equal(changed.targetVersions.object, null);
    assert.equal(changed.form.values.amount, '179,90'); assert.equal(changed.form.values.title, 'Manual purchase fixture'); assert(!JSON.stringify(changed).includes(target.id));
    const foreign = await db.homeObject.create({ data: { accountId: b.id, homeId: home, name: 'Foreign review target', type: 'other' } }), next = await manualDraft(await document(a, 'Forbidden review source'));
    const denied = await call(A, path('drafts/' + next.id + '/park'), 'POST', { expectedVersion: 1, selection: { object: { action: 'reuse', targetId: foreign.id, targetVersion: 1, fields: [] }, expense: { action: 'skip' } } }); assert.equal(denied.status, 403); assert(!JSON.stringify(denied).includes(foreign.name));
  });
  await t.test('Park stores only validated choices, not fake extraction or early comparisons; source revocation redacts the saved form', async () => {
    const doc = await document(a, 'Review validation'), row = await manualDraft(doc), forged = selection(); forged.object.origins.name = 'extraction';
    assert.equal((await call(A, path('drafts/' + row.id + '/park'), 'POST', { expectedVersion: 1, selection: { object: forged.object, expense: forged.expense } })).status, 422);
    assert.equal((await call(A, path('drafts/' + row.id + '/park'), 'POST', { expectedVersion: 1, selection: { object: { action: 'skip' }, expense: { action: 'skip' }, sources: [{ token: 'No raw review sources' }] } })).status, 422);
    assert.equal((await db.receiptDraft.findUnique({ where: { id: row.id } })).review, null);
    const target = await db.homeObject.create({ data: { accountId: a.id, homeId: home, name: 'Review conflict object', type: 'other' } });
    await db.receiptObjectField.create({ data: { accountId: a.id, homeId: home, objectId: target.id, fieldKey: 'brand', value: 'Aurora', origin: 'user_declared' } });
    await db.receiptDraft.update({ where: { id: row.id }, data: { mode: 'extraction', fields: { brand: { value: 'Lume', sources: [{ documentId: doc.id, page: 1, excerpt: 'Lume' }] } } } });
    const parked = await call(A, path('drafts/' + row.id + '/park'), 'POST', { expectedVersion: 1, selection: { object: { action: 'reuse', targetId: target.id, targetVersion: 1, fields: [{ field: 'brand', action: 'defer' }] }, expense: { action: 'skip' } } });
    assert.equal(parked.status, 200); assert.equal(parked.body.draft.review.form.decisions[target.id + ':brand'], 'defer'); assert.equal(await db.receiptComparison.count({ where: { objectId: target.id } }), 0);
    const shared = await document(b, 'Shared saved review', 'home'), privateDraft = await manualDraft(shared), chosen = selection(); chosen.object.values.name = 'Private reviewed text';
    assert.equal((await call(A, path('drafts/' + privateDraft.id + '/park'), 'POST', { expectedVersion: 1, selection: { object: chosen.object, expense: chosen.expense } })).status, 200);
    await db.document.update({ where: { id: shared.id }, data: { visibility: 'private' } });
    const hidden = await call(A, path('drafts/' + privateDraft.id)); assert.equal(hidden.body.draft.review, null); assert(!JSON.stringify(hidden).includes('Private reviewed text'));
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
