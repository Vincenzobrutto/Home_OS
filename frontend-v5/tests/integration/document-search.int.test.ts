// INTEGRAZIONE REALE document-search-v1 (H2) — contro il backend V5 di Codex, nessun mock nel client.
// Saltata per default e mai eseguita da npm test / build. Da lanciare solo dopo che Codex attiva H2:
//   V5_API_URL=http://127.0.0.1:3001/api/v5 V5_DOCUMENT_SEARCH_API=1 npm run test:integration
// Crea account/case/documenti sintetici a ogni esecuzione: solo database/storage di sviluppo V5. Nessuna AI.
// Nessun return anticipato: un setup fallito fa fallire il test. Tre registrazioni in tutto (limite 15/min).
import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../../src/api/client';
import type { DocumentSearchFilters } from '../../src/api/types';
import { samplePdf } from '../../src/test/fakeBackend';

const BASE = process.env.V5_API_URL;
const ENABLED = !!BASE && process.env.V5_DOCUMENT_SEARCH_API === '1';
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
const ALL: DocumentSearchFilters = { q: '', format: 'all', visibility: 'all' };

async function register(label: string) {
  const api = clientWithJar();
  await api.getSession();
  const { account } = await api.register({ name: `Prova H2 ${label}`, email: `h2-${label}-${unique()}@example.test`, password: 'password-prova-h2-123' });
  await api.getSession();
  return { api, account };
}

const pdf = (filename: string) => new File([samplePdf(filename) as BlobPart], filename, { type: 'application/pdf' });
const png = () => new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));

describe.skipIf(!ENABLED)('[integrazione reale] document-search-v1', () => {
  it('capabilities, titolo/filename, letterali, NFC/accenti, formato da MIME, paginazione e cursor legati ai filtri', async () => {
    const { api, account } = await register('a');
    const home = await api.createHome({ name: 'Casa H2', address: 'Via Prova 2' }, crypto.randomUUID(), account.id);
    const caps = await api.getDocumentSearchCapabilities(home.id, undefined, account.id);
    expect(caps).toMatchObject({ apiVersion: 'document-search-v1', enabled: true, isSimulation: false, limits: { queryMaxCodePoints: 120 } });

    const up = (file: File, name: string, visibility: 'private' | 'home' = 'private') =>
      api.uploadDocument(home.id, { file, name, visibility }, crypto.randomUUID(), account.id);
    const rogito = await up(pdf('SCAN_0042.pdf'), 'Rogito notarile');
    const sconto = await up(pdf('sconto.pdf'), 'Sconto 50%');
    await up(pdf('filexa.pdf'), 'fileXa');
    const underscore = await up(pdf('file_a.pdf'), 'file_a');
    const nfd = await up(pdf('verbale.pdf'), 'Verbale caffé');
    const image = await up(new File([png() as BlobPart], 'foto.pdf', { type: 'image/png' }), 'Foto', 'home');
    for (let i = 1; i <= 3; i++) await up(pdf(`bolletta-${i}.pdf`), `Bolletta ${i}`);

    const find = async (f: Partial<DocumentSearchFilters>) =>
      (await api.listDocuments(home.id, { limit: 50 }, undefined, account.id, { ...ALL, ...f })).items.map((d) => d.id);

    expect(await find({ q: 'scan_0042' })).toEqual([rogito.id]);
    expect(await find({ q: 'ROGITO' })).toEqual([rogito.id]);
    expect(await find({ q: '%' })).toEqual([sconto.id]);
    expect(await find({ q: 'file_' })).toEqual([underscore.id]);
    expect(await find({ q: "' OR 1=1 --" })).toEqual([]);
    expect(await find({ q: 'caffé' })).toEqual([nfd.id]);
    expect(await find({ q: 'caffè' })).toEqual([]);
    expect(await find({ format: 'png' })).toEqual([image.id]);
    expect(await find({ format: 'pdf' })).not.toContain(image.id);
    expect(await find({ visibility: 'home' })).toEqual([image.id]);

    await expect(api.listDocuments(home.id, { limit: 20 }, undefined, account.id, { ...ALL, q: 'x'.repeat(121) })).rejects.toMatchObject({ status: 422 });
    await expect(api.listDocuments(home.id, { limit: 20 }, undefined, account.id, { ...ALL, q: 'a\nb' })).rejects.toMatchObject({ status: 422 });

    const f = { ...ALL, q: 'bolletta' };
    const p1 = await api.listDocuments(home.id, { limit: 2 }, undefined, account.id, f);
    expect(p1.items).toHaveLength(2);
    const p2 = await api.listDocuments(home.id, { limit: 5, cursor: p1.nextCursor }, undefined, account.id, f);
    expect(new Set([...p1.items, ...p2.items].map((d) => d.id)).size).toBe(3);
    expect(p2.nextCursor).toBeNull();
    await expect(api.listDocuments(home.id, { limit: 2, cursor: p1.nextCursor }, undefined, account.id, { ...f, format: 'pdf' })).rejects.toMatchObject({ status: 422 });
    const m2 = await api.listDocuments(home.id, { limit: 2 }, undefined, account.id);
    expect(m2.nextCursor).toBeTruthy();
    await expect(api.listDocuments(home.id, { limit: 2, cursor: m2.nextCursor }, undefined, account.id, f)).rejects.toMatchObject({ status: 422 });
    await expect(api.listDocuments(home.id, { limit: 2, cursor: m2.nextCursor }, undefined, account.id)).resolves.toBeTruthy();
  });

  it('privacy: account senza membership 403 su ricerca e capabilities; «Condivisi nella casa» esclude i privati', async () => {
    const owner = await register('b');
    const home = await owner.api.createHome({ name: 'Casa H2 privacy', address: 'Via Prova 3' }, crypto.randomUUID(), owner.account.id);
    await owner.api.uploadDocument(home.id, { file: pdf('mio.pdf'), name: 'Caldaia owner', visibility: 'private' }, crypto.randomUUID(), owner.account.id);
    const shared = await owner.api.uploadDocument(home.id, { file: pdf('cond.pdf'), name: 'Caldaia condivisa', visibility: 'home' }, crypto.randomUUID(), owner.account.id);

    const stranger = await register('c');
    await expect(
      stranger.api.listDocuments(home.id, { limit: 20 }, undefined, stranger.account.id, { ...ALL, q: 'caldaia' }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(stranger.api.getDocumentSearchCapabilities(home.id, undefined, stranger.account.id)).rejects.toMatchObject({ status: 403 });
    // Inviti/ruoli non hanno ancora un'API V5 nel frontend: la ricerca del viewer è verificata da Codex nel DB.
    const own = await owner.api.listDocuments(home.id, { limit: 20 }, undefined, owner.account.id, { ...ALL, q: 'caldaia', visibility: 'home' });
    expect(own.items.map((d) => d.id)).toEqual([shared.id]);
  });
});
