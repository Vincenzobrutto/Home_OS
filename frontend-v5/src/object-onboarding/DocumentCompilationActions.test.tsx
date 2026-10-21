import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router';
import { it, expect, vi } from 'vitest';
import { queryKeys } from '../api/queryKeys';
import { DocumentCompilationActions } from './DocumentCompilationActions';
const prepareExisting=vi.hoisted(()=>vi.fn());
vi.mock('../intake-integration/client',()=>({IntakeClient:class{prepareExisting(...args:unknown[]){return prepareExisting(...args);}}}));
const callJson=vi.fn();
vi.mock('../session/session',()=>({useAccount:()=>({id:'account'}),useApi:()=>({callJson})}));
function mount(drafts:Array<{id:string;state:string;hasSavedCompilation?:boolean}>=[],mode='extraction',lose=false,inline=true,houseDocument=false,workflowState?:'to_compile'|'completed'|'analyzing'|'review'|'attention'){
 let manual=0;prepareExisting.mockReset().mockResolvedValue({id:'synthetic-batch'});
 callJson.mockReset().mockImplementation(async(path:string,options:{method?:string}={})=>{
  if(path.includes('/capabilities'))return {manualAvailable:true,aiAvailable:true,drafts:drafts.map(d=>({...d,mode})),job:null};
  if(options.method==='POST'&&path.endsWith('/manual-drafts')){manual++;if(lose&&manual===1)throw Error('Connessione interrotta');}
  return {draft:{id:'draft',mode,snapshot:{documentId:'doc'}}};
 });
 const cache=new QueryClient({defaultOptions:{queries:{retry:false}}});cache.setQueryData(queryKeys.session,{account:{id:'account'}});
 function Location(){const location=useLocation();return <p data-testid="location">{location.pathname+location.search}</p>;}
 const onOpen=vi.fn();render(<QueryClientProvider client={cache}><MemoryRouter><DocumentCompilationActions homeId="home" documentId="doc" compact={!!workflowState} workflowState={workflowState} houseDocument={houseDocument} onOpen={inline?onOpen:undefined}/><Location/></MemoryRouter></QueryClientProvider>);
 return {onOpen,cache,user:userEvent.setup()};
}

it.each([undefined,'to_compile'] as const)('Compila opens directly with no AI choice or paid start (state=%s)',async(state)=>{
 const w=mount([],'manual',false,true,false,state);const button=await screen.findByRole('button',{name:'Compila'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);
 await waitFor(()=>expect(w.onOpen).toHaveBeenCalledWith('manuale','draft'));
 const posts=callJson.mock.calls.filter(c=>c[1]?.method==='POST');expect(posts).toHaveLength(1);expect(posts[0]![0]).toBe('/homes/home/object-onboarding/manual-drafts');expect(posts[0]![1].body).toEqual({documentId:'doc'});
 expect(screen.queryByText('Compila manualmente')).not.toBeInTheDocument();expect(screen.queryByText('Precompila con AI')).not.toBeInTheDocument();
});
it('reuses the existing manual draft without creating a second one',async()=>{
 const w=mount([{id:'saved-manual',state:'open'}],'manual');await waitFor(()=>expect(screen.getByRole('button',{name:'Compila'})).toBeEnabled());await w.user.click(screen.getByRole('button',{name:'Compila'}));
 expect(w.onOpen).toHaveBeenCalledWith('manuale','saved-manual');expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);
});
it('reuses an AI proposal without a new paid analysis',async()=>{
 const w=mount([{id:'draft',state:'open'}]);await w.user.click(await screen.findByRole('button',{name:'Rivedi proposta'}));expect(w.onOpen).toHaveBeenCalledWith('ai','draft');expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);
});
it('a lost manual draft response retries with the same key',async()=>{
 const w=mount([],'manual',true);const button=await screen.findByRole('button',{name:'Compila'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);await screen.findByRole('alert');await w.user.click(button);
 await waitFor(()=>expect(w.onOpen).toHaveBeenCalled());const posts=callJson.mock.calls.filter(c=>c[1]?.method==='POST');expect(posts).toHaveLength(2);expect(posts[0]![1].idempotencyKey).toBe(posts[1]![1].idempotencyKey);
});
it('archive entry prepares the unified workspace and never starts AI',async()=>{
 const w=mount([],'manual',false,false);const button=await screen.findByRole('button',{name:'Compila'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);
 await waitFor(()=>expect(screen.getByTestId('location')).toHaveTextContent('/home/home/documenti/organizza?lotto=synthetic-batch&oggetti-documento=doc&compila=manuale&oggetti-bozza=draft'));expect(prepareExisting).toHaveBeenCalledWith(['doc'],expect.any(String));expect(callJson.mock.calls.some(c=>c[0].endsWith('/jobs'))).toBe(false);
});
it('confirmed results open read-only without a new batch',async()=>{
 mount([{id:'draft',state:'confirmed'}],'extraction',false,false);await userEvent.click(await screen.findByRole('button',{name:'Proposta accettata · Vedi dettaglio'}));expect(prepareExisting).not.toHaveBeenCalled();expect(screen.getByTestId('location')).toHaveTextContent('/documenti/doc/oggetti?compila=manuale&bozza=draft');
});
it('updates the entry when an AI proposal becomes available',async()=>{
 const w=mount();await waitFor(()=>expect(screen.getByRole('button',{name:'Compila'})).toBeEnabled());w.cache.setQueryData(['account','account','home','home','onboarding','capabilities','doc'],{manualAvailable:true,aiAvailable:true,drafts:[{id:'bulk-draft',state:'open',mode:'extraction'}],job:null});await w.user.click(await screen.findByRole('button',{name:'Rivedi proposta'}));expect(w.onOpen).toHaveBeenCalledWith('ai','bulk-draft');expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);
});
it('completed cards only offer details',async()=>{
 const w=mount([{id:'confirmed',state:'confirmed'}],'extraction',false,true,false,'completed');await w.user.click(await screen.findByRole('button',{name:'Vedi dettagli'}));expect(screen.queryByRole('button',{name:'Compila'})).not.toBeInTheDocument();expect(callJson.mock.calls.some(([,o])=>o?.method==='POST')).toBe(false);
});
it('running analysis has no enabled start action',async()=>{
 mount([],'extraction',false,true,false,'analyzing');expect(await screen.findByRole('button',{name:/In analisi/})).toBeDisabled();expect(screen.queryByRole('button',{name:'Compila'})).not.toBeInTheDocument();
});

it('explicitly saved incomplete compilation resumes without a new draft or AI job',async()=>{
 const w=mount([{id:'saved-manual',state:'open',hasSavedCompilation:true}],'manual',false,true,false,'to_compile');await w.user.click(await screen.findByRole('button',{name:'Riprendi compilazione'}));expect(w.onOpen).toHaveBeenCalledWith('manuale','saved-manual');expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);
});
