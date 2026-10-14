import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type {
  CatalogFilters,
  CatalogItem,
  CreateObject,
  CreateRoom,
  G1ResourceType,
  LinkedResource,
  ObjectRef,
  Room,
  RoomFilters,
  SessionResponse,
  UpdateObject,
  UpdateRoom,
} from '../api/types';
import { useAccount, useApi } from '../session/session';

// G1: tutte le letture passano dal QueryClient comune (401, logout e cambio account le
// annullano e rimuovono). Nessuna lettura locale come ripiego di quelle del server.
const PAGE_SIZE = 20;

export function useObjectCapabilities(homeId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.objectCapabilities(account.id, homeId),
    queryFn: ({ signal }) => api.getObjectCapabilities(homeId, signal, account.id),
    retry: false,
  });
}

export function useRooms(homeId: string, filters: RoomFilters, enabled = true) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.rooms(account.id, homeId, filters.state),
    queryFn: ({ pageParam, signal }) => api.listRooms(homeId, filters, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
    staleTime: 0,
  });
}

export function useRoom(homeId: string, roomId: string) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.room(account.id, homeId, roomId),
    queryFn: ({ signal }) => api.getRoom(homeId, roomId, signal, account.id),
    staleTime: 0,
  });
}

export function useRoomHistory(homeId: string, roomId: string) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.roomHistory(account.id, homeId, roomId),
    queryFn: ({ pageParam, signal }) => api.listRoomHistory(homeId, roomId, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  });
}

/** Catalogo server: ricerca e filtri sul dataset autorizzato, mai sulla sola pagina caricata. */
export function useCatalog(homeId: string, filters: CatalogFilters, enabled = true) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.objects(account.id, homeId, filters),
    queryFn: ({ pageParam, signal }) => api.listObjects(homeId, filters, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
    staleTime: 0,
  });
}

export function useObject(homeId: string, ref: ObjectRef) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.object(account.id, homeId, ref.kind, ref.id),
    queryFn: ({ signal }) => api.getObject(homeId, ref, signal, account.id),
    staleTime: 0,
  });
}

export function useObjectHistory(homeId: string, ref: ObjectRef) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.objectHistory(account.id, homeId, ref.kind, ref.id),
    queryFn: ({ pageParam, signal }) => api.listObjectHistory(homeId, ref, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  });
}

export function useObjectLinks(homeId: string, ref: ObjectRef, resourceType: G1ResourceType) {
  const api = useApi();
  const account = useAccount();
  return useInfiniteQuery({
    queryKey: queryKeys.objectLinks(account.id, homeId, ref.kind, ref.id, resourceType),
    queryFn: ({ pageParam, signal }) =>
      api.listObjectLinks(homeId, ref, resourceType, { cursor: pageParam, limit: PAGE_SIZE }, signal, account.id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  });
}

function sameAccount(queryClient: QueryClient, accountId: string) {
  return queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id === accountId;
}

export type G1MutationVars =
  | { kind: 'createRoom'; body: CreateRoom; idempotencyKey: string }
  | { kind: 'roomUpdates'; roomId: string; body: UpdateRoom; idempotencyKey: string }
  | { kind: 'roomArchive' | 'roomRestore'; roomId: string; body: { expectedVersion: number }; idempotencyKey: string }
  | { kind: 'createObject'; body: CreateObject; idempotencyKey: string }
  | { kind: 'objectUpdates'; ref: ObjectRef; body: UpdateObject; idempotencyKey: string }
  | { kind: 'objectArchive' | 'objectRestore'; ref: ObjectRef; body: { expectedVersion: number }; idempotencyKey: string }
  | { kind: 'position'; ref: ObjectRef; body: { expectedVersion: number; roomIds: string[] }; idempotencyKey: string }
  | { kind: 'link'; ref: ObjectRef; body: { resourceType: G1ResourceType; resourceId: string }; idempotencyKey: string }
  | { kind: 'unlink'; ref: ObjectRef; linkId: string; body: { expectedVersion: number }; idempotencyKey: string };

export type G1Result = { room: Room } | { object: CatalogItem } | { link: LinkedResource };

/**
 * Mutazioni pessimistiche G1: nessun aggiornamento locale prima della risposta.
 * Dopo successo o replay: dettaglio dalla risposta, poi rilettura del prefisso G1
 * (liste, catalogo, storia, collegamenti). Nessuna scrittura se l'account è cambiato.
 */
export function useG1Mutation(homeId: string) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: G1MutationVars): Promise<G1Result> => {
      const k = v.idempotencyKey;
      switch (v.kind) {
        case 'createRoom':
          return { room: await api.createRoom(homeId, v.body, k, account.id) };
        case 'roomUpdates':
          return { room: await api.roomMutation(homeId, v.roomId, 'updates', v.body, k, account.id) };
        case 'roomArchive':
        case 'roomRestore':
          return { room: await api.roomMutation(homeId, v.roomId, v.kind === 'roomArchive' ? 'archive' : 'restore', v.body, k, account.id) };
        case 'createObject':
          return { object: await api.createObject(homeId, v.body, k, account.id) };
        case 'objectUpdates':
          return { object: await api.objectMutation(homeId, v.ref, 'updates', v.body, k, account.id) };
        case 'objectArchive':
        case 'objectRestore':
          return { object: await api.objectMutation(homeId, v.ref, v.kind === 'objectArchive' ? 'archive' : 'restore', v.body, k, account.id) };
        case 'position':
          return { object: await api.objectMutation(homeId, v.ref, 'position', v.body, k, account.id) };
        case 'link':
          return { link: await api.createObjectLink(homeId, v.ref, v.body, k, account.id) };
        case 'unlink':
          return { link: await api.removeObjectLink(homeId, v.ref, v.linkId, v.body.expectedVersion, k, account.id) };
      }
    },
    onSuccess: async (res) => {
      if (!sameAccount(queryClient, account.id)) return;
      if ('room' in res) queryClient.setQueryData(queryKeys.room(account.id, homeId, res.room.id), res.room);
      if ('object' in res) queryClient.setQueryData(queryKeys.object(account.id, homeId, res.object.ref.kind, res.object.ref.id), res.object);
      await queryClient.invalidateQueries({ queryKey: queryKeys.g1(account.id, homeId) });
    },
  });
}

export function useRefreshObjects(homeId: string) {
  const account = useAccount();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.g1(account.id, homeId) });
}

/**
 * Dopo un 403 su una lettura G1 (accesso revocato o scaduto): rimuove le query G1 non
 * osservate e rilegge la casa, così il guard mostra l'accesso negato.
 */
export function useForgetObjects(homeId: string) {
  const account = useAccount();
  const queryClient = useQueryClient();
  return () => {
    queryClient.removeQueries({ queryKey: queryKeys.g1(account.id, homeId), predicate: (q) => q.getObserversCount() === 0 });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home(account.id, homeId) });
  };
}
