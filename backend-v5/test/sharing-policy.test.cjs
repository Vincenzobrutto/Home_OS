const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const p = require('../dist/sharing/policy');
function world() {
  const senderAccountId = randomUUID(), recipientAccountId = randomUUID(), homeId = randomUUID();
  const now = new Date('2026-10-15T12:00:00Z');
  const member = accountId => ({ accountId, homeId, role: 'member', validFrom: new Date(0), validUntil: null, revokedAt: null });
  const documents = [0, 1].map(i => ({ id: randomUUID(), homeId, uploaderId: senderAccountId, name: `Originale ${i}.pdf`,
    original: { version: 1, sha256: 'a'.repeat(64), byteSize: 1024, mimeType: 'application/pdf', available: true } }));
  return { selection: { documentIds: [documents[0].id], recipientAccountId, durationDays: 7 },
    ctx: { senderAccountId, homeId, sender: member(senderAccountId), recipient: member(recipientAccountId), documents, now } };
}
function forbidden(fn) { assert.throws(fn, error => error.getStatus() === 403 && error.getResponse().code === 'share_unavailable'); }
test('C1 offline: only explicit originals, canonical metadata, fixed server expiry, no derivatives', () => {
  const { selection, ctx } = world();
  ctx.documents[0].expense = { amountCents: 9000, note: 'private' };
  const m = p.previewShare(selection, ctx);
  assert.equal(m.items.length, 1); assert.equal(m.totalBytes, 1024);
  assert.equal(m.expiresAt, '2026-10-22T12:00:00.000Z');
  assert.deepEqual(Object.keys(m.items[0]).sort(), ['byteSize','documentId','documentVersion','mimeType','name','sha256']);
  assert(!JSON.stringify(m).includes('private')); assert(!JSON.stringify(m).includes(ctx.documents[1].id));
});
test('C1 offline: empty, duplicates, unknown economic fields and invalid duration rejected', () => {
  const { selection } = world();
  for (const input of [{ ...selection, documentIds: [] }, { ...selection, documentIds: [...selection.documentIds, ...selection.documentIds] },
    { ...selection, expenseIds: [randomUUID()] }, { ...selection, durationDays: '7' }, { ...selection, durationDays: 0 },
    { ...selection, recipientAccountId: 'email@example.test' }, { ...selection, documentIds: Array.from({length:21}, randomUUID) }]) {
    assert.throws(() => p.shareSelection(input));
  }
});
test('C1 offline: no reshare of another uploader, unknown document, other home or missing original', () => {
  for (const mutate of [c => { c.documents[0].uploaderId = c.recipient.accountId; }, c => { c.documents[0].homeId = randomUUID(); },
    c => { c.documents = []; }, c => { c.documents[0].original = null; }, c => { c.documents[0].original.available = false; }]) {
    const { selection, ctx } = world(); mutate(ctx); forbidden(() => p.previewShare(selection, ctx));
  }
});
test('C1 offline: sender/viewer/revoked/future/expired and recipient identity checked', () => {
  for (const mutate of [c => { c.sender.role = 'viewer'; }, c => { c.sender.revokedAt = c.now; }, c => { c.sender.validUntil = c.now; },
    c => { c.sender.validFrom = new Date(c.now.getTime()+1); }, c => { c.recipient = null; },
    c => { c.recipient.homeId = randomUUID(); }, c => { c.recipient.accountId = randomUUID(); }]) {
    const { selection, ctx } = world(); mutate(ctx); forbidden(() => p.previewShare(selection, ctx));
  }
  const { selection, ctx } = world(); selection.recipientAccountId = ctx.senderAccountId;
  forbidden(() => p.previewShare(selection, ctx));
});
test('C1 offline: acknowledgement must match current selection, additions/removals invalidate it', () => {
  const { selection, ctx } = world(); const m = p.previewShare(selection, ctx);
  const confirmation = { documentIds: selection.documentIds, manifestFingerprint: p.manifestFingerprint(m) };
  p.acknowledgeManifest(m, confirmation);
  for (const ids of [[], [randomUUID()], [selection.documentIds[0], ctx.documents[1].id]]) assert.throws(() => p.acknowledgeManifest(m, { ...confirmation, documentIds: ids }));
  const expanded = p.previewShare({ ...selection, documentIds: ctx.documents.map(d => d.id) }, ctx);
  assert.throws(() => p.acknowledgeManifest(expanded, confirmation));
  for (const changed of [{ ...m, recipientAccountId: randomUUID() }, { ...m, expiresAt: '2026-11-01T00:00:00Z' },
    { ...m, items: [{ ...m.items[0], documentVersion: 2 }] }]) assert.throws(() => p.acknowledgeManifest(changed, confirmation));
});
test('C1 offline: accepted recipient reads; pending/declined/revoked/other account cannot', () => {
  const { selection, ctx } = world(); const m = p.previewShare(selection, ctx);
  const access = { ...ctx, accountId: selection.recipientAccountId, state: 'accepted' };
  p.assertShareReadable(m, access);
  for (const state of ['pending','declined','revoked']) forbidden(() => p.assertShareReadable(m, { ...access, state }));
  forbidden(() => p.assertShareReadable(m, { ...access, accountId: randomUUID() }));
});
test('C1 offline: expiry boundary, sender sale, recipient revocation and source replacement fail closed', () => {
  for (const mutate of [c => { c.now = new Date('2026-10-22T12:00:00Z'); }, c => { c.sender.revokedAt = c.now; },
    c => { c.recipient.revokedAt = c.now; }, c => { c.documents[0].original.version = 2; },
    c => { c.documents[0].original.sha256 = 'b'.repeat(64); }, c => { c.documents[0].original.byteSize++; },
    c => { c.documents[0].original.mimeType = 'image/png'; }, c => { c.documents[0].original.available = false; }]) {
    const { selection, ctx } = world(); const m = p.previewShare(selection, ctx);
    const access = { ...ctx, accountId: selection.recipientAccountId, state: 'accepted' }; mutate(access);
    forbidden(() => p.assertShareReadable(m, access));
  }
});
test('C1 offline: total size bounded and unavailable errors reveal no source identifiers', () => {
  const { selection, ctx } = world(); ctx.documents[0].original.byteSize = p.sharingLimits.bytes + 1;
  assert.throws(() => p.previewShare(selection, ctx));
  ctx.documents[0].original = null;
  try { p.previewShare(selection, ctx); assert.fail(); } catch (error) {
    const wire = JSON.stringify(error.getResponse()); assert(!wire.includes(selection.documentIds[0])); assert(!wire.includes(ctx.documents[0].name));
  }
});
test('C1 offline: fingerprint survives JSON property reordering, not content changes', () => {
  const { selection, ctx } = world(); const m = p.previewShare(selection, ctx);
  const stored = { ...m, items: m.items.map(item => Object.fromEntries(Object.entries(item).reverse())) };
  assert.equal(p.manifestFingerprint(stored), p.manifestFingerprint(m));
  stored.items[0].name = 'Other.pdf'; assert.notEqual(p.manifestFingerprint(stored), p.manifestFingerprint(m));
});
