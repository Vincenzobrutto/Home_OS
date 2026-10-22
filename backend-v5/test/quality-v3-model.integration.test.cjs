global.fetch=async()=>{throw Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto'),{spawnSync}=require('node:child_process'),path=require('node:path');
const {PrismaClient}=require('../generated/client');
const {PrismaCampaignLedger,assertQualityDatabase}=require('./quality-v3-ledger.cjs');
const {createModelAdapter}=require('./quality-v3-model.cjs');
const {runCampaign,runProgressiveCampaign}=require('./quality-v3-runner.cjs');
const {MODEL,unsupported,houseDocument,fakeTransport}=require('./quality-v3-model-fixture.cjs');
const {load}=require('./corpus-v3/corpus.cjs');
const {ProviderFailure}=require('../dist/review/provider');
test('real model adapter and progressive runner with synthetic HTTP and durable ledger',{timeout:300000},async t=>{
 const databaseUrl=process.env.QUALITY_V3_DATABASE_URL;assertQualityDatabase(databaseUrl);
 const db=new PrismaClient({datasources:{db:{url:databaseUrl}}}),opened=[];await db.$connect();
 t.after(async()=>{for(const l of opened)await l.close();await db.$disconnect();});
 const account=await db.account.create({data:{name:'Synthetic model test',email:`model-${randomUUID()}@example.test`,passwordHash:'not-a-login'}}),home=await db.home.create({data:{name:'SYNTHETIC QUALITY V3',address:'Synthetic only',memberships:{create:{accountId:account.id,role:'owner'}}}}),cases=[];
 for(const c of load().cases){const doc=await db.document.create({data:{homeId:home.id,uploaderId:account.id,name:c.id,visibility:'private',original:{create:{originalFilename:c.id,mimeType:c.mimeType,sha256:c.sha256,byteSize:c.bytes.length,file:{create:{storageKey:'quality-model-'+randomUUID()}}}}}});cases.push({id:c.id,sha256:c.sha256,gold:c.gold,documentId:doc.id,documentVersion:1,pages:[]});}
 const options=(extra={})=>({databaseUrl,campaignId:'fase0-quality-v3-model-'+randomUUID(),accountId:account.id,homeId:home.id,model:MODEL,maxCalls:150,budgetMicroUsd:12_000_000,...extra});
 async function open(config){const ledger=await PrismaCampaignLedger.open(config);opened.push(ledger);return ledger;}
 const scan=cases.find(c=>c.id==='Q48'),fastParser={extract:async()=>{throw new ProviderFailure('pdf_text_unavailable');},pageCount:async()=>2,renderPage:async()=>({bytes:Buffer.from('synthetic PNG'),pageCount:2})};
 const adapter=(fake,fast=false)=>createModelAdapter({transport:fake.transport,model:MODEL,...(fast?{parser:fastParser}:{})});
 const child=(config,action)=>spawnSync(process.execPath,[path.join(__dirname,'quality-v3-model-worker.cjs')],{input:JSON.stringify({options:config,item:scan,action}),encoding:'utf8',windowsHide:true,timeout:90000});
 await t.test('all 52 originals twice through real parsing/preparation/HTTP decoding/policy/billing; replay makes zero HTTP requests',async()=>{
  const ledger=await open(options()),fake=fakeTransport(),provider=adapter(fake),matrix=[...cases,...cases.map(c=>({...c,run:2}))];
  const a=await runCampaign({cases:matrix,provider,ledger});assert.equal(a.settled,104);assert.equal(fake.sends(),104);assert.equal(a.committedMicroUsd,234000);assert(a.results.every(r=>r.observation.failureCode===null&&r.observation.automatic==='review'&&r.score));
  const count=fake.requests.length,b=await runCampaign({cases:matrix,provider,ledger});assert.equal(fake.requests.length,count);assert.deepEqual(b.metrics,a.metrics);
  const rows=await db.objectOnboardingAttempt.findMany({where:{campaignId:ledger.options.campaignId}});assert(rows.every(r=>r.output.schema==='quality-v3-score-v2'&&!JSON.stringify(r.output).includes('Planimetria')));
 });
 await t.test('actual scan rendering: stop at first complete page; persist review permission and replay without parsing/sending',async()=>{
  const ledger=await open(options({campaignId:'fase0-quality-v3-progress-stop-'+randomUUID()})),fake=fakeTransport({reply:()=>houseDocument({visual:true})}),provider=adapter(fake);
  const a=await runProgressiveCampaign({item:scan,provider,ledger});assert.equal(a.progressive.reason,'complete');assert.equal(a.progressive.throughPage,1);assert.equal(a.calls,1);assert.equal(fake.sends(),1);assert.equal(a.results[0].observation.automatic,'review');
  const b=await runProgressiveCampaign({item:scan,provider,ledger});assert.equal(b.progressive.reason,'complete');assert.equal(fake.sends(),1);
 });
 await t.test('new process resumes incomplete prefix, sends only next prefix with physical page 2, then never resends',async()=>{
  const config=options(),first=child(config,'partial');assert.equal(first.status,0,first.stderr);assert.equal(JSON.parse(first.stdout).providerCalls,1);
  const second=child(config,'resume');assert.equal(second.status,0,second.stderr);const r=JSON.parse(second.stdout);assert.equal(r.providerCalls,1);assert.equal(r.calls,2);assert.equal(r.progressive.throughPage,2);assert.equal(r.progressive.reason,'complete');
  const third=child(config,'resume');assert.equal(third.status,0,third.stderr);assert.equal(JSON.parse(third.stdout).providerCalls,0);
 });
 await t.test('process death during model request halts progression and resume never sends this or later pages',async()=>{
  const config=options(),dead=child(config,'crash');assert.equal(dead.status,23,dead.stderr);
  const resumed=child(config,'resume');assert.equal(resumed.status,0,resumed.stderr);const r=JSON.parse(resumed.stdout);assert.equal(r.providerCalls,0);assert.equal(r.progressive.reason,'uncertain');assert.equal(r.calls,1);assert.equal(r.committedMicroUsd,250000);
 });
 await t.test('exhaustion, priceable invalid output and uncertain provider outcome each stop safely',async()=>{
  for(const [reply,expected] of [[unsupported,'pages_exhausted'],[()=>houseDocument({visual:true,page:2}),'invalid_output'],[()=>{throw Error('timeout');},'uncertain']]){
   const ledger=await open(options()),fake=fakeTransport({reply}),provider=adapter(fake,true),r=await runProgressiveCampaign({item:scan,provider,ledger});assert.equal(r.progressive.reason,expected);assert.equal(r.calls,expected==='pages_exhausted'?2:1);
   const n=fake.sends();await runProgressiveCampaign({item:scan,provider,ledger});assert.equal(fake.sends(),n);
   if(expected==='invalid_output'){assert.equal(r.settled,1);assert.equal(r.committedMicroUsd,2250);assert.equal(r.results[0].observation.failureCode,'analysis_invalid_output');}
  }
 });
 await t.test('call and money ceilings stop before preparation/count/send of the next prefix',async()=>{
  for(const limits of [{maxCalls:1},{budgetMicroUsd:250000}]){
   const ledger=await open(options(limits)),fake=fakeTransport(),r=await runProgressiveCampaign({item:scan,provider:adapter(fake,true),ledger});assert.equal(r.calls,1);assert.equal(fake.sends(),1);assert.equal(fake.requests.length,3);assert.equal(r.progressive.reason,limits.maxCalls?'ai_evaluation_limit_reached':'ai_budget_exhausted');
  }
 });
 await t.test('revocation between count_tokens and messages blocks transfer; abort before claim creates no charge',async()=>{
  const ledger=await open(options()),fake=fakeTransport({beforeCount:async()=>{await db.homeMembership.update({where:{accountId_homeId:{accountId:account.id,homeId:home.id}},data:{revokedAt:new Date()}});}});
  const r=await runCampaign({cases:[cases[0]],provider:adapter(fake),ledger});assert.equal(fake.sends(),0);assert.equal(r.uncertain,1);assert.equal(r.committedMicroUsd,250000);
  await db.homeMembership.update({where:{accountId_homeId:{accountId:account.id,homeId:home.id}},data:{revokedAt:null}});
  const clean=await open(options()),abort=new AbortController();abort.abort();const a=await runProgressiveCampaign({item:scan,provider:adapter(fake,true),ledger:clean,signal:abort.signal});assert.equal(a.progressive.reason,'aborted');assert.equal(a.calls,0);
 });
 await t.test('text classification uses actual policy; no product resources or contacts are created by the campaign',async()=>{
  const ledger=await open(options()),fake=fakeTransport({reply:()=>houseDocument()}),r=await runCampaign({cases:[cases.find(c=>c.id==='Q31')],provider:adapter(fake),ledger});assert.equal(r.results[0].observation.automatic,'complete');assert.equal(r.results[0].observation.complete,true);
  for(const table of ['homeObject','homeExpense','homeContact'])assert.equal(await db[table].count({where:{homeId:home.id}}),0);
 });
 await t.test('two progressive processes cannot dispatch the same prefix twice even while a response is in flight',async()=>{
  const config=options(),one=await open(config),two=await open(config);let arrived,release;const entered=new Promise(r=>{arrived=r;}),gate=new Promise(r=>{release=r;});
  const fake=fakeTransport({beforeSend:async()=>{arrived();await gate;},reply:()=>houseDocument({visual:true})}),provider=adapter(fake,true);
  const first=runProgressiveCampaign({item:scan,provider,ledger:one});await entered;
  try{const second=await runProgressiveCampaign({item:scan,provider,ledger:two});assert.equal(second.progressive.reason,'uncertain');assert.equal(fake.sends(),1);}finally{release();}
  const result=await first;assert.equal(result.progressive.reason,'complete');assert.equal(result.calls,1);assert.equal(fake.sends(),1);
 });
 await t.test('abort or authorization loss after response retains known cost and never advances/approves output',async()=>{
  const ledger=await open(options()),abort=new AbortController(),fake=fakeTransport({reply:()=>{abort.abort();return unsupported();}});
  const r=await runProgressiveCampaign({item:scan,provider:adapter(fake,true),ledger,signal:abort.signal});assert.equal(r.progressive.reason,'aborted');assert.equal(r.calls,1);assert.equal(r.committedMicroUsd,2250);assert.equal(fake.sends(),1);
  const other=await open(options()),revoked=fakeTransport({reply:async()=>{await db.homeMembership.update({where:{accountId_homeId:{accountId:account.id,homeId:home.id}},data:{revokedAt:new Date()}});return houseDocument();}});
  const s=await runCampaign({cases:[cases.find(c=>c.id==='Q31')],provider:adapter(revoked),ledger:other});assert.equal(s.settled,1);assert.equal(s.committedMicroUsd,2250);assert.equal(s.results[0].observation.automatic,'review');assert.equal(s.results[0].observation.complete,false);assert.equal(s.results[0].observation.failureCode,'analysis_authorization_lost');
  await db.homeMembership.update({where:{accountId_homeId:{accountId:account.id,homeId:home.id}},data:{revokedAt:null}});
 });
});
