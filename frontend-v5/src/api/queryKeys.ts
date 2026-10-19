// Chiavi della cache server. Tutto ciò che è privato sta sotto ['account', accountId, ...];
// i dati di una casa sotto ['account', accountId, 'home', homeId, resource].
export const queryKeys = {
  session: ['session'] as const,
  homes: (accountId: string) => ['account', accountId, 'homes'] as const,
  home: (accountId: string, homeId: string) =>
    ['account', accountId, 'home', homeId, 'detail'] as const,
  documents: (accountId: string, homeId: string) =>
    ['account', accountId, 'home', homeId, 'documents', 'list'] as const,
  // document-search-v1 (H2): varianti filtrate sotto la lista, così l'upload le invalida tutte.
  documentSearch: (accountId: string, homeId: string, f: { q: string; format: string; visibility: string; collection?: string; workflow?: string }) =>
    ['account', accountId, 'home', homeId, 'documents', 'list', 'search', f.q, f.format, f.visibility, f.collection ?? 'all',...(f.workflow && f.workflow!=='all'?[f.workflow]:[])] as const,
  documentSearchCapabilities: (accountId: string, homeId: string) =>
    ['account', accountId, 'home', homeId, 'documents', 'search-capabilities'] as const,
  documentsAll: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'documents'] as const,
  document: (accountId: string, homeId: string, documentId: string) =>
    ['account', accountId, 'home', homeId, 'documents', documentId, 'detail'] as const,
  documentFile: (accountId: string, homeId: string, documentId: string) =>
    ['account', accountId, 'home', homeId, 'documents', documentId, 'file'] as const,
  // review-v1 (M3): tutto personale all'account creatore, sotto la sua casa.
  homeM3: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'm3'] as const,
  capabilities: (accountId: string, homeId: string) =>
    ['account', accountId, 'home', homeId, 'm3', 'capabilities'] as const,
  jobs: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'm3', 'jobs', 'list'] as const,
  job: (accountId: string, homeId: string, jobId: string) =>
    ['account', accountId, 'home', homeId, 'm3', 'jobs', jobId] as const,
  assets: (accountId: string, homeId: string) =>
    ['account', accountId, 'home', homeId, 'm3', 'assets', 'list'] as const,
  asset: (accountId: string, homeId: string, assetId: string) =>
    ['account', accountId, 'home', homeId, 'm3', 'assets', assetId, 'detail'] as const,
  history: (accountId: string, homeId: string, assetId: string) =>
    ['account', accountId, 'home', homeId, 'm3', 'assets', assetId, 'history'] as const,
  review: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'm3', 'review'] as const,
  // activities-v1 (H1): attività personali, separate dalle risorse M3/M4.
  h1: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'h1'] as const,
  activityCapabilities: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'h1', 'capabilities'] as const,
  activities: (accountId: string, homeId: string, filters: { state: string; due: string; assetId?: string }) =>
    ['account', accountId, 'home', homeId, 'h1', 'list', filters.state, filters.due, filters.assetId ?? '-'] as const,
  activity: (accountId: string, homeId: string, activityId: string) =>
    ['account', accountId, 'home', homeId, 'h1', 'activity', activityId, 'detail'] as const,
  activityHistory: (accountId: string, homeId: string, activityId: string) =>
    ['account', accountId, 'home', homeId, 'h1', 'activity', activityId, 'history'] as const,
  activitySummary: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'h1', 'summary'] as const,
  // home-objects-v1 (G1): ambienti condivisi e oggetti personali, sotto la casa.
  g1: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'g1'] as const,
  objectCapabilities: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'g1', 'capabilities'] as const,
  rooms: (accountId: string, homeId: string, state: string) => ['account', accountId, 'home', homeId, 'g1', 'rooms', 'list', state] as const,
  room: (accountId: string, homeId: string, roomId: string) => ['account', accountId, 'home', homeId, 'g1', 'room', roomId, 'detail'] as const,
  roomHistory: (accountId: string, homeId: string, roomId: string) => ['account', accountId, 'home', homeId, 'g1', 'room', roomId, 'history'] as const,
  objects: (accountId: string, homeId: string, f: { state: string; q: string; type: string | null; roomId: string | null; placement: string;sort?:string }) =>
    ['account', accountId, 'home', homeId, 'g1', 'objects', 'list', f.state, f.q, f.type ?? '-', f.roomId ?? '-', f.placement,f.sort??'recent'] as const,
  object: (accountId: string, homeId: string, kind: string, id: string) => ['account', accountId, 'home', homeId, 'g1', 'object', kind, id, 'detail'] as const,
  objectHistory: (accountId: string, homeId: string, kind: string, id: string) =>
    ['account', accountId, 'home', homeId, 'g1', 'object', kind, id, 'history'] as const,
  objectLinks: (accountId: string, homeId: string, kind: string, id: string, resourceType: string) =>
    ['account', accountId, 'home', homeId, 'g1', 'object', kind, id, 'links', resourceType] as const,
  // expenses-v1 (H3a): spese personali, separate da H1 e M3/M4.
  h3: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'h3'] as const,
  expenseCapabilities: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'h3', 'capabilities'] as const,
  expenses: (accountId: string, homeId: string, f: { state: string; year: string | null; source: string; assetId?: string; documentId?: string }) =>
    ['account', accountId, 'home', homeId, 'h3', 'list', f.state, f.year ?? '-', f.source, f.assetId ?? '-', f.documentId ?? '-'] as const,
  expense: (accountId: string, homeId: string, expenseId: string) =>
    ['account', accountId, 'home', homeId, 'h3', 'expense', expenseId, 'detail'] as const,
  expenseHistory: (accountId: string, homeId: string, expenseId: string) =>
    ['account', accountId, 'home', homeId, 'h3', 'expense', expenseId, 'history'] as const,
  expenseSummary: (accountId: string, homeId: string, year: string | null) =>
    ['account', accountId, 'home', homeId, 'h3', 'summary', year ?? '-'] as const,
  // economy-v1 (S1a/b): stesso HomeExpense canonico di H3a, proiezioni separate.
  // filters = chiave normalizzata dei filtri (in memoria, mai nell'URL).
  economy: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'economy'] as const,
  economyCapabilities: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'economy', 'capabilities'] as const,
  economySummary: (accountId: string, homeId: string, filters: string) =>
    ['account', accountId, 'home', homeId, 'economy', 'summary', filters] as const,
  economyExpenses: (accountId: string, homeId: string, filters: string, limit: number) =>
    ['account', accountId, 'home', homeId, 'economy', 'expenses', 'list', filters, limit] as const,
  economyExpense: (accountId: string, homeId: string, expenseId: string) =>
    ['account', accountId, 'home', homeId, 'economy', 'expenses', expenseId, 'detail'] as const,
  economyExpenseHistory: (accountId: string, homeId: string, expenseId: string) =>
    ['account', accountId, 'home', homeId, 'economy', 'expenses', expenseId, 'history'] as const,
  works: (accountId: string, homeId: string, state: string, q: string) =>
    ['account', accountId, 'home', homeId, 'economy', 'works', 'list', state, q] as const,
  work: (accountId: string, homeId: string, workId: string) => ['account', accountId, 'home', homeId, 'economy', 'works', workId, 'detail'] as const,
  workHistory: (accountId: string, homeId: string, workId: string) =>
    ['account', accountId, 'home', homeId, 'economy', 'works', workId, 'history'] as const,
  // S1c: job di analisi, bozze e candidati, sotto lo stesso prefisso economy (privacy e invalidazioni comuni).
  economicJob: (accountId: string, homeId: string, jobId: string) => ['account', accountId, 'home', homeId, 'economy', 'jobs', jobId] as const,
  drafts: (accountId: string, homeId: string, state: string) => ['account', accountId, 'home', homeId, 'economy', 'drafts', 'list', state] as const,
  draft: (accountId: string, homeId: string, draftId: string) => ['account', accountId, 'home', homeId, 'economy', 'drafts', draftId, 'detail'] as const,
  draftCandidates: (accountId: string, homeId: string, draftId: string) =>
    ['account', accountId, 'home', homeId, 'economy', 'drafts', draftId, 'candidates'] as const,
};

export function newIdempotencyKey(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  // HTTP on a private Wi-Fi IP is not a secure context: use the same cryptographic
  // source for UUID v4 instead of Math.random or a missing randomUUID API.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
