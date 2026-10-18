import { useState } from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { ApiClient } from '../api/client';
import { UnifiedReview } from './UnifiedReview';
import { choice, initialForm, type Draft, type Form } from './model';
import { reviewTotals } from './reviewSummary';

const source = { documentId: 'source', page: 1, excerpt: 'Prova sintetica' };
const fixture = (): Draft => ({ id: 'draft', version: 1, mode: 'extraction', state: 'open', documentKind: 'purchase_document', snapshot: { documentId: 'source', documentVersion: 1, sha256: 'a'.repeat(64) }, document: { id: 'source', name: 'Fattura due articoli', mimeType: 'application/pdf' }, needsReview: false, purchaseTotal: { amountCents: 14989 }, review: null, permissions: ['edit'], items: ['Macchina del ghiaccio', 'Cuffie personali'].map((name, index) => ({ id: 'item' + index, fields: { name: { value: name, source } }, purchaseAmount: { amountCents: index ? 4990 : 9999, source }, quantity: { value: 1 }, profile: { purchaseDate: { value: '2025-06-13', origin: 'extraction_confirmed', sources: [] } }, nameTruncated: false, disposition: 'household_object', enrichment: null, decision: null })) });
function mount(draft = fixture()) {
  const submit = vi.fn(), api = new ApiClient({ fetch: async () => Response.json({ items: [], nextCursor: null }) });
  function Example() {
    const [forms, setForms] = useState<Record<string, Form>>(() => Object.fromEntries(draft.items.map(item => [item.id, initialForm(item, draft)])));
    return <UnifiedReview draft={draft} forms={forms} api={api} accountId="account" base="/homes/home/object-onboarding" root="/home/home" disabled={false} change={(id, value) => setForms(old => ({ ...old, [id]: value }))} save={() => submit(draft.items.map(item => choice(item, forms[item.id]!)))} defer={vi.fn()} add={vi.fn()} enrich={vi.fn()} />;
  }
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><Example /></MemoryRouter></QueryClientProvider>);
  return { user: userEvent.setup(), submit };
}
it('shows both articles in one review and confirms them with one action', async () => {
  const w = mount(), save = screen.getByRole('button', { name: 'Salva e organizza' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() => expect(save).toBeEnabled());
  expect(within(screen.getByRole('region', { name: 'Riepilogo prima di salvare' })).getAllByText('149,89 €', { exact: true })).toHaveLength(2);
  await w.user.click(save);
  expect(w.submit).toHaveBeenCalledOnce();
  expect(w.submit.mock.calls[0]![0]).toMatchObject([{ action: 'create', expense: { amountCents: 9999, manualItemAmount: true } }, { action: 'create', expense: { amountCents: 4990, manualItemAmount: true } }]);
});
it('excludes the second item and its entire monetary choice in the same final request', async () => {
  const w = mount(), second = screen.getByRole('region', { name: /^Articolo 2$/ });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Salva e organizza' })).toBeEnabled());
  await w.user.click(within(second).getByRole('radio', { name: 'Non riguarda questa casa' }));
  const summary = screen.getByRole('region', { name: 'Riepilogo prima di salvare' });
  expect(within(summary).getByText('99,99 €')).toBeInTheDocument();
  expect(within(summary).getByText('Importi esclusi: 49,90 €')).toBeInTheDocument();
  await w.user.click(screen.getByRole('button', { name: 'Salva e organizza' }));
  expect(w.submit.mock.calls[0]![0][1]).toEqual({ itemId: 'item1', action: 'skip' });
  expect(w.submit.mock.calls[0]![0][0].expense.amountCents).toBe(9999);
});
it('does not derive two row prices from a grand total or include stale excluded values', () => {
  const draft = fixture(); draft.items.forEach(item => { delete item.purchaseAmount; });
  const forms = Object.fromEntries(draft.items.map(item => [item.id, initialForm(item, draft)]));
  expect(forms.item0!.amount).toBe(''); expect(forms.item1!.amount).toBe('');
  forms.item1 = { ...forms.item1!, action: 'skip', amount: '900', expense: 'create' };
  expect(reviewTotals(draft, forms)).toMatchObject({ newObjects: 1, newExpenses: 0, amountCents: 0, excludedUnknown: 1 });
});

it('manual unknown document can include an immediate purchase cost with the object', async () => {
 const draft=fixture();draft.mode='manual';draft.documentKind='unsupported';draft.items=draft.items.slice(0,1);draft.purchaseTotal=null;draft.items[0]!.profile={};delete draft.items[0]!.purchaseAmount;
 const w=mount(draft);
 await w.user.selectOptions(screen.getByLabelText('Cosa fare con il costo'),'create');
 await w.user.type(screen.getByLabelText('Importo (€)'),'499,00');
 await w.user.type(screen.getByLabelText('Data della spesa'),'2026-06-14');
 await w.user.click(screen.getByRole('button',{name:'Salva e organizza'}));
 expect(w.submit.mock.calls[0]![0][0].expense).toMatchObject({action:'create',amountCents:49900,spentOn:'2026-06-14'});
});

it('order screenshot exposes purchase cost and permits manual completion without an extracted total',async()=>{
 const draft=fixture();draft.documentKind='order_confirmation';draft.items=draft.items.slice(0,1);draft.purchaseTotal=null;draft.items[0]!.profile={};delete draft.items[0]!.purchaseAmount;
 const w=mount(draft);expect(screen.getByText('Costo di acquisto (facoltativo)')).toBeVisible();
 await w.user.type(screen.getByLabelText('Importo (€)'),'444');expect(screen.getByRole('button',{name:'Salva e organizza'})).toBeDisabled();
 await w.user.type(screen.getByLabelText('Data della spesa'),'2026-06-14');await w.user.click(screen.getByRole('button',{name:'Salva e organizza'}));
 expect(w.submit.mock.calls[0]![0][0].expense).toMatchObject({action:'create',amountCents:44400,spentOn:'2026-06-14'});
});
