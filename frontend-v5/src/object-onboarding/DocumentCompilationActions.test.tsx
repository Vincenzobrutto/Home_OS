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
function mount(drafts:Array<{id:string;state:string}>=[],mode='extraction',lose=false,inline=true,houseDocument=false,workflowState?:'completed'|'analyzing'|'review'|'attention'){
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
it('manual compilation opens the existing form, creates only a manual draft and never starts AI',async()=>{
 const w=mount();const button=await screen.findByRole('button',{name:'Compila manualmente'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);
 await waitFor(()=>expect(w.onOpen).toHaveBeenCalledWith('manuale','draft'));
 const posts=callJson.mock.calls.filter(c=>c[1]?.method==='POST');expect(posts).toHaveLength(1);expect(posts[0]![0]).toBe('/homes/home/object-onboarding/manual-drafts');expect(posts[0]![1].body).toEqual({documentId:'doc'});
});
it('AI choice opens consent without transmitting the document or creating an object',async()=>{
 const w=mount();const button=await screen.findByRole('button',{name:'Compila tramite AI'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);
 expect(w.onOpen).toHaveBeenCalledWith('ai',undefined);expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);
});
it('reuses existing AI extraction for the same document without another paid analysis',async()=>{
 const w=mount([{id:'draft',state:'open'}]);const button=await screen.findByRole('button',{name:'Rivedi proposta'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);
 await waitFor(()=>expect(w.onOpen).toHaveBeenCalledWith('ai','draft'));expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);expect(screen.queryByRole('button',{name:'Compila tramite AI'})).not.toBeInTheDocument();
});
it('a manual draft is not presented as AI extraction; AI still requires the consent screen',async()=>{
 const w=mount([{id:'draft',state:'open'}],'manual');const button=await screen.findByRole('button',{name:'Compila tramite AI'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);
 await waitFor(()=>expect(w.onOpen).toHaveBeenCalledWith('ai',undefined));expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);
});
it('a lost manual draft response retains the same key when the user retries',async()=>{
 const w=mount([],'manual',true);const button=await screen.findByRole('button',{name:'Compila manualmente'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);await screen.findByRole('alert');await w.user.click(button);
 await waitFor(()=>expect(w.onOpen).toHaveBeenCalled());const posts=callJson.mock.calls.filter(c=>c[1]?.method==='POST');expect(posts).toHaveLength(2);expect(posts[0]![1].idempotencyKey).toBe(posts[1]![1].idempotencyKey);
});

it('archive entry opens the same unified intake revision without sending AI',async()=>{const w=mount([],'extraction',false,false);const button=await screen.findByRole('button',{name:'Compila tramite AI'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);await waitFor(()=>expect(screen.getByTestId('location')).toHaveTextContent('/home/home/documenti/organizza?lotto=synthetic-batch&oggetti-documento=doc&compila=ai'));expect(prepareExisting).toHaveBeenCalledWith(['doc'],expect.any(String));expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);});
it('confirmed archive results open read-only without creating a new intake batch',async()=>{const w=mount([{id:'draft',state:'confirmed'}],'extraction',false,false);await w.user.click(await screen.findByRole('button',{name:'Proposta accettata · Vedi dettaglio'}));expect(prepareExisting).not.toHaveBeenCalled();expect(screen.getByTestId('location')).toHaveTextContent('/documenti/doc/oggetti?compila=manuale&bozza=draft');});

it('updates a document card when a bulk proposal becomes available',async()=>{
 const w=mount();await waitFor(()=>expect(screen.getByRole('button',{name:'Compila tramite AI'})).toBeEnabled());
 w.cache.setQueryData(['account','account','home','home','onboarding','capabilities','doc'],{manualAvailable:true,aiAvailable:true,drafts:[{id:'bulk-draft',state:'open',mode:'extraction'}],job:null});
 await w.user.click(await screen.findByRole('button',{name:'Rivedi proposta'}));expect(w.onOpen).toHaveBeenCalledWith('ai','bulk-draft');expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);
});
it('house documents also open their prepared AI proposal',async()=>{
 const w=mount([{id:'draft',state:'open'}],'extraction',false,true,true);await w.user.click(await screen.findByRole('button',{name:'Rivedi proposta'}));expect(w.onOpen).toHaveBeenCalledWith('ai','draft');
});
it('house manual compilation creates a closable review without creating resources',async()=>{
 const w=mount([],'manual',false,true,true);const b=await screen.findByRole('button',{name:'Compila manualmente'});await waitFor(()=>expect(b).toBeEnabled());await w.user.click(b);expect(w.onOpen).toHaveBeenCalledWith('manuale','draft');expect(callJson.mock.calls.filter(c=>c[1]?.method==='POST').every(c=>c[0].endsWith('/manual-drafts'))).toBe(true);
});

it('completed cards only offer details and never restart paid analysis',async()=>{
 const w=mount([{id:'confirmed',state:'confirmed'}],'extraction',false,true,false,'completed');
 await w.user.click(await screen.findByRole('button',{name:'Vedi dettagli'}));
 expect(screen.queryByRole('button',{name:'Compila tramite AI'})).not.toBeInTheDocument();
 expect(callJson.mock.calls.some(([,o])=>o?.method==='POST')).toBe(false);
});
it('running analysis is visible without an enabled start action',async()=>{
 mount([],'extraction',false,true,false,'analyzing');
 expect(await screen.findByRole('button',{name:/In analisi/})).toBeDisabled();
 expect(screen.queryByRole('button',{name:'Compila tramite AI'})).not.toBeInTheDocument();
});
