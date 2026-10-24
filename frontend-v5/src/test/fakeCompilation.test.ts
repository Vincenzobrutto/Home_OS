import { expect, it } from 'vitest';
import { ApiClient } from '../api/client';
import { FakeBackend, type FakeRequest } from './fakeBackend';
import { createFakeFetch } from './harness';
import { seedCompilation } from './fakeCompilation';

async function world() {
  const backend = new FakeBackend(), owner = backend.seedAccount('Test', 'compilation@example.test', 'password-di-prova-A');
  const home = backend.seedHome(owner.id, 'Sintetica', 'Via test');
  const fixture = await seedCompilation(backend, home.id, owner.id);
  const control = createFakeFetch(backend), api = new ApiClient({ fetch: control.fetch });
  await api.login({ email: owner.email, password: 'password-di-prova-A' }); await api.getSession();
  const session = backend.sessions.get(control.cookie()!)!;
  const request = (path: string, body?: unknown, key = 'key-1'): FakeRequest => ({
    path: '/homes/' + home.id + '/object-onboarding' + path, method: body ? 'POST' : 'GET', body,
    cookie: control.cookie(), headers: { 'x-csrf-token': session.csrf, 'idempotency-key': key },
  });
  return { ...fixture, request };
}

it('harness browser rifiuta accessi estranei, CSRF assente e qualsiasi job provider', async () => {
  const w = await world();
  expect((await w.handle({ ...w.request('/drafts/' + w.draft.id), cookie: undefined }))?.status).toBe(403);
  expect((await w.handle({ ...w.request('/jobs', {}), headers: {} }))?.status).toBe(403);
  expect((await w.handle(w.request('/jobs', {})))?.status).toBe(422);
  expect(w.draft.version).toBe(1);
});

it('harness conserva bozza, controlla versioni e ripete la ricevuta senza seconda conferma', async () => {
  const w = await world(), root = '/drafts/' + w.draft.id;
  expect((await w.handle(w.request(root + '/review', { expectedVersion: 1, review: { forms: {} } })))?.status).toBe(200);
  expect(w.draft.review).toEqual({ forms: {} });
  expect((await w.handle(w.request(root + '/review', { expectedVersion: 1, review: { forms: {} } })))?.status).toBe(200);
  expect(w.draft.version).toBe(2);
  const body = { expectedVersion: 2, source: w.draft.snapshot, choices: w.draft.items.map(item => ({ itemId: item.id, action: 'skip' })) };
  const response = await w.handle(w.request(root + '/confirmations', body));
  expect(response?.status).toBe(200); expect(w.draft.version).toBe(3);
  expect(await w.handle(w.request(root + '/confirmations', body))).toEqual(response); expect(w.draft.version).toBe(3);
  expect((await w.handle(w.request(root + '/confirmations', { ...body, choices: [] })))?.status).toBe(409);
  expect((await w.handle(w.request(root + '/confirmations/key-1')))?.body).toEqual({ status: 'confirmed' });
});

it('harness non accetta versioni o fonti obsolete e non simula API non implementate', async () => {
  const w = await world(), root = '/drafts/' + w.draft.id;
  expect((await w.handle(w.request(root + '/review', { expectedVersion: 0 })))?.status).toBe(409);
  expect((await w.handle(w.request(root + '/confirmations', { expectedVersion: 1, source: null, choices: [] })))?.status).toBe(409);
  expect((await w.handle(w.request(root + '/items', {})))?.status).toBe(422);
  expect(w.draft.state).toBe('open'); expect(w.draft.version).toBe(1);
});
