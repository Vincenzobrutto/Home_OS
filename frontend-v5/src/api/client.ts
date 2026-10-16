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
import type {
  CandidateExpense,
  ConfirmDraft,
  DraftListItem,
  EconomicAnalysisJob,
  EconomicDraft,
  Provider,
  CreateExpense as EconomyCreateExpense,
  EconomyCapabilities,
  EconomyExpense,
  EconomySummary,
  EconomyWork,
  ExpenseHistoryEvent as EconomyExpenseHistoryEvent,
  UpdateExpense as EconomyUpdateExpense,
  WorkHistoryEvent,
} from './economyTypes';

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
  requestRecovery(email: string) { return this.mutate<{message:string}>('/auth/password-recovery',{body:{email}}); }
  completeRecovery(token: string, password: string) { return this.mutate<void>('/auth/password-recovery/complete',{body:{token,password}}); }
  requestEmailVerification(accountId: string) { return this.mutate<{message:string}>('/auth/email-verification',{body:{},accountId}); }
  completeEmailVerification(token: string) { return this.mutate<void>('/auth/email-verification/complete',{body:{token}}); }

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
    if (filters?.collection && filters.collection !== 'all') params.set('collection', filters.collection);
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

  // ---- economy-v1 (S1a/b) ----
  // Stesso trasporto di H3a; i JSON H3a restano invariati. Le somme sono stringhe di centesimi.

  async getEconomyCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<EconomyCapabilities>(`${economyPath(homeId)}/capabilities`, { signal, accountId });
    if (
      !data || data.apiVersion !== 'economy-v1' || typeof data.enabled !== 'boolean' || !data.features ||
      typeof data.features.history !== 'boolean' || typeof data.features.works !== 'boolean' ||
      typeof data.features.documentDrafts !== 'boolean' || !data.limits || typeof data.today !== 'string' ||
      !Array.isArray(data.categories) || !Array.isArray(data.families)
    ) {
      throw serviceError(200);
    }
    return data;
  }

  listEconomyExpenses(homeId: string, query: URLSearchParams, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<EconomyExpense>(`${economyPath(homeId)}/expenses${withPage(new URLSearchParams(query), page)}`, {}, signal, accountId).then((p) => {
      if (!p.items.every(isEconomyExpense)) throw serviceError(200);
      return p;
    });
  }

  async getEconomySummary(homeId: string, query: URLSearchParams, signal: AbortSignal | undefined, accountId: string) {
    const qs = query.size ? `?${query.toString()}` : '';
    const data = await this.request<EconomySummary>(`${economyPath(homeId)}/summary${qs}`, { signal, accountId });
    if (!isEconomySummary(data)) throw serviceError(200);
    return data;
  }

  async getEconomyExpense(homeId: string, expenseId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<{ expense: EconomyExpense }>(`${economyPath(homeId)}/expenses/${encodeURIComponent(expenseId)}`, { signal, accountId });
    if (!data || !isEconomyExpense(data.expense)) throw serviceError(200);
    return data.expense;
  }

  async createEconomyExpense(homeId: string, input: EconomyCreateExpense, idempotencyKey: string, accountId: string) {
    return this.economyExpenseResponse(
      await this.mutate<{ expense: EconomyExpense }>(`${economyPath(homeId)}/expenses`, {
        body: input,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      201,
    );
  }

  async economyExpenseMutation(
    homeId: string,
    expenseId: string,
    kind: 'updates' | 'archive' | 'restore',
    body: EconomyUpdateExpense | { expectedVersion: number; note?: string },
    idempotencyKey: string,
    accountId: string,
  ) {
    return this.economyExpenseResponse(
      await this.mutate<{ expense: EconomyExpense }>(`${economyPath(homeId)}/expenses/${encodeURIComponent(expenseId)}/${kind}`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      200,
    );
  }

  listEconomyExpenseHistory(homeId: string, expenseId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<EconomyExpenseHistoryEvent>(`${economyPath(homeId)}/expenses/${encodeURIComponent(expenseId)}/history`, page, signal, accountId);
  }

  listWorks(homeId: string, filters: { state: 'active' | 'archived' | 'all'; q?: string }, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const params = new URLSearchParams();
    if (filters.state !== 'active') params.set('state', filters.state);
    const q = filters.q?.normalize('NFC').trim();
    if (q) params.set('q', q);
    return this.page<EconomyWork>(`${economyPath(homeId)}/works${withPage(params, page)}`, {}, signal, accountId);
  }

  async getWork(homeId: string, workId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.request<{ work: EconomyWork }>(`${economyPath(homeId)}/works/${encodeURIComponent(workId)}`, { signal, accountId });
    return this.workResponse(data, 200);
  }

  async createWork(homeId: string, input: { name: string; note?: string | null; activityId?: string | null }, idempotencyKey: string, accountId: string) {
    return this.workResponse(
      await this.mutate<{ work: EconomyWork }>(`${economyPath(homeId)}/works`, { body: input, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      201,
    );
  }

  async workMutation(
    homeId: string,
    workId: string,
    kind: 'updates' | 'archive' | 'restore',
    body: { expectedVersion: number; name?: string; note?: string | null; activityId?: string | null },
    idempotencyKey: string,
    accountId: string,
  ) {
    return this.workResponse(
      await this.mutate<{ work: EconomyWork }>(`${economyPath(homeId)}/works/${encodeURIComponent(workId)}/${kind}`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      200,
    );
  }

  listWorkHistory(homeId: string, workId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<WorkHistoryEvent>(`${economyPath(homeId)}/works/${encodeURIComponent(workId)}/history`, page, signal, accountId);
  }

  // ---- economy-v1 S1c: analisi da documento, bozze, candidati e conferma ----

  /** Avvio esplicito. Il provider è sempre indicato; il consenso si invia solo se richiesto (mai per la fixture). */
  async startEconomicAnalysis(homeId: string, input: { documentId: string; provider: Provider; consentToProviderTransfer?: boolean }, idempotencyKey: string, accountId: string) {
    return this.jobResponse(
      await this.mutate<{ job: EconomicAnalysisJob }>(`${economyPath(homeId)}/document-analysis-jobs`, { body: input, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      202,
    );
  }

  async getEconomicJob(homeId: string, jobId: string, signal: AbortSignal | undefined, accountId: string) {
    return this.jobResponse(await this.request<{ job: EconomicAnalysisJob }>(`${economyPath(homeId)}/document-analysis-jobs/${encodeURIComponent(jobId)}`, { signal, accountId }), 200);
  }

  /** Nuovo tentativo esplicito su un job fallito: crea un NUOVO job (si segue il suo id). Mai per un errore di lettura. */
  async retryEconomicJob(homeId: string, jobId: string, body: { expectedVersion: number; consentToProviderTransfer?: boolean }, idempotencyKey: string, accountId: string) {
    return this.jobResponse(
      await this.mutate<{ job: EconomicAnalysisJob }>(`${economyPath(homeId)}/document-analysis-jobs/${encodeURIComponent(jobId)}/retries`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      202,
    );
  }

  listEconomicDrafts(homeId: string, state: 'open' | 'parked' | 'confirmed' | 'all', page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const params = new URLSearchParams();
    if (state !== 'open') params.set('state', state);
    return this.page<DraftListItem>(`${economyPath(homeId)}/drafts${withPage(params, page)}`, {}, signal, accountId);
  }

  async getEconomicDraft(homeId: string, draftId: string, signal: AbortSignal | undefined, accountId: string) {
    return this.draftResponse(await this.request<{ draft: EconomicDraft }>(`${economyPath(homeId)}/drafts/${encodeURIComponent(draftId)}`, { signal, accountId }), 200);
  }

  listDraftCandidates(homeId: string, draftId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.page<CandidateExpense>(`${economyPath(homeId)}/drafts/${encodeURIComponent(draftId)}/candidates`, page, signal, accountId).then((p) => {
      if (!p.items.every((c) => c && isEconomyExpense(c.expense) && Array.isArray(c.reasons))) throw serviceError(200);
      return p;
    });
  }

  async draftAction(homeId: string, draftId: string, kind: 'park' | 'reopen', body: { expectedVersion: number }, idempotencyKey: string, accountId: string) {
    return this.draftResponse(
      await this.mutate<{ draft: EconomicDraft }>(`${economyPath(homeId)}/drafts/${encodeURIComponent(draftId)}/${kind}`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      200,
    );
  }

  /** Conferma atomica sul backend (create o link_existing): risposta {draft, expense}. */
  async confirmEconomicDraft(homeId: string, draftId: string, body: ConfirmDraft, idempotencyKey: string, accountId: string) {
    const data = await this.mutate<{ draft: EconomicDraft; expense: EconomyExpense }>(`${economyPath(homeId)}/drafts/${encodeURIComponent(draftId)}/confirm`, {
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !isEconomicDraft(data.draft) || !isEconomyExpense(data.expense)) throw serviceError(200);
    return data;
  }

  private jobResponse(data: { job: EconomicAnalysisJob } | undefined, status: number) {
    const j = data?.job;
    if (!j || typeof j.id !== 'string' || typeof j.version !== 'number' || !['queued', 'running', 'succeeded', 'failed'].includes(j.state)) throw serviceError(status);
    return j;
  }

  private draftResponse(data: { draft: EconomicDraft } | undefined, status: number) {
    if (!data || !isEconomicDraft(data.draft)) throw serviceError(status);
    return data.draft;
  }

  private economyExpenseResponse(data: { expense: EconomyExpense } | undefined, status: number) {
    if (!data || !isEconomyExpense(data.expense)) throw serviceError(status);
    return data.expense;
  }

  private workResponse(data: { work: EconomyWork } | undefined, status: number) {
    if (!data || !data.work || typeof data.work.version !== 'number' || typeof data.work.name !== 'string') throw serviceError(status);
    return data.work;
  }

  // ---- Trasporto per moduli caricati in differita (sharing-v1) ----
  // Stessi header di contesto, CSRF, errori e controlli binari di ogni altra chiamata: nessun percorso parallelo.

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

function economyPath(homeId: string) {
  return `${homePath(homeId)}/economy`;
}

const CENTS = /^\d+$/;
const SIGNED_CENTS = /^-?\d+$/;

function isLinkShape(l: unknown) {
  const v = l as { state?: unknown } | null;
  return !!v && (v.state === 'none' || v.state === 'unavailable' || v.state === 'linked');
}

/** Forma minima di un costo economy-v1: importo intero H3a e collegamenti S1 discriminati. */
function isEconomyExpense(e: unknown): e is EconomyExpense {
  const x = e as EconomyExpense | null;
  return (
    !!x && typeof x.id === 'string' && typeof x.version === 'number' && typeof x.amountCents === 'number' &&
    Number.isInteger(x.amountCents) && typeof x.family === 'string' && isLinkShape(x.objectLink) &&
    isLinkShape(x.workLink) && isLinkShape(x.documentLink) && Array.isArray(x.permissions)
  );
}

/** Bozza S1c: stato noto, candidati con importi interi e ruoli, proposte come oggetto. */
function isEconomicDraft(d: unknown): d is EconomicDraft {
  const x = d as EconomicDraft | null;
  return (
    !!x && typeof x.id === 'string' && typeof x.version === 'number' && ['open', 'parked', 'confirmed'].includes(x.state) &&
    isLinkShape(x.documentLink) && isLinkShape(x.expenseLink) && !!x.proposedFields && typeof x.proposedFields === 'object' &&
    Array.isArray(x.amountCandidates) &&
    x.amountCandidates.every((c) => typeof c.id === 'string' && Number.isInteger(c.amountCents) && typeof c.role === 'string' && Array.isArray(c.sources)) &&
    typeof x.amountSelectionRequired === 'boolean'
  );
}

/** Riepilogo: somme stringhe di centesimi intere, sette famiglie, confronto discriminato. */
function isEconomySummary(s: unknown): s is EconomySummary {
  const x = s as EconomySummary | null;
  if (!x || !x.period || typeof x.count !== 'number' || !CENTS.test(String(x.totalCents)) || typeof x.totalCents !== 'string') return false;
  if (typeof x.totalWithoutFinancingCents !== 'string' || !CENTS.test(x.totalWithoutFinancingCents)) return false;
  if (!Array.isArray(x.byFamily) || !Array.isArray(x.byCategory)) return false;
  if (![...x.byFamily, ...x.byCategory].every((r) => typeof r.totalCents === 'string' && CENTS.test(r.totalCents) && typeof r.count === 'number')) return false;
  const c = x.comparison;
  if (!c || !['unavailable', 'no_previous_records', 'comparable'].includes(c.status)) return false;
  if (c.status !== 'unavailable' && (typeof c.deltaCents !== 'string' || !SIGNED_CENTS.test(c.deltaCents))) return false;
  if (c.status === 'comparable' && (typeof c.deltaPercentHundredths !== 'string' || !SIGNED_CENTS.test(c.deltaPercentHundredths))) return false;
  return typeof x.today === 'string';
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
