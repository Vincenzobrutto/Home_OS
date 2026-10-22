import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiClient } from '../api/client';
import { FakeBackend } from '../test/fakeBackend';
import { createFakeFetch, renderApp } from '../test/harness';
import { scenarios } from '../receipt-assistance/testing/fixtures';
import { selectedCandidatePage } from './ReceiptPage';

async function world(options: { draft?: boolean; redacted?: boolean; drop?: boolean; loggedOut?: boolean; job?: boolean; resume?: boolean; paid?: boolean; uncertain?: boolean; lostStart?: boolean } = {}) {
  const backend = new FakeBackend(), password = 'password-qa-receipt-2026';
  const account = backend.seedAccount('Collaudo', 'receipt@example.test', password), home = backend.seedHome(account.id, 'Casa ricevuta', 'Via sintetica 1');
  const doc = await backend.seedDocument({ homeId: home.id, uploaderId: account.id, name: 'Ricevuta prova' });
  const control = createFakeFetch(backend), api = new ApiClient({ fetch: control.fetch });
  if (!options.loggedOut) { await api.login({ email: account.email, password }); await api.getSession(); }
  const fixture = scenarios.fresh().draft, { total, ...fields } = fixture.proposals;
  const wire = { id: 'receipt-draft', homeId: home.id, version: 1, mode: 'extraction', state: 'open', fields, total, review: null as null | Record<string, unknown>, confirmation: null as null | Record<string, unknown>, permissions: ['read', 'edit'], documentLink: options.redacted ? { state: 'unavailable', document: null } : { state: 'linked', document: { id: doc.id, name: doc.name } } };
  if (options.redacted) { wire.fields = {}; wire.total = undefined; }
  let confirmations = 0, recoveries = 0, starts = 0, jobReads = 0;
  let hasDraft = !!options.draft || !!options.resume || !!options.job;
  const calls: Array<{ path: string; init: RequestInit }> = [];
  const analysis = options.paid ? { provider: 'anthropic', isSimulation: false, model: 'claude-sonnet-5-5', billing: { currency: 'USD', maxReservedUsd: '0.250000', actualUsd: options.uncertain ? null : '0.005400', state: options.uncertain ? 'uncertain' : 'settled' } } : { provider: 'receipt_fixture_v1', isSimulation: true };
  const comparisons = [{ id: 'comparison1', version: 1, state: 'open', object: { id: 'object1', version: 1, name: 'Macchina del caffè Studio' }, fieldKey: 'brand', existing: 'Aurora', proposed: { value: 'Lume', sources: [{ page: 1, excerpt: 'Lume' }] }, permissions: ['read', 'edit'], draftId: wire.id, documentLink: wire.documentLink }];
  const fetch = async (url: string, init: RequestInit) => {
    if (!url.includes('/receipt-assistance')) return control.fetch(url, init);
    const path = url.split('/receipt-assistance')[1]!; calls.push({ path, init });
    if (path.startsWith('/capabilities')) return Response.json({ apiVersion: 'receipt-assistance-v1', enabled: true, manualEnabled: true, today: '2026-10-16', resume: { draftId: hasDraft && ['open', 'parked'].includes(wire.state) ? wire.id : null, jobId: null }, providers: [{ id: analysis.provider, label: options.paid ? 'Anthropic' : 'Simulazione locale', requiresConsent: !!options.paid, consentText: options.paid ? 'Il testo sarà inviato ad Anthropic.' : 'Solo dati sintetici. Nessun invio esterno.', costNote: null }] });
    if (path.endsWith('/confirmations')) { confirmations++; wire.confirmation = { newObjects: 1, newExpenses: 1, object: { id: 'new-object', name: 'Macchina del caffè' }, expense: { id: 'new-cost', title: 'Acquisto', amountCents: 17990 }, openComparisons: 0 }; wire.state = 'confirmed'; if (options.drop) throw new TypeError('response lost'); }
    if (path.endsWith('/confirmation')) { recoveries++; return Response.json({ status: wire.confirmation ? 'confirmed' : 'not_found', draft: wire }); }
    if (path.startsWith('/jobs/')) { jobReads++; return Response.json({ job: { id: 'job1', version: 2, ...analysis, state: options.uncertain ? 'uncertain' : 'succeeded', draftId: options.uncertain ? null : wire.id, errorCode: options.uncertain ? 'analysis_outcome_unknown' : null, documentLink: wire.documentLink } }); }
    if (path === '/jobs') { starts++; if (options.lostStart && starts === 1) throw new TypeError('Lost start response'); return Response.json({ job: { id: 'job1', version: 1, ...analysis, state: 'queued', draftId: null, errorCode: null, documentLink: wire.documentLink } }, { status: 202 }); }
    if (path.includes('candidates')) return Response.json({ items: [], linkedCount: 0, nextCursor: null });
    if (path === '/comparisons/comparison1/resolutions') { comparisons[0]!.state = 'resolved'; comparisons[0]!.version++; return Response.json({ comparison: comparisons[0] }); }
    if (path.startsWith('/comparisons')) return Response.json({ items: comparisons.filter(item => item.state === 'open' && !path.includes('draftId=')), nextCursor: null });
    if (path.endsWith('/park')) {
      wire.state = 'parked'; wire.version++;
      wire.review = { form: { values: { name: 'Acquisto rivisto', brand: 'Lume', model: 'Mini 90', title: 'Acquisto macchina del caffè', supplier: 'Emporio Casa Demo', date: '2026-09-15', amount: '210,00' }, object: { kind: 'create' }, expense: { kind: 'create' }, enrich: false, decisions: {} }, staleTargets: [], targetVersions: { object: null, expense: null } };
    }
    if (path.endsWith('/reopen')) { wire.state = 'open'; wire.version++; }
    if (path === '/manual-drafts') { hasDraft = true; wire.mode = 'manual'; wire.fields = {}; wire.total = undefined; }
    if (path.startsWith('/drafts/') || path === '/manual-drafts') return Response.json({ draft: { ...wire, total: wire.total ?? null, analysis: options.paid && wire.mode === 'extraction' ? analysis : null } });
    return Response.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 });
  };
  const path = `/home/${home.id}/documenti/${doc.id}/ricevuta${options.draft ? '?bozza=receipt-draft' : options.job ? '?analisi=job1' : ''}`;
  const app = renderApp({ backend, fetch, path });
  return { ...app, control, wire, doc, home, account, calls, counts: () => ({ confirmations, recoveries, starts, jobReads }) };
}

describe('[mock] receipt route integration', () => {
  it('paid uncertainty blocks a new POST, shows reserved cost and keeps manual available', async () => {
    const w = await world({ job: true, paid: true, uncertain: true });
    await screen.findByText(/Costo non ancora verificabile/);
    await w.user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Avvia l’analisi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Compila a mano' })).toBeEnabled();
    expect(w.counts().starts).toBe(0);
  });
  it('lost paid start response explicitly recovers the same idempotency key and retains cost in the draft', async () => {
    const w = await world({ paid: true, lostStart: true });
    await w.user.click(await screen.findByRole('checkbox'));
    await w.user.click(screen.getByRole('button', { name: 'Avvia l’analisi' }));
    await screen.findByText(/Riprova lo stesso avvio/);
    expect(w.counts().starts).toBe(1);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    await w.user.click(screen.getByRole('button', { name: 'Recupera l’avvio' }));
    await screen.findByText('Costo dell’analisi: 0.005400 USD.');
    await screen.findByLabelText('Nome dell’oggetto');
    const posts = w.calls.filter(call => call.path === '/jobs'); expect(posts).toHaveLength(2);
    expect(new Headers(posts[0]!.init.headers).get('Idempotency-Key')).toBe(new Headers(posts[1]!.init.headers).get('Idempotency-Key'));
    expect(JSON.parse(String(posts[1]!.init.body))).toMatchObject({ provider: 'anthropic', consentToProviderTransfer: true });
  });
  it('deep link goes through login and preserves the intended path', async () => {
    const w = await world({ draft: true, loggedOut: true });
    await screen.findByRole('heading', { name: /Accedi/ });
    expect(w.router.state.location.pathname).toBe('/accedi'); expect(w.router.state.location.search).toContain('next=');
    expect(w.calls).toHaveLength(0);
  });
  it('manual draft has blank fields, original preview and no implicit analysis or writes', async () => {
    const w = await world();
    await w.user.click(await screen.findByRole('button', { name: 'Compila a mano' }));
    const input = await screen.findByLabelText('Nome dell’oggetto'); expect(input).toHaveValue('');
    expect(screen.getByLabelText('Importo in euro')).toHaveValue('');
    expect(w.counts()).toMatchObject({ starts: 0, confirmations: 0 });
    await w.user.click(screen.getByRole('button', { name: /Vedi documento originale/ }));
    const dialog = await screen.findByRole('dialog'); expect(dialog).toHaveTextContent('Ricevuta prova');
    await screen.findByRole('button', { name: 'Scarica originale' });
    expect(w.control.calls.some(c => c.url.includes(`/documents/${w.doc.id}/file`))).toBe(true);
  });
  it('redacted draft hides previously extracted values and candidates', async () => {
    await world({ draft: true, redacted: true });
    await screen.findByRole('heading', { name: 'Ricevuta non disponibile' });
    expect(screen.queryByDisplayValue('Lume')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conferma' })).not.toBeInTheDocument();
  });
  it('lost confirmation response recovers by GET and never submits a second cost', async () => {
    const w = await world({ draft: true, drop: true });
    await w.user.click(await screen.findByRole('button', { name: /Controlla il riepilogo/ }));
    await w.user.click(await screen.findByRole('button', { name: 'Conferma' }));
    await screen.findByText(/La risposta non è arrivata/);
    await w.user.click(screen.getByRole('button', { name: /Recupera|Verifica l’esito/ }));
    await screen.findByRole('link', { name: 'Apri oggetto' });
    expect(w.counts()).toMatchObject({ confirmations: 1, recoveries: 1 });
    const post = w.calls.find(c => c.path.endsWith('/confirmations'))!, get = w.calls.find(c => c.path.endsWith('/confirmation'))!;
    expect(new Headers(post.init.headers).get('Idempotency-Key')).toBe(new Headers(get.init.headers).get('Idempotency-Key'));
    expect(get.init.method).toBe('GET');
  });
  it('reload of a persisted job resumes status without starting another analysis', async () => {
    const w = await world({ job: true });
    await screen.findByLabelText('Nome dell’oggetto');
    expect(w.counts()).toMatchObject({ starts: 0, jobReads: 1 });
    expect(w.router.state.location.search).toBe('?bozza=receipt-draft');
  });
  it('typed corrections travel as manual origin in the real confirmation adapter', async () => {
    const w = await world({ draft: true });
    const model = await screen.findByLabelText('Modello');
    fireEvent.change(model, { target: { value: 'Modello corretto' } });
    await w.user.click(screen.getByRole('button', { name: /Controlla il riepilogo/ }));
    await w.user.click(await screen.findByRole('button', { name: 'Conferma' }));
    await screen.findByRole('link', { name: 'Apri spesa' });
    const payload = JSON.parse(String(w.calls.find(c => c.path.endsWith('/confirmations'))!.init.body));
    expect(payload.object.values.model).toBe('Modello corretto'); expect(payload.object.origins.model).toBe('manual');
    expect(payload).not.toHaveProperty('draftId'); expect(payload).not.toHaveProperty('accountId');
  });
  it('park survives leaving the page, reloads read-only and requires an explicit resume', async () => {
    const w = await world({ draft: true });
    fireEvent.change(await screen.findByLabelText('Nome dell’oggetto'), { target: { value: 'Acquisto rivisto' } });
    fireEvent.change(screen.getByLabelText('Importo in euro'), { target: { value: '210,00' } });
    await w.user.click(screen.getByRole('button', { name: /Controlla il riepilogo/ }));
    await w.user.click(screen.getByRole('button', { name: 'Rimanda' }));
    await screen.findByText(/Bozza rimandata: la ritrovi/);
    // Il test verifica la bozza: la compilazione lazy della pagina non deve consumare l'attesa UI.
    await import('../routes/DocumentDetailPage');
    await act(async () => { await w.router.navigate(`/home/${w.home.id}/documenti/${w.doc.id}`); });
    await w.user.click(await screen.findByRole('link', { name: 'Riprendi oggetto e spesa dalla ricevuta' }));
    expect(await screen.findByLabelText('Nome dell’oggetto')).toHaveValue('Acquisto rivisto');
    expect(screen.getByLabelText('Importo in euro')).toHaveValue('210,00');
    expect(screen.getByLabelText('Nome dell’oggetto')).toBeDisabled();
    await w.user.click(screen.getByRole('button', { name: 'Riprendi le scelte salvate' }));
    await screen.findByText(/Abbiamo ripreso le scelte salvate/);
    expect(screen.getByLabelText('Nome dell’oggetto')).toBeEnabled();
    expect(w.calls.filter(c => c.path.endsWith('/reopen'))).toHaveLength(1);
    expect(w.counts().confirmations).toBe(0);
  });
  it('generic document entry discovers an existing draft without starting a second analysis', async () => {
    const w = await world({ resume: true });
    await screen.findByLabelText('Nome dell’oggetto');
    expect(w.router.state.location.search).toBe('?bozza=receipt-draft');
    expect(w.counts()).toMatchObject({ starts: 0, confirmations: 0 });
  });
  it('Da rivedere exposes source and conservative resolution, without overwriting the confirmed value', async () => {
    const w = await world();
    await act(async () => { await w.router.navigate(`/home/${w.home.id}/review`); });
    await screen.findByRole('heading', { name: 'Confronti delle ricevute da rivedere' });
    expect(screen.getByText('Aurora')).toBeInTheDocument(); expect(screen.getByText('Lume')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apri ricevuta e proposte' })).toHaveAttribute('href', expect.stringContaining('bozza=receipt-draft'));
    await w.user.click(screen.getByRole('button', { name: 'Mantieni il dato confermato' }));
    await screen.findByRole('heading', { name: 'Nessuna verifica aperta' });
    const mutation = w.calls.find(c => c.path.endsWith('/resolutions'))!;
    expect(JSON.parse(String(mutation.init.body))).toEqual({ expectedVersion: 1, action: 'keep_existing' });
    expect(w.counts().confirmations).toBe(0);
  });
  it('saved selection beyond page one is loaded before the UI restores the form', async () => {
    const visited: string[] = [];
    const page = await selectedCandidatePage({ items: [{ id: 'first' }], linkedCount: 0, nextCursor: 'p2' }, 'chosen', async cursor => { visited.push(cursor); return { items: [{ id: 'chosen' }], linkedCount: 0, nextCursor: 'p3' }; });
    expect(page.items.map(v => v.id)).toEqual(['first', 'chosen']); expect(page.nextCursor).toBe('p3'); expect(visited).toEqual(['p2']);
    await expect(selectedCandidatePage({ items: [], linkedCount: 0, nextCursor: 'loop' }, 'missing', async () => ({ items: [], linkedCount: 0, nextCursor: 'loop' }))).rejects.toThrow(/ripetuta/);
  });
});
