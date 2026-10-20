// M4 analysis-v2 con Anthropic SIMULATO nel solo harness: nessuna chiamata reale, nessuna chiave.
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JOB_POLLING } from '../review/hooks';
import { FakeBackend, samplePdf } from '../test/fakeBackend';
import type { AiOutcome } from '../test/fakeReview';
import { renderApp } from '../test/harness';
import type { renderApp as RenderApp } from '../test/harness';

type App = ReturnType<typeof RenderApp>;
const PW = 'password-owner-001';
const CONSENT = 'Invia ad Anthropic il testo dei documenti selezionati per proporre i dati della caldaia';

const saved = { ...JOB_POLLING };
beforeEach(() => {
  JOB_POLLING.intervalMs = 20;
  JOB_POLLING.maxPerVisitMs = 400;
});
afterEach(() => {
  Object.assign(JOB_POLLING, saved);
});

async function world(opts: { configured?: boolean } = {}) {
  const backend = new FakeBackend();
  backend.review.anthropic.configured = opts.configured ?? true;
  const owner = backend.seedAccount('Olga Owner', 'owner@example.test', PW);
  const home = backend.seedHome(owner.id, 'Casa Roma', 'Via Roma 1');
  const second = backend.seedHome(owner.id, 'Casa Lago', 'Via Lago 2');
  const doc = (name: string, sha?: string) =>
    backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name, visibility: 'home', bytes: samplePdf(name), sha256: sha });
  const P = await doc('Manuale caldaia multipagina');
  const A = await doc('Libretto A', '824b6de359f70aa8c635c8cf91010e1352938031d3a6276867b78e63c23046fe');
  return { backend, owner, home, second, P, A };
}

async function open(backend: FakeBackend, path: string) {
  const app = renderApp({ path: '/accedi', backend });
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), 'owner@example.test');
  await app.user.type(screen.getByLabelText('Password'), PW);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
  await app.router.navigate(path);
  return app;
}

const jobPosts = (backend: FakeBackend) => backend.log.filter((r) => r.method === 'POST' && /analysis-jobs$/.test(r.path));
const aiRadio = () => screen.findByRole('radio', { name: /Analisi AI con Anthropic/ });

/** Apre il modulo, sceglie Anthropic, il documento, dà il consenso e invia. */
async function startAi(app: App, homeId: string, docName: RegExp, extraPath = '') {
  await app.router.navigate(`/home/${homeId}/attivita?analizza=1${extraPath}`);
  await app.user.click(await aiRadio());
  await app.user.click(await screen.findByRole('checkbox', { name: docName }));
  await app.user.click(screen.getByRole('checkbox', { name: CONSENT }));
  await app.user.click(screen.getByRole('button', { name: 'Invia ad Anthropic e analizza' }));
  return screen.findByRole('region', { name: 'Analisi avviata' });
}

const claims = (docIndex = 0): AiOutcome => ({
  kind: 'claims',
  costUsd: '0.0123',
  claims: [
    { field: 'brand', value: 'Termica Demo', documentIndex: docIndex, page: 2, excerpt: 'Costruttore: Termica Demo' },
    { field: 'model', value: 'TD-24', documentIndex: docIndex, page: 2, excerpt: 'Modello TD-24' },
    {
      field: 'power',
      value: '24',
      documentIndex: docIndex,
      page: 3,
      excerpt: 'Potenza utile al riscaldamento 24 kW',
      measurement: { value: '24', unit: 'kW', quantityCode: 'useful_heating', quantityLabel: 'Potenza utile al riscaldamento' },
    },
  ],
});

describe('[mock] M4 — scelta del provider e consenso', () => {
  it('capabilities senza prova attiva: niente esempi o diagnostica interna, anche per motivi sconosciuti', async () => {
    const { backend, home } = await world({ configured: false });
    let fixtureEnabled = false;
    const handle = backend.handle.bind(backend);
    backend.handle = async (req) => {
      const res = await handle(req);
      if (req.path.endsWith('/analysis-capabilities') && res.status === 200) {
        const caps = res.body as { providers: Array<{ id: string; enabled: boolean; disabledReason: string | null }> };
        for (const p of caps.providers) { p.enabled = p.id === 'test_fixture_v1' && fixtureEnabled; p.disabledReason = 'Le sei chiamate del collaudo iniziale: dettaglio interno.'; }
      }
      return res;
    };
    const app = await open(backend, `/home/${home.id}/attivita?analizza=1`);
    await screen.findByText('Nessuna analisi attiva');
    expect(screen.queryByRole('region', { name: 'Documenti per la prova con esempi' })).toBeNull();
    expect(screen.queryByText(/sei chiamate|dettaglio interno/)).toBeNull();
    expect(jobPosts(backend)).toHaveLength(0);
    await app.router.navigate(`/home/${home.id}/documenti`);
    await screen.findByRole('heading', { level: 1, name: 'Documenti' });
    expect(screen.queryByRole('region', { name: 'Documenti per la prova con esempi' })).toBeNull();
    fixtureEnabled = true;
    await app.router.navigate(`/home/${home.id}/attivita?analizza=1`);
    await screen.findByText('Analisi con AI non disponibile al momento. Puoi inserire i dati a mano.');
    expect(screen.queryByText(/sei chiamate|dettaglio interno/)).toBeNull();
    if (!(await screen.findByText('Strumenti ed esempi')).closest('details')?.open) await app.user.click(screen.getByText('Strumenti ed esempi'));
    expect(await screen.findByRole('region', { name: 'Documenti per la prova con esempi' })).toBeInTheDocument();
  });
  it('Anthropic non configurato: opzione disattivata con il motivo, nessun campo per la chiave', async () => {
    const { backend, home } = await world({ configured: false });
    await open(backend, `/home/${home.id}/attivita?analizza=1`);
    const ai = await aiRadio();
    expect(ai).toBeDisabled();
    expect(ai.closest('label')).toHaveTextContent('Analisi con AI non disponibile al momento. Puoi inserire i dati a mano.');
    const fixture = screen.getByRole('radio', { name: /Analisi di test — nessuna AI reale/ });
    expect(fixture).toBeEnabled();
    expect(fixture).not.toBeChecked();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryAllByRole('textbox').filter((t) => /chiave|key|token/i.test(t.getAttribute('aria-label') ?? (t.id ? document.querySelector(`label[for="${t.id}"]`)?.textContent ?? '' : '')))).toHaveLength(0);
  });

  it('Anthropic configurato: nessuna preselezione, limiti e budget del collaudo, consenso obbligatorio non preselezionato', async () => {
    const { backend, home, P } = await world();
    const app = await open(backend, `/home/${home.id}/attivita?analizza=1`);
    const ai = await aiRadio();
    expect(ai).not.toBeChecked();
    expect(screen.queryByRole('checkbox', { name: CONSENT })).not.toBeInTheDocument();
    await app.user.click(ai);
    const box = screen.getByLabelText('Limiti e costi dell’analisi');
    expect(box).toHaveTextContent('massimo circa 10,5 MB per file, 20 pagine');
    expect(box).toHaveTextContent('10.00 USD disponibili su 10.00 USD');
    expect(box).toHaveTextContent('non è un prezzo di Dimora né il saldo dell’account Anthropic');
    const consent = screen.getByRole('checkbox', { name: CONSENT });
    expect(consent).not.toBeChecked();
    await app.user.click(screen.getByRole('checkbox', { name: /Manuale caldaia multipagina/ }));
    await app.user.click(screen.getByRole('button', { name: 'Invia ad Anthropic e analizza' }));
    expect(screen.getByRole('alert')).toHaveTextContent('devi autorizzare l’invio');
    expect(jobPosts(backend)).toHaveLength(0);
    await app.user.click(consent);
    backend.review.anthropicScript.push(claims());
    await app.user.click(screen.getByRole('button', { name: 'Invia ad Anthropic e analizza' }));
    const progress = await screen.findByRole('region', { name: 'Analisi avviata' });
    expect(jobPosts(backend)[0]!.body).toEqual({ documentIds: [P.id], provider: 'anthropic', consentToProviderTransfer: true });
    await waitFor(() => expect(progress).toHaveTextContent('Analisi completata'), { timeout: 3000 });
    expect(progress).toHaveTextContent('Analisi AI con Anthropic · claude-sonnet-5-5');
    expect(progress).toHaveTextContent('Costo del tentativo: 0.0123 USD.');
  });

  it('cambiare provider non invia nulla e azzera il consenso; l’analisi di test non chiede consenso', async () => {
    const { backend, home, A } = await world();
    const app = await open(backend, `/home/${home.id}/attivita?analizza=1`);
    await app.user.click(await aiRadio());
    await app.user.click(screen.getByRole('checkbox', { name: CONSENT }));
    await app.user.click(screen.getByRole('radio', { name: /Analisi di test — nessuna AI reale/ }));
    expect(screen.queryByRole('checkbox', { name: CONSENT })).not.toBeInTheDocument();
    await app.user.click(screen.getByRole('radio', { name: /Analisi AI con Anthropic/ }));
    expect(screen.getByRole('checkbox', { name: CONSENT })).not.toBeChecked();
    expect(jobPosts(backend)).toHaveLength(0);
    await app.user.click(screen.getByRole('radio', { name: /Analisi di test — nessuna AI reale/ }));
    await app.user.click(screen.getByRole('checkbox', { name: /Libretto A/ }));
    expect(screen.getByText(/Destinazione:/).closest('p')).toHaveTextContent('Destinazione: una nuova scheda caldaia in Casa Roma');
    await app.user.click(screen.getByRole('button', { name: 'Avvia analisi di test' }));
    await screen.findByRole('region', { name: 'Analisi avviata' });
    expect(jobPosts(backend)[0]!.body).toEqual({ documentIds: [A.id], provider: 'test_fixture_v1' });
  });

  it('servizio M3 (capabilities senza providers): solo analisi di test, nessuna opzione Anthropic', async () => {
    const { backend, home } = await world();
    backend.review.legacyCapabilities = true;
    await open(backend, `/home/${home.id}/attivita?analizza=1`);
    expect(await screen.findByRole('radio', { name: /Analisi di test — nessuna AI reale/ })).toBeEnabled();
    expect(screen.queryByRole('radio', { name: /Anthropic/ })).not.toBeInTheDocument();
  });

  it('cambio casa: provider e consenso scelti non passano all’altra casa', async () => {
    const { backend, home, second } = await world();
    const app = await open(backend, `/home/${home.id}/attivita?analizza=1`);
    await app.user.click(await aiRadio());
    await app.user.click(screen.getByRole('checkbox', { name: CONSENT }));
    await app.router.navigate(`/home/${second.id}/attivita?analizza=1`);
    await waitFor(() => expect(screen.getAllByRole('navigation', { name: 'Sezioni di Casa Lago' }).length).toBeGreaterThan(0));
    expect(await aiRadio()).not.toBeChecked();
    expect(screen.queryByRole('checkbox', { name: CONSENT })).not.toBeInTheDocument();
  });
});

describe('[mock] M4 — risultati AI', () => {
  it('fonti su pagine 2 e 3 con nome del documento, badge AI e modello, nessun punteggio di confidenza', async () => {
    const { backend, home, P } = await world();
    backend.review.anthropicScript.push(claims());
    const app = await open(backend, `/home/${home.id}/attivita?view=analysis`);
    const progress = await startAi(app, home.id, /Manuale caldaia multipagina/);
    await waitFor(() => expect(progress).toHaveTextContent('Analisi completata'), { timeout: 3000 });
    await app.user.click(within(progress).getByRole('link', { name: 'Apri la scheda' }));
    await screen.findByRole('heading', { level: 1, name: 'Caldaia' });
    const potenza = screen.getByRole('article', { name: 'Potenza' });
    expect(potenza).toHaveTextContent('Analisi AI con Anthropic · claude-sonnet-5-5');
    expect(potenza).toHaveTextContent('Verificato sulla fonte');
    expect(potenza).toHaveTextContent('Potenza utile al riscaldamento 24 kW — pagina 3');
    await waitFor(() => expect(within(potenza).getAllByText('Manuale caldaia multipagina').length).toBeGreaterThan(0));
    expect(screen.getByRole('article', { name: 'Marca' })).toHaveTextContent('pagina 2');
    expect(document.body.textContent).not.toMatch(/\d+\s?%|confidenza|certificat[oa] da/i);
    await app.user.click(within(potenza).getByRole('link', { name: 'Apri l’originale' }));
    await waitFor(() => expect(app.router.state.location.pathname).toBe(`/home/${home.id}/documenti/${P.id}`));
  });

  it('nessun dato sostenuto: no_supported_data senza schede create', async () => {
    const { backend, home } = await world();
    backend.review.anthropicScript.push({ kind: 'no_data', costUsd: '0.0100' });
    const app = await open(backend, `/home/${home.id}/attivita?view=analysis`);
    const progress = await startAi(app, home.id, /Manuale caldaia multipagina/);
    await waitFor(() => expect(progress).toHaveTextContent('Nessun dato sostenuto dai documenti: nessuna scheda è stata creata.'), { timeout: 3000 });
    expect(within(progress).queryByRole('link', { name: 'Apri la scheda' })).not.toBeInTheDocument();
    expect(backend.review.assets.size).toBe(0);
  });

  it.each([
    ['pdf_text_unavailable', 'non contiene testo estraibile'],
    ['provider_auth_failed', 'non è riuscito ad autenticarsi presso Anthropic'],
    ['provider_rate_limited', 'limitato temporaneamente le richieste'],
    ['evidence_unverified', 'citazioni proposte dall’AI non corrispondevano'],
    ['multi_assets_unsupported', 'più caldaie o modelli diversi'],
  ])('errore %s: messaggio distinto, nessuna scheda, manuale disponibile', async (code, text) => {
    const { backend, home } = await world();
    backend.review.anthropicScript.push({ kind: 'fail', code, costUsd: '0.00' });
    const app = await open(backend, `/home/${home.id}/attivita?view=analysis`);
    const progress = await startAi(app, home.id, /Manuale caldaia multipagina/);
    await waitFor(() => expect(progress).toHaveTextContent('Analisi non riuscita'), { timeout: 3000 });
    expect(progress).toHaveTextContent(text);
    expect(progress).toHaveTextContent('puoi sempre inserire i dati a mano');
    expect(backend.review.assets.size).toBe(0);
    if (!(await screen.findByText('Strumenti ed esempi')).closest('details')?.open) await app.user.click(screen.getByText('Strumenti ed esempi'));
    expect(screen.getByRole('button', { name: 'Crea una scheda caldaia a mano' })).toBeInTheDocument();
  });

  it('testo dei documenti trattato come dato: un estratto con HTML resta testo', async () => {
    const { backend, home } = await world();
    backend.review.anthropicScript.push({
      kind: 'claims',
      claims: [{ field: 'brand', value: 'Termica <b>Demo</b>', documentIndex: 0, page: 2, excerpt: '<img src=x onerror="alert(1)">Costruttore' }],
    });
    const app = await open(backend, `/home/${home.id}/attivita?view=analysis`);
    const progress = await startAi(app, home.id, /Manuale caldaia multipagina/);
    await waitFor(() => expect(progress).toHaveTextContent('Analisi completata'), { timeout: 3000 });
    await app.user.click(within(progress).getByRole('link', { name: 'Apri la scheda' }));
    const marca = await screen.findByRole('article', { name: 'Marca' });
    expect(marca).toHaveTextContent('<img src=x onerror="alert(1)">Costruttore');
    expect(marca).toHaveTextContent('Usa Termica <b>Demo</b>');
    expect(marca.querySelector('img, b')).toBeNull();
  });

  it('grandezza «other»: non viene presentata come sicuramente distinta', async () => {
    const { backend, home } = await world();
    backend.review.anthropicScript.push({
      kind: 'claims',
      claims: [
        { field: 'power', value: '24', documentIndex: 0, page: 2, excerpt: 'Potenza utile al riscaldamento 24 kW', measurement: { value: '24', unit: 'kW', quantityCode: 'useful_heating', quantityLabel: 'Potenza utile al riscaldamento' } },
        { field: 'power', value: '26', documentIndex: 0, page: 3, excerpt: 'Potenza 26 kW', measurement: { value: '26', unit: 'kW', quantityCode: 'other', quantityLabel: 'Potenza' } },
      ],
    });
    const app = await open(backend, `/home/${home.id}/attivita?view=analysis`);
    const progress = await startAi(app, home.id, /Manuale caldaia multipagina/);
    await waitFor(() => expect(progress).toHaveTextContent('Analisi completata'), { timeout: 3000 });
    await app.user.click(within(progress).getByRole('link', { name: 'Apri la scheda' }));
    const potenza = await screen.findByRole('article', { name: 'Potenza' });
    expect(potenza).toHaveTextContent('non è identificata con certezza');
    expect(within(potenza).queryByRole('radio', { name: /Conserva le due grandezze/ })).not.toBeInTheDocument();
    expect(within(potenza).getByRole('radio', { name: /Usa solo 26 kW — Potenza/ })).toBeInTheDocument();
  });

  it('scheda mista: badge per provider, proposte con il loro provider; scheda solo manuale senza etichette AI', async () => {
    const { backend, home } = await world();
    const app = await open(backend, `/home/${home.id}/attivita?analizza=1`);
    await app.user.click(await screen.findByRole('radio', { name: /Analisi di test — nessuna AI reale/ }));
    await app.user.click(await screen.findByRole('checkbox', { name: /Libretto A/ }));
    await app.user.click(screen.getByRole('button', { name: 'Avvia analisi di test' }));
    const p1 = await screen.findByRole('region', { name: 'Analisi avviata' });
    await waitFor(() => expect(p1).toHaveTextContent('Analisi completata'), { timeout: 3000 });
    const assetId = [...backend.review.assets.keys()][0]!;
    backend.review.anthropicScript.push({
      kind: 'claims',
      claims: [{ field: 'model', value: 'TD-24 Plus', documentIndex: 0, page: 3, excerpt: 'Modello TD-24 Plus' }],
    });
    const p2 = await startAi(app, home.id, /Manuale caldaia multipagina/, `&scheda=${assetId}`);
    await waitFor(() => expect(p2).toHaveTextContent('Analisi completata'), { timeout: 3000 });
    expect(backend.review.assets.size).toBe(1);
    await app.router.navigate(`/home/${home.id}/impianti/${assetId}`);
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Caldaia' });
    const header = h1.parentElement!;
    expect(within(header).getByText('Analisi di test — nessuna AI reale')).toBeInTheDocument();
    expect(within(header).getByText(/Analisi AI con Anthropic/)).toBeInTheDocument();
    const modelli = screen.getAllByRole('article', { name: 'Modello' });
    expect(modelli.some((m) => m.textContent?.includes('Analisi AI con Anthropic'))).toBe(true);
    expect(modelli.some((m) => m.textContent?.includes('Analisi di test — nessuna AI reale'))).toBe(true);
    const history = screen.getByRole('region', { name: 'Storia della scheda' });
    expect(await within(history).findByText('Analisi AI pubblicata')).toBeInTheDocument();
    expect(within(history).getByText('Analisi di test pubblicata')).toBeInTheDocument();

    await app.router.navigate(`/home/${home.id}/review`);
    await screen.findByRole('heading', { level: 1, name: 'Da rivedere' });
    expect(screen.getByText(/Dati proposti dai documenti da confermare/)).toBeInTheDocument();
    expect(screen.queryByText(/Proposte dell’analisi di test da confermare/)).toBeNull();
    expect(screen.getAllByRole('article').some((card) => card.textContent?.includes('Analisi AI con Anthropic'))).toBe(true);

    await app.router.navigate(`/home/${home.id}/attivita?view=analysis`);
    if (!(await screen.findByText('Strumenti ed esempi')).closest('details')?.open) await app.user.click(screen.getByText('Strumenti ed esempi'));
    await app.user.click(await screen.findByRole('button', { name: 'Crea una scheda caldaia a mano' }));
    await app.user.click(screen.getByRole('button', { name: 'Crea scheda' }));
    const manualH1 = await waitFor(() => {
      expect(app.router.state.location.pathname).not.toContain(assetId);
      return screen.getByRole('heading', { level: 1, name: 'Caldaia' });
    });
    expect(manualH1.parentElement).not.toHaveTextContent(/Analisi AI|Analisi di test/);
  });
});

describe('[mock] M4 — costi, errori di avvio, retry e idempotenza', () => {
  it('budget esaurito: 429 con messaggio, nessun job; capabilities rilette', async () => {
    const { backend, home } = await world();
    const app = await open(backend, `/home/${home.id}/attivita?analizza=1`);
    await app.user.click(await aiRadio());
    await app.user.click(screen.getByRole('checkbox', { name: /Manuale caldaia multipagina/ }));
    await app.user.click(screen.getByRole('checkbox', { name: CONSENT }));
    backend.review.budgetRemainingMicro = 100_000;
    const reads = backend.log.filter((r) => r.path.endsWith('analysis-capabilities')).length;
    await app.user.click(screen.getByRole('button', { name: 'Invia ad Anthropic e analizza' }));
    expect(await screen.findByText('Il limite di spesa per le analisi è stato raggiunto: nessuna nuova analisi AI può partire.')).toBeInTheDocument();
    expect(backend.review.jobs.size).toBe(0);
    await waitFor(() => expect(backend.log.filter((r) => r.path.endsWith('analysis-capabilities')).length).toBeGreaterThan(reads));
    await waitFor(() => expect(screen.getByLabelText('Limiti e costi dell’analisi')).toHaveTextContent('0.10 USD disponibili'));
  });

  it('provider disattivato dopo l’apertura del modulo: 503 esplicito, nessun fallback all’analisi di test', async () => {
    const { backend, home } = await world();
    const app = await open(backend, `/home/${home.id}/attivita?analizza=1`);
    await app.user.click(await aiRadio());
    await app.user.click(screen.getByRole('checkbox', { name: /Manuale caldaia multipagina/ }));
    await app.user.click(screen.getByRole('checkbox', { name: CONSENT }));
    backend.review.anthropic.enabled = false;
    await app.user.click(screen.getByRole('button', { name: 'Invia ad Anthropic e analizza' }));
    expect(await screen.findByText('Anthropic è disattivato su questo servizio: nessun dato è stato inviato.')).toBeInTheDocument();
    expect(backend.review.jobs.size).toBe(0);
  });

  it('costo incerto: mai zero; nuovo tentativo con nota sul costo precedente e nuovo consenso', async () => {
    const { backend, home } = await world();
    backend.review.anthropicScript.push({ kind: 'uncertain' });
    const app = await open(backend, `/home/${home.id}/attivita?view=analysis`);
    const progress = await startAi(app, home.id, /Manuale caldaia multipagina/);
    await waitFor(() => expect(progress).toHaveTextContent('Analisi non riuscita'), { timeout: 3000 });
    expect(progress).toHaveTextContent('Esito della richiesta ad Anthropic sconosciuto');
    expect(progress).toHaveTextContent('Costo incerto');
    expect(progress).not.toHaveTextContent(/0\.00 USD|0 USD/);
    await app.user.click(await screen.findByRole('button', { name: 'Nuovo tentativo' }));
    const panel = screen.getByRole('group', { name: 'Nuovo tentativo con Anthropic' });
    expect(panel).toHaveTextContent('può avere un nuovo costo');
    expect(panel).toHaveTextContent('Tentativo precedente: Costo incerto');
    const confirm = within(panel).getByRole('button', { name: 'Conferma nuovo tentativo' });
    expect(confirm).toBeDisabled();
    expect(backend.log.filter((r) => r.path.endsWith('/retry'))).toHaveLength(0);
    await app.user.click(within(panel).getByRole('checkbox', { name: CONSENT }));
    backend.review.anthropicScript.push(claims());
    await app.user.click(confirm);
    await waitFor(() => expect(backend.log.filter((r) => r.path.endsWith('/retry'))).toHaveLength(1));
    expect(backend.log.find((r) => r.path.endsWith('/retry'))!.body).toEqual({ consentToProviderTransfer: true });
    // La sezione del nuovo job sostituisce quella vecchia: si rilegge a ogni tentativo.
    await waitFor(() => expect(screen.getByRole('region', { name: 'Analisi avviata' })).toHaveTextContent('Analisi completata'), { timeout: 3000 });
  });

  it('risposta persa all’avvio: «Riprova avvio» con la stessa chiave, un solo job', async () => {
    const { backend, home } = await world();
    backend.review.anthropicScript.push(claims());
    const app = await open(backend, `/home/${home.id}/attivita?analizza=1`);
    await app.user.click(await aiRadio());
    await app.user.click(screen.getByRole('checkbox', { name: /Manuale caldaia multipagina/ }));
    await app.user.click(screen.getByRole('checkbox', { name: CONSENT }));
    app.control.dropNextResponse();
    await app.user.click(screen.getByRole('button', { name: 'Invia ad Anthropic e analizza' }));
    expect(await screen.findByText('Esito non confermato')).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Riprova avvio' }));
    await screen.findByRole('region', { name: 'Analisi avviata' });
    const [a, b] = jobPosts(backend);
    expect(a!.headers['idempotency-key']).toBe(b!.headers['idempotency-key']);
    expect(backend.review.jobs.size).toBe(1);
    expect(backend.review.budgetRemainingMicro).toBe(10_000_000 - 250_000);
  });

  it('capabilities aggiornate dopo l’esito: il budget disponibile scende del costo effettivo', async () => {
    const { backend, home } = await world();
    backend.review.anthropicScript.push(claims());
    const app = await open(backend, `/home/${home.id}/attivita?view=analysis`);
    const progress = await startAi(app, home.id, /Manuale caldaia multipagina/);
    await waitFor(() => expect(progress).toHaveTextContent('Analisi completata'), { timeout: 3000 });
    await app.router.navigate(`/home/${home.id}/attivita?analizza=1`);
    await app.user.click(await aiRadio());
    await waitFor(() => expect(screen.getByLabelText('Limiti e costi dell’analisi')).toHaveTextContent('9.9877 USD disponibili su 10.00 USD'));
  });
});
