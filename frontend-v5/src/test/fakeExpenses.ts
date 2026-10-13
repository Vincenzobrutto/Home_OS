// BACKEND SIMULATO expenses-v1 (H3a) — SOLO TEST E HARNESS, NON È IL BACKEND REALE.
// Orologio controllato dal test (`today`, Europe/Rome dichiarato). Sintassi "erasable":
// eseguito anche da Node in scripts/mock-api.ts.

import type {
  ExpenseAssetLink,
  ExpenseDocumentLink,
  ExpenseHistoryEvent,
  ExpenseSnapshot,
  HomeExpense,
  HomePermission,
} from '../api/types';

type Req = { method: string; path: string; headers: Record<string, string | undefined>; body: unknown };
type Res = { status: number; body?: unknown };

export type ExpenseAccess = {
  perms(accountId: string, homeId: string): HomePermission[] | null;
  /** Documento M2 della stessa casa leggibile dal richiedente. */
  document(accountId: string, homeId: string, documentId: string): { id: string; name: string } | null;
  /** Caldaia della stessa casa, del richiedente e leggibile (regole M3/M4). */
  asset(accountId: string, homeId: string, assetId: string): { id: string; name: string } | null;
};

type Stored = {
  id: string;
  homeId: string;
  accountId: string;
  title: string;
  amountCents: number;
  spentOn: string;
  note: string | null;
  documentId: string | null;
  assetId: string | null;
  state: 'active' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

type StoredEvent = { id: string; kind: ExpenseHistoryEvent['kind']; at: string; note: string | null; before: Stored | null; after: Stored };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^[A-Za-z0-9_-]{16,100}$/;
const cp = (s: string) => [...s].length;
const uuid = () => globalThis.crypto.randomUUID();
const MAX_CENTS = 999_999_999;

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

export class FakeExpenses {
  items = new Map<string, Stored>();
  history = new Map<string, StoredEvent[]>();
  idem = new Map<string, { digest: string; status: number; snapshot: Stored }>();
  /** Data di calendario corrente a Roma, controllata dal test. */
  today = '2026-10-13';
  /** false = backend senza H3 (404, come H1/H2). */
  enabled = true;
  /** Simula servizio non disponibile (503) solo sulle rotte H3. */
  unavailable = false;
  /** Riferimenti che il richiedente non può più leggere (collegamento «unavailable»). */
  unreadableDocuments = new Set<string>();
  unreadableAssets = new Set<string>();
  /** Registro delle mutazioni realmente applicate (per le prove di idempotenza). */
  applied: string[] = [];
  private seq = 0;
  private readonly access: ExpenseAccess;

  constructor(access: ExpenseAccess) {
    this.access = access;
  }

  private stamp() {
    this.seq += 1;
    return new Date(Date.parse(`${this.today}T10:00:00Z`) + this.seq * 1000).toISOString();
  }

  private docLink(s: Stored): ExpenseDocumentLink {
    if (!s.documentId) return { state: 'none', document: null };
    const d = this.unreadableDocuments.has(s.documentId) ? null : this.access.document(s.accountId, s.homeId, s.documentId);
    return d ? { state: 'linked', document: { id: d.id, name: d.name } } : { state: 'unavailable', document: null };
  }

  private assetLink(s: Stored): ExpenseAssetLink {
    if (!s.assetId) return { state: 'none', asset: null };
    const a = this.unreadableAssets.has(s.assetId) ? null : this.access.asset(s.accountId, s.homeId, s.assetId);
    return a ? { state: 'linked', asset: { id: a.id, name: a.name } } : { state: 'unavailable', asset: null };
  }

  private view(s: Stored, perms: HomePermission[]): HomeExpense {
    return {
      id: s.id,
      homeId: s.homeId,
      title: s.title,
      amountCents: s.amountCents,
      currency: 'EUR',
      spentOn: s.spentOn,
      note: s.note,
      // Origine derivata dal riferimento interno: resta «document» anche se il documento non è più leggibile.
      origin: s.documentId ? 'document' : 'manual',
      documentLink: this.docLink(s),
      assetLink: this.assetLink(s),
      state: s.state,
      version: s.version,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      archivedAt: s.archivedAt,
      permissions: perms.includes('edit') ? ['read', 'edit'] : ['read'],
    };
  }

  private snapshot(s: Stored): ExpenseSnapshot {
    return {
      title: s.title,
      amountCents: s.amountCents,
      currency: 'EUR',
      spentOn: s.spentOn,
      note: s.note,
      origin: s.documentId ? 'document' : 'manual',
      documentLink: this.docLink(s),
      assetLink: this.assetLink(s),
      state: s.state,
    };
  }

  async handle(req: Req, accountId: string, homeId: string, rest: string): Promise<Res> {
    if (!this.enabled) return err(404, 'not_found', 'Risorsa non trovata.');
    const perms = this.access.perms(accountId, homeId);
    if (!perms || !perms.includes('read')) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (this.unavailable) return err(503, 'SERVICE_UNAVAILABLE', 'Spese non disponibili.');
    const [path, query = ''] = rest.split('?');
    const parts = path!.split('/').filter(Boolean).map(decodeURIComponent);
    const isPost = req.method === 'POST';
    if (isPost && !perms.includes('edit')) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    const params = new URLSearchParams(query);
    for (const k of new Set(params.keys())) {
      if (params.getAll(k).length > 1) return err(422, 'validation_error', 'Parametro ripetuto.');
    }

    if (parts[0] === 'expense-capabilities' && !isPost && parts.length === 1) {
      if (params.size) return err(422, 'validation_error', 'Parametro non ammesso.');
      return {
        status: 200,
        body: {
          apiVersion: 'expenses-v1',
          enabled: true,
          isSimulation: false,
          currency: 'EUR',
          limits: { titleMaxCodePoints: 120, noteMaxCodePoints: 500, amountMaxCents: MAX_CENTS, maxPageSize: 50 },
          asOf: this.stamp(),
          today: this.today,
          timeZone: 'Europe/Rome',
        },
      };
    }
    if (parts[0] === 'expense-summary' && !isPost && parts.length === 1) return this.summary(params, accountId, homeId, perms);
    if (parts[0] !== 'expenses') return err(404, 'not_found', 'Risorsa non trovata.');
    if (parts.length === 1) return isPost ? this.create(req, accountId, homeId, perms) : this.list(params, accountId, homeId, perms);
    const id = parts[1]!;
    if (!UUID_RE.test(id)) return err(422, 'validation_error', 'Identificativo non valido.');
    const s = this.items.get(id);
    if (!s || s.accountId !== accountId || s.homeId !== homeId) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (parts.length === 2 && !isPost) {
      if (params.size) return err(422, 'validation_error', 'Parametro non ammesso.');
      return { status: 200, body: { expense: this.view(s, perms) } };
    }
    if (parts[2] === 'history' && !isPost && parts.length === 3) {
      for (const k of params.keys()) if (!['limit', 'cursor'].includes(k)) return err(422, 'validation_error', 'Parametro non ammesso.');
      const events = [...(this.history.get(id) ?? [])].reverse().map((e) => ({
        id: e.id,
        kind: e.kind,
        at: e.at,
        note: e.note,
        before: e.before ? this.snapshot(e.before) : null,
        after: this.snapshot(e.after),
      }));
      return this.page(events, params, `h:${accountId}:${homeId}:${id}`);
    }
    if (isPost && parts.length === 3 && ['updates', 'archive', 'restore'].includes(parts[2]!)) {
      return this.mutate(req, parts[2] as 'updates' | 'archive' | 'restore', s, accountId, homeId, perms);
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
      // Cursore legato a account/casa/risorsa/filtri, non al limit: altrove è 422.
      if (cursor.length > 512 || cScope !== encodeURIComponent(scope) || !Number.isInteger(Number(cOffset))) {
        return err(422, 'validation_error', 'Cursore non valido.');
      }
      offset = Number(cOffset);
    }
    const page = items.slice(offset, offset + limit);
    const next = offset + limit < items.length ? `${encodeURIComponent(scope)}@${offset + limit}` : null;
    return { status: 200, body: { items: page, nextCursor: next } };
  }

  private mine(accountId: string, homeId: string) {
    return [...this.items.values()].filter((s) => s.accountId === accountId && s.homeId === homeId);
  }

  private order(a: Stored, b: Stored) {
    return b.spentOn.localeCompare(a.spentOn) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
  }

  private list(params: URLSearchParams, accountId: string, homeId: string, perms: HomePermission[]): Res {
    for (const k of params.keys()) {
      if (!['state', 'year', 'source', 'assetId', 'documentId', 'limit', 'cursor'].includes(k)) {
        return err(422, 'validation_error', 'Parametro non ammesso.');
      }
    }
    const state = params.get('state') ?? 'active';
    const year = params.get('year');
    const source = params.get('source') ?? 'all';
    const assetId = params.get('assetId');
    const documentId = params.get('documentId');
    if (!['active', 'archived', 'all'].includes(state)) return err(422, 'validation_error', 'Stato non valido.');
    if (year !== null && !/^\d{4}$/.test(year)) return err(422, 'validation_error', 'Anno non valido.');
    if (!['all', 'manual', 'document'].includes(source)) return err(422, 'validation_error', 'Origine non valida.');
    for (const [ref, check] of [
      [assetId, (v: string) => this.access.asset(accountId, homeId, v)],
      [documentId, (v: string) => this.access.document(accountId, homeId, v)],
    ] as const) {
      if (ref === null) continue;
      if (!UUID_RE.test(ref)) return err(422, 'validation_error', 'Identificativo non valido.');
      if (!check(ref)) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    }
    const rows = this.mine(accountId, homeId)
      .filter((s) => state === 'all' || s.state === state)
      .filter((s) => !year || s.spentOn.startsWith(`${year}-`))
      .filter((s) => source === 'all' || (source === 'document') === !!s.documentId)
      .filter((s) => !assetId || s.assetId === assetId)
      .filter((s) => !documentId || s.documentId === documentId)
      .sort((a, b) => this.order(a, b));
    return this.page(
      rows.map((s) => this.view(s, perms)),
      params,
      `l:${accountId}:${homeId}:${state}:${year ?? '-'}:${source}:${assetId ?? '-'}:${documentId ?? '-'}`,
    );
  }

  private summary(params: URLSearchParams, accountId: string, homeId: string, perms: HomePermission[]): Res {
    for (const k of params.keys()) if (k !== 'year') return err(422, 'validation_error', 'Parametro non ammesso.');
    const year = params.get('year') ?? this.today.slice(0, 4);
    if (!/^\d{4}$/.test(year)) return err(422, 'validation_error', 'Anno non valido.');
    const rows = this.mine(accountId, homeId)
      .filter((s) => s.state === 'active' && s.spentOn.startsWith(`${year}-`))
      .sort((a, b) => this.order(a, b));
    const counts = { manual: 0, document: 0 };
    const totalsCents = { manual: 0, document: 0 };
    for (const s of rows) {
      const k = s.documentId ? 'document' : 'manual';
      counts[k] += 1;
      totalsCents[k] += s.amountCents; // interi: nessun float
    }
    return {
      status: 200,
      body: {
        year,
        counts,
        totalsCents,
        totalCents: totalsCents.manual + totalsCents.document,
        lastItems: rows.slice(0, 3).map((s) => this.view(s, perms)),
        asOf: this.stamp(),
        today: this.today,
        timeZone: 'Europe/Rome',
      },
    };
  }

  // ---- scritture ----

  private parseFields(body: Record<string, unknown>, allowed: string[], accountId: string, homeId: string) {
    const fieldErrors: Record<string, string> = {};
    for (const k of Object.keys(body)) if (!allowed.includes(k)) fieldErrors[k] = 'Campo non ammesso.';
    const out: Partial<Pick<Stored, 'title' | 'amountCents' | 'spentOn' | 'note' | 'documentId' | 'assetId'>> = {};
    if ('title' in body) {
      const t = typeof body.title === 'string' ? body.title.normalize('NFC').trim() : '';
      if (cp(t) < 1 || cp(t) > 120) fieldErrors.title = 'Titolo da 1 a 120 caratteri.';
      else out.title = t;
    }
    if ('amountCents' in body) {
      const a = body.amountCents;
      if (typeof a !== 'number' || !Number.isInteger(a) || a < 1 || a > MAX_CENTS) fieldErrors.amountCents = 'Importo non valido.';
      else out.amountCents = a;
    }
    if ('spentOn' in body) {
      const d = body.spentOn;
      if (typeof d !== 'string' || !validDate(d)) fieldErrors.spentOn = 'Data non valida.';
      else if (d > this.today) fieldErrors.spentOn = 'La data non può essere futura.';
      else out.spentOn = d;
    }
    if ('note' in body) {
      if (body.note === null) out.note = null;
      else if (typeof body.note !== 'string') fieldErrors.note = 'Nota non valida.';
      else {
        const n = body.note.normalize('NFC').trim();
        if (cp(n) > 500) fieldErrors.note = 'Massimo 500 caratteri.';
        else out.note = n || null;
      }
    }
    let forbidden = false;
    for (const key of ['documentId', 'assetId'] as const) {
      if (!(key in body)) continue;
      const v = body[key];
      if (v === null) out[key] = null;
      else if (typeof v !== 'string' || !UUID_RE.test(v)) fieldErrors[key] = 'Identificativo non valido.';
      else {
        const readable =
          key === 'documentId'
            ? !this.unreadableDocuments.has(v) && this.access.document(accountId, homeId, v)
            : !this.unreadableAssets.has(v) && this.access.asset(accountId, homeId, v);
        if (!readable) forbidden = true;
        else out[key] = v;
      }
    }
    return { out, fieldErrors, forbidden };
  }

  /**
   * Idempotenza: stessa chiave/body → stessa mutazione, risposta riproiettata con i
   * diritti attuali (riferimenti redatti), mai lo snapshot di link ormai vietati.
   */
  private withIdem(req: Req, scope: string, perms: HomePermission[], run: () => Res & { stored?: Stored }): Res {
    const key = req.headers['idempotency-key'];
    if (!key || !KEY_RE.test(key)) return err(422, 'validation_error', 'Idempotency-Key non valida.');
    const scoped = `${scope}:${key}`;
    const digest = JSON.stringify(req.body ?? {});
    const prev = this.idem.get(scoped);
    if (prev) {
      if (prev.digest !== digest) return err(409, 'idempotency_conflict', 'Chiave già usata con dati diversi.');
      return { status: prev.status, body: { expense: this.view(prev.snapshot, perms) } };
    }
    const res = run();
    if (res.stored) {
      this.idem.set(scoped, { digest, status: res.status, snapshot: { ...res.stored } });
      this.applied.push(scope);
    }
    return { status: res.status, body: res.body };
  }

  private event(s: Stored, kind: StoredEvent['kind'], before: Stored | null, note: string | null, at: string) {
    const list = this.history.get(s.id) ?? [];
    list.push({ id: uuid(), kind, at, note, before, after: { ...s } });
    this.history.set(s.id, list);
  }

  private create(req: Req, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body !== 'object' || Array.isArray(body)) return err(422, 'validation_error', 'Dati non validi.');
    const missing: Record<string, string> = {};
    for (const k of ['title', 'amountCents', 'spentOn']) if (!(k in body)) missing[k] = 'Obbligatorio.';
    if (Object.keys(missing).length) return err(422, 'validation_error', 'Campi obbligatori mancanti.', missing);
    const parsed = this.parseFields(body, ['title', 'amountCents', 'spentOn', 'note', 'documentId', 'assetId'], accountId, homeId);
    if (Object.keys(parsed.fieldErrors).length) return err(422, 'validation_error', 'Controlla i campi.', parsed.fieldErrors);
    if (parsed.forbidden) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    return this.withIdem(req, `${accountId}:${homeId}:create:-`, perms, () => {
      const at = this.stamp();
      const s: Stored = {
        id: uuid(),
        homeId,
        accountId,
        title: parsed.out.title!,
        amountCents: parsed.out.amountCents!,
        spentOn: parsed.out.spentOn!,
        note: parsed.out.note ?? null,
        documentId: parsed.out.documentId ?? null,
        assetId: parsed.out.assetId ?? null,
        state: 'active',
        version: 1,
        createdAt: at,
        updatedAt: at,
        archivedAt: null,
      };
      this.items.set(s.id, s);
      this.event(s, 'created', null, null, at);
      return { status: 201, body: { expense: this.view(s, perms) }, stored: s };
    });
  }

  private mutate(req: Req, kind: 'updates' | 'archive' | 'restore', s: Stored, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1) {
      return err(422, 'validation_error', 'Versione mancante.', { expectedVersion: 'Obbligatoria.' });
    }
    const editable = ['title', 'amountCents', 'spentOn', 'note', 'documentId', 'assetId'];
    const { expectedVersion: _ev, ...fields } = body;
    void _ev;
    if (kind === 'updates' && !editable.some((k) => k in fields)) return err(422, 'validation_error', 'Nessun campo da modificare.');
    // Nota dell'azione archive/restore: distinta dalla nota persistente della spesa.
    let actionNote: string | null = null;
    let parsed: ReturnType<FakeExpenses['parseFields']> | null = null;
    if (kind === 'updates') {
      parsed = this.parseFields(fields, editable, accountId, homeId);
      if (Object.keys(parsed.fieldErrors).length) return err(422, 'validation_error', 'Controlla i campi.', parsed.fieldErrors);
      if (parsed.forbidden) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    } else {
      for (const k of Object.keys(fields)) if (k !== 'note') return err(422, 'validation_error', 'Campo non ammesso.', { [k]: 'Campo non ammesso.' });
      if ('note' in fields) {
        const n = typeof fields.note === 'string' ? fields.note.normalize('NFC').trim() : null;
        if (n === null || cp(n) > 500) return err(422, 'validation_error', 'Nota non valida.', { note: 'Massimo 500 caratteri.' });
        actionNote = n || null;
      }
    }
    return this.withIdem(req, `${accountId}:${homeId}:${kind}:${s.id}`, perms, () => {
      if (ev !== s.version) return err(409, 'expense_version_conflict', 'La spesa è cambiata: rileggi.');
      const needActive = kind !== 'restore';
      if (needActive !== (s.state === 'active')) return err(409, 'expense_state_conflict', 'Stato non compatibile: rileggi.');
      const before = { ...s };
      const at = this.stamp();
      if (kind === 'updates') {
        const o = parsed!.out;
        const next = {
          title: o.title ?? s.title,
          amountCents: o.amountCents ?? s.amountCents,
          spentOn: o.spentOn ?? s.spentOn,
          note: 'note' in o ? (o.note ?? null) : s.note,
          documentId: 'documentId' in o ? (o.documentId ?? null) : s.documentId,
          assetId: 'assetId' in o ? (o.assetId ?? null) : s.assetId,
        };
        const same = (Object.keys(next) as Array<keyof typeof next>).every((k) => next[k] === s[k]);
        // No-op: nessun evento e nessuna nuova versione.
        if (!same) {
          Object.assign(s, next, { version: s.version + 1, updatedAt: at });
          this.event(s, 'updated', before, null, at);
        }
      } else {
        Object.assign(s, {
          state: kind === 'archive' ? 'archived' : 'active',
          archivedAt: kind === 'archive' ? at : null,
          version: s.version + 1,
          updatedAt: at,
        });
        this.event(s, kind === 'archive' ? 'archived' : 'restored', before, actionNote, at);
      }
      return { status: 200, body: { expense: this.view(s, perms) }, stored: s };
    });
  }
}
