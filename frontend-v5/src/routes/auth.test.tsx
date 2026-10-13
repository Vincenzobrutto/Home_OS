import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PASSWORD_A, renderApp, seededBackend } from '../test/harness';

describe('[mock] form di accesso e registrazione', () => {
  it('anonimo: la radice porta al login', async () => {
    const { backend, router } = renderApp({ path: '/', backend: seededBackend().backend });
    expect(await screen.findByRole('heading', { name: 'Accedi' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/accedi');
    // Sessione anonima letta, nessuna chiamata protetta.
    expect(backend.log.map((r) => r.path)).toEqual(['/session']);
  });

  it('errori di campo client: email non valida e password vuota, focus sul primo campo', async () => {
    const { user } = renderApp({ path: '/accedi' });
    await screen.findByRole('heading', { name: 'Accedi' });
    await user.type(screen.getByLabelText('Email'), 'non-email');
    await user.click(screen.getByRole('button', { name: 'Accedi' }));
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Inserisci un indirizzo email valido.');
    expect(email).toHaveFocus();
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Inserisci la password.');
  });

  it('credenziali errate: messaggio generico del server, password svuotata, nessun redirect', async () => {
    const { user, router } = renderApp({ path: '/accedi', backend: seededBackend().backend });
    await screen.findByRole('heading', { name: 'Accedi' });
    await user.type(screen.getByLabelText('Email'), 'a@example.test');
    await user.type(screen.getByLabelText('Password'), 'sbagliata-sbagliata');
    await user.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o password non corretti.');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(router.state.location.pathname).toBe('/accedi');
  });

  it('login riuscito: nuova GET /session per il CSRF ruotato e arrivo su /case', async () => {
    const { user, router, backend } = renderApp({ path: '/accedi', backend: seededBackend().backend });
    await screen.findByRole('heading', { name: 'Accedi' });
    await user.type(screen.getByLabelText('Email'), '  a@example.test ');
    await user.type(screen.getByLabelText('Password'), PASSWORD_A);
    await user.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByRole('heading', { name: 'Le mie case' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/case');
    const paths = backend.log.map((r) => `${r.method} ${r.path}`);
    expect(paths.slice(0, 4)).toEqual(['GET /session', 'POST /auth/login', 'GET /session', 'GET /homes']);
    expect(backend.log[1]!.body).toEqual({ email: 'a@example.test', password: PASSWORD_A });
  });

  it('la password è mostrabile con un pulsante accessibile', async () => {
    const { user } = renderApp({ path: '/accedi' });
    await screen.findByRole('heading', { name: 'Accedi' });
    const toggle = screen.getByRole('button', { name: 'Mostra' });
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    await user.click(toggle);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Nascondi' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('registrazione: validazione locale, poi 422 del server mappato sui campi', async () => {
    const { user, backend } = renderApp({ path: '/registrati' });
    await screen.findByRole('heading', { name: 'Crea un account' });
    expect(screen.getByText('Solo sviluppo locale')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome'), 'Giulia');
    await user.type(screen.getByLabelText('Email'), 'giulia@example.test');
    await user.type(screen.getByLabelText(/^Password/), 'corta');
    await user.click(screen.getByRole('button', { name: 'Crea account' }));
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute('aria-invalid', 'true');
    expect(backend.log.some((r) => r.path === '/auth/register')).toBe(false);
  });

  it('registrazione: 409 generico mostrato senza dettagli su altri account', async () => {
    const { user } = renderApp({ path: '/registrati', backend: seededBackend().backend });
    await screen.findByRole('heading', { name: 'Crea un account' });
    await user.type(screen.getByLabelText('Nome'), 'Doppione');
    await user.type(screen.getByLabelText('Email'), 'a@example.test');
    await user.type(screen.getByLabelText(/^Password/), 'una-password-valida');
    await user.click(screen.getByRole('button', { name: 'Crea account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Registrazione non completabile con questi dati.');
  });

  it('registrazione riuscita: account creato, onboarding con zero case', async () => {
    const { user, router } = renderApp({ path: '/registrati' });
    await screen.findByRole('heading', { name: 'Crea un account' });
    await user.type(screen.getByLabelText('Nome'), 'Nuovo Utente');
    await user.type(screen.getByLabelText('Email'), 'nuovo@example.test');
    await user.type(screen.getByLabelText(/^Password/), ' spazi inclusi ');
    await user.click(screen.getByRole('button', { name: 'Crea account' }));
    expect(await screen.findByRole('heading', { name: 'Crea la tua prima casa' })).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/case'));
  });

  it('backend spento: errore di servizio con retry manuale, nessun dato sintetico', async () => {
    const { backend } = seededBackend();
    backend.outage = 503;
    const { user } = renderApp({ path: '/accedi', backend });
    expect(await screen.findByRole('heading', { name: 'Dimora non è raggiungibile' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('non è raggiungibile');
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    backend.outage = null;
    await user.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByRole('heading', { name: 'Accedi' })).toBeInTheDocument();
  });
});
