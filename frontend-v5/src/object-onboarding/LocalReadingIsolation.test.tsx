import {act,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router';
import {expect,it,vi} from 'vitest';
import type {Draft} from './model';
import type {LocalBill} from './localBill';
import {queryKeys} from '../api/queryKeys';

const state=vi.hoisted(()=>({account:'account-a',home:'home-a',readers:[] as Array<{signal:AbortSignal;resolve:(bill:LocalBill)=>void}>,posts:[] as string[]}));
function reader(index:number){const value=state.readers[index];if(!value)throw Error('Local reader not started');return value;}
vi.mock('../session/session',()=>({useAccount:()=>({id:state.account}),useApi:()=>api}));
vi.mock('../routes/HomePages',()=>({useCurrentHome:()=>({id:state.home,name:'Casa sintetica'})}));
vi.mock('../documents/PdfPreview',()=>({PdfPreview:()=>null}));
vi.mock('./localBillPdf',()=>({localBillPdf:vi.fn((_blob:Blob,_sha:string,signal:AbortSignal,progress:(text:string)=>void)=>new Promise<LocalBill>(resolve=>{
 state.readers.push({signal,resolve});progress('Lettura sintetica '+state.readers.length);
}))}));
function draft(id:string):Draft{return {id:'draft-'+id,version:1,state:'open',mode:'manual',documentKind:'utility_bill',snapshot:{documentId:id,documentVersion:1,sha256:'a'.repeat(64)},document:null,items:[],needsReview:false,purchaseTotal:null,review:null,permissions:['read','edit'],houseExpenses:[{id:'cost',documentKind:'utility_bill',proposedFields:{},amountCandidates:[],amountSelectionRequired:true,decision:null}]};}
const api={
 getDocument:async(_home:string,id:string)=>({id,name:'Documento '+id,mimeType:'application/pdf',originalFilename:'scansione.pdf',version:1,sha256:'a'.repeat(64)}),
 downloadDocumentFile:async()=>({blob:new Blob(['synthetic scan'])}),listObjects:async()=>({items:[],nextCursor:null}),
 callJson:async(path:string,options?:{method?:string})=>{
  if(options?.method==='POST'){state.posts.push(path);throw Error('No writes allowed in reading isolation test');}
  if(path.endsWith('/candidates')||path.includes('/expense-candidates')||path.includes('/object-suggestions'))return {items:[],nextCursor:null};
  if(path.includes('/capabilities')){const id=new URL(path,'http://mock.invalid').searchParams.get('documentId')!;return {manualAvailable:true,aiAvailable:false,drafts:[{id:'draft-'+id,state:'open'}],job:null};}
  const id=path.split('/drafts/draft-')[1];if(!id)throw Error('Unexpected mock API path');return {draft:draft(decodeURIComponent(id))};
 },
};
import {DocumentObjectProposals} from './OnboardingPage';

function world(){
 state.account='account-a';state.home='home-a';state.readers=[];state.posts=[];
 const cache=new QueryClient({defaultOptions:{queries:{retry:false}}}),beforeConfirm=vi.fn(),user=userEvent.setup();
 cache.setQueryData(queryKeys.session,{account:{id:state.account}});
 const tree=(id:string)=><QueryClientProvider client={cache}><MemoryRouter initialEntries={['/?oggetti-documento=doc-a&oggetti-bozza=draft-doc-a&compila=manuale']}><DocumentObjectProposals documentId={id} beforeConfirm={beforeConfirm}/></MemoryRouter></QueryClientProvider>;
 const view=render(tree('doc-a'));
 return {...view,cache,beforeConfirm,user,tree};
}

it.each(['document','home','account'] as const)('late local reading cannot cross a change of %s',async(change)=>{
 const w=world();await screen.findByText('Lettura sintetica 1');expect(reader(0).signal.aborted).toBe(false);
 if(change==='home')state.home='home-b';if(change==='account'){state.account='account-b';w.cache.setQueryData(queryKeys.session,{account:{id:state.account}});}
 w.rerender(w.tree(change==='document'?'doc-b':'doc-a'));
 await screen.findByText('Lettura sintetica 2');await waitFor(()=>expect(reader(0).signal.aborted).toBe(true));
 await act(async()=>reader(0).resolve({supplier:'FORNITORE PRECEDENTE',amount:'999.99',category:'gas',method:'ocr'}));
 expect(screen.getByText('Lettura sintetica 2')).toBeInTheDocument();expect(screen.queryByDisplayValue('FORNITORE PRECEDENTE')).not.toBeInTheDocument();expect(state.posts).toEqual([]);
 await act(async()=>reader(1).resolve({supplier:'Fornitore attuale',amount:'42.80',category:'electricity',documentDate:'2026-01-10',competenceFrom:'2025-12-01',competenceTo:'2025-12-31',dueOn:'2026-02-10'}));
 await screen.findByRole('heading',{level:2,name:'Documento'});await w.user.click(screen.getByRole('button',{name:'Avanti'}));
 expect(await screen.findByLabelText('Fornitore')).toHaveValue('Fornitore attuale');expect(screen.getByLabelText('Importo della bolletta (€)')).toHaveValue('42.80');
 expect(screen.queryByDisplayValue('999.99')).not.toBeInTheDocument();expect(state.posts).toEqual([]);expect(w.beforeConfirm).not.toHaveBeenCalled();w.unmount();
});

it('manual entries survive a late result after cancelling the local reading',async()=>{
 const w=world();await screen.findByText('Lettura sintetica 1');await w.user.click(screen.getByRole('button',{name:'Continua manualmente senza lettura locale'}));
 await screen.findByRole('heading',{level:2,name:'Documento'});await w.user.click(screen.getByRole('button',{name:'Avanti'}));
 const amount=await screen.findByLabelText('Importo della bolletta (€)'),supplier=screen.getByLabelText('Fornitore');
 await w.user.type(amount,'18,90');await w.user.type(supplier,'Scelta manuale');expect(reader(0).signal.aborted).toBe(true);
 await act(async()=>reader(0).resolve({supplier:'NON SOSTITUIRE',amount:'999.99',category:'gas',method:'ocr'}));
 expect(amount).toHaveValue('18,90');expect(supplier).toHaveValue('Scelta manuale');expect(state.posts).toEqual([]);expect(w.beforeConfirm).not.toHaveBeenCalled();w.unmount();
});
