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
  | 'cila' | 'scia' | 'building_permit' | 'habitability' | 'agibility' | 'agibility_record'
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
  cila: 'building', scia: 'building', building_permit: 'building', habitability: 'building', agibility: 'building', agibility_record: 'building',
  system_diagram: 'technical', conformity_declaration: 'technical', system_booklet: 'technical',
  condominium_rules: 'condominium', condominium_minutes: 'condominium', millesimal_tables: 'condominium',
  receipt: 'purchases', invoice: 'purchases', warranty: 'purchases', manual: 'purchases',
  utility_bill: 'utilities',
  other: 'unclassified',
};
export const KIND_LABEL: Record<DocumentKind, string> = {
  ape: 'APE', energy_certificate: 'Certificato energetico',
  cila: 'CILA', scia: 'SCIA', building_permit: 'Titolo edilizio', habitability: 'Abitabilità', agibility: 'Agibilità', agibility_record: 'Visura agibilità (non certificato)',
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
  /** Null quando la fonte non è più leggibile (DTO redatto): mai ripopolati dalla cache. */
  filename: string | null;
  byteSize: number | null;
  mimeType: string | null;
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
  /** B2: `organization` del DTO mappata qui dal container (titolo e parti già confermati dall'account). */
  confirmedOrganization?: { title: string; parts: ClassificationPart[] } | null;
  /** B2: versione dell'organizzazione letta (0 o null se assente). Va restituita nel salvataggio. */
  organizationVersion?: number | null;
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
/**
 * Salvataggio di una decisione. `expectedOrganizationVersion` è la versione letta (0 se assente);
 * `replaceOrganization` è true SOLO dopo il consenso esplicito alla sostituzione di dati confermati diversi.
 */
export type ReviewPayload = {
  itemId: OpaqueId;
  expectedVersion: OpaqueVersion;
  expectedOrganizationVersion?: number;
  replaceOrganization?: boolean;
  selection: OrganizationSelection;
};

// ---------------------------------------------------------------------------------------------
// Redazione e stato visibile

/** Originale acquisito ma non più leggibile (fonte revocata o cambiata), anche per una copia identica. */
export const sourceLost = (item: IntakeItem) =>
  item.documentLink.state === 'unavailable' && (item.uploadState === 'stored' || item.uploadState === 'duplicate');

/**
 * Fonte non più leggibile: nessun nome, dimensione, MIME, pagine, titolo, citazione, scelta, organizzazione,
 * nome del duplicato o costo dalla cache. Un elemento ancora in caricamento conserva invece il proprio manifest.
 */
export function visibleItem(item: IntakeItem): IntakeItem {
  if (item.documentLink.state === 'linked') return item;
  const base: IntakeItem = {
    ...item, proposal: null, selection: null, confirmedOrganization: null, organizationVersion: null, existingLinks: null,
    duplicate: item.duplicate ? { itemId: null, document: null } : null,
    documentLink: { state: 'unavailable', document: null },
  };
  return sourceLost(item) ? { ...base, filename: null, byteSize: null, mimeType: null, pageCount: null, error: null } : base;
}

export const displayName = (item: IntakeItem) => visibleItem(item).filename ?? 'Documento non disponibile';

export type ItemStatus =
  | 'pending' | 'uploading' | 'upload_failed' | 'duplicate' | 'stored'
  | 'analysis_waiting' | 'analysis_running' | 'ready' | 'needs_choice' | 'unreadable' | 'unsupported' | 'analysis_failed' | 'uncertain'
  | 'saved' | 'deferred' | 'confirmed' | 'unavailable';

export function itemStatus(raw: IntakeItem): ItemStatus {
  const item = visibleItem(raw);
  if (sourceLost(raw)) return 'unavailable';
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

export type DraftTarget = { kind: 'home' } | { kind: 'object' | 'boiler'; id: OpaqueId };

export type ReviewDraft = {
  title: string;
  /** Parti proposte scelte (indici in proposal.parts). Ignorate se `manualParts` è valorizzato. */
  partIndexes: number[];
  /**
   * Classificazione inserita dall'utente: una o più parti con tipo e intervallo facoltativo.
   * Riaprendo una scelta salvata che non coincide con la proposta corrente, si conservano TUTTE le parti.
   */
  manualParts: ClassificationPart[] | null;
  target: DraftTarget | null;
  /** Consenso alla sostituzione, legato al contenuto e alla versione letta: cambiando uno dei due decade. */
  replaceConsent: string | null;
  /** Solo per una copia identica: usare il riferimento oppure organizzare esplicitamente il documento esistente. */
  duplicateMode: 'reuse' | 'organize' | null;
};

const normalized = (v: string) => v.normalize('NFC').replace(/\s+/gu, ' ').trim();
export const TITLE_MAX = 120;
export const MAX_PARTS = 12;

const samePart = (a: ClassificationPart, b: ClassificationPart) => a.kind === b.kind && a.pageFrom === b.pageFrom && a.pageTo === b.pageTo;
const partKey = (p: ClassificationPart) => `${p.kind}|${p.pageFrom ?? ''}|${p.pageTo ?? ''}`;
/** Stesse parti per tipo e intervallo, indipendentemente dall'ordine (come il confronto semantico di B2). */
export function sameParts(a: ClassificationPart[], b: ClassificationPart[]): boolean {
  const ka = a.map(partKey).sort(), kb = b.map(partKey).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
}

const targetOf = (t: IntakeTarget): DraftTarget => (t.kind === 'home' ? { kind: 'home' } : { kind: t.kind, id: t.id });

export function initialReviewDraft(raw: IntakeItem): ReviewDraft {
  const item = visibleItem(raw);
  const sel = item.selection;
  const proposalParts = item.proposal?.parts ?? [];
  if (sel && sel.action === 'organize') {
    const covered = sel.parts.every(s => proposalParts.some(p => samePart(p, s)));
    return {
      title: sel.title,
      partIndexes: covered ? proposalParts.map((p, i) => [p, i] as const).filter(([p]) => sel.parts.some(s => samePart(p, s))).map(([, i]) => i) : [],
      // Parti non riconducibili alla proposta corrente: si conservano tutte, con i loro intervalli.
      manualParts: covered ? null : sel.parts.map(p => ({ ...p })),
      target: targetOf(sel.target),
      replaceConsent: null,
      duplicateMode: item.uploadState === 'duplicate' ? 'organize' : null,
    };
  }
  if (item.uploadState === 'duplicate') {
    const org = item.confirmedOrganization;
    return { title: org?.title ?? item.proposal?.title ?? '', partIndexes: org ? [] : proposalParts.map((_, index) => index), manualParts: org ? org.parts.map(p => ({ ...p })) : item.proposal ? null : [], target: null, replaceConsent: null, duplicateMode: null };
  }
  return {
    title: item.proposal?.title ?? '',
    // Proposte già selezionate per ridurre la compilazione; l'utente può correggerle
    // e deve comunque salvare e confermare. Le scelte esistenti sopra prevalgono.
    partIndexes: proposalParts.map((_, index) => index),
    manualParts: item.proposal ? null : [],
    // Caso ambiguo: nessuna associazione preselezionata.
    target: item.analysisState === 'needs_choice' ? null : item.proposal ? { kind: 'home' } : null,
    replaceConsent: null,
    duplicateMode: null,
  };
}

/** Parti risultanti dalla bozza, nell'ordine scelto. */
export function draftParts(draft: ReviewDraft, raw: IntakeItem): ClassificationPart[] {
  const item = visibleItem(raw);
  if (draft.manualParts) return draft.manualParts;
  return draft.partIndexes.slice().sort((a, b) => a - b).flatMap(i => (item.proposal?.parts[i] ? [item.proposal.parts[i]] : []));
}

/** Differenza rispetto ai dati già confermati: titolo o parti (per tipo/intervallo). */
export function replacesConfirmed(draft: ReviewDraft, raw: IntakeItem): boolean {
  const org = visibleItem(raw).confirmedOrganization;
  if (!org) return false;
  return normalized(draft.title) !== normalized(org.title) || !sameParts(draftParts(draft, raw), org.parts);
}

/** Firma del consenso: contenuto scelto + versione dell'organizzazione letta. */
export function consentSignature(draft: ReviewDraft, raw: IntakeItem): string {
  const item = visibleItem(raw);
  return JSON.stringify([normalized(draft.title), draftParts(draft, item).map(partKey).sort(), item.organizationVersion ?? 0]);
}
export const hasReplaceConsent = (draft: ReviewDraft, raw: IntakeItem) => draft.replaceConsent !== null && draft.replaceConsent === consentSignature(draft, raw);

export type ReviewErrors = Partial<Record<'title' | 'parts' | 'target' | 'replace' | 'duplicate', string>>;

export function validateReviewDraft(draft: ReviewDraft, raw: IntakeItem): ReviewErrors {
  const item = visibleItem(raw);
  const errors: ReviewErrors = {};
  if (item.uploadState === 'duplicate' && draft.duplicateMode !== 'organize') {
    if (draft.duplicateMode === null) errors.duplicate = 'Scegli se usare solo il riferimento all’originale esistente oppure organizzarlo.';
    return errors;
  }
  const n = [...normalized(draft.title)].length;
  if (n === 0) errors.title = 'Inserisci un nome da mostrare.';
  else if (n > TITLE_MAX) errors.title = `Massimo ${TITLE_MAX} caratteri.`;
  if (draft.manualParts) {
    const parts = draft.manualParts;
    if (parts.length === 0) errors.parts = 'Aggiungi almeno un contenuto con il suo tipo, oppure rimanda la decisione.';
    else if (parts.length > MAX_PARTS) errors.parts = `Al massimo ${MAX_PARTS} contenuti per documento.`;
    else if (parts.some(p => !KINDS.includes(p.kind))) errors.parts = 'Scegli il tipo di ogni contenuto.';
    else if (parts.some(p => (p.pageFrom === null) !== (p.pageTo === null))) errors.parts = 'Indica entrambe le pagine dell’intervallo, oppure nessuna per l’intero documento.';
    else if (parts.some(p => p.pageFrom !== null && p.pageTo !== null && (!Number.isInteger(p.pageFrom) || !Number.isInteger(p.pageTo) || p.pageFrom < 1 || p.pageTo < p.pageFrom || (item.pageCount !== null && p.pageTo > item.pageCount)))) {
      errors.parts = item.pageCount ? `Le pagine vanno da 1 a ${item.pageCount}, con la prima non oltre l’ultima.` : 'Pagine non valide: la prima deve essere almeno 1 e non oltre l’ultima.';
    } else if (new Set(parts.map(partKey)).size !== parts.length) errors.parts = 'Lo stesso contenuto è indicato due volte.';
  } else if ((item.proposal?.parts.length ?? 0) === 0 || draft.partIndexes.length === 0) {
    errors.parts = item.proposal ? 'Seleziona almeno un contenuto dopo aver consultato l’originale.' : 'Aggiungi almeno un contenuto con il suo tipo, oppure rimanda la decisione.';
  }
  if (!draft.target) errors.target = 'Scegli una scheda esistente oppure conserva il documento solo a livello casa.';
  if (!errors.title && !errors.parts && replacesConfirmed(draft, item) && !hasReplaceConsent(draft, item)) {
    errors.replace = 'La scelta cambia un’organizzazione già confermata: conferma la sostituzione oppure mantieni quella attuale.';
  }
  return errors;
}

export function buildSelection(draft: ReviewDraft, raw: IntakeItem, candidates: TargetCandidate[]): OrganizationSelection | null {
  const item = visibleItem(raw);
  if (Object.keys(validateReviewDraft(draft, item)).length) return null;
  let target: IntakeTarget;
  if (!draft.target || draft.target.kind === 'home') target = { kind: 'home' };
  else {
    const t = draft.target;
    const c = candidates.find(x => x.id === t.id && x.kind === t.kind);
    if (!c) return null;
    target = { kind: c.kind, id: c.id, expectedVersion: c.version };
  }
  return { action: 'organize', title: normalized(draft.title), parts: draftParts(draft, item).map(p => ({ ...p })), target };
}

/** Payload di salvataggio con la versione letta; sostituzione solo con consenso esplicito e attuale. */
export function buildReviewPayload(draft: ReviewDraft, raw: IntakeItem, candidates: TargetCandidate[]): ReviewPayload | null {
  const item = visibleItem(raw);
  const selection = buildSelection(draft, item, candidates);
  if (!selection) return null;
  return {
    itemId: item.id, expectedVersion: item.version, expectedOrganizationVersion: item.organizationVersion ?? 0,
    replaceOrganization: replacesConfirmed(draft, item) && hasReplaceConsent(draft, item),
    selection,
  };
}

export const deferPayload = (raw: IntakeItem): ReviewPayload => {
  const item = visibleItem(raw);
  return { itemId: item.id, expectedVersion: item.version, expectedOrganizationVersion: item.organizationVersion ?? 0, replaceOrganization: false, selection: { action: 'defer' } };
};

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
