import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type {
  ActivityAction,
  ActivityFilters,
  ActivityResponse,
  CreateActivity,
  SessionResponse,
  UpdateActivity,
} from '../api/types';
import { useAccount, useApi } from '../session/session';

// Attività personali H1: tutte le letture passano dal QueryClient comune (401,
// logout e cambio account le annullano e le rimuovono come il resto). Le letture
// temporali (today/dueState) non restano in cache: si rileggono sempre, anche al focus.
const TEMPORAL = { staleTime: 0, refetchOnWindowFocus: 'always' as const };
const PAGE_SIZE = 20;

export function useActivityCapabilities(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.activityCapabilities(account.id, homeId),
    queryFn: ({ signal }) => api.getActivityCapabilities(homeId, signal, account.id),
    ...TEMPORAL,
  });
}

export function useActivitySummary(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.activitySummary(account.id, homeId),
    queryFn: ({ signal }) => api.getActivitySummary(homeId, signal, account.id),
    ...TEMPORAL,
  });
}

export function useActivities(homeId: string, filters: ActivityFilters) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.activities(account.id, homeId, filters),
    queryFn: ({ pageParam, signal }) =>
      api.listActivities(homeId, filters, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    ...TEMPORAL,
  });
}

export function useActivity(homeId: string, activityId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.activity(account.id, homeId, activityId),
    queryFn: ({ signal }) => api.getActivity(homeId, activityId, signal, account.id),
    ...TEMPORAL,
  });
}

export function useActivityHistory(homeId: string, activityId: string) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.activityHistory(account.id, homeId, activityId),
    queryFn: ({ pageParam, signal }) =>
      api.listActivityHistory(homeId, activityId, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  });
}

function sameAccount(queryClient: QueryClient, accountId: string) {
  return queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id === accountId;
}

export type ActivityMutationVars =
  | { kind: 'create'; body: CreateActivity; idempotencyKey: string }
  | { kind: 'updates'; activityId: string; body: UpdateActivity; idempotencyKey: string }
  | { kind: 'complete' | 'cancel' | 'reopen'; activityId: string; body: ActivityAction; idempotencyKey: string };

/**
 * Mutazioni pessimistiche: nessun aggiornamento locale prima della risposta.
 * Dopo successo o replay: dettaglio dalla risposta, poi rilettura di liste,
 * riepilogo e storia. Nessuna scrittura in cache se nel frattempo è cambiato account.
 */
export function useActivityMutation(homeId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: ActivityMutationVars): Promise<ActivityResponse> =>
      vars.kind === 'create'
        ? api.createActivity(homeId, vars.body, vars.idempotencyKey, account.id)
        : api.activityMutation(homeId, vars.activityId, vars.kind, vars.body, vars.idempotencyKey, account.id),
    onSuccess: async (res) => {
      if (!sameAccount(queryClient, account.id)) return;
      queryClient.setQueryData(queryKeys.activity(account.id, homeId, res.activity.id), res);
      await queryClient.invalidateQueries({ queryKey: queryKeys.h1(account.id, homeId) });
    },
  });
}

/** Rilettura esplicita dopo un 409 o su richiesta dell'utente. */
export function useRefreshActivities(homeId: string) {
  const account = useAccount();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.h1(account.id, homeId) });
}
