import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type {
  CreateExpense,
  ExpenseAction,
  ExpenseFilters,
  ExpenseResponse,
  SessionResponse,
  UpdateExpense,
} from '../api/types';
import { useAccount, useApi } from '../session/session';

// Spese personali H3a: tutte le letture passano dal QueryClient comune (401, logout e
// cambio account le annullano e le rimuovono). today viene dal server e si rilegge al focus.
const PAGE_SIZE = 20;
const TEMPORAL = { staleTime: 0, refetchOnWindowFocus: 'always' as const };

export function useExpenseCapabilities(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.expenseCapabilities(account.id, homeId),
    queryFn: ({ signal }) => api.getExpenseCapabilities(homeId, signal, account.id),
    ...TEMPORAL,
  });
}

/** Riepilogo annuo dal server (solo spese active); year null = anno corrente del server. */
export function useExpenseSummary(homeId: string, year: string | null, enabled = true) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.expenseSummary(account.id, homeId, year),
    queryFn: ({ signal }) => api.getExpenseSummary(homeId, year, signal, account.id),
    enabled,
    ...TEMPORAL,
  });
}

export function useExpenses(homeId: string, filters: ExpenseFilters, enabled = true) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.expenses(account.id, homeId, filters),
    queryFn: ({ pageParam, signal }) =>
      api.listExpenses(homeId, filters, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
    staleTime: 0,
  });
}

export function useExpense(homeId: string, expenseId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.expense(account.id, homeId, expenseId),
    queryFn: ({ signal }) => api.getExpense(homeId, expenseId, signal, account.id),
    staleTime: 0,
  });
}

export function useExpenseHistory(homeId: string, expenseId: string) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.expenseHistory(account.id, homeId, expenseId),
    queryFn: ({ pageParam, signal }) =>
      api.listExpenseHistory(homeId, expenseId, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  });
}

function sameAccount(queryClient: QueryClient, accountId: string) {
  return queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id === accountId;
}

export type ExpenseMutationVars =
  | { kind: 'create'; body: CreateExpense; idempotencyKey: string }
  | { kind: 'updates'; expenseId: string; body: UpdateExpense; idempotencyKey: string }
  | { kind: 'archive' | 'restore'; expenseId: string; body: ExpenseAction; idempotencyKey: string };

/**
 * Mutazioni pessimistiche: nessun aggiornamento locale prima della risposta.
 * Dopo successo o replay: dettaglio dalla risposta, poi rilettura di tutto il
 * prefisso H3 (liste, anche quelle per caldaia/documento, riepiloghi, storia).
 * Nessuna scrittura in cache se nel frattempo è cambiato account.
 */
export function useExpenseMutation(homeId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: ExpenseMutationVars): Promise<ExpenseResponse> =>
      vars.kind === 'create'
        ? api.createExpense(homeId, vars.body, vars.idempotencyKey, account.id)
        : api.expenseMutation(homeId, vars.expenseId, vars.kind, vars.body, vars.idempotencyKey, account.id),
    onSuccess: async (res) => {
      if (!sameAccount(queryClient, account.id)) return;
      queryClient.setQueryData(queryKeys.expense(account.id, homeId, res.expense.id), res);
      await queryClient.invalidateQueries({ queryKey: queryKeys.h3(account.id, homeId) });
    },
  });
}

/** Rilettura esplicita dopo un 409 o su richiesta dell'utente. */
export function useRefreshExpenses(homeId: string) {
  const account = useAccount();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.h3(account.id, homeId) });
}

/**
 * Dopo un 403 su una lettura di elenco/riepilogo (accesso revocato o scaduto):
 * nessuna spesa resta in cache per questa casa e la casa viene riletta, così il
 * guard mostra l'accesso negato e rimuove il resto delle pagine osservate.
 */
export function useForgetExpenses(homeId: string) {
  const account = useAccount();
  const queryClient = useQueryClient();
  return () => {
    queryClient.removeQueries({ queryKey: queryKeys.h3(account.id, homeId), predicate: (q) => q.getObserversCount() === 0 });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home(account.id, homeId) });
  };
}
