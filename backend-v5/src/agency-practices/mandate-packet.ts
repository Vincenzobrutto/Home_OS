import { createHash } from 'node:crypto';
import { evidenceCurrent, PracticeError, requirePractice, type Actor, type Practice } from './domain';
import { FACT_FIELDS, reviewView } from './review';

// Internal export preparation only. No approved agency template exists here.
// Party identity, rights, completeness and legal suitability are not inferred.
function invalid(): never { throw new PracticeError('invalid_input'); }
function object(v: unknown, keys: string[]) {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype || Object.keys(v).some(k => !keys.includes(k))) invalid();
  return v as Record<string, unknown>;
}
function text(v: unknown) {
  if (typeof v !== 'string' || !v.trim() || v.length > 100 || Array.from(v).some(c => c.charCodeAt(0) < 32)) invalid();
  return v.trim();
}
function integer(v: unknown) {
  if (!Number.isSafeInteger(v) || Number(v) < 1) invalid();
  return Number(v);
}
function field(v: unknown) {
  const result = text(v);
  if (!FACT_FIELDS.includes(result as typeof FACT_FIELDS[number])) invalid();
  return result;
}

export function prepareMandateDataPacket(actor: Actor, practice: Practice, input: unknown, now: string) {
  requirePractice(actor, practice, 'export', now);
  const r = object(input, ['expectedRevision', 'unitId', 'subjectKey', 'requiredFields', 'bindings']);
  const revision = integer(r.expectedRevision), unitId = text(r.unitId), subjectKey = text(r.subjectKey);
  if (revision !== practice.revision) throw new PracticeError('revision_conflict');
  if (!practice.units?.some(u => u.id === unitId) || !Array.isArray(r.requiredFields) || r.requiredFields.length > 30 || !Array.isArray(r.bindings) || r.bindings.length > 30) invalid();
  const required = r.requiredFields.map(field).sort();
  if (new Set(required).size !== required.length) invalid();
  const bindings = r.bindings.map(value => {
    const b = object(value, ['field', 'factId', 'expectedFactVersion']);
    return { field: field(b.field), factId: text(b.factId), expectedFactVersion: integer(b.expectedFactVersion) };
  }).sort((a,b) => a.field.localeCompare(b.field));
  if (new Set(bindings.map(b => b.field)).size !== bindings.length) invalid();
  const view = reviewView(actor, practice, now);
  // Authorize every selection before building any output; no partial export.
  const selected = bindings.map(b => {
    const fact = view.facts.find(f => f.id === b.factId);
    if (!fact) throw new PracticeError('access_denied');
    if (fact.unitId !== unitId || fact.subjectKey !== subjectKey || fact.field !== b.field) invalid();
    if (fact.version !== b.expectedFactVersion) throw new PracticeError('revision_conflict');
    // Stale readable proofs are reported below; inaccessible proofs never leak.
    return { binding: b, fact };
  });
  const issues: Array<{ field: string; code: 'missing' | 'not_confirmed' | 'stale' }> = [];
  const fields = selected.flatMap(({binding, fact}) => {
    const current = fact.evidence.every(e => evidenceCurrent(actor, practice, e, now, 'export'));
    if (fact.status === 'stale' || !current) { issues.push({field: binding.field, code:'stale'}); return []; }
    if (fact.status !== 'confirmed') { issues.push({field: binding.field, code:'not_confirmed'}); return []; }
    return [{ field: binding.field, factId: fact.id, factVersion: fact.version, value: fact.confirmedValue!, origin: fact.confirmedOrigin!, confirmedBy: fact.confirmedBy!, confirmedAt: fact.confirmedAt!, evidence: fact.evidence.map(e => ({sourceId:e.sourceId,version:e.version,sha256:e.sha256,page:e.page,excerpt:e.excerpt})) }];
  });
  for (const f of required) if (!bindings.some(b => b.field === f)) issues.push({field:f,code:'missing'});
  issues.sort((a,b) => a.field.localeCompare(b.field));
  const content = { practiceId:practice.id, practiceRevision:practice.revision, unitId, subjectKey, requiredFields:required, bindings, fields, issues };
  return { ...content, evaluatedAt:now, fingerprint:createHash('sha256').update(JSON.stringify(content)).digest('hex'), purpose:'review_packet' as const, templateState:'missing' as const, canGenerateDraft:false as const, certification:false as const, completenessAssessed:false as const, findingsAssessed:false as const };
}
