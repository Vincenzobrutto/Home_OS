require('reflect-metadata');
const { test } = require('node:test'); const assert = require('node:assert/strict'); const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('../generated/client'); const { assertDevelopmentDatabase } = require('../dist/prisma.service');
const { DocumentsService } = require('../dist/documents/documents.service'); const { DocumentPolicy } = require('../dist/documents/access');
test('H2: ricerca PostgreSQL reale su metadata, privacy e keyset; zero file/AI', async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL); const db = new PrismaClient(); await db.$connect();
  const accounts = await Promise.all(['A', 'B'].map(name => db.account.create({ data: { name: 'Ricerca H2 ' + name, email: randomUUID() + '@example.test', passwordHash: 'not-a-login-hash' } })));
  const [a, b] = accounts.map(x => x.id), homes = await Promise.all(['H2', 'H2 altra'].map(name => db.home.create({ data: { name, address: 'Via test' } }))), [h, other] = homes.map(x => x.id);
  await db.homeMembership.createMany({ data: [{ accountId: a, homeId: h, role: 'owner' }, { accountId: b, homeId: h, role: 'owner' }, { accountId: a, homeId: other, role: 'owner' }].map(x => ({ ...x, validFrom: new Date(0) })) });
  const ids = [], fileIds = [], aiBefore = await db.aiAttempt.count();
  const service = new DocumentsService(db, { read: () => { throw Error('Search must not read files'); } }, new DocumentPolicy(db));
  const list = (filters = {}, account = a, home = h) => service.list(account, home, { limit: 20, ...filters });
  const deny = (promise, status) => assert.rejects(promise, e => e.getStatus?.() === status);
  async function doc(name, filename, mime = 'application/pdf', visibility = 'private', uploaderId = a, homeId = h, createdAt = new Date('2026-01-01T00:00:00Z')) {
    const row = await db.document.create({ data: { name, visibility, uploaderId, homeId, createdAt, original: { create: { originalFilename: filename, mimeType: mime, byteSize: 100, sha256: 'a'.repeat(64), file: { create: { storageKey: randomUUID() + '.bin' } } } } }, include: { original: true } });
    ids.push(row.id); fileIds.push(row.original.fileId); return row;
  }
  t.after(async () => {
    await db.documentVersion.deleteMany({ where: { documentId: { in: ids } } }); await db.document.deleteMany({ where: { id: { in: ids } } }); await db.storedFile.deleteMany({ where: { id: { in: fileIds } } });
    await db.home.deleteMany({ where: { id: { in: homes.map(x => x.id) } } }); await db.account.deleteMany({ where: { id: { in: [a, b] } } }); await db.$disconnect();
  });
  await t.test('Capabilities autorizzata e casa vuota', async () => {
    assert.equal((await service.searchCapabilities(a, h, {})).apiVersion, 'document-search-v1'); assert.deepEqual((await list()).items, []);
    await deny(service.searchCapabilities(b, other, {}), 403); await deny(service.searchCapabilities(a, h, { q: 'x' }), 422);
  });
  const boiler = await doc('Manuale caldaia', 'LibrettoGas.pdf'), unicode = await doc('Manuale Cafe\u0301', 'cafe-serial.pdf');
  const symbols = await doc("Prezzo 100% _ cartella\\prova", 'simboli.pdf'), injection = await doc("Test ' OR 1=1 --", 'test-sql.pdf');
  const png = await doc('Immagine finta', 'finta.pdf', 'image/png'), jpeg = await doc('Foto quadro', 'immagine.jpg', 'image/jpeg');
  await doc('Segreto personale B', 'segreto-b.pdf', 'application/pdf', 'private', b);
  const shared = await doc('Segreto condiviso', 'condiviso.pdf', 'application/pdf', 'home', b);
  await doc('Manuale altra casa', 'LibrettoGas.pdf', 'application/pdf', 'private', a, other);
  await t.test('Titolo OR filename, case folding Unicode e NFC senza riscrivere metadati', async () => {
    assert.deepEqual((await list({ q: 'CALDAIA' })).items.map(x => x.id), [boiler.id]);
    assert.deepEqual((await list({ q: 'librettogas' })).items.map(x => x.id), [boiler.id]);
    for (const q of [' CAFÉ ', 'Cafe\u0301', 'café']) assert.deepEqual((await list({ q })).items.map(x => x.id), [unicode.id]);
    assert.equal((await list({ q: 'caldàia' })).items.length, 0);
    assert.equal((await db.document.findUnique({ where: { id: unicode.id } })).name, 'Manuale Cafe\u0301');
  });
  await t.test('Wildcard, backslash, apostrofo e input SQL sono testo letterale', async () => {
    for (const q of ['100%', '_', '\\']) assert.deepEqual((await list({ q })).items.map(x => x.id), [symbols.id]);
    assert.deepEqual((await list({ q: "' OR 1=1 --" })).items.map(x => x.id), [injection.id]); assert.equal((await list({ q: '%inesistente%' })).items.length, 0);
  });
  await t.test('Formato MIME, combinazioni filtri e privacy owner: nessun leak', async () => {
    assert.deepEqual((await list({ format: 'png' })).items.map(x => x.id), [png.id]); assert.deepEqual((await list({ format: 'jpeg' })).items.map(x => x.id), [jpeg.id]);
    assert.equal((await list({ q: 'finta', format: 'pdf' })).items.length, 0);
    assert.deepEqual((await list({ q: 'Segreto' })).items.map(x => x.id), [shared.id]);
    assert.equal((await list({ q: 'Segreto', visibility: 'private' })).items.length, 0);
    assert.deepEqual((await list({ visibility: 'home', format: 'pdf' })).items.map(x => x.id), [shared.id]);
    assert.equal((await list({ q: 'caldaia' }, b)).items.length, 0);
  });
  let target;
  for (let index = 0; index < 25; index++) { const row = await doc('Pagina ' + index, index === 24 ? 'trovami-originale.pdf' : `pagina-${index}.pdf`, 'application/pdf', 'private', a, h, index === 24 ? new Date('2020-01-01T00:00:00Z') : new Date('2026-02-01T00:00:00Z')); if (index === 24) target = row; }
  await t.test('Ricerca oltre prima pagina, keyset filtrato e timestamp uguali senza duplicati', async () => {
    assert(!(await list()).items.some(x => x.id === target.id)); assert.deepEqual((await list({ q: 'trovami' })).items.map(x => x.id), [target.id]);
    const result = [], seen = new Set(); let cursor;
    do { const page = await list({ q: 'Pagina', limit: cursor ? 11 : 7, ...(cursor ? { cursor } : {}) }); result.push(...page.items); cursor = page.nextCursor; if (cursor) { assert(!seen.has(cursor), 'Cursor repeated: pagination must make progress'); seen.add(cursor); } } while (cursor);
    assert.equal(result.length, 25); assert.equal(new Set(result.map(x => x.id)).size, 25);
    const sameTime = result.slice(0, -1).map(x => x.id); assert.deepEqual(sameTime, [...sameTime].sort().reverse()); assert.equal(result.at(-1).id, target.id);
  });
  await t.test('Cursor legato a contesto/filtri e compatibilità M2 solo senza filtri', async () => {
    const page = await list({ q: 'Pagina', limit: 1 }); const cursor = page.nextCursor;
    for (const filters of [{ q: 'altro' }, { q: 'Pagina', format: 'pdf' }, { q: 'Pagina', visibility: 'private' }]) await deny(list({ ...filters, cursor }), 422);
    await deny(list({ q: 'Pagina', cursor }, b), 422); await deny(list({ q: 'Pagina', cursor }, a, other), 422);
    const old = Buffer.from(JSON.stringify({ a, h, t: page.items[0].createdAt, id: page.items[0].id })).toString('base64url');
    assert((await list({ cursor: old })).items.length); await deny(list({ q: 'Pagina', cursor: old }), 422);
    assert.deepEqual((await list({ q: '   ' })).items.map(x => x.id), (await list()).items.map(x => x.id));
  });
  await t.test('Viewer, revoca e scadenza: policy riletta a ogni ricerca', async () => {
    const where = { accountId_homeId: { accountId: a, homeId: h } };
    await db.homeMembership.update({ where, data: { role: 'viewer' } }); assert((await list()).items.every(x => JSON.stringify(x.permissions) === '["read"]'));
    await deny(service.upload(a, h, { name: 'x', visibility: 'private' }, undefined, randomUUID()), 403); await deny(service.export(a, h, [boiler.id]), 403);
    await db.homeMembership.update({ where, data: { role: 'owner', revokedAt: new Date() } }); await deny(list(), 403); await deny(service.searchCapabilities(a, h, {}), 403);
    await db.homeMembership.update({ where, data: { revokedAt: null, validUntil: new Date(0) } }); await deny(list({ q: 'caldaia' }), 403);
    await db.homeMembership.update({ where, data: { validUntil: null } });
  });
  await t.test('Nessuna scrittura di originali/AI o lettura file dalla ricerca', async () => {
    assert.equal(await db.aiAttempt.count(), aiBefore); const original = await db.documentVersion.findUnique({ where: { documentId: unicode.id } }); assert.equal(original.sha256, 'a'.repeat(64));
    assert.equal(await db.document.count({ where: { id: { in: ids } } }), ids.length);
  });
});
