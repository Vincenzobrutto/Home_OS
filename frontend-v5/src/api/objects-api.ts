import { serviceError } from './errors';
import type { CatalogFilters, CatalogItem, CreateObject, CreateRoom, G1HistoryEvent, G1ResourceType, LinkedResource, ObjectCapabilities, ObjectRef, Room, RoomFilters, UpdateObject, UpdateRoom } from './types';
import { homePath, objectPath, withPage, type PageParams } from './paths';
import { ApiTransport } from './transport';
export class ObjectsApi {
private readonly http: ApiTransport;
constructor(http: ApiTransport) { this.http = http; }

async getObjectCapabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<ObjectCapabilities>(`${homePath(homeId)}/object-capabilities`, { signal, accountId });
    if (!data || data.apiVersion !== 'home-objects-v1' || data.enabled !== true || !data.limits || !Array.isArray(data.types)) {
      throw serviceError(200);
    }
    return data;
  }

listRooms(homeId: string, filters: RoomFilters, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const params = new URLSearchParams();
    if (filters.state !== 'active') params.set('state', filters.state);
    return this.http.page<Room>(`${homePath(homeId)}/rooms${withPage(params, page)}`, {}, signal, accountId);
  }

async getRoom(homeId: string, roomId: string, signal: AbortSignal | undefined, accountId: string) {
    const data = await this.http.request<{ room: Room }>(`${homePath(homeId)}/rooms/${encodeURIComponent(roomId)}`, { signal, accountId });
    if (!data || !data.room) throw serviceError(200);
    return data.room;
  }

async createRoom(homeId: string, input: CreateRoom, idempotencyKey: string, accountId: string) {
    return this.roomResponse(await this.http.mutate<{ room: Room }>(`${homePath(homeId)}/rooms`, { body: input, headers: { 'Idempotency-Key': idempotencyKey }, accountId }), 201);
  }

async roomMutation(homeId: string, roomId: string, kind: 'updates' | 'archive' | 'restore', body: UpdateRoom | { expectedVersion: number }, idempotencyKey: string, accountId: string) {
    return this.roomResponse(
      await this.http.mutate<{ room: Room }>(`${homePath(homeId)}/rooms/${encodeURIComponent(roomId)}/${kind}`, { body, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      200,
    );
  }

listRoomHistory(homeId: string, roomId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.http.page<G1HistoryEvent>(`${homePath(homeId)}/rooms/${encodeURIComponent(roomId)}/history`, page, signal, accountId);
  }

listObjects(homeId: string, filters: CatalogFilters, page: PageParams, signal: AbortSignal | undefined, accountId: string):Promise<import('./types').CatalogPage> {
    const params = new URLSearchParams();
    if (filters.state !== 'active') params.set('state', filters.state);
    if (filters.roomId) params.set('roomId', filters.roomId);
    else if (filters.placement === 'unplaced') params.set('placement', 'unplaced');
    if (filters.q) params.set('q', filters.q);
    if (filters.type) params.set('type', filters.type);
    if (filters.sort) params.set('sort', filters.sort);
    return this.http.page<CatalogItem>(`${homePath(homeId)}/objects${withPage(params, page)}`, {}, signal, accountId);
  }

async getObject(homeId: string, ref: ObjectRef, signal: AbortSignal | undefined, accountId: string) {
    return this.objectResponse(await this.http.request<{ object: CatalogItem }>(objectPath(homeId, ref), { signal, accountId }), 200);
  }

async createObject(homeId: string, input: CreateObject, idempotencyKey: string, accountId: string) {
    return this.objectResponse(
      await this.http.mutate<{ object: CatalogItem }>(`${homePath(homeId)}/objects`, { body: input, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      201,
    );
  }

async objectMutation(
    homeId: string,
    ref: ObjectRef,
    kind: 'updates' | 'archive' | 'restore' | 'position',
    body: UpdateObject | { expectedVersion: number } | { expectedVersion: number; roomIds: string[] },
    idempotencyKey: string,
    accountId: string,
  ) {
    return this.objectResponse(
      await this.http.mutate<{ object: CatalogItem }>(`${objectPath(homeId, ref)}/${kind}`, { body, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      200,
    );
  }

listObjectHistory(homeId: string, ref: ObjectRef, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    return this.http.page<G1HistoryEvent>(`${objectPath(homeId, ref)}/history`, page, signal, accountId);
  }

listObjectLinks(homeId: string, ref: ObjectRef, resourceType: G1ResourceType, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
    const params = new URLSearchParams({ resourceType });
    return this.http.page<LinkedResource>(`${objectPath(homeId, ref)}/links${withPage(params, page)}`, {}, signal, accountId);
  }

async createObjectLink(homeId: string, ref: ObjectRef, input: { resourceType: G1ResourceType; resourceId: string }, idempotencyKey: string, accountId: string) {
    return this.linkResponse(
      await this.http.mutate<{ link: LinkedResource }>(`${objectPath(homeId, ref)}/links`, { body: input, headers: { 'Idempotency-Key': idempotencyKey }, accountId }),
      201,
    );
  }

async removeObjectLink(homeId: string, ref: ObjectRef, linkId: string, expectedVersion: number, idempotencyKey: string, accountId: string) {
    return this.linkResponse(
      await this.http.mutate<{ link: LinkedResource }>(`${objectPath(homeId, ref)}/links/${encodeURIComponent(linkId)}/remove`, {
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
}
