import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isUnauthorized } from '../api/errors';
import { queryKeys } from '../api/queryKeys';
import type { SessionResponse } from '../api/types';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Login/registrazione/logout: un 401 è un esito del form, non una sessione scaduta. */
      authForm?: boolean;
    };
  }
}

/** Rimuove tutta la cache privata (tutto tranne la sessione anonima/CSRF). */
export function clearPrivateCache(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.session[0] });
  queryClient.getMutationCache().clear();
}

/**
 * 401 su una richiesta protetta: annulla le richieste pendenti, pulisce la cache
 * privata, segna la sessione come anonima e chiede un nuovo CSRF. Nessun retry
 * automatico della richiesta fallita, quindi nessun loop.
 */
export async function handleUnauthorized(queryClient: QueryClient) {
  await queryClient.cancelQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.session[0] });
  clearPrivateCache(queryClient);
  queryClient.setQueryData<SessionResponse>(queryKeys.session, (prev) =>
    prev ? { ...prev, account: null } : prev,
  );
  await queryClient.invalidateQueries({ queryKey: queryKeys.session });
}

export function createQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isUnauthorized(error) && query.queryKey[0] !== queryKeys.session[0]) {
          void handleUnauthorized(queryClient);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (isUnauthorized(error) && !mutation.meta?.authForm) {
          void handleUnauthorized(queryClient);
        }
      },
    }),
    defaultOptions: {
      queries: {
        // Nessun retry automatico: errori di servizio mostrano un "Riprova" manuale.
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  });
  return queryClient;
}
