global.fetch=async()=>{throw Error('network_forbidden');};
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client');
const {ReviewService}=require('../dist/review/review.service');
const {HomeObjectsService}=require('../dist/home-objects/home-objects.service');
const {ObjectOnboardingAccess}=require('../dist/object-onboarding/access');
const {ObjectOnboardingService}=require('../dist/object-onboarding/onboarding.service');
const {q48}=require('./q48-fixture.cjs'),{pagedWire,decode}=require('./q48-coverage-fixture.cjs');
const {PrismaCampaignLedger,assertQualityDatabase}=require('./quality-v3-ledger.cjs');
const {createModelAdapter}=require('./quality-v3-model.cjs');
const {runProgressiveCampaign}=require('./quality-v3-runner.cjs');
const {MODEL,fakeTransport}=require('./quality-v3-model-fixture.cjs');
const code=expected=>e=>(e.getResponse?.().code??e.code)===expected;

test('multipage provider rejection persists uncertainty, denies private reads and cannot resend on replay or a new client',async t=>{
 const rawUrl=process.env.QUALITY_V3_DATABASE_URL;assertQualityDatabase(rawUrl);
 const db=new PrismaClient({datasources:{db:{url:rawUrl}}});await db.$connect();t.after(()=>db.$disconnect());
 const {OnboardingAiBudget,OnboardingAiConfig}=require('../dist/object-onboarding/ai-budget');
 const {OnboardingAiAnalysis,ObjectOnboardingAnthropicTransport}=require('../dist/object-onboarding/ai-analysis');
 const {ObjectOnboardingAnthropicProvider}=require('../dist/object-onboarding/anthropic-provider');
 const {OnboardingJobService}=require('../dist/object-onboarding/jobs.service');
 const {PdfTextExtractor}=require('../dist/review/pdf-text');
 const f=q48(),a=await db.account.create({data:{name:'Synthetic multipage',email:randomUUID()+'@example.test',passwordHash:'not-login'}}),other=await db.account.create({data:{name:'Synthetic other owner',email:randomUUID()+'@example.test',passwordHash:'not-login'}});
 const home=await db.home.create({data:{name:'Synthetic multipage rejection',address:'Synthetic only'}}),h=home.id;
 for(const actor of [a,other])await db.homeMembership.create({data:{accountId:actor.id,homeId:h,role:'owner'}});
 const doc=await db.document.create({data:{homeId:h,uploaderId:a.id,name:'Synthetic two-page PDF',visibility:'private',original:{create:{originalFilename:'synthetic.pdf',mimeType:'application/pdf',sha256:f.original.sha256,byteSize:f.original.bytes.length,file:{create:{storageKey:'synthetic-multipage-'+randomUUID()}}}}}});
 const campaign='onboarding-multipage-'+randomUUID();
 class Config extends OnboardingAiConfig{get environment(){return{ONBOARDING_AI_ENABLED:'true',ANTHROPIC_API_KEY:'offline-only',ONBOARDING_AI_MODEL:MODEL,ONBOARDING_AI_CAMPAIGN_ID:campaign,ONBOARDING_AI_BUDGET_USD:'1',ONBOARDING_AI_MAX_CALLS:'4',ONBOARDING_AI_ALLOWED_SHA256:f.original.sha256};}}
 const config=new Config(),transport=new ObjectOnboardingAnthropicTransport(config),requests=[],diagnostics=[];let bodyReads=0;
 transport.logger={warn:value=>diagnostics.push(value)};
 transport.fetchImpl=async(url,init)=>{
  const endpoint=url.slice('https://api.anthropic.com/v1/'.length);requests.push(endpoint);
  if(endpoint==='models/'+MODEL)return Response.json({id:MODEL});
  if(endpoint==='messages/count_tokens')return Response.json({input_tokens:700});
  assert.equal(endpoint,'messages');const schema=JSON.parse(init.body).output_config.format.schema;
  assert(schema.definitions.invoiceExpense);assert.deepEqual(schema.properties.invoicePages.required,['p1','p2']);
  const response=new Response('PRIVATE document echo must not be read',{status:400,headers:{'request-id':'req_offline_multipage'}});
  response.text=async()=>{bodyReads++;throw Error('private_body_read');};return response;
 };
 const service=client=>{
  const review=new ReviewService(client,{}),access=new ObjectOnboardingAccess(client,review),objects=new HomeObjectsService(client,review),budget=new OnboardingAiBudget(client,config);
  const provider=new ObjectOnboardingAnthropicProvider(new PdfTextExtractor(),transport),ai=new OnboardingAiAnalysis(client,provider,transport,budget);
  return new OnboardingJobService(client,access,{read:async()=>f.original.bytes},ai,objects);
 };
 const jobs=service(db),key=randomUUID(),input={documentId:doc.id,provider:'anthropic',consentToProviderTransfer:true};
 const started=await jobs.start(a.id,h,input,key),claimed=await jobs.claim(started.job.id);assert(claimed);await jobs.run(claimed);
 const result=(await jobs.get(a.id,h,started.job.id,{})).job;
 assert.equal(result.state,'uncertain');assert.equal(result.errorCode,'provider_request_rejected');assert.equal(result.draftId,null);
 assert.equal(result.billing.state,'uncertain');assert.equal(result.billing.actualUsd,null);
 assert.deepEqual(requests,['models/'+MODEL,'messages/count_tokens','messages']);assert.equal(bodyReads,0);assert(!JSON.stringify(diagnostics).includes('PRIVATE'));
 const attempt=await db.objectOnboardingAttempt.findUniqueOrThrow({where:{jobId:result.id}});
 assert.equal(attempt.state,'uncertain');assert.equal(attempt.reservedMicroUsd,250000);assert.equal(attempt.actualMicroUsd,null);assert.equal(attempt.output,null);
 assert.equal((await jobs.start(a.id,h,input,key)).job.state,'uncertain');assert.equal(await jobs.claim(result.id),null);
 await assert.rejects(jobs.start(a.id,h,input,randomUUID()),code('analysis_outcome_unknown'));
 await assert.rejects(jobs.get(other.id,h,result.id,{}));await assert.rejects(jobs.start(other.id,h,input,randomUUID()));
 const fresh=new PrismaClient({datasources:{db:{url:rawUrl}}});try{const replay=service(fresh);assert.equal((await replay.start(a.id,h,input,key)).job.state,'uncertain');assert.equal(await replay.claim(result.id),null);}finally{await fresh.$disconnect();}
 assert.equal(requests.length,3);assert.equal(await db.objectOnboardingJob.count({where:{homeId:h}}),1);
 assert.equal(await db.objectOnboardingAttempt.count({where:{campaignId:campaign}}),1);
 for(const model of ['objectOnboardingDraft','homeObject','homeExpense','homeContact'])assert.equal(await db[model].count({where:{homeId:h}}),0);
});
test('Q48 page coverage persists across prefixes and confirmation; privacy and idempotency remain enforced',async t=>{
 const rawUrl=process.env.QUALITY_V3_DATABASE_URL;assertQualityDatabase(rawUrl);
 const db=new PrismaClient({datasources:{db:{url:rawUrl}}});await db.$connect();t.after(()=>db.$disconnect());
 const service=client=>{const review=new ReviewService(client,{});return new ObjectOnboardingService(new ObjectOnboardingAccess(client,review),new HomeObjectsService(client,review),review,{now:()=>new Date('2026-10-23T12:00:00Z')});},svc=service(db);
 const account=()=>db.account.create({data:{name:'SYNTHETIC Q48 coverage',email:randomUUID()+'@example.test',passwordHash:'not-login',emailVerifiedAt:new Date()}}),a=await account(),b=await account(),outsider=await account();
 const home=await db.home.create({data:{name:'SYNTHETIC QUALITY V3',address:'Synthetic only'}}),h=home.id;for(const actor of [a,b])await db.homeMembership.create({data:{accountId:actor.id,homeId:h,role:'owner'}});
 async function draft(pending=[]){const f=q48(),doc=await db.document.create({data:{homeId:h,uploaderId:a.id,name:'SYNTHETIC Q48',visibility:'private',original:{create:{originalFilename:'Q48.pdf',mimeType:'application/pdf',sha256:f.original.sha256,byteSize:f.original.bytes.length,file:{create:{storageKey:'synthetic-q48-coverage-'+randomUUID()}}}}},include:{original:true}});f.context.snapshot={...f.snapshot,documentId:doc.id};const output=decode(f,[1,2],pending),row=await db.objectOnboardingDraft.create({data:{accountId:a.id,homeId:h,documentId:doc.id,documentVersion:1,documentSha256:f.original.sha256,mode:'extraction',output}}),view=(await svc.getDraft(a.id,h,row.id,{})).draft;return{f,doc,row,view};}
 function choice(item){return{itemId:item.id,action:'create',values:{title:item.proposedFields.title.value,supplier:item.proposedFields.supplier.value,documentNumber:item.proposedFields.documentNumber.value,documentDate:item.proposedFields.documentDate.value,spentOn:item.proposedFields.documentDate.value,category:'repairs_works',amountCents:item.amountCandidates[0].amountCents},amountSelection:{mode:'candidate',candidateId:item.amountCandidates[0].id},acknowledgePossibleDuplicate:true};}
 const body=(d,choices=d.houseExpenses.map(choice))=>({expectedVersion:d.version,source:d.snapshot,choices:[],houseExpenses:choices}),count=()=>db.homeExpense.count({where:{homeId:h}});
 const first=await draft([2]),firstBody=body(first.view),firstKey=randomUUID(),full=await draft(),fullKey=randomUUID();
 let ledger,config,fake,item;
 await t.test('other owner and outsider cannot read partial/full coverage or confirm',async()=>{
  for(const actor of [b,outsider])for(const d of [first,full]){await assert.rejects(svc.getDraft(actor.id,h,d.row.id,{}));await assert.rejects(svc.confirm(actor.id,h,d.row.id,body(d.view),randomUUID()));}assert.equal(await count(),0);
 });
 await t.test('both progressive observations are durably stored; replay from another ledger client sends nothing',async()=>{
  config={databaseUrl:rawUrl,campaignId:'fase0-quality-v3-q48-coverage-'+randomUUID(),accountId:a.id,homeId:h,model:MODEL,maxCalls:150,budgetMicroUsd:12000000};
  ledger=await PrismaCampaignLedger.open(config);t.after(()=>ledger.close());
  fake=fakeTransport({reply:request=>pagedWire(first.f,Object.keys(request.output_config.format.schema.properties.invoicePages.properties).map(key=>Number(key.slice(1))))});
  const provider=createModelAdapter({model:MODEL,transport:fake.transport});item={id:'Q48',sha256:first.f.original.sha256,gold:first.f.original.gold,documentId:first.doc.id,documentVersion:1};
  const result=await runProgressiveCampaign({item,provider,ledger});assert.equal(result.settled,2);assert.equal(result.progressive.reason,'pages_exhausted');assert.equal(fake.sends(),2);
  const byPrefix=rows=>[...rows].sort((x,y)=>x.observation.reading.sentPages.length-y.observation.reading.sentPages.length),ordered=byPrefix(result.results);
  assert.deepEqual(ordered.map(row=>row.observation.invoiceCoverage.pendingPages),[[2],[]]);assert(result.results.every(row=>row.observation.automatic==='review'&&!row.observation.complete));
  for(const field of ['expenseAmountCents','expenseDate','expenseSupplier'])assert.deepEqual(ordered[1].score.measures[field],{correct:2,total:2});
  const stored=await db.objectOnboardingAttempt.findMany({where:{campaignId:config.campaignId}});assert.equal(stored.length,2);assert(!JSON.stringify(stored.map(row=>row.output)).includes('Termonimbo'));assert(!JSON.stringify(stored.map(row=>row.output)).includes('excerpt'));
  const beforeReplay=fake.requests.length,other=await PrismaCampaignLedger.open(config);try{const replay=await runProgressiveCampaign({item,provider:createModelAdapter({model:MODEL,transport:fake.transport}),ledger:other});assert.equal(fake.sends(),2);assert.equal(fake.requests.length,beforeReplay);assert.deepEqual(byPrefix(replay.results).map(row=>row.observation.invoiceCoverage),ordered.map(row=>row.observation.invoiceCoverage));}finally{await other.close();}assert.equal(await count(),0);
 });
 await t.test('partial manual confirmation creates only the supported invoice and stays open; archive cannot hide page 2',async()=>{
  const result=await svc.confirm(a.id,h,first.row.id,firstBody,firstKey);assert.equal(result.result.newExpenses,1);assert.equal(result.draft.state,'open');assert.deepEqual(result.draft.invoiceCoverage.pendingPages,[2]);assert.equal(await count(),1);
  const archive={expectedVersion:result.draft.version,source:result.draft.snapshot,choices:[],documentOnly:true};await assert.rejects(svc.confirm(a.id,h,first.row.id,archive,randomUUID()),code('onboarding_invoice_coverage_review'));assert.equal(await count(),1);
  assert.equal((await svc.confirm(a.id,h,first.row.id,firstBody,firstKey)).draft.state,'open');
 });
 await t.test('invalid second invoice rolls back the confirmation receipt, preserving the already confirmed first expense',async()=>{
  const existing=await db.homeExpense.findFirstOrThrow({where:{homeId:h}}),choices=[{itemId:full.view.houseExpenses[0].id,action:'link_existing',expenseId:existing.id,expectedExpenseVersion:existing.version},choice(full.view.houseExpenses[1])];choices[1].values.amountCents=36600;
  const key=randomUUID();await assert.rejects(svc.confirm(a.id,h,full.row.id,body(full.view,choices),key));assert.equal(await count(),1);assert.equal(await db.objectOnboardingRequest.count({where:{accountId:a.id,key}}),0);assert.equal((await db.objectOnboardingDraft.findUniqueOrThrow({where:{id:full.row.id}})).version,1);
 });
 let fullBody;
 await t.test('full coverage links the first invoice and creates only the second, even with concurrent confirmation',async()=>{
  const firstExpense=await db.homeExpense.findFirstOrThrow({where:{homeId:h}});fullBody=body(full.view,[{itemId:full.view.houseExpenses[0].id,action:'link_existing',expenseId:firstExpense.id,expectedExpenseVersion:firstExpense.version},choice(full.view.houseExpenses[1])]);
  const results=await Promise.all([svc.confirm(a.id,h,full.row.id,fullBody,fullKey),svc.confirm(a.id,h,full.row.id,fullBody,fullKey)]);assert(results.every(r=>r.result.newExpenses===1&&r.draft.state==='confirmed'));assert.deepEqual(results[0].draft.invoiceCoverage.pendingPages,[]);
  const costs=await db.homeExpense.findMany({where:{homeId:h},orderBy:{amountCents:'asc'}});assert.deepEqual(costs.map(e=>[e.amountCents,e.supplier,e.documentDate]),[[12200,'Idroquarzo Collaudo','2026-09-18'],[24400,'Termonimbo Collaudo','2026-09-19']]);assert.notEqual(costs[0].economicProvenance._invoiceSegment.key,costs[1].economicProvenance._invoiceSegment.key);assert.equal(await db.homeObject.count({where:{homeId:h}}),0);assert.equal(await db.homeContact.count({where:{homeId:h}}),0);
 });
 await t.test('new service/DB client replays one receipt, changed body/new key cannot duplicate',async()=>{
  const other=new PrismaClient({datasources:{db:{url:rawUrl}}});try{assert.equal((await service(other).confirm(a.id,h,full.row.id,fullBody,fullKey)).result.newExpenses,1);}finally{await other.$disconnect();}
  const changed=structuredClone(fullBody);changed.houseExpenses[1].values.amountCents=36600;await assert.rejects(svc.confirm(a.id,h,full.row.id,changed,fullKey),code('idempotency_conflict'));await assert.rejects(svc.confirm(a.id,h,full.row.id,fullBody,randomUUID()));assert.equal(await count(),2);
 });
 await t.test('source revocation redacts coverage and denies replay; SHA/version and role loss remain fail-closed',async()=>{
  await db.document.update({where:{id:full.doc.id},data:{uploaderId:b.id}});const redacted=(await svc.getDraft(a.id,h,full.row.id,{})).draft;assert.equal(redacted.snapshot,null);assert(!redacted.invoiceCoverage);assert(!redacted.houseExpenses?.length);assert(!JSON.stringify(redacted).includes('Termonimbo'));await assert.rejects(svc.confirm(a.id,h,full.row.id,fullBody,fullKey));await db.document.update({where:{id:full.doc.id},data:{uploaderId:a.id}});
  for(const change of [{sha256:'e'.repeat(64)},{version:2}]){await db.documentVersion.update({where:{id:full.doc.original.id},data:change});await assert.rejects(svc.confirm(a.id,h,full.row.id,fullBody,fullKey));await db.documentVersion.update({where:{id:full.doc.original.id},data:{sha256:full.f.original.sha256,version:1}});}
  await db.homeMembership.updateMany({where:{accountId:a.id,homeId:h},data:{role:'viewer'}});await assert.rejects(svc.confirm(a.id,h,full.row.id,fullBody,fullKey));const requests=fake.requests.length;await assert.rejects(runProgressiveCampaign({item,provider:createModelAdapter({model:MODEL,transport:fake.transport}),ledger}));assert.equal(fake.requests.length,requests);assert.equal(await count(),2);
 });
});
