import { Injectable, OnModuleInit, OnModuleDestroy, HttpException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { randomUUID } from 'node:crypto';
import { ObjectOnboardingAccess, onboardingDenied } from './access';
import { ObjectOnboardingService } from './onboarding.service';
import { OnboardingJobService } from './jobs.service';
import { IntakeBatchesService } from '../document-intake/batches.service';
import { digest } from '../security';
import { object, uuid, invalid, conflict } from '../review/domain';
import { requestKey } from './bodies';
import { automaticPlan, AutomaticReviewNeeded } from './automatic-plan';
import { onboardingCandidates, onboardingExpenseCandidates } from './candidates';
import type { ProductExtraction } from './domain';

type Entry = { documentId: string; documentVersion: number; documentSha256: string; state: 'pending'|'waiting'|'completed'|'attention'; jobId?: string; draftId?: string; reason?: string; newObjects?: number; newExpenses?: number;newContacts?:number;linkedContacts?:number };
type Run = { automaticContacts?:boolean;batchId: string; entries: Entry[]; finished: boolean; leaseUntil?: number; token?: string };
const operation = 'automatic-intake-v1';
const json = (x: unknown) => JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue;
const terminal = (entry: Entry) => ['completed','attention'].includes(entry.state);

@Injectable()
export class AutomaticIntakeService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout; private busy = false; private stopped = false; private pending?: Promise<void>;
  constructor(private readonly access: ObjectOnboardingAccess, private readonly service: ObjectOnboardingService, private readonly jobs: OnboardingJobService, private readonly batches: IntakeBatchesService) {}
  onModuleInit() { this.timer = setInterval(() => { if(!this.busy)this.pending=this.tick().catch(() => console.warn('Organizzazione automatica rinviata.')); },1500); this.timer.unref(); }
  async onModuleDestroy() { this.stopped = true; if(this.timer)clearInterval(this.timer); await this.pending; }
  async start(a: string,h: string,input: unknown,keyInput?: string) {
    const b = object(input,['batchId','documentIds','consentToProviderTransfer','automaticProcessing','automaticContacts']), batchId = uuid(b.batchId), key = requestKey(keyInput);
    if(!Array.isArray(b.documentIds)||!b.documentIds.length||b.documentIds.length>20)throw invalid('Indica i documenti autorizzati.');
    const documentIds=b.documentIds.map(uuid).sort();if(new Set(documentIds).size!==documentIds.length)throw invalid();
    if(b.automaticContacts!==undefined&&typeof b.automaticContacts!=='boolean')throw invalid();
    if(b.consentToProviderTransfer!==true || b.automaticProcessing!==true)throw invalid('Autorizza l’invio ad Anthropic e l’organizzazione automatica dei documenti di questo caricamento.');
    const batch = (await this.batches.get(a,h,batchId,{})).batch;
    return this.access.run(a,h,true,async tx => {
      const where = {accountId_homeId_operation_target_key:{accountId:a,homeId:h,operation,target:batchId,key}};
      const hash=digest(JSON.stringify({batchId,documentIds,consentToProviderTransfer:true,automaticProcessing:true,...(b.automaticContacts?{automaticContacts:true}:{})}));
      const prior=await tx.objectOnboardingRequest.findUnique({where}); if(prior){if(prior.digest!==hash)throw conflict('idempotency_conflict','Richiesta già usata con dati diversi.');return {run:await this.view(tx,a,h,prior.id,prior.response as unknown as Run)};}
      const lockedBatch=await this.batches.locked(tx,a,h,batchId);
      const storedIds=[...new Set(lockedBatch.items.map(i=>i.documentId).filter(Boolean))].sort();
      if(lockedBatch.items.some(i=>!i.documentId)||JSON.stringify(storedIds)!==JSON.stringify(documentIds))throw conflict('automatic_batch_changed','Il caricamento è cambiato: rileggilo prima di avviare l’organizzazione.');
      const entries: Entry[]=[];
      for(const item of batch.items){
        if(!item.documentLink.document)throw invalid('Attendi che tutti i file siano caricati.');
        if(entries.some(e=>e.documentId===item.documentLink.document!.id))continue;
        const source=await this.access.source(tx,a,h,item.documentLink.document.id);if(!source)throw onboardingDenied();
        entries.push({documentId:source.id,documentVersion:source.original!.version,documentSha256:source.original!.sha256,state:'pending'});
      }
      if(!entries.length)throw invalid('Carica prima i documenti.');
      const active=await tx.objectOnboardingRequest.findMany({where:{accountId:a,homeId:h,operation,response:{path:['finished'],equals:false}},select:{response:true}});
      if(active.some(r=>(r.response as unknown as Run).entries.some(e=>!terminal(e)&&entries.some(n=>n.documentId===e.documentId))))throw conflict('automatic_intake_running','Questi documenti sono già in elaborazione. Riapri l’esito salvato.');
      const row=await tx.objectOnboardingRequest.create({data:{accountId:a,homeId:h,operation,target:batchId,key,digest:hash,response:json({batchId,entries,finished:false,...(b.automaticContacts?{automaticContacts:true}:{}),consentToProviderTransfer:true,automaticProcessing:true,consentedAt:new Date().toISOString()})}});
      return {run:await this.view(tx,a,h,row.id,row.response as unknown as Run)};
    });
  }
  async latest(a:string,h:string,batchId:string,query:unknown){uuid(batchId);object(query,[]);return this.access.run(a,h,false,async tx=>{
    const row=await tx.objectOnboardingRequest.findFirst({where:{accountId:a,homeId:h,operation,target:batchId},orderBy:[{createdAt:'desc'},{id:'desc'}]});
    return {run:row?await this.view(tx,a,h,row.id,row.response as unknown as Run):null};
  });}
  private async view(tx:Prisma.TransactionClient,a:string,h:string,id:string,run:Run){
    const entries=[];for(const stored of run.entries){const e={...stored},source=await this.access.source(tx,a,h,e.documentId,e);
      if(source&&e.state==='attention'){const done=await tx.objectOnboardingDraft.findFirst({where:{accountId:a,homeId:h,documentId:e.documentId,documentVersion:e.documentVersion,documentSha256:e.documentSha256,state:'confirmed'},orderBy:{updatedAt:'desc'}});if(done){e.state='completed';delete e.reason;e.draftId=done.id;const decisions=Object.values(done.decisions as Record<string,{newObjects?:number;newExpenses?:number;newContacts?:number;linkedContacts?:number}>);e.newObjects=decisions.reduce((n,c)=>n+(c.newObjects??0),0);e.newExpenses=decisions.reduce((n,c)=>n+(c.newExpenses??0),0);e.newContacts=decisions.reduce((n,c)=>n+(c.newContacts??0),0);e.linkedContacts=decisions.reduce((n,c)=>n+(c.linkedContacts??0),0);}}
      entries.push(source?{documentId:e.documentId,name:source.name,state:e.state,reason:e.reason??null,draftId:e.draftId??null,newObjects:e.newObjects??0,newExpenses:e.newExpenses??0,newContacts:e.newContacts??0,linkedContacts:e.linkedContacts??0}:{documentId:null,name:null,state:'unavailable',reason:null,draftId:null,newObjects:0,newExpenses:0});}
    return {id,batchId:run.batchId,state:run.entries.every(terminal)?'finished':'running',entries};
  }
  async tick(id?:string){
    if(this.busy||this.stopped)return;this.busy=true;
    try{
      const rows=await this.access.db.objectOnboardingRequest.findMany({where:{operation,...(id?{id}:{response:{path:['finished'],equals:false}})},orderBy:{createdAt:'asc'},take:100});
      const candidate=rows.find(r=>{const run=r.response as unknown as Run;return !run.entries.every(terminal)&&(!run.leaseUntil||run.leaseUntil<Date.now());});if(!candidate)return;
      const {accountId:a,homeId:h}=candidate, token=randomUUID();
      let run:Run|null;
      try {run=await this.access.run(a,h,true,async tx=>{const row=await tx.objectOnboardingRequest.findUniqueOrThrow({where:{id:candidate.id}}),run=row.response as unknown as Run;if(run.entries.every(terminal)||run.leaseUntil&&run.leaseUntil>Date.now())return null;run.token=token;run.leaseUntil=Date.now()+180000;await tx.objectOnboardingRequest.update({where:{id:row.id},data:{response:json(run)}});return run;});}
      catch(error){if(error instanceof HttpException&&[401,403].includes(error.getStatus())){const stopped=structuredClone(candidate.response) as unknown as Run;stopped.finished=true;stopped.entries=stopped.entries.map(e=>terminal(e)?e:{...e,state:'attention',reason:'Accesso modificato: elaborazione interrotta.'});await this.access.db.objectOnboardingRequest.updateMany({where:{id:candidate.id,response:{equals:json(candidate.response)}},data:{response:json(stopped)}});return;}throw error;}
      if(!run)return;
      const entry=run.entries.find(e=>!terminal(e))!;
      try{await this.process(a,h,candidate.id,run.batchId,entry,run.automaticContacts===true);}catch(error){
        const response=error instanceof HttpException?error.getResponse():null,code=response&&typeof response==='object'&&'code'in response?String(response.code):'';
        if(code!=='onboarding_analysis_busy'){entry.state='attention';entry.reason=error instanceof AutomaticReviewNeeded?error.message:code==='contact_review_needed'?'Controlla il contatto proposto nella revisione del documento.':code==='ai_budget_exhausted'||code==='ai_evaluation_limit_reached'?'Il limite AI è stato raggiunto. Puoi completare manualmente.':'Non è stato possibile completare automaticamente questo documento. Apri i dati già disponibili.';}
      }
      await this.access.run(a,h,true,async tx=>{const row=await tx.objectOnboardingRequest.findUniqueOrThrow({where:{id:candidate.id}}),saved=row.response as unknown as Run;if(saved.token!==token)return;delete run.leaseUntil;delete run.token;run.finished=run.entries.every(terminal);await tx.objectOnboardingRequest.update({where:{id:row.id},data:{response:json(run)}});});
    }finally{this.busy=false;}
  }
  private async process(a:string,h:string,runId:string,batchId:string,e:Entry,withContacts=false){
    const source=await this.access.run(a,h,true,async tx=>this.access.source(tx,a,h,e.documentId,e));if(!source)throw onboardingDenied();
    const key=(step:string)=>digest(runId+':'+e.documentId+':'+step);
    const currentBatch=(await this.batches.get(a,h,batchId,{})).batch,currentItem=currentBatch.items.find(i=>i.documentLink.document?.id===e.documentId);
    if(!currentItem)throw onboardingDenied();
    if(['queued','running'].includes(currentItem.analysisState)){e.state='waiting';return;}
    const organize=async(output:ProductExtraction)=>{
      const batch=(await this.batches.get(a,h,batchId,{})).batch,item=batch.items.find(i=>i.documentLink.document?.id===e.documentId);if(!item)throw onboardingDenied();
      if(item.reviewState==='confirmed')return;
      if(item.organization){await this.batches.reuseDuplicate(a,h,batchId,item.id,{expectedVersion:item.version,action:'reuse_reference'},key('keep-organization'));return;}
      if(item.uploadState==='duplicate')throw new AutomaticReviewNeeded('Il file è già presente: controlla il documento originale.');
      const kind=output.documentInfo?.kind??({device_label:'product_label',product_document:'manual',order_confirmation:'purchase_order'} as Record<string,string>)[output.documentKind]??output.documentKind;
      await this.batches.organize(a,h,batchId,{expectedVersion:batch.version,mode:'single',items:[{itemId:item.id,expectedVersion:item.version,expectedOrganizationVersion:item.organizationVersion??0,replaceOrganization:false,selection:{action:'organize',title:output.documentInfo?.title.value??source.name,parts:[{kind,pageFrom:null,pageTo:null}],target:{kind:'home'}}}]},key('organization'));
    };
    if(!e.draftId){
      const prior=await this.access.run(a,h,true,tx=>tx.objectOnboardingDraft.findFirst({where:{accountId:a,homeId:h,documentId:e.documentId,documentVersion:e.documentVersion,documentSha256:e.documentSha256,mode:'extraction'},orderBy:{createdAt:'desc'}}));
      if(prior)e.draftId=prior.id;
      else{
        const job=e.jobId?(await this.jobs.get(a,h,e.jobId,{})).job:(await this.jobs.start(a,h,{documentId:e.documentId,provider:'anthropic',consentToProviderTransfer:true},key('analysis'))).job;
        e.jobId=job.id;e.state='waiting';if(['queued','running'].includes(job.state))return;
        if(job.state!=='succeeded'||!job.draftId)throw new AutomaticReviewNeeded('La lettura AI non è riuscita. Nessun nuovo invio è stato avviato: puoi completare manualmente.');e.draftId=job.draftId;
      }
    }
    const raw=await this.access.run(a,h,true,async tx=>{const d=await this.access.draft(tx,a,h,e.draftId!);if(!await this.access.source(tx,a,h,e.documentId,d))throw onboardingDenied();return d;});
    if(raw.state==='confirmed'){await organize(raw.output as unknown as ProductExtraction);const receipt=await this.access.db.objectOnboardingRequest.findUnique({where:{accountId_homeId_operation_target_key:{accountId:a,homeId:h,operation:'confirm',target:raw.id,key:key('confirmation')}}});const result=(receipt?.response as {result?:{newObjects:number;newExpenses:number;newContacts?:number;linkedContacts?:number}}|undefined)?.result;e.newObjects=result?.newObjects??0;e.newExpenses=result?.newExpenses??0;e.newContacts=result?.newContacts??0;e.linkedContacts=result?.linkedContacts??0;e.state='completed';return;}
    if(raw.state!=='open'||Object.keys(raw.decisions as object).length||raw.review)throw new AutomaticReviewNeeded('Ci sono scelte già iniziate: completa la revisione senza sovrascriverle.');
    const output=raw.output as unknown as ProductExtraction,plan=automaticPlan(output,withContacts);
    const resourceItems=output.items.filter(item=>!plan.choices.some(c=>c.itemId===item.id&&c.action==='document_only'));
    for(const item of resourceItems){const candidates=await onboardingCandidates(this.access,a,h,raw.id,{itemId:item.id,limit:'50'});if(candidates.hasLinkedExpenses||candidates.items.some(c=>c.reason!=='manual_selection'))throw new AutomaticReviewNeeded('Potrebbe esserci già questo oggetto. Scegli la scheda corretta.');}
    for(const item of [...resourceItems,...(output.houseExpenses??[])]){const candidates=await onboardingExpenseCandidates(this.access,a,h,raw.id,{itemId:item.id,limit:'50'});if(candidates.items.some(c=>c.rank>0))throw new AutomaticReviewNeeded('Potrebbe esserci già questa spesa. Controllala prima di registrarla.');}
    await organize(output);
    const projected=(await this.service.getDraft(a,h,raw.id,{})).draft;
    const saved=await this.service.confirm(a,h,raw.id,{expectedVersion:raw.version,source:projected.snapshot,...plan},key('confirmation'),true);
    const result=saved.result as {newObjects:number;newExpenses:number;newContacts?:number;linkedContacts?:number}|undefined;
    e.newObjects=result?.newObjects??0;e.newExpenses=result?.newExpenses??0;e.newContacts=result?.newContacts??0;e.linkedContacts=result?.linkedContacts??0;e.state='completed';
  }
}

