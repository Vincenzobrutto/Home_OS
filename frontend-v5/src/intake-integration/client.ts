import type { ApiClient } from '../api/client';
import { serviceError } from '../api/errors';
import { KINDS, type IntakeBatch, type IntakeItem, type IntakeCapabilities, type OrganizationSelection } from '../document-intake/model';
type WireItem = Omit<IntakeItem, 'permissions' | 'filename' | 'byteSize' | 'mimeType'> & { filename: string | null; byteSize: number | null; mimeType: string | null; permissions: string[]; organizationVersion: number | null; organization: { version: number; title: string; parts: Array<{ kind: string; pageFrom: number | null; pageTo: number | null }> } | null };
export type BatchWire = Omit<IntakeBatch, 'permissions' | 'items'> & { homeId: string; items: WireItem[]; permissions: string[] };
export type CapabilityWire = IntakeCapabilities & { apiVersion: 'document-intake-v1'; analysis: { enabled: boolean; label: string; provider: 'local_text_v1'; costUsd: '0.000000'; externalTransmission: false } };
const row = (x: unknown): Record<string, unknown> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {};
const check: (ok: unknown) => asserts ok = ok => { if (!ok) throw serviceError(200); };
const pos = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;
function parts(value: unknown) {
  check(Array.isArray(value) && value.length > 0 && value.length <= 12);
  for (const p of value) { const r = row(p); check(KINDS.includes(r.kind as typeof KINDS[number]) && (r.pageFrom === null && r.pageTo === null || pos(r.pageFrom) && pos(r.pageTo) && Number(r.pageFrom) <= Number(r.pageTo))); }
}
export function decodeBatch(input: unknown, homeId: string, id?: string): BatchWire {
  const batch = row(row(input).batch); check(typeof batch.id === 'string' && (!id || batch.id === id) && batch.homeId === homeId && pos(batch.version) && ['open', 'completed'].includes(String(batch.state)) && Array.isArray(batch.items) && batch.items.length <= 20 && Array.isArray(batch.permissions));
  const limits = row(batch.limits); check(pos(limits.maxFiles) && pos(limits.maxFileBytes) && pos(limits.maxTotalBytes) && Array.isArray(limits.acceptedMimeTypes) && limits.acceptedMimeTypes.every(m => ['application/pdf', 'image/jpeg', 'image/png'].includes(String(m))));
  const ids = new Set();
  for (const item of batch.items) {
    const i = row(item), link = row(i.documentLink); check(typeof i.id === 'string' && !ids.has(i.id) && pos(i.version)); ids.add(i.id);
    check(['pending', 'uploading', 'stored', 'duplicate', 'failed'].includes(String(i.uploadState)) && ['not_started', 'queued', 'running', 'ready', 'needs_choice', 'unreadable', 'unsupported', 'failed', 'uncertain'].includes(String(i.analysisState)) && ['unreviewed', 'saved', 'deferred', 'confirmed'].includes(String(i.reviewState)) && Array.isArray(i.permissions));
    check(['linked', 'unavailable'].includes(String(link.state)) && (link.state === 'linked' ? typeof row(link.document).id === 'string' && typeof row(link.document).name === 'string' : link.document === null));
    const hidden = link.state === 'unavailable' && ['stored', 'duplicate'].includes(String(i.uploadState));
    if (hidden) check(i.filename === null && i.byteSize === null && i.mimeType === null && i.proposal === null && i.selection === null && i.organization === null && i.permissions.length === 0);
    else check(typeof i.filename === 'string' && pos(i.byteSize) && typeof i.mimeType === 'string');
    if (i.proposal !== null) { const p = row(i.proposal); check(typeof p.title === 'string' && Array.isArray(p.sources)); parts(p.parts); for (const s of p.sources) check(pos(row(s).page) && typeof row(s).excerpt === 'string'); }
    if (i.organization !== null) { const org = row(i.organization); check(pos(org.version) && typeof org.title === 'string'); parts(org.parts); }
    if (i.selection !== null) { const sel = row(i.selection); check(['organize', 'defer'].includes(String(sel.action))); if (sel.action === 'organize') { check(typeof sel.title === 'string'); parts(sel.parts); const t = row(sel.target); check(t.kind === 'home' || ['object', 'boiler'].includes(String(t.kind)) && typeof t.id === 'string' && pos(t.expectedVersion)); } }
  }
  return batch as BatchWire;
}
export function toUiBatch(wire: BatchWire): IntakeBatch {
  const edit = wire.permissions.includes('edit');
  return { ...wire, permissions: { upload: edit, review: edit, confirm: edit }, items: wire.items.map(i => ({ ...i,
    filename: i.filename, byteSize: i.byteSize, mimeType: i.mimeType,
    // No stale metadata is reconstructed. The view must hide metadata for unavailable sources.
    organizationVersion: i.organizationVersion,
    confirmedOrganization: i.organization ? { title: i.organization.title, parts: i.organization.parts as NonNullable<IntakeItem['confirmedOrganization']>['parts'] } : null,
    permissions: { review: i.permissions.includes('edit') },
  })) };
}
export type BatchList = { items: Array<{ id: string; state: string; createdAt: string; itemCount: number }>; nextCursor: string | null };
export class IntakeClient {
  readonly base: string;
  private readonly api: ApiClient; readonly accountId: string; readonly homeId: string;
  constructor(api: ApiClient, accountId: string, homeId: string) { this.api = api; this.accountId = accountId; this.homeId = homeId; this.base = `/homes/${encodeURIComponent(homeId)}/document-intake`; }
  async capability(signal?: AbortSignal) { const v = await this.api.callJson<CapabilityWire>(this.base + '/capabilities', { accountId: this.accountId, signal }); check(v.apiVersion === 'document-intake-v1' && typeof v.enabled === 'boolean' && v.limits?.maxFiles === 20 && v.analysis?.provider === 'local_text_v1' && v.analysis.externalTransmission === false); return v; }
  async batch(id: string, signal?: AbortSignal) { return decodeBatch(await this.api.callJson(this.base + '/batches/' + encodeURIComponent(id), { accountId: this.accountId, signal }), this.homeId, id); }
  async list(cursor?: string, signal?: AbortSignal) { const v = await this.api.callJson<BatchList>(this.base + '/batches' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), { accountId: this.accountId, signal }); check(Array.isArray(v.items) && v.items.length <= 10 && (v.nextCursor === null || typeof v.nextCursor === 'string')); return v; }
  async create(files: File[], clientIds: string[], key: string) { return decodeBatch(await this.api.callJson(this.base + '/batches', { method: 'POST', accountId: this.accountId, idempotencyKey: key, body: { items: files.map((f, index) => ({ clientItemId: clientIds[index], filename: f.name, byteSize: f.size, mimeType: f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : /\.png$/i.test(f.name) ? 'image/png' : 'image/jpeg') })) } }), this.homeId); }
  async post(id: string, suffix: string, body: unknown, key: string) { const v = await this.api.callJson<Record<string, unknown>>(this.base + '/batches/' + encodeURIComponent(id) + suffix, { method: 'POST', body, idempotencyKey: key, accountId: this.accountId }); return { wire: decodeBatch(v, this.homeId, id), raw: v }; }
  async upload(id: string, itemId: string, file: File, signal?: AbortSignal) { const form = new FormData(); form.append('file', file, file.name); return decodeBatch(await this.api.callJson(this.base + `/batches/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}/file`, { method: 'POST', body: form, idempotencyKey: 'intake-upload-' + itemId, accountId: this.accountId, signal }), this.homeId, id); }
  async recovery(id: string, suffix: string) { const v = await this.api.callJson<Record<string, unknown>>(this.base + '/batches/' + encodeURIComponent(id) + suffix, { accountId: this.accountId }); return { wire: decodeBatch(v, this.homeId, id), raw: v }; }
}
export type ReviewWire = { expectedVersion: number; expectedOrganizationVersion: number; replaceOrganization: boolean; selection: OrganizationSelection };
