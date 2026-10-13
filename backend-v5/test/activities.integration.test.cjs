require('reflect-metadata');
const { test } = require('node:test'); const assert = require('node:assert/strict'); const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('../generated/client'); const { assertDevelopmentDatabase } = require('../dist/prisma.service');
const { ReviewService } = require('../dist/review/review.service'); const { ActivitiesService } = require('../dist/activities/activities.service');
test('H1: persistenza PostgreSQL, privacy, concorrenza e storia; zero provider', async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL); const db = new PrismaClient(); await db.$connect();
  const accounts = await Promise.all(['A', 'B'].map(name => db.account.create({ data: { name: 'H1 test ' + name, email: randomUUID() + '@example.test', passwordHash: 'not-a-login-hash' } })));
  const [a, b] = accounts.map(x => x.id), home = await db.home.create({ data: { name: 'Home H1 sintetica', address: 'Via test' } }), h = home.id;
  await db.homeMembership.createMany({ data: accounts.map(x => ({ accountId: x.id, homeId: h, role: 'owner', validFrom: new Date(0) })) });
  let now = new Date('2026-10-13T10:00:00Z'); const clock = { now: () => new Date(now) };
  const s = new ActivitiesService(db, new ReviewService(db, {}), clock);
  const asset = await db.boilerAsset.create({ data: { accountId: a, homeId: h, name: 'Caldaia H1 sintetica' } });
  const aiBefore = await db.aiAttempt.count(); let activity, creationKey, creationBody;
  const deny = async (promise, status, code) => assert.rejects(promise, error => error.getStatus?.() === status && (!code || error.getResponse().code === code));
  t.after(async () => {
    await db.activityHistory.deleteMany({ where: { accountId: { in: [a, b] } } });
    await db.activityRequest.deleteMany({ where: { accountId: { in: [a, b] } } });
    await db.homeActivity.deleteMany({ where: { homeId: h } });
    await db.analysisJob.deleteMany({ where: { homeId: h } });
    await db.boilerAsset.deleteMany({ where: { homeId: h } });
    await db.home.delete({ where: { id: h } }); await db.account.deleteMany({ where: { id: { in: [a, b] } } }); await db.$disconnect();
  });
  await t.test('Vuota: capacità reali, summary non inventa attività', async () => {
    assert.equal((await s.capabilities(a, h, {})).isSimulation, false);
    assert.deepEqual((await s.summary(a, h, {})).counts, { overdue: 0, today: 0, upcoming: 0, undated: 0 });
  });
  await t.test('Doppia creazione concorrente e titolo normalizzato: un record/evento', async () => {
    creationKey = randomUUID(); creationBody = { title: ' Controllo e\u0301 ', dueDate: '2026-10-12', assetId: asset.id };
    const results = await Promise.all([s.create(a, h, creationBody, creationKey), s.create(a, h, { ...creationBody, title: 'Controllo é' }, creationKey)]);
    assert.deepEqual(results[0], results[1]); activity = results[0].activity;
    assert.equal(activity.dueState, 'overdue'); assert.equal(activity.assetLink.state, 'linked');
    assert.equal(await db.homeActivity.count({ where: { homeId: h } }), 1); assert.equal(await db.activityHistory.count({ where: { activityId: activity.id } }), 1);
  });
  await t.test('Owner B non vede record, storia, link né conteggi di A', async () => {
    await deny(s.get(b, h, activity.id, {}), 403); await deny(s.history(b, h, activity.id, {}), 403);
    assert.equal((await s.list(b, h, {})).items.length, 0); assert.equal((await s.summary(b, h, {})).counts.overdue, 0);
    await deny(s.create(b, h, { title: 'x', assetId: asset.id }, randomUUID()), 403);
    await deny(s.list(b, h, { assetId: asset.id }), 403);
    await deny(s.get(a, randomUUID(), activity.id, {}), 403);
  });
  await t.test('Edit no-op, poi due versioni concorrenti: una sola vince', async () => {
    const count = await db.activityHistory.count({ where: { activityId: activity.id } });
    assert.equal((await s.update(a, h, activity.id, { expectedVersion: 1, title: 'Controllo é' }, randomUUID())).activity.version, 1);
    assert.equal(await db.activityHistory.count({ where: { activityId: activity.id } }), count);
    const results = await Promise.allSettled(['Uno', 'Due'].map(title => s.update(a, h, activity.id, { expectedVersion: 1, title }, randomUUID())));
    assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal(results.find(x => x.status === 'rejected').reason.getResponse().code, 'activity_version_conflict');
    activity = (await s.get(a, h, activity.id, {})).activity; assert.equal(activity.version, 2);
  });
  await t.test('Completa, retry dopo risposta persa, riapre e annulla senza alterare caldaia', async () => {
    const key = randomUUID(), body = { expectedVersion: 2, note: 'Dichiarato da me' }, before = await db.boilerAsset.findUnique({ where: { id: asset.id } });
    const completed = await s.action(a, h, activity.id, 'complete', body, key);
    assert.equal(completed.activity.state, 'completed'); assert.equal(completed.activity.dueState, 'closed');
    assert.deepEqual(await s.action(a, h, activity.id, 'complete', body, key), completed);
    await deny(s.action(a, h, activity.id, 'complete', { expectedVersion: 3 }, randomUUID()), 409, 'invalid_activity_state');
    await deny(s.action(a, h, activity.id, 'complete', { ...body, note: 'altro' }, key), 409, 'idempotency_conflict');
    activity = (await s.action(a, h, activity.id, 'reopen', { expectedVersion: 3 }, randomUUID())).activity;
    assert.equal(activity.completedAt, null); assert.equal(activity.dueState, 'overdue');
    activity = (await s.action(a, h, activity.id, 'cancel', { expectedVersion: 4 }, randomUUID())).activity; assert.equal(activity.state, 'cancelled');
    activity = (await s.action(a, h, activity.id, 'reopen', { expectedVersion: 5 }, randomUUID())).activity;
    assert.deepEqual(await db.boilerAsset.findUnique({ where: { id: asset.id } }), before);
    const kinds = (await s.history(a, h, activity.id, {})).items.map(x => x.kind);
    for (const kind of ['created', 'updated', 'completed', 'cancelled', 'reopened']) assert(kinds.includes(kind));
    assert.equal(await db.aiAttempt.count(), aiBefore);
  });
  await t.test('Link non accessibile redatto anche in storia; attività conservata, replay negato', async () => {
    await db.boilerAsset.update({ where: { id: asset.id }, data: { accountId: b } });
    assert.deepEqual((await s.get(a, h, activity.id, {})).activity.assetLink, { state: 'unavailable', asset: null });
    const history = JSON.stringify(await s.history(a, h, activity.id, {})); assert(!history.includes(asset.id)); assert(!history.includes(asset.name));
    await deny(s.create(a, h, creationBody, creationKey), 403);
    activity = (await s.update(a, h, activity.id, { expectedVersion: activity.version, description: 'Rimane personale' }, randomUUID())).activity;
    assert.equal(activity.assetLink.state, 'unavailable');
    activity = (await s.update(a, h, activity.id, { expectedVersion: activity.version, assetId: null }, randomUUID())).activity;
    assert.equal(activity.assetLink.state, 'none');
  });
  await t.test('Fonti M3 non accessibili: non basta essere autore della caldaia', async () => {
    await db.boilerAsset.update({ where: { id: asset.id }, data: { accountId: a } });
    await db.analysisJob.create({ data: { accountId: a, homeId: h, assetId: asset.id, state: 'succeeded', documents: [{ documentId: randomUUID(), documentVersion: 1, documentSha256: 'missing-source' }] } });
    await deny(s.create(a, h, { title: 'x', assetId: asset.id }, randomUUID()), 403);
    await db.analysisJob.deleteMany({ where: { homeId: h } });
  });
  await t.test('Viewer, membership scaduta/revocata e riprova rilegge diritti', async () => {
    const key = randomUUID(), body = { expectedVersion: activity.version, description: 'nuova nota' };
    const saved = await s.update(a, h, activity.id, body, key); activity = saved.activity;
    await db.homeMembership.update({ where: { accountId_homeId: { accountId: a, homeId: h } }, data: { role: 'viewer' } });
    assert.deepEqual((await s.get(a, h, activity.id, {})).activity.permissions, ['read']); await deny(s.update(a, h, activity.id, body, key), 403);
    await db.homeMembership.update({ where: { accountId_homeId: { accountId: a, homeId: h } }, data: { role: 'owner', validUntil: new Date(0) } });
    await deny(s.summary(a, h, {}), 403);
    await db.homeMembership.update({ where: { accountId_homeId: { accountId: a, homeId: h } }, data: { validUntil: null, revokedAt: new Date() } });
    await deny(s.history(a, h, activity.id, {}), 403);
    await db.homeMembership.update({ where: { accountId_homeId: { accountId: a, homeId: h } }, data: { revokedAt: null } });
  });
  await t.test('Oggi/+7/+8/senza data, ordine e pagine vincolate al filtro non al limit', async () => {
    for (const date of ['2026-10-13', '2026-10-14', '2026-10-20', '2026-10-21', null]) await s.create(a, h, { title: 'Data ' + date, dueDate: date }, randomUUID());
    const summary = await s.summary(a, h, {}); assert.deepEqual(summary.counts, { overdue: 1, today: 1, upcoming: 3, undated: 1 });
    assert.equal(summary.nextItems.length, 3); assert.equal(summary.nextItems[0].dueDate, '2026-10-12');
    const first = await s.list(a, h, { limit: '2' }), second = await s.list(a, h, { cursor: first.nextCursor, limit: '4' });
    assert.equal(new Set([...first.items, ...second.items].map(x => x.id)).size, 6); assert.equal(second.nextCursor, null);
    await deny(s.list(a, h, { state: 'all', cursor: first.nextCursor }), 422); await deny(s.list(b, h, { cursor: first.nextCursor }), 422);
    await s.action(a, h, activity.id, 'complete', { expectedVersion: activity.version }, randomUUID());
    const withoutPast = await s.summary(a, h, {}); assert(withoutPast.nextItems.some(x => x.dueDate === '2026-10-20')); assert(!withoutPast.nextItems.some(x => x.dueDate === '2026-10-21'));
  });
  await t.test('Cambio giorno server: stessa data, nuovo stato alla lettura e nuove istanze persistono', async () => {
    const row = (await s.list(a, h, { due: 'today' })).items[0]; now = new Date('2026-10-13T22:00:00Z');
    const fresh = new ActivitiesService(db, new ReviewService(db, {}), clock);
    const read = await fresh.get(a, h, row.id, {}); assert.equal(read.today, '2026-10-14'); assert.equal(read.activity.dueDate, '2026-10-13'); assert.equal(read.activity.dueState, 'overdue');
  });
});
