import {useContext} from 'react';
import {act,screen,waitFor,within} from '@testing-library/react';
import {useSearchParams} from 'react-router';
import {expect,it,vi} from 'vitest';
import {DocumentEditorContext} from './DocumentEditorContext';
import {renderApp,seededBackend,PASSWORD_A} from '../test/harness';
const prepared=vi.hoisted(()=>vi.fn(async()=>({id:'prepared-batch'})));
vi.mock('../intake-integration/client',()=>({IntakeClient:class{prepareExisting=prepared;}}));
vi.mock('../intake-integration/IntakeContent',()=>({IntakeContent:()=>{const editor=useContext(DocumentEditorContext),[params]=useSearchParams();if(!editor)return <p>Caricamento pronto</p>;return <><label>Dato di prova<input/></label><button onClick={()=>void editor!.complete(params.get('oggetti-documento')!)}>Conferma bozza server</button><button onClick={()=>editor!.pause()}>Esci senza salvare</button><button onClick={()=>editor!.pause(true)}>Bozza salvata sul server</button></>;}}));
vi.mock('./PdfPreview',()=>({PdfPreview:()=> <p>Anteprima locale</p>}));
it('preserves filters, guards unsaved changes and selects the next source only after successful confirmation',async()=>{
 const {backend,homeA1,a}=seededBackend();
 const first=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'Workspace A',workflowState:'to_compile'});
 const second=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'Workspace B',workflowState:'review'});
 const app=renderApp({path:'/accedi',backend});await app.user.type(await screen.findByLabelText('Email'),a.email);await app.user.type(screen.getByLabelText('Password'),PASSWORD_A);await app.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(app.router.state.location.pathname).toBe('/case'));
 await app.router.navigate(`/home/${homeA1.id}/documenti?q=Workspace&oggetti-documento=${first.id}&lotto=old&oggetti-bozza=old-draft&compila=manuale`);
 const queue=await screen.findByRole('navigation',{name:'Coda dei documenti'});expect(queue).toBeVisible();await app.user.type(await screen.findByLabelText('Dato di prova'),'modifica');
 await app.user.click(screen.getByRole('button',{name:'Originale'}));await app.user.click(screen.getByRole('button',{name:'Compila'}));expect(screen.getByLabelText('Dato di prova')).toHaveValue('modifica');
 const guard=vi.spyOn(window,'confirm').mockReturnValue(false);
 await app.user.click(screen.getByRole('button',{name:/Workspace B Stato/}));expect(guard).toHaveBeenCalled();expect(prepared).not.toHaveBeenCalled();expect(app.router.state.location.search).toContain(first.id);
 await app.user.click(screen.getByRole('button',{name:'Conferma bozza server'}));await waitFor(()=>expect(app.router.state.location.search).toContain(second.id));expect(prepared).toHaveBeenCalledWith([second.id],expect.any(String));expect(app.router.state.location.search).toContain('q=Workspace');expect(app.router.state.location.search).not.toContain('old-draft');expect(guard).toHaveBeenCalledTimes(1);
 await app.user.click(await screen.findByRole('button',{name:'Aggiungi file'}));await screen.findByText('Caricamento pronto');expect(screen.getByRole('button',{name:'Aggiungi documenti'})).toHaveAttribute('aria-expanded','true');await app.user.click(screen.getByRole('button',{name:'Chiudi caricamento'}));await waitFor(()=>expect(app.router.state.location.search).not.toContain('oggetti-documento'));expect(app.router.state.location.search).toContain('q=Workspace');expect(backend.log.some(row=>row.method==='POST'&&row.path.endsWith('/jobs'))).toBe(false);guard.mockRestore();
});

async function editedWorkspace() {
 const {backend,homeA1,a}=seededBackend();
 const first=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'Guard A',workflowState:'to_compile'});
 const second=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'Guard B',workflowState:'to_compile'});
 const app=renderApp({path:'/accedi',backend});
 await app.user.type(await screen.findByLabelText('Email'),a.email);await app.user.type(screen.getByLabelText('Password'),PASSWORD_A);
 await app.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(app.router.state.location.pathname).toBe('/case'));
 await app.router.navigate(`/home/${homeA1.id}/spese`);
 await app.router.navigate(`/home/${homeA1.id}/documenti?oggetti-documento=${first.id}&lotto=guard&compila=manuale&q=Guard`);
 await app.user.type(await screen.findByLabelText('Dato di prova'),'Da conservare');
 prepared.mockClear();
 return {...app,homeId:homeA1.id,first,second};
}
it('keeps the explicit upload order and progress despite archive filters and a reverse server order',async()=>{
 const app=await editedWorkspace(),guard=vi.spyOn(window,'confirm').mockReturnValue(true),order=[app.second.id,app.first.id];
 await app.router.navigate(`/home/${app.homeId}/documenti?oggetti-documento=${app.second.id}&lotto=ordered&compila=manuale&q=not-a-match&coda=${order.join(',')}`);
 await screen.findByRole('button',{name:/1\. Guard B/});expect(screen.getByText('Documento 1 di 2')).toBeInTheDocument();
 await app.user.click(screen.getByRole('button',{name:'Conferma bozza server'}));await waitFor(()=>expect(prepared).toHaveBeenLastCalledWith([app.first.id],expect.any(String)));
 expect(new URLSearchParams(app.router.state.location.search).get('coda')).toBe(order.join(','));expect(new URLSearchParams(app.router.state.location.search).get('q')).toBe('not-a-match');
 expect(await screen.findByText('Documento 2 di 2')).toBeInTheDocument();guard.mockRestore();
});

it.each(['menu','history','return','pause'] as const)('guards %s exits once, preserves edits on cancel, and continues only on confirmation',async(kind)=>{
 const app=await editedWorkspace();
 const guard=vi.spyOn(window,'confirm').mockReturnValue(false);
 const exit=async()=>{
  if(kind==='menu')await app.user.click(screen.getAllByRole('link',{name:'Spese'})[0]!);
  else if(kind==='history')await act(async()=>{await app.router.navigate(-1);});
  else await app.user.click(screen.getByRole('button',{name:kind==='return'?'Torna a Documenti':'Esci senza salvare'}));
 };
 await exit();
 await waitFor(()=>expect(guard).toHaveBeenCalledTimes(1));
 expect(guard).toHaveBeenLastCalledWith('Le modifiche non salvate saranno scartate. Vuoi lasciare questa scheda?');
 expect(screen.getByLabelText('Dato di prova')).toHaveValue('Da conservare');
 expect(app.router.state.location.search).toContain(app.first.id);
 guard.mockReturnValue(true);await exit();
 await waitFor(()=>expect(app.router.state.location.search).not.toContain('oggetti-documento'));
 expect(guard).toHaveBeenCalledTimes(2);
 expect(prepared).not.toHaveBeenCalled();
 expect(app.backend.log.some(row=>row.method==='POST'&&/\/jobs|\/confirmations/.test(row.path))).toBe(false);
});

it('guards a source change before preparing it, does not ask twice, and retains the native reload guard',async()=>{
 const app=await editedWorkspace();
 const beforeUnload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(beforeUnload);expect(beforeUnload.defaultPrevented).toBe(true);
 const guard=vi.spyOn(window,'confirm').mockReturnValue(false);
 await app.user.selectOptions(screen.getByLabelText('Documento da completare'),app.second.id);
 expect(guard).toHaveBeenCalledTimes(1);expect(prepared).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Dato di prova')).toHaveValue('Da conservare');
 guard.mockReturnValue(true);
 await app.user.selectOptions(screen.getByLabelText('Documento da completare'),app.second.id);
 await waitFor(()=>expect(app.router.state.location.search).toContain(app.second.id));
 expect(guard).toHaveBeenCalledTimes(2);expect(prepared).toHaveBeenCalledTimes(1);
 const cleanUnload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(cleanUnload);expect(cleanUnload.defaultPrevented).toBe(false);
 await app.user.click(await screen.findByRole('button',{name:'Torna a Documenti'}));
 await waitFor(()=>expect(app.router.state.location.search).not.toContain('oggetti-documento'));
 expect(guard).toHaveBeenCalledTimes(2);
});


it('preserves edits during same-document draft metadata updates without an exit prompt',async()=>{
 const app=await editedWorkspace();
 const guard=vi.spyOn(window,'confirm').mockReturnValue(false);
 const next=new URLSearchParams(app.router.state.location.search);next.set('oggetti-bozza','ai-result');
 await act(async()=>{await app.router.navigate(app.router.state.location.pathname+'?'+next);});
 expect(guard).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Dato di prova')).toHaveValue('Da conservare');
 expect(app.router.state.location.search).toContain('ai-result');
 const beforeUnload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(beforeUnload);expect(beforeUnload.defaultPrevented).toBe(true);
 guard.mockRestore();
});


it('the mobile section menu preserves dirty edits when navigation is cancelled',async()=>{
 const app=await editedWorkspace();const guard=vi.spyOn(window,'confirm').mockReturnValue(false);
 await app.user.click(screen.getByRole('button',{name:'Menu'}));await app.user.click(within(screen.getByRole('dialog',{name:'Menu'})).getByRole('link',{name:'Spese'}));
 await waitFor(()=>expect(guard).toHaveBeenCalledTimes(1));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByLabelText('Dato di prova')).toHaveValue('Da conservare');expect(app.router.state.location.search).toContain(app.first.id);
 guard.mockReturnValue(true);await app.user.click(screen.getByRole('button',{name:'Menu'}));await app.user.click(within(screen.getByRole('dialog',{name:'Menu'})).getByRole('link',{name:'Spese'}));
 await waitFor(()=>expect(app.router.state.location.pathname).toBe('/home/'+app.homeId+'/spese'));expect(guard).toHaveBeenCalledTimes(2);expect(prepared).not.toHaveBeenCalled();guard.mockRestore();
});

it('clears dirty state only after the explicit acknowledged draft-save exit',async()=>{
 const app=await editedWorkspace();const guard=vi.spyOn(window,'confirm').mockReturnValue(false);
 await app.user.click(screen.getByRole('button',{name:'Bozza salvata sul server'}));await waitFor(()=>expect(app.router.state.location.search).not.toContain('oggetti-documento'));expect(guard).not.toHaveBeenCalled();expect(app.router.state.location.search).toContain('q=Guard');guard.mockRestore();
});
