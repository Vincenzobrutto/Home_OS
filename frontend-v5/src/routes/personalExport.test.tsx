import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';
import { downloads } from '../test/browserStubs';
import { queryKeys } from '../api/queryKeys';

function envelope(homeId: string, accountId: string) { return { format: 'dimora-personal-home-export', formatVersion: 1, generatedAt: '2026-10-16T10:00:00.000Z', scope: { homeId, accountId }, account: { id: accountId }, home: { id: homeId }, data: { documents: [], objects: [], technicalAssets: [], rooms: [], positions: [], activities: [], expenses: [], works: [], links: [], history: [] }, limitations: [] }; }
async function open() {
  const backend = new FakeBackend(), account = backend.seedAccount('Giulia', 'personal-export@example.test', 'password-di-prova-001'), home = backend.seedHome(account.id, 'Casa export', 'Via 1');
  const app = renderApp({ path: '/accedi', backend });
  await screen.findByRole('heading', { name: 'Accedi' }); await app.user.type(screen.getByLabelText('Email'), account.email); await app.user.type(screen.getByLabelText('Password'), 'password-di-prova-001'); await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/)); await app.router.navigate(`/home/${home.id}/documenti`); await screen.findByRole('heading', { name: 'Documenti', level: 1 });
  await app.user.click(screen.getByText('Esporta i miei dati di questa casa'));
  return { app, backend, account, home };
}
describe('[mock] personal export UI', () => {
  it('no automatic export; one explicit JSON download, separate from originals ZIP', async () => {
    const { app, home, account } = await open(); let calls = 0;
    const original = app.api.callJson.bind(app.api); app.api.callJson = async <T,>(path: string, opts: Parameters<typeof app.api.callJson>[1]) => { if (path.endsWith('/personal-export')) { calls++; return envelope(home.id, account.id) as T; } return original<T>(path, opts); };
    expect(calls).toBe(0); expect(screen.getByText(/Gli originali dei documenti si scaricano separatamente/)).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Scarica i miei dati (JSON)' })); await screen.findByText('File pronto per il download'); expect(calls).toBe(1); expect(downloads).toHaveLength(1); expect(downloads[0]?.filename).toBe(`dimora-casa-${home.id}-dati.json`);
  });
  it('pending response after leaving Home never saves private data or repopulates cache', async () => {
    const { app, home, account } = await open(); let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const original = app.api.callJson.bind(app.api); app.api.callJson = async <T,>(path: string, opts: Parameters<typeof app.api.callJson>[1]) => { if (path.endsWith('/personal-export')) { await gate; return envelope(home.id, account.id) as T; } return original<T>(path, opts); };
    await app.user.click(screen.getByRole('button', { name: 'Scarica i miei dati (JSON)' })); expect(screen.getByRole('button', { name: 'Preparazione dei dati…' })).toBeDisabled();
    await app.router.navigate('/case'); await waitFor(() => expect(screen.queryByRole('heading', { name: 'Documenti', level: 1 })).not.toBeInTheDocument()); release(); await waitFor(() => expect(app.queryClient.isMutating()).toBe(0)); expect(downloads).toHaveLength(0);
    expect(JSON.stringify(app.queryClient.getQueryData(queryKeys.session))).not.toContain('dimora-personal-home-export');
  });
});
