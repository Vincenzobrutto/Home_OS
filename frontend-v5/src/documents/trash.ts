// Cestino della casa (lotto 2): contratto in docs/v5/documents-api-contract.md, «Cestino dei documenti».
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../session/session';

export type TrashEntry = { kind: 'document'; id: string; name: string; trashedAt: string; purgeAfter: string; version: number };
export type TrashImpact = { expenses: number; objects: number; contacts: number; historyEvents: number; activeShares: number };
export type TrashPreview = { allowed: boolean; reason: string | null; document: { id: string; version: number }; impact: TrashImpact };
export type TrashMove = { entry: TrashEntry; revokedShares: number };

const DAY_MS = 86_400_000;
export const trashKey = (accountId: string, homeId: string) => ['account', accountId, 'home', homeId, 'trash'] as const;
const base = (homeId: string) => '/homes/' + encodeURIComponent(homeId);
export const trashPaths = {
  preview: (homeId: string, documentId: string) => base(homeId) + '/documents/' + encodeURIComponent(documentId) + '/trash',
  list: (homeId: string) => base(homeId) + '/trash',
  restore: (homeId: string, documentId: string) => base(homeId) + '/trash/documents/' + encodeURIComponent(documentId) + '/restore',
  purge: (homeId: string, documentId: string) => base(homeId) + '/trash/documents/' + encodeURIComponent(documentId) + '/purge',
  empty: (homeId: string) => base(homeId) + '/trash/empty',
};

/** Only the caller's own trash: the server never returns another member's entries. */
export function useTrash(accountId: string, homeId: string) {
  const api = useApi();
  return useQuery({
    queryKey: trashKey(accountId, homeId),
    queryFn: ({ signal }) => api.callJson<{ items: TrashEntry[] }>(trashPaths.list(homeId), { accountId, signal }),
    staleTime: 60_000,
    retry: false,
  });
}

/** Whole days left before the definitive deletion, never negative. */
export function daysLeft(purgeAfter: string, now = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(purgeAfter) - now) / DAY_MS));
}
export function purgeLabel(purgeAfter: string, now = Date.now()) {
  const days = daysLeft(purgeAfter, now);
  return days === 0 ? 'Eliminazione definitiva in corso' : days === 1 ? 'Eliminazione definitiva tra 1 giorno' : `Eliminazione definitiva tra ${days} giorni`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** Sentences for the preview; confirmed data stays with its source shown as deleted. */
export function impactLines(impact: TrashImpact) {
  const sources = [
    impact.expenses && plural(impact.expenses, 'spesa', 'spese'),
    impact.objects && plural(impact.objects, 'oggetto', 'oggetti'),
    impact.contacts && plural(impact.contacts, 'contatto', 'contatti'),
    impact.historyEvents && plural(impact.historyEvents, 'evento della storia', 'eventi della storia'),
  ].filter((x): x is string => !!x);
  return {
    sources: sources.length ? `È fonte di ${sources.join(', ')}. Restano salvati, con la fonte indicata come eliminata.` : null,
    shares: impact.activeShares ? `${plural(impact.activeShares, 'condivisione attiva verrà revocata', 'condivisioni attive verranno revocate')} subito. Le copie già scaricate non si possono richiamare.` : null,
  };
}
