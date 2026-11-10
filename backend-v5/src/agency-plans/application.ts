import { createHash } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import type { AgencyPracticesStore } from '../agency-practices/store';
import type { AgencyFileVault } from '../agency-practices/files';
import { planJobCapability, runAgencyPlanJob } from './worker';
import { createPlanProvider } from './provider';
import { createPlanHttpTransport } from './transport';
import type { PlanPorts } from './pipeline';
export type Runtime={enabled:boolean;workerSecret:Buffer;credential:()=>string;fetchImpl:typeof fetch;provider?: (pricing:{model:string;inputMicrosPerMillion:number;outputMicrosPerMillion:number},instructions:string)=>PlanPorts['ai']};
export const PLAN_RUNTIME=Symbol('AgencyPlanRuntime');
export function stableUuid(parts:string[]){const h=createHash('sha256').update(JSON.stringify(parts)).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);}
export function runtimeFromEnvironment(env:NodeJS.ProcessEnv):Runtime{const enabled=env.DIMORA_AGENCY_PLAN_AI_ENABLED==='1';if(!enabled)return {enabled:false,workerSecret:Buffer.alloc(0),credential:()=>'',fetchImpl:fetch};const secret=env.DIMORA_AGENCY_PLAN_WORKER_SECRET,key=env.DIMORA_AGENCY_PLAN_API_KEY;if(!secret||!/^[a-f0-9]{64}$/u.test(secret)||!key||key.length<16)throw new Error('agency_plan_runtime_unconfigured');return {enabled:true,workerSecret:Buffer.from(secret,'hex'),credential:()=>key,fetchImpl:fetch};}
export class AgencyPlanApplication{
 private readonly running=new Set<string>();
 private readonly pending=new Map<string,{accountId:string;agencyId:string;practiceId:string;id:string}>();
 constructor(private readonly store:AgencyPracticesStore,private readonly vault:AgencyFileVault,private readonly runtime:Runtime){}
 async options(account:string,agency:string,practice:string){const o=await this.store.analysisOptions(account,agency,practice,250000);return {...o,enabled:this.runtime.enabled,available:this.runtime.enabled&&o.budgetAvailable&&o.canEdit,model:'claude-sonnet-5-5',priceVersion:'sonnet-5-5-standard-20261030'};}
 async request(accountId:string,agencyId:string,practiceId:string,input:{key:string;sourceId:string;version:number;page:number;expectedRevision:number;instructions:string}){
  if(!this.runtime.enabled)throw new ServiceUnavailableException('Analisi AI non configurata.');
  const scope={accountId,agencyId,practiceId},id=createHash('sha256').update(JSON.stringify([accountId,practiceId,input.key,'plan-analysis'])).digest('hex'),token=planJobCapability(this.runtime.workerSecret,scope,id);
  const result=await this.store.requestAnalysis(accountId,agencyId,practiceId,{...input,id},{token,capMicros:250000,model:'claude-sonnet-5-5',priceVersion:'sonnet-5-5-standard-20261030',inputMicrosPerMillion:2000000,outputMicrosPerMillion:10000000,authorizationId:stableUuid([accountId,practiceId,id,'authorization'])});
  if(result.status==='queued'){this.pending.set(id,{...scope,id});this.drain();}return result;
 }
 private drain(){while(this.running.size<2&&this.pending.size){const [id,work]=this.pending.entries().next().value!;this.pending.delete(id);if(this.running.has(id))continue;this.running.add(id);void this.run(work).catch(()=>{/* Durable state/ledger remains visible; never log source, key or provider response. */}).finally(()=>{this.running.delete(id);this.drain();});}}
 private async run(work:{accountId:string;agencyId:string;practiceId:string;id:string}){
  const {id,...scope}=work,token=planJobCapability(this.runtime.workerSecret,scope,id);
  await runAgencyPlanJob(this.store,this.vault,{scope,runId:id,dpi:180,config:{version:'agency-raster-v1-180dpi',threshold:180,closingRadius:3,minRegionPixels:1500,maxRegionFraction:.6,simplifyPixels:1,fillTextHolesUpToPixels:0}},{workerSecret:this.runtime.workerSecret,provider:(pricing,instructions)=>{
   if(this.runtime.provider)return this.runtime.provider(pricing,instructions);
   const transport=createPlanHttpTransport({enabled:()=>this.runtime.enabled,credential:this.runtime.credential,fetchImpl:this.runtime.fetchImpl,authorize:async()=>{await this.store.planWorkerContext(scope.accountId,scope.agencyId,scope.practiceId,id,token);}});
   return createPlanProvider(transport,{model:pricing.model,inputUSDPerMillion:pricing.inputMicrosPerMillion/1000000,outputUSDPerMillion:pricing.outputMicrosPerMillion/1000000,maxOutputTokens:8192,userRules:instructions});
  }});
 }
}
