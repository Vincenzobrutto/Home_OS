import { amountCents, spentOn } from '../expenses/domain';
import { citation, type Citation } from '../economy/document-domain';
import { printedCents, printedDates } from '../economy/document-evidence';
import { invalid, object, text } from '../review/domain';
import { ProviderFailure, type Snapshot } from '../review/provider';

export const receiptFields = ['name', 'brand', 'model', 'title', 'supplier', 'documentNumber', 'documentDate'] as const;
export type ReceiptField = typeof receiptFields[number];
export type ReceiptProposal = { value: string; sources: Citation[] };
export type ReceiptExtraction = {
  fields: Partial<Record<ReceiptField, ReceiptProposal>>;
  total: { amountCents: number; sources: Citation[] } | null;
};
const normalized = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();

// Text and money are accepted only when bound to the current, verified PDF snapshot.
export function receiptExtraction(input: unknown, pages: string[], snapshot: Snapshot, today: string): ReceiptExtraction {
  try {
    const row = object(input, ['documentKind', 'multipleItems', 'fields', 'total']);
    if (row.documentKind !== 'purchase_receipt' || typeof row.multipleItems !== 'boolean') throw invalid();
    if (row.multipleItems) throw new ProviderFailure('receipt_multiple_items_unsupported');
    const sourceList = (input: unknown) => {
      if (!Array.isArray(input) || input.length < 1 || input.length > 10) throw invalid();
      return input.map(source => citation(source, pages, snapshot));
    };
    const fields: ReceiptExtraction['fields'] = {};
    for (const [key, inputField] of Object.entries(object(row.fields, [...receiptFields]))) {
      const field = key as ReceiptField, proposed = object(inputField, ['value', 'sources']);
      const value = normalized(text(proposed.value, field === 'brand' || field === 'documentNumber' ? 80 : 120));
      const sources = sourceList(proposed.sources);
      if (field === 'documentDate') {
        spentOn(value, today);
        if (!sources.some(s => printedDates(s.excerpt).includes(value))) throw new ProviderFailure('evidence_unverified');
      } else if (!sources.some(s => normalized(s.excerpt).includes(value))) throw new ProviderFailure('evidence_unverified');
      fields[field] = { value, sources };
    }
    let total: ReceiptExtraction['total'] = null;
    if (row.total !== null) {
      const proposed = object(row.total, ['amountCents', 'sources']);
      const amount = amountCents(proposed.amountCents), sources = sourceList(proposed.sources);
      // A matching numeric amount alone cannot promote a tax, instalment or line total.
      if (!sources.some(s => /^\s*totale(?:\s+(?:documento|scontrino|ricevuta|complessivo))?\s*[:=]?\s*(?:EUR|€)?\s*\d[\d., ]*\s*(?:EUR|€)?\s*$/iu.test(s.excerpt) && printedCents(s.excerpt).includes(amount))) throw new ProviderFailure('evidence_unverified');
      total = { amountCents: amount, sources };
    }
    if (!Object.keys(fields).length && !total) throw new ProviderFailure('receipt_no_supported_data');
    return { fields, total };
  } catch (error) {
    if (error instanceof ProviderFailure) throw error;
    throw new ProviderFailure('analysis_invalid_output');
  }
}

export type StoredReceiptField = { value: string; origin: string; sources: Citation[] };
export type ReceiptFieldResolution = {
  value: StoredReceiptField | null;
  state: 'unchanged' | 'filled' | 'deferred';
  pending: ReceiptProposal | null;
};

// Confirmed values are never overwritten by receipt review, including manual corrections.
export function resolveReceiptField(field: 'brand' | 'model', existing: StoredReceiptField | null, proposal: ReceiptProposal | null, input: unknown): ReceiptFieldResolution {
  const row = object(input, ['action', 'value']);
  const action = row.action;
  if (!['accept', 'manual', 'keep_existing', 'defer', 'skip'].includes(String(action)) || typeof action !== 'string') throw invalid();
  if (action !== 'manual' && Object.hasOwn(row, 'value')) throw invalid();
  if (action === 'skip') return { value: existing, state: 'unchanged', pending: null };
  if (action === 'keep_existing') {
    if (!existing) throw invalid('Non esiste un valore confermato da mantenere.');
    return { value: existing, state: 'unchanged', pending: null };
  }
  if (action === 'defer') {
    if (!existing || !proposal || normalized(existing.value) === normalized(proposal.value)) throw invalid('Non esiste un confronto discordante da rinviare.');
    return { value: existing, state: 'deferred', pending: proposal };
  }
  const value = action === 'manual' ? normalized(text(row.value, field === 'brand' ? 80 : 120)) : proposal?.value;
  if (!value) throw invalid('Non esiste un dato leggibile da accettare.');
  if (existing) {
    if (normalized(existing.value) !== normalized(value)) throw invalid('Il valore è già confermato: mantienilo o rinvia il confronto.', 'receipt_field_conflict');
    return { value: existing, state: 'unchanged', pending: null };
  }
  return { value: { value, origin: action === 'manual' ? 'user_declared' : 'extraction_confirmed', sources: action === 'manual' ? [] : proposal!.sources }, state: 'filled', pending: null };
}

export type ReceiptObjectCandidate = {
  id: string; accountId: string; homeId: string; state: string;
  name: string; brand: string | null; model: string | null; documentIds: string[];
};
export type ReceiptCandidateReason = 'same_document' | 'same_brand_model';

// The caller must first authorize the source and query bounded, private candidates.
// Filtering here is defence in depth; it is not a membership or document authorization check.
export function receiptObjectCandidates(rows: ReceiptObjectCandidate[], scope: { accountId: string; homeId: string; documentId: string }, extraction: ReceiptExtraction) {
  const eq = (a: string | null | undefined, b: string | undefined) => !!a && !!b && normalized(a).toLocaleLowerCase('it') === normalized(b).toLocaleLowerCase('it');
  return rows.flatMap(row => {
    if (row.accountId !== scope.accountId || row.homeId !== scope.homeId || row.state !== 'active') return [];
    const reasons: ReceiptCandidateReason[] = [];
    if (row.documentIds.includes(scope.documentId)) reasons.push('same_document');
    if (eq(row.brand, extraction.fields.brand?.value) && eq(row.model, extraction.fields.model?.value)) reasons.push('same_brand_model');
    return reasons.length ? [{ id: row.id, reasons }] : [];
  }).sort((a, b) => Number(b.reasons.includes('same_document')) - Number(a.reasons.includes('same_document')) || a.id.localeCompare(b.id));
}
