import { Injectable } from '@nestjs/common';
import { Prisma, type EconomicAnalysisJob } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { AnthropicTransport, responseUsage, type ProviderResponse } from '../review/anthropic';
import { PdfTextExtractor, type InputDocument } from '../review/pdf-text';
import { ProviderFailure } from '../review/provider';
import { EconomicAnthropicProvider, type PreparedEconomicAnalysis } from './document-anthropic';
import { EconomicAiBudget } from './ai-budget';
type Authorized=<T>(action:(tx:Prisma.TransactionClient)=>Promise<T>)=>Promise<T>;
@Injectable()
export class EconomicAiAnalysis {
  constructor(private readonly db:PrismaService,private readonly provider:EconomicAnthropicProvider,private readonly parser:PdfTextExtractor,private readonly transport:AnthropicTransport,private readonly budget:EconomicAiBudget){}
  fail(jobId:string){return this.budget.fail(jobId);}
  async recoverable(jobId:string){return !!(await this.db.economicAiAttempt.findUnique({where:{jobId},select:{response:true}}))?.response;}
  async analyze(job:EconomicAnalysisJob,input:InputDocument,signal:AbortSignal,token:string,authorized:Authorized){
    const attempt=await this.db.economicAiAttempt.findUnique({where:{jobId:job.id}});
    if(!attempt)throw new ProviderFailure('analysis_invalid_output');
    if(!job.consentToProviderTransfer)throw new ProviderFailure('ai_provider_disabled');
    if(attempt.response){
      const [document]=await this.parser.extract([input]);
      const prepared={request:{model:attempt.model,max_tokens:4096},document} as PreparedEconomicAnalysis;
      return this.provider.decode(attempt.response as unknown as ProviderResponse,prepared).output;
    }
    if(attempt.state!=='reserved')throw new ProviderFailure('analysis_outcome_unknown');
    const settings=this.budget.config.settings();
    if(settings.campaign!==attempt.campaignId||settings.model!==attempt.model)throw new ProviderFailure('ai_provider_disabled');
    const check=()=>authorized(async tx=>{
      this.budget.requireSource(job.documentSha256);
      await tx.$queryRaw`SELECT id FROM "EconomicAnalysisJob" WHERE id=${job.id} FOR UPDATE`;
      const current=await tx.economicAnalysisJob.findUniqueOrThrow({where:{id:job.id}});
      if(signal.aborted||current.state!=='running'||current.leaseToken!==token)throw new ProviderFailure('analysis_timeout');
    });
    const prepared=await this.provider.prepare(input,attempt.model,signal,check);
    const dispatched=await authorized(async tx=>{
      this.budget.requireSource(job.documentSha256);
      await tx.$queryRaw`SELECT id FROM "EconomicAnalysisJob" WHERE id=${job.id} FOR UPDATE`;
      const current=await tx.economicAnalysisJob.findUniqueOrThrow({where:{id:job.id}});
      if(signal.aborted||current.state!=='running'||current.leaseToken!==token)return false;
      const result=await tx.economicAiAttempt.updateMany({where:{id:attempt.id,state:'reserved'},data:{state:'sending',sentAt:new Date()}});
      return result.count===1;
    });
    if(!dispatched)throw new ProviderFailure('analysis_outcome_unknown');
    try{
      if(signal.aborted)throw new ProviderFailure('analysis_timeout');
      const response=await this.transport.send(prepared.request,signal),usage=responseUsage(response,attempt.model);
      const cost=usage.input*attempt.inputMicroUsdPerToken+usage.output*attempt.outputMicroUsdPerToken;
      if(!Number.isSafeInteger(cost)||cost>2147483647)throw new ProviderFailure('analysis_invalid_output');
      // Persist billing/response before evidence validation and publication; recovery never sends twice.
      const saved=await this.db.economicAiAttempt.updateMany({where:{id:attempt.id,state:{in:['sending','uncertain']}},data:{state:'settled',response:JSON.parse(JSON.stringify(response)) as Prisma.InputJsonValue,responseAt:new Date(),providerRequestId:response.id,inputTokens:usage.input,outputTokens:usage.output,actualMicroUsd:cost}});
      if(!saved.count)throw new ProviderFailure('analysis_outcome_unknown');
      return this.provider.decode(response,prepared).output;
    }catch(error){await this.budget.fail(job.id);throw error;}
  }
}
