/**
 * Archivio assistito — modello UI a props.
 *
 * Semantica da docs/v5/document-intake-api-contract.md (baseline V1, trasporto NON attivo). Il container
 * di Codex mappa i DTO in questi tipi: le differenze rispetto al wire sono elencate in HANDOFF.md.
 * Nessun fetch, nessuna chiave HTTP, nessun dato dimostrativo: fixture solo in testing/**.
 */

// ---------------------------------------------------------------------------------------------
// Catalogo (dal contratto)

export type Collection = 'energy' | 'building' | 'technical' | 'condominium' | 'purchases' | 'utilities' | 'unclassified';
export type DocumentKind =
  | 'ape' | 'energy_certificate'
  | 'cila' | 'scia' | 'building_permit' | 'habitability' | 'agibility'
  | 'system_diagram' | 'conformity_declaration' | 'system_booklet'
  | 'condominium_rules' | 'condominium_minutes' | 'millesimal_tables'
  | 'receipt' | 'invoice' | 'warranty' | 'manual'
  | 'utility_bill'
  | 'other';

export const COLLECTIONS: ReadonlyArray<{ id: Collection; label: string }> = [
  { id: 'energy', label: 'Energia' },
  { id: 'building', label: 'Pratiche edilizie' },
  { id: 'technical', label: 'Impianti e documenti tecnici' },
  { id: 'condominium', label: 'Condominio' },
  { id: 'purchases', label: 'Acquisti e garanzie' },
  { id: 'utilities', label: 'Bollette' },
  { id: 'unclassified', label: 'Da organizzare' },
];
export const collectionLabel = (c: Collection) => COLLECTIONS.find(x => x.id === c)?.label ?? c;

const KIND_COLLECTION: Record<DocumentKind, Collection> = {
  ape: 'energy', energy_certificate: 'energy',
  cila: 'building', scia: 'building', building_permit: 'building', habitability: 'building', agibility: 'building',
  system_diagram: 'technical', conformity_declaration: 'technical', system_booklet: 'technical',
  condominium_rules: 'condominium', condominium_minutes: 'condominium', millesimal_tables: 'condominium',
  receipt: 'purchases', invoice: 'purchases', warranty: 'purchases', manual: 'purchases',
  utility_bill: 'utilities',
  other: 'unclassified',
};
export const KIND_LABEL: Record<DocumentKind, string> = {
  ape: 'APE', energy_certificate: 'Certificato energetico',
  cila: 'CILA', scia: 'SCIA', building_permit: 'Titolo edilizio', habitability: 'Abitabilità', agibility: 'Agibilità',
  system_diagram: 'Schema di impianto', conformity_declaration: 'Dichiarazione di conformità', system_booklet: 'Libretto di impianto',
  condominium_rules: 'Regolamento condominiale', condominium_minutes: 'Verbale di assemblea', millesimal_tables: 'Tabelle millesimali',
  receipt: 'Ricevuta', invoice: 'Fattura', warranty: 'Garanzia', manual: 'Manuale d’uso',
  utility_bill: 'Bolletta',
  other: 'Altro documento',
};
export const kindCollection = (kind: DocumentKind) => KIND_COLLECTION[kind];
export const KINDS = Object.keys(KIND_COLLECTION) as DocumentKind[];

// ---------------------------------------------------------------------------------------------
// Contesto e dati (props)

export type OpaqueId = string;
export type OpaqueVersion = string | number;

/** Cambiare account, casa o lotto azzera ogni stato locale (scelte, bozze, dialoghi, esiti). */
export type IntakeContextKey = { accountId: OpaqueId; homeId: OpaqueId; batchId: OpaqueId | null };
export const contextKeyString = (k: IntakeContextKey) => [k.accountId, k.homeId, k.batchId ?? ''].map(encodeURIComponent).join('|');

/** Parte di un documento: intervallo 1-based inclusivo, oppure null/null per l'intero documento. */
export type ClassificationPart = { kind: DocumentKind; pageFrom: number | null; pageTo: number | null };
export type SourceExcerpt = { page: number; excerpt: string };
export type IntakeTarget = { kind: 'home' } | { kind: 'object' | 'boiler'; id: OpaqueId; expectedVersion: OpaqueVersion };
export type OrganizationSelection =
  | { action: 'organize'; title: string; parts: ClassificationPart[]; target: IntakeTarget }
  | { action: 'defer' };

export type IntakeItem = {
  id: OpaqueId;
  clientItemId: string;
  version: OpaqueVersion;
  filename: string;
  byteSize: number;
  mimeType: string;
  uploadState: 'pending' | 'uploading' | 'stored' | 'duplicate' | 'failed';
  analysisState: 'not_started' | 'queued' | 'running' | 'ready' | 'needs_choice' | 'unreadable' | 'unsupported' | 'failed' | 'uncertain';
  reviewState: 'unreviewed' | 'saved' | 'deferred' | 'confirmed';
  documentLink: { state: 'linked' | 'unavailable'; document: { id: OpaqueId; name: string } | null };
  pageCount: number | null;
  proposal: null | { title: string; parts: ClassificationPart[]; sources: SourceExcerpt[] };
  selection: OrganizationSelection | null;
  duplicate: null | { itemId: OpaqueId | null; document: { id: OpaqueId; name: string } | null };
  error: null | { code: string; message: string };
  permissions: { review: boolean };
  /** Estensioni UI (richieste in HANDOFF): organizzazione già confermata, scelta da rivedere, collegamenti esistenti. */
  confirmedOrganization?: { title: string; parts: ClassificationPart[] } | null;
  selectionStale?: boolean;
  existingLinks?: { objects: Array<{ name: string; roomName: string | null }>; expenses: Array<{ title: string; amountCents: number; spentOn: string }> } | null;
};

export type IntakeLimits = { maxFiles: number; maxTotalBytes: number; maxFileBytes: number; acceptedMimeTypes: string[] };

export type IntakeBatch = {
  id: OpaqueId;
  version: OpaqueVersion;
  state: 'open' | 'completed';
  limits: IntakeLimits;
  items: IntakeItem[];
  permissions: { upload: boolean; review: boolean; confirm: boolean };
};

export type IntakeCapabilities = { enabled: boolean; limits: IntakeLimits };
export type IntakeLoadState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string; retryable: boolean } | { status: 'unavailable' };

/** Pannello analisi facoltativo: assente finché il container non ha testi/limiti/stati veri (B3). */
export type IntakeAnalysisPanel = {
  consentText: string;
  costText: string | null;
  limitsText: string | null;
  state: { status: 'idle' } | { status: 'running' } | { status: 'blocked'; message: string };
};

export type TargetCandidate = { kind: 'object' | 'boiler'; id: OpaqueId; version: OpaqueVersion; name: string; roomName: string | null };
export type CandidatePage = { items: TargetCandidate[]; hasMore: boolean; status: 'idle' | 'loading' | 'error' };

// ---------------------------------------------------------------------------------------------
// Esiti delle callback di scrittura (mai chiavi o retry generati qui)

export type WriteOutcome =
  | { status: 'confirmed' }
  | { status: 'rejected'; code: 'validation' | 'conflict' | 'forbidden' | 'unavailable' | 'stale'; message: string }
  | { status: 'uncertain'; message?: string };

export type ItemConfirmResult = { itemId: OpaqueId; status: 'confirmed' | 'rejected'; message?: string };
export type ConfirmBatchOutcome =
  | { status: 'done'; results: ItemConfirmResult[] }
  | { status: 'rejected'; code: 'validation' | 'conflict' | 'forbidden' | 'unavailable'; message: string }
  | { status: 'uncertain'; message?: string };
export type RecoverBatchOutcome = ConfirmBatchOutcome | { status: 'not_found' };

export type ConfirmBatchPayload = { batchId: OpaqueId; expectedVersion: OpaqueVersion; items: Array<{ id: OpaqueId; expectedVersion: OpaqueVersion }> };
export type ReviewPayload = { itemId: OpaqueId; expectedVersion: OpaqueVersion; selection: OrganizationSelection };

// ---------------------------------------------------------------------------------------------
// Redazione e stato visibile

/** Fonte o documento non più leggibili: nessun titolo, citazione, scelta o nome di duplicato dalla cache. */
export function visibleItem(item: IntakeItem): IntakeItem {
  if (item.documentLink.state === 'linked') return item;
  return {
    ...item, proposal: null, selection: null, confirmedOrganization: null, existingLinks: null,
    duplicate: item.duplicate ? { itemId: null, document: null } : null,
    documentLink: { state: 'unavailable', document: null },
  };
}

export type ItemStatus =
  | 'pending' | 'uploading' | 'upload_failed' | 'duplicate' | 'stored'
  | 'analysis_waiting' | 'analysis_running' | 'ready' | 'needs_choice' | 'unreadable' | 'unsupported' | 'analysis_failed' | 'uncertain'
  | 'saved' | 'deferred' | 'confirmed' | 'unavailable';

export function itemStatus(raw: IntakeItem): ItemStatus {
  const item = visibleItem(raw);
  if (item.documentLink.state === 'unavailable' && item.uploadState === 'stored') return 'unavailable';
  if (item.uploadState === 'pending') return 'pending';
  if (item.uploadState === 'uploading') return 'uploading';
  if (item.uploadState === 'failed') return 'upload_failed';
  if (item.reviewState === 'confirmed') return 'confirmed';
  if (item.reviewState === 'saved') return 'saved';
  if (item.reviewState === 'deferred') return 'deferred';
  if (item.uploadState === 'duplicate') return 'duplicate';
  switch (item.analysisState) {
    case 'queued': return 'analysis_waiting';
    case 'running': return 'analysis_running';
    case 'ready': return 'ready';
    case 'needs_choice': return 'needs_choice';
    case 'unreadable': return 'unreadable';
    case 'unsupported': return 'unsupported';
    case 'failed': return 'analysis_failed';
    case 'uncertain': return 'uncertain';
    default: return 'stored';
  }
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  pending: 'In attesa', uploading: 'Caricamento…', upload_failed: 'Caricamento non riuscito', duplicate: 'Copia identica', stored: 'Originale acquisito',
  analysis_waiting: 'Analisi in attesa', analysis_running: 'Analisi in corso', ready: 'Pronto da rivedere', needs_choice: 'Serve una scelta',
  unreadable: 'Testo non leggibile', unsupported: 'Formato non analizzabile', analysis_failed: 'Analisi non riuscita', uncertain: 'Esito non noto',
  saved: 'Scelta pronta', deferred: 'Rimandato', confirmed: 'Organizzato', unavailable: 'Non più disponibile',
};
export const STATUS_TONE: Record<ItemStatus, 'ok' | 'warn' | 'neutral' | 'error'> = {
  pending: 'neutral', uploading: 'neutral', upload_failed: 'error', duplicate: 'warn', stored: 'ok',
  analysis_waiting: 'neutral', analysis_running: 'neutral', ready: 'ok', needs_choice: 'warn', unreadable: 'neutral', unsupported: 'neutral',
  analysis_failed: 'error', uncertain: 'warn', saved: 'ok', deferred: 'neutral', confirmed: 'ok', unavailable: 'neutral',
};

/** Filtri della revisione (conteggi esatti sul lotto in memoria: al massimo 20 elementi, nessuna paginazione). */
export type ReviewFilter = 'all' | 'ready' | 'needs_choice' | 'duplicate' | 'unreadable' | 'decided';
export function matchesReviewFilter(item: IntakeItem, filter: ReviewFilter): boolean {
  const s = itemStatus(item);
  if (filter === 'all') return true;
  if (filter === 'unreadable') return s === 'unreadable' || s === 'unsupported';
  if (filter === 'decided') return s === 'saved' || s === 'deferred' || s === 'confirmed';
  return s === filter;
}

/** Un elemento si può rivedere se il suo originale è acquisito e ancora leggibile. */
export function reviewable(item: IntakeItem): boolean {
  const s = itemStatus(item);
  return item.permissions.review && !['pending', 'uploading', 'upload_failed', 'unavailable', 'confirmed', 'analysis_waiting', 'analysis_running'].includes(s);
}

// ---------------------------------------------------------------------------------------------
// Bozza di revisione per singolo file

export type ReviewDraft = {
  title: string;
  /** Parti proposte scelte (indici in proposal.parts). */
  partIndexes: number[];
  /** Classificazione manuale dell'intero documento (senza proposta o quando l'utente la preferisce). */
  manualKind: DocumentKind | null;
  target: { kind: 'home' } | { kind: 'object' | 'boiler'; id: OpaqueId } | null;
};

const normalized = (v: string) => v.normalize('NFC').replace(/\s+/gu, ' ').trim();
export const TITLE_MAX = 120;

export function initialReviewDraft(raw: IntakeItem): ReviewDraft {
  const item = visibleItem(raw);
  const sel = item.selection;
  if (sel && sel.action === 'organize') {
    const fromProposal = (item.proposal?.parts ?? []).map((p, i) => [p, i] as const).filter(([p]) => sel.parts.some(s => s.kind === p.kind && s.pageFrom === p.pageFrom && s.pageTo === p.pageTo)).map(([, i]) => i);
    const manual = sel.parts.length === 1 && fromProposal.length === 0 && sel.parts[0] ? sel.parts[0].kind : null;
    return { title: sel.title, partIndexes: fromProposal, manualKind: manual, target: sel.target.kind === 'home' ? { kind: 'home' } : { kind: sel.target.kind, id: sel.target.id } };
  }
  const parts = item.proposal?.parts ?? [];
  return {
    title: item.proposal?.title ?? '',
    // Una sola parte è preselezionata; più contenuti nello stesso PDF vanno scelti dopo aver visto l'originale.
    partIndexes: parts.length === 1 ? [0] : [],
    manualKind: null,
    // Caso ambiguo: nessuna associazione preselezionata.
    target: item.analysisState === 'needs_choice' ? null : item.proposal ? { kind: 'home' } : null,
  };
}

export type ReviewErrors = Partial<Record<'title' | 'parts' | 'target', string>>;

export function validateReviewDraft(draft: ReviewDraft, raw: IntakeItem): ReviewErrors {
  const item = visibleItem(raw);
  const errors: ReviewErrors = {};
  const n = [...normalized(draft.title)].length;
  if (n === 0) errors.title = 'Inserisci un nome da mostrare.';
  else if (n > TITLE_MAX) errors.title = `Massimo ${TITLE_MAX} caratteri.`;
  const hasProposal = (item.proposal?.parts.length ?? 0) > 0;
  if (draft.manualKind === null && (!hasProposal || draft.partIndexes.length === 0)) {
    errors.parts = hasProposal ? 'Seleziona almeno un contenuto dopo aver consultato l’originale.' : 'Scegli il tipo di documento oppure rimanda la decisione.';
  }
  if (!draft.target) errors.target = 'Scegli una scheda esistente oppure conserva il documento solo a livello casa.';
  return errors;
}

export function buildSelection(draft: ReviewDraft, raw: IntakeItem, candidates: TargetCandidate[]): OrganizationSelection | null {
  const item = visibleItem(raw);
  if (Object.keys(validateReviewDraft(draft, item)).length) return null;
  const parts: ClassificationPart[] = draft.manualKind
    ? [{ kind: draft.manualKind, pageFrom: null, pageTo: null }]
    : draft.partIndexes.slice().sort((a, b) => a - b).flatMap(i => (item.proposal?.parts[i] ? [item.proposal.parts[i]] : []));
  let target: IntakeTarget;
  if (!draft.target || draft.target.kind === 'home') target = { kind: 'home' };
  else {
    const t = draft.target;
    const c = candidates.find(x => x.id === t.id && x.kind === t.kind);
    if (!c) return null;
    target = { kind: c.kind, id: c.id, expectedVersion: c.version };
  }
  return { action: 'organize', title: normalized(draft.title), parts, target };
}

export const partLabel = (p: ClassificationPart) =>
  `${KIND_LABEL[p.kind]}${p.pageFrom !== null && p.pageTo !== null ? ` · ${p.pageFrom === p.pageTo ? `pagina ${p.pageFrom}` : `pagine ${p.pageFrom}–${p.pageTo}`}` : ''}`;

export function selectionCollections(sel: OrganizationSelection | null): Collection[] {
  if (!sel || sel.action !== 'organize') return [];
  return [...new Set(sel.parts.map(p => kindCollection(p.kind)))];
}

// ---------------------------------------------------------------------------------------------
// Riepilogo e conferma parziale

export type IntakeSummary = {
  included: IntakeItem[];
  excluded: IntakeItem[];
  remaining: number;
  byCollection: Array<{ collection: Collection; count: number }>;
};

/** Solo le decisioni salvate (organize) e ancora leggibili; escluse e rimandate non vengono processate. */
export function buildSummary(batch: IntakeBatch, excludedIds: ReadonlySet<OpaqueId>): IntakeSummary {
  const items = batch.items.map(visibleItem);
  const saved = items.filter(i => i.reviewState === 'saved' && i.documentLink.state === 'linked' && i.selection?.action === 'organize' && !i.selectionStale);
  const included = saved.filter(i => !excludedIds.has(i.id));
  const counts = new Map<Collection, number>();
  for (const i of included) for (const c of selectionCollections(i.selection)) counts.set(c, (counts.get(c) ?? 0) + 1);
  return {
    included,
    excluded: saved.filter(i => excludedIds.has(i.id)),
    remaining: items.filter(i => i.reviewState !== 'confirmed').length - included.length,
    byCollection: COLLECTIONS.filter(c => counts.has(c.id)).map(c => ({ collection: c.id, count: counts.get(c.id)! })),
  };
}

export function buildConfirmPayload(batch: IntakeBatch, summary: IntakeSummary): ConfirmBatchPayload | null {
  if (!summary.included.length) return null;
  return { batchId: batch.id, expectedVersion: batch.version, items: summary.included.map(i => ({ id: i.id, expectedVersion: i.version })) };
}

/** Serializzazione canonica per riconoscere lo stesso payload (la Idempotency-Key resta del container). */
export function canonical(value: unknown): string {
  const sort = (v: unknown): unknown => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v as object).sort().map(k => [k, sort((v as Record<string, unknown>)[k])])) : v;
  return JSON.stringify(sort(value));
}

const sizeFormat = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFormat.format(bytes / 1024)} KiB`;
  return `${sizeFormat.format(bytes / (1024 * 1024))} MiB`;
}
const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
export const formatCents = (cents: number) => euro.format(cents / 100);
