import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { createFakeFetch } from '../test/harness';
import { ApiClient } from './client';

// Client expenses-v1 contro il backend SIMULATO: forma delle richieste sul trasporto comune.
async function setup() {
  const backend = new FakeBackend();
  const account = backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
  const home = backend.seedHome(account.id, 'Casa', 'Via 1');
  const ctl = createFakeFetch(backend);
  const api = new ApiClient({ fetch: ctl.fetch });
  await api.login({ email: 'a@example.test', password: 'password-lunga-1' });
  await api.getSession();
  return { backend, account, home, ctl, api };
}

describe('[mock] ApiClient — expenses-v1', () => {
  it('lista: default senza parametri, filtri solo se diversi dal default; contesto e no-store', async () => {
    const { api, account, home, ctl } = await setup();
    await api.listExpenses(home.id, { state: 'active', year: null, source: 'all' }, {}, undefined, account.id);
    expect(ctl.calls.at(-1)!.url).toBe(`/api/v5/homes/${home.id}/expenses`);
    await api.listExpenses(home.id, { state: 'all', year: '2025', source: 'document' }, { limit: 5 }, undefined, account.id);
    const call = ctl.calls.at(-1)!;
    expect(call.url).toBe(`/api/v5/homes/${home.id}/expenses?state=all&year=2025&source=document&limit=5`);
    expect(new Headers(call.init.headers).get('x-account-context')).toBe(account.id);
    expect(call.init.cache).toBe('no-store');
  });

  it('idempotenza: stessa chiave/body un solo record; body diverso 409; cursor di altri filtri 422', async () => {
    const { api, account, home, backend } = await setup();
    const body = { title: 'Idraulico', amountCents: 9000, spentOn: '2026-10-01' };
    const a = await api.createExpense(home.id, body, 'chiave-spesa-000001', account.id);
    const b = await api.createExpense(home.id, body, 'chiave-spesa-000001', account.id);
    expect(b.expense.id).toBe(a.expense.id);
    expect(backend.expenses.items.size).toBe(1);
    await expect(api.createExpense(home.id, { ...body, amountCents: 9001 }, 'chiave-spesa-000001', account.id)).rejects.toMatchObject({
      status: 409,
      code: 'idempotency_conflict',
    });
    for (let i = 0; i < 3; i++) await api.createExpense(home.id, { ...body, title: `Voce ${i}` }, `chiave-spesa-00010${i}`, account.id);
    const p1 = await api.listExpenses(home.id, { state: 'active', year: '2026', source: 'all' }, { limit: 2 }, undefined, account.id);
    expect(p1.nextCursor).toBeTruthy();
    const p2 = await api.listExpenses(home.id, { state: 'active', year: '2026', source: 'all' }, { limit: 3, cursor: p1.nextCursor }, undefined, account.id);
    expect(new Set([...p1.items, ...p2.items].map((e) => e.id)).size).toBe(4);
    await expect(
      api.listExpenses(home.id, { state: 'all', year: '2026', source: 'all' }, { limit: 2, cursor: p1.nextCursor }, undefined, account.id),
    ).rejects.toMatchObject({ status: 422 });
    await expect(api.getExpense(home.id, 'non-un-uuid', undefined, account.id)).rejects.toMatchObject({ status: 422 });
  });

  it('riepilogo: anno esplicito o anno del server; solo active; totali interi', async () => {
    const { api, account, home } = await setup();
    await api.createExpense(home.id, { title: 'A', amountCents: 10, spentOn: '2026-01-01' }, 'chiave-riep-0000001', account.id);
    const b = await api.createExpense(home.id, { title: 'B', amountCents: 20, spentOn: '2026-02-01' }, 'chiave-riep-0000002', account.id);
    await api.createExpense(home.id, { title: 'C', amountCents: 500, spentOn: '2025-12-31' }, 'chiave-riep-0000003', account.id);
    expect((await api.getExpenseSummary(home.id, null, undefined, account.id)).totalCents).toBe(30);
    expect((await api.getExpenseSummary(home.id, '2025', undefined, account.id)).totalCents).toBe(500);
    await api.expenseMutation(home.id, b.expense.id, 'archive', { expectedVersion: 1 }, 'chiave-riep-0000004', account.id);
    expect((await api.getExpenseSummary(home.id, '2026', undefined, account.id)).totalCents).toBe(10);
  });
});
