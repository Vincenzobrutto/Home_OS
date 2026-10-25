import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {expect,it,vi} from 'vitest';
import {ApiClient} from '../api/client';
import {CompilationSteps} from './CompilationSteps';
import type {Draft} from './model';

const draft:Draft={id:'keyboard-draft',version:1,state:'open',mode:'manual',documentKind:'house_document',snapshot:{documentId:'doc',documentVersion:1,sha256:'a'.repeat(64)},document:null,items:[],needsReview:false,purchaseTotal:null,review:null,permissions:['read','edit']};
function world(problem?:string){
 const save=vi.fn(),saveDraft=vi.fn(),user=userEvent.setup();
 render(<MemoryRouter><CompilationSteps api={new ApiClient({fetch:async()=>{throw Error('No network allowed');}})} draft={draft} forms={{}} accountId="mock" base="/mock" root="/home/mock" disabled={false} documentOnly documentProblem={problem} documentFields={<label>Titolo di prova<input defaultValue="Dato da conservare"/></label>} change={vi.fn()} save={save} saveDraft={saveDraft} defer={vi.fn()} add={vi.fn()} enrich={vi.fn()}/></MemoryRouter>);
 return {save,saveDraft,user};
}
async function tabTo(user:ReturnType<typeof userEvent.setup>,target:HTMLElement){
 for(let i=0;i<12&&document.activeElement!==target;i++)await user.tab();
 expect(target).toHaveFocus();
}
it('keyboard navigation focuses each step, skips hidden inputs and saves only after explicit final activation',async()=>{
 const w=world();expect(screen.getByRole('heading',{level:2,name:'Documento'})).toHaveFocus();
 expect(screen.getByRole('button',{name:'2. Riepilogo'})).toBeDisabled();
 await tabTo(w.user,screen.getByRole('button',{name:'Avanti'}));await w.user.keyboard('{Enter}');
 expect(screen.getByRole('heading',{level:2,name:'Riepilogo'})).toHaveFocus();
 expect(screen.getByRole('button',{name:'2. Riepilogo'})).toHaveAttribute('aria-current','step');
 const field=screen.getByLabelText('Titolo di prova');expect(field).not.toBeVisible();expect(field.closest('[hidden]')).toHaveAttribute('inert');
 for(let i=0;i<5;i++){await w.user.tab();expect(field).not.toHaveFocus();}
 expect(w.save).not.toHaveBeenCalled();expect(w.saveDraft).not.toHaveBeenCalled();
 screen.getByRole('button',{name:'Indietro'}).focus();await w.user.keyboard(' ');
 expect(screen.getByRole('heading',{level:2,name:'Documento'})).toHaveFocus();expect(field).toHaveValue('Dato da conservare');
 await tabTo(w.user,screen.getByRole('button',{name:'Avanti'}));await w.user.keyboard('{Enter}');
 await tabTo(w.user,screen.getByRole('button',{name:'Salva documento'}));await w.user.keyboard('{Enter}');
 expect(w.save).toHaveBeenCalledTimes(1);expect(w.saveDraft).not.toHaveBeenCalled();
});
it('keyboard advancement announces missing data without advancing or confirming; draft remains a separate action',async()=>{
 const w=world('Indica il titolo del documento.');await tabTo(w.user,screen.getByRole('button',{name:'Avanti'}));await w.user.keyboard('{Enter}');
 expect(screen.getByRole('alert')).toHaveTextContent('Indica il titolo del documento.');expect(screen.getByRole('heading',{level:2,name:'Documento'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Salva documento'})).not.toBeInTheDocument();expect(w.save).not.toHaveBeenCalled();
 screen.getByRole('button',{name:'Salva bozza ed esci'}).focus();await w.user.keyboard('{Enter}');
 expect(w.saveDraft).toHaveBeenCalledTimes(1);expect(w.save).not.toHaveBeenCalled();
});
