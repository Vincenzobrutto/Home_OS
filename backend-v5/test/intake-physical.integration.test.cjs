// Explicit Windows-only physical admission check. One synthetic PDF, actual Defender.
require('reflect-metadata');
const { test } = require('node:test'), assert = require('node:assert/strict'), { randomUUID, randomBytes } = require('node:crypto');
const { Module } = require('@nestjs/common'), { NestFactory } = require('@nestjs/core'), cookieParser = require('cookie-parser');
const { InfrastructureModule } = require('../dist/app.module'), { PrismaService, assertDevelopmentDatabase } = require('../dist/prisma.service');
const { DocumentPolicy, DocumentAccessGuard } = require('../dist/documents/access'), { LocalFileStorage } = require('../dist/documents/storage');
const { IntakeBatchesService } = require('../dist/document-intake/batches.service'), { IntakeUploadsService } = require('../dist/document-intake/uploads.service'), { DocumentIntakeController } = require('../dist/document-intake/intake.module');
const { receiptFixturePdf } = require('../dist/receipt-assistance/fixture-provider'), { ApiErrorFilter } = require('../dist/main'), { COOKIE, digest } = require('../dist/security');

test('Intake physical: synthetic multipart PDF, real local storage/Defender, identical copy reused', { timeout: 90000 }, async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL); assert.equal(process.platform, 'win32');
  const storage = new LocalFileStorage();
  class Harness {}
  // No DocumentsService cleanup: this test owns and removes only the file it creates.
  Module({ imports: [InfrastructureModule], controllers: [DocumentIntakeController], providers: [DocumentPolicy, DocumentAccessGuard, IntakeBatchesService, { provide: IntakeUploadsService, useFactory: (db, batches) => new IntakeUploadsService(db, batches, storage), inject: [PrismaService, IntakeBatchesService] }] })(Harness);
  const app = await NestFactory.create(Harness, { logger: false }); app.setGlobalPrefix('api/v5'); app.use(cookieParser()); app.useGlobalFilters(new ApiErrorFilter()); await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService), base = await app.getUrl(), raw = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
  const account = await db.account.create({ data: { name: 'Intake physical SYNTHETIC', email: randomUUID() + '@example.test', passwordHash: 'not-login' } });
  const home = await db.home.create({ data: { name: 'Intake physical SYNTHETIC home', address: 'Via Fixture' } });
  t.after(async () => {
    const docs = await db.document.findMany({ where: { homeId: home.id, uploaderId: account.id }, include: { original: { include: { file: true } } } });
    const files = docs.flatMap(doc => doc.original ? [doc.original.file] : []);
    await db.documentIntakeItem.deleteMany({ where: { batch: { accountId: account.id, homeId: home.id } } }); await db.documentIntakeBatch.deleteMany({ where: { accountId: account.id, homeId: home.id } });
    await db.documentVersion.deleteMany({ where: { documentId: { in: docs.map(doc => doc.id) } } }); await db.document.deleteMany({ where: { id: { in: docs.map(doc => doc.id) } } });
    await db.storedFile.deleteMany({ where: { id: { in: files.map(file => file.id) } } });
    for (const file of files) if (await db.storedFile.findUnique({ where: { storageKey: file.storageKey } }) === null) await storage.remove(file.storageKey);
    await db.session.deleteMany({ where: { accountId: account.id } }); await db.homeMembership.deleteMany({ where: { accountId: account.id, homeId: home.id } }); await db.home.delete({ where: { id: home.id } }); await db.account.delete({ where: { id: account.id } }); await app.close();
  });
  await db.homeMembership.create({ data: { accountId: account.id, homeId: home.id, role: 'owner' } }); await db.session.create({ data: { id: digest(raw), accountId: account.id, csrfToken: csrf, expiresAt: new Date(Date.now() + 3600000) } });
  const bytes = Buffer.concat([receiptFixturePdf('purchase'), Buffer.from('\n% SYNTHETIC INTAKE PHYSICAL ' + randomUUID())]), prefix = '/api/v5/homes/' + home.id + '/document-intake';
  const fileNames = ['Synthetic physical.pdf', 'Synthetic physical copy.pdf'];
  const before = [await db.aiAttempt.count(), await db.economicAiAttempt.count(), await db.receiptAiAttempt.count()];
  async function call(suffix, body) {
    const multipart = body instanceof FormData, result = await fetch(base + prefix + suffix, { method: body ? 'POST' : 'GET', headers: { Origin: 'http://127.0.0.1:5174', Cookie: COOKIE + '=' + raw, 'X-Account-Context': account.id, 'X-CSRF-Token': csrf, ...(body ? { 'Idempotency-Key': randomUUID(), ...(!multipart ? { 'Content-Type': 'application/json' } : {}) } : {}) }, ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}) });
    return { status: result.status, body: await result.json() };
  }
  const created = await call('/batches', { items: fileNames.map(filename => ({ clientItemId: randomUUID(), filename, byteSize: bytes.length, mimeType: 'application/pdf' })) }); assert.equal(created.status, 201); const batch = created.body.batch;
  let last;
  for (const [index, filename] of fileNames.entries()) {
    const form = new FormData(); form.append('file', new Blob([bytes], { type: 'application/pdf' }), filename);
    last = await call('/batches/' + batch.id + '/items/' + batch.items[index].id + '/file', form);
    assert.equal(last.status, 201, JSON.stringify(last.body.error));
  }
  const [first, second] = last.body.batch.items; assert.equal(first.uploadState, 'stored'); assert.equal(second.uploadState, 'duplicate'); assert.equal(first.documentLink.document.id, second.documentLink.document.id);
  const doc = await db.document.findUnique({ where: { id: first.documentLink.document.id }, include: { original: { include: { file: true } } } });
  assert.equal(doc.visibility, 'private'); assert.equal(doc.original.fileControlEngine, 'microsoft_defender'); assert(doc.original.fileControlCheckedAt); assert(doc.original.fileControlSignature);
  assert.deepEqual(await storage.read(doc.original.file.storageKey), bytes); assert.equal(doc.original.sha256, digest(bytes));
  assert.equal(await db.document.count({ where: { homeId: home.id } }), 1); assert.equal(await db.homeObject.count({ where: { homeId: home.id } }), 0); assert.equal(await db.homeExpense.count({ where: { homeId: home.id } }), 0);
  assert.deepEqual([await db.aiAttempt.count(), await db.economicAiAttempt.count(), await db.receiptAiAttempt.count()], before);
  console.log(JSON.stringify({ scope: 'synthetic-intake-physical', bytes: bytes.length, sha256: digest(bytes), stored: 1, duplicate: 1, scanner: 'microsoft_defender', newObjects: 0, newExpenses: 0, providerCalls: 0, fixtureCleanup: 'owned test IDs only' }));
});
