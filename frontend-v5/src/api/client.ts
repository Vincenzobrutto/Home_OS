import { ApiError, isApiErrorBody, serviceError } from './errors';
import type {
  Account,
  BinaryPayload,
  CreateHomeInput,
  DocumentDetail,
  DocumentsPage,
  Home,
  LoginInput,
  RegisterInput,
  SessionResponse,
  UploadDocumentInput,
} from './types';

export const API_BASE = '/api/v5';

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

type RequestOptions = {
  method?: 'GET' | 'POST';
  /** Oggetto serializzato come JSON, oppure FormData (multipart, boundary impostato dal browser). */
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  accountId?: string;
};

type ResponseKind = 'json' | 'binary';

/**
 * Client tipizzato per identity-v1.1 e documents-v1.
 * - URL relativi e credentials 'include': la sessione è un cookie httpOnly
 *   gestito dal browser, mai letto o salvato dal frontend.
 * - Il token CSRF vive solo in memoria, ottenuto da GET /session, e viene
 *   inviato in X-CSRF-Token su ogni mutazione (login/register inclusi).
 * - JSON, multipart e risposte binarie passano tutti da `send`: stessi header
 *   di contesto, stessi errori, nessun percorso parallelo.
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

  async listHomes(signal?: AbortSignal, accountId?: string): Promise<Home[]> {
    const data = await this.request<{ items: Home[] }>('/homes', { signal, accountId });
    if (!data || !Array.isArray(data.items)) throw serviceError(200);
    return data.items;
  }

  async getHome(homeId: string, signal?: AbortSignal, accountId?: string): Promise<Home> {
    const data = await this.request<{ home: Home }>(`/homes/${encodeURIComponent(homeId)}`, {
      signal,
      accountId,
    });
    if (!data || !data.home) throw serviceError(200);
    return data.home;
  }

  async createHome(input: CreateHomeInput, idempotencyKey: string, accountId?: string): Promise<Home> {
    const data = await this.mutate<{ home: Home }>('/homes', {
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !data.home) throw serviceError(201);
    return data.home;
  }

  // ---- documents-v1 ----

  async listDocuments(
    homeId: string,
    page: { cursor?: string | null; limit?: number },
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<DocumentsPage> {
    const params = new URLSearchParams();
    if (page.limit !== undefined) params.set('limit', String(page.limit));
    if (page.cursor) params.set('cursor', page.cursor);
    const query = params.size ? `?${params.toString()}` : '';
    const data = await this.request<DocumentsPage>(`${homePath(homeId)}/documents${query}`, {
      signal,
      accountId,
    });
    if (!data || !Array.isArray(data.items) || !('nextCursor' in data)) throw serviceError(200);
    return data;
  }

  async getDocument(
    homeId: string,
    documentId: string,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<DocumentDetail> {
    const data = await this.request<{ document: DocumentDetail }>(
      `${homePath(homeId)}/documents/${encodeURIComponent(documentId)}`,
      { signal, accountId },
    );
    if (!data || !data.document) throw serviceError(200);
    return data.document;
  }

  async uploadDocument(
    homeId: string,
    input: UploadDocumentInput,
    idempotencyKey: string,
    accountId: string,
  ): Promise<DocumentDetail> {
    const form = new FormData();
    form.append('file', input.file, input.file.name);
    form.append('name', input.name);
    form.append('visibility', input.visibility);
    const data = await this.mutate<{ document: DocumentDetail }>(`${homePath(homeId)}/documents`, {
      body: form,
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !data.document) throw serviceError(201);
    return data.document;
  }

  /** Byte originali autenticati: mai aprire l'URL API direttamente nel browser. */
  downloadDocumentFile(
    homeId: string,
    documentId: string,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<BinaryPayload> {
    return this.send<BinaryPayload>(
      `${homePath(homeId)}/documents/${encodeURIComponent(documentId)}/file`,
      { signal, accountId },
      'binary',
    );
  }

  async exportDocuments(homeId: string, documentIds: string[], accountId: string): Promise<BinaryPayload> {
    await this.ensureCsrf();
    return this.send<BinaryPayload>(
      `${homePath(homeId)}/documents/export`,
      {
        method: 'POST',
        body: { documentIds },
        headers: { 'X-CSRF-Token': this.csrfToken ?? '' },
        accountId,
      },
      'binary',
    );
  }

  private async ensureCsrf() {
    if (!this.csrfToken) {
      // Nessun token in memoria (es. dopo logout): lo chiediamo al server.
      await this.getSession();
    }
  }

  private async mutate<T>(path: string, opts: Omit<RequestOptions, 'method'>): Promise<T> {
    await this.ensureCsrf();
    return this.request<T>(path, {
      ...opts,
      method: 'POST',
      headers: { ...opts.headers, 'X-CSRF-Token': this.csrfToken ?? '' },
    });
  }

  private request<T>(path: string, opts: RequestOptions): Promise<T> {
    return this.send<T>(path, opts, 'json');
  }

  private async send<T>(path: string, opts: RequestOptions, kind: ResponseKind): Promise<T> {
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

function homePath(homeId: string) {
  return `/homes/${encodeURIComponent(homeId)}`;
}

/**
 * Nome file da Content-Disposition (filename* RFC 5987 o filename), ridotto a un
 * nome sicuro: niente percorsi, caratteri di controllo o riservati.
 */
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
