import type { ActivitiesPage, ActivityAction, ActivityFilters, CatalogFilters, CreateExpense, CreateObject, CreateRoom, G1ResourceType, ObjectRef, RoomFilters, UpdateObject, UpdateRoom, ExpenseAction, ExpenseFilters, UpdateExpense, CreateActivity, UpdateActivity, FollowUpActivity, Account, AnalysisJob, BinaryPayload, ConfirmationsInput, ManualConfirmationsInput, StartAnalysisInput, CreateHomeInput, DocumentDetail, DocumentSearchCapabilities, DocumentSearchFilters, DocumentsPage, Home, LoginInput, RegisterInput, SessionResponse, UploadDocumentInput } from './types';
import type { ConfirmDraft, Provider, CreateExpense as EconomyCreateExpense, UpdateExpense as EconomyUpdateExpense } from './economyTypes';
import { ApiTransport, type FetchLike } from './transport';
import type { PageParams } from './paths';
import { HomesApi } from './homes-api';
import { DocumentsApi } from './documents-api';
import { ReviewApi } from './review-api';
import { ActivitiesApi } from './activities-api';
import { ObjectsApi } from './objects-api';
import { ExpensesApi } from './expenses-api';
import { EconomyApi } from './economy-api';
import { FloorPlanApi } from './floor-plan-api';
/** Public API façade. Every domain shares one authenticated transport. */
export class ApiClient {
private readonly transport: ApiTransport;
private readonly homesApi: HomesApi;
private readonly documentsApi: DocumentsApi;
private readonly reviewApi: ReviewApi;
private readonly activitiesApi: ActivitiesApi;
private readonly objectsApi: ObjectsApi;
private readonly expensesApi: ExpensesApi;
private readonly economyApi: EconomyApi;
private readonly floorPlanApi: FloorPlanApi;
constructor(opts: { fetch?: FetchLike; base?: string } = {}) {
this.transport = new ApiTransport(opts);
this.homesApi = new HomesApi(this.transport);
this.documentsApi = new DocumentsApi(this.transport);
this.reviewApi = new ReviewApi(this.transport);
this.activitiesApi = new ActivitiesApi(this.transport);
this.objectsApi = new ObjectsApi(this.transport);
this.expensesApi = new ExpensesApi(this.transport);
this.economyApi = new EconomyApi(this.transport);
this.floorPlanApi = new FloorPlanApi(this.transport);
}
get currentCsrfToken() { return this.transport.currentCsrfToken; }
forgetCsrfToken() { return this.transport.forgetCsrfToken(); }
getSession(signal?: AbortSignal): Promise<SessionResponse> { return this.transport.getSession(signal); }
register(input: RegisterInput): Promise<{ account: Account }> { return this.transport.register(input); }
login(input: LoginInput): Promise<{ account: Account }> { return this.transport.login(input); }
requestRecovery(email: string) { return this.transport.requestRecovery(email); }
completeRecovery(token: string, password: string) { return this.transport.completeRecovery(token, password); }
requestEmailVerification(accountId: string) { return this.transport.requestEmailVerification(accountId); }
completeEmailVerification(token: string) { return this.transport.completeEmailVerification(token); }
logout(): Promise<void> { return this.transport.logout(); }
listHomes(signal?: AbortSignal, accountId?: string): Promise<Home[]> { return this.homesApi.listHomes(signal, accountId); }
getHome(homeId: string, signal?: AbortSignal, accountId?: string): Promise<Home> { return this.homesApi.getHome(homeId, signal, accountId); }
createHome(input: CreateHomeInput, idempotencyKey: string, accountId?: string): Promise<Home> { return this.homesApi.createHome(input, idempotencyKey, accountId); }
listDocuments(
    homeId: string,
    page: { cursor?: string | null; limit?: number },
    signal: AbortSignal | undefined,
    accountId: string,
    /** H2: solo i filtri attivi diventano parametri; senza filtri la richiesta resta quella M2. */
    filters?: DocumentSearchFilters,
  ): Promise<DocumentsPage> { return this.documentsApi.listDocuments(homeId, page, signal, accountId, filters); }
getDocumentSearchCapabilities(
    homeId: string,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<DocumentSearchCapabilities> { return this.documentsApi.getDocumentSearchCapabilities(homeId, signal, accountId); }
getDocument(
    homeId: string,
    documentId: string,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<DocumentDetail> { return this.documentsApi.getDocument(homeId, documentId, signal, accountId); }
uploadDocument(
    homeId: string,
    input: UploadDocumentInput,
    idempotencyKey: string,
    accountId: string,
  ): Promise<DocumentDetail> { return this.documentsApi.uploadDocument(homeId, input, idempotencyKey, accountId); }
downloadDocumentFile(
    homeId: string,
    documentId: string,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<BinaryPayload> { return this.documentsApi.downloadDocumentFile(homeId, documentId, signal, accountId); }
exportDocuments(homeId: string, documentIds: string[], accountId: string): Promise<BinaryPayload> { return this.documentsApi.exportDocuments(homeId, documentIds, accountId); }
getAnalysisCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) { return this.reviewApi.getAnalysisCapabilities(homeId, signal, accountId); }
createAnalysisJob(
    homeId: string,
    input: StartAnalysisInput,
    idempotencyKey: string,
    accountId: string,
  ): Promise<AnalysisJob> { return this.reviewApi.createAnalysisJob(homeId, input, idempotencyKey, accountId); }
listAnalysisJobs(homeId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.reviewApi.listAnalysisJobs(homeId, page, signal, accountId); }
getAnalysisJob(homeId: string, jobId: string, signal: AbortSignal | undefined, accountId: string) { return this.reviewApi.getAnalysisJob(homeId, jobId, signal, accountId); }
retryAnalysisJob(
    homeId: string,
    jobId: string,
    idempotencyKey: string,
    accountId: string,
    consentToProviderTransfer = false,
  ) { return this.reviewApi.retryAnalysisJob(homeId, jobId, idempotencyKey, accountId, consentToProviderTransfer); }
listAssets(homeId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.reviewApi.listAssets(homeId, page, signal, accountId); }
createBoiler(homeId: string, name: string, idempotencyKey: string, accountId: string) { return this.reviewApi.createBoiler(homeId, name, idempotencyKey, accountId); }
getAsset(homeId: string, assetId: string, signal: AbortSignal | undefined, accountId: string) { return this.reviewApi.getAsset(homeId, assetId, signal, accountId); }
listReview(homeId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.reviewApi.listReview(homeId, page, signal, accountId); }
confirm(homeId: string, assetId: string, input: ConfirmationsInput, idempotencyKey: string, accountId: string) { return this.reviewApi.confirm(homeId, assetId, input, idempotencyKey, accountId); }
confirmManual(
    homeId: string,
    assetId: string,
    input: ManualConfirmationsInput,
    idempotencyKey: string,
    accountId: string,
  ) { return this.reviewApi.confirmManual(homeId, assetId, input, idempotencyKey, accountId); }
listHistory(homeId: string, assetId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.reviewApi.listHistory(homeId, assetId, page, signal, accountId); }
getActivityCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) { return this.activitiesApi.getActivityCapabilities(homeId, signal, accountId); }
listActivities(
    homeId: string,
    filters: ActivityFilters,
    page: PageParams,
    signal: AbortSignal | undefined,
    accountId: string,
  ): Promise<ActivitiesPage> { return this.activitiesApi.listActivities(homeId, filters, page, signal, accountId); }
getActivity(homeId: string, activityId: string, signal: AbortSignal | undefined, accountId: string) { return this.activitiesApi.getActivity(homeId, activityId, signal, accountId); }
createActivity(homeId: string, input: CreateActivity, idempotencyKey: string, accountId: string) { return this.activitiesApi.createActivity(homeId, input, idempotencyKey, accountId); }
activityMutation(
    homeId: string,
    activityId: string,
    kind: 'updates' | 'complete' | 'cancel' | 'reopen' | 'follow-up',
    body: UpdateActivity | ActivityAction | FollowUpActivity,
    idempotencyKey: string,
    accountId: string,
  ) { return this.activitiesApi.activityMutation(homeId, activityId, kind, body, idempotencyKey, accountId); }
listActivityHistory(homeId: string, activityId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.activitiesApi.listActivityHistory(homeId, activityId, page, signal, accountId); }
getActivitySummary(homeId: string, signal: AbortSignal | undefined, accountId: string) { return this.activitiesApi.getActivitySummary(homeId, signal, accountId); }
getObjectCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) { return this.objectsApi.getObjectCapabilities(homeId, signal, accountId); }
listRooms(homeId: string, filters: RoomFilters, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.objectsApi.listRooms(homeId, filters, page, signal, accountId); }
getRoom(homeId: string, roomId: string, signal: AbortSignal | undefined, accountId: string) { return this.objectsApi.getRoom(homeId, roomId, signal, accountId); }
createRoom(homeId: string, input: CreateRoom, idempotencyKey: string, accountId: string) { return this.objectsApi.createRoom(homeId, input, idempotencyKey, accountId); }
roomMutation(homeId: string, roomId: string, kind: 'updates' | 'archive' | 'restore', body: UpdateRoom | { expectedVersion: number }, idempotencyKey: string, accountId: string) { return this.objectsApi.roomMutation(homeId, roomId, kind, body, idempotencyKey, accountId); }
listRoomHistory(homeId: string, roomId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.objectsApi.listRoomHistory(homeId, roomId, page, signal, accountId); }
listObjects(homeId: string, filters: CatalogFilters, page: PageParams, signal: AbortSignal | undefined, accountId: string):Promise<import('./types').CatalogPage> { return this.objectsApi.listObjects(homeId, filters, page, signal, accountId); }
getObject(homeId: string, ref: ObjectRef, signal: AbortSignal | undefined, accountId: string) { return this.objectsApi.getObject(homeId, ref, signal, accountId); }
createObject(homeId: string, input: CreateObject, idempotencyKey: string, accountId: string) { return this.objectsApi.createObject(homeId, input, idempotencyKey, accountId); }
objectMutation(
    homeId: string,
    ref: ObjectRef,
    kind: 'updates' | 'archive' | 'restore' | 'position',
    body: UpdateObject | { expectedVersion: number } | { expectedVersion: number; roomIds: string[] },
    idempotencyKey: string,
    accountId: string,
  ) { return this.objectsApi.objectMutation(homeId, ref, kind, body, idempotencyKey, accountId); }
listObjectHistory(homeId: string, ref: ObjectRef, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.objectsApi.listObjectHistory(homeId, ref, page, signal, accountId); }
listObjectLinks(homeId: string, ref: ObjectRef, resourceType: G1ResourceType, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.objectsApi.listObjectLinks(homeId, ref, resourceType, page, signal, accountId); }
createObjectLink(homeId: string, ref: ObjectRef, input: { resourceType: G1ResourceType; resourceId: string }, idempotencyKey: string, accountId: string) { return this.objectsApi.createObjectLink(homeId, ref, input, idempotencyKey, accountId); }
removeObjectLink(homeId: string, ref: ObjectRef, linkId: string, expectedVersion: number, idempotencyKey: string, accountId: string) { return this.objectsApi.removeObjectLink(homeId, ref, linkId, expectedVersion, idempotencyKey, accountId); }
getExpenseCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) { return this.expensesApi.getExpenseCapabilities(homeId, signal, accountId); }
listExpenses(homeId: string, filters: ExpenseFilters, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.expensesApi.listExpenses(homeId, filters, page, signal, accountId); }
getExpense(homeId: string, expenseId: string, signal: AbortSignal | undefined, accountId: string) { return this.expensesApi.getExpense(homeId, expenseId, signal, accountId); }
createExpense(homeId: string, input: CreateExpense, idempotencyKey: string, accountId: string) { return this.expensesApi.createExpense(homeId, input, idempotencyKey, accountId); }
expenseMutation(
    homeId: string,
    expenseId: string,
    kind: 'updates' | 'archive' | 'restore',
    body: UpdateExpense | ExpenseAction,
    idempotencyKey: string,
    accountId: string,
  ) { return this.expensesApi.expenseMutation(homeId, expenseId, kind, body, idempotencyKey, accountId); }
listExpenseHistory(homeId: string, expenseId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.expensesApi.listExpenseHistory(homeId, expenseId, page, signal, accountId); }
getExpenseSummary(homeId: string, year: string | null, signal: AbortSignal | undefined, accountId: string) { return this.expensesApi.getExpenseSummary(homeId, year, signal, accountId); }
getEconomyCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.getEconomyCapabilities(homeId, signal, accountId); }
listEconomyExpenses(homeId: string, query: URLSearchParams, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.listEconomyExpenses(homeId, query, page, signal, accountId); }
getEconomySummary(homeId: string, query: URLSearchParams, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.getEconomySummary(homeId, query, signal, accountId); }
getEconomyExpense(homeId: string, expenseId: string, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.getEconomyExpense(homeId, expenseId, signal, accountId); }
createEconomyExpense(homeId: string, input: EconomyCreateExpense, idempotencyKey: string, accountId: string) { return this.economyApi.createEconomyExpense(homeId, input, idempotencyKey, accountId); }
economyExpenseMutation(
    homeId: string,
    expenseId: string,
    kind: 'updates' | 'archive' | 'restore',
    body: EconomyUpdateExpense | { expectedVersion: number; note?: string },
    idempotencyKey: string,
    accountId: string,
  ) { return this.economyApi.economyExpenseMutation(homeId, expenseId, kind, body, idempotencyKey, accountId); }
listEconomyExpenseHistory(homeId: string, expenseId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.listEconomyExpenseHistory(homeId, expenseId, page, signal, accountId); }
listWorks(homeId: string, filters: { state: 'active' | 'archived' | 'all'; q?: string }, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.listWorks(homeId, filters, page, signal, accountId); }
getWork(homeId: string, workId: string, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.getWork(homeId, workId, signal, accountId); }
createWork(homeId: string, input: { name: string; note?: string | null; activityId?: string | null }, idempotencyKey: string, accountId: string) { return this.economyApi.createWork(homeId, input, idempotencyKey, accountId); }
workMutation(
    homeId: string,
    workId: string,
    kind: 'updates' | 'archive' | 'restore',
    body: { expectedVersion: number; name?: string; note?: string | null; activityId?: string | null },
    idempotencyKey: string,
    accountId: string,
  ) { return this.economyApi.workMutation(homeId, workId, kind, body, idempotencyKey, accountId); }
listWorkHistory(homeId: string, workId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.listWorkHistory(homeId, workId, page, signal, accountId); }
startEconomicAnalysis(homeId: string, input: { documentId: string; provider: Provider; consentToProviderTransfer?: boolean }, idempotencyKey: string, accountId: string) { return this.economyApi.startEconomicAnalysis(homeId, input, idempotencyKey, accountId); }
getEconomicJob(homeId: string, jobId: string, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.getEconomicJob(homeId, jobId, signal, accountId); }
retryEconomicJob(homeId: string, jobId: string, body: { expectedVersion: number; consentToProviderTransfer?: boolean }, idempotencyKey: string, accountId: string) { return this.economyApi.retryEconomicJob(homeId, jobId, body, idempotencyKey, accountId); }
listEconomicDrafts(homeId: string, state: 'open' | 'parked' | 'confirmed' | 'all', page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.listEconomicDrafts(homeId, state, page, signal, accountId); }
getEconomicDraft(homeId: string, draftId: string, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.getEconomicDraft(homeId, draftId, signal, accountId); }
listDraftCandidates(homeId: string, draftId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.economyApi.listDraftCandidates(homeId, draftId, page, signal, accountId); }
draftAction(homeId: string, draftId: string, kind: 'park' | 'reopen', body: { expectedVersion: number }, idempotencyKey: string, accountId: string) { return this.economyApi.draftAction(homeId, draftId, kind, body, idempotencyKey, accountId); }
confirmEconomicDraft(homeId: string, draftId: string, body: ConfirmDraft, idempotencyKey: string, accountId: string) { return this.economyApi.confirmEconomicDraft(homeId, draftId, body, idempotencyKey, accountId); }
callJson<T>(path: string, opts: { method?: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string; signal?: AbortSignal; accountId: string }): Promise<T> { return this.transport.callJson<T>(path, opts); }
callPage<T>(path: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) { return this.transport.callPage<T>(path, page, signal, accountId); }
callBinary(path: string, signal: AbortSignal | undefined, accountId: string): Promise<BinaryPayload> { return this.transport.callBinary(path, signal, accountId); }
getFloorPlan(homeId:string,documentId:string,signal:AbortSignal|undefined,accountId:string) { return this.floorPlanApi.getFloorPlan(homeId, documentId, signal, accountId); }
mutateFloorPlan(homeId:string,documentId:string,action:'analysis'|'draft'|'confirmations',body:unknown,key:string,accountId:string) { return this.floorPlanApi.mutateFloorPlan(homeId, documentId, action, body, key, accountId); }
}

export { API_BASE, filenameFromDisposition, safeFilename } from './transport';
export type { FetchLike } from './transport';
export type { PageParams } from './paths';
