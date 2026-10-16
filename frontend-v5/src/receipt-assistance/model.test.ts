import { describe, expect, it } from 'vitest';
import {
  allExpenses, allObjects, buildConfirmationPayload, buildSummary, canonicalPayload, contextKeyString, decisionKey,
  fieldOrigin, initialFormState, parseEuroToCents, pendingComparisons, validateForm,
  type ReceiptDraft, type ReceiptFormState,
} from './model';
import { CONTEXT, TODAY, kitchen, purchase, scenarios } from './testing/fixtures';

const setup = (name: keyof typeof scenarios) => {
  const s = scenarios[name]();
  const objects = allObjects(s.draft, s.objectCandidates), expenses = allExpenses(s.draft, s.expenseCandidates);
  return { ...s, objects, expenses, state: initialFormState(s.draft, s.objectCandidates, s.expenseCandidates) };
};
const with_ = (state: ReceiptFormState, patch: Partial<ReceiptFormState>) => ({ ...state, ...patch });

describe('stato iniziale', () => {
  it('riusa un solo collegamento esplicito, non preseleziona candidati multipli, crea se non c’è nulla', () => {
    expect(setup('existing').state).toMatchObject({ object: { kind: 'reuse', id: 'obj-kitchen' }, expense: { kind: 'reuse', id: 'exp-purchase' } });
    expect(setup('fresh').state).toMatchObject({ object: { kind: 'create' }, expense: { kind: 'create' } });
    expect(setup('ambiguous').state.object).toEqual({ kind: 'unset' });
    const manual = setup('manual').state;
    expect(Object.values(manual.values).every(v => v === '')).toBe(true);
  });
  it('più collegamenti espliciti richiedono una scelta, mai il primo', () => {
    const s = scenarios.existing();
    const draft: ReceiptDraft = { ...s.draft, linkedObjects: [...s.draft.linkedObjects, kitchen({ id: 'obj-2', linkedToDocument: true })] };
    expect(initialFormState(draft).object).toEqual({ kind: 'unset' });
  });
  it('la chiave di contesto cambia con account, casa, documento o bozza', () => {
    const keys = new Set([CONTEXT, { ...CONTEXT, accountId: 'x' }, { ...CONTEXT, homeId: 'x' }, { ...CONTEXT, documentId: 'x' }, { ...CONTEXT, draftId: null }].map(contextKeyString));
    expect(keys.size).toBe(5);
  });
});

describe('importi e date', () => {
  it('converte stringhe in centesimi interi sicuri', () => {
    expect(['179,90', '1.234,56', '85', '85.5', ' 12,3 €'].map(parseEuroToCents)).toEqual([17990, 123456, 8500, 8550, 1230]);
    expect(['', '-5', '12,345', '1,2,3', 'abc', '1.23.4', '99999999999'].map(parseEuroToCents)).toEqual([null, null, null, null, null, null, null]);
  });
  it('valida importo e data rispetto a today delle props, non a una data fissa', () => {
    const { draft, objects, state } = setup('fresh');
    const v = (values: Partial<ReceiptFormState['values']>, today = TODAY) => validateForm(with_(state, { values: { ...state.values, ...values } }), draft, objects, today).errors;
    expect(v({ amount: '0' }).amount).toMatch(/maggiore di zero/);
    expect(v({ amount: '10000000,00' }).amount).toBeDefined();
    expect(v({ amount: '12,345' }).amount).toMatch(/non valido/);
    expect(v({ date: '2026-02-30' }).date).toBe('Data non valida.');
    expect(v({ date: '2026-10-17' }).date).toMatch(/futura/);
    expect(v({ date: '2026-10-17' }, '2026-10-20').date).toBeUndefined();
    expect(v({ name: 'x'.repeat(121) }).name).toMatch(/120/);
    expect(v({ title: '   ' }).title).toBeDefined();
  });
});

describe('scelte indipendenti e campi esclusi', () => {
  it('i campi delle scelte escluse non bloccano la conferma', () => {
    const { draft, objects, state } = setup('fresh');
    const empty = { ...state, values: { ...state.values, name: '', title: '', amount: '', date: '' } };
    expect(validateForm(with_(empty, { object: { kind: 'skip' }, expense: { kind: 'skip' } }), draft, objects, TODAY).valid).toBe(true);
    expect(validateForm(with_(empty, { object: { kind: 'unset' }, expense: { kind: 'skip' } }), draft, objects, TODAY).errors.object).toBeDefined();
  });
  it('riepilogo esatto per 1/1, 1/0, 0/1, 0/0', () => {
    const { draft, objects, expenses, state } = setup('fresh');
    const combos: Array<[ReceiptFormState['object'], ReceiptFormState['expense'], number, number]> = [
      [{ kind: 'create' }, { kind: 'create' }, 1, 1], [{ kind: 'create' }, { kind: 'skip' }, 1, 0],
      [{ kind: 'skip' }, { kind: 'create' }, 0, 1], [{ kind: 'skip' }, { kind: 'skip' }, 0, 0],
    ];
    for (const [object, expense, o, e] of combos) expect(buildSummary(with_(state, { object, expense }), draft, objects, expenses).counts).toEqual({ newObjects: o, newExpenses: e });
  });
  it('spesa esistente riusata senza nuova registrazione, differenze esposte ma non applicate', () => {
    const { draft, objects, expenses, state } = setup('existing');
    const changed = { ...draft, linkedExpenses: [purchase({ amountCents: 15000 })] };
    const summary = buildSummary(state, changed, objects, allExpenses(changed, []));
    expect(summary.counts.newExpenses).toBe(0);
    expect(summary.expense).toMatchObject({ kind: 'reuse', newLink: false, differs: ['amount'] });
    expect(buildConfirmationPayload(state, draft, objects, expenses, TODAY)?.expense).toEqual({ action: 'reuse', targetId: 'exp-purchase', targetVersion: 2 });
  });
});

describe('confronti con valori confermati', () => {
  it('richiedono keep_existing o defer per campo, senza default e senza sovrascrittura', () => {
    const { draft, objects, expenses, state } = setup('conflict');
    const pending = pendingComparisons(state, draft, objects);
    expect(pending.map(c => [c.field, c.existing, c.proposed.value])).toEqual([['brand', 'Aurora', 'Lume'], ['model', 'Classica 30', 'Mini 90']]);
    expect(validateForm(state, draft, objects, TODAY).errors.comparisons).toBeDefined();
    const decided = with_(state, { decisions: { [decisionKey('obj-kitchen', 'brand')]: 'keep_existing', [decisionKey('obj-kitchen', 'model')]: 'defer' } });
    const payload = buildConfirmationPayload(decided, draft, objects, expenses, TODAY);
    expect(payload?.object).toEqual({ action: 'reuse', targetId: 'obj-kitchen', targetVersion: 3, fields: [{ field: 'brand', action: 'keep_existing' }, { field: 'model', action: 'defer' }] });
    expect(buildSummary(decided, draft, objects, expenses).object).toMatchObject({ kept: ['brand'], deferred: ['model'], filled: [] });
  });
  it('un confronto già rinviato e persistito non viene ripetuto', () => {
    const { draft, objects, state } = setup('conflict');
    const persisted: ReceiptDraft = { ...draft, openComparisons: [{ id: 'cmp-1', version: 1, objectId: 'obj-kitchen', objectName: 'Macchina del caffè', field: 'brand', existing: 'Aurora', proposed: draft.proposals.brand! }] };
    expect(pendingComparisons(state, persisted, objects).map(c => c.field)).toEqual(['model']);
  });
  it('su un oggetto senza valori completa solo i campi vuoti, distinguendo estratto e modificato', () => {
    const { draft, state } = setup('existing');
    const objects = allObjects(draft, []);
    const edited = with_(state, { expense: { kind: 'skip' }, values: { ...state.values, model: 'Mini 90 S' } });
    expect(buildConfirmationPayload(edited, draft, objects, [], TODAY)?.object).toEqual({
      action: 'reuse', targetId: 'obj-kitchen', targetVersion: 3, fields: [{ field: 'brand', action: 'accept' }, { field: 'model', action: 'manual', value: 'Mini 90 S' }],
    });
  });
});

describe('payload UI di conferma', () => {
  it('origini: estratto se invariato, manuale se modificato o in bozza manuale; nessuna citazione nel payload', () => {
    const fresh = setup('fresh');
    const edited = with_(fresh.state, { values: { ...fresh.state.values, amount: '180,00' } });
    const p = buildConfirmationPayload(edited, fresh.draft, fresh.objects, fresh.expenses, TODAY)!;
    expect(p.expense).toMatchObject({ action: 'create', values: { amountCents: 18000, spentOn: '2026-09-15' }, origins: { amount: 'manual', title: 'extraction', date: 'extraction' } });
    expect(JSON.stringify(p)).not.toMatch(/excerpt|accountId|homeId/);
    const manual = setup('manual');
    const filled = with_(manual.state, { values: { ...manual.state.values, name: 'Forno', title: 'Acquisto forno', amount: '99', date: '2026-10-01' } });
    expect(fieldOrigin(filled, manual.draft, 'name')).toBe('manual');
    expect(buildConfirmationPayload(filled, manual.draft, manual.objects, manual.expenses, TODAY)?.object).toMatchObject({ action: 'create', origins: { name: 'manual', brand: null } });
  });
  it('nessun payload se il form non è valido; serializzazione canonica stabile', () => {
    const { draft, objects, expenses, state } = setup('ambiguous');
    expect(buildConfirmationPayload(state, draft, objects, expenses, TODAY)).toBeNull();
    const chosen = with_(state, { object: { kind: 'reuse', id: 'obj-studio' } });
    const a = buildConfirmationPayload(chosen, draft, objects, expenses, TODAY)!;
    const b = JSON.parse(JSON.stringify(a), (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v));
    expect(canonicalPayload(b)).toBe(canonicalPayload(a));
  });
});
