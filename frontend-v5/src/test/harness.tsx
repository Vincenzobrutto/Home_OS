// HARNESS DI TEST (mock). Collega l'app al backend simulato in memoria,
// con un cookie jar che imita il cookie httpOnly del browser.
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { ApiClient, type FetchLike } from '../api/client';
import { routes } from '../routes/routes';
import { createQueryClient } from '../session/queryClient';
import { AppProviders } from '../session/session';
import { FakeBackend } from './fakeBackend';

export type FakeFetchControl = {
  fetch: FetchLike;
  cookie: () => string | undefined;
  /** Le prossime n richieste falliscono come connessione rifiutata. */
  failNext: (n?: number) => void;
  /** La prossima richiesta viene eseguita dal server ma la risposta va persa. */
  dropNextResponse: () => void;
  /** Richieste fetch in corso (per verificare l'annullamento). */
  calls: Array<{ url: string; init: RequestInit }>;
};

export function createFakeFetch(backend: FakeBackend, initialCookie?: string): FakeFetchControl {
  let cookie: string | undefined = initialCookie;
  let failures = 0;
  let drop = false;
  const calls: FakeFetchControl['calls'] = [];

  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (failures > 0) {
      failures--;
      throw new TypeError('Failed to fetch');
    }
    const headers: Record<string, string> = {};
    new Headers(init.headers).forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const path = url.replace(/^\/api\/v5/, '');
    const res = backend.handle({
      method: init.method ?? 'GET',
      path,
      headers,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      cookie: init.credentials === 'include' ? cookie : undefined,
    });
    if (res.setCookie !== undefined) cookie = res.setCookie ?? undefined;
    if (drop) {
      drop = false;
      throw new TypeError('Failed to fetch');
    }
    // Lascia spazio al rendering degli stati di attesa.
    await new Promise((r) => setTimeout(r, 0));
    if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (res.status === 204) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(res.body), {
      status: res.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  };

  return {
    fetch,
    cookie: () => cookie,
    failNext: (n = 1) => {
      failures = n;
    },
    dropNextResponse: () => {
      drop = true;
    },
    calls,
  };
}

export function renderApp(opts: { path: string; backend?: FakeBackend; fetch?: FetchLike; cookie?: string }) {
  const backend = opts.backend ?? new FakeBackend();
  // Un cookie iniziale simula il ricaricamento della pagina con una sessione già attiva.
  const control = createFakeFetch(backend, opts.cookie);
  const api = new ApiClient({ fetch: opts.fetch ?? control.fetch });
  const queryClient = createQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [opts.path] });
  const user = userEvent.setup();
  const utils = render(
    <AppProviders api={api} queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...utils, backend, control, api, queryClient, router, user };
}

export const PASSWORD_A = 'password-di-prova-A';
export const PASSWORD_B = 'password-di-prova-B';

/** Due account: A con due case, B con una casa. */
export function seededBackend() {
  const backend = new FakeBackend();
  const a = backend.seedAccount('Giulia Prova', 'a@example.test', PASSWORD_A);
  const b = backend.seedAccount('Marco Prova', 'b@example.test', PASSWORD_B);
  const homeA1 = backend.seedHome(a.id, 'Appartamento Roma', 'Via Roma 12, Torino');
  const homeA2 = backend.seedHome(a.id, 'Casa al mare', 'Lungomare 3, Alassio', 'member');
  const homeB1 = backend.seedHome(b.id, 'Casa di Marco', 'Via Verdi 8, Milano');
  return { backend, a, b, homeA1, homeA2, homeB1 };
}
