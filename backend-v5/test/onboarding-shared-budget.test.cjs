require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {OnboardingAiConfig,OnboardingAiBudget}=require('../dist/object-onboarding/ai-budget');
const {OnboardingJobService}=require('../dist/object-onboarding/jobs.service');
const account=randomUUID(),primary=randomUUID(),trial=randomUUID(),hash='a'.repeat(64);
class Config extends OnboardingAiConfig{constructor(extra=''){super();this.env={ONBOARDING_AI_ENABLED:'true',ANTHROPIC_API_KEY:'offline',ONBOARDING_AI_MODEL:'claude-sonnet-5-5',ONBOARDING_AI_CAMPAIGN_ID:'onboarding-shared-offline',ONBOARDING_AI_BUDGET_USD:'3',ONBOARDING_AI_MAX_CALLS:'50',ONBOARDING_AI_SCOPE:'home',ONBOARDING_AI_ACCOUNT_ID:account,ONBOARDING_AI_HOME_ID:primary,ONBOARDING_AI_ADDITIONAL_HOME_IDS:extra};}get environment(){return this.env;}}
test('additional homes retain the account boundary and do not authorize other homes or malformed hashes',()=>{
 const c=new Config(trial+','+trial);assert.deepEqual(c.settings().homeIds,[primary,trial]);
 for(const home of [primary,trial])assert.equal(c.sourceAuthorized(hash,account,home),true);
 assert.equal(c.sourceAuthorized(hash,randomUUID(),trial),false);assert.equal(c.sourceAuthorized(hash,account,randomUUID()),false);assert.equal(c.sourceAuthorized('bad',account,trial),false);
});
test('invalid additional configuration fails closed, including legacy hash mode',()=>{
 for(const value of ['bad',trial+',',Array.from({length:10},()=>randomUUID()).join(',')]){const c=new Config(value);assert.throws(()=>c.settings());assert.equal(c.sourceAuthorized(hash,account,primary),false);}
 const c=new Config(trial);delete c.env.ONBOARDING_AI_SCOPE;c.env.ONBOARDING_AI_ALLOWED_SHA256=hash;assert.throws(()=>c.settings());assert.equal(c.sourceAuthorized(hash,account,trial),false);
 assert.deepEqual(new Config().settings().homeIds,[primary]);
});
test('both homes see the same existing committed amount and exhaustion; no new campaign or attempt is written',async()=>{
 const c=new Config(trial),attempts=[{state:'settled',actualMicroUsd:226290,reservedMicroUsd:250000}];let reads=0;
 const tx={objectOnboardingCampaign:{findUnique:async({where})=>{assert.equal(where.id,c.campaign);return{limitMicroUsd:3000000,maxCalls:50};}},objectOnboardingAttempt:{findMany:async({where})=>{assert.equal(where.campaignId,c.campaign);reads++;return attempts;}}};
 const budget=new OnboardingAiBudget({},c);assert.deepEqual(await budget.snapshot(tx,hash,account,primary),await budget.snapshot(tx,hash,account,trial));assert.equal(reads,2);
 attempts.push({state:'uncertain',actualMicroUsd:null,reservedMicroUsd:2750000});assert.equal((await budget.snapshot(tx,hash,account,trial)).disabledReason,'ai_budget_exhausted');
});
test('worker claim applies both explicit homes with the same account, campaign, model and consent',async()=>{
 const c=new Config(trial),queries=[];const tx={$queryRaw:async()=>[],objectOnboardingJob:{findFirst:async({where})=>{queries.push(where);return null;},count:async()=>0}};
 const jobs=new OnboardingJobService({$transaction:async fn=>fn(tx)},null,null,{budget:{config:c}},null);assert.equal(await jobs.claim(),null);assert.equal(queries.length,2);
 for(const q of queries){assert.equal(q.accountId,account);assert.deepEqual(q.homeId,{in:[primary,trial]});assert.deepEqual(q.attempt,{is:{campaignId:c.campaign,model:c.model}});assert.equal(q.consentToProviderTransfer,true);}
});
