import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { it, expect, vi } from 'vitest';
import { DocumentBillEntry } from './DocumentBillEntry';
const callJson = vi.fn();
vi.mock('../session/session', () => ({ useAccount: () => ({ id: 'account' }), useApi: () => ({ callJson }) }));
function mount(data: unknown, documentId = 'bill-ready') {
  callJson.mockReset().mockResolvedValue(data);
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><DocumentBillEntry homeId="home" documentId={documentId} compact /></MemoryRouter></QueryClientProvider>);
}
it('opens the ready draft for this bill directly, using read-only requests', async () => {
  mount({ drafts: [{ id: 'draft-ready', state: 'open' }], job: null });
  expect(await screen.findByText('Proposta di spesa pronta')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Rivedi e conferma la spesa' })).toHaveAttribute('href', '/home/home/documenti/bill-ready/oggetti?bozza=draft-ready');
  expect(callJson).toHaveBeenCalledWith('/homes/home/object-onboarding/capabilities?documentId=bill-ready', expect.not.objectContaining({ method: 'POST' }));
});
it('does not describe the other bill as ready', async () => {
  mount({ drafts: [], job: null }, 'other-bill');
  expect(await screen.findByText('Spesa da preparare')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Prepara la proposta di spesa' })).toHaveAttribute('href', '/home/home/documenti/other-bill/oggetti');
  expect(screen.queryByText('Proposta di spesa pronta')).not.toBeInTheDocument();
});
it('allows resuming a running analysis without starting another', async () => {
  mount({ drafts: [], job: { state: 'running' } });
  expect(await screen.findByRole('link', { name: 'Vedi analisi in corso' })).toBeInTheDocument();
  expect(callJson).toHaveBeenCalledTimes(1);
});
it('labels an accepted proposal and keeps the detail link', async () => {
  mount({ drafts: [{ id: 'previous', state: 'confirmed' }], job: null });
  expect(await screen.findByRole('link', { name: 'Proposta accettata · Vedi dettaglio' })).toBeInTheDocument();
  expect(screen.queryByText('Proposta di spesa pronta')).not.toBeInTheDocument();
});
