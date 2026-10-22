require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { warrantyDocumentInput, applyWarrantySupport, presentWarrantySupport } = require('../dist/home-objects/warranty');

const declared = (value) => ({ value, origin: 'user_declared', sources: [] });

test('BL-02: input del documento di supporto, solo forma esatta e id valido', () => {
  const id = randomUUID();
  assert.equal(warrantyDocumentInput(undefined), undefined);
  assert.equal(warrantyDocumentInput(null), null);
  assert.equal(warrantyDocumentInput({ documentId: id }), id);
  for (const bad of ['x', [], { documentId: 'non-uuid' }, { documentId: id, extra: 1 }, { id }, { documentId: 5 }]) {
    assert.throws(() => warrantyDocumentInput(bad));
  }
});

test('BL-02: il supporto si collega solo a una scadenza dichiarata e si rimuove esplicitamente', () => {
  const id = randomUUID();
  assert.throws(() => applyWarrantySupport({}, id), /Indica prima la scadenza/);
  assert.throws(() => applyWarrantySupport({ warrantyEnd: { value: '2027-01-01', origin: 'extraction_confirmed', sources: [{}] } }, id), /già la sua fonte/);
  const fields = applyWarrantySupport({ warrantyEnd: declared('2027-01-01') }, id);
  assert.deepEqual(fields.warrantyEnd, { ...declared('2027-01-01'), support: { documentId: id } });
  assert.equal(fields.warrantyEnd.origin, 'user_declared', 'il supporto non cambia la provenienza');
  assert.deepEqual(applyWarrantySupport(fields, undefined).warrantyEnd.support, { documentId: id }, 'undefined lascia invariato');
  assert.deepEqual(applyWarrantySupport(fields, null).warrantyEnd, declared('2027-01-01'));
});

test('BL-02: presentazione con nome solo se leggibile; altrimenti oscurato, data dichiarata visibile', async () => {
  const id = randomUUID(), account = randomUUID(), home = randomUUID();
  const profile = { unavailable: false, fields: { warrantyEnd: { ...declared('2027-01-01'), support: { documentId: id } } } };
  const tx = (doc) => ({ document: { findFirst: async ({ where }) => (where.id === id && where.homeId === home ? doc : null) } });
  const own = await presentWarrantySupport(tx({ id, name: 'Fattura lavatrice', uploaderId: account, visibility: 'private', original: {} }), account, home, profile);
  assert.deepEqual(own.fields.warrantyEnd.support, { documentId: id, name: 'Fattura lavatrice' });
  const other = await presentWarrantySupport(tx({ id, name: 'Segreto', uploaderId: randomUUID(), visibility: 'private', original: {} }), account, home, profile);
  assert.equal(other.fields.warrantyEnd.support, null);
  assert.equal(other.fields.warrantyEnd.supportUnavailable, true);
  assert.equal(other.fields.warrantyEnd.value, '2027-01-01');
  assert.ok(!JSON.stringify(other).includes('Segreto'));
  const missing = await presentWarrantySupport(tx(null), account, home, profile);
  assert.equal(missing.fields.warrantyEnd.supportUnavailable, true);
  const plain = { unavailable: false, fields: { warrantyEnd: declared('2027-01-01') } };
  assert.equal(await presentWarrantySupport(tx(null), account, home, plain), plain);
  assert.deepEqual(profile.fields.warrantyEnd.support, { documentId: id }, 'il profilo salvato non riceve il nome');
});
