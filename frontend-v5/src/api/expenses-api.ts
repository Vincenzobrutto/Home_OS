import { serviceError } from './errors';
import type { CreateExpense, ExpenseAction, ExpenseCapabilities, ExpenseFilters, ExpenseHistoryEvent, ExpenseResponse, ExpenseSummary, HomeExpense, UpdateExpense } from './types';
import { homePath, type PageParams } from './paths';
import { ApiTransport } from './transport';
export class ExpensesApi {
private readonly http: ApiTransport;
constructor(http: ApiTransport) { this.http = http; }

async getExpenseCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<ExpenseCapabilities>(`${homePath(homeId)}/expense-capabilities`, { signal, accountId });
    if (!data || data.apiVersion !== 'expenses-v1' || data.enabled !== true || !data.limits || typeof data.today !== 'string') {
      throw serviceError(200);
    }
    return data;
  }

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
    return this.http.page<HomeExpense>(`${homePath(homeId)}/expenses${query}`, {}, signal, accountId);
  }

async getExpense(homeId: string, expenseId: string, signal: AbortSignal | undefined, accountId: string) {
    return this.expenseResponse(
      await this.http.request<ExpenseResponse>(`${homePath(homeId)}/expenses/${encodeURIComponent(expenseId)}`, { signal, accountId }),
      200,
    );
  }

async createExpense(homeId: string, input: CreateExpense, idempotencyKey: string, accountId: string) {
    return this.expenseResponse(
      await this.http.mutate<ExpenseResponse>(`${homePath(homeId)}/expenses`, {
        body: input,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      201,
    );
  }

async expenseMutation(
    homeId: string,
    expenseId: string,
    kind: 'updates' | 'archive' | 'restore',
    body: UpdateExpense | ExpenseAction,
    idempotencyKey: string,
    accountId: string,
  ) {
    return this.expenseResponse(
      await this.http.mutate<ExpenseResponse>(`${homePath(homeId)}/expenses/${encodeURIComponent(expenseId)}/${kind}`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      200,
    );
  }

listExpenseHistory(homeId: string, expenseId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.http.page<ExpenseHistoryEvent>(
      `${homePath(homeId)}/expenses/${encodeURIComponent(expenseId)}/history`,
      page,
      signal,
      accountId,
    );
  }

async getExpenseSummary(homeId: string, year: string | null, signal: AbortSignal | undefined, accountId: string) {
    const query = year ? `?year=${encodeURIComponent(year)}` : '';
    const data = await this.http.request<ExpenseSummary>(`${homePath(homeId)}/expense-summary${query}`, { signal, accountId });
    if (!data || !data.totalsCents || typeof data.totalCents !== 'number' || !Array.isArray(data.lastItems) || typeof data.today !== 'string') {
      throw serviceError(200);
    }
    return data;
  }

private expenseResponse(data: ExpenseResponse | undefined, status: number) {
    if (!data || !data.expense || typeof data.expense.amountCents !== 'number') throw serviceError(status);
    return data;
  }
}
