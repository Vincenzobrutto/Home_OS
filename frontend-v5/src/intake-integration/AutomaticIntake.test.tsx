import { screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderApp, createFakeFetch, seededBackend, PASSWORD_A } from '../test/harness';
import type { FetchLike } from '../api/client';

async function world(withRun=false,newUpload=false){
 const {backend,homeA1,a}=seededBackend(),control=createFakeFetch(backend);let posted:unknown=null;
 const item={id:'auto-item',clientItemId:'auto-client',version:1,filename:'Fattura sintetica.pdf',byteSize:100,mimeType:'application/pdf',uploadState:'stored',analysisState:'ready',reviewState:'unreviewed',documentLink:{state:'linked',document:{id:'auto-doc',name:'Fattura sintetica.pdf'}},pageCount:1,proposal:null,selection:null,organization:null,organizationVersion:0,duplicate:null,error:null,permissions:['read','edit']};
 const limits={maxFiles:20,maxFileBytes:20971520,maxTotalBytes:209715200,acceptedMimeTypes:['application/pdf']};
 const batch={id:'batch-auto',homeId:homeA1.id,version:1,state:'open',limits,items:[item],permissions:['read','edit']};
 let run:unknown=withRun?{id:'run-auto',state:'finished',entries:[{documentId:'auto-doc',name:'Fattura sintetica.pdf',state:'attention',reason:'Manca la data di acquisto.',draftId:'draft-auto',newObjects:0,newExpenses:0}]}:null;
 const fetch:FetchLike=async(url,init)=>{
  if(url.includes('/automatic-runs')){if(init.method==='POST'){posted=JSON.parse(String(init.body));run={id:'run-auto',state:'finished',entries:[{documentId:'auto-doc',name:'Fattura sintetica.pdf',state:'completed',reason:null,draftId:'draft-auto',newObjects:1,newExpenses:1}]};}return Response.json({run});}
  if(url.includes('/document-intake')){
    if(url.endsWith('/batches')&&init.method==='POST'){const body=JSON.parse(String(init.body));item.clientItemId=body.items[0].clientItemId;item.uploadState='pending';return Response.json({batch});}
    if(url.endsWith('/file')&&init.method==='POST'){item.uploadState='stored';return Response.json({batch});}
    return Response.json(url.endsWith('/capabilities')?{apiVersion:'document-intake-v1',enabled:true,limits,analysis:{provider:'local_text_v1',enabled:true,externalTransmission:false,label:'Locale',costUsd:'0.000000'}}:url.endsWith('/batches')?{items:[],nextCursor:null}:{batch});
  }
  return control.fetch(url,init);
 };
 const app=renderApp({path:'/accedi',backend,fetch});await screen.findByRole('heading',{name:'Accedi'});await app.user.type(screen.getByLabelText('Email'),a.email);await app.user.type(screen.getByLabelText('Password'),PASSWORD_A);await app.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(app.router.state.location.pathname).toBe('/case'));await app.router.navigate(`/home/${homeA1.id}/documenti/organizza${newUpload?'':'?lotto=batch-auto'}`);
 return {...app,posted:()=>posted};
}
it('one batch consent enables automatic processing, then only the outcome is shown',async()=>{
 const app=await world();const start=await screen.findByRole('button',{name:'Organizza automaticamente questo caricamento'});expect(start).toBeDisabled();expect(app.posted()).toBeNull();await app.user.click(screen.getByRole('checkbox',{name:/Autorizzo l’invio dei documenti di questo caricamento/}));await app.user.click(start);await screen.findByRole('heading',{name:'Caricamento elaborato'});expect(app.posted()).toEqual({batchId:'batch-auto',documentIds:['auto-doc'],consentToProviderTransfer:true,automaticProcessing:true});expect(screen.getByRole('status')).toHaveTextContent('1 documenti organizzati · 1 nuovi oggetti · 1 nuove spese');expect(screen.queryByRole('heading',{name:'Controlla e organizza.'})).not.toBeInTheDocument();expect(screen.getByRole('link',{name:'Vedi oggetti e impianti'})).toBeVisible();app.unmount();
});
it('reopening resumes the persisted exception without another paid request',async()=>{
 const app=await world(true);await screen.findByRole('heading',{name:'Serve solo questo controllo'});expect(screen.getByText('Manca la data di acquisto.')).toBeVisible();expect(screen.getByRole('link',{name:'Completa i dati'})).toHaveAttribute('href',expect.stringContaining('bozza=draft-auto'));expect(app.posted()).toBeNull();app.unmount();
});
it('selecting files with batch consent starts organization without per-document selections',async()=>{
 const app=await world(false,true);const consent=await screen.findByRole('checkbox',{name:/Autorizzo l’invio dei documenti di questo caricamento/});await app.user.click(consent);const picker=screen.getByLabelText('Documenti da caricare');await waitFor(()=>expect(picker).toBeEnabled());await app.user.upload(picker,new File(['%PDF-1.4 synthetic only'],'synthetic.pdf',{type:'application/pdf'}));await screen.findByRole('heading',{name:'Caricamento elaborato'});expect(app.posted()).toEqual({batchId:'batch-auto',documentIds:['auto-doc'],consentToProviderTransfer:true,automaticProcessing:true});app.unmount();
});

