import { useEffect, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type {
  AnalysisJob,
  ConfirmationResult,
  ConfirmationsInput,
  ManualConfirmationsInput,
  ReviewPage,
  SessionResponse,
} from '../api/types';
import { useAccount, useApi } from '../session/session';

// Tutte le risorse M3 sono personali all'account e passano dal QueryClient comune:
// un 401 o un cambio account le annulla e le rimuove come case e documenti.

/** Polling dei job: 1 s mentre queued/running, al massimo 30 s per visita (contratto review-v1). */
export const JOB_POLLING = { intervalMs: 1000, maxPerVisitMs: 30_000 };

const PAGE_SIZE = 20;

export function useCapabilities(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.capabilities(account.id, homeId),
    queryFn: ({ signal }) => api.getAnalysisCapabilities(homeId, signal, account.id),
    staleTime: 5 * 60_000,
  });
}

export function useJobs(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.jobs(account.id, homeId),
    queryFn: ({ pageParam, signal }) =>
      api.listAnalysisJobs(homeId, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function isActive(job: AnalysisJob | undefined) {
  return !!job && (job.state === 'queued' || job.state === 'running');
}

/**
 * Stato di un job con polling limitato alla visita corrente: parte al montaggio,
 * si ferma allo smontaggio (cambio pagina/casa, logout) o dopo 30 s.
 * `expired` = ancora in corso ma polling concluso: l'utente aggiorna a mano.
 */
export function useJobProgress(homeId: string, jobId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  const settled = useRef(false);
  const [visit, setVisit] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    // Finestra di polling della visita: allo scadere si smette di interrogare il server.
    const timer = window.setTimeout(() => setTimedOut(true), JOB_POLLING.maxPerVisitMs);
    return () => window.clearTimeout(timer);
  }, [visit]);
  const query = useQuery({
    queryKey: queryKeys.job(account.id, homeId, jobId),
    queryFn: async ({ signal }) => {
      const job = await api.getAnalysisJob(homeId, jobId, signal, account.id);
      if (!isActive(job) && !settled.current) {
        settled.current = true;
        // Esito definitivo: elenco job, schede e verifiche si rileggono dal server.
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs(account.id, homeId) });
        // Prefisso assets: elenco, dettaglio e storia (anche della scheda di destinazione).
        void queryClient.invalidateQueries({ queryKey: [...queryKeys.homeM3(account.id, homeId), 'assets'] });
        void queryClient.invalidateQueries({ queryKey: queryKeys.review(account.id, homeId) });
      }
      return job;
    },
    staleTime: 0,
    refetchInterval: (q) => (isActive(q.state.data) && !timedOut ? JOB_POLLING.intervalMs : false),
    refetchIntervalInBackground: false,
  });
  const expired = isActive(query.data) && timedOut;
  const refresh = () => {
    // Aggiornamento manuale: una nuova finestra di polling per questa visita.
    setTimedOut(false);
    setVisit((v) => v + 1);
    return query.refetch();
  };
  return { ...query, expired, refresh };
}

export function useAssets(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.assets(account.id, homeId),
    queryFn: ({ pageParam, signal }) =>
      api.listAssets(homeId, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useAsset(homeId: string, assetId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.asset(account.id, homeId, assetId),
    queryFn: ({ signal }) => api.getAsset(homeId, assetId, signal, account.id),
  });
}

export function useHistory(homeId: string, assetId: string) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.history(account.id, homeId, assetId),
    queryFn: ({ pageParam, signal }) =>
      api.listHistory(homeId, assetId, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useReview(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.review(account.id, homeId),
    queryFn: ({ pageParam, signal }) =>
      api.listReview(homeId, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

function sameAccount(queryClient: QueryClient, accountId: string) {
  return queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id === accountId;
}

export function useStartAnalysis(homeId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { documentIds: string[]; targetAssetId?: string; idempotencyKey: string }) =>
      api.createAnalysisJob(
        homeId,
        vars.targetAssetId
          ? { documentIds: vars.documentIds, targetAssetId: vars.targetAssetId }
          : { documentIds: vars.documentIds },
        vars.idempotencyKey,
        account.id,
      ),
    onSuccess: async (job) => {
      if (!sameAccount(queryClient, account.id)) return;
      queryClient.setQueryData(queryKeys.job(account.id, homeId, job.id), job);
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobs(account.id, homeId) });
    },
  });
}

export function useRetryJob(homeId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { jobId: string; idempotencyKey: string }) =>
      api.retryAnalysisJob(homeId, vars.jobId, vars.idempotencyKey, account.id),
    onSuccess: async (job) => {
      if (!sameAccount(queryClient, account.id)) return;
      queryClient.setQueryData(queryKeys.job(account.id, homeId, job.id), job);
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobs(account.id, homeId) });
    },
  });
}

export function useCreateBoiler(homeId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { name: string; idempotencyKey: string }) =>
      api.createBoiler(homeId, vars.name, vars.idempotencyKey, account.id),
    onSuccess: async (asset) => {
      if (!sameAccount(queryClient, account.id)) return;
      queryClient.setQueryData(queryKeys.asset(account.id, homeId, asset.id), asset);
      await queryClient.invalidateQueries({ queryKey: queryKeys.assets(account.id, homeId) });
    },
  });
}

/**
 * Dopo una conferma: la scheda arriva dalla risposta, dalle verifiche aperte
 * spariscono soltanto i resolvedProposalIds; poi conteggi, scheda, elenco e
 * storia si rileggono dal server. Nessun aggiornamento se nel frattempo è
 * cambiato account.
 */
async function applyConfirmation(
  queryClient: QueryClient,
  accountId: string,
  homeId: string,
  assetId: string,
  result: ConfirmationResult,
) {
  if (!sameAccount(queryClient, accountId)) return;
  const resolved = new Set(result.resolvedProposalIds);
  queryClient.setQueryData(queryKeys.asset(accountId, homeId, assetId), result.asset);
  queryClient.setQueryData<InfiniteData<ReviewPage>>(queryKeys.review(accountId, homeId), (prev) =>
    prev
      ? {
          ...prev,
          pages: prev.pages.map((p) => ({ ...p, items: p.items.filter((i) => !resolved.has(i.proposal.id)) })),
        }
      : prev,
  );
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.review(accountId, homeId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.assets(accountId, homeId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.asset(accountId, homeId, assetId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.history(accountId, homeId, assetId) }),
  ]);
}

export function useConfirm(homeId: string, assetId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { input: ConfirmationsInput; idempotencyKey: string }) =>
      api.confirm(homeId, assetId, vars.input, vars.idempotencyKey, account.id),
    onSuccess: (result) => applyConfirmation(queryClient, account.id, homeId, assetId, result),
  });
}

export function useManualConfirm(homeId: string, assetId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { input: ManualConfirmationsInput; idempotencyKey: string }) =>
      api.confirmManual(homeId, assetId, vars.input, vars.idempotencyKey, account.id),
    onSuccess: (result) => applyConfirmation(queryClient, account.id, homeId, assetId, result),
  });
}

/** Dopo un 409 di versione o di proposta già risolta: rilettura, senza reinviare nulla. */
export function useRefreshAsset(homeId: string, assetId: string) {
  const account = useAccount();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.asset(account.id, homeId, assetId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.review(account.id, homeId) }),
    ]);
}
