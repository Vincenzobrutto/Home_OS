// Cestino lotto 2: azioni documento, avviso Annulla, pagina e link discreto. Backend simulato in memoria.
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';
import { daysLeft, impactLines, purgeLabel } from './trash';

const PW = { owner: 'password-owner-001', member: 'password-member-01' };
function world() {
  const backend = new FakeBackend();
  const owner = backend.seedAccount('Olga Owner', 'owner@example.test', PW.owner);
  const member = backend.seedAccount('Mario Member', 'member@example.test', PW.member);
  const home = backend.seedHome(owner.id, 'Casa Roma', 'Via Roma 1');
  backend.addMember(member.id, home.id, 'member');
  return { backend, owner, member, home };
}
async function open(backend: FakeBackend, email: string, password: string, path: string) {
  const app = renderApp({ path: '/accedi', backend });
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), email);
  await app.user.type(screen.getByLabelText('Password'), password);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
  await app.router.navigate(path);
  return app;
}
const trashWrites = (backend: FakeBackend) => backend.log.filter(r => r.method === 'POST' && /\/trash/.test(r.path)).map(r => r.path.replace(/^\/homes\/[^/]+/, ''));
async function moveFromList(app: Awaited<ReturnType<typeof open>>, name: string) {
  const row = (await screen.findByRole('link', { name }, { timeout: 10000 })).closest('li') ?? document.body;
  await app.user.click(within(row as HTMLElement).getByText('Altre azioni', { exact: true }));
  await app.user.click(within(row as HTMLElement).getByRole('button', { name: 'Elimina' }));
}

describe('Cestino dei documenti', () => {
  it('preview explains sources, shares and the AI copy, then moves with version and key', async () => {
    const w = world();
    const doc = await w.backend.seedDocument({ homeId: w.home.id, uploaderId: w.owner.id, name: 'Fattura caldaia', visibility: 'home', aiAnalysisSucceeded: true });
    w.backend.trashImpact.set(doc.id, { expenses: 1, objects: 2, contacts: 0, historyEvents: 1, activeShares: 1 });
    const app = await open(w.backend, 'owner@example.test', PW.owner, `/home/${w.home.id}/documenti?workflow=all`);
    await moveFromList(app, 'Fattura caldaia');
    const dialog = await screen.findByRole('dialog', {}, { timeout: 10000 });
    await within(dialog).findByText(/È fonte di 1 spesa, 2 oggetti, 1 evento della storia\. Restano salvati/);
    expect(within(dialog).getByText(/1 condivisione attiva verrà revocata subito/)).toBeInTheDocument();
    expect(within(dialog).getByText(/politica di conservazione di Anthropic/)).toBeInTheDocument();
    await app.user.click(within(dialog).getByRole('button', { name: 'Sposta nel cestino' }));
    await screen.findByText('«Fattura caldaia» spostato nel cestino.', {}, { timeout: 10000 });
    const move = w.backend.log.find(r => r.method === 'POST' && r.path.endsWith('/documents/' + doc.id + '/trash'))!;
    expect(move.body).toEqual({ expectedVersion: 1 });
    expect(move.headers['idempotency-key']).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Fattura caldaia' })).not.toBeInTheDocument());
    expect(await screen.findByRole('link', { name: 'Cestino (1)' })).toBeInTheDocument();
    app.unmount();
  });

  it('Annulla restores with the version returned by the move and brings the row back', async () => {
    const w = world();
    const doc = await w.backend.seedDocument({ homeId: w.home.id, uploaderId: w.owner.id, name: 'Garanzia forno' });
    const app = await open(w.backend, 'owner@example.test', PW.owner, `/home/${w.home.id}/documenti?workflow=all`);
    await moveFromList(app, 'Garanzia forno');
    await app.user.click(await within(await screen.findByRole('dialog', {}, { timeout: 10000 })).findByRole('button', { name: 'Sposta nel cestino' }));
    const notice = (await screen.findByText('«Garanzia forno» spostato nel cestino.')).closest('[role="status"]') as HTMLElement;
    expect(within(notice).getByRole('link', { name: 'Vai al cestino' })).toHaveAttribute('href', `/home/${w.home.id}/cestino`);
    await app.user.click(within(notice).getByRole('button', { name: 'Annulla' }));
    await screen.findByText('«Garanzia forno» è stato ripristinato.');
    await screen.findByRole('link', { name: 'Garanzia forno' });
    const restore = w.backend.log.find(r => r.path.endsWith('/trash/documents/' + doc.id + '/restore'))!;
    expect(restore.body).toEqual({ expectedVersion: 2 });
    expect(screen.queryByRole('link', { name: /^Cestino/ })).not.toBeInTheDocument();
    app.unmount();
  });

  it('the notice stays until closed and disappears when the page changes', async () => {
    const w = world();
    await w.backend.seedDocument({ homeId: w.home.id, uploaderId: w.owner.id, name: 'Bolletta luce' });
    const app = await open(w.backend, 'owner@example.test', PW.owner, `/home/${w.home.id}/documenti?workflow=all`);
    await moveFromList(app, 'Bolletta luce');
    await app.user.click(await within(await screen.findByRole('dialog', {}, { timeout: 10000 })).findByRole('button', { name: 'Sposta nel cestino' }));
    await screen.findByText('«Bolletta luce» spostato nel cestino.', {}, { timeout: 10000 });
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByText('«Bolletta luce» spostato nel cestino.')).toBeInTheDocument();
    await app.router.navigate(`/home/${w.home.id}/casa`);
    await waitFor(() => expect(screen.queryByText('«Bolletta luce» spostato nel cestino.')).not.toBeInTheDocument());
    app.unmount();
  });

  it('a refused preview shows the reason and keeps the move disabled', async () => {
    const w = world();
    const doc = await w.backend.seedDocument({ homeId: w.home.id, uploaderId: w.owner.id, name: 'Planimetria' });
    w.backend.trashBlocked.set(doc.id, 'Il documento è in analisi. Attendi che l’analisi finisca, poi riprova.');
    const app = await open(w.backend, 'owner@example.test', PW.owner, `/home/${w.home.id}/documenti?workflow=all`);
    await moveFromList(app, 'Planimetria');
    const dialog = await screen.findByRole('dialog', {}, { timeout: 10000 });
    await within(dialog).findByText('Il documento è in analisi. Attendi che l’analisi finisca, poi riprova.');
    expect(within(dialog).getByRole('button', { name: 'Sposta nel cestino' })).toBeDisabled();
    expect(trashWrites(w.backend)).toEqual([]);
    app.unmount();
  });

  it('trash page: restore, delete now with confirmation, empty, and days left', async () => {
    const w = world();
    const docs = await Promise.all(['Uno', 'Due', 'Tre'].map(name => w.backend.seedDocument({ homeId: w.home.id, uploaderId: w.owner.id, name })));
    for (const d of docs) { const stored = w.backend.documents.get(d.id)!; stored.trashedAt = '2026-10-20T10:00:00.000Z'; stored.purgeAfter = '2026-11-19T10:00:00.000Z'; stored.lifecycleVersion = 2; }
    const app = await open(w.backend, 'owner@example.test', PW.owner, `/home/${w.home.id}/cestino`);
    const list = await screen.findByRole('list', { name: 'Elementi nel cestino' }, { timeout: 10000 });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getAllByText(/Eliminazione definitiva tra \d+ giorni/)).toHaveLength(3);
    await app.user.click(screen.getByRole('button', { name: 'Ripristina Uno' }));
    await screen.findByText('«Uno» è stato ripristinato.');
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Elementi nel cestino' })).getAllByRole('listitem')).toHaveLength(2));
    await app.user.click(screen.getByRole('button', { name: 'Elimina subito Due' }));
    const confirm = await screen.findByRole('dialog', {}, { timeout: 10000 });
    expect(within(confirm).getByText(/Non si può annullare/)).toBeInTheDocument();
    await app.user.click(within(confirm).getByRole('button', { name: 'Annulla' }));
    expect(trashWrites(w.backend).some(p => p.endsWith('/purge'))).toBe(false);
    await app.user.click(screen.getByRole('button', { name: 'Elimina subito Due' }));
    await app.user.click(within(await screen.findByRole('dialog', {}, { timeout: 10000 })).getByRole('button', { name: 'Elimina definitivamente' }));
    await screen.findByText('«Due» eliminato definitivamente.');
    await app.user.click(await screen.findByRole('button', { name: 'Svuota cestino' }));
    await app.user.click(within(await screen.findByRole('dialog', {}, { timeout: 10000 })).getByRole('button', { name: 'Svuota cestino' }));
    await screen.findByText('Il cestino è vuoto.');
    expect(trashWrites(w.backend)).toEqual([`/trash/documents/${docs[0]!.id}/restore`, `/trash/documents/${docs[1]!.id}/purge`, '/trash/empty']);
    app.unmount();
  });

  it('another member never sees my trash, and the link stays hidden when empty', async () => {
    const w = world();
    const doc = await w.backend.seedDocument({ homeId: w.home.id, uploaderId: w.owner.id, name: 'Contratto', visibility: 'home' });
    const stored = w.backend.documents.get(doc.id)!; stored.trashedAt = '2026-10-22T10:00:00.000Z'; stored.purgeAfter = '2026-11-21T10:00:00.000Z'; stored.lifecycleVersion = 2;
    const app = await open(w.backend, 'member@example.test', PW.member, `/home/${w.home.id}/cestino`);
    await screen.findByText('Il cestino è vuoto.');
    expect(screen.queryByRole('link', { name: /^Cestino/ })).not.toBeInTheDocument();
    await app.router.navigate(`/home/${w.home.id}/documenti?workflow=all`);
    await screen.findByRole('heading', { level: 1, name: 'Documenti' });
    expect(screen.queryByRole('link', { name: 'Contratto' })).not.toBeInTheDocument();
    app.unmount();
  });

  it('a stale version shows the server message and reloads the trash', async () => {
    const w = world();
    const doc = await w.backend.seedDocument({ homeId: w.home.id, uploaderId: w.owner.id, name: 'Rogito' });
    const stored = w.backend.documents.get(doc.id)!; stored.trashedAt = '2026-10-22T10:00:00.000Z'; stored.purgeAfter = '2026-11-21T10:00:00.000Z'; stored.lifecycleVersion = 2;
    const app = await open(w.backend, 'owner@example.test', PW.owner, `/home/${w.home.id}/cestino`);
    await screen.findByRole('button', { name: 'Ripristina Rogito' });
    stored.lifecycleVersion = 3;
    await app.user.click(screen.getByRole('button', { name: 'Ripristina Rogito' }));
    await screen.findByText('Il cestino è cambiato. Ricarica la pagina.');
    await app.user.click(await screen.findByRole('button', { name: 'Ripristina Rogito' }));
    await screen.findByText('«Rogito» è stato ripristinato.');
    app.unmount();
  });
});

describe('Cestino: testi', () => {
  it('counts whole days and never goes negative', () => {
    const now = Date.parse('2026-10-23T10:00:00Z');
    expect(daysLeft('2026-11-22T10:00:00Z', now)).toBe(30);
    expect(daysLeft('2026-10-23T11:00:00Z', now)).toBe(1);
    expect(daysLeft('2026-10-01T10:00:00Z', now)).toBe(0);
    expect(purgeLabel('2026-10-24T10:00:00Z', now)).toBe('Eliminazione definitiva tra 1 giorno');
  });
  it('omits empty impact sentences', () => {
    expect(impactLines({ expenses: 0, objects: 0, contacts: 0, historyEvents: 0, activeShares: 0 })).toEqual({ sources: null, shares: null });
    expect(impactLines({ expenses: 2, objects: 1, contacts: 1, historyEvents: 0, activeShares: 2 }).shares).toBe('2 condivisioni attive verranno revocate subito. Le copie già scaricate non si possono richiamare.');
  });
});
