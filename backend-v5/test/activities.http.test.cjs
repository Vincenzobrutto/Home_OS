require('reflect-metadata');
const { test } = require('node:test'); const assert = require('node:assert/strict'); const { randomUUID } = require('node:crypto');
const { Module, ValidationPipe, UnprocessableEntityException } = require('@nestjs/common'); const { NestFactory } = require('@nestjs/core'); const cookieParser = require('cookie-parser');
const { InfrastructureModule } = require('../dist/app.module'); const { AuthModule } = require('../dist/auth/auth.module'); const { HomesModule } = require('../dist/homes/homes.module');
const { DocumentsModule } = require('../dist/documents/documents.module'); const { DocumentsService } = require('../dist/documents/documents.service'); const { PrismaService, assertDevelopmentDatabase } = require('../dist/prisma.service');
const { ReviewService } = require('../dist/review/review.service'); const { ActivitiesService } = require('../dist/activities/activities.service'); const { ActivitiesController } = require('../dist/activities/activities.controller'); const { ActivityClock } = require('../dist/activities/domain'); const { ApiErrorFilter } = require('../dist/main');
// Actual Nest controllers, sessions, policies, DTO pipeline and PostgreSQL on an ephemeral
// loopback port. Deliberately omit AnalysisWorker/AiAnalysis: this harness cannot call AI.
class H1Harness {}
Module({ imports: [InfrastructureModule, AuthModule, HomesModule, DocumentsModule], controllers: [ActivitiesController], providers: [ActivitiesService, ActivityClock, { provide: ReviewService, useFactory: (db, documents) => new ReviewService(db, documents), inject: [PrismaService, DocumentsService] }] })(H1Harness);
test('H1: HTTP/sessione/CSRF, controller reali e database dedicato; nessuna analisi avviata', async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL);
  const external = process.env.V5_ACTIVITIES_API === '1';
  const app = external ? null : await NestFactory.create(H1Harness, { logger: false });
  if (app) {
  app.setGlobalPrefix('api/v5'); app.use(cookieParser());
  app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, exceptionFactory: errors => new UnprocessableEntityException({ message: 'Controlla i dati inseriti.', fieldErrors: Object.fromEntries(errors.map(e => [e.property, Object.values(e.constraints || {})[0] || 'Valore non valido.'])) }) }));
  app.useGlobalFilters(new ApiErrorFilter()); await app.listen(0, '127.0.0.1');
  }
  const base = external ? 'http://127.0.0.1:3001/api/v5' : (await app.getUrl()) + '/api/v5', db = app ? app.get(PrismaService) : new PrismaService(), ids = [], homes = [];
  if (!app) await db.$connect();
  t.after(async () => {
    await db.activityHistory.deleteMany({ where: { accountId: { in: ids } } }); await db.activityRequest.deleteMany({ where: { accountId: { in: ids } } }); await db.homeActivity.deleteMany({ where: { accountId: { in: ids } } });
    await db.home.deleteMany({ where: { id: { in: homes } } }); await db.account.deleteMany({ where: { id: { in: ids } } }); if (app) await app.close(); else await db.$disconnect();
  });
  class Browser {
    cookie = ''; csrf = ''; id = '';
    async request(path, method = 'GET', body, extra = {}) {
      const response = await fetch(base + path, { method, headers: { Origin: 'http://127.0.0.1:5174', Cookie: this.cookie, ...(this.id ? { 'X-Account-Context': this.id } : {}), ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf, 'Idempotency-Key': randomUUID() } : {}), ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
      const cookie = response.headers.getSetCookie()[0]; if (cookie) this.cookie = cookie.split(';')[0]; const data = await response.json();
      if (path === '/session') this.csrf = data.csrfToken; if (data.account) this.id = data.account.id;
      assert.equal(response.headers.get('cache-control'), 'no-store'); return { status: response.status, data };
    }
  }
  const ok = (result, status = 200) => { assert.equal(result.status, status, JSON.stringify(result.data)); return result.data; };
  const a = new Browser(), b = new Browser(); let h, id;
  await t.test('Registrazione/sessione reale e capabilities autenticata', async () => {
    for (const client of [a, b]) { ok(await client.request('/session')); ok(await client.request('/auth/register', 'POST', { name: 'Test H1 HTTP', email: randomUUID() + '@example.test', password: 'Password H1 locale test 123!' }), 201); ids.push(client.id); ok(await client.request('/session')); }
    h = ok(await a.request('/homes', 'POST', { name: 'Home H1 HTTP', address: 'Via test' }), 201).home.id; homes.push(h);
    assert.equal(ok(await a.request(`/homes/${h}/activity-capabilities`)).apiVersion, 'activities-v1');
    assert.equal((await new Browser().request(`/homes/${h}/activities`)).status, 401);
  });
  await t.test('Input, UUID, query e campi server rifiutati come 422 validation_error', async () => {
    for (const path of [`/homes/${h}/activities?state=open&state=completed`, `/homes/${h}/activities?unknown=x`, `/homes/${h}/activities/not-a-uuid`]) { const r = await a.request(path); assert.equal(r.status, 422); assert.equal(r.data.error.code, 'validation_error'); }
    for (const body of [{ title: 'x', dueDate: '2026-02-29' }, { title: 'x', state: 'completed' }, { title: 'x', accountId: b.id }]) { const r = await a.request(`/homes/${h}/activities`, 'POST', body); assert.equal(r.status, 422); assert.equal(r.data.error.code, 'validation_error'); }
  });
  await t.test('Origin/CSRF/account-context e altra persona bloccati', async () => {
    for (const headers of [{ Origin: 'http://evil.test' }, { 'X-CSRF-Token': 'bad' }]) { const r = await a.request(`/homes/${h}/activities`, 'POST', { title: 'x' }, headers); assert.equal(r.status, 403); assert.equal(r.data.error.code, 'csrf_invalid'); }
    const r = await a.request(`/homes/${h}/activity-summary`, 'GET', undefined, { 'X-Account-Context': b.id }); assert.equal(r.status, 401); assert.equal(r.data.error.code, 'account_context_changed');
    assert.equal((await b.request(`/homes/${h}/activities`)).status, 403);
  });
  await t.test('Crea, modifica, completa, riapre, annulla, storia e filtri via HTTP', async () => {
    const created = ok(await a.request(`/homes/${h}/activities`, 'POST', { title: 'Promemoria HTTP', dueDate: '2028-02-29' }), 201); id = created.activity.id;
    assert.equal(created.activity.origin, 'user_created'); assert.equal(created.timeZone, 'Europe/Rome');
    const root = `/homes/${h}/activities/${id}`; assert.equal(ok(await a.request(root)).activity.id, id);
    ok(await a.request(root + '/updates', 'POST', { expectedVersion: 1, description: 'Modificata' }));
    ok(await a.request(root + '/complete', 'POST', { expectedVersion: 2, note: 'Completata da me' }));
    assert.equal(ok(await a.request(`/homes/${h}/activities`)).items.length, 0); assert.equal(ok(await a.request(`/homes/${h}/activities?state=completed`)).items.length, 1);
    ok(await a.request(root + '/reopen', 'POST', { expectedVersion: 3 })); ok(await a.request(root + '/cancel', 'POST', { expectedVersion: 4 }));
    assert.equal(ok(await a.request(root + '/history')).items.length, 5);
    const stale = await a.request(root + '/reopen', 'POST', { expectedVersion: 1 }); assert.equal(stale.status, 409); assert.equal(stale.data.error.code, 'activity_version_conflict');
    await db.homeMembership.create({ data: { accountId: b.id, homeId: h, role: 'owner' } }); assert.equal((await b.request(root)).status, 403); assert.equal(ok(await b.request(`/homes/${h}/activities`)).items.length, 0);
  });
});
