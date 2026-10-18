import { screen, waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderApp } from '../test/harness';
import { FakeBackend } from '../test/fakeBackend';

it('shows pending work first, exposes every state, and switches the canonical archive on the server', async () => {
  const backend = new FakeBackend();
  const owner = backend.seedAccount('Owner', 'owner@example.test', 'password-owner-001');
  const home = backend.seedHome(owner.id, 'Casa test', 'Via Test 1');
  for (const [name, workflowState] of [['Proposta', 'review'], ['Nuovo', 'to_compile'], ['In corso', 'analyzing'], ['Da verificare', 'attention'], ['Salvato', 'completed']] as const)
    await backend.seedDocument({homeId:home.id,uploaderId:owner.id,name,workflowState});
  const app=renderApp({path:'/accedi',backend});
  await app.user.type(await screen.findByLabelText('Email'),'owner@example.test');
  await app.user.type(screen.getByLabelText('Password'),'password-owner-001');
  await app.user.click(screen.getByRole('button',{name:'Accedi'}));
  await waitFor(()=>expect(app.router.state.location.pathname).not.toBe('/accedi'));
  await app.router.navigate(`/home/${home.id}/documenti`);
  expect(await screen.findByLabelText('Stato: Da rivedere')).toBeVisible();
  expect(screen.getByLabelText('Stato: In analisi')).toBeVisible();
  expect(screen.getByLabelText('Stato: Analisi da verificare')).toBeVisible();
  expect(screen.queryByText('Salvato',{selector:'a'})).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox',{name:/per compilazione AI/})).not.toBeInTheDocument();
  await app.user.click(screen.getByRole('button',{name:'Seleziona documenti'}));
  expect(screen.getAllByRole('checkbox',{name:/per compilazione AI/})).toHaveLength(4);
  const tabs=screen.getByRole('group',{name:'Stato dei documenti'});
  expect(within(tabs).getAllByRole('button')).toHaveLength(2);
  await app.user.click(within(tabs).getByRole('button',{name:'Completati'}));
  expect(await screen.findByText('Salvato',{selector:'a'})).toBeVisible();
  expect(screen.getByLabelText('Stato: Completato')).toBeVisible();
  expect(screen.queryByText('Proposta',{selector:'a'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Seleziona documenti'})).not.toBeInTheDocument();
  expect(backend.log.some(r=>r.method==='GET'&&r.path.includes('workflow=completed'))).toBe(true);
  expect(backend.log.some(r=>r.method==='POST'&&r.path.includes('analysis'))).toBe(false);
});
