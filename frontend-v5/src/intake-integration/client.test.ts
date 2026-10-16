import { expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../api/client';
import { IntakeClient, decodeBatch, toUiBatch } from './client';
export const wireFixture = () => ({ batch: { id: 'batch-test', homeId: 'home-test', version: 1, state: 'open', limits: { maxFiles: 20, maxFileBytes: 20971520, maxTotalBytes: 209715200, acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'] }, permissions: ['read', 'edit'], items: [{ id: 'item-test', clientItemId: 'client-test', version: 1, filename: 'example.pdf', byteSize: 10, mimeType: 'application/pdf', uploadState: 'pending', analysisState: 'not_started', reviewState: 'unreviewed', documentLink: { state: 'unavailable', document: null }, pageCount: null, proposal: null, selection: null, duplicate: null, organization: null, organizationVersion: 0, error: null, permissions: ['read', 'edit'] }] } });
it('rejects cross-home and redacted-source payloads carrying cached metadata; never restores a hidden source', () => {
  const fixture = wireFixture(); expect(() => decodeBatch(fixture, 'another-home')).toThrow();
  expect(() => decodeBatch({ batch: { ...fixture.batch, limits: {} } }, 'home-test')).toThrow();
  const item = fixture.batch.items[0]!; item.uploadState = 'duplicate'; item.permissions = [];
  expect(() => decodeBatch(fixture, 'home-test')).toThrow();
  const hidden = { ...fixture, batch: { ...fixture.batch, items: [{ ...item, filename: null, byteSize: null, mimeType: null }] } };
  const ui = toUiBatch(decodeBatch(hidden, 'home-test'));
  expect(ui.items[0]?.permissions.review).toBe(false); expect(ui.items[0]?.confirmedOrganization).toBeNull();
});
it('multipart upload uses stable per-item key, account/CSRF and forwards abort signal without setting multipart content-type', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [], signal = new AbortController().signal;
  const fetch: FetchLike = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(url.endsWith('/session') ? { account: null, csrfToken: 'synthetic-csrf' } : wireFixture()), { headers: { 'content-type': 'application/json' } }); };
  const api = new ApiClient({ fetch }); await api.getSession(); const client = new IntakeClient(api, 'account-test', 'home-test'), file = new File(['test bytes'], 'example.pdf', { type: 'application/pdf' });
  await client.upload('batch-test', 'item-test', file, signal); await client.upload('batch-test', 'item-test', file, signal);
  const [first, second] = calls.filter(c => c.url.endsWith('/file')); expect(first).toBeDefined();
  expect(new Headers(first!.init.headers).get('Idempotency-Key')).toBe(new Headers(second!.init.headers).get('Idempotency-Key'));
  expect(new Headers(first!.init.headers).get('X-Account-Context')).toBe('account-test'); expect(new Headers(first!.init.headers).get('X-CSRF-Token')).toBe('synthetic-csrf');
  expect(new Headers(first!.init.headers).has('Content-Type')).toBe(false); expect(first!.init.body).toBeInstanceOf(FormData); expect(first!.init.signal).toBe(signal);
});
