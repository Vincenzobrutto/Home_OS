import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClientProvider, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiClient } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import type { Account } from '../api/types';
import { clearPrivateCache } from './queryClient';

const ApiContext = createContext<ApiClient | null>(null);
const AccountContext = createContext<Account | null>(null);

/**
 * Segnale in memoria: la sessione è finita per un logout esplicito (non per
 * scadenza). In quel caso il login non riceve "next", così l'account successivo
 * non viene riportato alle pagine dell'account precedente.
 */
export class AuthSignals {
  private logout = false;
  get explicitLogout() {
    return this.logout;
  }
  markExplicitLogout() {
    this.logout = true;
  }
  reset() {
    this.logout = false;
  }
}
const AuthSignalsContext = createContext<AuthSignals | null>(null);

export function AppProviders(props: { api: ApiClient; queryClient: QueryClient; children: ReactNode }) {
  const [signals] = useState(() => new AuthSignals());
  return (
    <ApiContext.Provider value={props.api}>
      <AuthSignalsContext.Provider value={signals}>
        <QueryClientProvider client={props.queryClient}>
          <AccountWatcher />
          {props.children}
        </QueryClientProvider>
      </AuthSignalsContext.Provider>
    </ApiContext.Provider>
  );
}

export function useAuthSignals(): AuthSignals {
  const signals = useContext(AuthSignalsContext);
  if (!signals) throw new Error('useAuthSignals fuori da AppProviders');
  return signals;
}

export function useApi(): ApiClient {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi fuori da AppProviders');
  return api;
}

export function useSession() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => api.getSession(signal),
    // Ricontrolla al ritorno sulla finestra: rileva logout/login fatti in un'altra scheda.
    refetchOnWindowFocus: 'always',
    staleTime: 60_000,
  });
}

/** Rinfresca la sessione (nuovo CSRF) ignorando la cache. */
export function refreshSession(queryClient: QueryClient, api: ApiClient) {
  return queryClient.fetchQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => api.getSession(signal),
    staleTime: 0,
  });
}

/**
 * Se l'account della sessione cambia (login, logout, altra scheda), la cache
 * privata dell'account precedente viene rimossa. Le chiavi sono comunque
 * per account, quindi questo è un secondo livello di isolamento.
 */
function AccountWatcher() {
  const queryClient = useQueryClient();
  const session = useSession();
  const accountId = session.data ? (session.data.account?.id ?? null) : undefined;
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (accountId === undefined) return;
    if (previous.current !== undefined && previous.current !== accountId) {
      clearPrivateCache(queryClient);
    }
    previous.current = accountId;
  }, [accountId, queryClient]);
  return null;
}

export function AccountProvider(props: { account: Account; children: ReactNode }) {
  return <AccountContext.Provider value={props.account}>{props.children}</AccountContext.Provider>;
}

export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error('useAccount fuori da una rotta autenticata');
  return account;
}
