import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from './client';
import { ApiError } from './errors';
import { exportPersonalHome } from './personalExportClient';
import { FakeBackend } from '../test/fakeBackend';
import { createFakeFetch } from '../test/harness';
import { blobBytes } from '../test/browserStubs';

export function exportFixture(homeId: string, accountId: string) {
  return { format: 'dimora-personal-home-export', formatVersion: 1, generatedAt: '2026-10-16T10:00:00.000Z', scope: { homeId, accountId }, account: { id: accountId }, home: { id: homeId }, data: { documents: [], objects: [], technicalAssets: [], rooms: [], positions: [], activities: [], expenses: [], works: [], links: [], history: [] }, limitations: ['originals_not_included'] };
}
async function setup(reply: (homeId: string, accountId: string) => Response) {
  const backend = new FakeBackend(), account = backend.seedAccount('A', 'export@example.test', 'password-di-prova-001'), home = backend.seedHome(account.id, 'Casa export', 'Via 1');
  const control = createFakeFetch(backend); let request: RequestInit | undefined;
  const fetch: FetchLike = (url, init) => { if (url.endsWith('/personal-export')) { request = init; return Promise.resolve(reply(home.id, account.id)); } return control.fetch(url, init); };
  const api = new ApiClient({ fetch }); await api.login({ email: account.email, password: 'password-di-prova-001' }); await api.getSession();
  return { api, home, account, request: () => request };
}
describe('[mock] personal-export client', () => {
  it('accepts additive receipt sections, rejects unknown collections and malformed receipt data', async () => {
    const valid = await setup((h, a) => { const fixture = exportFixture(h, a); return Response.json({ ...fixture, data: { ...fixture.data, receiptFields: [], receiptComparisons: [] } }); });
    await expect(exportPersonalHome(valid.api, valid.home.id, valid.account.id)).resolves.toHaveProperty('blob');
    for (const extra of [{ receiptFields: 'invalid' }, { receiptComparisons: null }, { rawReceiptDrafts: [] }]) {
      const invalid = await setup((h, a) => { const fixture = exportFixture(h, a); return Response.json({ ...fixture, data: { ...fixture.data, ...extra } }); });
      await expect(exportPersonalHome(invalid.api, invalid.home.id, invalid.account.id)).rejects.toBeInstanceOf(ApiError);
    }
  });
  it('explicit authenticated JSON POST, valid envelope becomes private JSON download', async () => {
    const world = await setup((h, a) => Response.json(exportFixture(h, a)));
    const result = await exportPersonalHome(world.api, world.home.id, world.account.id);
    expect(world.request()?.method).toBe('POST'); const headers = new Headers(world.request()?.headers);
    expect(headers.get('X-Account-Context')).toBe(world.account.id); expect(headers.get('X-CSRF-Token')).toBeTruthy(); expect(world.request()?.body).toBe('{}');
    expect(result.filename).toBe(`dimora-casa-${world.home.id}-dati.json`); expect(result.contentType).toBe('application/json');
    expect(JSON.parse(new TextDecoder().decode(await blobBytes(result.blob))).scope.accountId).toBe(world.account.id);
  });
  it('wrong context, future format and HTML 200 never become downloads', async () => {
    for (const reply of [(h: string) => Response.json(exportFixture(h, 'other-account')), (h: string, a: string) => Response.json({ ...exportFixture(h, a), formatVersion: 2 }), () => new Response('<html>proxy error</html>', { headers: { 'content-type': 'text/html' } })]) {
      const w = await setup(reply); await expect(exportPersonalHome(w.api, w.home.id, w.account.id)).rejects.toBeInstanceOf(ApiError);
    }
  });
  it('403 and server size limit stay errors, not JSON data files', async () => {
    for (const status of [403, 413]) { const w = await setup(() => Response.json({ error: { code: status === 413 ? 'personal_export_too_large' : 'FORBIDDEN', message: 'No export' } }, { status })); await expect(exportPersonalHome(w.api, w.home.id, w.account.id)).rejects.toMatchObject({ status }); }
  });
});
