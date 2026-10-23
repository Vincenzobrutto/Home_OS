import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router';
import {expect,it,vi} from 'vitest';
import {ApiClient} from '../api/client';
import {HouseExpenseProposal} from './HouseExpenseProposal';
import type {Draft,HouseExpense,HouseForm} from './model';
const item:HouseExpense={id:'bill-1',proposedFields:{competenceFrom:{value:'2026-09-01',sources:[]},competenceTo:{value:'2026-09-30',sources:[]},title:{value:'Bolletta energia',sources:[]},category:{value:'electricity',sources:[]},documentDate:{value:'2026-09-15',sources:[]}},amountCandidates:[{id:'total',amountCents:8450,role:'current_document_total',label:'Totale documento'}],amountSelectionRequired:false,decision:null};
it('unified invoice with one verified amount due has a usable amount without a hidden required selection',async()=>{
 const w=mount({invoice:true,unified:true,amountDue:true});await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());
 expect(screen.getByLabelText('Importo della spesa (€)')).toHaveValue('84.5');await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));
 expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({amountSelection:{mode:'candidate',candidateId:'total'},values:expect.objectContaining({amountCents:8450})}));
});
it('restores editable invoice metadata and keeps invalid future emission dates out of confirmation',async()=>{
 const form:HouseForm={candidateId:'total',amount:'84.5',manual:false,title:'Acconto · Lavori sintetici',supplier:'Fornitore sintetico',date:'2026-06-16',category:'repairs_works',mode:'create',expenseId:'',ack:false,periodFrom:'',periodTo:'',dueOn:'',documentNumber:'14',documentDate:'2099-01-01',note:'Da conservare',objectChoice:'',objectSuggestionReviewed:true};
 const w=mount({invoice:true,unified:true,draft:{review:{compilation:{saved:true,documentTitle:'Fattura sintetica',documentKind:'invoice',replaceOrganization:false,reuseCopy:false,documentOnly:false,manualTotal:'',contacts:[],houseForms:{'bill-1':form}}}}});
 await screen.findByText('Correggi la data di emissione: non può essere futura.');expect(screen.getByRole('button',{name:'Registra spesa'})).toBeDisabled();
 await w.user.click(screen.getByText('Altri dati e collegamenti'));expect(screen.getByLabelText('Numero fattura')).toHaveValue('14');expect(screen.getByLabelText('Nota')).toHaveValue('Da conservare');
 await w.user.clear(screen.getByLabelText('Data di emissione'));await w.user.type(screen.getByLabelText('Data di emissione'),'2026-06-16');
 await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));
 expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({values:expect.objectContaining({documentNumber:'14',documentDate:'2026-06-16',note:'Da conservare'})}));
});
function mount(options:{invoicePage?:number;suggestedCategory?:string;emptyCategory?:boolean;unified?:boolean;amountDue?:boolean;manual?:boolean;ambiguous?:boolean;duplicates?:boolean;invoice?:boolean;unavailable?:boolean;suggestions?:boolean;onUseExisting?:()=>void;draft?:Partial<Draft>;confirm?:ReturnType<typeof vi.fn<(choice:unknown)=>Promise<void>>>}={}){const confirm=options.confirm??vi.fn<(choice:unknown)=>Promise<void>>().mockResolvedValue(undefined),api=new ApiClient({fetch:async(input)=>String(input).includes('/object-suggestions?')?Response.json({items:options.suggestions?[{ref:{kind:'object',id:'installation'},name:'Impianto sintetico',reason:'supplier_and_description',...(options.suggestedCategory?{category:options.suggestedCategory}:{})}]:[]}):String(input).includes('/objects/object/')?(options.unavailable?Response.json({message:'Unavailable'},{status:403}):Response.json({object:{ref:{kind:'object',id:'installation'},name:'Impianto sintetico',state:'active',position:{version:1,rooms:[]}}})):String(input).includes('/objects?')?Response.json({items:[{ref:{kind:'object',id:'installation'},name:'Impianto sintetico',state:'active',position:{version:1,rooms:[]}}],nextCursor:null}):Response.json({items:options.duplicates?[{id:'old',title:'Bolletta già presente',amountCents:8450,spentOn:'2026-09-15',version:1,rank:2}]:[],nextCursor:null})});const user=userEvent.setup();render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><HouseExpenseProposal item={{...item,...(options.invoicePage?{invoiceSegment:{key:"synthetic-page",page:options.invoicePage}}:{}),...(options.emptyCategory?{proposedFields:{...item.proposedFields,category:{value:'',sources:[]}}}:{}),amountCandidates:item.amountCandidates.map(a=>options.amountDue?{...a,role:'amount_due'}:a),...(options.invoice?{documentKind:'simple_invoice' as const}:{}),amountSelectionRequired:!!options.ambiguous,...(options.manual?{proposedFields:{},amountCandidates:[],documentKind:"utility_bill" as const}:{})}} draft={{id:'draft1',version:1,mode:options.manual?'manual':'extraction',...options.draft} as Draft} api={api} accountId="account" base="/homes/home/object-onboarding" root="/home/home" disabled={false} unified={options.unified} beforeDocument onUseExisting={options.onUseExisting} confirm={confirm}/></MemoryRouter></QueryClientProvider>);return {user,confirm};}
it('preselects a clear bill total and confirms a home expense without an object',async()=>{const w=mount();const button=await screen.findByRole('button',{name:'Registra spesa'});await waitFor(()=>expect(button).toBeEnabled());expect(screen.getByText('84,50 €')).toBeInTheDocument();await w.user.click(screen.getByRole('button',{name:'Modifica dati'}));expect(screen.getByLabelText('Importo della bolletta (€)')).toHaveValue('84.5');await w.user.click(button);expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({action:'create',values:expect.objectContaining({amountCents:8450,category:'electricity',objectRef:null})}));});
it('does not preselect ambiguous totals',async()=>{mount({ambiguous:true});await waitFor(()=>expect(screen.queryByText(/Controllo delle spese/)).not.toBeInTheDocument());expect(screen.getByLabelText('Totale della bolletta')).toHaveValue('');expect(screen.getByRole('button',{name:'Registra spesa'})).toBeDisabled();});
it('a similar expense requires review and can be linked without creating another expense',async()=>{const w=mount({duplicates:true});await screen.findByText(/Ci sono spese simili/);expect(screen.getByRole('button',{name:'Registra spesa'})).toBeDisabled();await w.user.selectOptions(screen.getByLabelText('Come registrare la bolletta'),'link_existing');await w.user.selectOptions(screen.getByLabelText('Spesa da collegare'),'old');await w.user.click(screen.getByRole('button',{name:'Collega spesa'}));expect(w.confirm).toHaveBeenCalledWith({itemId:'bill-1',action:'link_existing',expenseId:'old',expectedExpenseVersion:1});});
it('skip sends no hidden monetary values',async()=>{const w=mount();await w.user.click(screen.getByRole('button',{name:'Non registrare la spesa'}));expect(w.confirm).toHaveBeenCalledWith({itemId:'bill-1',action:'skip'});});

it('invoice deposit and balance keep the same existing installation without creating an object',async()=>{
 const w=mount({invoice:true});await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());await w.user.click(screen.getByRole('button',{name:'Modifica dati'}));
 await w.user.selectOptions(await screen.findByLabelText('Oggetto o impianto (facoltativo)'),'object:installation');
 await w.user.selectOptions(screen.getByLabelText('Questa spesa è'),'deposit');
 await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));
 expect(w.confirm).toHaveBeenLastCalledWith(expect.objectContaining({values:expect.objectContaining({title:'Acconto · Bolletta energia',amountCents:8450,objectRef:{kind:'object',id:'installation'}})}));
 await w.user.selectOptions(screen.getByLabelText('Questa spesa è'),'balance');expect(screen.getByText(/solo il saldo residuo/)).toBeInTheDocument();await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));
 expect(w.confirm).toHaveBeenLastCalledWith(expect.objectContaining({values:expect.objectContaining({title:'Saldo · Bolletta energia',objectRef:{kind:'object',id:'installation'}})}));
 await w.user.click(screen.getByRole('button',{name:'Non registrare la spesa'}));expect(w.confirm).toHaveBeenLastCalledWith({itemId:'bill-1',action:'skip'});
});
it('unavailable installation blocks creation until the user explicitly removes the reference',async()=>{
 const w=mount({invoice:true,unavailable:true});await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());await w.user.click(screen.getByRole('button',{name:'Modifica dati'}));await w.user.selectOptions(await screen.findByLabelText('Oggetto o impianto (facoltativo)'),'object:installation');
 await screen.findByText(/Oggetto non disponibile/);expect(screen.getByRole('button',{name:'Registra spesa'})).toBeDisabled();await w.user.selectOptions(screen.getByLabelText('Oggetto o impianto (facoltativo)'),'');await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({values:expect.objectContaining({objectRef:null})}));
});
it('only one confirmed active document object is preselected visibly; unconfirmed proposals are not used',async()=>{
 const w=mount({invoice:true,draft:{items:[{decision:{state:'confirmed',newObjects:0,newExpenses:0,objects:[{id:'installation',name:'Impianto sintetico',state:'active'}]}} as Draft['items'][number]]}});
 await screen.findByText('Costo riferito a: Impianto sintetico');await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({values:expect.objectContaining({objectRef:{kind:'object',id:'installation'}})}));
});
it('an explicitly saved empty reference overrides the single confirmed object suggestion',async()=>{
 const w=mount({invoice:true,draft:{review:{compilation:{saved:true,documentTitle:'Fattura',documentKind:'simple_invoice',replaceOrganization:false,reuseCopy:false,documentOnly:false,manualTotal:'',contacts:[],houseForms:{'bill-1':{objectChoice:'',candidateId:'total',amount:'84.50',manual:false,title:'Fattura',supplier:'',date:'2026-09-15',category:'repairs_works',mode:'create',expenseId:'',ack:false,periodFrom:'',periodTo:'',dueOn:''}}}},items:[{decision:{state:'confirmed',objects:[{id:'installation',state:'active'}]}} as Draft['items'][number]]}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({values:expect.objectContaining({objectRef:null})}));
});
it('proposes reuse but does not choose or confirm it silently; accepting suppresses new-object flow',async()=>{
 const reuse=vi.fn(),w=mount({invoice:true,suggestions:true,onUseExisting:reuse});await screen.findByRole('region',{name:'Collegamenti proposti'});expect(screen.getByRole('button',{name:'Registra spesa'})).toBeDisabled();expect(w.confirm).not.toHaveBeenCalled();
 await w.user.click(screen.getByRole('button',{name:'Collega a Impianto sintetico, senza nuove schede'}));expect(reuse).toHaveBeenCalledOnce();await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({values:expect.objectContaining({objectRef:{kind:'object',id:'installation'}})}));
});
it('user can reject a suggested relationship without any object or expense side effect',async()=>{
 const reuse=vi.fn(),w=mount({invoice:true,suggestions:true,onUseExisting:reuse});await w.user.click(await screen.findByRole('button',{name:'È un altro oggetto o intervento: scelgo io'}));expect(reuse).not.toHaveBeenCalled();expect(w.confirm).not.toHaveBeenCalled();await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({values:expect.objectContaining({objectRef:null})}));
});
it('rejecting a suggestion after accepting it removes the previous object reference',async()=>{
 const w=mount({invoice:true,suggestions:true});await w.user.click(await screen.findByRole('button',{name:'Collega a Impianto sintetico, senza nuove schede'}));await w.user.click(await screen.findByRole('button',{name:'Modifica dati'}));await w.user.click(screen.getByRole('button',{name:'È un altro oggetto o intervento: scelgo io'}));await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({values:expect.objectContaining({objectRef:null})}));
});

it('explains an ambiguous total and focuses its selection from the checklist',async()=>{const w=mount({ambiguous:true});const issue=await screen.findByRole('button',{name:'Scegli il totale da usare o inserisci un importo corretto.'});await w.user.click(issue);expect(screen.getByLabelText('Totale della bolletta')).toHaveFocus();});

it('manual bills expose editable amount, date, supplier and category directly without choosing a total',async()=>{const w=mount({manual:true});await waitFor(()=>expect(screen.queryByText(/Controllo delle spese/)).not.toBeInTheDocument());expect(screen.queryByLabelText('Totale della bolletta')).not.toBeInTheDocument();expect(screen.getByLabelText('Importo della bolletta (€)')).not.toHaveAttribute('readonly');await w.user.type(screen.getByLabelText('Importo della bolletta (€)'),'93,21');await w.user.type(screen.getByLabelText('Data di emissione'),'2026-01-17');await w.user.type(screen.getByLabelText('Fornitore'),'Fornitore sintetico');await w.user.type(screen.getByLabelText('Mese di riferimento'),'2025-12');await w.user.selectOptions(screen.getByLabelText('Categoria della bolletta'),'electricity');await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({action:'create',amountSelection:{mode:'manual'},values:expect.objectContaining({amountCents:9321,spentOn:'2026-01-17',supplier:'Fornitore sintetico',category:'electricity',objectRef:null})}));expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();});


it('unified invoice presents a unique existing reference for one explicit final save without another confirmation',async()=>{
 const reuse=vi.fn(),w=mount({invoice:true,suggestions:true,unified:true,onUseExisting:reuse});
 const select=await screen.findByLabelText('Oggetto o impianto (facoltativo)');
 await waitFor(()=>expect(select).toHaveValue('object:installation'));
 expect(reuse).toHaveBeenCalledOnce();expect(w.confirm).not.toHaveBeenCalled();
 expect(screen.queryByRole('button',{name:/Collega a Impianto/})).not.toBeInTheDocument();
 await w.user.clear(screen.getByLabelText('Importo della spesa (€)'));await w.user.type(screen.getByLabelText('Importo della spesa (€)'),'99,50');
 await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());
 await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));
 expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({amountSelection:{mode:'manual'},values:expect.objectContaining({amountCents:9950,objectRef:{kind:'object',id:'installation'}})}));
});
it('unified invoice can remove a proposed reference without restoring unwanted new objects or saving',async()=>{
 const w=mount({invoice:true,suggestions:true,unified:true});const select=await screen.findByLabelText('Oggetto o impianto (facoltativo)');
 await waitFor(()=>expect(select).toHaveValue('object:installation'));await w.user.selectOptions(select,'');
 expect(w.confirm).not.toHaveBeenCalled();await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());
 await w.user.click(screen.getByRole('button',{name:'Registra spesa'}));expect(w.confirm).toHaveBeenCalledWith(expect.objectContaining({values:expect.objectContaining({objectRef:null})}));
});

it('a unique matching intervention proposes a missing category, but explicit clearing remains empty',async()=>{
 const w=mount({invoice:true,unified:true,suggestions:true,suggestedCategory:'repairs_works',emptyCategory:true});
 const category=await screen.findByLabelText('Categoria della spesa');await waitFor(()=>expect(category).toHaveValue('repairs_works'));
 expect(screen.getByText(/Categoria proposta dalla spesa già collegata/)).toBeVisible();
 await w.user.selectOptions(category,'');expect(category).toHaveValue('');expect(screen.getByRole('button',{name:'Registra spesa'})).toBeDisabled();expect(w.confirm).not.toHaveBeenCalled();
});

it('shows the server invoice segment page without inventing a page for old proposals',()=>{
 mount({invoice:true,unified:true,invoicePage:2});expect(screen.getByText('Fattura · pagina 2 dell’originale')).toBeVisible();expect(screen.queryByText('Fattura · pagina 1 dell’originale')).not.toBeInTheDocument();
});
