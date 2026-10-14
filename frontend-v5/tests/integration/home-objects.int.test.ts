// INTEGRAZIONE REALE home-objects-v1 (G1) — contro il backend V5 di Codex, nessun mock nel client.
// Saltata per default e mai eseguita da npm test / build. Da lanciare solo dopo che Codex attiva G1:
//   V5_API_URL=http://127.0.0.1:3001/api/v5 V5_OBJECTS_API=1 npm run test:integration
// Crea account/case/ambienti/oggetti/spese sintetici: solo database di sviluppo V5. Nessuna AI.
// Nessun return anticipato: un setup fallito fa fallire il test. Tre registrazioni in tutto.
import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../../src/api/client';
import { samplePdf } from '../../src/test/fakeBackend';

const BASE = process.env.V5_API_URL;
const ENABLED = !!BASE && process.env.V5_OBJECTS_API === '1';
const ORIGIN = process.env.V5_ORIGIN ?? 'http://127.0.0.1:5174';

function clientWithJar() {
  const jar = new Map<string, string>();
  const fetchWithJar: FetchLike = async (input, init) => {
    const headers = new Headers(init.headers);
    headers.set('Origin', ORIGIN);
    if (jar.size) headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '));
    const res = await fetch(input, { ...init, headers });
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attrs] = line.split(';');
      const eq = pair!.indexOf('=');
      const name = pair!.slice(0, eq).trim();
      const value = pair!.slice(eq + 1).trim();
      if (attrs.some((a) => /max-age=0/i.test(a)) || value === '') jar.delete(name);
      else jar.set(name, value);
    }
    return res;
  };
  return new ApiClient({ fetch: fetchWithJar, base: BASE });
}

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const key = () => crypto.randomUUID();

async function setup(label: string) {
  const api = clientWithJar();
  await api.getSession();
  const { account } = await api.register({ name: `Prova G1 ${label}`, email: `g1-${label}-${unique()}@example.test`, password: 'password-prova-g1-123' });
  await api.getSession();
  const home = await api.createHome({ name: `Casa G1 ${label}`, address: 'Via Prova 4' }, key(), account.id);
  return { api, account, home };
}

describe.skipIf(!ENABLED)('[integrazione reale] home-objects-v1', () => {
  it('capabilities, ambienti uguali, oggetto multiambiente atomico, CAS posizione, caldaia unica, collegamenti in due fasi', async () => {
    const { api, account, home } = await setup('a');
    const caps = await api.getObjectCapabilities(home.id, undefined, account.id);
    expect(caps).toMatchObject({ apiVersion: 'home-objects-v1', enabled: true, isSimulation: false, limits: { maxRoomsPerObject: 20 } });

    // Nessuna stanza creata dal GET; due bagni uguali ammessi.
    expect((await api.listRooms(home.id, { state: 'active' }, {}, undefined, account.id)).items).toEqual([]);
    const b1 = await api.createRoom(home.id, { name: 'Bagno', type: 'bathroom' }, key(), account.id);
    const b2 = await api.createRoom(home.id, { name: 'Bagno', type: 'bathroom' }, key(), account.id);
    expect(b1.id).not.toBe(b2.id);
    const k = key();
    const living = await api.createRoom(home.id, { name: 'Soggiorno', type: 'living' }, k, account.id);
    expect((await api.createRoom(home.id, { name: 'Soggiorno', type: 'living' }, k, account.id)).id).toBe(living.id);
    await expect(api.createRoom(home.id, { name: 'Diverso', type: 'living' }, k, account.id)).rejects.toMatchObject({ status: 409, code: 'idempotency_conflict' });

    // Oggetto senza stanza: versione posizione 0; multiambiente in un solo POST.
    const loose = await api.createObject(home.id, { name: 'Lavatrice', type: 'appliance' }, key(), account.id);
    expect(loose.position).toMatchObject({ version: 0, rooms: [] });
    const multi = await api.createObject(home.id, { name: 'Termosifoni', type: 'heating', roomIds: [b1.id, living.id] }, key(), account.id);
    expect(multi.position.rooms.map((r) => r.id).sort()).toEqual([b1.id, living.id].sort());
    const unplaced = await api.listObjects(home.id, { state: 'active', q: '', type: null, roomId: null, placement: 'unplaced' }, {}, undefined, account.id);
    expect(unplaced.items.map((i) => i.ref.id)).toEqual([loose.ref.id]);

    // CAS0 alla prima impostazione, poi conflitto con versione vecchia.
    const placed = await api.objectMutation(home.id, loose.ref, 'position', { expectedVersion: 0, roomIds: [b2.id] }, key(), account.id);
    expect(placed.position.version).toBe(1);
    await expect(api.objectMutation(home.id, loose.ref, 'position', { expectedVersion: 0, roomIds: [] }, key(), account.id)).rejects.toMatchObject({
      status: 409,
      code: 'placement_version_conflict',
    });

    // Caldaia M3 nel catalogo una volta, stessa ID; niente archivio G1.
    const boiler = await api.createBoiler(home.id, 'Caldaia G1', key(), account.id);
    const boilers = await api.listObjects(home.id, { state: 'active', q: '', type: 'boiler', roomId: null, placement: 'all' }, {}, undefined, account.id);
    expect(boilers.items.filter((i) => i.ref.id === boiler.id)).toHaveLength(1);
    expect(boilers.items[0]).toMatchObject({ ref: { kind: 'boiler', id: boiler.id }, technicalLink: { assetId: boiler.id } });
    await expect(api.objectMutation(home.id, { kind: 'boiler', id: boiler.id }, 'archive', { expectedVersion: 1 }, key(), account.id)).rejects.toMatchObject({ kind: 'http' });
    expect((await api.getAsset(home.id, boiler.id, undefined, account.id)).version).toBe(boiler.version);

    // Due fasi: costo H3a senza caldaia, poi link G1; replay link no-op.
    const exp = await api.createExpense(home.id, { title: 'Pulizia', amountCents: 8000, spentOn: '2026-10-01' }, key(), account.id);
    const lk = key();
    const link = await api.createObjectLink(home.id, multi.ref, { resourceType: 'expense', resourceId: exp.expense.id }, lk, account.id);
    expect(link).toMatchObject({ origin: 'reference', state: 'active', resource: { id: exp.expense.id } });
    expect((await api.createObjectLink(home.id, multi.ref, { resourceType: 'expense', resourceId: exp.expense.id }, lk, account.id)).linkId).toBe(link.linkId);
    await expect(api.createObjectLink(home.id, loose.ref, { resourceType: 'expense', resourceId: exp.expense.id }, key(), account.id)).rejects.toMatchObject({
      status: 409,
      code: 'resource_already_linked',
    });
    const file = new File([samplePdf('g1-doc') as BlobPart], 'manuale.pdf', { type: 'application/pdf' });
    const doc = await api.uploadDocument(home.id, { file, name: 'Manuale', visibility: 'home' }, key(), account.id);
    await api.createObjectLink(home.id, multi.ref, { resourceType: 'document', resourceId: doc.id }, key(), account.id);
    await api.createObjectLink(home.id, loose.ref, { resourceType: 'document', resourceId: doc.id }, key(), account.id); // un documento, più oggetti
    const docs = await api.listObjectLinks(home.id, multi.ref, 'document', {}, undefined, account.id);
    expect(docs.items.map((l) => l.resource?.id)).toEqual([doc.id]);
    const removed = await api.removeObjectLink(home.id, multi.ref, link.linkId!, link.version!, key(), account.id);
    expect(removed.state).toBe('removed');
    // Il costo H3a resta identico.
    expect((await api.getExpense(home.id, exp.expense.id, undefined, account.id)).expense).toMatchObject({ amountCents: 8000, version: 1 });
  });

  it('privacy fra account e 422; paginazione del catalogo', async () => {
    const a = await setup('b');
    for (let i = 0; i < 5; i++) await a.api.createObject(a.home.id, { name: `Voce ${i}`, type: 'other' }, key(), a.account.id);
    const f = { state: 'active' as const, q: 'voce', type: null, roomId: null, placement: 'all' as const };
    const p1 = await a.api.listObjects(a.home.id, f, { limit: 2 }, undefined, a.account.id);
    const p2 = await a.api.listObjects(a.home.id, f, { limit: 3, cursor: p1.nextCursor }, undefined, a.account.id);
    expect(new Set([...p1.items, ...p2.items].map((i) => i.ref.id)).size).toBe(5);
    await expect(a.api.listObjects(a.home.id, { ...f, q: 'altro' }, { limit: 2, cursor: p1.nextCursor }, undefined, a.account.id)).rejects.toMatchObject({ status: 422 });
    const b = await setup('c');
    await expect(b.api.getObjectCapabilities(a.home.id, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getObject(b.home.id, p1.items[0]!.ref, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getRoom(b.home.id, 'non-un-uuid', undefined, b.account.id)).rejects.toMatchObject({ status: 422 });
    // Owner/member/viewer nella stessa casa: inviti non esposti dal frontend, verifica di Codex in DB/HTTP.
  });
});
