import type { ReceiptConfirmation } from './confirmation';
import type { ReceiptExtraction } from './domain';

export type SavedReceiptSelection = Pick<ReceiptConfirmation, 'object' | 'expense'>;
export type ReviewTarget = { id: string; version: number } | null;
/** Restores only accepted DTO fields, never client-provided citations or computed results. */
export function reviewedForm(selection: SavedReceiptSelection, proposals: ReceiptExtraction, targets: { object: ReviewTarget; expense: ReviewTarget }) {
  const field = (key: keyof ReceiptExtraction['fields']) => proposals.fields[key]?.value ?? '';
  const euro = (cents: number) => `${Math.trunc(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
  const values = { name: field('name'), brand: field('brand'), model: field('model'), title: field('title'), supplier: field('supplier'), date: field('documentDate'), amount: proposals.total ? euro(proposals.total.amountCents) : '' };
  const staleTargets: string[] = [];
  const choice = (kind: 'object' | 'expense', plan: SavedReceiptSelection['object'] | SavedReceiptSelection['expense']) => {
    if (plan.action !== 'reuse') return { kind: plan.action };
    const current = targets[kind];
    if (!current || current.id !== plan.targetId || current.version !== plan.targetVersion) { staleTargets.push(kind); return { kind: 'unset' }; }
    return { kind: 'reuse', id: current.id };
  };
  const object = choice('object', selection.object), expense = choice('expense', selection.expense);
  const decisions: Record<string, 'keep_existing' | 'defer'> = {};
  if (selection.object.action === 'create') Object.assign(values, { name: selection.object.values.name, brand: selection.object.values.brand ?? '', model: selection.object.values.model ?? '' });
  if (selection.object.action === 'reuse') for (const plan of selection.object.fields) {
    if (plan.action === 'manual') values[plan.field] = plan.value!;
    if (object.kind === 'reuse' && (plan.action === 'keep_existing' || plan.action === 'defer')) decisions[`${encodeURIComponent(selection.object.targetId)}:${plan.field}`] = plan.action;
  }
  if (selection.expense.action === 'create') Object.assign(values, { title: selection.expense.values.title, supplier: selection.expense.values.supplier ?? '', date: selection.expense.values.spentOn, amount: euro(selection.expense.values.amountCents) });
  return {
    form: { values, object, expense, enrich: selection.object.action === 'reuse' && selection.object.fields.length > 0, decisions }, staleTargets,
    targetVersions: { object: object.kind === 'reuse' && selection.object.action === 'reuse' ? selection.object.targetVersion : null, expense: expense.kind === 'reuse' && selection.expense.action === 'reuse' ? selection.expense.targetVersion : null },
  };
}
