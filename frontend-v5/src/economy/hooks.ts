import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { newIdempotencyKey, queryKeys } from '../api/queryKeys';
import type { ConfirmDraft, CreateExpense, EconomicAnalysisJob, EconomicDraft, EconomyExpense, EconomyWork, Provider, UpdateExpense } from '../api/economyTypes';
import type { SessionResponse } from '../api/types';
import { economyQuery, filtersKey, isAmbiguousError, isForbiddenError, type EconomyFilters } from '../lib/economy';
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

// ---- S1c ----

const TERMINAL = ['succeeded', 'failed'];

/**
 * Job di analisi: polling ogni 1,5 s finché non è terminale. Si ferma da solo su stato
 * finale, smontaggio, logout/cambio account (query rimossa) e 403. Un errore di lettura
 * non è un fallimento dell'analisi: la lettura continua e l'utente può aggiornare.
 */
export function useEconomicJob(homeId: string, jobId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.economicJob(account.id, homeId, jobId),
    queryFn: ({ signal }) => api.getEconomicJob(homeId, jobId, signal, account.id),
    retry: false,
    staleTime: 0,
    refetchInterval: (q) => {
      if (q.state.data && TERMINAL.includes(q.state.data.state)) return false;
      if (q.state.error && isForbiddenError(q.state.error)) return false;
      return q.state.error ? 4000 : 1500;
    },
    refetchIntervalInBackground: false,
  });
}

export function useEconomicDrafts(homeId: string, state: 'open' | 'parked' | 'confirmed' | 'all', enabled = true) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.drafts(account.id, homeId, state),
    queryFn: ({ pageParam, signal }) => api.listEconomicDrafts(homeId, state, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
    staleTime: 0,
  });
}

export function useEconomicDraft(homeId: string, draftId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.draft(account.id, homeId, draftId),
    queryFn: ({ signal }) => api.getEconomicDraft(homeId, draftId, signal, account.id),
    retry: false,
    staleTime: 0,
  });
}

export function useDraftCandidates(homeId: string, draftId: string, enabled: boolean) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.draftCandidates(account.id, homeId, draftId),
    queryFn: ({ pageParam, signal }) => api.listDraftCandidates(homeId, draftId, { cursor: pageParam, limit: 10 }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
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
  | { kind: 'workUpdates' | 'workArchive' | 'workRestore'; workId: string; body: { expectedVersion: number; name?: string; note?: string | null } }
  | { kind: 'analysisStart'; body: { documentId: string; provider: Provider } }
  | { kind: 'analysisRetry'; jobId: string; body: { expectedVersion: number } }
  | { kind: 'draftPark' | 'draftReopen'; draftId: string; body: { expectedVersion: number } }
  | { kind: 'draftConfirm'; draftId: string; body: ConfirmDraft };

export type EconomyResult =
  | { expense: EconomyExpense }
  | { work: EconomyWork }
  | { job: EconomicAnalysisJob }
  | { draft: EconomicDraft }
  | { draft: EconomicDraft; expense: EconomyExpense };

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
        case 'analysisStart':
          return { job: await api.startEconomicAnalysis(homeId, vars.body, k, account.id) };
        case 'analysisRetry':
          return { job: await api.retryEconomicJob(homeId, vars.jobId, vars.body, k, account.id) };
        case 'draftPark':
        case 'draftReopen':
          return { draft: await api.draftAction(homeId, vars.draftId, vars.kind === 'draftPark' ? 'park' : 'reopen', vars.body, k, account.id) };
        case 'draftConfirm':
          return api.confirmEconomicDraft(homeId, vars.draftId, vars.body, k, account.id);
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
      if ('job' in res) queryClient.setQueryData(queryKeys.economicJob(account.id, homeId, res.job.id), res.job);
      if ('draft' in res) queryClient.setQueryData(queryKeys.draft(account.id, homeId, res.draft.id), res.draft);
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
    // Promessa invece dei callback per chiamata: TanStack non li esegue se il componente si
    // smonta (per esempio la vista della bozza rimontata sulla nuova versione), e il passo
    // successivo (navigazione al costo confermato) andrebbe perso.
    mutation
      .mutateAsync({ ...vars, idempotencyKey: key })
      .then((res) => {
        setKey(newIdempotencyKey());
        setPending(null);
        onSuccess?.(res);
      })
      .catch((err: unknown) => {
        if (!isAmbiguousError(err)) setKey(newIdempotencyKey());
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
