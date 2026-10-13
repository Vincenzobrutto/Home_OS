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
  documentSearch: (accountId: string, homeId: string, f: { q: string; format: string; visibility: string }) =>
    ['account', accountId, 'home', homeId, 'documents', 'list', 'search', f.q, f.format, f.visibility] as const,
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
};

export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
