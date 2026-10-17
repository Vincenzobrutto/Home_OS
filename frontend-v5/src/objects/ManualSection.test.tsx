import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManualSection } from './ManualSection';
import type { CatalogItem, ObjectManual } from '../api/types';
import { serviceError } from '../api/errors';

const mocks = vi.hoisted(() => ({ callJson: vi.fn(), account: { id: 'account-A' } }));
vi.mock('../session/session', () => ({ useApi: () => ({ callJson: mocks.callJson }), useAccount: () => mocks.account }));
const object: CatalogItem = { ref: { kind: 'object', id: 'object-A' }, name: 'Friggitrice', type: 'appliance', kindLabel: 'Oggetto personale', state: 'active', permissions: ['read', 'edit'], version: 1, position: { version: 0, rooms: [] }, technicalLink: null };
const manual: ObjectManual = { url: 'https://manufacturer.example/manual.pdf', kind: 'manual', brand: 'Lume', reference: 'M1', origin: 'manufacturer_page', sourceUrl: 'https://manufacturer.example/product', checkedAt: '2026-10-17T08:00:00Z', boundVersion: 1 };
function setup(item = object, canEdit = true) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={cache}><ManualSection homeId="home-A" object={item} canEdit={canEdit} /></QueryClientProvider>);
  return userEvent.setup();
}
async function fields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Marca'), 'Lume');
  await user.type(screen.getByLabelText('Riferimento del modello'), 'M1');
}
beforeEach(() => mocks.callJson.mockReset());
describe('Manuale nella scheda, nessun lookup o salvataggio implicito', () => {
  it('apertura scheda non contatta il produttore; viewer/archiviato consultano senza modificare', () => {
    setup({ ...object, manual, state: 'archived' }, false);
    expect(screen.getByRole('link', { name: /Apri manuale sul sito del produttore/ })).toHaveAttribute('href', manual.url);
    expect(screen.getByRole('link', { name: /Apri manuale/ })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('button', { name: 'Modifica manuale' })).not.toBeInTheDocument();
    expect(mocks.callJson).not.toHaveBeenCalled();
  });
  it('proposta non salva: collega solo dopo conferma esplicita', async () => {
    const user = setup(); mocks.callJson.mockResolvedValueOnce({ candidate: { manual, token: 'signed-token' }, reason: null }).mockResolvedValueOnce({ object: { ...object, manual } });
    await user.click(screen.getByRole('button', { name: 'Trova o aggiungi manuale' })); await fields(user);
    await user.click(screen.getByRole('button', { name: 'Cerca manuale ufficiale' }));
    await screen.findByText(/Manuale trovato/); expect(mocks.callJson).toHaveBeenCalledTimes(1);
    expect(mocks.callJson.mock.calls[0]![1].body).toEqual({ brand: 'Lume', reference: 'M1' });
    await user.click(screen.getByRole('button', { name: 'Collega questo manuale' }));
    await waitFor(() => expect(mocks.callJson).toHaveBeenCalledTimes(2));
    expect(mocks.callJson.mock.calls[1]![1].body).toEqual({ expectedVersion: 1, selection: { mode: 'candidate', token: 'signed-token' } });
  });
  it('modificare il riferimento invalida il candidato; nessun manuale inventato', async () => {
    const user = setup(); mocks.callJson.mockResolvedValue({ candidate: { manual, token: 'signed-token' }, reason: null });
    await user.click(screen.getByRole('button', { name: 'Trova o aggiungi manuale' })); await fields(user);
    await user.click(screen.getByRole('button', { name: 'Cerca manuale ufficiale' })); await screen.findByText(/Manuale trovato/);
    await user.type(screen.getByLabelText('Riferimento del modello'), 'X');
    expect(screen.queryByRole('button', { name: 'Collega questo manuale' })).not.toBeInTheDocument();
  });
  it('assenza manuale permette link manuale; nessuna falsa verifica ufficiale nel body', async () => {
    const user = setup(); mocks.callJson.mockResolvedValueOnce({ candidate: null, reason: 'product_page_needed' }).mockResolvedValueOnce({ object });
    await user.click(screen.getByRole('button', { name: 'Trova o aggiungi manuale' })); await fields(user);
    await user.click(screen.getByRole('button', { name: 'Cerca manuale ufficiale' })); await screen.findByText(/Indica la pagina prodotto ufficiale/);
    await user.click(screen.getByText('Aggiungi un collegamento manualmente'));
    await user.type(screen.getByLabelText('Link HTTPS al manuale o al supporto'), manual.url);
    await user.click(screen.getByRole('button', { name: 'Salva collegamento' }));
    await waitFor(() => expect(mocks.callJson).toHaveBeenCalledTimes(2));
    expect(mocks.callJson.mock.calls[1]![1].body.selection).toEqual({ mode: 'manual', url: manual.url, brand: 'Lume', reference: 'M1', kind: 'manual' });
  });
  it('risposta persa blocca modifiche e verifica con stesso body e stessa chiave', async () => {
    const user = setup({ ...object, manual }); mocks.callJson.mockRejectedValueOnce(serviceError(503)).mockResolvedValueOnce({ object: { ...object, manual: null } });
    await user.click(screen.getByRole('button', { name: 'Modifica manuale' }));
    await user.click(screen.getByRole('button', { name: 'Rimuovi collegamento' }));
    await screen.findByRole('button', { name: 'Verifica salvataggio' });
    expect(screen.getByLabelText('Marca')).toBeDisabled();
    const first = mocks.callJson.mock.calls[0]![1];
    await user.click(screen.getByRole('button', { name: 'Verifica salvataggio' }));
    await waitFor(() => expect(mocks.callJson).toHaveBeenCalledTimes(2));
    expect(mocks.callJson.mock.calls[1]![1]).toEqual(first);
  });
  it('pagina assistenza ha etichetta distinta, scheda cambiata richiede controllo', () => {
    setup({ ...object, manual: { ...manual, kind: 'support', needsReview: true } });
    expect(screen.getByRole('link', { name: /Istruzioni e assistenza/ })).toBeInTheDocument();
    expect(screen.getByText(/La scheda è cambiata/)).toBeInTheDocument();
  });
  it('link aggiunto manualmente non dichiara una verifica del produttore', () => {
    setup({ ...object, manual: { ...manual, origin: 'user_provided', checkedAt: null, sourceUrl: null } });
    expect(screen.getByRole('link', { name: /Apri manuale online/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Apri manuale sul sito del produttore/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Collegamento aggiunto da te/)).toBeInTheDocument();
  });
});
