// BACKEND SIMULATO economy-v1 (S1a/b) — SOLO TEST E HARNESS, NON È IL BACKEND REALE.
// Usa gli stessi record HomeExpense di FakeExpenses (nessun secondo registro) più metadati S1,
// e i collegamenti G1 di FakeObjects per objectLink. Somme con BigInt, proiettate come stringhe.
// Non implementa S1c (bozze/job): documentDrafts è sempre false.
// Sintassi "erasable": eseguito anche da Node in scripts/mock-api.ts.

import type { HomePermission } from '../api/types';
import type { FakeExpenses } from './fakeExpenses.ts';
import type { FakeObjects } from './fakeObjects.ts';

type Req = { method: string; path: string; headers: Record<string, string | undefined>; body: unknown };
type Res = { status: number; body?: unknown };
type Ref = { kind: 'object' | 'boiler'; id: string };
type Stored = FakeExpenses['items'] extends Map<string, infer S> ? S : never;
type Category = 'electricity' | 'gas' | 'water' | 'internet_services' | 'condominium_ordinary' | 'condominium_extraordinary' | 'insurance' | 'taxes' | 'maintenance' | 'repairs_works' | 'purchase_replacement' | 'financing' | 'other';
type Family = 'utilities' | 'condominium' | 'taxes_insurance' | 'maintenance_repairs' | 'works_purchases' | 'financing' | 'unclassified';

type Meta = {
  category: Category | null;
  supplier: string | null;
  documentNumber: string | null;
  documentDate: string | null;
  invoiceMonth?: string | null;
  competenceFrom: string | null;
  competenceTo: string | null;
  dueOn: string | null;
  amountOrigin: 'user_declared' | 'extraction_confirmed';
  workId: string | null;
};
type Work = { id: string; homeId: string; accountId: string; name: string; note: string | null; state: 'active' | 'archived'; version: number; createdAt: string; updatedAt: string; archivedAt: string | null };
type Snap = Record<string, unknown>;
type Event = { id: string; kind: 'created' | 'updated' | 'archived' | 'restored'; at: string; note: string | null; before: Snap | null; after: Snap };

type Cite = { documentId: string; documentVersion: number; sha256: string; page: number; excerpt: string };
type FakeJob = {
  id: string; homeId: string; accountId: string; version: number; state: 'queued' | 'running' | 'succeeded' | 'failed';
  documentId: string; draftId: string | null; errorCode: string | null; polls: number; forcedError: string | null; createdAt: string; updatedAt: string;
  provider: 'test_fixture_v1' | 'anthropic'; model: string | null;
  billing: { currency: 'USD'; maxReservedUsd: string; actualUsd: string | null; state: 'reserved' | 'settled' | 'uncertain' } | null;
};
type FakeDraft = {
  id: string; homeId: string; accountId: string; version: number; state: 'open' | 'parked' | 'confirmed'; documentId: string; kind: 'gas' | 'invoice';
  proposed: Record<string, { value: string; sources: Cite[] }>;
  candidates: Array<{ id: string; amountCents: number; role: string; label: string; sources: Cite[] }>;
  required: boolean; expenseId: string | null; createdAt: string; updatedAt: string;
  provider?: 'test_fixture_v1' | 'anthropic'; model?: string | null;
};
const JOB_MESSAGES: Record<string, string> = {
  provider_fixture_unsupported: 'Analisi di test disponibile solo per i PDF sintetici indicati. Puoi inserire il costo manualmente.',
  analysis_timeout: 'Analisi interrotta: puoi riprovare esplicitamente.',
  no_supported_economic_data: 'Nessun dato economico utilizzabile.',
};

export const CATEGORIES: Category[] =['electricity', 'gas', 'water', 'internet_services', 'condominium_ordinary', 'condominium_extraordinary', 'insurance', 'taxes', 'maintenance', 'repairs_works', 'purchase_replacement', 'financing', 'other'];
export const FAMILIES: Family[] = ['utilities', 'condominium', 'taxes_insurance', 'maintenance_repairs', 'works_purchases', 'financing', 'unclassified'];
const FAMILY_LABELS: Record<Family, string> = {
  utilities: 'Bollette', condominium: 'Condominio', taxes_insurance: 'Tasse e assicurazioni', maintenance_repairs: 'Manutenzione e riparazioni',
  works_purchases: 'Lavori e acquisti', financing: 'Mutuo e finanziamenti', unclassified: 'Altro / Non classificata',
};
const CATEGORY_LABELS: Record<Category, string> = {
  electricity: 'Energia elettrica', gas: 'Gas', water: 'Acqua', internet_services: 'Internet e servizi', condominium_ordinary: 'Condominio ordinario',
  condominium_extraordinary: 'Condominio straordinario', insurance: 'Assicurazione', taxes: 'Tributi', maintenance: 'Manutenzione',
  repairs_works: 'Riparazioni e lavori', purchase_replacement: 'Acquisti e sostituzioni', financing: 'Finanziamento', other: 'Altro',
};

export function familyOf(category: Category | null, workId: string | null): Family {
  if (category === null || category === 'other') return 'unclassified';
  if (category === 'repairs_works') return workId ? 'works_purchases' : 'maintenance_repairs';
  if (['electricity', 'gas', 'water', 'internet_services'].includes(category)) return 'utilities';
  if (category === 'condominium_ordinary') return 'condominium';
  if (category === 'taxes' || category === 'insurance') return 'taxes_insurance';
  if (category === 'maintenance') return 'maintenance_repairs';
  if (category === 'financing') return 'financing';
  return 'works_purchases';
}
const possibleFamilies = (c: Category): Family[] => (c === 'repairs_works' ? ['maintenance_repairs', 'works_purchases'] : [familyOf(c, null)]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^[A-Za-z0-9_-]{16,100}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const cp = (s: string) => [...s].length;
const uuid = () => globalThis.crypto.randomUUID();
const MAX = 999_999_999;

function err(status: number, code: string, message: string, fieldErrors?: Record<string, string>): Res {
  return { status, body: { error: { code, message, fieldErrors, requestId: uuid() } } };
}
function validDate(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = DATE_RE.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return y >= 1 && mo >= 1 && mo <= 12 && d >= 1 && days !== undefined && d <= days;
}
/** Stesso giorno un anno prima; 29 febbraio → 28 (calendarAdjustment). */
function yearBefore(d: string): { date: string; clamped: boolean } | null {
  const [y, m, day] = d.split('-');
  const py = Number(y) - 1;
  if (py < 1) return null;
  const ys = String(py).padStart(4, '0');
  if (m === '02' && day === '29' && !validDate(`${ys}-02-29`)) return { date: `${ys}-02-28`, clamped: true };
  return { date: `${ys}-${m}-${day}`, clamped: false };
}

export type EconomyAccess = {
  perms(accountId: string, homeId: string): HomePermission[] | null;
  document(accountId: string, homeId: string, documentId: string): { id: string; name: string } | null;
};

export class FakeEconomy {
  /** false = backend senza economy-v1 (404): il frontend usa la pagina H3a. */
  enabled = false;
  unavailable = false;
  features = { history: true, works: true, documentDrafts: false };
  meta = new Map<string, Meta>();
  works = new Map<string, Work>();
  events = new Map<string, Event[]>();
  workEvents = new Map<string, Array<{ id: string; kind: Event['kind']; at: string; before: Snap | null; after: Snap }>>();
  idem = new Map<string, { digest: string; status: number; replay: () => unknown }>();
  applied: string[] = [];
  private seq = 0;
  private readonly expenses: FakeExpenses;
  private readonly objects: FakeObjects;
  private readonly access: EconomyAccess;

  constructor(expenses: FakeExpenses, objects: FakeObjects, access: EconomyAccess) {
    this.expenses = expenses;
    this.objects = objects;
    this.access = access;
  }

  private get today() {
    return this.expenses.today;
  }

  private stamp() {
    this.seq += 1;
    return new Date(Date.parse(`${this.today}T12:00:00Z`) + this.seq * 1000).toISOString();
  }

  private referenceDate(s:{id:string;spentOn:string}) {const m=this.metaOf(s.id);return m.invoiceMonth&&['electricity','gas','water','internet_services'].includes(m.category??'')?m.invoiceMonth+'-01':s.spentOn;}
  private metaOf(id: string): Meta {
    return this.meta.get(id) ?? { category: null, supplier: null, documentNumber: null, documentDate: null, competenceFrom: null, competenceTo: null, dueOn: null, amountOrigin: 'user_declared', workId: null };
  }

  private objectRef(s: Stored): Ref | null {
    if (s.assetId) return { kind: 'boiler', id: s.assetId };
    return this.objects.expenseReference(s.accountId, s.homeId, s.id);
  }

  private snapshot(s: Stored): Snap {
    const m = this.metaOf(s.id);
    const ref = this.objectRef(s);
    const obj = ref ? this.objects.objectSummary(s.accountId, s.homeId, ref) : null;
    const work = m.workId ? this.works.get(m.workId) : undefined;
    const doc = s.documentId ? this.access.document(s.accountId, s.homeId, s.documentId) : null;
    return {
      title: s.title, amountCents: s.amountCents, currency: 'EUR', spentOn: s.spentOn, note: s.note,
      origin: s.documentId ? 'document' : 'manual',
      documentLink: s.documentId ? (doc ? { state: 'linked', document: { id: doc.id, name: doc.name } } : { state: 'unavailable', document: null }) : { state: 'none', document: null },
      assetLink: s.assetId ? (obj ? { state: 'linked', asset: { id: s.assetId, name: obj.name } } : { state: 'unavailable', asset: null }) : { state: 'none', asset: null },
      state: s.state, category: m.category, family: familyOf(m.category, m.workId), supplier: m.supplier, documentNumber: m.documentNumber,
      ...(m.invoiceMonth?{invoiceMonth:m.invoiceMonth}:{}),documentDate: m.documentDate, competenceFrom: m.competenceFrom, competenceTo: m.competenceTo, dueOn: m.dueOn, amountOrigin: m.amountOrigin,
      objectLink: ref ? (obj ? { state: 'linked', value: obj } : { state: 'unavailable', value: null }) : { state: 'none', value: null },
      workLink: work ? { state: 'linked', value: { id: work.id, name: work.name, state: work.state } } : m.workId ? { state: 'unavailable', value: null } : { state: 'none', value: null },
      analysisLink: { state: 'none', value: null },
    };
  }

  private view(s: Stored, perms: HomePermission[]) {
    return {
      ...this.snapshot(s), id: s.id, homeId: s.homeId, version: s.version, createdAt: s.createdAt, updatedAt: s.updatedAt, archivedAt: s.archivedAt,
      permissions: perms.includes('edit') ? ['read', 'edit'] : ['read'],
    };
  }

  private workView(w: Work, perms: HomePermission[]) {
    return {
      id: w.id, homeId: w.homeId, name: w.name, note: w.note, state: w.state, version: w.version, activityLink: { state: 'none', value: null },
      createdAt: w.createdAt, updatedAt: w.updatedAt, archivedAt: w.archivedAt, permissions: perms.includes('edit') ? ['read', 'edit'] : ['read'],
    };
  }

  async handle(req: Req, accountId: string, homeId: string, rest: string): Promise<Res> {
    if (!this.enabled) return err(404, 'not_found', 'Risorsa non trovata.');
    const perms = this.access.perms(accountId, homeId);
    if (!perms || !perms.includes('read')) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (this.unavailable) return err(503, 'SERVICE_UNAVAILABLE', 'Servizio non disponibile.');
    const [path, query = ''] = rest.split('?');
    const parts = path!.split('/').filter(Boolean).map(decodeURIComponent);
    const isPost = req.method === 'POST';
    if (isPost && !perms.includes('edit')) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    const params = new URLSearchParams(query);
    for (const k of new Set(params.keys())) if (params.getAll(k).length > 1) return err(422, 'validation_error', 'Parametro ripetuto.');

    if (parts[0] === 'capabilities' && parts.length === 1 && !isPost) return { status: 200, body: this.capabilities() };
    if (parts[0] === 'document-analysis-jobs' || parts[0] === 'drafts') {
      if (!this.features.documentDrafts) return err(404, 'not_found', 'Risorsa non trovata.');
      return this.s1c(req, parts, params, accountId, homeId, perms);
    }
    if (parts[0] === 'summary' && parts.length === 1 && !isPost) return this.summary(params, accountId, homeId);
    if (parts[0] === 'expenses') {
      if (parts.length === 1) return isPost ? this.create(req, accountId, homeId, perms) : this.list(params, accountId, homeId, perms);
      const id = parts[1]!;
      if (!UUID_RE.test(id)) return err(422, 'validation_error', 'Identificativo non valido.');
      const s = this.expenses.items.get(id);
      if (!s || s.accountId !== accountId || s.homeId !== homeId) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
      if (parts.length === 2 && !isPost) return { status: 200, body: { expense: this.view(s, perms) } };
      if (parts[2] === 'history' && !isPost) {
        const items = [...(this.events.get(id) ?? [])].reverse();
        return this.page(items, params, `eh:${accountId}:${id}`, ['limit', 'cursor']);
      }
      if (isPost && ['updates', 'archive', 'restore'].includes(parts[2]!)) return this.mutate(req, parts[2] as 'updates', s, accountId, homeId, perms);
    }
    if (parts[0] === 'works' && this.features.works) {
      if (parts.length === 1) return isPost ? this.createWork(req, accountId, homeId, perms) : this.listWorks(params, accountId, homeId, perms);
      const id = parts[1]!;
      if (!UUID_RE.test(id)) return err(422, 'validation_error', 'Identificativo non valido.');
      const w = this.works.get(id);
      if (!w || w.accountId !== accountId || w.homeId !== homeId) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
      if (parts.length === 2 && !isPost) return { status: 200, body: { work: this.workView(w, perms) } };
      if (parts[2] === 'history' && !isPost) return this.page([...(this.workEvents.get(id) ?? [])].reverse(), params, `wh:${accountId}:${id}`, ['limit', 'cursor']);
      if (isPost && ['updates', 'archive', 'restore'].includes(parts[2]!)) return this.mutateWork(req, parts[2] as 'updates', w, accountId, homeId, perms);
    }
    return err(404, 'not_found', 'Risorsa non trovata.');
  }

  private capabilities() {
    return {
      apiVersion: 'economy-v1', enabled: true, isSimulation: false, currency: 'EUR', today: this.today, asOf: this.stamp(), timeZone: 'Europe/Rome',
      features: { ...this.features },
      limits: { titleMaxCodePoints: 120, noteMaxCodePoints: 500, amountMaxCents: MAX, maxPageSize: 50 },
      categories: CATEGORIES.map((code) => ({ code, label: CATEGORY_LABELS[code], possibleFamilies: possibleFamilies(code) })),
      families: FAMILIES.map((code) => ({ code, label: FAMILY_LABELS[code] })),
      analysis: this.features.documentDrafts
        ? {
            enabled: true,
            disabledReason: null,
            providers: [
              { id: 'test_fixture_v1', label: 'Prova con PDF sintetici', enabled: !this.fixtureDisabled, disabledReason: null, isSimulation: true, model: null },
              this.realProvider
                ? { id: 'anthropic', label: 'Anthropic', enabled: true, disabledReason: null, isSimulation: false, model: this.realProvider.model }
                : { id: 'anthropic', label: 'Anthropic', enabled: false, disabledReason: 'Nuova campagna non abilitata.', isSimulation: false, model: null },
            ],
          }
        : { enabled: false, disabledReason: 'Analisi economica non ancora disponibile.', providers: [] },
    };
  }

  private page<T>(items: T[], params: URLSearchParams, scope: string, allowed: string[]): Res {
    for (const k of params.keys()) if (!allowed.includes(k)) return err(422, 'validation_error', 'Parametro non ammesso.');
    const limit = params.has('limit') ? Number(params.get('limit')) : 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return err(422, 'validation_error', 'Limite non valido.');
    const cursor = params.get('cursor');
    let offset = 0;
    if (cursor) {
      const [cScope, cOffset] = cursor.split('@');
      if (cursor.length > 512 || cScope !== encodeURIComponent(scope) || !Number.isInteger(Number(cOffset))) return err(422, 'validation_error', 'Cursore non valido.');
      offset = Number(cOffset);
    }
    const next = offset + limit < items.length ? `${encodeURIComponent(scope)}@${offset + limit}` : null;
    return { status: 200, body: { items: items.slice(offset, offset + limit), nextCursor: next } };
  }

  // ---- filtri ----

  private period(params: URLSearchParams): { from: string; to: string; kind: 'current' | 'year' | 'range' } | Res {
    const year = params.get('year');
    const from = params.get('from');
    const to = params.get('to');
    if (year !== null && (from !== null || to !== null)) return err(422, 'validation_error', 'Usa anno oppure intervallo.');
    if ((from === null) !== (to === null)) return err(422, 'validation_error', 'Intervallo incompleto.');
    if (from !== null && to !== null) {
      if (!validDate(from) || !validDate(to) || from > to) return err(422, 'validation_error', 'Intervallo non valido.');
      return { from, to, kind: 'range' };
    }
    const y = year ?? this.today.slice(0, 4);
    if (!/^\d{4}$/.test(y) || y === '0000') return err(422, 'validation_error', 'Anno non valido.');
    if (y === this.today.slice(0, 4)) return { from: `${y}-01-01`, to: this.today, kind: 'current' };
    return { from: `${y}-01-01`, to: `${y}-12-31`, kind: 'year' };
  }

  private selector(params: URLSearchParams, accountId: string, homeId: string): ((s: Stored) => boolean) | Res {
    const q = params.get('q');
    const category = params.get('category');
    const family = params.get('family');
    const source = params.get('source') ?? 'all';
    const objectKind = params.get('objectKind');
    const objectId = params.get('objectId');
    const roomId = params.get('roomId');
    const workId = params.get('workId');
    const documentId = params.get('documentId');
    if (q !== null && cp(q.normalize('NFC').trim()) > 120) return err(422, 'validation_error', 'Ricerca troppo lunga.');
    if (category !== null && category !== 'unclassified' && !CATEGORIES.includes(category as Category)) return err(422, 'validation_error', 'Categoria non valida.');
    if (family !== null && !FAMILIES.includes(family as Family)) return err(422, 'validation_error', 'Famiglia non valida.');
    if (category && family && category !== 'unclassified' && !possibleFamilies(category as Category).includes(family as Family)) return err(422, 'validation_error', 'Categoria e famiglia incompatibili.');
    if (category === 'unclassified' && family && family !== 'unclassified') return err(422, 'validation_error', 'Categoria e famiglia incompatibili.');
    if (!['all', 'manual', 'document'].includes(source)) return err(422, 'validation_error', 'Origine non valida.');
    if ((objectKind === null) !== (objectId === null)) return err(422, 'validation_error', 'Oggetto incompleto.');
    for (const v of [objectId, roomId, workId, documentId]) if (v !== null && !UUID_RE.test(v)) return err(422, 'validation_error', 'Identificativo non valido.');
    if (objectKind && objectId) {
      if (objectKind !== 'object' && objectKind !== 'boiler') return err(422, 'validation_error', 'Tipo oggetto non valido.');
      if (!this.objects.objectSummary(accountId, homeId, { kind: objectKind, id: objectId })) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    }
    if (workId) {
      const w = this.works.get(workId);
      if (!w || w.accountId !== accountId || w.homeId !== homeId) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    }
    if (documentId && !this.access.document(accountId, homeId, documentId)) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    const needle = q?.normalize('NFC').trim().toLocaleLowerCase('it') ?? '';
    return (s: Stored) => {
      const m = this.metaOf(s.id);
      const fam = familyOf(m.category, m.workId);
      if (needle && !`${s.title}\u0000${m.supplier ?? ''}`.toLocaleLowerCase('it').includes(needle)) return false;
      if (category === 'unclassified' && m.category !== null) return false;
      if (category && category !== 'unclassified' && m.category !== category) return false;
      if (family && fam !== family) return false;
      if (source !== 'all' && (source === 'document') !== !!s.documentId) return false;
      const ref = this.objectRef(s);
      if (objectKind && objectId && !(ref && ref.kind === objectKind && ref.id === objectId)) return false;
      if (roomId && !(ref && this.objects.roomIdsOf(accountId, ref).includes(roomId))) return false;
      if (workId && m.workId !== workId) return false;
      if (documentId && s.documentId !== documentId) return false;
      return true;
    };
  }

  private mine(accountId: string, homeId: string) {
    return [...this.expenses.items.values()].filter((s) => s.accountId === accountId && s.homeId === homeId);
  }

  private list(params: URLSearchParams, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const allowed = ['year', 'from', 'to', 'state', 'q', 'category', 'family', 'source', 'objectKind', 'objectId', 'roomId', 'workId', 'documentId', 'limit', 'cursor'];
    for (const k of params.keys()) if (!allowed.includes(k)) return err(422, 'validation_error', 'Parametro non ammesso.');
    const state = params.get('state') ?? 'active';
    if (!['active', 'archived', 'all'].includes(state)) return err(422, 'validation_error', 'Stato non valido.');
    const period = this.period(params);
    if ('status' in period) return period;
    const sel = this.selector(params, accountId, homeId);
    if (typeof sel !== 'function') return sel;
    const rows = this.mine(accountId, homeId)
      .filter((s) => (state === 'all' || s.state === state) && this.referenceDate(s) >= period.from && this.referenceDate(s) <= period.to && sel(s))
      .sort((a, b) => this.referenceDate(b).localeCompare(this.referenceDate(a)) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const scopeParams = new URLSearchParams(params);
    scopeParams.delete('limit');
    scopeParams.delete('cursor');
    const pageParams = new URLSearchParams();
    for (const k of ['limit', 'cursor']) if (params.has(k)) pageParams.set(k, params.get(k)!);
    return this.page(rows.map((s) => this.view(s, perms)), pageParams, `l:${accountId}:${homeId}:${scopeParams.toString()}`, ['limit', 'cursor']);
  }

  private sums(rows: Stored[]) {
    const byCategory = new Map<Category | null, { count: number; total: bigint }>();
    const byFamily = new Map<Family, { count: number; total: bigint }>();
    let total = 0n;
    for (const s of rows) {
      const m = this.metaOf(s.id);
      const f = familyOf(m.category, m.workId);
      const c = byCategory.get(m.category) ?? { count: 0, total: 0n };
      byCategory.set(m.category, { count: c.count + 1, total: c.total + BigInt(s.amountCents) });
      const g = byFamily.get(f) ?? { count: 0, total: 0n };
      byFamily.set(f, { count: g.count + 1, total: g.total + BigInt(s.amountCents) });
      total += BigInt(s.amountCents);
    }
    return { byCategory, byFamily, total };
  }

  private summary(params: URLSearchParams, accountId: string, homeId: string): Res {
    const allowed = ['year', 'from', 'to', 'q', 'category', 'family', 'source', 'objectKind', 'objectId', 'roomId', 'workId', 'documentId'];
    for (const k of params.keys()) if (!allowed.includes(k)) return err(422, 'validation_error', 'Parametro non ammesso.');
    const period = this.period(params);
    if ('status' in period) return period;
    const sel = this.selector(params, accountId, homeId);
    if (typeof sel !== 'function') return sel;
    const active = this.mine(accountId, homeId).filter((s) => s.state === 'active' && sel(s));
    const inRange = (from: string, to: string) => active.filter((s) => this.referenceDate(s) >= from && this.referenceDate(s) <= to);
    const rows = inRange(period.from, period.to);
    const cur = this.sums(rows);
    const financing = cur.byFamily.get('financing')?.total ?? 0n;
    // Confronto: stesso periodo dell'anno precedente; anno 0001 non confrontabile.
    const pf = yearBefore(period.from);
    const pt = period.kind === 'year' ? (pf ? { date: `${pf.date.slice(0, 4)}-12-31`, clamped: false } : null) : yearBefore(period.to);
    let comparison: Record<string, unknown>;
    if (!pf || !pt) {
      comparison = { status: 'unavailable', period: null, count: null, totalCents: null, deltaCents: null, deltaPercentHundredths: null, calendarAdjustment: 'none' };
    } else {
      const prev = this.sums(inRange(pf.date, pt.date));
      const count = [...prev.byFamily.values()].reduce((a, b) => a + b.count, 0);
      const adj = pf.clamped || pt.clamped ? 'leap_day_clamped' : 'none';
      const delta = cur.total - prev.total;
      if (count === 0) {
        comparison = { status: 'no_previous_records', period: { from: pf.date, to: pt.date }, count: 0, totalCents: '0', deltaCents: delta.toString(), deltaPercentHundredths: null, calendarAdjustment: adj };
      } else {
        // Metà lontano da zero, solo interi.
        const num = delta * 10000n;
        const abs = num < 0n ? -num : num;
        let pct = (abs * 2n + prev.total) / (2n * prev.total);
        if (num < 0n) pct = -pct;
        comparison = { status: 'comparable', period: { from: pf.date, to: pt.date }, count, totalCents: prev.total.toString(), deltaCents: delta.toString(), deltaPercentHundredths: pct.toString(), calendarAdjustment: adj };
      }
    }
    return {
      status: 200,
      body: {
        period: { from: period.from, to: period.to, basis: 'reference_date' },
        count: rows.length,
        totalCents: cur.total.toString(),
        totalWithoutFinancingCents: (cur.total - financing).toString(),
        byCategory: [...CATEGORIES, null].map((c) => ({ category: c, count: cur.byCategory.get(c)?.count ?? 0, totalCents: (cur.byCategory.get(c)?.total ?? 0n).toString() })),
        byFamily: FAMILIES.map((f) => ({ family: f, count: cur.byFamily.get(f)?.count ?? 0, totalCents: (cur.byFamily.get(f)?.total ?? 0n).toString() })),
        comparison,
        asOf: this.stamp(),
        today: this.today,
        timeZone: 'Europe/Rome',
      },
    };
  }

  // ---- scritture ----

  private withIdem(req: Req, scope: string, run: () => Res & { replay?: () => unknown }): Res {
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
    if (res.replay) {
      this.idem.set(scoped, { digest, status: res.status, replay: res.replay });
      this.applied.push(scope);
    }
    return { status: res.status, body: res.body };
  }

  private parse(body: Record<string, unknown>, accountId: string, homeId: string, creating: boolean) {
    const allowed = ['title', 'amountCents', 'spentOn', 'note', 'category', 'supplier', 'documentNumber', 'documentDate', 'invoiceMonth', 'competenceFrom', 'competenceTo', 'dueOn', 'objectRef', 'workId', 'documentId'];
    const fe: Record<string, string> = {};
    for (const k of Object.keys(body)) if (!allowed.includes(k) && k !== 'expectedVersion') fe[k] = 'Campo non ammesso.';
    const out: Record<string, unknown> = {};
    const text = (k: string, max: number, required: boolean) => {
      if (!(k in body)) return;
      const v = body[k];
      if (v === null && !required) return void (out[k] = null);
      const t = typeof v === 'string' ? v.normalize('NFC').trim() : null;
      if (t === null || (required && cp(t) < 1) || cp(t) > max) fe[k] = 'Testo non valido.';
      else out[k] = t || null;
    };
    text('title', 120, true);
    text('note', 500, false);
    text('supplier', 120, false);
    text('documentNumber', 80, false);
    if ('amountCents' in body) {
      const a = body.amountCents;
      if (typeof a !== 'number' || !Number.isInteger(a) || a < 1 || a > MAX) fe.amountCents = 'Importo non valido.';
      else out.amountCents = a;
    }
    if ('spentOn' in body) {
      if (!validDate(body.spentOn)) fe.spentOn = 'Data non valida.';
      else if ((body.spentOn as string) > this.today) fe.spentOn = 'La data non può essere futura.';
      else out.spentOn = body.spentOn;
    }
    if ('invoiceMonth' in body) {if(body.invoiceMonth!==null&&(typeof body.invoiceMonth!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.invoiceMonth)||body.invoiceMonth.startsWith('0000')))fe.invoiceMonth='Mese non valido.';else out.invoiceMonth=body.invoiceMonth;}
    for (const k of ['documentDate', 'competenceFrom', 'competenceTo', 'dueOn']) {
      if (!(k in body)) continue;
      if (body[k] === null) out[k] = null;
      else if (!validDate(body[k])) fe[k] = 'Data non valida.';
      else out[k] = body[k];
    }
    if ('category' in body) {
      if (body.category === null) out.category = null;
      else if (!CATEGORIES.includes(body.category as Category)) fe.category = 'Categoria non valida.';
      else out.category = body.category;
    }
    let forbidden = false;
    if ('documentId' in body) {
      const v = body.documentId;
      if (v === null) out.documentId = null;
      else if (typeof v !== 'string' || !UUID_RE.test(v)) fe.documentId = 'Identificativo non valido.';
      else if (!this.access.document(accountId, homeId, v)) forbidden = true;
      else out.documentId = v;
    }
    let workConflict = false;
    if ('workId' in body) {
      const v = body.workId;
      if (v === null) out.workId = null;
      else if (typeof v !== 'string' || !UUID_RE.test(v)) fe.workId = 'Identificativo non valido.';
      else {
        const w = this.works.get(v);
        if (!w || w.accountId !== accountId || w.homeId !== homeId) forbidden = true;
        else {
          if (w.state !== 'active') workConflict = true;
          out.workId = v;
        }
      }
    }
    let objectConflict = false;
    if ('objectRef' in body) {
      const v = body.objectRef as Ref | null;
      if (v === null) out.objectRef = null;
      else if (!v || (v.kind !== 'object' && v.kind !== 'boiler') || typeof v.id !== 'string' || !UUID_RE.test(v.id)) fe.objectRef = 'Riferimento non valido.';
      else {
        const o = this.objects.objectSummary(accountId, homeId, v);
        if (!o) forbidden = true;
        else {
          if (o.state !== 'active') objectConflict = true;
          out.objectRef = { kind: v.kind, id: v.id };
        }
      }
    }
    if (creating) for (const k of ['title', 'amountCents', 'spentOn']) if (!(k in body)) fe[k] = 'Obbligatorio.';
    return { out, fe, forbidden, workConflict, objectConflict };
  }

  private event(id: string, kind: Event['kind'], before: Snap | null, after: Snap, note: string | null) {
    const list = this.events.get(id) ?? [];
    list.push({ id: uuid(), kind, at: this.stamp(), note, before, after });
    this.events.set(id, list);
  }

  private competenceError(m: Meta) {
    if ((m.competenceFrom === null) !== (m.competenceTo === null)) return true;
    return !!(m.competenceFrom && m.competenceTo && m.competenceFrom > m.competenceTo);
  }

  private create(req: Req, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const p = this.parse(body, accountId, homeId, true);
    if (Object.keys(p.fe).length) return err(422, 'validation_error', 'Controlla i campi.', p.fe);
    if (p.forbidden) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (p.workConflict) return err(409, 'work_state_conflict', 'Lavoro archiviato.');
    if (p.objectConflict) return err(409, 'resource_state_conflict', 'Oggetto archiviato.');
    const o = p.out;
    const m: Meta = {
      category: (o.category as Category | null) ?? null, supplier: (o.supplier as string | null) ?? null, documentNumber: (o.documentNumber as string | null) ?? null,
      ...(o.invoiceMonth?{invoiceMonth:o.invoiceMonth as string}:{}),documentDate: (o.documentDate as string | null) ?? null, competenceFrom: (o.competenceFrom as string | null) ?? null, competenceTo: (o.competenceTo as string | null) ?? null,
      dueOn: (o.dueOn as string | null) ?? null, amountOrigin: 'user_declared', workId: (o.workId as string | null) ?? null,
    };
    if (this.competenceError(m)) return err(422, 'validation_error', 'Competenza non valida.', { competenceFrom: 'Intervallo non valido.' });
    return this.withIdem(req, `${accountId}:${homeId}:create`, () => {
      const at = this.stamp();
      const ref = (o.objectRef as Ref | null) ?? null;
      const s = {
        id: uuid(), homeId, accountId, title: o.title as string, amountCents: o.amountCents as number, spentOn: o.spentOn as string,
        note: (o.note as string | null) ?? null, documentId: (o.documentId as string | null) ?? null, assetId: ref?.kind === 'boiler' ? ref.id : null,
        state: 'active' as const, version: 1, createdAt: at, updatedAt: at, archivedAt: null,
      };
      this.expenses.items.set(s.id, s);
      this.meta.set(s.id, m);
      if (ref?.kind === 'object') this.objects.attachExpense(accountId, homeId, ref, s.id);
      this.event(s.id, 'created', null, this.snapshot(s), null);
      const replay = () => ({ expense: this.view(this.expenses.items.get(s.id)!, perms) });
      return { status: 201, body: replay(), replay };
    });
  }

  private mutate(req: Req, kind: 'updates' | 'archive' | 'restore', s: Stored, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1) return err(422, 'validation_error', 'Versione mancante.', { expectedVersion: 'Obbligatoria.' });
    let p: ReturnType<FakeEconomy['parse']> | null = null;
    let actionNote: string | null = null;
    if (kind === 'updates') {
      p = this.parse(body, accountId, homeId, false);
      if (Object.keys(p.out).length === 0 && !Object.keys(p.fe).length) return err(422, 'validation_error', 'Nessun campo da modificare.');
      if (Object.keys(p.fe).length) return err(422, 'validation_error', 'Controlla i campi.', p.fe);
      if (p.forbidden) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    } else {
      for (const k of Object.keys(body)) if (k !== 'expectedVersion' && k !== 'note') return err(422, 'validation_error', 'Campo non ammesso.');
      if (typeof body.note === 'string') actionNote = body.note.normalize('NFC').trim() || null;
    }
    return this.withIdem(req, `${accountId}:${homeId}:${kind}:${s.id}`, () => {
      if (ev !== s.version) return err(409, 'expense_version_conflict', 'Il costo è cambiato: rileggi.');
      if ((kind !== 'restore') !== (s.state === 'active')) return err(409, 'expense_state_conflict', 'Stato non compatibile.');
      const before = this.snapshot(s);
      const at = this.stamp();
      if (kind === 'updates') {
        const o = p!.out;
        const m = { ...this.metaOf(s.id) };
        const currentRef = this.objectRef(s);
        if ('objectRef' in o) {
          const next = o.objectRef as Ref | null;
          const same = !!next && !!currentRef && next.kind === currentRef.kind && next.id === currentRef.id;
          if (next && currentRef && !same) return err(409, 'resource_already_linked', 'Costo già collegato a un altro oggetto.');
          if (next && !same && p!.objectConflict) return err(409, 'resource_state_conflict', 'Oggetto archiviato.');
        }
        if ('workId' in o && o.workId !== m.workId && p!.workConflict) return err(409, 'work_state_conflict', 'Lavoro archiviato.');
        for (const k of ['category', 'supplier', 'documentNumber', 'documentDate', 'invoiceMonth', 'competenceFrom', 'competenceTo', 'dueOn', 'workId'] as const) {
          if (k in o) (m as Record<string, unknown>)[k] = o[k];
        }
        if (this.competenceError(m)) return err(422, 'validation_error', 'Competenza non valida.', { competenceFrom: 'Intervallo non valido.' });
        if ('amountCents' in o && o.amountCents !== s.amountCents) m.amountOrigin = 'user_declared';
        for (const k of ['title', 'amountCents', 'spentOn', 'note', 'documentId'] as const) if (k in o) (s as Record<string, unknown>)[k] = o[k];
        if ('objectRef' in o) {
          const next = o.objectRef as Ref | null;
          if (!next && currentRef) {
            if (currentRef.kind === 'boiler') s.assetId = null;
            else this.objects.detachExpense(accountId, homeId, s.id);
          } else if (next && !currentRef) {
            if (next.kind === 'boiler') s.assetId = next.id;
            else this.objects.attachExpense(accountId, homeId, next, s.id);
          }
        }
        this.meta.set(s.id, m);
        const after = this.snapshot(s);
        if (JSON.stringify(after) !== JSON.stringify(before)) {
          Object.assign(s, { version: s.version + 1, updatedAt: at });
          this.event(s.id, 'updated', before, after, null);
        }
      } else {
        Object.assign(s, { state: kind === 'archive' ? 'archived' : 'active', archivedAt: kind === 'archive' ? at : null, version: s.version + 1, updatedAt: at });
        this.event(s.id, kind === 'archive' ? 'archived' : 'restored', before, this.snapshot(s), actionNote);
      }
      const replay = () => ({ expense: this.view(s, perms) });
      return { status: 200, body: replay(), replay };
    });
  }

  // ---- S1c: job, bozze, candidati, conferma (fixture dichiarata, nessun modello) ----

  jobs = new Map<string, FakeJob>();
  drafts = new Map<string, FakeDraft>();
  /** Documenti riconosciuti dalla fixture (nel backend reale: byte esatti dei PDF sintetici). */
  fixtureDocs = new Map<string, 'gas' | 'invoice'>();
  /** Documenti non PDF: avvio rifiutato con 422. */
  nonPdfDocs = new Set<string>();
  /** Originali revocati per il richiedente (fonte non disponibile). */
  revokedDocs = new Set<string>();
  /** Letture del job prima di uno stato terminale (queued → running → finale). */
  jobSteps = 2;
  /** Il prossimo job fallisce con questo codice anche se il documento è una fixture. */
  failNextJobWith: string | null = null;
  /**
   * SIMULAZIONE di un provider reale abilitato (solo prove del consenso): nessuna chiamata esterna,
   * esiti e costi sono valori sintetici. Null = Anthropic disabilitato come nel runtime attuale.
   */
  realProvider: { model: string } | null = null;
  /** Il prossimo avvio/nuovo tentativo reale viene rifiutato prima del dispatch con questo codice. */
  rejectNextRealWith: string | null = null;
  /** Prova sintetica non abilitata (per provare il provider reale come unica modalità). */
  fixtureDisabled = false;

  private doc(accountId: string, homeId: string, id: string) {
    return this.revokedDocs.has(id) ? null : this.access.document(accountId, homeId, id);
  }

  private jobView(j: FakeJob, perms: HomePermission[]) {
    const d = this.doc(j.accountId, j.homeId, j.documentId);
    const draft = j.draftId ? this.drafts.get(j.draftId) : undefined;
    return {
      id: j.id, homeId: j.homeId, version: j.version, state: j.state, provider: j.provider, isSimulation: j.provider === 'test_fixture_v1', model: j.model,
      documentLink: d ? { state: 'linked', document: d } : { state: 'unavailable', document: null },
      draftId: draft && d ? draft.id : null,
      error: j.errorCode ? { code: j.errorCode, message: JOB_MESSAGES[j.errorCode] ?? 'Analisi non disponibile. Nessuna spesa registrata.' } : null,
      billing: j.billing ? { ...j.billing } : null, createdAt: j.createdAt, updatedAt: j.updatedAt, permissions: perms.includes('edit') ? ['read', 'edit'] : ['read'],
    };
  }

  private draftView(d: FakeDraft, perms: HomePermission[], list = false) {
    const doc = this.doc(d.accountId, d.homeId, d.documentId);
    const exp = d.expenseId ? this.expenses.items.get(d.expenseId) : undefined;
    return {
      id: d.id, homeId: d.homeId, version: d.version, state: d.state,
      documentLink: doc ? { state: 'linked', document: doc } : { state: 'unavailable', document: null },
      provider: d.provider ?? 'test_fixture_v1', isSimulation: (d.provider ?? 'test_fixture_v1') === 'test_fixture_v1',
      ...(list ? {} : { model: d.model ?? null, proposedFields: doc ? d.proposed : {}, amountCandidates: doc ? d.candidates : [], amountSelectionRequired: doc ? d.required : true }),
      documentKind: d.kind === 'gas' ? 'utility_bill' : 'simple_invoice',
      expenseLink: d.expenseId ? (exp ? { state: 'linked', value: { id: exp.id, title: exp.title } } : { state: 'unavailable', value: null }) : { state: 'none', value: null },
      createdAt: d.createdAt, updatedAt: d.updatedAt, permissions: perms.includes('edit') ? ['read', 'edit'] : ['read'],
    };
  }

  private makeDraft(j: FakeJob, kind: 'gas' | 'invoice'): FakeDraft {
    const cite = (excerpt: string) => [{ documentId: j.documentId, documentVersion: 1, sha256: 'a'.repeat(64), page: 1, excerpt }];
    const field = (value: string, excerpt: string) => ({ value, sources: cite(excerpt) });
    const gas = kind === 'gas';
    const rows: Array<[string, number, string, string]> = gas
      ? [['current', 8000, 'current_document_total', 'Totale corrente bolletta: 80,00 EUR'], ['arrears', 2000, 'arrears_balance', 'Saldo precedenti bollette: 20,00 EUR'], ['due', 10000, 'amount_due', 'Importo da pagare: 100,00 EUR']]
      : [['gross', 12200, 'current_document_total', 'Totale documento: 122,00 EUR'], ['taxable', 10000, 'taxable', 'Imponibile: 100,00 EUR'], ['tax', 2200, 'tax', 'IVA: 22,00 EUR']];
    const candidates = rows.map(([id, amountCents, role, excerpt]) => ({ id, amountCents, role, label: excerpt.split(':')[0]!, sources: cite(excerpt) }));
    const at = this.stamp();
    return {
      id: uuid(), homeId: j.homeId, accountId: j.accountId, version: 1, state: 'open', documentId: j.documentId, kind,
      proposed: {
        title: field(gas ? 'Bolletta gas settembre' : 'Fattura riparazione rubinetto', gas ? 'Bolletta gas settembre' : 'Fattura riparazione rubinetto'),
        supplier: field(gas ? 'Gas Demo' : 'Idraulico Demo', gas ? 'Fornitore: Gas Demo' : 'Fornitore: Idraulico Demo'),
        category: field(gas ? 'gas' : 'repairs_works', gas ? 'Bolletta gas settembre' : 'Fattura riparazione rubinetto'),
        documentNumber: field(gas ? 'G-2026-09' : '42', gas ? 'Numero: G-2026-09' : 'Numero: 42'),
        documentDate: field('2026-09-30', 'Data documento: 2026-09-30'),
        ...(gas ? { competenceFrom: field('2026-09-01', 'Competenza dal: 2026-09-01'), competenceTo: field('2026-09-30', 'Competenza al: 2026-09-30'), dueOn: field('2026-10-20', 'Scadenza: 2026-10-20') } : {}),
      },
      candidates,
      required: candidates.some((c) => c.role === 'arrears_balance') || candidates.filter((c) => c.role === 'current_document_total').length !== 1,
      expenseId: null, createdAt: at, updatedAt: at,
    };
  }

  private s1c(req: Req, parts: string[], params: URLSearchParams, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const isPost = req.method === 'POST';
    if (parts[0] === 'document-analysis-jobs') {
      if (parts.length === 1 && isPost) return this.startJob(req, accountId, homeId, perms);
      const j = parts[1] && UUID_RE.test(parts[1]) ? this.jobs.get(parts[1]) : undefined;
      if (!parts[1] || !UUID_RE.test(parts[1])) return err(422, 'validation_error', 'Identificativo non valido.');
      if (!j || j.accountId !== accountId || j.homeId !== homeId) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
      if (parts.length === 2 && !isPost) {
        if (params.size) return err(422, 'validation_error', 'Parametro non ammesso.');
        this.advance(j);
        return { status: 200, body: { job: this.jobView(j, perms) } };
      }
      if (parts[2] === 'retries' && isPost) return this.retryJob(req, j, accountId, homeId, perms);
      return err(404, 'not_found', 'Risorsa non trovata.');
    }
    // drafts
    if (parts.length === 1 && !isPost) {
      for (const k of params.keys()) if (!['state', 'limit', 'cursor'].includes(k)) return err(422, 'validation_error', 'Parametro non ammesso.');
      const state = params.get('state') ?? 'open';
      if (!['open', 'parked', 'confirmed', 'all'].includes(state)) return err(422, 'validation_error', 'Stato non valido.');
      const rows = [...this.drafts.values()]
        .filter((d) => d.accountId === accountId && d.homeId === homeId && (state === 'all' || d.state === state))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
      const pp = new URLSearchParams();
      for (const k of ['limit', 'cursor']) if (params.has(k)) pp.set(k, params.get(k)!);
      return this.page(rows.map((d) => this.draftView(d, perms, true)), pp, `d:${accountId}:${homeId}:${state}`, ['limit', 'cursor']);
    }
    if (!parts[1] || !UUID_RE.test(parts[1])) return err(422, 'validation_error', 'Identificativo non valido.');
    const d = this.drafts.get(parts[1]);
    if (!d || d.accountId !== accountId || d.homeId !== homeId) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    if (parts.length === 2 && !isPost) return { status: 200, body: { draft: this.draftView(d, perms) } };
    if (parts[2] === 'candidates' && !isPost) return this.candidates(d, params, accountId, homeId, perms);
    if (isPost && (parts[2] === 'park' || parts[2] === 'reopen')) return this.draftAction(req, d, parts[2], accountId, homeId, perms);
    if (isPost && parts[2] === 'confirm') return this.confirm(req, d, accountId, homeId, perms);
    return err(404, 'not_found', 'Risorsa non trovata.');
  }

  private advance(j: FakeJob) {
    if (j.state === 'succeeded' || j.state === 'failed') return;
    j.polls += 1;
    const at = this.stamp();
    if (j.state === 'queued' && j.polls >= 1) Object.assign(j, { state: 'running', version: j.version + 1, updatedAt: at });
    if (j.state === 'running' && j.polls >= this.jobSteps) {
      const real = j.provider === 'anthropic';
      // Il provider reale simulato «legge» ogni PDF come fattura sintetica: nessun modello coinvolto.
      const kind = this.fixtureDocs.get(j.documentId) ?? (real ? 'invoice' : undefined);
      if (j.forcedError) Object.assign(j, { state: 'failed', errorCode: j.forcedError });
      else if (!kind) Object.assign(j, { state: 'failed', errorCode: 'provider_fixture_unsupported' });
      else {
        const draft = { ...this.makeDraft(j, kind), provider: j.provider, model: j.model };
        this.drafts.set(draft.id, draft);
        Object.assign(j, { state: 'succeeded', draftId: draft.id });
      }
      if (j.billing) {
        j.billing = j.forcedError === 'analysis_outcome_unknown'
          ? { ...j.billing, state: 'uncertain', actualUsd: null }
          : { ...j.billing, state: 'settled', actualUsd: j.forcedError ? '0.000000' : '0.012345' };
      }
      Object.assign(j, { version: j.version + 1, updatedAt: at });
    }
  }

  private startJob(req: Req, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(body)) if (!['documentId', 'provider', 'consentToProviderTransfer'].includes(k)) return err(422, 'validation_error', 'Campo non ammesso.');
    if (body.provider !== 'test_fixture_v1' && body.provider !== 'anthropic') return err(422, 'validation_error', 'Scegli esplicitamente il provider.');
    if (typeof body.documentId !== 'string' || !UUID_RE.test(body.documentId)) return err(422, 'validation_error', 'Identificativo non valido.');
    if (body.provider === 'anthropic' && body.consentToProviderTransfer !== true) return err(422, 'validation_error', 'Autorizza esplicitamente l’invio ad Anthropic.');
    const documentId = body.documentId;
    if (!this.doc(accountId, homeId, documentId)) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    return this.withIdem(req, `${accountId}:${homeId}:job-start`, () => {
      if (body.provider === 'anthropic') {
        const refused = this.refuseReal();
        if (refused) return refused;
      } else if (this.fixtureDisabled) return err(503, 'ai_provider_disabled', 'Prova sintetica non abilitata.');
      if (this.nonPdfDocs.has(documentId)) return err(422, 'economic_document_unsupported', 'Questa analisi richiede un PDF con testo.');
      const j = this.newJob(accountId, homeId, documentId, body.provider as FakeJob['provider']);
      const replay = () => ({ job: this.jobView(this.jobs.get(j.id)!, perms) });
      return { status: 202, body: replay(), replay };
    });
  }

  private refuseReal(): Res | null {
    if (!this.realProvider) return err(503, 'ai_provider_disabled', 'Nuova campagna Anthropic non abilitata. Nessun testo inviato.');
    const code = this.rejectNextRealWith;
    if (!code) return null;
    this.rejectNextRealWith = null;
    const status = code === 'provider_rate_limited' ? 429 : code === 'ai_budget_exhausted' || code === 'ai_evaluation_limit_reached' ? 409 : 503;
    return err(status, code, 'Rifiuto simulato prima dell’invio: nessun testo inviato.');
  }

  private newJob(accountId: string, homeId: string, documentId: string, provider: FakeJob['provider']) {
    const at = this.stamp();
    const real = provider === 'anthropic';
    const j: FakeJob = {
      id: uuid(), homeId, accountId, version: 1, state: 'queued', documentId, draftId: null, errorCode: null, polls: 0, forcedError: this.failNextJobWith, createdAt: at, updatedAt: at,
      provider, model: real ? this.realProvider!.model : null,
      billing: real ? { currency: 'USD', maxReservedUsd: '0.050000', actualUsd: null, state: 'reserved' } : null,
    };
    this.failNextJobWith = null;
    this.jobs.set(j.id, j);
    return j;
  }

  private retryJob(req: Req, j: FakeJob, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1) return err(422, 'validation_error', 'Versione mancante.');
    return this.withIdem(req, `${accountId}:${homeId}:job-retry:${j.id}`, () => {
      if (ev !== j.version) return err(409, 'job_version_conflict', 'Rileggi il job.');
      if (j.state !== 'failed') return err(409, 'job_state_conflict', 'Il job non è fallito.');
      if (j.provider === 'anthropic') {
        if (body.consentToProviderTransfer !== true) return err(422, 'validation_error', 'Autorizza esplicitamente il nuovo invio ad Anthropic.');
        const refused = this.refuseReal();
        if (refused) return refused;
      }
      // Contratto: un nuovo tentativo crea un NUOVO job; quello fallito resta com'è.
      const next = this.newJob(accountId, homeId, j.documentId, j.provider);
      const replay = () => ({ job: this.jobView(this.jobs.get(next.id)!, perms) });
      return { status: 202, body: replay(), replay };
    });
  }

  private candidates(d: FakeDraft, params: URLSearchParams, accountId: string, homeId: string, perms: HomePermission[]): Res {
    if (!this.doc(accountId, homeId, d.documentId)) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    const amounts = d.candidates.map((c) => c.amountCents);
    const number = d.proposed.documentNumber?.value;
    const supplier = d.proposed.supplier?.value;
    const date = d.proposed.documentDate?.value;
    const rows = this.mine(accountId, homeId)
      .filter((s) => s.state === 'active')
      .map((s) => {
        const m = this.metaOf(s.id);
        const reasons = [
          ...(s.documentId === d.documentId ? ['same_document'] : []),
          ...(m.documentNumber && m.documentNumber === number && m.supplier === supplier ? ['same_number_supplier'] : []),
          ...(amounts.includes(s.amountCents) && s.spentOn === date ? ['same_amount_date'] : []),
        ];
        return { s, reasons };
      })
      .filter((r) => r.reasons.length)
      .sort((a, b) => b.s.createdAt.localeCompare(a.s.createdAt));
    return this.page(rows.map((r) => ({ expense: this.view(r.s, perms), reasons: r.reasons })), params, `c:${accountId}:${d.id}`, ['limit', 'cursor']);
  }

  private draftAction(req: Req, d: FakeDraft, op: 'park' | 'reopen', accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1 || Object.keys(body).some((k) => k !== 'expectedVersion')) return err(422, 'validation_error', 'Versione mancante.');
    return this.withIdem(req, `${accountId}:${homeId}:draft-${op}:${d.id}`, () => {
      if (ev !== d.version) return err(409, 'draft_version_conflict', 'Rileggi la bozza.');
      if (d.state !== (op === 'park' ? 'open' : 'parked')) return err(409, 'draft_state_conflict', 'Azione non consentita.');
      Object.assign(d, { state: op === 'park' ? 'parked' : 'open', version: d.version + 1, updatedAt: this.stamp() });
      const replay = () => ({ draft: this.draftView(d, perms) });
      return { status: 200, body: replay(), replay };
    });
  }

  private confirm(req: Req, d: FakeDraft, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1) return err(422, 'validation_error', 'Versione mancante.');
    const link = body.mode === 'link_existing';
    if (!link && body.mode !== 'create') return err(422, 'validation_error', 'Modalità non valida.');
    if (link && ('values' in body || 'amountSelection' in body)) return err(422, 'validation_error', 'Campi non ammessi.');
    let parsed: ReturnType<FakeEconomy['parse']> | null = null;
    let selection: { mode: string; candidateId?: string } | null = null;
    if (!link) {
      selection = body.amountSelection as { mode: string; candidateId?: string };
      if (!selection || (selection.mode !== 'manual' && selection.mode !== 'candidate') || (selection.mode === 'candidate' && typeof selection.candidateId !== 'string')) return err(422, 'validation_error', 'Selezione importo non valida.');
      const values = (body.values ?? {}) as Record<string, unknown>;
      if ('documentId' in values) return err(422, 'validation_error', 'Il documento arriva dalla bozza.');
      parsed = this.parse(values, accountId, homeId, true);
      if (Object.keys(parsed.fe).length) return err(422, 'validation_error', 'Controlla i campi.', parsed.fe);
      if (parsed.forbidden) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
    }
    if (!this.doc(accountId, homeId, d.documentId)) return err(403, 'FORBIDDEN', 'Originale non disponibile.');
    return this.withIdem(req, `${accountId}:${homeId}:confirm:${d.id}`, () => {
      if (d.state !== 'open') return err(409, 'draft_state_conflict', 'La bozza deve essere aperta.');
      if (d.version !== ev) return err(409, 'draft_version_conflict', 'Rileggi la bozza.');
      let s: Stored;
      if (link) {
        const id = body.expenseId;
        const found = typeof id === 'string' ? this.expenses.items.get(id) : undefined;
        if (!found || found.accountId !== accountId || found.homeId !== homeId) return err(403, 'FORBIDDEN', 'Accesso non consentito.');
        if (found.version !== body.expectedExpenseVersion) return err(409, 'expense_version_conflict', 'Rileggi il costo.');
        if (found.state !== 'active') return err(409, 'expense_state_conflict', 'Ripristina prima il costo.');
        if (found.documentId && found.documentId !== d.documentId) return err(409, 'expense_document_conflict', 'Il costo ha un altro documento.');
        if (!found.documentId) {
          const before = this.snapshot(found);
          Object.assign(found, { documentId: d.documentId, version: found.version + 1, updatedAt: this.stamp() });
          this.event(found.id, 'updated', before, this.snapshot(found), null);
        }
        s = found;
      } else {
        const o = parsed!.out;
        const cand = selection!.mode === 'candidate' ? d.candidates.find((c) => c.id === selection!.candidateId) : undefined;
        if (selection!.mode === 'candidate' && (!cand || cand.amountCents !== o.amountCents)) return err(422, 'validation_error', 'Importo e candidato non corrispondono.');
        if (parsed!.workConflict) return err(409, 'work_state_conflict', 'Lavoro archiviato.');
        const at = this.stamp();
        const ref = (o.objectRef as Ref | null) ?? null;
        s = {
          id: uuid(), homeId, accountId, title: o.title as string, amountCents: o.amountCents as number, spentOn: o.spentOn as string,
          note: (o.note as string | null) ?? null, documentId: d.documentId, assetId: ref?.kind === 'boiler' ? ref.id : null,
          state: 'active' as const, version: 1, createdAt: at, updatedAt: at, archivedAt: null,
        };
        this.expenses.items.set(s.id, s);
        this.meta.set(s.id, {
          category: (o.category as Category | null) ?? null, supplier: (o.supplier as string | null) ?? null, documentNumber: (o.documentNumber as string | null) ?? null,
          ...(o.invoiceMonth?{invoiceMonth:o.invoiceMonth as string}:{}),documentDate: (o.documentDate as string | null) ?? null, competenceFrom: (o.competenceFrom as string | null) ?? null, competenceTo: (o.competenceTo as string | null) ?? null,
          dueOn: (o.dueOn as string | null) ?? null, amountOrigin: cand ? 'extraction_confirmed' : 'user_declared', workId: (o.workId as string | null) ?? null,
        });
        if (ref?.kind === 'object') this.objects.attachExpense(accountId, homeId, ref, s.id);
        this.event(s.id, 'created', null, this.snapshot(s), null);
      }
      Object.assign(d, { state: 'confirmed', expenseId: s.id, version: d.version + 1, updatedAt: this.stamp() });
      const expenseId = s.id;
      const replay = () => ({ draft: this.draftView(d, perms), expense: this.view(this.expenses.items.get(expenseId)!, perms) });
      return { status: 200, body: replay(), replay };
    });
  }

  // ---- lavori ----

  private listWorks(params: URLSearchParams, accountId: string, homeId: string, perms: HomePermission[]): Res {
    for (const k of params.keys()) if (!['state', 'q', 'limit', 'cursor'].includes(k)) return err(422, 'validation_error', 'Parametro non ammesso.');
    const state = params.get('state') ?? 'active';
    if (!['active', 'archived', 'all'].includes(state)) return err(422, 'validation_error', 'Stato non valido.');
    const q = (params.get('q') ?? '').normalize('NFC').trim().toLocaleLowerCase('it');
    const rows = [...this.works.values()]
      .filter((w) => w.accountId === accountId && w.homeId === homeId && (state === 'all' || w.state === state) && (!q || w.name.toLocaleLowerCase('it').includes(q)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const pageParams = new URLSearchParams();
    for (const k of ['limit', 'cursor']) if (params.has(k)) pageParams.set(k, params.get(k)!);
    return this.page(rows.map((w) => this.workView(w, perms)), pageParams, `w:${accountId}:${homeId}:${state}:${q}`, ['limit', 'cursor']);
  }

  private workSnap(w: Work): Snap {
    return { name: w.name, note: w.note, state: w.state, activityLink: { state: 'none', value: null } };
  }

  private workEvent(w: Work, kind: Event['kind'], before: Snap | null) {
    const list = this.workEvents.get(w.id) ?? [];
    list.push({ id: uuid(), kind, at: this.stamp(), before, after: this.workSnap(w) });
    this.workEvents.set(w.id, list);
  }

  private workFields(body: Record<string, unknown>) {
    const fe: Record<string, string> = {};
    const out: { name?: string; note?: string | null } = {};
    for (const k of Object.keys(body)) if (!['name', 'note', 'activityId', 'expectedVersion'].includes(k)) fe[k] = 'Campo non ammesso.';
    if ('name' in body) {
      const t = typeof body.name === 'string' ? body.name.normalize('NFC').trim() : '';
      if (cp(t) < 1 || cp(t) > 120) fe.name = 'Nome da 1 a 120 caratteri.';
      else out.name = t;
    }
    if ('note' in body) {
      if (body.note === null) out.note = null;
      else if (typeof body.note !== 'string' || cp(body.note.trim()) > 500) fe.note = 'Nota non valida.';
      else out.note = body.note.normalize('NFC').trim() || null;
    }
    return { out, fe };
  }

  private createWork(req: Req, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { out, fe } = this.workFields(body);
    if (!('name' in body)) fe.name = 'Obbligatorio.';
    if (Object.keys(fe).length) return err(422, 'validation_error', 'Controlla i campi.', fe);
    return this.withIdem(req, `${accountId}:${homeId}:work-create`, () => {
      const at = this.stamp();
      const w: Work = { id: uuid(), homeId, accountId, name: out.name!, note: out.note ?? null, state: 'active', version: 1, createdAt: at, updatedAt: at, archivedAt: null };
      this.works.set(w.id, w);
      this.workEvent(w, 'created', null);
      const replay = () => ({ work: this.workView(this.works.get(w.id)!, perms) });
      return { status: 201, body: replay(), replay };
    });
  }

  private mutateWork(req: Req, kind: 'updates' | 'archive' | 'restore', w: Work, accountId: string, homeId: string, perms: HomePermission[]): Res {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ev = body.expectedVersion;
    if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1) return err(422, 'validation_error', 'Versione mancante.');
    const { out, fe } = this.workFields(kind === 'updates' ? body : { expectedVersion: ev });
    if (kind !== 'updates' && Object.keys(body).some((k) => k !== 'expectedVersion')) return err(422, 'validation_error', 'Campo non ammesso.');
    if (Object.keys(fe).length) return err(422, 'validation_error', 'Controlla i campi.', fe);
    if (kind === 'updates' && !('name' in out) && !('note' in out)) return err(422, 'validation_error', 'Nessun campo da modificare.');
    return this.withIdem(req, `${accountId}:${homeId}:work-${kind}:${w.id}`, () => {
      if (ev !== w.version) return err(409, 'work_version_conflict', 'Il lavoro è cambiato: rileggi.');
      if ((kind !== 'restore') !== (w.state === 'active')) return err(409, 'work_state_conflict', 'Stato non compatibile.');
      const before = this.workSnap(w);
      const at = this.stamp();
      if (kind === 'updates') {
        const next = { name: out.name ?? w.name, note: 'note' in out ? (out.note ?? null) : w.note };
        if (next.name !== w.name || next.note !== w.note) {
          Object.assign(w, next, { version: w.version + 1, updatedAt: at });
          this.workEvent(w, 'updated', before);
        }
      } else {
        // L'archivio non modifica i costi collegati.
        Object.assign(w, { state: kind === 'archive' ? 'archived' : 'active', archivedAt: kind === 'archive' ? at : null, version: w.version + 1, updatedAt: at });
        this.workEvent(w, kind === 'archive' ? 'archived' : 'restored', before);
      }
      const replay = () => ({ work: this.workView(w, perms) });
      return { status: 200, body: replay(), replay };
    });
  }
}
