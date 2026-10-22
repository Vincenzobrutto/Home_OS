// BL-01 — prossimo promemoria dopo il completamento, con backend SIMULATO e orologio del test.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { addMonths } from '../lib/activities';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';

const PW = 'password-owner-001';

function world(today = '2026-10-13') {
  const backend = new FakeBackend();
  backend.activities.today = today;
  const owner = backend.seedAccount('Olga Owner', 'owner@example.test', PW);
  const home = backend.seedHome(owner.id, 'Casa Roma', 'Via Roma 1');
  return { backend, owner, home };
}

async function open(backend: FakeBackend, path: string) {
  const app = renderApp({ path: '/accedi', backend });
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), 'owner@example.test');
  await app.user.type(screen.getByLabelText('Password'), PW);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
  await app.router.navigate(path);
  return app;
}

async function seedActivity(backend: FakeBackend, accountId: string, homeId: string, body: Record<string, unknown>) {
  const res = await backend.activities.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body }, accountId, homeId, 'activities');
  return (res.body as { activity: { id: string; version: number } }).activity;
}

const followUps = (backend: FakeBackend) => backend.log.filter((r) => r.method === 'POST' && /\/follow-up$/.test(r.path));

describe('BL-01 · mesi di calendario', () => {
  it('ultimo giorno del mese se manca, bisestili e cambio anno', () => {
    expect(addMonths('2026-10-13', 6)).toBe('2027-04-13');
    expect(addMonths('2026-10-13', 24)).toBe('2028-10-13');
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonths('2027-08-31', 6)).toBe('2028-02-29');
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
  });
});

describe('[mock] BL-01 · prossimo promemoria', () => {
  it('dopo il completamento propone 6/12/24 mesi dalla data di completamento; crea con conferma esplicita e collega le due attività', async () => {
    const { backend, owner, home } = world();
    const source = await seedActivity(backend, owner.id, home.id, { title: 'Controllo caldaia', description: 'Fumi e libretto', dueDate: '2026-10-10' });
    const app = await open(backend, `/home/${home.id}/attivita/${source.id}`);
    await app.user.click(await screen.findByRole('button', { name: 'Completa' }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma completamento' }));

    const form = await screen.findByRole('form', { name: 'Prossimo promemoria' });
    expect(within(form).getByText(/Calcolato dal giorno del completamento/)).toHaveTextContent('13 ottobre 2026');
    expect(within(form).getByLabelText('Titolo')).toHaveValue('Controllo caldaia');
    expect(within(form).getByLabelText('Descrizione (facoltativa)')).toHaveValue('Fumi e libretto');
    expect(within(form).getByLabelText('Data del prossimo promemoria')).toHaveValue('');
    await app.user.click(within(form).getByRole('button', { name: 'Tra 12 mesi' }));
    expect(within(form).getByRole('button', { name: 'Tra 12 mesi' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(form).getByLabelText('Data del prossimo promemoria')).toHaveValue('2027-10-13');
    await app.user.click(within(form).getByRole('button', { name: 'Tra 6 mesi' }));
    expect(within(form).getByLabelText('Data del prossimo promemoria')).toHaveValue('2027-04-13');
    expect(followUps(backend)).toHaveLength(0);

    await app.user.click(within(form).getByRole('button', { name: 'Crea il prossimo promemoria' }));
    await waitFor(() => expect(followUps(backend)).toHaveLength(1));
    const req = followUps(backend)[0]!;
    expect(req.body).toEqual({ expectedVersion: 2, title: 'Controllo caldaia', description: 'Fumi e libretto', dueDate: '2027-04-13', copyLinks: true });
    expect(req.headers['idempotency-key']).toBeTruthy();

    const summary = await screen.findByRole('region', { name: 'Prossimo promemoria' });
    const link = await within(summary).findByRole('link', { name: 'Controllo caldaia' });
    expect(summary).toHaveTextContent('13 aprile 2027');
    expect(screen.queryByRole('button', { name: 'Proponi il prossimo promemoria' })).not.toBeInTheDocument();
    expect(await screen.findByText('Prossimo promemoria creato')).toBeInTheDocument();

    await app.user.click(link);
    await screen.findByText('Promemoria precedente');
    expect(screen.getByRole('link', { name: 'Controllo caldaia' })).toHaveAttribute('href', `/home/${home.id}/attivita/${source.id}`);
    expect(screen.getByText(/completato il/)).toHaveTextContent('13 ottobre 2026');
  });

  it('«Non ora» non crea nulla; la proposta resta disponibile; data prima del completamento rifiutata senza invio', async () => {
    const { backend, owner, home } = world();
    const source = await seedActivity(backend, owner.id, home.id, { title: 'Pulizia filtri' });
    const app = await open(backend, `/home/${home.id}/attivita/${source.id}`);
    await app.user.click(await screen.findByRole('button', { name: 'Completa' }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma completamento' }));
    await app.user.click(within(await screen.findByRole('form', { name: 'Prossimo promemoria' })).getByRole('button', { name: 'Non ora' }));
    expect(screen.queryByRole('form', { name: 'Prossimo promemoria' })).not.toBeInTheDocument();
    expect(followUps(backend)).toHaveLength(0);
    expect([...backend.activities.items.values()]).toHaveLength(1);

    await app.user.click(screen.getByRole('button', { name: 'Proponi il prossimo promemoria' }));
    const form = await screen.findByRole('form', { name: 'Prossimo promemoria' });
    await app.user.click(within(form).getByRole('button', { name: 'Crea il prossimo promemoria' }));
    expect(within(form).getByText(/Scegli fra 6, 12 o 24 mesi/)).toBeInTheDocument();
    fireEvent.change(within(form).getByLabelText('Data del prossimo promemoria'), { target: { value: '2026-10-01' } });
    await app.user.click(within(form).getByRole('button', { name: 'Crea il prossimo promemoria' }));
    expect(within(form).getByText('La data non può precedere il completamento.')).toBeInTheDocument();
    fireEvent.change(within(form).getByLabelText('Data del prossimo promemoria'), { target: { value: '2027-10-13' } });
    expect(within(form).getByRole('button', { name: 'Tra 12 mesi' })).toHaveAttribute('aria-pressed', 'true');
    await app.user.click(within(form).getByLabelText(/Mantieni i collegamenti/));
    await app.user.click(within(form).getByRole('button', { name: 'Crea il prossimo promemoria' }));
    await waitFor(() => expect(followUps(backend)).toHaveLength(1));
    expect(followUps(backend)[0]!.body).toMatchObject({ dueDate: '2027-10-13', copyLinks: false });
  });

  it('attività aperta: nessuna proposta; dopo la riapertura il successivo già creato resta l’unico', async () => {
    const { backend, owner, home } = world();
    const source = await seedActivity(backend, owner.id, home.id, { title: 'Revisione estintore' });
    const app = await open(backend, `/home/${home.id}/attivita/${source.id}`);
    await screen.findByRole('button', { name: 'Completa' });
    expect(screen.queryByRole('region', { name: 'Prossimo promemoria' })).not.toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Completa' }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma completamento' }));
    const form = await screen.findByRole('form', { name: 'Prossimo promemoria' });
    await app.user.click(within(form).getByRole('button', { name: 'Tra 24 mesi' }));
    await app.user.click(within(form).getByRole('button', { name: 'Crea il prossimo promemoria' }));
    await screen.findByRole('link', { name: 'Revisione estintore' });
    await app.user.click(screen.getByRole('button', { name: 'Riapri attività' }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma riapertura' }));
    await app.user.click(await screen.findByRole('button', { name: 'Completa' }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma completamento' }));
    // Già esiste un successivo: nessuna nuova proposta, solo il collegamento.
    await waitFor(() => expect(screen.getByRole('region', { name: 'Prossimo promemoria' })).toHaveTextContent('Revisione estintore'));
    expect(screen.queryByRole('form', { name: 'Prossimo promemoria' })).not.toBeInTheDocument();
    expect(followUps(backend)).toHaveLength(1);
  });
});
