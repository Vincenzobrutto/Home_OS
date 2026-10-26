import { screen, waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';

async function fixture() {
  const backend = new FakeBackend(); backend.economy.enabled = true;
  const password = 'password-owner-001';
  const owner = backend.seedAccount('Proprietario Demo', 'readability@example.test', password);
  const home = backend.seedHome(owner.id, 'Casa dimostrativa', 'Via Demo 1');
  const body = { title: 'Bolletta', category: 'electricity', supplier: 'Fornitore Demo S.p.A.', amountCents: 9240, spentOn: '2026-10-12', invoiceMonth: '2026-09', documentDate: '2026-10-12', competenceFrom: '2026-08-01', competenceTo: '2026-08-31', dueOn: '2026-11-02' };
  const seed = await backend.economy.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body }, owner.id, home.id, 'expenses');
  expect(seed.status).toBe(201);
  const app = renderApp({ backend, path: '/accedi' });
  await app.user.type(await screen.findByLabelText('Email'), owner.email);
  await app.user.type(screen.getByLabelText('Password'), password);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
  const start = backend.log.length;
  await app.router.navigate(`/home/${home.id}/spese?vista=elenco`);
  await screen.findByRole('link', { name: 'Bolletta Fornitore Demo · settembre 2026' });
  return { app, backend, home, start };
}

it('elenco e dettaglio distinguono mese fattura, servizi e date senza scrivere o cambiare importi', async () => {
  const { app, backend, start } = await fixture();
  const row = screen.getByRole('link', { name: 'Bolletta Fornitore Demo · settembre 2026' }).closest('li')!;
  expect(row).toHaveTextContent('92,40 €');
  expect(row).toHaveTextContent('Mese fattura: settembre 2026');
  expect(row).toHaveTextContent(/Emissione:.*12 ottobre 2026/);
  expect(row).toHaveTextContent(/Scadenza:.*2 novembre 2026/);
  expect(row).not.toHaveTextContent(/pagata|scaduta/i);
  expect(screen.getByRole('img', { name: /Grafico ad anello/ })).toBeInTheDocument();
  await app.user.click(within(row).getByRole('link'));
  await screen.findByRole('heading', { name: 'Bolletta Fornitore Demo · settembre 2026' });
  const details = screen.getByRole('region', { name: 'Dettagli' });
  expect(within(details).getByText('Descrizione originale').nextSibling).toHaveTextContent('Bolletta');
  const summary = screen.getByRole('region', { name: 'Riepilogo della spesa' });
  expect(summary).toHaveTextContent('agosto 2026');
  expect(summary).toHaveTextContent('settembre 2026');
  expect(screen.getByText('Registrazione attiva')).toBeVisible();
  expect(backend.log.slice(start).filter(r => r.method !== 'GET')).toEqual([]);
});

it('tipo visibile e filtri avanzati espliciti aggiornano elenco e grafico preservando la ricerca privata', async () => {
  const { app, backend, start } = await fixture();
  const type = screen.getByRole('combobox', { name: 'Gruppo di spesa' });
  expect(type.closest('details')).toBeNull();
  await app.user.selectOptions(type, 'utilities');
  expect(app.router.state.location.search).toContain('famiglia=utilities');
  const search = screen.getByRole('searchbox', { name: 'Cerca in descrizione o fornitore' });
  await app.user.type(search, 'Fornitore Demo'); await app.user.click(screen.getByRole('button', { name: /^Cerca$/ }));
  expect(app.router.state.location.search).not.toContain('Demo');
  await app.user.click(screen.getByText(/^Filtri(?: · \d+ attiv[oi])?$/));
  await app.user.selectOptions(screen.getByRole('combobox', { name: /^Categoria$/ }), 'gas');
  expect(app.router.state.location.search).not.toContain('categoria=gas');
  await app.user.click(screen.getByRole('button', { name: 'Applica filtri' }));
  await screen.findByText('Nessun costo registrato nel periodo con questi filtri.');
  expect(app.router.state.location.search).toContain('categoria=gas');
  expect(screen.queryByRole('link', { name: /Bolletta Fornitore/ })).not.toBeInTheDocument();
  expect(backend.log.slice(start).filter(r => r.method !== 'GET')).toEqual([]);
});
