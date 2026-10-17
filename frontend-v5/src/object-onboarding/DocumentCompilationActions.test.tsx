import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { it, expect, vi } from 'vitest';
import { queryKeys } from '../api/queryKeys';
import { DocumentCompilationActions } from './DocumentCompilationActions';
const callJson=vi.fn();
vi.mock('../session/session',()=>({useAccount:()=>({id:'account'}),useApi:()=>({callJson})}));
function mount(drafts:Array<{id:string;state:string}>=[],mode='extraction',lose=false){
 let manual=0;
 callJson.mockReset().mockImplementation(async(path:string,options:{method?:string}={})=>{
  if(path.includes('/capabilities'))return {manualAvailable:true,aiAvailable:true,drafts,job:null};
  if(options.method==='POST'&&path.endsWith('/manual-drafts')){manual++;if(lose&&manual===1)throw Error('Connessione interrotta');}
  return {draft:{id:'draft',mode,snapshot:{documentId:'doc'}}};
 });
 const cache=new QueryClient({defaultOptions:{queries:{retry:false}}});cache.setQueryData(queryKeys.session,{account:{id:'account'}});
 const onOpen=vi.fn();render(<QueryClientProvider client={cache}><MemoryRouter><DocumentCompilationActions homeId="home" documentId="doc" onOpen={onOpen}/></MemoryRouter></QueryClientProvider>);
 return {onOpen,user:userEvent.setup()};
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
 const w=mount([{id:'draft',state:'open'}]);const button=await screen.findByRole('button',{name:'Compila tramite AI'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);
 await waitFor(()=>expect(w.onOpen).toHaveBeenCalledWith('ai','draft'));expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);
});
it('a manual draft is not presented as AI extraction; AI still requires the consent screen',async()=>{
 const w=mount([{id:'draft',state:'open'}],'manual');const button=await screen.findByRole('button',{name:'Compila tramite AI'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);
 await waitFor(()=>expect(w.onOpen).toHaveBeenCalledWith('ai',undefined));expect(callJson.mock.calls.every(c=>c[1]?.method!=='POST')).toBe(true);
});
it('a lost manual draft response retains the same key when the user retries',async()=>{
 const w=mount([],'manual',true);const button=await screen.findByRole('button',{name:'Compila manualmente'});await waitFor(()=>expect(button).toBeEnabled());await w.user.click(button);await screen.findByRole('alert');await w.user.click(button);
 await waitFor(()=>expect(w.onOpen).toHaveBeenCalled());const posts=callJson.mock.calls.filter(c=>c[1]?.method==='POST');expect(posts).toHaveLength(2);expect(posts[0]![1].idempotencyKey).toBe(posts[1]![1].idempotencyKey);
});
