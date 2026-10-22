require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ForbiddenException } = require('@nestjs/common');
const d = require('../dist/activities/domain');
const { ActivitiesService } = require('../dist/activities/activities.service');

test('BL-01 mesi di calendario: ultimo giorno del mese se manca, bisestili, cambio anno', () => {
  assert.equal(d.addMonths('2026-10-22', 6), '2027-04-22');
  assert.equal(d.addMonths('2026-10-22', 12), '2027-10-22');
  assert.equal(d.addMonths('2026-10-22', 24), '2028-10-22');
  assert.equal(d.addMonths('2026-08-31', 6), '2027-02-28');
  assert.equal(d.addMonths('2027-08-31', 6), '2028-02-29');
  assert.equal(d.addMonths('2024-02-29', 12), '2025-02-28');
  assert.equal(d.addMonths('2026-12-31', 6), '2027-06-30');
});

test('BL-01 corpo: data obbligatoria e valida, collegamenti copiati salvo scelta contraria', () => {
  assert.deepEqual(d.followUpBody({ expectedVersion: 2, title: ' Controllo  caldaia ', dueDate: '2027-04-22' }), { expectedVersion: 2, title: 'Controllo  caldaia', description: null, dueDate: '2027-04-22', copyLinks: true });
  assert.equal(d.followUpBody({ expectedVersion: 2, title: 'X', dueDate: '2027-04-22', copyLinks: false }).copyLinks, false);
  for (const bad of [{ expectedVersion: 2, title: 'X' }, { expectedVersion: 2, title: 'X', dueDate: null }, { expectedVersion: 2, title: 'X', dueDate: '2027-02-30' }, { expectedVersion: 2, title: '', dueDate: '2027-04-22' }, { expectedVersion: 2, title: 'X', dueDate: '2027-04-22', copyLinks: 'si' }, { expectedVersion: 2, title: 'X', dueDate: '2027-04-22', state: 'open' }]) assert.throws(() => d.followUpBody(bad));
});

/** Database finto in memoria, sufficiente per il percorso di creazione del successivo. */
function fakeService() {
  const db = { activities: [], requests: [], history: [], links: [], objects: [], events: [], readableObjects: new Set() };
  const match = (row, where) => Object.entries(where).every(([k, v]) => row[k] === v);
  const tx = {
    $queryRaw: async () => [...db.readableObjects].map(id => ({ id })),
    homeActivity: {
      findFirst: async ({ where, select }) => { const row = db.activities.find(r => match(r, where)); return row && select ? Object.fromEntries(Object.keys(select).map(k => [k, row[k]])) : row ?? null; },
      create: async ({ data }) => { if (data.previousActivityId && db.activities.some(r => r.previousActivityId === data.previousActivityId)) throw new Error('unique'); const row = { id: randomUUID(), version: 1, state: 'open', completedAt: null, cancelledAt: null, assetId: null, previousActivityId: null, ...data }; db.activities.push(row); return row; },
    },
    activityRequest: { findUnique: async ({ where }) => db.requests.find(r => match(r, where.accountId_homeId_operation_target_key)) ?? null, create: async ({ data }) => { db.requests.push(data); return data; } },
    activityHistory: { create: async ({ data }) => { db.history.push(data); return data; } },
    objectResourceLink: { findMany: async ({ where }) => db.links.filter(r => match(r, where)), create: async ({ data }) => { const row = { id: randomUUID(), state: 'active', version: 1, ...data }; db.links.push(row); return row; } },
    homeObject: { findFirst: async ({ where }) => db.objects.find(r => match(r, where)) ?? null },
    objectEvent: { create: async ({ data }) => { db.events.push(data); return data; } },
  };
  const prisma = { $transaction: async fn => fn(tx) };
  const access = { lock: async () => {}, require: async () => ({ role: 'owner' }), asset: async () => { throw new ForbiddenException(); }, assetSources: async () => {} };
  return { db, service: new ActivitiesService(prisma, access, { now: () => new Date('2026-10-22T10:00:00Z') }) };
}

test('BL-01 creazione del successivo: legame, collegamenti leggibili copiati, storia su entrambe, idempotenza, nessun duplicato', async () => {
  const a = randomUUID(), h = randomUUID();
  const { db, service } = fakeService();
  const source = { id: randomUUID(), accountId: a, homeId: h, title: 'Controllo caldaia', description: 'Annuale', dueDate: '2026-10-20', state: 'completed', version: 3, assetId: null, previousActivityId: null, completedAt: new Date('2026-10-21T23:30:00Z'), cancelledAt: null, createdAt: new Date(), updatedAt: new Date() };
  db.activities.push(source);
  const readable = { id: randomUUID(), accountId: a, homeId: h, state: 'active' }, archived = { id: randomUUID(), accountId: a, homeId: h, state: 'archived' };
  db.objects.push(readable, archived); db.readableObjects.add(readable.id);
  for (const target of [{ objectId: readable.id }, { objectId: archived.id }, { boilerId: randomUUID() }]) db.links.push({ id: randomUUID(), accountId: a, homeId: h, objectId: null, boilerId: null, ...target, resourceType: 'activity', resourceId: source.id, activityId: source.id, state: 'active', createdAt: new Date() });
  const key = 'follow-up-key-0001';
  const body = { expectedVersion: 3, title: 'Controllo caldaia', description: 'Annuale', dueDate: '2027-04-22' };

  await assert.rejects(service.followUp(a, h, source.id, { ...body, dueDate: '2026-10-21' }, key), /precedere il completamento/, 'completata il 22/10 a Roma: il 21 è prima');
  await assert.rejects(service.followUp(a, h, source.id, { ...body, expectedVersion: 2 }, key), e => e.response?.code === 'activity_version_conflict' || /cambiata/.test(e.message));

  const res = await service.followUp(a, h, source.id, body, key);
  const next = db.activities.find(r => r.previousActivityId === source.id);
  assert.equal(res.activity.id, next.id); assert.equal(next.dueDate, '2027-04-22'); assert.equal(next.state, 'open');
  assert.deepEqual(res.activity.followUp.previous, { id: source.id, title: 'Controllo caldaia', completedOn: '2026-10-22' });
  const copied = db.links.filter(l => l.activityId === next.id);
  assert.deepEqual(copied.map(l => l.objectId), [readable.id], 'oggetto archiviato e caldaia non leggibile non copiati');
  assert.equal(db.events.length, 1);
  assert.deepEqual(db.history.map(e => [e.activityId === source.id ? 'source' : 'next', e.kind]), [['next', 'created'], ['source', 'follow_up_created']]);

  // Doppio clic / retry con la stessa chiave: stessa risposta, nessuna seconda attività.
  assert.deepEqual(await service.followUp(a, h, source.id, body, key), res);
  assert.equal(db.activities.filter(r => r.previousActivityId === source.id).length, 1);
  await assert.rejects(service.followUp(a, h, source.id, { ...body, dueDate: '2027-10-22' }, key), /Chiave già usata/);
  // Nuova chiave (ad es. dopo riapertura e nuovo completamento): un solo successivo per attività.
  await assert.rejects(service.followUp(a, h, source.id, body, 'follow-up-key-0002'), /già stato creato/);
  // Attività aperta: prima va completata.
  const open = { ...source, id: randomUUID(), state: 'open', completedAt: null };
  db.activities.push(open);
  await assert.rejects(service.followUp(a, h, open.id, body, 'follow-up-key-0003'), /Completa prima/);
  // Attività di un altro account o di un'altra casa: inaccessibile.
  await assert.rejects(service.followUp(randomUUID(), h, source.id, body, 'follow-up-key-0004'), ForbiddenException);
});
