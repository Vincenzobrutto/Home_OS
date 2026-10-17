import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import type { CatalogItem } from '../api/types';
import { PurchaseSummary } from './PurchaseSummary';
const mock = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../economy/hooks', () => ({ useEconomyExpenses: mock.query }));
const object = { ref: { kind: 'object', id: 'ice' } } as CatalogItem;
beforeEach(() => mock.query.mockReset());
function show() { return render(<MemoryRouter><PurchaseSummary homeId="home" object={object} enabled /></MemoryRouter>); }
it('reads only active purchases for this object across years, and links to the canonical expense', () => {
  mock.query.mockReturnValue({ data: { pages: [{ items: [{ id: 'purchase', title: 'Macchina ghiaccio', amountCents: 9999, spentOn: '2025-06-13' }] }] }, hasNextPage: false });
  show();
  expect(mock.query).toHaveBeenCalledWith('home', expect.objectContaining({ state: 'active', category: 'purchase_replacement', object: object.ref, period: { kind: 'range', from: '0001-01-01', to: '9999-12-31' } }), { enabled: true, limit: 2 });
  expect(screen.getByRole('link', { name: /99,99 €.*13\/06\/2025/ })).toHaveAttribute('href', '/home/home/spese/purchase');
});
it('does not invent a zero price without a purchase', () => {
  mock.query.mockReturnValue({ data: { pages: [{ items: [] }] } }); show();
  expect(screen.queryByRole('region')).not.toBeInTheDocument(); expect(screen.queryByText(/0,00/)).not.toBeInTheDocument();
});
it('keeps multiple purchases separate rather than summing into an alleged purchase price', () => {
  mock.query.mockReturnValue({ data: { pages: [{ items: [{ id: 'a', title: 'Acquisto', amountCents: 1000, spentOn: '2025-01-01' }, { id: 'b', title: 'Sostituzione', amountCents: 2000, spentOn: '2026-01-01' }] }] }, hasNextPage: true }); show();
  expect(screen.getByRole('heading', { name: 'Acquisti collegati' })).toBeInTheDocument(); expect(screen.queryByText('30,00 €')).not.toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Vedi tutti i costi' })).toBeInTheDocument();
});
it('reports a read error without displaying stale prices', () => {
  mock.query.mockReturnValue({ isError: true, data: { pages: [{ items: [{ amountCents: 9999 }] }] } }); show();
  expect(screen.getByText(/Acquisto non disponibile/)).toBeInTheDocument(); expect(screen.queryByText(/99,99/)).not.toBeInTheDocument();
});
