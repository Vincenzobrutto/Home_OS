import {render,screen,waitFor,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter,Routes,Route,useNavigate} from 'react-router';
import {it,expect,vi} from 'vitest';
import {DocumentObjectProposals} from './OnboardingPage';
import {DocumentEditorContext} from '../documents/DocumentEditorContext';
import {queryKeys} from '../api/queryKeys';
import {ApiError} from '../api/errors';
import type {Draft} from './model';
const mocks=vi.hoisted(()=>({callJson:vi.fn(),getDocument:vi.fn()}));
vi.mock('../session/session',()=>({useAccount:()=>({id:'account'}),useApi:()=>mocks}));
vi.mock('../routes/HomePages',()=>({useCurrentHome:()=>({id:'home',name:'Casa fittizia'})}));
function setup(extras=false){
 const wire:Draft={id:'draft',version:1,state:'open',mode:'manual',snapshot:{documentId:'doc',documentVersion:1,sha256:'a'.repeat(64)},document:{id:'doc',name:'Prova',mimeType:'application/pdf'},documentKind:'utility_bill',items:[],needsReview:false,purchaseTotal:null,review:null,permissions:['read','edit'],houseExpenses:[{id:'cost',documentKind:'utility_bill',proposedFields:{},amountCandidates:[],amountSelectionRequired:true,decision:null}]};
 if(extras){wire.mode='extraction';wire.documentKind='purchase_document';wire.documentInfo={kind:'invoice',title:{value:'Fattura',source:{documentId:'doc',page:1,excerpt:'Fattura'}},facts:[]};wire.items=[{id:'item',fields:{name:{value:'Oggetto fittizio',source:{documentId:'doc',page:1,excerpt:'Oggetto'}}},quantity:null,nameTruncated:false,disposition:'household_object',profile:{},enrichment:null,decision:null}];wire.contacts=[{id:'contact',values:{name:'Impresa fittizia',kind:'company',profession:null,phone:null,email:null,fiscalId:null,note:null},sources:{},warnings:[],resolution:{state:'create',contact:null,candidates:[],conflicts:[]},decision:null}];wire.houseExpenses=[];}
 let fail=false,lost=false,reject=false;const keys=new Map<string,unknown>();
 mocks.getDocument.mockResolvedValue({id:'doc',name:'Bolletta fittizia',organization:null});
 mocks.callJson.mockReset().mockImplementation(async(path:string,options:{method?:string;body?:{review:Draft['review']};idempotencyKey?:string}={})=>{
  if(path.includes('/capabilities'))return {manualAvailable:true,aiAvailable:false,drafts:[{id:wire.id,state:'open',mode:'manual',hasSavedCompilation:!!wire.review?.compilation}],job:null};
  if(path.endsWith('/candidates'))return {items:[],nextCursor:null};
  if(path.includes('/expense-candidates'))return {items:[],nextCursor:null};
  if(options.method==='POST'){
   if(!path.endsWith('/review'))throw Error('Canonical writes forbidden in draft test');
   if(reject){reject=false;throw new ApiError({kind:'http',status:422,code:'validation_error',message:'Controlla i dati della bozza.'});}
   if(fail){fail=false;return Promise.reject(new Error('Connessione interrotta'));}
   if(!keys.has(options.idempotencyKey!)){wire.review=options.body!.review;wire.version++;keys.set(options.idempotencyKey!,true);}
   if(lost){lost=false;throw Error('Risposta persa');}
  }
  return {draft:structuredClone(wire)};
 });
 const pause=vi.fn(),beforeConfirm=vi.fn();
 function Editor(){const navigate=useNavigate();return <DocumentEditorContext.Provider value={{pause:saved=>{pause(saved);if(saved)navigate('/saved');},complete:vi.fn(),showOriginal:vi.fn()}}><DocumentObjectProposals documentId="doc" beforeConfirm={beforeConfirm} singleScreen/></DocumentEditorContext.Provider>;}
 function mount(){const cache=new QueryClient({defaultOptions:{queries:{retry:false}}});cache.setQueryData(queryKeys.session,{account:{id:'account'}});return render(<QueryClientProvider client={cache}><MemoryRouter initialEntries={['/?oggetti-documento=doc&oggetti-bozza=draft&compila=manuale']}><Routes><Route path="/" element={<Editor/>}/><Route path="/saved" element={<p>Elenco fittizio</p>}/></Routes></MemoryRouter></QueryClientProvider>);}

 mount();return {wire,pause,beforeConfirm,mount,user:userEvent.setup(),fail:()=>{fail=true;},lose:()=>{lost=true;},reject:()=>{reject=true;}};
}
it('saves and restores incomplete inputs, metadata and both bill period modes without confirmation or AI',async()=>{
 const w=setup();await screen.findByRole('button',{name:'Salva bozza ed esci'});
 const amount=await screen.findByLabelText('Importo della bolletta (€)');await w.user.type(amount,'12,');
 await w.user.type(screen.getByLabelText('Fornitore'),'Fornitore fittizio');
 await w.user.clear(screen.getByLabelText('Titolo del documento'));await w.user.type(screen.getByLabelText('Titolo del documento'),'Da finire');
 await w.user.type(screen.getByLabelText('Mese di riferimento'),'2025-12');
 await w.user.click(screen.getByRole('radio',{name:'Un intervallo'}));
 await w.user.clear(screen.getByLabelText('Dal'));await w.user.type(screen.getByLabelText('Dal'),'2025-11-01');
 await w.user.clear(screen.getByLabelText('Al'));
 expect(screen.getByRole('button',{name:'Completa i dati'})).toBeEnabled();
 await w.user.click(screen.getByRole('button',{name:'Salva bozza ed esci'}));await waitFor(()=>expect(w.pause).toHaveBeenCalledWith(true));await screen.findByText('Elenco fittizio');
 expect(w.beforeConfirm).not.toHaveBeenCalled();expect(w.wire.state).toBe('open');
 expect(w.wire.review?.compilation).toMatchObject({documentTitle:'Da finire',documentOnly:false,houseForms:{cost:{amount:'12,',supplier:'Fornitore fittizio',periodFrom:'2025-11-01',periodTo:'',periodDraft:{mode:'range',month:'2025-12'}}}});
 cleanup();w.mount();expect(await screen.findByLabelText('Titolo del documento')).toHaveValue('Da finire');expect(await screen.findByLabelText('Importo della bolletta (€)')).toHaveValue('12,');expect(screen.getByLabelText('Dal')).toHaveValue('2025-11-01');expect(screen.getByLabelText('Al')).toHaveValue('');await w.user.click(screen.getByRole('radio',{name:'Un mese'}));expect(screen.getByLabelText('Mese di riferimento')).toHaveValue('2025-12');
 expect(mocks.callJson.mock.calls.filter(([,o])=>o?.method==='POST')).toHaveLength(1);
});
it.each(['failure','lost'] as const)('keeps inputs on %s and replays the same review with the same key',async(kind)=>{
 const w=setup();await w.user.type(await screen.findByLabelText('Fornitore'),'Da conservare');if(kind==='failure')w.fail();else w.lose();
 await w.user.click(screen.getByRole('button',{name:'Salva bozza ed esci'}));const notice=await screen.findByRole('alert',{name:'Salvataggio bozza'});await waitFor(()=>expect(notice).toHaveFocus());expect(notice).toHaveTextContent('Salvataggio da verificare');expect(screen.queryByRole('button',{name:'Registra spesa'})).not.toBeInTheDocument();expect(mocks.callJson.mock.calls.filter(([,o])=>o?.method==='POST')).toHaveLength(1);expect(w.pause).not.toHaveBeenCalled();expect(screen.getByLabelText('Fornitore')).toHaveValue('Da conservare');
 await w.user.click(screen.getByRole('button',{name:'Riprova salvataggio'}));await waitFor(()=>expect(w.pause).toHaveBeenCalledWith(true));await screen.findByText('Elenco fittizio');
 const posts=mocks.callJson.mock.calls.filter(([,o])=>o?.method==='POST');expect(posts).toHaveLength(2);expect(posts[0]).toEqual(posts[1]);expect(w.wire.version).toBe(2);expect(w.beforeConfirm).not.toHaveBeenCalled();
});

it('preserves object and incomplete contact edits even when saving document-only mode',async()=>{
 const w=setup(true);await screen.findByRole('button',{name:'Salva bozza ed esci'});
 await w.user.click(screen.getByText(/^Oggetti ·/));await w.user.clear(screen.getByLabelText('Nome dell’oggetto'));await w.user.type(screen.getByLabelText('Nome dell’oggetto'),'Nome in bozza');
 await w.user.click(screen.getByText(/^Contatti ·/));await w.user.clear(screen.getByLabelText('Nome o ragione sociale'));await w.user.type(screen.getByLabelText('Email'),'incompleta@');
 await w.user.click(screen.getByRole('checkbox',{name:'Conserva solo il documento'}));await w.user.click(screen.getByRole('button',{name:'Salva bozza ed esci'}));await waitFor(()=>expect(w.pause).toHaveBeenCalledWith(true));await screen.findByText('Elenco fittizio');expect(w.beforeConfirm).not.toHaveBeenCalled();
 cleanup();w.mount();await screen.findByRole('button',{name:'Salva bozza ed esci'});expect(screen.getByRole('checkbox',{name:'Conserva solo il documento'})).toBeChecked();await w.user.click(screen.getByRole('checkbox',{name:'Conserva solo il documento'}));await w.user.click(screen.getByText(/^Oggetti ·/));expect(screen.getByLabelText('Nome dell’oggetto')).toHaveValue('Nome in bozza');await w.user.click(screen.getByText(/^Contatti ·/));expect(screen.getByLabelText('Nome o ragione sociale')).toHaveValue('');expect(screen.getByLabelText('Email')).toHaveValue('incompleta@');
});

it('restores deliberately empty document title and type rather than falling back to AI proposals',async()=>{
 const w=setup(true);await w.user.clear(await screen.findByLabelText('Titolo del documento'));await w.user.selectOptions(screen.getByLabelText('Tipo del documento'),'');await w.user.click(screen.getByRole('button',{name:'Salva bozza ed esci'}));await screen.findByText('Elenco fittizio');cleanup();w.mount();expect(await screen.findByLabelText('Titolo del documento')).toHaveValue('');expect(screen.getByLabelText('Tipo del documento')).toHaveValue('');expect(w.beforeConfirm).not.toHaveBeenCalled();
});

it('a repeated recovery failure refocuses the visible alert and preserves the original request',async()=>{
 const w=setup();await w.user.type(await screen.findByLabelText('Fornitore'),'Da conservare');w.fail();await w.user.click(screen.getByRole('button',{name:'Salva bozza ed esci'}));await screen.findByRole('alert',{name:'Salvataggio bozza'});w.fail();await w.user.click(screen.getByRole('button',{name:'Riprova salvataggio'}));await waitFor(()=>expect(screen.getByRole('alert',{name:'Salvataggio bozza'})).toHaveFocus());expect(screen.getByLabelText('Fornitore')).toHaveValue('Da conservare');const posts=mocks.callJson.mock.calls.filter(([,o])=>o?.method==='POST');expect(posts).toHaveLength(2);expect(posts[0]).toEqual(posts[1]);expect(w.pause).not.toHaveBeenCalled();
});
it('a definite rejection remains visible and permits correcting inputs before a fresh draft save',async()=>{
 const w=setup();await w.user.type(await screen.findByLabelText('Fornitore'),'Prima');w.reject();await w.user.click(screen.getByRole('button',{name:'Salva bozza ed esci'}));const alert=await screen.findByRole('alert',{name:'Salvataggio bozza'});await waitFor(()=>expect(alert).toHaveFocus());expect(alert).toHaveTextContent('Bozza non salvata');expect(alert).toHaveTextContent('Controlla i dati della bozza.');expect(screen.getByLabelText('Fornitore')).toBeEnabled();await w.user.clear(screen.getByLabelText('Fornitore'));await w.user.type(screen.getByLabelText('Fornitore'),'Corretto');await w.user.click(screen.getByRole('button',{name:'Riprova salvataggio'}));await screen.findByText('Elenco fittizio');const posts=mocks.callJson.mock.calls.filter(([,o])=>o?.method==='POST');expect(posts).toHaveLength(2);expect(posts[0]![1].idempotencyKey).not.toBe(posts[1]![1].idempotencyKey);expect(w.wire.review?.compilation?.houseForms.cost?.supplier).toBe('Corretto');expect(w.beforeConfirm).not.toHaveBeenCalled();
});

it('only-document switch preserves expense inputs for returning to the complete summary without a save',async()=>{
 const w=setup();await screen.findByLabelText('Importo della bolletta (€)');await w.user.type(screen.getByLabelText('Importo della bolletta (€)'),'93,39');await w.user.type(screen.getByLabelText('Fornitore'),'Fornitore da conservare');
 await w.user.click(screen.getByRole('checkbox',{name:'Conserva solo il documento'}));expect(screen.getByLabelText('Fornitore')).not.toBeVisible();
 await w.user.click(screen.getByRole('checkbox',{name:'Conserva solo il documento'}));expect(screen.getByLabelText('Fornitore')).toHaveValue('Fornitore da conservare');expect(screen.getByLabelText('Importo della bolletta (€)')).toHaveValue('93,39');expect(mocks.callJson.mock.calls.some(c=>c[1]?.method==='POST')).toBe(false);
});
