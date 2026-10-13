import { describe, expect, it } from 'vitest';
import { FakeBackend, samplePdf } from '../test/fakeBackend';
import { createFakeFetch } from '../test/harness';
import { blobBytes } from '../test/browserStubs';
import { exportProblem, MiB } from '../lib/files';
import type { DocumentSummary } from './types';
import { ApiClient, filenameFromDisposition, safeFilename, type FetchLike } from './client';
import { ApiError } from './errors';

const PASSWORD = 'password-lunga-1';

async function ownerWithHome() {
  const backend = new FakeBackend();
  const account = backend.seedAccount('A', 'a@example.test', PASSWORD);
  const home = backend.seedHome(account.id, 'Casa', 'Via 1');
  const ctl = createFakeFetch(backend);
  const api = new ApiClient({ fetch: ctl.fetch });
  await api.login({ email: 'a@example.test', password: PASSWORD });
  await api.getSession();
  return { backend, account, home, ctl, api };
}

const pdf = (name = 'rogito.pdf') => new File([samplePdf(name) as BlobPart], name, { type: 'application/pdf' });

describe('[mock] ApiClient — documents-v1', () => {
  it('upload multipart: FormData con file/name/visibility, nessun Content-Type impostato dal client', async () => {
    const { api, account, home, ctl, backend } = await ownerWithHome();
    const doc = await api.uploadDocument(home.id, { file: pdf(), name: 'Rogito', visibility: 'private' }, 'chiave-upload-0001', account.id);
    const call = ctl.calls.at(-1)!;
    expect(call.url).toBe(`/api/v5/homes/${home.id}/documents`);
    expect(call.init.method).toBe('POST');
    expect(call.init.body).toBeInstanceOf(FormData);
    const headers = new Headers(call.init.headers);
    expect(headers.has('content-type')).toBe(false);
    expect(headers.get('x-csrf-token')).toBeTruthy();
    expect(headers.get('x-account-context')).toBe(account.id);
    expect(headers.get('idempotency-key')).toBe('chiave-upload-0001');
    const form = call.init.body as FormData;
    expect(form.get('name')).toBe('Rogito');
    expect(form.get('visibility')).toBe('private');
    expect((form.get('file') as File).name).toBe('rogito.pdf');
    expect(doc).toMatchObject({ name: 'Rogito', version: 1, source: 'manual_upload', status: 'stored', visibility: 'private' });
    expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(backend.documents.size).toBe(1);
  });

  it('lista con limit e cursor, contesto account su ogni richiesta', async () => {
    const { api, account, home, ctl, backend } = await ownerWithHome();
    for (let i = 0; i < 3; i++) await backend.seedDocument({ homeId: home.id, uploaderId: account.id, name: `Doc ${i}` });
    const first = await api.listDocuments(home.id, { limit: 2 }, undefined, account.id);
    expect(first.items.map((d) => d.name)).toEqual(['Doc 2', 'Doc 1']);
    expect(first.nextCursor).toBeTruthy();
    const second = await api.listDocuments(home.id, { limit: 2, cursor: first.nextCursor }, undefined, account.id);
    expect(second.items.map((d) => d.name)).toEqual(['Doc 0']);
    expect(second.nextCursor).toBeNull();
    expect(ctl.calls.at(-1)!.url).toBe(`/api/v5/homes/${home.id}/documents?limit=2&cursor=${first.nextCursor}`);
    expect(new Headers(ctl.calls.at(-1)!.init.headers).get('x-account-context')).toBe(account.id);
  });

  it('download: Blob con i byte originali e nome sicuro da Content-Disposition', async () => {
    const { api, account, home, backend } = await ownerWithHome();
    const bytes = samplePdf('originale');
    const doc = await backend.seedDocument({ homeId: home.id, uploaderId: account.id, name: 'Rogito', bytes, originalFilename: 'rogito finale.pdf' });
    const file = await api.downloadDocumentFile(home.id, doc.id, undefined, account.id);
    expect(file.contentType).toBe('application/pdf');
    expect(file.filename).toBe('rogito finale.pdf');
    expect([...(await blobBytes(file.blob))]).toEqual([...bytes]);
  });

  it('endpoint binario: errore JSON gestito prima del Blob (403 senza dati)', async () => {
    const { api, account, home } = await ownerWithHome();
    const missing = globalThis.crypto.randomUUID();
    const error = await api.downloadDocumentFile(home.id, missing, undefined, account.id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'http', status: 403 });
  });

  it('endpoint binario che risponde JSON 200 è fuori contratto, non un file', async () => {
    const fetch: FetchLike = async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const api = new ApiClient({ fetch });
    await expect(api.downloadDocumentFile('h', 'd', undefined, 'acc')).rejects.toMatchObject({ kind: 'service' });
  });

  it('export ZIP: POST JSON con CSRF e contesto; risposta Blob application/zip', async () => {
    const { api, account, home, ctl, backend } = await ownerWithHome();
    const d1 = await backend.seedDocument({ homeId: home.id, uploaderId: account.id, name: 'Uno' });
    const d2 = await backend.seedDocument({ homeId: home.id, uploaderId: account.id, name: 'Due' });
    const zip = await api.exportDocuments(home.id, [d1.id, d2.id], account.id);
    const call = ctl.calls.at(-1)!;
    expect(JSON.parse(call.init.body as string)).toEqual({ documentIds: [d1.id, d2.id] });
    const headers = new Headers(call.init.headers);
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('x-csrf-token')).toBeTruthy();
    expect(headers.get('x-account-context')).toBe(account.id);
    expect(zip.contentType).toBe('application/zip');
    const bytes = await blobBytes(zip.blob);
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('export con un documento non autorizzato: 403 JSON, nessun Blob parziale', async () => {
    const { api, account, home, backend } = await ownerWithHome();
    const other = backend.seedAccount('M', 'm@example.test', 'password-lunga-2');
    backend.addMember(other.id, home.id, 'member');
    const mine = await backend.seedDocument({ homeId: home.id, uploaderId: account.id, name: 'Mio' });
    const privateOfOther = await backend.seedDocument({ homeId: home.id, uploaderId: other.id, name: 'Privato M', visibility: 'private' });
    await expect(api.exportDocuments(home.id, [mine.id, privateOfOther.id], account.id)).rejects.toMatchObject({ kind: 'http', status: 403 });
  });

  it('storage non disponibile (503 storage_unavailable) è un errore di servizio con il suo codice', async () => {
    const { api, account, home, backend } = await ownerWithHome();
    backend.storageDown = true;
    await expect(api.listDocuments(home.id, {}, undefined, account.id)).rejects.toMatchObject({
      kind: 'service',
      status: 503,
      code: 'storage_unavailable',
    });
  });

  it('idempotenza upload: stessa chiave e payload → stesso documento; payload diverso → 409 idempotency_conflict', async () => {
    const { api, account, home, backend } = await ownerWithHome();
    const key = 'chiave-upload-0002';
    const a = await api.uploadDocument(home.id, { file: pdf(), name: 'Rogito', visibility: 'private' }, key, account.id);
    const b = await api.uploadDocument(home.id, { file: pdf(), name: 'Rogito', visibility: 'private' }, key, account.id);
    expect(b.id).toBe(a.id);
    expect(backend.documents.size).toBe(1);
    await expect(
      api.uploadDocument(home.id, { file: pdf(), name: 'Rogito', visibility: 'home' }, key, account.id),
    ).rejects.toMatchObject({ status: 409, code: 'idempotency_conflict' });
  });
});

describe('nomi file e limiti export (unitari, senza rete)', () => {
  it('Content-Disposition: filename* UTF-8, filename semplice, niente percorsi', () => {
    expect(filenameFromDisposition("attachment; filename*=UTF-8''Rogito%20%C3%A8.pdf")).toBe('Rogito è.pdf');
    expect(filenameFromDisposition('attachment; filename="doc.pdf"')).toBe('doc.pdf');
    expect(filenameFromDisposition('attachment; filename="../../etc/passwd"')).toBe('passwd');
    expect(filenameFromDisposition("attachment; filename*=UTF-8''..%2F..%2Fsegreto.pdf")).toBe('segreto.pdf');
    expect(filenameFromDisposition(null)).toBeNull();
    expect(safeFilename('C:\\Users\\x\\a<b>.pdf')).toBe('a_b_.pdf');
    expect(safeFilename('...')).toBe('documento');
  });

  it('export: 1–50 documenti e al massimo 100 MiB', () => {
    const doc = (byteSize: number, i = 0) => ({ id: `d${i}`, byteSize }) as DocumentSummary;
    expect(exportProblem([])).toMatch(/almeno un documento/);
    expect(exportProblem(Array.from({ length: 51 }, (_, i) => doc(1, i)))).toMatch(/50/);
    expect(exportProblem([doc(60 * MiB, 1), doc(41 * MiB, 2)])).toMatch(/100 MB/);
    expect(exportProblem([doc(50 * MiB, 1), doc(50 * MiB, 2)])).toBeUndefined();
  });
});
