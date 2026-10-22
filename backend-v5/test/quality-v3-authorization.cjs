const {createHash}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {load,ROOT}=require('./corpus-v3/corpus.cjs');
const sha=value=>createHash('sha256').update(value).digest('hex');
const jsonHash=value=>sha(JSON.stringify(value));
function makePlan(){
 const {cases}=load(),tasks=[];
 for(const c of cases)for(const run of [1,2])tasks.push({id:c.id,run,mode:'full'});
 for(const id of ['Q43','Q44','Q45','Q46'])for(const run of [1,2])tasks.push({id,run,mode:'local_pages'});
 for(const id of ['Q47','Q48','Q43','Q44'])for(const run of [1,2])tasks.push({id,run,mode:'progressive'});
 const maxMessageCalls=tasks.reduce((n,t)=>n+(t.mode==='progressive'?cases.find(c=>c.id===t.id).pages:1),0);
 return{version:'quality-v3-live-plan-v1',maxMessageCalls,tasks};
}
function frozenFiles(){
 const base=path.resolve(__dirname,'..');
 const names=['src/object-onboarding/domain.ts','src/object-onboarding/payment-review.ts','src/object-onboarding/onboarding.service.ts','src/object-onboarding/understanding.ts','src/object-onboarding/invoice-segments.ts','src/object-onboarding/anthropic-provider.ts','src/object-onboarding/reading.ts','src/object-onboarding/automatic-plan.ts','src/review/anthropic.ts','src/review/ai-config.ts','test/quality-v3-model.cjs','test/quality-v3-runner.cjs','test/quality-v3-ledger.cjs','test/quality-v3-score.cjs','test/quality-v3-measures.cjs','test/quality-v3-authorization.cjs','test/quality-v3-live.cjs'];
 const hashes=Object.fromEntries(names.map(name=>[name,sha(fs.readFileSync(path.join(base,name)))]));
 for(const c of load().cases)hashes['gold/'+c.id]=sha(fs.readFileSync(path.join(ROOT,c.gold.path??`gold/${c.id}.json`)));
 return hashes;
}
function createAuthorization(campaignId,model){
 const {cases}=load(),plan=makePlan();
 return{version:'quality-v3-authorization-v1',campaignId,model,protocol:{prompt:require('../dist/object-onboarding/anthropic-provider').OBJECT_ONBOARDING_PROMPT_VERSION,reading:require('../dist/object-onboarding/reading').ONBOARDING_READING_VERSION,adapter:require('./quality-v3-model.cjs').MODEL_ADAPTER_VERSION,measures:require('./quality-v3-measures.cjs').VERSION},approvedAt:'2026-10-23',approvedBy:'explicit-user-message',authorization:'52 synthetic originals only; maximum USD 12 and 150 Messages; no uncertain retry; no real originals',budgetMicroUsd:12000000,maxCalls:150,manifestSha256:sha(fs.readFileSync(path.join(ROOT,'manifest.json'))),allowedHashes:cases.map(c=>c.sha256).sort(),plan,planSha256:jsonHash(plan),frozenFiles:frozenFiles()};
}
function validateAuthorization(auth,options){
 const fail=()=>{throw Object.assign(new Error('synthetic_authorization_mismatch'),{code:'synthetic_authorization_mismatch'});};
 if(!auth||!auth.protocol||!auth.plan||auth.version!=='quality-v3-authorization-v1'||auth.approvedBy!=='explicit-user-message'||auth.campaignId!==options.campaignId||auth.model!==options.model||auth.budgetMicroUsd!==12000000||auth.maxCalls!==150||options.budgetMicroUsd>auth.budgetMicroUsd||options.maxCalls>auth.maxCalls)fail();
 const current=createAuthorization(options.campaignId,options.model);
 if(jsonHash(auth.protocol)!==jsonHash(current.protocol)||jsonHash(auth.plan)!==auth.planSha256||auth.manifestSha256!==current.manifestSha256||jsonHash(auth.allowedHashes)!==jsonHash(current.allowedHashes)||auth.planSha256!==jsonHash(current.plan)||jsonHash(auth.frozenFiles)!==jsonHash(current.frozenFiles)||auth.plan.maxMessageCalls>150)fail();
 return jsonHash(auth);
}
module.exports={makePlan,createAuthorization,validateAuthorization,jsonHash};
