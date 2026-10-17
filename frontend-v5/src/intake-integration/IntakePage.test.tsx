import { screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderApp, createFakeFetch, seededBackend, PASSWORD_A } from '../test/harness';
import type { FetchLike } from '../api/client';

it('failed automatic reading retains the original and refetches without retrying an uncertain request in a loop', async () => {
  const { backend, homeA1, a } = seededBackend(), control = createFakeFetch(backend); let attempts = 0, reads = 0;
  const limits = { maxFiles: 20, maxFileBytes: 20971520, maxTotalBytes: 209715200, acceptedMimeTypes: ['application/pdf'] };
  const item = { id: 'auto-failure-item', clientItemId: 'auto-client', version: 1, filename: 'Solo sintetico.pdf', byteSize: 100, mimeType: 'application/pdf', uploadState: 'stored', analysisState: 'not_started', reviewState: 'unreviewed', documentLink: { state: 'linked', document: { id: 'auto-doc', name: 'Solo sintetico.pdf' } }, pageCount: null, proposal: null, selection: null, organization: null, organizationVersion: 0, duplicate: null, error: null, permissions: ['read', 'edit'] };
  const fetch: FetchLike = async (url, init) => {
    if (!url.includes('/document-intake')) return control.fetch(url, init);
    if (url.endsWith('/analyses') && init.method === 'POST') { attempts++; return new Response(JSON.stringify({ error: { code: 'service_unavailable', message: 'Synthetic unavailable' } }), { status: 503, headers: { 'content-type': 'application/json' } }); }
    const value = url.endsWith('/capabilities') ? { apiVersion: 'document-intake-v1', enabled: true, limits, analysis: { provider: 'local_text_v1', enabled: true, label: 'Locale', costUsd: '0.000000', externalTransmission: false } } : url.endsWith('/batches') ? { items: [], nextCursor: null } : { batch: { id: 'auto-failure-batch', homeId: homeA1.id, version: ++reads, state: 'open', limits, items: [item], permissions: ['read', 'edit'] } };
    return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
  };
  const app = renderApp({ path: '/accedi', backend, fetch }); await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), a.email); await app.user.type(screen.getByLabelText('Password'), PASSWORD_A); await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toBe('/case'));
  await app.router.navigate(`/home/${homeA1.id}/documenti/organizza?lotto=auto-failure-batch`);
  await screen.findByText(/La lettura locale non è stata confermata/);
  await waitFor(() => expect(reads).toBeGreaterThanOrEqual(2)); expect(attempts).toBe(1);
  expect(item.uploadState).toBe('stored'); expect(item.documentLink.document.id).toBe('auto-doc'); app.unmount();
});

it('authenticated deep link resumes a persisted batch and automatically sends only local classification with current versions', async () => {
  const { backend, homeA1, a } = seededBackend(), control = createFakeFetch(backend), posts: unknown[] = [];
  const item = { id: 'item-ui-test', clientItemId: 'client-ui-test', version: 1, filename: 'APE sintetico.pdf', byteSize: 100, mimeType: 'application/pdf', uploadState: 'stored', analysisState: 'not_started', reviewState: 'unreviewed', documentLink: { state: 'linked', document: { id: 'doc-ui-test', name: 'APE sintetico.pdf' } }, pageCount: null, proposal: null, selection: null, organization: null, organizationVersion: 0, duplicate: null, error: null, permissions: ['read', 'edit'] };
  const limits = { maxFiles: 20, maxFileBytes: 20971520, maxTotalBytes: 209715200, acceptedMimeTypes: ['application/pdf'] }, wire = { batch: { id: 'batch-ui-test', homeId: homeA1.id, version: 1, state: 'open', limits, items: [item], permissions: ['read', 'edit'] } };
  const fetch: FetchLike = async (url, init) => {
    if (!url.includes('/document-intake')) return control.fetch(url, init);
    if (init.method === 'POST') { posts.push(JSON.parse(String(init.body))); item.analysisState = 'queued'; item.version++; wire.batch.version++; }
    const value = url.endsWith('/capabilities') ? { apiVersion: 'document-intake-v1', enabled: true, limits, analysis: { provider: 'local_text_v1', enabled: true, label: 'Classificazione locale', costUsd: '0.000000', externalTransmission: false } } : url.endsWith('/batches') ? { items: [{ id: wire.batch.id, createdAt: '2026-10-16T12:00:00.000Z', state: 'open', itemCount: 1 }], nextCursor: null } : wire;
    return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
  };
  const app = renderApp({ path: '/accedi', backend, fetch }); await screen.findByRole('heading', { name: 'Accedi' }); await app.user.type(screen.getByLabelText('Email'), a.email); await app.user.type(screen.getByLabelText('Password'), PASSWORD_A); await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toBe('/case'));
  await app.router.navigate(`/home/${homeA1.id}/documenti/organizza?lotto=batch-ui-test`);
  await screen.findByRole('heading', { name: /Controlla e organizza\.|Stiamo preparando le proposte/ }); expect(screen.queryByRole('button', { name: 'Vedi il lotto →' })).not.toBeInTheDocument();
  await waitFor(() => expect(posts).toHaveLength(1)); expect(posts[0]).toEqual({ provider: 'local_text_v1', items: [{ id: item.id, expectedVersion: 1 }] });
  app.unmount();
});

it('adding a second file appends to the same persisted batch and uploads only the new file', async () => {
  const { backend, homeA1, a } = seededBackend(), control = createFakeFetch(backend);
  const limits = { maxFiles: 20, maxFileBytes: 20971520, maxTotalBytes: 209715200, acceptedMimeTypes: ['application/pdf'] };
  const original = { id: 'item-existing', clientItemId: 'client-existing', version: 3, filename: 'Prima.pdf', byteSize: 10, mimeType: 'application/pdf', uploadState: 'stored', analysisState: 'ready', reviewState: 'deferred', documentLink: { state: 'linked', document: { id: 'doc-existing', name: 'Prima.pdf' } }, pageCount: 1, proposal: null, selection: { action: 'defer' }, organization: null, organizationVersion: 0, duplicate: null, error: null, permissions: ['read', 'edit'] };
  const wire = { batch: { id: 'same-batch-test', homeId: homeA1.id, version: 3, state: 'open', limits, items: [original], permissions: ['read', 'edit'] } };
  const calls: string[] = [];
  const fetch: FetchLike = async (url, init) => {
    if (!url.includes('/document-intake')) return control.fetch(url, init);
    if (init.method === 'POST') {
      calls.push(url);
      if (url.endsWith('/items')) {
        const input = JSON.parse(String(init.body)).items[0];
        wire.batch.items.push({ ...original, ...input, id: 'item-added', version: 1, uploadState: 'pending', analysisState: 'not_started', reviewState: 'unreviewed', selection: null as unknown as typeof original.selection, pageCount: null as unknown as number, documentLink: { state: 'unavailable', document: null as unknown as typeof original.documentLink.document } });
      } else if (url.endsWith('/item-added/file')) {
        const added = wire.batch.items[1]!; added.uploadState = 'stored'; added.version++;
        added.documentLink = { state: 'linked', document: { id: 'doc-added', name: 'Seconda.pdf' } };
      } else if (url.endsWith('/analyses')) {
        expect(JSON.parse(String(init.body))).toEqual({ provider: 'local_text_v1', items: [{ id: 'item-added', expectedVersion: 2 }] });
        const added = wire.batch.items[1]!; added.analysisState = 'queued'; added.version++;
      } else throw new Error('Unexpected write: ' + url);
      wire.batch.version++;
    }
    const value = url.endsWith('/capabilities') ? { apiVersion: 'document-intake-v1', enabled: true, limits, analysis: { provider: 'local_text_v1', enabled: true, label: 'Locale', costUsd: '0.000000', externalTransmission: false } } : url.endsWith('/batches') ? { items: [{ id: wire.batch.id, createdAt: '2026-10-16T12:00:00.000Z', state: 'open', itemCount: wire.batch.items.length }], nextCursor: null } : wire;
    return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
  };
  const app = renderApp({ path: '/accedi', backend, fetch });
  await screen.findByRole('heading', { name: 'Accedi' }); await app.user.type(screen.getByLabelText('Email'), a.email); await app.user.type(screen.getByLabelText('Password'), PASSWORD_A); await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toBe('/case'));
  await app.router.navigate(`/home/${homeA1.id}/documenti/organizza?lotto=same-batch-test`);
  await app.user.click(await screen.findByRole('button', { name: '+ Aggiungi documenti' }));
  await app.user.upload(screen.getByLabelText('File'), new File(['new file'], 'Seconda.pdf', { type: 'application/pdf' }));
  await screen.findByRole('button', { name: 'Tutti · 2' });
  await waitFor(() => expect(calls).toHaveLength(3));
  expect(calls[0]).toMatch(/\/batches\/same-batch-test\/items$/);
  expect(calls[1]).toMatch(/\/batches\/same-batch-test\/items\/item-added\/file$/);
  expect(calls[2]).toMatch(/\/batches\/same-batch-test\/analyses$/);
  expect(app.router.state.location.search).toBe('?lotto=same-batch-test');
  expect(wire.batch.items[0]).toEqual(original);
  expect(original.reviewState).toBe('deferred');
});


it.each(['local','unknown','draftkind'])('upload proposals stay inline and recover document organization (%s)',async(mode)=>{
 const unknownType=mode!=='local';
 const {backend,homeA1,a}=seededBackend(),control=createFakeFetch(backend);
 const doc=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'Ricevuta sintetica'});
 const limits={maxFiles:20,maxFileBytes:20971520,maxTotalBytes:209715200,acceptedMimeTypes:['application/pdf']};
 const item={id:'inline-item',clientItemId:'inline-client',version:1,filename:'Ricevuta_demo.pdf',byteSize:100,mimeType:'application/pdf',uploadState:'stored',analysisState:'ready',reviewState:'unreviewed',documentLink:{state:'linked',document:{id:doc.id,name:doc.name}},pageCount:1,proposal:{title:'Ricevuta demo',parts:[{kind:'receipt',pageFrom:1,pageTo:1}],sources:[]},selection:null,organization:null,organizationVersion:0,duplicate:null,error:null,permissions:['read','edit']};
 if(unknownType){item.mimeType='image/jpeg';(item as {proposal:unknown}).proposal=null;}
 const draft={id:'inline-draft',version:1,state:'open',mode:'extraction',snapshot:{documentId:doc.id,documentVersion:1,sha256:'a'.repeat(64)},document:{id:doc.id,name:doc.name,mimeType:'application/pdf'},documentKind:mode==='unknown'?'other':mode==='draftkind'?'delivery_notice':'purchase_document',items:[{id:'inline-product',nameTruncated:false,disposition:'household_object',fields:{name:{value:'Lampada demo',source:{documentId:doc.id,page:1,excerpt:'Lampada demo'}}},quantity:{value:1},profile:{purchaseDate:{value:'2025-05-12',origin:'extraction_confirmed',sources:[]}},enrichment:null,decision:null}],needsReview:false,purchaseTotal:{amountCents:9950},review:null,permissions:['read','edit']};
 let starts=0,organizationWrites=0,objectWrites=0;const order:string[]=[],organizationKeys:Array<string|null>=[],bodies:unknown[]=[];let finalDraft:unknown=draft;
 const fetch:FetchLike=async(url,init)=>{
  if(url.includes('/object-onboarding')){
   if(url.includes('/capabilities'))return Response.json({manualAvailable:true,aiAvailable:true,canStartAnalysis:true,requiresConsent:true,drafts:[],job:null});
   if(url.endsWith('/jobs')&&init.method==='POST'){starts++;bodies.push(JSON.parse(String(init.body)));return Response.json({job:{id:'inline-job',state:'queued',draftId:null,errorCode:null}});}
   if(url.includes('/jobs/'))return Response.json({job:{id:'inline-job',state:'succeeded',draftId:draft.id,errorCode:null}});
   if(url.includes('/candidates')||url.includes('/expense-candidates'))return Response.json({items:[],nextCursor:null});
   if(url.endsWith('/review')){order.push('review');draft.version++;return Response.json({draft});}
   if(url.endsWith('/confirmations')){objectWrites++;order.push('object');finalDraft={...draft,state:'confirmed',version:3,items:draft.items.map(i=>({...i,decision:{state:'confirmed',newObjects:1,newExpenses:0,objects:[]}}))};return Response.json({draft:finalDraft,result:{newObjects:1,newExpenses:0}});}
   return Response.json({draft:finalDraft});
  }
  if(url.includes('/document-intake')&&url.endsWith('/organizations')&&init.method==='POST'){
   organizationWrites++;order.push('document');organizationKeys.push(new Headers(init.headers).get('Idempotency-Key'));
   if(organizationWrites===1)return Response.json({error:{code:'service_unavailable',message:'Synthetic lost outcome'}},{status:503});
   item.reviewState='confirmed';(item as {organization:unknown}).organization={title:'Ricevuta demo',parts:JSON.parse(String(init.body)).items[0].selection.parts,version:1};
   return Response.json({batch:{id:'inline-batch',homeId:homeA1.id,version:2,state:'completed',limits,items:[item],permissions:['read','edit']},results:{[item.id]:{state:'confirmed'}}});
  }
  if(url.includes('/document-intake'))return Response.json(url.endsWith('/capabilities')?{apiVersion:'document-intake-v1',enabled:true,limits,analysis:{provider:'local_text_v1',enabled:true,label:'Locale',costUsd:'0.000000',externalTransmission:false}}:url.endsWith('/batches')?{items:[],nextCursor:null}:{batch:{id:'inline-batch',homeId:homeA1.id,version:1,state:'open',limits,items:[item],permissions:['read','edit']}});
  return control.fetch(url,init);
 };
 const app=renderApp({path:'/accedi',backend,fetch});await screen.findByRole('heading',{name:'Accedi'});await app.user.type(screen.getByLabelText('Email'),a.email);await app.user.type(screen.getByLabelText('Password'),PASSWORD_A);await app.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(app.router.state.location.pathname).toBe('/case'));
 const path=`/home/${homeA1.id}/documenti/organizza`;await app.router.navigate(path+'?lotto=inline-batch&filtro=conserva');
 await app.user.click(await screen.findByRole('button',{name:/Riconosci gli oggetti in/}));
 await screen.findByRole('heading',{name:'Proposta del documento'});expect(starts).toBe(0);expect(screen.getByRole('button',{name:'Prepara le proposte'})).toBeDisabled();
 await app.user.click(screen.getByRole('checkbox',{name:/Autorizzo l’invio/}));await app.user.click(screen.getByRole('button',{name:'Prepara le proposte'}));await screen.findByRole('heading',{name:'Lampada demo'});
 expect(starts).toBe(1);expect(bodies[0]).toMatchObject({documentId:doc.id,consentToProviderTransfer:true});expect(app.router.state.location.pathname).toBe(path);
 const params=new URLSearchParams(app.router.state.location.search);expect(params.get('lotto')).toBe('inline-batch');expect(params.get('filtro')).toBe('conserva');expect(params.get('oggetti-bozza')).toBe('inline-draft');expect(params.get('bozza')).toBeNull();
 await app.user.click(screen.getByRole('button',{name:'Rivedi Lampada demo'}));
 if(mode==='local')expect(screen.getByText('Spesa di acquisto (facoltativa)')).toBeInTheDocument();
 if(mode==='unknown'){
  await app.user.click(screen.getByRole('button',{name:/^Conferma (documento e articolo|questo articolo|oggetto e spesa)$/}));
  const error=await screen.findByRole('alert');expect(error).toHaveTextContent('Prima completa la classificazione');expect(error).toHaveFocus();expect(objectWrites).toBe(0);expect(organizationWrites).toBe(0);
  await app.user.click(screen.getByRole('button',{name:'Rivedi documento'}));expect(screen.getByRole('dialog')).toBeVisible();await app.user.click(screen.getByRole('button',{name:'Chiudi'}));await app.user.click(screen.getByRole('button',{name:'Rivedi Lampada demo'}));expect(screen.getByLabelText('Nome dell’oggetto')).toHaveValue('Lampada demo');app.unmount();return;
 }

 await app.user.click(screen.getByRole('button',{name:/^Conferma (documento e articolo|questo articolo|oggetto e spesa)$/}));
 await screen.findByText(/Archiviazione del documento da verificare/);expect(objectWrites).toBe(0);
 await app.user.click(screen.getByRole('button',{name:/^Conferma (documento e articolo|questo articolo|oggetto e spesa)$/}));
 await screen.findByText('Confermato: 1 nuovi oggetti e 0 nuove spese.');expect(objectWrites).toBe(1);expect(order).toEqual(['document','document','review','object']);expect(organizationKeys[0]).toBeTruthy();expect(organizationKeys[0]).toBe(organizationKeys[1]);
 expect(new URLSearchParams(app.router.state.location.search).get('lotto')).toBe('inline-batch');app.unmount();
});
