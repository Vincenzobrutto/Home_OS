import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { ApiClient } from '../api/client';
import { CompilationSteps } from './CompilationSteps';
import type { Draft } from './model';

const draft: Draft = { id: 'empty', version: 1, state: 'open', mode: 'manual', documentKind: 'house_document', snapshot: { documentId: 'doc', documentVersion: 1, sha256: 'a'.repeat(64) }, document: null, items: [], needsReview: false, purchaseTotal: null, review: null, permissions: ['edit'] };
function world(extra: Partial<React.ComponentProps<typeof CompilationSteps>> = {}) {
  const save = vi.fn(), saveDraft = vi.fn(), retryDraftSave = vi.fn();
  render(<MemoryRouter><CompilationSteps api={new ApiClient({ fetch: async () => { throw new Error('unexpected API'); } })} draft={draft} forms={{}} accountId="mock" base="/mock" root="/home/mock" disabled={false} documentOnly change={vi.fn()} save={save} saveDraft={saveDraft} retryDraftSave={retryDraftSave} defer={vi.fn()} add={vi.fn()} enrich={vi.fn()} {...extra} /></MemoryRouter>);
  return { save, saveDraft, retryDraftSave };
}
it('un documento incompleto blocca Avanti ma permette la bozza', () => {
  const w = world({ documentProblem: 'Indica il titolo del documento.' });
  fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Indica il titolo');
  fireEvent.click(screen.getByRole('button', { name: 'Salva bozza ed esci' }));
  expect(w.saveDraft).toHaveBeenCalledOnce(); expect(w.save).not.toHaveBeenCalled();
});
it('pagine fattura pendenti restano bloccanti anche in solo documento', () => {
  const w = world({ draft: { ...draft, invoiceCoverage: { version: 'invoice-coverage-v1', totalPages: 2, sentPages: [1], coveredPages: [1], pendingPages: [2] } } });
  fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
  expect(screen.getByRole('button', { name: 'Salva documento' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('Restano pagine'); expect(w.save).not.toHaveBeenCalled();
});
it.each([true, false])('errore bozza incerto=%s mantiene focus e comando di recupero distinto', uncertain => {
  const w = world({ disabled: uncertain, draftSaveFailure: { uncertain, message: 'I dati restano qui.' } });
  expect(screen.getByRole('alert', { name: 'Salvataggio bozza' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Riprova salvataggio' }));
  expect(uncertain ? w.retryDraftSave : w.saveDraft).toHaveBeenCalledOnce();
  expect(uncertain ? w.saveDraft : w.retryDraftSave).not.toHaveBeenCalled(); expect(w.save).not.toHaveBeenCalled();
});
