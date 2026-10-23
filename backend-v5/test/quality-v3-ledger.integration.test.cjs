// Explicit isolated PostgreSQL only, no .env and no AI/email transport.
require('reflect-metadata');
global.fetch=async()=>{throw new Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto'),{spawnSync}=require('node:child_process'),path=require('node:path');
const {PrismaClient}=require('../generated/client');
const {PrismaCampaignLedger,assertQualityDatabase,RESERVE_MICRO_USD}=require('./quality-v3-ledger.cjs');
const {runCampaign}=require('./quality-v3-runner.cjs');
const {load}=require('./corpus-v3/corpus.cjs');
const code=expected=>e=>(e.code??e.getResponse?.().code)===expected;
const databaseUrl=process.env.QUALITY_V3_DATABASE_URL;
test('quality ledger rejects product/remote/implicit databases before connection',()=>{
 for(const url of [undefined,'postgresql://x@127.0.0.1:55432/dimora_v5_product_dev','postgresql://x@db.example.test:55433/dimora_v5_quality_v3_test','postgresql://x@127.0.0.1:55433/dimora_v5_quality_v3_test?schema=public'])assert.throws(()=>assertQualityDatabase(url),code('quality_database_required'));
});
test('durable onboarding campaign: corpus, processes, races, caps and uncertain outcomes',{timeout:120000},async t=>{
 assertQualityDatabase(databaseUrl);
 const db=new PrismaClient({datasources:{db:{url:databaseUrl}}}),opened=[];
 await db.$connect();t.after(async()=>{for(const ledger of opened)await ledger.close();await db.$disconnect();});
 const account=await db.account.create({data:{name:'Synthetic ledger test',email:`quality-${randomUUID()}@example.test`,passwordHash:'not-a-login'}});
 const home=await db.home.create({data:{name:'SYNTHETIC QUALITY V3',address:'Synthetic only',memberships:{create:{accountId:account.id,role:'owner'}}}});
 const cases=[];
 for(const c of load().cases){
  const document=await db.document.create({data:{homeId:home.id,uploaderId:account.id,name:c.id,visibility:'private',original:{create:{originalFilename:c.id,mimeType:c.mimeType,byteSize:c.bytes.length,sha256:c.sha256,file:{create:{storageKey:`quality-only-${randomUUID()}`}}}}}});
  cases.push({id:c.id,sha256:c.sha256,documentId:document.id,documentVersion:1,gold:c.gold,pages:[]});
 }
 const options=(extra={})=>({databaseUrl,campaignId:`fase0-quality-v3-offline-${randomUUID()}`,accountId:account.id,homeId:home.id,model:'claude-sonnet-5-5',maxCalls:150,budgetMicroUsd:12_000_000,...extra});
 async function open(config){const ledger=await PrismaCampaignLedger.open(config);opened.push(ledger);return ledger;}
 const child=(config,items,action)=>spawnSync(process.execPath,[path.join(__dirname,'quality-v3-ledger-worker.cjs')],{input:JSON.stringify({options:config,cases:items,action}),encoding:'utf8',timeout:60000,windowsHide:true});
 await t.test('all 52 hashed cases: persist settlement and score, restart child and make zero duplicate calls',async()=>{
  const config=options(),first=child(config,cases,'run');assert.equal(first.status,0,first.stderr);const a=JSON.parse(first.stdout);assert.equal(a.providerCalls,52);assert.equal(a.settled,52);assert.equal(a.committedMicroUsd,52000);assert(a.metrics);
  const resumed=child(config,cases,'run');assert.equal(resumed.status,0,resumed.stderr);const b=JSON.parse(resumed.stdout);assert.equal(b.providerCalls,0);assert.equal(b.settled,52);assert.deepEqual(b.metrics,a.metrics);
  const rows=await db.objectOnboardingAttempt.findMany({where:{campaignId:config.campaignId}});assert.equal(rows.length,52);assert(rows.every(r=>r.reservedMicroUsd===RESERVE_MICRO_USD&&r.state==='settled'&&r.output.schema==='quality-v3-score-v1'));
  assert.equal(await db.homeObject.count({where:{homeId:home.id}}),0);assert.equal(await db.homeExpense.count({where:{homeId:home.id}}),0);assert.equal(await db.homeContact.count({where:{homeId:home.id}}),0);
 });
 await t.test('process death after committed sending never retries and retains full reservation',async()=>{
  const config=options({campaignId:'fase0-quality-v3-offline-crash-'+randomUUID()}),crash=child(config,[cases[0]],'crash');assert.equal(crash.status,23,crash.stderr);
  const row=await db.objectOnboardingAttempt.findFirstOrThrow({where:{campaignId:config.campaignId}});assert.equal(row.state,'sending');assert.equal(row.actualMicroUsd,null);
  const resumed=child(config,[cases[0]],'run');assert.equal(resumed.status,0,resumed.stderr);const r=JSON.parse(resumed.stdout);assert.equal(r.providerCalls,0);assert.equal(r.uncertain,1);assert.equal(r.committedMicroUsd,RESERVE_MICRO_USD);
  assert.equal((await db.objectOnboardingAttempt.findUniqueOrThrow({where:{id:row.id}})).state,'uncertain');
 });
 await t.test('two independent clients racing the same request dispatch once',async()=>{
  const config=options(),one=await open(config),two=await open(config);let calls=0;
  const provider=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,30));return{state:'settled',costMicroUsd:1000};};
  await Promise.all([runCampaign({cases:[cases[0]],ledger:one,provider}),runCampaign({cases:[cases[0]],ledger:two,provider})]);assert.equal(calls,1);assert.equal((await one.entries()).length,1);assert.equal((await one.entries())[0].state,'settled');
 });
 await t.test('concurrent distinct requests cannot overshoot one-call cap; persisted ceiling cannot increase',async()=>{
  const config=options({maxCalls:1}),one=await open(config),two=await open(config);let calls=0;const provider=async()=>{calls++;return{state:'settled',costMicroUsd:1000};};
  const r=await Promise.allSettled([runCampaign({cases:[cases[0]],ledger:one,provider}),runCampaign({cases:[cases[1]],ledger:two,provider})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(calls,1);assert.equal(r.find(x=>x.status==='rejected').reason.getResponse().code,'ai_evaluation_limit_reached');
  const raised=await open({...config,maxCalls:150});await assert.rejects(()=>runCampaign({cases:[cases[2]],ledger:raised,provider}),code('ai_evaluation_limit_reached'));assert.equal(calls,1);
 });
 await t.test('money cap includes uncertain reservations and failed reservations roll back job and attempt',async()=>{
  const ledger=await open(options({budgetMicroUsd:RESERVE_MICRO_USD}));let calls=0;const provider=async()=>{calls++;throw Error('simulated timeout');};
  await runCampaign({cases:[cases[0]],ledger,provider});await assert.rejects(()=>runCampaign({cases:[cases[1]],ledger,provider}),code('ai_budget_exhausted'));assert.equal(calls,1);assert.equal((await ledger.entries()).length,1);
  assert.equal(await db.objectOnboardingJob.count({where:{key:{startsWith:ledger.options.campaignId+':'}}}),1);
  const raised=await open({...ledger.options,budgetMicroUsd:12_000_000});await assert.rejects(()=>runCampaign({cases:[cases[1]],ledger:raised,provider}),code('ai_budget_exhausted'));assert.equal(calls,1);
 });
 await t.test('invalid settlement remains uncertain; lost settlement acknowledgement cannot undo committed charge',async()=>{
  const ledger=await open(options());let calls=0;await runCampaign({cases:[cases[0]],ledger,provider:async()=>{calls++;return{state:'settled',costMicroUsd:RESERVE_MICRO_USD+1};}});assert.equal((await ledger.entries())[0].state,'uncertain');
  await runCampaign({cases:[cases[0]],ledger,provider:async()=>{calls++;}});assert.equal(calls,1);
  const settle=ledger.settle.bind(ledger);ledger.settle=async(...args)=>{await settle(...args);throw Error('ack lost');};
  const r=await runCampaign({cases:[cases[1]],ledger,provider:async()=>({state:'settled',costMicroUsd:1000})});assert.equal(r.settled,1);assert.equal(r.uncertain,1);assert.equal(r.committedMicroUsd,RESERVE_MICRO_USD+1000);
 });
 await t.test('hash, gold, scope and model changes fail closed without provider dispatch',async()=>{
  const config=options(),ledger=await open(config);let calls=0;const provider=async()=>{calls++;return{state:'settled',costMicroUsd:1000};};
  await assert.rejects(()=>runCampaign({cases:[{...cases[0],sha256:'0'.repeat(64)}],ledger,provider}),code('invalid_synthetic_case'));
  await assert.rejects(()=>runCampaign({cases:[{...cases[0],gold:{...cases[0].gold,automatic:'review'}}],ledger,provider}),code('invalid_synthetic_case'));
  await runCampaign({cases:[cases[0]],ledger,provider});const changed=await open({...config,model:'claude-sonnet-4-6'});await assert.rejects(()=>runCampaign({cases:[cases[1]],ledger:changed,provider}),code('campaign_identity_conflict'));assert.equal(calls,1);
  await assert.rejects(()=>runCampaign({cases:[{...cases[0],pages:['changed preparation']}],ledger,provider}),code('campaign_identity_conflict'));assert.equal(calls,1);
 });
 await t.test('run, reading mode and progressive pass reserve independently, then replay without dispatch',async()=>{
  const ledger=await open(options()),item=cases.find(c=>c.id==='Q43'),items=[item,{...item,run:2},{...item,mode:'local_pages'},{...item,mode:'progressive',throughPage:1},{...item,mode:'progressive',throughPage:2}];let calls=0;
  const provider=async()=>{calls++;return{state:'settled',costMicroUsd:1000};};const a=await runCampaign({cases:items,ledger,provider});assert.equal(a.calls,5);assert.equal(calls,5);await runCampaign({cases:items,ledger,provider});assert.equal(calls,5);
 });
 await t.test('source version and visibility changes block even replay; a failed reservation transaction leaves no job',async()=>{
  const ledger=await open(options());let calls=0;const provider=async()=>{calls++;return{state:'settled',costMicroUsd:1000};};
  await runCampaign({cases:[cases[0]],ledger,provider});
  await db.documentVersion.update({where:{documentId:cases[0].documentId},data:{version:2}});
  await assert.rejects(()=>runCampaign({cases:[cases[0]],ledger,provider}),code('synthetic_source_changed'));
  await db.documentVersion.update({where:{documentId:cases[0].documentId},data:{version:1}});
  await db.document.update({where:{id:cases[0].documentId},data:{visibility:'home'}});
  await assert.rejects(()=>runCampaign({cases:[cases[0]],ledger,provider}),code('synthetic_source_changed'));
  await db.document.update({where:{id:cases[0].documentId},data:{visibility:'private'}});assert.equal(calls,1);
  const failing=await open(options()),reserve=failing.budget.reserve.bind(failing.budget);
  failing.budget.reserve=async(...args)=>{await reserve(...args);throw Error('injected transaction failure');};
  await assert.rejects(()=>runCampaign({cases:[cases[0]],ledger:failing,provider}),/injected transaction failure/);assert.equal(calls,1);assert.equal((await failing.entries()).length,0);
  assert.equal(await db.objectOnboardingJob.count({where:{key:{startsWith:failing.options.campaignId+':'}}}),0);
 });
 await t.test('revoked membership blocks reservation and provider',async()=>{
  const ledger=await open(options());await db.homeMembership.update({where:{accountId_homeId:{accountId:account.id,homeId:home.id}},data:{revokedAt:new Date()}});let calls=0;
  await assert.rejects(()=>runCampaign({cases:[cases[0]],ledger,provider:async()=>{calls++;}}),code('synthetic_scope_required'));assert.equal(calls,0);assert.equal((await ledger.entries()).length,0);
  await db.homeMembership.update({where:{accountId_homeId:{accountId:account.id,homeId:home.id}},data:{revokedAt:null}});
 });
});
