import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { createFakeFetch } from '../test/harness';
import { ApiClient, type FetchLike } from './client';
import { ApiError } from './errors';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('[mock] ApiClient — trasporto identity-v1', () => {
  it('contesto catturato dalla UI: cambio cookie in altra scheda non restituisce dati del nuovo account', async () => {
    const backend = new FakeBackend();
    const a = backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
    const b = backend.seedAccount('B', 'b@example.test', 'password-lunga-2');
    backend.seedHome(b.id, 'Casa privata B', 'Via B');
    const ctl = createFakeFetch(backend);
    const api = new ApiClient({ fetch: ctl.fetch });
    await api.login({ email: a.email, password: 'password-lunga-1' });
    await api.getSession();
    await api.login({ email: b.email, password: 'password-lunga-2' });
    await api.getSession();
    await expect(api.listHomes(undefined, a.id)).rejects.toMatchObject({ status: 401, code: 'account_context_changed' });
    await expect(api.createHome({ name: 'Bozza A', address: 'Via A' }, 'idempotent-key-A', a.id)).rejects.toMatchObject({ status: 401 });
    expect((await api.listHomes(undefined, b.id)).map(h => h.name)).toEqual(['Casa privata B']);
  });
  it('usa URL relativi /api/v5, credentials include e nessuna cache HTTP', async () => {
    const backend = new FakeBackend();
    const ctl = createFakeFetch(backend);
    const api = new ApiClient({ fetch: ctl.fetch });
    await api.getSession();
    expect(ctl.calls[0]!.url).toBe('/api/v5/session');
    expect(ctl.calls[0]!.init.credentials).toBe('include');
    expect(ctl.calls[0]!.init.cache).toBe('no-store');
  });

  it('chiede la sessione prima della prima mutazione e invia X-CSRF-Token anche al login', async () => {
    const backend = new FakeBackend();
    backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
    const ctl = createFakeFetch(backend);
    const api = new ApiClient({ fetch: ctl.fetch });
    await api.login({ email: 'a@example.test', password: 'password-lunga-1' });
    expect(backend.log.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /session', 'POST /auth/login']);
    const login = backend.log[1]!;
    expect(login.headers['x-csrf-token']).toBeTruthy();
  });

  it('dopo il login il vecchio CSRF non vale: serve una nuova GET /session', async () => {
    const backend = new FakeBackend();
    const acc = backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
    backend.seedHome(acc.id, 'Casa', 'Via 1');
    const ctl = createFakeFetch(backend);
    const api = new ApiClient({ fetch: ctl.fetch });
    await api.login({ email: 'a@example.test', password: 'password-lunga-1' });
    const stale = api.currentCsrfToken;
    await expect(api.createHome({ name: 'X', address: 'Y' }, 'k1')).rejects.toMatchObject({
      status: 403,
      code: 'csrf_invalid',
    });
    await api.getSession();
    expect(api.currentCsrfToken).not.toBe(stale);
    await expect(api.createHome({ name: 'X', address: 'Y' }, 'k1')).resolves.toMatchObject({ name: 'X' });
  });

  it('invia Idempotency-Key nella creazione casa', async () => {
    const backend = new FakeBackend();
    backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
    const ctl = createFakeFetch(backend);
    const api = new ApiClient({ fetch: ctl.fetch });
    await api.login({ email: 'a@example.test', password: 'password-lunga-1' });
    await api.getSession();
    await api.createHome({ name: 'Casa', address: 'Via 1' }, 'chiave-123');
    expect(backend.log.at(-1)!.headers['idempotency-key']).toBe('chiave-123');
  });

  it('traduce la busta di errore del contratto in ApiError con fieldErrors e requestId', async () => {
    const fetch: FetchLike = async () =>
      json(422, { error: { code: 'validation_failed', message: 'Campi non validi', fieldErrors: { name: 'Troppo lungo' }, requestId: 'r-1' } });
    const api = new ApiClient({ fetch });
    const error = await api.listHomes().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'http', status: 422, code: 'validation_failed', requestId: 'r-1' });
    expect((error as ApiError).fieldErrors).toEqual({ name: 'Troppo lungo' });
  });

  it('connessione rifiutata = errore di servizio, mai dati vuoti', async () => {
    const fetch: FetchLike = async () => {
      throw new TypeError('Failed to fetch');
    };
    const api = new ApiClient({ fetch });
    await expect(api.listHomes()).rejects.toMatchObject({ kind: 'service' });
  });

  it('risposta non-JSON (es. proxy Vite con backend spento) = errore di servizio', async () => {
    const fetch: FetchLike = async () => new Response('Proxy error', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    const api = new ApiClient({ fetch });
    await expect(api.getSession()).rejects.toMatchObject({ kind: 'service', status: 500 });
  });

  it('2xx non-JSON o senza la forma attesa non è mai un successo', async () => {
    const html: FetchLike = async () => new Response('<html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    await expect(new ApiClient({ fetch: html }).listHomes()).rejects.toMatchObject({ kind: 'service' });
    const wrong: FetchLike = async () => json(200, { homes: [] });
    await expect(new ApiClient({ fetch: wrong }).listHomes()).rejects.toMatchObject({ kind: 'service' });
  });

  it('503 con busta di errore resta un errore di servizio', async () => {
    const fetch: FetchLike = async () => json(503, { error: { code: 'unavailable', message: 'x', requestId: 'r-9' } });
    await expect(new ApiClient({ fetch }).listHomes()).rejects.toMatchObject({ kind: 'service', status: 503, requestId: 'r-9' });
  });

  it('logout invia CSRF senza body e dimentica il token', async () => {
    const backend = new FakeBackend();
    backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
    const ctl = createFakeFetch(backend);
    const api = new ApiClient({ fetch: ctl.fetch });
    await api.login({ email: 'a@example.test', password: 'password-lunga-1' });
    await api.getSession();
    await api.logout();
    const req = backend.log.at(-1)!;
    expect(req.path).toBe('/auth/logout');
    expect(req.body).toBeUndefined();
    expect(req.headers['x-csrf-token']).toBeTruthy();
    expect(api.currentCsrfToken).toBeNull();
  });

  it('non salva nulla in localStorage o sessionStorage', async () => {
    const backend = new FakeBackend();
    backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
    const ctl = createFakeFetch(backend);
    const api = new ApiClient({ fetch: ctl.fetch });
    await api.login({ email: 'a@example.test', password: 'password-lunga-1' });
    await api.getSession();
    await api.listHomes();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
