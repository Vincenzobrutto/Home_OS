import { createHash, timingSafeEqual } from 'node:crypto';
import { evidenceCurrent, requirePractice, PracticeError, type Actor, type Practice } from '../agency-practices/domain';
import type { PlanProof } from './pipeline';

export type Phase = 'inventory' | 'review';
type Usage = { input: number; output: number; requestId: string };
type Reservation = { phase: Phase; fingerprint: string; maxMicros: number; at: string; state: 'reserved' | 'settled' | 'uncertain'; usage?: Usage; costMicros?: number };
export type PlanJob = { instructions?:string; id: string; creatorId: string; authorizationId: string; proof: PlanProof; capMicros: number; priceVersion: string; model: string; inputMicrosPerMillion: number; outputMicrosPerMillion: number; tokenHash: string; createdAt: string; leaseUntil: string | null; status: 'queued' | 'leased' | 'uncertain' | 'completed' | 'failed'; reservations: Reservation[] };
type State = Practice & { planJobs?: PlanJob[] };
function fail(code: ConstructorParameters<typeof PracticeError>[0]): never { throw new PracticeError(code); }
function text(v: unknown, max = 120): string { if (typeof v !== 'string' || !v.trim() || v.length > max || Array.from(v).some(c => c.charCodeAt(0) < 32)) fail('invalid_input'); return v.trim(); }
function instructions(v:unknown){if(v===undefined)return '';if(typeof v!=='string'||v.length>4000||Array.from(v).some(c=>c.charCodeAt(0)<32&&!['\n','\r','\t'].includes(c)))fail('invalid_input');return v;}
function integer(v: unknown, max = 2_000_000) { if (!Number.isSafeInteger(v) || Number(v) < 0 || Number(v) > max) fail('invalid_input'); return Number(v); }
function at(now: string) { const n = Date.parse(now); if (!Number.isFinite(n)) fail('invalid_input'); return n; }
function secret(token: string) { if (typeof token !== 'string' || !/^[a-f0-9]{64}$/u.test(token)) fail('access_denied'); return createHash('sha256').update(token).digest('hex'); }
function job(p: State, id: string, token: string) { const j = p.planJobs?.find(j => j.id === id), hash = secret(token); if (!j || !timingSafeEqual(Buffer.from(j.tokenHash, 'hex'), Buffer.from(hash, 'hex'))) fail('access_denied'); return j; }
function authorized(actor: Actor, p: Practice, j: Pick<PlanJob,'creatorId'|'proof'>, now: string) {
  requirePractice(actor, p, 'edit', now); if (actor.accountId !== j.creatorId) fail('access_denied');
  if (!evidenceCurrent(actor, p, { ...j.proof, excerpt: 'Plan job source' }, now)) fail('source_changed');
  if (p.sources.find(s => s.id === j.proof.sourceId)?.kind !== 'floor_plan') fail('invalid_input');
}
function changed(p: Practice, now: string, id: string, operation: string, actorId: string) { p.revision++; p.events.push({ id: p.events.length + 1, at: now, actorId, operation: 'plan-job:' + operation, sourceId: id, revision: p.revision }); return p; }
/** Server-issued authorization for ONE run only. Not a public consent DTO or an agency-wide budget. */
export function enqueuePlanJob(actor: Actor, original: Practice, input: Omit<PlanJob,'creatorId'|'tokenHash'|'createdAt'|'leaseUntil'|'status'|'reservations'>, token: string, now: string) {
  at(now); authorized(actor, original, { creatorId: actor.accountId, proof: input.proof }, now);
  const candidate: PlanJob = { instructions:instructions(input.instructions),id: text(input.id), creatorId: actor.accountId, authorizationId: text(input.authorizationId), proof: structuredClone(input.proof), capMicros: integer(input.capMicros), priceVersion: text(input.priceVersion), model: text(input.model), inputMicrosPerMillion: integer(input.inputMicrosPerMillion, 1_000_000_000), outputMicrosPerMillion: integer(input.outputMicrosPerMillion, 1_000_000_000), tokenHash: secret(token), createdAt: now, leaseUntil: null, status: 'queued', reservations: [] };
  if (candidate.capMicros < 1) fail('invalid_input');
  const p = structuredClone(original) as State; p.planJobs ??= [];
  const prior = p.planJobs.find(j => j.id === candidate.id || j.authorizationId === candidate.authorizationId);
  if (prior) {
    // JSONB does not preserve object property order. Identity includes only
    // immutable request fields, in an explicit canonical sequence.
    const identity = (j: PlanJob) => JSON.stringify([j.instructions||"",j.id,j.creatorId,j.authorizationId,j.proof.sourceId,j.proof.version,j.proof.sha256,j.proof.page,j.capMicros,j.priceVersion,j.model,j.inputMicrosPerMillion,j.outputMicrosPerMillion,j.tokenHash]);
    if (identity(prior) !== identity(candidate)) fail('idempotency_conflict'); return { practice: p, replay: true };
  }
  if (p.planJobs.length >= 100) fail('invalid_input'); p.planJobs.push(candidate); changed(p, now, candidate.proof.sourceId, 'enqueue', actor.accountId); return { practice: p, replay: false };
}
export function claimPlanJob(actor: Actor, original: Practice, id: string, token: string, now: string) {
  const p = structuredClone(original) as State, j = job(p, id, token), time = at(now); authorized(actor, p, j, now);
  if (j.status === 'completed' || j.status === 'uncertain' || j.status==='failed' || j.status === 'leased' && time < Date.parse(j.leaseUntil!)) fail('revision_conflict');
  // No lease handover without a future fencing protocol: even an apparently
  // idle expired worker may still be running. Never let two workers dispatch.
  if (j.status === 'leased') { j.status = 'uncertain'; changed(p, now, j.proof.sourceId, 'expired-uncertain', actor.accountId); return { practice: p, acquired: false }; }
  j.status = 'leased'; j.leaseUntil = new Date(time + 300_000).toISOString(); changed(p, now, j.proof.sourceId, 'claim', actor.accountId); return { practice: p, acquired: true };
}
export function reservePlanPhase(actor: Actor, original: Practice, id: string, token: string, phase: Phase, fingerprint: string, maxMicros: number, now: string) {
  const p = structuredClone(original) as State, j = job(p, id, token); authorized(actor, p, j, now);
  if (!['inventory','review'].includes(phase) || !/^[a-f0-9]{64}$/u.test(fingerprint) || integer(maxMicros, 1_000_000) < 1) fail('invalid_input');
  if (j.status !== 'leased' || at(now) >= Date.parse(j.leaseUntil!)) fail('revision_conflict');
  // A duplicate dispatch is NEVER treated as a successful reservation/retry.
  if (j.reservations.some(r => r.phase === phase)) fail('idempotency_conflict');
  if (phase === 'review' && (j.reservations.length !== 1 || j.reservations[0].phase !== 'inventory' || j.reservations[0].state !== 'settled') || phase === 'inventory' && j.reservations.length) fail('invalid_input');
  if (j.reservations.some(r => r.fingerprint !== fingerprint) || j.reservations.reduce((s,r) => s + (r.costMicros ?? r.maxMicros), 0) + maxMicros > j.capMicros) fail('invalid_input');
  j.reservations.push({ phase, fingerprint, maxMicros, at: now, state: 'reserved' }); changed(p, now, j.proof.sourceId, 'reserve:' + phase, actor.accountId); return p;
}
/** Capability-scoped accounting remains possible after user revocation/lease expiry.
 * It cannot read originals, start a new phase or release an uncertain reservation. */
export function settlePlanPhase(original: Practice, id: string, token: string, phase: Phase, usage: Usage, now: string) {
  at(now); const p = structuredClone(original) as State, j = job(p, id, token), r = j.reservations.find(r => r.phase === phase);
  if (!r) fail('invalid_input');
  const normalized = { input: integer(usage.input, 1_000_000), output: integer(usage.output, 100_000), requestId: text(usage.requestId) };
  if (j.reservations.some(other => other !== r && other.usage?.requestId === normalized.requestId)) fail('idempotency_conflict');
  const costMicros = Math.ceil((normalized.input * j.inputMicrosPerMillion + normalized.output * j.outputMicrosPerMillion) / 1_000_000);
  if (r.usage) { if (r.usage.input !== normalized.input || r.usage.output !== normalized.output || r.usage.requestId !== normalized.requestId) fail('idempotency_conflict'); return { practice: p, replay: true, costMicros: r.costMicros! }; }
  r.usage = normalized; r.costMicros = costMicros; r.state = 'settled';
  if (costMicros > r.maxMicros || j.status === 'uncertain' || at(now) >= Date.parse(j.leaseUntil!)) j.status = 'uncertain';
  changed(p, now, j.proof.sourceId, 'settle:' + phase, j.creatorId); return { practice: p, replay: false, costMicros };
}
export function markPlanUncertain(original: Practice, id: string, token: string, phase: Phase, now: string) {
  at(now); const p = structuredClone(original) as State, j = job(p, id, token), r = j.reservations.find(r => r.phase === phase);
  if (!r) fail('invalid_input'); if (j.status === 'completed') fail('revision_conflict');
  if (j.status === 'uncertain' && (r.state === 'uncertain' || r.usage)) return p;
  j.status = 'uncertain'; if (!r.usage) r.state = 'uncertain'; changed(p, now, j.proof.sourceId, 'uncertain:' + phase, j.creatorId); return p;
}
export function finishPlanJob(actor: Actor, original: Practice, id: string, token: string, now: string) {
  const p = structuredClone(original) as State, j = job(p, id, token); authorized(actor, p, j, now);
  if (j.status !== 'leased' || at(now) >= Date.parse(j.leaseUntil!) || j.reservations.length !== 2 || j.reservations.some(r => r.state !== 'settled')) fail('revision_conflict');
  j.status = 'completed'; changed(p, now, j.proof.sourceId, 'complete', actor.accountId); return p;
}
/** Safe only before any reservation/dispatch. Capability cannot release uncertain or billed work. */
export function failPlanBeforeDispatch(original:Practice,id:string,token:string,now:string){const p=structuredClone(original) as State,j=job(p,id,token);at(now);if(j.status==='failed')return p;if(j.status!=='leased'||j.reservations.length)fail('revision_conflict');j.status='failed';changed(p,now,j.proof.sourceId,'failed-before-dispatch',j.creatorId);return p;}
export function planJobViews(actor: Actor, p: Practice, now: string) {
  requirePractice(actor, p, 'read', now);
  return ((p as State).planJobs || []).filter(j => { try { authorized(actor,p,j,now); return true; } catch { return false; } }).map(j => ({ id: j.id, status: j.status === 'leased' && at(now) >= Date.parse(j.leaseUntil!) ? 'expired' : j.status, capMicros: j.capMicros, spentMicros: j.reservations.reduce((s,r) => s + (r.costMicros || 0),0), committedMicros: j.reservations.reduce((s,r) => s + (r.costMicros ?? r.maxMicros),0), priceVersion: j.priceVersion, model: j.model }));
}
/** Internal worker context only; callers must never serialize the full aggregate. */
export function authorizedPlanJob(actor:Actor,p:Practice,id:string,token:string,now:string){const j=job(p as State,id,token);authorized(actor,p,j,now);return structuredClone(j);}

