import { calendar } from '../activities/domain';
import { invalid, object, uuid, version } from '../review/domain';

export const expenseLimits = { titleMaxCodePoints: 120, noteMaxCodePoints: 500, amountMaxCents: 999999999, maxPageSize: 50 } as const;
export type ExpenseState = 'active' | 'archived';

function normalized(input: unknown, max: number, nullable = false): string | null {
  if (nullable && input === null) return null;
  if (typeof input !== 'string') throw invalid();
  const value = input.trim().normalize('NFC');
  if ([...value].length > max || (!nullable && !value)) throw invalid();
  return value || null;
}
export function amountCents(input: unknown): number {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 1 || input > expenseLimits.amountMaxCents) throw invalid('Inserisci un importo positivo in centesimi interi entro il limite consentito.');
  return input;
}
export function spentOn(input: unknown, today: string): string {
  const value = calendar(input);
  if (!value || value > today) throw invalid('Scegli una data valida non futura per il costo sostenuto.');
  return value;
}
const fields = ['title', 'amountCents', 'spentOn', 'note', 'documentId', 'assetId'];
export function createExpense(input: unknown, today: string) {
  const row = object(input, fields);
  return {
    title: normalized(row.title, expenseLimits.titleMaxCodePoints)!, amountCents: amountCents(row.amountCents), spentOn: spentOn(row.spentOn, today),
    note: row.note === undefined ? null : normalized(row.note, expenseLimits.noteMaxCodePoints, true),
    documentId: row.documentId == null ? null : uuid(row.documentId), assetId: row.assetId == null ? null : uuid(row.assetId),
  };
}
export function updateExpense(input: unknown, today: string) {
  const row = object(input, ['expectedVersion', ...fields]);
  if (!fields.some(k => Object.hasOwn(row, k))) throw invalid();
  return {
    expectedVersion: version(row.expectedVersion),
    ...(row.title !== undefined ? { title: normalized(row.title, expenseLimits.titleMaxCodePoints)! } : {}),
    ...(row.amountCents !== undefined ? { amountCents: amountCents(row.amountCents) } : {}),
    ...(row.spentOn !== undefined ? { spentOn: spentOn(row.spentOn, today) } : {}),
    ...(row.note !== undefined ? { note: normalized(row.note, expenseLimits.noteMaxCodePoints, true) } : {}),
    ...(row.documentId !== undefined ? { documentId: row.documentId === null ? null : uuid(row.documentId) } : {}),
    ...(row.assetId !== undefined ? { assetId: row.assetId === null ? null : uuid(row.assetId) } : {}),
  };
}
export function expenseAction(input: unknown) {
  const row = object(input, ['expectedVersion', 'note']);
  return { expectedVersion: version(row.expectedVersion), note: row.note === undefined ? null : normalized(row.note, expenseLimits.noteMaxCodePoints, true) };
}
export function expenseQuery(input: unknown, summary = false, history = false) {
  const row = object(input, history ? ['limit', 'cursor'] : summary ? ['year'] : ['state', 'source', 'year', 'documentId', 'assetId', 'limit', 'cursor']);
  const state = row.state ?? 'active', source = row.source ?? 'all';
  if (typeof state !== 'string' || !['active', 'archived', 'all'].includes(state) || typeof source !== 'string' || !['all', 'manual', 'document'].includes(source)) throw invalid();
  if (row.year !== undefined && (typeof row.year !== 'string' || !/^\d{4}$/.test(row.year) || row.year === '0000')) throw invalid();
  if (row.limit !== undefined && (typeof row.limit !== 'string' || !/^[1-9]\d?$/.test(row.limit) || Number(row.limit) > expenseLimits.maxPageSize)) throw invalid();
  if (row.cursor !== undefined && (typeof row.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(row.cursor))) throw invalid();
  return { state: state as ExpenseState | 'all', source: source as 'all' | 'manual' | 'document', year: row.year as string | undefined, documentId: row.documentId === undefined ? null : uuid(row.documentId), assetId: row.assetId === undefined ? null : uuid(row.assetId), limit: Number(row.limit ?? 20), cursor: row.cursor as string | undefined };
}
