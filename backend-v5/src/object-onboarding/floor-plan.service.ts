import { Injectable, ForbiddenException } from '@nestjs/common';
import { Prisma, type ObjectOnboardingDraft } from '../../generated/client';
import { ObjectOnboardingAccess } from './access';
import { OnboardingAiBudget } from './ai-budget';
import { OnboardingJobService } from './jobs.service';
import { object, uuid, version, conflict, invalid } from '../review/domain';
import { digest } from '../security';
import { planPoints, planView, roomNameKey, type FloorPlan } from './floor-plan-domain';
type Tx=Prisma.TransactionClient;
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const deny=()=>new ForbiddenException('Accesso non consentito.');
@Injectable()
export class FloorPlanService {
 constructor(private readonly access:ObjectOnboardingAccess,private readonly budget:OnboardingAiBudget,private readonly jobs:OnboardingJobService){}
 private async source(tx:Tx,a:string,h:string,d:string){const source=await this.access.source(tx,a,h,d);if(!source)throw deny();return source;}
 private async draft(tx:Tx,a:string,h:string,d:string,v:number,sha:string){return tx.objectOnboardingDraft.findFirst({where:{accountId:a,homeId:h,documentId:d,documentVersion:v,documentSha256:sha,mode:'floor_plan'},orderBy:[{createdAt:'desc'},{id:'desc'}]});}
 private view(row:ObjectOnboardingDraft|null){if(!row)return null;const output=row.output as unknown as {floorPlan:FloorPlan};return {id:row.id,version:row.version,plan:(row.review as unknown as FloorPlan|null)??output.floorPlan,bindings:row.decisions as Record<string,string>};}
 get(a:string,h:string,d:string,q:unknown){object(q,[]);return this.access.run(a,h,false,async(tx,edit)=>{
  const source=await this.source(tx,a,h,d),v=source.original!;
  const row=await this.draft(tx,a,h,d,v.version,v.sha256);
  const job=await tx.objectOnboardingJob.findFirst({where:{accountId:a,homeId:h,documentId:d,documentVersion:v.version,documentSha256:v.sha256,purpose:'floor_plan'},orderBy:{createdAt:'desc'},select:{id:true,state:true,errorCode:true}});
  const rooms=await tx.homeRoom.findMany({where:{homeId:h},orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,name:true,type:true,state:true}});
  return {document:{id:d,name:source.name,version:v.version,sha256:v.sha256,mimeType:v.mimeType},draft:this.view(row),job,rooms,canEdit:edit,budget:edit?await this.budget.snapshot(tx,v.sha256,a,h):null};
 });}
 async analyze(a:string,h:string,d:string,b:unknown,k?:string){const r=object(b,['consentToProviderTransfer']);if(r.consentToProviderTransfer!==true)throw invalid('Autorizza l’invio della planimetria ad Anthropic.');
  // Do not replace saved edits or charge again when there is already a plan.
  if(k){const prior=await this.jobs.recover(a,h,k,{});if(prior.job)return this.jobs.start(a,h,{documentId:uuid(d),provider:'anthropic',purpose:'floor_plan',consentToProviderTransfer:true},k);}
  const existing=await this.get(a,h,d,{});if(existing.draft)throw conflict('floor_plan_already_proposed','Esiste già una proposta: continua a modificarla.');
  return this.jobs.start(a,h,{documentId:uuid(d),provider:'anthropic',purpose:'floor_plan',consentToProviderTransfer:true},k);
 }
 mutate(a:string,h:string,d:string,input:unknown,key:string|undefined,confirm:boolean){
  if(!key||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw invalid('Chiave della richiesta non valida.');
  const b=object(input,['expectedVersion','documentVersion','documentSha256','plan']);const expected=Number(b.expectedVersion);if(!Number.isSafeInteger(expected)||expected<0)throw invalid();
  const snapshot={documentVersion:version(b.documentVersion),documentSha256:String(b.documentSha256)};
  const raw=object(b.plan,['points','view','warnings']);const points=planPoints(raw.points),view=planView(raw.view);
  if(points.some(p=>p.page!==view.page||p.x<view.x||p.x>view.x+view.width||p.y<view.y||p.y>view.y+view.height))throw invalid('I punti devono rimanere all’interno della planimetria.');
  const plan:FloorPlan={points,view,warnings:[]};
  return this.access.run(a,h,true,async tx=>{
   if(await tx.objectOnboardingJob.findFirst({where:{accountId:a,homeId:h,documentId:d,purpose:'floor_plan',state:{in:['queued','running']}}}))throw conflict('analysis_running','Attendi la fine dell’analisi prima di salvare.');
   const source=await this.source(tx,a,h,d);if(source.original!.version!==snapshot.documentVersion||source.original!.sha256!==snapshot.documentSha256)throw conflict('source_changed','L’originale è cambiato. Riapri la planimetria.');
   const operation=confirm?'floor-plan:confirm':'floor-plan:save',hash=digest(JSON.stringify({b,confirm}));
   const prior=await tx.objectRequest.findUnique({where:{accountId_homeId_operation_target_key:{accountId:a,homeId:h,operation,target:d,key}}});
   if(prior){if(prior.digest!==hash)throw conflict('idempotency_conflict','Chiave già usata con dati diversi.');return prior.response;}
   let row=await this.draft(tx,a,h,d,snapshot.documentVersion,snapshot.documentSha256);
   if((row?.version??0)!==expected)throw conflict('floor_plan_version_conflict','La proposta è cambiata. Ricarica prima di continuare.');
   const bindings={...(row?.decisions as Record<string,string>|undefined)};
   const previous=row?this.view(row)!.plan.points:[];
   // Saved numbers cannot disappear or be reused; confirmed markers are immutable.
   for(const p of previous){const next=points.find(n=>n.number===p.number);if(!next||(bindings[String(p.number)]&&Object.keys(next).some(k=>next[k as keyof typeof next]!==p[k as keyof typeof p])))throw invalid('I numeri dei punti salvati sono stabili.');}
   const oldMax=Math.max(0,...previous.map(p=>p.number));if(points.some(p=>!previous.some(n=>n.number===p.number)&&p.number<=oldMax))throw invalid('Un nuovo punto deve avere un nuovo numero.');
   let created=0,linked=0;
   if(confirm){
    const selected=points.filter(p=>p.included&&!bindings[String(p.number)]);if(!selected.length)throw invalid('Seleziona almeno un ambiente ancora da confermare.');
    const rooms=await tx.homeRoom.findMany({where:{homeId:h}}),names=new Set<string>(),targets=new Set<string>(Object.values(bindings));
    for(const p of selected){
     if(p.roomId){const room=rooms.find(r=>r.id===p.roomId&&r.state==='active');if(!room)throw conflict('room_unavailable','L’ambiente scelto non è più disponibile.');if(targets.has(room.id))throw invalid('Due punti non possono indicare lo stesso ambiente.');targets.add(room.id);p.name=room.name;p.type=room.type;}
     else {const name=roomNameKey(p.name);if(rooms.some(r=>roomNameKey(r.name)===name)||names.has(name))throw conflict('room_match_required','Esiste già un ambiente con questo nome. Collegalo oppure scegli un nome distinto.');names.add(name);}
    }
    for(const p of selected){let roomId=p.roomId;
     if(!roomId){const room=await tx.homeRoom.create({data:{homeId:h,name:p.name,type:p.type,note:null}});roomId=room.id;created++;
      await tx.objectEvent.create({data:{accountId:a,homeId:h,targetKind:'room',targetId:roomId,kind:'created',before:Prisma.JsonNull,after:json({kind:'room',row:room})}});
     }else linked++;
     bindings[String(p.number)]=roomId;
    }
   }
   // Preserve provider warnings. They are never user instructions.
   plan.warnings=row?this.view(row)!.plan.warnings:[];
   if(row)row=await tx.objectOnboardingDraft.update({where:{id:row.id},data:{review:json(plan),decisions:json(bindings),version:{increment:1},updatedAt:new Date()}});
   else row=await tx.objectOnboardingDraft.create({data:{accountId:a,homeId:h,documentId:d,...snapshot,mode:'floor_plan',output:json({floorPlan:plan}),review:json(plan),decisions:json(bindings)}});
   const result={draft:this.view(row),created,linked};
   await tx.objectRequest.create({data:{accountId:a,homeId:h,operation,target:d,key,digest:hash,response:json(result)}});return result;
  });
 }
}
