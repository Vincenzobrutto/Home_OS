global.fetch=async()=>{throw Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createAuthorization,validateAuthorization,makePlan}=require('./quality-v3-authorization.cjs');
const {PrismaCampaignLedger}=require('./quality-v3-ledger.cjs');
const {compile}=require('./quality-v3-live.cjs');
const options={campaignId:'fase0-quality-v3-test-authorization',model:'claude-sonnet-5-5',maxCalls:150,budgetMicroUsd:12000000};
test('authorized synthetic plan is exactly 52 originals, two baseline runs, bounded comparisons and at most 148 Messages',()=>{
 const plan=makePlan();assert.equal(plan.maxMessageCalls,148);assert.equal(plan.tasks.filter(t=>t.mode==='full').length,104);assert.equal(new Set(plan.tasks.map(t=>t.id)).size,52);
 const a=createAuthorization(options.campaignId,options.model);assert.equal(typeof validateAuthorization(a,options),'string');
 for(const change of [{maxCalls:151},{budgetMicroUsd:12000001},{campaignId:'fase0-quality-v3-another'},{model:'claude-sonnet-4-6'}])assert.throws(()=>validateAuthorization(a,{...options,...change}));
 for(const change of [{allowedHashes:[]},{manifestSha256:'0'.repeat(64)},{frozenFiles:{}},{planSha256:'changed'}])assert.throws(()=>validateAuthorization({...a,...change},options));
});
test('live execution cannot fall back to offline database or run without the explicit authorization receipt',async()=>{
 await assert.rejects(()=>PrismaCampaignLedger.open({...options,execution:'live',databaseUrl:'postgresql://synthetic@127.0.0.1:55433/dimora_v5_quality_v3_test'}));
 await assert.rejects(()=>PrismaCampaignLedger.open({...options,execution:'live',databaseUrl:'postgresql://synthetic@127.0.0.1:55433/dimora_v5_quality_v3_campaign'}),e=>e.code==='synthetic_authorization_mismatch');
});
test('empty/partial campaign has explicit missing denominators, unknown automatic correctness, and can never pass',()=>{
 const a=createAuthorization(options.campaignId,options.model),report=compile([],a,0,'not_completed');assert.equal(report.gatePassed,false);assert.equal(report.validBaselineExecutions,0);assert.equal(report.criteria.find(c=>c.name==='documentKind').total,104);assert.equal(report.criteria.find(c=>c.name==='documentKind').rate,0);assert.equal(report.criteria.find(c=>c.name==='automaticCorrectness').rate,null);assert.equal(report.criteria.find(c=>c.name==='decisionStability').rate,0);
});

test('future authorization also freezes invoice segmentation and domain validation',()=>{const a=createAuthorization(options.campaignId,options.model);for(const file of ['src/object-onboarding/domain.ts','src/object-onboarding/understanding.ts','src/object-onboarding/invoice-segments.ts'])assert.match(a.frozenFiles[file],/^[a-f0-9]{64}$/);});
