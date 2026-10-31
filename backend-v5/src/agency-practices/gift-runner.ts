import type {OnModuleInit,OnModuleDestroy} from '@nestjs/common';
import type {PrismaService} from '../prisma.service';
import type {AgencyFileVault} from './files';
import type {LocalFileStorage} from '../documents/storage';
import {GiftAcceptanceWorker} from './gift-acceptance-worker';
import {GiftInvitationError} from './gift-invitations';
import {PracticeError} from './domain';

export type GiftRuntime={autoStart:boolean;pollIntervalMs:number;concurrency:number};
export const GIFT_RUNTIME=Symbol('GiftRuntime');
export const giftDeliveryConfigured=(env:NodeJS.ProcessEnv)=>env.DIMORA_AGENCY_GIFT_ENABLED==='1'&&!!env.DIMORA_AGENCY_STORAGE_ROOT;

/** Durable jobs are rediscovered from SQL, never a browser queue or an in-memory-only pending map. */
export class GiftJobsRunner implements OnModuleInit,OnModuleDestroy{
 private stopped=true;private timer:ReturnType<typeof setInterval>|null=null;private polling=false;
 private readonly running=new Map<string,Promise<unknown>>();
 constructor(private readonly db:Pick<PrismaService,'$transaction'>,private readonly worker:GiftAcceptanceWorker,private readonly vault:Pick<AgencyFileVault,'assertGiftDestination'>,private readonly storage:Pick<LocalFileStorage,'root'>,private readonly runtime:GiftRuntime){
  if(!Number.isSafeInteger(runtime.pollIntervalMs)||runtime.pollIntervalMs<250||runtime.pollIntervalMs>60000||!Number.isSafeInteger(runtime.concurrency)||runtime.concurrency<1||runtime.concurrency>2)throw new Error('gift_runtime_invalid');
 }
 async onModuleInit(){
  await this.vault.assertGiftDestination(this.storage.root);this.stopped=false;
  if(this.runtime.autoStart){this.timer=setInterval(()=>this.wake(),this.runtime.pollIntervalMs);this.timer.unref();this.wake();}
 }
 wake(){if(!this.stopped&&this.runtime.autoStart)void this.poll().catch(()=>{/* SQL/worker retains recovery state. Never log tokens or source diagnostics. */});}
 private async quarantine(jobId:string,error:unknown){
  if(!(error instanceof GiftInvitationError)&&!(error instanceof PracticeError))return;
  try{await this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "AgencyGiftAcceptanceJob" WHERE id=${jobId} FOR UPDATE`;
   const job=await tx.agencyGiftAcceptanceJob.findUnique({where:{id:jobId}});if(!job)return;
   if(!['queued','ready','staging'].includes(job.state)||job.leaseUntil&&job.leaseUntil>new Date()||await tx.agencyGiftAcceptanceReceipt.findUnique({where:{jobId}}))return;
   await tx.agencyGiftAcceptanceJob.update({where:{id:jobId},data:{state:'blocked_review',version:{increment:1},leaseTokenHash:null,leaseUntil:null,lastError:'gift_review_required'}});
  },{maxWait:5000,timeout:15000});}catch{/* Preserve uncertain SQL outcomes for a later bounded poll; no cleanup is attempted. */}
 }
 private async poll(){
  if(this.stopped||this.polling||this.running.size>=this.runtime.concurrency)return;this.polling=true;
  try{
   const now=new Date(),backoff=new Date(now.getTime()-30000);
   const jobs=await this.db.$transaction(tx=>tx.agencyGiftAcceptanceJob.findMany({where:{OR:[{state:{in:['queued','ready']}},{state:'retryable',updatedAt:{lte:backoff}},{state:'staging',OR:[{leaseUntil:null},{leaseUntil:{lte:now}}]}]},orderBy:[{createdAt:'asc'},{id:'asc'}],take:20,select:{id:true}}),{maxWait:5000,timeout:15000});
   for(const job of jobs){
    if(this.stopped||this.running.size>=this.runtime.concurrency)break;if(this.running.has(job.id))continue;
    const work=this.worker.runNext(job.id,()=>!this.stopped).catch(error=>this.quarantine(job.id,error)).finally(()=>{this.running.delete(job.id);});
    this.running.set(job.id,work);
   }
  }finally{this.polling=false;}
 }
 async onModuleDestroy(){
  this.stopped=true;if(this.timer){clearInterval(this.timer);this.timer=null;}
  // Worker yields after its current bounded file admission, preserving durable staging for restart.
  await Promise.allSettled([...this.running.values()]);
 }
}