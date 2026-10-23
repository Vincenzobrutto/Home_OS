import { serviceError } from './errors';
import type { CandidateExpense, ConfirmDraft, DraftListItem, EconomicAnalysisJob, EconomicDraft, Provider, CreateExpense as EconomyCreateExpense, EconomyCapabilities, EconomyExpense, EconomySummary, EconomyWork, ExpenseHistoryEvent as EconomyExpenseHistoryEvent, UpdateExpense as EconomyUpdateExpense, WorkHistoryEvent } from './economyTypes';
import { economyPath, withPage, type PageParams } from './paths';
import { ApiTransport } from './transport';
export class EconomyApi {
private readonly http: ApiTransport;
constructor(http: ApiTransport) { this.http = http; }

async getEconomyCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<EconomyCapabilities>(`${economyPath(homeId)}/capabilities`, { signal, accountId });
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
    return this.http.page<EconomyExpense>(`${economyPath(homeId)}/expenses${withPage(new URLSearchParams(query), page)}`, {}, signal, accountId).then((p) => {
      if (!p.items.every(isEconomyExpense)) throw serviceError(200);
      return p;
    });
  }

async getEconomySummary(homeId: string, query: URLSearchParams, signal: AbortSignal | undefined, accountId: string) {
    const qs = query.size ? `?${query.toString()}` : '';
    const data = await this.http.request<EconomySummary>(`${economyPath(homeId)}/summary${qs}`, { signal, accountId });
    if (!isEconomySummary(data)) throw serviceError(200);
    return data;
  }

async getEconomyExpense(homeId: string, expenseId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<{ expense: EconomyExpense }>(`${economyPath(homeId)}/expenses/${encodeURIComponent(expenseId)}`, { signal, accountId });
    if (!data || !isEconomyExpense(data.expense)) throw serviceError(200);
    return data.expense;
  }

async createEconomyExpense(homeId: string, input: EconomyCreateExpense, idempotencyKey: string, accountId: string) {
    return this.economyExpenseResponse(
      await this.http.mutate<{ expense: EconomyExpense }>(`${economyPath(homeId)}/expenses`, {
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
      await this.http.mutate<{ expense: EconomyExpense }>(`${economyPath(homeId)}/expenses/${encodeURIComponent(expenseId)}/${kind}`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      200,
    );
  }

listEconomyExpenseHistory(homeId: string, expenseId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.http.page<EconomyExpenseHistoryEvent>(`${economyPath(homeId)}/expenses/${encodeURIComponent(expenseId)}/history`, page, signal, accountId);
  }

listWorks(homeId: string, filters: { state: 'active' | 'archived' | 'all'; q?: string }, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const params = new URLSearchParams();
    if (filters.state !== 'active') params.set('state', filters.state);
    const q = filters.q?.normalize('NFC').trim();
    if (q) params.set('q', q);
    return this.http.page<EconomyWork>(`${economyPath(homeId)}/works${withPage(params, page)}`, {}, signal, accountId);
  }

async getWork(homeId: string, workId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<{ work: EconomyWork }>(`${economyPath(homeId)}/works/${encodeURIComponent(workId)}`, { signal, accountId });
    return this.workResponse(data, 200);
  }

async createWork(homeId: string, input: { name: string; note?: string | null; activityId?: string | null }, idempotencyKey: string, accountId: string) {
    return this.workResponse(
      await this.http.mutate<{ work: EconomyWork }>(`${economyPath(homeId)}/works`, { body: input, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
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
      await this.http.mutate<{ work: EconomyWork }>(`${economyPath(homeId)}/works/${encodeURIComponent(workId)}/${kind}`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      200,
    );
  }

listWorkHistory(homeId: string, workId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.http.page<WorkHistoryEvent>(`${economyPath(homeId)}/works/${encodeURIComponent(workId)}/history`, page, signal, accountId);
  }

async startEconomicAnalysis(homeId: string, input: { documentId: string; provider: Provider; consentToProviderTransfer?: boolean }, idempotencyKey: string, accountId: string) {
    return this.jobResponse(
      await this.http.mutate<{ job: EconomicAnalysisJob }>(`${economyPath(homeId)}/document-analysis-jobs`, { body: input, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      202,
    );
  }

async getEconomicJob(homeId: string, jobId: string, signal: AbortSignal | undefined, accountId: string) {
    return this.jobResponse(await this.http.request<{ job: EconomicAnalysisJob }>(`${economyPath(homeId)}/document-analysis-jobs/${encodeURIComponent(jobId)}`, { signal, accountId }), 200);
  }

async retryEconomicJob(homeId: string, jobId: string, body: { expectedVersion: number; consentToProviderTransfer?: boolean }, idempotencyKey: string, accountId: string) {
    return this.jobResponse(
      await this.http.mutate<{ job: EconomicAnalysisJob }>(`${economyPath(homeId)}/document-analysis-jobs/${encodeURIComponent(jobId)}/retries`, {
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
    return this.http.page<DraftListItem>(`${economyPath(homeId)}/drafts${withPage(params, page)}`, {}, signal, accountId);
  }

async getEconomicDraft(homeId: string, draftId: string, signal: AbortSignal | undefined, accountId: string) {
    return this.draftResponse(await this.http.request<{ draft: EconomicDraft }>(`${economyPath(homeId)}/drafts/${encodeURIComponent(draftId)}`, { signal, accountId }), 200);
  }

listDraftCandidates(homeId: string, draftId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.http.page<CandidateExpense>(`${economyPath(homeId)}/drafts/${encodeURIComponent(draftId)}/candidates`, page, signal, accountId).then((p) => {
      if (!p.items.every((c) => c && isEconomyExpense(c.expense) && Array.isArray(c.reasons))) throw serviceError(200);
      return p;
    });
  }

async draftAction(homeId: string, draftId: string, kind: 'park' | 'reopen', body: { expectedVersion: number }, idempotencyKey: string, accountId: string) {
    return this.draftResponse(
      await this.http.mutate<{ draft: EconomicDraft }>(`${economyPath(homeId)}/drafts/${encodeURIComponent(draftId)}/${kind}`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      200,
    );
  }

async confirmEconomicDraft(homeId: string, draftId: string, body: ConfirmDraft, idempotencyKey: string, accountId: string) {
    const data = await this.http.mutate<{ draft: EconomicDraft; expense: EconomyExpense }>(`${economyPath(homeId)}/drafts/${encodeURIComponent(draftId)}/confirm`, {
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
}

const CENTS = /^\d+$/;

const SIGNED_CENTS = /^-?\d+$/;

function isLinkShape(l: unknown) {
  const v = l as { state?: unknown } | null;
  return !!v && (v.state === 'none' || v.state === 'unavailable' || v.state === 'linked');
}

function isEconomyExpense(e: unknown): e is EconomyExpense {
  const x = e as EconomyExpense | null;
  return (
    !!x && typeof x.id === 'string' && typeof x.version === 'number' && typeof x.amountCents === 'number' &&
    Number.isInteger(x.amountCents) && typeof x.family === 'string' && isLinkShape(x.objectLink) &&
    isLinkShape(x.workLink) && isLinkShape(x.documentLink) && Array.isArray(x.permissions)
  );
}

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
