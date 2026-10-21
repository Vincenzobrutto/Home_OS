require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {ObjectOnboardingService}=require('../dist/object-onboarding/onboarding.service');
const {compilationDraft}=require('../dist/object-onboarding/compilation-draft');
const saved=()=>({saved:true,documentTitle:'',documentKind:'utility_bill',replaceOrganization:false,reuseCopy:false,documentOnly:false,manualTotal:'12,',contacts:[],houseForms:{cost:{candidateId:'',amount:'12,',manual:true,title:'',supplier:'Fittizio',date:'',category:'',mode:'create',expenseId:'',ack:false,periodFrom:'2025-12-01',periodTo:'',dueOn:'',periodDraft:{mode:'range',month:'2025-12',range:{from:'2025-12-01',to:''}}}}});
function world(){
 const a=randomUUID(),h=randomUUID(),id=randomUUID(),doc=randomUUID(),key=randomUUID();let updates=0,available=true;const receipts=new Map();
 let draft={id,version:1,state:'open',documentId:doc,documentVersion:1,documentSha256:'a'.repeat(64),mode:'manual',output:{documentKind:'utility_bill',items:[],houseExpenses:[],needsReview:true,purchaseTotal:null},decisions:{},review:null};
 const tx={objectOnboardingRequest:{findUnique:async q=>receipts.get(JSON.stringify(q.where)),create:async q=>{receipts.set(JSON.stringify({accountId_homeId_operation_target_key:{accountId:a,homeId:h,operation:'review',target:id,key}}),q.data);}},objectOnboardingDraft:{update:async q=>{updates++;draft={...draft,review:q.data.review,version:draft.version+1};return draft;}}};
 const access={run:async(account,home,write,fn)=>{assert.equal(account,a);assert.equal(home,h);assert.equal(write,true);return fn(tx,true);},draft:async(_tx,account,home,requested)=>{assert.equal(account,a);assert.equal(home,h);assert.equal(requested,id);return draft;},source:async()=>available?{id:doc,name:'Fittizio',original:{mimeType:'application/pdf'}}:null};
 const service=new ObjectOnboardingService(access,{}, {},{now:()=>new Date()});return {service,a,h,id,key,draft:()=>draft,updates:()=>updates,unavailable:()=>{available=false;}};
}
test('incomplete raw inputs persist, remain open and replay idempotently without domain writes',async()=>{
 const w=world(),input={expectedVersion:1,review:{forms:{},compilation:saved()}};
 const result=await w.service.saveReview(w.a,w.h,w.id,input,w.key);assert.equal(result.draft.state,'open');assert.equal(result.draft.version,2);assert.deepEqual(result.draft.review.compilation,input.review.compilation);assert.deepEqual(w.draft().decisions,{});
 const replay=await w.service.saveReview(w.a,w.h,w.id,input,w.key);assert.equal(replay.draft.version,2);assert.equal(w.updates(),1);
 await assert.rejects(w.service.saveReview(w.a,w.h,w.id,{...input,review:{forms:{},compilation:{...saved(),documentTitle:'Changed'}}},w.key),e=>e.getResponse().code==='idempotency_conflict');
});
test('stale version and unavailable source reject saving without updating',async()=>{
 const w=world();await assert.rejects(w.service.saveReview(w.a,w.h,w.id,{expectedVersion:2,review:{compilation:saved()}},w.key),e=>e.getResponse().code==='onboarding_version_conflict');assert.equal(w.updates(),0);w.unavailable();await assert.rejects(w.service.saveReview(w.a,w.h,w.id,{expectedVersion:1,review:{compilation:saved()}},randomUUID()));assert.equal(w.updates(),0);
});
test('draft parser accepts incomplete fields but rejects malformed envelopes, unbounded inputs and side-effect flags',()=>{
 assert.deepEqual(compilationDraft(saved()),saved());for(const input of [{...saved(),saved:false},{...saved(),documentTitle:'x'.repeat(4001)},{...saved(),consentToProviderTransfer:true},{...saved(),houseForms:{cost:{amount:'x'}}},{...saved(),contacts:[{proposalId:'contact',action:'save',values:{name:'',email:null}}],manualTotal:3}])assert.throws(()=>compilationDraft(input));
});
test('document reference is saved as input only with a scoped versioned target shape',()=>{
 const input={...saved(),documentTarget:{kind:'object',id:randomUUID(),expectedVersion:2,name:'Impianto sintetico'}};assert.deepEqual(compilationDraft(input).documentTarget,input.documentTarget);
 for(const patch of [{kind:'home'},{id:'foreign-invalid'},{expectedVersion:0},{name:'x'.repeat(121)},{accountId:randomUUID()}])assert.throws(()=>compilationDraft({...input,documentTarget:{...input.documentTarget,...patch}}));
});
test('restored document reference never exposes a name whose source is no longer readable',async()=>{
 const {EconomyPolicy}=require('../dist/economy/policy'),{ForbiddenException}=require('@nestjs/common'),original=EconomyPolicy.prototype.subject;
 const compilation={...saved(),documentTarget:{kind:'object',id:randomUUID(),expectedVersion:1,name:'Private old name'}},service=new ObjectOnboardingService({}, {}, {}, {});
 try{EconomyPolicy.prototype.subject=async()=>{throw new ForbiddenException()};const result=await service.safeReview({},'account','home',{review:{compilation}});assert.equal(result.compilation.documentTarget.name,'');assert.equal(result.compilation.documentTarget.id,compilation.documentTarget.id);
 EconomyPolicy.prototype.subject=async()=>({name:'Readable current name',state:'active'});assert.equal((await service.safeReview({},'account','home',{review:{compilation}})).compilation.documentTarget.name,'Readable current name');
 }finally{EconomyPolicy.prototype.subject=original;}
});

test('invoice draft retains an explicit installment label and selected existing installation without canonical writes',async()=>{
 const w=world(),compilation=saved();compilation.houseForms.cost.objectChoice='object:'+randomUUID();compilation.houseForms.cost.title='Acconto · Impianto sintetico';Object.assign(compilation.houseForms.cost,{objectLabel:'Impianto sintetico',documentNumber:'14',documentDate:'2026-06-16',note:'Nota in bozza'});
 const result=await w.service.saveReview(w.a,w.h,w.id,{expectedVersion:1,review:{compilation}},w.key);
 assert.deepEqual(result.draft.review.compilation,compilation);assert.deepEqual(w.draft().decisions,{});
});

test('capabilities expose only a resume marker scoped to the current source, never private review fields',async()=>{
 const {OnboardingJobService}=require('../dist/object-onboarding/jobs.service');const a=randomUUID(),h=randomUUID(),doc=randomUUID(),id=randomUUID(),sha='a'.repeat(64);
 const tx={objectOnboardingDraft:{findMany:async q=>{assert.deepEqual(q.where,{accountId:a,homeId:h,documentId:doc,documentVersion:3,documentSha256:sha,mode:{not:'floor_plan'}});return [{id,state:'open',mode:'manual',review:{compilation:saved()}}];},findFirst:async()=>null},objectOnboardingJob:{findFirst:async()=>null}};
 const access={run:async(account,home,write,fn)=>{assert.equal(account,a);assert.equal(home,h);assert.equal(write,false);return fn(tx,true);},source:async()=>({original:{version:3,sha256:sha}})};
 const jobs=new OnboardingJobService({},access,{}, {budget:{snapshot:async()=>({available:false}),config:{campaign:'test'}}},{});
 const caps=await jobs.capabilities(a,h,{documentId:doc});assert.equal(caps.drafts[0].hasSavedCompilation,true);assert.equal('review' in caps.drafts[0],false);assert.equal(JSON.stringify(caps).includes('Fittizio'),false);
});
