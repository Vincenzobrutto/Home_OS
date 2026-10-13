// INTEGRAZIONE REALE documents-v1 — contro il backend V5 di Codex, nessun mock.
// Saltata finché gli endpoint documentali non esistono. Per eseguirla:
//   V5_API_URL=http://127.0.0.1:3001/api/v5 V5_DOCUMENTS_API=1 npm run test:integration
// Crea account, case e documenti sintetici a ogni esecuzione: solo database/storage di sviluppo V5.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../../src/api/client';
import { samplePdf } from '../../src/test/fakeBackend';

const BASE = process.env.V5_API_URL;
const ENABLED = !!BASE && process.env.V5_DOCUMENTS_API === '1';
const ORIGIN = process.env.V5_ORIGIN ?? 'http://127.0.0.1:5174';
const MiB = 1024 * 1024;

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

async function ownerWithHome(tag: string) {
  const api = clientWithJar();
  await api.getSession();
  const { account } = await api.register({ name: 'Prova Doc', email: `doc-${tag}@example.test`, password: 'password-prova-documenti' });
  await api.getSession();
  const home = await api.createHome({ name: 'Casa documenti', address: 'Via Prova 1' }, crypto.randomUUID(), account.id);
  return { api, account, home };
}

describe.skipIf(!ENABLED)('[integrazione reale] documents-v1', () => {
  it('upload privato, elenco, dettaglio, download byte identici e ZIP; idempotenza', async () => {
    const { api, account, home } = await ownerWithHome(unique());
    const bytes = samplePdf('integrazione');
    const file = new File([bytes as BlobPart], 'rogito prova.pdf', { type: 'application/pdf' });
    const key = crypto.randomUUID();
    const doc = await api.uploadDocument(home.id, { file, name: 'Rogito prova', visibility: 'private' }, key, account.id);
    expect(doc).toMatchObject({ name: 'Rogito prova', visibility: 'private', version: 1, source: 'manual_upload', status: 'stored', mimeType: 'application/pdf', byteSize: bytes.byteLength });
    expect(doc.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));

    const again = await api.uploadDocument(home.id, { file, name: 'Rogito prova', visibility: 'private' }, key, account.id);
    expect(again.id).toBe(doc.id);
    await expect(api.uploadDocument(home.id, { file, name: 'Altro titolo', visibility: 'private' }, key, account.id)).rejects.toMatchObject({ status: 409, code: 'idempotency_conflict' });

    const page = await api.listDocuments(home.id, { limit: 20 }, undefined, account.id);
    expect(page.items.map((d) => d.id)).toEqual([doc.id]);
    expect((await api.getDocument(home.id, doc.id, undefined, account.id)).sha256).toBe(doc.sha256);

    const download = await api.downloadDocumentFile(home.id, doc.id, undefined, account.id);
    expect(Buffer.from(await download.blob.arrayBuffer()).equals(Buffer.from(bytes))).toBe(true);
    expect(download.contentType).toBe('application/pdf');

    const zip = await api.exportDocuments(home.id, [doc.id], account.id);
    expect(zip.contentType).toBe('application/zip');
    expect([...new Uint8Array(await zip.blob.arrayBuffer()).slice(0, 2)]).toEqual([0x50, 0x4b]);
  });

  it('rifiuti: formato falsificato 415, file vuoto 422, oltre 20 MiB 413; nessun documento creato', async () => {
    const { api, account, home } = await ownerWithHome(unique());
    const spoof = new File(['non sono un pdf'], 'finto.pdf', { type: 'application/pdf' });
    await expect(api.uploadDocument(home.id, { file: spoof, name: 'Finto', visibility: 'private' }, crypto.randomUUID(), account.id)).rejects.toMatchObject({ status: 415, code: 'unsupported_file_type' });
    const empty = new File([], 'vuoto.pdf', { type: 'application/pdf' });
    await expect(api.uploadDocument(home.id, { file: empty, name: 'Vuoto', visibility: 'private' }, crypto.randomUUID(), account.id)).rejects.toMatchObject({ status: 422 });
    const big = new File([new Uint8Array(20 * MiB + 1)], 'grande.pdf', { type: 'application/pdf' });
    await expect(api.uploadDocument(home.id, { file: big, name: 'Grande', visibility: 'private' }, crypto.randomUUID(), account.id)).rejects.toMatchObject({ status: 413, code: 'file_too_large' });
    expect((await api.listDocuments(home.id, {}, undefined, account.id)).items).toEqual([]);
  });

  it('account B: casa e documento di A negati (403), id non valido 422', async () => {
    const tag = unique();
    const a = await ownerWithHome(`a-${tag}`);
    const file = new File([samplePdf('privato A') as BlobPart], 'privato.pdf', { type: 'application/pdf' });
    const doc = await a.api.uploadDocument(a.home.id, { file, name: 'Privato A', visibility: 'home' }, crypto.randomUUID(), a.account.id);
    const b = await ownerWithHome(`b-${tag}`);
    await expect(b.api.listDocuments(a.home.id, {}, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getDocument(a.home.id, doc.id, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.downloadDocumentFile(a.home.id, doc.id, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getDocument(b.home.id, doc.id, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getDocument(b.home.id, 'non-un-uuid', undefined, b.account.id)).rejects.toMatchObject({ status: 422 });
    await expect(b.api.exportDocuments(b.home.id, [doc.id], b.account.id)).rejects.toMatchObject({ status: 403 });
  });
});
