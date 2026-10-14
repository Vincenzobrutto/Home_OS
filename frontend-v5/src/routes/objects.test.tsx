// G1 home-objects-v1 con backend SIMULATO: nessuna prova di API/DB reali
// (vedi tests/integration/home-objects.int.test.ts).
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
  backend.seedHome(other.id, 'Casa di Ugo', 'Via Ugo 3');
  const boiler = backend.review.seedBoiler(owner.id, home.id, 'Caldaia cucina');
  return { backend, owner, member, viewer, other, home, second, boiler };
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

async function g1(backend: FakeBackend, accountId: string, homeId: string, rest: string, body: Record<string, unknown>) {
  const res = await backend.objects.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body }, accountId, homeId, rest);
  if (res.status >= 300) throw new Error(`seed G1 fallito: ${JSON.stringify(res.body)}`);
  return res.body as { room?: { id: string; version: number }; object?: { ref: { kind: string; id: string } }; link?: { linkId: string } };
}
const seedRoom = async (b: FakeBackend, acc: string, home: string, name: string, type = 'living') => (await g1(b, acc, home, 'rooms', { name, type })).room!;
const seedObject = async (b: FakeBackend, acc: string, home: string, name: string, extra: Record<string, unknown> = {}) =>
  (await g1(b, acc, home, 'objects', { name, type: 'appliance', ...extra })).object!;

const posts = (backend: FakeBackend, re: RegExp) => backend.log.filter((r) => r.method === 'POST' && re.test(r.path));
const gets = (backend: FakeBackend, re: RegExp) => backend.log.filter((r) => r.method === 'GET' && re.test(r.path)).map((r) => r.path.split('?')[1] ?? '');

describe('[mock] G1 — ingresso, capabilities e ambienti', () => {
  it('Casa: ambienti condivisi e link, senza conteggi; Casa resta attiva nei sottopercorsi', async () => {
    const { backend, member, home } = world();
    await seedRoom(backend, member.id, home.id, 'Soggiorno');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/casa`);
    const card = await screen.findByRole('region', { name: 'Ambienti e oggetti' });
    expect(await within(card).findByRole('link', { name: 'Soggiorno' })).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Da collocare' })).toHaveAttribute('href', `/home/${home.id}/oggetti?collocazione=da-collocare`);
    expect(card.textContent).not.toMatch(/\d+ oggett/);
    await app.user.click(within(card).getByRole('link', { name: 'Ambienti' }));
    await screen.findByRole('heading', { level: 1, name: 'Ambienti' });
    const nav = screen.getAllByRole('navigation', { name: 'Sezioni di Casa Roma' })[0]!;
    expect(within(nav).getByRole('link', { name: /Casa/ })).toHaveAttribute('aria-current', 'page');
  });

  it('capabilities 404: «non ancora attivi», nessuna azione; 503: errore con Riprova', async () => {
    const { backend, home } = world();
    backend.objects.enabled = false;
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/ambienti`);
    expect(await screen.findByRole('heading', { name: 'Ambienti e oggetti non ancora attivi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aggiungi/ })).not.toBeInTheDocument();
    backend.objects.enabled = true;
    backend.objects.unavailable = true;
    await app.router.navigate(`/home/${home.id}/casa`);
    await screen.findByRole('region', { name: 'Ambienti e oggetti' });
    await app.router.navigate(`/home/${home.id}/oggetti`);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('non sono disponibili');
    expect(screen.queryByText(/Non hai ancora oggetti/)).not.toBeInTheDocument();
    backend.objects.unavailable = false;
    await app.user.click(within(alert).getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByRole('button', { name: /Aggiungi oggetto/ })).toBeInTheDocument();
  });

  it('due «Bagno» con lo stesso nome e tipo sono ammessi; nessuna stanza creata da sola', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/ambienti`);
    expect(await screen.findByText('Non ci sono ancora ambienti in questa casa.')).toBeInTheDocument();
    expect(backend.objects.rooms.size).toBe(0);
    for (let i = 0; i < 2; i++) {
      await app.router.navigate(`/home/${home.id}/ambienti`);
      await app.user.click(await screen.findByRole('button', { name: /Aggiungi ambiente/ }));
      const form = await screen.findByRole('form', { name: 'Nuovo ambiente' });
      await waitFor(() => expect(within(form).getByRole('heading', { name: 'Nuovo ambiente' })).toHaveFocus());
      await app.user.type(within(form).getByLabelText('Nome'), 'Bagno');
      fireEvent.change(within(form).getByLabelText('Tipo'), { target: { value: 'bathroom' } });
      await app.user.click(within(form).getByRole('button', { name: 'Crea ambiente' }));
      await screen.findByRole('heading', { level: 1, name: 'Bagno' });
    }
    expect(posts(backend, /\/rooms$/).map((r) => r.body)).toEqual([
      { name: 'Bagno', type: 'bathroom' },
      { name: 'Bagno', type: 'bathroom' },
    ]);
    await app.router.navigate(`/home/${home.id}/ambienti`);
    const list = await screen.findByRole('list', { name: 'Ambienti' });
    expect(within(list).getAllByRole('link', { name: 'Bagno' })).toHaveLength(2);
  });

  it('modifica solo campi cambiati, no-op senza richiesta, archivia in dialogo con focus e ripristina con storia', async () => {
    const { backend, owner, home } = world();
    const room = await seedRoom(backend, owner.id, home.id, 'Studio', 'other');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/ambienti/${room.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Studio' });
    await app.user.click(screen.getByRole('button', { name: 'Modifica' }));
    const form = await screen.findByRole('form', { name: 'Modifica ambiente' });
    await app.user.click(within(form).getByRole('button', { name: 'Salva modifiche' }));
    expect(await within(form).findByText('Nessuna modifica da salvare.')).toBeInTheDocument();
    await app.user.type(within(form).getByLabelText('Nota (facoltativa)'), 'Con finestra');
    await app.user.click(within(form).getByRole('button', { name: 'Salva modifiche' }));
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Modifica ambiente' })).not.toBeInTheDocument());
    expect(posts(backend, /\/updates$/)[0]!.body).toEqual({ expectedVersion: 1, note: 'Con finestra' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifica' })).toHaveFocus());

    const archive = screen.getByRole('button', { name: 'Archivia' });
    await app.user.click(archive);
    await screen.findByRole('dialog', { name: 'Archivia ambiente' });
    await app.user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(archive).toHaveFocus();
    await app.user.click(archive);
    const dialog = await screen.findByRole('dialog', { name: 'Archivia ambiente' });
    await app.user.click(within(dialog).getByRole('button', { name: 'Archivia ambiente' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ripristina' })).toHaveFocus());
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument();
    const history = screen.getByRole('region', { name: 'Storia dell’ambiente' });
    await waitFor(() => expect(history).toHaveTextContent('Archiviato'));
    expect(history).toHaveTextContent('Nota: — → Con finestra');
  });

  it('viewer: consulta gli ambienti condivisi senza aggiungere o modificare', async () => {
    const { backend, owner, home } = world();
    const room = await seedRoom(backend, owner.id, home.id, 'Cucina', 'kitchen');
    const app = await open(backend, 'viewer@example.test', PW.viewer, `/home/${home.id}/ambienti`);
    expect(await screen.findByRole('link', { name: 'Cucina' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aggiungi ambiente/ })).not.toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/ambienti/${room.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Cucina' });
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument();
    expect(screen.getByText('Con il tuo ruolo puoi consultare questo ambiente, non modificarlo.')).toBeInTheDocument();
  });
});

describe('[mock] G1 — oggetti, posizione e catalogo', () => {
  it('oggetto senza ambiente resta «Da collocare»; multiambiente in un solo POST e una riga unica', async () => {
    const { backend, owner, home } = world();
    const a = await seedRoom(backend, owner.id, home.id, 'Soggiorno');
    const b = await seedRoom(backend, owner.id, home.id, 'Camera', 'bedroom');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti`);
    await app.user.click(await screen.findByRole('button', { name: /Aggiungi oggetto/ }));
    let form = await screen.findByRole('form', { name: 'Nuovo oggetto' });
    await app.user.type(within(form).getByLabelText('Nome'), 'Lavastoviglie');
    await app.user.click(within(form).getByRole('button', { name: 'Crea oggetto' }));
    await screen.findByRole('heading', { level: 1, name: 'Lavastoviglie' });
    expect(screen.getByText('Da collocare')).toBeInTheDocument();
    expect(posts(backend, /\/objects$/)[0]!.body).toEqual({ name: 'Lavastoviglie', type: 'appliance' });

    await app.router.navigate(`/home/${home.id}/oggetti?nuovo=1`);
    form = await screen.findByRole('form', { name: 'Nuovo oggetto' });
    await app.user.type(within(form).getByLabelText('Nome'), 'Termosifoni');
    fireEvent.change(within(form).getByLabelText('Tipo'), { target: { value: 'heating' } });
    expect(within(form).getByText(/non contiene dati di caldaia verificati/)).toBeInTheDocument();
    await app.user.click(await within(form).findByRole('checkbox', { name: /Soggiorno/ }));
    await app.user.click(within(form).getByRole('checkbox', { name: /Camera/ }));
    await app.user.click(within(form).getByRole('button', { name: 'Crea oggetto' }));
    await screen.findByRole('heading', { level: 1, name: 'Termosifoni' });
    const body = posts(backend, /\/objects$/)[1]!.body as { roomIds: string[] };
    expect(new Set(body.roomIds)).toEqual(new Set([a.id, b.id]));
    expect(posts(backend, /\/position$/)).toHaveLength(0);
    await app.router.navigate(`/home/${home.id}/oggetti`);
    const list = await screen.findByRole('list', { name: 'Oggetti' });
    expect(within(list).getAllByRole('link', { name: 'Termosifoni' })).toHaveLength(1);
    await waitFor(() => expect(list).toHaveTextContent(/Camera, Soggiorno|Soggiorno, Camera/));
  });

  it('posizione con CAS: prima volta versione 0, poi 1; versione vecchia → 409 e rilettura', async () => {
    const { backend, owner, home } = world();
    const room = await seedRoom(backend, owner.id, home.id, 'Bagno', 'bathroom');
    const o = await seedObject(backend, owner.id, home.id, 'Scaldabagno');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti/object/${o.ref.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Scaldabagno' });
    await app.user.click(screen.getByRole('button', { name: 'Cambia posizione' }));
    let form = await screen.findByRole('form', { name: 'Dove si trova' });
    await app.user.click(await within(form).findByRole('checkbox', { name: /Bagno/ }));
    await app.user.click(within(form).getByRole('button', { name: 'Salva posizione' }));
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Dove si trova' })).not.toBeInTheDocument());
    expect(posts(backend, /\/position$/)[0]!.body).toEqual({ expectedVersion: 0, roomIds: [room.id] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifica' })).toHaveFocus());

    // Un'altra scheda cambia la posizione: la versione locale è vecchia.
    backend.objects.positions.get(`${owner.id}:object:${o.ref.id}`)!.version += 1;
    await app.user.click(screen.getByRole('button', { name: 'Cambia posizione' }));
    form = await screen.findByRole('form', { name: 'Dove si trova' });
    await app.user.click(await within(form).findByRole('checkbox', { name: /Bagno/ }));
    await app.user.click(within(form).getByRole('button', { name: 'Salva posizione' }));
    expect(await within(form).findByText(/modificati nel frattempo/)).toBeInTheDocument();
    await app.user.click(within(form).getByRole('button', { name: 'Rileggi i dati' }));
    expect(posts(backend, /\/position$/)[1]!.body).toEqual({ expectedVersion: 1, roomIds: [] });
  });

  it('catalogo: ricerca server per nome senza richieste a ogni tasto, filtro tipo e «Da collocare», 25 elementi paginati', async () => {
    const { backend, owner, home } = world();
    const room = await seedRoom(backend, owner.id, home.id, 'Cucina', 'kitchen');
    for (let i = 1; i <= 24; i++) await seedObject(backend, owner.id, home.id, `Lampada ${i}`, { type: 'electrical' });
    await seedObject(backend, owner.id, home.id, 'Forno', { roomIds: [room.id] });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti`);
    const list = await screen.findByRole('list', { name: 'Oggetti' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    await app.user.click(screen.getByRole('button', { name: 'Mostra altri oggetti' }));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(26));
    expect(new Set(within(list).getAllByRole('link').map((l) => l.textContent)).size).toBe(26);

    const before = gets(backend, /\/objects(\?|$)/).length;
    await app.user.type(screen.getByLabelText('Cerca per nome'), 'forno');
    expect(gets(backend, /\/objects(\?|$)/)).toHaveLength(before);
    await app.user.click(screen.getByRole('button', { name: 'Cerca' }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Oggetti' })).getAllByRole('link').map((l) => l.textContent)).toEqual(['Forno']));
    expect(app.router.state.location.search).toBe('?q=forno');
    expect(gets(backend, /\/objects(\?|$)/).at(-1)).toBe('q=forno&limit=20');

    await app.router.navigate(`/home/${home.id}/oggetti?collocazione=da-collocare&tipo=boiler`);
    await waitFor(() => expect(gets(backend, /\/objects(\?|$)/).at(-1)).toBe('placement=unplaced&type=boiler&limit=20'));
    expect(await screen.findByRole('link', { name: 'Caldaia cucina' })).toBeInTheDocument();
    // Ambiente e «da collocare» insieme non vengono mai inviati.
    await app.router.navigate(`/home/${home.id}/oggetti?collocazione=da-collocare&ambiente=${room.id}`);
    await waitFor(() => expect(gets(backend, /\/objects(\?|$)/).at(-1)).toBe(`roomId=${room.id}&limit=20`));
  });

  it('ritorno dal dettaglio conserva i filtri dello stesso account', async () => {
    const { backend, owner, home } = world();
    await seedObject(backend, owner.id, home.id, 'Forno');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti?q=forno`);
    await app.user.click(await screen.findByRole('link', { name: 'Forno' }));
    await screen.findByRole('heading', { level: 1, name: 'Forno' });
    await app.user.click(screen.getByRole('link', { name: /Oggetti e impianti/ }));
    await waitFor(() => expect(app.router.state.location.search).toBe('?q=forno'));
  });

  it('caldaia: una sola riga con la stessa ID, scheda tecnica originale, niente modifica/archivio, scheda M3 invariata', async () => {
    const { backend, owner, home, boiler } = world();
    const native = await backend.expenses.handle(
      { method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body: { title: 'Controllo fumi', amountCents: 12000, spentOn: '2026-06-07', assetId: boiler.id } },
      owner.id,
      home.id,
      'expenses',
    );
    expect(native.status).toBe(201);
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti`);
    const list = await screen.findByRole('list', { name: 'Oggetti' });
    expect(within(list).getAllByRole('link', { name: 'Caldaia cucina' })).toHaveLength(1);
    expect(within(list).getByRole('link', { name: 'Caldaia cucina' })).toHaveAttribute('href', `/home/${home.id}/oggetti/boiler/${boiler.id}`);
    await app.user.click(within(list).getByRole('link', { name: 'Caldaia cucina' }));
    await screen.findByRole('heading', { level: 1, name: 'Caldaia cucina' });
    expect(screen.getByRole('link', { name: 'Apri la scheda tecnica' })).toHaveAttribute('href', `/home/${home.id}/impianti/${boiler.id}`);
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archivia' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambia posizione' })).toBeInTheDocument();
    const costs = screen.getByRole('region', { name: 'I tuoi costi' });
    await waitFor(() => expect(within(costs).getByRole('link', { name: 'Controllo fumi' })).toBeInTheDocument());
    expect(costs).toHaveTextContent('Collegamento della scheda caldaia');
    expect(within(costs).queryByRole('button', { name: 'Rimuovi collegamento' })).not.toBeInTheDocument();
    expect(within(costs).getByRole('link', { name: 'Registra un costo' })).toHaveAttribute('href', `/home/${home.id}/spese?nuova-spesa=1&assetId=${boiler.id}`);
    expect(backend.review.assets.get(boiler.id)!.version).toBe(1);
    expect(backend.objects.objects.size).toBe(0);
  });

  it('archivio dell’oggetto e ambiente archiviato: resta etichettato nella posizione, non proposto per nuove assegnazioni', async () => {
    const { backend, owner, home } = world();
    const old = await seedRoom(backend, owner.id, home.id, 'Vecchia cantina', 'utility');
    await seedRoom(backend, owner.id, home.id, 'Garage', 'outdoor');
    const o = await seedObject(backend, owner.id, home.id, 'Bici', { roomIds: [old.id] });
    await g1(backend, owner.id, home.id, `rooms/${old.id}/archive`, { expectedVersion: 1 });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti/object/${o.ref.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Bici' });
    expect(screen.getByText('Vecchia cantina (ambiente archiviato)')).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Cambia posizione' }));
    const form = await screen.findByRole('form', { name: 'Dove si trova' });
    expect(await within(form).findByRole('checkbox', { name: /Garage/ })).not.toBeChecked();
    expect(within(form).getByRole('checkbox', { name: 'Vecchia cantina (ambiente archiviato)' })).toBeChecked();
    await app.user.click(within(form).getByRole('button', { name: 'Annulla' }));
    await app.user.click(screen.getByRole('button', { name: 'Archivia' }));
    const dialog = await screen.findByRole('dialog', { name: 'Archivia oggetto' });
    await app.user.click(within(dialog).getByRole('button', { name: 'Archivia oggetto' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ripristina' })).toHaveFocus());
    expect(screen.getAllByText(/Oggetto archiviato: nessun nuovo collegamento/).length).toBeGreaterThan(0);
  });
});

describe('[mock] G1 — collegamenti', () => {
  it('collega un documento con la ricerca H2, poi rimuove il riferimento con CAS; la risorsa non cambia', async () => {
    const { backend, owner, member, home } = world();
    const doc = await backend.seedDocument({ homeId: home.id, uploaderId: member.id, name: 'Manuale forno', visibility: 'home' });
    for (let i = 1; i <= 22; i++) await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: `Bolletta ${i}` });
    const o = await seedObject(backend, owner.id, home.id, 'Forno');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti/object/${o.ref.id}`);
    const docs = await screen.findByRole('region', { name: 'Documenti collegati' });
    await app.user.click(within(docs).getByRole('button', { name: 'Collega un documento' }));
    const search = await within(docs).findByRole('search', { name: 'Cerca un documento da collegare' });
    await app.user.type(within(search).getByLabelText('Cerca nei documenti'), 'manuale');
    await app.user.click(within(search).getByRole('button', { name: 'Cerca' }));
    await app.user.click(await within(docs).findByRole('button', { name: 'Collega «Manuale forno»' }));
    await waitFor(() => expect(within(docs).getByRole('link', { name: 'Manuale forno' })).toBeInTheDocument());
    expect(posts(backend, /\/links$/)[0]!.body).toEqual({ resourceType: 'document', resourceId: doc.id });
    expect(gets(backend, /\/documents(\?|$)/).some((q) => q.startsWith('q=manuale'))).toBe(true);
    // Il pannello si chiude: il focus va al titolo della sezione, non al body.
    await waitFor(() => expect(within(docs).getByRole('heading', { name: 'Documenti collegati' })).toHaveFocus());
    await app.user.click(within(docs).getByRole('button', { name: 'Rimuovi collegamento' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rimuovi collegamento' });
    await app.user.click(within(dialog).getByRole('button', { name: 'Rimuovi collegamento' }));
    await waitFor(() => expect(within(docs).getByText('Nessun documento collegato.')).toBeInTheDocument());
    expect(posts(backend, /\/remove$/)[0]!.body).toEqual({ expectedVersion: 1 });
    await waitFor(() => expect(within(docs).getByRole('heading', { name: 'Documenti collegati' })).toHaveFocus());
    expect(backend.documents.get(doc.id)!.sha256).toBe(doc.sha256);
  });

  it('riferimento non più leggibile: redatto senza titolo né ID, rimovibile', async () => {
    const { backend, owner, member, home } = world();
    const doc = await backend.seedDocument({ homeId: home.id, uploaderId: member.id, name: 'Garanzia segreta', visibility: 'home' });
    const o = await seedObject(backend, owner.id, home.id, 'Frigo');
    await g1(backend, owner.id, home.id, `objects/object/${o.ref.id}/links`, { resourceType: 'document', resourceId: doc.id });
    backend.documents.get(doc.id)!.visibility = 'private';
    await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti/object/${o.ref.id}`);
    const docs = await screen.findByRole('region', { name: 'Documenti collegati' });
    await waitFor(() => expect(docs).toHaveTextContent('Documento non più disponibile per il tuo account'));
    expect(docs).not.toHaveTextContent('Garanzia segreta');
    expect(docs.innerHTML).not.toContain(doc.id);
    expect(within(docs).getByRole('button', { name: 'Rimuovi collegamento' })).toBeInTheDocument();
  });

  it('due fasi: costo registrato, collegamento perso → «Registrato, collegamento da completare»; riprova solo il link, un solo costo', async () => {
    const { backend, owner, home } = world();
    const o = await seedObject(backend, owner.id, home.id, 'Climatizzatore', { type: 'cooling' });
    // Il server applica il collegamento ma la risposta si perde (503): la riprova con la stessa chiave è un replay.
    const original = backend.objects.handle.bind(backend.objects);
    let dropped = false;
    backend.objects.handle = async (req, acc, homeId, rest) => {
      const res = await original(req, acc, homeId, rest);
      if (req.method === 'POST' && rest.endsWith('/links') && !dropped) {
        dropped = true;
        return { status: 503, body: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Non disponibile.' } } };
      }
      return res;
    };
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti/object/${o.ref.id}`);
    const costs = await screen.findByRole('region', { name: 'I tuoi costi' });
    await app.user.click(await within(costs).findByRole('button', { name: 'Registra un costo per questo oggetto' }));
    const form = await within(costs).findByRole('form', { name: 'Nuova spesa' });
    expect(within(form).queryByLabelText('Caldaia collegata (facoltativa)')).not.toBeInTheDocument();
    expect(within(form).getByText(/Destinazione:/)).toHaveTextContent('per l’oggetto «Climatizzatore»');
    await app.user.type(within(form).getByLabelText('Titolo'), 'Pulizia filtri');
    await app.user.type(within(form).getByLabelText('Importo in euro'), '80');
    fireEvent.change(within(form).getByLabelText('Data della spesa'), { target: { value: '2026-10-01' } });
    await app.user.click(within(form).getByRole('button', { name: 'Registra spesa' }));
    expect(await within(costs).findByText('Registrato, collegamento da completare')).toBeInTheDocument();
    expect(within(costs).getByRole('link', { name: 'Pulizia filtri' })).toBeInTheDocument();
    expect(within(costs).getByRole('button', { name: 'Chiudi' })).toBeDisabled();
    const expenseBody = posts(backend, /\/expenses$/)[0]!.body as Record<string, unknown>;
    expect(expenseBody).not.toHaveProperty('assetId');
    await app.user.click(within(costs).getByRole('button', { name: 'Completa il collegamento' }));
    await waitFor(() => expect(within(costs).getByRole('link', { name: 'Pulizia filtri' })).toBeInTheDocument());
    await waitFor(() => expect(within(costs).queryByText('Registrato, collegamento da completare')).not.toBeInTheDocument());
    await waitFor(() => expect(within(costs).getByRole('heading', { name: 'I tuoi costi' })).toHaveFocus());
    const linkPosts = posts(backend, /\/links$/);
    expect(linkPosts).toHaveLength(2);
    expect(linkPosts[1]!.headers['idempotency-key']).toBe(linkPosts[0]!.headers['idempotency-key']);
    expect(posts(backend, /\/expenses$/)).toHaveLength(1);
    expect(backend.expenses.items.size).toBe(1);
    expect([...backend.objects.links.values()].filter((l) => l.state === 'active')).toHaveLength(1);
  });

  it('collegare un costo esistente: esclusi quelli con caldaia nativa; un costo già su un altro oggetto → 409 spiegato', async () => {
    const { backend, owner, home, boiler } = world();
    const mk = (body: Record<string, unknown>) =>
      backend.expenses.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body: { spentOn: '2026-10-01', amountCents: 100, ...body } }, owner.id, home.id, 'expenses');
    await mk({ title: 'Della caldaia', assetId: boiler.id });
    const free = (await mk({ title: 'Libero' })).body as { expense: { id: string } };
    const first = await seedObject(backend, owner.id, home.id, 'Primo');
    const secondObj = await seedObject(backend, owner.id, home.id, 'Secondo');
    await g1(backend, owner.id, home.id, `objects/object/${first.ref.id}/links`, { resourceType: 'expense', resourceId: free.expense.id });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti/object/${secondObj.ref.id}`);
    const costs = await screen.findByRole('region', { name: 'I tuoi costi' });
    await app.user.click(within(costs).getByRole('button', { name: 'Collega un costo esistente' }));
    const choices = await within(costs).findByRole('list', { name: 'Costi da collegare' });
    expect(within(choices).queryByText('Della caldaia')).not.toBeInTheDocument();
    await app.user.click(within(choices).getByRole('button', { name: 'Collega «Libero»' }));
    expect(await within(costs).findByText(/già collegata a un altro oggetto/)).toBeInTheDocument();
  });
});

describe('[mock] G1 — privacy e contesto', () => {
  it('oggetti personali: l’owner non vede quelli del member né li apre per URL; nessun contatore', async () => {
    const { backend, member, home } = world();
    const theirs = await seedObject(backend, member.id, home.id, 'Bici di Mario');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti`);
    const list = await screen.findByRole('list', { name: 'Oggetti' });
    expect(within(list).queryByText('Bici di Mario')).not.toBeInTheDocument();
    expect(within(list).getAllByRole('listitem')).toHaveLength(1); // solo la propria caldaia
    await app.router.navigate(`/home/${home.id}/oggetti/object/${theirs.ref.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Oggetto non disponibile' })).toBeInTheDocument();
    expect(screen.queryByText('Bici di Mario')).not.toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/oggetti/altro/${theirs.ref.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Indirizzo non valido' })).toBeInTheDocument();
  });

  it('revoca: 403 sul catalogo, nessun dato G1 resta a schermo o in cache', async () => {
    const { backend, member, home } = world();
    await seedObject(backend, member.id, home.id, 'Bici di Mario');
    const app = await open(backend, 'member@example.test', PW.member, `/home/${home.id}/oggetti`);
    await screen.findByRole('link', { name: 'Bici di Mario' });
    backend.memberships = backend.memberships.filter((m) => !(m.accountId === member.id && m.homeId === home.id));
    fireEvent.change(screen.getByLabelText('Stato'), { target: { value: 'all' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Accesso non consentito' })).toBeInTheDocument();
    expect(screen.queryByText('Bici di Mario')).not.toBeInTheDocument();
    await waitFor(() => {
      const cached = app.queryClient
        .getQueryCache()
        .getAll()
        .filter((q) => q.queryKey.includes('g1') && q.state.data !== undefined);
      expect(cached).toEqual([]);
    });
  });

  it('cambio account e casa: la bozza non passa; il filtro dell’altro account non torna dal dettaglio', async () => {
    const { backend, owner, home, second } = world();
    await seedObject(backend, owner.id, home.id, 'Forno');
    const app = await open(backend, 'member@example.test', PW.member, `/home/${home.id}/oggetti?nuovo=1`);
    const form = await screen.findByRole('form', { name: 'Nuovo oggetto' });
    await app.user.type(within(form).getByLabelText('Nome'), 'Bozza di Mario');
    await app.router.navigate(`/home/${home.id}/casa`);
    await app.user.click(await screen.findByRole('button', { name: /Esci/ }));
    await login(app, 'owner@example.test', PW.owner);
    await app.router.navigate(`/home/${home.id}/oggetti?nuovo=1`);
    const fresh = await screen.findByRole('form', { name: 'Nuovo oggetto' });
    expect(within(fresh).getByLabelText('Nome')).toHaveValue('');
    await app.router.navigate(`/home/${second.id}/oggetti?nuovo=1`);
    await waitFor(() => expect(screen.getByRole('form', { name: 'Nuovo oggetto' })).toHaveTextContent('Casa Lago'));
    expect(within(screen.getByRole('form', { name: 'Nuovo oggetto' })).getByLabelText('Nome')).toHaveValue('');
  });

  it('risposta persa nella creazione: campi bloccati, riprova con stessa chiave e payload, un solo oggetto', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/oggetti?nuovo=1`);
    const form = await screen.findByRole('form', { name: 'Nuovo oggetto' });
    await app.user.type(within(form).getByLabelText('Nome'), 'Lavatrice');
    app.control.dropNextResponse();
    await app.user.click(within(form).getByRole('button', { name: 'Crea oggetto' }));
    expect(await within(form).findByText('Esito non confermato')).toBeInTheDocument();
    expect(within(form).getByLabelText('Nome')).toBeDisabled();
    expect(within(form).getByRole('button', { name: 'Annulla' })).toBeDisabled();
    await app.user.click(within(form).getByRole('button', { name: 'Riprova invio' }));
    await screen.findByRole('heading', { level: 1, name: 'Lavatrice' });
    const sent = posts(backend, /\/objects$/);
    expect(sent).toHaveLength(2);
    expect(sent[1]!.headers['idempotency-key']).toBe(sent[0]!.headers['idempotency-key']);
    expect(backend.objects.objects.size).toBe(1);
    expect(backend.objects.applied).toHaveLength(1);
  });
});
