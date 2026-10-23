import { serviceError } from './errors';
import type { BinaryPayload, DocumentDetail, DocumentSearchCapabilities, DocumentSearchFilters, DocumentsPage, UploadDocumentInput } from './types';
import { homePath } from './paths';
import { ApiTransport } from './transport';
export class DocumentsApi {
private readonly http: ApiTransport;
constructor(http: ApiTransport) { this.http = http; }

async listDocuments(
    homeId: string,
    page: { cursor?: string | null; limit?: number },
    signal: AbortSignal | undefined,
    accountId: string,
    /** H2: solo i filtri attivi diventano parametri; senza filtri la richiesta resta quella M2. */
    filters?: DocumentSearchFilters,
  ): Promise<DocumentsPage> {
    const params = new URLSearchParams();
    if(filters?.view)params.set('view',filters.view);
    if(filters?.group)params.set('group',filters.group);
    if(filters?.related&&filters.related!=='all')params.set('related',filters.related);
    if (filters?.workflow && filters.workflow !== 'all') params.set('workflow',filters.workflow);
    if (filters?.q) params.set('q', filters.q);
    if (filters && filters.format !== 'all') params.set('format', filters.format);
    if (filters && filters.visibility !== 'all') params.set('visibility', filters.visibility);
    if (filters?.collection && filters.collection !== 'all') params.set('collection', filters.collection);
    if (page.limit !== undefined) params.set('limit', String(page.limit));
    if (page.cursor) params.set('cursor', page.cursor);
    const query = params.size ? `?${params.toString()}` : '';
    const data = await this.http.request<DocumentsPage>(`${homePath(homeId)}/documents${query}`, {
      signal,
      accountId,
    });
    if (!data || !Array.isArray(data.items) || !('nextCursor' in data)) throw serviceError(200);
    return data;
  }

async getDocumentSearchCapabilities(
    homeId: string,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<DocumentSearchCapabilities> {
    const data = await this.http.request<DocumentSearchCapabilities>(`${homePath(homeId)}/document-search-capabilities`, {
      signal,
      accountId,
    });
    if (!data || data.apiVersion !== 'document-search-v1' || data.enabled !== true || !data.limits) {
      throw serviceError(200);
    }
    return data;
  }

async getDocument(
    homeId: string,
    documentId: string,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<DocumentDetail> {
    const data = await this.http.request<{ document: DocumentDetail }>(
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
    const data = await this.http.mutate<{ document: DocumentDetail }>(`${homePath(homeId)}/documents`, {
      body: form,
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !data.document) throw serviceError(201);
    return data.document;
  }

downloadDocumentFile(
    homeId: string,
    documentId: string,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<BinaryPayload> {
    return this.http.send<BinaryPayload>(
      `${homePath(homeId)}/documents/${encodeURIComponent(documentId)}/file`,
      { signal, accountId },
      'binary',
    );
  }

async exportDocuments(homeId: string, documentIds: string[], accountId: string): Promise<BinaryPayload> {
    await this.http.ensureCsrf();
    return this.http.send<BinaryPayload>(
      `${homePath(homeId)}/documents/export`,
      {
        method: 'POST',
        body: { documentIds },
        headers: { 'X-CSRF-Token': this.http.currentCsrfToken ?? '' },
        accountId,
      },
      'binary',
    );
  }
}
