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
};

export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
