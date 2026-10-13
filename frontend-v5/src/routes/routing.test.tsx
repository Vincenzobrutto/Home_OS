import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PASSWORD_A, PASSWORD_B, renderApp, seededBackend } from '../test/harness';
import type { FakeBackend } from '../test/fakeBackend';
import type { renderApp as RenderApp } from '../test/harness';

async function loginAs(app: ReturnType<typeof RenderApp>, email: string, password: string) {
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), email);
  await app.user.type(screen.getByLabelText('Password'), password);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
}

/** Simula un utente con sessione già attiva (cookie presente) prima del caricamento. */
function withLoggedIn(backend: FakeBackend, path: string, email: string, password: string) {
  const app = renderApp({ path: '/accedi', backend });
  return { app, go: async () => {
    await loginAs(app, email, password);
    // Attende la fine dell'ingresso ("/" reindirizza dopo aver letto le case).
    await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
    await app.router.navigate(path);
  } };
}

describe('[mock] routing e contesto casa via URL', () => {
  it('URL privato da anonimo: login con next, poi ritorno alla casa richiesta', async () => {
    const { backend, homeA2 } = seededBackend();
    const app = renderApp({ path: `/home/${homeA2.id}/casa`, backend });
    await screen.findByRole('heading', { name: 'Accedi' });
    expect(app.router.state.location.pathname).toBe('/accedi');
    expect(app.router.state.location.search).toBe(`?next=${encodeURIComponent(`/home/${homeA2.id}/casa`)}`);
    expect(screen.getByText('Accesso richiesto')).toBeInTheDocument();
    await loginAs(app, 'a@example.test', PASSWORD_A);
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa al mare' })).toBeInTheDocument();
    expect(app.router.state.location.pathname).toBe(`/home/${homeA2.id}/casa`);
  });

  it('più case: scelta esplicita, nessuna selezione automatica', async () => {
    const { backend, homeA1 } = seededBackend();
    const app = renderApp({ path: '/accedi', backend });
    await loginAs(app, 'a@example.test', PASSWORD_A);
    const list = await screen.findByRole('list', { name: 'Case disponibili' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(app.router.state.location.pathname).toBe('/case');
    await app.user.click(within(list).getByRole('link', { name: /Appartamento Roma/ }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Appartamento Roma' });
    // Focus sul titolo definitivo, non su quello provvisorio del caricamento.
    await waitFor(() => expect(heading).toHaveFocus());
    expect(app.router.state.location.pathname).toBe(`/home/${homeA1.id}/casa`);
  });

  it('una sola casa: dopo l’accesso si entra direttamente; "Cambia casa" mostra comunque l’elenco', async () => {
    const { backend, homeB1 } = seededBackend();
    const app = renderApp({ path: '/accedi', backend });
    await loginAs(app, 'b@example.test', PASSWORD_B);
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa di Marco' })).toBeInTheDocument();
    expect(app.router.state.location.pathname).toBe(`/home/${homeB1.id}/casa`);
    await app.user.click(screen.getByRole('link', { name: 'Cambia casa' }));
    const list = await screen.findByRole('list', { name: 'Case disponibili' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(app.router.state.location.pathname).toBe('/case');
    expect(screen.getByRole('link', { name: /Aggiungi una casa/ })).toBeInTheDocument();
  });

  it('una sola casa: anche aprendo l’app con sessione attiva si entra direttamente', async () => {
    const { backend, homeB1 } = seededBackend();
    const first = renderApp({ path: '/accedi', backend });
    await loginAs(first, 'b@example.test', PASSWORD_B);
    await screen.findByRole('heading', { level: 1, name: 'Casa di Marco' });
    const cookie = first.control.cookie();
    first.unmount();
    const app = renderApp({ path: '/', backend, cookie });
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa di Marco' })).toBeInTheDocument();
    expect(app.router.state.location.pathname).toBe(`/home/${homeB1.id}/casa`);
  });

  it('URL diretto di una casa: il contesto è quello dell’URL e il dettaglio viene dal server', async () => {
    const { backend, homeA2 } = seededBackend();
    const { app, go } = withLoggedIn(backend, `/home/${homeA2.id}/casa`, 'a@example.test', PASSWORD_A);
    await go();
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa al mare' })).toBeInTheDocument();
    expect(screen.getAllByText('Membro').length).toBeGreaterThan(0);
    expect(backend.log.some((r) => r.path === `/homes/${homeA2.id}`)).toBe(true);
    // Le sezioni mantengono la casa nell'URL.
    const nav = screen.getAllByRole('navigation', { name: 'Sezioni di Casa al mare' })[0]!;
    await app.user.click(within(nav).getByRole('link', { name: /Documenti/ }));
    expect(app.router.state.location.pathname).toBe(`/home/${homeA2.id}/documenti`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Documenti' })).toBeInTheDocument();
    // Spese resta non disponibile; Attività è attiva da M3.
    await app.user.click(within(nav).getByRole('link', { name: /Spese/ }));
    expect(app.router.state.location.pathname).toBe(`/home/${homeA2.id}/spese`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Spese' })).toBeInTheDocument();
    expect(screen.getByText('Non ancora disponibile')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Attività/ })).not.toHaveTextContent('non ancora disponibile');
    expect(within(nav).getByRole('link', { name: /Spese/ })).toHaveTextContent('non ancora disponibile');
    expect(within(nav).getByRole('link', { name: /Documenti/ })).not.toHaveTextContent('non ancora disponibile');
  });

  it('/home/:id senza sezione porta a Casa', async () => {
    const { backend, homeA1 } = seededBackend();
    const { app, go } = withLoggedIn(backend, `/home/${homeA1.id}`, 'a@example.test', PASSWORD_A);
    await go();
    await waitFor(() => expect(app.router.state.location.pathname).toBe(`/home/${homeA1.id}/casa`));
  });

  it('casa di un altro account: 403 senza contenuti, mai un elenco vuoto', async () => {
    const { backend, homeB1 } = seededBackend();
    const { go } = withLoggedIn(backend, `/home/${homeB1.id}/casa`, 'a@example.test', PASSWORD_A);
    await go();
    expect(await screen.findByRole('heading', { level: 1, name: 'Accesso non consentito' })).toBeInTheDocument();
    expect(screen.queryByText('Casa di Marco')).not.toBeInTheDocument();
    expect(screen.queryByText(/Via Verdi/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vai alle mie case' })).toBeInTheDocument();
  });

  it('Agenzie e Amministratori sono visibili come non disponibili e non navigabili', async () => {
    const { backend } = seededBackend();
    const app = renderApp({ path: '/accedi', backend });
    await loginAs(app, 'a@example.test', PASSWORD_A);
    const exp = await screen.findByRole('list', { name: 'Esperienze Dimora' });
    expect(within(exp).getByText('Agenzie').closest('li')).toHaveTextContent('non ancora disponibile');
    expect(within(exp).queryAllByRole('link')).toHaveLength(0);
  });

  it('rotta sconosciuta: pagina non trovata', async () => {
    renderApp({ path: '/qualcosa-che-non-esiste' });
    expect(await screen.findByRole('heading', { name: 'Pagina non trovata' })).toBeInTheDocument();
  });

  it('backend che cade durante il caricamento delle case: errore + Riprova, non onboarding', async () => {
    const { backend } = seededBackend();
    const app = renderApp({ path: '/accedi', backend });
    await screen.findByRole('heading', { name: 'Accedi' });
    await app.user.type(screen.getByLabelText('Email'), 'a@example.test');
    await app.user.type(screen.getByLabelText('Password'), PASSWORD_A);
    // login + GET /session passano, GET /homes fallisce come rete.
    const original = backend.handle.bind(backend);
    backend.handle = async (req) => (req.path === '/homes' ? { status: 503, body: { error: { code: 'down', message: 'giù' } } } : original(req));
    await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('non è raggiungibile');
    expect(screen.queryByText('Crea la tua prima casa')).not.toBeInTheDocument();
    backend.handle = original;
    await app.user.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByRole('list', { name: 'Case disponibili' })).toBeInTheDocument();
  });
});
