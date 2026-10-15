import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { EconomicAiAttempt, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { MODEL_PRICES, RESERVE_MICRO_USD, usd } from '../review/ai-config';
import { ECONOMIC_PROMPT_VERSION } from './document-anthropic';

export const economicAiUnavailable=(code:string)=>new ServiceUnavailableException({code,message:'Analisi economica Anthropic non disponibile. Nessun nuovo invio avviato.'});
const limitError=(code:string)=>new HttpException({code,message:code==='ai_budget_exhausted'?'Budget del collaudo economico esaurito.':'Numero di analisi del collaudo economico raggiunto.'},429);
export const economicCommitted=(a:Pick<EconomicAiAttempt,'state'|'actualMicroUsd'|'reservedMicroUsd'>)=>a.state==='released'?0:a.actualMicroUsd??a.reservedMicroUsd;
export function economicBilling(a?:Pick<EconomicAiAttempt,'state'|'actualMicroUsd'|'reservedMicroUsd'>|null){return a?{currency:'USD',maxReservedUsd:usd(a.reservedMicroUsd),actualUsd:a.actualMicroUsd===null?null:usd(a.actualMicroUsd),state:a.state==='uncertain'?'uncertain':a.actualMicroUsd!==null||a.state==='released'?'settled':'reserved'}:null;}

@Injectable()
export class EconomicAiConfig {
  get environment():NodeJS.ProcessEnv{return process.env;}
  get model(){return this.environment.ECONOMY_AI_MODEL?.trim()??'';}
  get campaign(){return this.environment.ECONOMY_AI_CAMPAIGN_ID?.trim()??'';}
  settings(){
    if(this.environment.ECONOMY_AI_ENABLED!=='true')throw economicAiUnavailable('ai_provider_disabled');
    if(!this.environment.ANTHROPIC_API_KEY?.trim())throw economicAiUnavailable('ai_provider_unconfigured');
    if(!MODEL_PRICES[this.model])throw economicAiUnavailable('ai_model_unavailable');
    const amount=this.environment.ECONOMY_AI_BUDGET_USD??'',calls=this.environment.ECONOMY_AI_MAX_CALLS??'';
    if(!/^economic-[A-Za-z0-9_-]{1,80}$/.test(this.campaign)||!/^\d+(?:\.\d{1,6})?$/.test(amount)||!/^\d+$/.test(calls))throw economicAiUnavailable('ai_provider_unconfigured');
    const [whole,fraction='']=amount.split('.'),micro=BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));
    if(micro<=0n||micro>10000000n||Number(calls)<1||Number(calls)>50)throw economicAiUnavailable('ai_provider_unconfigured');
    const price=MODEL_PRICES[this.model];
    if(price.input*(50000-4096)+price.output*4096>RESERVE_MICRO_USD)throw economicAiUnavailable('ai_model_unavailable');
    return {model:this.model,campaign:this.campaign,limitMicroUsd:Number(micro),maxCalls:Number(calls),price:MODEL_PRICES[this.model]};
  }
}
@Injectable()
export class EconomicAiBudget {
  constructor(private readonly db:PrismaService,readonly config:EconomicAiConfig){}
  async reserve(tx:Prisma.TransactionClient,jobId:string){
    const s=this.config.settings();
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'economic-ai-budget:'+s.campaign},0))::text AS locked`;
    const campaign=await tx.economicAiCampaign.upsert({where:{id:s.campaign},create:{id:s.campaign,limitMicroUsd:s.limitMicroUsd,maxCalls:s.maxCalls},update:{}});
    const attempts=await tx.economicAiAttempt.findMany({where:{campaignId:s.campaign}});
    const used=attempts.reduce((sum,a)=>sum+economicCommitted(a),0);
    if(used+RESERVE_MICRO_USD>Math.min(campaign.limitMicroUsd,s.limitMicroUsd))throw limitError('ai_budget_exhausted');
    if(attempts.filter(a=>a.state!=='released').length>=Math.min(campaign.maxCalls,s.maxCalls))throw limitError('ai_evaluation_limit_reached');
    return tx.economicAiAttempt.create({data:{jobId,campaignId:s.campaign,model:s.model,promptVersion:ECONOMIC_PROMPT_VERSION,inputMicroUsdPerToken:s.price.input,outputMicroUsdPerToken:s.price.output,reservedMicroUsd:RESERVE_MICRO_USD}});
  }
  async descriptor(tx:Prisma.TransactionClient){
    let disabledReason:string|null=null;
    try{
      const s=this.config.settings(),campaign=await tx.economicAiCampaign.findUnique({where:{id:s.campaign}}),attempts=await tx.economicAiAttempt.findMany({where:{campaignId:s.campaign}});
      if(attempts.reduce((sum,a)=>sum+economicCommitted(a),0)+RESERVE_MICRO_USD>Math.min(campaign?.limitMicroUsd??s.limitMicroUsd,s.limitMicroUsd))disabledReason='ai_budget_exhausted';
      else if(attempts.filter(a=>a.state!=='released').length>=Math.min(campaign?.maxCalls??s.maxCalls,s.maxCalls))disabledReason='ai_evaluation_limit_reached';
    }catch(error){if(!(error instanceof ServiceUnavailableException))throw error;disabledReason=(error.getResponse() as {code:string}).code;}
    return {id:'anthropic',label:'Anthropic',enabled:disabledReason===null,disabledReason,isSimulation:false,model:this.config.model||null};
  }
  async fail(jobId:string){
    await this.db.economicAiAttempt.updateMany({where:{jobId,state:'reserved'},data:{state:'released',actualMicroUsd:0}});
    await this.db.economicAiAttempt.updateMany({where:{jobId,state:'sending'},data:{state:'uncertain'}});
  }
}
