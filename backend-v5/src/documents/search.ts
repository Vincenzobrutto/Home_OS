import { isUUID } from 'class-validator';
import { digest } from '../security';
import { invalid, object } from '../review/domain';
import type { SearchDocumentsDto } from './dto';
import { DOCUMENT_COLLECTIONS } from '../document-intake/domain';
export const SEARCH_RESOURCE = 'document-search-v1';
export const SEARCH_CAPABILITIES = { apiVersion: SEARCH_RESOURCE, enabled: true, isSimulation: false, documentViews: true, searchableFields: ['name', 'originalFilename'], formats: ['pdf', 'jpeg', 'png'], visibilities: ['private', 'home'], limits: { queryMaxCodePoints: 120, maxPageSize: 50 } } as const;
export function normalizeSearchQuery(input: unknown): string {
  if (typeof input !== 'string' || [...input].some(c => c.codePointAt(0)! < 32 || c.codePointAt(0) === 127)) throw invalid();
  const value = input.trim().normalize('NFC');
  if ([...value].length > 120) throw invalid(); return value;
}
export function searchFilters(query: SearchDocumentsDto) {
  object(query, ['limit', 'cursor', 'q', 'format', 'visibility', 'collection', 'workflow', 'view', 'group']);
  if (query.q !== undefined && typeof query.q !== 'string') throw invalid();
  const q = normalizeSearchQuery(query.q ?? ''), format = query.format ?? 'all', visibility = query.visibility ?? 'all';
  if ([...q].length > 120 || [...q].some(c => c.codePointAt(0)! < 32 || c.codePointAt(0) === 127) || !['all', 'pdf', 'jpeg', 'png'].includes(format) || !['all', 'private', 'home'].includes(visibility)) throw invalid();
  if (!Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 50) throw invalid();
  if (query.cursor !== undefined && (typeof query.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(query.cursor))) throw invalid('Pagina non valida.');
  const collection = query.collection ?? 'all';
  if (typeof collection !== 'string' || (!['all','house','floor_plans'].includes(collection) && !Object.hasOwn(DOCUMENT_COLLECTIONS, collection))) throw invalid();
  const workflow=query.workflow??'all';if(!['all','pending','completed','to_compile','review'].includes(workflow))throw invalid();
  if(query.view!==undefined&&!['all','house','objects'].includes(query.view))throw invalid();
  if(query.group!==undefined&&(query.view!=='house'||!['plans','building','energy','contracts','other'].includes(query.group)))throw invalid();
  return { q, format, visibility, collection, workflow,...(query.view!==undefined?{view:query.view}:{}),...(query.group!==undefined?{group:query.group}:{}) };
}
export type Filters = ReturnType<typeof searchFilters>;
export const filtersDigest = (f: Filters) => {
 const base=f.workflow!=='all'?[f.q,f.format,f.visibility,f.collection,f.workflow]:f.collection==='all'?[f.q,f.format,f.visibility]:[f.q,f.format,f.visibility,f.collection];
 return digest(JSON.stringify(f.view!==undefined?[...base,'view',f.view,f.group??null]:base));
};
export const literalPattern = (q: string) => '%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%';
export function searchAnchor(cursor: string | undefined, accountId: string, homeId: string, filters: Filters) {
  if (!cursor) return undefined;
  try {
    const row = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (row.a !== accountId || row.h !== homeId || typeof row.id !== 'string' || !isUUID(row.id) || typeof row.t !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.t) || !Number.isFinite(Date.parse(row.t))) throw invalid();
    if (new Date(row.t).toISOString() !== row.t) throw invalid();
    const legacy = !('r' in row) && !('f' in row);
    if (legacy ? filters.q !== '' || filters.format !== 'all' || filters.visibility !== 'all' || filters.collection !== 'all' || filters.workflow!=='all' || filters.view!==undefined : row.r !== SEARCH_RESOURCE || row.f !== filtersDigest(filters)) throw invalid();
    const allowed = legacy ? ['a', 'h', 'id', 't'] : ['a', 'h', 'id', 't', 'r', 'f'];
    if (Object.keys(row).some(k => !allowed.includes(k))) throw invalid();
    return { id: row.id, createdAt: new Date(row.t) };
  } catch { throw invalid('Pagina non valida.'); }
}
export function searchCursor(last: { id: string; createdAt: Date }, accountId: string, homeId: string, filters: Filters) {
  return Buffer.from(JSON.stringify({ a: accountId, h: homeId, id: last.id, t: last.createdAt.toISOString(), r: SEARCH_RESOURCE, f: filtersDigest(filters) })).toString('base64url');
}
