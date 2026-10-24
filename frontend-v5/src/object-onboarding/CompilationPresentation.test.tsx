import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../api/client';
import { CompilationSteps } from './CompilationSteps';
import { SaveSummary } from './SaveSummary';
import { compilationSteps } from './compilationFlow';
import { initialForm, type Draft } from './model';

// Presentation aligned with the prototype: one question per card, step states, block summary.
const draft: Draft = { id: 'pres', version: 1, state: 'open', mode: 'extraction', documentKind: 'purchase_document', snapshot: { documentId: 'doc', documentVersion: 1, sha256: 'a'.repeat(64) }, document: null, items: ['a', 'b', 'c'].map(id => ({ id, nameTruncated: false, disposition: 'household_object', fields: {}, quantity: null, profile: {}, enrichment: null, decision: null })), needsReview: false, purchaseTotal: null, review: null, permissions: ['edit'] };
const base = Object.fromEntries(draft.items.map(item => [item.id, initialForm(item, draft)]));
const forms = { a: { ...base.a!, name: 'Macchina del caffè' }, b: { ...base.b!, action: 'link' as const, name: 'Supporto TV' }, c: { ...base.c!, action: 'skip' as const, name: 'Spedizione' } };

describe('Domande e spiegazioni dei passaggi', () => {
  it('ogni passaggio ha una domanda; gli articoli cambiano domanda tra crea e collega; titoli invariati', () => {
    const steps = compilationSteps(draft, forms);
    expect(steps.map(step => step.title)).toEqual(['Documento', 'Contenuto', 'Articolo 1', 'Articolo 2', 'Spese', 'Riepilogo']);
    expect(steps.every(step => step.question.length > 0)).toBe(true);
    expect(steps[2]).toMatchObject({ question: 'Crea la scheda dell’oggetto' });
    expect(steps[2]!.hint).toContain('«Macchina del caffè»');
    expect(steps[3]).toMatchObject({ question: 'A quale oggetto si riferisce?' });
  });
  it('solo documento spiega che dopo il documento c’è il riepilogo', () => {
    expect(compilationSteps(draft, forms, true)[0]!.hint).toContain('riepilogo');
  });
});

describe('Riepilogo a blocchi', () => {
  const contacts = [{ proposalId: 'p', action: 'save' as const }];
  it('la pagina unica resta senza blocchi né pulsanti Modifica', () => {
    render(<SaveSummary draft={draft} forms={forms} documentOnly={false} contacts={contacts} />);
    expect(screen.queryByRole('button', { name: /Modifica/ })).toBeNull();
    expect(screen.getByText(/Contatti da salvare in Rubrica: 1/)).toBeInTheDocument();
  });
  it('nelle schede ogni area ha il suo Modifica verso il passaggio giusto, con gli stessi testi', () => {
    const go = vi.fn();
    render(<SaveSummary draft={draft} forms={forms} documentOnly={false} contacts={contacts} edit={{ go, steps: new Set(['documento', 'contenuto', 'spese', 'contatti']) }} />);
    for (const [area, step] of [['Documento', 'documento'], ['Oggetti', 'contenuto'], ['Spese', 'spese'], ['Esclusi', 'contenuto'], ['Contatti', 'contatti']] as const) {
      fireEvent.click(within(screen.getByRole('region', { name: area })).getByRole('button', { name: 'Modifica ' + area }));
      expect(go).toHaveBeenLastCalledWith(step);
    }
    expect(within(screen.getByRole('region', { name: 'Esclusi' })).getByText(/Spedizione · nessun oggetto né spesa/)).toBeInTheDocument();
    expect(screen.getByText(/Contatti da salvare in Rubrica: 1/)).toBeInTheDocument();
  });
  it('senza scheda Contenuto, Oggetti rimanda al Documento; senza contatti scelti nessun blocco Contatti', () => {
    const go = vi.fn();
    render(<SaveSummary draft={draft} forms={forms} documentOnly={false} edit={{ go, steps: new Set(['documento']) }} />);
    fireEvent.click(within(screen.getByRole('region', { name: 'Oggetti' })).getByRole('button', { name: 'Modifica Oggetti' }));
    expect(go).toHaveBeenLastCalledWith('documento');
    expect(screen.queryByRole('region', { name: 'Contatti' })).toBeNull();
  });
});

describe('Scheda, barra e piede', () => {
  function world() {
    render(<MemoryRouter><CompilationSteps api={new ApiClient({ fetch: async () => { throw new Error('unexpected API'); } })} draft={draft} forms={forms} accountId="mock" base="/mock" root="/home/mock" disabled={false} change={vi.fn()} save={vi.fn()} saveDraft={vi.fn()} defer={vi.fn()} add={vi.fn()} enrich={vi.fn()} /></MemoryRouter>);
  }
  it('domanda sotto il titolo, passi fatti con spunta, futuri disabilitati, piede con posizione', () => {
    world();
    expect(screen.getByRole('heading', { level: 2, name: 'Documento' })).toHaveFocus();
    expect(screen.getByText('Che documento è?')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Passaggio 1 di 6');
    const nav = screen.getByRole('navigation', { name: 'Passaggi della compilazione' });
    expect(within(nav).getByRole('button', { name: '3. Articolo 1' })).toBeDisabled();
    const next = screen.getByRole('button', { name: 'Avanti' });
    expect(next).toHaveTextContent(/^Avanti\s?· Contenuto$/);
    fireEvent.click(next);
    expect(screen.getByRole('heading', { level: 2, name: 'Contenuto' })).toHaveFocus();
    expect(screen.getByText('Cosa contiene il documento?')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Passaggio 2 di 6');
    const done = within(nav).getByRole('button', { name: '1. Documento' });
    expect(done).toBeEnabled(); expect(done).toHaveTextContent('✓'); expect(done).not.toHaveAttribute('aria-current');
    expect(within(nav).getByRole('button', { name: '2. Contenuto' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Indietro' })).toBeEnabled();
  });
  it('il contenuto usa radio native con la scelta corrente selezionata', () => {
    world();
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    const row = screen.getByRole('group', { name: /Articolo 2 · Supporto TV/ });
    expect(within(row).getByRole('radio', { name: 'Collega a un oggetto' })).toBeChecked();
    expect(within(row).getByRole('radio', { name: 'Nuovo oggetto' })).not.toBeChecked();
  });
});
