require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {OnboardingJobService}=require('../dist/object-onboarding/jobs.service');
function world({success=true,extracted=false,prior=null}={}){
 const a=randomUUID(),h=randomUUID(),id=randomUUID(),draftId=randomUUID(),sha='a'.repeat(64),queries=[];
 const source={id,original:{version:1,sha256:sha,mimeType:'application/pdf',byteSize:100}};
 const saved={id:randomUUID(),accountId:a,homeId:h,documentId:id,documentVersion:1,documentSha256:sha,purpose:'products',provider:'anthropic',state:'succeeded',draftId,createdAt:new Date(),updatedAt:new Date()};
 let reservations=0,created=0;
 const tx={$queryRaw:async()=>[],objectOnboardingJob:{findUnique:async()=>prior,findFirst:async q=>{queries.push(q.where);if(q.where.state==='succeeded')return success?saved:null;return null;},count:async()=>0,create:async q=>{created++;return {...saved,...q.data,id:randomUUID(),state:'queued',draftId:null};}},objectOnboardingDraft:{findMany:async()=>extracted?[{id:draftId,state:'open',mode:'extraction'}]:[],findFirst:async()=>extracted?{id:draftId}:null},objectOnboardingAttempt:{findUnique:async()=>null}};
 const access={run:async(account,home,edit,fn)=>{assert.equal(account,a);assert.equal(home,h);return fn(tx,true);},source:async()=>source};
 const ai={budget:{snapshot:async()=>({available:true}),config:{campaign:'new-campaign'},requireSource:()=>{},reserve:async()=>{reservations++;return {};}}};
 const jobs=new OnboardingJobService({},access,{},ai,{});
 return {jobs,a,h,id,saved,queries,tx,ai,body:{documentId:id,provider:'anthropic',consentToProviderTransfer:true},counts:()=>({reservations,created})};
}
test('new keys reuse successful analysis before confirmation and across campaigns without budget/provider calls',async()=>{
 const w=world();w.ai.budget.requireSource=()=>{throw Error('No provider authorization needed to read old result');};w.ai.budget.reserve=()=>{throw Error('No new reservation');};
 const first=await w.jobs.start(w.a,w.h,w.body,randomUUID()),second=await w.jobs.start(w.a,w.h,{...w.body,acknowledgePreviousUncertainAnalysis:true},randomUUID());
 assert.equal(first.job.id,w.saved.id);assert.equal(second.job.draftId,w.saved.draftId);assert.deepEqual(w.counts(),{reservations:0,created:0});
 for(const q of w.queries)assert.deepEqual(q,{accountId:w.a,homeId:w.h,documentId:w.id,documentVersion:1,documentSha256:'a'.repeat(64),purpose:'products',state:'succeeded'});
});
test('capabilities keep manual editing and existing proposals but disable both fresh and uncertain retries after success',async()=>{
 const w=world();const caps=await w.jobs.capabilities(w.a,w.h,{documentId:w.id});assert.equal(caps.analysisSucceeded,true);assert.equal(caps.successfulDraftId,w.saved.draftId);assert.equal(caps.manualAvailable,true);assert.equal(caps.canStartAnalysis,false);assert.equal(caps.canStartWithUncertainAcknowledgement,false);
});
test('extracted proposals remain protected when no successful job row is available',async()=>{
 const w=world({success:false,extracted:true});assert.equal((await w.jobs.capabilities(w.a,w.h,{documentId:w.id})).analysisSucceeded,true);
 await assert.rejects(w.jobs.start(w.a,w.h,w.body,randomUUID()),e=>e.getStatus()===409&&e.getResponse().code==='onboarding_analysis_already_succeeded');assert.deepEqual(w.counts(),{reservations:0,created:0});
});
test('never analysed or failed-only source can start normally',async()=>{
 const w=world({success:false});assert.equal((await w.jobs.capabilities(w.a,w.h,{documentId:w.id})).canStartAnalysis,true);
 const started=await w.jobs.start(w.a,w.h,w.body,randomUUID());assert.equal(started.job.state,'queued');assert.deepEqual(w.counts(),{reservations:1,created:1});
});

test('an idempotent replay recovers its original result rather than replacing it with a later success',async()=>{
 const w=world();const key=randomUUID(),body=w.body;const {digest}=require('../dist/security');
 const original={...w.saved,id:randomUUID(),state:'failed',draftId:null,digest:digest(JSON.stringify(body))};w.tx.objectOnboardingJob.findUnique=async()=>original;
 const replay=await w.jobs.start(w.a,w.h,body,key);assert.equal(replay.job.id,original.id);assert.equal(replay.job.state,'failed');assert.deepEqual(w.counts(),{created:0,reservations:0});
});
