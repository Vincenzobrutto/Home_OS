import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogItem, Home } from '../api/types';
import { ProfileSection, warrantySupportChange } from '../object-onboarding/ProfileSection';
import { addCalendarMonths, draftEnd, suggestedReminderDate, warrantyDraftError, warrantyExpired, warrantyProvenance, WarrantySummary } from './Warranty';

const mocks = vi.hoisted(() => ({ callJson: vi.fn(), listObjectLinks: vi.fn(), account: { id: 'A' } }));
vi.mock('../session/session', () => ({ useApi: () => ({ callJson: mocks.callJson, listObjectLinks: mocks.listObjectLinks }), useAccount: () => mocks.account }));

const DOC = '11111111-1111-4111-8111-111111111111';
const home = { id: 'h', name: 'Casa', permissions: ['read', 'edit'] } as unknown as Home;
const base: CatalogItem = {
  ref: { kind: 'object', id: 'o' }, name: 'Lavatrice', type: 'appliance', kindLabel: 'Oggetto', state: 'active', permissions: ['read', 'edit'], version: 3,
  position: { version: 0, rooms: [] }, technicalLink: null,
  profile: { fields: { purchaseDate: { value: '2025-03-10', origin: 'user_declared', sources: [] } }, unavailable: false },
} as unknown as CatalogItem;
const withEnd = (end: Record<string, unknown>): CatalogItem => ({ ...base, profile: { unavailable: false, fields: { ...base.profile!.fields, warrantyEnd: end } } } as unknown as CatalogItem);

function renderProfile(item: CatalogItem) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={cache}><ProfileSection object={item} homeId="h" canEdit /></QueryClientProvider>);
  return userEvent.setup();
}
const posted = () => mocks.callJson.mock.calls.find(c => c[1].method === 'POST')?.[1].body;

beforeEach(() => {
  mocks.callJson.mockReset();
  mocks.callJson.mockImplementation((_p: string, o: { method?: string }) => (o.method === 'POST' ? Promise.resolve({ object: base }) : Promise.resolve({ items: [] })));
  mocks.listObjectLinks.mockReset();
  mocks.listObjectLinks.mockResolvedValue({ items: [{ linkId: 'l', version: 1, origin: 'native', state: 'active', resourceType: 'document', resource: { id: DOC, title: 'Fattura lavatrice' }, objectRef: { kind: 'object', id: 'o' } }], nextCursor: null });
});

describe('BL-02 · calcoli e testi', () => {
  it('mesi di calendario come il servizio, scadenza superata, promemoria mai nel passato', () => {
    expect(addCalendarMonths('2024-02-29', 24)).toBe('2026-02-28');
    expect(addCalendarMonths('2025-01-31', 1)).toBe('2025-02-28');
    expect(addCalendarMonths('2025-01-01', 0)).toBeNull();
    expect(warrantyExpired('2025-01-01', '2025-06-01')).toBe(true);
    expect(warrantyExpired('2025-06-01', '2025-06-01')).toBe(false);
    expect(suggestedReminderDate('2027-03-10', '2026-01-01')).toBe('2027-02-08');
    expect(suggestedReminderDate('2026-01-10', '2026-01-01')).toBe('2026-01-01');
  });
  it('provenienza: dichiarata, con documento associato, documento non più disponibile, letta dal documento', () => {
    const f = { value: '2027-01-01', sources: [] };
    expect(warrantyProvenance({ ...f, origin: 'user_declared' })).toBe('Dichiarata da te');
    expect(warrantyProvenance({ ...f, origin: 'user_declared', support: { documentId: DOC, name: 'Fattura' } })).toBe('Dichiarata da te · documento associato: «Fattura»');
    expect(warrantyProvenance({ ...f, origin: 'user_declared', support: null, supportUnavailable: true })).toMatch(/non più disponibile/);
    expect(warrantyProvenance({ ...f, origin: 'extraction_confirmed' })).toBe('Letta dal documento');
  });
  it('modulo: scadenza da data o mesi; errori espliciti per mesi senza inizio, ordine e documento senza scadenza', () => {
    const d = { start: '2025-03-10', mode: 'months' as const, end: '', months: '24', supportId: '' };
    expect(draftEnd(d)).toBe('2027-03-10');
    expect(warrantyDraftError({ ...d, start: '' })).toMatch(/indica l’inizio/);
    expect(warrantyDraftError({ ...d, months: '1,5' })).toMatch(/intera/);
    expect(warrantyDraftError({ ...d, mode: 'date', end: '2024-01-01' })).toMatch(/precedere/);
    expect(warrantyDraftError({ ...d, mode: 'date', end: '', supportId: DOC })).toMatch(/indicala prima/);
  });
  it('documento di supporto: inviato per una scadenza dichiarata, ripetuto se la scadenza cambia, null per rimuoverlo', () => {
    const declared = { warrantyEnd: { value: '2027-01-01', origin: 'user_declared', sources: [], support: { documentId: DOC, name: 'F' } } };
    expect(warrantySupportChange(declared, {}, DOC, '2027-01-01')).toBeUndefined();
    expect(warrantySupportChange(declared, { warrantyEnd: '2028-01-01' }, DOC, '2028-01-01')).toEqual({ documentId: DOC });
    expect(warrantySupportChange(declared, {}, '', '2027-01-01')).toBeNull();
    const fromDocument = { warrantyEnd: { value: '2027-01-01', origin: 'extraction_confirmed', sources: [] } };
    expect(warrantySupportChange(fromDocument, {}, DOC, '2027-01-01')).toBeUndefined();
  });
});

describe('BL-02 · scheda oggetto', () => {
  it('riquadro: «fino al» o «scaduta il», provenienza e promemoria solo per garanzia non scaduta', async () => {
    const onRemind = vi.fn();
    const { rerender } = render(<MemoryRouter><WarrantySummary home={home} object={withEnd({ value: '2999-01-01', origin: 'user_declared', sources: [], support: { documentId: DOC, name: 'Fattura lavatrice' } })} canRemind onRemind={onRemind} /></MemoryRouter>);
    expect(screen.getByText(/fino al/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fattura lavatrice' })).toHaveAttribute('href', `/home/h/documenti/${DOC}`);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Crea promemoria' }));
    expect(onRemind).toHaveBeenCalledOnce();
    rerender(<MemoryRouter><WarrantySummary home={home} object={withEnd({ value: '2020-01-01', origin: 'extraction_confirmed', sources: [] })} canRemind onRemind={onRemind} /></MemoryRouter>);
    expect(screen.getByText(/scaduta il/)).toBeInTheDocument();
    expect(screen.getByText('Letta dal documento')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crea promemoria' })).not.toBeInTheDocument();
    rerender(<MemoryRouter><WarrantySummary home={home} object={base} canRemind onRemind={onRemind} /></MemoryRouter>);
    expect(screen.queryByText('Garanzia')).not.toBeInTheDocument();
  });

  it('nessuna copertura presunta: i 24 mesi si applicano solo con la scorciatoia e partono dall’inizio scelto', async () => {
    const u = renderProfile(base);
    await u.click(screen.getByRole('button', { name: 'Modifica dati e garanzia' }));
    expect(screen.getByLabelText('Garanzia fino al')).toHaveValue('');
    await u.click(screen.getByRole('button', { name: 'Usa la data di acquisto' }));
    await u.click(screen.getByRole('button', { name: /Usa 24 mesi/ }));
    expect(screen.getByText(/Scade il 10 mar 2027/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Salva modifiche' }));
    await waitFor(() => expect(posted()).toBeDefined());
    expect(posted()).toEqual({ expectedVersion: 3, values: { warrantyStart: '2025-03-10', warrantyEnd: '2027-03-10' } });
  });

  it('documento di supporto scelto tra quelli collegati: inviato insieme alla scadenza dichiarata', async () => {
    const u = renderProfile(base);
    await u.click(screen.getByRole('button', { name: 'Modifica dati e garanzia' }));
    fireEvent.input(screen.getByLabelText('Garanzia fino al'), { target: { value: '2028-03-10' } });
    await screen.findByRole('option', { name: 'Fattura lavatrice' });
    await u.selectOptions(screen.getByLabelText(/Documento di supporto/), DOC);
    await u.click(screen.getByRole('button', { name: 'Salva modifiche' }));
    await waitFor(() => expect(posted()).toBeDefined());
    expect(posted()).toEqual({ expectedVersion: 3, values: { warrantyEnd: '2028-03-10' }, warrantyDocument: { documentId: DOC } });
  });

  it('scadenza letta dal documento: la fonte è già indicata, nessun documento di supporto da scegliere', async () => {
    const u = renderProfile(withEnd({ value: '2027-01-01', origin: 'extraction_confirmed', sources: [{ documentId: DOC, page: 1, excerpt: 'Garanzia 2 anni' }] }));
    await u.click(screen.getByRole('button', { name: 'Modifica dati e garanzia' }));
    expect(screen.getByText(/Scadenza letta dal documento/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Documento di supporto/)).not.toBeInTheDocument();
  });

  it('errore del modulo: mesi senza inizio bloccano il salvataggio con un messaggio', async () => {
    const u = renderProfile({ ...base, profile: { unavailable: false, fields: {} } } as unknown as CatalogItem);
    await u.click(screen.getByRole('button', { name: 'Modifica dati e garanzia' }));
    await u.click(screen.getByRole('button', { name: /Usa 24 mesi/ }));
    await u.click(screen.getByRole('button', { name: 'Salva modifiche' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/indica l’inizio della garanzia/);
    expect(posted()).toBeUndefined();
  });
});
