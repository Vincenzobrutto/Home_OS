// Regole home-objects-v1 (G1) lato client: aiuto immediato. Il server resta l'autorità su
// permessi, validazioni, posizioni e collegamenti.
import { isApiError, userMessage } from '../api/errors';
import type { CatalogFilters, G1ResourceType, ObjectRef, ObjectType, RoomType } from '../api/types';

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  kitchen: 'Cucina',
  living: 'Soggiorno',
  bedroom: 'Camera',
  bathroom: 'Bagno',
  hall: 'Ingresso o corridoio',
  utility: 'Lavanderia o locale tecnico',
  outdoor: 'Esterno',
  other: 'Altro',
};

export const OBJECT_TYPE_LABEL: Record<ObjectType | 'boiler', string> = {
  appliance: 'Elettrodomestico',
  heating: 'Riscaldamento',
  cooling: 'Raffrescamento',
  electrical: 'Impianto elettrico',
  plumbing: 'Impianto idraulico',
  security: 'Sicurezza',
  fixture: 'Elemento fisso',
  other: 'Altro',
  boiler: 'Caldaia',
};

export const RESOURCE_LABEL: Record<G1ResourceType, string> = {
  document: 'Documento',
  activity: 'Attività',
  expense: 'Spesa',
};

export const UNPLACED_LABEL = 'Da collocare';

const cp = (s: string) => [...s].length;
const clean = (s: string) => s.normalize('NFC').trim();

export function normalizeText(raw: string) {
  return clean(raw);
}

export function normalizeNote(raw: string) {
  const v = clean(raw);
  return v ? v : null;
}

export function validateName(raw: string, max: number) {
  const n = cp(clean(raw));
  if (n === 0) return 'Scrivi un nome.';
  if (n > max) return `Massimo ${max} caratteri.`;
  return undefined;
}

export function validateNote(raw: string, max = 500) {
  return cp(clean(raw)) > max ? `Massimo ${max} caratteri.` : undefined;
}

/** q del catalogo: NFC/trim, massimo 80 code point come il contratto. */
export const QUERY_MAX = 80;
export function validateQuery(q: string) {
  return cp(q) > QUERY_MAX ? `La ricerca può avere al massimo ${QUERY_MAX} caratteri.` : undefined;
}

const OBJECT_TYPES = new Set(Object.keys(OBJECT_TYPE_LABEL));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Filtri del catalogo dall'indirizzo (stato, q, tipo, ambiente o «da collocare»).
 * Ambiente e «da collocare» si escludono: vince l'ambiente. Valori sconosciuti → default.
 * L'ID di ambiente è solo un filtro: il server decide se è leggibile.
 */
export function catalogFiltersFromParams(params: URLSearchParams): CatalogFilters {
  const state = params.get('stato');
  const type = params.get('tipo');
  const room = params.get('ambiente');
  const roomId = room && UUID_RE.test(room) ? room : null;
  return {
    state: state === 'archived' || state === 'all' ? state : 'active',
    q: clean(params.get('q') ?? '').slice(0, 200),
    type: type && OBJECT_TYPES.has(type) ? (type as CatalogFilters['type']) : null,
    roomId,
    placement: !roomId && params.get('collocazione') === 'da-collocare' ? 'unplaced' : 'all',
  };
}

export function catalogFiltersToParams(f: CatalogFilters) {
  const p = new URLSearchParams();
  if (f.state !== 'active') p.set('stato', f.state);
  if (f.q) p.set('q', f.q);
  if (f.type) p.set('tipo', f.type);
  if (f.roomId) p.set('ambiente', f.roomId);
  else if (f.placement === 'unplaced') p.set('collocazione', 'da-collocare');
  return p;
}

export function objectPath(homeId: string, ref?: ObjectRef) {
  const base = `/home/${encodeURIComponent(homeId)}/oggetti`;
  return ref ? `${base}/${encodeURIComponent(ref.kind)}/${encodeURIComponent(ref.id)}` : base;
}

export function roomPath(homeId: string, roomId?: string) {
  const base = `/home/${encodeURIComponent(homeId)}/ambienti`;
  return roomId ? `${base}/${encodeURIComponent(roomId)}` : base;
}

/** Ritorno al catalogo con i filtri salvati nello stato, solo se dello stesso account. */
export function backToCatalog(homeId: string, state: unknown, accountId: string) {
  const saved = state as { objectsSearch?: unknown; objectsAccountId?: unknown } | null;
  if (saved?.objectsAccountId !== accountId || typeof saved.objectsSearch !== 'string') return objectPath(homeId);
  const query = catalogFiltersToParams(catalogFiltersFromParams(new URLSearchParams(saved.objectsSearch))).toString();
  return `${objectPath(homeId)}${query ? `?${query}` : ''}`;
}

const CONFLICTS = [
  'idempotency_conflict',
  'room_version_conflict',
  'object_version_conflict',
  'placement_version_conflict',
  'link_version_conflict',
  'resource_state_conflict',
  'resource_already_linked',
];

/** Messaggi G1; 404/503 riguardano solo ambienti e oggetti, non il resto della casa. */
export function objectsErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.kind === 'http') {
      if (error.status === 404) return 'Ambienti e oggetti non sono ancora attivi su questo servizio.';
      if (error.status === 403) return 'Non hai accesso a questo elemento o alla risorsa scelta.';
      switch (error.code) {
        case 'room_version_conflict':
        case 'object_version_conflict':
        case 'placement_version_conflict':
        case 'link_version_conflict':
          return 'I dati sono stati modificati nel frattempo (per esempio da un altro membro o in un’altra scheda). Rileggi i dati prima di continuare.';
        case 'resource_state_conflict':
          return 'Lo stato è cambiato nel frattempo: rileggi i dati prima di continuare.';
        case 'resource_already_linked':
          return 'Questa risorsa è già collegata a un altro oggetto. Per spostarla, rimuovi prima quel collegamento.';
        case 'idempotency_conflict':
          return 'Una richiesta precedente con dati diversi risulta già registrata: rileggi i dati prima di continuare.';
      }
    }
    if (error.kind === 'service' && error.status === 503) {
      return 'Ambienti e oggetti non sono disponibili in questo momento. Se stavi salvando, l’esito non è confermato: usa «Riprova invio».';
    }
  }
  return userMessage(error);
}

export function isConflict(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 409 && CONFLICTS.includes(error.code);
}

export function isAmbiguous(error: unknown) {
  return isApiError(error) && error.kind === 'service';
}

export function isForbidden(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 403;
}

export function isNotActive(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 404;
}

/** Riga descrittiva di un ambiente: tipo se diverso dal nome, poi la nota (distingue due «Bagno»). */
export function roomMeta(room: { name: string; type: RoomType; note: string | null }) {
  const label = ROOM_TYPE_LABEL[room.type] ?? room.type;
  const parts = [label.toLowerCase() === room.name.trim().toLowerCase() ? null : label, room.note].filter(Boolean);
  return parts.join(' · ');
}
