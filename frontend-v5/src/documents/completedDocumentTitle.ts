import type {DocumentSummary} from '../api/types';
import {KIND_LABEL, type DocumentKind} from '../document-intake/model';
import type {BillTitleContext} from './completedBillTitle';

export type DocumentTitleContext = BillTitleContext & Partial<Pick<DocumentSummary, 'linkedObjects'>>;

const purchaseKinds = new Set(['invoice', 'receipt', 'purchase_order', 'purchase_document', 'delivery_notice']);
const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/gu, ' ') || '';

function documentDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value) || value.startsWith('0000')) return '';
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '';
  return value.slice(8) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4);
}

/** Presentation of confirmed context only; no parsing, guessing or persistence. */
export function completedDocumentTitle(doc: DocumentTitleContext): string | null {
  if (doc.workflowState !== 'completed' || doc.organization?.parts.length !== 1) return null;
  const kind = doc.organization.parts[0]!.kind;
  // Bills retain their stricter supplier + invoice-month rule, including when facts are missing.
  if (kind === 'utility_bill' || kind === 'other' || !Object.hasOwn(KIND_LABEL, kind)) return null;
  const filename = doc.originalFilename?.trim();
  if (!filename) return null;
  const title = doc.organization.title.trim() || doc.name.trim();
  if (title && title !== filename && title !== filename.replace(/\.(?:pdf|jpe?g|png)$/iu, '')) return null;

  const objects = [...new Map((doc.linkedObjects ?? []).filter(o => clean(o.name)).map(o => [o.kind + ':' + o.id, clean(o.name)])).values()];
  const objectLabel = objects.slice(0, 2).join(', ') + (objects.length > 2 ? ` (+${objects.length - 2})` : '');
  // Multiple saved expenses can represent separate invoices or installments: never choose one.
  const expense = purchaseKinds.has(kind) && doc.savedExpenses?.length === 1 ? doc.savedExpenses[0] : undefined;
  const number = clean(expense?.documentNumber);
  const details = [objectLabel, clean(expense?.supplier), number && `n. ${number}`, expense && documentDate(expense.documentDate)].filter(Boolean);
  if (!details.length) return null;
  return [KIND_LABEL[kind as DocumentKind], ...details].join(' · ');
}
