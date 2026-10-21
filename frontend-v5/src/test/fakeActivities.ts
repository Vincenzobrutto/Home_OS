// BACKEND SIMULATO activities-v1 (H1) — SOLO TEST E HARNESS, NON È IL BACKEND REALE.
// Orologio controllato dal test (`today`), fuso dichiarato Europe/Rome: nessun uso di Date.now
// per lo stato temporale. Sintassi "erasable": eseguito anche da Node in scripts/mock-api.ts.

import type {
  ActivityHistoryEvent,
  ActivityHistorySnapshot,
  ActivityState,
  AssetLink,
  DueState,
  HomeActivity,
  HomePermission,
} from '../api/types';

type Req = { method: string; path: string; headers: Record<string, string | undefined>; body: unknown };
type Res = { status: number; body?: unknown };

export type ActivityAccess = {
  perms(accountId: string, homeId: string): HomePermission[] | null;
  /** Caldaia della stessa casa, del richiedente e leggibile (regole M3/M4). */
  asset(accountId: string, homeId: string, assetId: string): { id: string; name: string } | null;
};

type Stored = Omit<HomeActivity, 'dueState' | 'assetLink' | 'permissions'> & { accountId: string; assetId: string | null };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^[A-Za-z0-9_-]{16,100}$/;
const cp = (s: string) => [...s].length;
const uuid = () => globalThis.crypto.randomUUID();

function err(status: number, code: string, message: string, fieldErrors?: Record<string, string>): Res {
  return { status, body: { error: { code, message, fieldErrors, requestId: uuid() } } };
}

function validDate(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return y >= 1 && mo >= 1 && mo <= 12 && d >= 1 && days !== undefined && d <= days;
}

function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const t = new Date(0);
  t.setUTCFullYear(y, m - 1, d + n); // gestisce mesi, anni e bisestili reali
  return `${String(t.getUTCFullYear()).padStart(4, '0')}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

export class FakeActivities {
  items = new Map<string, Stored>();
  history = new Map<string, ActivityHistoryEvent[]>();
  idem = new Map<string, { digest: string; res: Res; assetIds: string[] }>();
  /** Data di calendario corrente a Roma, controllata dal test. */
  today = '2026-10-13';
  /** false = backend senza H1 (404, come M1–M4). */
  enabled = true;
  /** Simula activity_unavailable (503) solo sulle rotte H1. */
  unavailable = false;
  /** Caldaie che il richiedente non può più leggere (collegamento «unavailable»). */
  unreadableAssets = new Set<string>();
  private seq = 0;
  private readonly access: ActivityAccess;

  constructor(access: ActivityAccess) {
    this.access = access;
  }

  private stamp() {
    this.seq += 1;
    return new Date(Date.parse(`${this.today}T10:00:00Z`) + this.seq * 1000).toISOString();
  }

  private temporal() {
    return { asOf: this.stamp(), today: this.today, timeZone: 'Europe/Rome' as const };
  }

  private link(accountId: string, homeId: string, assetId: string | null): AssetLink {
    if (!assetId) return { state: 'none', asset: null };
    const a = this.unreadableAssets.has(assetId) ? null : this.access.asset(accountId, homeId, assetId);
    return a ? { state: 'linked', asset: { id: a.id, name: a.name } } : { state: 'unavailable', asset: null };
  }

  private dueState(s: Stored): DueState {
    if (s.state !== 'open') return 'closed';
    if (!s.dueDate) return 'undated';
    return s.dueDate < this.today ? 'overdue' : s.dueDate === this.today ? 'today' : 'upcoming';
  }

  private view(s: Stored, perms: HomePermission[]): HomeActivity {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accountId, assetId, ...rest } = s;
    return {
      ...rest,
      dueState: this.dueState(s),
      assetLink: this.link(s.accountId, s.homeId, s.assetId),
      permissions: perms.includes('edit') ? ['read', 'edit'] : ['read'],
    };
  }

  private snapshot(s: Stored): ActivityHistorySnapshot {
    return {
      title: s.title,
      description: s.description,
      dueDate: s.dueDate,
      state: s.state,
      assetLink: this.link(s.accountId, s.homeId, s.assetId),
    };
  }

  async handle(req: Req, accountId: string, homeId: string, rest: string): Promise<Res> {
    if (!this.enabled) return err(404, 'not_found', 'Risorsa non trovata.');
    const perms = this.access.perms(accountId, homeId);
    if (!perms || !perms.includes('read')) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (this.unavailable) return err(503, 'activity_unavailable', 'Attività non disponibili.');
    const [path, query = ''] = rest.split('?');
    const parts = path!.split('/').filter(Boolean).map(decodeURIComponent);
    const isPost = req.method === 'POST';
    if (isPost && !perms.includes('edit')) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    const params = new URLSearchParams(query);

    if (parts[0] === 'activity-capabilities' && !isPost) {
      return {
        status: 200,
        body: {
          ...this.temporal(),
          apiVersion: 'activities-v1',
          enabled: true,
          isSimulation: false,
          limits: { titleMaxCodePoints: 120, descriptionMaxCodePoints: 2000, noteMaxCodePoints: 500, soonDays: 7, maxHomePreviewItems: 3 },
        },
      };
    }
    if (parts[0] === 'activity-summary' && !isPost) return this.summary(accountId, homeId, perms);
    if (parts[0] !== 'activities') return err(404, 'not_found', 'Risorsa non trovata.');
    if (parts.length === 1) return isPost ? this.create(req, accountId, homeId, perms) : this.list(params, accountId, homeId, perms);
    const id = parts[1]!;
    if (!UUID_RE.test(id)) return err(422, 'validation_error', 'Identificativo non valido.');
    const s = this.items.get(id);
    if (!s || s.accountId !== accountId || s.homeId !== homeId) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (parts.length === 2 && !isPost) return { status: 200, body: { ...this.temporal(), activity: this.view(s, perms) } };
    if (parts[2] === 'history' && !isPost) {
      const events = [...(this.history.get(id) ?? [])].reverse();
      return this.page(events, params, `h:${accountId}:${homeId}:${id}`);
    }
    if (isPost && ['updates', 'complete', 'cancel', 'reopen'].includes(parts[2]!)) {
      return this.mutate(req, parts[2] as 'updates' | 'complete' | 'cancel' | 'reopen', s, accountId, homeId, perms);
    }
    return err(404, 'not_found', 'Risorsa non trovata.');
  }

  // ---- letture ----

  private page<T>(items: T[], params: URLSearchParams, scope: string, extra: Record<string, unknown> = {}): Res {
    const limit = params.has('limit') ? Number(params.get('limit')) : 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return err(422, 'validation_error', 'Limite non valido.');
    const cursor = params.get('cursor');
    let offset = 0;
    if (cursor) {
      const [cScope, cOffset] = cursor.split('@');
      // Cursore legato a account/casa/risorsa/filtri: altrove è 422.
      if (cScope !== encodeURIComponent(scope) || !Number.isInteger(Number(cOffset))) return err(422, 'validation_error', 'Cursore non valido.');
      offset = Number(cOffset);
    }
    const page = items.slice(offset, offset + limit);
    const next = offset + limit < items.length ? `${encodeURIComponent(scope)}@${offset + limit}` : null;
    return { status: 200, body: { ...extra, items: page, nextCursor: next } };
  }

  private mine(accountId: string, homeId: string) {
    return [...this.items.values()].filter((s) => s.accountId === accountId && s.homeId === homeId);
  }

  private openOrder(a: Stored, b: Stored) {
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
  }

  private list(params: URLSearchParams, accountId: string, homeId: string, perms: HomePermission[]): Res {
    for (const k of params.keys()) {
      if (!['state', 'due', 'assetId', 'q', 'limit', 'cursor'].includes(k)) return err(422, 'validation_error', 'Parametro non valido.');
    }
    const state = params.get('state') ?? 'open';
    const due = params.get('due') ?? 'all';
    const assetId = params.get('assetId');
    const q = (params.get('q') ?? '').trim().normalize('NFC');
    if ([...q].length > 120) return err(422, 'validation_error', 'Ricerca troppo lunga.');
    if (!['open', 'completed', 'cancelled', 'all'].includes(state)) return err(422, 'validation_error', 'Stato non valido.');
    if (!['all', 'overdue', 'today', 'upcoming', 'undated'].includes(due)) return err(422, 'validation_error', 'Scadenza non valida.');
    if (due !== 'all' && state !== 'open') return err(422, 'validation_error', 'Il filtro scadenza vale solo per le aperte.');
    if (assetId && (!UUID_RE.test(assetId) || !this.access.asset(accountId, homeId, assetId))) {
      return assetId && UUID_RE.test(assetId) ? err(403, 'FORBIDDEN', 'Accesso non consentito.') : err(422, 'validation_error', 'Caldaia non valida.');
    }
    let rows = this.mine(accountId, homeId).filter((s) => (assetId ? s.assetId === assetId : true) && (!q || s.title.toLocaleLowerCase('it').includes(q.toLocaleLowerCase('it'))));
    const byState = (st: ActivityState) => rows.filter((s) => s.state === st);
    const open = byState('open').sort((a, b) => this.openOrder(a, b));
    const closedOrder = (key: 'completedAt' | 'cancelledAt') => (a: Stored, b: Stored) =>
      (b[key] ?? '').localeCompare(a[key] ?? '') || a.id.localeCompare(b.id);
    const completed = byState('completed').sort(closedOrder('completedAt'));
    const cancelled = byState('cancelled').sort(closedOrder('cancelledAt'));
    rows =
      state === 'open' ? open : state === 'completed' ? completed : state === 'cancelled' ? cancelled : [...open, ...completed, ...cancelled];
    if (due !== 'all') rows = rows.filter((s) => this.dueState(s) === due);
    return this.page(
      rows.map((s) => this.view(s, perms)),
      params,
      `l:${accountId}:${homeId}:${state}:${due}:${assetId ?? '-'}:${q}`,
      {...this.temporal(), total: rows.length},
    );
  }

  private summary(accountId: string, homeId: string, perms: HomePermission[]): Res {
    const open = this.mine(accountId, homeId).filter((s) => s.state === 'open');
    const counts = { overdue: 0, today: 0, upcoming: 0, undated: 0 };
    for (const s of open) counts[this.dueState(s) as keyof typeof counts] += 1;
    const limit = addDays(this.today, 7);
    const nextItems = open
      .filter((s) => s.dueDate && s.dueDate <= limit)
      .sort((a, b) => this.openOrder(a, b))
      .slice(0, 3)
      .map((s) => this.view(s, perms));
    return { status: 200, body: { ...this.temporal(), counts, nextItems } };
  }

  // ---- scritture ----

  private parseFields(body: Record<string, unknown>, allowed: string[], accountId: string, homeId: string) {
    const fieldErrors: Record<string, string> = {};
    for (const k of Object.keys(body)) if (!allowed.includes(k)) fieldErrors[k] = 'Campo non ammesso.';
    const out: { title?: string; description?: string | null; dueDate?: string | null; assetId?: string | null; note?: string } = {};
    if ('title' in body) {
      const t = typeof body.title === 'string' ? body.title.normalize('NFC').trim() : '';
      if (cp(t) < 1 || cp(t) > 120) fieldErrors.title = 'Titolo da 1 a 120 caratteri.';
      else out.title = t;
    }
    if ('description' in body) {
      if (body.description === null) out.description = null;
      else if (typeof body.description !== 'string') fieldErrors.description = 'Descrizione non valida.';
      else {
        const d = body.description.normalize('NFC').trim();
        if (cp(d) > 2000) fieldErrors.description = 'Massimo 2000 caratteri.';
        else out.description = d || null;
      }
    }
    if ('dueDate' in body) {
      if (body.dueDate === null) out.dueDate = null;
      else if (typeof body.dueDate !== 'string' || !validDate(body.dueDate)) fieldErrors.dueDate = 'Data non valida.';
      else out.dueDate = body.dueDate;
    }
    if ('assetId' in body) {
      if (body.assetId === null) out.assetId = null;
      else if (typeof body.assetId !== 'string' || !UUID_RE.test(body.assetId)) fieldErrors.assetId = 'Caldaia non valida.';
      else if (this.unreadableAssets.has(body.assetId) || !this.access.asset(accountId, homeId, body.assetId)) return { forbidden: true as const };
      else out.assetId = body.assetId;
    }
    if ('note' in body) {
      const n = typeof body.note === 'string' ? body.note.normalize('NFC').trim() : '';
      if (cp(n) > 500) fieldErrors.note = 'Massimo 500 caratteri.';
      else if (n) out.note = n;
    }
    return { out, fieldErrors };
  }

  /** Idempotenza: replay della stessa chiave/payload restituisce la risposta originale, ricontrollando i riferimenti. */
  private withIdem(req: Req, scope: string, accountId: string, homeId: string, run: () => { res: Res; assetIds: string[] }): Res {
    const key = req.headers['idempotency-key'];
    if (!key || !KEY_RE.test(key)) return err(422, 'validation_error', 'Idempotency-Key non valida.');
    const scoped = `${scope}:${key}`;
    const digest = JSON.stringify(req.body ?? {});
    const prev = this.idem.get(scoped);
    if (prev) {
      if (prev.digest !== digest) return err(409, 'idempotency_conflict', 'Chiave già usata con dati diversi.');
      if (prev.assetIds.some((a) => this.unreadableAssets.has(a) || !this.access.asset(accountId, homeId, a))) {
        return err(403, 'FORBIDDEN', 'Accesso non consentito.');
      }
      return prev.res;
    }
    const { res, assetIds } = run();
    if (res.status < 400) this.idem.set(scoped, { digest, res, assetIds });
    return { ...res };
  }

  private event(s: Stored, kind: ActivityHistoryEvent['kind'], before: ActivityHistorySnapshot | null, note: string | null, at: string) {
    const list = this.history.get(s.id) ?? [];
    list.push({ id: uuid(), activityId: s.id, at, kind, origin: 'explicit_user', note, before, after: this.snapshot(s) });
    this.history.set(s.id, list);
  }

  private create(req: Req, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body !== 'object' || Array.isArray(body)) return err(422, 'validation_error', 'Dati non validi.');
    if (!('title' in body)) return err(422, 'validation_error', 'Titolo obbligatorio.', { title: 'Titolo obbligatorio.' });
    const parsed = this.parseFields(body, ['title', 'description', 'dueDate', 'assetId'], accountId, homeId);
    if ('forbidden' in parsed) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (Object.keys(parsed.fieldErrors).length) return err(422, 'validation_error', 'Controlla i campi.', parsed.fieldErrors);
    return this.withIdem(req, `${accountId}:${homeId}:create:-`, accountId, homeId, () => {
      const at = this.stamp();
      const s: Stored = {
        id: uuid(),
        homeId,
        accountId,
        title: parsed.out.title!,
        description: parsed.out.description ?? null,
        dueDate: parsed.out.dueDate ?? null,
        assetId: parsed.out.assetId ?? null,
        state: 'open',
        version: 1,
        origin: 'user_created',
        createdAt: at,
        updatedAt: at,
        completedAt: null,
        cancelledAt: null,
      };
      this.items.set(s.id, s);
      this.event(s, 'created', null, null, at);
      return { res: { status: 201, body: { ...this.temporal(), activity: this.view(s, perms) } }, assetIds: s.assetId ? [s.assetId] : [] };
    });
  }

  private mutate(
    req: Req,
    kind: 'updates' | 'complete' | 'cancel' | 'reopen',
    s: Stored,
    accountId: string,
    homeId: string,
    perms: HomePermission[],
  ): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const allowed = kind === 'updates' ? ['expectedVersion', 'title', 'description', 'dueDate', 'assetId'] : ['expectedVersion', 'note'];
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1) {
      return err(422, 'validation_error', 'Versione mancante.', { expectedVersion: 'Obbligatoria.' });
    }
    const parsed = this.parseFields(body, allowed.filter((k) => k !== 'expectedVersion').concat(['expectedVersion']), accountId, homeId);
    if ('forbidden' in parsed) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    delete parsed.fieldErrors.expectedVersion;
    if (Object.keys(parsed.fieldErrors).length) return err(422, 'validation_error', 'Controlla i campi.', parsed.fieldErrors);
    if (kind === 'updates' && !['title', 'description', 'dueDate', 'assetId'].some((k) => k in body)) {
      return err(422, 'validation_error', 'Nessun campo da modificare.');
    }
    return this.withIdem(req, `${accountId}:${homeId}:${kind}:${s.id}`, accountId, homeId, () => {
      if (ev !== s.version) return { res: err(409, 'activity_version_conflict', 'L’attività è cambiata: rileggi.'), assetIds: [] };
      const needOpen = kind !== 'reopen';
      if (needOpen !== (s.state === 'open')) return { res: err(409, 'invalid_activity_state', 'Stato non compatibile: rileggi.'), assetIds: [] };
      const before = this.snapshot(s);
      const at = this.stamp();
      const o = parsed.out;
      if (kind === 'updates') {
        const next = {
          title: o.title ?? s.title,
          description: 'description' in o ? (o.description ?? null) : s.description,
          dueDate: 'dueDate' in o ? (o.dueDate ?? null) : s.dueDate,
          assetId: 'assetId' in o ? (o.assetId ?? null) : s.assetId,
        };
        const same = next.title === s.title && next.description === s.description && next.dueDate === s.dueDate && next.assetId === s.assetId;
        if (!same) {
          Object.assign(s, next, { version: s.version + 1, updatedAt: at });
          this.event(s, 'updated', before, null, at);
        }
      } else {
        if (kind === 'complete') Object.assign(s, { state: 'completed', completedAt: at });
        if (kind === 'cancel') Object.assign(s, { state: 'cancelled', cancelledAt: at });
        if (kind === 'reopen') Object.assign(s, { state: 'open', completedAt: null, cancelledAt: null });
        Object.assign(s, { version: s.version + 1, updatedAt: at });
        this.event(s, kind === 'complete' ? 'completed' : kind === 'cancel' ? 'cancelled' : 'reopened', before, o.note ?? null, at);
      }
      return { res: { status: 200, body: { ...this.temporal(), activity: this.view(s, perms) } }, assetIds: s.assetId ? [s.assetId] : [] };
    });
  }
}
