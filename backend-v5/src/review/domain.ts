import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { digest } from '../security';

export type FieldKey = 'brand' | 'model' | 'power';
export type SourceRef = { documentId: string; documentVersion: 1; documentSha256: string; page: number; excerpt: string };
export type Measurement = { value: string; unit: 'kW'; quantityCode: 'useful_heating' | 'reported_nominal' | 'other'; quantityLabel: string };
export type Candidate = { id: string; value: string; sources: SourceRef[]; measurement?: Measurement };
export type FieldValue = { kind: 'text'; text: string } | { kind: 'power'; measurements: Array<Measurement & { sources: SourceRef[]; origin: Origin }> };
export type Origin = 'proposal_accepted' | 'user_correction' | 'manual';
export type Confirmed = { fieldKey: FieldKey; value: FieldValue; revision: number; origin: Origin; sources: SourceRef[]; note: string | null; confirmationId: string; confirmedAt: string };
export type Fields = Partial<Record<FieldKey, Confirmed>>;
export type Decision = { proposalId: string; action: 'accept' | 'correct' | 'discard' | 'resolve_power'; candidateId?: string; value?: string; note?: string; replaceConfirmed?: boolean; mode?: 'keep_distinct' | 'choose_one' | 'correct'; measurements?: Array<Measurement & { candidateId?: string }> };
export const invalid = (message = 'Controlla i dati inseriti.', code = 'validation_error') => new UnprocessableEntityException({ code, message });
export const conflict = (code: string, message: string) => new ConflictException({ code, message });
export function object(input: unknown, keys: string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !keys.includes(k))) throw invalid();
  return input as Record<string, unknown>;
}
export function text(input: unknown, max: number): string {
  if (typeof input !== 'string' || !input.trim() || [...input.trim()].length > max) throw invalid();
  return input.trim();
}
export function uuid(input: unknown): string { if (typeof input !== 'string' || !isUUID(input)) throw invalid(); return input; }
export function boolean(input: unknown): boolean | undefined { if (input !== undefined && typeof input !== 'boolean') throw invalid(); return input as boolean | undefined; }
export function ids(input: unknown, max: number, min = 1): string[] {
  if (!Array.isArray(input) || input.length < min || input.length > max) throw invalid();
  const result = input.map(uuid); if (new Set(result).size !== result.length) throw invalid(); return result.sort();
}
export function version(input: unknown): number { if (!Number.isSafeInteger(input) || Number(input) < 1) throw invalid(); return input as number; }
export function decimal(input: unknown): string {
  if (typeof input !== 'string' || !/^\d{1,12}(\.\d{1,6})?$/.test(input) || Number(input) <= 0) throw invalid();
  const [whole, fraction] = input.split('.'); const tail = (fraction || '').replace(/0+$/, '');
  return whole.replace(/^0+(?=\d)/, '') + (tail ? '.' + tail : '');
}
export function measurement(input: unknown, candidate = false): Measurement & { candidateId?: string } {
  const row = object(input, ['value', 'unit', 'quantityCode', 'quantityLabel', ...(candidate ? ['candidateId'] : [])]);
  if (row.unit !== 'kW' || !['useful_heating', 'reported_nominal', 'other'].includes(String(row.quantityCode))) throw invalid();
  return { value: decimal(row.value), unit: 'kW', quantityCode: row.quantityCode as Measurement['quantityCode'], quantityLabel: text(row.quantityLabel, 160), ...(row.candidateId !== undefined ? { candidateId: uuid(row.candidateId) } : {}) };
}
export function measurements(input: unknown, candidate = false) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 2) throw invalid();
  const rows = input.map(v => measurement(v, candidate));
  if (new Set(rows.map(m => m.quantityLabel)).size !== rows.length) throw invalid('Usa denominazioni distinte.');
  return rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
export function decisions(input: unknown): Decision[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) throw invalid();
  const rows = input.map(value => {
    const common = object(value, ['proposalId', 'action', 'candidateId', 'value', 'note', 'replaceConfirmed', 'mode', 'measurements']);
    const action = common.action as Decision['action'];
    const actionKeys = { accept: ['candidateId', 'note', 'replaceConfirmed'], correct: ['value', 'note', 'replaceConfirmed'], discard: ['note'], resolve_power: ['mode', 'measurements', 'note', 'replaceConfirmed'] };
    if (!Object.hasOwn(actionKeys, action)) throw invalid();
    object(value, ['proposalId', 'action', ...actionKeys[action]]);
    const row: Decision = { proposalId: uuid(common.proposalId), action };
    if (action !== 'discard') row.replaceConfirmed = boolean(common.replaceConfirmed);
    if (common.note !== undefined) row.note = text(common.note, 500);
    if (action !== 'accept' && !row.note) throw invalid('Inserisci una nota.');
    if (action === 'accept') row.candidateId = uuid(common.candidateId);
    if (action === 'correct') row.value = text(common.value, 120);
    if (action === 'resolve_power') {
      if (!['keep_distinct', 'choose_one', 'correct'].includes(String(common.mode))) throw invalid();
      row.mode = common.mode as Decision['mode']; row.measurements = measurements(common.measurements, true);
    }
    return row;
  });
  if (new Set(rows.map(d => d.proposalId)).size !== rows.length || (rows.some(d => d.action === 'resolve_power') && rows.length !== 1)) throw invalid('Conferma la potenza separatamente.');
  return rows.sort((a, b) => a.proposalId.localeCompare(b.proposalId));
}
export function sourceList(candidates: Candidate[]): SourceRef[] {
  return [...new Map(candidates.flatMap(c => c.sources).map(s => [JSON.stringify(s), s])).values()];
}
export function proposalKind(field: FieldKey, candidates: Candidate[]) {
  return candidates.length === 1 ? 'single_value' : field === 'power' && new Set(candidates.map(c => c.measurement!.quantityCode)).size === candidates.length ? 'quantity_interpretation' : 'value_conflict';
}
export function fingerprint(candidates: Candidate[]) {
  return digest(JSON.stringify(candidates.map(({ value, measurement, sources }) => ({ value, measurement, sources: [...sources].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))));
}
export function matchesConfirmed(field: FieldKey, candidates: Candidate[], confirmed?: Confirmed) {
  if (!confirmed) return false;
  if (field !== 'power') return confirmed.value.kind === 'text' && candidates.length === 1 && candidates[0].value === confirmed.value.text;
  if (confirmed.value.kind !== 'power') return false;
  const canonical = (rows: Measurement[]) => rows.map(m => JSON.stringify({ value: m.value, unit: m.unit, quantityCode: m.quantityCode, quantityLabel: m.quantityLabel })).sort();
  return JSON.stringify(canonical(candidates.map(c => c.measurement!))) === JSON.stringify(canonical(confirmed.value.measurements));
}
export function resolveDecision(field: FieldKey, candidates: Candidate[], decision: Decision): { value: FieldValue | null; origin: Origin; sources: SourceRef[] } {
  if (decision.action === 'discard') return { value: null, origin: 'proposal_accepted', sources: sourceList(candidates) };
  if (field !== 'power') {
    if (decision.action === 'accept') {
      const picked = candidates.find(c => c.id === decision.candidateId); if (!picked) throw invalid('Proposta non valida.', 'invalid_resolution');
      return { value: { kind: 'text', text: text(picked.value, field === 'brand' ? 80 : 120) }, origin: 'proposal_accepted', sources: picked.sources };
    }
    if (decision.action !== 'correct') throw invalid('Azione non valida.', 'invalid_resolution');
    return { value: { kind: 'text', text: text(decision.value, field === 'brand' ? 80 : 120) }, origin: 'user_correction', sources: sourceList(candidates) };
  }
  if (decision.action !== 'resolve_power' || !decision.measurements || !decision.mode) throw invalid('Conferma la potenza con una scelta motivata.', 'invalid_resolution');
  let accepted: Candidate[] = [];
  if (decision.mode !== 'correct') {
    for (const item of decision.measurements) {
      const c = candidates.find(c => c.id === item.candidateId);
      if (!c?.measurement || Object.entries(c.measurement).some(([k, v]) => item[k as keyof Measurement] !== v)) throw invalid('Valore o grandezza non corrisponde alla fonte.', 'invalid_resolution');
      accepted.push(c);
    }
    if (new Set(accepted.map(c => c.id)).size !== accepted.length) throw invalid('Candidato duplicato.', 'invalid_resolution');
    if (decision.mode === 'choose_one' && accepted.length !== 1) throw invalid('Scegli una sola misura.', 'invalid_resolution');
    if (decision.mode === 'keep_distinct' && (accepted.length !== candidates.length || candidates.length < 2 || new Set(candidates.map(c => c.measurement!.quantityCode)).size !== candidates.length)) throw invalid('Le grandezze non sono distinte.', 'invalid_resolution');
    return { value: { kind: 'power', measurements: accepted.map(c => ({ ...c.measurement!, sources: c.sources, origin: 'proposal_accepted' })) }, origin: 'proposal_accepted', sources: sourceList(accepted) };
  }
  accepted = decision.measurements.flatMap(m => {
    if (!m.candidateId) return [];
    const c = candidates.find(c => c.id === m.candidateId); if (!c) throw invalid('Fonte non valida.', 'invalid_resolution'); return [c];
  });
  return { value: { kind: 'power', measurements: decision.measurements.map(({ candidateId, ...m }) => ({ ...m, sources: candidateId ? candidates.find(c => c.id === candidateId)!.sources : [], origin: 'user_correction' })) }, origin: 'user_correction', sources: sourceList(accepted) };
}
export function confirmation(fieldKey: FieldKey, value: FieldValue, prior: Confirmed | undefined, origin: Origin, sources: SourceRef[], note: string | undefined, confirmationId: string): Confirmed {
  return { fieldKey, value, revision: (prior?.revision ?? 0) + 1, origin, sources, note: note ?? null, confirmationId, confirmedAt: new Date().toISOString() };
}
export function candidate(value: string, sources: SourceRef[], measurement?: Measurement): Candidate { return { id: randomUUID(), value, sources, ...(measurement ? { measurement } : {}) }; }
