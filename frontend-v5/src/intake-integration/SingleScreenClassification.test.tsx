import {screen,waitFor} from '@testing-library/react';
import {it,expect} from 'vitest';
import {renderApp,seededBackend,createFakeFetch,PASSWORD_A} from '../test/harness';
import type {FetchLike} from '../api/client';
import type {Draft} from '../object-onboarding/model';
it.each([{recognized:true,manual:false,linked:false,stepped:false},{recognized:false,manual:false,linked:false,stepped:false},{recognized:false,manual:true,linked:false,stepped:false},{recognized:false,manual:true,linked:true,stepped:false},{recognized:true,manual:false,linked:false,stepped:true}])('single revision saves canonical document (recognized=$recognized, manual=$manual)',async({recognized,manual,linked,stepped})=>{
 const {backend,homeA1,a}=seededBackend(),control=createFakeFetch(backend),doc=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'GEN. Q.E.',originalFilename:'GEN. Q.E..pdf'});
 const draft:Draft={id:'schema-draft',version:1,state:'open',mode:'extraction',snapshot:{documentId:doc.id,documentVersion:1,sha256:'a'.repeat(64)},document:{id:doc.id,name:doc.name,mimeType:'application/pdf'},documentKind:'house_document',documentInfo:{kind:recognized?'system_diagram':'unsupported',title:{value:'GEN. Q.E.',source:{documentId:doc.id,page:1,excerpt:'GEN. Q.E.'}},facts:[]},items:[],needsReview:false,purchaseTotal:null,review:null,permissions:['read','edit']};
 if(manual){draft.mode='manual';draft.documentInfo=null;draft.documentKind='unsupported';draft.items=[{id:'manual-placeholder',fields:{},quantity:null,profile:{},nameTruncated:false,disposition:'uncertain',enrichment:null,decision:null}];}
 const target={ref:{kind:'object',id:crypto.randomUUID()},name:'Impianto sintetico',version:2,state:'active',position:{version:0,rooms:[]}},targets:unknown[]=[];
 const saveLabel=manual?'Salva documento':'Salva e continua';
 const limits={maxFiles:20,maxFileBytes:20971520,maxTotalBytes:209715200,acceptedMimeTypes:['application/pdf']},item={id:'schema-item',clientItemId:'schema-client',version:1,filename:doc.originalFilename,byteSize:100,mimeType:'application/pdf',uploadState:'stored',analysisState:'ready',reviewState:'unreviewed',documentLink:{state:'linked',document:{id:doc.id,name:doc.name}},pageCount:1,proposal:null,selection:null,organization:null,organizationVersion:0,duplicate:null,error:null,permissions:['read','edit']};
 const wire={batch:{id:'schema-batch',homeId:homeA1.id,version:1,state:'open',limits,permissions:['read','edit'],items:[item]}},order:string[]=[],parts:string[]=[];
 const fetch:FetchLike=async(url,init)=>{
  if(url.includes('/objects?'))return Response.json({items:[target],nextCursor:null});
  if(url.includes('/objects/object/'))return Response.json({object:target});
  if(url.includes('/object-onboarding/capabilities'))return Response.json({manualAvailable:true,aiAvailable:true,drafts:[{id:draft.id,state:draft.state}],job:null});
  if(url.endsWith('/confirmations')){if(manual){const body=JSON.parse(String(init.body));expect(body.documentOnly).toBe(true);expect(body.choices).toEqual([]);expect(body.houseExpenses).toBeUndefined();}order.push('confirm');draft.items=draft.items.map(item=>({...item,decision:{state:'confirmed',newObjects:0,newExpenses:0,objects:[]}}));draft.state='confirmed';return Response.json({draft,result:{newObjects:0,newExpenses:0}});}
  if(url.includes('/object-onboarding/drafts/'))return Response.json({draft});
  if(url.includes('/document-intake')){if(url.endsWith('/capabilities'))return Response.json({apiVersion:'document-intake-v1',enabled:true,limits,analysis:{provider:'local_text_v1',enabled:false,externalTransmission:false}});if(url.endsWith('/organizations')){targets.push(JSON.parse(String(init.body)).items[0].selection.target);order.push('organize');parts.push(JSON.parse(String(init.body)).items[0].selection.parts[0].kind);item.reviewState='confirmed';return Response.json({...wire,results:{[item.id]:{state:'confirmed'}}});}return Response.json(wire);}
  return control.fetch(url,init);
 };
 const app=renderApp({path:'/accedi',backend,fetch});await screen.findByRole('heading',{name:'Accedi'});await app.user.type(screen.getByLabelText('Email'),a.email);await app.user.type(screen.getByLabelText('Password'),PASSWORD_A);await app.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(app.router.state.location.pathname).toBe('/case'));const path='/home/'+homeA1.id+'/documenti';await app.router.navigate(path+'?lotto=schema-batch&oggetti-documento='+doc.id+'&oggetti-bozza=schema-draft&compila='+(manual?'manuale':'ai')+(stepped?'':'&vista-compilazione=unica'));if(stepped)await screen.findByRole('heading',{level:2,name:'Documento'});else await screen.findByRole('button',{name:recognized?saveLabel:'Completa i dati'},{timeout:10000});
 if(!recognized){expect(screen.getByRole('button',{name:'Completa i dati'})).toBeEnabled();await screen.findByRole('button',{name:'Scegli il tipo del documento.'});expect(order).toEqual([]);expect(screen.queryByRole('button',{name:'Rivedi documento'})).not.toBeInTheDocument();await app.user.selectOptions(screen.getByLabelText('Tipo del documento'),'system_diagram');}
 else expect(screen.getByLabelText('Tipo del documento')).toHaveValue('system_diagram');
 expect(screen.getByRole('heading',{name:'Completa i dati del documento'})).toBeVisible();
 expect(screen.getByRole('navigation',{name:'Coda dei documenti'})).toBeVisible();
 expect(screen.getByRole('complementary',{name:'Anteprima del documento'})).toBeVisible();
 await app.user.click(screen.getByRole('button',{name:'Chiudi anteprima'}));expect(screen.queryByRole('complementary',{name:'Anteprima del documento'})).not.toBeInTheDocument();
 await app.user.click(screen.getByRole('button',{name:'Apri anteprima'}));expect(screen.getByRole('complementary',{name:'Anteprima del documento'})).toBeVisible();
 if(linked){await screen.findByRole('option',{name:'Impianto sintetico'});await app.user.selectOptions(screen.getByLabelText('A cosa si riferisce?'),'object:'+target.ref.id);await waitFor(()=>expect(screen.getByRole('button',{name:saveLabel})).toBeEnabled());expect(order).toEqual([]);}
 if(manual)expect(screen.queryByRole('heading',{name:/Articolo 1/})).not.toBeInTheDocument();
 if(stepped){expect(order).toEqual([]);await app.user.click(screen.getByRole('button',{name:'Avanti'}));await screen.findByRole('heading',{level:2,name:'Riepilogo'});expect(order).toEqual([]);}
 await app.user.click(screen.getByRole('button',{name:saveLabel}));await waitFor(()=>expect(order).toEqual(['organize','confirm']));expect(parts).toEqual(['system_diagram']);if(linked)expect(targets).toEqual([{kind:'object',id:target.ref.id,expectedVersion:2}]);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(app.router.state.location.pathname).toBe(path);app.unmount();
});
