import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SearchForm } from './SearchForm';
import { EMPTY_FILTERS, filtersFromParams, filtersToParams, sameFilters } from '../lib/documentSearch';
import { ApiClient } from '../api/client';
import type { Home } from '../api/types';
import { queryKeys } from '../api/queryKeys';
const home: Home = { id: 'home-synthetic', name: 'Casa test', address: 'Via test', version: 1, role: 'owner', permissions: ['read', 'edit'] };
it('collection filter in the Filtri dialog keeps the other filters; chips remove one filter or all', async () => {
  // Dopo 74efc05 la tipologia si sceglie nel dialogo «Filtri» (non più pulsanti sempre visibili).
  const user = userEvent.setup(), apply = vi.fn(), applied = { ...EMPTY_FILTERS, q: 'APE', format: 'pdf' as const };
  const view = render(<SearchForm home={home} applied={applied} maxQuery={120} autoFocus={false} collectionsEnabled onApply={apply} />);
  await user.click(screen.getByRole('button', { name: 'Filtri (1)' }));
  const dialog = screen.getByRole('dialog', { name: 'Filtri' });
  await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Gruppo di documenti' }), 'energy');
  await user.click(within(dialog).getByRole('button', { name: 'Mostra risultati' }));
  expect(apply).toHaveBeenLastCalledWith({ ...applied, collection: 'energy', workflow: 'all' });
  view.rerender(<SearchForm home={home} applied={{ ...applied, collection: 'energy' }} maxQuery={120} autoFocus={false} collectionsEnabled onApply={apply} />);
  fireEvent.click(screen.getByRole('button', { name: 'Rimuovi filtro APE e certificazioni energetiche' }));
  expect(apply).toHaveBeenLastCalledWith({ ...applied, collection: 'all' });
  const filters = filtersFromParams(new URLSearchParams('collection=building&cursor=old&q=APE'));
  expect(filtersToParams(filters).toString()).toBe('q=APE&collection=building');
  expect(sameFilters(filters, { ...filters, collection: 'energy' })).toBe(false);
  expect(sameFilters(EMPTY_FILTERS, { ...EMPTY_FILTERS, collection: 'all' })).toBe(true);
  expect(queryKeys.documentSearch('account', home.id, { ...EMPTY_FILTERS, collection: 'energy' })).not.toEqual(queryKeys.documentSearch('account', home.id, { ...EMPTY_FILTERS, collection: 'building' }));
  expect(filtersFromParams(new URLSearchParams('collection=__proto__')).collection).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'Rimuovi filtri' }));
  expect(apply).toHaveBeenLastCalledWith({ ...applied, format: 'all', visibility: 'all', collection: 'all', workflow: 'all' });
});
it('client sends collection with its page cursor; no collection param for all', async () => {
  const urls: string[] = [], fetch = vi.fn(async (url: RequestInfo | URL) => { urls.push(String(url)); return new Response(JSON.stringify({ items: [], nextCursor: null }), { headers: { 'content-type': 'application/json' } }); });
  const api = new ApiClient({ fetch });
  await api.listDocuments(home.id, { limit: 2, cursor: 'scoped-page' }, undefined, 'account-test', { ...EMPTY_FILTERS, collection: 'condominium' });
  expect(urls[0]).toContain('collection=condominium'); expect(urls[0]).toContain('cursor=scoped-page');
  await api.listDocuments(home.id, {}, undefined, 'account-test', { ...EMPTY_FILTERS, collection: 'all' });
  expect(urls[1]).not.toContain('collection=');
});

it('secondary filters stay in a closed dialog until opened; an applied format is counted and shown as a chip', async () => {
  const user = userEvent.setup();
  const view = render(<SearchForm home={home} applied={EMPTY_FILTERS} maxQuery={120} autoFocus={false} onApply={vi.fn()} />);
  expect(screen.queryByLabelText('Formato')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Filtri' }));
  expect(screen.getByRole('combobox', { name: 'Formato' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Annulla' }));
  expect(screen.queryByLabelText('Formato')).not.toBeInTheDocument();
  view.rerender(<SearchForm home={home} applied={{ ...EMPTY_FILTERS, format: 'pdf' }} maxQuery={120} autoFocus={false} onApply={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Rimuovi filtro PDF' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Filtri (1)' }));
  expect(screen.getByRole('combobox', { name: 'Formato' })).toHaveValue('pdf');
});
