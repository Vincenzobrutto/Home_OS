import {expect, it} from 'vitest';
import {completedDocumentTitle, type DocumentTitleContext} from './completedDocumentTitle';
import {documentDisplayTitle} from './presentation';

const doc: DocumentTitleContext = {
  name: '01ab.pdf', originalFilename: '01ab.pdf', workflowState: 'completed',
  organization: {title: '01ab.pdf', version: 1, parts: [{kind: 'invoice', pageFrom: null, pageTo: null}], collections: ['purchases'], origin: 'user_declared', updatedAt: '2026-01-01'},
  linkedObjects: [{id: 'o1', kind: 'object', name: 'Macchina da caffè ECAM 123 variante X'}],
  savedExpenses: [{id: 'e1', title: 'Non usare questo testo', amountCents: 49900, supplier: 'Negozio qualsiasi', documentNumber: 'A/27', documentDate: '2026-09-03'}],
};
const withKind = (kind: string): DocumentTitleContext => ({...doc, organization: {...doc.organization!, parts: [{kind, pageFrom: null, pageTo: null}]}});

it('presents exact linked names and confirmed document facts without mutating any field', () => {
  const before = JSON.stringify(doc);
  expect(documentDisplayTitle(doc)).toBe('Fattura · Macchina da caffè ECAM 123 variante X · Negozio qualsiasi · n. A/27 · 03/09/2026');
  expect(JSON.stringify(doc)).toBe(before);
});
it.each(['manual', 'warranty', 'product_label', 'system_booklet', 'conformity_declaration', 'system_diagram', 'contract', 'floor_plan'])('uses linked objects for %s without interpreting purchase dates as document dates', kind => {
  const title = completedDocumentTitle(withKind(kind));
  expect(title).toContain('Macchina da caffè ECAM 123 variante X');
  expect(title).not.toMatch(/499|Negozio|A\/27|2026|Non usare/);
});
it.each(['invoice', 'receipt', 'purchase_order', 'purchase_document', 'delivery_notice'])('can label %s using one saved personal expense, without inventing payment or delivery status', kind => {
  const title = completedDocumentTitle({...withKind(kind), linkedObjects: []});
  expect(title).toContain('Negozio qualsiasi · n. A/27 · 03/09/2026');
  expect(title).not.toMatch(/pagat|consegnat|499/);
});
it.each(['to_compile', 'review', 'analyzing', 'attention', undefined] as const)('keeps filename for unfinished workflow %s', workflowState => {
  expect(documentDisplayTitle({...doc, workflowState})).toBe('01ab.pdf');
});
it.each(['Titolo scelto da me', 'Documento senza titolo', 'Fattura'])('preserves custom title %s', title => {
  expect(documentDisplayTitle({...doc, organization: {...doc.organization!, title}})).toBe(title);
});
it('accepts filename stem but does not replace a different user chosen name when organization title is empty', () => {
  expect(completedDocumentTitle({...doc, organization: {...doc.organization!, title: '01ab'}})).not.toBeNull();
  expect(completedDocumentTitle({...doc, name: 'Scelta personale', organization: {...doc.organization!, title: ''}})).toBeNull();
});
it.each(['2026-02-29', '2026-13-02', '0000-09-01', '03/09/2026', '2026-09-03T00:00:00Z', null])('omits invalid or noncanonical document date %s', documentDate => {
  expect(completedDocumentTitle({...doc, linkedObjects: [], savedExpenses: [{...doc.savedExpenses![0]!, supplier: null, documentNumber: null, documentDate}]})).toBeNull();
});
it('preserves leap date, normalizes whitespace and omits empty supplier/number', () => {
  expect(completedDocumentTitle({...doc, linkedObjects: [], savedExpenses: [{...doc.savedExpenses![0]!, supplier: '  ', documentNumber: '\n ', documentDate: '2024-02-29'}]})).toBe('Fattura · 29/02/2024');
});
it('never chooses among expenses, but may use unambiguous object links independently', () => {
  const multiple = {...doc, savedExpenses: [...doc.savedExpenses!, {...doc.savedExpenses![0]!, id: 'e2', supplier: 'Altro negozio'}]};
  expect(completedDocumentTitle(multiple)).toBe('Fattura · Macchina da caffè ECAM 123 variante X');
  expect(completedDocumentTitle({...multiple, linkedObjects: []})).toBeNull();
});
it('shows at most two object names with the remaining count; duplicate links do not inflate the count', () => {
  const links: NonNullable<DocumentTitleContext['linkedObjects']> = [{id: '1', kind: 'object', name: 'Climatizzatore 1'}, {id: '2', kind: 'object', name: 'Climatizzatore 2'}, {id: '3', kind: 'boiler', name: 'Caldaia'}];
  expect(completedDocumentTitle({...withKind('manual'), linkedObjects: [...links, links[0]!]})).toBe('Manuale d’uso · Climatizzatore 1, Climatizzatore 2 (+1)');
});
it('does not label composite documents, unknown kinds or missing context', () => {
  expect(completedDocumentTitle({...doc, organization: {...doc.organization!, parts: [...doc.organization!.parts, ...doc.organization!.parts]}})).toBeNull();
  for (const kind of ['other', 'unknown', 'constructor', '__proto__']) expect(completedDocumentTitle(withKind(kind))).toBeNull();
  expect(completedDocumentTitle({...doc, linkedObjects: [], savedExpenses: []})).toBeNull();
  expect(completedDocumentTitle({...doc, originalFilename: undefined})).toBeNull();
  expect(documentDisplayTitle({name: 'Vecchia API'})).toBe('Vecchia API');
});
it('does not bypass the invoice-month rule for bills, even with valid document date and object', () => {
  expect(completedDocumentTitle(withKind('utility_bill'))).toBeNull();
  expect(documentDisplayTitle(withKind('utility_bill'))).toBe('Bolletta Negozio qualsiasi');
  expect(documentDisplayTitle({...withKind('utility_bill'), savedExpenses: [{...doc.savedExpenses![0]!, invoiceMonth: '2026-09'}]})).toBe('Bolletta Negozio qualsiasi · settembre 2026');
});
