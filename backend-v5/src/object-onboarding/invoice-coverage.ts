import { ProviderFailure } from '../review/provider';
import type { HouseExpense, ProductEvidenceContext, ProductExtraction } from './domain';

export type InvoiceCoverage = { version: 'invoice-coverage-v1'; totalPages: number; sentPages: number[]; coveredPages: number[]; pendingPages: number[] };
const fail = (): never => { throw new ProviderFailure('analysis_invalid_output'); };
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
};
const pages = (context: ProductEvidenceContext) => context.kind === 'visual_pdf' ? context.allowedPages ?? Array.from({ length: context.pageCount }, (_, i) => i + 1) : [];

/** Bounded metadata for a durable observation. Extra content is never retained. */
export function checkedInvoiceCoverage(input: unknown): InvoiceCoverage {
  const row = record(input), total = Number(row.totalPages);
  if (row.version !== 'invoice-coverage-v1' || !Number.isSafeInteger(row.totalPages) || total < 2 || total > 20) return fail();
  const list = (value: unknown): number[] => {
    if (!Array.isArray(value) || value.some((page, i) => !Number.isSafeInteger(page) || page < 1 || page > total || i > 0 && page <= value[i - 1])) return fail();
    return [...value] as number[];
  };
  const sentPages = list(row.sentPages), coveredPages = list(row.coveredPages), pendingPages = list(row.pendingPages);
  if (!sentPages.length || coveredPages.some(page => !sentPages.includes(page)) || JSON.stringify(pendingPages) !== JSON.stringify(Array.from({ length: total }, (_, i) => i + 1).filter(page => !coveredPages.includes(page)))) return fail();
  return { version: 'invoice-coverage-v1', totalPages: total, sentPages, coveredPages, pendingPages };
}

/** One required slot per sent physical page; all expenses keep their existing schema. */
export function invoicePagesSchema(expenseSchema: unknown, sentPages: number[]) {
  const properties = Object.fromEntries(sentPages.map(page => ['p' + page, { type: 'object', additionalProperties: false, required: ['kind', 'expenses'], properties: { kind: { type: 'string', enum: ['invoice', 'other', 'unreadable', 'continuation'] }, expenses: { type: 'array', items: JSON.parse(JSON.stringify(expenseSchema)) } } }]));
  return { type: 'object', additionalProperties: false, required: Object.keys(properties), properties };
}

/** Flatten a page-addressed wire reply before the existing citation/amount validators.
 * No new request, OCR, default amount, or reconstruction of an omitted invoice. */
export function invoicePageOutput(input: unknown, context: ProductEvidenceContext): { output: unknown; expensePages?: number[] } {
  const root = { ...record(input) };
  if (!Object.hasOwn(root, 'invoicePages')) return { output: root }; // legacy replies still get server-derived coverage
  if (context.kind !== 'visual_pdf' || context.pageCount < 2) return fail();
  const sent = pages(context), slots = record(root.invoicePages), keys = sent.map(page => 'p' + page);
  if (Object.keys(slots).length !== keys.length || Object.keys(slots).some(key => !keys.includes(key))) return fail();
  const expenses: unknown[] = [], expensePages: number[] = [];
  for (const page of sent) {
    const slot = record(slots['p' + page]);
    if (Object.keys(slot).length !== 2 || !Object.hasOwn(slot, 'kind') || !Object.hasOwn(slot, 'expenses') || !['invoice', 'other', 'unreadable', 'continuation'].includes(String(slot.kind)) || !Array.isArray(slot.expenses)) return fail();
    if (slot.kind === 'invoice' ? slot.expenses.length !== 1 : slot.expenses.length !== 0) return fail();
    expenses.push(...slot.expenses); if (slot.expenses.length) expensePages.push(page);
  }
  delete root.invoicePages;
  if (expenses.length) {
    if (root.documentKind !== 'purchase_document' || !Array.isArray(root.houseExpenses) || root.houseExpenses.length || !Array.isArray(root.items) || root.items.length || !Array.isArray(root.facts) || root.facts.length || root.purchaseTotal != null && (!Array.isArray(root.purchaseTotal) || root.purchaseTotal.length)) return fail();
    root.houseExpenses = expenses;
  } else if (root.documentKind === 'purchase_document' && Array.isArray(root.houseExpenses) && root.houseExpenses.length) return fail();
  return { output: root, ...(expenses.length ? { expensePages } : {}) };
}

export function assertInvoicePages(expenses: HouseExpense[], expected?: number[]) {
  if (!expected) return;
  if (expenses.length !== expected.length) return fail();
  expenses.forEach((expense, i) => {
    const proofs = [...Object.values(expense.proposedFields).flatMap(field => field.sources), ...expense.amountCandidates.flatMap(amount => amount.sources)];
    if (!proofs.length || proofs.some(proof => proof.page !== expected[i])) return fail();
  });
}

/** Coverage is accounting for proposed single-page invoices, never visual truth.
 * Unseen, unreadable, other and continuation pages remain pending for this contract. */
export function invoiceCoverage(context: ProductEvidenceContext, output: Pick<ProductExtraction, 'documentKind' | 'documentInfo' | 'items'>, expenses: HouseExpense[]): InvoiceCoverage | undefined {
  if (context.kind !== 'visual_pdf' || context.pageCount < 2 || output.documentKind !== 'purchase_document' || output.documentInfo?.kind !== 'invoice' || output.items.length) return undefined;
  const coveredPages = [...new Set(expenses.flatMap(expense => expense.invoiceSegment ? [expense.invoiceSegment.page] : []))].sort((a, b) => a - b);
  return { version: 'invoice-coverage-v1', totalPages: context.pageCount, sentPages: pages(context), coveredPages, pendingPages: Array.from({ length: context.pageCount }, (_, i) => i + 1).filter(page => !coveredPages.includes(page)) };
}
