// INTEGRAZIONE REALE — contro il backend V5 di Codex, nessun mock.
// Saltata se V5_API_URL non è impostata, es.:
//   V5_API_URL=http://127.0.0.1:3001/api/v5 npm run test:integration
// Usa lo stesso ApiClient dell'app con un cookie jar minimo (Node non ha cookie automatici)
// e Origin del frontend (http://127.0.0.1:5174) per i controlli Origin/CSRF del server.
// Crea account e case nuove a ogni esecuzione: usare solo il database di sviluppo V5.
import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../../src/api/client';

const BASE = process.env.V5_API_URL;
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
      const expired = attrs.some((a) => /max-age=0/i.test(a)) || value === '';
      if (expired) jar.delete(name);
      else jar.set(name, value);
    }
    return res;
  };
  return new ApiClient({ fetch: fetchWithJar, base: BASE });
}

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

describe.skipIf(!BASE)('[integrazione reale] identity-v1', () => {
  it('scenario 1: anonimo → sessione senza account, GET /homes 401, login errato 401', async () => {
    const api = clientWithJar();
    const session = await api.getSession();
    expect(session.account).toBeNull();
    expect(typeof session.csrfToken).toBe('string');
    await expect(api.listHomes()).rejects.toMatchObject({ kind: 'http', status: 401 });
    await expect(api.login({ email: `nessuno-${unique()}@example.test`, password: 'password-sbagliata' })).rejects.toMatchObject({ status: 401 });
  });

  it('scenari 2–4: due case, 403 tra account, idempotenza e conflitto', async () => {
    const a = clientWithJar();
    const tag = unique();
    await a.getSession();
    await a.register({ name: 'Prova A', email: `a-${tag}@example.test`, password: 'password-di-prova-A' });
    await a.getSession();
    const key = crypto.randomUUID();
    const h1 = await a.createHome({ name: 'Casa 1', address: 'Via 1' }, key);
    const again = await a.createHome({ name: 'Casa 1', address: 'Via 1' }, key);
    expect(again.id).toBe(h1.id);
    await expect(a.createHome({ name: 'Altra', address: 'Via 1' }, key)).rejects.toMatchObject({ status: 409 });
    const h2 = await a.createHome({ name: 'Casa 2', address: 'Via 2' }, crypto.randomUUID());
    const ids = (await a.listHomes()).map((h) => h.id);
    expect(ids).toEqual(expect.arrayContaining([h1.id, h2.id]));
    expect((await a.getHome(h2.id)).name).toBe('Casa 2');

    const b = clientWithJar();
    await b.getSession();
    await b.register({ name: 'Prova B', email: `b-${tag}@example.test`, password: 'password-di-prova-B' });
    await b.getSession();
    await expect(b.getHome(h1.id)).rejects.toMatchObject({ kind: 'http', status: 403 });
    expect((await b.listHomes()).map((h) => h.id)).not.toContain(h1.id);

    await a.logout();
    await a.getSession();
    await expect(a.listHomes()).rejects.toMatchObject({ status: 401 });
  });
  it('contesto della scheda A non riceve dati dopo il cambio del cookie all’account B', async () => {
    const api = clientWithJar();
    const tag = unique();
    await api.getSession();
    const a = await api.register({ name: 'Scheda A', email: `scheda-a-${tag}@example.test`, password: 'password-prova-scheda-A' });
    await api.getSession();
    await api.createHome({ name: 'Casa scheda A', address: 'Via A' }, crypto.randomUUID(), a.account.id);
    const b = await api.register({ name: 'Scheda B', email: `scheda-b-${tag}@example.test`, password: 'password-prova-scheda-B' });
    await api.getSession();
    await expect(api.listHomes(undefined, a.account.id)).rejects.toMatchObject({ status: 401, code: 'account_context_changed' });
    await expect(api.createHome({ name: 'Bozza scheda A', address: 'Via A' }, crypto.randomUUID(), a.account.id)).rejects.toMatchObject({ status: 401 });
    expect(await api.listHomes(undefined, b.account.id)).toEqual([]);
  });
});
