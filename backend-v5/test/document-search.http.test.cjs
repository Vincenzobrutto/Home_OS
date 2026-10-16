require('reflect-metadata');
const { test } = require('node:test'); const assert = require('node:assert/strict'); const { randomUUID } = require('node:crypto');
const { Module, ValidationPipe, UnprocessableEntityException } = require('@nestjs/common'); const { NestFactory } = require('@nestjs/core'); const cookieParser = require('cookie-parser');
const { InfrastructureModule } = require('../dist/app.module'); const { AuthModule } = require('../dist/auth/auth.module'); const { HomesModule } = require('../dist/homes/homes.module');
const { DocumentsModule } = require('../dist/documents/documents.module'); const { DocumentsService } = require('../dist/documents/documents.service'); const { LocalFileStorage } = require('../dist/documents/storage');
const { PrismaService, assertDevelopmentDatabase } = require('../dist/prisma.service'); const { ApiErrorFilter } = require('../dist/main');
const { ReviewController } = require('../dist/review/review.controller'); const { ReviewService } = require('../dist/review/review.service');
const { png, pdf, jpeg } = require('./document-fixtures.cjs');
class H2Harness {}
// Real controllers/session/policy/DB, deliberately no AnalysisWorker or provider.
Module({ imports: [InfrastructureModule, AuthModule, HomesModule, DocumentsModule], controllers: [ReviewController], providers: [{ provide: ReviewService, useFactory: (db, docs) => new ReviewService(db, docs), inject: [PrismaService, DocumentsService] }] })(H2Harness);
test('H2: HTTP reale, upload/originali/ZIP e ricerca autenticata; nessuna analisi', async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL);
  const external = process.env.V5_DOCUMENT_SEARCH_API === '1';
  const app = external ? null : await NestFactory.create(H2Harness, { logger: false });
  if (app) {
    app.setGlobalPrefix('api/v5'); app.use(cookieParser()); app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, exceptionFactory: errors => new UnprocessableEntityException({ message: 'Controlla i dati inseriti.', fieldErrors: Object.fromEntries(errors.map(e => [e.property, 'Valore non valido.'])) }) }));
    app.useGlobalFilters(new ApiErrorFilter()); await app.listen(0, '127.0.0.1');
  }
  const base = external ? 'http://127.0.0.1:3001/api/v5' : (await app.getUrl()) + '/api/v5', db = app ? app.get(PrismaService) : new PrismaService(), accounts = [], homes = [];
  if (!app) await db.$connect(); const storage = app ? app.get(LocalFileStorage) : new LocalFileStorage();
  t.after(async () => {
    const docs = await db.document.findMany({ where: { uploaderId: { in: accounts } }, include: { original: { include: { file: true } } } });
    const files = docs.map(x => x.original.file), ids = docs.map(x => x.id);
    await db.uploadRequest.deleteMany({ where: { accountId: { in: accounts } } }); await db.documentVersion.deleteMany({ where: { documentId: { in: ids } } }); await db.document.deleteMany({ where: { id: { in: ids } } }); await db.storedFile.deleteMany({ where: { id: { in: files.map(x => x.id) } } });
    for (const file of files) await storage.remove(file.storageKey);
    await db.home.deleteMany({ where: { id: { in: homes } } }); await db.account.deleteMany({ where: { id: { in: accounts } } }); if (app) await app.close(); else await db.$disconnect();
  });
  class Browser {
    cookie = ''; csrf = ''; id = '';
    async request(path, method = 'GET', body, headers = {}) {
      const multipart = body instanceof FormData;
      const r = await fetch(base + path, { method, headers: { Origin: 'http://127.0.0.1:5174', Cookie: this.cookie, ...(this.id ? { 'X-Account-Context': this.id } : {}), ...(method !== 'GET' ? { 'X-CSRF-Token': this.csrf, 'Idempotency-Key': randomUUID(), ...(!multipart ? { 'Content-Type': 'application/json' } : {}) } : {}), ...headers }, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body) });
      if (r.headers.getSetCookie()[0]) this.cookie = r.headers.getSetCookie()[0].split(';')[0];
      const data = r.headers.get('content-type')?.includes('application/json') ? await r.json() : Buffer.from(await r.arrayBuffer());
      if (path === '/session') this.csrf = data.csrfToken; if (data.account) this.id = data.account.id;
      assert.equal(r.headers.get('cache-control'), 'no-store'); return { status: r.status, data };
    }
    async upload(home, name, filename, bytes, visibility = 'private') {
      const form = new FormData(); form.set('name', name); form.set('visibility', visibility); form.set('file', new Blob([bytes], { type: 'application/octet-stream' }), filename);
      return ok(await this.request(`/homes/${home}/documents`, 'POST', form), 201).document;
    }
  }
  const ok = (r, status = 200) => { assert.equal(r.status, status, JSON.stringify(r.data)); return r.data; };
  const a = new Browser(), b = new Browser(); let h, own, picture, photo, secret, shared;
  await t.test('Sessione, Home e capabilities reali, anonimo e account-context rifiutati', async () => {
    for (const client of [a, b]) { ok(await client.request('/session')); ok(await client.request('/auth/register', 'POST', { name: 'Prova H2 HTTP', email: randomUUID() + '@example.test', password: 'Password H2 locale test 123!' }), 201); accounts.push(client.id); await db.account.update({ where: { id: client.id }, data: { emailVerifiedAt: new Date() } }); ok(await client.request('/session')); }
    h = ok(await a.request('/homes', 'POST', { name: 'Casa H2 HTTP', address: 'Via test' }), 201).home.id; homes.push(h);
    assert.equal(ok(await a.request(`/homes/${h}/document-search-capabilities`)).apiVersion, 'document-search-v1'); assert.equal((await new Browser().request(`/homes/${h}/document-search-capabilities`)).status, 401);
    const r = await a.request(`/homes/${h}/documents?q=test`, 'GET', undefined, { 'X-Account-Context': b.id }); assert.equal(r.status, 401); assert.equal(r.data.error.code, 'account_context_changed');
    await db.homeMembership.create({ data: { accountId: b.id, homeId: h, role: 'owner', validFrom: new Date(0) } });
  });
  await t.test('Upload poi ricerca per titolo e filename, MIME verificato e filtri', async () => {
    own = await a.upload(h, 'Sorgente caldaia', 'LibrettoGas.pdf', pdf); picture = await a.upload(h, 'Foto componente', 'manuale.pdf', png); photo = await a.upload(h, 'Foto locale', 'manuale-foto.jpg', jpeg);
    secret = await b.upload(h, 'Caldaia riservata B', 'privato-b.pdf', pdf); shared = await b.upload(h, 'Caldaia condivisa', 'shared-b.pdf', pdf, 'home');
    assert.deepEqual(ok(await a.request(`/homes/${h}/documents?q=librettogas`)).items.map(x => x.id), [own.id]);
    assert.deepEqual(ok(await a.request(`/homes/${h}/documents?q=manuale&format=png`)).items.map(x => x.id), [picture.id]);
    assert.deepEqual(ok(await a.request(`/homes/${h}/documents?format=jpeg`)).items.map(x => x.id), [photo.id]);
    assert.equal(ok(await a.request(`/homes/${h}/documents?q=manuale&format=pdf`)).items.length, 0);
    const results = ok(await a.request(`/homes/${h}/documents?q=CALDAIA`)).items.map(x => x.id); assert(results.includes(own.id)); assert(results.includes(shared.id)); assert(!results.includes(secret.id));
  });
  await t.test('422 input H2, query duplicate e M3 non allargata dai filtri H2', async () => {
    const queries = ['q=%00', 'q=%0Amanuale', 'q=a&q=b', 'format=pdf&format=png', 'visibility=public', 'unknown=x', 'q=' + encodeURIComponent('😀'.repeat(121))];
    for (const query of queries) { const r = await a.request(`/homes/${h}/documents?${query}`); assert.equal(r.status, 422, query); assert.equal(r.data.error.code, 'validation_error'); }
    for (const path of [`/homes/${h}/document-search-capabilities?q=x`, `/homes/${h}/assets?q=x`, `/homes/${h}/analysis-jobs?format=pdf`, '/homes/not-a-uuid/document-search-capabilities']) { const r = await a.request(path); assert.equal(r.status, 422); assert.equal(r.data.error.code, 'validation_error'); }
  });
  await t.test('Risultati non aggirano download/export, originali integri e revoca dopo ricerca', async () => {
    assert.deepEqual(ok(await a.request(`/homes/${h}/documents/${own.id}/file`)), pdf);
    const zip = ok(await a.request(`/homes/${h}/documents/export`, 'POST', { documentIds: [own.id, picture.id] })); assert.equal(zip.readUInt32LE(0), 0x04034b50); assert(zip.includes(Buffer.from('manifest.json')));
    assert.equal((await a.request(`/homes/${h}/documents/${secret.id}/file`)).status, 403); assert.equal((await a.request(`/homes/${h}/documents/export`, 'POST', { documentIds: [own.id, secret.id] })).status, 403);
    await db.homeMembership.update({ where: { accountId_homeId: { accountId: a.id, homeId: h } }, data: { revokedAt: new Date() } });
    for (const path of [`/homes/${h}/documents?q=caldaia`, `/homes/${h}/documents/${own.id}/file`, `/homes/${h}/document-search-capabilities`]) assert.equal((await a.request(path)).status, 403);
  });
});
