// Prove [mock] economy-v1 (S1a/b): backend SIMULATO (src/test/fakeEconomy.ts), non il backend reale.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';

type App = ReturnType<typeof renderApp>;
const PW = { owner: 'password-owner-001', viewer: 'password-viewer-01', other: 'password-other-001' };

function world() {
  const backend = new FakeBackend();
  backend.economy.enabled = true;
  const owner = backend.seedAccount('Olga Owner', 'owner@example.test', PW.owner);
  const viewer = backend.seedAccount('Vera Viewer', 'viewer@example.test', PW.viewer);
  const other = backend.seedAccount('Ugo Esterno', 'other@example.test', PW.other);
  const home = backend.seedHome(owner.id, 'Casa Roma', 'Via Roma 1');
  backend.addMember(viewer.id, home.id, 'viewer');
  backend.seedHome(other.id, 'Casa di Ugo', 'Via Ugo 3');
  return { backend, owner, viewer, other, home };
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

async function s1(backend: FakeBackend, accountId: string, homeId: string, rest: string, body: Record<string, unknown>) {
  const res = await backend.economy.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body }, accountId, homeId, rest);
  if (res.status >= 300) throw new Error(`seed fallito: ${JSON.stringify(res.body)}`);
  return res.body as { expense?: { id: string; version: number }; work?: { id: string; version: number } };
}

const gets = (backend: FakeBackend, re: RegExp) => backend.log.filter((r) => r.method === 'GET' && re.test(r.path)).map((r) => r.path);
const posts = (backend: FakeBackend, re: RegExp) => backend.log.filter((r) => r.method === 'POST' && re.test(r.path));

async function seedTypical(backend: FakeBackend, acc: string, home: string) {
  await s1(backend, acc, home, 'expenses', { title: 'Bolletta luce', amountCents: 7800, spentOn: '2026-09-30', category: 'electricity' });
  await s1(backend, acc, home, 'expenses', { title: 'Rata mutuo', amountCents: 45000, spentOn: '2026-10-05', category: 'financing' });
  await s1(backend, acc, home, 'expenses', { title: 'Polizza casa', amountCents: 18000, spentOn: '2026-10-02', category: 'insurance' });
  await s1(backend, acc, home, 'expenses', { title: 'Varie', amountCents: 1000, spentOn: '2026-10-03', category: 'other' });
  await s1(backend, acc, home, 'expenses', { title: 'Senza categoria', amountCents: 500, spentOn: '2026-10-03' });
}

describe('[mock] S1 Spese — panoramica dal riepilogo server', () => {
  it('prima vista Panoramica: totale, misura senza finanziamenti, legenda e percentuali dal summary anche oltre la prima pagina', async () => {
    const { backend, owner, home } = world();
    for (let i = 0; i < 25; i++) await s1(backend, owner.id, home.id, 'expenses', { title: `Gas ${i}`, amountCents: 1000, spentOn: '2026-03-01', category: 'gas' });
    await s1(backend, owner.id, home.id, 'expenses', { title: 'Rata', amountCents: 25000, spentOn: '2026-04-01', category: 'financing' });
    await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    const total = await screen.findByRole('region', { name: /Tutte le famiglie/ });
    expect(total).toHaveTextContent('500,00 €');
    expect(total).toHaveTextContent('Senza mutuo e finanziamenti: 250,00 €');
    expect(total).toHaveTextContent('26 registrazioni');
    const legend = screen.getByRole('list', { name: 'Famiglie con costi registrati' });
    const items = within(legend).getAllByRole('button');
    // 25 costi oltre la prima pagina (20): il totale della famiglia viene dal summary, non dalle righe.
    expect(items[0]).toHaveAccessibleName(/^Bollette: 250,00 €, 50,0%, 25 registrazioni/);
    expect(items[1]).toHaveAccessibleName(/^Mutuo e finanziamenti: 250,00 €, 50,0%/);
    expect(screen.getByText(/Senza costi registrati nel periodo: Condominio/)).toBeInTheDocument();
    // Ultime registrazioni: solo la prima pagina (5) della lista filtrata.
    const recent = screen.getByRole('region', { name: 'Ultime registrazioni' });
    await waitFor(() => expect(within(recent).getAllByRole('listitem')).toHaveLength(5));
    expect(within(recent).getByRole('button', { name: 'Vedi tutte le 26 registrazioni' })).toBeInTheDocument();
    expect(gets(backend, /\/economy\/expenses\?limit=5$/)).toHaveLength(1);
    expect(gets(backend, /\/economy\/summary$/).length).toBeGreaterThan(0);
    expect(screen.getByRole('combobox', { name: 'Visualizza' })).toHaveValue('panoramica');
  });

  it('dall’ingresso senza parametri: la legenda apre l’elenco e il ritorno alla panoramica è disponibile', async () => {
    const { backend, owner, home } = world();
    await seedTypical(backend, owner.id, home.id);
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await app.user.click(await screen.findByRole('button', { name: /^Mutuo e finanziamenti: 450,00 €/ }));
    const back = await screen.findByRole('button', { name: '← Torna alla panoramica' });
    await app.user.click(back);
    expect(await screen.findByRole('list', { name: 'Famiglie con costi registrati' })).toBeInTheDocument();
    expect(app.router.state.location.search).toBe('?vista=panoramica');
  });

  it('legenda da tastiera → Elenco filtrato con periodo conservato → ritorno alla panoramica; nessun dato privato nell’URL', async () => {
    const { backend, owner, home } = world();
    await seedTypical(backend, owner.id, home.id);
    await s1(backend, owner.id, home.id, 'expenses', { title: 'Gas 2025', amountCents: 9000, spentOn: '2025-05-01', category: 'gas' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Periodo' }), { target: { value: '2025' } });
    const bollette = await screen.findByRole('button', { name: /^Bollette: 90,00 €/ });
    bollette.focus();
    await app.user.keyboard('{Enter}');
    const back = await screen.findByRole('button', { name: '← Torna alla panoramica' });
    await waitFor(() => expect(back).toHaveFocus());
    const search = new URLSearchParams(app.router.state.location.search);
    expect(search.get('vista')).toBe('elenco');
    expect(search.get('famiglia')).toBe('utilities');
    expect(search.get('anno')).toBe('2025');
    expect(within(screen.getByRole('list', { name: 'Costi registrati' })).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('region', { name: /Bollette · 2025/ })).toHaveTextContent('90,00 €');
    await app.user.click(back);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Distribuzione' })).toHaveFocus());
    const after = new URLSearchParams(app.router.state.location.search);
    expect(after.get('anno')).toBe('2025');
    expect(after.get('famiglia')).toBeNull();
    expect(app.router.state.location.search).not.toMatch(/Gas|9000|90,00/);
  });

  it('Categorie: «Altro» e «Non classificata» distinte; scelta di una famiglia mostra le sue categorie', async () => {
    const { backend, owner, home } = world();
    await seedTypical(backend, owner.id, home.id);
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese?anno=2026`);
    await app.user.click(await screen.findByRole('button', { name: 'Categorie' }));
    const legend = await screen.findByRole('list', { name: 'Categorie con costi registrati' });
    expect(within(legend).getByRole('button', { name: /^Altro: 10,00 €/ })).toBeInTheDocument();
    expect(within(legend).getByRole('button', { name: /^Non classificata: 5,00 €/ })).toBeInTheDocument();
    await app.user.click(within(legend).getByRole('button', { name: /^Non classificata/ }));
    await screen.findByRole('button', { name: '← Torna alla panoramica' });
    expect(new URLSearchParams(app.router.state.location.search).get('categoria')).toBe('unclassified');
    expect(within(screen.getByRole('list', { name: 'Costi registrati' })).getAllByRole('listitem')).toHaveLength(1);
    await app.router.navigate(`/home/${home.id}/spese?vista=panoramica&anno=2026&famiglia=unclassified`);
    expect(await screen.findByRole('heading', { name: 'Categorie in Altro / Non classificata' })).toBeInTheDocument();
  });

  it('confronto: senza registrazioni precedenti, confrontabile, non disponibile (anno 0001); vuoto senza anello', async () => {
    const { backend, owner, home } = world();
    await s1(backend, owner.id, home.id, 'expenses', { title: 'Gas', amountCents: 12000, spentOn: '2026-02-01', category: 'gas' });
    await s1(backend, owner.id, home.id, 'expenses', { title: 'Gas vecchio', amountCents: 10000, spentOn: '2025-02-01', category: 'gas' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese?vista=panoramica&anno=2025`);
    expect(await screen.findByText(/Nessun costo registrato nello stesso periodo dell’anno precedente/)).toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/spese?vista=panoramica&anno=2026`);
    // La card si rimonta col nuovo periodo: la si cerca a ogni tentativo.
    await waitFor(() => expect(screen.getByRole('region', { name: 'Confronto con lo stesso periodo' })).toHaveTextContent('Differenza registrata: +20,00 € (+20,00%)'));
    expect(screen.getByRole('region', { name: 'Confronto con lo stesso periodo' })).toHaveTextContent(/non indicano un risparmio/);
    await app.router.navigate(`/home/${home.id}/spese?vista=panoramica&anno=0001`);
    expect(await screen.findByText('Confronto non disponibile per questo periodo.')).toBeInTheDocument();
    expect(screen.getByText('Nessun costo registrato nel periodo con questi filtri.')).toBeInTheDocument();
    expect(document.querySelector('svg[role="img"]')).toBeNull();
  });

  it('503 sul riepilogo: errore con Riprova, mai un totale zero', async () => {
    const { backend, owner, home } = world();
    await seedTypical(backend, owner.id, home.id);
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/casa`);
    await screen.findByRole('heading', { level: 1 });
    backend.economy.unavailable = true;
    await app.router.navigate(`/home/${home.id}/spese`);
    expect(await screen.findByRole('heading', { name: 'Spese' })).toBeInTheDocument();
    expect(await screen.findByText(/non è disponibile in questo momento/)).toBeInTheDocument();
    expect(screen.queryByText('0,00 €')).not.toBeInTheDocument();
    backend.economy.unavailable = false;
    await app.user.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByRole('region', { name: /Tutte le famiglie/ })).toHaveTextContent('723,00 €');
  });
});

describe('[mock] S1 Spese — privacy, capabilities e ripiego', () => {
  it('cambio account: nessun dato economico del precedente resta in cache; 403 sul riepilogo lo rimuove', async () => {
    const { backend, owner, home } = world();
    await seedTypical(backend, owner.id, home.id);
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await screen.findByRole('region', { name: /Tutte le famiglie/ });
    const economyKeys = () => app.queryClient.getQueryCache().getAll().filter((q) => q.queryKey.includes('economy') && q.queryKey[1] === owner.id);
    expect(economyKeys().length).toBeGreaterThan(0);
    // Logout via shell e accesso con un altro account.
    await app.user.click(screen.getAllByRole('button', { name: /Esci/ })[0]!);
    await screen.findByRole('heading', { name: 'Accedi' });
    expect(economyKeys()).toHaveLength(0);

    await app.user.type(screen.getByLabelText('Email'), 'owner@example.test');
    await app.user.type(screen.getByLabelText('Password'), PW.owner);
    await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
    await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
    await app.router.navigate(`/home/${home.id}/spese`);
    await screen.findByRole('region', { name: /Tutte le famiglie/ });
    const app2 = app;
    backend.memberships = backend.memberships.filter((m) => !(m.accountId === owner.id && m.homeId === home.id));
    await app2.router.navigate(`/home/${home.id}/spese?vista=panoramica&anno=2025`);
    await waitFor(() => expect(app2.queryClient.getQueryCache().getAll().filter((q) => q.queryKey.includes('economy') && q.queryKey.includes('summary') && q.state.data)).toHaveLength(0));
  });

  it('documentDrafts false: «Da documento» spiega che la compilazione assistita non è disponibile e apre il manuale; nessuna rotta S1c', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await app.user.click(await screen.findByRole('button', { name: 'Da documento' }));
    expect(await screen.findByText('Compilazione assistita non ancora disponibile')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Registra una spesa' })).toBeInTheDocument();
    expect(backend.log.some((r) => /drafts|document-analysis-jobs/.test(r.path))).toBe(false);
  });

  it('documentDrafts true: «Da documento» apre il percorso S1c (dettagli in s1c.test.tsx), senza avviare analisi', async () => {
    const { backend, home } = world();
    backend.economy.features.documentDrafts = true;
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await app.user.click(await screen.findByRole('link', { name: 'Da documento' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Spesa da documento' })).toBeInTheDocument();
    expect(backend.log.some((r) => r.method === 'POST' && /document-analysis-jobs/.test(r.path))).toBe(false);
  });

  it('economy-v1 assente (404): resta la pagina H3a, senza simulazioni', async () => {
    const { backend, home } = world();
    backend.economy.enabled = false;
    await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Le tue spese della casa' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Famiglie di spesa' })).not.toBeInTheDocument();
  });

  it('ruolo viewer: consultazione senza azioni di registrazione', async () => {
    const { backend, home } = world();
    await open(backend, 'viewer@example.test', PW.viewer, `/home/${home.id}/spese`);
    expect(await screen.findByText(/puoi consultare i tuoi costi già registrati/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registra una spesa' })).not.toBeInTheDocument();
  });

  it('la ricerca resta nello stato di navigazione: arriva al server ma non entra nell’indirizzo', async () => {
    const { backend, owner, home } = world();
    await seedTypical(backend, owner.id, home.id);
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese?vista=elenco`);
    const box = await screen.findByText(/^Filtri/);
    await app.user.click(box);
    await app.user.type(screen.getByRole('searchbox', { name: 'Cerca in descrizione o fornitore' }), 'Polizza');
    await app.user.click(screen.getByRole('button', { name: 'Applica filtri' }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Costi registrati' })).getAllByRole('listitem')).toHaveLength(1));
    expect(app.router.state.location.search).not.toMatch(/Polizza|q=/);
    expect(gets(backend, /\/economy\/expenses\?.*q=Polizza/).length).toBeGreaterThan(0);
  });
});

describe('[mock] S1 Spese — manuale, CAS, riprova e lavori', () => {
  it('manuale con categoria e lavoro: famiglia dal server, nessun campo famiglia inviato, importo intero', async () => {
    const { backend, owner, home } = world();
    await s1(backend, owner.id, home.id, 'works', { name: 'Rifacimento bagno' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese`);
    await app.user.click(await screen.findByRole('button', { name: 'Registra una spesa' }));
    const form = await screen.findByRole('form', { name: 'Registra una spesa' });
    await app.user.type(within(form).getByLabelText('Descrizione'), 'Piastrelle');
    await app.user.type(within(form).getByLabelText('Importo in euro'), '1.035,50');
    fireEvent.change(within(form).getByLabelText(/Data di riferimento/), { target: { value: '2026-09-10' } });
    fireEvent.change(within(form).getByLabelText('Categoria (facoltativa)'), { target: { value: 'repairs_works' } });
    expect(within(form).getByText(/Famiglia prevista/)).toHaveTextContent('Manutenzione e riparazioni');
    await waitFor(() => expect(within(within(form).getByLabelText('Lavoro (facoltativo)')).getByRole('option', { name: 'Rifacimento bagno' })).toBeInTheDocument());
    const workOpt = within(within(form).getByLabelText('Lavoro (facoltativo)')).getByRole('option', { name: 'Rifacimento bagno' }) as HTMLOptionElement;
    fireEvent.change(within(form).getByLabelText('Lavoro (facoltativo)'), { target: { value: workOpt.value } });
    expect(within(form).getByText(/Famiglia prevista/)).toHaveTextContent('Lavori e acquisti');
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Piastrelle' })).toBeInTheDocument();
    const body = posts(backend, /\/economy\/expenses$/)[0]!.body as Record<string, unknown>;
    expect(body).toMatchObject({ title: 'Piastrelle', amountCents: 103550, spentOn: '2026-09-10', category: 'repairs_works', workId: workOpt.value });
    expect(body).not.toHaveProperty('family');
    expect(posts(backend, /\/economy\/expenses$/)[0]!.headers['idempotency-key']).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
    expect(screen.getAllByText('Lavori e acquisti').length).toBeGreaterThan(0);
    await app.user.click(screen.getByRole('link', { name: '← Spese' }));
    expect(await screen.findByRole('button', { name: 'Registra una spesa' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Registra una spesa' })).not.toBeInTheDocument();
    expect(app.router.state.location.search).not.toMatch(/nuova-spesa|perLavoro/);
  });

  it('risposta persa: «Esito non confermato», riprova con stessa chiave e body, un solo costo', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese?nuova-spesa=1`);
    const form = await screen.findByRole('form', { name: 'Registra una spesa' });
    await app.user.type(within(form).getByLabelText('Descrizione'), 'Idraulico');
    await app.user.type(within(form).getByLabelText('Importo in euro'), '85');
    fireEvent.change(within(form).getByLabelText(/Data di riferimento/), { target: { value: '2026-10-01' } });
    app.control.dropNextResponse();
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    expect(await screen.findByText('Esito non confermato')).toBeInTheDocument();
    expect(within(form).queryByRole('button', { name: 'Registra spesa' })).not.toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Riprova invio' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Idraulico' })).toBeInTheDocument();
    const sent = posts(backend, /\/economy\/expenses$/);
    expect(sent).toHaveLength(2);
    expect(sent[0]!.headers['idempotency-key']).toBe(sent[1]!.headers['idempotency-key']);
    expect(sent[0]!.body).toEqual(sent[1]!.body);
    expect(backend.economy.applied.filter((a) => a.endsWith(':create'))).toHaveLength(1);
  });

  it('409 di versione: invito a rileggere, nessun nuovo record; poi la modifica riesce', async () => {
    const { backend, owner, home } = world();
    const { expense } = await s1(backend, owner.id, home.id, 'expenses', { title: 'Gas', amountCents: 8000, spentOn: '2026-09-30', category: 'gas' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese/${expense!.id}`);
    await app.user.click(await screen.findByRole('button', { name: 'Modifica' }));
    // Modifica concorrente (altra scheda) sul server.
    await backend.economy.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body: { expectedVersion: 1, supplier: 'Gas Demo' } }, owner.id, home.id, `expenses/${expense!.id}/updates`);
    const form = screen.getByRole('form', { name: 'Modifica costo' });
    await app.user.clear(within(form).getByLabelText('Descrizione'));
    await app.user.type(within(form).getByLabelText('Descrizione'), 'Gas settembre');
    await app.user.click(within(form).getByRole('button', { name: 'Salva modifiche' }));
    expect(await screen.findByText(/modificato nel frattempo/)).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Rileggi i dati' }));
    await waitFor(() => expect(screen.getByText('Gas Demo')).toBeInTheDocument());
    expect(backend.expenses.items.size).toBe(1);
  });

  it('lavori: crea, archivia; i costi restano nel lavoro; un lavoro archiviato non è proposto per nuove assegnazioni', async () => {
    const { backend, owner, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/spese/lavori`);
    await app.user.click(await screen.findByRole('button', { name: 'Nuovo lavoro' }));
    await app.user.type(screen.getByLabelText('Nome'), 'Tinteggiatura');
    await app.user.click(screen.getByRole('button', { name: 'Crea lavoro' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Tinteggiatura' })).toBeInTheDocument();
    const workId = app.router.state.location.pathname.split('/').pop()!;
    await s1(backend, owner.id, home.id, 'expenses', { title: 'Pittura', amountCents: 12000, spentOn: '2026-10-01', category: 'repairs_works', workId });
    await app.router.navigate(`/home/${home.id}/spese/lavori`);
    await screen.findByRole('heading', { level: 1, name: 'Lavori' });
    await app.router.navigate(`/home/${home.id}/spese/lavori/${workId}`);
    const totals = await screen.findByRole('region', { name: 'Costi del lavoro' });
    await waitFor(() => expect(totals).toHaveTextContent('120,00 €'));
    await app.user.click(screen.getByRole('button', { name: 'Archivia' }));
    await app.user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Archivia lavoro' }));
    expect(await screen.findByText(/Lavoro archiviato: conserva i suoi costi/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Costi del lavoro' })).toHaveTextContent('120,00 €');
    await app.router.navigate(`/home/${home.id}/spese?nuova-spesa=1`);
    const form = await screen.findByRole('form', { name: 'Registra una spesa' });
    // Dopo la rilettura della lista dei lavori attivi, il lavoro archiviato non è proposto.
    await waitFor(() => expect(within(within(form).getByLabelText('Lavoro (facoltativo)')).queryByRole('option', { name: 'Tinteggiatura' })).toBeNull());
    expect(backend.expenses.items.size).toBe(1);
  });

  it('dalla scheda oggetto: costo con objectRef in una sola richiesta e ritorno alla scheda', async () => {
    const { backend, owner, home } = world();
    const obj = await backend.objects.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body: { name: 'Lavatrice', type: 'appliance' } }, owner.id, home.id, 'objects');
    const ref = (obj.body as { object: { ref: { kind: string; id: string } } }).object.ref;
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti/object/${ref.id}`);
    await app.user.click(await screen.findByRole('link', { name: 'Registra un costo per questo oggetto' }));
    const form = await screen.findByRole('form', { name: 'Registra una spesa' });
    await waitFor(() => expect(within(form).getByLabelText('Oggetto (facoltativo)')).toHaveValue(`object:${ref.id}`));
    await app.user.type(within(form).getByLabelText('Descrizione'), 'Riparazione lavatrice');
    await app.user.type(within(form).getByLabelText('Importo in euro'), '85');
    fireEvent.change(within(form).getByLabelText(/Data di riferimento/), { target: { value: '2026-10-01' } });
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    await waitFor(() => expect(app.router.state.location.pathname).toBe(`/home/${home.id}/oggetti/object/${ref.id}`));
    // La lista G1 della scheda si rilegge al montaggio (prima mostra la cache): attesa più lunga sotto carico.
    await waitFor(() => expect(screen.getByRole('link', { name: 'Riparazione lavatrice' })).toBeInTheDocument(), { timeout: 5000 });
    expect(posts(backend, /\/economy\/expenses$/)[0]!.body).toMatchObject({ objectRef: { kind: 'object', id: ref.id } });
    expect(posts(backend, /\/objects\/object\/[^/]+\/links$/)).toHaveLength(0);
  });
});

export type { App };
