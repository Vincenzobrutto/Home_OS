import { describe, expect, it } from 'vitest';
import { compilationSteps, issueStep, resolveCompilationStep } from './compilationFlow';
import { initialForm, type Draft } from './model';

const draft: Draft = { id: 'test', version: 1, state: 'open', mode: 'extraction', documentKind: 'purchase_document', snapshot: null, document: null, items: ['a', 'b', 'c'].map(id => ({ id, nameTruncated: false, disposition: 'household_object', fields: {}, quantity: null, profile: {}, enrichment: null, decision: null })), needsReview: false, purchaseTotal: null, review: null, permissions: ['edit'] };
const forms = Object.fromEntries(draft.items.map(item => [item.id, initialForm(item, draft)]));
describe('Passaggi puri della compilazione', () => {
  it('tre righe crea, collega, escludi producono sei passaggi senza contatti', () => {
    expect(compilationSteps(draft, { ...forms, b: { ...forms.b!, action: 'link' }, c: { ...forms.c!, action: 'skip' } }).map(step => step.key)).toEqual(['documento', 'contenuto', 'articolo:a', 'articolo:b', 'spese', 'riepilogo']);
  });
  it('solo documento non include oggetti, costi o contatti', () => {
    expect(compilationSteps(draft, forms, true).map(step => step.key)).toEqual(['documento', 'riepilogo']);
  });
  it('bolletta non presenta contenuto né articoli', () => {
    expect(compilationSteps({ ...draft, documentKind: 'utility_bill' }, forms).map(step => step.key)).toEqual(['documento', 'spese', 'riepilogo']);
  });
  it('tutte le righe escluse saltano Spese, ma una spesa globale indipendente resta da rivedere', () => {
    const excluded = Object.fromEntries(Object.entries(forms).map(([id, form]) => [id, { ...form, action: 'skip' as const }]));
    expect(compilationSteps(draft, excluded).map(step => step.key)).toEqual(['documento', 'contenuto', 'riepilogo']);
    expect(compilationSteps({ ...draft, items: [], houseExpenses: [{ id: 'cost', decision: null, proposedFields: {}, amountCandidates: [], amountSelectionRequired: false }] }, excluded).map(step => step.key)).toEqual(['documento', 'spese', 'riepilogo']);
  });
  it('le schede tecniche non introducono spese', () => {
    expect(compilationSteps({ ...draft, documentKind: 'conformity_declaration' }, forms).map(step => step.key)).not.toContain('spese');
  });
  it('un articolo rimosso riporta al contenuto senza saltare la revisione', () => {
    const steps = compilationSteps(draft, { ...forms, a: { ...forms.a!, action: 'skip' } });
    expect(resolveCompilationStep(steps, 'articolo:a')).toBe('contenuto');
    expect(resolveCompilationStep(steps, 'inesistente')).toBe('contenuto');
    expect(resolveCompilationStep(steps, 'articolo:b')).toBe('articolo:b');
  });
  it('i problemi di costo e scheda hanno destinazioni distinte', () => {
    expect(issueStep({ itemId: 'a', message: 'manca', field: 'Data' })).toBe('spese');
    expect(issueStep({ itemId: 'a', message: 'manca', field: 'Nome' })).toBe('articolo:a');
  });
});
