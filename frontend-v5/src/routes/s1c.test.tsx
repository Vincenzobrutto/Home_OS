// Prove [mock] S1c: backend SIMULATO (src/test/fakeEconomy.ts, fixture dichiarata), non il backend reale.
// Nessuna chiamata a provider esterni: il simulatore riconosce solo documenti marcati come fixture.
import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';

const PW = { owner: 'password-owner-001', other: 'password-other-001' };

// Le pagine S1c leggono capabilities, bozza, candidati, oggetti e lavori: sotto carico serve più di 1 s.
configure({ asyncUtilTimeout: 5000 });

async function world() {
  const backend = new FakeBackend();
  backend.economy.enabled = true;
  backend.economy.features.documentDrafts = true;
  backend.economy.jobSteps = 2;
  const owner = backend.seedAccount('Olga Owner', 'owner@example.test', PW.owner);
  backend.seedAccount('Ugo Esterno', 'other@example.test', PW.other);
  const home = backend.seedHome(owner.id, 'Casa Roma', 'Via Roma 1');
  const gas = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'gas.pdf' });
  const invoice = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'invoice.pdf' });
  const other = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Bolletta vera.pdf' });
  backend.economy.fixtureDocs.set(gas.id, 'gas');
  backend.economy.fixtureDocs.set(invoice.id, 'invoice');
  return { backend, owner, home, gas, invoice, other };
}

async function open(backend: FakeBackend, email: string, password: string, path: string) {
  const app = renderApp({ path: '/accedi', backend });
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), email);
  await app.user.type(screen.getByLabelText('Password'), password);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
  await app.router.navigate(path);
  return app;
}

const posts = (backend: FakeBackend, re: RegExp) => backend.log.filter((r) => r.method === 'POST' && re.test(r.path));
const gets = (backend: FakeBackend, re: RegExp) => backend.log.filter((r) => r.method === 'GET' && re.test(r.path));
type App = Awaited<ReturnType<typeof open>>;

/** Dal percorso «Da documento» fino alla bozza, con avvio esplicito della prova sintetica. */
async function startFixture(app: App, homeId: string, docName: string) {
  await app.router.navigate(`/home/${homeId}/spese/da-documento`);
  const radio = await screen.findByRole('radio', { name: new RegExp(docName.replace('.', '\\.')) });
  await app.user.click(radio);
  await app.user.click(screen.getByRole('checkbox', { name: /Voglio avviare la prova sintetica/ }));
  await app.user.click(screen.getByRole('button', { name: 'Avvia la prova sintetica' }));
}

async function toDraft(app: App, homeId: string, docName: string) {
  await startFixture(app, homeId, docName);
  await app.user.click(await screen.findByRole('link', { name: 'Rivedi la proposta' }, { timeout: 8000 }));
  await screen.findByRole('heading', { level: 1, name: 'Proposta da confermare' });
}

describe('[mock] S1c — avvio esplicito e job', () => {
  it('capabilities e provider distinti: prova sintetica dichiarata, Anthropic disabilitato, avvio solo dopo scelta esplicita', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese/da-documento`);
    expect(await screen.findByText('Prova su PDF sintetici · nessun modello AI')).toBeInTheDocument();
    expect(screen.getByText(/Anthropic: L’analisi non è disponibile al momento/)).toBeInTheDocument();
    expect(screen.queryByText(/Nuova campagna non abilitata|ai_provider_disabled/)).toBeNull();
    const start = screen.getByRole('button', { name: 'Avvia la prova sintetica' });
    expect(start).toBeDisabled();
    await app.user.click(await screen.findByRole('radio', { name: /gas\.pdf/ }));
    expect(start).toBeDisabled();
    expect(screen.getByRole('link', { name: /Inserisci il costo a mano con «gas\.pdf»/ })).toBeInTheDocument();
    // Aprire la pagina e scegliere il documento non avvia nulla.
    expect(posts(backend, /document-analysis-jobs/)).toHaveLength(0);
    await app.user.click(screen.getByRole('checkbox', { name: /Voglio avviare la prova sintetica/ }));
    await app.user.click(start);
    await screen.findByRole('heading', { level: 1, name: 'Analisi del documento' });
    const sent = posts(backend, /document-analysis-jobs$/);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.body).toEqual({ documentId: expect.any(String), provider: 'test_fixture_v1' });
    expect(sent[0]!.headers['idempotency-key']).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
  });

  it('polling fino a uno stato finale; riaprendo la rotta del job si legge senza un nuovo POST', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await startFixture(app, home.id, 'gas.pdf');
    expect(await screen.findByRole('link', { name: 'Rivedi la proposta' }, { timeout: 8000 })).toBeInTheDocument();
    const jobUrl = app.router.state.location.pathname;
    const readsAtEnd = gets(backend, /document-analysis-jobs\//).length;
    await new Promise((r) => setTimeout(r, 1800));
    expect(gets(backend, /document-analysis-jobs\//).length).toBe(readsAtEnd); // polling fermo a stato terminale
    await app.router.navigate(`/home/${home.id}/spese`);
    await app.router.navigate(jobUrl);
    expect(await screen.findByRole('link', { name: 'Rivedi la proposta' })).toBeInTheDocument();
    expect(posts(backend, /document-analysis-jobs/)).toHaveLength(1);
  });

  it('documento non fixture: esito «fallito» chiaro, nessun «Riprova» inutile, manuale disponibile', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await startFixture(app, home.id, 'Bolletta vera.pdf');
    expect(await screen.findByText(/solo per i PDF sintetici indicati/, undefined, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riprova l’analisi' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inserisci il costo a mano' })).toHaveAttribute('href', expect.stringContaining('documentId='));
    expect(backend.economy.drafts.size).toBe(0);
  });

  it('retry solo su fallito transitorio, esplicito e con expectedVersion', async () => {
    const { backend, home } = await world();
    backend.economy.failNextJobWith = 'analysis_timeout';
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await startFixture(app, home.id, 'gas.pdf');
    const retry = await screen.findByRole('button', { name: 'Riprova l’analisi' }, { timeout: 8000 });
    expect(posts(backend, /retries$/)).toHaveLength(0);
    await app.user.click(retry);
    expect(await screen.findByRole('link', { name: 'Rivedi la proposta' }, { timeout: 8000 })).toBeInTheDocument();
    const r = posts(backend, /retries$/);
    expect(r).toHaveLength(1);
    expect(r[0]!.body).toEqual({ expectedVersion: expect.any(Number) });
  });
});

describe('[mock] S1c — revisione, importi e conferma', () => {
  it('bolletta con arretrati: nessuna preselezione, fonti visibili, nessuna somma; importo modificato diventa manuale', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await toDraft(app, home.id, 'gas.pdf');
    const choices = screen.getByRole('group', { name: 'Quale importo registri?' });
    const radios = within(choices).getAllByRole('radio');
    expect(radios).toHaveLength(4);
    radios.forEach((r) => expect(r).not.toBeChecked());
    expect(within(choices).getAllByText(/Arretrati o saldo precedente/).length).toBeGreaterThan(0);
    expect(within(choices).getAllByText(/Importo da pagare/).length).toBeGreaterThan(0);
    expect(within(choices).getByText(/Fonte: pagina 1 · «Totale corrente bolletta: 80,00 EUR»/)).toBeInTheDocument();
    expect(screen.queryByText(/120,00/)).toBeNull();
    // Conferma senza scelta: errore, nessun invio.
    fireEvent.change(screen.getByLabelText('Data di riferimento'), { target: { value: '2026-09-30' } });
    await app.user.click(screen.getByRole('button', { name: 'Conferma e registra il costo' }));
    expect(await screen.findByText(/Scegli quale importo registrare/)).toBeInTheDocument();
    expect(posts(backend, /\/confirm$/)).toHaveLength(0);
    await app.user.click(within(choices).getByRole('radio', { name: /80,00 €/ }));
    const amount = screen.getByLabelText('Importo in euro');
    expect(amount).toHaveValue('80,00');
    await app.user.clear(amount);
    await app.user.type(amount, '85');
    expect(within(choices).getByRole('radio', { name: 'Inserisco un importo diverso' })).toBeChecked();
    await app.user.click(screen.getByRole('button', { name: 'Conferma e registra il costo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Bolletta gas settembre' })).toBeInTheDocument();
    const body = posts(backend, /\/confirm$/)[0]!.body as { mode: string; values: Record<string, unknown>; amountSelection: unknown };
    expect(body.mode).toBe('create');
    expect(body.amountSelection).toEqual({ mode: 'manual' });
    expect(body.values).toMatchObject({ amountCents: 8500, spentOn: '2026-09-30', category: 'gas', supplier: 'Gas Demo', documentNumber: 'G-2026-09', competenceFrom: '2026-09-01', competenceTo: '2026-09-30', dueOn: '2026-10-20' });
    expect(body.values).not.toHaveProperty('documentId');
    expect(screen.getByText('Dichiarato da te')).toBeInTheDocument();
    expect(posts(backend, /\/economy\/expenses$/)).toHaveLength(0); // mai createExpense separato
  });

  it('fattura: lordo preselezionato perché il server non chiede scelta; imponibile e IVA distinti; un solo costo e dashboard aggiornata', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await screen.findByRole('region', { name: /Tutte le famiglie/ });
    await toDraft(app, home.id, 'invoice.pdf');
    const choices = screen.getByRole('group', { name: 'Quale importo registri?' });
    expect(within(choices).getByRole('radio', { name: /122,00 € · Totale del documento/ })).toBeChecked();
    expect(within(choices).getAllByText(/Imponibile/).length).toBeGreaterThan(0);
    expect(within(choices).getByText(/Imposta/)).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: /Usa la data del documento/ }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma e registra il costo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Fattura riparazione rubinetto' })).toBeInTheDocument();
    expect(posts(backend, /\/confirm$/)[0]!.body).toMatchObject({ amountSelection: { mode: 'candidate', candidateId: 'gross' }, values: { amountCents: 12200, spentOn: '2026-09-30' } });
    expect(screen.getByText('Proposto da un documento e confermato da te')).toBeInTheDocument();
    expect(backend.expenses.items.size).toBe(1);
    await app.user.click(screen.getByRole('link', { name: '← Spese' }));
    await waitFor(() => expect(screen.getByRole('region', { name: /Tutte le famiglie/ })).toHaveTextContent('122,00 €'));
  });

  it('possibile costo esistente: motivi mostrati, link_existing con expectedExpenseVersion, importo invariato e nessun nuovo costo', async () => {
    const { backend, owner, home } = await world();
    await backend.economy.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body: { title: 'Gas settembre', amountCents: 8000, spentOn: '2026-09-30', category: 'gas', supplier: 'Gas Demo', documentNumber: 'G-2026-09' } }, owner.id, home.id, 'expenses');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await toDraft(app, home.id, 'gas.pdf');
    const list = await screen.findByRole('list', { name: 'Costi simili' });
    expect(within(list).getByText(/stesso numero di documento e fornitore, stesso importo e data/)).toBeInTheDocument();
    await app.user.click(within(list).getByRole('button', { name: 'Collega al costo esistente' }));
    await app.user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Collega il documento a questo costo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Gas settembre' })).toBeInTheDocument();
    expect(posts(backend, /\/confirm$/)[0]!.body).toEqual({ expectedVersion: expect.any(Number), mode: 'link_existing', expenseId: expect.any(String), expectedExpenseVersion: 1 });
    expect(backend.expenses.items.size).toBe(1);
    expect([...backend.expenses.items.values()][0]!.amountCents).toBe(8000);
    expect(screen.getByRole('link', { name: 'gas.pdf' })).toBeInTheDocument();
  });

  it('costo con documento diverso: 409 senza sostituzione silenziosa', async () => {
    const { backend, owner, home, other } = await world();
    await backend.economy.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body: { title: 'Gas settembre', amountCents: 8000, spentOn: '2026-09-30', documentId: other.id } }, owner.id, home.id, 'expenses');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await toDraft(app, home.id, 'gas.pdf');
    const list = await screen.findByRole('list', { name: 'Costi simili' });
    await app.user.click(within(list).getByRole('button', { name: 'Collega al costo esistente' }));
    await app.user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Collega il documento a questo costo' }));
    expect(await screen.findByText(/ha già un documento diverso collegato/)).toBeInTheDocument();
    expect([...backend.expenses.items.values()][0]!.documentId).toBe(other.id);
  });

  it('risposta persa alla conferma: stessa chiave e stesso body alla riprova, un solo costo', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await toDraft(app, home.id, 'invoice.pdf');
    await app.user.click(screen.getByRole('button', { name: /Usa la data del documento/ }));
    app.control.dropNextResponse();
    await app.user.click(screen.getByRole('button', { name: 'Conferma e registra il costo' }));
    expect(await screen.findByText('Esito non confermato')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conferma e registra il costo' })).not.toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Riprova invio' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Fattura riparazione rubinetto' })).toBeInTheDocument();
    const sent = posts(backend, /\/confirm$/);
    expect(sent).toHaveLength(2);
    expect(sent[0]!.headers['idempotency-key']).toBe(sent[1]!.headers['idempotency-key']);
    expect(sent[0]!.body).toEqual(sent[1]!.body);
    expect(backend.expenses.items.size).toBe(1);
  });

  it('CAS: bozza cambiata in un’altra scheda → 409 con rilettura, nessun costo', async () => {
    const { backend, owner, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await toDraft(app, home.id, 'invoice.pdf');
    const draft = [...backend.economy.drafts.values()][0]!;
    await backend.economy.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body: { expectedVersion: draft.version } }, owner.id, home.id, `drafts/${draft.id}/park`);
    await app.user.click(screen.getByRole('button', { name: /Usa la data del documento/ }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma e registra il costo' }));
    expect(await screen.findByText(/Lo stato della bozza è cambiato/)).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Rileggi i dati' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Proposta accantonata' })).toBeInTheDocument();
    expect(backend.expenses.items.size).toBe(0);
  });
});

describe('[mock] S1c — accantonate, privacy e fonti', () => {
  it('accantona avvisa che le modifiche non sono salvate; riprendi riapre; confermata fuori dalle aperte e porta al costo', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await toDraft(app, home.id, 'invoice.pdf');
    await app.user.type(screen.getByLabelText('Nota (facoltativa)'), 'nota non salvata');
    await app.user.click(screen.getByRole('button', { name: 'Accantona' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/non vengono salvate/)).toBeInTheDocument();
    await app.user.click(within(dialog).getByRole('button', { name: 'Accantona senza salvare le modifiche' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Proposta accantonata' })).toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/spese/bozze?stato=parked`);
    await app.user.click(within(await screen.findByRole('list', { name: 'Bozze' })).getByRole('link', { name: 'invoice.pdf' }));
    await app.user.click(await screen.findByRole('button', { name: 'Riprendi la bozza' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Proposta da confermare' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nota (facoltativa)')).toHaveValue(''); // nessun autosalvataggio promesso
    await app.user.click(screen.getByRole('button', { name: /Usa la data del documento/ }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma e registra il costo' }));
    await screen.findByRole('heading', { level: 1, name: 'Fattura riparazione rubinetto' });
    await app.router.navigate(`/home/${home.id}/spese/bozze`);
    expect(await screen.findByText('Nessuna bozza da confermare.')).toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/spese/bozze?stato=confirmed`);
    await app.user.click(within(await screen.findByRole('list', { name: 'Bozze' })).getByRole('link', { name: 'invoice.pdf' }));
    expect(await screen.findByRole('link', { name: /Apri il costo «Fattura riparazione rubinetto»/ })).toBeInTheDocument();
  });

  it('originale revocato: niente fonti né conferma; il costo resta un’azione manuale', async () => {
    const { backend, home, invoice } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await toDraft(app, home.id, 'invoice.pdf');
    const url = app.router.state.location.pathname;
    backend.economy.revokedDocs.add(invoice.id);
    await app.router.navigate(`/home/${home.id}/spese/bozze`);
    await screen.findByRole('heading', { level: 1, name: 'Bozze da documento' });
    await app.router.navigate(url);
    expect(await screen.findByText(/L’originale non è più disponibile per il tuo account/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Fonte: pagina/)).toBeNull());
    expect(screen.getByRole('button', { name: 'Conferma e registra il costo' })).toBeDisabled();
  });

  it('logout: bozze, job e form privati non restano in cache per l’account successivo', async () => {
    const { backend, owner, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await toDraft(app, home.id, 'gas.pdf');
    const cached = () => app.queryClient.getQueryCache().getAll().filter((q) => q.queryKey[1] === owner.id && (q.queryKey.includes('drafts') || q.queryKey.includes('jobs')));
    expect(cached().length).toBeGreaterThan(0);
    await app.user.click(screen.getAllByRole('button', { name: /Esci/ })[0]!);
    await screen.findByRole('heading', { name: 'Accedi' });
    expect(cached()).toHaveLength(0);
    expect(screen.queryByText(/Bolletta gas settembre/)).toBeNull();
  });

  it('risposta di conferma dopo logout: nessuna navigazione privata tardiva', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await toDraft(app, home.id, 'invoice.pdf');
    await app.user.click(screen.getByRole('button', { name: /Usa la data del documento/ }));
    let release!: () => void;
    const delayed = new Promise<void>((resolve) => { release = resolve; });
    const handle = backend.handle.bind(backend);
    backend.handle = async (request) => {
      const result = await handle(request);
      if (request.method === 'POST' && /\/confirm$/.test(request.path)) await delayed;
      return result;
    };
    await app.user.click(screen.getByRole('button', { name: 'Conferma e registra il costo' }));
    await waitFor(() => expect(posts(backend, /\/confirm$/)).toHaveLength(1));
    await app.user.click(screen.getByRole('button', { name: /Esci dall/ }));
    await screen.findByRole('heading', { name: 'Accedi' });
    release();
    await waitFor(() => expect(app.queryClient.isMutating()).toBe(0));
    expect(app.router.state.location.pathname).toBe('/accedi');
    expect(app.router.state.location.search).not.toContain('next');
    expect(screen.queryByText('Fattura riparazione rubinetto')).toBeNull();
  });

  it('bozza di un altro account: 403 generico, nessun dato mostrato', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await toDraft(app, home.id, 'gas.pdf');
    const url = app.router.state.location.pathname;
    const draft = [...backend.economy.drafts.values()][0]!;
    draft.accountId = 'altro-account';
    await app.router.navigate(`/home/${home.id}/spese/bozze`);
    await screen.findByRole('heading', { level: 1, name: 'Bozze da documento' });
    await app.router.navigate(url);
    expect(await screen.findByText(/Non hai accesso a questa bozza/)).toBeInTheDocument();
    expect(screen.queryByText(/Fonte: pagina/)).toBeNull();
  });
});
