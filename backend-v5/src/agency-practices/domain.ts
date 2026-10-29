import { createHash } from 'node:crypto';

export type AgencyRole = 'admin' | 'agent' | 'viewer';
export type Action = 'read' | 'edit' | 'export';
export type Window = { validFrom: string; validUntil: string | null; revokedAt: string | null };
export type AgencyMembership = Window & { agencyId: string; accountId: string; role: AgencyRole };
export type PracticeGrant = Window & { agencyId: string; practiceId: string; accountId: string; access: 'read' | 'edit'; canExport: boolean };
export type Actor = { accountId: string; memberships: AgencyMembership[]; grants: PracticeGrant[] };
export type Evidence = { sourceId: string; version: number; sha256: string; page: number; excerpt: string };
export type SourceVersion = { version: number; sha256: string; originalFilename: string; mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'; byteSize: number; receivedAt: string; receivedBy: string };
export type Source = { id: string; practiceId: string; agencyId: string; uploaderId: string; visibility: 'private' | 'practice'; withdrawnAt: string | null; kind: 'unclassified' | 'deed' | 'cadastral' | 'floor_plan' | 'succession' | 'ape' | 'other'; versions: SourceVersion[] };
export type DependentRecord = { id: string; state: 'current' | 'stale'; sources: Evidence[] };
export type Receipt = { accountId: string; key: string; digest: string; revision: number; sourceId: string };
export type Event = { id: number; actorId: string; at: string; operation: string; sourceId: string; revision: number };
export type Practice = { id: string; agencyId: string; label: string; revision: number; sources: Source[]; dependents: DependentRecord[]; receipts: Receipt[]; events: Event[] };
export class PracticeError extends Error {
  constructor(public readonly code: 'access_denied' | 'invalid_input' | 'revision_conflict' | 'idempotency_conflict' | 'source_changed') { super(code); }
}
function fail(code: PracticeError['code']): never { throw new PracticeError(code); }
const instant = (value: string): number => { const time = Date.parse(value); return Number.isFinite(time) ? time : NaN; };
export function active(window: Window, now: string): boolean {
  const at = instant(now), from = instant(window.validFrom), until = window.validUntil === null ? Infinity : instant(window.validUntil);
  // A recorded revocation never becomes an access grant, even if its timestamp is in the future.
  return window.revokedAt === null && Number.isFinite(at) && Number.isFinite(from) && from <= at && at < until;
}
export function requirePractice(actor: Actor, practice: Pick<Practice, 'id' | 'agencyId'>, action: Action, now: string): void {
  const membership = actor.memberships.find(m => m.accountId === actor.accountId && m.agencyId === practice.agencyId && active(m, now));
  const grant = actor.grants.find(g => g.accountId === actor.accountId && g.agencyId === practice.agencyId && g.practiceId === practice.id && active(g, now));
  if (!membership || !grant || !['admin', 'agent', 'viewer'].includes(membership.role) || !['read', 'edit'].includes(grant.access)) fail('access_denied');
  if (action !== 'read' && membership.role === 'viewer' || action === 'edit' && grant.access !== 'edit' || action === 'export' && !grant.canExport) fail('access_denied');
}
export function sourceReadable(actor: Actor, practice: Practice, source: Source, now: string, action: 'read' | 'export' = 'read'): boolean {
  try { requirePractice(actor, practice, action, now); } catch { return false; }
  return source.agencyId === practice.agencyId && source.practiceId === practice.id && source.withdrawnAt === null && (source.visibility === 'practice' || source.uploaderId === actor.accountId);
}
export function visibleSources(actor: Actor, practice: Practice, now: string): Source[] {
  requirePractice(actor, practice, 'read', now);
  return structuredClone(practice.sources.filter(source => sourceReadable(actor, practice, source, now)));
}
export function practiceSummary(actor: Actor, practice: Practice, now: string) {
  const sources = visibleSources(actor, practice, now);
  return { id: practice.id, agencyId: practice.agencyId, label: practice.label, revision: practice.revision, visibleDocumentCount: sources.length, documents: sources.map(s => ({ id: s.id, kind: s.kind, visibility: s.visibility, version: s.versions.at(-1)!.version, filename: s.versions.at(-1)!.originalFilename })) };
}
export function exportManifest(actor: Actor, practice: Practice, input: unknown, now: string) {
  requirePractice(actor, practice, 'export', now);
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) fail('invalid_input');
  const selected = input.map(value => {
    const row = object(value, ['sourceId', 'version', 'sha256']);
    if (!Number.isSafeInteger(row.version) || Number(row.version) < 1 || typeof row.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(row.sha256)) fail('invalid_input');
    return { sourceId: text(row.sourceId, 100), version: Number(row.version), sha256: row.sha256 };
  });
  if (new Set(selected.map(s => s.sourceId)).size !== selected.length) fail('invalid_input');
  // Authorize the complete selection before exposing even a subset of it.
  const sources = selected.map(item => {
    const source = practice.sources.find(s => s.id === item.sourceId);
    if (!source || !sourceReadable(actor, practice, source, now, 'export')) fail('access_denied');
    return source;
  });
  const manifest = sources.map((source, i) => {
    const current = source.versions.at(-1)!;
    if (current.version !== selected[i].version || current.sha256 !== selected[i].sha256) fail('source_changed');
    return { sourceId: source.id, version: current.version, sha256: current.sha256, originalFilename: current.originalFilename, mimeType: current.mimeType, byteSize: current.byteSize };
  });
  if (manifest.reduce((total, item) => total + item.byteSize, 0) > 100 * 1024 * 1024) fail('invalid_input');
  return manifest;
}
export function evidenceCurrent(actor: Actor, practice: Practice, proof: Evidence, now: string, action: 'read' | 'export' = 'read'): boolean {
  const source = practice.sources.find(s => s.id === proof.sourceId);
  if (!source || !sourceReadable(actor, practice, source, now, action)) return false;
  const current = source.versions.at(-1);
  return !!current && proof.version === current.version && proof.sha256 === current.sha256 && Number.isInteger(proof.page) && proof.page > 0 && typeof proof.excerpt === 'string' && proof.excerpt.trim().length > 0 && proof.excerpt.length <= 4000;
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || Array.from(value).some(c => c.charCodeAt(0) < 32 && !['\t', '\n', '\r'].includes(c))) fail('invalid_input');
  return value.trim();
}
export function newPractice(id: string, agencyId: string, label: string): Practice {
  return { id: text(id, 100), agencyId: text(agencyId, 100), label: text(label, 200), revision: 1, sources: [], dependents: [], receipts: [], events: [] };
}
type Fingerprint = Pick<SourceVersion, 'sha256' | 'originalFilename' | 'mimeType' | 'byteSize'>;
export type Command =
  | { operation: 'attach'; sourceId: string; visibility: Source['visibility']; file: Fingerprint }
  | { operation: 'replace'; sourceId: string; expectedSourceVersion: number; file: Fingerprint }
  | { operation: 'classify'; sourceId: string; expectedSourceVersion: number; kind: Source['kind'] }
  | { operation: 'withdraw'; sourceId: string; expectedSourceVersion: number };
export type Request = { key: string; expectedRevision: number; command: Command };
function object(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).some(k => !allowed.includes(k))) fail('invalid_input');
  return value as Record<string, unknown>;
}
export function parseRequest(value: unknown): Request {
  const r = object(value, ['key', 'expectedRevision', 'command']);
  if (!Number.isSafeInteger(r.expectedRevision) || Number(r.expectedRevision) < 1) fail('invalid_input');
  const c = object(r.command, ['operation', 'sourceId', 'visibility', 'file', 'expectedSourceVersion', 'kind']);
  const operation = c.operation;
  if (!['attach', 'replace', 'classify', 'withdraw'].includes(String(operation))) fail('invalid_input');
  const allowed = operation === 'attach' ? ['operation', 'sourceId', 'visibility', 'file'] : operation === 'replace' ? ['operation', 'sourceId', 'expectedSourceVersion', 'file'] : operation === 'classify' ? ['operation', 'sourceId', 'expectedSourceVersion', 'kind'] : ['operation', 'sourceId', 'expectedSourceVersion'];
  if (Object.keys(c).some(k => !allowed.includes(k))) fail('invalid_input');
  const sourceId = text(c.sourceId, 100);
  if (operation !== 'attach' && (!Number.isSafeInteger(c.expectedSourceVersion) || Number(c.expectedSourceVersion) < 1)) fail('invalid_input');
  let file: Fingerprint | undefined;
  if (operation === 'attach' || operation === 'replace') {
    const f = object(c.file, ['sha256', 'originalFilename', 'mimeType', 'byteSize']);
    if (typeof f.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(f.sha256) || !['application/pdf', 'image/jpeg', 'image/png'].includes(String(f.mimeType)) || !Number.isSafeInteger(f.byteSize) || Number(f.byteSize) < 1 || Number(f.byteSize) > 20 * 1024 * 1024) fail('invalid_input');
    const originalFilename = text(f.originalFilename, 255);
    if (/[/\\]/u.test(originalFilename)) fail('invalid_input');
    file = { sha256: f.sha256, mimeType: f.mimeType as Fingerprint['mimeType'], byteSize: Number(f.byteSize), originalFilename };
  }
  let command: Command;
  if (operation === 'attach') {
    if (c.visibility !== 'private' && c.visibility !== 'practice') fail('invalid_input');
    command = { operation, sourceId, visibility: c.visibility, file: file! };
  } else if (operation === 'replace') command = { operation, sourceId, expectedSourceVersion: Number(c.expectedSourceVersion), file: file! };
  else if (operation === 'classify') {
    if (!['unclassified', 'deed', 'cadastral', 'floor_plan', 'succession', 'ape', 'other'].includes(String(c.kind))) fail('invalid_input');
    command = { operation, sourceId, expectedSourceVersion: Number(c.expectedSourceVersion), kind: c.kind as Source['kind'] };
  } else command = { operation: 'withdraw', sourceId, expectedSourceVersion: Number(c.expectedSourceVersion) };
  return { key: text(r.key, 120), expectedRevision: Number(r.expectedRevision), command };
}
const fingerprint = (request: Request): string => createHash('sha256').update(JSON.stringify(request)).digest('hex');
export type Outcome = { practice: Practice; replay: boolean; receipt: Receipt };
export function applyRequest(actor: Actor, original: Practice, input: unknown, now: string): Outcome {
  requirePractice(actor, original, 'edit', now);
  if (!Number.isFinite(instant(now))) fail('invalid_input');
  const request = parseRequest(input), command = request.command;
  const prior = original.receipts.find(r => r.accountId === actor.accountId && r.key === request.key);
  const existing = original.sources.find(s => s.id === command.sourceId);
  // An exact withdrawal replay may return its receipt, never reopen the file.
  const withdrawalReplay = prior && command.operation === 'withdraw' && existing?.withdrawnAt !== null && existing?.agencyId === original.agencyId && existing?.practiceId === original.id && (existing?.visibility === 'practice' || existing?.uploaderId === actor.accountId);
  if (existing && !sourceReadable(actor, original, existing, now) && !withdrawalReplay) fail('access_denied');
  if (prior) {
    if (prior.digest !== fingerprint(request)) fail('idempotency_conflict');
    return { practice: structuredClone(original), replay: true, receipt: structuredClone(prior) };
  }
  if (request.expectedRevision !== original.revision) fail('revision_conflict');
  if (command.operation === 'attach' && existing) fail('idempotency_conflict');
  if (command.operation !== 'attach' && !existing) fail('access_denied');
  if (existing && command.operation !== 'attach' && command.expectedSourceVersion !== existing.versions.at(-1)?.version) fail('source_changed');
  const practice = structuredClone(original);
  const source = practice.sources.find(s => s.id === command.sourceId);
  const version = (file: Fingerprint, n: number): SourceVersion => ({ ...file, version: n, receivedAt: now, receivedBy: actor.accountId });
  if (command.operation === 'attach') practice.sources.push({ id: command.sourceId, agencyId: practice.agencyId, practiceId: practice.id, uploaderId: actor.accountId, visibility: command.visibility, kind: 'unclassified', withdrawnAt: null, versions: [version(command.file, 1)] });
  else if (source && command.operation === 'replace') {
    if (source.versions.at(-1)?.sha256 === command.file.sha256) fail('invalid_input');
    source.versions.push(version(command.file, command.expectedSourceVersion + 1));
    source.kind = 'unclassified';
  } else if (source && command.operation === 'classify') source.kind = command.kind;
  else if (source && command.operation === 'withdraw') source.withdrawnAt = now;
  if (command.operation !== 'attach') for (const dependency of practice.dependents) if (dependency.sources.some(s => s.sourceId === command.sourceId)) dependency.state = 'stale';
  practice.revision++;
  const receipt: Receipt = { accountId: actor.accountId, key: request.key, digest: fingerprint(request), revision: practice.revision, sourceId: command.sourceId };
  practice.receipts.push(receipt);
  practice.events.push({ id: practice.events.length + 1, actorId: actor.accountId, at: now, operation: command.operation, sourceId: command.sourceId, revision: practice.revision });
  return { practice, replay: false, receipt };
}
