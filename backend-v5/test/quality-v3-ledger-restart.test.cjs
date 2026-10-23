const {test}=require('node:test'),assert=require('node:assert/strict');
const {PrismaClient}=require('../generated/client');
const {PrismaCampaignLedger,assertQualityDatabase}=require('./quality-v3-ledger.cjs');
const {load}=require('./corpus-v3/corpus.cjs');
const {runCampaign}=require('./quality-v3-runner.cjs');
global.fetch=async()=>{throw Error('network_forbidden');};
test('after PostgreSQL restart: 52 persisted scores, uncertain charge, immutable caps and zero replay calls',async()=>{
 const databaseUrl=process.env.QUALITY_V3_DATABASE_URL;assertQualityDatabase(databaseUrl);
 const db=new PrismaClient({datasources:{db:{url:databaseUrl}}});let ledger;
 try{
  const campaigns=await db.objectOnboardingCampaign.findMany({where:{attempts:{every:{state:'settled'},some:{}}},include:{attempts:{include:{job:true}}}});
  const campaign=campaigns.find(c=>c.attempts.length===52);assert(campaign);
  // The full-corpus campaign is the unique campaign with 52 committed attempts.
  assert.equal(campaign.attempts.length,52);const job=campaign.attempts[0].job;
  ledger=await PrismaCampaignLedger.open({databaseUrl,campaignId:campaign.id,accountId:job.accountId,homeId:job.homeId,model:campaign.attempts[0].model,maxCalls:campaign.maxCalls,budgetMicroUsd:campaign.limitMicroUsd});
  const corpus=load().cases,cases=campaign.attempts.map(a=>{const c=corpus.find(c=>c.sha256===a.job.documentSha256);return{id:c.id,gold:c.gold,sha256:c.sha256,documentId:a.job.documentId,documentVersion:1,pages:[]};});let calls=0;
  const report=await runCampaign({cases,ledger,provider:async()=>{calls++;throw Error('must not dispatch');}});assert.equal(calls,0);assert.equal(report.settled,52);assert.equal(report.committedMicroUsd,52000);assert(report.results.every(r=>r.score));
  // Select the crash fixture, not an arbitrary progressive/other campaign request.
  const uncertain=await db.objectOnboardingAttempt.findFirstOrThrow({where:{state:'uncertain',campaignId:{startsWith:'fase0-quality-v3-offline-crash-'}},include:{job:true,campaign:true}});assert(uncertain.job.key.endsWith(':1:full:0'));assert.equal(uncertain.job.provider,'quality-v3-offline');assert.equal(uncertain.actualMicroUsd,null);assert.equal(uncertain.reservedMicroUsd,250000);
  await ledger.close();ledger=await PrismaCampaignLedger.open({databaseUrl,campaignId:uncertain.campaignId,accountId:uncertain.job.accountId,homeId:uncertain.job.homeId,model:uncertain.model,maxCalls:uncertain.campaign.maxCalls,budgetMicroUsd:uncertain.campaign.limitMicroUsd});
  const c=corpus.find(c=>c.sha256===uncertain.job.documentSha256);
  const pending=await runCampaign({cases:[{id:c.id,gold:c.gold,sha256:c.sha256,documentId:uncertain.job.documentId,documentVersion:1,pages:[]}],ledger,provider:async()=>{calls++;}});assert.equal(calls,0);assert(pending.uncertain>=1);assert(pending.committedMicroUsd>=250000);
  assert.equal(await db.objectOnboardingCampaign.count({where:{maxCalls:1,id:{startsWith:'fase0-quality-v3-offline-'}}}),1);
 }finally{if(ledger)await ledger.close();await db.$disconnect();}
});
test('after PostgreSQL restart: persisted progressive completion stops without any model HTTP request',async()=>{
 const {createModelAdapter,MODEL_ADAPTER_VERSION}=require('./quality-v3-model.cjs'),{runProgressiveCampaign}=require('./quality-v3-runner.cjs'),{MODEL,fakeTransport}=require('./quality-v3-model-fixture.cjs');
 const databaseUrl=process.env.QUALITY_V3_DATABASE_URL;assertQualityDatabase(databaseUrl);const db=new PrismaClient({datasources:{db:{url:databaseUrl}}});let ledger;
 try{
  const row=await db.objectOnboardingAttempt.findFirstOrThrow({where:{campaignId:{startsWith:'fase0-quality-v3-progress-stop-'}},include:{job:true,campaign:true}});assert.equal(row.output.observation.version,MODEL_ADAPTER_VERSION);assert.equal(row.output.observation.complete,true);
  ledger=await PrismaCampaignLedger.open({databaseUrl,campaignId:row.campaignId,accountId:row.job.accountId,homeId:row.job.homeId,model:MODEL,maxCalls:row.campaign.maxCalls,budgetMicroUsd:row.campaign.limitMicroUsd});
  const c=load().cases.find(c=>c.id==='Q48'),item={id:c.id,sha256:c.sha256,gold:c.gold,documentId:row.job.documentId,documentVersion:1,pages:[]},fake=fakeTransport(),provider=createModelAdapter({transport:fake.transport,model:MODEL});
  const report=await runProgressiveCampaign({item,provider,ledger});assert.equal(report.progressive.reason,'complete');assert.equal(report.progressive.throughPage,1);assert.equal(fake.requests.length,0);assert.equal(report.calls,1);
 }finally{if(ledger)await ledger.close();await db.$disconnect();}
});
