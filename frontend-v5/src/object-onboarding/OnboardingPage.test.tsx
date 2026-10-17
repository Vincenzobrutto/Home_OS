import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiClient } from '../api/client';
import { FakeBackend } from '../test/fakeBackend';
import { createFakeFetch, renderApp } from '../test/harness';
import type { Draft, Form } from './model';
import { choice, initialForm } from './model';
async function world(options:{login?:boolean;start?:boolean;ai?:boolean;lost?:boolean;lostStart?:boolean;invalid?:boolean;foreign?:boolean;newAuthorization?:boolean;derivedIdentity?:boolean;savedDraft?:boolean;purchase?:boolean;duplicates?:boolean;expenseFailure?:boolean;savedExpenseSkip?:boolean}={}){
 const backend=new FakeBackend(),password='onboarding-demo-password',account=backend.seedAccount('Test','onboarding@example.test',password),home=backend.seedHome(account.id,'Casa sintetica','Via Test');
 const doc=await backend.seedDocument({homeId:home.id,uploaderId:account.id,name:'Ordine sintetico'}),control=createFakeFetch(backend),api=new ApiClient({fetch:control.fetch});
 if(options.login!==false){await api.login({email:account.email,password});await api.getSession();}
 const wire:Draft={id:'draft-onboarding',version:1,state:'open',mode:'extraction',snapshot:{documentId:options.foreign?'other-document':doc.id,documentVersion:1,sha256:'a'.repeat(64)},document:{id:doc.id,name:doc.name,mimeType:'application/pdf'},documentKind:'delivery_notice',items:['Router demo','Speaker demo'].map((name,i)=>({id:'item'+i,nameTruncated:false,disposition:'household_object',fields:{name:{value:name,source:{documentId:doc.id,page:1,excerpt:name}}},quantity:null,profile:{brand:{value:'Lume',origin:'extraction_confirmed',sources:[{documentId:doc.id,page:1,excerpt:'Lume'}]}},enrichment:null,decision:null})),needsReview:false,purchaseTotal:null,review:null,permissions:['read','edit']};
 if(options.purchase){wire.documentKind='purchase_document';wire.items=wire.items.slice(0,1);wire.items[0]!.profile.purchaseDate={value:'2025-06-13',origin:'extraction_confirmed',sources:[]};wire.purchaseTotal={amountCents:9999};}
 if(options.savedExpenseSkip)wire.review={forms:{item0:initialForm(wire.items[0]!,{...wire,mode:'manual'})}};
 if(options.derivedIdentity)for(const item of wire.items)item.profile={brand:{value:'Amazon',origin:'derived_from_product_name',sources:[{documentId:doc.id,page:1,excerpt:'Amazon Echo Dot Max'}]},model:{value:'Echo Dot Max',origin:'derived_from_product_name',sources:[{documentId:doc.id,page:1,excerpt:'Amazon Echo Dot Max'}]}};
 const calls:Array<{path:string;body:unknown;key:string|null}>=[];let confirmations=0,starts=0,saved=false;
 const fetch=async(url:string,init:RequestInit)=>{
  if(!url.includes('/object-onboarding'))return control.fetch(url,init);
  const path=url.split('/object-onboarding')[1]!,body=init.body?JSON.parse(String(init.body)):undefined;calls.push({path,body,key:new Headers(init.headers).get('Idempotency-Key')});
  if(path.startsWith('/capabilities'))return Response.json({manualAvailable:true,aiAvailable:!!options.ai,requiresConsent:true,drafts:options.savedDraft?[{id:wire.id,state:'open'}]:[],canStartAnalysis:options.newAuthorization?true:undefined,job:options.newAuthorization?{id:"old-job",state:"uncertain",draftId:null,errorCode:"analysis_outcome_unknown"}:null});
  if(path==='/jobs'){starts++;if(options.lostStart&&starts===1)throw new TypeError('lost');return Response.json({job:{id:'job1',state:'queued',draftId:null,errorCode:null}},{status:202});}
  if(path.startsWith('/jobs/'))return Response.json({job:{id:'job1',state:'succeeded',draftId:wire.id,errorCode:null}});
  if(path.includes('/candidates'))return Response.json({items:[{id:'existing1',name:'Speaker Studio',version:3,profile:{fields:{brand:{value:'Confirmed',origin:'user_declared',sources:[]}},unavailable:false},rooms:['Studio'],reason:'same_brand_model'}],nextCursor:null});
  if(path.includes('/expense-candidates'))return options.expenseFailure?Response.json({error:{code:'unavailable',message:'Unavailable'}},{status:503}):Response.json({items:options.duplicates?[{id:'expense1',title:'Acquisto già registrato',amountCents:9999,spentOn:'2025-06-13',version:2,rank:1}]:[],nextCursor:null});
  if(path.endsWith('/review')){wire.review=body.review;wire.version++;return Response.json({draft:wire});}
  if(path.includes('/confirmations/'))return Response.json({status:saved?'confirmed':'not_found',draft:wire});
  if(path.endsWith('/confirmations')){
   confirmations++;if(options.invalid&&confirmations===1)return Response.json({error:{code:'validation_error',message:'Controlla la scelta'}},{status:422});
   saved=true;wire.version++;wire.review=null;
   for(const c of body.choices){const item=wire.items.find(i=>i.id===c.itemId)!;item.decision={state:c.action==='defer'?'deferred':c.action==='skip'?'skipped':'confirmed',newObjects:c.action==='create'?1:0,newExpenses:0,objects:c.action==='create'?[{id:'object'+item.id,name:c.name,state:'active'}]:[]};}
   wire.state=wire.items.every(i=>i.decision?.state==='confirmed'||i.decision?.state==='skipped')?'confirmed':'open';
   if(options.lost&&confirmations===1)throw new TypeError('lost response');
   return Response.json({draft:wire,result:{newObjects:body.choices.filter((c:{action:string})=>c.action==='create').length,newExpenses:0}});
  }
  if(path.startsWith('/drafts/')||path==='/manual-drafts')return Response.json({draft:wire});
  return Response.json({error:{code:'not_found',message:'Unknown'}},{status:404});
 };
 const app=renderApp({backend,fetch,path:'/home/'+home.id+'/documenti/'+doc.id+'/oggetti'+(options.start?'':'?bozza='+wire.id)});
 return {...app,wire,calls,counts:()=>({confirmations,starts})};
}
describe('Onboarding reale nel router, API simulate e nessun invio esterno',()=>{
 it('guard login protegge il deep link prima di leggere documenti e proposte',async()=>{const w=await world({login:false});await screen.findByRole('heading',{name:/Accedi/});expect(w.calls).toHaveLength(0);expect(w.router.state.location.search).toContain('next=');});
 it('AI disabilitata mostra compilazione manuale e non inventa risultati',async()=>{const w=await world({start:true});await screen.findByText(/L’analisi AI di questo documento non è abilitata/);expect(screen.queryByRole('button',{name:'Analizza e proponi gli oggetti'})).not.toBeInTheDocument();await w.user.click(screen.getByRole('button',{name:'Compila le proposte manualmente'}));await screen.findByRole('heading',{name:'Rivedi gli articoli'});expect(w.counts().starts).toBe(0);});
 it('conferma un articolo e lascia l’altro da rivedere; nessuna spesa da una consegna',async()=>{const w=await world();await screen.findByRole('heading',{name:'Router demo'});expect(screen.queryByText('Spesa di acquisto (facoltativa)')).not.toBeInTheDocument();await w.user.click(screen.getAllByRole('button',{name:'Conferma questo articolo'})[0]!);await screen.findByText('Confermato: 1 nuovi oggetti e 0 nuove spese.');expect(screen.getByRole('link',{name:'Apri Router demo'})).toBeInTheDocument();expect(screen.getAllByRole('button',{name:'Conferma questo articolo'})).toHaveLength(1);expect(w.counts().confirmations).toBe(1);});
 it('esito perso si recupera tramite ricevuta senza un secondo POST',async()=>{const w=await world({lost:true});await screen.findByRole('heading',{name:'Router demo'});await w.user.click(screen.getAllByRole('button',{name:'Conferma questo articolo'})[0]!);await screen.findByRole('button',{name:'Controlla l’esito'});expect(screen.getAllByRole('button',{name:'Conferma questo articolo'})[0]).toBeDisabled();await w.user.click(screen.getByRole('button',{name:'Controlla l’esito'}));await screen.findByText('Conferma recuperata: nessun doppione.');expect(w.counts().confirmations).toBe(1);});
 it('avvio perso ripete solo la stessa richiesta con consenso e chiave stabili',async()=>{const w=await world({start:true,ai:true,lostStart:true});const consent=await screen.findByRole('checkbox');expect(screen.getByRole('button',{name:'Analizza e proponi gli oggetti'})).toBeDisabled();await w.user.click(consent);await w.user.click(screen.getByRole('button',{name:'Analizza e proponi gli oggetti'}));await w.user.click(await screen.findByRole('button',{name:'Verifica ripetendo la stessa richiesta'}));await screen.findByRole('heading',{name:'Rivedi gli articoli'});const posts=w.calls.filter(c=>c.path==='/jobs');expect(posts).toHaveLength(2);expect(posts[0]).toEqual(posts[1]);expect(posts[0]!.body).toMatchObject({consentToProviderTransfer:true,provider:'anthropic'});});
 it('il collegamento esistente richiede una scelta esplicita e protegge il valore attuale',async()=>{const w=await world();await screen.findByRole('heading',{name:'Router demo'});const article=screen.getByRole('heading',{name:'Router demo'}).closest('article')!;await w.user.click(within(article).getByLabelText('Collega a un oggetto già in casa'));const select=within(article).getByLabelText('Scheda da collegare');expect(select).toHaveValue('');await w.user.selectOptions(select,'existing1');expect(within(article).getByText('Attuale confermato: Confirmed')).toBeInTheDocument();expect(within(article).getByLabelText('Scelta per Marca')).toHaveValue('keep');expect(within(article).queryByRole('option',{name:'Usa la proposta'})).not.toBeInTheDocument();});
 it('errore di validazione libera i campi e non lascia la conferma incerta',async()=>{const w=await world({invalid:true});await screen.findByRole('heading',{name:'Router demo'});await w.user.click(screen.getAllByRole('button',{name:'Conferma questo articolo'})[0]!);await screen.findByText('Controlla la scelta');await waitFor(()=>expect(screen.getAllByRole('button',{name:'Conferma questo articolo'})[0]).toBeEnabled());expect(screen.queryByRole('button',{name:'Controlla l’esito'})).not.toBeInTheDocument();});
 it('non mescola originale e bozza di due documenti diversi',async()=>{await world({foreign:true});await screen.findByText(/Queste proposte appartengono a un altro documento/);expect(screen.queryByLabelText('Nome dell’oggetto')).not.toBeInTheDocument();});
 it('payload confermato include solo scelte esplicite, non campi o fonti inseriti dal client',()=>{const draft={purchaseTotal:null} as Draft,item={id:'x',profile:{},fields:{name:{value:'Router'}},enrichment:null} as Draft['items'][number];const form:Form=initialForm(item,draft);const result=choice(item,form);expect(result).toMatchObject({action:'create',itemId:'x',name:'Router',expense:{action:'skip'},fields:{},manual:null});expect(result).not.toHaveProperty('profile');});
});

it('separate operator authorization permits a new start but still requires fresh consent',async()=>{
 const w=await world({start:true,ai:true,newAuthorization:true});
 const button=await screen.findByRole('button',{name:'Analizza e proponi gli oggetti'});
 expect(button).toBeDisabled();
 await w.user.click(screen.getByRole('checkbox',{name:/Autorizzo/}));
 expect(button).toBeEnabled();
});

it('identity derived from title is visibly a proposal and sends separate explicit acceptance',async()=>{
 const w=await world({derivedIdentity:true});await screen.findAllByText('Ricavato dal nome del prodotto · Da confermare');
 expect(screen.getAllByText('Proposta: Amazon')).toHaveLength(2);
 expect(screen.getAllByText('Proposta: Echo Dot Max')).toHaveLength(2);
 await w.user.click(screen.getAllByRole('button',{name:'Conferma questo articolo'})[0]!);
 await screen.findByText('Confermato: 1 nuovi oggetti e 0 nuove spese.');
 const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:Array<{fields:Record<string,{action:string}>}>};
 expect(body.choices[0]!.fields.brand).toEqual({action:'accept'});expect(body.choices[0]!.fields.model).toEqual({action:'accept'});
});

it('stored proposals reopen automatically without a new provider job or a separate resume step',async()=>{
 const w=await world({start:true,savedDraft:true});await screen.findByRole('heading',{name:'Router demo'});expect(w.counts().starts).toBe(0);expect(screen.queryByRole('button',{name:'Analizza e proponi gli oggetti'})).not.toBeInTheDocument();
});

it('one confirmation includes the automatically proposed receipt expense without another choice',async()=>{
 const w=await world({purchase:true});await screen.findByText(/Spesa proposta dal documento/);
 expect(screen.getByLabelText('Cosa fare con il costo')).toHaveValue('create');expect(screen.getByLabelText('Importo (€)')).toHaveValue('99.99');
 expect(w.counts().confirmations).toBe(0);await w.user.click(screen.getByRole('button',{name:'Conferma questo articolo'}));
 await waitFor(()=>expect(w.counts().confirmations).toBe(1));
 const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:Array<{expense:unknown}>};expect(body.choices[0]!.expense).toMatchObject({action:'create',amountCents:9999,spentOn:'2025-06-13'});
});
it('possible expense duplicate blocks default confirmation and lets user explicitly reuse it',async()=>{
 const w=await world({purchase:true,duplicates:true});await screen.findByText(/Ci sono spese potenzialmente/);expect(screen.getByRole('button',{name:'Conferma questo articolo'})).toBeDisabled();
 await w.user.selectOptions(screen.getByLabelText('Cosa fare con il costo'),'link');await w.user.selectOptions(screen.getByLabelText('Spesa esistente'),'expense1');
 await w.user.click(screen.getByRole('button',{name:'Conferma questo articolo'}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));
 const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:Array<{expense:unknown}>};expect(body.choices[0]!.expense).toEqual({action:'link',id:'expense1',expectedVersion:2});
});
it('failed duplicate lookup never automatically creates a cost; explicit skip remains possible',async()=>{
 const w=await world({purchase:true,expenseFailure:true});await screen.findByText(/Non è stato possibile controllare i doppioni/);expect(screen.getByRole('button',{name:'Conferma questo articolo'})).toBeDisabled();
 await w.user.selectOptions(screen.getByLabelText('Cosa fare con il costo'),'skip');await w.user.click(screen.getByRole('button',{name:'Conferma questo articolo'}));await waitFor(()=>expect(w.counts().confirmations).toBe(1));
 const body=w.calls.find(c=>c.path.endsWith('/confirmations'))!.body as {choices:Array<{expense:unknown}>};expect(body.choices[0]!.expense).toEqual({action:'skip'});
});
it('previously saved explicit skip is never replaced by automatic expense proposal',async()=>{
 await world({purchase:true,savedExpenseSkip:true});await screen.findByLabelText('Cosa fare con il costo');expect(screen.getByLabelText('Cosa fare con il costo')).toHaveValue('skip');expect(screen.queryByText(/Spesa proposta dal documento/)).not.toBeInTheDocument();
});
