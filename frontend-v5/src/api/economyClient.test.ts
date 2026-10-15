import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { createFakeFetch } from '../test/harness';
import { DEFAULT_FILTERS, economyQuery } from '../lib/economy';
import { ApiClient } from './client';

// Client economy-v1 contro il backend SIMULATO (fakeEconomy): forma di richieste e risposte.
async function setup() {
  const backend = new FakeBackend();
  backend.economy.enabled = true;
  const account = backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
  const home = backend.seedHome(account.id, 'Casa', 'Via 1');
  const ctl = createFakeFetch(backend);
  const api = new ApiClient({ fetch: ctl.fetch });
  await api.login({ email: 'a@example.test', password: 'password-lunga-1' });
  await api.getSession();
  return { backend, account, home, ctl, api };
}

describe('[mock] ApiClient — economy-v1', () => {
  it('capabilities autoritative; summary con somme stringa; contesto, CSRF e no-store', async () => {
    const { api, account, home, ctl } = await setup();
    const caps = await api.getEconomyCapabilities(home.id, undefined, account.id);
    expect(caps.features).toEqual({ history: true, works: true, documentDrafts: false });
    const body = { title: 'Gas', amountCents: 8000, spentOn: '2026-09-30', category: 'gas' as const };
    await api.createEconomyExpense(home.id, body, 'chiave-economia-0001', account.id);
    const post = ctl.calls.at(-1)!;
    expect(post.url).toBe(`/api/v5/homes/${home.id}/economy/expenses`);
    const headers = new Headers(post.init.headers);
    expect(headers.get('idempotency-key')).toBe('chiave-economia-0001');
    expect(headers.get('x-csrf-token')).toBeTruthy();
    expect(headers.get('x-account-context')).toBe(account.id);
    const summary = await api.getEconomySummary(home.id, economyQuery({ ...DEFAULT_FILTERS, period: { kind: 'year', year: '2026' } }, { list: false }), undefined, account.id);
    expect(summary.totalCents).toBe('8000');
    expect(summary.byFamily.find((f) => f.family === 'utilities')?.totalCents).toBe('8000');
    expect(summary.byFamily).toHaveLength(7);
    expect(summary.byCategory.at(-1)?.category).toBeNull();
    expect(ctl.calls.at(-1)!.url).toBe(`/api/v5/homes/${home.id}/economy/summary?year=2026`);
    expect(ctl.calls.at(-1)!.init.cache).toBe('no-store');
  });

  it('risposte fuori contratto (somma numerica) → errore di servizio, mai dati', async () => {
    const { api, account, home } = await setup();
    const bad = new ApiClient({
      fetch: async () =>
        new Response(JSON.stringify({ period: { from: '2026-01-01', to: '2026-10-13' }, count: 1, totalCents: 8000, totalWithoutFinancingCents: '8000', byFamily: [], byCategory: [], comparison: { status: 'unavailable' }, today: '2026-10-13' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
    await expect(bad.getEconomySummary(home.id, new URLSearchParams(), undefined, account.id)).rejects.toMatchObject({ kind: 'service' });
    void api;
  });

  it('idempotenza e CAS: stessa chiave un solo costo; versione vecchia 409; cursore di altri filtri 422', async () => {
    const { api, account, home, backend } = await setup();
    const body = { title: 'Idraulico', amountCents: 9000, spentOn: '2026-10-01' };
    const a = await api.createEconomyExpense(home.id, body, 'chiave-economia-0002', account.id);
    const b = await api.createEconomyExpense(home.id, body, 'chiave-economia-0002', account.id);
    expect(b.id).toBe(a.id);
    expect(backend.expenses.items.size).toBe(1);
    await api.economyExpenseMutation(home.id, a.id, 'updates', { expectedVersion: 1, supplier: 'Idraulico Demo' }, 'chiave-economia-0003', account.id);
    await expect(api.economyExpenseMutation(home.id, a.id, 'updates', { expectedVersion: 1, title: 'Altro' }, 'chiave-economia-0004', account.id)).rejects.toMatchObject({
      status: 409,
      code: 'expense_version_conflict',
    });
    for (let i = 0; i < 3; i++) await api.createEconomyExpense(home.id, { ...body, title: `Costo ${i}` }, `chiave-economia-01${i}0`, account.id);
    const page = await api.listEconomyExpenses(home.id, new URLSearchParams('year=2026'), { limit: 2 }, undefined, account.id);
    expect(page.nextCursor).toBeTruthy();
    await expect(api.listEconomyExpenses(home.id, new URLSearchParams('year=2025'), { cursor: page.nextCursor, limit: 2 }, undefined, account.id)).rejects.toMatchObject({ status: 422 });
  });
});
