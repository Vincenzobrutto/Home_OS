import { describe, expect, it } from 'vitest';
import { ApiClient } from '../api/client';
import { FakeBackend } from '../test/fakeBackend';
import { createFakeFetch } from '../test/harness';
import { backToCatalog, catalogFiltersFromParams, catalogFiltersToParams, validateName, validateQuery } from './objects';

const ROOM = '11111111-2222-4333-8444-555555555555';

describe('regole G1 (unitarie, senza rete)', () => {
  it('filtri catalogo dall’indirizzo: validati, ambiente vince su «da collocare», mai entrambi', () => {
    expect(catalogFiltersFromParams(new URLSearchParams(`q=%20Forno%20&tipo=boiler&ambiente=${ROOM}&collocazione=da-collocare&stato=all`))).toEqual({
      state: 'all',
      q: 'Forno',
      type: 'boiler',
      roomId: ROOM,
      placement: 'all',
    });
    expect(catalogFiltersFromParams(new URLSearchParams('tipo=razzo&ambiente=non-uuid&collocazione=da-collocare'))).toEqual({
      state: 'active',
      q: '',
      type: null,
      roomId: null,
      placement: 'unplaced',
    });
    expect(catalogFiltersToParams({ state: 'active', q: '', type: null, roomId: ROOM, placement: 'unplaced' }).toString()).toBe(`ambiente=${ROOM}`);
  });

  it('ritorno al catalogo solo per lo stesso account; nomi e ricerca nei limiti in code point', () => {
    const state = { objectsSearch: 'q=forno&nota=segreta', objectsAccountId: 'acc-a' };
    expect(backToCatalog('h1', state, 'acc-a')).toBe('/home/h1/oggetti?q=forno');
    expect(backToCatalog('h1', state, 'acc-b')).toBe('/home/h1/oggetti');
    expect(validateName('  ', 80)).toMatch(/nome/);
    expect(validateName('é'.repeat(80), 80)).toBeUndefined();
    expect(validateName('🔥'.repeat(81), 80)).toMatch(/80/);
    expect(validateQuery('x'.repeat(81))).toMatch(/80/);
  });
});

describe('[mock] ApiClient — home-objects-v1', () => {
  it('trasporto comune: contesto account, no-store, Idempotency-Key; filtri catalogo solo se attivi', async () => {
    const backend = new FakeBackend();
    const account = backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
    const home = backend.seedHome(account.id, 'Casa', 'Via 1');
    const ctl = createFakeFetch(backend);
    const api = new ApiClient({ fetch: ctl.fetch });
    await api.login({ email: 'a@example.test', password: 'password-lunga-1' });
    await api.getSession();
    const room = await api.createRoom(home.id, { name: 'Bagno', type: 'bathroom' }, 'chiave-stanza-00001', account.id);
    const create = ctl.calls.at(-1)!;
    expect(new Headers(create.init.headers).get('idempotency-key')).toBe('chiave-stanza-00001');
    expect(new Headers(create.init.headers).get('x-account-context')).toBe(account.id);
    expect(create.init.cache).toBe('no-store');
    await api.listObjects(home.id, { state: 'active', q: '', type: null, roomId: null, placement: 'all' }, { limit: 20 }, undefined, account.id);
    expect(ctl.calls.at(-1)!.url).toBe(`/api/v5/homes/${home.id}/objects?limit=20`);
    await api.listObjects(home.id, { state: 'all', q: 'forno', type: 'boiler', roomId: room.id, placement: 'unplaced' }, {}, undefined, account.id);
    expect(ctl.calls.at(-1)!.url).toBe(`/api/v5/homes/${home.id}/objects?state=all&roomId=${room.id}&q=forno&type=boiler`);
    const obj = await api.createObject(home.id, { name: 'Forno', type: 'appliance', roomIds: [room.id] }, 'chiave-oggetto-0001', account.id);
    expect(obj.position).toMatchObject({ version: 1 });
    const again = await api.createObject(home.id, { name: 'Forno', type: 'appliance', roomIds: [room.id] }, 'chiave-oggetto-0001', account.id);
    expect(again.ref.id).toBe(obj.ref.id);
    await expect(api.createObject(home.id, { name: 'Altro', type: 'appliance' }, 'chiave-oggetto-0001', account.id)).rejects.toMatchObject({ status: 409, code: 'idempotency_conflict' });
    const links = await api.listObjectLinks(home.id, obj.ref, 'document', { limit: 5 }, undefined, account.id);
    expect(links.items).toEqual([]);
    expect(ctl.calls.at(-1)!.url).toBe(`/api/v5/homes/${home.id}/objects/object/${obj.ref.id}/links?resourceType=document&limit=5`);
  });
});
