import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../api/client';
import { FakeBackend } from '../test/fakeBackend';
import { createFakeFetch, renderApp } from '../test/harness';
import type { AiBudget, Draft, Form, FieldKey } from './model';
import { choice, initialForm, houseExpenseTitle } from './model';
import { PdfPreview } from '../documents/PdfPreview';
vi.mock('../documents/PdfPreview',()=>({PdfPreview:vi.fn(()=> <div role="img" aria-label="Anteprima PDF locale"/>)}));
async function world(options:{defaultView?:boolean;viewValue?:string;originalFailure?:boolean;manualMode?:boolean;savedDocumentOnly?:boolean;contactReview?:boolean;quantityTwo?:boolean;stepped?:boolean;fixedDocument?:boolean;threeRows?:boolean;shortName?:boolean;objectSuggestion?:boolean;analysisSucceeded?:boolean;contact?:boolean;completePurchase?:boolean;reviewWarning?:'delivery'|'quantity'|'unknown';conformity?:boolean;documentCost?:'works'|'service'|'bill';compilation?:'ai'|'manuale';lostUnrecorded?:boolean;pendingReview?:boolean;budget?:AiBudget;login?:boolean;start?:boolean;ai?:boolean;lost?:boolean;lostStart?:boolean;invalid?:boolean;foreign?:boolean;newAuthorization?:boolean;uncertainRetry?:boolean;derivedIdentity?:boolean;savedDraft?:boolean;purchase?:boolean;multiPurchase?:boolean;duplicates?:boolean;expenseFailure?:boolean;savedExpenseSkip?:boolean;compactList?:boolean;clearCandidates?:boolean;dynamicCandidates?:boolean}={}){
 const backend=new FakeBackend(),password='onboarding-demo-password',account=backend.seedAccount('Test','onboarding@example.test',password),home=backend.seedHome(account.id,'Casa sintetica','Via Test');
 const uuid=options.fixedDocument?vi.spyOn(globalThis.crypto,'randomUUID').mockReturnValueOnce('11111111-2222-4333-8444-555555555555'):null;
 const doc=await backend.seedDocument({homeId:home.id,uploaderId:account.id,name:'Ordine sintetico'}),control=createFakeFetch(backend),api=new ApiClient({fetch:control.fetch});
 uuid?.mockRestore();
 if(options.login!==false){await api.login({email:account.email,password});await api.getSession();}
 const wire:Draft={id:'draft-onboarding',version:1,state:'open',mode:'extraction',snapshot:{documentId:options.foreign?'other-document':doc.id,documentVersion:1,sha256:'a'.repeat(64)},document:{id:doc.id,name:doc.name,mimeType:'application/pdf'},documentKind:'delivery_notice',items:['Router demo','Speaker demo'].map((name,i)=>({id:'item'+i,nameTruncated:false,disposition:'household_object',fields:{name:{value:name,source:{documentId:doc.id,page:1,excerpt:name}}},quantity:null,profile:{brand:{value:'Lume',origin:'extraction_confirmed',sources:[{documentId:doc.id,page:1,excerpt:'Lume'}]}},enrichment:null,decision:null})),needsReview:false,purchaseTotal:null,review:null,permissions:['read','edit']};
 if(options.manualMode)wire.mode='manual';
 if(options.quantityTwo)wire.items[0]!.quantity={value:2};
 if(options.savedDocumentOnly)wire.review={compilation:{saved:true,documentTitle:'Documento test',documentKind:'invoice',replaceOrganization:false,reuseCopy:false,documentOnly:true,manualTotal:'',contacts:[],houseForms:{}}};
 if(options.threeRows)wire.items.push({...structuredClone(wire.items[1]!),id:'item2'});
 if(options.shortName){const item=wire.items[0]!;item.fullName='Router demo — '+ 'Descrizione commerciale documentata '.repeat(5)+'Modello ZX-82/B variante Blu 256 GB';item.fields.name!.source.excerpt=item.fullName;item.nameTruncated=true;item.profile.model={value:'ZX-82/B',origin:'extraction_confirmed',sources:[item.fields.name!.source]};wire.needsReview=true;wire.reviewWarnings=[{field:'item:0:name',reason:'unverified'}];}
 if(options.conformity){wire.documentKind='conformity_declaration';wire.items=[];wire.documentInfo={kind:'conformity_declaration',title:{value:'Dichiarazione di conformità',source:{documentId:doc.id,page:1,excerpt:'Dichiarazione di conformità'}},facts:[]};}
 if(options.contact)wire.contacts=[{id:'contact-proposal',values:{name:'Boreale Impianti',profession:'Elettricista',kind:'company',phone:'030 1234567',email:null,fiscalId:'12345678903',note:null},sources:{name:{documentId:doc.id,page:1,excerpt:'Impresa Boreale Impianti'}},warnings:[],resolution:{state:'create',contact:null,candidates:[],conflicts:[]},decision:null}];
 if(options.contactReview&&wire.contacts)wire.contacts[0]!.resolution.state='review';
 if(options.purchase){wire.documentKind='purchase_document';wire.items=wire.items.slice(0,1);wire.items[0]!.profile.purchaseDate={value:'2025-06-13',origin:'extraction_confirmed',sources:[]};wire.purchaseTotal={amountCents:9999};}
 if(options.completePurchase){wire.items[0]!.fields.name!.value='Macchina caffe Boreale TestP17';for(const [key,value] of Object.entries({brand:'Boreale',model:'TestP17',reference:'BP17-REF',purchaseDate:'2026-04-18'}))wire.items[0]!.profile[key as FieldKey]={value,origin:'extraction_confirmed',sources:[]};wire.purchaseTotal={amountCents:12743};}
 if(options.reviewWarning){wire.needsReview=true;wire.purchaseExpenseReady=options.reviewWarning==='delivery';wire.reviewWarnings=options.reviewWarning==='unknown'?[]:[{field:'item:0:'+ (options.reviewWarning==='delivery'?'deliveredDate':'quantity'),reason:'unverified'}];}
 if(options.multiPurchase){wire.documentKind='purchase_document';wire.purchaseTotal={amountCents:22990};}
 if(options.documentCost){const bill=options.documentCost==='bill';wire.documentKind=bill?'utility_bill':'purchase_document';wire.purchaseTotal=bill?null:{amountCents:153720};if(options.documentCost!=='works')wire.items=[];else wire.items.forEach((item,i)=>{item.fields.name!.value=i?'Monitor videocitofonico':'Quadro elettrico';item.subjectKind=i?'product':'system';item.proposedType=i?'security':'electrical';});wire.documentInfo={kind:bill?'utility_bill':'invoice',title:{value:bill?'Bolletta':'Fattura',source:{documentId:doc.id,page:1,excerpt:'Fattura'}},facts:[]};wire.houseExpenses=[{id:'house-cost',documentKind:bill?'utility_bill':'simple_invoice',proposedFields:{title:{value:bill?'Bolletta energia':'Lavori elettrici',sources:[]},category:{value:bill?'electricity':'repairs_works',sources:[]},documentDate:{value:'2026-07-08',sources:[]},...(bill?{competenceFrom:{value:'2026-07-01',sources:[]},competenceTo:{value:'2026-07-31',sources:[]}}:{}),supplier:{value:'Azienda Test',sources:[]}},amountCandidates:[{id:'total',amountCents:153720,role:'current_document_total',label:'Totale fattura'}],amountSelectionRequired:false,decision:null}];}
 const suggestedObject=options.objectSuggestion?await api.createObject(home.id,{name:'Impianto elettrico esistente',type:'electrical',roomIds:[]},crypto.randomUUID(),account.id):null;
 if(options.savedExpenseSkip)wire.review={forms:{item0:initialForm(wire.items[0]!,{...wire,mode:'manual'})}};
 if(options.derivedIdentity)for(const item of wire.items)item.profile={brand:{value:'Amazon',origin:'derived_from_product_name',sources:[{documentId:doc.id,page:1,excerpt:'Amazon Echo Dot Max'}]},model:{value:'Echo Dot Max',origin:'derived_from_product_name',sources:[{documentId:doc.id,page:1,excerpt:'Amazon Echo Dot Max'}]}};
 if(options.pendingReview)wire.review={pending:{path:'/drafts/'+wire.id+'/confirmations',key:'same-confirmation',body:{expectedVersion:2,source:wire.snapshot,choices:[]}}};
 const calls:Array<{path:string;body:unknown;key:string|null}>=[];let confirmations=0,starts=0,saved=false;
 const fetch=async(url:string,init:RequestInit)=>{
  if(options.originalFailure&&url.endsWith('/file'))return Response.json({error:{code:'forbidden',message:'Originale non accessibile'}},{status:403});
  if(!url.includes('/object-onboarding'))return control.fetch(url,init);
  const path=url.split('/object-onboarding')[1]!,body=init.body?JSON.parse(String(init.body)):undefined;calls.push({path,body,key:new Headers(init.headers).get('Idempotency-Key')});
  if(path.startsWith('/capabilities'))return Response.json({analysisSucceeded:options.analysisSucceeded,successfulDraftId:options.analysisSucceeded?wire.id:null,budget:options.budget,manualAvailable:true,aiAvailable:!!options.ai,requiresConsent:true,drafts:options.savedDraft?[{id:wire.id,state:'open'}]:[],canStartWithUncertainAcknowledgement:!!options.uncertainRetry,canStartAnalysis:options.uncertainRetry?false:options.newAuthorization?true:undefined,job:(options.newAuthorization||options.uncertainRetry)?{id:"old-job",state:"uncertain",draftId:null,errorCode:"analysis_outcome_unknown"}:null});
  if(path==='/jobs'){starts++;if(options.lostStart&&starts===1)throw new TypeError('lost');return Response.json({job:{id:'job1',state:'queued',draftId:null,errorCode:null}},{status:202});}
  if(path==='/jobs/old-job')return Response.json({job:{id:'old-job',state:'uncertain',draftId:null,errorCode:'analysis_outcome_unknown'}});
  if(path.startsWith('/jobs/'))return Response.json({job:{id:'job1',state:'succeeded',draftId:wire.id,errorCode:null}});
  if(path.includes('/candidates')&&options.dynamicCandidates&&wire.items[0]?.decision?.state==='confirmed')return Response.json({items:[{id:'objectitem0',name:'Router demo',version:1,profile:{fields:{},unavailable:false},rooms:[],reason:'confirmed_item'}],nextCursor:null});
  if(path.includes('/candidates')&&options.clearCandidates)return Response.json({items:[],nextCursor:null});
  if(path.includes('/candidates'))return Response.json({items:[{id:'existing1',name:'Speaker Studio',version:3,profile:{fields:{brand:{value:'Confirmed',origin:'user_declared',sources:[]}},unavailable:false},rooms:['Studio'],reason:'same_brand_model'},...(options.quantityTwo?[{id:'existing2',name:'Secondo Speaker',version:4,profile:{fields:{},unavailable:false},rooms:['Studio'],reason:'same_brand_model'}]:[])],nextCursor:null});
  if(path.includes('/object-suggestions'))return Response.json({items:suggestedObject?[{ref:suggestedObject.ref,name:suggestedObject.name,reason:'supplier_and_description'}]:[]});
  if(path.includes('/expense-candidates'))return options.expenseFailure?Response.json({error:{code:'unavailable',message:'Unavailable'}},{status:503}):Response.json({items:options.duplicates?[{id:'expense1',title:'Acquisto già registrato',amountCents:9999,spentOn:'2025-06-13',version:2,rank:1}]:[],nextCursor:null});
  if(path.endsWith('/enrichment')){wire.items[0]!.profile.capacityLitres={value:'3.2',origin:'manufacturer_page',sources:[]};wire.version++;return Response.json({draft:wire});}
  if(path.endsWith('/review')){wire.review=body.review;wire.version++;return Response.json({draft:wire});}
  if(path.includes('/confirmations/'))return Response.json({status:saved?'confirmed':'not_found',draft:wire});
  if(path.endsWith('/confirmations')){
   confirmations++;if(options.lostUnrecorded&&confirmations===1)throw new TypeError('lost before recording');if(options.invalid&&confirmations===1)return Response.json({error:{code:'validation_error',message:'Controlla la scelta'}},{status:422});
   saved=true;wire.version++;const savedReview=wire.review;wire.review=null;
   for(const c of body.choices){const item=wire.items.find(i=>i.id===c.itemId)!;item.decision={state:c.action==='defer'?'deferred':c.action==='skip'?'skipped':'confirmed',newObjects:c.action==='create'?1:0,newExpenses:0,objects:c.action==='create'?[{id:'object'+item.id,name:c.name,state:'active'}]:[]};}
   for(const c of body.houseExpenses??[]){const item=wire.houseExpenses!.find(i=>i.id===c.itemId)!;item.decision={state:c.action==='skip'?'skipped':c.action==='defer'?'deferred':'confirmed',newExpenses:c.action==='create'?1:0};}
   for(const c of body.contacts??[]){const p=wire.contacts!.find(p=>p.id===c.proposalId)!;p.decision={contactId:c.action==='save'?'saved-contact':null};}
   wire.state=[...wire.items,...(wire.houseExpenses??[])].every(i=>i.decision?.state==='confirmed'||i.decision?.state==='skipped')?'confirmed':'open';
   if(wire.state==='open'&&savedReview?.compilation)wire.review={forms:{},compilation:savedReview.compilation};
   if(options.lost&&confirmations===1)throw new TypeError('lost response');
   return Response.json({draft:wire,result:{newObjects:body.choices.filter((c:{action:string})=>c.action==='create').length,newExpenses:(body.houseExpenses??[]).filter((c:{action:string})=>c.action==='create').length}});
  }
  if(path.startsWith('/drafts/')||path==='/manual-drafts')return Response.json({draft:wire});
  return Response.json({error:{code:'not_found',message:'Unknown'}},{status:404});
 };
 const search=new URLSearchParams();if(!options.start)search.set('bozza',wire.id);if(options.compilation)search.set('compila',options.compilation);if(options.viewValue!==undefined)search.set('vista-compilazione',options.viewValue);else if(!options.defaultView)search.set('vista-compilazione',options.stepped?'schede':'unica');
 const app=renderApp({backend,fetch,path:'/home/'+home.id+'/documenti/'+doc.id+'/oggetti'+'?'+search.toString()});
 if(!options.compactList&&options.login!==false&&!options.foreign&&(!options.start||options.savedDraft)){await screen.findByRole('button',{name:'Rivedi Router demo'});await app.user.click(screen.getByRole('button',{name:'Rivedi Router demo'}));}
 return {...app,wire,calls,counts:()=>({confirmations,starts})};
}
describe('Originale nella compilazione, solo byte autorizzati',()=>{
 it('riusa il renderer locale PDF con un solo download e nessuna scrittura',async()=>{
  vi.mocked(PdfPreview).mockClear();
  const w=await world({stepped:true,compilation:'ai',compactList:true});
  await screen.findByRole('heading',{name:'Documento',level:2});
  await w.user.click(screen.getByText('Vedi il documento originale',{exact:true}));
  await screen.findByRole('img',{name:'Anteprima PDF locale'});
  const props=vi.mocked(PdfPreview).mock.calls.at(-1)![0];
  expect(props.blob.type).toBe('application/pdf');expect(props.blob.size).toBeGreaterThan(0);
  expect(props.url).toMatch(/^blob:/);expect(props.filename).toContain('Ordine sintetico');
  expect(props.showDownload).toBe(false);
  expect(screen.getAllByRole('button',{name:'Scarica originale'})).toHaveLength(1);
  expect(document.querySelector('object[type="application/pdf"]')).toBeNull();
  expect(w.calls.some(c=>c.path.endsWith('/review')||c.path.endsWith('/confirmations')||c.path==='/jobs')).toBe(false);
 });
 it('non monta il renderer e non offre il download quando i byte originali sono negati',async()=>{
  vi.mocked(PdfPreview).mockClear();
  const w=await world({stepped:true,compilation:'ai',compactList:true,originalFailure:true});
  await screen.findByRole('heading',{name:'Documento',level:2});
  await w.user.click(screen.getByText('Vedi il documento originale',{exact:true}));
  await screen.findByRole('button',{name:'Riprova'});
  expect(PdfPreview).not.toHaveBeenCalled();
  expect(screen.queryByRole('button',{name:'Scarica originale'})).toBeNull();
  expect(screen.queryByRole('img',{name:'Anteprima PDF locale'})).toBeNull();
 });
});
describe('Onboarding reale nel router, API simulate e nessun invio esterno',()=>{
 it('guard login protegge il deep link prima di leggere documenti e proposte',async()=>{const w=await world({login:false});await screen.findByRole('heading',{name:/Accedi/});expect(w.calls).toHaveLength(0);expect(w.router.state.location.search).toContain('next=');});
 it('AI disabilitata mostra compilazione manuale e non inventa risultati',async()=>{const w=await world({start:true});await screen.findByText(/L’analisi AI di questo documento non è abilitata/);expect(screen.queryByRole('button',{name:'Avvia precompilazione AI'})).not.toBeInTheDocument();await w.user.click(screen.getByRole('button',{name:'Compila manualmente'}));await screen.findByRole('heading',{name:'Rivedi gli articoli'});expect(w.counts().starts).toBe(0);});
 it('conferma un articolo e lascia l’altro da rivedere; nessuna spesa da una consegna',async()=>{const w=await world();await screen.findByRole('heading',{name:'Router demo'});expect(screen.getByText('Costo di acquisto (facoltativo)')).toBeInTheDocument();expect(screen.getByLabelText('Importo (€)')).toHaveValue('');await w.user.click(screen.getAllByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})[0]!);await screen.findByText('Confermato: 1 nuovi oggetti e 0 nuove spese.');expect(screen.getByRole('link',{name:'Apri Router demo'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Rivedi Speaker demo'})).toBeInTheDocument();expect(w.counts().confirmations).toBe(1);});
 it('esito perso si recupera tramite ricevuta senza un secondo POST',async()=>{const w=await world({lost:true});await screen.findByRole('heading',{name:'Router demo'});await w.user.click(screen.getAllByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})[0]!);await screen.findByRole('button',{name:'Controlla l’esito'});expect(screen.getByRole('button',{name:'Rivedi Speaker demo'})).toBeDisabled();await w.user.click(screen.getByRole('button',{name:'Controlla l’esito'}));await screen.findByText('Conferma recuperata: nessun doppione.');expect(w.counts().confirmations).toBe(1);});
 it('avvio perso ripete solo la stessa richiesta con consenso e chiave stabili',async()=>{const w=await world({start:true,ai:true,lostStart:true});const consent=await screen.findByRole('checkbox');expect(screen.getByRole('button',{name:'Avvia precompilazione AI'})).toBeDisabled();await w.user.click(consent);await w.user.click(screen.getByRole('button',{name:'Avvia precompilazione AI'}));await w.user.click(await screen.findByRole('button',{name:'Verifica ripetendo la stessa richiesta'}));await screen.findByRole('heading',{name:'Rivedi gli articoli'});const posts=w.calls.filter(c=>c.path==='/jobs');expect(posts).toHaveLength(2);expect(posts[0]).toEqual(posts[1]);expect(posts[0]!.body).toMatchObject({consentToProviderTransfer:true,provider:'anthropic'});});
 it('il collegamento esistente richiede una scelta esplicita e protegge il valore attuale',async()=>{const w=await world();await screen.findByRole('heading',{name:'Router demo'});const article=screen.getByRole('dialog',{name:'Rivedi l’articolo'});await w.user.click(within(article).getByLabelText('Collega a un oggetto già in casa'));const select=within(article).getByLabelText('Scheda da collegare');expect(select).toHaveValue('');await w.user.selectOptions(select,'existing1');expect(within(article).getByText('Attuale confermato: Confirmed')).toBeInTheDocument();expect(within(article).getByLabelText('Scelta per Marca')).toHaveValue('keep');expect(within(article).queryByRole('option',{name:'Usa la proposta'})).not.toBeInTheDocument();});
 it('errore di validazione libera i campi e non lascia la conferma incerta',async()=>{const w=await world({invalid:true});await screen.findByRole('heading',{name:'Router demo'});await w.user.click(screen.getAllByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})[0]!);await screen.findByText('Controlla la scelta');await waitFor(()=>expect(screen.getAllByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})[0]).toBeEnabled());expect(screen.queryByRole('button',{name:'Controlla l’esito'})).not.toBeInTheDocument();});
 it('non mescola originale e bozza di due documenti diversi',async()=>{await world({foreign:true});await screen.findByText(/Queste proposte appartengono a un altro documento/);expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();});
 it('payload confermato include solo scelte esplicite, non campi o fonti inseriti dal client',()=>{const draft={purchaseTotal:null} as Draft,item={id:'x',profile:{},fields:{name:{value:'Router'}},enrichment:null} as Draft['items'][number];const form:Form=initialForm(item,draft);const result=choice(item,form);expect(result).toMatchObject({action:'create',itemId:'x',name:'Router',expense:{action:'skip'},fields:{},manual:null});expect(result).not.toHaveProperty('profile');});
});

it('separate operator authorization permits a new start but still requires fresh consent',async()=>{
 const w=await world({start:true,ai:true,newAuthorization:true});
 const button=await screen.findByRole('button',{name:'Avvia precompilazione AI'});
 expect(button).toBeDisabled();
 await w.user.click(screen.getByRole('checkbox',{name:/Autorizzo/}));
 await waitFor(()=>expect(button).toBeEnabled());
});

it('identity derived from title is visibly a proposal and sends separate explicit acceptance',async()=>{
 const w=await world({derivedIdentity:true});await screen.findByRole('heading',{name:'Router demo'});
 expect(screen.queryByText('Ricavato dal nome del prodotto · Da confermare')).not.toBeInTheDocument();
 expect(screen.getByRole('textbox',{name:'Marca'})).toHaveValue('Amazon');expect(screen.getByRole('textbox',{name:'Modello'})).toHaveValue('Echo Dot Max');
 await w.user.click(screen.getAllByRole('button',{name:'Informazioni su Marca'})[0]!);
 const dialog=screen.getByRole('dialog',{name:'Marca'});expect(within(dialog).getByText('Proposta: Amazon')).toBeVisible();expect(within(dialog).getByText('Ricavato dal nome del prodotto · Da confermare')).toBeVisible();
 await w.user.keyboard('{Escape}');expect(screen.queryByRole('dialog',{name:'Marca'})).not.toBeInTheDocument();expect(screen.getByRole('dialog',{name:'Rivedi l’articolo'})).toBeInTheDocument();expect(screen.getAllByRole('button',{name:'Informazioni su Marca'})[0]).toHaveFocus();
 await w.user.click(screen.getAllByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})[0]!);
 await screen.findByText('Confermato: 1 nuovi oggetti e 0 nuove spese.');
 const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:Array<{fields:Record<string,{action:string}>}>};
 expect(body.choices[0]!.fields.brand).toEqual({action:'accept'});expect(body.choices[0]!.fields.model).toEqual({action:'accept'});
});

it('stored proposals reopen automatically without a new provider job or a separate resume step',async()=>{
 const w=await world({start:true,savedDraft:true});await screen.findByRole('heading',{name:'Router demo'});expect(w.counts().starts).toBe(0);expect(screen.queryByRole('button',{name:'Avvia precompilazione AI'})).not.toBeInTheDocument();
});

it('one confirmation includes the automatically proposed receipt expense without another choice',async()=>{
 const w=await world({purchase:true});await screen.findByText(/Spesa proposta dal documento/);
 expect(screen.getByLabelText('Cosa fare con il costo')).toHaveValue('create');expect(screen.getByLabelText('Importo (€)')).toHaveValue('99.99');
 expect(w.counts().confirmations).toBe(0);await w.user.click(screen.getByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/}));
 await waitFor(()=>expect(w.counts().confirmations).toBe(1));
 const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:Array<{expense:unknown}>};expect(body.choices[0]!.expense).toMatchObject({action:'create',amountCents:9999,spentOn:'2025-06-13'});
});
it('possible expense duplicate blocks default confirmation and lets user explicitly reuse it',async()=>{
 const w=await world({purchase:true,duplicates:true});await screen.findByText(/Ci sono spese potenzialmente/);expect(screen.getByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})).toBeDisabled();
 await w.user.selectOptions(screen.getByLabelText('Cosa fare con il costo'),'link');await w.user.selectOptions(screen.getByLabelText('Spesa esistente'),'expense1');
 await w.user.click(screen.getByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));
 const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:Array<{expense:unknown}>};expect(body.choices[0]!.expense).toEqual({action:'link',id:'expense1',expectedVersion:2});
});
it('failed duplicate lookup never automatically creates a cost; explicit skip remains possible',async()=>{
 const w=await world({purchase:true,expenseFailure:true});await screen.findByText(/Non è stato possibile controllare i doppioni/);expect(screen.getByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})).toBeDisabled();
 await w.user.selectOptions(screen.getByLabelText('Cosa fare con il costo'),'skip');await w.user.click(screen.getByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));
 const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:Array<{expense:unknown}>};expect(body.choices[0]!.expense).toEqual({action:'skip'});
});
it('previously saved explicit skip is never replaced by automatic expense proposal',async()=>{
 await world({purchase:true,savedExpenseSkip:true});await screen.findByLabelText('Cosa fare con il costo');expect(screen.getByLabelText('Cosa fare con il costo')).toHaveValue('skip');expect(screen.queryByText(/Spesa proposta dal documento/)).not.toBeInTheDocument();
});

it('excluding a receipt item clears its proposed cost and sends only skip at the final confirmation',async()=>{
 const w=await world({purchase:true});await screen.findByText(/Spesa proposta dal documento/);
 await w.user.click(screen.getByLabelText('Non riguarda questa casa'));
 expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();expect(screen.queryByLabelText('Importo (€)')).not.toBeInTheDocument();expect(w.counts().confirmations).toBe(0);
 await w.user.click(screen.getByRole('button',{name:'Conferma esclusione'}));await screen.findByText('Escluso dalla casa: nessuna scheda o spesa creata');
 const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:unknown[]};expect(body.choices).toEqual([{itemId:'item0',action:'skip'}]);
});
it('excluding one of several products leaves the remaining product available independently',async()=>{
 const w=await world();await screen.findByRole('heading',{name:'Router demo'});
 const article=screen.getByRole('dialog',{name:'Rivedi l’articolo'});await w.user.click(within(article).getByLabelText('Non riguarda questa casa'));await w.user.click(within(article).getByRole('button',{name:'Conferma esclusione'}));
 await screen.findByText('Escluso dalla casa: nessuna scheda o spesa creata');expect(screen.getByRole('heading',{name:'Speaker demo'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Rivedi Speaker demo'})).toBeEnabled();
});
it('exclusion can be reversed before confirmation and the purchase proposal is checked again',async()=>{
 const w=await world({purchase:true});await screen.findByText(/Spesa proposta dal documento/);await w.user.click(screen.getByLabelText('Non riguarda questa casa'));await w.user.click(screen.getByLabelText('Crea una nuova scheda'));await screen.findByLabelText('Importo (€)');expect(screen.getByLabelText('Cosa fare con il costo')).toHaveValue('create');expect(w.counts().confirmations).toBe(0);
});

it('compact list confirms only selected ready proposals and finds the object just created',async()=>{
 const w=await world({compactList:true,clearCandidates:true,dynamicCandidates:true});
 const first=await screen.findByRole('checkbox',{name:'Seleziona Router demo'});await waitFor(()=>expect(first).toBeEnabled());
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();
 await w.user.click(first);await w.user.click(screen.getByRole('button',{name:'Conferma 1 articoli selezionati'}));
 await screen.findByRole('link',{name:'Apri Router demo'});expect(w.counts().confirmations).toBe(1);
 await w.user.click(screen.getByRole('button',{name:'Rivedi Speaker demo'}));await w.user.click(screen.getByLabelText('Collega a un oggetto già in casa'));
 await waitFor(()=>expect(screen.getByRole('option',{name:'Router demo'})).toBeInTheDocument());
 await w.user.selectOptions(screen.getByLabelText('Scheda da collegare'),'objectitem0');await w.user.click(screen.getByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/}));
 const body=w.calls.filter(c=>c.path.endsWith('/confirmations')).at(-1)!.body as {choices:Array<{action:string;targets:unknown[]}>};expect(body.choices[0]).toMatchObject({action:'link',targets:[{id:'objectitem0',expectedVersion:1}]});
});
it('closing a changed review asks to discard without sending a review or confirmation',async()=>{
 const w=await world();await w.user.clear(screen.getByLabelText('Nome dell’oggetto'));await w.user.type(screen.getByLabelText('Nome dell’oggetto'),'Modifica non confermata');
 await w.user.click(screen.getByRole('button',{name:'Chiudi'}));expect(screen.getByText('Scartare le modifiche non confermate?')).toBeVisible();
 await w.user.click(screen.getByRole('button',{name:'Scarta e chiudi'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(w.calls.filter(c=>c.path.endsWith('/review')||c.path.endsWith('/confirmations'))).toHaveLength(0);
 await w.user.click(screen.getByRole('button',{name:'Rivedi Router demo'}));expect(screen.getByLabelText('Nome dell’oggetto')).toHaveValue('Router demo');
});
it('nested help closes independently and all modal scroll locks clear on unmount',async()=>{
 const w=await world();await w.user.click(screen.getByRole('button',{name:'Informazioni su Marca'}));await w.user.keyboard('{Escape}');expect(screen.getByRole('dialog',{name:'Rivedi l’articolo'})).toBeVisible();expect(document.body.style.overflow).toBe('hidden');
 await w.user.click(screen.getByRole('button',{name:'Informazioni su Marca'}));w.unmount();expect(document.body.style.overflow).not.toBe('hidden');
});

it('official enrichment preserves edits in the open review and prefills new supported fields',async()=>{
 const w=await world();await w.user.clear(screen.getByRole('textbox',{name:'Marca'}));await w.user.type(screen.getByRole('textbox',{name:'Marca'}),'Moulinex');
 await w.user.click(screen.getByRole('button',{name:'Aggiungi altri dati, seriale o garanzia'}));await w.user.type(screen.getByRole('textbox',{name:'Riferimento prodotto'}),'AL4018F0');
 await w.user.click(screen.getByText('Completa dal sito del produttore e cerca il manuale'));await w.user.click(screen.getByRole('button',{name:'Cerca dati e manuale ufficiali'}));
 await waitFor(()=>expect(screen.getByRole('textbox',{name:'Capacità (litri)'})).toHaveValue('3.2'));expect(screen.getByRole('textbox',{name:'Marca'})).toHaveValue('Moulinex');expect(w.counts()).toEqual({confirmations:0,starts:0});
});

it('existing confirmed brand requires explicit replacement consent and carries the observed value',async()=>{
 const w=await world();const dialog=screen.getByRole('dialog',{name:'Rivedi l’articolo'});const d=within(dialog);
 await w.user.click(d.getByLabelText('Collega a un oggetto già in casa'));await w.user.selectOptions(d.getByLabelText('Scheda da collegare'),'existing1');
 await w.user.selectOptions(d.getByLabelText('Scelta per Marca'),'replace');const button=d.getByRole('button',{name:'Conferma questo articolo'});expect(button).toBeDisabled();
 await w.user.click(d.getByRole('checkbox',{name:/Autorizzo la sostituzione di Marca/}));expect(button).toBeEnabled();await w.user.click(button);
 await waitFor(()=>expect(w.counts().confirmations).toBe(1));expect(w.calls.find(c=>c.path.endsWith('/confirmations'))?.body).toMatchObject({choices:[{fields:{brand:{action:'replace',expectedValue:'Confirmed',consent:true}}}]});
});
it('multi-item purchase asks only for this item amount and never copies the grand total',async()=>{
 const w=await world({multiPurchase:true});await w.user.click(screen.getByText('Costo di acquisto (facoltativo)'));
 await w.user.selectOptions(screen.getByLabelText('Cosa fare con il costo'),'create');expect(screen.getByLabelText('Importo (€)')).toHaveValue('');
 const button=screen.getByRole('button',{name:'Conferma oggetto e spesa'});expect(button).toBeDisabled();
 await w.user.type(screen.getByLabelText('Importo (€)'),'99');await w.user.type(screen.getByLabelText('Data della spesa'),'2025-06-13');
 await w.user.click(screen.getByRole('checkbox',{name:/Confermo che questo importo riguarda soltanto/}));await w.user.click(button);
 await waitFor(()=>expect(w.counts().confirmations).toBe(1));expect(w.calls.find(c=>c.path.endsWith('/confirmations'))?.body).toMatchObject({choices:[{expense:{action:'create',amountCents:9900,manualItemAmount:true}}]});
});

it.each(['ai_budget_exhausted','ai_evaluation_limit_reached'])('budget is visible and exhaustion never offers a paid start (%s)',async(disabledReason)=>{
 const w=await world({start:true,budget:{currency:'USD',limitUsd:'5.000000',committedUsd:'4.800000',remainingUsd:'0.200000',callsUsed:40,maxCalls:40,available:false,disabledReason}});
 await screen.findByText(/Budget AI complessivo: 0.20 USD disponibili su 5.00/);expect(screen.getByText(/40\/40 analisi utilizzate/)).toBeInTheDocument();
 expect(screen.getByText(/Il limite non si rinnova automaticamente/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Avvia precompilazione AI'})).not.toBeInTheDocument();expect(w.counts().starts).toBe(0);
});
it('available pilot budget does not preselect consent or start an analysis',async()=>{
 const w=await world({start:true,ai:true,budget:{currency:'USD',limitUsd:'5.000000',committedUsd:'0.000000',remainingUsd:'5.000000',callsUsed:0,maxCalls:40,available:true,disabledReason:null}});
 const button=await screen.findByRole('button',{name:'Avvia precompilazione AI'});expect(button).toBeDisabled();expect(screen.getByRole('checkbox',{name:/Autorizzo/})).not.toBeChecked();expect(w.counts().starts).toBe(0);
});

it('uncertain provider outcome needs both transfer consent and explicit budget acknowledgement before a new start',async()=>{
 const w=await world({start:true,ai:true,uncertainRetry:true});
 const button=await screen.findByRole('button',{name:'Avvia precompilazione AI'});
 expect(button).toBeDisabled();expect(w.counts().starts).toBe(0);
 await w.user.click(screen.getByRole('checkbox',{name:/Autorizzo/}));expect(button).toBeDisabled();
 await w.user.click(screen.getByRole('checkbox',{name:/Voglio riprovare/}));expect(button).toBeEnabled();
 await w.user.click(button);
 await waitFor(()=>expect(w.counts().starts).toBe(1));
 expect(w.calls.find(c=>c.path==='/jobs')?.body).toMatchObject({consentToProviderTransfer:true,acknowledgePreviousUncertainAnalysis:true});
});

it('per-document compilation opens the same prefilled single-item form directly',async()=>{
 const w=await world({purchase:true,compactList:true,compilation:'ai',clearCandidates:true});
 await screen.findByRole('region',{name:'Revisione unica del documento'});
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Nome dell’oggetto')).toHaveValue('Router demo');
 expect(screen.getByLabelText('Marca')).toHaveValue('Lume');
 expect(w.counts()).toEqual({starts:0,confirmations:0});
});

it('a previously unrecorded confirmation is replayed with the same key and replaces the obsolete warning',async()=>{
 const w=await world({lostUnrecorded:true});
 await w.user.click(screen.getByRole('button',{name:'Conferma questo articolo'}));
 await w.user.click(await screen.findByRole('button',{name:'Controlla l’esito'}));
 await screen.findByText(/La conferma non risulta registrata/);
 await w.user.click(screen.getByRole('button',{name:'Invia la stessa conferma'}));
 await screen.findByText('Conferma recuperata: nessun doppione.');
 expect(screen.queryByText(/La conferma non risulta registrata/)).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Apri Router demo'})).toBeInTheDocument();
 const attempts=w.calls.filter(c=>c.path.endsWith('/confirmations'));expect(attempts).toHaveLength(2);expect(attempts[0]!.key).toBe(attempts[1]!.key);
});

it('direct form opening leaves recovery controls accessible when a previous confirmation is pending',async()=>{
 await world({purchase:true,compactList:true,compilation:'manuale',pendingReview:true});
 await screen.findByRole('button',{name:'Controlla l’esito'});
 expect(screen.queryByRole('dialog',{name:'Rivedi l’articolo'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Invia la stessa conferma'})).toBeEnabled();
});

it('unified confirmation sends every open choice once and recovers a lost reply without another confirmation',async()=>{
 const w=await world({compilation:'manuale',compactList:true,clearCandidates:true,lost:true});
 await screen.findByRole('region',{name:'Revisione unica del documento'});
 const second=screen.getByRole('region',{name:'Articolo 2'});
 await w.user.click(within(second).getByRole('radio',{name:'Non riguarda questa casa'}));
 await w.user.click(screen.getByRole('button',{name:'Salva e organizza'}));
 await screen.findByRole('button',{name:'Controlla l’esito'});
 const posts=w.calls.filter(c=>c.path.endsWith('/confirmations'));
 expect(posts).toHaveLength(1);expect(posts[0]!.body).toMatchObject({choices:[{itemId:'item0',action:'create',expense:{action:'skip'}},{itemId:'item1',action:'skip'}]});
 await w.user.click(screen.getByRole('button',{name:'Controlla l’esito'}));
 await screen.findByText('Conferma recuperata: nessun doppione.');expect(w.counts().confirmations).toBe(1);expect(w.counts().starts).toBe(0);
});

it('every article review keeps an original-document link in its fixed header without leaving the edited form',async()=>{
 const w=await world();const panel=screen.getByRole('dialog',{name:'Rivedi l’articolo'});
 const link=within(panel).getByRole('link',{name:'Vedi documento originale (si apre in una nuova scheda)'});
 expect(link).toHaveAttribute('href',expect.stringContaining('/documenti/'+w.wire.snapshot!.documentId+'#doc-anteprima'));
 expect(link).toHaveAttribute('target','_blank');expect(link).toHaveAttribute('rel','noopener noreferrer');
 await w.user.clear(screen.getByLabelText('Nome dell’oggetto'));await w.user.type(screen.getByLabelText('Nome dell’oggetto'),'Nome modificato');
 expect(link).toBeInTheDocument();expect(screen.getByLabelText('Nome dell’oggetto')).toHaveValue('Nome modificato');expect(w.counts()).toEqual({starts:0,confirmations:0});
});

it('works invoice has devices and ONE household expense in ONE review and atomic request',async()=>{const w=await world({documentCost:'works',compilation:'ai',compactList:true,clearCandidates:true});const save=await screen.findByRole('button',{name:'Salva e organizza'});await waitFor(()=>expect(save).toBeEnabled());expect(screen.getAllByRole('button',{name:'Salva e organizza'})).toHaveLength(1);expect(screen.getAllByLabelText('Nome dell’oggetto')).toHaveLength(2);expect(screen.getByLabelText('Importo della spesa (€)')).toHaveValue('1537.2');expect(screen.queryByLabelText('Importo (€)')).not.toBeInTheDocument();await w.user.click(save);await screen.findByText('Confermato: 2 nuovi oggetti e 1 nuove spese.');const posts=w.calls.filter(c=>c.path.endsWith('/confirmations'));expect(posts).toHaveLength(1);expect(posts[0]!.body).toMatchObject({choices:[{action:'create',expense:{action:'skip'}},{action:'create',expense:{action:'skip'}}],houseExpenses:[{action:'create',values:{category:'repairs_works',amountCents:153720,spentOn:'2026-07-08',objectRef:null}}]});expect(w.counts().starts).toBe(0);});
it('service-only invoice confirms a house expense without inventing objects',async()=>{const w=await world({documentCost:'service',compilation:'ai',compactList:true,clearCandidates:true});const save=await screen.findByRole('button',{name:'Registra spesa'});await waitFor(()=>expect(save).toBeEnabled());expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();await w.user.click(save);const post=w.calls.find(c=>c.path.endsWith('/confirmations'))!;expect(post.body).toMatchObject({choices:[],houseExpenses:[{action:'create'}]});expect(post.body).not.toHaveProperty('documentOnly');});
it('accepting an invoice object suggestion retains only the document for proposed components and creates one cost on the existing object',async()=>{
 const w=await world({documentCost:'works',objectSuggestion:true,compilation:'ai',compactList:true,clearCandidates:true,lost:true});
 const reference=await screen.findByLabelText('Oggetto o impianto (facoltativo)');await waitFor(()=>expect(reference).not.toHaveValue(''));expect(w.counts().confirmations).toBe(0);
 expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();await waitFor(()=>expect(screen.getByRole('button',{name:'Registra spesa'})).toBeEnabled());
 await w.user.selectOptions(screen.getByLabelText('Questa spesa è'),'deposit');expect(screen.getByRole('button',{name:'Salva acconto'})).toBeDisabled();expect(w.counts().confirmations).toBe(0);await w.user.click(screen.getByRole('checkbox',{name:/Ho verificato il costo complessivo/}));await w.user.type(screen.getByLabelText('Costo complessivo confermato (€)'),'1537,20');await w.user.click(screen.getByRole('button',{name:'Salva acconto'}));await w.user.click(await screen.findByRole('button',{name:'Controlla l’esito'}));await screen.findByText('Conferma recuperata: nessun doppione.');
 const posts=w.calls.filter(c=>c.path.endsWith('/confirmations'));expect(posts).toHaveLength(1);expect(posts[0]!.body).toMatchObject({choices:[{action:'document_only'},{action:'document_only'}],houseExpenses:[{action:'create',purchaseReview:{mode:'confirmed_total',confirmedTotalCents:153720},values:{title:'Acconto · Lavori elettrici',objectRef:{kind:'object'}}}]});expect(w.counts()).toEqual({confirmations:1,starts:0});
});
it('excluded item blocks the whole invoice total until explicitly corrected',async()=>{const w=await world({documentCost:'works',compilation:'ai',compactList:true,clearCandidates:true});const save=await screen.findByRole('button',{name:'Salva e organizza'});await waitFor(()=>expect(save).toBeEnabled());await w.user.click(within(screen.getByRole('region',{name:'Articolo 2'})).getByRole('radio',{name:'Non riguarda questa casa'}));expect(save).toBeDisabled();await w.user.clear(screen.getByLabelText('Importo della spesa (€)'));await w.user.type(screen.getByLabelText('Importo della spesa (€)'),'1000');await waitFor(()=>expect(save).toBeEnabled());await w.user.click(save);expect(w.calls.find(c=>c.path.endsWith('/confirmations'))!.body).toMatchObject({choices:[{action:'create'},{action:'skip'}],houseExpenses:[{amountSelection:{mode:'manual'},values:{amountCents:100000}}]});});
it('utility bill keeps one final action and never asks for an object',async()=>{const w=await world({documentCost:'bill',compilation:'ai',compactList:true,clearCandidates:true});const save=await screen.findByRole('button',{name:'Registra spesa'});await waitFor(()=>expect(save).toBeEnabled());expect(screen.getAllByRole('button',{name:'Registra spesa'})).toHaveLength(1);expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Aggiungi un altro articolo'})).not.toBeInTheDocument();await w.user.click(save);expect(w.calls.find(c=>c.path.endsWith('/confirmations'))!.body).toMatchObject({choices:[],houseExpenses:[{values:{category:'electricity',objectRef:null}}]});});

it('combined works confirmation survives a lost response with no second creation',async()=>{const w=await world({documentCost:'works',compilation:'ai',compactList:true,clearCandidates:true,lost:true});const save=await screen.findByRole('button',{name:'Salva e organizza'});await waitFor(()=>expect(save).toBeEnabled());await w.user.click(save);await w.user.click(await screen.findByRole('button',{name:'Controlla l’esito'}));await screen.findByText('Conferma recuperata: nessun doppione.');expect(w.counts()).toEqual({confirmations:1,starts:0});const post=w.calls.find(c=>c.path.endsWith('/confirmations'))!;expect(post.body).toMatchObject({choices:[{action:'create'},{action:'create'}],houseExpenses:[{action:'create'}]});});

it('generic invoice expense title uses only its verified service description',()=>{const draft={documentInfo:{facts:[{field:'interventionDescription',subjectIndex:-1,value:'Adeguamento impianto elettrico'}]}} as unknown as Draft;const item={documentKind:'simple_invoice',proposedFields:{title:{value:'Fattura'}}} as unknown as NonNullable<Draft['houseExpenses']>[number];expect(houseExpenseTitle(item,draft)).toBe('Adeguamento impianto elettrico');item.proposedFields.title!.value='Titolo specifico';expect(houseExpenseTitle(item,draft)).toBe('Titolo specifico');});

it('direct declaration draft opens one archive review and submits no object or expense',async()=>{
 const w=await world({conformity:true,compactList:true});const save=await screen.findByRole('button',{name:'Salva e organizza'});expect(save).toBeEnabled();expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();expect(screen.getByRole('link',{name:/Vedi documento originale/})).toBeInTheDocument();await w.user.click(save);
 await waitFor(()=>expect(w.calls.some(c=>c.path.endsWith('/confirmations'))).toBe(true));const post=w.calls.find(c=>c.path.endsWith('/confirmations'))!;expect(post.body).toMatchObject({choices:[],documentOnly:true});expect(post.body).not.toHaveProperty('houseExpenses');
});

it('verified purchase data stays prefilled and its cost is proposed despite an unrelated delivery warning',async()=>{
 const w=await world({purchase:true,completePurchase:true,reviewWarning:'delivery',compilation:'ai',compactList:true,clearCandidates:true});await screen.findByText(/Spesa proposta dal documento/);
 expect(screen.getByLabelText('Nome dell’oggetto')).toHaveValue('Macchina caffe Boreale TestP17');expect(screen.getByLabelText('Marca')).toHaveValue('Boreale');expect(screen.getByLabelText('Modello')).toHaveValue('TestP17');expect(screen.getByLabelText('Data di acquisto')).toHaveValue('2026-04-18');expect(screen.getByLabelText('Importo (€)')).toHaveValue('127.43');
 await w.user.click(screen.getByRole('button',{name:'Aggiungi altri dati, seriale o garanzia'}));expect(screen.getByLabelText('Riferimento prodotto')).toHaveValue('BP17-REF');await w.user.click(screen.getByRole('button',{name:'Salva e organizza'}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:Array<{fields:unknown;expense:unknown}>};expect(body.choices[0]!.fields).toMatchObject({brand:{action:'accept'},model:{action:'accept'},reference:{action:'accept'},purchaseDate:{action:'accept'}});expect(body.choices[0]!.expense).toMatchObject({action:'create',amountCents:12743,spentOn:'2026-04-18'});
});

it.each(['quantity','unknown'] as const)('uncertain %s never proposes a purchase cost automatically',async(reviewWarning)=>{await world({purchase:true,completePurchase:true,reviewWarning,compilation:'ai',compactList:true,clearCandidates:true});await screen.findByRole('button',{name:'Salva e organizza'});expect(screen.queryByText(/Spesa proposta dal documento/)).not.toBeInTheDocument();expect(screen.getByLabelText('Importo (€)')).toHaveValue('127.43');});

it('professional fields are prefilled and saved with the SAME single document confirmation',async()=>{const w=await world({conformity:true,contact:true,compactList:true});await screen.findByRole('button',{name:'Salva e organizza'});expect(screen.getByLabelText('Nome o ragione sociale')).toHaveValue('Boreale Impianti');expect(screen.getByLabelText('Telefono')).toHaveValue('030 1234567');expect(screen.getByLabelText('Partita IVA / codice fiscale')).toHaveValue('12345678903');await w.user.click(screen.getByRole('button',{name:'Salva e organizza'}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));expect(w.calls.find(c=>c.path.endsWith('/confirmations'))!.body).toMatchObject({choices:[],documentOnly:true,contacts:[{proposalId:'contact-proposal',action:'save'}]});await screen.findByRole('link',{name:'Vedi contatto: Boreale Impianti'});});
it('professional can be excluded without adding another confirmation step',async()=>{const w=await world({conformity:true,contact:true,compactList:true});await w.user.click(await screen.findByRole('checkbox',{name:'Aggiungi o collega alla rubrica'}));await w.user.click(screen.getByRole('button',{name:'Salva e organizza'}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));expect(w.calls.find(c=>c.path.endsWith('/confirmations'))!.body).toMatchObject({contacts:[{proposalId:'contact-proposal',action:'skip'}]});});


it('a direct AI URL reopens successful extraction without consent or another analysis',async()=>{
 const w=await world({start:true,ai:true,analysisSucceeded:true,compilation:'ai'});
 await screen.findByText(/Questo documento è già stato analizzato con successo/);
 expect(screen.queryByRole('button',{name:'Avvia precompilazione AI'})).not.toBeInTheDocument();
 expect(screen.queryByLabelText(/Autorizzo l’invio di questo documento/)).not.toBeInTheDocument();
 expect(screen.queryByText('Scegli la precompilazione AI')).not.toBeInTheDocument();
 expect(w.counts().starts).toBe(0);
 expect(w.calls.some(r=>r.path.endsWith('/jobs'))).toBe(false);
});

it('native date input survives other field edits and reaches the durable confirmation without purchase or warranty inference',async()=>{
 const w=await world();
 fireEvent.input(screen.getByLabelText('Data dell’ordine'),{target:{value:'2026-06-14'}});
 await w.user.clear(screen.getByLabelText('Nome dell’oggetto'));await w.user.type(screen.getByLabelText('Nome dell’oggetto'),'Apparato da ordine');
 expect(screen.getByLabelText('Data dell’ordine')).toHaveValue('2026-06-14');
 await w.user.click(screen.getByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/}));
 await waitFor(()=>expect(w.counts().confirmations).toBe(1));
 const post=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:Array<{fields:Record<string,unknown>;expense:unknown}>};
 expect(post.choices[0]!.fields.orderDate).toEqual({action:'manual',value:'2026-06-14'});expect(post.choices[0]!.fields.purchaseDate).toBeUndefined();expect(post.choices[0]!.fields.warrantyStart).toBeUndefined();expect(post.choices[0]!.expense).toEqual({action:'skip'});
});
it('partial invoice confirmation durably saves deferred cost form and clears no user inputs on the review write',async()=>{
 const w=await world({documentCost:'works',compilation:'manuale',compactList:true,clearCandidates:true});
 await w.user.click(await screen.findByText('Altri dati e collegamenti'));
 await w.user.selectOptions(screen.getByLabelText('Come registrare la spesa'),'defer');
 await w.user.selectOptions(screen.getByLabelText('Questa spesa è'),'balance');
 const save=screen.getByRole('button',{name:'Salva e organizza'});await waitFor(()=>expect(save).toBeEnabled());await w.user.click(save);
 await waitFor(()=>expect(w.counts().confirmations).toBe(1));
 const review=w.calls.find(c=>c.path.endsWith('/review'))!.body as {review:{compilation:{houseForms:Record<string,{mode:string;title:string}>};pending:{body:unknown}}};
 expect(review.review.compilation.houseForms['house-cost']).toMatchObject({mode:'defer',title:'Saldo · Lavori elettrici'});expect(review.review.pending.body).toMatchObject({houseExpenses:[{itemId:'house-cost',action:'defer'}]});
 const route=w.router.state.location.pathname+w.router.state.location.search;await w.router.navigate('/case');await screen.findByRole('heading',{name:'Le mie case'});await w.router.navigate(route);await screen.findByRole('heading',{name:'Rivedi e organizza'});expect(screen.getByLabelText('Come registrare la spesa')).toHaveValue('defer');expect(screen.getByLabelText('Questa spesa è')).toHaveValue('balance');expect(w.counts().confirmations).toBe(1);
});

it('short display name retains visible complete variant and separate model without sending AI or confirming',async()=>{
 const w=await world({shortName:true});
 expect(screen.getByLabelText('Nome dell’oggetto')).toHaveValue('Router demo');
 expect(screen.getByLabelText('Modello')).toHaveValue('ZX-82/B');
 const region=screen.getByRole('region',{name:'Nome esteso del prodotto'});
 expect(within(region).getByText(w.wire.items[0]!.fullName!)).toBeVisible();
 expect(within(region).getByText(/Controlla modello e varianti/)).toBeVisible();
 expect(w.counts()).toEqual({confirmations:0,starts:0});
 expect(w.calls.every(c=>!c.path.endsWith('/jobs')&&!c.path.endsWith('/confirmations'))).toBe(true);
});
it('source mismatch never reveals the preserved extended name',async()=>{
 const w=await world({shortName:true,foreign:true});
 await screen.findByText(/Queste proposte appartengono a un altro documento/);
 await waitFor(()=>expect(screen.queryByRole('region',{name:'Nome esteso del prodotto'})).not.toBeInTheDocument());
 expect(screen.queryByText(w.wire.items[0]!.fullName!)).not.toBeInTheDocument();
 expect(w.counts()).toEqual({confirmations:0,starts:0});
});

// The same routed owner and mock API exercise both renderers; no alternate serializer.
describe('Schede predefinite e ritorno esplicito alla pagina unica',()=>{
 it.each([undefined,'schede','valore-sconosciuto'])('apre le schede con vista %s senza scritture',async(viewValue)=>{
  const w=await world({defaultView:true,viewValue,compactList:true});
  await screen.findByRole('heading',{level:2,name:'Documento'});
  expect(screen.getByRole('region',{name:'Compilazione del documento a schede'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Torna alla pagina unica'})).toBeEnabled();
  expect(w.calls.filter(c=>c.body)).toHaveLength(0);expect(w.counts().starts).toBe(0);
 });
 it.each(['ai','manuale'] as const)('mantiene bozza e modo %s passando da schede a pagina unica e ritorno',async(compilation)=>{
  const w=await world({defaultView:true,compilation,compactList:true});
  await screen.findByRole('heading',{level:2,name:'Documento'});
  await w.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:'Contenuto'});
  await w.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:'Articolo 1'});
  await w.user.clear(screen.getByLabelText('Nome dell’oggetto'));await w.user.type(screen.getByLabelText('Nome dell’oggetto'),'Router conservato');
  await w.user.click(screen.getByRole('button',{name:'Torna alla pagina unica'}));
  await screen.findByRole('region',{name:'Revisione unica del documento'});
  expect(screen.getAllByLabelText('Nome dell’oggetto')[0]).toHaveValue('Router conservato');
  expect(w.router.state.location.search).toContain('bozza=draft-onboarding');
  expect(w.router.state.location.search).toContain('compila='+compilation);
  expect(w.router.state.location.search).toContain('vista-compilazione=unica');
  await w.user.click(screen.getByRole('button',{name:'Usa la compilazione a schede'}));
  await screen.findByRole('heading',{level:2,name:'Documento'});
  expect(w.router.state.location.search).not.toContain('vista-compilazione');
  await w.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:'Contenuto'});
  await w.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:'Articolo 1'});
  expect(screen.getByLabelText('Nome dell’oggetto')).toHaveValue('Router conservato');
  expect(w.calls.filter(c=>c.body)).toHaveLength(0);expect(w.counts().starts).toBe(0);
 });
 it('dal link diretto senza compila torna alla pagina unica completa e non alla lista di selezione',async()=>{
  const w=await world({defaultView:true,compactList:true});
  await screen.findByRole('heading',{level:2,name:'Documento'});
  await w.user.click(screen.getByRole('button',{name:'Torna alla pagina unica'}));
  await screen.findByRole('region',{name:'Revisione unica del documento'});
  expect(w.router.state.location.search).toContain('bozza=draft-onboarding');
  expect(w.router.state.location.search).toContain('compila=ai');
  expect(w.calls.filter(c=>c.body)).toHaveLength(0);expect(w.counts().starts).toBe(0);
 });
});
describe('Compilazione a schede, confronto offline con la pagina unica',()=>{
 async function next(w:Awaited<ReturnType<typeof world>>,heading:string){await w.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:heading});}
 it('naviga senza scritture, mantiene i campi locali e torna a una riga esclusa',async()=>{
  const w=await world({stepped:true,compilation:'ai',compactList:true});
  await screen.findByRole('heading',{level:2,name:'Documento'});expect(screen.getByRole('heading',{level:2,name:'Documento'})).toHaveFocus();
  await next(w,'Contenuto');await next(w,'Articolo 1');
  await w.user.clear(screen.getByLabelText('Nome dell’oggetto'));await w.user.type(screen.getByLabelText('Nome dell’oggetto'),'Router modificato');
  await w.user.click(screen.getByText('Completa dal sito del produttore e cerca il manuale'));await w.user.type(screen.getByLabelText('Pagina prodotto ufficiale (se necessaria)'),'https://example.test/router');
  await w.user.click(screen.getByRole('button',{name:'Indietro'}));
  const row=screen.getByRole('group',{name:/Articolo 1/});await w.user.click(within(row).getByRole('radio',{name:'Non riguarda la casa'}));
  expect(screen.queryByRole('textbox',{name:'Nome dell’oggetto'})).not.toBeInTheDocument();
  await w.user.click(within(row).getByRole('radio',{name:'Nuovo oggetto'}));await next(w,'Articolo 1');
  expect(screen.getByLabelText('Nome dell’oggetto')).toHaveValue('Router modificato');expect(screen.getByLabelText('Pagina prodotto ufficiale (se necessaria)')).toHaveValue('https://example.test/router');
  expect(w.calls.filter(c=>c.body)).toHaveLength(0);expect(w.counts().starts).toBe(0);
  await w.user.click(screen.getByRole('button',{name:'Torna alla pagina unica'}));await screen.findByRole('region',{name:'Revisione unica del documento'});expect(screen.getAllByLabelText('Nome dell’oggetto')[0]).toHaveValue('Router modificato');expect(w.router.state.location.search).toContain('bozza=draft-onboarding');expect(w.router.state.location.search).toContain('compila=ai');expect(w.router.state.location.search).toContain('vista-compilazione=unica');
 });
 it('il nome obbligatorio blocca solo il passo articolo e la bozza incompleta si può salvare',async()=>{
  const w=await world({stepped:true,compilation:'ai',compactList:true});await screen.findByRole('heading',{level:2,name:'Documento'});
  await next(w,'Contenuto');await next(w,'Articolo 1');fireEvent.change(screen.getByLabelText('Nome dell’oggetto'),{target:{value:''}});
  await w.user.click(screen.getByRole('button',{name:'Avanti'}));expect(screen.getByRole('alert')).toHaveTextContent('indica il nome');
  await w.user.click(screen.getByRole('button',{name:'Salva bozza ed esci'}));await waitFor(()=>expect(w.calls.some(c=>c.path.endsWith('/review'))).toBe(true));
  expect(w.counts().confirmations).toBe(0);const body=w.calls.find(c=>c.path.endsWith('/review'))!.body as {review:{forms:Record<string,Form>}};
  expect(body.review.forms.item0!.name).toBe('');expect(body).not.toHaveProperty('passo');
 });
 it('sei passaggi e payload completo identico per crea, collega e non riguarda la casa',async()=>{
  async function execute(stepped:boolean){
   const w=await world({stepped,defaultView:stepped,fixedDocument:true,threeRows:true,compilation:'ai',compactList:true});
   if(stepped){await screen.findByRole('heading',{level:2,name:'Documento'});await next(w,'Contenuto');
    await w.user.click(within(screen.getByRole('group',{name:/Articolo 2/})).getByRole('radio',{name:'Collega a un oggetto'}));
    await w.user.click(within(screen.getByRole('group',{name:/Articolo 3/})).getByRole('radio',{name:'Non riguarda la casa'}));
    expect(screen.getByRole('navigation',{name:'Passaggi della compilazione'}).querySelectorAll('li')).toHaveLength(6);
    await next(w,'Articolo 1');await next(w,'Articolo 2');await w.user.selectOptions(await screen.findByLabelText('Scheda da collegare'),'existing1');
    await next(w,'Spese');await next(w,'Riepilogo');
   }else{
    await screen.findByRole('region',{name:'Revisione unica del documento'});
    const rows=screen.getAllByRole('region',{name:/Articolo [123]$/});
    await w.user.click(within(rows[1]!).getByLabelText('Collega a un oggetto già in casa'));await w.user.selectOptions(within(rows[1]!).getByLabelText('Scheda da collegare'),'existing1');
    await w.user.click(within(rows[2]!).getByLabelText('Non riguarda questa casa'));
   }
   await w.user.click(screen.getByRole('button',{name:stepped?'Salva e continua':'Salva e organizza'}));
   await waitFor(()=>expect(w.counts().confirmations).toBe(1));const body=structuredClone(w.calls.find(c=>c.path.endsWith('/confirmations'))!.body);w.unmount();w.queryClient.clear();return body;
  }
  const legacy=await execute(false),steps=await execute(true);expect(steps).toEqual(legacy);
  expect(steps).toMatchObject({expectedVersion:2,source:{documentVersion:1,sha256:'a'.repeat(64)},choices:[{action:'create'},{action:'link',targets:[{id:'existing1',expectedVersion:3}]},{itemId:'item2',action:'skip'}]});
 });
 it('la bolletta passa direttamente a spese, con un unico costo e senza chiamate AI',async()=>{
  const w=await world({stepped:true,compilation:'ai',compactList:true,documentCost:'bill'});await screen.findByRole('heading',{level:2,name:'Documento'});await next(w,'Spese');
  expect(screen.queryByRole('button',{name:/Contenuto/})).not.toBeInTheDocument();await waitFor(()=>expect(screen.getByRole('button',{name:'Avanti'})).toBeEnabled());
  await w.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:'Riepilogo'});
  await w.user.click(screen.getByRole('button',{name:'Salva e continua'}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));
  expect(w.calls.find(c=>c.path.endsWith('/confirmations'))!.body).toMatchObject({choices:[],houseExpenses:[{itemId:'house-cost',action:'create',values:{amountCents:153720,competenceFrom:'2026-07-01',competenceTo:'2026-07-31'}}]});expect(w.counts().starts).toBe(0);
 });
 it('i doppioni non diventano assenza di spesa e richiedono una scelta prima del riepilogo',async()=>{
  const w=await world({stepped:true,compilation:'ai',compactList:true,purchase:true,duplicates:true});await screen.findByRole('heading',{level:2,name:'Documento'});await next(w,'Contenuto');await next(w,'Articolo 1');await next(w,'Spese');
  await screen.findByText(/Possibile doppione: scegli/);await w.user.click(screen.getByRole('button',{name:'Avanti'}));expect(screen.getByRole('alert')).toHaveTextContent('possibili doppioni');
  await w.user.selectOptions(screen.getByLabelText('Cosa fare con il costo'),'link');await w.user.selectOptions(screen.getByLabelText('Spesa esistente'),'expense1');await next(w,'Riepilogo');
  await w.user.click(screen.getByRole('button',{name:'Salva e continua'}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));expect(w.calls.find(c=>c.path.endsWith('/confirmations'))!.body).toMatchObject({choices:[{expense:{action:'link',id:'expense1',expectedVersion:2}}]});
 });
 it('un controllo doppioni fallito non si converte in controllo riuscito',async()=>{
  const w=await world({stepped:true,compilation:'ai',compactList:true,purchase:true,expenseFailure:true});await screen.findByRole('heading',{level:2,name:'Documento'});await next(w,'Contenuto');await next(w,'Articolo 1');await next(w,'Spese');await screen.findByText(/Non è stato possibile controllare i doppioni/);
  await w.user.click(screen.getByRole('button',{name:'Avanti'}));expect(screen.getByRole('heading',{level:2,name:'Spese'})).toBeInTheDocument();expect(w.counts().confirmations).toBe(0);
 });
 it('una conferma incerta conserva la chiave e recupera la ricevuta senza nuovo POST',async()=>{
  const w=await world({stepped:true,compilation:'ai',compactList:true,purchase:true,lost:true});await screen.findByRole('heading',{level:2,name:'Documento'});await next(w,'Contenuto');await next(w,'Articolo 1');await next(w,'Spese');await screen.findByText(/Spesa proposta dal documento/);await next(w,'Riepilogo');await w.user.click(screen.getByRole('button',{name:'Salva e continua'}));
  await w.user.click(await screen.findByRole('button',{name:'Controlla l’esito'}));await screen.findByText('Conferma recuperata: nessun doppione.');expect(w.counts().confirmations).toBe(1);expect(w.counts().starts).toBe(0);
 });
});
describe('Schede: documenti, contatti e quantità senza riduzioni del contratto',()=>{
 async function next(w:Awaited<ReturnType<typeof world>>,heading:string){await w.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:heading});}
 it('solo documento salvato riapre due schede e conferma senza oggetti, spese o contatti',async()=>{
  const w=await world({stepped:true,compilation:'ai',compactList:true,savedDocumentOnly:true,contact:true});await screen.findByRole('heading',{level:2,name:'Documento'});
  expect(screen.getByRole('navigation',{name:'Passaggi della compilazione'}).querySelectorAll('li')).toHaveLength(2);await next(w,'Riepilogo');await w.user.click(screen.getByRole('button',{name:'Salva documento'}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));
  const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body;expect(body).toMatchObject({choices:[],documentOnly:true});expect(body).not.toHaveProperty('contacts');expect(body).not.toHaveProperty('houseExpenses');
 });
 it('i contatti hanno una scheda propria e la risoluzione ambigua blocca solo quel passo',async()=>{
  const w=await world({stepped:true,compilation:'ai',compactList:true,contact:true,contactReview:true});await screen.findByRole('heading',{level:2,name:'Documento'});await next(w,'Contenuto');await next(w,'Articolo 1');await next(w,'Articolo 2');await next(w,'Spese');await next(w,'Contatti');
  await w.user.click(screen.getByRole('button',{name:'Avanti'}));expect(screen.getByRole('alert')).toHaveTextContent('Scegli come gestire il contatto');
  await w.user.click(screen.getByRole('checkbox',{name:'Confermo che è un nuovo contatto'}));await next(w,'Riepilogo');await w.user.click(screen.getByRole('button',{name:'Salva e continua'}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));expect(w.calls.find(c=>c.path.endsWith('/confirmations'))!.body).toMatchObject({contacts:[{proposalId:'contact-proposal',action:'save',createDistinct:true}]});
 });
 it('due esemplari richiedono due target e conserva il collegamento passando da escluso a collega',async()=>{
  const w=await world({stepped:true,compilation:'ai',compactList:true,quantityTwo:true});await screen.findByRole('heading',{level:2,name:'Documento'});await next(w,'Contenuto');
  const row=screen.getByRole('group',{name:/Articolo 1/});await w.user.click(within(row).getByRole('radio',{name:'Collega a un oggetto'}));await next(w,'Articolo 1');await screen.findByLabelText('Scheda per esemplare 1');
  await w.user.selectOptions(screen.getByLabelText('Scheda per esemplare 1'),'existing1');await w.user.click(screen.getByRole('button',{name:'Avanti'}));expect(screen.getByRole('alert')).toHaveTextContent('ogni esemplare');
  await w.user.selectOptions(screen.getByLabelText('Scheda per esemplare 2'),'existing2');await w.user.click(screen.getByRole('button',{name:'Indietro'}));
  await w.user.click(within(screen.getByRole('group',{name:/Articolo 1/})).getByRole('radio',{name:'Non riguarda la casa'}));await w.user.click(within(screen.getByRole('group',{name:/Articolo 1/})).getByRole('radio',{name:'Collega a un oggetto'}));await next(w,'Articolo 1');
  expect(screen.getByLabelText('Scheda per esemplare 1')).toHaveValue('existing1');expect(screen.getByLabelText('Scheda per esemplare 2')).toHaveValue('existing2');
  await next(w,'Articolo 2');await next(w,'Spese');await next(w,'Riepilogo');await w.user.click(screen.getByRole('button',{name:'Salva e continua'}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));expect(w.calls.find(c=>c.path.endsWith('/confirmations'))!.body).toMatchObject({choices:[{action:'link',targets:[{id:'existing1',expectedVersion:3},{id:'existing2',expectedVersion:4}]},{action:'create'}]});
 });
 it('i passi futuri non si raggiungono da tastiera e i pannelli precedenti sono nascosti e inert',async()=>{
  const w=await world({stepped:true,compilation:'ai',compactList:true});await screen.findByRole('heading',{level:2,name:'Documento'});
  const nav=screen.getByRole('navigation',{name:'Passaggi della compilazione'});expect(within(nav).getByRole('button',{name:'2. Contenuto'})).toBeDisabled();
  await w.user.tab();expect(screen.getByRole('link',{name:/Vedi documento originale/})).toHaveFocus();await w.user.click(screen.getByRole('button',{name:'Avanti'}));expect(screen.getByRole('heading',{level:2,name:'Contenuto'})).toHaveFocus();expect(within(nav).getByRole('button',{name:'2. Contenuto'})).toHaveAttribute('aria-current','step');
  const documentFields=screen.getByText('Ordine sintetico');expect(documentFields.closest('[hidden]')).toHaveAttribute('inert');expect(documentFields).not.toBeVisible();
 });
});
it.each(['works','bill','service'] as const)('schede: parità integrale di body con spesa globale %s, contatti e compilazione manuale',async documentCost=>{
 const currentLabel=documentCost==='works'?'Salva e organizza':'Registra spesa';
 async function execute(stepped:boolean){
  const w=await world({stepped,defaultView:stepped,fixedDocument:true,documentCost,contact:true,manualMode:true,compilation:'manuale',compactList:true});
  if(stepped){
   await screen.findByRole('heading',{level:2,name:'Documento'});
   for(const heading of [...(documentCost==='works'?['Contenuto','Articolo 1','Articolo 2']:[]),'Spese','Contatti','Riepilogo']){
    await w.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:heading});
   }
   expect(screen.getByText(/Contatti da salvare in Rubrica: 1/)).toBeInTheDocument();
  }else await screen.findByRole('button',{name:currentLabel});
  await waitFor(()=>expect(screen.getByRole('button',{name:stepped?'Salva e continua':currentLabel})).toBeEnabled());
  await w.user.click(screen.getByRole('button',{name:stepped?'Salva e continua':currentLabel}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));
  const body=structuredClone(w.calls.find(c=>c.path.endsWith('/confirmations'))!.body);w.unmount();w.queryClient.clear();return body;
 }
 const legacy=await execute(false),stepped=await execute(true);expect(stepped).toEqual(legacy);expect(stepped).not.toHaveProperty('manualPurchaseTotalCents');
});
