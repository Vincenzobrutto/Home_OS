require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ForbiddenException } = require('@nestjs/common');
const { linkConfirmedContacts } = require('../dist/contacts/proposals');

/** Transazione finta: contatti, collegamenti, spese, oggetti e collegamenti oggetto-spesa in memoria. */
function world() {
  const a = randomUUID(), h = randomUUID();
  const db = { contacts: [], links: [], expenses: [], objects: [], objectLinks: [], readable: new Set() };
  const match = (row, where) => Object.entries(where).every(([k, v]) => row[k] === v);
  const key = (w) => [w.contactId, w.resourceKind, w.resourceId].join('|');
  const tx = {
    $queryRaw: async () => [...db.readable].map(id => ({ id })),
    homeContact: { findFirst: async ({ where }) => db.contacts.find(r => match(r, where)) ?? null, update: async ({ where }) => { const c = db.contacts.find(r => r.id === where.id); c.version++; return c; } },
    contactResourceLink: {
      findUnique: async ({ where }) => db.links.find(l => key(l) === key(where.contactId_resourceKind_resourceId)) ?? null,
      upsert: async ({ where, create, update }) => { const l = db.links.find(x => key(x) === key(where.contactId_resourceKind_resourceId)); if (l) Object.assign(l, update); else db.links.push({ state: 'active', ...create }); },
    },
    homeExpense: { findFirst: async ({ where }) => db.expenses.find(r => match(r, where)) ?? null },
    objectResourceLink: { findMany: async ({ where }) => db.objectLinks.filter(r => match(r, where)) },
    homeObject: { findFirst: async ({ where }) => db.objects.find(r => match(r, where)) ?? null },
  };
  const review = { asset: async () => { throw new ForbiddenException(); }, assetSources: async () => {} };
  return { a, h, db, tx, review };
}

test('BL-10b: il professionista confermato si collega a spesa, oggetto della spesa e oggetti confermati; niente risorse illeggibili o duplicati', async () => {
  const { a, h, db, tx, review } = world();
  const contact = { id: randomUUID(), accountId: a, homeId: h, state: 'active', version: 1 };
  const boilerObject = { id: randomUUID(), accountId: a, homeId: h, state: 'active', name: 'Caldaia' };
  const archived = { id: randomUUID(), accountId: a, homeId: h, state: 'archived', name: 'Vecchio' };
  const created = { id: randomUUID(), accountId: a, homeId: h, state: 'active', name: 'Valvola' };
  db.contacts.push(contact); db.objects.push(boilerObject, archived, created);
  for (const o of [boilerObject, archived, created]) db.readable.add(o.id);
  const expense = { id: randomUUID(), accountId: a, homeId: h, state: 'active', assetId: randomUUID() };
  db.expenses.push(expense);
  db.objectLinks.push({ expenseId: expense.id, accountId: a, homeId: h, state: 'active', objectId: boilerObject.id, boilerId: null });
  // Collegamento al documento già creato dalla conferma del contatto.
  db.links.push({ contactId: contact.id, resourceKind: 'document', resourceId: randomUUID(), state: 'active' });
  const decisions = {
    cost: { state: 'confirmed', objectIds: [], expenseId: expense.id },
    item: { state: 'confirmed', objectIds: [created.id, archived.id], expenseId: null },
    skipped: { state: 'skipped', objectIds: [randomUUID()], expenseId: null },
    'contact:c1': { state: 'confirmed', objectIds: [], expenseId: null, contactId: contact.id },
  };
  assert.equal(await linkConfirmedContacts(tx, a, h, decisions, review), 3);
  const linked = db.links.filter(l => l.resourceKind !== 'document').map(l => l.resourceKind + ':' + l.resourceId).sort();
  assert.deepEqual(linked, [`expense:${expense.id}`, `object:${boilerObject.id}`, `object:${created.id}`].sort(), 'oggetto archiviato, caldaia non leggibile e voce scartata esclusi');
  assert.equal(contact.version, 2, 'una sola nuova versione del contatto');
  // Seconda conferma della stessa bozza (replay o conferma parziale successiva): nessun duplicato, nessuna nuova versione.
  assert.equal(await linkConfirmedContacts(tx, a, h, decisions, review), 0);
  assert.equal(db.links.length, 4); assert.equal(contact.version, 2);
});

test('BL-10b: professionista scartato o archiviato, o altro account: nessun collegamento', async () => {
  const { a, h, db, tx, review } = world();
  const expense = { id: randomUUID(), accountId: a, homeId: h, state: 'active', assetId: null };
  db.expenses.push(expense);
  const cost = { state: 'confirmed', objectIds: [], expenseId: expense.id };
  assert.equal(await linkConfirmedContacts(tx, a, h, { cost, 'contact:c1': { state: 'skipped', contactId: null } }, review), 0);
  const archived = { id: randomUUID(), accountId: a, homeId: h, state: 'archived', version: 4 };
  const foreign = { id: randomUUID(), accountId: randomUUID(), homeId: h, state: 'active', version: 1 };
  db.contacts.push(archived, foreign);
  assert.equal(await linkConfirmedContacts(tx, a, h, { cost, 'contact:c1': { state: 'confirmed', contactId: archived.id }, 'contact:c2': { state: 'confirmed', contactId: foreign.id } }, review), 0);
  // Spesa di un altro account: non collegata.
  const other = { id: randomUUID(), accountId: randomUUID(), homeId: h, state: 'active', assetId: null };
  db.expenses.push(other);
  const mine = { id: randomUUID(), accountId: a, homeId: h, state: 'active', version: 1 }; db.contacts.push(mine);
  assert.equal(await linkConfirmedContacts(tx, a, h, { cost: { state: 'confirmed', objectIds: [], expenseId: other.id }, 'contact:c3': { state: 'confirmed', contactId: mine.id } }, review), 0);
  assert.equal(db.links.length, 0);
});
