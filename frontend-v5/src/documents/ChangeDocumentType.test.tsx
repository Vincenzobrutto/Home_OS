import {act,fireEvent,screen,waitFor} from '@testing-library/react';
import {beforeAll,expect,it} from 'vitest';
import {createFakeFetch,PASSWORD_A,renderApp,seededBackend} from '../test/harness';
import type {DocumentDetail,SessionResponse} from '../api/types';
import {queryKeys} from '../api/queryKeys';
import {kindCollection,type DocumentKind} from '../document-intake/model';
import type {BatchWire} from '../intake-integration/client';
import {ChangeDocumentType} from './ChangeDocumentType';
beforeAll(async()=>{await import('../routes/DocumentsPages');});

async function setup(options:{composite?:boolean;lost?:'prepare'|'confirm';denied?:boolean;revoked?:boolean;changed?:boolean;rejected?:boolean;hold?:boolean;archive?:boolean}={}){
 const {backend,a,homeA1:home,homeA2}=seededBackend(),control=createFakeFetch(backend);
 const seed=await backend.seedDocument({homeId:home.id,uploaderId:a.id,name:'Documento sintetico',workflowState:'completed'});
 let doc={...seed,sha256:'a'.repeat(64),organization:options.composite?{version:3,title:'Titolo confermato',parts:[{kind:'invoice',pageFrom:1,pageTo:2},{kind:'manual',pageFrom:3,pageTo:5}],collections:['purchases'],origin:'user_declared',updatedAt:'2026-01-01'}:null} as DocumentDetail;
 const makeBatch=():BatchWire=>({id:'type-batch',homeId:home.id,version:2,state:'open',permissions:['read','edit'],limits:{maxFiles:20,maxFileBytes:20971520,maxTotalBytes:209715200,acceptedMimeTypes:['application/pdf']},items:[{id:'type-item',clientItemId:'client',version:1,filename:'synthetic.pdf',byteSize:100,mimeType:'application/pdf',pageCount:5,uploadState:'stored',analysisState:'not_started',reviewState:'unreviewed',proposal:null,selection:null,organization:doc.organization??null,organizationVersion:doc.organization?.version??0,duplicate:null,error:null,documentLink:{state:'linked',document:{id:doc.id,name:doc.name}},permissions:['read','edit']}]});
 const batch=makeBatch(),writes:Array<{url:string;init:RequestInit}>=[],receipts=new Map<string,string>();let lost=options.lost,release=()=>{};
 const held=new Promise<void>(r=>{release=r;});
 const session=await control.fetch('/api/v5/session',{credentials:'include'}),{csrfToken}=await session.json() as {csrfToken:string};await control.fetch('/api/v5/auth/login',{method:'POST',credentials:'include',headers:{'x-csrf-token':csrfToken},body:JSON.stringify({email:a.email,password:PASSWORD_A})});
 const app=renderApp({path:options.archive?`/home/${home.id}/documenti?workflow=all`:`/home/${home.id}/type-test`,backend,homeTestRoutes:[{path:'type-test',element:<ChangeDocumentType homeId={home.id} document={doc}/>},{path:'other-type-test',element:<ChangeDocumentType homeId={homeA2.id} document={{...doc,homeId:homeA2.id}}/>}],fetch:async(url,init)=>{
  if(url.endsWith('/documents/'+doc.id)&&(!init.method||init.method==='GET'))return options.denied?Response.json({error:{code:'FORBIDDEN',message:'Accesso non consentito.'}},{status:403}):Response.json({document:doc});
  if(url.includes('/document-intake/')&&(init.method==='POST'||init.method==='PUT')){
   writes.push({url,init});const key=new Headers(init.headers).get('idempotency-key')!;
   if(url.endsWith('/from-documents')){if(options.revoked)return Response.json({error:{code:'FORBIDDEN',message:'Accesso non consentito.'}},{status:403});if(options.hold)await held;if(options.changed)doc={...doc,sha256:'b'.repeat(64)};if(lost==='prepare'){lost=undefined;throw new TypeError('response lost');}return Response.json({batch});}
   if(url.endsWith('/organizations')){
    if(receipts.has(key))expect(String(init.body)).toBe(receipts.get(key));else {
     receipts.set(key,String(init.body));
     if(!options.rejected){const selection=JSON.parse(String(init.body)).items[0].selection;doc={...doc,organization:{version:(doc.organization?.version??0)+1,title:selection.title,parts:selection.parts,collections:[...new Set((selection.parts as Array<{kind:DocumentKind}>).map(p=>kindCollection(p.kind)))],origin:'user_declared',updatedAt:'2026-01-01'}};}
    }
    if(lost==='confirm'){lost=undefined;throw new TypeError('response lost');}
    return Response.json({batch,results:{'type-item':{state:options.rejected?'rejected':'confirmed'}}});
   }
   throw Error('Unexpected write '+url);
  }
  const response=await control.fetch(url,init);
  if(response.ok&&new URL(url,'http://mock.invalid').pathname.endsWith('/documents')){const value=await response.json();return Response.json({...value,items:value.items.map((item:{id:string})=>item.id===doc.id?{...item,organization:doc.organization}:item)});}
  return response;
 }});
 await screen.findByRole('button',{name:'Correggi tipo'});return {app,writes,receipts,release,doc,home,homeA2,backend,control};
}
it('inline dropdown opens without navigation or writes; selection and cancellation do not save',async()=>{
 const {app,writes}=await setup(),path=app.router.state.location.pathname;
 await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));const select=await screen.findByLabelText('Tipo del documento');expect(select).toHaveFocus();expect(screen.getByRole('button',{name:'Salva tipo'})).toBeDisabled();fireEvent.submit(select.closest('form')!);expect(writes).toEqual([]);await app.user.selectOptions(select,'utility_bill');expect(writes).toEqual([]);await app.user.click(screen.getByRole('button',{name:'Annulla'}));expect(screen.queryByRole('combobox')).not.toBeInTheDocument();expect(app.router.state.location.pathname).toBe(path);expect(writes).toEqual([]);expect(screen.getByRole('button',{name:'Correggi tipo'})).toHaveFocus();
});
it('explicit save sends only canonical type once, preserves title and requires no expense/object/analysis calls',async()=>{
 const {app,writes,doc,backend}=await setup(),start=backend.log.length,path=app.router.state.location.pathname;
 await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));await app.user.selectOptions(await screen.findByLabelText('Tipo del documento'),'utility_bill');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));await screen.findByRole('status');await waitFor(()=>expect(screen.getByText('Tipo aggiornato.')).toBeInTheDocument());
 expect(writes.map(x=>x.url.split('/').at(-1))).toEqual(['from-documents','organizations']);const body=JSON.parse(String(writes[1]!.init.body));expect(body).toEqual({expectedVersion:2,mode:'single',items:[{itemId:'type-item',expectedVersion:1,expectedOrganizationVersion:0,replaceOrganization:false,selection:{action:'organize',title:doc.name,parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],target:{kind:'home'}}}]});expect(app.router.state.location.pathname).toBe(path);expect(backend.log.slice(start).filter(x=>x.method==='POST')).toEqual([]);
});
it('composite document has one dropdown per part and preserves confirmed title/page ranges',async()=>{
 const {app,writes}=await setup({composite:true});await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));await app.user.selectOptions(await screen.findByLabelText('Tipo della parte 1 · pagine 1–2'),'utility_bill');expect(screen.getByLabelText('Tipo della parte 2 · pagine 3–5')).toHaveValue('manual');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));await screen.findByText('Tipo aggiornato.');expect(JSON.parse(String(writes[1]!.init.body)).items[0]).toEqual({itemId:'type-item',expectedVersion:1,expectedOrganizationVersion:3,replaceOrganization:true,selection:{action:'organize',title:'Titolo confermato',parts:[{kind:'utility_bill',pageFrom:1,pageTo:2},{kind:'manual',pageFrom:3,pageTo:5}],target:{kind:'home'}}});
});
it.each(['prepare','confirm'] as const)('lost %s response retries exactly the original key/body, with selection locked',async lost=>{
 const {app,writes,receipts}=await setup({lost});await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));await app.user.selectOptions(await screen.findByLabelText('Tipo del documento'),'utility_bill');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));await screen.findByRole('alert');expect(screen.getByRole('combobox')).toBeDisabled();await app.user.click(screen.getByRole('button',{name:'Chiudi'}));await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));expect(screen.getByRole('combobox')).toHaveValue('utility_bill');await app.user.click(screen.getByRole('button',{name:'Riprova salvataggio'}));await screen.findByText('Tipo aggiornato.');const repeated=writes.filter(x=>x.url.endsWith(lost==='prepare'?'/from-documents':'/organizations'));expect(repeated).toHaveLength(2);expect(repeated[0]!.init.body).toBe(repeated[1]!.init.body);expect(new Headers(repeated[0]!.init.headers).get('idempotency-key')).toBe(new Headers(repeated[1]!.init.headers).get('idempotency-key'));expect(receipts.size).toBe(1);
});
it('permission denied never prepares or confirms and hides any prior type fields',async()=>{
 const {app,writes}=await setup({denied:true});await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));await screen.findByRole('alert');expect(screen.queryByRole('combobox')).not.toBeInTheDocument();expect(writes).toEqual([]);
});
it('access revoked after opening hides the type fields and never confirms',async()=>{
 const {app,writes}=await setup({revoked:true});await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));await app.user.selectOptions(await screen.findByLabelText('Tipo del documento'),'utility_bill');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));await screen.findByRole('alert');expect(screen.queryByRole('combobox')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Rileggi tipo'})).toBeEnabled();expect(writes).toHaveLength(1);expect(writes[0]!.url).toMatch(/from-documents$/);
});
it.each([{changed:true},{rejected:true}])('changed source or rejected decision requires reread instead of overwriting',async options=>{
 const {app,writes}=await setup(options);await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));await app.user.selectOptions(await screen.findByLabelText('Tipo del documento'),'utility_bill');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));await screen.findByRole('alert');expect(screen.getByRole('combobox')).toBeDisabled();expect(screen.getByRole('button',{name:'Rileggi tipo'})).toBeEnabled();expect(screen.queryByText('Tipo aggiornato.')).not.toBeInTheDocument();expect(writes.filter(x=>x.url.endsWith('/organizations'))).toHaveLength(options.changed?0:1);
});
it('late prepare response after changing home never starts a confirmation or contaminates another editor',async()=>{
 const {app,writes,release,home}=await setup({hold:true});await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));await app.user.selectOptions(await screen.findByLabelText('Tipo del documento'),'utility_bill');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));await waitFor(()=>expect(writes).toHaveLength(1));await act(async()=>{await app.router.navigate(`/home/${home.id}/other-type-test`);});await screen.findByRole('button',{name:'Correggi tipo'});await act(async()=>{release();await Promise.resolve();});expect(writes).toHaveLength(1);expect(screen.queryByText('Tipo aggiornato.')).not.toBeInTheDocument();expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
it('archive uses inline action without entering document detail or preparing an intake batch',async()=>{
 const {app,writes}=await setup({archive:true});const before=app.router.state.location;await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));expect(await screen.findByRole('combobox',{name:'Tipo del documento'})).toBeVisible();expect(app.router.state.location.pathname).toBe(before.pathname);expect(app.router.state.location.search).toBe(before.search);expect(writes).toEqual([]);
});
it('archive invalidates the list and shows the newly confirmed type without leaving the page',async()=>{
 const {app,writes,doc}=await setup({archive:true}),location=app.router.state.location;await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));await app.user.selectOptions(await screen.findByLabelText('Tipo del documento'),'utility_bill');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));await waitFor(()=>expect(screen.queryByText('Tipo non indicato')).not.toBeInTheDocument());expect(screen.getByText('Bolletta')).toBeVisible();expect(screen.getByRole('link',{name:'Bolletta · '+doc.originalFilename})).toBeVisible();await app.user.click(screen.getByText('Dettagli del file'));expect(screen.getByText(doc.name)).toBeVisible();expect(app.router.state.location.pathname).toBe(location.pathname);expect(app.router.state.location.search).toBe(location.search);expect(writes).toHaveLength(2);expect(JSON.parse(String(writes[1]!.init.body)).items[0].selection.title).toBe(doc.name);
});
it('account switch while prepare is pending cannot start a confirmation for the old account',async()=>{
 const {app,writes,release}=await setup({hold:true});await app.user.click(screen.getByRole('button',{name:'Correggi tipo'}));await app.user.selectOptions(await screen.findByLabelText('Tipo del documento'),'utility_bill');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));await waitFor(()=>expect(writes).toHaveLength(1));await act(async()=>{const session=app.queryClient.getQueryData<SessionResponse>(queryKeys.session)!;app.queryClient.setQueryData(queryKeys.session,{...session,account:{id:'other-account',name:'Other',email:'other@example.test'}});release();await Promise.resolve();});expect(writes).toHaveLength(1);expect(screen.queryByText('Tipo aggiornato.')).not.toBeInTheDocument();
});
