import {screen,waitFor,within} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {renderApp,seededBackend,PASSWORD_A} from '../test/harness';
const prepared=vi.hoisted(()=>vi.fn(async()=>({id:'recovered-batch'})));
vi.mock('../intake-integration/client',()=>({IntakeClient:class{prepareExisting=prepared;}}));
vi.mock('../intake-integration/IntakeContent',()=>({IntakeContent:()=> <p>Compilazione recuperata</p>}));
vi.mock('./PdfPreview',()=>({PdfPreview:()=> <p>Anteprima locale</p>}));
async function open(extra:string,privateOther=false){
 const {backend,homeA1,a,b}=seededBackend();
 const doc=await backend.seedDocument({homeId:homeA1.id,uploaderId:privateOther?b.id:a.id,name:'Documento recuperabile'});
 const app=renderApp({path:'/accedi',backend});
 await app.user.type(await screen.findByLabelText('Email'),a.email);await app.user.type(screen.getByLabelText('Password'),PASSWORD_A);
 await app.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(app.router.state.location.pathname).toBe('/case'));
 prepared.mockClear();await app.router.navigate(`/home/${homeA1.id}/documenti?workflow=pending&oggetti-documento=${doc.id}&${extra}`);
 return {...app,doc};
}
it.each(['compila=manuale&oggetti-bozza=chosen&vista-compilazione=unica','compila=ai&oggetti-analisi=existing-job'])('recovers only after an explicit action and preserves %s',async(extra)=>{
 const app=await open(extra),previous=new URLSearchParams(app.router.state.location.search);
 expect(await screen.findByRole('button',{name:'Riprendi compilazione'})).toBeEnabled();expect(prepared).not.toHaveBeenCalled();
 expect(screen.queryByRole('button',{name:'Scegli file'})).not.toBeInTheDocument();
 await app.user.click(screen.getByRole('button',{name:'Riprendi compilazione'}));await screen.findByText('Compilazione recuperata');
 const next=new URLSearchParams(app.router.state.location.search);for(const [key,value] of previous)expect(next.get(key)).toBe(value);
 expect(next.get('lotto')).toBe('recovered-batch');expect(prepared).toHaveBeenCalledExactlyOnceWith([app.doc.id],expect.any(String));
 expect(app.backend.log.filter(row=>row.method==='POST'&&/\/jobs|\/confirmations/.test(row.path))).toEqual([]);
});
it('retains the same recovery key and location after a failed preparation',async()=>{
 const app=await open('compila=manuale&oggetti-bozza=chosen');
 prepared.mockRejectedValueOnce(new Error('offline preparation'));
 const button=await screen.findByRole('button',{name:'Riprendi compilazione'});await app.user.click(button);await screen.findByText('Il servizio Dimora non è raggiungibile in questo momento. Riprova tra poco.');
 expect(new URLSearchParams(app.router.state.location.search).get('lotto')).toBeNull();expect(screen.queryByText('Compilazione recuperata')).not.toBeInTheDocument();
 const first=prepared.mock.calls[0];await app.user.click(button);await screen.findByText('Compilazione recuperata');expect(prepared.mock.calls[1]).toEqual(first);
});
it('does not offer recovery or reveal a private source belonging to another user',async()=>{
 const app=await open('compila=manuale&oggetti-bozza=chosen',true);
 await within(await screen.findByRole('region',{name:'Scheda del documento'})).findByText('Accesso non consentito.');expect(prepared).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Riprendi compilazione'})).not.toBeInTheDocument();
 expect(screen.queryByText(app.doc.name)).not.toBeInTheDocument();expect(screen.queryByText('Compilazione recuperata')).not.toBeInTheDocument();
});
