import type { DocumentSummary } from '../api/types';
import { KIND_LABEL } from '../document-intake/model';
import { COLLECTION_OPTIONS } from '../lib/documentSearch';
import {completedBillTitle} from './completedBillTitle';
import {completedDocumentTitle,type DocumentTitleContext} from './completedDocumentTitle';

/** Preserve custom titles; completed bills may display an alias from unambiguous confirmed facts. */
export function documentDisplayTitle(doc: DocumentTitleContext,fallback='Documento collegato') {
  const bill=completedBillTitle(doc);if(bill)return bill;
  const completed=completedDocumentTitle(doc);if(completed)return completed;
  const title = doc.organization?.title.trim() || doc.name.trim();
  return /^(?:[a-f\d]{24,}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})(?:\.[a-z\d]+)?$/i.test(title)
    ? fallback
    : title || fallback;
}

/** Specific confirmed types, rather than a parent collection mistaken for a type. */
export function documentTypeLabels(organization: DocumentSummary['organization']) {
  if (!organization) return [];
  const kinds = organization.parts.map(part => KIND_LABEL[part.kind as keyof typeof KIND_LABEL]).filter(Boolean);
  return [...new Set(kinds.length ? kinds : organization.collections.map(c => COLLECTION_OPTIONS.find(o => o.value === c)?.label ?? c))];
}
