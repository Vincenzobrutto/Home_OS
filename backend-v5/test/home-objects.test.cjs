const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const d = require('../dist/home-objects/domain');

test('G1 manuale: normalizzazione Unicode, nomi a codepoint e campi non fidati', () => {
  const base = { name: '  Cafe\u0301  ', type: 'appliance' };
  assert.deepEqual(d.createHomeObject(base), { name: 'Café', type: 'appliance', note: null, roomIds: [] });
  assert.equal(d.createHomeObject({ ...base, name: '🏠'.repeat(120) }).name.length, 240);
  assert.throws(() => d.createHomeObject({ ...base, name: '🏠'.repeat(121) }));
  assert.throws(() => d.createHomeObject({ ...base, confirmed: { brand: 'AI' } }));
  assert.throws(() => d.createHomeObject({ ...base, type: 'boiler' }));
  assert.throws(() => d.createHomeObject({ ...base, accountId: randomUUID() }));
  assert.throws(() => d.createHomeObject({ ...base, name: ' ' }));
});
test('G1 posizioni: canoniche, facoltative, multiambiente senza duplicati', () => {
  const ids = Array.from({ length: 20 }, randomUUID);
  assert.deepEqual(d.positionBody({ expectedVersion: 0, roomIds: [] }), { expectedVersion: 0, roomIds: [] });
  assert.deepEqual(d.roomIds([...ids].reverse()), [...ids].sort());
  assert.throws(() => d.roomIds([...ids, randomUUID()]));
  assert.throws(() => d.roomIds([ids[0], ids[0]]));
  assert.throws(() => d.positionBody({ expectedVersion: -1, roomIds: [] }));
  assert.throws(() => d.positionBody({ expectedVersion: 0, roomIds: null }));
  assert.throws(() => d.positionBody({ expectedVersion: 0.5, roomIds: [] }));
});
test('G1 room e update: zero riferimenti economici, CAS, nota nullable', () => {
  assert.deepEqual(d.createHomeObject({ name: 'Bagno', type: 'bathroom' }, true), { name: 'Bagno', type: 'bathroom', note: null });
  assert.throws(() => d.createHomeObject({ name: 'Bagno', type: 'bathroom', roomIds: [] }, true));
  assert.throws(() => d.createHomeObject({ name: 'x'.repeat(81), type: 'bathroom' }, true));
  assert.deepEqual(d.updateHomeObject({ expectedVersion: 2, note: ' ' }), { expectedVersion: 2, note: null });
  assert.throws(() => d.updateHomeObject({ expectedVersion: 2 }));
  assert.throws(() => d.updateHomeObject({ expectedVersion: 0, name: 'A' }));
  assert.throws(() => d.updateHomeObject({ expectedVersion: 2, name: null }));
  assert.throws(() => d.updateHomeObject({ expectedVersion: 2, state: 'archived' }));
});
test('G1 query: pagina limitata, filtri incompatibili, nessun filtro ripetuto', () => {
  assert.equal(d.objectsQuery({ limit: '50', placement: 'unplaced' }, true).limit, 50);
  assert.throws(() => d.objectsQuery({ roomId: randomUUID(), placement: 'unplaced' }, true));
  assert.throws(() => d.objectsQuery({ roomId: randomUUID() }));
  assert.throws(() => d.objectsQuery({ limit: ['10', '20'] }));
  assert.throws(() => d.objectsQuery({ limit: '51' }));
  assert.throws(() => d.objectsQuery({ state: 'active' }, false, true));
  assert.equal(d.objectsQuery({ q: ' Cafe\u0301 ', type: 'boiler' }, true).q, 'Café');
  assert.throws(() => d.objectsQuery({ q: 'x'.repeat(81) }, true));
  assert.throws(() => d.objectsQuery({ q: ['A', 'B'] }, true));
  assert.throws(() => d.objectsQuery({ type: 'kitchen' }, true));
  assert.throws(() => d.subjectKind('asset'));
  assert.equal(d.subjectKind('boiler'), 'boiler');
});
