// Chiavi della cache server. Tutto ciò che è privato sta sotto ['account', accountId, ...];
// i dati di una casa sotto ['account', accountId, 'home', homeId, resource].
export const queryKeys = {
  session: ['session'] as const,
  homes: (accountId: string) => ['account', accountId, 'homes'] as const,
  home: (accountId: string, homeId: string) =>
    ['account', accountId, 'home', homeId, 'detail'] as const,
  documents: (accountId: string, homeId: string) =>
    ['account', accountId, 'home', homeId, 'documents', 'list'] as const,
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
};

export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
