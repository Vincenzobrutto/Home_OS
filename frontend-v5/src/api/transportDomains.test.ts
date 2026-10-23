import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from './client';

describe('[mock] domain façade shares one transport', () => {
  it('reuses one CSRF token across homes, rooms, generic writes and binary export, then refreshes after logout', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    let sessions = 0;
    const fetch: FetchLike = async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/session')) return Response.json({ account: { id: 'account-synthetic' }, csrfToken: 'csrf-' + ++sessions });
      if (url.endsWith('/export')) return new Response('synthetic zip', { headers: { 'Content-Type': 'application/zip' } });
      if (url.endsWith('/rooms')) return Response.json({ room: { id: 'room-synthetic', version: 1 } });
      if (url.endsWith('/homes')) return Response.json({ home: { id: 'home-synthetic' } });
      return new Response(null, { status: 204 });
    };
    const api = new ApiClient({ fetch });
    await api.createHome({ name: 'Synthetic', address: 'Via Test' }, 'home-key', 'account-synthetic');
    await api.createRoom('home-synthetic', { name: 'Synthetic room', type: 'other' }, 'room-key', 'account-synthetic');
    await api.callJson('/generic', { method: 'POST', body: {}, idempotencyKey: 'generic-key', accountId: 'account-synthetic' });
    await api.exportDocuments('home-synthetic', ['document-synthetic'], 'account-synthetic');
    expect(sessions).toBe(1);
    for (const call of calls.filter(c => c.init.method === 'POST')) {
      expect(call.init.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-1', 'X-Account-Context': 'account-synthetic' });
      expect(call.init.credentials).toBe('include');
      expect(call.init.cache).toBe('no-store');
    }
    expect(calls.find(c => c.url.endsWith('/rooms'))!.init.headers).toMatchObject({ 'Idempotency-Key': 'room-key' });
    await api.logout();
    expect(api.currentCsrfToken).toBe(null);
    await api.createRoom('home-synthetic', { name: 'Another room', type: 'other' }, 'next-key', 'account-synthetic');
    expect(sessions).toBe(2);
    expect(calls.at(-1)!.init.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-2' });
  });

  it('separate clients keep separate tokens and preserve captured account and abort signal across domains', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const make = (token: string) => new ApiClient({ fetch: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/session')) return Response.json({ account: null, csrfToken: token });
      return Response.json({ error: { code: 'account_context_changed', message: 'Synthetic rejection' } }, { status: 401 });
    } });
    const a = make('token-a'), b = make('token-b');
    await a.getSession(); await b.getSession();
    const controller = new AbortController();
    await expect(a.getRoom('home-a', 'room-a', controller.signal, 'account-a')).rejects.toMatchObject({ status: 401, code: 'account_context_changed' });
    expect(calls.at(-1)!.init.signal).toBe(controller.signal);
    expect(calls.at(-1)!.init.headers).toMatchObject({ 'X-Account-Context': 'account-a' });
    await expect(b.callJson('/generic', { method: 'POST', body: {}, accountId: 'account-b' })).rejects.toMatchObject({ status: 401 });
    expect(calls.at(-1)!.init.headers).toMatchObject({ 'X-CSRF-Token': 'token-b', 'X-Account-Context': 'account-b' });
    expect(a.currentCsrfToken).toBe('token-a');
  });
});
