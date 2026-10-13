import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isUnauthorized } from '../api/errors';
import { queryKeys } from '../api/queryKeys';
import type { CreateHomeInput, Home, LoginInput, RegisterInput, SessionResponse } from '../api/types';
import { clearPrivateCache } from './queryClient';
import { refreshSession, useAccount, useApi, useAuthSignals } from './session';

export function useLogin() {
  const api = useApi();
  const queryClient = useQueryClient();
  const signals = useAuthSignals();
  return useMutation({
    meta: { authForm: true },
    mutationFn: (input: LoginInput) => api.login(input),
    onSuccess: async () => {
      // La sessione può essere ruotata: cache pulita e nuovo token CSRF.
      signals.reset();
      clearPrivateCache(queryClient);
      await refreshSession(queryClient, api);
    },
  });
}

export function useRegister() {
  const api = useApi();
  const queryClient = useQueryClient();
  const signals = useAuthSignals();
  return useMutation({
    meta: { authForm: true },
    mutationFn: (input: RegisterInput) => api.register(input),
    onSuccess: async () => {
      signals.reset();
      clearPrivateCache(queryClient);
      await refreshSession(queryClient, api);
    },
  });
}

export function useLogout() {
  const api = useApi();
  const queryClient = useQueryClient();
  const signals = useAuthSignals();
  return useMutation({
    meta: { authForm: true },
    mutationFn: async () => {
      try {
        await api.logout();
      } catch (error) {
        // 401: la sessione era già scaduta, l'esito per l'utente è lo stesso.
        if (!isUnauthorized(error)) throw error;
        api.forgetCsrfToken();
      }
    },
    onSuccess: async () => {
      // Sessione anonima subito: la guardia porta al login (senza "next"), poi
      // annulla le richieste pendenti, pulisce la cache privata e chiede un nuovo CSRF.
      signals.markExplicitLogout();
      queryClient.setQueryData<SessionResponse>(queryKeys.session, { account: null, csrfToken: '' });
      await queryClient.cancelQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.session[0] });
      clearPrivateCache(queryClient);
      await refreshSession(queryClient, api).catch(() => {
        // Backend non raggiungibile: la pagina di accesso mostrerà l'errore di servizio.
      });
    },
  });
}

export function useHomes() {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.homes(account.id),
    queryFn: ({ signal }) => api.listHomes(signal),
  });
}

export function useHome(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.home(account.id, homeId),
    queryFn: ({ signal }) => api.getHome(homeId, signal),
  });
}

export function useCreateHome() {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { input: CreateHomeInput; idempotencyKey: string }) =>
      api.createHome(vars.input, vars.idempotencyKey),
    onSuccess: async (home: Home) => {
      queryClient.setQueryData(queryKeys.home(account.id, home.id), home);
      await queryClient.invalidateQueries({ queryKey: queryKeys.homes(account.id) });
    },
  });
}
