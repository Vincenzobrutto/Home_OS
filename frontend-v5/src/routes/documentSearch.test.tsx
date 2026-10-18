import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { downloads } from '../test/browserStubs';
import { FakeBackend, PNG_SIGNATURE, samplePdf } from '../test/fakeBackend';
import { renderApp } from '../test/harness';
import { SingleUploadHarness } from '../test/SingleUploadHarness';
import type { renderApp as RenderApp } from '../test/harness';
import { queryKeys } from '../api/queryKeys';

// H2 document-search-v1 — SOLO MOCK: backend simulato che cerca sull'intero
// dataset autorizzato. Non prova API/DB reali (vedi tests/integration/document-search.int.test.ts).

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
  return { backend, owner, member, viewer, other, home, second, otherHome };
}

async function login(app: App, email: string, password: string) {
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), email);
  await app.user.type(screen.getByLabelText('Password'), password);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
}

async function open(backend: FakeBackend, email: string, password: string, homeId: string, search = '') {
  const app = renderApp({ path: '/accedi', backend, homeTestRoutes: [{ path: 'single-upload-test', element: <SingleUploadHarness /> }] });
  await login(app, email, password);
  await app.router.navigate(`/home/${homeId}/documenti${search}`);
  await screen.findByRole('heading', { level: 1, name: 'Documenti' });
  await waitFor(()=>expect(screen.queryByText('Filtri',{selector:'summary'})??screen.queryByText('Ricerca non attiva')).not.toBeNull());const filters=screen.queryByText('Filtri',{selector:'summary'});if(filters&&!filters.parentElement?.hasAttribute('open'))await app.user.click(filters);
  return app;
}

const field = async () => {const summary=await screen.findByText('Filtri',{selector:'summary'});if(!summary.parentElement?.hasAttribute('open'))fireEvent.click(summary);return screen.findByRole('searchbox', { name: 'Cerca nei documenti' });};

/** Query string delle richieste lista documenti ricevute dal backend. */
const withoutWorkflow = (search:string) => { const params=new URLSearchParams(search);params.delete('workflow');const value=params.toString();return search.startsWith('?')&&value?'?'+value:value; };
const listQueries = (backend: FakeBackend) =>
  backend.log.filter((r) => r.method === 'GET' && /\/documents(\?|$)/.test(r.path)).map((r) => withoutWorkflow(r.path.split('?')[1] ?? ''));

async function search(app: App, text: string) {
  const input = await field();
  await app.user.clear(input);
  if (text) await app.user.type(input, text);
  await app.user.click(screen.getByRole('button', { name: 'Cerca' }));
}

const results = (home = 'Casa Roma') => screen.findByRole('list', { name: `Risultati della ricerca in ${home}` });
const names = (list: HTMLElement) => within(list).getAllByRole('listitem').map((li) => within(li).getByRole('link').textContent);

const png = () => new Uint8Array([...PNG_SIGNATURE, 0, 0, 0, 0]);

describe('[mock] H2 confini della sessione e revoca delle pagine', () => {
  it('401 account_context_changed non trasferisce la ricerca al nuovo account', async () => {
    const { backend, owner, member, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Busta privata' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id, '?q=busta&visibility=private');
    await results();
    const session = [...backend.sessions.values()].find(s => s.accountId === owner.id)!;
    session.accountId = member.id;
    await app.queryClient.invalidateQueries({ queryKey: queryKeys.documentsAll(owner.id, home.id) });
    await waitFor(() => expect(app.router.state.location.pathname).toBe(`/home/${home.id}/documenti`));
    await waitFor(() => expect(withoutWorkflow(app.router.state.location.search)).toBe(''));
    expect(await field()).toHaveValue('');
    expect(screen.queryByText('Busta privata')).not.toBeInTheDocument();
  });

  it('403 sulla pagina successiva elimina anche le pagine precedenti dalla cache', async () => {
    const { backend, member, home } = world();
    for (let i = 0; i < 24; i++) await backend.seedDocument({ homeId: home.id, uploaderId: member.id, name: `Privato ${i}` });
    const app = await open(backend, 'member@example.test', PW.member, home.id, '?q=privato');
    await results();
    backend.memberships = backend.memberships.filter(m => !(m.accountId === member.id && m.homeId === home.id));
    await app.user.click(screen.getByRole('button', { name: 'Mostra altri documenti' }));
    await screen.findByRole('heading', { level: 1, name: 'Accesso non consentito' });
    await waitFor(() => expect(app.queryClient.getQueryCache().getAll().filter(q => q.queryKey.includes('documents') && q.state.data !== undefined)).toHaveLength(0));
  });

  it('lo stato history di un altro account non conserva il link ai suoi filtri', async () => {
    const { backend, owner, home } = world();
    const doc = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Condiviso', visibility: 'home' });
    const app = await open(backend, 'viewer@example.test', PW.viewer, home.id);
    await app.router.navigate(`/home/${home.id}/documenti/${doc.id}`, { state: { documentsSearch: 'q=busta&visibility=private', documentsAccountId: owner.id } });
    await screen.findByRole('heading', { level: 1, name: 'Condiviso' });
    expect(screen.getByRole('link', { name: '← Documenti di Casa Roma' })).toHaveAttribute('href', `/home/${home.id}/documenti`);
  });
});

describe('[mock] H2 ricerca — ingresso, bozza e filtri applicati', () => {
  it('ingresso esplicito ?ricerca=1 porta al campo; apertura normale da Casa non sposta il focus sul campo', async () => {
    const { backend, home } = world();
    const app = renderApp({ path: '/accedi', backend });
    await login(app, 'owner@example.test', PW.owner);
    await app.router.navigate(`/home/${home.id}/casa`);
    await app.router.navigate(`/home/${home.id}/documenti?ricerca=1`);
    await waitFor(() => expect(withoutWorkflow(app.router.state.location.search)).toBe('?ricerca=1'));
    await waitFor(async () => expect(await field()).toHaveFocus());
    expect(listQueries(backend).every((q) => !q.includes('ricerca'))).toBe(true);

    await app.router.navigate(`/home/${home.id}/casa`);
    await app.user.click(await screen.findByRole('link', { name: /Documenti.*Originali e dati salvati/ }));
    await field();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Documenti' })).toHaveFocus());
  });

  it('destinazione e nota; nessuna richiesta a ogni tasto; Cerca applica, filtri nell’URL senza cursor', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito notarile' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Bolletta luce' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    const form = await screen.findByRole('search', { name: 'Cerca nei documenti di Casa Roma' });
    expect(form).toHaveTextContent('Ricerca in: Casa Roma');
    expect(form).toHaveTextContent('La ricerca riguarda titoli e nomi dei file, non il contenuto.');
    expect(await field()).toHaveAttribute('placeholder', 'Titolo o nome del file');
    expect(await field()).not.toHaveFocus();
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    const before = listQueries(backend).length;
    await app.user.type(await field(), 'rogito');
    expect(listQueries(backend)).toHaveLength(before);
    await app.user.click(screen.getByRole('button', { name: 'Cerca' }));
    expect(names(await results())).toEqual(['Rogito notarile']);
    expect(withoutWorkflow(app.router.state.location.search)).toBe('?q=rogito');
    expect(listQueries(backend).at(-1)).toBe('q=rogito&limit=20');
  });

  it('Invio applica insieme testo, formato e visibilità in una sola richiesta', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Foto caldaia', mimeType: 'image/png', bytes: png(), visibility: 'home' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Foto caldaia privata', mimeType: 'image/png', bytes: png() });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Libretto caldaia', visibility: 'home' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    const before = listQueries(backend).length;
    fireEvent.change(screen.getByLabelText('Formato'), { target: { value: 'png' } });
    fireEvent.change(screen.getByLabelText('Visibilità'), { target: { value: 'home' } });
    expect(listQueries(backend)).toHaveLength(before);
    await app.user.type(await field(), 'caldaia{Enter}');
    expect(names(await results())).toEqual(['Foto caldaia']);
    expect(listQueries(backend).slice(before)).toEqual(['q=caldaia&format=png&visibility=home&limit=20']);
    expect(withoutWorkflow(app.router.state.location.search)).toBe('?q=caldaia&format=png&visibility=home');
    expect(screen.getByText(/Risultati per «caldaia» · formato PNG · Persone della casa/)).toBeInTheDocument();
  });

  it('Azzera filtri: lista iniziale M2 e prima pagina, bozza vuota, focus sul campo', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Bolletta' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id, '?q=rogito&format=pdf');
    expect(names(await results())).toEqual(['Rogito']);
    expect(await field()).toHaveValue('rogito');
    expect(screen.getByLabelText('Formato')).toHaveValue('pdf');
    await app.user.click(screen.getByRole('button', { name: 'Azzera filtri' }));
    const list = await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(withoutWorkflow(app.router.state.location.search)).toBe('');
    expect(await field()).toHaveValue('');
    expect(screen.getByLabelText('Formato')).toHaveValue('all');
    expect(await field()).toHaveFocus();
    expect(listQueries(backend).at(-1)).toBe('limit=20');
    expect(screen.getByRole('button', { name: 'Azzera filtri' })).toBeDisabled();
  });
});

describe('[mock] H2 ricerca — semantica (criteri 2–5)', () => {
  it('titolo e nome file diversi: entrambi cercabili, maiuscole ignorate', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito notarile', originalFilename: 'SCAN_0042.pdf' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Bolletta', originalFilename: 'bolletta.pdf' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await search(app, 'scan_0042');
    expect(names(await results())).toEqual(['Rogito notarile']);
    await search(app, 'ROGITO');
    expect(names(await results())).toEqual(['Rogito notarile']);
  });

  it('trim, solo spazi = nessuna ricerca, NFC equivalente su vecchi titoli, accenti distinti', async () => {
    const { backend, owner, home } = world();
    // Titolo salvato in forma decomposta (e + accento combinante), come un vecchio dato M2.
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Verbale caffé' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Manuale caldaia' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await search(app, '   ');
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(withoutWorkflow(app.router.state.location.search)).toBe('');
    await search(app, '  caffé  ');
    expect(names(await results())).toEqual(['Verbale caffé']);
    expect(listQueries(backend).at(-1)).toBe(`q=${encodeURIComponent('caffé')}&limit=20`);
    await search(app, 'caldàia');
    expect(await screen.findByRole('heading', { name: 'Nessun documento corrisponde ai filtri' })).toBeInTheDocument();
  });

  it('%, _, backslash, apostrofo e testo SQL-like sono letterali; nessun HTML interpretato', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Sconto 50%' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'file_a' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'fileXa' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'cartella\\vecchia' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'L’atto e l\'atto' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: '<b>grassetto</b>' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await search(app, '%');
    expect(names(await results())).toEqual(['Sconto 50%']);
    await search(app, 'file_');
    expect(names(await results())).toEqual(['file_a']);
    await search(app, '\\');
    expect(names(await results())).toEqual(['cartella\\vecchia']);
    await search(app, "l'atto");
    expect(names(await results())).toEqual(['L’atto e l\'atto']);
    await search(app, "' OR 1=1 --");
    expect(await screen.findByRole('heading', { name: 'Nessun documento corrisponde ai filtri' })).toBeInTheDocument();
    expect(screen.getByText(/«' OR 1=1 --»/)).toBeInTheDocument();
    await search(app, '<b>');
    const list = await results();
    expect(within(list).getByRole('link', { name: '<b>grassetto</b>' })).toBeInTheDocument();
    expect(list.querySelector('b')).toBeNull();
  });

  it('120 code point ammessi, 121 errore locale senza richiesta; controlli dall’indirizzo non inviati', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await screen.findByText('Non ci sono documenti da completare');
    const before = listQueries(backend).length;
    const input = await field();
    fireEvent.change(input, { target: { value: '🔥'.repeat(121) } });
    await app.user.click(screen.getByRole('button', { name: 'Cerca' }));
    expect(await screen.findByText('La ricerca può avere al massimo 120 caratteri.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    expect(listQueries(backend)).toHaveLength(before);
    fireEvent.change(input, { target: { value: '🔥'.repeat(120) } });
    await app.user.click(screen.getByRole('button', { name: 'Cerca' }));
    await screen.findByRole('heading', { name: 'Nessun documento corrisponde ai filtri' });
    expect(listQueries(backend)).toHaveLength(before + 1);

    await app.router.navigate(`/home/${home.id}/documenti?q=${encodeURIComponent('a\nb')}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('caratteri non ammessi');
    expect(listQueries(backend)).toHaveLength(before + 1);
  });

  it('formato secondo il MIME verificato, non l’estensione del nome', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Foto', originalFilename: 'foto.pdf', mimeType: 'image/png', bytes: png() });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Contratto', originalFilename: 'contratto.pdf' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id, '?format=pdf');
    expect(names(await results())).toEqual(['Contratto']);
    fireEvent.change(screen.getByLabelText('Formato'), { target: { value: 'png' } });
    await app.user.click(screen.getByRole('button', { name: 'Cerca' }));
    await waitFor(async () => expect(names(await results())).toEqual(['Foto']));
  });
});

describe('[mock] H2 ricerca — stati, paginazione e selezione', () => {
  it('casa vuota, zero risultati e errore sono stati distinti (criterio 1)', async () => {
    const { backend, owner, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    expect(await screen.findByText('Non ci sono documenti da completare')).toBeInTheDocument();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito' });
    await search(app, 'mutuo');
    expect(await screen.findByRole('heading', { name: 'Nessun documento corrisponde ai filtri' })).toBeInTheDocument();
    expect(screen.queryByText('Non ci sono documenti da completare')).not.toBeInTheDocument();
    backend.storageDown = true;
    await search(app, 'rogito');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ricerca non riuscita');
    expect(screen.queryByText(/Nessun documento/)).not.toBeInTheDocument();
    backend.storageDown = false;
    await app.user.click(within(alert).getByRole('button', { name: 'Riprova' }));
    expect(names(await results())).toEqual(['Rogito']);
  });

  it('risultato oltre la prima pagina M2 trovato dal server; pagine filtrate senza duplicati con cursor della ricerca', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Atto antico' });
    for (let i = 1; i <= 24; i++) await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: `Bolletta ${i}` });
    for (let i = 1; i <= 21; i++) await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: `Ricevuta ${i}` });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    await search(app, 'antico');
    expect(names(await results())).toEqual(['Atto antico']);
    await search(app, 'bolletta');
    const list = await results();
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    expect(screen.getByText(/ce ne sono altri/)).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Mostra altri documenti' }));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(24));
    const shown = names(list);
    expect(new Set(shown).size).toBe(24);
    expect(shown.every((n) => n!.startsWith('Bolletta'))).toBe(true);
    expect(listQueries(backend).at(-1)).toMatch(/^q=bolletta&limit=20&cursor=s\.[0-9a-z]+\.20$/);
    expect(listQueries(backend).at(-1)).not.toContain('bolletta&limit=20&cursor=c');
  });

  it('nuovi filtri azzerano la selezione ZIP; «Mostra altri» con gli stessi filtri la conserva; export solo dei visibili', async () => {
    const { backend, owner, home } = world();
    for (let i = 1; i <= 22; i++) await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: `Bolletta ${i}` });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await search(app, 'bolletta');
    await results();
    await app.user.click(screen.getByRole('button', { name: 'Esporta ZIP' }));
    await app.user.click(screen.getByRole('checkbox', { name: /Seleziona «Bolletta 22»/ }));
    expect(screen.getByText(/1 selezionato/)).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Mostra altri documenti' }));
    await screen.findByRole('checkbox', { name: /Seleziona «Bolletta 1»/ });
    expect(screen.getByRole('checkbox', { name: /Seleziona «Bolletta 22»/ })).toBeChecked();
    expect(screen.getByText(/1 selezionato/)).toBeInTheDocument();

    await search(app, 'rogito');
    await results();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Esporta ZIP' }));
    await app.user.click(await screen.findByRole('checkbox', { name: /Seleziona «Rogito»/ }));
    expect(screen.getByText(/1 selezionato/)).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Esporta ZIP' }));
    await waitFor(() => expect(downloads).toHaveLength(1));
    const req = backend.log.find((r) => r.path.endsWith('/export'))!;
    const rogito = [...backend.documents.values()].find((d) => d.name === 'Rogito')!;
    expect((req.body as { documentIds: string[] }).documentIds).toEqual([rogito.id]);
  });

  it('ritorno dal dettaglio e ricarica conservano i filtri nello stesso account e casa', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito', visibility: 'home' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Bolletta', visibility: 'home' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await search(app, 'rogito');
    await app.user.click(within(await results()).getByRole('link', { name: 'Rogito' }));
    await screen.findByRole('heading', { level: 1, name: 'Rogito' });
    await app.user.click(screen.getByRole('link', { name: /Documenti di Casa Roma/ }));
    expect(names(await results())).toEqual(['Rogito']);
    expect(withoutWorkflow(app.router.state.location.search)).toBe('?q=rogito');
    expect(await field()).toHaveValue('rogito');

    const cookie = app.control.cookie();
    app.unmount();
    const reloaded = renderApp({ path: `/home/${home.id}/documenti?q=rogito`, backend, cookie });
    expect(names(await results())).toEqual(['Rogito']);
    expect(await field()).toHaveValue('rogito');
    expect(withoutWorkflow(reloaded.router.state.location.search)).toBe('?q=rogito');
  });

  it('upload dal componente singolo riusato: la ricerca viene invalidata e trova il nuovo originale', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, home.id, '?q=rogito');
    await screen.findByRole('heading', { name: 'Nessun documento corrisponde ai filtri' });
    await app.router.navigate(`/home/${home.id}/single-upload-test?q=rogito`);
    await app.user.click(await screen.findByRole('button', { name: 'Apri uploader singolo di prova' }));
    await screen.findByRole('heading', { name: 'Carica documento' });
    const file = new File([samplePdf('rogito') as BlobPart], 'Rogito 2020.pdf', { type: 'application/pdf' });
    await app.user.upload(screen.getByLabelText('File'), file);
    await app.user.click(screen.getByRole('button', { name: 'Carica' }));
    await screen.findByText('Documento caricato');
    expect(names(await results())).toEqual(['Rogito 2020.pdf']);
  });

  it('la selezione dell’analisi M3/M4 resta sulla lista non filtrata', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Libretto caldaia' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await search(app, 'rogito');
    await results();
    const before = listQueries(backend).length;
    await app.router.navigate(`/home/${home.id}/attivita?analizza=1`);
    await screen.findByText('Libretto caldaia');
    expect(screen.getByText('Rogito')).toBeInTheDocument();
    const after = listQueries(backend).slice(before);
    expect(after.every((q) => !/(^|&)(q|format|visibility)=/.test(q))).toBe(true);
  });
});

describe('[mock] H2 ricerca — gare, contesto e permessi', () => {
  it('due ricerche in rapida successione: la prima è annullata e non popola la pagina', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Lento documento' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rapido documento' });
    let release: () => void = () => {};
    backend.listGate = (q) => (q.get('q') === 'lento' ? new Promise((r) => (release = r)) : Promise.resolve());
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    await search(app, 'lento');
    await waitFor(() => expect(listQueries(backend).at(-1)).toBe('q=lento&limit=20'));
    expect(screen.getByText('Ricerca in corso…')).toBeInTheDocument();
    await search(app, 'rapido');
    expect(names(await results())).toEqual(['Rapido documento']);
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('Lento documento')).not.toBeInTheDocument();
    const slow = app.control.calls.find((c) => c.url.includes('q=lento'))!;
    expect(slow.init.signal?.aborted).toBe(true);
  });

  it('cambio account durante una ricerca lenta: la risposta tardiva non popola il nuovo account', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Privato di Olga' });
    let release: () => void = () => {};
    let gated = false;
    // Solo la prima ricerca (account Olga) resta in attesa.
    backend.listGate = (q) => {
      if (q.get('q') !== 'privato' || gated) return Promise.resolve();
      gated = true;
      return new Promise((r) => (release = r));
    };
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    await search(app, 'privato');
    await waitFor(() => expect(listQueries(backend).at(-1)).toBe('q=privato&limit=20'));
    await app.user.click(screen.getByRole('button', { name: /Esci/ }));
    await login(app, 'member@example.test', PW.member);
    await app.router.navigate(`/home/${home.id}/documenti?q=privato`);
    await screen.findByRole('heading', { name: 'Nessun documento corrisponde ai filtri' });
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('Privato di Olga')).not.toBeInTheDocument();
    const keys = app.queryClient.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys.filter((k) => k[0] === 'account').every((k) => k[1] !== owner.id)).toBe(true);
  });

  it('privati altrui esclusi anche all’owner; «Solo io» = propri privati; «Persone della casa» = home', async () => {
    const { backend, owner, member, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: member.id, name: 'Caldaia privata di Mario' });
    await backend.seedDocument({ homeId: home.id, uploaderId: member.id, name: 'Caldaia condivisa', visibility: 'home' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Caldaia mia' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id, '?q=caldaia');
    expect(names(await results()).sort()).toEqual(['Caldaia condivisa', 'Caldaia mia']);
    await app.router.navigate(`/home/${home.id}/documenti?q=caldaia&visibility=private`);
    await waitFor(async () => expect(names(await results())).toEqual(['Caldaia mia']));
    await app.router.navigate(`/home/${home.id}/documenti?q=caldaia&visibility=home`);
    await waitFor(async () => expect(names(await results())).toEqual(['Caldaia condivisa']));
    expect(screen.queryByText('Caldaia privata di Mario')).not.toBeInTheDocument();
  });

  it('viewer cerca e apre i documenti leggibili, senza caricamento né selezione ZIP', async () => {
    const { backend, owner, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Regolamento', visibility: 'home' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Regolamento privato' });
    const app = await open(backend, 'viewer@example.test', PW.viewer, home.id);
    await search(app, 'regolamento');
    const list = await results();
    expect(names(list)).toEqual(['Regolamento']);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carica documento' })).not.toBeInTheDocument();
    await app.user.click(within(list).getByRole('link', { name: 'Regolamento' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Regolamento' })).toBeInTheDocument();
  });

  it('accesso revocato: 403 sulla ricerca blocca e non lascia risultati in pagina o in cache', async () => {
    const { backend, member, home } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: member.id, name: 'Rogito di Mario', visibility: 'home' });
    await backend.seedDocument({ homeId: home.id, uploaderId: member.id, name: 'Bolletta di Mario' });
    const app = await open(backend, 'member@example.test', PW.member, home.id);
    await search(app, 'mario');
    expect(names(await results())).toHaveLength(2);
    backend.memberships = backend.memberships.filter((m) => !(m.accountId === member.id && m.homeId === home.id));
    await search(app, 'rogito');
    expect(await screen.findByRole('heading', { level: 1, name: 'Accesso non consentito' })).toBeInTheDocument();
    expect(screen.queryByText(/di Mario/)).not.toBeInTheDocument();
    const cached = app.queryClient
      .getQueryCache()
      .getAll()
      .filter((q) => q.queryKey.includes('documents') && !q.queryKey.includes('search-capabilities') && q.state.data !== undefined)
      .map((q) => q.queryKey);
    expect(cached).toEqual([]);
  });

  it('capabilities 404: ricerca non attiva, lista M2 consultabile, filtri nell’URL mai applicati localmente', async () => {
    const { backend, owner, home } = world();
    backend.documentSearchEnabled = false;
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Bolletta' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    expect(await screen.findByText(/non è ancora attiva su questo servizio/)).toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    await app.router.navigate(`/home/${home.id}/documenti?q=rogito`);
    expect(await screen.findByRole('heading', { name: 'Filtri non applicati' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /Documenti di|Risultati/ })).not.toBeInTheDocument();
    expect(listQueries(backend).some((q) => q.includes('q='))).toBe(false);
    await app.user.click(screen.getByRole('button', { name: 'Mostra tutti i documenti' }));
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
  });

  it('capabilities 503: ricerca non disponibile con Riprova; poi torna operativa', async () => {
    const { backend, owner, home } = world();
    backend.documentSearchDown = true;
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    expect(await screen.findByText(/non è disponibile in questo momento/)).toBeInTheDocument();
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    backend.documentSearchDown = false;
    await app.user.click(screen.getByRole('button', { name: 'Riprova' }));
    await search(app, 'rogito');
    expect(names(await results())).toEqual(['Rogito']);
  });

  it('cambio casa: filtri, bozza e risultati non seguono l’utente', async () => {
    const { backend, owner, home, second } = world();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito Roma' });
    const app = await open(backend, 'owner@example.test', PW.owner, home.id);
    await search(app, 'rogito');
    await results();
    await app.user.type(await field(), ' bozza');
    await app.router.navigate(`/home/${second.id}/documenti`);
    await screen.findByText('Non ci sono documenti da completare');
    expect(await field()).toHaveValue('');
    expect(screen.queryByText('Rogito Roma')).not.toBeInTheDocument();
    expect(await screen.findByRole('search', { name: 'Cerca nei documenti di Casa Lago' })).toHaveTextContent('Ricerca in: Casa Lago');
  });
});

it('search is visible immediately and includes completed documents by default, with explicit scope filters',async()=>{
 const {backend,owner,home}=world();await backend.seedDocument({homeId:home.id,uploaderId:owner.id,name:'Fattura completata',workflowState:'completed'});
 const app=await open(backend,owner.email,PW.owner,home.id);
 expect(screen.getByRole('searchbox',{name:'Cerca nei documenti'})).toBeVisible();
 await search(app,'Fattura');expect(await screen.findByRole('link',{name:'Fattura completata'})).toBeInTheDocument();expect(app.router.state.location.search).not.toContain('workflow=pending');
 await app.user.click(screen.getByRole('button',{name:'Vedi dettagli'}));await app.user.click(await screen.findByRole('link',{name:/← Documenti di/}));await results();expect(app.router.state.location.search).not.toContain('workflow=pending');
 await app.user.selectOptions(screen.getByRole('combobox',{name:'Cerca in'}),'pending');await app.user.click(screen.getByRole('button',{name:'Cerca'}));
 await screen.findByRole('heading',{name:'Nessun documento corrisponde ai filtri'});expect(app.router.state.location.search).toContain('workflow=pending');
});
