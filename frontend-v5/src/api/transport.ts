import { ApiError, isApiErrorBody, serviceError } from './errors';
import type { Account, BinaryPayload, Page, LoginInput, RegisterInput, SessionResponse } from './types';
import { pageQuery, type PageParams } from './paths';
export const API_BASE = '/api/v5';
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
export type RequestOptions = {
  method?: 'GET' | 'POST';
  /** Oggetto serializzato come JSON, oppure FormData (multipart, boundary impostato dal browser). */
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  accountId?: string;
};
type ResponseKind = 'json' | 'binary';

/** Shared session, CSRF, JSON/binary transport. Domain modules receive this one instance. */
export class ApiTransport {
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

requestRecovery(email: string) { return this.mutate<{message:string}>('/auth/password-recovery',{body:{email}}); }

completeRecovery(token: string, password: string) { return this.mutate<void>('/auth/password-recovery/complete',{body:{token,password}}); }

requestEmailVerification(accountId: string) { return this.mutate<{message:string}>('/auth/email-verification',{body:{},accountId}); }

completeEmailVerification(token: string) { return this.mutate<void>('/auth/email-verification/complete',{body:{token}}); }

async logout(): Promise<void> {
    await this.mutate<void>('/auth/logout', {});
    // Sessione revocata: il token non è più valido, ne serve uno nuovo da GET /session.
    this.csrfToken = null;
  }

async page<T>(path: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<Page<T>>(`${path}${pageQuery(page)}`, { signal, accountId });
    if (!data || !Array.isArray(data.items) || !('nextCursor' in data)) throw serviceError(200);
    return data;
  }

callJson<T>(path: string, opts: { method?: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string; signal?: AbortSignal; accountId: string }): Promise<T> {
    if (opts.method === 'POST') {
      return this.mutate<T>(path, { body: opts.body, signal: opts.signal, headers: opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : undefined, accountId: opts.accountId });
    }
    return this.request<T>(path, { signal: opts.signal, accountId: opts.accountId, headers: opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : undefined });
  }

callPage<T>(path: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<T>(path, page, signal, accountId);
  }

callBinary(path: string, signal: AbortSignal | undefined, accountId: string): Promise<BinaryPayload> {
    return this.send<BinaryPayload>(path, { signal, accountId }, 'binary');
  }

async ensureCsrf() {
    if (!this.csrfToken) {
      // Nessun token in memoria (es. dopo logout): lo chiediamo al server.
      await this.getSession();
    }
  }

async mutate<T>(path: string, opts: Omit<RequestOptions, 'method'>): Promise<T> {
    await this.ensureCsrf();
    return this.request<T>(path, {
      ...opts,
      method: 'POST',
      headers: { ...opts.headers, 'X-CSRF-Token': this.csrfToken ?? '' },
    });
  }

request<T>(path: string, opts: RequestOptions): Promise<T> {
    return this.send<T>(path, opts, 'json');
  }

async send<T>(path: string, opts: RequestOptions, kind: ResponseKind): Promise<T> {
    const headers: Record<string, string> = {
      Accept: kind === 'json' ? 'application/json' : '*/*',
      ...opts.headers,
    };
    if (opts.accountId) headers['X-Account-Context'] = opts.accountId;
    let body: BodyInit | undefined;
    if (opts.body instanceof FormData) {
      // Nessun Content-Type: il browser imposta multipart e boundary.
      body = opts.body;
    } else if (opts.body !== undefined) {
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

    if (kind === 'json' && response.status === 204) return undefined as T;

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const mime = contentType.split(';')[0]!.trim().toLowerCase();
    const binaryMimeAllowed = path.endsWith('/export')
      ? mime === 'application/zip'
      : ['application/pdf', 'image/jpeg', 'image/png'].includes(mime);

    // Successo binario: solo 200 con un corpo non-JSON.
    if (kind === 'binary' && response.status === 200 && binaryMimeAllowed) {
      let blob: Blob;
      try {
        blob = await response.blob();
      } catch (err) {
        if (opts.signal?.aborted) throw err;
        throw serviceError(200);
      }
      return {
        blob,
        filename: filenameFromDisposition(response.headers.get('content-disposition')),
        contentType: contentType.split(';')[0]!.trim(),
      } as T;
    }

    let parsed: unknown = undefined;
    if (isJson) {
      try {
        parsed = await response.json();
      } catch {
        parsed = undefined;
      }
    }

    if (response.ok) {
      // 2xx non-JSON per un endpoint JSON, o JSON dove servivano byte: fuori contratto.
      if (kind === 'binary' || parsed === undefined) throw serviceError(response.status);
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
    // Il codice (es. storage_unavailable) resta disponibile per un messaggio più preciso.
    const e = isApiErrorBody(parsed) ? parsed.error : undefined;
    throw serviceError(response.status, e?.requestId, e?.code);
  }
}

export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  let raw: string | undefined;
  const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header);
  if (star) {
    try {
      raw = decodeURIComponent(star[2]!.trim().replace(/^"|"$/g, ''));
    } catch {
      raw = undefined;
    }
  }
  if (!raw) {
    const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header);
    raw = plain ? (plain[2] ?? plain[1])!.trim() : undefined;
  }
  return raw ? safeFilename(raw) : null;
}
export function safeFilename(name: string, fallback = 'documento'): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = [...base]
    .filter((c) => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim();
  const limited = [...cleaned].slice(0, 180).join('');
  return limited || fallback;
}
