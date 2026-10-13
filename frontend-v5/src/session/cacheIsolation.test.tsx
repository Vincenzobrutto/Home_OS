import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PASSWORD_A, PASSWORD_B, renderApp, seededBackend } from '../test/harness';
import type { renderApp as RenderApp } from '../test/harness';

type App = ReturnType<typeof RenderApp>;

async function loginAs(app: App, email: string, password: string) {
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), email);
  await app.user.type(screen.getByLabelText('Password'), password);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
}

function privateKeys(app: App) {
  return app.queryClient
    .getQueryCache()
    .getAll()
    .map((q) => q.queryKey)
    .filter((k) => k[0] !== 'session');
}

describe('[mock] isolamento cache tra account e case', () => {
  it('logout A → login B: nessun dato di A in cache o a schermo', async () => {
    const { backend, a, b } = seededBackend();
    const app = renderApp({ path: '/accedi', backend });
    await loginAs(app, 'a@example.test', PASSWORD_A);
    expect(await screen.findByRole('heading', { name: 'Appartamento Roma' })).toBeInTheDocument();
    expect(privateKeys(app)).toContainEqual(['account', a.id, 'homes']);

    await app.user.click(screen.getByRole('button', { name: /Esci/ }));
    expect(await screen.findByRole('heading', { name: 'Accedi' })).toBeInTheDocument();
    // Dopo logout esplicito nessun "next" verso pagine dell'account precedente.
    expect(app.router.state.location.search).toBe('');
    expect(privateKeys(app)).toEqual([]);
    expect(backend.log.some((r) => r.path === '/auth/logout')).toBe(true);

    await loginAs(app, 'b@example.test', PASSWORD_B);
    expect(await screen.findByRole('heading', { name: 'Casa di Marco' })).toBeInTheDocument();
    expect(screen.queryAllByText('Appartamento Roma')).toHaveLength(0);
    expect(screen.queryAllByText('Casa al mare')).toHaveLength(0);
    const keys = privateKeys(app);
    expect(keys.every((k) => k[1] === b.id)).toBe(true);
  });

  it('chiavi cache per [account, casa, risorsa]', async () => {
    const { backend, a, homeA1 } = seededBackend();
    const app = renderApp({ path: '/accedi', backend });
    await loginAs(app, 'a@example.test', PASSWORD_A);
    await screen.findByRole('heading', { name: 'Appartamento Roma' });
    await app.router.navigate(`/home/${homeA1.id}/casa`);
    await screen.findByRole('heading', { level: 1, name: 'Appartamento Roma' });
    expect(privateKeys(app)).toContainEqual(['account', a.id, 'home', homeA1.id, 'detail']);
  });

  it('401 su richiesta protetta: cache privata pulita, ritorno al login, nessun loop', async () => {
    const { backend, homeA1 } = seededBackend();
    const app = renderApp({ path: '/accedi', backend });
    await loginAs(app, 'a@example.test', PASSWORD_A);
    await screen.findByRole('heading', { name: 'Appartamento Roma' });
    // Il server revoca la sessione (es. scadenza).
    backend.sessions.clear();
    await app.router.navigate(`/home/${homeA1.id}/casa`);
    expect(await screen.findByRole('heading', { name: 'Accedi' })).toBeInTheDocument();
    expect(privateKeys(app)).toEqual([]);
    const countAfter = backend.log.length;
    await new Promise((r) => setTimeout(r, 50));
    // Nessun retry automatico della richiesta protetta.
    expect(backend.log.slice(countAfter).filter((r) => r.path.startsWith('/homes'))).toHaveLength(0);
    expect(app.router.state.location.search).toContain(encodeURIComponent(`/home/${homeA1.id}/casa`));
  });

  it('ricarica con sessione attiva su URL diretto: stesso contesto casa', async () => {
    const { backend, homeA2 } = seededBackend();
    const first = renderApp({ path: '/accedi', backend });
    await loginAs(first, 'a@example.test', PASSWORD_A);
    await screen.findByRole('heading', { name: 'Casa al mare' });
    const cookie = first.control.cookie();
    first.unmount();

    const reloaded = renderApp({ path: `/home/${homeA2.id}/casa`, backend, cookie });
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa al mare' })).toBeInTheDocument();
    expect(reloaded.router.state.location.pathname).toBe(`/home/${homeA2.id}/casa`);
  });

  it('bozza di nuova casa non sopravvive al cambio di account', async () => {
    const { backend } = seededBackend();
    const app = renderApp({ path: '/accedi', backend });
    await loginAs(app, 'a@example.test', PASSWORD_A);
    await screen.findByRole('heading', { name: 'Appartamento Roma' });
    await app.router.navigate('/case/nuova');
    await app.user.type(await screen.findByLabelText(/Nome della casa/), 'Bozza privata di A');
    await app.user.click(screen.getByRole('button', { name: /Esci/ }));
    await loginAs(app, 'b@example.test', PASSWORD_B);
    await screen.findByRole('heading', { name: 'Casa di Marco' });
    await app.router.navigate('/case/nuova');
    expect(await screen.findByLabelText(/Nome della casa/)).toHaveValue('');
    await waitFor(() => expect(screen.queryByDisplayValue('Bozza privata di A')).not.toBeInTheDocument());
  });
});
