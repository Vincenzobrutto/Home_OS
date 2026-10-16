import { object, text, uuid, version, invalid } from '../review/domain';
import { amountCents, spentOn } from '../expenses/domain';

export type ReceiptOrigin = 'manual' | 'extraction' | null;
export type FieldPlan = { field: 'brand' | 'model'; action: 'accept' | 'manual' | 'keep_existing' | 'defer' | 'skip'; value?: string };
export type ReceiptConfirmation = {
  expectedVersion: number;
  object: { action: 'skip' } | { action: 'reuse'; targetId: string; targetVersion: number; fields: FieldPlan[] } | { action: 'create'; values: { name: string; brand: string | null; model: string | null }; origins: Record<'name' | 'brand' | 'model', ReceiptOrigin> };
  expense: { action: 'skip' } | { action: 'reuse'; targetId: string; targetVersion: number } | { action: 'create'; values: { title: string; amountCents: number; spentOn: string; supplier: string | null }; origins: Record<'title' | 'amount' | 'date' | 'supplier', ReceiptOrigin> };
};
const normalized = (input: unknown, max: number) => text(typeof input === 'string' ? input.normalize('NFC').replace(/\s+/gu, ' ').trim() : input, max);
const optional = (input: unknown, max: number) => input === null ? null : normalized(input, max);
function origins<K extends string>(input: unknown, keys: K[], values: Record<K, unknown>): Record<K, ReceiptOrigin> {
  const row = object(input, keys);
  return Object.fromEntries(keys.map(key => {
    const origin = row[key];
    if (values[key] === null ? origin !== null : origin !== 'manual' && origin !== 'extraction') throw invalid('Origine del dato non valida.');
    return [key, origin];
  })) as Record<K, ReceiptOrigin>;
}
export function receiptConfirmation(input: unknown, today: string): ReceiptConfirmation {
  const row = object(input, ['expectedVersion', 'object', 'expense']);
  const expectedVersion = version(row.expectedVersion);
  const o = object(row.object, ['action', 'targetId', 'targetVersion', 'fields', 'values', 'origins']);
  let subject: ReceiptConfirmation['object'];
  if (o.action === 'skip') { object(o, ['action']); subject = { action: 'skip' }; }
  else if (o.action === 'reuse') {
    object(o, ['action', 'targetId', 'targetVersion', 'fields']);
    if (!Array.isArray(o.fields) || o.fields.length > 2) throw invalid();
    const fields = o.fields.map((input): FieldPlan => {
      const plan = object(input, ['field', 'action', 'value']);
      if ((plan.field !== 'brand' && plan.field !== 'model') || typeof plan.action !== 'string' || !['accept', 'manual', 'keep_existing', 'defer', 'skip'].includes(plan.action)) throw invalid();
      if (plan.action !== 'manual' && Object.hasOwn(plan, 'value')) throw invalid();
      return { field: plan.field, action: plan.action as FieldPlan['action'], ...(plan.action === 'manual' ? { value: normalized(plan.value, plan.field === 'brand' ? 80 : 120) } : {}) };
    });
    if (new Set(fields.map(f => f.field)).size !== fields.length) throw invalid();
    subject = { action: 'reuse', targetId: uuid(o.targetId), targetVersion: version(o.targetVersion), fields: fields.sort((a, b) => a.field.localeCompare(b.field)) };
  } else if (o.action === 'create') {
    object(o, ['action', 'values', 'origins']);
    const value = object(o.values, ['name', 'brand', 'model']);
    const values = { name: normalized(value.name, 120), brand: optional(value.brand, 80), model: optional(value.model, 120) };
    subject = { action: 'create', values, origins: origins(o.origins, ['name', 'brand', 'model'], values) };
  } else throw invalid();
  const e = object(row.expense, ['action', 'targetId', 'targetVersion', 'values', 'origins']);
  let expense: ReceiptConfirmation['expense'];
  if (e.action === 'skip') { object(e, ['action']); expense = { action: 'skip' }; }
  else if (e.action === 'reuse') {
    object(e, ['action', 'targetId', 'targetVersion']);
    expense = { action: 'reuse', targetId: uuid(e.targetId), targetVersion: version(e.targetVersion) };
  } else if (e.action === 'create') {
    object(e, ['action', 'values', 'origins']);
    const value = object(e.values, ['title', 'amountCents', 'spentOn', 'supplier']);
    const values = { title: normalized(value.title, 120), amountCents: amountCents(value.amountCents), spentOn: spentOn(value.spentOn, today), supplier: optional(value.supplier, 120) };
    expense = { action: 'create', values, origins: origins(e.origins, ['title', 'amount', 'date', 'supplier'], { title: values.title, amount: values.amountCents, date: values.spentOn, supplier: values.supplier }) };
  } else throw invalid();
  return { expectedVersion, object: subject, expense };
}
