import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { draftBody, emptyDraft, formatEventDate, periodLabel, validateDraft, type HistoryEntry, type HistoryPage as Page } from './model';
import { HistoryPage } from './HistoryPage';

const mocks = vi.hoisted(() => ({ callJson: vi.fn(), listDocuments: vi.fn(), account: { id: 'A' }, home: { id: 'h', name: 'Casa esempio', permissions: ['read', 'edit'] } }));
vi.mock('../session/session', () => ({ useApi: () => ({ callJson: mocks.callJson, listDocuments: mocks.listDocuments }), useAccount: () => mocks.account }));
vi.mock('../routes/HomePages', () => ({ useCurrentHome: () => mocks.home }));
vi.mock('../routes/RoomsPages', () => ({ BackToCasa: () => <a href="/home/h/casa">← Casa</a> }));

const LIMITS = { titleMaxCodePoints: 120, descriptionMaxCodePoints: 1000, maxDocuments: 5 };
const entry = (over: Partial<HistoryEntry>): HistoryEntry => ({ id: 'manual:e1', kind: 'manual', sourceId: 'e1', title: 'Bagno rifatto', description: null, date: { year: 2020, month: null, day: null, precision: 'year' }, sortKey: '2020-00-00', source: 'declared', sourceLabel: 'Inserito da te', link: { type: 'event', id: 'e1' }, documents: [], unavailableDocuments: 0, version: 1, ...over });
const page = (items: HistoryEntry[], over: Partial<Page> = {}): Page => ({ today: '2026-10-22', total: items.length, years: [{ year: 2026, count: 1 }, { year: 2020, count: 1 }], items, nextCursor: null, permissions: ['read', 'edit'], limits: LIMITS, ...over });
const ENTRIES = [
  entry({ id: 'work:w1', kind: 'work', sourceId: 'w1', title: 'Impianto elettrico', date: { year: 2026, month: 6, day: 16, precision: 'day' }, sortKey: '2026-06-16', source: 'dimora', sourceLabel: 'Lavoro · spese', link: { type: 'work', id: 'w1' }, version: null, period: { from: '2026-06-16', to: '2026-07-08' } }),
  entry({ documents: [{ id: 'd1', name: 'Fattura bagno' }], unavailableDocuments: 1, description: 'Piastrelle e sanitari' }),
];

function renderPage(path = '/home/h/storia', state?: unknown) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={cache}><MemoryRouter initialEntries={[{ pathname: path.split('?')[0], search: path.includes('?') ? '?' + path.split('?')[1] : '', state }]}><Routes><Route path="/home/h/storia" element={<HistoryPage />} /></Routes></MemoryRouter></QueryClientProvider>);
  return userEvent.setup();
}
const posts = () => mocks.callJson.mock.calls.filter(c => c[1].method === 'POST');

beforeEach(() => {
  mocks.home = { id: 'h', name: 'Casa esempio', permissions: ['read', 'edit'] };
  mocks.callJson.mockReset();
  mocks.callJson.mockImplementation((path: string, o: { method?: string }) => {
    if (o.method === 'POST') return Promise.resolve({ entry: ENTRIES[1] });
    return Promise.resolve(page(path.includes('year=2020') ? [ENTRIES[1]!] : ENTRIES));
  });
  mocks.listDocuments.mockReset();
  mocks.listDocuments.mockResolvedValue({ items: [{ id: 'd2', name: 'APE 2019' }], nextCursor: null });
});

describe('BL-03 · regole delle date e del modulo', () => {
  it('formato per precisione, nessun giorno inventato; periodo dei lavori', () => {
    expect(formatEventDate({ year: 2020, month: null, day: null })).toBe('2020');
    expect(formatEventDate({ year: 2020, month: 3, day: null })).toBe('marzo 2020');
    expect(formatEventDate({ year: 2020, month: 3, day: 12 })).toBe('12 marzo 2020');
    expect(periodLabel({ from: '2026-06-16', to: '2026-07-08' })).toBe('dal 16 giugno 2026 all’8 luglio 2026');
    expect(periodLabel({ from: '2026-06-16', to: '2026-07-20' })).toBe('dal 16 giugno 2026 al 20 luglio 2026');
    expect(periodLabel({ from: '2026-06-16', to: '2026-06-16' })).toBe('16 giugno 2026');
  });
  it('validazione: titolo, date incomplete coerenti, mai future; il corpo invia solo le parti indicate', () => {
    const d = { ...emptyDraft('2026-10-22', 'Bagno rifatto'), year: '2020' };
    expect(validateDraft(d, '2026-10-22', LIMITS)).toEqual({});
    expect(draftBody(d)).toEqual({ title: 'Bagno rifatto', description: null, date: { year: 2020 }, documentIds: [] });
    expect(validateDraft({ ...d, title: ' ' }, '2026-10-22', LIMITS).title).toBeTruthy();
    expect(validateDraft({ ...d, precision: 'month' }, '2026-10-22', LIMITS).date).toMatch(/mese e anno/);
    expect(validateDraft({ ...d, precision: 'day', month: '2', day: '30' }, '2026-10-22', LIMITS).date).toMatch(/non valida/);
    expect(validateDraft({ ...d, year: '2027' }, '2026-10-22', LIMITS).date).toMatch(/futura/);
    expect(draftBody({ ...d, precision: 'month', month: '3' }).date).toEqual({ year: 2020, month: 3 });
  });
});

describe('BL-03 · pagina Storia della casa', () => {
  it('elenco per anno con fonte, periodo dei lavori, documenti leggibili e non più disponibili; filtro anno nell’indirizzo', async () => {
    const u = renderPage();
    expect(await screen.findByRole('heading', { level: 2, name: '2026' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Impianto elettrico' })).toHaveAttribute('href', '/home/h/spese/lavori/w1');
    expect(screen.getByText(/dal 16 giugno 2026/)).toBeInTheDocument();
    const bath = screen.getByRole('heading', { level: 3, name: 'Bagno rifatto' }).closest('li')!;
    expect(within(bath).getByText('2020')).toBeInTheDocument();
    expect(within(bath).getByRole('link', { name: 'Fattura bagno' })).toHaveAttribute('href', '/home/h/documenti/d1');
    expect(within(bath).getByText(/Un documento collegato non è più disponibile/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: '2020 · 1' }));
    await waitFor(() => expect(mocks.callJson.mock.calls.some(c => String(c[0]).includes('year=2020'))).toBe(true));
    expect(screen.getByRole('button', { name: '2020 · 1' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('aggiunta di un evento con il solo anno e un documento cercato: richiesta idempotente, nessuna data inventata', async () => {
    const u = renderPage();
    await u.click(await screen.findByRole('button', { name: '+ Aggiungi un evento' }));
    await u.type(screen.getByLabelText('Cosa è successo'), 'Caldaia sostituita');
    await u.clear(screen.getByLabelText('Anno')); await u.type(screen.getByLabelText('Anno'), '2019');
    await u.type(screen.getByPlaceholderText(/Cerca un documento/), 'APE');
    await u.click(screen.getByRole('button', { name: 'Cerca' }));
    await u.click(await screen.findByRole('button', { name: 'Collega' }));
    await u.click(screen.getByRole('button', { name: 'Aggiungi alla storia' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    const [path, opts] = posts()[0]!;
    expect(path).toBe('/homes/h/history/events');
    expect(opts.body).toEqual({ title: 'Caldaia sostituita', description: null, date: { year: 2019 }, documentIds: ['d2'] });
    expect(opts.idempotencyKey).toBeTruthy();
  });

  it('da un documento: modulo aperto con il documento collegato; il nome arriva dallo stato, non dall’indirizzo', async () => {
    renderPage('/home/h/storia?nuovo=1&documento=d9', { historyDocumentName: 'Visura agibilità.pdf' });
    expect(await screen.findByRole('heading', { name: 'Aggiungi un evento alla storia' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cosa è successo')).toHaveValue('Visura agibilità');
    expect(screen.getByText('Visura agibilità.pdf')).toBeInTheDocument();
  });

  it('modifica e rimozione di un evento inserito a mano, con versione attesa e conferma esplicita', async () => {
    const u = renderPage();
    const bath = (await screen.findByRole('heading', { level: 3, name: 'Bagno rifatto' })).closest('li')!;
    await u.click(within(bath).getByRole('button', { name: 'Rimuovi' }));
    await u.click(within(bath).getByRole('button', { name: 'Rimuovi dalla storia' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]![0]).toBe('/homes/h/history/events/e1/removal');
    expect(posts()[0]![1].body).toEqual({ expectedVersion: 1 });
    await u.click(within(screen.getByRole('heading', { level: 3, name: 'Bagno rifatto' }).closest('li')!).getByRole('button', { name: 'Modifica' }));
    expect(screen.getByLabelText('Cosa è successo')).toHaveValue('Bagno rifatto');
    expect(screen.getByLabelText('Descrizione (facoltativa)')).toHaveValue('Piastrelle e sanitari');
    await u.click(screen.getByRole('button', { name: 'Salva modifiche' }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(posts()[1]![0]).toBe('/homes/h/history/events/e1/updates');
    expect(posts()[1]![1].body).toMatchObject({ expectedVersion: 1, date: { year: 2020 }, documentIds: ['d1'] });
  });

  it('ruolo in sola lettura: nessun comando di scrittura; voci dell’app senza modifica', async () => {
    mocks.home = { id: 'h', name: 'Casa esempio', permissions: ['read'] };
    renderPage();
    await screen.findByRole('heading', { level: 3, name: 'Bagno rifatto' });
    expect(screen.queryByRole('button', { name: '+ Aggiungi un evento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument();
  });

  it('storia vuota: invito a iniziare anche con il solo anno', async () => {
    mocks.callJson.mockImplementation(() => Promise.resolve(page([], { years: [] })));
    renderPage();
    expect(await screen.findByText('La storia della casa è ancora vuota')).toBeInTheDocument();
    expect(screen.getByText(/anche solo con l’anno/)).toBeInTheDocument();
  });
});
