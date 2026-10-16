import { screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderApp, createFakeFetch, seededBackend, PASSWORD_A } from '../test/harness';
import type { FetchLike } from '../api/client';

it('failed automatic reading retains the original and refetches without retrying an uncertain request in a loop', async () => {
  const { backend, homeA1, a } = seededBackend(), control = createFakeFetch(backend); let attempts = 0, reads = 0;
  const limits = { maxFiles: 20, maxFileBytes: 20971520, maxTotalBytes: 209715200, acceptedMimeTypes: ['application/pdf'] };
  const item = { id: 'auto-failure-item', clientItemId: 'auto-client', version: 1, filename: 'Solo sintetico.pdf', byteSize: 100, mimeType: 'application/pdf', uploadState: 'stored', analysisState: 'not_started', reviewState: 'unreviewed', documentLink: { state: 'linked', document: { id: 'auto-doc', name: 'Solo sintetico.pdf' } }, pageCount: null, proposal: null, selection: null, organization: null, organizationVersion: 0, duplicate: null, error: null, permissions: ['read', 'edit'] };
  const fetch: FetchLike = async (url, init) => {
    if (!url.includes('/document-intake')) return control.fetch(url, init);
    if (url.endsWith('/analyses') && init.method === 'POST') { attempts++; return new Response(JSON.stringify({ error: { code: 'service_unavailable', message: 'Synthetic unavailable' } }), { status: 503, headers: { 'content-type': 'application/json' } }); }
    const value = url.endsWith('/capabilities') ? { apiVersion: 'document-intake-v1', enabled: true, limits, analysis: { provider: 'local_text_v1', enabled: true, label: 'Locale', costUsd: '0.000000', externalTransmission: false } } : url.endsWith('/batches') ? { items: [], nextCursor: null } : { batch: { id: 'auto-failure-batch', homeId: homeA1.id, version: ++reads, state: 'open', limits, items: [item], permissions: ['read', 'edit'] } };
    return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
  };
  const app = renderApp({ path: '/accedi', backend, fetch }); await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), a.email); await app.user.type(screen.getByLabelText('Password'), PASSWORD_A); await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toBe('/case'));
  await app.router.navigate(`/home/${homeA1.id}/documenti/organizza?lotto=auto-failure-batch`);
  await screen.findByText(/La lettura locale non è stata confermata/);
  await waitFor(() => expect(reads).toBeGreaterThanOrEqual(2)); expect(attempts).toBe(1);
  expect(item.uploadState).toBe('stored'); expect(item.documentLink.document.id).toBe('auto-doc'); app.unmount();
});

it('authenticated deep link resumes a persisted batch and automatically sends only local classification with current versions', async () => {
  const { backend, homeA1, a } = seededBackend(), control = createFakeFetch(backend), posts: unknown[] = [];
  const item = { id: 'item-ui-test', clientItemId: 'client-ui-test', version: 1, filename: 'APE sintetico.pdf', byteSize: 100, mimeType: 'application/pdf', uploadState: 'stored', analysisState: 'not_started', reviewState: 'unreviewed', documentLink: { state: 'linked', document: { id: 'doc-ui-test', name: 'APE sintetico.pdf' } }, pageCount: null, proposal: null, selection: null, organization: null, organizationVersion: 0, duplicate: null, error: null, permissions: ['read', 'edit'] };
  const limits = { maxFiles: 20, maxFileBytes: 20971520, maxTotalBytes: 209715200, acceptedMimeTypes: ['application/pdf'] }, wire = { batch: { id: 'batch-ui-test', homeId: homeA1.id, version: 1, state: 'open', limits, items: [item], permissions: ['read', 'edit'] } };
  const fetch: FetchLike = async (url, init) => {
    if (!url.includes('/document-intake')) return control.fetch(url, init);
    if (init.method === 'POST') { posts.push(JSON.parse(String(init.body))); item.analysisState = 'queued'; item.version++; wire.batch.version++; }
    const value = url.endsWith('/capabilities') ? { apiVersion: 'document-intake-v1', enabled: true, limits, analysis: { provider: 'local_text_v1', enabled: true, label: 'Classificazione locale', costUsd: '0.000000', externalTransmission: false } } : url.endsWith('/batches') ? { items: [{ id: wire.batch.id, createdAt: '2026-10-16T12:00:00.000Z', state: 'open', itemCount: 1 }], nextCursor: null } : wire;
    return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
  };
  const app = renderApp({ path: '/accedi', backend, fetch }); await screen.findByRole('heading', { name: 'Accedi' }); await app.user.type(screen.getByLabelText('Email'), a.email); await app.user.type(screen.getByLabelText('Password'), PASSWORD_A); await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toBe('/case'));
  await app.router.navigate(`/home/${homeA1.id}/documenti/organizza?lotto=batch-ui-test`);
  await screen.findByRole('heading', { name: /Controlla e organizza\.|Stiamo preparando le proposte/ }); expect(screen.queryByRole('button', { name: 'Vedi il lotto →' })).not.toBeInTheDocument();
  await waitFor(() => expect(posts).toHaveLength(1)); expect(posts[0]).toEqual({ provider: 'local_text_v1', items: [{ id: item.id, expectedVersion: 1 }] });
  app.unmount();
});

it('adding a second file appends to the same persisted batch and uploads only the new file', async () => {
  const { backend, homeA1, a } = seededBackend(), control = createFakeFetch(backend);
  const limits = { maxFiles: 20, maxFileBytes: 20971520, maxTotalBytes: 209715200, acceptedMimeTypes: ['application/pdf'] };
  const original = { id: 'item-existing', clientItemId: 'client-existing', version: 3, filename: 'Prima.pdf', byteSize: 10, mimeType: 'application/pdf', uploadState: 'stored', analysisState: 'ready', reviewState: 'deferred', documentLink: { state: 'linked', document: { id: 'doc-existing', name: 'Prima.pdf' } }, pageCount: 1, proposal: null, selection: { action: 'defer' }, organization: null, organizationVersion: 0, duplicate: null, error: null, permissions: ['read', 'edit'] };
  const wire = { batch: { id: 'same-batch-test', homeId: homeA1.id, version: 3, state: 'open', limits, items: [original], permissions: ['read', 'edit'] } };
  const calls: string[] = [];
  const fetch: FetchLike = async (url, init) => {
    if (!url.includes('/document-intake')) return control.fetch(url, init);
    if (init.method === 'POST') {
      calls.push(url);
      if (url.endsWith('/items')) {
        const input = JSON.parse(String(init.body)).items[0];
        wire.batch.items.push({ ...original, ...input, id: 'item-added', version: 1, uploadState: 'pending', analysisState: 'not_started', reviewState: 'unreviewed', selection: null as unknown as typeof original.selection, pageCount: null as unknown as number, documentLink: { state: 'unavailable', document: null as unknown as typeof original.documentLink.document } });
      } else if (url.endsWith('/item-added/file')) {
        const added = wire.batch.items[1]!; added.uploadState = 'stored'; added.version++;
        added.documentLink = { state: 'linked', document: { id: 'doc-added', name: 'Seconda.pdf' } };
      } else if (url.endsWith('/analyses')) {
        expect(JSON.parse(String(init.body))).toEqual({ provider: 'local_text_v1', items: [{ id: 'item-added', expectedVersion: 2 }] });
        const added = wire.batch.items[1]!; added.analysisState = 'queued'; added.version++;
      } else throw new Error('Unexpected write: ' + url);
      wire.batch.version++;
    }
    const value = url.endsWith('/capabilities') ? { apiVersion: 'document-intake-v1', enabled: true, limits, analysis: { provider: 'local_text_v1', enabled: true, label: 'Locale', costUsd: '0.000000', externalTransmission: false } } : url.endsWith('/batches') ? { items: [{ id: wire.batch.id, createdAt: '2026-10-16T12:00:00.000Z', state: 'open', itemCount: wire.batch.items.length }], nextCursor: null } : wire;
    return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
  };
  const app = renderApp({ path: '/accedi', backend, fetch });
  await screen.findByRole('heading', { name: 'Accedi' }); await app.user.type(screen.getByLabelText('Email'), a.email); await app.user.type(screen.getByLabelText('Password'), PASSWORD_A); await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toBe('/case'));
  await app.router.navigate(`/home/${homeA1.id}/documenti/organizza?lotto=same-batch-test`);
  await app.user.click(await screen.findByRole('button', { name: '+ Aggiungi documenti' }));
  await app.user.upload(screen.getByLabelText('File'), new File(['new file'], 'Seconda.pdf', { type: 'application/pdf' }));
  await screen.findByRole('button', { name: 'Tutti · 2' });
  await waitFor(() => expect(calls).toHaveLength(3));
  expect(calls[0]).toMatch(/\/batches\/same-batch-test\/items$/);
  expect(calls[1]).toMatch(/\/batches\/same-batch-test\/items\/item-added\/file$/);
  expect(calls[2]).toMatch(/\/batches\/same-batch-test\/analyses$/);
  expect(app.router.state.location.search).toBe('?lotto=same-batch-test');
  expect(wire.batch.items[0]).toEqual(original);
  expect(original.reviewState).toBe('deferred');
});
