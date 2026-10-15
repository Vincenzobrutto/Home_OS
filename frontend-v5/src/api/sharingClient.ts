// sharing-v1 (C1a): chiamate e validazioni delle risposte, fuori dall'entry. Usa il trasporto comune di
// ApiClient (sessione, CSRF, X-Account-Context, errori, controlli binari). Il codice iniziale di
// abbinamento arriva solo nella risposta di create/rotate: qui non viene conservato da nessuna parte.
import type { ApiClient } from './client';
import { serviceError } from './errors';
import type { BinaryPayload } from './types';
import type { CreatePreview, CreateShare, Share, ShareItem, SharePerson, SharePreview, ShareState, SharingCapabilities, SharingDocument } from './sharingTypes';

type PageParams = { cursor?: string | null; limit?: number };
const home = (homeId: string) => `/homes/${encodeURIComponent(homeId)}`;

// Query key a livello account (logout e cambio account le rimuovono con il resto della cache privata).
// Mai anteprime, consensi o codici di abbinamento in cache.
export const sharingKeys = {
  sharing: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'sharing'] as const,
  capabilities: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'sharing', 'capabilities'] as const,
  recipients: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'sharing', 'recipients'] as const,
  documents: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'sharing', 'documents'] as const,
  shares: (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'sharing', 'shares', 'list'] as const,
  share: (accountId: string, homeId: string, shareId: string) => ['account', accountId, 'home', homeId, 'sharing', 'shares', shareId] as const,
  received: (accountId: string) => ['account', accountId, 'received-shares'] as const,
  receivedList: (accountId: string) => ['account', accountId, 'received-shares', 'list'] as const,
  receivedShare: (accountId: string, shareId: string) => ['account', accountId, 'received-shares', shareId] as const,
};

export function sharingApi(api: ApiClient) {
  const shareOf = (data: { share: Share } | undefined, status: number) => {
    if (!data || !isShare(data.share)) throw serviceError(status);
    return data.share;
  };
  const post = (path: string, body: unknown, idempotencyKey: string, accountId: string) =>
    api.callJson<{ share: Share }>(path, { method: 'POST', body, idempotencyKey, accountId });
  return {
    async capabilities(homeId: string, signal: AbortSignal | undefined, accountId: string) {
      const data = await api.callJson<SharingCapabilities>(`${home(homeId)}/sharing-capabilities`, { signal, accountId });
      if (
        !data || data.apiVersion !== 'sharing-v1' || typeof data.enabled !== 'boolean' || typeof data.isSimulation !== 'boolean' ||
        typeof data.externalPairing !== 'boolean' || !data.limits || !Array.isArray(data.limits.durationDays) ||
        typeof data.limits.maxDocuments !== 'number' || typeof data.limits.maxBytes !== 'number' || !Array.isArray(data.permissions)
      ) {
        throw serviceError(200);
      }
      return data;
    },
    async recipients(homeId: string, signal: AbortSignal | undefined, accountId: string) {
      const data = await api.callJson<{ items: SharePerson[] }>(`${home(homeId)}/sharing-recipients`, { signal, accountId });
      if (!data || !Array.isArray(data.items) || !data.items.every(isSharePerson)) throw serviceError(200);
      return data.items;
    },
    async documents(homeId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
      const p = await api.callPage<SharingDocument>(`${home(homeId)}/sharing-documents`, page, signal, accountId);
      if (!p.items.every((d) => isShareItem(d) && typeof d.eligible === 'boolean' && (d.visibility === 'private' || d.visibility === 'home'))) throw serviceError(200);
      return p;
    },
    async createPreview(homeId: string, input: CreatePreview, idempotencyKey: string, accountId: string) {
      const data = await api.callJson<{ preview: SharePreview }>(`${home(homeId)}/share-previews`, { method: 'POST', body: input, idempotencyKey, accountId });
      const p = data?.preview;
      if (!p || typeof p.id !== 'string' || p.version !== 1 || typeof p.manifestFingerprint !== 'string' || typeof p.expiresAt !== 'string' || typeof p.validUntil !== 'string' || !Array.isArray(p.items) || !p.items.every(isShareItem)) {
        throw serviceError(201);
      }
      return p;
    },
    async create(homeId: string, input: CreateShare, idempotencyKey: string, accountId: string) {
      return shareOf(await post(`${home(homeId)}/shares`, input, idempotencyKey, accountId), 201);
    },
    async list(homeId: string, page: PageParams, signal: AbortSignal | undefined, accountId: string) {
      const p = await api.callPage<Share>(`${home(homeId)}/shares`, page, signal, accountId);
      if (!p.items.every(isShare)) throw serviceError(200);
      return p;
    },
    async get(homeId: string, shareId: string, signal: AbortSignal | undefined, accountId: string) {
      return shareOf(await api.callJson<{ share: Share }>(`${home(homeId)}/shares/${encodeURIComponent(shareId)}`, { signal, accountId }), 200);
    },
    async action(
      homeId: string,
      shareId: string,
      action: 'revoke' | 'rotate-code' | 'confirm-pairing',
      body: { expectedVersion: number; claimId?: string; comparisonCode?: string; confirmRecipient?: true },
      idempotencyKey: string,
      accountId: string,
    ) {
      return shareOf(await post(`${home(homeId)}/shares/${encodeURIComponent(shareId)}/${action}`, body, idempotencyKey, accountId), 200);
    },
    /** Il codice va solo nel body, mai nell'URL. */
    async claim(code: string, idempotencyKey: string, accountId: string) {
      return shareOf(await post('/sharing/code-claims', { code, discloseAccount: true }, idempotencyKey, accountId), 201);
    },
    async receivedList(page: PageParams, signal: AbortSignal | undefined, accountId: string) {
      const p = await api.callPage<Share>('/received-shares', page, signal, accountId);
      if (!p.items.every(isShare)) throw serviceError(200);
      return p;
    },
    async received(shareId: string, signal: AbortSignal | undefined, accountId: string) {
      return shareOf(await api.callJson<{ share: Share }>(`/received-shares/${encodeURIComponent(shareId)}`, { signal, accountId }), 200);
    },
    async receivedAction(shareId: string, action: 'accept' | 'decline', body: { expectedVersion: number }, idempotencyKey: string, accountId: string) {
      return shareOf(await post(`/received-shares/${encodeURIComponent(shareId)}/${action}`, body, idempotencyKey, accountId), 200);
    },
    /** Originale di una consegna accettata: stessi controlli binari del download M2. */
    file(shareId: string, documentId: string, signal: AbortSignal | undefined, accountId: string): Promise<BinaryPayload> {
      return api.callBinary(`/received-shares/${encodeURIComponent(shareId)}/documents/${encodeURIComponent(documentId)}/file`, signal, accountId);
    },
  };
}

// ---- forma minima delle risposte (fuori contratto = errore di servizio, mai dati vuoti) ----
const SHARE_STATES: ShareState[] = ['awaiting_pairing', 'awaiting_confirmation', 'pending', 'accepted', 'declined', 'revoked', 'expired', 'unavailable'];

function isSharePerson(p: unknown): p is SharePerson {
  const x = p as SharePerson | null;
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.email === 'string' && x.identityVerified === false;
}

function isShareItem(i: unknown): i is ShareItem {
  const x = i as ShareItem | null;
  return !!x && typeof x.documentId === 'string' && typeof x.documentVersion === 'number' && typeof x.name === 'string' && typeof x.byteSize === 'number' && typeof x.mimeType === 'string';
}

function isShare(v: unknown): v is Share {
  const s = v as Share | null;
  if (!s || typeof s.id !== 'string' || typeof s.version !== 'number' || !SHARE_STATES.includes(s.state)) return false;
  if (!Array.isArray(s.items) || !s.items.every(isShareItem) || !Array.isArray(s.permissions)) return false;
  if (s.recipient !== null && !isSharePerson(s.recipient)) return false;
  if (s.pairing !== null && (typeof s.pairing !== 'object' || (s.pairing.claim !== null && (!s.pairing.claim || !isSharePerson(s.pairing.claim.account) || typeof s.pairing.claim.comparisonCode !== 'string')))) return false;
  if (s.comparison !== null && (typeof s.comparison !== 'object' || typeof s.comparison.code !== 'string')) return false;
  // In unavailable nessun file, mittente, destinatario o scadenza (contratto: niente dati residui).
  if (s.state === 'unavailable' && (s.items.length || s.senderName !== null || s.recipient !== null || s.expiresAt !== null)) return false;
  return true;
}
