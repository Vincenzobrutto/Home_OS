import { ApiError, isApiErrorBody, serviceError } from './errors';
import type {
  Account,
  CreateHomeInput,
  Home,
  LoginInput,
  RegisterInput,
  SessionResponse,
} from './types';

export const API_BASE = '/api/v5';

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

/**
 * Client tipizzato per identity-v1.
 * - URL relativi e credentials 'include': la sessione è un cookie httpOnly
 *   gestito dal browser, mai letto o salvato dal frontend.
 * - Il token CSRF vive solo in memoria, ottenuto da GET /session, e viene
 *   inviato in X-CSRF-Token su ogni mutazione (login/register inclusi).
 * - Nessun fallback: errori di rete o risposte fuori contratto diventano
 *   ApiError di tipo 'service', mai dati vuoti o dimostrativi.
 */
export class ApiClient {
  private csrfToken: string | null = null;
  private readonly fetchImpl: FetchLike;
  private readonly base: string;

  constructor(opts: { fetch?: FetchLike; base?: string } = {}) {
    this.fetchImpl = opts.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.base = opts.base ?? API_BASE;
  }

  get currentCsrfToken() {
    return this.csrfToken;
  }

  forgetCsrfToken() {
    this.csrfToken = null;
  }

  async getSession(signal?: AbortSignal): Promise<SessionResponse> {
    const data = await this.request<SessionResponse>('/session', { signal });
    if (!data || typeof data.csrfToken !== 'string' || !('account' in data)) {
      throw serviceError(200);
    }
    this.csrfToken = data.csrfToken;
    return data;
  }

  register(input: RegisterInput): Promise<{ account: Account }> {
    return this.mutate<{ account: Account }>('/auth/register', { body: input });
  }

  login(input: LoginInput): Promise<{ account: Account }> {
    return this.mutate<{ account: Account }>('/auth/login', { body: input });
  }

  async logout(): Promise<void> {
    await this.mutate<void>('/auth/logout', {});
    // Sessione revocata: il token non è più valido, ne serve uno nuovo da GET /session.
    this.csrfToken = null;
  }

  async listHomes(signal?: AbortSignal): Promise<Home[]> {
    const data = await this.request<{ items: Home[] }>('/homes', { signal });
    if (!data || !Array.isArray(data.items)) throw serviceError(200);
    return data.items;
  }

  async getHome(homeId: string, signal?: AbortSignal): Promise<Home> {
    const data = await this.request<{ home: Home }>(`/homes/${encodeURIComponent(homeId)}`, {
      signal,
    });
    if (!data || !data.home) throw serviceError(200);
    return data.home;
  }

  async createHome(input: CreateHomeInput, idempotencyKey: string): Promise<Home> {
    const data = await this.mutate<{ home: Home }>('/homes', {
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    if (!data || !data.home) throw serviceError(201);
    return data.home;
  }

  private async mutate<T>(path: string, opts: Omit<RequestOptions, 'method'>): Promise<T> {
    if (!this.csrfToken) {
      // Nessun token in memoria (es. dopo logout): lo chiediamo al server.
      await this.getSession();
    }
    return this.request<T>(path, {
      ...opts,
      method: 'POST',
      headers: { ...opts.headers, 'X-CSRF-Token': this.csrfToken ?? '' },
    });
  }

  private async request<T>(path: string, opts: RequestOptions): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(this.base + path, {
        method: opts.method ?? 'GET',
        headers,
        body,
        credentials: 'include',
        cache: 'no-store',
        signal: opts.signal,
      });
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      throw serviceError(0);
    }

    if (response.status === 204) return undefined as T;

    const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
    let parsed: unknown = undefined;
    if (isJson) {
      try {
        parsed = await response.json();
      } catch {
        parsed = undefined;
      }
    }

    if (response.ok) {
      // Una risposta 2xx non-JSON non è mai trattata come successo.
      if (parsed === undefined) throw serviceError(response.status);
      return parsed as T;
    }

    const gatewayOrUnavailable = response.status === 502 || response.status === 503 || response.status === 504;
    if (isApiErrorBody(parsed) && !gatewayOrUnavailable) {
      const e = parsed.error;
      throw new ApiError({
        kind: 'http',
        status: response.status,
        code: e.code,
        message: e.message,
        fieldErrors: e.fieldErrors,
        requestId: e.requestId,
      });
    }

    // 502/503/504 o errore senza corpo del contratto (es. proxy Vite con backend spento).
    throw serviceError(
      response.status,
      isApiErrorBody(parsed) ? parsed.error.requestId : undefined,
    );
  }
}
