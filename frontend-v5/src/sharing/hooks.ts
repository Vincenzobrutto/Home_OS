import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { newIdempotencyKey, queryKeys } from '../api/queryKeys';
import { sharingApi, sharingKeys } from '../api/sharingClient';
import type { Share } from '../api/sharingTypes';
import type { SessionResponse } from '../api/types';
import { SENDER_WAITING, isAmbiguousShareError, isShareUnavailableError, withoutSecret } from '../lib/sharing';
import { useAccount, useApi } from '../session/session';

// sharing-v1: letture nel QueryClient comune sotto ['account', id, ...]; logout e cambio account
// le rimuovono come ogni altro dato privato. Scritture fuori dalla cache delle mutazioni: le risposte
// di create/rotate contengono il codice di abbinamento, che resta solo nello stato del componente.

const PAGE = 20;
const POLL_MS = 10_000;

export function useSharingCapabilities(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: sharingKeys.capabilities(account.id, homeId),
    queryFn: ({ signal }) => sharingApi(api).capabilities(homeId, signal, account.id),
    retry: false,
    staleTime: 0,
  });
}

export function useSharingRecipients(homeId: string, enabled: boolean) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: sharingKeys.recipients(account.id, homeId),
    queryFn: ({ signal }) => sharingApi(api).recipients(homeId, signal, account.id),
    enabled,
    retry: false,
    staleTime: 0,
  });
}

/** Picker: solo documenti già leggibili al mittente; idoneità e motivo dal server, paging esplicito. */
export function useSharingDocuments(homeId: string, enabled: boolean) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: sharingKeys.documents(account.id, homeId),
    queryFn: ({ pageParam, signal }) => sharingApi(api).documents(homeId, { cursor: pageParam, limit: PAGE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
    retry: false,
    staleTime: 0,
  });
}

export function useShares(homeId: string, enabled: boolean) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: sharingKeys.shares(account.id, homeId),
    queryFn: ({ pageParam, signal }) => sharingApi(api).list(homeId, { cursor: pageParam, limit: PAGE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
    retry: false,
    staleTime: 0,
  });
}

/** Rilettura ogni 10 s solo mentre si aspetta qualcun altro, a pagina visibile; ferma su stato finale o 403. */
export function useShare(homeId: string, shareId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: sharingKeys.share(account.id, homeId, shareId),
    queryFn: ({ signal }) => sharingApi(api).get(homeId, shareId, signal, account.id).then(withoutSecret),
    retry: false,
    staleTime: 0,
    refetchInterval: (q) => (q.state.error && isShareUnavailableError(q.state.error) ? false : q.state.data && SENDER_WAITING.includes(q.state.data.state) ? POLL_MS : false),
    refetchIntervalInBackground: false,
  });
}

export function useReceivedShares() {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: sharingKeys.receivedList(account.id),
    queryFn: ({ pageParam, signal }) => sharingApi(api).receivedList({ cursor: pageParam, limit: PAGE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: false,
    staleTime: 0,
  });
}

/** Il destinatario aspetta solo la conferma del mittente: è l'unico stato con rilettura periodica. */
export function useReceivedShare(shareId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: sharingKeys.receivedShare(account.id, shareId),
    queryFn: ({ signal }) => sharingApi(api).received(shareId, signal, account.id),
    retry: false,
    staleTime: 0,
    refetchInterval: (q) => (q.state.data?.state === 'awaiting_confirmation' && !q.state.error ? POLL_MS : false),
    refetchIntervalInBackground: false,
  });
}

function sameAccount(queryClient: QueryClient, accountId: string) {
  return queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id === accountId;
}

/**
 * Scrittura idempotente senza cache delle mutazioni. Stessa chiave e stesso body finché l'esito
 * è ignoto («Riprova invio» esplicito), chiave nuova dopo un esito definito. Nessun retry automatico.
 * Le risposte arrivate dopo un logout o un cambio account vengono ignorate.
 */
export function useSharingOperation<T>() {
  const account = useAccount();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const last = useRef<{ call: (key: string) => Promise<T>; key: string; onSuccess?: (res: T) => void; onDefiniteError?: (err: unknown) => void } | null>(null);
  const busy = useRef(false);

  const exec = () => {
    const op = last.current;
    if (!op || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    op.call(op.key).then(
      (res) => {
        busy.current = false;
        last.current = null;
        setPending(false);
        if (sameAccount(queryClient, account.id)) op.onSuccess?.(res);
      },
      (err: unknown) => {
        busy.current = false;
        setPending(false);
        setError(err);
        if (!isAmbiguousShareError(err)) {
          last.current = null;
          op.onDefiniteError?.(err);
        }
      },
    );
  };
  const run = (call: (key: string) => Promise<T>, onSuccess?: (res: T) => void, onDefiniteError?: (err: unknown) => void) => {
    if (busy.current) return;
    last.current = { call, key: newIdempotencyKey(), onSuccess, onDefiniteError };
    exec();
  };
  /** Ripete la richiesta di esito ignoto: stessa chiave, stesso body. */
  const retry = () => exec();
  const reset = () => {
    if (busy.current) return;
    last.current = null;
    setError(null);
  };
  const ambiguous = error !== null && isAmbiguousShareError(error);
  return { run, retry, reset, pending, error, ambiguous };
}

/** Dopo una scrittura riuscita: dettaglio aggiornato senza segreto, elenco riletto. */
export function useStoreShare(homeId: string) {
  const account = useAccount();
  const queryClient = useQueryClient();
  return (share: Share) => {
    if (!sameAccount(queryClient, account.id)) return;
    queryClient.setQueryData(sharingKeys.share(account.id, homeId, share.id), withoutSecret(share));
    void queryClient.invalidateQueries({ queryKey: sharingKeys.shares(account.id, homeId) });
  };
}

export function useStoreReceived() {
  const account = useAccount();
  const queryClient = useQueryClient();
  return (share: Share) => {
    if (!sameAccount(queryClient, account.id)) return;
    queryClient.setQueryData(sharingKeys.receivedShare(account.id, share.id), share);
    void queryClient.invalidateQueries({ queryKey: sharingKeys.receivedList(account.id) });
  };
}

/**
 * 403 su un dettaglio: TanStack conserverebbe i dati letti prima (nomi dei file, profili).
 * Li azzeriamo una volta; la rilettura che segue resta in errore e senza dati.
 */
export function useDropOnForbidden(key: readonly unknown[], query: { isError: boolean; error: unknown; data: unknown }) {
  const queryClient = useQueryClient();
  const forbidden = query.isError && isShareUnavailableError(query.error) && query.data !== undefined;
  useEffect(() => {
    if (forbidden) void queryClient.resetQueries({ queryKey: key, exact: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- un azzeramento per ogni 403 con dati
  }, [forbidden]);
}
