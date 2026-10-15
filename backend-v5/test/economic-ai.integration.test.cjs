// Real dedicated PostgreSQL/PDF parser, stubbed Anthropic HTTP. Never a live provider test.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {ReviewService}=require('../dist/review/review.service'),{ExpensesService}=require('../dist/expenses/expenses.service');
const {EconomicDocumentsService}=require('../dist/economy/document.service'),{EconomicAnalysisWorker}=require('../dist/economy/document.worker');
const {EconomicAiBudget,EconomicAiConfig}=require('../dist/economy/ai-budget'),{EconomicAiAnalysis}=require('../dist/economy/ai-analysis');
const {EconomicAnthropicProvider}=require('../dist/economy/document-anthropic'),{economicFixturePdf,EconomicFixtureProvider}=require('../dist/economy/document-fixture');
const {PdfTextExtractor}=require('../dist/review/pdf-text'),{AnthropicTransport}=require('../dist/review/anthropic'),{digest}=require('../dist/security');

test('Economic AI: isolated budget, atomic dispatch, authorization and crash recovery (HTTP STUB)',async t=>{
  assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();
  const a=(await db.account.create({data:{name:'Economic AI offline',email:randomUUID()+'@example.test',passwordHash:'not-a-login'}})).id;
  const h=(await db.home.create({data:{name:'Economic AI isolated synthetic',address:'Test'}})).id;
  await db.homeMembership.create({data:{homeId:h,accountId:a,role:'owner',validFrom:new Date(0)}});
  const bytes=economicFixturePdf('gas'),document=await db.document.create({data:{homeId:h,uploaderId:a,name:'gas.pdf',visibility:'private',original:{create:{originalFilename:'gas.pdf',mimeType:'application/pdf',byteSize:bytes.length,sha256:digest(bytes),file:{create:{storageKey:'economic-ai-test-'+randomUUID()}}}}},include:{original:true}});
  const campaigns=[],baseM4=await db.aiAttempt.count();let selected,behavior='success';const calls=[];
  function campaign(limit=1000000,maxCalls=5){selected={campaign:'economic-test-'+randomUUID(),model:'claude-sonnet-4-6',limitMicroUsd:limit,maxCalls,price:{input:3,output:15},allowedDocumentHashes:[digest(bytes)]};campaigns.push(selected.campaign);}
  campaign();
  const config={get model(){return selected.model;},settings:()=>selected};
  const budget=new EconomicAiBudget(db,config),access=new ReviewService(db,{}),expenses=new ExpensesService(db,access,{now:()=>new Date()}),service=new EconomicDocumentsService(expenses,access,{read:async()=>bytes},budget);
  const transport=new AnthropicTransport({headers:()=>({'content-type':'application/json'})}),parser=new PdfTextExtractor(),provider=new EconomicAnthropicProvider(parser,transport),analysis=new EconomicAiAnalysis(db,provider,parser,transport,budget),worker=new EconomicAnalysisWorker(db,expenses,service,new EconomicFixtureProvider(),analysis);
  const output=()=>({documentKind:'utility_bill',currency:'EUR',currencyEvidence:{page:1,excerpt:'Totale corrente bolletta: 80,00 EUR'},fields:[{field:'category',value:'gas',page:1,excerpt:'Bolletta gas settembre'}],amounts:[{id:'current',amountCents:8000,role:'current_document_total',label:'Corrente',page:1,excerpt:'Totale corrente bolletta: 80,00 EUR'}]});
  const response=()=>({id:'msg_offline',model:selected.model,stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(output())}],usage:{input_tokens:1000,output_tokens:200}});
  transport.fetchImpl=async(url,opts)=>{
    calls.push({url,body:opts.body&&JSON.parse(opts.body)});
    if(url.includes('/models/')){if(behavior==='revoke')await db.homeMembership.update({where:{accountId_homeId:{accountId:a,homeId:h}},data:{revokedAt:new Date()}});return Response.json({id:selected.model});}
    if(url.endsWith('/count_tokens'))return Response.json({input_tokens:2000});
    if(url.endsWith('/messages')){if(behavior==='uncertain')throw Error('Synthetic network loss');const r=response();if(behavior==='bad-evidence'){const data=output();data.amounts[0].amountCents=9900;r.content[0].text=JSON.stringify(data);}return Response.json(r);}
    throw Error('Unexpected route: no network');
  };
  const start=(key=randomUUID())=>service.start(a,h,{documentId:document.id,provider:'anthropic',consentToProviderTransfer:true},key);
  const denied=(p,status,code)=>assert.rejects(p,e=>e.getStatus?.()===status&&e.getResponse().code===code);
  const attempt=id=>db.economicAiAttempt.findUniqueOrThrow({where:{jobId:id}});
  t.after(async()=>{
    await db.homeExpense.updateMany({where:{homeId:h},data:{analysisDraftId:null}});await db.economicDraft.updateMany({where:{homeId:h},data:{expenseId:null}});
    await db.economicRequest.deleteMany({where:{homeId:h}});await db.economicDraft.deleteMany({where:{homeId:h}});await db.economicAiAttempt.deleteMany({where:{campaignId:{in:campaigns}}});await db.economicAiCampaign.deleteMany({where:{id:{in:campaigns}}});await db.economicAnalysisJob.deleteMany({where:{homeId:h}});
    await db.expenseHistory.deleteMany({where:{accountId:a}});await db.expenseRequest.deleteMany({where:{homeId:h}});await db.homeExpense.deleteMany({where:{homeId:h}});
    await db.documentVersion.deleteMany({where:{documentId:document.id}});await db.document.delete({where:{id:document.id}});await db.storedFile.delete({where:{id:document.original.fileId}});await db.home.delete({where:{id:h}});await db.account.delete({where:{id:a}});await db.$disconnect();
  });
  await t.test('default config disabled and consent required before any reservation',async()=>{
    assert.throws(()=>new EconomicAiConfig().settings(),e=>e.getResponse().code==='ai_provider_disabled');
    await denied(service.start(a,h,{documentId:document.id,provider:'anthropic'},randomUUID()),422,'validation_error');
    assert.equal(await db.economicAiAttempt.count({where:{campaignId:selected.campaign}}),0);assert.equal(calls.length,0);
    const hashes=selected.allowedDocumentHashes;selected.allowedDocumentHashes=[];
    await denied(start(),422,'economic_document_not_authorized');
    assert.equal(await db.economicAiAttempt.count({where:{campaignId:selected.campaign}}),0);assert.equal(calls.length,0);selected.allowedDocumentHashes=hashes;
  });
  await t.test('concurrent reservations enforce call quota; replay reserves once; campaign cannot be enlarged',async()=>{
    campaign(1000000,2);const key=randomUUID(),first=await start(key);await start(key);
    const rest=await Promise.allSettled([start(),start()]);assert.equal(rest.filter(r=>r.status==='fulfilled').length,1);assert.equal(rest.find(r=>r.status==='rejected').reason.getResponse().code,'ai_evaluation_limit_reached');
    assert.equal(await db.economicAiAttempt.count({where:{campaignId:selected.campaign}}),2);selected.maxCalls=50;await denied(start(),429,'ai_evaluation_limit_reached');
    assert.equal((await service.getJob(a,h,first.job.id,{})).job.billing.state,'reserved');
    const jobs=await db.economicAnalysisJob.findMany({where:{homeId:h,state:'queued'}});for(const j of jobs){await db.economicAnalysisJob.update({where:{id:j.id},data:{state:'failed'}});await budget.fail(j.id);}
  });
  await t.test('monetary ceiling and disabled descriptor are independent from call quota',async()=>{
    campaign(250000,50);const item=await start();await denied(start(),429,'ai_budget_exhausted');const descriptor=await db.$transaction(tx=>budget.descriptor(tx));assert.equal(descriptor.disabledReason,'ai_budget_exhausted');
    await db.economicAnalysisJob.update({where:{id:item.job.id},data:{state:'failed'}});await budget.fail(item.job.id);
  });
  let successful;
  await t.test('worker persists usage/response before proposal; cost exists only after confirmation',async()=>{
    campaign();calls.length=0;successful=await start();await worker.tick();const job=(await service.getJob(a,h,successful.job.id,{})).job;
    assert.equal(job.state,'succeeded');assert.equal(job.model,selected.model);assert.equal(job.billing.actualUsd,'0.006000');assert.equal(calls.filter(c=>c.url.endsWith('/messages')).length,1);
    assert.equal(await db.homeExpense.count({where:{homeId:h}}),0);assert.equal((await attempt(job.id)).state,'settled');
    const draft=(await service.getDraft(a,h,job.draftId,{})).draft;assert.equal(draft.model,selected.model);
    await service.confirm(a,h,draft.id,{expectedVersion:draft.version,mode:'create',values:{title:'Synthetic AI confirmed',amountCents:8000,spentOn:'2026-09-30'},amountSelection:{mode:'candidate',candidateId:'current'}},randomUUID());
    assert.equal(await db.homeExpense.count({where:{homeId:h}}),1);
  });
  await t.test('revocation before token count releases reservation and transfers no document text',async()=>{
    campaign();calls.length=0;behavior='revoke';const item=await start();await worker.tick();
    assert.equal((await attempt(item.job.id)).state,'released');assert.equal(calls.length,1);assert(!calls[0].body);
    await db.homeMembership.update({where:{accountId_homeId:{accountId:a,homeId:h}},data:{revokedAt:null}});assert.equal((await service.getJob(a,h,item.job.id,{})).job.error.code,'access_revoked');behavior='success';
  });
  await t.test('network loss after dispatch keeps reservation uncertain and blocks a second paid retry',async()=>{
    campaign();behavior='uncertain';const item=await start();await worker.tick();const a1=await attempt(item.job.id);assert.equal(a1.state,'uncertain');assert.equal(a1.actualMicroUsd,null);
    const job=(await service.getJob(a,h,item.job.id,{})).job;assert.equal(job.billing.state,'uncertain');await denied(service.retry(a,h,job.id,{expectedVersion:job.version,consentToProviderTransfer:true},randomUUID()),409,'analysis_outcome_unknown');behavior='success';
  });
  await t.test('crash recovery reuses persisted response and never resends sending/uncertain attempts',async()=>{
    campaign();const item=await start();await db.economicAnalysisJob.update({where:{id:item.job.id},data:{state:'running',leaseUntil:new Date(0),leaseToken:randomUUID(),firstStartedAt:new Date(0)}});await db.economicAiAttempt.update({where:{jobId:item.job.id},data:{state:'settled',response:response(),actualMicroUsd:6000}});
    calls.length=0;await worker.tick();assert.equal(calls.length,0);assert.equal((await service.getJob(a,h,item.job.id,{})).job.state,'succeeded');
    const pending=await start();await db.economicAiAttempt.update({where:{jobId:pending.job.id},data:{state:'sending'}});await worker.tick();assert.equal(calls.length,0);assert.equal((await attempt(pending.job.id)).state,'uncertain');
  });
  await t.test('invalid evidence remains billed; M4 ledger unchanged',async()=>{
    campaign();behavior='bad-evidence';const item=await start();await worker.tick();assert.equal((await attempt(item.job.id)).state,'settled');assert.equal((await service.getJob(a,h,item.job.id,{})).job.error.code,'evidence_unverified');assert.equal(await db.aiAttempt.count(),baseM4);behavior='success';
  });
});
