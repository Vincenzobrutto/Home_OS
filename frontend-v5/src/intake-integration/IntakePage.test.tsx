import { screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderApp, createFakeFetch, seededBackend, PASSWORD_A } from '../test/harness';
import type { FetchLike } from '../api/client';

it('authenticated deep link resumes a persisted batch directly, lists saved batches and sends local classification for current versions', async () => {
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
  await screen.findByRole('heading', { name: 'Il lotto è pronto da organizzare.' }); expect(screen.queryByRole('button', { name: 'Vedi il lotto →' })).not.toBeInTheDocument();
  expect(screen.getByText(/Non usa Anthropic/)).toBeInTheDocument();
  await app.user.click(screen.getByRole('checkbox', { name: /Autorizzo l’analisi/ }));
  const start = screen.getByRole('button', { name: /avvia l’analisi/i }); await app.user.click(start);
  await waitFor(() => expect(posts).toHaveLength(1)); expect(posts[0]).toEqual({ provider: 'local_text_v1', items: [{ id: item.id, expectedVersion: 1 }] });
  app.unmount();
});
