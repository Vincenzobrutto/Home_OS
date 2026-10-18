import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { it, expect, vi } from 'vitest';
import { DocumentBillEntry } from './DocumentBillEntry';
const callJson = vi.fn();
vi.mock('../session/session', () => ({ useAccount: () => ({ id: 'account' }), useApi: () => ({ callJson }) }));
function mount(data: unknown, documentId = 'bill-ready') {
  callJson.mockReset().mockResolvedValue(data);
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><DocumentBillEntry homeId="home" documentId={documentId} compact /></MemoryRouter></QueryClientProvider>);
}
it('opens the ready draft for this bill directly, using read-only requests', async () => {
  mount({ drafts: [{ id: 'draft-ready', state: 'open' }], job: null });
  expect(await screen.findByText('Spesa da confermare')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Compila manualmente' })).toBeInTheDocument();expect(screen.getByRole('button', { name: 'Compila tramite AI' })).toBeInTheDocument();
  expect(callJson).toHaveBeenCalledWith('/homes/home/object-onboarding/capabilities?documentId=bill-ready', expect.not.objectContaining({ method: 'POST' }));
});
it('does not describe the other bill as ready', async () => {
  mount({ drafts: [], job: null }, 'other-bill');
  expect(await screen.findByText('Spesa da preparare')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Compila manualmente' })).toBeInTheDocument();expect(screen.getByRole('button', { name: 'Compila tramite AI' })).toBeInTheDocument();
  expect(screen.queryByText('Spesa da confermare')).not.toBeInTheDocument();
});
it('allows resuming a running analysis without starting another', async () => {
  mount({ drafts: [], job: { state: 'running' } });
  expect(await screen.findByRole('link', { name: 'Vedi analisi in corso' })).toBeInTheDocument();
  expect(callJson).toHaveBeenCalledTimes(1);
});
it('labels an accepted proposal and keeps the detail link', async () => {
  mount({ drafts: [{ id: 'previous', state: 'confirmed' }], job: null });
  expect(await screen.findByRole('link', { name: 'Proposta accettata · Vedi dettaglio' })).toBeInTheDocument();
  expect(screen.queryByText('Spesa da confermare')).not.toBeInTheDocument();
});

it('confirmed invoice exposes the actual object and does not start another analysis', async () => {
 callJson.mockReset().mockImplementation((path:string)=>Promise.resolve(path.includes('/drafts/')?{draft:{snapshot:{documentId:'invoice'},items:[{decision:{objects:[{id:'ice',name:'Macchina ghiaccio',state:'active'}]}}]}}:{drafts:[{id:'accepted',state:'confirmed'}],job:null}));
 render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><DocumentBillEntry homeId="home" documentId="invoice" bill={false}/></MemoryRouter></QueryClientProvider>);
 expect(await screen.findByRole('link',{name:'Apri Macchina ghiaccio'})).toHaveAttribute('href','/home/home/oggetti/object/ice');
 expect(screen.queryByRole('link',{name:'Prepara oggetti e spese'})).not.toBeInTheDocument();expect(callJson.mock.calls.some(c=>c[1]?.method==='POST')).toBe(false);
});
it('does not reveal object names from a mismatched draft source',async()=>{
 callJson.mockReset().mockImplementation((path:string)=>Promise.resolve(path.includes('/drafts/')?{draft:{snapshot:{documentId:'another-document'},items:[{decision:{objects:[{id:'secret',name:'Private object',state:'active'}]}}]}}:{drafts:[{id:'bad',state:'confirmed'}],job:null}));
 render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><DocumentBillEntry homeId="home" documentId="invoice" bill={false}/></MemoryRouter></QueryClientProvider>);
 await screen.findByRole('alert');expect(screen.queryByText(/Private object/)).not.toBeInTheDocument();
});

it('archive-only documents do not ask the user to create objects or expenses',async()=>{
 callJson.mockReset().mockResolvedValue({drafts:[],job:null});
 render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><DocumentBillEntry homeId="home" documentId="ape" bill={false} allowPrepare={false}/></MemoryRouter></QueryClientProvider>);
 await screen.findByText('Documento archiviato.');expect(screen.queryByRole('link',{name:'Prepara oggetti e spese'})).not.toBeInTheDocument();
});

it.each(['invoice','receipt'])('uses the saved %s kind for accepted house expense headings',async(kind)=>{
 callJson.mockReset().mockImplementation((path:string)=>Promise.resolve(path.includes('/drafts/')?{draft:{snapshot:{documentId:'expense-doc'},items:[],houseExpenses:[{documentKind:'simple_invoice',proposedFields:{}}]}}:{drafts:[{id:'accepted',state:'confirmed'}],job:null}));
 render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><DocumentBillEntry homeId="home" documentId="expense-doc" documentKind={kind} bill={false}/></MemoryRouter></QueryClientProvider>);
 expect(await screen.findByRole('heading',{name:kind==='invoice'?'Fattura':'Ricevuta'})).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Bolletta'})).not.toBeInTheDocument();
});
