/**
 * SOLO test e harness dimostrativo. Dati sintetici dei cinque scenari del mockup approvato.
 * Nessun componente runtime importa questo file: nel prodotto i dati arrivano dal container.
 */
import type { ExpenseRef, ObjectRef, ReceiptContextKey, ReceiptDraft } from '../model';

export const TODAY = '2026-10-16';
export const CONTEXT: ReceiptContextKey = { accountId: 'acc-demo', homeId: 'home-demo', documentId: 'doc-demo', draftId: 'draft-demo' };

const cite = (excerpt: string) => [{ page: 1, excerpt }];
const proposals = {
  name: { value: 'Macchina del caffè', sources: cite('Macchina del caffè Lume') },
  brand: { value: 'Lume', sources: cite('Macchina del caffè Lume') },
  model: { value: 'Mini 90', sources: cite('Mini 90') },
  title: { value: 'Acquisto macchina del caffè', sources: cite('Macchina del caffè Lume') },
  supplier: { value: 'Emporio Casa Demo', sources: cite('Emporio Casa Demo') },
  documentDate: { value: '2026-09-15', sources: cite('15 settembre 2026') },
  total: { amountCents: 17990, sources: cite('TOTALE EUR 179,90') },
};

export const kitchen = (over: Partial<ObjectRef> = {}): ObjectRef => ({ id: 'obj-kitchen', version: 3, name: 'Macchina del caffè', roomName: 'Cucina', brand: null, model: null, linkedToDocument: false, reasons: [], ...over });
export const studio = (over: Partial<ObjectRef> = {}): ObjectRef => ({ id: 'obj-studio', version: 1, name: 'Macchina del caffè', roomName: 'Studio', brand: null, model: null, linkedToDocument: false, reasons: [], ...over });
export const purchase = (over: Partial<ExpenseRef> = {}): ExpenseRef => ({ id: 'exp-purchase', version: 2, title: 'Acquisto macchina del caffè', amountCents: 17990, spentOn: '2026-09-15', linkedToDocument: true, reasons: ['same_document'], ...over });

const base = (over: Partial<ReceiptDraft>): ReceiptDraft => ({ id: 'draft-demo', version: 1, state: 'open', origin: 'extraction', proposals, linkedObjects: [], linkedExpenses: [], openComparisons: [], ...over });

export const scenarios = {
  /** Oggetto e spesa già collegati alla ricevuta. */
  existing: () => ({ draft: base({ linkedObjects: [kitchen({ linkedToDocument: true, reasons: ['same_document'] })], linkedExpenses: [purchase()] }), objectCandidates: [] as ObjectRef[], expenseCandidates: [] as ExpenseRef[] }),
  /** Primo acquisto: nulla di collegato né compatibile. */
  fresh: () => ({ draft: base({}), objectCandidates: [] as ObjectRef[], expenseCandidates: [] as ExpenseRef[] }),
  /** Due oggetti compatibili: nessuna preselezione. */
  ambiguous: () => ({ draft: base({}), objectCandidates: [kitchen({ reasons: ['same_brand_model'] }), studio({ reasons: ['same_brand_model'] })], expenseCandidates: [] as ExpenseRef[] }),
  /** Valori confermati diversi da quelli letti. */
  conflict: () => ({
    draft: base({ linkedObjects: [kitchen({ linkedToDocument: true, reasons: ['same_document'], brand: { value: 'Aurora', origin: 'user_declared' }, model: { value: 'Classica 30', origin: 'user_declared' } })], linkedExpenses: [purchase()] }),
    objectCandidates: [] as ObjectRef[], expenseCandidates: [] as ExpenseRef[],
  }),
  /** Documento non leggibile: si prosegue con una bozza manuale vuota. */
  manual: () => ({ draft: base({ origin: 'manual', proposals: {} }), objectCandidates: [] as ObjectRef[], expenseCandidates: [] as ExpenseRef[] }),
};
