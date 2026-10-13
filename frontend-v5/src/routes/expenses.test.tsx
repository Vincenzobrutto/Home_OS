// H3a expenses-v1 con backend SIMULATO e orologio controllato (fake.today): nessuna
// prova di API/DB reali (vedi tests/integration/expenses.int.test.ts).
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';
import type { renderApp as RenderApp } from '../test/harness';

type App = ReturnType<typeof RenderApp>;
const PW = { owner: 'password-owner-001', member: 'password-member-01', viewer: 'password-viewer-01', other: 'password-other-001' };

function world() {
  const backend = new FakeBackend();
  const owner = backend.seedAccount('Olga Owner', 'owner@example.test', PW.owner);
  const member = backend.seedAccount('Mario Member', 'member@example.test', PW.member);
  const viewer = backend.seedAccount('Vera Viewer', 'viewer@example.test', PW.viewer);
  const other = backend.seedAccount('Ugo Esterno', 'other@example.test', PW.other);
  const home = backend.seedHome(owner.id, 'Casa Roma', 'Via Roma 1');
  const second = backend.seedHome(owner.id, 'Casa Lago', 'Via Lago 2');
  backend.addMember(member.id, home.id, 'member');
  backend.addMember(viewer.id, home.id, 'viewer');
  const otherHome = backend.seedHome(other.id, 'Casa di Ugo', 'Via Ugo 3');
  const boiler = backend.review.seedBoiler(owner.id, home.id, 'Caldaia cucina');
  return { backend, owner, member, viewer, other, home, second, otherHome, boiler };
}

async function open(backend: FakeBackend, email: string, password: string, path: string) {
  const app = renderApp({ path: '/accedi', backend });
  await login(app, email, password);
  await app.router.navigate(path);
  return app;
}

async function login(app: App, email: string, password: string) {
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), email);
  await app.user.type(screen.getByLabelText('Password'), password);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
}

const posts = (backend: FakeBackend, re: RegExp) => backend.log.filter((r) => r.method === 'POST' && re.test(r.path));
const expenseGets = (backend: FakeBackend) =>
  backend.log.filter((r) => r.method === 'GET' && /\/expenses(\?|$)/.test(r.path)).map((r) => r.path.split('?')[1] ?? '');

/** Spesa già esistente nel simulatore. */
async function seedExpense(backend: FakeBackend, accountId: string, homeId: string, body: Record<string, unknown>) {
  const res = await backend.expenses.handle(
    { method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body: { spentOn: '2026-10-01', ...body } },
    accountId,
    homeId,
    'expenses',
  );
  if (res.status !== 201) throw new Error(`seed fallito: ${JSON.stringify(res.body)}`);
  return (res.body as { expense: { id: string; version: number } }).expense;
}

async function openForm(app: App, homeId: string, query = '') {
  await app.router.navigate(`/home/${homeId}/spese?nuova-spesa=1${query}`);
  return screen.findByRole('form', { name: 'Nuova spesa' });
}

async function fill(app: App, form: HTMLElement, v: { title?: string; amount?: string; date?: string; note?: string }) {
  if (v.title !== undefined) await app.user.type(within(form).getByLabelText('Titolo'), v.title);
  if (v.amount !== undefined) await app.user.type(within(form).getByLabelText('Importo in euro'), v.amount);
  if (v.date !== undefined) fireEvent.change(within(form).getByLabelText('Data della spesa'), { target: { value: v.date } });
  if (v.note !== undefined) await app.user.type(within(form).getByLabelText('Nota (facoltativa)'), v.note);
}

const summaryRegion = () => screen.findByRole('region', { name: /Costi registrati da te nel/ });

describe('[mock] H3a Spese — attivazione e stati', () => {
  it('Spese attiva nella shell; casa senza spese: vuoto globale e totali del server a zero', async () => {
    const { backend, home } = world();
    await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Le tue spese della casa' })).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Sezioni di Casa Roma' })[0]!;
    expect(within(nav).getByRole('link', { name: /Spese/ })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByText('Non hai ancora registrato spese attive in questa casa.')).toBeInTheDocument();
    const region = await summaryRegion();
    await waitFor(() => expect(within(region).getByLabelText('Totali del 2026')).toHaveTextContent('Totale registrato0,00 €'));
    expect(screen.getByText(/Rate condominiali, pagamenti, ricorrenze e stime non fanno parte/)).toBeInTheDocument();
    // Criterio 10: nessuno stato «pagata/incassata» né «Ho pagato».
    expect(screen.queryByRole('button', { name: /pagat|incass/i })).not.toBeInTheDocument();
  });

  it('capabilities 404: «non ancora attive», nessun totale, nessun modulo; 503: errore con Riprova (criterio 8)', async () => {
    const { backend, home } = world();
    backend.expenses.enabled = false;
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese?nuova-spesa=1`);
    expect(await screen.findByRole('heading', { name: 'Spese non ancora attive' })).toBeInTheDocument();
    expect(screen.queryByText(/0,00 €/)).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aggiungi spesa/ })).not.toBeInTheDocument();

    backend.expenses.enabled = true;
    backend.expenses.unavailable = true;
    await app.router.navigate(`/home/${home.id}/casa`);
    await screen.findByRole('region', { name: /Le tue spese/ });
    await app.router.navigate(`/home/${home.id}/spese`);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('non sono disponibili in questo momento');
    expect(screen.queryByText('Non hai ancora registrato spese attive in questa casa.')).not.toBeInTheDocument();
    backend.expenses.unavailable = false;
    await app.user.click(within(alert).getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByText('Non hai ancora registrato spese attive in questa casa.')).toBeInTheDocument();
  });

  it('anno senza voci distinto dal vuoto globale e dall’errore dell’elenco', async () => {
    const { backend, owner, home } = world();
    await seedExpense(backend, owner.id, home.id, { title: 'Idraulico', amountCents: 9000 });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await screen.findByRole('link', { name: 'Idraulico' });
    fireEvent.change(screen.getByLabelText('Anno'), { target: { value: '2025' } });
    expect(await screen.findByText('Nessuna spesa nel 2025 con questi filtri.')).toBeInTheDocument();
    expect(app.router.state.location.search).toBe('?anno=2025');
    expect(await summaryRegion()).toHaveTextContent('Costi registrati da te nel 2025');
    backend.storageDown = false;
    backend.expenses.unavailable = true;
    fireEvent.change(screen.getByLabelText('Stato'), { target: { value: 'all' } });
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(screen.queryByText(/Nessuna spesa/)).not.toBeInTheDocument();
  });
});

describe('[mock] H3a Spese — registrazione, importi e idempotenza', () => {
  it('registra 1.234,56 €: centesimi interi, chiave, CSRF e contesto; dettaglio e storia; niente importi nell’URL', async () => {
    const { backend, owner, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await app.user.click(await screen.findByRole('button', { name: /Aggiungi spesa/ }));
    const form = await screen.findByRole('form', { name: 'Nuova spesa' });
    // Il pulsante sparisce: il focus va al titolo del modulo.
    await waitFor(() => expect(within(form).getByRole('heading', { name: 'Nuova spesa' })).toHaveFocus());
    expect(within(form).getByText(/Destinazione:/)).toHaveTextContent('spesa personale in Casa Roma, senza documento.');
    expect(within(form).getByLabelText('Data della spesa')).toHaveAttribute('max', '2026-10-13');
    await fill(app, form, { title: 'Sostituzione rubinetto', amount: '1.234,56', date: '2026-10-02', note: 'Bagno' });
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Sostituzione rubinetto' })).toBeInTheDocument();
    const [req] = posts(backend, /\/expenses$/);
    expect(req!.body).toEqual({ title: 'Sostituzione rubinetto', amountCents: 123456, spentOn: '2026-10-02', note: 'Bagno' });
    expect(req!.headers['x-account-context']).toBe(owner.id);
    expect(req!.headers['x-csrf-token']).toBeTruthy();
    expect(req!.headers['idempotency-key']).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
    expect(screen.getByText('1.234,56 €')).toBeInTheDocument();
    expect(screen.getAllByText('Inserita da te').length).toBeGreaterThan(0);
    const history = screen.getByRole('region', { name: 'Storia della spesa' });
    await waitFor(() => expect(history).toHaveTextContent('Registrata'));
    expect(app.router.state.location.search).toBe('');
    expect(window.localStorage.length).toBe(0);
    expect(backend.log.every((r) => !r.path.includes('123456') && !r.path.includes('Bagno'))).toBe(true);
  });

  it('errori sul campo senza richiesta: importo con 3 decimali, zero, data futura o inesistente', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    const form = await openForm(app, home.id);
    await fill(app, form, { title: 'Prova', amount: '12,345', date: '2026-10-14' });
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    expect(await within(form).findByText('Al massimo due cifre dopo la virgola.')).toBeInTheDocument();
    expect(within(form).getByText(/La data non può essere futura/)).toBeInTheDocument();
    expect(within(form).getByLabelText('Importo in euro')).toHaveFocus();
    await app.user.clear(within(form).getByLabelText('Importo in euro'));
    await app.user.type(within(form).getByLabelText('Importo in euro'), '0');
    // jsdom (come i browser) svuota un valore inesistente come 2026-02-29 nel campo data: resta «obbligatoria».
    fireEvent.change(within(form).getByLabelText('Data della spesa'), { target: { value: '2026-02-29' } });
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    expect(await within(form).findByText('L’importo deve essere maggiore di zero.')).toBeInTheDocument();
    expect(within(form).getByText('Indica la data della spesa.')).toBeInTheDocument();
    expect(posts(backend, /\/expenses$/)).toHaveLength(0);
  });

  it('0,10 + 0,20: totale del server 0,30 € in Spese e in Casa', async () => {
    const { backend, owner, home } = world();
    await seedExpense(backend, owner.id, home.id, { title: 'Venti centesimi', amountCents: 20 });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    const form = await openForm(app, home.id);
    await fill(app, form, { title: 'Dieci centesimi', amount: '0,10', date: '2026-10-05' });
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    await screen.findByRole('heading', { level: 1, name: 'Dieci centesimi' });
    expect(posts(backend, /\/expenses$/)[0]!.body).toMatchObject({ amountCents: 10 });
    await app.router.navigate(`/home/${home.id}/spese`);
    const region = await summaryRegion();
    await waitFor(() => expect(within(region).getByLabelText('Totali del 2026')).toHaveTextContent('Totale registrato0,30 €'));
    await app.router.navigate(`/home/${home.id}/casa`);
    const casa = await screen.findByRole('region', { name: 'Le tue spese del 2026' });
    await waitFor(() => expect(casa).toHaveTextContent('Totale registrato0,30 €'));
    expect(within(within(casa).getByRole('list', { name: 'Ultime spese' })).getAllByRole('listitem')).toHaveLength(2);
  });

  it('risposta persa: campi bloccati, «Annulla» disabilitato, riprova con stessa chiave e payload, un solo record', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    const form = await openForm(app, home.id);
    await fill(app, form, { title: 'Caldaia', amount: '150', date: '2026-10-01' });
    app.control.dropNextResponse();
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    expect(await within(form).findByText('Esito non confermato')).toBeInTheDocument();
    expect(within(form).getByLabelText('Titolo')).toBeDisabled();
    expect(within(form).getByRole('button', { name: 'Annulla' })).toBeDisabled();
    expect(within(form).queryByRole('button', { name: 'Registra spesa' })).not.toBeInTheDocument();
    await app.user.click(within(form).getByRole('button', { name: 'Riprova invio' }));
    await screen.findByRole('heading', { level: 1, name: 'Caldaia' });
    const sent = posts(backend, /\/expenses$/);
    expect(sent).toHaveLength(2);
    expect(sent[1]!.headers['idempotency-key']).toBe(sent[0]!.headers['idempotency-key']);
    expect(sent[1]!.body).toEqual(sent[0]!.body);
    expect(backend.expenses.items.size).toBe(1);
    expect(backend.expenses.applied).toHaveLength(1);
    expect([...backend.expenses.history.values()][0]).toHaveLength(1);
  });

  it('doppio clic: un solo invio', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    const form = await openForm(app, home.id);
    await fill(app, form, { title: 'Doppio', amount: '10', date: '2026-10-01' });
    const button = within(form).getByRole('button', { name: 'Registra spesa' });
    await app.user.dblClick(button);
    await screen.findByRole('heading', { level: 1, name: 'Doppio' });
    expect(posts(backend, /\/expenses$/)).toHaveLength(1);
  });
});

describe('[mock] H3a Spese — modifica, archiviazione e storia', () => {
  it('modifica invia solo i campi cambiati con expectedVersion; no-op senza richiesta; 409 invita a rileggere', async () => {
    const { backend, owner, home } = world();
    const e = await seedExpense(backend, owner.id, home.id, { title: 'Imbianchino', amountCents: 50000, note: 'Soggiorno' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese/${e.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Imbianchino' });
    await app.user.click(screen.getByRole('button', { name: 'Modifica' }));
    let form = await screen.findByRole('form', { name: 'Modifica spesa' });
    expect(within(form).getByLabelText('Importo in euro')).toHaveValue('500,00');
    await app.user.click(within(form).getByRole('button', { name: 'Salva modifiche' }));
    expect(await within(form).findByText('Nessuna modifica da salvare.')).toBeInTheDocument();
    expect(posts(backend, /\/updates$/)).toHaveLength(0);

    await app.user.clear(within(form).getByLabelText('Importo in euro'));
    await app.user.type(within(form).getByLabelText('Importo in euro'), '480,5');
    await app.user.clear(within(form).getByLabelText('Nota (facoltativa)'));
    await app.user.click(within(form).getByRole('button', { name: 'Salva modifiche' }));
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Modifica spesa' })).not.toBeInTheDocument());
    expect(posts(backend, /\/updates$/)[0]!.body).toEqual({ expectedVersion: 1, amountCents: 48050, note: null });
    expect(screen.getByText('480,50 €')).toBeInTheDocument();
    const history = screen.getByRole('region', { name: 'Storia della spesa' });
    await waitFor(() => expect(history).toHaveTextContent('Importo: 500,00 € → 480,50 €'));
    expect(history).toHaveTextContent('Nota: Soggiorno → —');

    // Un'altra scheda cambia la spesa: versione vecchia → 409 e rilettura esplicita.
    backend.expenses.items.get(e.id)!.version += 1;
    await app.user.click(screen.getByRole('button', { name: 'Modifica' }));
    form = await screen.findByRole('form', { name: 'Modifica spesa' });
    await app.user.type(within(form).getByLabelText('Titolo'), ' e cucina');
    await app.user.click(within(form).getByRole('button', { name: 'Salva modifiche' }));
    expect(await within(form).findByText(/modificata nel frattempo/)).toBeInTheDocument();
    await app.user.click(within(form).getByRole('button', { name: 'Rileggi i dati' }));
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Modifica spesa' })).not.toBeInTheDocument());
  });

  it('archivia in dialogo (Escape e ritorno del focus), esce dai totali, filtro Archiviate, ripristina con storia', async () => {
    const { backend, owner, home } = world();
    const e = await seedExpense(backend, owner.id, home.id, { title: 'Giardiniere', amountCents: 12000 });
    await seedExpense(backend, owner.id, home.id, { title: 'Vetri', amountCents: 3000 });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese/${e.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Giardiniere' });
    const archive = screen.getByRole('button', { name: 'Archivia' });
    await app.user.click(archive);
    const dialog = await screen.findByRole('dialog', { name: 'Archivia spesa' });
    expect(dialog).toHaveTextContent('Non viene cancellata');
    await app.user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(archive).toHaveFocus();
    await app.user.click(archive);
    const again = await screen.findByRole('dialog', { name: 'Archivia spesa' });
    await app.user.type(within(again).getByLabelText('Nota sull’operazione (facoltativa)'), 'Doppione');
    await app.user.click(within(again).getByRole('button', { name: 'Archivia spesa' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Ripristina' })).toBeInTheDocument();
    // La vista si rimonta con la nuova versione: il focus va alla nuova azione, non al body.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ripristina' })).toHaveFocus());
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument();
    const history = screen.getByRole('region', { name: 'Storia della spesa' });
    await waitFor(() => expect(history).toHaveTextContent('Archiviata'));
    expect(history).toHaveTextContent('Nota: Doppione');
    expect(backend.expenses.items.has(e.id)).toBe(true);

    await app.router.navigate(`/home/${home.id}/spese`);
    const region = await summaryRegion();
    await waitFor(() => expect(within(region).getByLabelText('Totali del 2026')).toHaveTextContent('Totale registrato30,00 €'));
    const list = await screen.findByRole('list', { name: 'Spese' });
    expect(within(list).queryByText('Giardiniere')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Stato'), { target: { value: 'archived' } });
    await app.user.click(await screen.findByRole('link', { name: 'Giardiniere' }));
    await app.user.click(await screen.findByRole('button', { name: 'Ripristina' }));
    const restore = await screen.findByRole('dialog', { name: 'Ripristina spesa' });
    await app.user.click(within(restore).getByRole('button', { name: 'Ripristina spesa' }));
    expect(await screen.findByRole('button', { name: 'Modifica' })).toBeInTheDocument();
    // Ritorno all'elenco con i filtri dello stesso account.
    await app.user.click(screen.getByRole('link', { name: '← Spese' }));
    await waitFor(() => expect(app.router.state.location.search).toBe('?stato=archived'));
  });
});

describe('[mock] H3a Spese — documento, caldaia e costo unico', () => {
  it('da un documento: precompilazione verificata, origine «Collegata a un documento», originale invariato', async () => {
    const { backend, owner, home } = world();
    const doc = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Fattura idraulico', visibility: 'home' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/documenti/${doc.id}`);
    const linked = await screen.findByRole('region', { name: 'Spese collegate' });
    await waitFor(() => expect(linked).toHaveTextContent('Nessuna spesa attiva collegata.'));
    await app.user.click(within(linked).getByRole('link', { name: 'Registra una spesa da questo documento' }));
    const form = await screen.findByRole('form', { name: 'Nuova spesa' });
    await waitFor(() => expect(within(form).getByLabelText('Documento collegato (facoltativo)')).toHaveValue(doc.id));
    expect(within(form).getByText(/Destinazione:/)).toHaveTextContent('dal documento «Fattura idraulico»');
    await fill(app, form, { title: 'Riparazione', amount: '210', date: '2026-02-18' });
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    await screen.findByRole('heading', { level: 1, name: 'Riparazione' });
    expect(posts(backend, /\/expenses$/)[0]!.body).toMatchObject({ documentId: doc.id });
    expect(screen.getAllByText('Collegata a un documento').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Fattura idraulico' })).toHaveAttribute('href', `/home/${home.id}/documenti/${doc.id}`);
    expect(backend.documents.get(doc.id)!.sha256).toBe(doc.sha256);
    await app.user.click(screen.getByRole('link', { name: 'Fattura idraulico' }));
    const again = await screen.findByRole('region', { name: 'Spese collegate' });
    await waitFor(() => expect(within(again).getByRole('link', { name: 'Riparazione' })).toBeInTheDocument());
  });

  it('dalla caldaia: «Registra un costo», costi collegati letti dalla lista con assetId; il costo conta una volta', async () => {
    const { backend, home, boiler } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/impianti/${boiler.id}`);
    const region = await screen.findByRole('region', { name: 'Costi collegati' });
    await app.user.click(within(region).getByRole('link', { name: 'Registra un costo' }));
    const form = await screen.findByRole('form', { name: 'Nuova spesa' });
    await waitFor(() => expect(within(form).getByLabelText('Caldaia collegata (facoltativa)')).toHaveValue(boiler.id));
    await fill(app, form, { title: 'Controllo fumi', amount: '120', date: '2026-06-07' });
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    await screen.findByRole('heading', { level: 1, name: 'Controllo fumi' });
    await app.user.click(screen.getByRole('link', { name: 'Caldaia cucina' }));
    const costs = await screen.findByRole('region', { name: 'Costi collegati' });
    await waitFor(() => expect(within(costs).getAllByRole('listitem')).toHaveLength(1));
    expect(expenseGets(backend).some((q) => q.includes(`assetId=${boiler.id}`))).toBe(true);
    await app.router.navigate(`/home/${home.id}/spese`);
    const sum = await summaryRegion();
    await waitFor(() => expect(within(sum).getByLabelText('Totali del 2026')).toHaveTextContent('Totale registrato120,00 €'));
    expect(backend.review.assets.get(boiler.id)!.version).toBe(1);
  });

  it('riferimenti dall’URL non autorizzati: avviso, nessun collegamento inviato', async () => {
    const { backend, member, other, home, otherHome } = world();
    const priv = await backend.seedDocument({ homeId: home.id, uploaderId: member.id, name: 'Busta paga Mario' });
    const foreign = backend.review.seedBoiler(other.id, otherHome.id, 'Caldaia di Ugo');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    const form = await openForm(app, home.id, `&documentId=${priv.id}&assetId=${foreign.id}`);
    expect(await within(form).findByText(/Il documento indicato non è leggibile/)).toBeInTheDocument();
    expect(await within(form).findByText(/La caldaia indicata non è tra le tue schede/)).toBeInTheDocument();
    expect(form).not.toHaveTextContent('Busta paga Mario');
    await fill(app, form, { title: 'Senza riferimenti', amount: '5', date: '2026-10-01' });
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    await screen.findByRole('heading', { level: 1, name: 'Senza riferimenti' });
    const body = posts(backend, /\/expenses$/)[0]!.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('documentId');
    expect(body).not.toHaveProperty('assetId');
  });

  it('documento non più leggibile: link redatto (origine resta documento); scollegamento esplicito con null', async () => {
    const { backend, owner, home } = world();
    const doc = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Ricevuta segreta' });
    const e = await seedExpense(backend, owner.id, home.id, { title: 'Con ricevuta', amountCents: 700, documentId: doc.id });
    backend.expenses.unreadableDocuments.add(doc.id);
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese/${e.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Con ricevuta' });
    expect(screen.getByText('Documento collegato non più disponibile per il tuo account')).toBeInTheDocument();
    expect(screen.getAllByText('Collegata a un documento').length).toBeGreaterThan(0);
    expect(screen.queryByText('Ricevuta segreta')).not.toBeInTheDocument();
    const history = screen.getByRole('region', { name: 'Storia della spesa' });
    await waitFor(() => expect(history).toHaveTextContent('Registrata'));
    expect(history).not.toHaveTextContent('Ricevuta segreta');
    await app.user.click(screen.getByRole('button', { name: 'Modifica' }));
    const form = await screen.findByRole('form', { name: 'Modifica spesa' });
    const select = within(form).getByLabelText('Documento collegato (facoltativo)');
    expect(select).toHaveValue('__keep__');
    expect(form).not.toHaveTextContent(doc.id);
    fireEvent.change(select, { target: { value: '' } });
    await app.user.click(within(form).getByRole('button', { name: 'Salva modifiche' }));
    await waitFor(() => expect(posts(backend, /\/updates$/)).toHaveLength(1));
    expect(posts(backend, /\/updates$/)[0]!.body).toEqual({ expectedVersion: 1, documentId: null });
  });

  it('elenco documenti nel selettore: tutte le pagine caricabili, non solo la prima', async () => {
    const { backend, owner, home } = world();
    for (let i = 1; i <= 25; i++) await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: `Fattura ${i}` });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    const form = await openForm(app, home.id);
    const select = within(form).getByLabelText('Documento collegato (facoltativo)');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(21));
    await app.user.click(within(form).getByRole('button', { name: 'Carica altri documenti nell’elenco' }));
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(26));
    expect(within(select).getByRole('option', { name: 'Fattura 1' })).toBeInTheDocument();
  });
});

describe('[mock] H3a Spese — privacy, ruoli, paginazione e contesto', () => {
  it('spese personali: l’owner non vede né conta quelle del member; ID altrui 403 senza contenuto', async () => {
    const { backend, member, home } = world();
    const theirs = await seedExpense(backend, member.id, home.id, { title: 'Spesa di Mario', amountCents: 99900 });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    expect(await screen.findByText('Non hai ancora registrato spese attive in questa casa.')).toBeInTheDocument();
    const region = await summaryRegion();
    await waitFor(() => expect(within(region).getByLabelText('Totali del 2026')).toHaveTextContent('Totale registrato0,00 €'));
    await app.router.navigate(`/home/${home.id}/spese/${theirs.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Spesa non disponibile' })).toBeInTheDocument();
    expect(screen.queryByText('Spesa di Mario')).not.toBeInTheDocument();
    expect(screen.queryByText(/999,00/)).not.toBeInTheDocument();
  });

  it('viewer: legge le proprie spese preesistenti, nessuna aggiunta, modifica o archiviazione', async () => {
    const { backend, viewer, home } = world();
    // Spesa preesistente: registrata quando Vera era member, poi ruolo ridotto a viewer.
    const membership = backend.memberships.find((m) => m.accountId === viewer.id && m.homeId === home.id)!;
    membership.role = 'member';
    const mine = await seedExpense(backend, viewer.id, home.id, { title: 'Spesa di Vera', amountCents: 1500 });
    membership.role = 'viewer';
    const app = await open(backend, 'viewer@example.test', PW.viewer, `/home/${home.id}/spese`);
    expect(await screen.findByRole('link', { name: 'Spesa di Vera' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aggiungi spesa/ })).not.toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/spese/${mine.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Spesa di Vera' });
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archivia' })).not.toBeInTheDocument();
    expect(screen.getByText('Con il tuo ruolo puoi consultare questa spesa, non modificarla.')).toBeInTheDocument();
  });

  it('revoca: 403 sull’elenco, nessuna spesa resta a schermo o in cache', async () => {
    const { backend, member, home } = world();
    await seedExpense(backend, member.id, home.id, { title: 'Spesa da revocare', amountCents: 4200 });
    const app = await open(backend, 'member@example.test', PW.member, `/home/${home.id}/spese`);
    await screen.findByRole('link', { name: 'Spesa da revocare' });
    backend.memberships = backend.memberships.filter((m) => !(m.accountId === member.id && m.homeId === home.id));
    fireEvent.change(screen.getByLabelText('Stato'), { target: { value: 'all' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Accesso non consentito' })).toBeInTheDocument();
    expect(screen.queryByText('Spesa da revocare')).not.toBeInTheDocument();
    await waitFor(() => {
      const cached = app.queryClient
        .getQueryCache()
        .getAll()
        .filter((q) => q.queryKey.includes('h3') && q.state.data !== undefined)
        .map((q) => q.queryKey);
      expect(cached).toEqual([]);
    });
  });

  it('paginazione: 25 spese, 20 + «Mostra altre spese» senza duplicati, cursor della stessa lista', async () => {
    const { backend, owner, home } = world();
    for (let i = 1; i <= 25; i++) {
      await seedExpense(backend, owner.id, home.id, { title: `Voce ${i}`, amountCents: i, spentOn: '2026-09-01' });
    }
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    const list = await screen.findByRole('list', { name: 'Spese' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    await app.user.click(screen.getByRole('button', { name: 'Mostra altre spese' }));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(25));
    const names = within(list).getAllByRole('link').map((a) => a.textContent);
    expect(new Set(names).size).toBe(25);
    expect(expenseGets(backend).at(-1)).toMatch(/^limit=20&cursor=/);
  });

  it('cambio account: la bozza non passa al nuovo account; cambio casa azzera il modulo', async () => {
    const { backend, home, second } = world();
    const app = await open(backend, 'member@example.test', PW.member, `/home/${home.id}/spese`);
    const form = await openForm(app, home.id);
    await fill(app, form, { title: 'Bozza privata', amount: '77' });
    await app.router.navigate(`/home/${home.id}/casa`);
    await app.user.click(await screen.findByRole('button', { name: /Esci/ }));
    await login(app, 'owner@example.test', PW.owner);
    const fresh = await openForm(app, home.id);
    expect(within(fresh).getByLabelText('Titolo')).toHaveValue('');
    expect(within(fresh).getByLabelText('Importo in euro')).toHaveValue('');
    await fill(app, fresh, { title: 'Altra bozza' });
    await app.router.navigate(`/home/${second.id}/spese?nuova-spesa=1`);
    await waitFor(() => expect(screen.getByRole('form', { name: 'Nuova spesa' })).toHaveTextContent('Casa Lago'));
    const lago = screen.getByRole('form', { name: 'Nuova spesa' });
    expect(within(lago).getByLabelText('Titolo')).toHaveValue('');
  });

  it('Casa: riepilogo dell’anno con ultime tre; Le tue scadenze H1 resta', async () => {
    const { backend, owner, home } = world();
    for (const [title, d] of [['Uno', '2026-01-10'], ['Due', '2026-03-10'], ['Tre', '2026-05-10'], ['Quattro', '2026-07-10']] as const) {
      await seedExpense(backend, owner.id, home.id, { title, amountCents: 1000, spentOn: d });
    }
    await seedExpense(backend, owner.id, home.id, { title: 'Anno scorso', amountCents: 5000, spentOn: '2025-12-31' });
    await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/casa`);
    const casa = await screen.findByRole('region', { name: 'Le tue spese del 2026' });
    await waitFor(() => expect(casa).toHaveTextContent('Totale registrato40,00 €'));
    const last = within(casa).getByRole('list', { name: 'Ultime spese' });
    expect(within(last).getAllByRole('link').map((a) => a.textContent)).toEqual(['Quattro', 'Tre', 'Due']);
    expect(screen.getByRole('region', { name: 'Le tue scadenze' })).toBeInTheDocument();
  });
});
