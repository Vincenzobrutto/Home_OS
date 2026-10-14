// BACKEND SIMULATO home-objects-v1 (G1) — SOLO TEST E HARNESS, NON È IL BACKEND REALE.
// Ambienti condivisi della casa; oggetti e posizioni personali; caldaie M3 nel catalogo con
// la stessa ID; collegamenti native/reference; CAS, idempotenza con replay riautorizzato.
// Sintassi "erasable": eseguito anche da Node in scripts/mock-api.ts.

import type { CatalogItem, G1ResourceType, HomePermission, LinkedResource, ObjectKind, Room } from '../api/types';

type Req = { method: string; path: string; headers: Record<string, string | undefined>; body: unknown };
type Res = { status: number; body?: unknown };
type Ref = { kind: ObjectKind; id: string };
type Resource = { id: string; title: string; assetId?: string | null };

export type ObjectAccess = {
  perms(accountId: string, homeId: string): HomePermission[] | null;
  /** Caldaie M3 leggibili dal richiedente (personali al creatore). */
  boilers(accountId: string, homeId: string): Array<{ id: string; name: string; createdAt: string }>;
  /** Documenti M2 originali delle fonti della caldaia (collegamenti nativi). */
  boilerDocuments(accountId: string, homeId: string, assetId: string): string[];
  document(accountId: string, homeId: string, id: string): Resource | null;
  expense(accountId: string, homeId: string, id: string): Resource | null;
  activity(accountId: string, homeId: string, id: string): Resource | null;
  /** Spese/attività del richiedente con assetId nativo. */
  native(accountId: string, homeId: string, type: 'expense' | 'activity', assetId: string): Resource[];
};

type StoredRoom = Omit<Room, 'permissions'>;
type StoredObject = {
  id: string;
  homeId: string;
  accountId: string;
  name: string;
  type: string;
  note: string | null;
  state: 'active' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
};
type StoredPosition = { version: number; roomIds: string[] };
type StoredLink = {
  linkId: string;
  accountId: string;
  homeId: string;
  ref: Ref;
  resourceType: G1ResourceType;
  resourceId: string;
  state: 'active' | 'removed';
  version: number;
  createdAt: string;
};
type StoredEvent = { id: string; kind: string; at: string; before: unknown; after: unknown };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^[A-Za-z0-9_-]{16,100}$/;
const ROOM_TYPES = ['kitchen', 'living', 'bedroom', 'bathroom', 'hall', 'utility', 'outdoor', 'other'];
const OBJECT_TYPES = ['appliance', 'heating', 'cooling', 'electrical', 'plumbing', 'security', 'fixture', 'other'];
const cp = (s: string) => [...s].length;
const uuid = () => globalThis.crypto.randomUUID();

function err(status: number, code: string, message: string, fieldErrors?: Record<string, string>): Res {
  return { status, body: { error: { code, message, fieldErrors, requestId: uuid() } } };
}

export class FakeObjects {
  rooms = new Map<string, StoredRoom>();
  objects = new Map<string, StoredObject>();
  positions = new Map<string, StoredPosition>();
  links = new Map<string, StoredLink>();
  history = new Map<string, StoredEvent[]>();
  idem = new Map<string, { digest: string; status: number; replay: () => unknown }>();
  /** false = backend senza G1 (404). */
  enabled = true;
  /** 503 sulle rotte G1. */
  unavailable = false;
  /** Mutazioni realmente applicate (prove di idempotenza). */
  applied: string[] = [];
  private seq = 0;
  private readonly access: ObjectAccess;

  constructor(access: ObjectAccess) {
    this.access = access;
  }

  private stamp() {
    this.seq += 1;
    return new Date(Date.parse('2026-10-13T10:00:00Z') + this.seq * 1000).toISOString();
  }

  private posKey(accountId: string, ref: Ref) {
    return `${accountId}:${ref.kind}:${ref.id}`;
  }

  private event(key: string, kind: string, before: unknown, after: unknown) {
    const list = this.history.get(key) ?? [];
    list.push({ id: uuid(), kind, at: this.stamp(), before, after });
    this.history.set(key, list);
  }

  // ---- proiezioni ----

  private roomView(r: StoredRoom, perms: HomePermission[]): Room {
    return { ...r, permissions: perms.includes('edit') ? ['read', 'edit'] : ['read'] };
  }

  private position(accountId: string, homeId: string, ref: Ref, perms: HomePermission[]) {
    const p = this.positions.get(this.posKey(accountId, ref)) ?? { version: 0, roomIds: [] };
    const rooms = p.roomIds
      .map((id) => this.rooms.get(id))
      .filter((r): r is StoredRoom => !!r && r.homeId === homeId)
      .map((r) => this.roomView(r, perms));
    return { version: p.version, rooms };
  }

  /** Riferimento leggibile dal richiedente (oggetto proprio o caldaia M3 propria). */
  private find(accountId: string, homeId: string, ref: Ref): { item: () => CatalogItem; stored?: StoredObject; createdAt: string; name: string } | null {
    const perms = this.access.perms(accountId, homeId)!;
    if (ref.kind === 'object') {
      const o = this.objects.get(ref.id);
      if (!o || o.accountId !== accountId || o.homeId !== homeId) return null;
      return {
        stored: o,
        createdAt: o.createdAt,
        name: o.name,
        item: () => ({
          ref: { kind: 'object', id: o.id },
          homeId: o.homeId,
          name: o.name,
          type: o.type as CatalogItem['type'],
          kindLabel: 'Oggetto',
          note: o.note,
          state: o.state,
          version: o.version,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          permissions: perms.includes('edit') ? ['read', 'edit'] : ['read'],
          position: this.position(accountId, homeId, ref, perms),
          technicalLink: null,
        }),
      };
    }
    const b = this.access.boilers(accountId, homeId).find((x) => x.id === ref.id);
    if (!b) return null;
    return {
      createdAt: b.createdAt,
      name: b.name,
      item: () => ({
        ref: { kind: 'boiler', id: b.id },
        name: b.name,
        type: 'boiler',
        kindLabel: 'Caldaia',
        state: 'active',
        permissions: perms.includes('edit') ? ['read', 'edit'] : ['read'],
        position: this.position(accountId, homeId, ref, perms),
        technicalLink: { assetId: b.id },
      }),
    };
  }

  private resource(accountId: string, homeId: string, type: G1ResourceType, id: string): Resource | null {
    return type === 'document' ? this.access.document(accountId, homeId, id) : type === 'expense' ? this.access.expense(accountId, homeId, id) : this.access.activity(accountId, homeId, id);
  }

  private linkView(l: StoredLink): LinkedResource {
    const r = this.resource(l.accountId, l.homeId, l.resourceType, l.resourceId);
    return {
      linkId: l.linkId,
      version: l.version,
      origin: 'reference',
      state: l.state === 'removed' ? 'removed' : r ? 'active' : 'unavailable',
      resourceType: l.resourceType,
      resource: r && l.state === 'active' ? { id: r.id, title: r.title } : null,
      objectRef: l.ref,
    };
  }

  // ---- ingresso ----

  async handle(req: Req, accountId: string, homeId: string, rest: string): Promise<Res> {
    if (!this.enabled) return err(404, 'not_found', 'Risorsa non trovata.');
    const perms = this.access.perms(accountId, homeId);
    if (!perms || !perms.includes('read')) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (this.unavailable) return err(503, 'SERVICE_UNAVAILABLE', 'Ambienti e oggetti non disponibili.');
    const [path, query = ''] = rest.split('?');
    const parts = path!.split('/').filter(Boolean).map(decodeURIComponent);
    const isPost = req.method === 'POST';
    if (isPost && !perms.includes('edit')) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    const params = new URLSearchParams(query);
    for (const k of new Set(params.keys())) if (params.getAll(k).length > 1) return err(422, 'validation_error', 'Parametro ripetuto.');
    const onlyParams = (allowed: string[]) => [...params.keys()].every((k) => allowed.includes(k));

    if (parts[0] === 'object-capabilities' && !isPost && parts.length === 1) {
      if (params.size) return err(422, 'validation_error', 'Parametro non ammesso.');
      return {
        status: 200,
        body: {
          apiVersion: 'home-objects-v1',
          enabled: true,
          isSimulation: false,
          limits: { nameMaxCodePoints: 120, roomNameMaxCodePoints: 80, noteMaxCodePoints: 500, maxRoomsPerObject: 20, maxPageSize: 50 },
          types: OBJECT_TYPES,
          roomTypes: ROOM_TYPES,
        },
      };
    }

    if (parts[0] === 'rooms') {
      if (parts.length === 1) {
        if (isPost) return this.createRoom(req, accountId, homeId, perms);
        if (!onlyParams(['state', 'limit', 'cursor'])) return err(422, 'validation_error', 'Parametro non ammesso.');
        const state = params.get('state') ?? 'active';
        if (!['active', 'archived', 'all'].includes(state)) return err(422, 'validation_error', 'Stato non valido.');
        const rows = [...this.rooms.values()]
          .filter((r) => r.homeId === homeId && (state === 'all' || r.state === state))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
          .map((r) => this.roomView(r, perms));
        return this.page(rows, params, `r:${accountId}:${homeId}:${state}`);
      }
      const id = parts[1]!;
      if (!UUID_RE.test(id)) return err(422, 'validation_error', 'Identificativo non valido.');
      const room = this.rooms.get(id);
      if (!room || room.homeId !== homeId) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
      if (parts.length === 2 && !isPost) {
        if (params.size) return err(422, 'validation_error', 'Parametro non ammesso.');
        return { status: 200, body: { room: this.roomView(room, perms) } };
      }
      if (parts[2] === 'history' && !isPost) {
        if (!onlyParams(['limit', 'cursor'])) return err(422, 'validation_error', 'Parametro non ammesso.');
        return this.page([...(this.history.get(`room:${id}`) ?? [])].reverse(), params, `rh:${accountId}:${homeId}:${id}`);
      }
      if (isPost && ['updates', 'archive', 'restore'].includes(parts[2]!)) return this.mutateRoom(req, parts[2]!, room, accountId, homeId, perms);
      return err(404, 'not_found', 'Risorsa non trovata.');
    }

    if (parts[0] === 'objects') {
      if (parts.length === 1) {
        if (isPost) return this.createObject(req, accountId, homeId, perms);
        return this.catalog(params, accountId, homeId, perms);
      }
      const kind = parts[1] as ObjectKind;
      const id = parts[2] ?? '';
      if (!['object', 'boiler'].includes(kind) || !UUID_RE.test(id)) return err(422, 'validation_error', 'Riferimento non valido.');
      const ref: Ref = { kind, id };
      const found = this.find(accountId, homeId, ref);
      if (!found) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
      if (parts.length === 3 && !isPost) {
        if (params.size) return err(422, 'validation_error', 'Parametro non ammesso.');
        return { status: 200, body: { object: found.item() } };
      }
      const action = parts[3];
      if (action === 'history' && !isPost) {
        if (!onlyParams(['limit', 'cursor'])) return err(422, 'validation_error', 'Parametro non ammesso.');
        return this.page([...(this.history.get(`obj:${this.posKey(accountId, ref)}`) ?? [])].reverse(), params, `oh:${accountId}:${homeId}:${kind}:${id}`);
      }
      if (action === 'links' && parts.length === 4) {
        if (isPost) return this.createLink(req, accountId, homeId, ref, found, perms);
        return this.listLinks(params, accountId, homeId, ref);
      }
      if (action === 'links' && parts[5] === 'remove' && isPost) return this.removeLink(req, accountId, homeId, ref, parts[4]!);
      if (isPost && action === 'position') return this.setPosition(req, accountId, homeId, ref, found, perms);
      if (isPost && ['updates', 'archive', 'restore'].includes(action!)) {
        if (kind !== 'object') return err(422, 'validation_error', 'Le caldaie si aggiornano dalla scheda tecnica.');
        return this.mutateObject(req, action!, found.stored!, accountId, homeId, perms);
      }
      return err(404, 'not_found', 'Risorsa non trovata.');
    }
    return err(404, 'not_found', 'Risorsa non trovata.');
  }

  // ---- letture ----

  private page<T>(items: T[], params: URLSearchParams, scope: string): Res {
    const limit = params.has('limit') ? Number(params.get('limit')) : 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return err(422, 'validation_error', 'Limite non valido.');
    const cursor = params.get('cursor');
    let offset = 0;
    if (cursor) {
      const [cScope, cOffset] = cursor.split('@');
      if (cursor.length > 512 || cScope !== encodeURIComponent(scope) || !Number.isInteger(Number(cOffset))) return err(422, 'validation_error', 'Cursore non valido.');
      offset = Number(cOffset);
    }
    const page = items.slice(offset, offset + limit);
    const next = offset + limit < items.length ? `${encodeURIComponent(scope)}@${offset + limit}` : null;
    return { status: 200, body: { items: page, nextCursor: next } };
  }

  private catalog(params: URLSearchParams, accountId: string, homeId: string, perms: HomePermission[]): Res {
    if (![...params.keys()].every((k) => ['state', 'roomId', 'placement', 'q', 'type', 'limit', 'cursor'].includes(k))) {
      return err(422, 'validation_error', 'Parametro non ammesso.');
    }
    const state = params.get('state') ?? 'active';
    const placement = params.get('placement') ?? 'all';
    const roomId = params.get('roomId');
    const type = params.get('type');
    const q = (params.get('q') ?? '').normalize('NFC').trim();
    if (!['active', 'archived', 'all'].includes(state) || !['all', 'unplaced'].includes(placement)) return err(422, 'validation_error', 'Filtro non valido.');
    if (roomId && placement === 'unplaced') return err(422, 'validation_error', 'Ambiente e «da collocare» insieme non sono ammessi.');
    if (type && type !== 'boiler' && !OBJECT_TYPES.includes(type)) return err(422, 'validation_error', 'Tipo non valido.');
    if (cp(q) > 80) return err(422, 'validation_error', 'Ricerca troppo lunga.', { q: 'Massimo 80 caratteri.' });
    if (roomId) {
      if (!UUID_RE.test(roomId)) return err(422, 'validation_error', 'Ambiente non valido.');
      const r = this.rooms.get(roomId);
      if (!r || r.homeId !== homeId) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    }
    const refs: Array<{ ref: Ref; createdAt: string }> = [
      ...[...this.objects.values()].filter((o) => o.accountId === accountId && o.homeId === homeId).map((o) => ({ ref: { kind: 'object' as const, id: o.id }, createdAt: o.createdAt })),
      ...this.access.boilers(accountId, homeId).map((b) => ({ ref: { kind: 'boiler' as const, id: b.id }, createdAt: b.createdAt })),
    ];
    const needle = q.toLowerCase();
    const items = refs
      .map((r) => this.find(accountId, homeId, r.ref)!.item())
      .filter((i) => state === 'all' || i.state === state)
      .filter((i) => !type || i.type === type)
      .filter((i) => !needle || i.name.normalize('NFC').toLowerCase().includes(needle))
      .filter((i) => (roomId ? i.position.rooms.some((r) => r.id === roomId) : placement === 'unplaced' ? i.position.rooms.length === 0 : true))
      .map((i) => ({ i, createdAt: refs.find((r) => r.ref.id === i.ref.id)!.createdAt }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.i.ref.kind.localeCompare(b.i.ref.kind) || b.i.ref.id.localeCompare(a.i.ref.id))
      .map((x) => x.i);
    void perms;
    return this.page(items, params, `c:${accountId}:${homeId}:${state}:${roomId ?? '-'}:${placement}:${q}:${type ?? '-'}`);
  }

  private listLinks(params: URLSearchParams, accountId: string, homeId: string, ref: Ref): Res {
    if (![...params.keys()].every((k) => ['resourceType', 'limit', 'cursor'].includes(k))) return err(422, 'validation_error', 'Parametro non ammesso.');
    const type = params.get('resourceType') as G1ResourceType | null;
    if (!type || !['document', 'activity', 'expense'].includes(type)) return err(422, 'validation_error', 'resourceType obbligatorio.');
    const out: LinkedResource[] = [];
    const seen = new Set<string>();
    if (ref.kind === 'boiler') {
      const native: Resource[] =
        type === 'document'
          ? this.access
              .boilerDocuments(accountId, homeId, ref.id)
              .map((id) => this.access.document(accountId, homeId, id))
              .filter((d): d is Resource => !!d)
          : this.access.native(accountId, homeId, type, ref.id);
      for (const r of native) {
        seen.add(r.id);
        out.push({ linkId: null, version: null, origin: 'native', state: 'active', resourceType: type, resource: { id: r.id, title: r.title }, objectRef: ref });
      }
    }
    const refs = [...this.links.values()]
      .filter((l) => l.accountId === accountId && l.homeId === homeId && l.ref.kind === ref.kind && l.ref.id === ref.id && l.resourceType === type && l.state === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const l of refs) if (!seen.has(l.resourceId)) out.push(this.linkView(l));
    return this.page(out, params, `l:${accountId}:${homeId}:${ref.kind}:${ref.id}:${type}`);
  }

  // ---- scritture ----

  private withIdem(req: Req, scope: string, run: () => { status: number; body?: unknown; replay?: () => unknown }): Res {
    const key = req.headers['idempotency-key'];
    if (!key || !KEY_RE.test(key)) return err(422, 'validation_error', 'Idempotency-Key non valida.');
    const scoped = `${scope}:${key}`;
    const digest = JSON.stringify(req.body ?? {});
    const prev = this.idem.get(scoped);
    if (prev) {
      if (prev.digest !== digest) return err(409, 'idempotency_conflict', 'Chiave già usata con dati diversi.');
      return { status: prev.status, body: prev.replay() };
    }
    const res = run();
    if (res.status < 400 && res.replay) {
      this.idem.set(scoped, { digest, status: res.status, replay: res.replay });
      this.applied.push(scope);
    }
    return { status: res.status, body: res.body };
  }

  private text(body: Record<string, unknown>, key: string, max: number, required: boolean, fieldErrors: Record<string, string>) {
    if (!(key in body)) {
      if (required) fieldErrors[key] = 'Obbligatorio.';
      return undefined;
    }
    const v = body[key];
    if (typeof v !== 'string') {
      fieldErrors[key] = 'Testo non valido.';
      return undefined;
    }
    const t = v.normalize('NFC').trim();
    if (cp(t) < 1 || cp(t) > max) fieldErrors[key] = `Da 1 a ${max} caratteri.`;
    return t;
  }

  private note(body: Record<string, unknown>, fieldErrors: Record<string, string>) {
    if (!('note' in body)) return undefined;
    if (body.note === null) return null;
    if (typeof body.note !== 'string') {
      fieldErrors.note = 'Nota non valida.';
      return undefined;
    }
    const n = body.note.normalize('NFC').trim();
    if (cp(n) > 500) fieldErrors.note = 'Massimo 500 caratteri.';
    return n || null;
  }

  private unknownFields(body: Record<string, unknown>, allowed: string[], fieldErrors: Record<string, string>) {
    for (const k of Object.keys(body)) if (!allowed.includes(k)) fieldErrors[k] = 'Campo non ammesso.';
  }

  private createRoom(req: Req, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const fe: Record<string, string> = {};
    this.unknownFields(body, ['name', 'type', 'note'], fe);
    const name = this.text(body, 'name', 80, true, fe);
    if (!ROOM_TYPES.includes(body.type as string)) fe.type = 'Tipo non valido.';
    const note = this.note(body, fe);
    if (Object.keys(fe).length) return err(422, 'validation_error', 'Controlla i campi.', fe);
    return this.withIdem(req, `${homeId}:room:create:${accountId}`, () => {
      const at = this.stamp();
      const r: StoredRoom = { id: uuid(), homeId, name: name!, type: body.type as Room['type'], note: note ?? null, state: 'active', version: 1, createdAt: at, updatedAt: at };
      this.rooms.set(r.id, r);
      this.event(`room:${r.id}`, 'created', null, { ...r });
      return { status: 201, body: { room: this.roomView(r, perms) }, replay: () => ({ room: this.roomView(this.rooms.get(r.id)!, perms) }) };
    });
  }

  private mutateRoom(req: Req, action: string, room: StoredRoom, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1) return err(422, 'validation_error', 'Versione mancante.', { expectedVersion: 'Obbligatoria.' });
    const fe: Record<string, string> = {};
    this.unknownFields(body, action === 'updates' ? ['expectedVersion', 'name', 'type', 'note'] : ['expectedVersion'], fe);
    const name = action === 'updates' ? this.text(body, 'name', 80, false, fe) : undefined;
    if (action === 'updates' && 'type' in body && !ROOM_TYPES.includes(body.type as string)) fe.type = 'Tipo non valido.';
    const note = action === 'updates' ? this.note(body, fe) : undefined;
    if (action === 'updates' && !['name', 'type', 'note'].some((k) => k in body)) fe.name = 'Nessun campo da modificare.';
    if (Object.keys(fe).length) return err(422, 'validation_error', 'Controlla i campi.', fe);
    return this.withIdem(req, `${homeId}:room:${action}:${room.id}:${accountId}`, () => {
      if (ev !== room.version) return err(409, 'room_version_conflict', 'Ambiente cambiato: rileggi.');
      const before = { ...room };
      if (action === 'updates') {
        if (room.state !== 'active') return err(409, 'resource_state_conflict', 'Ambiente archiviato.');
        const next = { name: name ?? room.name, type: ('type' in body ? body.type : room.type) as Room['type'], note: note === undefined ? room.note : note };
        if (next.name !== room.name || next.type !== room.type || next.note !== room.note) {
          Object.assign(room, next, { version: room.version + 1, updatedAt: this.stamp() });
          this.event(`room:${room.id}`, 'updated', before, { ...room });
        }
      } else {
        if ((action === 'archive') !== (room.state === 'active')) return err(409, 'resource_state_conflict', 'Stato non compatibile.');
        Object.assign(room, { state: action === 'archive' ? 'archived' : 'active', version: room.version + 1, updatedAt: this.stamp() });
        this.event(`room:${room.id}`, action === 'archive' ? 'archived' : 'restored', before, { ...room });
      }
      return { status: 200, body: { room: this.roomView(room, perms) }, replay: () => ({ room: this.roomView(this.rooms.get(room.id)!, perms) }) };
    });
  }

  private roomIds(body: Record<string, unknown>, homeId: string, fe: Record<string, string>, allowArchivedFrom: string[] = []) {
    const v = body.roomIds;
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !UUID_RE.test(x))) {
      fe.roomIds = 'Elenco di ambienti non valido.';
      return null;
    }
    const ids = [...new Set(v as string[])];
    if (ids.length !== v.length) fe.roomIds = 'Ambienti ripetuti.';
    if (ids.length > 20) fe.roomIds = 'Al massimo 20 ambienti.';
    for (const id of ids) {
      const r = this.rooms.get(id);
      if (!r || r.homeId !== homeId) return 'forbidden' as const;
      if (r.state !== 'active' && !allowArchivedFrom.includes(id)) fe.roomIds = 'Solo ambienti attivi per nuove assegnazioni.';
    }
    return ids.sort();
  }

  private createObject(req: Req, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const fe: Record<string, string> = {};
    this.unknownFields(body, ['name', 'type', 'note', 'roomIds'], fe);
    const name = this.text(body, 'name', 120, true, fe);
    if (!OBJECT_TYPES.includes(body.type as string)) fe.type = 'Tipo non valido.';
    const note = this.note(body, fe);
    const ids = 'roomIds' in body ? this.roomIds(body, homeId, fe) : [];
    if (ids === 'forbidden') return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (Object.keys(fe).length) return err(422, 'validation_error', 'Controlla i campi.', fe);
    return this.withIdem(req, `${accountId}:${homeId}:object:create`, () => {
      const at = this.stamp();
      const o: StoredObject = { id: uuid(), homeId, accountId, name: name!, type: body.type as string, note: note ?? null, state: 'active', version: 1, createdAt: at, updatedAt: at };
      this.objects.set(o.id, o);
      const ref: Ref = { kind: 'object', id: o.id };
      // Posizione atomica con la creazione; vuota = versione 0, nessun evento di posizione.
      if (ids && ids.length) this.positions.set(this.posKey(accountId, ref), { version: 1, roomIds: ids });
      this.event(`obj:${this.posKey(accountId, ref)}`, 'created', null, { name: o.name, type: o.type, note: o.note, state: o.state, rooms: this.position(accountId, homeId, ref, perms).rooms });
      const view = () => this.find(accountId, homeId, ref)!.item();
      return { status: 201, body: { object: view() }, replay: () => ({ object: view() }) };
    });
  }

  private mutateObject(req: Req, action: string, o: StoredObject, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1) return err(422, 'validation_error', 'Versione mancante.', { expectedVersion: 'Obbligatoria.' });
    const fe: Record<string, string> = {};
    this.unknownFields(body, action === 'updates' ? ['expectedVersion', 'name', 'type', 'note'] : ['expectedVersion'], fe);
    const name = action === 'updates' ? this.text(body, 'name', 120, false, fe) : undefined;
    if (action === 'updates' && 'type' in body && !OBJECT_TYPES.includes(body.type as string)) fe.type = 'Tipo non valido.';
    const note = action === 'updates' ? this.note(body, fe) : undefined;
    if (action === 'updates' && !['name', 'type', 'note'].some((k) => k in body)) fe.name = 'Nessun campo da modificare.';
    if (Object.keys(fe).length) return err(422, 'validation_error', 'Controlla i campi.', fe);
    const ref: Ref = { kind: 'object', id: o.id };
    const key = `obj:${this.posKey(accountId, ref)}`;
    void perms;
    return this.withIdem(req, `${accountId}:${homeId}:object:${action}:${o.id}`, () => {
      if (ev !== o.version) return err(409, 'object_version_conflict', 'Oggetto cambiato: rileggi.');
      const before = { name: o.name, type: o.type, note: o.note, state: o.state };
      if (action === 'updates') {
        if (o.state !== 'active') return err(409, 'resource_state_conflict', 'Oggetto archiviato.');
        const next = { name: name ?? o.name, type: ('type' in body ? body.type : o.type) as string, note: note === undefined ? o.note : note };
        if (next.name !== o.name || next.type !== o.type || next.note !== o.note) {
          Object.assign(o, next, { version: o.version + 1, updatedAt: this.stamp() });
          this.event(key, 'updated', before, { name: o.name, type: o.type, note: o.note, state: o.state });
        }
      } else {
        if ((action === 'archive') !== (o.state === 'active')) return err(409, 'resource_state_conflict', 'Stato non compatibile.');
        Object.assign(o, { state: action === 'archive' ? 'archived' : 'active', version: o.version + 1, updatedAt: this.stamp() });
        this.event(key, action === 'archive' ? 'archived' : 'restored', before, { name: o.name, type: o.type, note: o.note, state: o.state });
      }
      const view = () => this.find(accountId, homeId, ref)!.item();
      return { status: 200, body: { object: view() }, replay: () => ({ object: view() }) };
    });
  }

  private setPosition(req: Req, accountId: string, homeId: string, ref: Ref, found: NonNullable<ReturnType<FakeObjects['find']>>, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 0) return err(422, 'validation_error', 'Versione mancante.', { expectedVersion: 'Obbligatoria.' });
    const fe: Record<string, string> = {};
    this.unknownFields(body, ['expectedVersion', 'roomIds'], fe);
    const pk = this.posKey(accountId, ref);
    const current = this.positions.get(pk) ?? { version: 0, roomIds: [] };
    const ids = this.roomIds(body, homeId, fe, current.roomIds);
    if (ids === 'forbidden') return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (Object.keys(fe).length) return err(422, 'validation_error', 'Controlla i campi.', fe);
    if (found.stored && found.stored.state !== 'active') return err(409, 'resource_state_conflict', 'Oggetto archiviato.');
    return this.withIdem(req, `${accountId}:${homeId}:position:${ref.kind}:${ref.id}`, () => {
      const cur = this.positions.get(pk) ?? { version: 0, roomIds: [] };
      if (ev !== cur.version) return err(409, 'placement_version_conflict', 'Posizione cambiata: rileggi.');
      const same = cur.roomIds.length === ids!.length && cur.roomIds.every((r, i) => r === ids![i]);
      if (!same) {
        const before = this.position(accountId, homeId, ref, perms).rooms;
        this.positions.set(pk, { version: cur.version + 1, roomIds: ids! });
        this.event(`obj:${pk}`, 'position', { rooms: before }, { rooms: this.position(accountId, homeId, ref, perms).rooms });
      }
      const view = () => this.find(accountId, homeId, ref)!.item();
      return { status: 200, body: { object: view() }, replay: () => ({ object: view() }) };
    });
  }

  private createLink(req: Req, accountId: string, homeId: string, ref: Ref, found: NonNullable<ReturnType<FakeObjects['find']>>, perms: HomePermission[]): Res {
    void perms;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const fe: Record<string, string> = {};
    this.unknownFields(body, ['resourceType', 'resourceId'], fe);
    const type = body.resourceType as G1ResourceType;
    if (!['document', 'activity', 'expense'].includes(type)) fe.resourceType = 'Tipo non valido.';
    if (typeof body.resourceId !== 'string' || !UUID_RE.test(body.resourceId)) fe.resourceId = 'Identificativo non valido.';
    if (Object.keys(fe).length) return err(422, 'validation_error', 'Controlla i campi.', fe);
    const resourceId = body.resourceId as string;
    const resource = this.resource(accountId, homeId, type, resourceId);
    if (!resource) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (found.stored && found.stored.state !== 'active') return err(409, 'resource_state_conflict', 'Oggetto archiviato.');
    return this.withIdem(req, `${accountId}:${homeId}:link:${ref.kind}:${ref.id}`, () => {
      // Costo/attività con caldaia nativa: appartiene già a quella scheda.
      if (type !== 'document' && resource.assetId && !(ref.kind === 'boiler' && ref.id === resource.assetId)) {
        return err(409, 'resource_already_linked', 'Risorsa già legata a una caldaia.');
      }
      const existing = [...this.links.values()].find((l) => l.accountId === accountId && l.resourceType === type && l.resourceId === resourceId && l.state === 'active');
      if (existing) {
        const sameTarget = existing.ref.kind === ref.kind && existing.ref.id === ref.id;
        if (sameTarget) return { status: 201, body: { link: this.linkView(existing) }, replay: () => ({ link: this.linkView(existing) }) };
        if (type !== 'document') return err(409, 'resource_already_linked', 'Risorsa già collegata a un altro oggetto.');
      }
      const l: StoredLink = { linkId: uuid(), accountId, homeId, ref, resourceType: type, resourceId, state: 'active', version: 1, createdAt: this.stamp() };
      this.links.set(l.linkId, l);
      this.event(`obj:${this.posKey(accountId, ref)}`, 'linked', null, { resourceType: type });
      return { status: 201, body: { link: this.linkView(l) }, replay: () => ({ link: this.linkView(this.links.get(l.linkId)!) }) };
    });
  }

  private removeLink(req: Req, accountId: string, homeId: string, ref: Ref, linkId: string): Res {
    if (!UUID_RE.test(linkId)) return err(422, 'validation_error', 'Identificativo non valido.');
    const l = this.links.get(linkId);
    if (!l || l.accountId !== accountId || l.homeId !== homeId || l.ref.id !== ref.id || l.ref.kind !== ref.kind) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1 || Object.keys(body).some((k) => k !== 'expectedVersion')) {
      return err(422, 'validation_error', 'Versione mancante.', { expectedVersion: 'Obbligatoria.' });
    }
    return this.withIdem(req, `${accountId}:${homeId}:unlink:${linkId}`, () => {
      if (ev !== l.version) return err(409, 'link_version_conflict', 'Collegamento cambiato: rileggi.');
      if (l.state !== 'active') return err(409, 'resource_state_conflict', 'Collegamento già rimosso.');
      Object.assign(l, { state: 'removed', version: l.version + 1 });
      this.event(`obj:${this.posKey(accountId, ref)}`, 'unlinked', { resourceType: l.resourceType }, null);
      return { status: 200, body: { link: this.linkView(l) }, replay: () => ({ link: this.linkView(l) }) };
    });
  }
}
