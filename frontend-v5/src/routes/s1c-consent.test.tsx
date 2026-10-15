// Prove [mock] consenso e stati del provider economico reale. Il provider «reale» è SIMULATO da
// src/test/fakeEconomy.ts (realProvider): nessuna chiamata Anthropic, esiti e costi sintetici.
import { configure, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';

const PW = 'password-owner-001';
const MODEL = 'modello-simulato';

configure({ asyncUtilTimeout: 5000 });

async function world(opts: { real?: boolean; fixture?: boolean } = {}) {
  const backend = new FakeBackend();
  backend.economy.enabled = true;
  backend.economy.features.documentDrafts = true;
  backend.economy.jobSteps = 2;
  if (opts.real ?? true) backend.economy.realProvider = { model: MODEL };
  backend.economy.fixtureDisabled = !(opts.fixture ?? true);
  const owner = backend.seedAccount('Olga Owner', 'owner@example.test', PW);
  const home = backend.seedHome(owner.id, 'Casa Roma', 'Via Roma 1');
  const lake = backend.seedHome(owner.id, 'Casa Lago', 'Via Lago 2');
  const gas = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'gas.pdf' });
  const invoice = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'invoice.pdf' });
  await backend.seedDocument({ homeId: lake.id, uploaderId: owner.id, name: 'lago.pdf' });
  backend.economy.fixtureDocs.set(gas.id, 'gas');
  backend.economy.fixtureDocs.set(invoice.id, 'invoice');
  return { backend, owner, home, lake, gas, invoice };
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
type App = Awaited<ReturnType<typeof open>>;

const posts = (backend: FakeBackend, re: RegExp) => backend.log.filter((r) => r.method === 'POST' && re.test(r.path));
const fromDoc = (homeId: string) => `/home/${homeId}/spese/da-documento`;
const consentBox = (doc: string) => screen.getByRole('checkbox', { name: new RegExp(`Invia ad Anthropic il testo di «${doc.replace('.', '\\.')}»`) });
const realRadio = () => screen.getByRole('radio', { name: /Analisi con Anthropic/ });
const fixtureRadio = () => screen.getByRole('radio', { name: /Prova su PDF sintetici/ });
const sendButton = () => screen.getByRole('button', { name: 'Invia ad Anthropic e proponi i dati' });

/** Pagina «Da documento» con documento e provider reale scelti e consenso dato. */
async function chooseReal(app: App, homeId: string, doc: string) {
  await app.router.navigate(fromDoc(homeId));
  await app.user.click(await screen.findByRole('radio', { name: new RegExp(doc.replace('.', '\\.')) }));
  const radio = screen.queryByRole("radio", { name: /Analisi con Anthropic/ });
  if (radio) await app.user.click(radio); // con un solo provider la scelta è implicita
  await app.user.click(consentBox(doc));
}

async function startReal(app: App, homeId: string, doc: string) {
  await chooseReal(app, homeId, doc);
  await app.user.click(sendButton());
  await screen.findByRole('heading', { level: 1, name: 'Analisi del documento' });
}

describe('[mock] consenso provider reale — disponibilità e scelta', () => {
  it('provider reale disabilitato e nessun altro provider: nessun avvio possibile, motivo mostrato', async () => {
    const { backend, home } = await world({ real: false, fixture: false });
    await open(backend, fromDoc(home.id));
    expect(await screen.findByText('Nessun provider di analisi è disponibile ora.')).toBeInTheDocument();
    expect(screen.getByText(/Anthropic: non disponibile — Nuova campagna non abilitata/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Invia ad Anthropic|Avvia la prova/ })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(posts(backend, /document-analysis-jobs/)).toHaveLength(0);
  });

  it('documentDrafts spento: nessuna modalità reale anche se il provider risultasse abilitato', async () => {
    const { backend, home } = await world();
    backend.economy.features.documentDrafts = false;
    await open(backend, fromDoc(home.id));
    expect(await screen.findByText('Il servizio non propone ancora i dati dai documenti.')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Analisi con Anthropic/ })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('fixture e reale entrambi disponibili: nessun provider preselezionato, scelta esplicita, consenso non preselezionato con documento/provider/modello', async () => {
    const { backend, home } = await world();
    const app = await open(backend, fromDoc(home.id));
    await app.user.click(await screen.findByRole('radio', { name: /gas\.pdf/ }));
    expect(realRadio()).not.toBeChecked();
    expect(fixtureRadio()).not.toBeChecked();
    expect(screen.queryByRole('button', { name: /Invia ad Anthropic|Avvia la prova/ })).toBeNull();
    await app.user.click(realRadio());
    expect(screen.getByText(new RegExp(`Analisi con Anthropic · modello ${MODEL}`))).toBeInTheDocument();
    expect(consentBox('gas.pdf')).not.toBeChecked();
    expect(consentBox('gas.pdf')).toHaveAccessibleName(/per proporre i dati della spesa.*dovrò controllarle e confermarle/);
    expect(sendButton()).toBeDisabled();
    expect(posts(backend, /document-analysis-jobs/)).toHaveLength(0); // aprire e scegliere non avvia nulla
  });

  it('consenso azzerato al cambio di documento e di provider; la spunta della prova sintetica non vale come consenso reale', async () => {
    const { backend, home } = await world();
    const app = await open(backend, fromDoc(home.id));
    await chooseReal(app, home.id, 'gas.pdf');
    expect(consentBox('gas.pdf')).toBeChecked();
    expect(sendButton()).toBeEnabled();
    // Cambio documento.
    await app.user.click(screen.getByRole('radio', { name: /invoice\.pdf/ }));
    expect(consentBox('invoice.pdf')).not.toBeChecked();
    expect(sendButton()).toBeDisabled();
    // Ritorno al primo documento: il consenso precedente non torna.
    await app.user.click(screen.getByRole('radio', { name: /gas\.pdf/ }));
    expect(consentBox('gas.pdf')).not.toBeChecked();
    await app.user.click(consentBox('gas.pdf'));
    // Cambio provider: prova sintetica, presa d'atto, ritorno al reale.
    await app.user.click(fixtureRadio());
    const understood = screen.getByRole('checkbox', { name: /Voglio avviare la prova sintetica/ });
    expect(understood).not.toBeChecked();
    await app.user.click(understood);
    await app.user.click(realRadio());
    expect(consentBox('gas.pdf')).not.toBeChecked();
    expect(sendButton()).toBeDisabled();
    expect(posts(backend, /document-analysis-jobs/)).toHaveLength(0);
    // Nessuna traccia del consenso in URL o storage.
    expect(app.router.state.location.search).not.toMatch(/consent/i);
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/consent/i);
    expect(JSON.stringify({ ...sessionStorage })).not.toMatch(/consent/i);
  });

  it('prova sintetica con provider reale disponibile: body senza consenso al trasferimento', async () => {
    const { backend, home } = await world();
    const app = await open(backend, fromDoc(home.id));
    await app.user.click(await screen.findByRole('radio', { name: /gas\.pdf/ }));
    await app.user.click(fixtureRadio());
    await app.user.click(screen.getByRole('checkbox', { name: /Voglio avviare la prova sintetica/ }));
    await app.user.click(screen.getByRole('button', { name: 'Avvia la prova sintetica' }));
    await screen.findByRole('heading', { level: 1, name: 'Analisi del documento' });
    expect(posts(backend, /document-analysis-jobs$/)[0]!.body).toEqual({ documentId: expect.any(String), provider: 'test_fixture_v1' });
  });
});

describe('[mock] consenso provider reale — avvio, rifiuti ed esito ignoto', () => {
  it('avvio reale: body con consenso true, job con provider/modello, riserva e costo; il costo API non entra nelle spese', async () => {
    const { backend, home } = await world({ fixture: false });
    const app = await open(backend, `/home/${home.id}/spese`);
    await screen.findByRole('region', { name: /Tutte le famiglie/ });
    // Unico provider: nessuna scelta da fare, ma il consenso resta obbligatorio.
    await app.router.navigate(fromDoc(home.id));
    await app.user.click(await screen.findByRole('radio', { name: /invoice\.pdf/ }));
    expect(screen.queryByRole('radio', { name: /Analisi con Anthropic/ })).toBeNull();
    expect(sendButton()).toBeDisabled();
    await app.user.click(consentBox('invoice.pdf'));
    await app.user.click(sendButton());
    await screen.findByRole('heading', { level: 1, name: 'Analisi del documento' });
    const sent = posts(backend, /document-analysis-jobs$/);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.body).toEqual({ documentId: expect.any(String), provider: 'anthropic', consentToProviderTransfer: true });
    expect(screen.getByText(`Provider: Anthropic · modello ${MODEL}`)).toBeInTheDocument();
    const cost = screen.getByRole('group', { name: 'Costo dell’analisi' });
    expect(within(cost).getByText(/non una spesa della casa/)).toBeInTheDocument();
    expect(within(cost).getByText('Riserva massima: 0.050000 USD')).toBeInTheDocument();
    await app.user.click(await screen.findByRole('link', { name: 'Rivedi la proposta' }, { timeout: 8000 }));
    // Stato finale rilevato prima di lasciare la pagina: costo confermato.
    await app.router.navigate(app.router.state.location.pathname);
    await screen.findByRole('heading', { level: 1, name: 'Proposta da confermare' });
    const job = [...backend.economy.jobs.values()][0]!;
    expect(job.billing).toMatchObject({ state: 'settled', actualUsd: '0.012345' });
    await app.user.click(screen.getByRole('button', { name: /Usa la data del documento/ }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma e registra il costo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Fattura riparazione rubinetto' })).toBeInTheDocument();
    expect([...backend.expenses.items.values()].map((e) => e.amountCents)).toEqual([12200]); // solo l'importo del documento
    await app.user.click(screen.getByRole('link', { name: '← Spese' }));
    const totals = await screen.findByRole('region', { name: /Tutte le famiglie/ });
    await waitFor(() => expect(totals).toHaveTextContent('122,00 €'));
    expect(document.body.textContent).not.toMatch(/USD|0[.,]012345|0[.,]05/);
  });

  it('pagina del job: costo effettivo confermato mostrato quando presente', async () => {
    const { backend, home } = await world({ fixture: false });
    const app = await open(backend, `/home/${home.id}/spese`);
    await startReal(app, home.id, 'gas.pdf');
    expect(await screen.findByRole('link', { name: 'Rivedi la proposta' }, { timeout: 8000 })).toBeInTheDocument();
    const cost = screen.getByRole('group', { name: 'Costo dell’analisi' });
    expect(within(cost).getByText('Costo effettivo: 0.012345 USD')).toBeInTheDocument();
    expect(within(cost).getByText('Stato: Costo dell’analisi confermato')).toBeInTheDocument();
  });

  it.each([
    ['ai_budget_exhausted', /budget previsto per le analisi è esaurito/],
    ['ai_evaluation_limit_reached', /numero massimo di analisi previste/],
    ['provider_rate_limited', /limitato le richieste/],
    ['ai_model_unavailable', /modello previsto non è disponibile/],
    ['provider_auth_failed', /non è riuscito ad autenticarsi/],
    ['ai_provider_unconfigured', /non è configurato/],
  ])('rifiuto definito %s: messaggio chiaro, non «esito ignoto», nessun job e consenso azzerato', async (code, text) => {
    const { backend, home } = await world();
    backend.economy.rejectNextRealWith = code;
    const app = await open(backend, fromDoc(home.id));
    await chooseReal(app, home.id, 'gas.pdf');
    await app.user.click(sendButton());
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.queryByText('Esito non confermato')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Riprova invio' })).toBeNull();
    expect(backend.economy.jobs.size).toBe(0);
    expect(consentBox('gas.pdf')).not.toBeChecked();
    expect(sendButton()).toBeDisabled();
    expect(app.router.state.location.pathname).toBe(fromDoc(home.id));
  });

  it('provider disabilitato dal servizio dopo il caricamento: ai_provider_disabled chiaro, nessun fallback alla prova sintetica', async () => {
    const { backend, home } = await world();
    const app = await open(backend, fromDoc(home.id));
    await chooseReal(app, home.id, 'gas.pdf');
    backend.economy.realProvider = null;
    await app.user.click(sendButton());
    expect(await screen.findByText(/non è abilitata: nessun testo è stato inviato/)).toBeInTheDocument();
    const sent = posts(backend, /document-analysis-jobs$/);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.body).toMatchObject({ provider: 'anthropic' });
    expect(backend.economy.jobs.size).toBe(0);
  });

  it('risposta persa all’avvio: stessa chiave, stesso body e consenso conservato; nessuna ripetizione automatica; un solo job', async () => {
    const { backend, home } = await world();
    const app = await open(backend, fromDoc(home.id));
    await chooseReal(app, home.id, 'gas.pdf');
    app.control.dropNextResponse();
    await app.user.click(sendButton());
    expect(await screen.findByText('Esito non confermato')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invia ad Anthropic e proponi i dati' })).toBeNull();
    expect(consentBox('gas.pdf')).toBeChecked();
    expect(consentBox('gas.pdf')).toBeDisabled();
    expect(screen.getByRole('radio', { name: /invoice\.pdf/ })).toBeDisabled(); // richiesta già spedita: scelte bloccate
    await new Promise((r) => setTimeout(r, 300));
    expect(posts(backend, /document-analysis-jobs$/)).toHaveLength(1);
    await app.user.click(screen.getByRole('button', { name: 'Riprova invio' }));
    await screen.findByRole('heading', { level: 1, name: 'Analisi del documento' });
    const sent = posts(backend, /document-analysis-jobs$/);
    expect(sent).toHaveLength(2);
    expect(sent[1]!.headers['idempotency-key']).toBe(sent[0]!.headers['idempotency-key']);
    expect(sent[1]!.body).toEqual(sent[0]!.body);
    expect(sent[1]!.body).toMatchObject({ consentToProviderTransfer: true });
    expect(backend.economy.jobs.size).toBe(1);
    expect(app.router.state.location.pathname).toContain([...backend.economy.jobs.keys()][0]!);
  });
});

describe('[mock] consenso provider reale — stato del job e nuovo tentativo', () => {
  it('nuovo tentativo reale: dialogo con avviso di costo, consenso nuovo, body corretto e navigazione al NUOVO job', async () => {
    const { backend, home } = await world();
    backend.economy.failNextJobWith = 'provider_rate_limited';
    const app = await open(backend, `/home/${home.id}/spese`);
    await startReal(app, home.id, 'gas.pdf');
    const oldId = [...backend.economy.jobs.keys()][0]!;
    expect(await screen.findByText(/limitato le richieste/, undefined, { timeout: 8000 })).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Riprova l’analisi' }));
    const dialog = screen.getByRole('dialog', { name: 'Nuova analisi del documento' });
    expect(dialog).toHaveTextContent(/nuova analisi.*inviato di nuovo ad Anthropic.*nuovo costo/);
    const consent = within(dialog).getByRole('checkbox', { name: /Invia di nuovo il testo del documento/ });
    expect(consent).not.toBeChecked(); // il consenso dell'avvio non vale per il nuovo tentativo
    expect(within(dialog).getByRole('button', { name: 'Avvia la nuova analisi' })).toBeDisabled();
    expect(posts(backend, /retries$/)).toHaveLength(0);
    await app.user.click(consent);
    await app.user.click(within(dialog).getByRole('button', { name: 'Avvia la nuova analisi' }));
    await waitFor(() => expect(backend.economy.jobs.size).toBe(2));
    const newId = [...backend.economy.jobs.keys()].find((k) => k !== oldId)!;
    await waitFor(() => expect(app.router.state.location.pathname).toContain(newId));
    const r = posts(backend, /retries$/);
    expect(r).toHaveLength(1);
    expect(r[0]!.path).toContain(oldId);
    expect(r[0]!.body).toEqual({ expectedVersion: expect.any(Number), consentToProviderTransfer: true });
    expect(backend.economy.jobs.get(oldId)!.state).toBe('failed'); // il vecchio job non viene riletto né riusato
    expect(await screen.findByRole('link', { name: 'Rivedi la proposta' }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('nuovo tentativo con risposta persa: «Riprova invio» con stessa chiave/body e navigazione al nuovo job', async () => {
    const { backend, home } = await world();
    backend.economy.failNextJobWith = 'analysis_timeout';
    const app = await open(backend, `/home/${home.id}/spese`);
    await startReal(app, home.id, 'gas.pdf');
    const oldId = [...backend.economy.jobs.keys()][0]!;
    await app.user.click(await screen.findByRole('button', { name: 'Riprova l’analisi' }, { timeout: 8000 }));
    const dialog = screen.getByRole('dialog');
    await app.user.click(within(dialog).getByRole('checkbox'));
    app.control.dropNextResponse();
    await app.user.click(within(dialog).getByRole('button', { name: 'Avvia la nuova analisi' }));
    expect(await within(dialog).findByText('Esito non confermato')).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox')).toBeChecked();
    expect(app.router.state.location.pathname).toContain(oldId);
    await app.user.click(within(dialog).getByRole('button', { name: 'Riprova invio' }));
    await waitFor(() => expect(app.router.state.location.pathname).not.toContain(oldId));
    const r = posts(backend, /retries$/);
    expect(r).toHaveLength(2);
    expect(r[1]!.headers['idempotency-key']).toBe(r[0]!.headers['idempotency-key']);
    expect(r[1]!.body).toEqual(r[0]!.body);
    expect(backend.economy.jobs.size).toBe(2); // idempotenza: un solo nuovo job
    const newId = [...backend.economy.jobs.keys()].find((k) => k !== oldId)!;
    expect(app.router.state.location.pathname).toContain(newId);
  });

  it('esito incerto: costo non confermato (non zero, non rimborso) e nessun nuovo tentativo proposto', async () => {
    const { backend, home } = await world();
    backend.economy.failNextJobWith = 'analysis_outcome_unknown';
    const app = await open(backend, `/home/${home.id}/spese`);
    await startReal(app, home.id, 'gas.pdf');
    expect(await screen.findByText(/Non sappiamo se il provider abbia elaborato il documento/, undefined, { timeout: 8000 })).toBeInTheDocument();
    const cost = screen.getByRole('group', { name: 'Costo dell’analisi' });
    expect(within(cost).getByText('Stato: Costo non ancora confermato: non significa zero né rimborso')).toBeInTheDocument();
    expect(within(cost).getByText('Costo effettivo: non ancora confermato')).toBeInTheDocument();
    expect(within(cost).getByText('Riserva massima: 0.050000 USD')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riprova l’analisi' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Inserisci il costo a mano' })).toBeInTheDocument();
  });

  it('timeout con fatturazione incerta: non propone un secondo invio a pagamento', async () => {
    const { backend, home } = await world();
    backend.economy.failNextJobWith = 'analysis_timeout';
    const handle = backend.handle.bind(backend);
    backend.handle = async (request) => {
      const response = await handle(request);
      if (request.method === 'GET' && /document-analysis-jobs\//.test(request.path)) {
        const body = response.body as { job?: { state: string; billing: { currency: 'USD'; maxReservedUsd: string; actualUsd: string | null; state: 'uncertain' } } };
        if (body.job?.state === 'failed') body.job.billing = { currency: 'USD', maxReservedUsd: '0.250000', actualUsd: null, state: 'uncertain' };
      }
      return response;
    };
    const app = await open(backend, `/home/${home.id}/spese`);
    await startReal(app, home.id, 'gas.pdf');
    expect(await screen.findByText('Stato: Costo non ancora confermato: non significa zero né rimborso', undefined, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riprova l’analisi' })).toBeNull();
    expect(posts(backend, /retries$/)).toHaveLength(0);
  });

  it.each(['ai_budget_exhausted', 'ai_evaluation_limit_reached', 'provider_auth_failed', 'ai_model_unavailable', 'access_revoked'])(
    'job fallito con %s: nessun nuovo tentativo proposto',
    async (code) => {
      const { backend, home } = await world();
      backend.economy.failNextJobWith = code;
      const app = await open(backend, `/home/${home.id}/spese`);
      await startReal(app, home.id, 'gas.pdf');
      expect(await screen.findByRole('heading', { name: 'Analisi non riuscita' }, { timeout: 8000 })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Riprova l’analisi' })).toBeNull();
    },
  );

  it('prova sintetica: il nuovo tentativo crea un nuovo job, senza consenso al trasferimento', async () => {
    const { backend, home } = await world({ real: false });
    backend.economy.failNextJobWith = 'analysis_timeout';
    const app = await open(backend, fromDoc(home.id));
    await app.user.click(await screen.findByRole('radio', { name: /gas\.pdf/ }));
    await app.user.click(screen.getByRole('checkbox', { name: /Voglio avviare la prova sintetica/ }));
    await app.user.click(screen.getByRole('button', { name: 'Avvia la prova sintetica' }));
    const oldId = await waitFor(() => [...backend.economy.jobs.keys()][0]!);
    await app.user.click(await screen.findByRole('button', { name: 'Riprova l’analisi' }, { timeout: 8000 }));
    await waitFor(() => expect(app.router.state.location.pathname).not.toContain(oldId));
    expect(posts(backend, /retries$/)[0]!.body).toEqual({ expectedVersion: expect.any(Number) });
    expect(backend.economy.jobs.size).toBe(2);
  });

  it('lettura del job fallita: errore di lettura, nessun nuovo job creato', async () => {
    const { backend, home } = await world();
    const app = await open(backend, `/home/${home.id}/spese`);
    await startReal(app, home.id, 'gas.pdf');
    const handle = backend.handle.bind(backend);
    backend.handle = async (request) => {
      if (request.method === 'GET' && /document-analysis-jobs\//.test(request.path)) return { status: 503 };
      return handle(request);
    };
    expect(await screen.findByText(/Ultimo aggiornamento non riuscito/, undefined, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riprova l’analisi' })).toBeNull();
    expect(posts(backend, /retries$/)).toHaveLength(0);
    expect(posts(backend, /document-analysis-jobs$/)).toHaveLength(1);
  });
});

describe('[mock] consenso provider reale — account e casa', () => {
  it('cambio casa: il consenso non passa all’altra casa', async () => {
    const { backend, home, lake } = await world();
    const app = await open(backend, fromDoc(home.id));
    await chooseReal(app, home.id, 'gas.pdf');
    expect(consentBox('gas.pdf')).toBeChecked();
    await app.router.navigate(fromDoc(lake.id));
    await app.user.click(await screen.findByRole('radio', { name: /lago\.pdf/ }));
    await app.user.click(realRadio());
    expect(consentBox('lago.pdf')).not.toBeChecked();
  });

  it('logout e nuovo accesso: consenso e scelte non sopravvivono', async () => {
    const { backend, home } = await world();
    const app = await open(backend, fromDoc(home.id));
    await chooseReal(app, home.id, 'gas.pdf');
    await app.user.click(screen.getAllByRole('button', { name: /Esci/ })[0]!);
    await screen.findByRole('heading', { name: 'Accedi' });
    await app.user.type(screen.getByLabelText('Email'), 'owner@example.test');
    await app.user.type(screen.getByLabelText('Password'), PW);
    await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
    await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
    await app.router.navigate(fromDoc(home.id));
    await screen.findByRole('heading', { level: 1, name: 'Spesa da documento' }, { timeout: 10000 });
    // Sotto carico (suite completa) la lista documenti dopo un nuovo accesso arriva più lentamente.
    await app.user.click(await screen.findByRole('radio', { name: /gas\.pdf/ }, { timeout: 10000 }));
    expect(realRadio()).not.toBeChecked();
    await app.user.click(realRadio());
    expect(consentBox('gas.pdf')).not.toBeChecked();
    expect(posts(backend, /document-analysis-jobs/)).toHaveLength(0);
  });
});
