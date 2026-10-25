import { describe, expect, it } from 'vitest';
import { houseExpenseReview } from './houseExpenseReview';

type Input = Parameters<typeof houseExpenseReview>[0];
function input(invoice = false): Input {
  return {
    item: {
      id: 'expense-synthetic', documentKind: invoice ? 'simple_invoice' : 'utility_bill',
      proposedFields: { documentNumber: { value: 'SYN-17', sources: [] } },
      amountCandidates: [{ id: 'total', amountCents: 8450, role: 'current_document_total', label: 'Totale' }],
      amountSelectionRequired: false, decision: null,
    },
    form: {
      candidateId: 'total', amount: '84,50', manual: false, title: 'Intervento sintetico',
      supplier: 'Fornitore sintetico', date: '2026-09-15', category: invoice ? 'repairs_works' : 'electricity',
      mode: 'create', expenseId: '', ack: false, periodFrom: '2026-08-01', periodTo: '2026-08-31', dueOn: '2026-10-01',
      documentNumber: 'SYN-17', documentDate: '2026-09-12', note: '', purchaseMode: '', purchaseTotal: '',
    },
    today: '2026-10-23', objectRef: null, objectValid: true,
    suggestionsResolved: true, suggestionsError: false,
    candidates: { items: [], isSuccess: true, isError: false },
  };
}

describe('house expense review contract', () => {
  it('keeps billing period, issue, due date and amount distinct without inventing payment data', () => {
    const value = input();
    const result = houseExpenseReview(value);
    expect(result.review.choice).toEqual({
      itemId: 'expense-synthetic', action: 'create',
      values: {
        title: 'Intervento sintetico', category: 'electricity', supplier: 'Fornitore sintetico',
        amountCents: 8450, spentOn: '2026-09-15', objectRef: null, documentNumber: 'SYN-17',
        documentDate: '2026-09-15', competenceFrom: '2026-08-01', competenceTo: '2026-08-31', dueOn: '2026-10-01',
      },
      amountSelection: { mode: 'candidate', candidateId: 'total' }, acknowledgePossibleDuplicate: false,
    });
    expect(result.review).toMatchObject({ newExpenses: 1, amountCents: 8450 });
    expect(value.form.documentDate).toBe('2026-09-12');
  });

  it('requires a verified whole purchase for installments and never sums or allocates their amounts', () => {
    const value = input(true); value.form.title = 'Acconto intervento';
    expect(houseExpenseReview(value).review.choice).toBeNull();
    value.form.purchaseMode = 'confirmed_total'; value.form.purchaseTotal = '100';
    expect(houseExpenseReview(value).review.choice).toBeNull();
    value.form.purchaseTotal = '84,50';
    expect(houseExpenseReview(value).review.choice).toMatchObject({
      purchaseReview: { mode: 'confirmed_total', confirmedTotalCents: 8450 }, values: { amountCents: 8450 },
    });
    value.form.purchaseTotal = '10000000';
    expect(houseExpenseReview(value).review.choice).toBeNull();
  });

  it('links an existing purchase with its current version and sends no replacement expense values', () => {
    const value = input(true); value.form.mode = 'link_existing'; value.form.expenseId = 'existing';
    value.form.purchaseMode = 'same_purchase'; value.form.purchaseTotal = '100';
    value.candidates.items = [{ id: 'existing', version: 7, rank: 2, title: 'Acquisto sintetico', amountCents: 10000, spentOn: '2026-08-01' }];
    expect(houseExpenseReview(value).review.choice).toEqual({
      itemId: 'expense-synthetic', action: 'link_existing', expenseId: 'existing', expectedExpenseVersion: 7,
      purchaseReview: { mode: 'same_purchase', confirmedTotalCents: 10000 },
    });
    expect(houseExpenseReview(value).review.newExpenses).toBe(0);
    value.candidates.items = [];
    expect(houseExpenseReview(value).review.choice).toBeNull();
  });

  it('skip and defer selections contain no hidden money, object or purchase-reconciliation data', () => {
    const value = input(true); value.form.amount = 'non verificato'; value.form.purchaseMode = 'same_purchase';
    value.form.purchaseTotal = ''; value.objectRef = { kind: 'object', id: 'unavailable' };
    value.objectValid = false; value.candidates.isSuccess = false;
    const result = houseExpenseReview(value);
    for (const action of ['skip', 'defer']) expect(result.selection(action)).toEqual({ itemId: 'expense-synthetic', action });
  });

  it('withholds creation while object, suggestions or duplicate checking are unavailable', () => {
    for (const gate of ['object', 'suggestions', 'duplicates'] as const) {
      const value = input(true);
      if (gate === 'object') value.objectValid = false;
      if (gate === 'suggestions') { value.suggestionsResolved = false; value.suggestionsError = true; }
      if (gate === 'duplicates') { value.candidates.isSuccess = false; value.candidates.isError = true; }
      expect(houseExpenseReview(value).review.choice).toBeNull();
      expect(houseExpenseReview(value).missing.length).toBeGreaterThan(0);
    }
  });

  it('requires duplicate acknowledgement without silently changing saved editable values', () => {
    const value = input(true); value.form.manual = true; value.form.amount = '90,17';
    value.candidates.items = [{ id: 'similar', version: 1, rank: 1, title: 'Simile sintetica', amountCents: 9017, spentOn: '2026-09-15' }];
    const before = structuredClone(value);
    expect(houseExpenseReview(value).review.choice).toBeNull();
    expect(value).toEqual(before);
    value.form.ack = true;
    expect(houseExpenseReview(value).review.choice).toMatchObject({
      values: { amountCents: 9017 }, amountSelection: { mode: 'manual' }, acknowledgePossibleDuplicate: true,
    });
  });

  it('leaves missing or invalid periods and future dates for correction', () => {
    const value = input(); value.form.periodFrom = '';
    expect(houseExpenseReview(value).review.choice).toBeNull();
    expect(value.form.periodFrom).toBe('');
    value.form.periodFrom = '2026-09-01';
    expect(houseExpenseReview(value).review.choice).toBeNull();
    const invoice = input(true); invoice.form.documentDate = '2026-10-24';
    expect(houseExpenseReview(invoice).review.choice).toBeNull();
    invoice.form.documentDate = '2026-09-12'; invoice.form.date = '2026-10-24';
    expect(houseExpenseReview(invoice).review.choice).toBeNull();
  });

  it('does not resolve ambiguous amount selection or shorten expense titles implicitly', () => {
    const value = input(true); value.form.candidateId = '';
    expect(houseExpenseReview(value).review.choice).toBeNull();
    value.form.manual = true; value.form.title = 'è'.repeat(120);
    expect(houseExpenseReview(value).review.choice).not.toBeNull();
    value.form.title += 'è';
    expect(houseExpenseReview(value).review.choice).toBeNull();
    expect(value.form.title).toHaveLength(121);
  });
});

it('invoice month is saved independently, services are optional but never half-filled or replaced',()=>{
 const value=input();value.form.invoiceMonth='2026-09';
 let result=houseExpenseReview(value);expect(result.review.choice).toMatchObject({values:{invoiceMonth:'2026-09',competenceFrom:'2026-08-01',competenceTo:'2026-08-31'}});
 value.form.periodFrom='';value.form.periodTo='';result=houseExpenseReview(value);expect(result.review.choice).toMatchObject({values:{invoiceMonth:'2026-09',competenceFrom:null,competenceTo:null}});
 value.form.periodFrom='2026-08-01';expect(houseExpenseReview(value).review.choice).toBeNull();
 value.form.periodTo='2026-08-31';value.form.invoiceMonth='2026-13';expect(houseExpenseReview(value).review.choice).toBeNull();
});
