// Offline-only campaign orchestration core. A provider must be injected; this
// module has no Anthropic transport or database and cannot send documents.
const {metrics,aggregate}=require('./quality-v3-score.cjs');
class CampaignLimit extends Error { constructor(code){super(code);this.code=code;} }
async function runCampaign({cases,provider,ledger=new Map(),maxCalls=150,budgetMicroUsd=12_000_000,reserveMicroUsd=80_000}){
 if(typeof provider!=='function'||!Array.isArray(cases)||!Number.isSafeInteger(maxCalls)||maxCalls<1||!Number.isSafeInteger(budgetMicroUsd)||budgetMicroUsd<1||!Number.isSafeInteger(reserveMicroUsd)||reserveMicroUsd<1)throw new CampaignLimit('invalid_campaign');
 const result=[];
 for(const item of cases){
  const prior=ledger.get(item.id);
  if(prior){if(prior.state==='reserved'||prior.state==='sending')prior.state='uncertain';result.push({id:item.id,state:prior.state,...(prior.score?{score:prior.score}:{})});continue;}
  const entries=[...ledger.values()],calls=entries.length,committed=entries.reduce((n,x)=>n+(x.state==='settled'?x.costMicroUsd:x.reserveMicroUsd),0);
  if(calls>=maxCalls||committed+reserveMicroUsd>budgetMicroUsd)throw new CampaignLimit(calls>=maxCalls?'call_limit':'budget_limit');
  const entry={state:'reserved',reserveMicroUsd};ledger.set(item.id,entry);entry.state='sending';
  try{
   const response=await provider(item);
   if(!response||response.state==='uncertain'){entry.state='uncertain';result.push({id:item.id,state:entry.state});continue;}
   if(response.state!=='settled'||!Number.isSafeInteger(response.costMicroUsd)||response.costMicroUsd<0||response.costMicroUsd>reserveMicroUsd)throw new CampaignLimit('invalid_settlement');
   entry.state='settled';entry.costMicroUsd=response.costMicroUsd;
   if(response.output&&item.gold){entry.score=metrics(item.gold,{...response,automatic:response.automatic??'review'},item.pages??[]);}
   result.push({id:item.id,state:entry.state,...(entry.score?{score:entry.score}:{})});
  }catch(error){entry.state='uncertain';entry.errorCode=error instanceof CampaignLimit?error.code:'provider_outcome_unknown';result.push({id:item.id,state:entry.state});}
 }
 const rows=[...ledger.values()],scores=rows.flatMap(x=>x.score?[x.score]:[]);
 return {results:result,ledger,calls:rows.length,settled:rows.filter(x=>x.state==='settled').length,uncertain:rows.filter(x=>x.state==='uncertain').length,committedMicroUsd:rows.reduce((n,x)=>n+(x.state==='settled'?x.costMicroUsd:x.reserveMicroUsd),0),metrics:scores.length?aggregate(scores):null};
}
module.exports={runCampaign,CampaignLimit};
