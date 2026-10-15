import { Injectable, OnModuleInit, OnModuleDestroy, ForbiddenException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { ExpensesService } from '../expenses/expenses.service';
import { EconomicDocumentsService } from './document.service';
import { EconomicFixtureProvider } from './document-fixture';
import { ProviderFailure } from '../review/provider';
import { EconomicAiAnalysis } from './ai-analysis';
@Injectable()
export class EconomicAnalysisWorker implements OnModuleInit,OnModuleDestroy {
  private timer?:NodeJS.Timeout;
  private running?:Promise<void>;
  constructor(private readonly db:PrismaService,private readonly expenses:ExpensesService,private readonly documents:EconomicDocumentsService,private readonly provider:EconomicFixtureProvider,@Optional() private readonly ai?:EconomicAiAnalysis){}
  onModuleInit(){this.timer=setInterval(()=>{if(!this.running)this.running=this.tick().catch(()=>console.warn('Worker economico rinviato.')).finally(()=>{this.running=undefined;});},500);this.timer.unref();}
  async onModuleDestroy(){if(this.timer)clearInterval(this.timer);await this.running;}
  async tick(){const now=new Date(),job=await this.db.economicAnalysisJob.findFirst({where:{OR:[{state:'queued'},{state:'running',leaseUntil:{lte:now}}]},orderBy:[{createdAt:'asc'},{id:'asc'}]});if(!job)return;const token=randomUUID();const claimed=await this.db.economicAnalysisJob.updateMany({where:{id:job.id,state:job.state,leaseToken:job.leaseToken},data:{state:'running',firstStartedAt:job.firstStartedAt??now,leaseToken:token,leaseUntil:new Date(now.getTime()+150000),version:{increment:1},updatedAt:now}});if(!claimed.count)return;
    let timer:NodeJS.Timeout|undefined;
    try{const recovered=job.provider==='anthropic'&&this.ai&&await this.ai.recoverable(job.id),deadline=recovered?120000:120000-(Date.now()-(job.firstStartedAt??now).getTime());if(deadline<=0)throw new ProviderFailure('analysis_timeout');const input=await this.documents.input(job),controller=new AbortController();
      const authorized=<T>(action:(tx:Prisma.TransactionClient)=>Promise<T>)=>this.expenses.read(job.accountId,job.homeId,async(tx,edit)=>{if(!edit)throw new ForbiddenException();await this.documents.source(tx,job.accountId,job.homeId,job);return action(tx);});
      const analyze=job.provider==='test_fixture_v1'?()=>this.provider.analyze(input.snapshot,input.bytes):job.provider==='anthropic'&&this.ai?()=>this.ai!.analyze(job,{snapshot:input.snapshot,bytes:input.bytes},controller.signal,token,authorized):()=>Promise.reject(new ProviderFailure('ai_provider_disabled'));
      const output=await Promise.race([analyze(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new ProviderFailure('analysis_timeout'));},deadline);timer.unref();})]);
      await this.expenses.read(job.accountId,job.homeId,async(tx,edit)=>{if(!edit)throw new ForbiddenException();await tx.$queryRaw`SELECT id FROM "EconomicAnalysisJob" WHERE id=${job.id} FOR UPDATE`;const row=await tx.economicAnalysisJob.findUniqueOrThrow({where:{id:job.id}});if(row.state!=='running'||row.leaseToken!==token)return;await this.documents.source(tx,job.accountId,job.homeId,job);await tx.economicDraft.create({data:{jobId:job.id,accountId:job.accountId,homeId:job.homeId,documentId:job.documentId,documentVersion:job.documentVersion,documentSha256:job.documentSha256,provider:job.provider,documentKind:output.documentKind,proposedFields:output.proposedFields as unknown as Prisma.InputJsonValue,amountCandidates:output.amountCandidates as unknown as Prisma.InputJsonValue,amountSelectionRequired:output.amountSelectionRequired}});await tx.economicAnalysisJob.update({where:{id:job.id},data:{state:'succeeded',version:{increment:1},leaseToken:null,leaseUntil:null,updatedAt:new Date()}});});
    }catch(e){const code=e instanceof ForbiddenException?'access_revoked':e instanceof ProviderFailure?e.code:e instanceof ServiceUnavailableException?(e.getResponse() as {code:string}).code:'analysis_unavailable';const failed=await this.db.economicAnalysisJob.updateMany({where:{id:job.id,state:'running',leaseToken:token},data:{state:'failed',errorCode:code,version:{increment:1},leaseToken:null,leaseUntil:null,updatedAt:new Date()}});if(failed.count&&job.provider==='anthropic'&&this.ai)await this.ai.fail(job.id);}finally{if(timer)clearTimeout(timer);}
  }
}
