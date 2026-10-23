import { serviceError } from './errors';
import type { CreateHomeInput, Home } from './types';
import { ApiTransport } from './transport';
export class HomesApi {
private readonly http: ApiTransport;
constructor(http: ApiTransport) { this.http = http; }

async listHomes(signal?: AbortSignal, accountId?: string): Promise<Home[]> {
    const data = await this.http.request<{ items: Home[] }>('/homes', { signal, accountId });
    if (!data || !Array.isArray(data.items)) throw serviceError(200);
    return data.items;
  }

async getHome(homeId: string, signal?: AbortSignal, accountId?: string): Promise<Home> {
    const data = await this.http.request<{ home: Home }>(`/homes/${encodeURIComponent(homeId)}`, {
      signal,
      accountId,
    });
    if (!data || !data.home) throw serviceError(200);
    return data.home;
  }

async createHome(input: CreateHomeInput, idempotencyKey: string, accountId?: string): Promise<Home> {
    const data = await this.http.mutate<{ home: Home }>('/homes', {
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
      accountId,
    });
    if (!data || !data.home) throw serviceError(201);
    return data.home;
  }
}
