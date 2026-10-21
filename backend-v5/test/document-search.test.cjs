require('reflect-metadata');
const { test } = require('node:test'); const assert = require('node:assert/strict'); const { randomUUID } = require('node:crypto');
const { plainToInstance } = require('class-transformer'); const { validateSync } = require('class-validator');
const { SearchDocumentsDto, ListDocumentsDto } = require('../dist/documents/dto'); const s = require('../dist/documents/search');
test('H2: query normalizzata, limiti Unicode e controlli anche prima del trim', () => {
  assert.equal(s.normalizeSearchQuery('  Cafe\u0301  '), 'Café'); assert.equal(s.normalizeSearchQuery('  '), '');
  assert.equal(s.normalizeSearchQuery('😀'.repeat(120)).length, 240);
  for (const q of ['😀'.repeat(121), '\nmanuale', 'manuale\t', '\u0000', '\u007f', ['x'], null, 1]) assert.throws(() => s.normalizeSearchQuery(q));
  const dto = plainToInstance(SearchDocumentsDto, { q: '  café  ', format: 'pdf', visibility: 'private' });
  assert.equal(dto.q, 'café'); assert.equal(validateSync(dto).length, 0);
  assert(validateSync(plainToInstance(SearchDocumentsDto, { format: ['pdf'], visibility: 'public' })).length);
  assert(validateSync(plainToInstance(ListDocumentsDto, { q: 'x' }), { whitelist: true, forbidNonWhitelisted: true }).length);
});
test('H2: pattern letterale e cursori legati a filtri/contesto, non limit', () => {
  assert.equal(s.literalPattern("100%_\\'"), "%100\\%\\_\\\\'%");
  const a = randomUUID(), h = randomUUID(), row = { id: randomUUID(), createdAt: new Date('2026-10-14T00:00:00Z') }, filters = s.searchFilters({ limit: 20, q: 'Privato %' });
  const cursor = s.searchCursor(row, a, h, filters); assert(cursor.length <= 512);
  assert(!Buffer.from(cursor, 'base64url').toString('utf8').includes('Privato'));
  assert.deepEqual(s.searchAnchor(cursor, a, h, s.searchFilters({ limit: 1, q: ' Privato % ' })), row);
  for (const [account, home, f] of [[randomUUID(), h, filters], [a, randomUUID(), filters], [a, h, { ...filters, format: 'pdf' }], [a, h, { ...filters, q: 'altro' }]]) assert.throws(() => s.searchAnchor(cursor, account, home, f));
  const legacy = Buffer.from(JSON.stringify({ a, h, id: row.id, t: row.createdAt.toISOString() })).toString('base64url');
  const collected = s.searchFilters({ limit: 20, collection: 'energy' });
  assert.throws(() => s.searchAnchor(legacy, a, h, collected));
  assert.throws(() => s.searchAnchor(s.searchCursor(row, a, h, collected), a, h, s.searchFilters({ limit: 20, collection: 'building' })));
  for (const collection of ['__proto__', 'constructor', ['energy'], 'not-a-collection']) assert.throws(() => s.searchFilters({ limit: 20, collection }));
  assert.deepEqual(s.searchAnchor(legacy, a, h, s.searchFilters({ limit: 20 })), row); assert.throws(() => s.searchAnchor(legacy, a, h, filters));
  for (const q of [{ limit: 20, cursor: '!' }, { limit: 51 }, { limit: 20, unknown: 'x' }]) assert.throws(() => s.searchFilters(q));
});

test('house filters are validated and cursor-bound separately from the complete archive',()=>{const a=randomUUID(),h=randomUUID(),row={id:randomUUID(),createdAt:new Date('2026-10-19T08:00:00Z')};for(const collection of ['house','floor_plans','contracts']){const f=s.searchFilters({limit:20,collection});assert.equal(f.collection,collection);const c=s.searchCursor(row,a,h,f);assert.equal(s.searchAnchor(c,a,h,f).id,row.id);assert.throws(()=>s.searchAnchor(c,a,h,s.searchFilters({limit:20,collection:'all'})));}assert.throws(()=>s.searchFilters({limit:20,collection:'unknown'}));});

test('document views reject unknown views and categories outside the house view',()=>{
 for(const query of [{view:'unknown'},{view:['house']},{group:'plans'},{view:'objects',group:'plans'},{view:'house',group:'constructor'}])assert.throws(()=>s.searchFilters({limit:20,...query}));
 assert.equal(s.searchFilters({limit:20,view:'house',group:'contracts'}).group,'contracts');
});
