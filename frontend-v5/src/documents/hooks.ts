import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type { DocumentDetail, DocumentSummary, SessionResponse, UploadDocumentInput } from '../api/types';
import { DOCUMENTS_PAGE_SIZE } from '../lib/files';
import { useAccount, useApi } from '../session/session';

// Tutte le richieste documentali passano dal QueryClient: un 401 annulla le
// richieste pendenti e pulisce anche questi dati (byte inclusi), come per le case.

export function useDocuments(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.documents(account.id, homeId),
    queryFn: ({ pageParam, signal }) =>
      api.listDocuments(homeId, { cursor: pageParam, limit: DOCUMENTS_PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useDocument(homeId: string, documentId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.document(account.id, homeId, documentId),
    queryFn: ({ signal }) => api.getDocument(homeId, documentId, signal, account.id),
  });
}

/** Opzioni della query dei byte originali: nessuna conservazione dopo lo smontaggio. */
function fileQuery(api: ReturnType<typeof useApi>, accountId: string, homeId: string, documentId: string) {
  return {
    queryKey: queryKeys.documentFile(accountId, homeId, documentId),
    queryFn: ({ signal }: { signal: AbortSignal }) => api.downloadDocumentFile(homeId, documentId, signal, accountId),
    staleTime: Infinity,
    gcTime: 0,
  };
}

/** Byte per l'anteprima, richiesti solo se `enabled`. */
export function useDocumentFile(homeId: string, documentId: string, enabled: boolean) {
  const api = useApi();
  const account = useAccount();
  return useQuery({ ...fileQuery(api, account.id, homeId, documentId), enabled });
}

/** Scarica (riusando i byte già ricevuti per l'anteprima, se presenti). */
export function useFetchDocumentFile(homeId: string, documentId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return () => queryClient.fetchQuery(fileQuery(api, account.id, homeId, documentId));
}

function sameAccount(queryClient: ReturnType<typeof useQueryClient>, accountId: string) {
  return queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id === accountId;
}

export function useUploadDocument(homeId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { input: UploadDocumentInput; idempotencyKey: string }) =>
      api.uploadDocument(homeId, vars.input, vars.idempotencyKey, account.id),
    onSuccess: async (doc: DocumentDetail) => {
      // Una risposta arrivata dopo un cambio di account non ripopola la cache.
      if (!sameAccount(queryClient, account.id)) return;
      queryClient.setQueryData(queryKeys.document(account.id, homeId, doc.id), doc);
      await queryClient.invalidateQueries({ queryKey: queryKeys.documents(account.id, homeId) });
    },
  });
}

export function useExportDocuments(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useMutation({
    mutationFn: (documents: DocumentSummary[]) =>
      api.exportDocuments(
        homeId,
        documents.map((d) => d.id),
        account.id,
      ),
    // Lo ZIP non resta nella cache delle mutazioni.
    gcTime: 0,
  });
}

/**
 * URL locale per un Blob, creato e revocato dall'effetto: revocato allo
 * smontaggio e quando cambia il Blob (le pagine documento sono smontate al
 * cambio di account o casa, quindi anche lì).
 */
export function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const created = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'URL nasce e muore con l'effetto
    setUrl(created);
    return () => {
      URL.revokeObjectURL(created);
      setUrl(null);
    };
  }, [blob]);
  return blob ? url : null;
}
