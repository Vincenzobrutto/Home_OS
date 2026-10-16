import type { ApiClient } from '../api/client';
import { serviceError } from '../api/errors';
import type { ConfirmationPayload, ConfirmationResult, ExpenseRef, ObjectRef, PersistedComparison, ReceiptCapabilities, ReceiptDraft, ReceiptProposals, TextProposal } from '../receipt-assistance/model';

type Row = Record<string, unknown>;
const row = (v: unknown): Row => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw serviceError(200); return v as Row; };
const check: (v: unknown) => asserts v = v => { if (!v) throw serviceError(200); };
const str = (v: unknown): v is string => typeof v === 'string';
const positive = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const identity = (v: Row) => check(str(v.id) && v.id.length > 0 && positive(v.version));
const list = (v: unknown): unknown[] => { check(Array.isArray(v)); return v; };
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(str);
const nullableString = (v: unknown) => v === null || str(v);
const choice = (input: unknown) => { const v = row(input); check(['create', 'skip', 'unset', 'reuse'].includes(String(v.kind)) && (v.kind !== 'reuse' || str(v.id))); };
function proposal(input: unknown): TextProposal {
  const v = row(input); check(str(v.value));
  const sources = citations(v.sources);
  return { value: v.value, sources };
}
function citations(input: unknown) {
  return list(input).map(source => { const v = row(source); check(positive(v.page) && str(v.excerpt)); return { page: v.page, excerpt: v.excerpt }; });
}
function confirmation(input: unknown): ConfirmationResult | null {
  if (input === null) return null;
  const v = row(input); check((v.newObjects === 0 || v.newObjects === 1) && (v.newExpenses === 0 || v.newExpenses === 1) && Number.isSafeInteger(v.openComparisons) && Number(v.openComparisons) >= 0);
  if (v.object !== null) { const target = row(v.object); check(str(target.id) && str(target.name)); }
  if (v.expense !== null) { const target = row(v.expense); check(str(target.id) && str(target.title) && positive(target.amountCents)); }
  return v as ConfirmationResult;
}
export type DraftWire = Omit<ReceiptDraft, 'origin' | 'proposals' | 'linkedObjects' | 'linkedExpenses' | 'openComparisons'> & {
  homeId: string; mode: 'manual' | 'extraction'; fields: ReceiptProposals; total: ReceiptProposals['total'];
  documentLink: { state: 'linked' | 'unavailable'; document: { id: string; name: string } | null };
  permissions: string[];
};
export function decodeDraft(input: unknown, homeId: string, id?: string): DraftWire {
  const v = row(row(input).draft); identity(v);
  check(v.homeId === homeId && (!id || v.id === id) && ['manual', 'extraction'].includes(String(v.mode)) && ['open', 'parked', 'confirmed', 'partially_resolved'].includes(String(v.state)) && strings(v.permissions));
  const link = row(v.documentLink); check(['linked', 'unavailable'].includes(String(link.state)));
  if (link.state === 'linked') { const doc = row(link.document); check(str(doc.id) && str(doc.name)); } else check(link.document === null);
  const fields: ReceiptProposals = {};
  for (const [key, value] of Object.entries(row(v.fields))) {
    check(['name', 'brand', 'model', 'title', 'supplier', 'documentDate', 'documentNumber'].includes(key));
    fields[key as keyof Omit<ReceiptProposals, 'total'>] = proposal(value);
  }
  let total: ReceiptProposals['total'] = null;
  if (v.total !== null) { const amount = row(v.total); check(positive(amount.amountCents)); total = { amountCents: amount.amountCents, sources: citations(amount.sources) }; }
  const result = confirmation(v.confirmation);
  if (v.review !== null) {
    const review = row(v.review), form = row(review.form), values = row(form.values), versions = row(review.targetVersions);
    check(['name', 'brand', 'model', 'title', 'supplier', 'date', 'amount'].every(key => str(values[key])) && typeof form.enrich === 'boolean');
    choice(form.object); choice(form.expense); check(Object.values(row(form.decisions)).every(value => value === 'keep_existing' || value === 'defer'));
    check(strings(review.staleTargets) && (versions.object === null || positive(versions.object)) && (versions.expense === null || positive(versions.expense)));
  }
  // A redacted source must never carry cached values into an editable form.
  check(link.state !== 'unavailable' || (!Object.keys(fields).length && total === null && v.review === null && result === null));
  return { ...v, fields, total, confirmation: result } as DraftWire;
}
export type CandidateWire<T> = { items: T[]; linkedCount: number; nextCursor: string | null };
export function decodeCandidates<T extends ObjectRef | ExpenseRef>(input: unknown, kind: 'object' | 'expense'): CandidateWire<T> {
  const v = row(input); check(Number.isSafeInteger(v.linkedCount) && Number(v.linkedCount) >= 0 && nullableString(v.nextCursor));
  const items = list(v.items).map(input => {
    const target = row(input); identity(target); check(typeof target.linkedToDocument === 'boolean' && strings(target.reasons));
    if (kind === 'object') {
      check(str(target.name) && nullableString(target.roomName));
      for (const key of ['brand', 'model']) if (target[key] !== null) { const field = row(target[key]); check(str(field.value) && str(field.origin)); }
    } else check(str(target.title) && positive(target.amountCents) && str(target.spentOn) && /^\d{4}-\d{2}-\d{2}$/.test(target.spentOn));
    return target as T;
  });
  check(new Set(items.map(v => v.id)).size === items.length);
  return { items, linkedCount: v.linkedCount as number, nextCursor: v.nextCursor as string | null };
}
export type ComparisonWire = { id: string; version: number; state: 'open' | 'resolved' | 'unavailable'; object: { id: string; name: string; version: number } | null; fieldKey: 'brand' | 'model' | null; existing: string | null; proposed: TextProposal | null; permissions: string[]; draftId?: string | null; documentLink?: DraftWire['documentLink'] };
export function decodeComparisons(input: unknown) {
  const v = row(input); check(nullableString(v.nextCursor));
  const items = list(v.items).map(input => {
    const v = row(input); identity(v); check(['open', 'resolved', 'unavailable'].includes(String(v.state)) && strings(v.permissions));
    if (v.state === 'unavailable') check(v.object === null && v.fieldKey === null && v.existing === null && v.proposed === null);
    else { const target = row(v.object); identity(target); check(str(target.name) && ['brand', 'model'].includes(String(v.fieldKey)) && str(v.existing)); proposal(v.proposed); }
    if ('draftId' in v || 'documentLink' in v) {
      const link = row(v.documentLink);
      if (v.state === 'unavailable') check(v.draftId === null && link.state === 'unavailable' && link.document === null);
      else { const doc = row(link.document); check(str(v.draftId) && link.state === 'linked' && str(doc.id) && str(doc.name)); }
    }
    return v as ComparisonWire;
  });
  return { items, nextCursor: v.nextCursor as string | null };
}
export function openComparison(v: ComparisonWire): PersistedComparison | null {
  return v.state === 'open' && v.object && v.fieldKey && v.existing !== null && v.proposed ? { id: v.id, version: v.version, objectId: v.object.id, objectName: v.object.name, field: v.fieldKey, existing: v.existing, proposed: v.proposed } : null;
}
export function toReceiptDraft(wire: DraftWire, objects: CandidateWire<ObjectRef>, expenses: CandidateWire<ExpenseRef>, comparisons: ComparisonWire[]): ReceiptDraft {
  return { id: wire.id, version: wire.version, state: wire.state, origin: wire.mode, proposals: wire.mode === 'manual' ? {} : { ...wire.fields, total: wire.total }, linkedObjects: objects.items.filter(item => item.linkedToDocument), linkedExpenses: expenses.items.filter(item => item.linkedToDocument), linkedObjectsCount: objects.linkedCount, linkedExpensesCount: expenses.linkedCount, openComparisons: comparisons.flatMap(item => { const open = openComparison(item); return open ? [open] : []; }), confirmation: wire.confirmation, review: wire.review };
}
export type JobWire = { id: string; version: number; provider: string; isSimulation: boolean; state: 'queued' | 'running' | 'succeeded' | 'failed' | 'unavailable'; draftId: string | null; errorCode: string | null; documentLink: DraftWire['documentLink'] };
function decodeJob(input: unknown, id?: string): JobWire {
  const v = row(row(input).job); identity(v); check((!id || v.id === id) && str(v.provider) && typeof v.isSimulation === 'boolean' && ['queued', 'running', 'succeeded', 'failed', 'unavailable'].includes(String(v.state)) && nullableString(v.draftId) && nullableString(v.errorCode));
  const link = row(v.documentLink); check(['linked', 'unavailable'].includes(String(link.state)));
  if (link.state === 'linked') { const doc = row(link.document); check(str(doc.id) && str(doc.name)); } else check(link.document === null && v.state === 'unavailable' && v.draftId === null && v.errorCode === null);
  check(v.state !== 'succeeded' || str(v.draftId));
  return v as JobWire;
}
export type ReceiptCapabilityWire = ReceiptCapabilities & { today: string; apiVersion: 'receipt-assistance-v1' };
export class ReceiptClient {
  private readonly base: string;
  private readonly api: ApiClient;
  readonly accountId: string;
  readonly homeId: string;
  constructor(api: ApiClient, accountId: string, homeId: string) {
    this.api = api; this.accountId = accountId; this.homeId = homeId;
    this.base = `/homes/${encodeURIComponent(homeId)}/receipt-assistance`;
  }
  private get(path: string, signal?: AbortSignal, idempotencyKey?: string) {
    // Recovery uses GET with the same idempotency header; callJson intentionally exposes that header below.
    return this.api.callJson<unknown>(`${this.base}${path}`, { accountId: this.accountId, signal, idempotencyKey });
  }
  private post(path: string, body: unknown, key: string) { return this.api.callJson<unknown>(`${this.base}${path}`, { method: 'POST', body, idempotencyKey: key, accountId: this.accountId }); }
  async capabilities(signal?: AbortSignal, documentId?: string): Promise<ReceiptCapabilityWire> {
    const v = row(await this.get(`/capabilities${documentId ? `?documentId=${encodeURIComponent(documentId)}` : ''}`, signal));
    check(v.apiVersion === 'receipt-assistance-v1' && typeof v.enabled === 'boolean' && typeof v.manualEnabled === 'boolean' && str(v.today) && /^\d{4}-\d{2}-\d{2}$/.test(v.today));
    for (const input of list(v.providers)) { const p = row(input); check(str(p.id) && str(p.label) && typeof p.requiresConsent === 'boolean' && str(p.consentText) && nullableString(p.costNote)); }
    return v as ReceiptCapabilityWire;
  }
  async draft(id: string, signal?: AbortSignal) { return decodeDraft(await this.get(`/drafts/${encodeURIComponent(id)}`, signal), this.homeId, id); }
  async manual(documentId: string, key: string) { return decodeDraft(await this.post('/manual-drafts', { documentId }, key), this.homeId); }
  async objects(id: string, cursor: string | null, signal?: AbortSignal) { return decodeCandidates<ObjectRef>(await this.get(`/drafts/${encodeURIComponent(id)}/object-candidates?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, signal), 'object'); }
  async expenses(id: string, cursor: string | null, signal?: AbortSignal) { return decodeCandidates<ExpenseRef>(await this.get(`/drafts/${encodeURIComponent(id)}/expense-candidates?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, signal), 'expense'); }
  async comparisons(filters: { objectId?: string; draftId?: string; cursor?: string }, signal?: AbortSignal) { const q = new URLSearchParams({ state: 'open', limit: '50', ...filters }); return decodeComparisons(await this.get(`/comparisons?${q}`, signal)); }
  async confirm(payload: ConfirmationPayload, key: string) { const { draftId, ...body } = payload; return decodeDraft(await this.post(`/drafts/${encodeURIComponent(draftId)}/confirmations`, body, key), this.homeId, draftId); }
  async recover(id: string, key: string) { const v = row(await this.get(`/drafts/${encodeURIComponent(id)}/confirmation`, undefined, key)); check(v.status === 'not_found' || v.status === 'confirmed'); return v.status === 'not_found' ? null : decodeDraft({ draft: v.draft }, this.homeId, id); }
  async park(payload: ConfirmationPayload, key: string) { const { draftId, expectedVersion, object, expense } = payload; return decodeDraft(await this.post(`/drafts/${encodeURIComponent(draftId)}/park`, { expectedVersion, selection: { object, expense } }, key), this.homeId, draftId); }
  async reopen(id: string, expectedVersion: number, key: string) { return decodeDraft(await this.post(`/drafts/${encodeURIComponent(id)}/reopen`, { expectedVersion }, key), this.homeId, id); }
  async start(documentId: string, provider: string, consentToProviderTransfer: boolean, key: string) { return decodeJob(await this.post('/jobs', { documentId, provider, consentToProviderTransfer }, key)); }
  async job(id: string, signal?: AbortSignal) { return decodeJob(await this.get(`/jobs/${encodeURIComponent(id)}`, signal), id); }
  async resolve(id: string, expectedVersion: number, action: 'keep_existing' | 'defer', key: string) { return this.post(`/comparisons/${encodeURIComponent(id)}/resolutions`, { expectedVersion, action }, key); }
  async fields(id: string, signal?: AbortSignal): Promise<ObjectFieldsWire> {
    const v = row(await this.get(`/object-fields/${encodeURIComponent(id)}`, signal)), target = row(v.object), fields = row(v.fields);
    identity(target); check(target.id === id && nullableString(target.name) && str(target.state));
    for (const key of ['name', 'brand', 'model']) {
      if (fields[key] === null) continue;
      const field = row(fields[key]);
      if (field.state === 'unavailable') check(field.value === null && Array.isArray(field.sources) && field.sources.length === 0);
      else { check(field.state === 'confirmed' && str(field.value) && ['user_declared', 'extraction_confirmed'].includes(String(field.origin)) && positive(field.version)); citations(field.sources); }
    }
    return v as ObjectFieldsWire;
  }
}
export type ObjectFieldsWire = { object: { id: string; version: number; name: string | null; state: string }; fields: Record<'name' | 'brand' | 'model', null | { state: 'unavailable' } | { state: 'confirmed'; value: string; origin: 'user_declared' | 'extraction_confirmed'; version: number; sources: Array<{ documentId?: string; page: number; excerpt: string }> }> };
