import {act,screen,waitFor} from '@testing-library/react';
import {useContext} from 'react';
import {expect,it,vi} from 'vitest';
import {renderApp,seededBackend,PASSWORD_A} from '../test/harness';
import {DocumentEditorContext} from './DocumentEditorContext';

const prepared=vi.hoisted(()=>vi.fn<(ids:string[],key:string)=>Promise<{id:string}>>());
const callbacks=vi.hoisted(()=>({current:null as null|{complete:(id:string)=>Promise<void>;pause:(saved?:boolean)=>void}}));
vi.mock('../intake-integration/client',()=>({IntakeClient:class{prepareExisting=prepared;}}));
vi.mock('../intake-integration/IntakeContent',()=>({IntakeContent:()=>{callbacks.current=useContext(DocumentEditorContext);return <p>Editor simulato pronto</p>;}}));
vi.mock('./PdfPreview',()=>({PdfPreview:()=> <p>Anteprima simulata</p>}));

function deferred(){
 let resolve!:(value:{id:string})=>void,reject!:(reason:Error)=>void;
 const promise=new Promise<{id:string}>((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
async function open(){
 const {backend,homeA1,homeA2,a}=seededBackend();
 const first=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'Documento iniziale'});
 const second=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'Documento successivo'});
 const other=await backend.seedDocument({homeId:homeA2.id,uploaderId:a.id,name:'Documento altra casa'});
 const app=renderApp({path:'/accedi',backend});
 await app.user.type(await screen.findByLabelText('Email'),a.email);await app.user.type(screen.getByLabelText('Password'),PASSWORD_A);
 await app.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(app.router.state.location.pathname).toBe('/case'));
 const path=(home:string,id:string)=>`/home/${home}/documenti?workflow=pending&oggetti-documento=${id}&oggetti-bozza=bozza-${id}&compila=manuale`;
 await app.router.navigate(path(homeA1.id,first.id));
 const button=await screen.findByRole('button',{name:'Riprendi compilazione'});
 prepared.mockReset();const pending=deferred();prepared.mockReturnValueOnce(pending.promise);
 await app.user.click(button);expect(button).toBeDisabled();
 return {...app,first,second,other,homeA1,homeA2,path,pending};
}

it.each([
 {target:'document',outcome:'success'}, {target:'document',outcome:'failure'},
 {target:'home',outcome:'success'}, {target:'home',outcome:'failure'},
 {target:'leave',outcome:'success'}, {target:'leave',outcome:'failure'},
])('ignores obsolete recovery after $target navigation, outcome=$outcome',async({target,outcome})=>{
 const w=await open();
 const next=target==='document'?w.path(w.homeA1.id,w.second.id):target==='home'?w.path(w.homeA2.id,w.other.id):'/case';
 await w.router.navigate(next);
 if(target==='leave')await screen.findByRole('heading',{level:1,name:'Le mie case'});
 else await screen.findByRole('heading',{level:2,name:target==='home'?w.other.name:w.second.name});
 const location=w.router.state.location.pathname+w.router.state.location.search;
 await act(async()=>{if(outcome==='success')w.pending.resolve({id:'obsolete-batch'});else w.pending.reject(new Error('obsolete recovery failure'));});
 await waitFor(()=>expect(w.router.state.location.pathname+w.router.state.location.search).toBe(location));
 expect(new URLSearchParams(w.router.state.location.search).get('lotto')).toBeNull();
 expect(screen.queryByText('Il servizio Dimora non è raggiungibile in questo momento. Riprova tra poco.')).not.toBeInTheDocument();
 expect(screen.queryByText('Editor simulato pronto')).not.toBeInTheDocument();
 expect(prepared).toHaveBeenCalledExactlyOnceWith([w.first.id],expect.any(String));
 expect(w.backend.log.filter(row=>row.method==='POST'&&/\/jobs|\/confirmations/.test(row.path))).toEqual([]);
 w.unmount();
});

it.each(['success','failure'])('a different document can recover while the old request settles with %s',async(outcome)=>{
 const w=await open();await w.router.navigate(w.path(w.homeA1.id,w.second.id));
 await screen.findByRole('heading',{level:2,name:w.second.name});
 const button=await screen.findByRole('button',{name:'Riprendi compilazione'});expect(button).toBeEnabled();
 const next=deferred();prepared.mockReturnValueOnce(next.promise);await w.user.click(button);expect(button).toBeDisabled();
 await act(async()=>{if(outcome==='success')w.pending.resolve({id:'obsolete-batch'});else w.pending.reject(new Error('old failure'));});
 expect(button).toBeDisabled();expect(new URLSearchParams(w.router.state.location.search).get('oggetti-documento')).toBe(w.second.id);
 expect(screen.queryByText('Il servizio Dimora non è raggiungibile in questo momento. Riprova tra poco.')).not.toBeInTheDocument();
 await act(async()=>next.resolve({id:'current-batch'}));await screen.findByText('Editor simulato pronto');
 expect(new URLSearchParams(w.router.state.location.search).get('lotto')).toBe('current-batch');
 expect(prepared).toHaveBeenCalledTimes(2);w.unmount();
});

it('returning to the original document does not revive the previous recovery attempt',async()=>{
 const w=await open();await w.router.navigate(w.path(w.homeA1.id,w.second.id));
 await screen.findByRole('heading',{level:2,name:w.second.name});
 await w.router.navigate(w.path(w.homeA1.id,w.first.id));await screen.findByRole('heading',{level:2,name:w.first.name});
 await act(async()=>w.pending.resolve({id:'obsolete-batch'}));
 expect(new URLSearchParams(w.router.state.location.search).get('lotto')).toBeNull();
 const button=screen.getByRole('button',{name:'Riprendi compilazione'});expect(button).toBeEnabled();
 prepared.mockResolvedValueOnce({id:'obsolete-batch'});await w.user.click(button);await screen.findByText('Editor simulato pronto');
 expect(prepared.mock.calls[1]).toEqual(prepared.mock.calls[0]);w.unmount();
});

it.each(['complete','pause'] as const)('ignores a late %s callback from the previous document',async(action)=>{
 const w=await open();await act(async()=>w.pending.resolve({id:'first-batch'}));await screen.findByText('Editor simulato pronto');
 const previous=callbacks.current!;await w.router.navigate(w.path(w.homeA1.id,w.second.id));await screen.findByRole('heading',{level:2,name:w.second.name});
 const location=w.router.state.location.pathname+w.router.state.location.search;
 await act(async()=>{if(action==='complete')await previous.complete(w.first.id);else previous.pause(true);});
 expect(w.router.state.location.pathname+w.router.state.location.search).toBe(location);expect(prepared).toHaveBeenCalledTimes(1);
 expect(screen.getByRole('button',{name:'Riprendi compilazione'})).toBeEnabled();w.unmount();
});
