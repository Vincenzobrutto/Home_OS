import { configure, act, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderApp } from '../test/harness';
import { FakeBackend } from '../test/fakeBackend';

it('shows the archive, excludes saved documents from AI selection, and stages state filters', async () => {
  configure({asyncUtilTimeout:5000});
  const backend = new FakeBackend();
  const owner = backend.seedAccount('Owner', 'owner@example.test', 'password-owner-001');
  const home = backend.seedHome(owner.id, 'Casa test', 'Via Test 1');
  for (const [name, workflowState] of [['Proposta', 'review'], ['Nuovo', 'to_compile'], ['In corso', 'analyzing'], ['Da verificare', 'attention'], ['Salvato', 'completed']] as const)
    await backend.seedDocument({homeId:home.id,uploaderId:owner.id,name,workflowState});
  const app=renderApp({path:'/accedi',backend});
  await app.user.type(await screen.findByLabelText('Email'),'owner@example.test');
  await app.user.type(screen.getByLabelText('Password'),'password-owner-001');
  await app.user.click(screen.getByRole('button',{name:'Accedi'}));
  await waitFor(()=>expect(app.router.state.location.pathname).toBe(`/home/${home.id}/casa`));
  await app.router.navigate(`/home/${home.id}/documenti`);
  expect(await screen.findByLabelText('Stato: Da rivedere')).toBeVisible();
  expect(screen.getByLabelText('Stato: In analisi')).toBeVisible();
  expect(screen.getByLabelText('Stato: Analisi da controllare')).toBeVisible();
  expect(screen.getByText('Salvato',{selector:'a'})).toBeVisible();
  expect(screen.queryByRole('checkbox',{name:/per compilazione AI/})).not.toBeInTheDocument();
  await app.user.click(screen.getByRole('button',{name:'Seleziona per compilare con l’AI'}));
  expect(screen.getAllByRole('checkbox',{name:/per compilazione AI/})).toHaveLength(3);
  await app.user.click(screen.getByRole('button',{name:/^Filtri/}));
  await app.user.selectOptions(screen.getByRole('combobox',{name:'Stato'}),'completed');
  await app.user.click(screen.getByRole('button',{name:'Mostra risultati'}));
  expect(await screen.findByText('Salvato',{selector:'a'})).toBeVisible();
  expect(screen.getByLabelText('Stato: Completato')).toBeVisible();
  expect(screen.queryByText('Proposta',{selector:'a'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Seleziona per compilare con l’AI'})).not.toBeInTheDocument();
  expect(backend.log.some(r=>r.method==='GET'&&r.path.includes('workflow=completed'))).toBe(true);
  await act(async()=>{await app.router.navigate(`/home/${home.id}/documenti?workflow=completed&q=Salvato`);});
  await screen.findByText('Salvato',{selector:'a'});
  await waitFor(()=>expect(app.queryClient.isFetching()).toBe(0));
  await app.user.click(await screen.findByRole('button',{name:'Vedi dettagli'}));
  await screen.findByRole('heading',{name:'Salvato',level:1});
  const back=screen.getByRole('link',{name:/Documenti di Casa test/});
  expect(back.getAttribute('href')).toContain('workflow=completed&q=Salvato');
  await app.user.click(back);
  await screen.findByText('Salvato',{selector:'a'});
  expect(screen.getByRole('button',{name:'Rimuovi filtro Stato: Completati'})).toBeVisible();
  expect(backend.log.some(r=>r.method==='POST'&&r.path.includes('analysis'))).toBe(false);
},15000);

it('keeps an explicit All scope without a query and aligns it with the list',async()=>{
  const backend=new FakeBackend();
  const owner=backend.seedAccount('Owner','scope@example.test','password-owner-001');
  const home=backend.seedHome(owner.id,'Casa ambiti','Via Test');
  await backend.seedDocument({homeId:home.id,uploaderId:owner.id,name:'Da compilare',workflowState:'to_compile'});
  await backend.seedDocument({homeId:home.id,uploaderId:owner.id,name:'Già salvato',workflowState:'completed'});
  const app=renderApp({path:'/accedi',backend});
  await app.user.type(await screen.findByLabelText('Email'),owner.email);
  await app.user.type(screen.getByLabelText('Password'),'password-owner-001');
  await app.user.click(screen.getByRole('button',{name:'Accedi'}));
  await waitFor(()=>expect(app.router.state.location.pathname).toBe(`/home/${home.id}/casa`));
  await app.router.navigate('/home/'+home.id+'/documenti');
  expect(await screen.findByText('Da compilare',{selector:'a'})).toBeVisible();
  expect(await screen.findByText('Già salvato',{selector:'a'})).toBeVisible();
  expect(screen.queryByRole('group',{name:'Stato dei documenti'})).not.toBeInTheDocument();
  await app.user.click(screen.getByRole('button',{name:'Seleziona per compilare con l’AI'}));
  expect(screen.getAllByRole('checkbox',{name:/per compilazione AI/})).toHaveLength(1);
  expect(screen.queryByRole('checkbox',{name:'Seleziona «Già salvato.pdf» per compilazione AI'})).not.toBeInTheDocument();
  await app.user.click(screen.getByRole('checkbox',{name:'Seleziona tutti i documenti da completare mostrati'}));
  expect(await screen.findByRole('heading',{name:'1 documento selezionato'})).toBeVisible();
  expect(screen.getByRole('checkbox',{name:'Seleziona «Da compilare» per compilazione AI'})).toBeChecked();
  // A document completed elsewhere must disappear from a new AI selection on refresh.
  const pending=[...backend.documents.values()].find(d=>d.name==='Da compilare')!;
  pending.workflowState='completed';
  await act(async()=>{await app.queryClient.invalidateQueries();});
  await waitFor(()=>expect(screen.queryByRole('checkbox',{name:/per compilazione AI/})).not.toBeInTheDocument());
  expect(screen.queryByRole('button',{name:'Compila selezionati tramite AI'})).not.toBeInTheDocument();
  await app.user.click(screen.getByRole('button',{name:'Annulla selezione AI'}));
  expect(screen.queryByRole('button',{name:'Seleziona per compilare con l’AI'})).not.toBeInTheDocument();
  expect(backend.log.some(r=>r.method==='POST'&&/automatic-runs|from-documents/.test(r.path))).toBe(false);
});


it('excludes successful AI extraction before confirmation and after a refresh without starting a run',async()=>{
 const backend=new FakeBackend(),owner=backend.seedAccount('Owner','ai-success@example.test','password-owner-001'),home=backend.seedHome(owner.id,'Casa AI','Via Test');
 await backend.seedDocument({homeId:home.id,uploaderId:owner.id,name:'Proposta riuscita',workflowState:'review',aiAnalysisSucceeded:true});
 await backend.seedDocument({homeId:home.id,uploaderId:owner.id,name:'Analisi precedente riuscita',workflowState:'attention',aiAnalysisSucceeded:true});
 const fresh=await backend.seedDocument({homeId:home.id,uploaderId:owner.id,name:'Mai analizzato',workflowState:'to_compile'});
 const app=renderApp({path:'/accedi',backend});await app.user.type(await screen.findByLabelText('Email'),owner.email);await app.user.type(screen.getByLabelText('Password'),'password-owner-001');await app.user.click(screen.getByRole('button',{name:'Accedi'}));
 await waitFor(()=>expect(app.router.state.location.pathname).toBe(`/home/${home.id}/casa`));await act(async()=>{await app.router.navigate(`/home/${home.id}/documenti`);});
 await app.user.click(await screen.findByRole('button',{name:'Seleziona per compilare con l’AI'}));
 expect(screen.getAllByRole('checkbox',{name:/per compilazione AI/})).toHaveLength(1);
 await app.user.click(screen.getByRole('checkbox',{name:'Seleziona tutti i documenti da completare mostrati'}));
 await screen.findByRole('heading',{name:'1 documento selezionato'});
 backend.documents.get(fresh.id)!.aiAnalysisSucceeded=true;
 await act(async()=>{await app.queryClient.invalidateQueries();});
 await waitFor(()=>expect(screen.queryByRole('checkbox',{name:/per compilazione AI/})).not.toBeInTheDocument());
 expect(screen.queryByRole('button',{name:'Compila selezionati tramite AI'})).not.toBeInTheDocument();
 expect(backend.log.some(r=>r.method==='POST'&&/automatic-runs|from-documents|jobs/.test(r.path))).toBe(false);
});
