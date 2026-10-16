require('reflect-metadata');
const { test } = require('node:test'), assert = require('node:assert/strict'), { randomUUID, randomBytes } = require('node:crypto');
const { Module } = require('@nestjs/common'), { NestFactory } = require('@nestjs/core'), cookieParser = require('cookie-parser');
const { InfrastructureModule } = require('../dist/app.module'), { PrismaService, assertDevelopmentDatabase } = require('../dist/prisma.service');
const { DocumentPolicy, DocumentAccessGuard } = require('../dist/documents/access');
const { IntakeBatchesService } = require('../dist/document-intake/batches.service'), { DocumentIntakeController } = require('../dist/document-intake/intake.module');
const { IntakeUploadsService } = require('../dist/document-intake/uploads.service');
const { ApiErrorFilter } = require('../dist/main'), { COOKIE, digest } = require('../dist/security');

test('Intake B1: actual HTTP/DB manifest persistence, no files/AI and no production module registration', { timeout: 30000 }, async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL);
  class Harness {}
  // Deliberately no DocumentsService/storage module: no cleanup or personal original IO.
  Module({ imports: [InfrastructureModule], controllers: [DocumentIntakeController], providers: [DocumentPolicy, DocumentAccessGuard, IntakeBatchesService, { provide: IntakeUploadsService, useValue: { upload: () => { throw Error('No file upload in manifest-only harness'); } } }] })(Harness);
  const app = await NestFactory.create(Harness, { logger: false }); app.setGlobalPrefix('api/v5'); app.use(cookieParser()); app.useGlobalFilters(new ApiErrorFilter()); await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService), base = await app.getUrl(), accounts = [], homes = [], users = [];
  t.after(async () => {
    await db.documentIntakeItem.deleteMany({ where: { batch: { accountId: { in: accounts } } } });
    await db.documentIntakeBatch.deleteMany({ where: { accountId: { in: accounts } } });
    await db.session.deleteMany({ where: { accountId: { in: accounts } } });
    await db.homeMembership.deleteMany({ where: { homeId: { in: homes } } });
    await db.home.deleteMany({ where: { id: { in: homes } } }); await db.account.deleteMany({ where: { id: { in: accounts } } }); await app.close();
  });
  for (const name of ['Owner', 'Other', 'Unverified']) {
    const account = await db.account.create({ data: { name: 'Intake synthetic ' + name, email: randomUUID() + '@example.test', passwordHash: 'not-login', requiresEmailVerification: name === 'Unverified' } }); accounts.push(account.id);
    const raw = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
    await db.session.create({ data: { id: digest(raw), accountId: account.id, csrfToken: csrf, expiresAt: new Date(Date.now() + 3600000) } }); users.push({ account, raw, csrf });
  }
  const [A, B, C] = users;
  for (let i = 0; i < 2; i++) homes.push((await db.home.create({ data: { name: 'Intake synthetic home ' + i, address: 'Via Fixture' } })).id);
  const [home, other] = homes;
  await db.homeMembership.createMany({ data: [{ accountId: A.account.id, homeId: home, role: 'owner' }, { accountId: A.account.id, homeId: other, role: 'owner' }, { accountId: B.account.id, homeId: home, role: 'member' }, { accountId: C.account.id, homeId: home, role: 'owner' }] });
  const manifest = { items: ['APE.pdf', 'CILA.pdf', 'Regolamento.pdf'].map(filename => ({ clientItemId: randomUUID(), filename, byteSize: 100, mimeType: 'application/pdf' })) };
  const path = '/api/v5/homes/' + home + '/document-intake';
  async function call(who, suffix, method = 'GET', body, key = randomUUID(), csrf = who?.csrf) {
    const result = await fetch(base + suffix, { method, headers: { Origin: 'http://127.0.0.1:5174', ...(who ? { Cookie: COOKIE + '=' + who.raw, 'X-Account-Context': who.account.id, 'X-CSRF-Token': csrf } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json', 'Idempotency-Key': key } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: result.status, body: await result.json() };
  }
  const before = { docs: await db.document.count(), ai: await db.aiAttempt.count(), economic: await db.economicAiAttempt.count(), receipt: await db.receiptAiAttempt.count() };
  let batch;
  await t.test('Auth, CSRF, email and explicit disabled capability, with no premature module release', async () => {
    assert.equal((await call(null, path + '/capabilities')).status, 401);
    const caps = await call(A, path + '/capabilities'); assert.equal(caps.body.enabled, false); assert.equal(caps.body.collections.energy, 'Energia');
    assert.equal((await call(A, path + '/batches', 'POST', manifest, undefined, 'wrong')).status, 403);
    assert.equal((await call(C, path + '/batches', 'POST', manifest)).body.error.code, 'email_verification_required');
    assert.equal(await db.documentIntakeBatch.count({ where: { accountId: { in: accounts } } }), 0);
  });
  await t.test('Concurrent replay creates one persistent ordered batch; new service reads the same state', async () => {
    const key = randomUUID(), results = await Promise.all([call(A, path + '/batches', 'POST', manifest, key), call(A, path + '/batches', 'POST', manifest, key)]);
    assert(results.every(result => result.status === 201)); assert.deepEqual(results[0].body, results[1].body); batch = results[0].body.batch;
    assert.equal(batch.items.length, 3); assert.deepEqual(batch.items.map(item => item.filename), manifest.items.map(item => item.filename));
    assert(batch.items.every(item => item.uploadState === 'pending' && item.reviewState === 'unreviewed' && item.proposal === null && item.documentLink.document === null));
    assert.equal(await db.documentIntakeBatch.count({ where: { accountId: A.account.id } }), 1);
    const restarted = new IntakeBatchesService(db, new DocumentPolicy(db)); assert.deepEqual((await restarted.get(A.account.id, home, batch.id, {})).batch, batch);
    for (const secret of ['digest', 'accountId', 'key', 'storageKey']) assert(!Object.hasOwn(batch, secret));
    const changed = { items: [{ ...manifest.items[0], filename: 'Different.pdf' }] };
    assert.equal((await call(A, path + '/batches', 'POST', changed, key)).body.error.code, 'idempotency_conflict');
  });
  await t.test('Personal batch cannot be read by another member or through another home; no query injection', async () => {
    assert.equal((await call(B, path + '/batches/' + batch.id)).status, 403);
    assert.equal((await call(A, path.replace(home, other) + '/batches/' + batch.id)).status, 403);
    assert.equal((await call(A, path + '/batches/' + batch.id + '?accountId=' + B.account.id)).status, 422);
    assert.equal((await call(A, path + '/batches/not-a-uuid')).status, 422);
  });
  await t.test('Bad manifests roll back the entire draft before any file processing', async () => {
    for (const body of [{ items: [] }, { ...manifest, visibility: 'home' }, { items: [manifest.items[0], manifest.items[0]] }, { items: [{ ...manifest.items[0], byteSize: 30000000 }] }]) assert.equal((await call(A, path + '/batches', 'POST', body)).status, 422);
    assert.equal(await db.documentIntakeBatch.count({ where: { accountId: A.account.id } }), 1);
    await assert.rejects(db.documentIntakeItem.update({ where: { id: batch.items[0].id }, data: { uploadState: 'stored' } }));
    assert.equal((await call(A, path + '/batches/' + batch.id)).body.batch.items[0].uploadState, 'pending');
  });
  await t.test('Role/membership revocation applies to recovered batches, not only initial creation', async () => {
    await db.homeMembership.update({ where: { accountId_homeId: { accountId: A.account.id, homeId: home } }, data: { role: 'viewer' } });
    assert.deepEqual((await call(A, path + '/batches/' + batch.id)).body.batch.permissions, ['read']);
    assert.equal((await call(A, path + '/batches', 'POST', manifest)).status, 403);
    await db.homeMembership.delete({ where: { accountId_homeId: { accountId: A.account.id, homeId: home } } });
    assert.equal((await call(A, path + '/batches/' + batch.id)).status, 403);
    assert.deepEqual({ docs: await db.document.count(), ai: await db.aiAttempt.count(), economic: await db.economicAiAttempt.count(), receipt: await db.receiptAiAttempt.count() }, before);
  });
});
