import { screen, waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PASSWORD_B, renderApp, seededBackend } from '../test/harness';

it('[mock] Casa mette le azioni prima dei dettagli e aprire il ruolo non scrive dati', async () => {
  const { backend, homeB1 } = seededBackend();
  const app = renderApp({ path: '/accedi', backend });
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), 'b@example.test');
  await app.user.type(screen.getByLabelText('Password'), PASSWORD_B);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await screen.findByRole('heading', { level: 1, name: homeB1.name });
  const actions = screen.getByRole('region', { name: 'Da dove vuoi iniziare?' });
  expect(within(actions).getByRole('link', { name: 'Documenti' })).toHaveAttribute('href', `/home/${homeB1.id}/documenti`);
  expect(within(actions).getByRole('link', { name: 'Registra una spesa' })).toHaveAttribute('href', `/home/${homeB1.id}/spese?nuova-spesa=1`);
  expect(await screen.findByRole('link', { name: 'Apri le condivisioni' })).toHaveAttribute('href', `/home/${homeB1.id}/condivisioni`);
  const summary = screen.getByText('Dettagli della casa e del tuo ruolo');
  const details = summary.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  expect(screen.getByRole('heading', { name: 'Da rivedere' }).compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const writes = () => backend.log.filter(r => r.method === 'POST').length;
  const before = writes();
  await app.user.click(summary);
  await waitFor(() => expect(details).toHaveAttribute('open'));
  expect(screen.getByRole('heading', { name: 'Dati della casa' })).toBeVisible();
  expect(writes()).toBe(before);
  expect(screen.queryByText('Benvenuto su Dimora')).toBeNull();
});
