import {screen,waitFor} from '@testing-library/react';
import {beforeAll,expect,it,vi} from 'vitest';
import {renderApp,seededBackend,createFakeFetch,PASSWORD_A} from '../test/harness';
import type {FetchLike} from '../api/client';
import type {Draft} from '../object-onboarding/model';
const controls=vi.hoisted(()=>({ocr:false}));
beforeAll(async()=>{await import('../routes/DocumentsPages');});
vi.mock('../object-onboarding/localBillPdf',async()=>{const {localBill}=await import('../object-onboarding/localBill');return {localBillPdf:vi.fn(async()=>({...localBill(['Bolletta energia elettrica\nFornitore: Fornitore sintetico\nTotale da pagare: 93,21 €\nData emissione: 17/01/2026\nScadenza: 20/02/2026\nPeriodo di riferimento: dicembre 2025']),...(controls.ocr?{method:'ocr' as const}:{})}))};});
it.each([{stepped:false,ocr:false},{stepped:true,ocr:false}])('archive recovery completes classification and expense, stepped=$stepped OCR=$ocr',async({stepped,ocr})=>{
 controls.ocr=ocr;
 const kind=String('utility_bill'),only=false,preselected=false;
 const {backend,homeA1,a}=seededBackend(),control=createFakeFetch(backend),doc=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'Bolletta sintetica.pdf'});
 const draft:Draft={id:'manual-bill',version:1,state:'open',mode:'manual',snapshot:{documentId:doc.id,documentVersion:1,sha256:'a'.repeat(64)},document:{id:doc.id,name:doc.name,mimeType:'application/pdf'},documentKind:preselected&&kind!=='utility_bill'?'purchase_document':'unsupported',documentInfo:null,items:[{id:'placeholder',fields:{},quantity:null,profile:{},nameTruncated:false,disposition:'uncertain',enrichment:null,decision:null}],needsReview:true,purchaseTotal:null,review:null,permissions:['read','edit']};
 const limits={maxFiles:20,maxFileBytes:20971520,maxTotalBytes:209715200,acceptedMimeTypes:['application/pdf']},item={id:'item',clientItemId:'client',version:1,filename:doc.originalFilename,byteSize:100,mimeType:'application/pdf',uploadState:'stored',analysisState:'ready',reviewState:'unreviewed',documentLink:{state:'linked',document:{id:doc.id,name:doc.name}},pageCount:1,proposal:null,selection:null,organization:null,organizationVersion:0,duplicate:null,error:null,permissions:['read','edit']},wire={batch:{id:'batch',homeId:homeA1.id,version:1,state:'open',limits,permissions:['read','edit'],items:[item]}};
 const order:string[]=[],paid:string[]=[];
 const fetch:FetchLike=async(url,init)=>{
  if(url.endsWith('/jobs'))paid.push(url);
  if(url.includes('/object-onboarding/capabilities'))return Response.json({manualAvailable:true,aiAvailable:true,drafts:[{id:draft.id,state:draft.state}],job:null});
  if(url.includes('/expense-candidates')||url.includes('/candidates'))return Response.json({items:[],nextCursor:null});
  // Suggerimenti di oggetto per le fatture (object-suggestions), aggiunti dopo questo test: nessun oggetto suggerito.
  if(url.includes('/object-suggestions'))return Response.json({items:[]});
  if(url.endsWith('/document-kind')){expect(JSON.parse(String(init.body))).toEqual({expectedVersion:1,documentKind:kind});order.push('kind');draft.version++;draft.documentKind=kind==='utility_bill'?'utility_bill':'purchase_document';draft.items=[];draft.houseExpenses=[{id:'bill-cost',documentKind:kind==='utility_bill'?'utility_bill':'simple_invoice',proposedFields:{},amountCandidates:[],amountSelectionRequired:true,decision:null}];return Response.json({draft});}
  if(url.endsWith('/items')){draft.version++;draft.items=[{id:'optional',fields:{},quantity:null,profile:{},nameTruncated:false,disposition:'uncertain',enrichment:null,decision:null}];return Response.json({draft});}
  if(url.endsWith('/review')){order.push('review');draft.version++;return Response.json({draft});}
  if(url.endsWith('/confirmations')){const body=JSON.parse(String(init.body));expect(body.choices).toEqual([]);if(only){expect(body.documentOnly).toBe(true);expect(body.houseExpenses).toBeUndefined();}else{expect(body.documentOnly).toBeUndefined();expect(body.houseExpenses).toEqual([expect.objectContaining({itemId:'bill-cost',action:'create',amountSelection:{mode:'manual'},values:{title:'Bolletta',amountCents:9321,spentOn:'2026-01-17',supplier:'Fornitore sintetico',category:'electricity',objectRef:null,documentDate:'2026-01-17',competenceFrom:'2025-12-01',competenceTo:'2025-12-31',dueOn:'2026-02-20'}})]);}order.push('confirm');draft.state='confirmed';backend.documents.get(doc.id)!.workflowState='completed';return Response.json({draft,result:{newObjects:0,newExpenses:only?0:1}});}
  if(url.includes('/object-onboarding/drafts/'))return Response.json({draft});
  if(url.includes('/document-intake')){if(url.endsWith('/capabilities'))return Response.json({apiVersion:'document-intake-v1',enabled:true,limits,analysis:{provider:'local_text_v1',enabled:false,externalTransmission:false}});if(url.endsWith('/organizations')){order.push('organize');expect(JSON.parse(String(init.body)).items[0].selection.parts[0].kind).toBe(kind);item.reviewState='confirmed';return Response.json({...wire,results:{[item.id]:{state:'confirmed'}}});}return Response.json(wire);}
  if(preselected&&url.endsWith('/documents/'+doc.id))return Response.json({document:{...doc,organization:{title:doc.name,parts:[{kind,pageFrom:null,pageTo:null}],version:1,collections:['utilities']}}});
  // The shared fake supports workflow filters but not the newer display-only view parameter.
  const legacyUrl=new URL(url,'http://mock.invalid');if(legacyUrl.pathname.endsWith('/documents'))legacyUrl.searchParams.delete('view');
  const response=await control.fetch(url.startsWith('/')?legacyUrl.pathname+legacyUrl.search:legacyUrl.toString(),init);
  if(response.ok&&order.includes('organize')&&(url.includes('/documents?')||url.endsWith('/documents')||url.endsWith('/documents/'+doc.id))){const payload=await response.json();const organization={version:1,title:doc.name,parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],collections:['utilities'],origin:'user_declared',updatedAt:'2026-01-17T00:00:00.000Z',houseFamily:null,documentSha256:'a'.repeat(64)};if(payload.document?.id===doc.id)payload.document.organization=organization;if(payload.items)payload.items=payload.items.map((row:{id:string})=>row.id===doc.id?{...row,organization}:row);return Response.json(payload);}return response;
 };
 const app=renderApp({path:'/accedi',backend,fetch});await app.user.type(await screen.findByLabelText('Email'),a.email);await app.user.type(screen.getByLabelText('Password'),PASSWORD_A);await app.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(app.router.state.location.pathname).toBe('/case'));await app.router.navigate(`/home/${homeA1.id}/documenti?workflow=pending&view=archive&oggetti-documento=${doc.id}&oggetti-bozza=${draft.id}&compila=manuale${stepped?'':'&vista-compilazione=unica'}`);
 expect(await screen.findByRole('button',{name:'Riprendi compilazione'})).toBeEnabled();expect(order).toEqual([]);expect(paid).toEqual([]);expect(screen.queryByRole('button',{name:'Scegli file'})).not.toBeInTheDocument();await app.user.click(screen.getByRole('button',{name:'Riprendi compilazione'}));
 await waitFor(()=>expect(screen.getByLabelText('Tipo del documento')).toHaveValue('utility_bill'));
 expect(screen.getByRole('checkbox',{name:'Conserva solo il documento'})).not.toBeChecked();
 if(ocr)expect(screen.getByText(/Possibile bolletta riconosciuta con OCR locale/)).toBeInTheDocument();
 if(stepped){await screen.findByRole('heading',{level:2,name:'Documento'});await app.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:'Spese'});}
 const amount=await screen.findByLabelText(kind==='utility_bill'?'Importo della bolletta (€)':'Importo della spesa (€)');expect(amount).not.toHaveAttribute('readonly');if(kind==='utility_bill')expect(screen.queryByText(/Oggetti ·/)).not.toBeInTheDocument();else expect(screen.getByRole('button',{name:'Aggiungi o collega un oggetto (facoltativo)'})).toBeInTheDocument();expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();
 expect(amount).toHaveValue('93.21');expect(screen.getByLabelText('Data di emissione')).toHaveValue('2026-01-17');expect(screen.getByLabelText('Fornitore')).toHaveValue('Fornitore sintetico');expect(screen.getByLabelText('Categoria della bolletta')).toHaveValue('electricity');expect(screen.getByLabelText('Scadenza indicata')).toHaveValue('2026-02-20');
 if(stepped){expect(order).toEqual(['kind']);await app.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:'Riepilogo'});expect(order).toEqual(['kind']);}
 const save=await screen.findByRole('button',{name:only?'Salva documento':stepped?'Salva e continua':'Registra spesa'});await waitFor(()=>expect(save).toBeEnabled());await app.user.click(save);await waitFor(()=>expect(order).toEqual(['kind','organize','review','confirm']));expect(paid).toEqual([]);await waitFor(()=>expect(new URLSearchParams(app.router.state.location.search).has('oggetti-documento')).toBe(false));expect(new URLSearchParams(app.router.state.location.search).get('workflow')).toBe('pending');await screen.findByRole('heading',{level:1,name:'Documenti'});await waitFor(()=>expect(screen.queryByText(doc.name)).not.toBeInTheDocument());await app.user.click(screen.getByRole('button',{name:'Vai ai documenti completati'}));expect(await screen.findByText(doc.name)).toBeInTheDocument();expect(screen.getByText('Bolletta')).toBeInTheDocument();app.unmount();
});





