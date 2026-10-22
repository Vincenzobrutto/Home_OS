// A provider is always injected. This module has no transport or credentials.
const {metrics,aggregate}=require('./quality-v3-score.cjs');
class CampaignLimit extends Error { constructor(code){super(code);this.code=code;} }
const committed=entry=>entry.state==='settled'?entry.costMicroUsd:entry.reserveMicroUsd;
// Only small unit tests use this adapter. Campaigns use PrismaCampaignLedger.
function memoryLedger(rows,maxCalls,budgetMicroUsd,reserveMicroUsd){
 return {
  async claim(item){
   const prior=rows.get(item.id);
   if(prior){if(['reserved','sending'].includes(prior.state))prior.state='uncertain';return{dispatch:false,entry:prior};}
   const entries=[...rows.values()];
   if(entries.length>=maxCalls)throw new CampaignLimit('call_limit');
   if(entries.reduce((n,x)=>n+committed(x),0)+reserveMicroUsd>budgetMicroUsd)throw new CampaignLimit('budget_limit');
   const entry={id:item.id,state:'sending',reserveMicroUsd};rows.set(item.id,entry);return{dispatch:true,entry};
  },
  async settle(item,response,score){Object.assign(rows.get(item.id),{state:'settled',costMicroUsd:response.costMicroUsd,...(score?{score}:{})});},
  async uncertain(item,code){const entry=rows.get(item.id);if(entry.state!=='settled')Object.assign(entry,{state:'uncertain',errorCode:code});},
  async entries(){return[...rows.values()];},
 };
}
async function runCampaign(options){
 const {cases,provider,ledger,maxCalls=150,budgetMicroUsd=12_000_000,reserveMicroUsd=80_000}=options;
 if(typeof provider!=='function'||!Array.isArray(cases)||!Number.isSafeInteger(maxCalls)||maxCalls<1||!Number.isSafeInteger(budgetMicroUsd)||budgetMicroUsd<1||!Number.isSafeInteger(reserveMicroUsd)||reserveMicroUsd<1)throw new CampaignLimit('invalid_campaign');
 const store=ledger instanceof Map?memoryLedger(ledger,maxCalls,budgetMicroUsd,reserveMicroUsd):ledger;
 if(!store||['claim','settle','uncertain','entries'].some(method=>typeof store[method]!=='function'))throw new CampaignLimit('invalid_ledger');
 // Durable limits belong to the explicit ledger policy, never to a second set
 // of runner defaults that might misleadingly appear to override stored caps.
 if(!(ledger instanceof Map)&&['maxCalls','budgetMicroUsd','reserveMicroUsd'].some(key=>Object.hasOwn(options,key)))throw new CampaignLimit('configure_limits_on_durable_ledger');
 for(const item of cases){
  const claim=await store.claim(item);
  if(!claim.dispatch)continue;
  try{
   const response=await provider(item);
   if(!response||response.state==='uncertain'){await store.uncertain(item,'provider_outcome_unknown');continue;}
   if(response.state!=='settled'||!Number.isSafeInteger(response.costMicroUsd)||response.costMicroUsd<0||response.costMicroUsd>claim.entry.reserveMicroUsd)throw new CampaignLimit('invalid_settlement');
   const score=response.output&&item.gold?metrics(item.gold,{...response,automatic:response.automatic??'review',costUsd:response.costMicroUsd/1e6},item.pages??[]):null;
   await store.settle(item,response,score);
  }catch(error){await store.uncertain(item,error instanceof CampaignLimit?error.code:'provider_outcome_unknown');}
 }
 const rows=await store.entries(),scores=rows.flatMap(x=>x.score?[x.score]:[]);
 // Reports always read committed storage, including after concurrent invocations.
 return {results:rows.map(x=>({id:x.id,state:x.state,...(x.score?{score:x.score}:{})})),ledger,calls:rows.length,settled:rows.filter(x=>x.state==='settled').length,uncertain:rows.filter(x=>x.state==='uncertain').length,committedMicroUsd:rows.reduce((n,x)=>n+committed(x),0),metrics:scores.length?aggregate(scores):null};
}
module.exports={runCampaign,CampaignLimit};
