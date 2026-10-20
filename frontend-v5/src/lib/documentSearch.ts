// Regole document-search-v1 (H2) lato client: aiuto immediato all'utente.
// Il server applica permessi, normalizzazione e limiti ed è l'unica autorità.
import { isApiError, userMessage } from '../api/errors';
import type { DocumentFormatFilter, DocumentSearchFilters, DocumentVisibilityFilter } from '../api/types';

/** Limite del contratto, usato finché le capabilities non dicono altro. */
export const QUERY_MAX_CODE_POINTS = 120;

export const EMPTY_FILTERS: DocumentSearchFilters = { q: '', format: 'all', visibility: 'all' };

export const FORMAT_OPTIONS: Array<{ value: DocumentFormatFilter; label: string }> = [
  { value: 'all', label: 'Tutti' },
  { value: 'pdf', label: 'PDF' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
];

export const VISIBILITY_FILTER_OPTIONS: Array<{ value: DocumentVisibilityFilter; label: string }> = [
  { value: 'all', label: 'Tutti' },
  { value: 'private', label: 'Solo io' },
  { value: 'home', label: 'Persone della casa' },
];
export const COLLECTION_OPTIONS = [
  { value: 'all', label: 'Tutte le raccolte' },
  {value:'house',label:'Documenti della casa'},
  {value:'floor_plans',label:'Planimetrie'},
  {value:'contracts',label:'Contratti'},
  { value: 'energy', label: 'Energia' },
  { value: 'building', label: 'Pratiche edilizie' },
  { value: 'technical', label: 'Impianti e documenti tecnici' },
  { value: 'condominium', label: 'Condominio' },
  { value: 'purchases', label: 'Acquisti e garanzie' },
  { value: 'utilities', label: 'Bollette' },
  { value: 'unclassified', label: 'Da organizzare' },
] as const;

export const SEARCH_SCOPE_NOTE = 'La ricerca riguarda titoli e nomi dei file, non il contenuto.';

/** Conserva i controlli per rifiutarli prima che trim li cancelli, come il server. */
export function normalizeQuery(raw: string) {
  const normalized = raw.normalize('NFC');
  return CONTROL_RE.test(raw) ? normalized : normalized.trim();
}

// eslint-disable-next-line no-control-regex -- i caratteri di controllo sono proprio ciò che va rifiutato
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

/** Errore da mostrare sul campo, oppure undefined. La query va già normalizzata. */
export function validateQuery(q: string, max = QUERY_MAX_CODE_POINTS) {
  if (CONTROL_RE.test(q)) return 'La ricerca contiene caratteri non ammessi (a capo o di controllo).';
  if ([...q].length > max) return `La ricerca può avere al massimo ${max} caratteri.`;
  return undefined;
}

export function isFiltered(f: DocumentSearchFilters) {
  return (f.workflow !== undefined && f.workflow !== 'all') || f.q !== '' || f.format !== 'all' || f.visibility !== 'all' || (f.collection !== undefined && f.collection !== 'all');
}

const FORMATS = new Set<string>(FORMAT_OPTIONS.map((o) => o.value));
const VISIBILITIES = new Set<string>(VISIBILITY_FILTER_OPTIONS.map((o) => o.value));

/**
 * Filtri applicati letti dall'indirizzo (solo q/format/visibility; cursor e altri
 * parametri ignorati). Valori sconosciuti di formato/visibilità valgono «Tutti».
 */
export function filtersFromParams(params: URLSearchParams): DocumentSearchFilters {
  const format = params.get('format') ?? 'all';
  const visibility = params.get('visibility') ?? 'all';
  return {
    q: normalizeQuery(params.get('q') ?? ''),
    ...(['all','pending','completed','to_compile','review'].includes(params.get('workflow')??'')?{workflow:params.get('workflow') as 'all'|'pending'|'completed'|'to_compile'|'review'}:{}),
    format: (FORMATS.has(format) ? format : 'all') as DocumentFormatFilter,
    visibility: (VISIBILITIES.has(visibility) ? visibility : 'all') as DocumentVisibilityFilter,
    ...(COLLECTION_OPTIONS.some(o => o.value === params.get('collection') && o.value !== 'all') ? { collection: params.get('collection') as DocumentSearchFilters['collection'] } : {}),
  };
}

/** Parametri dell'indirizzo per i filtri applicati: solo quelli attivi, mai il cursor. */
export function filtersToParams(f: DocumentSearchFilters) {
  const params = new URLSearchParams();
  if(f.workflow)params.set('workflow',f.workflow);
  if (f.q) params.set('q', f.q);
  if (f.format !== 'all') params.set('format', f.format);
  if (f.visibility !== 'all') params.set('visibility', f.visibility);
  if (f.collection && f.collection !== 'all') params.set('collection', f.collection);
  return params;
}

export function filtersKey(f: DocumentSearchFilters) {
  return filtersToParams(f).toString();
}

export function sameFilters(a: DocumentSearchFilters, b: DocumentSearchFilters) {
  return (a.workflow??'all')===(b.workflow??'all') && a.q === b.q && a.format === b.format && a.visibility === b.visibility && (a.collection ?? 'all') === (b.collection ?? 'all');
}

/** Descrizione testuale dei filtri applicati (resa come testo React, mai HTML). */
export function describeFilters(f: DocumentSearchFilters) {
  const parts: string[] = [];
  if(f.workflow==='to_compile')parts.push('Da compilare');if(f.workflow==='review')parts.push('Documenti da controllare');
  if(f.workflow==='pending')parts.push('Da fare');if(f.workflow==='completed')parts.push('Completati');
  if (f.q) parts.push(`«${f.q}»`);
  if (f.format !== 'all') parts.push(`formato ${FORMAT_OPTIONS.find((o) => o.value === f.format)!.label}`);
  if (f.visibility !== 'all') parts.push(VISIBILITY_FILTER_OPTIONS.find((o) => o.value === f.visibility)!.label);
  if (f.collection && f.collection !== 'all') parts.push(COLLECTION_OPTIONS.find(o => o.value === f.collection)!.label);
  return parts.join(' · ');
}

/** Ricerca non attiva (capabilities 404) o non disponibile ora (503/rete). */
export function searchUnavailableMessage(error: unknown) {
  if (isApiError(error) && error.kind === 'http' && error.status === 404) {
    return 'La ricerca nei documenti non è ancora attiva su questo servizio. Puoi comunque consultare l’elenco completo.';
  }
  return `La ricerca nei documenti non è disponibile in questo momento. ${userMessage(error)}`;
}

export function isForbidden(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 403;
}
