import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiClient } from '../api/client';
import { FakeBackend } from '../test/fakeBackend';
import { createFakeFetch, renderApp } from '../test/harness';
import type { AiBudget, Draft, Form } from './model';
import { choice, initialForm } from './model';
async function world(options:{compilation?:'ai'|'manuale';lostUnrecorded?:boolean;pendingReview?:boolean;budget?:AiBudget;login?:boolean;start?:boolean;ai?:boolean;lost?:boolean;lostStart?:boolean;invalid?:boolean;foreign?:boolean;newAuthorization?:boolean;uncertainRetry?:boolean;derivedIdentity?:boolean;savedDraft?:boolean;purchase?:boolean;multiPurchase?:boolean;duplicates?:boolean;expenseFailure?:boolean;savedExpenseSkip?:boolean;compactList?:boolean;clearCandidates?:boolean;dynamicCandidates?:boolean}={}){
 const backend=new FakeBackend(),password='onboarding-demo-password',account=backend.seedAccount('Test','onboarding@example.test',password),home=backend.seedHome(account.id,'Casa sintetica','Via Test');
 const doc=await backend.seedDocument({homeId:home.id,uploaderId:account.id,name:'Ordine sintetico'}),control=createFakeFetch(backend),api=new ApiClient({fetch:control.fetch});
 if(options.login!==false){await api.login({email:account.email,password});await api.getSession();}
 const wire:Draft={id:'draft-onboarding',version:1,state:'open',mode:'extraction',snapshot:{documentId:options.foreign?'other-document':doc.id,documentVersion:1,sha256:'a'.repeat(64)},document:{id:doc.id,name:doc.name,mimeType:'application/pdf'},documentKind:'delivery_notice',items:['Router demo','Speaker demo'].map((name,i)=>({id:'item'+i,nameTruncated:false,disposition:'household_object',fields:{name:{value:name,source:{documentId:doc.id,page:1,excerpt:name}}},quantity:null,profile:{brand:{value:'Lume',origin:'extraction_confirmed',sources:[{documentId:doc.id,page:1,excerpt:'Lume'}]}},enrichment:null,decision:null})),needsReview:false,purchaseTotal:null,review:null,permissions:['read','edit']};
 if(options.purchase){wire.documentKind='purchase_document';wire.items=wire.items.slice(0,1);wire.items[0]!.profile.purchaseDate={value:'2025-06-13',origin:'extraction_confirmed',sources:[]};wire.purchaseTotal={amountCents:9999};}
 if(options.multiPurchase){wire.documentKind='purchase_document';wire.purchaseTotal={amountCents:22990};}
 if(options.savedExpenseSkip)wire.review={forms:{item0:initialForm(wire.items[0]!,{...wire,mode:'manual'})}};
 if(options.derivedIdentity)for(const item of wire.items)item.profile={brand:{value:'Amazon',origin:'derived_from_product_name',sources:[{documentId:doc.id,page:1,excerpt:'Amazon Echo Dot Max'}]},model:{value:'Echo Dot Max',origin:'derived_from_product_name',sources:[{documentId:doc.id,page:1,excerpt:'Amazon Echo Dot Max'}]}};
 if(options.pendingReview)wire.review={pending:{path:'/drafts/'+wire.id+'/confirmations',key:'same-confirmation',body:{expectedVersion:2,source:wire.snapshot,choices:[]}}};
 const calls:Array<{path:string;body:unknown;key:string|null}>=[];let confirmations=0,starts=0,saved=false;
 const fetch=async(url:string,init:RequestInit)=>{
  if(!url.includes('/object-onboarding'))return control.fetch(url,init);
  const path=url.split('/object-onboarding')[1]!,body=init.body?JSON.parse(String(init.body)):undefined;calls.push({path,body,key:new Headers(init.headers).get('Idempotency-Key')});
  if(path.startsWith('/capabilities'))return Response.json({budget:options.budget,manualAvailable:true,aiAvailable:!!options.ai,requiresConsent:true,drafts:options.savedDraft?[{id:wire.id,state:'open'}]:[],canStartWithUncertainAcknowledgement:!!options.uncertainRetry,canStartAnalysis:options.uncertainRetry?false:options.newAuthorization?true:undefined,job:(options.newAuthorization||options.uncertainRetry)?{id:"old-job",state:"uncertain",draftId:null,errorCode:"analysis_outcome_unknown"}:null});
  if(path==='/jobs'){starts++;if(options.lostStart&&starts===1)throw new TypeError('lost');return Response.json({job:{id:'job1',state:'queued',draftId:null,errorCode:null}},{status:202});}
  if(path==='/jobs/old-job')return Response.json({job:{id:'old-job',state:'uncertain',draftId:null,errorCode:'analysis_outcome_unknown'}});
  if(path.startsWith('/jobs/'))return Response.json({job:{id:'job1',state:'succeeded',draftId:wire.id,errorCode:null}});
  if(path.includes('/candidates')&&options.dynamicCandidates&&wire.items[0]?.decision?.state==='confirmed')return Response.json({items:[{id:'objectitem0',name:'Router demo',version:1,profile:{fields:{},unavailable:false},rooms:[],reason:'confirmed_item'}],nextCursor:null});
  if(path.includes('/candidates')&&options.clearCandidates)return Response.json({items:[],nextCursor:null});
  if(path.includes('/candidates'))return Response.json({items:[{id:'existing1',name:'Speaker Studio',version:3,profile:{fields:{brand:{value:'Confirmed',origin:'user_declared',sources:[]}},unavailable:false},rooms:['Studio'],reason:'same_brand_model'}],nextCursor:null});
  if(path.includes('/expense-candidates'))return options.expenseFailure?Response.json({error:{code:'unavailable',message:'Unavailable'}},{status:503}):Response.json({items:options.duplicates?[{id:'expense1',title:'Acquisto già registrato',amountCents:9999,spentOn:'2025-06-13',version:2,rank:1}]:[],nextCursor:null});
  if(path.endsWith('/enrichment')){wire.items[0]!.profile.capacityLitres={value:'3.2',origin:'manufacturer_page',sources:[]};wire.version++;return Response.json({draft:wire});}
  if(path.endsWith('/review')){wire.review=body.review;wire.version++;return Response.json({draft:wire});}
  if(path.includes('/confirmations/'))return Response.json({status:saved?'confirmed':'not_found',draft:wire});
  if(path.endsWith('/confirmations')){
   confirmations++;if(options.lostUnrecorded&&confirmations===1)throw new TypeError('lost before recording');if(options.invalid&&confirmations===1)return Response.json({error:{code:'validation_error',message:'Controlla la scelta'}},{status:422});
   saved=true;wire.version++;wire.review=null;
   for(const c of body.choices){const item=wire.items.find(i=>i.id===c.itemId)!;item.decision={state:c.action==='defer'?'deferred':c.action==='skip'?'skipped':'confirmed',newObjects:c.action==='create'?1:0,newExpenses:0,objects:c.action==='create'?[{id:'object'+item.id,name:c.name,state:'active'}]:[]};}
   wire.state=wire.items.every(i=>i.decision?.state==='confirmed'||i.decision?.state==='skipped')?'confirmed':'open';
   if(options.lost&&confirmations===1)throw new TypeError('lost response');
   return Response.json({draft:wire,result:{newObjects:body.choices.filter((c:{action:string})=>c.action==='create').length,newExpenses:0}});
  }
  if(path.startsWith('/drafts/')||path==='/manual-drafts')return Response.json({draft:wire});
  return Response.json({error:{code:'not_found',message:'Unknown'}},{status:404});
 };
 const app=renderApp({backend,fetch,path:'/home/'+home.id+'/documenti/'+doc.id+'/oggetti'+(options.start?'':'?bozza='+wire.id)+(options.compilation?'&compila='+options.compilation:'')});
 if(!options.compactList&&options.login!==false&&!options.foreign&&(!options.start||options.savedDraft)){await screen.findByRole('button',{name:'Rivedi Router demo'});await app.user.click(screen.getByRole('button',{name:'Rivedi Router demo'}));}
 return {...app,wire,calls,counts:()=>({confirmations,starts})};
}
describe('Onboarding reale nel router, API simulate e nessun invio esterno',()=>{
 it('guard login protegge il deep link prima di leggere documenti e proposte',async()=>{const w=await world({login:false});await screen.findByRole('heading',{name:/Accedi/});expect(w.calls).toHaveLength(0);expect(w.router.state.location.search).toContain('next=');});
 it('AI disabilitata mostra compilazione manuale e non inventa risultati',async()=>{const w=await world({start:true});await screen.findByText(/L’analisi AI di questo documento non è abilitata/);expect(screen.queryByRole('button',{name:'Avvia compilazione AI'})).not.toBeInTheDocument();await w.user.click(screen.getByRole('button',{name:'Compila manualmente'}));await screen.findByRole('heading',{name:'Rivedi gli articoli'});expect(w.counts().starts).toBe(0);});
 it('conferma un articolo e lascia l’altro da rivedere; nessuna spesa da una consegna',async()=>{const w=await world();await screen.findByRole('heading',{name:'Router demo'});expect(screen.queryByText('Spesa di acquisto (facoltativa)')).not.toBeInTheDocument();await w.user.click(screen.getAllByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})[0]!);await screen.findByText('Confermato: 1 nuovi oggetti e 0 nuove spese.');expect(screen.getByRole('link',{name:'Apri Router demo'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Rivedi Speaker demo'})).toBeInTheDocument();expect(w.counts().confirmations).toBe(1);});
 it('esito perso si recupera tramite ricevuta senza un secondo POST',async()=>{const w=await world({lost:true});await screen.findByRole('heading',{name:'Router demo'});await w.user.click(screen.getAllByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})[0]!);await screen.findByRole('button',{name:'Controlla l’esito'});expect(screen.getByRole('button',{name:'Rivedi Speaker demo'})).toBeDisabled();await w.user.click(screen.getByRole('button',{name:'Controlla l’esito'}));await screen.findByText('Conferma recuperata: nessun doppione.');expect(w.counts().confirmations).toBe(1);});
 it('avvio perso ripete solo la stessa richiesta con consenso e chiave stabili',async()=>{const w=await world({start:true,ai:true,lostStart:true});const consent=await screen.findByRole('checkbox');expect(screen.getByRole('button',{name:'Avvia compilazione AI'})).toBeDisabled();await w.user.click(consent);await w.user.click(screen.getByRole('button',{name:'Avvia compilazione AI'}));await w.user.click(await screen.findByRole('button',{name:'Verifica ripetendo la stessa richiesta'}));await screen.findByRole('heading',{name:'Rivedi gli articoli'});const posts=w.calls.filter(c=>c.path==='/jobs');expect(posts).toHaveLength(2);expect(posts[0]).toEqual(posts[1]);expect(posts[0]!.body).toMatchObject({consentToProviderTransfer:true,provider:'anthropic'});});
 it('il collegamento esistente richiede una scelta esplicita e protegge il valore attuale',async()=>{const w=await world();await screen.findByRole('heading',{name:'Router demo'});const article=screen.getByRole('dialog',{name:'Rivedi l’articolo'});await w.user.click(within(article).getByLabelText('Collega a un oggetto già in casa'));const select=within(article).getByLabelText('Scheda da collegare');expect(select).toHaveValue('');await w.user.selectOptions(select,'existing1');expect(within(article).getByText('Attuale confermato: Confirmed')).toBeInTheDocument();expect(within(article).getByLabelText('Scelta per Marca')).toHaveValue('keep');expect(within(article).queryByRole('option',{name:'Usa la proposta'})).not.toBeInTheDocument();});
 it('errore di validazione libera i campi e non lascia la conferma incerta',async()=>{const w=await world({invalid:true});await screen.findByRole('heading',{name:'Router demo'});await w.user.click(screen.getAllByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})[0]!);await screen.findByText('Controlla la scelta');await waitFor(()=>expect(screen.getAllByRole('button',{name:/^Conferma (questo articolo|oggetto e spesa)$/})[0]).toBeEnabled());expect(screen.queryByRole('button',{name:'Controlla l’esito'})).not.toBeInTheDocument();});
 it('non mescola originale e bozza di due documenti diversi',async()=>{await world({foreign:true});await screen.findByText(/Queste proposte appartengono a un altro documento/);expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();});
 it('payload confermato include solo scelte esplicite, non campi o fonti inseriti dal client',()=>{const draft={purchaseTotal:null} as Draft,item={id:'x',profile:{},fields:{name:{value:'Router'}},enrichment:null} as Draft['items'][number];const form:Form=initialForm(item,draft);const result=choice(item,form);expect(result).toMatchObject({action:'create',itemId:'x',name:'Router',expense:{action:'skip'},fields:{},manual:null});expect(result).not.toHaveProperty('profile');});
});

it('separate operator authorization permits a new start but still requires fresh consent',async()=>{
 const w=await world({start:true,ai:true,newAuthorization:true});
 const button=await screen.findByRole('button',{name:'Avvia compilazione AI'});
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
 const w=await world({start:true,savedDraft:true});await screen.findByRole('heading',{name:'Router demo'});expect(w.counts().starts).toBe(0);expect(screen.queryByRole('button',{name:'Avvia compilazione AI'})).not.toBeInTheDocument();
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
 const w=await world({multiPurchase:true});await w.user.click(screen.getByText('Spesa di acquisto (facoltativa)'));
 await w.user.selectOptions(screen.getByLabelText('Cosa fare con il costo'),'create');expect(screen.getByLabelText('Importo (€)')).toHaveValue('');
 const button=screen.getByRole('button',{name:'Conferma oggetto e spesa'});expect(button).toBeDisabled();
 await w.user.type(screen.getByLabelText('Importo (€)'),'99');await w.user.type(screen.getByLabelText('Data della spesa'),'2025-06-13');
 await w.user.click(screen.getByRole('checkbox',{name:/Confermo che questo importo riguarda soltanto/}));await w.user.click(button);
 await waitFor(()=>expect(w.counts().confirmations).toBe(1));expect(w.calls.find(c=>c.path.endsWith('/confirmations'))?.body).toMatchObject({choices:[{expense:{action:'create',amountCents:9900,manualItemAmount:true}}]});
});

it.each(['ai_budget_exhausted','ai_evaluation_limit_reached'])('budget is visible and exhaustion never offers a paid start (%s)',async(disabledReason)=>{
 const w=await world({start:true,budget:{currency:'USD',limitUsd:'5.000000',committedUsd:'4.800000',remainingUsd:'0.200000',callsUsed:40,maxCalls:40,available:false,disabledReason}});
 await screen.findByText(/Budget AI complessivo: 0.20 USD disponibili su 5.00/);expect(screen.getByText(/40\/40 analisi utilizzate/)).toBeInTheDocument();
 expect(screen.getByText(/Il limite non si rinnova automaticamente/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Avvia compilazione AI'})).not.toBeInTheDocument();expect(w.counts().starts).toBe(0);
});
it('available pilot budget does not preselect consent or start an analysis',async()=>{
 const w=await world({start:true,ai:true,budget:{currency:'USD',limitUsd:'5.000000',committedUsd:'0.000000',remainingUsd:'5.000000',callsUsed:0,maxCalls:40,available:true,disabledReason:null}});
 const button=await screen.findByRole('button',{name:'Avvia compilazione AI'});expect(button).toBeDisabled();expect(screen.getByRole('checkbox',{name:/Autorizzo/})).not.toBeChecked();expect(w.counts().starts).toBe(0);
});

it('uncertain provider outcome needs both transfer consent and explicit budget acknowledgement before a new start',async()=>{
 const w=await world({start:true,ai:true,uncertainRetry:true});
 const button=await screen.findByRole('button',{name:'Avvia compilazione AI'});
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
