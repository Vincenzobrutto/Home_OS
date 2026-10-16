import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';

const PASSWORD = 'password-di-prova-Z';

async function startWithNoHomes() {
  const backend = new FakeBackend();
  backend.seedAccount('Zeta', 'z@example.test', PASSWORD);
  const app = renderApp({ path: '/accedi', backend });
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), 'z@example.test');
  await app.user.type(screen.getByLabelText('Password'), PASSWORD);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await screen.findByRole('heading', { name: 'Crea la tua prima casa' });
  return app;
}

const homePosts = (backend: FakeBackend) => backend.log.filter((r) => r.method === 'POST' && r.path === '/homes');

describe('[mock] creazione casa e idempotenza', () => {
  it('zero case = onboarding; creazione porta alla nuova casa', async () => {
    const app = await startWithNoHomes();
    await app.user.type(screen.getByLabelText(/Nome della casa/), '  Casa nuova ');
    await app.user.type(screen.getByLabelText(/Indirizzo/), 'Via Nuova 1');
    await app.user.click(screen.getByRole('button', { name: 'Crea casa' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa nuova' })).toBeInTheDocument();
    expect(app.router.state.location.pathname).toMatch(/^\/home\/[^/]+\/casa$/);
    expect(homePosts(app.backend)[0]!.body).toEqual({ name: 'Casa nuova', address: 'Via Nuova 1' });
  });

  it('campi vuoti: errori locali, nessuna richiesta', async () => {
    const app = await startWithNoHomes();
    await app.user.click(screen.getByRole('button', { name: 'Crea casa' }));
    expect(screen.getByLabelText(/Nome della casa/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Nome della casa/)).toHaveFocus();
    expect(homePosts(app.backend)).toHaveLength(0);
  });

  it('risposta persa → Riprova con la stessa chiave: nessun doppione', async () => {
    const app = await startWithNoHomes();
    await app.user.type(screen.getByLabelText(/Nome della casa/), 'Casa unica');
    await app.user.type(screen.getByLabelText(/Indirizzo/), 'Via 1');
    app.control.dropNextResponse();
    await app.user.click(screen.getByRole('button', { name: 'Crea casa' }));
    expect(await screen.findByText('Esito non confermato')).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa unica' })).toBeInTheDocument();
    const posts = homePosts(app.backend);
    expect(posts).toHaveLength(2);
    expect(posts[0]!.headers['idempotency-key']).toBe(posts[1]!.headers['idempotency-key']);
    expect(app.backend.homes.size).toBe(1);
  });

  it('stessa chiave con dati cambiati → 409 esplicito; "nuova richiesta" usa una nuova chiave', async () => {
    const app = await startWithNoHomes();
    await app.user.type(screen.getByLabelText(/Nome della casa/), 'Prima');
    await app.user.type(screen.getByLabelText(/Indirizzo/), 'Via 1');
    app.control.dropNextResponse();
    await app.user.click(screen.getByRole('button', { name: 'Crea casa' }));
    await screen.findByText('Esito non confermato');
    await app.user.clear(screen.getByLabelText(/Nome della casa/));
    await app.user.type(screen.getByLabelText(/Nome della casa/), 'Seconda');
    await app.user.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByText('Richiesta in conflitto')).toBeInTheDocument();
    expect(app.backend.homes.size).toBe(1);
    await app.user.click(screen.getByRole('button', { name: 'Invia come nuova richiesta' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Seconda' })).toBeInTheDocument();
    const keys = homePosts(app.backend).map((r) => r.headers['idempotency-key']);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('422 del server mostrato sul campo', async () => {
    const app = await startWithNoHomes();
    const original = app.backend.handle.bind(app.backend);
    app.backend.handle = async (req) =>
      req.method === 'POST' && req.path === '/homes'
        ? { status: 422, body: { error: { code: 'validation_failed', message: 'Controlla i campi.', fieldErrors: { address: 'Indirizzo non accettato.' } } } }
        : original(req);
    await app.user.type(screen.getByLabelText(/Nome della casa/), 'Casa');
    await app.user.type(screen.getByLabelText(/Indirizzo/), 'Via 1');
    await app.user.click(screen.getByRole('button', { name: 'Crea casa' }));
    expect(await screen.findByText('Indirizzo non accettato.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Indirizzo/)).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('[mock] pagina senza case: ingresso per chi ha ricevuto un codice (HOME-CONS-001)', () => {
  it('zero case: «Hai ricevuto un codice?» prima del modulo; porta al percorso destinatario senza creare case', async () => {
    const app = await startWithNoHomes();
    expect(screen.getByRole('heading', { level: 1, name: 'Inizia con Dimora' })).toBeInTheDocument();
    const codeCard = screen.getByRole('heading', { level: 2, name: 'Hai ricevuto un codice?' });
    const form = screen.getByRole('form', { name: 'Nuova casa' });
    expect(codeCard.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/non serve creare una casa/)).toBeInTheDocument();
    expect(screen.getByText(/Non ti dà accesso alla casa di chi li invia/)).toBeInTheDocument();
    const card = codeCard.closest('section')!;
    expect(within(card).getByRole('link', { name: 'Consegne ricevute' })).toHaveAttribute('href', '/consegne');
    expect(within(card).getByRole('link', { name: 'Inserisci il codice' })).toHaveAttribute('href', '/consegne/codice');
    const posts = () => app.backend.log.filter((r) => r.method === 'POST' && r.path !== '/auth/login');
    expect(posts()).toHaveLength(0); // nessuna richiesta finché l'utente non sceglie
    await app.user.click(within(card).getByRole('link', { name: 'Inserisci il codice' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Inserisci il codice' })).toBeInTheDocument();
    expect(app.router.state.location.pathname).toBe('/consegne/codice');
    expect(app.router.state.location.search).toBe('');
    expect(homePosts(app.backend)).toHaveLength(0);
    expect(posts()).toHaveLength(0);
    expect(app.backend.homes.size).toBe(0);
  });

  it('errore nel caricamento delle case: nessuna scheda codice né modulo al posto dell’errore', async () => {
    const backend = new FakeBackend();
    backend.seedAccount('Zeta', 'z@example.test', PASSWORD);
    const original = backend.handle.bind(backend);
    backend.handle = async (req) => (req.method === 'GET' && req.path === '/homes' ? { status: 503 } : original(req));
    const app = renderApp({ path: '/accedi', backend });
    await screen.findByRole('heading', { name: 'Accedi' });
    await app.user.type(screen.getByLabelText('Email'), 'z@example.test');
    await app.user.type(screen.getByLabelText('Password'), PASSWORD);
    await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
    // Aspetta l'esito dell'ingresso prima di avviare una seconda navigazione.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await app.router.navigate('/case');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Hai ricevuto un codice?')).toBeNull();
    expect(screen.queryByRole('form', { name: 'Nuova casa' })).toBeNull();
  });

  it('elenco case in caricamento: la scheda compare solo quando il server conferma zero case', async () => {
    const backend = new FakeBackend();
    backend.seedAccount('Zeta', 'z@example.test', PASSWORD);
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const original = backend.handle.bind(backend);
    backend.handle = async (req) => {
      if (req.method === 'GET' && req.path === '/homes') await gate;
      return original(req);
    };
    const app = renderApp({ path: '/accedi', backend });
    await screen.findByRole('heading', { name: 'Accedi' });
    await app.user.type(screen.getByLabelText('Email'), 'z@example.test');
    await app.user.type(screen.getByLabelText('Password'), PASSWORD);
    await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
    await waitFor(() => expect(app.router.state.location.pathname).not.toBe('/accedi'));
    await app.router.navigate('/case');
    expect(await screen.findByText('Caricamento delle case…')).toBeInTheDocument();
    expect(screen.queryByText('Hai ricevuto un codice?')).toBeNull();
    expect(screen.queryByRole('form', { name: 'Nuova casa' })).toBeNull();
    release();
    expect(await screen.findByText('Hai ricevuto un codice?')).toBeInTheDocument();
  });

  it('con almeno una casa: nessuna scheda codice nel selettore', async () => {
    const backend = new FakeBackend();
    const acc = backend.seedAccount('Zeta', 'z@example.test', PASSWORD);
    backend.seedHome(acc.id, 'Casa Uno', 'Via 1');
    backend.seedHome(acc.id, 'Casa Due', 'Via 2');
    const app = renderApp({ path: '/accedi', backend });
    await screen.findByRole('heading', { name: 'Accedi' });
    await app.user.type(screen.getByLabelText('Email'), 'z@example.test');
    await app.user.type(screen.getByLabelText('Password'), PASSWORD);
    await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Le mie case' })).toBeInTheDocument();
    expect(screen.queryByText('Hai ricevuto un codice?')).toBeNull();
  });
});
