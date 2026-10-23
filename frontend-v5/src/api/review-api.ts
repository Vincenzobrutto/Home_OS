import { serviceError } from './errors';
import type { AnalysisCapabilities, AnalysisJob, BoilerDetail, BoilerSummary, ConfirmationResult, ConfirmationsInput, HistoryEvent, ManualConfirmationsInput, ReviewPage, StartAnalysisInput } from './types';
import { homePath, pageQuery, type PageParams } from './paths';
import { ApiTransport } from './transport';
export class ReviewApi {
private readonly http: ApiTransport;
constructor(http: ApiTransport) { this.http = http; }

async getAnalysisCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<AnalysisCapabilities>(`${homePath(homeId)}/analysis-capabilities`, {
      signal,
      accountId,
    });
    if (!data || typeof data.enabled !== 'boolean' || typeof data.isSimulation !== 'boolean' || !['anthropic', 'test_fixture_v1'].includes(data.provider) || data.isSimulation !== (data.provider === 'test_fixture_v1')) throw serviceError(200);
    return data;
  }

async createAnalysisJob(
    homeId: string,
    input: StartAnalysisInput,
    idempotencyKey: string,
    accountId: string,
  ): Promise<AnalysisJob> {
    const data = await this.http.mutate<{ job: AnalysisJob }>(`${homePath(homeId)}/analysis-jobs`, {
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !data.job) throw serviceError(202);
    return data.job;
  }

listAnalysisJobs(homeId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.http.page<AnalysisJob>(`${homePath(homeId)}/analysis-jobs`, page, signal, accountId);
  }

async getAnalysisJob(homeId: string, jobId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<{ job: AnalysisJob }>(
      `${homePath(homeId)}/analysis-jobs/${encodeURIComponent(jobId)}`,
      { signal, accountId },
    );
    if (!data || !data.job) throw serviceError(200);
    return data.job;
  }

async retryAnalysisJob(
    homeId: string,
    jobId: string,
    idempotencyKey: string,
    accountId: string,
    consentToProviderTransfer = false,
  ) {
    const data = await this.http.mutate<{ job: AnalysisJob }>(
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
    return this.http.page<BoilerSummary>(`${homePath(homeId)}/assets`, page, signal, accountId);
  }

async createBoiler(homeId: string, name: string, idempotencyKey: string, accountId: string) {
    const data = await this.http.mutate<{ asset: BoilerDetail }>(`${homePath(homeId)}/assets`, {
      body: { type: 'boiler', name },
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !data.asset) throw serviceError(201);
    return data.asset;
  }

async getAsset(homeId: string, assetId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<{ asset: BoilerDetail }>(
      `${homePath(homeId)}/assets/${encodeURIComponent(assetId)}`,
      { signal, accountId },
    );
    if (!data || !data.asset || !Array.isArray(data.asset.proposals)) throw serviceError(200);
    return data.asset;
  }

async listReview(homeId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<ReviewPage>(`${homePath(homeId)}/review${pageQuery(page)}`, {
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
    return this.http.page<HistoryEvent>(
      `${homePath(homeId)}/assets/${encodeURIComponent(assetId)}/history`,
      page,
      signal,
      accountId,
    );
  }

private async confirmation(path: string, body: unknown, idempotencyKey: string, accountId: string) {
    const data = await this.http.mutate<ConfirmationResult>(path, {
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !data.asset || !Array.isArray(data.resolvedProposalIds)) throw serviceError(201);
    return data;
  }
}
