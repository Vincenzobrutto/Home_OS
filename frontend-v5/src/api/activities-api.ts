import { serviceError } from './errors';
import type { ActivitiesPage, ActivityAction, ActivityCapabilities, ActivityFilters, ActivityHistoryEvent, ActivityResponse, ActivitySummary, CreateActivity, UpdateActivity, FollowUpActivity } from './types';
import { homePath, type PageParams } from './paths';
import { ApiTransport } from './transport';
export class ActivitiesApi {
private readonly http: ApiTransport;
constructor(http: ApiTransport) { this.http = http; }

async getActivityCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<ActivityCapabilities>(`${homePath(homeId)}/activity-capabilities`, { signal, accountId });
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
    if (filters.q) params.set('q', filters.q);
    if (filters.assetId) params.set('assetId', filters.assetId);
    if (page.limit !== undefined) params.set('limit', String(page.limit));
    if (page.cursor) params.set('cursor', page.cursor);
    const data = await this.http.request<ActivitiesPage>(`${homePath(homeId)}/activities?${params.toString()}`, { signal, accountId });
    if (!data || !Array.isArray(data.items) || !('nextCursor' in data) || typeof data.today !== 'string') throw serviceError(200);
    return data;
  }

async getActivity(homeId: string, activityId: string, signal: AbortSignal | undefined, accountId: string) {
    return this.activityResponse(
      await this.http.request<ActivityResponse>(`${homePath(homeId)}/activities/${encodeURIComponent(activityId)}`, { signal, accountId }),
      200,
    );
  }

async createActivity(homeId: string, input: CreateActivity, idempotencyKey: string, accountId: string) {
    return this.activityResponse(
      await this.http.mutate<ActivityResponse>(`${homePath(homeId)}/activities`, {
        body: input,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      201,
    );
  }

async activityMutation(
    homeId: string,
    activityId: string,
    kind: 'updates' | 'complete' | 'cancel' | 'reopen' | 'follow-up',
    body: UpdateActivity | ActivityAction | FollowUpActivity,
    idempotencyKey: string,
    accountId: string,
  ) {
    return this.activityResponse(
      await this.http.mutate<ActivityResponse>(`${homePath(homeId)}/activities/${encodeURIComponent(activityId)}/${kind}`, {
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
        accountId,
      }),
      kind === 'follow-up' ? 201 : 200,
    );
  }

listActivityHistory(homeId: string, activityId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.http.page<ActivityHistoryEvent>(
      `${homePath(homeId)}/activities/${encodeURIComponent(activityId)}/history`,
      page,
      signal,
      accountId,
    );
  }

async getActivitySummary(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<ActivitySummary>(`${homePath(homeId)}/activity-summary`, { signal, accountId });
    if (!data || !data.counts || !Array.isArray(data.nextItems) || typeof data.today !== 'string') throw serviceError(200);
    return data;
  }

private activityResponse(data: ActivityResponse | undefined, status: number) {
    if (!data || !data.activity || typeof data.today !== 'string') throw serviceError(status);
    return data;
  }
}
