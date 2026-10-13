import { describe, expect, it } from 'vitest';
import { ApiClient } from '../api/client';
import { ApiError } from '../api/errors';
import { FakeBackend } from '../test/fakeBackend';
import { createFakeFetch } from '../test/harness';
import { describeFilters, filtersFromParams, filtersToParams, isFiltered, normalizeQuery, validateQuery } from './documentSearch';

describe('regole H2 (unitarie, senza rete)', () => {
  it('query: trim + NFC, limite in code point, caratteri di controllo rifiutati', () => {
    expect(normalizeQuery('  caffé  ')).toBe('caffé');
    expect(validateQuery('🔥'.repeat(120))).toBeUndefined();
    expect(validateQuery('🔥'.repeat(121))).toMatch(/120/);
    expect(validateQuery('a\tb')).toMatch(/non ammessi/);
    expect(validateQuery('a\u007fb')).toMatch(/non ammessi/);
    expect(validateQuery(normalizeQuery('\tRogito'))).toMatch(/non ammessi/);
    expect(validateQuery(filtersFromParams(new URLSearchParams('q=Rogito%0A')).q)).toMatch(/non ammessi/);
    expect(validateQuery("%_\\'()")).toBeUndefined();
  });

  it('indirizzo: solo q/format/visibility, valori sconosciuti = Tutti, cursor e ricerca=1 ignorati', () => {
    const f = filtersFromParams(new URLSearchParams('q=%20Rogito%20&format=gif&visibility=home&cursor=c20&ricerca=1'));
    expect(f).toEqual({ q: 'Rogito', format: 'all', visibility: 'home' });
    expect(filtersToParams(f).toString()).toBe('q=Rogito&visibility=home');
    expect(isFiltered(filtersFromParams(new URLSearchParams('q=%20%20&ricerca=1')))).toBe(false);
    expect(describeFilters({ q: '<b>', format: 'pdf', visibility: 'private' })).toBe('«<b>» · formato PDF · Solo io');
  });
});

describe('[mock] ApiClient — document-search-v1', () => {
  async function setup() {
    const backend = new FakeBackend();
    const account = backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
    const home = backend.seedHome(account.id, 'Casa', 'Via 1');
    for (let i = 1; i <= 5; i++) await backend.seedDocument({ homeId: home.id, uploaderId: account.id, name: `Bolletta ${i}` });
    const ctl = createFakeFetch(backend);
    const api = new ApiClient({ fetch: ctl.fetch });
    await api.login({ email: 'a@example.test', password: 'password-lunga-1' });
    await api.getSession();
    return { backend, account, home, ctl, api };
  }

  it('senza filtri la richiesta resta M2; con filtri solo quelli attivi; contesto account e no-store', async () => {
    const { api, account, home, ctl } = await setup();
    await api.listDocuments(home.id, { limit: 20 }, undefined, account.id);
    expect(ctl.calls.at(-1)!.url).toBe(`/api/v5/homes/${home.id}/documents?limit=20`);
    await api.listDocuments(home.id, { limit: 20 }, undefined, account.id, { q: '', format: 'all', visibility: 'all' });
    expect(ctl.calls.at(-1)!.url).toBe(`/api/v5/homes/${home.id}/documents?limit=20`);
    await api.listDocuments(home.id, { limit: 2 }, undefined, account.id, { q: '50% l\'atto', format: 'pdf', visibility: 'all' });
    const call = ctl.calls.at(-1)!;
    expect(call.url).toBe(`/api/v5/homes/${home.id}/documents?q=50%25+l%27atto&format=pdf&limit=2`);
    expect(new Headers(call.init.headers).get('x-account-context')).toBe(account.id);
    expect(call.init.cache).toBe('no-store');
  });

  it('capabilities: risposta validata; 404 resta un ApiError (ricerca non attiva)', async () => {
    const { api, account, home, backend } = await setup();
    await expect(api.getDocumentSearchCapabilities(home.id, undefined, account.id)).resolves.toMatchObject({
      apiVersion: 'document-search-v1',
      limits: { queryMaxCodePoints: 120, maxPageSize: 50 },
    });
    backend.documentSearchEnabled = false;
    await expect(api.getDocumentSearchCapabilities(home.id, undefined, account.id)).rejects.toMatchObject({ status: 404 });
  });

  it('simulatore fedele al contratto: cursor legati ai filtri, vecchio cursor M2 solo senza filtri, limit variabile', async () => {
    const { api, account, home } = await setup();
    const f = { q: 'bolletta', format: 'all', visibility: 'all' } as const;
    const first = await api.listDocuments(home.id, { limit: 2 }, undefined, account.id, f);
    expect(first.nextCursor).toMatch(/^s\./);
    expect(first.nextCursor).not.toContain('bolletta');
    const second = await api.listDocuments(home.id, { limit: 3, cursor: first.nextCursor }, undefined, account.id, f);
    expect([...first.items, ...second.items].map((d) => d.name)).toHaveLength(5);
    await expect(
      api.listDocuments(home.id, { limit: 2, cursor: first.nextCursor }, undefined, account.id, { ...f, format: 'pdf' }),
    ).rejects.toMatchObject({ status: 422 });
    const m2 = await api.listDocuments(home.id, { limit: 2 }, undefined, account.id);
    await expect(api.listDocuments(home.id, { limit: 2, cursor: m2.nextCursor }, undefined, account.id, f)).rejects.toBeInstanceOf(ApiError);
    await expect(api.listDocuments(home.id, { limit: 2, cursor: m2.nextCursor }, undefined, account.id)).resolves.toBeTruthy();
  });
});
