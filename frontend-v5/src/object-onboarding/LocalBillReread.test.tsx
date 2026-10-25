import {render,screen,waitFor,act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {beforeEach,expect,it,vi} from 'vitest';
import {ApiClient} from '../api/client';
import {queryKeys} from '../api/queryKeys';
import {LocalBillReread} from './LocalBillReread';
import {HouseExpenseProposal} from './HouseExpenseProposal';
import {MemoryRouter} from 'react-router';
import {localBillPdf} from './localBillPdf';
import type {Draft,HouseForm} from './model';
vi.mock('./localBillPdf',()=>({localBillPdf:vi.fn()}));
const snapshot={documentId:'doc',documentVersion:2,sha256:'a'.repeat(64)};
const form:HouseForm={candidateId:'',amount:'80',manual:true,supplier:'Nome corretto',date:'2026-09-01',category:'internet_services',mode:'link_existing',expenseId:'old',ack:false,periodFrom:'2026-08-01',periodTo:'2026-08-31',invoiceMonth:'',dueOn:'2026-09-20',title:'La mia bolletta'};
beforeEach(()=>vi.mocked(localBillPdf).mockReset().mockResolvedValue({invoiceMonth:'2026-09',supplier:'Altro nome',amount:'90'}));
function mount(){
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});client.setQueryData(queryKeys.session,{account:{id:'account'}});
 const api=new ApiClient(),source=vi.spyOn(api,'getDocument').mockResolvedValue({id:'doc',version:2,sha256:snapshot.sha256,mimeType:'application/pdf'} as unknown as Awaited<ReturnType<ApiClient['getDocument']>>);
 const download=vi.spyOn(api,'downloadDocumentFile').mockResolvedValue({blob:new Blob(['pdf'])} as Awaited<ReturnType<ApiClient['downloadDocumentFile']>>),write=vi.spyOn(api,'callJson'),apply=vi.fn();
 let current={...form},disabled=false;
 const view=()=> <QueryClientProvider client={client}><LocalBillReread api={api} accountId="account" homeId="home" snapshot={snapshot} form={current} disabled={disabled} apply={apply}/></QueryClientProvider>;
 const result=render(view());return {...result,client,api,source,download,write,apply,user:userEvent.setup(),change:()=>{current={...current,supplier:'Modifica successiva'};result.rerender(view());},disable:()=>{disabled=true;result.rerender(view());}};
}
async function preview(w:ReturnType<typeof mount>){await w.user.click(screen.getByRole('button',{name:'Rileggi localmente'}));await screen.findByRole('group',{name:'Confronta le proposte con i dati attuali'});}
it('does nothing on opening; preview has no preselection, selecting month alone applies an in-memory patch',async()=>{
 const w=mount();expect(w.source).not.toHaveBeenCalled();expect(w.download).not.toHaveBeenCalled();expect(localBillPdf).not.toHaveBeenCalled();
 await preview(w);expect(w.apply).not.toHaveBeenCalled();expect(w.write).not.toHaveBeenCalled();
 for(const box of screen.getAllByRole('checkbox'))expect(box).not.toBeChecked();
 expect(screen.getByRole('button',{name:'Applica i campi selezionati alla schermata'})).toBeDisabled();
 await w.user.click(screen.getByRole('checkbox',{name:/Mese di riferimento della fattura/}));await w.user.click(screen.getByRole('button',{name:'Applica i campi selezionati alla schermata'}));
 await waitFor(()=>expect(w.apply).toHaveBeenCalledExactlyOnceWith({invoiceMonth:'2026-09'}));
 expect(w.source).toHaveBeenCalledTimes(3);expect(w.download).toHaveBeenCalledOnce();expect(w.write).not.toHaveBeenCalled();
 expect(localBillPdf).toHaveBeenCalledWith(expect.any(Blob),snapshot.sha256,expect.any(AbortSignal));
});
it('cancels without changes and repeated reread does not create or save anything',async()=>{
 const w=mount();await preview(w);await w.user.click(screen.getByRole('checkbox',{name:/Fornitore/}));await w.user.click(screen.getByRole('button',{name:'Annulla rilettura'}));await preview(w);
 expect(screen.getByRole('checkbox',{name:/Fornitore/})).not.toBeChecked();expect(w.apply).not.toHaveBeenCalled();expect(w.write).not.toHaveBeenCalled();
});
it('changes to the form invalidate the comparison instead of overwriting user edits',async()=>{
 const w=mount();await preview(w);await w.user.click(screen.getByRole('checkbox',{name:/Fornitore/}));w.change();expect(screen.getByRole('alert')).toHaveTextContent('Hai modificato');expect(screen.getByRole('button',{name:'Applica i campi selezionati alla schermata'})).toBeDisabled();expect(w.apply).not.toHaveBeenCalled();
});
it('source replacement at apply discards comparison and preserves all current inputs',async()=>{
 const w=mount();await preview(w);await w.user.click(screen.getByRole('checkbox',{name:/Fornitore/}));w.source.mockResolvedValueOnce({id:'doc',version:3,sha256:'b'.repeat(64),mimeType:'application/pdf'} as unknown as Awaited<ReturnType<ApiClient['getDocument']>>);
 await w.user.click(screen.getByRole('button',{name:'Applica i campi selezionati alla schermata'}));await screen.findByText(/Confronto scaduto/);expect(w.apply).not.toHaveBeenCalled();expect(w.write).not.toHaveBeenCalled();
});
it('revoked source fails closed before any download',async()=>{
 const w=mount();w.source.mockRejectedValueOnce(Error('403'));await w.user.click(screen.getByRole('button',{name:'Rileggi localmente'}));await screen.findByText(/Rilettura non applicabile/);expect(w.download).not.toHaveBeenCalled();expect(w.apply).not.toHaveBeenCalled();
});
it('session change blocks application without requesting another account source',async()=>{
 const w=mount();await preview(w);await w.user.click(screen.getByRole('checkbox',{name:/Fornitore/}));w.client.setQueryData(queryKeys.session,{account:{id:'other'}});
 await w.user.click(screen.getByRole('button',{name:'Applica i campi selezionati alla schermata'}));await screen.findByText(/Confronto scaduto/);expect(w.apply).not.toHaveBeenCalled();expect(w.source).toHaveBeenCalledTimes(2);
});
it('non PDF or unrecognized original leaves existing fields unchanged',async()=>{
 const w=mount();vi.mocked(localBillPdf).mockResolvedValueOnce(null);await w.user.click(screen.getByRole('button',{name:'Rileggi localmente'}));await screen.findByText(/Nessuna proposta utilizzabile/);expect(w.apply).not.toHaveBeenCalled();
 w.source.mockResolvedValueOnce({id:'doc',version:2,sha256:snapshot.sha256,mimeType:'image/jpeg'} as unknown as Awaited<ReturnType<ApiClient['getDocument']>>);await w.user.click(screen.getByRole('button',{name:'Rileggi localmente'}));await screen.findByText(/Rilettura non applicabile/);expect(w.download).toHaveBeenCalledOnce();
});
it('unmount aborts pending local work and never applies a late result',async()=>{
 const w=mount();let resolve!:(value:{invoiceMonth:string})=>void;vi.mocked(localBillPdf).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 await w.user.click(screen.getByRole('button',{name:'Rileggi localmente'}));await waitFor(()=>expect(localBillPdf).toHaveBeenCalledOnce());const signal=vi.mocked(localBillPdf).mock.calls[0]![2];w.unmount();expect(signal.aborted).toBe(true);await act(async()=>resolve({invoiceMonth:'2026-09'}));expect(w.apply).not.toHaveBeenCalled();expect(w.source).toHaveBeenCalledTimes(1);
});
it('disable during a pending read discards the late response',async()=>{
 const w=mount();let resolve!:(value:{invoiceMonth:string})=>void;vi.mocked(localBillPdf).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 await w.user.click(screen.getByRole('button',{name:'Rileggi localmente'}));await waitFor(()=>expect(localBillPdf).toHaveBeenCalledOnce());w.disable();await act(async()=>resolve({invoiceMonth:'2026-09'}));
 await screen.findByText(/Rilettura non applicabile/);expect(screen.queryByRole('group',{name:'Confronta le proposte con i dati attuali'})).not.toBeInTheDocument();expect(w.apply).not.toHaveBeenCalled();
});
it('rechecks source after parsing, not only before download',async()=>{
 const w=mount();w.source.mockResolvedValueOnce({id:'doc',version:2,sha256:snapshot.sha256,mimeType:'application/pdf'} as unknown as Awaited<ReturnType<ApiClient['getDocument']>>).mockRejectedValueOnce(Error('revoked'));
 await w.user.click(screen.getByRole('button',{name:'Rileggi localmente'}));await screen.findByText(/Rilettura non applicabile/);expect(w.download).toHaveBeenCalledOnce();expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();expect(w.apply).not.toHaveBeenCalled();
});
it('edits made while reading cannot be replaced by the late comparison',async()=>{
 const w=mount();let resolve!:(value:{invoiceMonth:string})=>void;vi.mocked(localBillPdf).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 await w.user.click(screen.getByRole('button',{name:'Rileggi localmente'}));await waitFor(()=>expect(localBillPdf).toHaveBeenCalledOnce());w.change();await act(async()=>resolve({invoiceMonth:'2026-09'}));await screen.findByText(/Rilettura non applicabile/);expect(w.apply).not.toHaveBeenCalled();
});
it('applies inside the expense form without confirming, linking, saving, or changing its mode',async()=>{
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});client.setQueryData(queryKeys.session,{account:{id:'account'}});
 const fetch=vi.fn(async()=>Response.json({items:[{id:'old',title:'Esistente',amountCents:8000,spentOn:'2026-09-01',version:1,rank:2}],nextCursor:null})),api=new ApiClient({fetch});
 vi.spyOn(api,'getDocument').mockResolvedValue({id:'doc',version:2,sha256:snapshot.sha256,mimeType:'application/pdf'} as unknown as Awaited<ReturnType<ApiClient['getDocument']>>);vi.spyOn(api,'downloadDocumentFile').mockResolvedValue({blob:new Blob(['pdf'])} as Awaited<ReturnType<ApiClient['downloadDocumentFile']>>);
 const confirm=vi.fn(),onReview=vi.fn(),draft={id:'draft',version:4,state:'open',mode:'manual',snapshot,items:[],review:null} as unknown as Draft;
 render(<QueryClientProvider client={client}><MemoryRouter><HouseExpenseProposal item={{id:'bill',documentKind:'utility_bill',decision:null,amountCandidates:[],amountSelectionRequired:true,proposedFields:{}}} draft={draft} api={api} accountId="account" base="/homes/home/object-onboarding" root="/home/home" disabled={false} beforeDocument unified savedForm={form} confirm={confirm} onReview={onReview}/></MemoryRouter></QueryClientProvider>);
 const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Rileggi localmente'}));await user.click(await screen.findByRole('checkbox',{name:/Mese di riferimento della fattura/}));await user.click(screen.getByRole('button',{name:'Applica i campi selezionati alla schermata'}));
 await waitFor(()=>expect(onReview).toHaveBeenLastCalledWith(expect.objectContaining({form:expect.objectContaining({...form,invoiceMonth:'2026-09'})})));
 expect(confirm).not.toHaveBeenCalled();for(const [,init] of fetch.mock.calls as unknown as [unknown,RequestInit?][])expect(init?.method??'GET').toBe('GET');
});
it('explicit service interval replacement switches the real period editor out of the previous monthly mode',async()=>{
 vi.mocked(localBillPdf).mockResolvedValueOnce({competenceFrom:'2026-09-03',competenceTo:'2026-10-15'});
 const client=new QueryClient();client.setQueryData(queryKeys.session,{account:{id:'account'}});
 const api=new ApiClient({fetch:async()=>Response.json({items:[],nextCursor:null})});
 vi.spyOn(api,'getDocument').mockResolvedValue({id:'doc',version:2,sha256:snapshot.sha256,mimeType:'application/pdf'} as unknown as Awaited<ReturnType<ApiClient['getDocument']>>);vi.spyOn(api,'downloadDocumentFile').mockResolvedValue({blob:new Blob(['pdf'])} as Awaited<ReturnType<ApiClient['downloadDocumentFile']>>);
 const confirm=vi.fn(),onReview=vi.fn(),draft={id:'draft',version:4,state:'open',mode:'manual',snapshot,items:[],review:null} as unknown as Draft;
 render(<QueryClientProvider client={client}><MemoryRouter><HouseExpenseProposal item={{id:'bill',documentKind:'utility_bill',decision:null,amountCandidates:[],amountSelectionRequired:true,proposedFields:{}}} draft={draft} api={api} accountId="account" base="/homes/home/object-onboarding" root="/home/home" disabled={false} beforeDocument unified savedForm={{...form,mode:'create',expenseId:''}} confirm={confirm} onReview={onReview}/></MemoryRouter></QueryClientProvider>);
 const user=userEvent.setup();expect(screen.getByLabelText('Mese dei servizi')).toHaveValue('2026-08');await user.click(screen.getByRole('button',{name:'Rileggi localmente'}));await user.click(await screen.findByRole('checkbox',{name:/Periodo dei servizi/}));await user.click(screen.getByRole('button',{name:'Applica i campi selezionati alla schermata'}));
 await waitFor(()=>expect(screen.getByLabelText('Dal')).toHaveValue('2026-09-03'));expect(screen.getByLabelText('Al')).toHaveValue('2026-10-15');expect(screen.getByRole('radio',{name:'Un intervallo'})).toBeChecked();expect(screen.getByLabelText('Mese di riferimento della fattura')).toHaveValue('');expect(confirm).not.toHaveBeenCalled();
});
