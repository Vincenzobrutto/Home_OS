import type {OnModuleDestroy,OnModuleInit} from '@nestjs/common';
import type {DocumentAnalysisLedger,AgencyDocumentAnalysisApplication} from './coordinator';
import type {DocumentAnalysisRuntime} from './config';
/** Bounded SQL rediscovery only. A dispatch marker excludes uncertain external calls from replay. */
export class AgencyDocumentAnalysisRunner implements OnModuleInit,OnModuleDestroy{
 private stopped=true;private polling=false;private timer:ReturnType<typeof setInterval>|null=null;
 private readonly running=new Map<string,Promise<unknown>>();
 constructor(private readonly ledger:Pick<DocumentAnalysisLedger,'pending'>,private readonly application:Pick<AgencyDocumentAnalysisApplication,'run'>,private readonly runtime:DocumentAnalysisRuntime){
  if(!Number.isSafeInteger(runtime.pollIntervalMs)||runtime.pollIntervalMs<250||runtime.pollIntervalMs>60000||!Number.isSafeInteger(runtime.concurrency)||runtime.concurrency<1||runtime.concurrency>2)throw new Error('document_analysis_runner_invalid');
 }
 onModuleInit(){this.stopped=false;if(this.runtime.autoStart&&this.runtime.config&&this.runtime.provider){this.timer=setInterval(()=>this.wake(),this.runtime.pollIntervalMs);this.timer.unref();this.wake();}}
 wake(){if(!this.stopped&&this.runtime.autoStart&&this.runtime.config&&this.runtime.provider)void this.poll().catch(()=>{/* Durable ledger retains recovery; never log source/provider bodies. */});}
 private async poll(){
  if(this.stopped||this.polling||this.running.size>=this.runtime.concurrency)return;this.polling=true;
  try{const ids=await this.ledger.pending(20);for(const id of ids){if(this.stopped||this.running.size>=this.runtime.concurrency)break;if(this.running.has(id))continue;const work=this.application.run(id,()=>!this.stopped).catch(()=>{/* Fencing/SQL marker retains uncertain work. */}).finally(()=>{this.running.delete(id);});this.running.set(id,work);}}
  finally{this.polling=false;}
 }
 async onModuleDestroy(){this.stopped=true;if(this.timer){clearInterval(this.timer);this.timer=null;}await Promise.allSettled([...this.running.values()]);}
}
