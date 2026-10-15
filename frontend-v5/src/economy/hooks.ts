import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { newIdempotencyKey, queryKeys } from '../api/queryKeys';
import type { CreateExpense, EconomyExpense, EconomyWork, UpdateExpense } from '../api/economyTypes';
import type { SessionResponse } from '../api/types';
import { economyQuery, filtersKey, isAmbiguousError, type EconomyFilters } from '../lib/economy';
import { useAccount, useApi } from '../session/session';

// economy-v1: tutte le letture passano dal QueryClient comune, sotto ['account', id, 'home', id, 'economy'].
// Logout, cambio account e 403 rimuovono questi dati come per H3a/G1.
const PAGE_SIZE = 20;
const TEMPORAL = { staleTime: 0, refetchOnWindowFocus: 'always' as const };

export function useEconomyCapabilities(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.economyCapabilities(account.id, homeId),
    queryFn: ({ signal }) => api.getEconomyCapabilities(homeId, signal, account.id),
    retry: false,
    staleTime: 0,
    // Rilettura al focus solo con dati: una 404 (S1 assente) non deve smontare la pagina H3a in uso.
    refetchOnWindowFocus: (q) => (q.state.data !== undefined ? 'always' : false),
  });
}

/** Riepilogo server dell'intero insieme filtrato: totale, famiglie, categorie e confronto. */
export function useEconomySummary(homeId: string, filters: EconomyFilters, enabled = true) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.economySummary(account.id, homeId, filtersKey({ ...filters, state: 'active' })),
    queryFn: ({ signal }) => api.getEconomySummary(homeId, economyQuery(filters, { list: false }), signal, account.id),
    enabled,
    ...TEMPORAL,
  });
}

/** Elenco keyset: le pagine successive si chiedono esplicitamente, nessuno scaricamento totale. */
export function useEconomyExpenses(homeId: string, filters: EconomyFilters, opts: { limit?: number; enabled?: boolean } = {}) {
  const api = useApi();
  const account = useAccount();
  const limit = opts.limit ?? PAGE_SIZE;
  return useInfiniteQuery({
    queryKey: queryKeys.economyExpenses(account.id, homeId, filtersKey(filters), limit),
    queryFn: ({ pageParam, signal }) =>
      api.listEconomyExpenses(homeId, economyQuery(filters, { list: true }), { cursor: pageParam, limit }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: opts.enabled ?? true,
    staleTime: 0,
  });
}

export function useEconomyExpense(homeId: string, expenseId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.economyExpense(account.id, homeId, expenseId),
    queryFn: ({ signal }) => api.getEconomyExpense(homeId, expenseId, signal, account.id),
    staleTime: 0,
  });
}

export function useEconomyExpenseHistory(homeId: string, expenseId: string) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.economyExpenseHistory(account.id, homeId, expenseId),
    queryFn: ({ pageParam, signal }) => api.listEconomyExpenseHistory(homeId, expenseId, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  });
}

export function useWorks(homeId: string, filters: { state: 'active' | 'archived' | 'all'; q: string }, enabled = true) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.works(account.id, homeId, filters.state, filters.q.normalize('NFC').trim()),
    queryFn: ({ pageParam, signal }) => api.listWorks(homeId, filters, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
    staleTime: 0,
  });
}

export function useWork(homeId: string, workId: string | null) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.work(account.id, homeId, workId ?? '-'),
    queryFn: ({ signal }) => api.getWork(homeId, workId!, signal, account.id),
    enabled: !!workId,
    staleTime: 0,
  });
}

export function useWorkHistory(homeId: string, workId: string) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.workHistory(account.id, homeId, workId),
    queryFn: ({ pageParam, signal }) => api.listWorkHistory(homeId, workId, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  });
}

/**
 * Le capabilities non dipendono dai dati: rileggerle dopo una mutazione farebbe tornare
 * «in attesa» una query in errore (per esempio 404 senza S1) e smonterebbe la pagina.
 */
export const notCapabilities = (q: { queryKey: readonly unknown[] }) => q.queryKey[5] !== 'capabilities';

function sameAccount(queryClient: QueryClient, accountId: string) {
  return queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id === accountId;
}

export type EconomyVars =
  | { kind: 'create'; body: CreateExpense }
  | { kind: 'updates'; expenseId: string; body: UpdateExpense }
  | { kind: 'archive' | 'restore'; expenseId: string; body: { expectedVersion: number; note?: string } }
  | { kind: 'workCreate'; body: { name: string; note?: string | null } }
  | { kind: 'workUpdates' | 'workArchive' | 'workRestore'; workId: string; body: { expectedVersion: number; name?: string; note?: string | null } };

export type EconomyResult = { expense: EconomyExpense } | { work: EconomyWork };

/**
 * Mutazioni pessimistiche: nessun aggiornamento locale prima della risposta. Dopo il
 * successo, rilettura di economy, H3a (stesso costo canonico) e G1 (collegamenti oggetto).
 * Nessuna scrittura in cache se nel frattempo è cambiato account.
 */
export function useEconomyMutation(homeId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: EconomyVars & { idempotencyKey: string }): Promise<EconomyResult> => {
      const k = vars.idempotencyKey;
      switch (vars.kind) {
        case 'create':
          return { expense: await api.createEconomyExpense(homeId, vars.body, k, account.id) };
        case 'updates':
        case 'archive':
        case 'restore':
          return { expense: await api.economyExpenseMutation(homeId, vars.expenseId, vars.kind, vars.body, k, account.id) };
        case 'workCreate':
          return { work: await api.createWork(homeId, vars.body, k, account.id) };
        default: {
          const kind = vars.kind === 'workUpdates' ? 'updates' : vars.kind === 'workArchive' ? 'archive' : 'restore';
          return { work: await api.workMutation(homeId, vars.workId, kind, vars.body, k, account.id) };
        }
      }
    },
    onSuccess: async (res) => {
      if (!sameAccount(queryClient, account.id)) return;
      if ('expense' in res) queryClient.setQueryData(queryKeys.economyExpense(account.id, homeId, res.expense.id), res.expense);
      if ('work' in res) queryClient.setQueryData(queryKeys.work(account.id, homeId, res.work.id), res.work);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.economy(account.id, homeId), predicate: notCapabilities }),
        queryClient.invalidateQueries({ queryKey: queryKeys.h3(account.id, homeId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.g1(account.id, homeId) }),
      ]);
    },
  });
}

/**
 * Operazione idempotente: stessa chiave e stesso body finché l'esito è ignoto
 * (riprova esplicita), nuova chiave dopo un esito definito. Nessun retry automatico.
 */
export function useEconomyOperation(homeId: string) {
  const mutation = useEconomyMutation(homeId);
  const [key, setKey] = useState(newIdempotencyKey);
  const [pending, setPending] = useState<EconomyVars | null>(null);
  const locked = mutation.isError && isAmbiguousError(mutation.error);

  const run = (vars: EconomyVars, onSuccess?: (res: EconomyResult) => void) => {
    if (mutation.isPending) return;
    setPending(vars);
    mutation.mutate({ ...vars, idempotencyKey: key }, {
      onSuccess: (res) => {
        setKey(newIdempotencyKey());
        setPending(null);
        onSuccess?.(res);
      },
      onError: (err) => {
        if (!isAmbiguousError(err)) setKey(newIdempotencyKey());
      },
    });
  };
  const retry = (onSuccess?: (res: EconomyResult) => void) => {
    if (pending) run(pending, onSuccess);
  };
  const reset = () => {
    mutation.reset();
    setPending(null);
    setKey(newIdempotencyKey());
  };
  return { mutation, run, retry, reset, locked };
}

export function useRefreshEconomy(homeId: string) {
  const account = useAccount();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.economy(account.id, homeId) });
}

/**
 * Dopo un 403 su una lettura: nessun dato economico resta in cache per questa casa e la
 * casa viene riletta, così il guard mostra l'accesso negato.
 */
export function useForgetEconomy(homeId: string) {
  const account = useAccount();
  const queryClient = useQueryClient();
  return () => {
    queryClient.removeQueries({ queryKey: queryKeys.economy(account.id, homeId), predicate: (q) => q.getObserversCount() === 0 });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home(account.id, homeId) });
  };
}
