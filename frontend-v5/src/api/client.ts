import { ApiError, isApiErrorBody, serviceError } from './errors';
import type {
  ActivitiesPage,
  ActivityAction,
  ActivityCapabilities,
  ActivityFilters,
  ActivityHistoryEvent,
  ActivityResponse,
  ActivitySummary,
  CatalogFilters,
  CatalogItem,
  CreateExpense,
  CreateObject,
  CreateRoom,
  G1HistoryEvent,
  G1ResourceType,
  LinkedResource,
  ObjectCapabilities,
  ObjectRef,
  Room,
  RoomFilters,
  UpdateObject,
  UpdateRoom,
  ExpenseAction,
  ExpenseCapabilities,
  ExpenseFilters,
  ExpenseHistoryEvent,
  ExpenseResponse,
  ExpenseSummary,
  HomeExpense,
  UpdateExpense,
  CreateActivity,
  UpdateActivity,
  Account,
  AnalysisCapabilities,
  AnalysisJob,
  BinaryPayload,
  BoilerDetail,
  BoilerSummary,
  ConfirmationResult,
  ConfirmationsInput,
  HistoryEvent,
  ManualConfirmationsInput,
  Page,
  ReviewPage,
  StartAnalysisInput,
  CreateHomeInput,
  DocumentDetail,
  DocumentSearchCapabilities,
  DocumentSearchFilters,
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
    /** H2: solo i filtri attivi diventano parametri; senza filtri la richiesta resta quella M2. */
    filters?: DocumentSearchFilters,
  ): Promise<DocumentsPage> {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters && filters.format !== 'all') params.set('format', filters.format);
    if (filters && filters.visibility !== 'all') params.set('visibility', filters.visibility);
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

  async getDocumentSearchCapabilities(
    homeId: string,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<DocumentSearchCapabilities> {
    const data = await this.request<DocumentSearchCapabilities>(`${homePath(homeId)}/document-search-capabilities`, {
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

  // ---- review-v1 (M3) ----

  async getAnalysisCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<AnalysisCapabilities>(`${homePath(homeId)}/analysis-capabilities`, {
      signal,
      accountId,
    });
    if (!data || typeof data.enabled !== 'boolean' || typeof data.isSimulation !== 'boolean' || !['anthropic', 'test_fixture_v1'].includes(data.provider) || data.isSimulation !== (data.provider === 'test_fixture_v1')) throw serviceError(200);
    return data;
  }

  /** analysis-v2: il client invia sempre il provider scelto; il consenso solo per Anthropic. */
  async createAnalysisJob(
    homeId: string,
    input: StartAnalysisInput,
    idempotencyKey: string,
    accountId: string,
  ): Promise<AnalysisJob> {
    const data = await this.mutate<{ job: AnalysisJob }>(`${homePath(homeId)}/analysis-jobs`, {
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !data.job) throw serviceError(202);
    return data.job;
  }

  listAnalysisJobs(homeId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<AnalysisJob>(`${homePath(homeId)}/analysis-jobs`, page, signal, accountId);
  }

  async getAnalysisJob(homeId: string, jobId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<{ job: AnalysisJob }>(
      `${homePath(homeId)}/analysis-jobs/${encodeURIComponent(jobId)}`,
      { signal, accountId },
    );
    if (!data || !data.job) throw serviceError(200);
    return data.job;
  }

  /** Retry: nuovo tentativo (può costare). Anthropic richiede di nuovo il consenso; fixture {}. */
  async retryAnalysisJob(
    homeId: string,
    jobId: string,
    idempotencyKey: string,
    accountId: string,
    consentToProviderTransfer = false,
  ) {
    const data = await this.mutate<{ job: AnalysisJob }>(
      `${homePath(homeId)}/analysis-jobs/${encodeURIComponent(jobId)}/retry`,
      {
        body: consentToProviderTransfer ? { consentToProviderTransfer: true } : {},
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      },
    );
    if (!data || !data.job) throw serviceError(202);
    return data.job;
  }

  listAssets(homeId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<BoilerSummary>(`${homePath(homeId)}/assets`, page, signal, accountId);
  }

  async createBoiler(homeId: string, name: string, idempotencyKey: string, accountId: string) {
    const data = await this.mutate<{ asset: BoilerDetail }>(`${homePath(homeId)}/assets`, {
      body: { type: 'boiler', name },
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !data.asset) throw serviceError(201);
    return data.asset;
  }

  async getAsset(homeId: string, assetId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<{ asset: BoilerDetail }>(
      `${homePath(homeId)}/assets/${encodeURIComponent(assetId)}`,
      { signal, accountId },
    );
    if (!data || !data.asset || !Array.isArray(data.asset.proposals)) throw serviceError(200);
    return data.asset;
  }

  async listReview(homeId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<ReviewPage>(`${homePath(homeId)}/review${pageQuery(page)}`, {
      signal,
      accountId,
    });
    if (!data || !Array.isArray(data.items) || typeof data.openCount !== 'number') throw serviceError(200);
    return data;
  }

  confirm(homeId: string, assetId: string, input: ConfirmationsInput, idempotencyKey: string, accountId: string) {
    return this.confirmation(`${homePath(homeId)}/assets/${encodeURIComponent(assetId)}/confirmations`, input, idempotencyKey, accountId);
  }

  confirmManual(
    homeId: string,
    assetId: string,
    input: ManualConfirmationsInput,
    idempotencyKey: string,
    accountId: string,
  ) {
    return this.confirmation(
      `${homePath(homeId)}/assets/${encodeURIComponent(assetId)}/manual-confirmations`,
      input,
      idempotencyKey,
      accountId,
    );
  }

  listHistory(homeId: string, assetId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<HistoryEvent>(
      `${homePath(homeId)}/assets/${encodeURIComponent(assetId)}/history`,
      page,
      signal,
      accountId,
    );
  }

  private async confirmation(path: string, body: unknown, idempotencyKey: string, accountId: string) {
    const data = await this.mutate<ConfirmationResult>(path, {
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !data.asset || !Array.isArray(data.resolvedProposalIds)) throw serviceError(201);
    return data;
  }

  private async page<T>(path: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<Page<T>>(`${path}${pageQuery(page)}`, { signal, accountId });
    if (!data || !Array.isArray(data.items) || !('nextCursor' in data)) throw serviceError(200);
    return data;
  }

  // ---- activities-v1 (H1) ----

  async getActivityCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<ActivityCapabilities>(`${homePath(homeId)}/activity-capabilities`, { signal, accountId });
    if (!data || data.apiVersion !== 'activities-v1' || typeof data.today !== 'string') throw serviceError(200);
    return data;
  }

  async listActivities(
    homeId: string,
    filters: ActivityFilters,
    page: PageParams,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<ActivitiesPage> {
    const params = new URLSearchParams();
    params.set('state', filters.state);
    params.set('due', filters.due);
    if (filters.assetId) params.set('assetId', filters.assetId);
    if (page.limit !== undefined) params.set('limit', String(page.limit));
    if (page.cursor) params.set('cursor', page.cursor);
    const data = await this.request<ActivitiesPage>(`${homePath(homeId)}/activities?${params.toString()}`, { signal, accountId });
    if (!data || !Array.isArray(data.items) || !('nextCursor' in data) || typeof data.today !== 'string') throw serviceError(200);
    return data;
  }

  async getActivity(homeId: string, activityId: string, signal: AbortSignal | undefined, accountId: string) {
    return this.activityResponse(
      await this.request<ActivityResponse>(`${homePath(homeId)}/activities/${encodeURIComponent(activityId)}`, { signal, accountId }),
      200,
    );
  }

  async createActivity(homeId: string, input: CreateActivity, idempotencyKey: string, accountId: string) {
    return this.activityResponse(
      await this.mutate<ActivityResponse>(`${homePath(homeId)}/activities`, {
        body: input,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      201,
    );
  }

  /** updates/complete/cancel/reopen: sempre POST idempotenti, mai PATCH/DELETE. */
  async activityMutation(
    homeId: string,
    activityId: string,
    kind: 'updates' | 'complete' | 'cancel' | 'reopen',
    body: UpdateActivity | ActivityAction,
    idempotencyKey: string,
    accountId: string,
  ) {
    return this.activityResponse(
      await this.mutate<ActivityResponse>(`${homePath(homeId)}/activities/${encodeURIComponent(activityId)}/${kind}`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      200,
    );
  }

  listActivityHistory(homeId: string, activityId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<ActivityHistoryEvent>(
      `${homePath(homeId)}/activities/${encodeURIComponent(activityId)}/history`,
      page,
      signal,
      accountId,
    );
  }

  async getActivitySummary(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<ActivitySummary>(`${homePath(homeId)}/activity-summary`, { signal, accountId });
    if (!data || !data.counts || !Array.isArray(data.nextItems) || typeof data.today !== 'string') throw serviceError(200);
    return data;
  }

  private activityResponse(data: ActivityResponse | undefined, status: number) {
    if (!data || !data.activity || typeof data.today !== 'string') throw serviceError(status);
    return data;
  }

  // ---- home-objects-v1 (G1) ----

  async getObjectCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<ObjectCapabilities>(`${homePath(homeId)}/object-capabilities`, { signal, accountId });
    if (!data || data.apiVersion !== 'home-objects-v1' || data.enabled !== true || !data.limits || !Array.isArray(data.types)) {
      throw serviceError(200);
    }
    return data;
  }

  listRooms(homeId: string, filters: RoomFilters, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const params = new URLSearchParams();
    if (filters.state !== 'active') params.set('state', filters.state);
    return this.page<Room>(`${homePath(homeId)}/rooms${withPage(params, page)}`, {}, signal, accountId);
  }

  async getRoom(homeId: string, roomId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<{ room: Room }>(`${homePath(homeId)}/rooms/${encodeURIComponent(roomId)}`, { signal, accountId });
    if (!data || !data.room) throw serviceError(200);
    return data.room;
  }

  async createRoom(homeId: string, input: CreateRoom, idempotencyKey: string, accountId: string) {
    return this.roomResponse(await this.mutate<{ room: Room }>(`${homePath(homeId)}/rooms`, { body: input, headers: { 'Idempotency-Key': idempotencyKey }, accountId }), 201);
  }

  async roomMutation(homeId: string, roomId: string, kind: 'updates' | 'archive' | 'restore', body: UpdateRoom | { expectedVersion: number }, idempotencyKey: string, accountId: string) {
    return this.roomResponse(
      await this.mutate<{ room: Room }>(`${homePath(homeId)}/rooms/${encodeURIComponent(roomId)}/${kind}`, { body, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      200,
    );
  }

  listRoomHistory(homeId: string, roomId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<G1HistoryEvent>(`${homePath(homeId)}/rooms/${encodeURIComponent(roomId)}/history`, page, signal, accountId);
  }

  /** Catalogo unificato oggetti + caldaie: solo i filtri attivi diventano parametri. */
  listObjects(homeId: string, filters: CatalogFilters, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const params = new URLSearchParams();
    if (filters.state !== 'active') params.set('state', filters.state);
    if (filters.roomId) params.set('roomId', filters.roomId);
    else if (filters.placement === 'unplaced') params.set('placement', 'unplaced');
    if (filters.q) params.set('q', filters.q);
    if (filters.type) params.set('type', filters.type);
    return this.page<CatalogItem>(`${homePath(homeId)}/objects${withPage(params, page)}`, {}, signal, accountId);
  }

  async getObject(homeId: string, ref: ObjectRef, signal: AbortSignal | undefined, accountId: string) {
    return this.objectResponse(await this.request<{ object: CatalogItem }>(objectPath(homeId, ref), { signal, accountId }), 200);
  }

  async createObject(homeId: string, input: CreateObject, idempotencyKey: string, accountId: string) {
    return this.objectResponse(
      await this.mutate<{ object: CatalogItem }>(`${homePath(homeId)}/objects`, { body: input, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      201,
    );
  }

  /** updates/archive/restore solo per oggetti manuali; position per entrambi i tipi. */
  async objectMutation(
    homeId: string,
    ref: ObjectRef,
    kind: 'updates' | 'archive' | 'restore' | 'position',
    body: UpdateObject | { expectedVersion: number } | { expectedVersion: number; roomIds: string[] },
    idempotencyKey: string,
    accountId: string,
  ) {
    return this.objectResponse(
      await this.mutate<{ object: CatalogItem }>(`${objectPath(homeId, ref)}/${kind}`, { body, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      200,
    );
  }

  listObjectHistory(homeId: string, ref: ObjectRef, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<G1HistoryEvent>(`${objectPath(homeId, ref)}/history`, page, signal, accountId);
  }

  listObjectLinks(homeId: string, ref: ObjectRef, resourceType: G1ResourceType, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const params = new URLSearchParams({ resourceType });
    return this.page<LinkedResource>(`${objectPath(homeId, ref)}/links${withPage(params, page)}`, {}, signal, accountId);
  }

  async createObjectLink(homeId: string, ref: ObjectRef, input: { resourceType: G1ResourceType; resourceId: string }, idempotencyKey: string, accountId: string) {
    return this.linkResponse(
      await this.mutate<{ link: LinkedResource }>(`${objectPath(homeId, ref)}/links`, { body: input, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      201,
    );
  }

  async removeObjectLink(homeId: string, ref: ObjectRef, linkId: string, expectedVersion: number, idempotencyKey: string, accountId: string) {
    return this.linkResponse(
      await this.mutate<{ link: LinkedResource }>(`${objectPath(homeId, ref)}/links/${encodeURIComponent(linkId)}/remove`, {
        body: { expectedVersion },
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      200,
    );
  }

  private roomResponse(data: { room: Room } | undefined, status: number) {
    if (!data || !data.room || typeof data.room.version !== 'number') throw serviceError(status);
    return data.room;
  }

  private objectResponse(data: { object: CatalogItem } | undefined, status: number) {
    if (!data || !data.object || !data.object.ref || !data.object.position) throw serviceError(status);
    return data.object;
  }

  private linkResponse(data: { link: LinkedResource } | undefined, status: number) {
    if (!data || !data.link || !data.link.origin) throw serviceError(status);
    return data.link;
  }

  // ---- expenses-v1 (H3a) ----

  async getExpenseCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<ExpenseCapabilities>(`${homePath(homeId)}/expense-capabilities`, { signal, accountId });
    if (!data || data.apiVersion !== 'expenses-v1' || data.enabled !== true || !data.limits || typeof data.today !== 'string') {
      throw serviceError(200);
    }
    return data;
  }

  /** Solo i filtri diversi dal default del contratto diventano parametri (state active, tutti gli anni, tutte le origini). */
  listExpenses(homeId: string, filters: ExpenseFilters, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const params = new URLSearchParams();
    if (filters.state !== 'active') params.set('state', filters.state);
    if (filters.year) params.set('year', filters.year);
    if (filters.source !== 'all') params.set('source', filters.source);
    if (filters.assetId) params.set('assetId', filters.assetId);
    if (filters.documentId) params.set('documentId', filters.documentId);
    if (page.limit !== undefined) params.set('limit', String(page.limit));
    if (page.cursor) params.set('cursor', page.cursor);
    const query = params.size ? `?${params.toString()}` : '';
    return this.page<HomeExpense>(`${homePath(homeId)}/expenses${query}`, {}, signal, accountId);
  }

  async getExpense(homeId: string, expenseId: string, signal: AbortSignal | undefined, accountId: string) {
    return this.expenseResponse(
      await this.request<ExpenseResponse>(`${homePath(homeId)}/expenses/${encodeURIComponent(expenseId)}`, { signal, accountId }),
      200,
    );
  }

  async createExpense(homeId: string, input: CreateExpense, idempotencyKey: string, accountId: string) {
    return this.expenseResponse(
      await this.mutate<ExpenseResponse>(`${homePath(homeId)}/expenses`, {
        body: input,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      201,
    );
  }

  /** updates/archive/restore: POST idempotenti con expectedVersion, mai PATCH/DELETE. */
  async expenseMutation(
    homeId: string,
    expenseId: string,
    kind: 'updates' | 'archive' | 'restore',
    body: UpdateExpense | ExpenseAction,
    idempotencyKey: string,
    accountId: string,
  ) {
    return this.expenseResponse(
      await this.mutate<ExpenseResponse>(`${homePath(homeId)}/expenses/${encodeURIComponent(expenseId)}/${kind}`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      200,
    );
  }

  listExpenseHistory(homeId: string, expenseId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<ExpenseHistoryEvent>(
      `${homePath(homeId)}/expenses/${encodeURIComponent(expenseId)}/history`,
      page,
      signal,
      accountId,
    );
  }

  async getExpenseSummary(homeId: string, year: string | null, signal: AbortSignal | undefined, accountId: string) {
    const query = year ? `?year=${encodeURIComponent(year)}` : '';
    const data = await this.request<ExpenseSummary>(`${homePath(homeId)}/expense-summary${query}`, { signal, accountId });
    if (!data || !data.totalsCents || typeof data.totalCents !== 'number' || !Array.isArray(data.lastItems) || typeof data.today !== 'string') {
      throw serviceError(200);
    }
    return data;
  }

  private expenseResponse(data: ExpenseResponse | undefined, status: number) {
    if (!data || !data.expense || typeof data.expense.amountCents !== 'number') throw serviceError(status);
    return data;
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

export type PageParams = { cursor?: string | null; limit?: number };

function objectPath(homeId: string, ref: ObjectRef) {
  return `${homePath(homeId)}/objects/${encodeURIComponent(ref.kind)}/${encodeURIComponent(ref.id)}`;
}

/** Filtri + paginazione in un'unica query string (limit/cursor in coda). */
function withPage(params: URLSearchParams, page: PageParams) {
  if (page.limit !== undefined) params.set('limit', String(page.limit));
  if (page.cursor) params.set('cursor', page.cursor);
  return params.size ? `?${params.toString()}` : '';
}

function pageQuery(page: PageParams) {
  const params = new URLSearchParams();
  if (page.limit !== undefined) params.set('limit', String(page.limit));
  if (page.cursor) params.set('cursor', page.cursor);
  return params.size ? `?${params.toString()}` : '';
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
