import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { InvoiceCoverageNotice } from './InvoiceCoverageNotice';
import { DocumentEditorContext } from '../documents/DocumentEditorContext';
import type { Draft } from './model';

const fixture = (): Draft => ({id:'draft',version:1,state:'open',mode:'extraction',snapshot:{documentId:'synthetic',documentVersion:1,sha256:'a'.repeat(64)},document:null,documentKind:'purchase_document',items:[],needsReview:true,purchaseTotal:null,review:null,permissions:['read','edit'],invoiceCoverage:{version:'invoice-coverage-v1',totalPages:2,sentPages:[1],coveredPages:[1],pendingPages:[2]}});
it('partial confirmation and resume keep the second page explicit without merging money', () => {
  const d=fixture();
  const view=render(<MemoryRouter><InvoiceCoverageNotice draft={d} root="/home/synthetic"/></MemoryRouter>);
  expect(screen.getByText('Pagine ancora da controllare: 2.')).toBeVisible();
  expect(screen.getByRole('link')).toHaveAttribute('href','/home/synthetic/documenti/synthetic#doc-anteprima');
  view.rerender(<MemoryRouter><InvoiceCoverageNotice draft={{...d,version:2}} root="/home/synthetic"/></MemoryRouter>);
  expect(screen.getByText(/La revisione del file resta aperta/)).toBeVisible();
  expect(screen.queryByText(/366/)).not.toBeInTheDocument();
});
it('complete coverage still requests verification of each invoice', () => {
  const d=fixture();d.invoiceCoverage={...d.invoiceCoverage!,sentPages:[1,2],coveredPages:[1,2],pendingPages:[]};
  render(<MemoryRouter><InvoiceCoverageNotice draft={d} root="/home/synthetic"/></MemoryRouter>);
  expect(screen.getByText('Pagine con una proposta completa: 1, 2 su 2.')).toBeVisible();
  expect(screen.getByText(/non certifica la correttezza/)).toBeVisible();
});
it('opens the existing original viewer and hides all metadata on revocation', async () => {
  const showOriginal=vi.fn(),d=fixture();
  const view=render(<DocumentEditorContext.Provider value={{showOriginal,complete:vi.fn(),pause:vi.fn()}}><InvoiceCoverageNotice draft={d} root="/home/synthetic"/></DocumentEditorContext.Provider>);
  await userEvent.setup().click(screen.getByRole('button',{name:'Controlla le pagine nell’originale'}));
  expect(showOriginal).toHaveBeenCalledOnce();
  view.rerender(<MemoryRouter><InvoiceCoverageNotice draft={{...d,state:'unavailable',snapshot:null}} root="/home/synthetic"/></MemoryRouter>);
  expect(screen.queryByRole('region',{name:'Copertura delle fatture'})).not.toBeInTheDocument();
});
it('does not fabricate coverage for older drafts', () => {
  const d=fixture();delete d.invoiceCoverage;
  render(<MemoryRouter><InvoiceCoverageNotice draft={d} root="/home/synthetic"/></MemoryRouter>);
  expect(screen.queryByText(/pagine/i)).not.toBeInTheDocument();
});
