// INTEGRAZIONE REALE activities-v1 (H1) — contro il backend V5 di Codex, nessun mock nel client.
// Saltata per default e mai eseguita da npm test / build. Da lanciare solo dopo che Codex attiva H1:
//   V5_API_URL=http://127.0.0.1:3001/api/v5 V5_ACTIVITIES_API=1 npm run test:integration
// Crea account/case/attività sintetiche a ogni esecuzione: solo database di sviluppo V5. Nessuna AI.
// Nessun return anticipato: un setup fallito fa fallire il test.
import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../../src/api/client';

const BASE = process.env.V5_API_URL;
const ENABLED = !!BASE && process.env.V5_ACTIVITIES_API === '1';
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

async function setup(label: string) {
  const api = clientWithJar();
  await api.getSession();
  const { account } = await api.register({ name: `Prova H1 ${label}`, email: `h1-${label}-${unique()}@example.test`, password: 'password-prova-h1-123' });
  await api.getSession();
  const home = await api.createHome({ name: 'Casa H1', address: 'Via Prova 1' }, crypto.randomUUID(), account.id);
  return { api, account, home };
}

describe.skipIf(!ENABLED)('[integrazione reale] activities-v1', () => {
  it('capabilities e riepilogo vuoto con contesto temporale del server', async () => {
    const { api, account, home } = await setup('a');
    const caps = await api.getActivityCapabilities(home.id, undefined, account.id);
    expect(caps).toMatchObject({ apiVersion: 'activities-v1', timeZone: 'Europe/Rome', isSimulation: false });
    expect(caps.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const summary = await api.getActivitySummary(home.id, undefined, account.id);
    expect(summary.counts).toEqual({ overdue: 0, today: 0, upcoming: 0, undated: 0 });
    expect(summary.nextItems).toEqual([]);
  });

  it('crea con replay idempotente, modifica, completa, riapri; storia e versioni coerenti', async () => {
    const { api, account, home } = await setup('b');
    const key = crypto.randomUUID();
    const created = await api.createActivity(home.id, { title: 'Promemoria reale' }, key, account.id);
    const replay = await api.createActivity(home.id, { title: 'Promemoria reale' }, key, account.id);
    expect(replay.activity.id).toBe(created.activity.id);
    await expect(api.createActivity(home.id, { title: 'Altro' }, key, account.id)).rejects.toMatchObject({ status: 409, code: 'idempotency_conflict' });
    const a = created.activity;
    expect(a).toMatchObject({ state: 'open', dueState: 'undated', version: 1, origin: 'user_created', assetLink: { state: 'none', asset: null } });
    const updated = await api.activityMutation(home.id, a.id, 'updates', { expectedVersion: 1, dueDate: created.today }, crypto.randomUUID(), account.id);
    expect(updated.activity).toMatchObject({ version: 2, dueState: 'today', dueDate: created.today });
    await expect(
      api.activityMutation(home.id, a.id, 'complete', { expectedVersion: 1 }, crypto.randomUUID(), account.id),
    ).rejects.toMatchObject({ status: 409, code: 'activity_version_conflict' });
    const done = await api.activityMutation(home.id, a.id, 'complete', { expectedVersion: 2, note: 'Fatto' }, crypto.randomUUID(), account.id);
    expect(done.activity).toMatchObject({ state: 'completed', dueState: 'closed', version: 3 });
    const reopened = await api.activityMutation(home.id, a.id, 'reopen', { expectedVersion: 3 }, crypto.randomUUID(), account.id);
    expect(reopened.activity).toMatchObject({ state: 'open', completedAt: null, dueDate: created.today });
    const history = await api.listActivityHistory(home.id, a.id, {}, undefined, account.id);
    expect(history.items.map((e) => e.kind)).toEqual(['reopened', 'completed', 'updated', 'created']);
  });

  it('date: 2028-02-29 valida, 2026-02-29 rifiutata; privacy tra account e 422 su id non valido', async () => {
    const a = await setup('c');
    const ok = await a.api.createActivity(a.home.id, { title: 'Bisestile', dueDate: '2028-02-29' }, crypto.randomUUID(), a.account.id);
    expect(ok.activity.dueDate).toBe('2028-02-29');
    await expect(
      a.api.createActivity(a.home.id, { title: 'Invalida', dueDate: '2026-02-29' }, crypto.randomUUID(), a.account.id),
    ).rejects.toMatchObject({ status: 422 });
    const b = await setup('d');
    await expect(b.api.getActivity(a.home.id, ok.activity.id, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getActivity(b.home.id, ok.activity.id, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getActivity(b.home.id, 'non-un-uuid', undefined, b.account.id)).rejects.toMatchObject({ status: 422 });
  });
});
