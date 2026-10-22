require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const d = require('../dist/home-history/domain');
const { HomeHistoryService } = require('../dist/home-history/home-history.service');

const TODAY = '2026-10-22';

test('BL-03 date: anno, mese/anno o giorno; nessun giorno inventato; mai future; giorni validi', () => {
  assert.deepEqual(d.eventDate({ year: 2020 }, TODAY), { year: 2020, month: null, day: null });
  assert.deepEqual(d.eventDate({ year: 2020, month: 3 }, TODAY), { year: 2020, month: 3, day: null });
  assert.deepEqual(d.eventDate({ year: 2024, month: 2, day: 29 }, TODAY), { year: 2024, month: 2, day: 29 });
  for (const bad of [{ year: 2023, month: 2, day: 29 }, { year: 2020, day: 3 }, { year: 2020, month: 13 }, { year: 1700 }, { year: '2020' }, { year: 2020, extra: 1 }]) assert.throws(() => d.eventDate(bad, TODAY));
  for (const future of [{ year: 2027 }, { year: 2026, month: 11 }, { year: 2026, month: 10, day: 23 }]) assert.throws(() => d.eventDate(future, TODAY), /futura/);
  assert.equal(d.precisionOf({ year: 2020, month: null, day: null }), 'year');
  assert.equal(d.sortKeyOf({ year: 2020, month: null, day: null }), '2020-00-00');
  assert.equal(d.sortKeyOf({ year: 2020, month: 3, day: null }), '2020-03-00');
  assert.ok(d.sortKeyOf({ year: 2020, month: null, day: null }) < d.sortKeyOf({ year: 2020, month: 1, day: 1 }), 'il solo anno non diventa 1° gennaio');
});

test('BL-03 corpi: titolo normalizzato, descrizione facoltativa, documenti unici fino a 5, modifiche non vuote', () => {
  const body = d.createEventBody({ title: '  Bagno   rifatto ', date: { year: 2020 }, description: '  ', documentIds: [] }, TODAY);
  assert.equal(body.title, 'Bagno rifatto'); assert.equal(body.description, null); assert.equal(body.sortKey, '2020-00-00');
  const id = randomUUID();
  assert.throws(() => d.createEventBody({ title: 'X', date: { year: 2020 }, documentIds: [id, id] }, TODAY));
  assert.throws(() => d.createEventBody({ title: 'X', date: { year: 2020 }, documentIds: Array.from({ length: 6 }, () => randomUUID()) }, TODAY));
  assert.throws(() => d.createEventBody({ title: '', date: { year: 2020 } }, TODAY));
  assert.throws(() => d.updateEventBody({ expectedVersion: 1 }, TODAY), /Nessuna modifica/);
  assert.deepEqual(d.updateEventBody({ expectedVersion: 2, date: { year: 2019, month: 5 } }, TODAY), { expectedVersion: 2, year: 2019, month: 5, day: null, sortKey: '2019-05-00' });
  assert.deepEqual(d.historyQuery({ year: '2020', limit: '10' }), { year: 2020, limit: 10, cursor: null });
  for (const bad of [{ year: '20' }, { limit: '99' }, { other: '1' }]) assert.throws(() => d.historyQuery(bad));
});

/** Database finto: righe per sorgente, già filtrabili per account/casa come farebbe Prisma. */
function fakeService(rows, accountId, homeId, docs = []) {
  const scoped = list => where => list.filter(r => r.accountId === where.accountId && r.homeId === where.homeId && (!where.state || r.state === where.state));
  const tx = {
    homeHistoryEvent: { findMany: async ({ where }) => scoped(rows.events)(where) },
    economicWork: { findMany: async ({ where }) => scoped(rows.works)(where).map(w => ({ ...w, expenses: w.expenses.filter(e => e.accountId === accountId && e.state === 'active') })) },
    homeActivity: { findMany: async ({ where }) => scoped(rows.activities)(where).filter(a => a.completedAt) },
    homeObject: { findMany: async ({ where }) => scoped(rows.objects)(where) },
    document: { findMany: async ({ where }) => docs.filter(x => where.id.in.includes(x.id) && x.homeId === where.homeId) },
  };
  const db = { $transaction: async fn => fn(tx) };
  const access = { lock: async () => {}, require: async () => ({ role: 'owner' }) };
  return new HomeHistoryService(db, access, { now: () => new Date('2026-10-22T10:00:00Z') });
}

test('BL-03 lettura: sorgenti personali, lavori datati dalle spese, etichette esplicite, documenti altrui redatti, filtro anno e cursore stabile', async () => {
  const a = randomUUID(), other = randomUUID(), h = randomUUID();
  const mine = randomUUID(), foreign = randomUUID();
  const ev = (over) => ({ id: randomUUID(), accountId: a, homeId: h, title: 'Evento', description: null, year: 2020, month: null, day: null, sortKey: '2020-00-00', documentIds: [], state: 'active', version: 1, ...over });
  const rows = {
    events: [ev({ title: 'Bagno rifatto', documentIds: [mine, foreign] }), ev({ title: 'Caldaia sostituita', year: 2023, month: 4, sortKey: '2023-04-00' }), ev({ title: 'Rimosso', state: 'removed' }), ev({ accountId: other, title: 'Di un altro membro' })],
    works: [
      { id: randomUUID(), accountId: a, homeId: h, name: 'Impianto elettrico', state: 'active', expenses: [{ accountId: a, state: 'active', spentOn: '2026-07-08' }, { accountId: a, state: 'active', spentOn: '2026-06-16' }] },
      { id: randomUUID(), accountId: a, homeId: h, name: 'Senza spese', state: 'active', expenses: [] },
    ],
    activities: [{ id: randomUUID(), accountId: a, homeId: h, title: 'Controllo caldaia', state: 'completed', completedAt: new Date('2025-11-03T23:30:00Z') }],
    objects: [{ id: randomUUID(), accountId: a, homeId: h, name: 'Lavatrice', createdAt: new Date('2026-10-18T09:00:00Z'), state: 'active' }],
  };
  const docs = [{ id: mine, homeId: h, name: 'Fattura bagno', uploaderId: a, visibility: 'private', original: {} }, { id: foreign, homeId: h, name: 'Segreto', uploaderId: other, visibility: 'private', original: {} }];
  const service = fakeService(rows, a, h, docs);
  const page = await service.list(a, h, {});
  assert.deepEqual(page.items.map(i => i.title), ['Lavatrice', 'Impianto elettrico', 'Controllo caldaia', 'Caldaia sostituita', 'Bagno rifatto']);
  assert.ok(!JSON.stringify(page).includes('Di un altro membro') && !JSON.stringify(page).includes('Rimosso') && !JSON.stringify(page).includes('Segreto'));
  const work = page.items.find(i => i.kind === 'work');
  assert.deepEqual(work.date, { year: 2026, month: 6, day: 16, precision: 'day' }); assert.deepEqual(work.period, { from: '2026-06-16', to: '2026-07-08' });
  assert.equal(page.items.find(i => i.kind === 'activity_completed').date.day, 4, 'data di completamento nel fuso Europe/Rome');
  assert.match(page.items.find(i => i.kind === 'object_added').sourceLabel, /non di acquisto/);
  const bath = page.items.find(i => i.title === 'Bagno rifatto');
  assert.deepEqual(bath.date, { year: 2020, month: null, day: null, precision: 'year' });
  assert.deepEqual(bath.documents, [{ id: mine, name: 'Fattura bagno' }]); assert.equal(bath.unavailableDocuments, 1);
  assert.deepEqual(page.years, [{ year: 2026, count: 2 }, { year: 2025, count: 1 }, { year: 2023, count: 1 }, { year: 2020, count: 1 }]);
  assert.deepEqual((await service.list(a, h, { year: '2026' })).items.map(i => i.title), ['Lavatrice', 'Impianto elettrico']);
  const first = await service.list(a, h, { limit: '2' });
  assert.equal(first.items.length, 2); assert.ok(first.nextCursor);
  // Un evento retrodatato aggiunto fra le pagine non sposta né duplica la pagina successiva.
  rows.events.push(ev({ title: 'Inserito dopo', year: 2026, month: 10, day: 20, sortKey: '2026-10-20' }));
  const second = await service.list(a, h, { limit: '2', cursor: first.nextCursor });
  assert.deepEqual(second.items.map(i => i.title), ['Controllo caldaia', 'Caldaia sostituita']);
  await assert.rejects(service.list(a, h, { limit: '2', year: '2026', cursor: first.nextCursor }), /Pagina non valida/);
});
