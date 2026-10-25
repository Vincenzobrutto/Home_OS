import {screen,waitFor} from '@testing-library/react';
import {beforeAll,expect,it,vi} from 'vitest';
import {renderApp,seededBackend,createFakeFetch,PASSWORD_A} from '../test/harness';
import type {FetchLike} from '../api/client';
import type {Draft} from './model';
const controls=vi.hoisted(()=>({ambiguous:false}));
beforeAll(async()=>{await import('../routes/DocumentsPages');});
vi.mock('./localBillPdf',async()=>{const {localBill}=await import('./localBill');return {localBillPdf:vi.fn(async()=>localBill(['Bolletta energia elettrica\nFornitore: Fornitore sintetico\nTotale da pagare: 93,21 €\n'+(controls.ambiguous?'Totale da pagare: 95,10 €\n':'')+'Data emissione: 17/01/2026\nScadenza: 20/02/2026\nPeriodo di riferimento: dicembre 2025']))};});

it.each([
 {stepped:false,scenario:'confirm'},
 {stepped:true,scenario:'confirm'},
 {stepped:false,scenario:'conflict'},
 {stepped:true,scenario:'revoked'},
 {stepped:true,scenario:'draft'},
 {stepped:true,scenario:'ambiguous'},
])('bill completion preserves classification, stepped=$stepped scenario=$scenario',async({stepped,scenario})=>{
 controls.ambiguous=scenario==='ambiguous';
 const {backend,homeA1,a}=seededBackend(),control=createFakeFetch(backend),doc=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'Bolletta sintetica.pdf',sha256:'a'.repeat(64)});
 const draft:Draft={id:'manual-bill',version:1,state:'open',mode:'manual',snapshot:{documentId:doc.id,documentVersion:1,sha256:doc.sha256},document:{id:doc.id,name:doc.name,mimeType:'application/pdf'},documentKind:'unsupported',documentInfo:null,items:[{id:'placeholder',fields:{},quantity:null,profile:{},nameTruncated:false,disposition:'uncertain',enrichment:null,decision:null}],needsReview:true,purchaseTotal:null,review:null,permissions:['read','edit']};
 const limits={maxFiles:20,maxFileBytes:20971520,maxTotalBytes:209715200,acceptedMimeTypes:['application/pdf']},item={id:'item',clientItemId:doc.id,version:1,filename:doc.originalFilename,byteSize:doc.byteSize,mimeType:'application/pdf',uploadState:'stored',analysisState:'ready',reviewState:'unreviewed',documentLink:{state:'linked',document:{id:doc.id,name:doc.name}},pageCount:1,proposal:null,selection:null,organization:null,organizationVersion:0,duplicate:null,error:null,permissions:['read','edit']},wire={batch:{id:'batch',homeId:homeA1.id,version:1,state:'open',limits,permissions:['read','edit'],items:[item]}};
 const order:string[]=[],paid:string[]=[],organizationRequests:Array<{body:unknown;key:string|null}>=[];
 let finalAction=false,preparations=0;
 const fetch:FetchLike=async(url,init)=>{
  if(finalAction&&scenario==='revoked'&&url.endsWith('/documents/'+doc.id))return Response.json({error:{code:'forbidden',message:'Accesso non consentito.'}},{status:403});
  if(url.endsWith('/jobs'))paid.push(url);
  if(url.includes('/object-onboarding/capabilities'))return Response.json({manualAvailable:true,aiAvailable:true,drafts:[{id:draft.id,state:draft.state}],job:null});
  if(url.includes('/expense-candidates')||url.includes('/candidates'))return Response.json({items:[],nextCursor:null});
  if(url.includes('/object-suggestions'))return Response.json({items:[]});
  if(url.endsWith('/document-kind')){expect(JSON.parse(String(init.body))).toEqual({expectedVersion:1,documentKind:'utility_bill'});order.push('kind');draft.version++;draft.documentKind='utility_bill';draft.items=[];draft.houseExpenses=[{id:'bill-cost',documentKind:'utility_bill',proposedFields:{},amountCandidates:[],amountSelectionRequired:true,decision:null}];return Response.json({draft});}
  if(url.endsWith('/review')){order.push('review');draft.version++;draft.review=JSON.parse(String(init.body)).review;return Response.json({draft});}
  if(url.endsWith('/confirmations')){
   const body=JSON.parse(String(init.body));expect(body.choices).toEqual([]);expect(body.documentOnly).toBeUndefined();
   expect(body.houseExpenses).toEqual([expect.objectContaining({itemId:'bill-cost',action:'create',amountSelection:{mode:'manual'},values:{title:'Bolletta',amountCents:9321,spentOn:'2026-01-17',supplier:'Fornitore sintetico',category:'electricity',objectRef:null,documentDate:'2026-01-17',competenceFrom:'2025-12-01',competenceTo:'2025-12-31',dueOn:'2026-02-20'}})]);
   order.push('confirm');draft.state='confirmed';backend.documents.get(doc.id)!.workflowState='completed';return Response.json({draft,result:{newObjects:0,newExpenses:1}});
  }
  if(url.includes('/object-onboarding/drafts/'))return Response.json({draft});
  if(url.includes('/document-intake')){
   if(url.endsWith('/capabilities'))return Response.json({apiVersion:'document-intake-v1',enabled:true,limits,analysis:{provider:'local_text_v1',enabled:false,externalTransmission:false}});
   if(url.endsWith('/from-documents'))preparations++;
   if(url.endsWith('/organizations')){
    organizationRequests.push({body:JSON.parse(String(init.body)),key:new Headers(init.headers).get('Idempotency-Key')});
    if(scenario==='conflict'&&organizationRequests.length===1)return Response.json({error:{code:'organization_version_conflict',message:'Classificazione in conflitto.'}},{status:409});
    order.push('organize');expect(JSON.parse(String(init.body)).items[0].selection.parts[0].kind).toBe('utility_bill');item.reviewState='confirmed';return Response.json({...wire,results:{[item.id]:{state:'confirmed'}}});
   }
   return Response.json(wire);
  }
  if(item.reviewState==='confirmed'&&url.endsWith('/documents/'+doc.id))return Response.json({document:{...doc,organization:{title:doc.name,parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],version:1,collections:['utilities']}}});
  return control.fetch(url,init);
 };
 const app=renderApp({path:'/accedi',backend,fetch});await app.user.type(await screen.findByLabelText('Email'),a.email);await app.user.type(screen.getByLabelText('Password'),PASSWORD_A);await app.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(app.router.state.location.pathname).toBe('/case'));
 const entry=scenario==='draft'?`/documenti?workflow=pending&lotto=batch&oggetti-documento=${doc.id}&oggetti-bozza=${draft.id}`:`/documenti/${doc.id}/oggetti?bozza=${draft.id}`;
 await app.router.navigate(`/home/${homeA1.id}${entry}&compila=manuale${stepped?'':'&vista-compilazione=unica'}`);
 await screen.findByText(/Possibile bolletta riconosciuta nel testo/);
 if(stepped){await screen.findByRole('heading',{level:2,name:'Documento'});await app.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:'Spese'});}
 expect(await screen.findByLabelText('Importo della bolletta (€)')).toHaveValue(controls.ambiguous?'':'93.21');expect(screen.getByLabelText('Data di emissione')).toHaveValue('2026-01-17');expect(screen.getByLabelText('Fornitore')).toHaveValue('Fornitore sintetico');expect(screen.getByLabelText('Categoria della bolletta')).toHaveValue('electricity');expect(screen.getByLabelText('Scadenza indicata')).toHaveValue('2026-02-20');expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();
 expect(order).toEqual(['kind']);expect(preparations).toBe(0);expect(organizationRequests).toEqual([]);
 if(scenario==='ambiguous'){
  await app.user.click(screen.getByRole('button',{name:'Avanti'}));expect(screen.getByRole('heading',{level:2,name:'Spese'})).toBeInTheDocument();expect(screen.queryByRole('heading',{level:2,name:'Riepilogo'})).not.toBeInTheDocument();expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);expect(draft.state).toBe('open');expect(order).toEqual(['kind']);expect(organizationRequests).toEqual([]);expect(paid).toEqual([]);app.unmount();return;
 }
 if(scenario==='draft'){
  await app.user.click(screen.getByRole('button',{name:'Salva bozza ed esci'}));await screen.findByRole('heading',{level:1,name:'Documenti'});
  expect(draft.state).toBe('open');expect(order).toEqual(['kind','review']);expect(organizationRequests).toEqual([]);expect(backend.documents.get(doc.id)!.workflowState).toBe('to_compile');expect(await screen.findByText(doc.name)).toBeInTheDocument();expect(paid).toEqual([]);app.unmount();return;
 }
 if(stepped){await app.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:'Riepilogo'});}
 const save=await screen.findByRole('button',{name:stepped?'Salva e continua':'Registra spesa'});await waitFor(()=>expect(save).toBeEnabled());finalAction=true;await app.user.click(save);
 if(scenario==='revoked'){
  await waitFor(()=>expect(screen.queryByRole('heading',{level:2,name:'Riepilogo'})).not.toBeInTheDocument());expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);expect(order).toEqual(['kind']);expect(organizationRequests).toEqual([]);expect(screen.queryByText(doc.name)).not.toBeInTheDocument();expect(draft.state).toBe('open');expect(paid).toEqual([]);app.unmount();return;
 }
 if(scenario==='conflict'){
  await screen.findByText('Classificazione in conflitto.');expect(order).toEqual(['kind']);expect(screen.getByLabelText('Importo della bolletta (€)')).toHaveValue('93.21');expect(screen.getByLabelText('Fornitore')).toHaveValue('Fornitore sintetico');
  await app.user.click(await screen.findByRole('button',{name:'Registra spesa'}));
 }
 await waitFor(()=>expect(order).toEqual(['kind','organize','review','confirm']));expect(draft.state).toBe('confirmed');expect(item.reviewState).toBe('confirmed');expect(preparations).toBe(1);expect(paid).toEqual([]);
 if(scenario==='conflict'){expect(organizationRequests).toHaveLength(2);expect(organizationRequests[1]).toEqual(organizationRequests[0]);}else expect(organizationRequests).toHaveLength(1);
 app.unmount();
});
