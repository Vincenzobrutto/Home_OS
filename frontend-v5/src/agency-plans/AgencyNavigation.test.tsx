import {screen,fireEvent,waitFor,within} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import {renderApp} from '../test/harness';
import type {FetchLike} from '../api/client';
import type {PlansResponse} from './api';
import {emptyProfile} from './journey';
vi.mock('./pdfPageCount',()=>({pdfPageCount:(blob:Blob)=>Promise.resolve(blob.size)}));
vi.mock('../documents/PdfPreview',()=>({PdfPreview:()=>null}));
const account={id:'account-a',name:'Agent DEMO',email:'agent@example.test'};
function fixture(opts:{enabled?:boolean;seeded?:boolean;pdfPages?:number;secondPlan?:boolean;planReady?:boolean;loggedIn?:boolean;dropUpload?:boolean;dropAnalysis?:boolean;kind?:string;canEdit?:boolean;dropClassification?:boolean;rejectClassification?:number}={}){
 let revision=3,uploaded=opts.seeded??false,documentKind=opts.kind??(opts.seeded?'floor_plan':'unclassified'),ready=opts.planReady??false,uploadDropped=false,analysisDropped=false,classificationDropped=false,classificationRejected=false;
 let classificationReceipt:{key:string|null;body:unknown}|null=null;
 const calls:Array<{path:string;method:string;key:string|null;body:unknown}>=[],agencies=[{id:'g',name:'Agenzia DEMO',role:'admin'}];
 const plan={id:'plan',version:1,status:'draft',proof:{sourceId:'s',version:1,sha256:'a'.repeat(64),page:1},rasterSize:{width:200,height:200},geometryRevision:1,rooms:[{id:'room',label:'Vano',points:[[30,30],[170,30],[170,170],[30,170]] as [number,number][],holes:[]}],mainPerimeter:null,issues:opts.planReady?Array.from({length:6},(_,i)=>({id:'issue-'+i,code:'seed_region_unresolved'})):[]};
 const result=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
 const practice=()=>({id:'p',label:'Pratica DEMO',revision,documents:[...(uploaded?[{id:'s',filename:opts.pdfPages?'plan.pdf':'plan.png',kind:documentKind,visibility:'private',version:1,mimeType:opts.pdfPages?'application/pdf':'image/png',sha256:'a'.repeat(64)}]:[]),...(opts.secondPlan?[{id:'garage',filename:'garage.pdf',kind:'floor_plan',visibility:'private',version:2,mimeType:'application/pdf',sha256:'b'.repeat(64)}]:[])]});
 const plans=():PlansResponse=>({revision,plans:ready?[structuredClone(plan)]:[]});
 const fetch:FetchLike=async(url,init)=>{const path=url.replace('/api/v5',''),method=init.method||'GET',headers=new Headers(init.headers),body=typeof init.body==='string'?JSON.parse(init.body):init.body;calls.push({path,method,key:headers.get('idempotency-key'),body});
  if(path==='/session')return result({account:opts.loggedIn===false?null:account,csrfToken:'C'.repeat(43)});
  if(path==='/agency-capabilities')return result({enabled:opts.enabled!==false});
  if(path==='/agencies'&&method==='GET')return result({agencies});
  if(path==='/agencies'&&method==='POST')return result({agency:agencies[0]},201);
  if(path==='/agencies/g/practices'&&method==='GET')return result({practices:[{id:'p',label:'Pratica DEMO'}],nextAfter:null});
  if(path==='/agencies/g/practices'&&method==='POST')return result({practice:practice()},201);
  if(path==='/agencies/g/practices/p')return result(practice());
  if(path.endsWith('/journey'))return result({revision,profileStale:false,state:{profile:emptyProfile(),mandateSourceId:null,mandateVersion:null,stage:'preparation',listing:{title:'',description:''},transaction:{buyer:'',offerPrice:'',outcome:'',mortgage:'',notary:'',closingDate:'',tasks:''},checklist:{answers:{},custom:[],assignments:{},waiting:[]}}});
  if(path.endsWith('/analysis-options'))return result({available:true,enabled:true,budgetAvailable:true,canEdit:opts.canEdit!==false,capMicros:250000,priceVersion:'sonnet-5-5-standard-20261030'});
  if(path.endsWith('/analysis-jobs')&&method==='GET')return result({revision,jobs:ready?[{id:'plan',status:'completed',spentMicros:140,capMicros:250000}]:[]});
  if(path.endsWith('/analysis-jobs')&&method==='POST'){if(opts.dropAnalysis&&!analysisDropped){analysisDropped=true;throw Error('lost response');}ready=true;revision++;return result({id:'plan',status:'queued'},201);}
  if(path.endsWith('/sources')&&method==='POST'){if(opts.dropUpload&&!uploadDropped){uploadDropped=true;throw Error('lost response');}uploaded=true;revision++;return result({practice:practice()},201);}
  if(path.endsWith('/classification')&&method==='POST'){if(opts.rejectClassification&&!classificationRejected){classificationRejected=true;return result({error:{code:opts.rejectClassification===409?'revision_conflict':opts.rejectClassification===403?'access_denied':'invalid_input',message:'Classification rejected'}},opts.rejectClassification);}if(classificationReceipt){if(classificationReceipt.key!==headers.get('idempotency-key')||JSON.stringify(classificationReceipt.body)!==JSON.stringify(body))return result({error:{code:'idempotency_conflict',message:'Different request'}},409);}else{if(body.expectedRevision!==revision||body.expectedSourceVersion!==1)return result({error:{code:'revision_conflict',message:'Stale source'}},409);classificationReceipt={key:headers.get('idempotency-key'),body};documentKind=body.kind;revision++;}if(opts.dropClassification&&!classificationDropped){classificationDropped=true;throw Error('lost classification response');}return result({practice:practice()},201);}
  if(path.endsWith('/plans'))return result(plans());
  if(path.includes('/file?'))return new Response('x'.repeat(path.includes('/garage/')?3:opts.pdfPages??1),{headers:{'content-type':'application/pdf'}});
  if(path.endsWith('/image'))return new Response(new Blob(['synthetic PNG'],{type:'image/png'}),{headers:{'content-type':'image/png'}});
  return result({error:{code:'not_found',message:'Unexpected mock request '+path}},404);
 };return {fetch,calls};
}
describe('real routes wired to agency API client (mock transport only)',()=>{
 it('recommends the plan that needs review and returns to the practice overview',async()=>{
  const f=fixture({seeded:true,planReady:true});
  const {user,router}=renderApp({path:'/agenzie/g/pratiche/p',fetch:f.fetch});
  expect(await screen.findByRole('heading',{name:'Sistemare la planimetria'})).toBeVisible();
  expect(screen.getByText('1 vano salvato · 6 verifiche aperte.')).toBeVisible();
  expect(screen.queryByRole('heading',{name:'Documenti della pratica'})).toBeNull();
  await user.click(screen.getByRole('link',{name:'Vai alla planimetria'}));
  expect(router.state.location.search).toBe('?area=planimetria');
  expect(await screen.findByRole('button',{name:'Aggiungi vano'})).toBeVisible();
  await user.click(screen.getByRole('link',{name:'Panoramica'}));
  expect(screen.getByRole('heading',{name:'Sistemare la planimetria'})).toBeVisible();
  expect(f.calls.filter(call=>call.method==='POST')).toHaveLength(0);
 });
 it('anonymous deep link uses login guard',async()=>{const f=fixture({loggedIn:false}),app=renderApp({path:'/agenzie/g/pratiche/p',fetch:f.fetch});await screen.findByRole('heading',{name:'Accedi'});expect(app.router.state.location.search).toContain(encodeURIComponent('/agenzie/g/pratiche/p'));expect(f.calls.some(c=>c.path.includes('/practices'))).toBe(false);});
 it('unconfigured environment is explicit and never supplies fake practice data',async()=>{const f=fixture({enabled:false});renderApp({path:'/agenzie',fetch:f.fetch});expect(await screen.findByText(/Area Agenzie non configurata/)).toBeInTheDocument();expect(screen.queryByText('Pratica DEMO')).not.toBeInTheDocument();expect(f.calls.filter(c=>c.method==='POST')).toHaveLength(0);});
 it('navigates agency -> practices -> complete practice screen without activating AI on entry',async()=>{const f=fixture(),app=renderApp({path:'/agenzie',fetch:f.fetch});await app.user.click(await screen.findByRole('link',{name:'Agenzia DEMO'}));await app.user.click(await screen.findByRole('link',{name:'Pratica DEMO'}));await app.user.click(await screen.findByRole('link',{name:'Apri il fascicolo'}));expect(await screen.findByRole('heading',{name:'Documenti della pratica'})).toBeInTheDocument();expect(app.router.state.location.pathname).toBe('/agenzie/g/pratiche/p');expect(f.calls.filter(c=>c.method==='POST')).toHaveLength(0);});
 it('upload, explicit classification, consent and opening analysis expose both views',async()=>{const f=fixture(),app=renderApp({path:'/agenzie/g/pratiche/p?area=fascicolo',fetch:f.fetch});const input=await screen.findByLabelText('Documento PDF o PNG');await app.user.upload(input,new File(['synthetic'], 'plan.png',{type:'image/png'}));await app.user.click(screen.getByRole('button',{name:'Carica documento nella pratica'}));await app.user.selectOptions(await screen.findByLabelText('Tipo di documento per plan.png'),'floor_plan');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));await app.user.click(screen.getByRole('link',{name:'Planimetria'}));expect(await screen.findByText(/plan.png · v1/)).toBeVisible();expect(screen.queryByRole('combobox',{name:'Documento'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Analizza planimetria'})).toBeDisabled();await app.user.click(screen.getByLabelText(/Autorizzo l’analisi/));await app.user.click(screen.getByRole('button',{name:'Analizza planimetria'}));const analysis = await screen.findByText('Analisi del documento');if(!analysis.closest('details')?.open)await app.user.click(analysis);await app.user.click(await screen.findByRole('button',{name:'Apri risultato dell’analisi'}));expect(await screen.findByRole('img',{name:'Contorni dei singoli vani'})).toBeInTheDocument();await app.user.click(screen.getByRole('button',{name:'Calcola superfici'}));await app.user.click(await screen.findByRole('button',{name:'Misura due punti sulla mappa'}));const scaleDialog=screen.getByRole('dialog');expect(scaleDialog).toHaveTextContent('Indica i due estremi sul documento');for(const x of ['10','110']){await app.user.clear(screen.getByLabelText('Nuovo vertice X'));await app.user.clear(screen.getByLabelText('Nuovo vertice Y'));await app.user.type(screen.getByLabelText('Nuovo vertice X'),x);await app.user.type(screen.getByLabelText('Nuovo vertice Y'),'10');await app.user.click(screen.getByRole('button',{name:'Aggiungi vertice'}));}await app.user.click(screen.getByRole('button',{name:'Usa questi estremi'}));await app.user.type(await screen.findByLabelText('Lunghezza reale tra i due punti (m)'),'10');expect(screen.getByRole('table',{name:'Superfici dei vani'})).toHaveTextContent('196,0 m²');expect(screen.getByRole('button',{name:'Disegna perimetro lordo'})).toBeInTheDocument();expect(screen.queryByRole('tab')).not.toBeInTheDocument();await app.user.click(screen.getByText('Impostazioni avanzate · facoltative'));expect(await screen.findByLabelText('Versione criterio adottato')).toBeInTheDocument();const start=f.calls.find(c=>c.path.endsWith('/analysis-jobs')&&c.method==='POST')!;expect(start.body).toMatchObject({sourceId:'s',approved:true,page:1});expect(start.key).toBeTruthy();});
 it('uncertain upload freezes file choice and reuses exact multipart payload/key',async()=>{const f=fixture({dropUpload:true}),app=renderApp({path:'/agenzie/g/pratiche/p?area=fascicolo',fetch:f.fetch});const input=await screen.findByLabelText('Documento PDF o PNG');await app.user.upload(input,new File(['synthetic'],'plan.png',{type:'image/png'}));await app.user.click(screen.getByRole('button',{name:'Carica documento nella pratica'}));const retry=await screen.findByRole('button',{name:'Riprova lo stesso caricamento'});expect(input).toBeDisabled();await app.user.click(retry);await screen.findByLabelText('Tipo di documento per plan.png');const uploads=f.calls.filter(c=>c.path.endsWith('/sources')&&c.method==='POST');expect(uploads).toHaveLength(2);expect(uploads[0]!.key).toBe(uploads[1]!.key);expect(uploads[0]!.body).toBe(uploads[1]!.body);});
 it('uncertain analysis never resends automatically and retries exact approved body/key',async()=>{const f=fixture({seeded:true,dropAnalysis:true}),app=renderApp({path:'/agenzie/g/pratiche/p?area=planimetria',fetch:f.fetch});await screen.findByRole('heading',{name:'Analizza la planimetria'});await app.user.click(screen.getByLabelText(/Autorizzo l’analisi/));await app.user.click(screen.getByRole('button',{name:'Analizza planimetria'}));const retry=await screen.findByRole('button',{name:'Riprova lo stesso avvio'});expect(f.calls.filter(c=>c.path.endsWith('/analysis-jobs')&&c.method==='POST')).toHaveLength(1);expect(screen.queryByLabelText('Pagina')).not.toBeInTheDocument();await app.user.click(retry);await screen.findByRole('button',{name:'Apri risultato dell’analisi'});const requests=f.calls.filter(c=>c.path.endsWith('/analysis-jobs')&&c.method==='POST');expect(requests[0]!.key).toBe(requests[1]!.key);expect(requests[0]!.body).toEqual(requests[1]!.body);});
 it('requires a document choice when both the dwelling and garage have plans',async()=>{
  const f=fixture({seeded:true,secondPlan:true}),app=renderApp({path:'/agenzie/g/pratiche/p?area=planimetria',fetch:f.fetch});
  const choice=await screen.findByRole('combobox',{name:'Documento'});
  expect(choice).toHaveValue('');
  expect(await screen.findByLabelText(/Autorizzo l’analisi/)).toBeDisabled();
  await app.user.selectOptions(choice,'garage');
  const page=await screen.findByLabelText('Pagina');
  expect(page).toHaveAttribute('max','3');
  fireEvent.change(page,{target:{value:'2'}});
  await app.user.click(screen.getByLabelText(/Autorizzo l’analisi/));
  await app.user.click(screen.getByRole('button',{name:'Analizza planimetria'}));
  expect(f.calls.find(c=>c.path.endsWith('/analysis-jobs')&&c.method==='POST')?.body).toMatchObject({sourceId:'garage',version:2,page:2});
 });
 it('uses page one for a single-page PDF without showing a page field',async()=>{
  const f=fixture({seeded:true,pdfPages:1}),app=renderApp({path:'/agenzie/g/pratiche/p?area=planimetria',fetch:f.fetch});
  const consent=await screen.findByLabelText(/Autorizzo l’analisi/);
  await waitFor(()=>expect(consent).toBeEnabled());
  expect(screen.queryByLabelText('Pagina')).not.toBeInTheDocument();
  await app.user.click(consent);
  await app.user.click(screen.getByRole('button',{name:'Analizza planimetria'}));
  expect(f.calls.find(c=>c.path.endsWith('/analysis-jobs')&&c.method==='POST')?.body).toMatchObject({sourceId:'s',page:1});
 });
 it('manual page input does not bypass consent and range constraints',async()=>{const f=fixture({seeded:true,pdfPages:2});const app=renderApp({path:'/agenzie/g/pratiche/p?area=planimetria',fetch:f.fetch});const page=await screen.findByLabelText('Pagina');await app.user.click(screen.getByLabelText(/Autorizzo l’analisi/));fireEvent.change(page,{target:{value:'3'}});expect(screen.getByRole('button',{name:'Analizza planimetria'})).toBeDisabled();});
 it.each([['deed','Atto'],['cadastral','Visura'],['ape','APE'],['floor_plan','Planimetria'],['succession','Successione'],['other','Altro'],['unclassified','Da classificare']])('saves the explicit %s classification with current source and practice versions',async(kind,label)=>{
  const initial=kind==='unclassified'?'other':'unclassified',f=fixture({seeded:true,kind:initial}),app=renderApp({path:'/agenzie/g/pratiche/p?area=fascicolo',fetch:f.fetch});
  const select=await screen.findByLabelText('Tipo di documento per plan.png');
  await app.user.selectOptions(select,kind);
  expect(f.calls.filter(c=>c.method==='POST')).toHaveLength(0);
  await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));
  await waitFor(()=>expect(screen.getByLabelText('Tipo di documento per plan.png')).toHaveValue(kind));
  const current=screen.getByLabelText('Tipo di documento per plan.png'),row=current.closest('li')!;
  expect(row).toHaveTextContent('plan.png · '+label);
  expect(within(row).getByRole('button',{name:'Salva tipo'})).toBeDisabled();
  const writes=f.calls.filter(c=>c.method==='POST');
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({path:'/agencies/g/practices/p/sources/s/classification',body:{expectedRevision:3,expectedSourceVersion:1,kind}});
  expect(writes[0]!.key).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Usa come planimetria'})).not.toBeInTheDocument();
  expect(screen.queryByText(/plan.png · v1/)!==null).toBe(kind==='floor_plan');
 });
 it('existing deed and cadastral labels are preserved without classifying or analyzing them on entry',async()=>{
  const f=fixture({seeded:true,kind:'deed'});renderApp({path:'/agenzie/g/pratiche/p?area=fascicolo',fetch:f.fetch});
  const select=await screen.findByLabelText('Tipo di documento per plan.png');
  expect(select).toHaveValue('deed');expect(select.closest('li')).toHaveTextContent('plan.png · Atto');
  expect(screen.getByRole('button',{name:'Salva tipo'})).toBeDisabled();
  expect(f.calls.filter(c=>c.method==='POST')).toHaveLength(0);
 });
 it('read-only agency members cannot change a source classification',async()=>{
  const f=fixture({seeded:true,kind:'cadastral',canEdit:false});renderApp({path:'/agenzie/g/pratiche/p?area=fascicolo',fetch:f.fetch});
  expect(await screen.findByLabelText('Tipo di documento per plan.png')).toBeDisabled();
  expect(screen.getByRole('button',{name:'Salva tipo'})).toBeDisabled();
  fireEvent.submit(screen.getByRole('button',{name:'Salva tipo'}).closest('form')!);
  expect(f.calls.filter(c=>c.method==='POST')).toHaveLength(0);
 });
 it('uncertain classification freezes changes and retries only the original payload and key',async()=>{
  const f=fixture({seeded:true,kind:'unclassified',dropClassification:true}),app=renderApp({path:'/agenzie/g/pratiche/p?area=fascicolo',fetch:f.fetch});
  await app.user.selectOptions(await screen.findByLabelText('Tipo di documento per plan.png'),'cadastral');
  await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));
  const retry=await screen.findByRole('button',{name:'Riprova lo stesso tipo'});
  expect(screen.getByLabelText('Tipo di documento per plan.png')).toBeDisabled();expect(screen.getByLabelText('Documento PDF o PNG')).toBeDisabled();expect(screen.queryByLabelText('Pagina')).not.toBeInTheDocument();
  expect(f.calls.filter(c=>c.path.endsWith('/classification')&&c.method==='POST')).toHaveLength(1);
  await app.user.click(retry);
  await waitFor(()=>expect(screen.getByLabelText('Tipo di documento per plan.png')).toHaveValue('cadastral'));
  const requests=f.calls.filter(c=>c.path.endsWith('/classification')&&c.method==='POST');
  expect(requests).toHaveLength(2);expect(requests[0]!.body).toEqual(requests[1]!.body);expect(requests[0]!.key).toBe(requests[1]!.key);
 });
 it('a source revision conflict blocks further classification until the practice is reloaded',async()=>{
  const f=fixture({seeded:true,rejectClassification:409}),app=renderApp({path:'/agenzie/g/pratiche/p?area=fascicolo',fetch:f.fetch});
  await app.user.selectOptions(await screen.findByLabelText('Tipo di documento per plan.png'),'deed');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));
  await screen.findByRole('alert');expect(screen.getByLabelText('Tipo di documento per plan.png')).toBeDisabled();expect(screen.getByRole('button',{name:'Salva tipo'})).toBeDisabled();
  expect(screen.queryByRole('button',{name:'Riprova lo stesso tipo'})).not.toBeInTheDocument();
  await app.user.click(screen.getByRole('button',{name:'Ricarica pratica e scarta modifiche locali'}));
  expect(await screen.findByLabelText('Tipo di documento per plan.png')).toBeEnabled();
  expect(f.calls.filter(c=>c.path.endsWith('/classification')&&c.method==='POST')).toHaveLength(1);
 });
 it('a rejected classification keeps the original type and allows a corrected new choice',async()=>{
  const f=fixture({seeded:true,kind:'unclassified',rejectClassification:422}),app=renderApp({path:'/agenzie/g/pratiche/p?area=fascicolo',fetch:f.fetch});
  await app.user.selectOptions(await screen.findByLabelText('Tipo di documento per plan.png'),'deed');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));
  await screen.findByRole('alert');const select=screen.getByLabelText('Tipo di documento per plan.png');expect(select.closest('li')).toHaveTextContent('plan.png · Da classificare');expect(select).toBeEnabled();
  await app.user.selectOptions(select,'cadastral');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));
  await waitFor(()=>expect(screen.getByLabelText('Tipo di documento per plan.png')).toHaveValue('cadastral'));
  const requests=f.calls.filter(c=>c.path.endsWith('/classification')&&c.method==='POST');expect(requests).toHaveLength(2);expect(requests[1]!.key).not.toBe(requests[0]!.key);expect(requests[1]!.body).toMatchObject({kind:'cadastral'});
 });
 it('access denied during classification hides document details and offers no retry',async()=>{
  const f=fixture({seeded:true,rejectClassification:403}),app=renderApp({path:'/agenzie/g/pratiche/p?area=fascicolo',fetch:f.fetch});
  await app.user.selectOptions(await screen.findByLabelText('Tipo di documento per plan.png'),'deed');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));
  await screen.findByText('Accesso non disponibile con questa sessione.');expect(screen.queryByLabelText('Tipo di documento per plan.png')).not.toBeInTheDocument();expect(screen.queryByText(/plan.png/)).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Riprova lo stesso tipo'})).not.toBeInTheDocument();
 });
 it('changing a selected floor plan to a deed clears its analysis selection and consent',async()=>{
  const f=fixture({seeded:true}),app=renderApp({path:'/agenzie/g/pratiche/p?area=fascicolo',fetch:f.fetch});
  await screen.findByLabelText('Tipo di documento per plan.png');await app.user.click(screen.getByRole('link',{name:'Planimetria'}));await app.user.click(screen.getByLabelText(/Autorizzo l’analisi/));
  await app.user.click(screen.getByRole('link',{name:'Fascicolo'}));await app.user.selectOptions(screen.getByLabelText('Tipo di documento per plan.png'),'deed');await app.user.click(screen.getByRole('button',{name:'Salva tipo'}));
  await waitFor(()=>expect(screen.getByLabelText('Tipo di documento per plan.png')).toHaveValue('deed'));
  await app.user.click(screen.getByRole('link',{name:'Planimetria'}));expect(screen.queryByRole('combobox',{name:'Documento'})).not.toBeInTheDocument();expect(screen.getByLabelText(/Autorizzo l’analisi/)).not.toBeChecked();expect(screen.getByRole('button',{name:'Analizza planimetria'})).toBeDisabled();
  expect(f.calls.filter(c=>c.path.endsWith('/analysis-jobs')&&c.method==='POST')).toHaveLength(0);
 });
});
