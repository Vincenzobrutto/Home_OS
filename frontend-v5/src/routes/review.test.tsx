import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeBackend, samplePdf } from '../test/fakeBackend';
import { renderApp } from '../test/harness';
import type { renderApp as RenderApp } from '../test/harness';
import { JOB_POLLING } from '../review/hooks';

type App = ReturnType<typeof RenderApp>;

const SHA = {
  A: '824b6de359f70aa8c635c8cf91010e1352938031d3a6276867b78e63c23046fe',
  B: 'da6b734094d37b6a07d7b58f381dde1d0259f7899c307183d163b40cb48bee90',
  C: 'e313f78f7b02d6802f0a795c2a395867a2873f48963bb053a9b54d525ecdcf92',
};
const PW = { owner: 'password-owner-001', member: 'password-member-01', viewer: 'password-viewer-01' };

const saved = { ...JOB_POLLING };
beforeEach(() => {
  // Tempi ridotti solo nei test: stessa logica, 1 s → 20 ms e 30 s → 400 ms.
  JOB_POLLING.intervalMs = 20;
  JOB_POLLING.maxPerVisitMs = 400;
});
afterEach(() => {
  Object.assign(JOB_POLLING, saved);
});

/** Casa con owner/member/viewer; documenti A, B, C (impronte dei PDF di esempio) e un PDF qualsiasi. */
async function m3World() {
  const backend = new FakeBackend();
  const owner = backend.seedAccount('Olga Owner', 'owner@example.test', PW.owner);
  const member = backend.seedAccount('Mario Member', 'member@example.test', PW.member);
  const viewer = backend.seedAccount('Vera Viewer', 'viewer@example.test', PW.viewer);
  const home = backend.seedHome(owner.id, 'Casa Roma', 'Via Roma 1');
  const second = backend.seedHome(owner.id, 'Casa Lago', 'Via Lago 2');
  backend.addMember(member.id, home.id, 'member');
  backend.addMember(viewer.id, home.id, 'viewer');
  const doc = (name: string, sha?: string) =>
    backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name, visibility: 'home', bytes: samplePdf(name), sha256: sha });
  const A = await doc('Libretto A', SHA.A);
  const B = await doc('Scheda tecnica B', SHA.B);
  const C = await doc('Rapporto C', SHA.C);
  const X = await doc('Bolletta qualsiasi');
  return { backend, owner, member, viewer, home, second, A, B, C, X };
}

async function login(app: App, email: string, password: string) {
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), email);
  await app.user.type(screen.getByLabelText('Password'), password);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
}

async function open(backend: FakeBackend, email: string, password: string, path: string) {
  const app = renderApp({ path: '/accedi', backend });
  await login(app, email, password);
  await app.router.navigate(path);
  return app;
}

const posts = (backend: FakeBackend, suffix: RegExp) => backend.log.filter((r) => r.method === 'POST' && suffix.test(r.path));

/** Avvia un'analisi dei documenti indicati dalla pagina Attività e attende l'esito. */
async function analyze(app: App, homeId: string, docNames: string[], expected: RegExp = /Analisi completata|Nessuna novità/) {
  await app.router.navigate(`/home/${homeId}/attivita?analizza=1`);
  await screen.findByRole('heading', { name: 'Nuova analisi' });
  // Provider scelto esplicitamente (analysis-v2): nessuna preselezione.
  await app.user.click(await screen.findByRole('radio', { name: /Analisi di test — nessuna AI reale/ }));
  for (const n of docNames) await app.user.click(await screen.findByRole('checkbox', { name: new RegExp(n) }));
  await app.user.click(screen.getByRole('button', { name: 'Avvia analisi di test' }));
  const progress = await screen.findByRole('region', { name: 'Analisi avviata' });
  await waitFor(() => expect(progress).toHaveTextContent(expected), { timeout: 3000 });
  return progress;
}

async function openBoilerFromProgress(app: App, progress: HTMLElement) {
  await app.user.click(within(progress).getByRole('link', { name: 'Apri la scheda' }));
  await screen.findByRole('heading', { level: 1, name: 'Caldaia' });
}

const card = (name: string) => screen.getByRole('article', { name });

describe('[mock] M3 — endpoint assenti e avvio esplicito', () => {
  it('backend senza M3: messaggio comprensibile, nessuna caldaia o verifica inventata', async () => {
    const { backend, home } = await m3World();
    backend.reviewEnabled = false;
    await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/casa`);
    const impianti = await screen.findByRole('region', { name: 'Da rivedere' });
    await waitFor(() => expect(within(impianti).getByRole('alert')).toHaveTextContent('Risorsa non trovata.'));
    expect(impianti).not.toHaveTextContent(/verifiche da rivedere/);
  });

  it('nessuna analisi al caricamento, all’apertura di Documenti/dettaglio o di Attività', async () => {
    const { backend, home, A } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/documenti`);
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(screen.getByRole('button', { name: 'Seleziona per compilare con l’AI' })).toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/documenti/${A.id}`);
    await app.user.click(await screen.findByText('Altri strumenti di analisi'));
    expect(await screen.findByRole('link', { name: 'Analizza questo documento' })).toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/attivita?view=analysis`);
    await screen.findByRole('heading', { level: 1, name: 'Attività' });
    await screen.findByText('Nessuna analisi avviata in questa casa.');
    expect(posts(backend, /analysis-jobs/)).toHaveLength(0);
  });

  it('analisi di test esplicita: etichetta prima dell’avvio, destinazione, polling fino all’esito, scheda provvisoria', async () => {
    const { backend, owner, home, A } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/documenti/${A.id}`);
    await app.user.click(await screen.findByRole('link', { name: 'Analizza questo documento' }));
    const form = await screen.findByRole('form', { name: 'Nuova analisi' });
    expect(within(form).getByRole('radio', { name: /Analisi di test — nessuna AI reale/ })).not.toBeChecked();
    await app.user.click(await screen.findByRole('radio', { name: /Analisi di test — nessuna AI reale/ }));
    expect(within(form).getByText('Analisi di test — nessuna AI reale')).toBeInTheDocument();
    expect(within(form).getByRole('checkbox', { name: /Libretto A/ })).toBeChecked();
    expect(within(form).queryByRole('checkbox', { name: /Bolletta/ })).toBeInTheDocument();
    expect(form).toHaveTextContent('Destinazione: una nuova scheda caldaia in Casa Roma');
    await app.user.click(within(form).getByRole('button', { name: 'Avvia analisi di test' }));
    const progress = await screen.findByRole('region', { name: 'Analisi avviata' });
    await waitFor(() => expect(progress).toHaveTextContent('Analisi completata: 3 verifiche aperte'), { timeout: 3000 });
    const [req] = posts(backend, /analysis-jobs$/);
    // analysis-v2: provider sempre esplicito; nessun consenso/trasferimento per l'analisi di test.
    expect(req!.body).toEqual({ documentIds: [A.id], provider: 'test_fixture_v1' });
    expect(req!.headers['x-account-context']).toBe(owner.id);
    expect(req!.headers['idempotency-key']).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
    await openBoilerFromProgress(app, progress);
    expect(screen.getByText('Dati provvisori')).toBeInTheDocument();
    expect(screen.getByText('Scheda personale in questa casa')).toBeInTheDocument();
    expect(screen.getAllByText('Analisi di test — nessuna AI reale').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Verifiche aperte (3)' })).toBeInTheDocument();
    expect(card('Potenza')).toHaveTextContent('24 kW — Potenza utile al riscaldamento');
  });

  it('member avvia analisi senza permesso export; viewer non può avviarle', async () => {
    const { backend, home } = await m3World();
    const memberApp = await open(backend, 'member@example.test', PW.member, `/home/${home.id}/attivita?view=analysis`);
    expect(await screen.findByRole('button', { name: 'Nuova analisi' })).toBeInTheDocument();
    memberApp.unmount();
    await open(backend, 'viewer@example.test', PW.viewer, `/home/${home.id}/attivita?view=analysis`);
    await screen.findByRole('heading', { level: 1, name: 'Attività' });
    await screen.findByText('Nessuna analisi avviata in questa casa.');
    expect(screen.queryByRole('button', { name: 'Nuova analisi' })).not.toBeInTheDocument();
  });
});

describe('[mock] M3 — job: fallimento, retry, polling', () => {
  it('documento sconosciuto: fallito senza dati inventati; nuovo tentativo con nuova chiave, vecchio errore conservato', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    const progress = await analyze(app, home.id, ['Bolletta qualsiasi'], /Analisi non riuscita/);
    expect(progress).toHaveTextContent('riconosce solo i tre PDF di esempio');
    expect(backend.review.assets.size).toBe(0);
    await app.user.click(await screen.findByRole('button', { name: 'Nuovo tentativo' }));
    await waitFor(() => expect(posts(backend, /\/retry$/)).toHaveLength(1));
    const retryKey = posts(backend, /\/retry$/)[0]!.headers['idempotency-key'];
    expect(retryKey).not.toBe(posts(backend, /analysis-jobs$/)[0]!.headers['idempotency-key']);
    await waitFor(() => expect(screen.getAllByText(/provider_fixture_unsupported/).length).toBe(2), { timeout: 3000 });
    expect(screen.getByText('Nuovo tentativo di un’analisi non riuscita.')).toBeInTheDocument();
    // L'inserimento manuale resta disponibile.
    if (!(await screen.findByText('Strumenti ed esempi')).closest('details')?.open) await app.user.click(screen.getByText('Strumenti ed esempi'));
    expect(screen.getByRole('button', { name: 'Crea una scheda caldaia a mano' })).toBeInTheDocument();
  });

  it('job lungo: polling al massimo per la visita, poi «puoi tornare più tardi» e aggiornamento manuale', async () => {
    const { backend, home } = await m3World();
    backend.review.jobMode = 'hold';
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    const progress = await analyze(app, home.id, ['Libretto A'], /puoi tornare più tardi/);
    const jobId = [...backend.review.jobs.keys()][0]!;
    const reads = backend.review.jobReads.get(jobId)!;
    expect(reads).toBeGreaterThan(2);
    await new Promise((r) => setTimeout(r, 150));
    expect(backend.review.jobReads.get(jobId)).toBe(reads);
    expect(progress).not.toHaveTextContent('Completata');
    backend.review.jobMode = 'auto';
    await app.user.click(within(progress).getByRole('button', { name: 'Aggiorna' }));
    await waitFor(() => expect(progress).toHaveTextContent('Analisi completata'), { timeout: 3000 });
  });

  it('polling interrotto lasciando la pagina; rientro da Attività con stato persistente', async () => {
    const { backend, home } = await m3World();
    backend.review.jobMode = 'hold';
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    await app.router.navigate(`/home/${home.id}/attivita?analizza=1`);
    await app.user.click(await screen.findByRole('radio', { name: /Analisi di test — nessuna AI reale/ }));
    await app.user.click(await screen.findByRole('checkbox', { name: /Libretto A/ }));
    await app.user.click(screen.getByRole('button', { name: 'Avvia analisi di test' }));
    await screen.findByText('Analisi in corso…');
    await app.router.navigate(`/home/${home.id}/casa`);
    await screen.findByRole('heading', { level: 1, name: 'Casa Roma' });
    const jobId = [...backend.review.jobs.keys()][0]!;
    const reads = backend.review.jobReads.get(jobId)!;
    await new Promise((r) => setTimeout(r, 120));
    expect(backend.review.jobReads.get(jobId)).toBe(reads);
    backend.review.jobMode = 'auto';
    await app.router.navigate(`/home/${home.id}/attivita?view=analysis`);
    const followLink = await screen.findByRole('link', { name: 'Segui l’avanzamento' });
    await app.user.click(followLink);
    const progress = await screen.findByRole('region', { name: 'Analisi avviata' });
    await waitFor(() => expect(progress).toHaveTextContent('Analisi completata'), { timeout: 3000 });
  });
});

describe('[mock] M3 — decisioni', () => {
  it('conferma solo la marca: modello e potenza restano aperti, il conteggio si rilegge, storia aggiornata', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    await analyze(app, home.id, ['Libretto A']);
    await app.router.navigate(`/home/${home.id}/review`);
    await screen.findByText(/3/, { selector: 'strong' });
    const marca = card('Marca');
    await app.user.click(within(marca).getByRole('radio', { name: /Usa Termica Demo/ }));
    await app.user.click(within(marca).getByRole('button', { name: 'Salva decisione' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Marca' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('status')).toHaveFocus());
    expect(card('Modello')).toBeInTheDocument();
    expect(card('Potenza')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('2', { selector: 'strong' })).toBeInTheDocument());
    const [req] = posts(backend, /\/confirmations$/);
    expect((req!.body as { decisions: unknown[] }).decisions).toEqual([
      expect.objectContaining({ action: 'accept', candidateId: expect.any(String) }),
    ]);
    const assetId = [...backend.review.assets.keys()][0]!;
    await app.router.navigate(`/home/${home.id}/impianti/${assetId}`);
    await screen.findByText('Dati parzialmente confermati');
    const storia = screen.getByRole('region', { name: 'Storia della scheda' });
    await waitFor(() => expect(storia).toHaveTextContent('Conferma'));
    expect(storia).toHaveTextContent('Marca (Proposta confermata): — → Termica Demo');
    expect(screen.getAllByRole('link', { name: 'Attività' }).every(link => link.getAttribute('aria-current') === 'page')).toBe(true);
  });

  it('Rimanda non invia nulla; Non applicare richiede una nota e chiude solo quella proposta', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    await analyze(app, home.id, ['Libretto A']);
    await app.router.navigate(`/home/${home.id}/review`);
    const modello = await screen.findByRole('article', { name: 'Modello' });
    await app.user.click(within(modello).getByRole('button', { name: 'Rimanda' }));
    expect(within(modello).getByText('Rimandata: la verifica resta aperta in Da rivedere.')).toBeInTheDocument();
    expect(posts(backend, /\/confirmations$/)).toHaveLength(0);
    await app.user.click(within(modello).getByRole('radio', { name: /Non applicare/ }));
    await app.user.click(within(modello).getByRole('button', { name: 'Salva decisione' }));
    expect(within(modello).getByLabelText(/Nota/)).toHaveAccessibleDescription('Scrivi una nota che spieghi la scelta.');
    expect(posts(backend, /\/confirmations$/)).toHaveLength(0);
    await app.user.type(within(modello).getByLabelText(/Nota/), 'Modello da verificare sulla targhetta');
    await app.user.click(within(modello).getByRole('button', { name: 'Salva decisione' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Modello' })).not.toBeInTheDocument());
    expect(card('Marca')).toBeInTheDocument();
    const decision = (posts(backend, /\/confirmations$/)[0]!.body as { decisions: Array<Record<string, unknown>> }).decisions[0];
    expect(decision).toMatchObject({ action: 'discard', note: 'Modello da verificare sulla targhetta' });
    const asset = [...backend.review.assets.values()][0]!;
    expect(asset.confirmed.model).toBeUndefined();
  });

  it('conferma insieme marca e modello, senza includere la potenza', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    await analyze(app, home.id, ['Libretto A']);
    await app.router.navigate(`/home/${home.id}/review`);
    const batch = await screen.findByRole('group', { name: 'Conferma insieme marca e modello' });
    expect(within(batch).queryByText(/Potenza:/)).not.toBeInTheDocument();
    expect(batch).toHaveTextContent('La potenza si conferma a parte');
    await app.user.click(within(batch).getByRole('checkbox', { name: /Marca/ }));
    await app.user.click(within(batch).getByRole('checkbox', { name: /Modello/ }));
    await app.user.click(within(batch).getByRole('button', { name: 'Conferma selezionati (2)' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Marca' })).not.toBeInTheDocument());
    expect(screen.queryByRole('article', { name: 'Modello' })).not.toBeInTheDocument();
    expect(card('Potenza')).toBeInTheDocument();
    const reqs = posts(backend, /\/confirmations$/);
    expect(reqs).toHaveLength(1);
    expect((reqs[0]!.body as { decisions: Array<{ action: string }> }).decisions.map((d) => d.action)).toEqual(['accept', 'accept']);
  });

  it('A+B: due grandezze distinte, «Conserva le due grandezze» con nota; 24 utile e 28 nominale confermate con fonti', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    const progress = await analyze(app, home.id, ['Libretto A', 'Scheda tecnica B']);
    await openBoilerFromProgress(app, progress);
    const potenza = card('Potenza');
    expect(potenza).toHaveTextContent('due grandezze diverse');
    const keep = within(potenza).getByRole('radio', { name: /Conserva le due grandezze/ });
    expect(keep.closest('label')).toHaveTextContent('24 kW — Potenza utile al riscaldamento');
    expect(keep.closest('label')).toHaveTextContent('28 kW — Potenza nominale riportata');
    await app.user.click(keep);
    await app.user.click(within(potenza).getByRole('button', { name: 'Salva decisione' }));
    expect(within(potenza).getByLabelText(/Nota/)).toHaveAccessibleDescription('Scrivi una nota che spieghi la scelta.');
    await app.user.type(within(potenza).getByLabelText(/Nota/), 'Sono due grandezze diverse');
    await app.user.click(within(potenza).getByRole('button', { name: 'Salva decisione' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Potenza' })).not.toBeInTheDocument());
    const decision = (posts(backend, /\/confirmations$/)[0]!.body as { decisions: Array<Record<string, unknown>> }).decisions[0]!;
    expect(decision).toMatchObject({ action: 'resolve_power', mode: 'keep_distinct', note: 'Sono due grandezze diverse' });
    expect(decision.measurements).toHaveLength(2);
    const confermati = screen.getByRole('region', { name: 'Dati confermati' });
    await waitFor(() => expect(confermati).toHaveTextContent('24 kW — Potenza utile al riscaldamento'));
    expect(confermati).toHaveTextContent('28 kW — Potenza nominale riportata');
    expect(within(confermati).getByText('Potenza utile al riscaldamento: 24 kW')).toBeInTheDocument();
    expect(within(confermati).getByText('Potenza nominale riportata: 28 kW')).toBeInTheDocument();
  });

  it('A+C: stessa grandezza in conflitto, niente «Conserva le due grandezze»; scelta motivata di un valore', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    const progress = await analyze(app, home.id, ['Libretto A', 'Rapporto C']);
    await openBoilerFromProgress(app, progress);
    const potenza = card('Potenza');
    expect(potenza).toHaveTextContent('valori diversi per la stessa grandezza');
    expect(within(potenza).queryByRole('radio', { name: /Conserva le due grandezze/ })).not.toBeInTheDocument();
    await app.user.click(within(potenza).getByRole('radio', { name: /Usa solo 28 kW — Potenza utile al riscaldamento/ }));
    await app.user.type(within(potenza).getByLabelText(/Nota/), 'Rapporto più recente');
    await app.user.click(within(potenza).getByRole('button', { name: 'Salva decisione' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Potenza' })).not.toBeInTheDocument());
    const decision = (posts(backend, /\/confirmations$/)[0]!.body as { decisions: Array<Record<string, unknown>> }).decisions[0]!;
    expect(decision).toMatchObject({ action: 'resolve_power', mode: 'choose_one' });
    const storia = screen.getByRole('region', { name: 'Storia della scheda' });
    // Le fonti di entrambi i documenti restano nella storia.
    await waitFor(() => expect(within(storia).getAllByText('Potenza utile al riscaldamento: 28 kW').length).toBeGreaterThan(0));
    expect(within(storia).getAllByText('Potenza utile al riscaldamento: 24 kW').length).toBeGreaterThan(0);
  });

  it('valore già confermato: prima/dopo, sostituzione esplicita con nota, poi replaceConfirmed', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    if (!(await screen.findByText('Strumenti ed esempi')).closest('details')?.open) await app.user.click(screen.getByText('Strumenti ed esempi'));
    await app.user.click(await screen.findByRole('button', { name: 'Crea una scheda caldaia a mano' }));
    await app.user.click(screen.getByRole('button', { name: 'Crea scheda' }));
    await screen.findByRole('heading', { level: 1, name: 'Caldaia' });
    const form = screen.getByRole('form', { name: 'Marca e modello' });
    await app.user.type(within(form).getByLabelText('Marca'), 'Altra Marca');
    await app.user.type(within(form).getByLabelText(/Nota/), 'Letto sulla targhetta');
    await app.user.click(within(form).getByRole('button', { name: 'Salva marca e modello' }));
    await within(form).findByText('Dati salvati nella scheda.');
    const assetId = [...backend.review.assets.keys()][0]!;
    await app.router.navigate(`/home/${home.id}/attivita?analizza=1&scheda=${assetId}`);
    await app.user.click(await screen.findByRole('radio', { name: /Analisi di test — nessuna AI reale/ }));
    await app.user.click(await screen.findByRole('checkbox', { name: /Libretto A/ }));
    expect(screen.getByRole('combobox', { name: 'Destinazione dei risultati' })).toHaveValue(assetId);
    await app.user.click(screen.getByRole('button', { name: 'Avvia analisi di test' }));
    const progress = await screen.findByRole('region', { name: 'Analisi avviata' });
    await waitFor(() => expect(progress).toHaveTextContent('Analisi completata'), { timeout: 3000 });
    expect(backend.review.assets.size).toBe(1);
    await openBoilerFromProgress(app, progress);
    const marca = card('Marca');
    expect(marca).toHaveTextContent('Valore già confermato: Altra Marca');
    await app.user.click(within(marca).getByRole('radio', { name: /Usa Termica Demo/ }));
    expect(within(marca).getByLabelText('Sostituzione del valore confermato')).toHaveTextContent('PrimaAltra MarcaDopoTermica Demo');
    await app.user.click(within(marca).getByRole('button', { name: 'Salva decisione' }));
    expect(within(marca).getByText('Conferma esplicitamente la sostituzione del valore già confermato.')).toBeInTheDocument();
    await app.user.click(within(marca).getByRole('checkbox', { name: 'Sostituisci il valore confermato' }));
    await app.user.type(within(marca).getByLabelText(/Nota/), 'Il libretto è più affidabile');
    await app.user.click(within(marca).getByRole('button', { name: 'Salva decisione' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Marca' })).not.toBeInTheDocument());
    const decision = (posts(backend, /\/confirmations$/)[0]!.body as { decisions: Array<Record<string, unknown>> }).decisions[0]!;
    expect(decision).toMatchObject({ action: 'accept', replaceConfirmed: true, note: 'Il libretto è più affidabile' });
  });

  it('409 di versione: messaggio, rilettura, nessun reinvio automatico', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    await analyze(app, home.id, ['Libretto A']);
    await app.router.navigate(`/home/${home.id}/review`);
    const original = backend.handle.bind(backend);
    let conflicts = 0;
    backend.handle = async (req) => {
      if (req.method === 'POST' && req.path.endsWith('/confirmations') && conflicts === 0) {
        conflicts++;
        backend.log.push(req);
        return { status: 409, body: { error: { code: 'asset_version_conflict', message: 'La scheda è cambiata.' } } };
      }
      return original(req);
    };
    const marca = await screen.findByRole('article', { name: 'Marca' });
    await app.user.click(within(marca).getByRole('radio', { name: /Usa Termica Demo/ }));
    const reviewReads = backend.log.filter((r) => r.path.includes('/review')).length;
    await app.user.click(within(marca).getByRole('button', { name: 'Salva decisione' }));
    expect(await within(marca).findByText('La scheda è cambiata')).toBeInTheDocument();
    await waitFor(() => expect(backend.log.filter((r) => r.path.includes('/review')).length).toBeGreaterThan(reviewReads));
    await new Promise((r) => setTimeout(r, 50));
    expect(posts(backend, /\/confirmations$/)).toHaveLength(1);
    expect(within(marca).getByRole('radio', { name: /Usa Termica Demo/ })).not.toBeChecked();
  });

  it('esito ambiguo: «Riprova invio» con la stessa chiave, una sola conferma', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    await analyze(app, home.id, ['Libretto A']);
    await app.router.navigate(`/home/${home.id}/review`);
    const marca = await screen.findByRole('article', { name: 'Marca' });
    await app.user.click(within(marca).getByRole('radio', { name: /Usa Termica Demo/ }));
    app.control.dropNextResponse();
    await app.user.click(within(marca).getByRole('button', { name: 'Salva decisione' }));
    expect(await within(marca).findByText('Esito non confermato')).toBeInTheDocument();
    expect(within(marca).getByRole('radio', { name: /Usa Termica Demo/ })).toBeDisabled();
    await app.user.click(within(marca).getByRole('button', { name: 'Riprova invio' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Marca' })).not.toBeInTheDocument());
    const [a, b] = posts(backend, /\/confirmations$/);
    expect(a!.headers['idempotency-key']).toBe(b!.headers['idempotency-key']);
    const asset = [...backend.review.assets.values()][0]!;
    expect(asset.history.filter((h) => h.kind === 'confirmation')).toHaveLength(1);
  });
});

describe('[mock] M3 — manuale, conteggi, riservatezza, contesto', () => {
  it('compilazione manuale: marca/modello e potenza (da sola), origine manuale senza fonti, verifiche aperte non chiuse', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    const progress = await analyze(app, home.id, ['Libretto A']);
    await openBoilerFromProgress(app, progress);
    const tm = screen.getByRole('form', { name: 'Marca e modello' });
    await app.user.type(within(tm).getByLabelText('Marca'), 'Termica Demo');
    await app.user.type(within(tm).getByLabelText('Modello'), 'TD-24');
    await app.user.type(within(tm).getByLabelText(/Nota/), 'Copiato dalla targhetta');
    await app.user.click(within(tm).getByRole('button', { name: 'Salva marca e modello' }));
    await within(tm).findByText('Dati salvati nella scheda.');
    const body = posts(backend, /manual-confirmations$/)[0]!.body as { fields: Array<Record<string, unknown>> };
    expect(body.fields.map((f) => f.fieldKey)).toEqual(['brand', 'model']);
    expect(body.fields.every((f) => Array.isArray(f.proposalIdsToClose) && (f.proposalIdsToClose as unknown[]).length === 0)).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/sources|origin/);
    // Le verifiche aperte restano: nessuna chiusura implicita.
    expect(screen.getByRole('heading', { name: 'Verifiche aperte (3)' })).toBeInTheDocument();

    const pw = screen.getByRole('form', { name: 'Potenza' });
    await app.user.type(within(pw).getByLabelText('Valore (kW)'), '24,0');
    await app.user.type(within(pw).getByLabelText(/Nota/), 'Targhetta');
    await app.user.click(within(pw).getByRole('button', { name: 'Salva potenza' }));
    await within(pw).findByText('Dati salvati nella scheda.');
    const pbody = posts(backend, /manual-confirmations$/)[1]!.body as { fields: Array<{ fieldKey: string; value: { measurements: Array<{ value: string }> } }> };
    expect(pbody.fields).toHaveLength(1);
    expect(pbody.fields[0]!.fieldKey).toBe('power');
    expect(pbody.fields[0]!.value.measurements[0]!.value).toBe('24.0');
    const confermati = screen.getByRole('region', { name: 'Dati confermati' });
    await waitFor(() => expect(confermati).toHaveTextContent('24 kW — Potenza utile al riscaldamento (inserito a mano)'));
    expect(confermati).toHaveTextContent('Origine: inserito a mano');
    expect(within(confermati).queryByText('Apri l’originale')).not.toBeInTheDocument();
  });

  it('conteggi reali in Casa; a zero verifiche Da rivedere è vuota e la scheda è «Dati confermati»', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    await analyze(app, home.id, ['Libretto A']);
    await app.router.navigate(`/home/${home.id}/casa`);
    await screen.findByRole('heading', { level: 1, name: home.name });
    const verifiche = await screen.findByRole('region', { name: 'Da rivedere' });
    await waitFor(() => expect(within(verifiche).getByRole('link',{name:'Dati da confermare 3'})).toBeInTheDocument());
    await app.router.navigate(`/home/${home.id}/review`);
    const batch = await screen.findByRole('group', { name: 'Conferma insieme marca e modello' });
    await app.user.click(within(batch).getByRole('checkbox', { name: /Marca/ }));
    await app.user.click(within(batch).getByRole('checkbox', { name: /Modello/ }));
    await app.user.click(within(batch).getByRole('button', { name: 'Conferma selezionati (2)' }));
    const potenza = await waitFor(() => {
      expect(screen.queryByRole('article', { name: 'Marca' })).not.toBeInTheDocument();
      return card('Potenza');
    });
    await app.user.click(within(potenza).getByRole('radio', { name: /Usa 24 kW/ }));
    await app.user.type(within(potenza).getByLabelText(/Nota/), 'Coerente col libretto');
    await app.user.click(within(potenza).getByRole('button', { name: 'Salva decisione' }));
    expect(await screen.findByRole('heading', { name: 'Nessuna verifica aperta' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/casa`);
    await screen.findByRole('region', { name: 'Da rivedere' });
    await waitFor(() => {
      expect(screen.getByRole('link',{name:'Dati da confermare 0'})).toBeInTheDocument();
      expect(screen.getByRole('region',{name:'Esplora la casa'})).toBeInTheDocument();
    });
  });

  it('schede personali: l’owner non vede la scheda del member né la apre via URL', async () => {
    const { backend, home } = await m3World();
    const memberApp = await open(backend, 'member@example.test', PW.member, `/home/${home.id}/attivita?view=analysis`);
    await analyze(memberApp, home.id, ['Libretto A']);
    memberApp.unmount();
    const assetId = [...backend.review.assets.keys()][0]!;
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    await screen.findByText('Nessuna analisi avviata in questa casa.');
    expect(await screen.findByText('Nessuna scheda caldaia.')).toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/impianti/${assetId}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Scheda non disponibile' })).toBeInTheDocument();
    expect(screen.queryByText('Termica Demo')).not.toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/impianti/non-un-uuid`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Indirizzo non valido' })).toBeInTheDocument();
  });

  it('401 sulla scheda: login e cache M3 rimossa', async () => {
    const { backend, home } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    await analyze(app, home.id, ['Libretto A']);
    const assetId = [...backend.review.assets.keys()][0]!;
    backend.sessions.clear();
    // Pagina non ancora visitata: la richiesta parte e riceve 401.
    await app.router.navigate(`/home/${home.id}/impianti/${assetId}`);
    expect(await screen.findByRole('heading', { name: 'Accedi' })).toBeInTheDocument();
    const keys = app.queryClient.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys.filter((k) => k.includes('m3'))).toEqual([]);
  });

  it('cambio casa: la bozza di una decisione non segue l’utente', async () => {
    const { backend, home, second } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    await analyze(app, home.id, ['Libretto A']);
    await app.router.navigate(`/home/${home.id}/review`);
    const marca = await screen.findByRole('article', { name: 'Marca' });
    await app.user.click(within(marca).getByRole('radio', { name: /Correggi/ }));
    await app.user.type(within(marca).getByLabelText('Marca: valore corretto'), 'Bozza privata');
    await app.router.navigate(`/home/${second.id}/review`);
    expect(await screen.findByRole('heading', { name: 'Nessuna verifica aperta' })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Bozza privata')).not.toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/review`);
    const again = await screen.findByRole('article', { name: 'Marca' });
    expect(within(again).getByRole('radio', { name: /Correggi/ })).not.toBeChecked();
  });

  it('fonte apribile con il flusso M2 autenticato; PDF di esempio etichettati come sintetici', async () => {
    const { backend, home, A } = await m3World();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?view=analysis`);
    if (!(await screen.findByText('Strumenti ed esempi')).closest('details')?.open) await app.user.click(screen.getByText('Strumenti ed esempi'));
    const esempi = await screen.findByRole('region', { name: 'Documenti per la prova con esempi' });
    expect(esempi).toHaveTextContent('dati dimostrativi');
    expect(within(esempi).getByRole('link', { name: /A — Libretto caldaia/ })).toHaveAttribute('href', '/m3-examples/libretto-caldaia-demo.pdf');
    const progress = await analyze(app, home.id, ['Libretto A']);
    await openBoilerFromProgress(app, progress);
    await app.user.click(within(card('Marca')).getByRole('link', { name: 'Apri l’originale' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Libretto A' })).toBeInTheDocument();
    expect(app.router.state.location.pathname).toBe(`/home/${home.id}/documenti/${A.id}`);
  });
});
