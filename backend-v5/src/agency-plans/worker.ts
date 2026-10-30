import { createHmac } from 'node:crypto';
import type { AgencyPracticesStore } from '../agency-practices/store';
import type { AgencyFileVault } from '../agency-practices/files';
import { analyzePlan, type PlanPorts } from './pipeline';
import { loadAuthorizedPlanRaster } from './renderer';
import type { RasterConfig } from './raster';
import type { PlanJob, Phase } from './jobs';

type Scope={accountId:string;agencyId:string;practiceId:string};
/** Recomputed after restart with a provisioned server secret. No token in browser or queue payload. */
export function planJobCapability(secret:Buffer,scope:Scope,runId:string){
 if(!Buffer.isBuffer(secret)||secret.length<32||secret.length>128||[scope.accountId,scope.agencyId,scope.practiceId,runId].some(s=>typeof s!=='string'||!s.trim()||s.length>120))throw new Error('worker_configuration_invalid');
 return createHmac('sha256',secret).update(JSON.stringify(['agency-plan-worker-v1',scope.accountId,scope.agencyId,scope.practiceId,runId])).digest('hex');
}
type Pricing=Pick<PlanJob,'model'|'priceVersion'|'inputMicrosPerMillion'|'outputMicrosPerMillion'>;
/** Internal coordinator, inert until called. Tests inject a provider without network.
 * The factory must use these persisted prices/model; never accept it from HTTP. */
export async function runAgencyPlanJob(store:AgencyPracticesStore,vault:AgencyFileVault,input:{scope:Scope;runId:string;dpi:number;config:RasterConfig},ports:{workerSecret:Buffer;provider:(pricing:Pricing,instructions:string)=>PlanPorts['ai']}){
 const {scope,runId}=input,token=planJobCapability(ports.workerSecret,scope,runId);
 const context=()=>store.planWorkerContext(scope.accountId,scope.agencyId,scope.practiceId,runId,token);
 const initial=await context();
 if(initial.job.status==='completed')return {replay:true,plans:await store.readPlans(scope.accountId,scope.agencyId,scope.practiceId)};
 if(initial.job.status!=='queued')throw new Error('plan_job_not_dispatchable');
 const claimed=await store.planJobCommand(scope.accountId,scope.agencyId,scope.practiceId,runId,token,{operation:'claim'});
 if(!claimed.acquired)throw new Error('plan_job_not_dispatchable');
 const maxMicros=Math.min(1_000_000,Math.floor(initial.job.capMicros/2));
 if(maxMicros<1)throw new Error('plan_budget_insufficient');
 const ai=ports.provider({model:initial.job.model,priceVersion:initial.job.priceVersion,inputMicrosPerMillion:initial.job.inputMicrosPerMillion,outputMicrosPerMillion:initial.job.outputMicrosPerMillion},initial.job.instructions||"");
 let lastPhase:Phase|null=null;
 try{
  const analysis=await analyzePlan({
   context,
   loadRaster:async proof=>{const r=await loadAuthorizedPlanRaster(store,vault,scope,proof,input.dpi);return {...r.raster,rendering:{dpi:r.dpi,transform:r.transform,renderer:r.renderer}};},
   reserve:async(id,phase,fingerprint,maxUSD)=>{if(id!==runId||Math.round(maxUSD*1000000)!==maxMicros)throw new Error('plan_scope_changed');await store.planJobCommand(scope.accountId,scope.agencyId,scope.practiceId,runId,token,{operation:'reserve',phase,fingerprint,maxMicros});lastPhase=phase;},
   settle:async(id,phase,usage)=>{if(id!==runId)throw new Error('plan_scope_changed');const receipt=await store.accountPlanPhase(scope.agencyId,scope.practiceId,runId,token,phase,{input:usage.input,output:usage.output,requestId:usage.requestId});if(receipt.costMicros===null||Math.abs(usage.costUSD-receipt.costMicros/1000000)>0.000001)throw new Error('provider_price_mismatch');},
   markUncertain:async(id,phase)=>{if(id!==runId)throw new Error('plan_scope_changed');await store.accountPlanPhase(scope.agencyId,scope.practiceId,runId,token,phase,null);},ai,
  },{runId,proof:initial.job.proof,config:input.config,maxUSDPerCall:maxMicros/1000000});
  return await store.completePlanJob(scope.accountId,scope.agencyId,scope.practiceId,runId,token,analysis);
 }catch(error){
  // Reservations survive any failure. Known billed output may still be unusable.
  if(lastPhase!==null)await store.accountPlanPhase(scope.agencyId,scope.practiceId,runId,token,lastPhase,null);
  else try{await store.failPlanBeforeDispatch(scope.agencyId,scope.practiceId,runId,token);}catch{/* A committed/uncertain reservation must never be released here. */}
  throw error;
 }
}

