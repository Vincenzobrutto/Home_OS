import { createHash } from 'node:crypto';
import { PracticeError, type Actor, type Practice } from './domain';
import { reviewView } from './review';

// A comparison is an explicit human-scoped question, never an inferred identity
// between historical owners, units or kinds of area.
const FIELDS = ['cadastral.municipality', 'cadastral.sheet', 'cadastral.parcel', 'cadastral.subaltern', 'party.name', 'surface.cadastral', 'surface.net', 'surface.commercial'];
type Group = { id: string; unitId: string; subjectKey: string; epoch: string; field: string; factIds: string[] };
function invalid(): never { throw new PracticeError('invalid_input'); }
function label(v: unknown): string {
  if (typeof v !== 'string' || !v.trim() || v.length > 100 || Array.from(v).some(c => c.charCodeAt(0) < 32)) invalid();
  return v.trim();
}
function parse(input: unknown): Group[] {
  if (!Array.isArray(input) || input.length > 100) invalid();
  const ids = new Set<string>();
  return input.map(v => {
    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype || Object.keys(v).some(k => !['id', 'unitId', 'subjectKey', 'epoch', 'field', 'factIds'].includes(k))) invalid();
    const r = v as Record<string, unknown>;
    const id = label(r.id), field = label(r.field);
    if (ids.has(id) || !FIELDS.includes(field) || !Array.isArray(r.factIds) || r.factIds.length < 2 || r.factIds.length > 20) invalid();
    ids.add(id);
    const factIds = r.factIds.map(label).sort();
    if (new Set(factIds).size !== factIds.length) invalid();
    return { id, unitId: label(r.unitId), subjectKey: label(r.subjectKey), epoch: label(r.epoch), field, factIds };
  });
}
function comparable(field: string, v: string | number | boolean) {
  // No fuzzy names, zero-stripping, numeric tolerance or conversion of net to
  // commercial area. A difference is a question for review, not a legal defect.
  if (typeof v !== 'string') return v;
  const s = v.normalize('NFC').trim().replace(/\s+/gu, ' ');
  return field === 'party.name' || field === 'cadastral.municipality' ? s.toLocaleUpperCase('it-IT') : s;
}
export function evaluateCoherence(actor: Actor, practice: Practice, input: unknown, now: string) {
  const view = reviewView(actor, practice, now), groups = parse(input);
  return groups.map(group => {
    const facts = group.factIds.map(id => {
      const f = view.facts.find(f => f.id === id);
      // Nonexistent and inaccessible facts have the same response.
      if (!f) throw new PracticeError('access_denied');
      if (f.unitId !== group.unitId || f.subjectKey !== group.subjectKey || f.field !== group.field) invalid();
      return f;
    });
    const usable = facts.every(f => f.status !== 'stale' && f.status !== 'rejected');
    const allConfirmed = usable && facts.every(f => f.status === 'confirmed');
    const values = usable ? facts.map(f => ({ factId: f.id, version: f.version, status: f.status, value: f.status === 'confirmed' ? f.confirmedValue! : f.proposedValue, evidence: f.evidence })) : [];
    const equal = usable && values.every(v => comparable(group.field, v.value) === comparable(group.field, values[0].value));
    const status = !usable ? 'not_evaluable' : !equal ? 'difference_to_review' : allConfirmed ? 'matching_confirmed_values' : 'matching_proposals';
    const fingerprint = createHash('sha256').update(JSON.stringify({ practiceId: practice.id, group, facts: facts.map(f => ({ id: f.id, version: f.version, status: f.status, proposedValue: f.proposedValue, confirmedValue: f.confirmedValue, evidence: f.evidence })) })).digest('hex');
    return { ...group, status, allConfirmed, fingerprint, values, certification: false as const };
  });
}
