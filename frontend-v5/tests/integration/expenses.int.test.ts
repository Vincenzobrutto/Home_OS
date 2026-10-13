// INTEGRAZIONE REALE expenses-v1 (H3a) — contro il backend V5 di Codex, nessun mock nel client.
// Saltata per default e mai eseguita da npm test / build. Da lanciare solo dopo che Codex attiva H3a:
//   V5_API_URL=http://127.0.0.1:3001/api/v5 V5_EXPENSES_API=1 npm run test:integration
// Crea account/case/documenti/spese sintetici a ogni esecuzione: solo database/storage di sviluppo V5.
// Nessuna AI. Nessun return anticipato: un setup fallito fa fallire il test. Tre registrazioni in tutto.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../../src/api/client';
import { samplePdf } from '../../src/test/fakeBackend';

const BASE = process.env.V5_API_URL;
const ENABLED = !!BASE && process.env.V5_EXPENSES_API === '1';
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
  const { account } = await api.register({ name: `Prova H3 ${label}`, email: `h3-${label}-${unique()}@example.test`, password: 'password-prova-h3-123' });
  await api.getSession();
  const home = await api.createHome({ name: `Casa H3 ${label}`, address: 'Via Prova 3' }, key(), account.id);
  return { api, account, home };
}

/** Giorno successivo a una data di calendario, calcolato in UTC senza spostamenti. */
function nextDay(date: string) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const t = new Date(0);
  t.setUTCFullYear(y, m - 1, d + 1);
  return `${String(t.getUTCFullYear()).padStart(4, '0')}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

describe.skipIf(!ENABLED)('[integrazione reale] expenses-v1', () => {
  it('capabilities, validazioni, idempotenza, collegamenti, CAS, archivio/ripristino, storia e riepilogo esatto', async () => {
    const { api, account, home } = await setup('a');
    const caps = await api.getExpenseCapabilities(home.id, undefined, account.id);
    expect(caps).toMatchObject({
      apiVersion: 'expenses-v1',
      enabled: true,
      isSimulation: false,
      currency: 'EUR',
      timeZone: 'Europe/Rome',
      limits: { amountMaxCents: 999999999, titleMaxCodePoints: 120, noteMaxCodePoints: 500 },
    });
    const today = caps.today;
    const year = today.slice(0, 4);
    const empty = await api.getExpenseSummary(home.id, null, undefined, account.id);
    expect(empty).toMatchObject({ year, totalCents: 0, totalsCents: { manual: 0, document: 0 }, lastItems: [] });

    // Validazioni server autorevoli.
    for (const bad of [
      { title: 'Zero', amountCents: 0, spentOn: today },
      { title: 'Oltre', amountCents: 1_000_000_000, spentOn: today },
      { title: 'Frazione', amountCents: 10.5, spentOn: today },
      { title: 'Futura', amountCents: 100, spentOn: nextDay(today) },
      { title: 'Inesistente', amountCents: 100, spentOn: '2026-02-29' },
      { title: 'Valuta', amountCents: 100, spentOn: today, currency: 'USD' },
    ]) {
      await expect(api.createExpense(home.id, bad as never, key(), account.id), bad.title).rejects.toMatchObject({ status: 422 });
    }

    // 0,10 + 0,20 in centesimi interi; replay e conflitto di idempotenza.
    const k = key();
    const ten = await api.createExpense(home.id, { title: 'Dieci centesimi', amountCents: 10, spentOn: today }, k, account.id);
    const replay = await api.createExpense(home.id, { title: 'Dieci centesimi', amountCents: 10, spentOn: today }, k, account.id);
    expect(replay.expense.id).toBe(ten.expense.id);
    await expect(api.createExpense(home.id, { title: 'Altro', amountCents: 10, spentOn: today }, k, account.id)).rejects.toMatchObject({
      status: 409,
      code: 'idempotency_conflict',
    });
    expect(ten.expense).toMatchObject({ origin: 'manual', state: 'active', version: 1, currency: 'EUR', documentLink: { state: 'none' } });

    // Spesa collegata a documento e caldaia: un solo record, originale invariato.
    const bytes = samplePdf('fattura-h3');
    const file = new File([bytes as BlobPart], 'fattura.pdf', { type: 'application/pdf' });
    const doc = await api.uploadDocument(home.id, { file, name: 'Fattura H3', visibility: 'private' }, key(), account.id);
    const boiler = await api.createBoiler(home.id, 'Caldaia H3', key(), account.id);
    const linked = await api.createExpense(
      home.id,
      { title: 'Controllo', amountCents: 20, spentOn: today, documentId: doc.id, assetId: boiler.id, note: 'Annuale' },
      key(),
      account.id,
    );
    expect(linked.expense).toMatchObject({
      origin: 'document',
      documentLink: { state: 'linked', document: { id: doc.id, name: 'Fattura H3' } },
      assetLink: { state: 'linked', asset: { id: boiler.id, name: 'Caldaia H3' } },
    });
    const summary = await api.getExpenseSummary(home.id, year, undefined, account.id);
    expect(summary).toMatchObject({ totalCents: 30, totalsCents: { manual: 10, document: 20 }, counts: { manual: 1, document: 1 } });
    const byAsset = await api.listExpenses(home.id, { state: 'active', year: null, source: 'all', assetId: boiler.id }, {}, undefined, account.id);
    expect(byAsset.items.map((e) => e.id)).toEqual([linked.expense.id]);
    const file2 = await api.downloadDocumentFile(home.id, doc.id, undefined, account.id);
    expect(createHash('sha256').update(new Uint8Array(await file2.blob.arrayBuffer())).digest('hex')).toBe(doc.sha256);

    // Update CAS: no-op senza storia, versione vecchia 409, solo campi cambiati.
    const id = linked.expense.id;
    const noop = await api.expenseMutation(home.id, id, 'updates', { expectedVersion: 1, title: 'Controllo' }, key(), account.id);
    expect(noop.expense.version).toBe(1);
    const upd = await api.expenseMutation(home.id, id, 'updates', { expectedVersion: 1, amountCents: 25, note: null }, key(), account.id);
    expect(upd.expense).toMatchObject({ version: 2, amountCents: 25, note: null });
    await expect(api.expenseMutation(home.id, id, 'updates', { expectedVersion: 1, title: 'Vecchia' }, key(), account.id)).rejects.toMatchObject({
      status: 409,
      code: 'expense_version_conflict',
    });

    // Archive/restore con storia e totali.
    await api.expenseMutation(home.id, id, 'archive', { expectedVersion: 2, note: 'Prova' }, key(), account.id);
    await expect(api.expenseMutation(home.id, id, 'archive', { expectedVersion: 3 }, key(), account.id)).rejects.toMatchObject({
      status: 409,
      code: 'expense_state_conflict',
    });
    expect((await api.getExpenseSummary(home.id, year, undefined, account.id)).totalCents).toBe(10);
    await api.expenseMutation(home.id, id, 'restore', { expectedVersion: 3 }, key(), account.id);
    expect((await api.getExpenseSummary(home.id, year, undefined, account.id)).totalCents).toBe(35);
    const history = await api.listExpenseHistory(home.id, id, {}, undefined, account.id);
    expect(history.items.map((e) => e.kind)).toEqual(['restored', 'archived', 'updated', 'created']);
    expect(history.items[1]!.note).toBe('Prova');
  });

  it('paginazione con cursor legato ai filtri; privacy fra account; 422 su ID non valido', async () => {
    const a = await setup('b');
    const caps = await a.api.getExpenseCapabilities(a.home.id, undefined, a.account.id);
    const created: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await a.api.createExpense(a.home.id, { title: `Voce ${i}`, amountCents: 100 + i, spentOn: caps.today }, key(), a.account.id);
      created.push(r.expense.id);
    }
    const f = { state: 'active' as const, year: caps.today.slice(0, 4), source: 'all' as const };
    const p1 = await a.api.listExpenses(a.home.id, f, { limit: 2 }, undefined, a.account.id);
    const p2 = await a.api.listExpenses(a.home.id, f, { limit: 3, cursor: p1.nextCursor }, undefined, a.account.id);
    expect(new Set([...p1.items, ...p2.items].map((e) => e.id))).toEqual(new Set(created));
    await expect(
      a.api.listExpenses(a.home.id, { ...f, source: 'manual' }, { limit: 2, cursor: p1.nextCursor }, undefined, a.account.id),
    ).rejects.toMatchObject({ status: 422 });

    const b = await setup('c');
    await expect(b.api.getExpenseCapabilities(a.home.id, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getExpenseSummary(a.home.id, null, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getExpense(a.home.id, created[0]!, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getExpense(b.home.id, created[0]!, undefined, b.account.id)).rejects.toMatchObject({ status: 403 });
    await expect(b.api.getExpense(b.home.id, 'non-un-uuid', undefined, b.account.id)).rejects.toMatchObject({ status: 422 });
    // Inviti/ruoli non hanno ancora un'API V5 nel frontend: owner/member/viewer nella stessa casa vanno provati da Codex nel DB/HTTP.
  });
});
