import type { ObjectRef } from './types';
export type PageParams = { cursor?: string | null; limit?: number };

export function homePath(homeId: string) {
  return `/homes/${encodeURIComponent(homeId)}`;
}

export function economyPath(homeId: string) {
  return `${homePath(homeId)}/economy`;
}

export function objectPath(homeId: string, ref: ObjectRef) {
  return `${homePath(homeId)}/objects/${encodeURIComponent(ref.kind)}/${encodeURIComponent(ref.id)}`;
}

export function withPage(params: URLSearchParams, page: PageParams) {
  if (page.limit !== undefined) params.set('limit', String(page.limit));
  if (page.cursor) params.set('cursor', page.cursor);
  return params.size ? `?${params.toString()}` : '';
}

export function pageQuery(page: PageParams) {
  const params = new URLSearchParams();
  if (page.limit !== undefined) params.set('limit', String(page.limit));
  if (page.cursor) params.set('cursor', page.cursor);
  return params.size ? `?${params.toString()}` : '';
}
