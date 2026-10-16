import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SearchForm } from './SearchForm';
import { EMPTY_FILTERS, filtersFromParams, filtersToParams, sameFilters } from '../lib/documentSearch';
import { ApiClient } from '../api/client';
import type { Home } from '../api/types';
import { queryKeys } from '../api/queryKeys';
const home: Home = { id: 'home-synthetic', name: 'Casa test', address: 'Via test', version: 1, role: 'owner', permissions: ['read', 'edit'] };
it('personal collection draft applies explicitly, reset clears it, URL/cursor keep distinct scopes', () => {
  const apply = vi.fn(); render(<SearchForm home={home} applied={EMPTY_FILTERS} maxQuery={120} autoFocus={false} collectionsEnabled onApply={apply} />);
  fireEvent.click(screen.getByRole('button', { name: 'Energia' })); expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cerca' })); expect(apply).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, collection: 'energy' });
  const filters = filtersFromParams(new URLSearchParams('collection=building&cursor=old&q=APE'));
  expect(filtersToParams(filters).toString()).toBe('q=APE&collection=building');
  expect(sameFilters(filters, { ...filters, collection: 'energy' })).toBe(false);
  expect(sameFilters(EMPTY_FILTERS, { ...EMPTY_FILTERS, collection: 'all' })).toBe(true);
  expect(queryKeys.documentSearch('account', home.id, { ...EMPTY_FILTERS, collection: 'energy' })).not.toEqual(queryKeys.documentSearch('account', home.id, { ...EMPTY_FILTERS, collection: 'building' }));
  expect(filtersFromParams(new URLSearchParams('collection=__proto__')).collection).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'Azzera filtri' })); expect(apply).toHaveBeenLastCalledWith(EMPTY_FILTERS);
});
it('client sends collection with its page cursor; no collection param for all', async () => {
  const urls: string[] = [], fetch = vi.fn(async (url: RequestInfo | URL) => { urls.push(String(url)); return new Response(JSON.stringify({ items: [], nextCursor: null }), { headers: { 'content-type': 'application/json' } }); });
  const api = new ApiClient({ fetch });
  await api.listDocuments(home.id, { limit: 2, cursor: 'scoped-page' }, undefined, 'account-test', { ...EMPTY_FILTERS, collection: 'condominium' });
  expect(urls[0]).toContain('collection=condominium'); expect(urls[0]).toContain('cursor=scoped-page');
  await api.listDocuments(home.id, {}, undefined, 'account-test', { ...EMPTY_FILTERS, collection: 'all' });
  expect(urls[1]).not.toContain('collection=');
});
