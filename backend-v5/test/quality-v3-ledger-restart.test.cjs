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
  const uncertain=await db.objectOnboardingAttempt.findFirstOrThrow({where:{state:'uncertain'},include:{job:true,campaign:true}});assert.equal(uncertain.actualMicroUsd,null);assert.equal(uncertain.reservedMicroUsd,250000);
  await ledger.close();ledger=await PrismaCampaignLedger.open({databaseUrl,campaignId:uncertain.campaignId,accountId:uncertain.job.accountId,homeId:uncertain.job.homeId,model:uncertain.model,maxCalls:uncertain.campaign.maxCalls,budgetMicroUsd:uncertain.campaign.limitMicroUsd});
  const c=corpus.find(c=>c.sha256===uncertain.job.documentSha256);
  const pending=await runCampaign({cases:[{id:c.id,gold:c.gold,sha256:c.sha256,documentId:uncertain.job.documentId,documentVersion:1,pages:[]}],ledger,provider:async()=>{calls++;}});assert.equal(calls,0);assert(pending.uncertain>=1);assert(pending.committedMicroUsd>=250000);
  assert.equal(await db.objectOnboardingCampaign.count({where:{maxCalls:1}}),1);
 }finally{if(ledger)await ledger.close();await db.$disconnect();}
});
