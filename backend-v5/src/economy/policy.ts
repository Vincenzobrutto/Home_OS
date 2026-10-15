import { ForbiddenException } from '@nestjs/common';
import { Prisma, type HomeExpense, type EconomicWork } from '../../generated/client';
import { ReviewService } from '../review/review.service';
import { conflict } from '../review/domain';
import { competence, family, type Category, type ObjectRef } from './domain';

type Tx = Prisma.TransactionClient;
export type HistoricExpense = HomeExpense & {economicObjectRef?:ObjectRef|null};
const deny = () => new ForbiddenException('Accesso non consentito.');
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

/** S1 policy runs inside the same canonical expense transaction as H3a. */
export class EconomyPolicy {
  constructor(private readonly access: ReviewService) {}
  async subject(tx:Tx,a:string,h:string,ref:ObjectRef,strict=false) {
    try {
      if(ref.kind==='object') {
        const row=await tx.homeObject.findFirst({where:{id:ref.id,accountId:a,homeId:h}});
        if(!row)throw deny();
        if(strict&&row.state!=='active')throw conflict('resource_state_conflict','Ripristina prima l’oggetto.');
        return {ref,name:row.name,state:row.state};
      }
      await tx.$queryRaw`SELECT id FROM "BoilerAsset" WHERE id=${ref.id} FOR SHARE`;
      const row=await this.access.asset(tx,a,h,ref.id);await this.access.assetSources(tx,a,h,ref.id);
      return {ref,name:row.name,state:'active'};
    }catch(e){if(!(e instanceof ForbiddenException)||strict)throw e;return null;}
  }
  async work(tx:Tx,a:string,h:string,id:string,strict=false) {
    const row=await tx.economicWork.findFirst({where:{id,accountId:a,homeId:h}});
    if(!row&&strict)throw deny();
    if(strict&&row?.state!=='active')throw conflict('work_state_conflict','Ripristina prima il lavoro.');
    return row;
  }
  async activity(tx:Tx,a:string,h:string,id:string|null,strict=false) {
    if(!id)return {state:'none' as const,value:null};
    const row=await tx.homeActivity.findFirst({where:{id,accountId:a,homeId:h}});
    if(!row){if(strict)throw deny();return {state:'unavailable' as const,value:null};}
    if(row.assetId) {
      try {await this.access.asset(tx,a,h,row.assetId);await this.access.assetSources(tx,a,h,row.assetId);}
      catch(e){if(!(e instanceof ForbiddenException)||strict)throw e;return {state:'unavailable' as const,value:null};}
    }
    return {state:'linked' as const,value:{id:row.id,title:row.title}};
  }
  async workView(tx:Tx,row:EconomicWork,edit:boolean) {
    return {id:row.id,homeId:row.homeId,name:row.name,note:row.note,state:row.state,version:row.version,
      activityLink:await this.activity(tx,row.accountId,row.homeId,row.activityId),createdAt:new Date(row.createdAt).toISOString(),updatedAt:new Date(row.updatedAt).toISOString(),archivedAt:row.archivedAt?new Date(row.archivedAt).toISOString():null,permissions:edit?['read','edit']:['read']};
  }
  async currentRef(tx:Tx,row:HomeExpense):Promise<ObjectRef|null> {
    if(row.assetId)return {kind:'boiler',id:row.assetId};
    const link=await tx.objectResourceLink.findFirst({where:{expenseId:row.id,accountId:row.accountId,homeId:row.homeId,state:'active'}});
    return link?.objectId?{kind:'object',id:link.objectId}:link?.boilerId?{kind:'boiler',id:link.boilerId}:null;
  }
  async saved(tx:Tx,row:HomeExpense) {return {...row,economicObjectRef:await this.currentRef(tx,row)};}
  async snapshot(tx:Tx,a:string,h:string,row:HistoricExpense,history=false) {
    const category=(row.category??null) as Category|null;
    const ref=Object.hasOwn(row,'economicObjectRef')?row.economicObjectRef:history?(row.assetId?{kind:'boiler' as const,id:row.assetId}:null):await this.currentRef(tx,row);
    const subject=ref?await this.subject(tx,a,h,ref):null;
    const work=row.workId?await this.work(tx,a,h,row.workId):null;
    let analysisLink:{state:string;value:null|{draftId:string;documentId:string;documentVersion:number}}={state:'none',value:null};
    if(row.analysisDraftId){analysisLink={state:'unavailable',value:null};const draft=await tx.economicDraft.findFirst({where:{id:row.analysisDraftId,accountId:a,homeId:h}});if(draft){try{await this.access.sources(tx,a,h,[{documentId:draft.documentId,documentVersion:draft.documentVersion as 1,documentSha256:draft.documentSha256}]);analysisLink={state:'linked',value:{draftId:draft.id,documentId:draft.documentId,documentVersion:draft.documentVersion}};}catch(e){if(!(e instanceof ForbiddenException))throw e;}}}
    return {category,family:family(category,row.workId??null),supplier:row.supplier??null,documentNumber:row.documentNumber??null,
      documentDate:row.documentDate??null,competenceFrom:row.competenceFrom??null,competenceTo:row.competenceTo??null,dueOn:row.dueOn??null,
      amountOrigin:row.amountOrigin??'user_declared',objectLink:{state:ref?(subject?'linked':'unavailable'):'none',value:subject},
      workLink:{state:row.workId?(work?'linked':'unavailable'):'none',value:work?{id:work.id,name:work.name,state:work.state}:null},analysisLink};
  }
  async prepare(tx:Tx,a:string,h:string,body:Record<string,unknown>,old:HomeExpense|null) {
    competence({...old,...body});
    if(body.workId&&body.workId!==old?.workId)await this.work(tx,a,h,String(body.workId),true);
    if(Object.hasOwn(body,'objectRef')) {
      const next=body.objectRef as ObjectRef|null,current=old?await this.currentRef(tx,old):null;
      if(next)await this.subject(tx,a,h,next,true);
      if(current&&next&&(current.kind!==next.kind||current.id!==next.id))throw conflict('resource_already_linked','Rimuovi prima il collegamento all’oggetto attuale.');
    }
    const data=Object.fromEntries(Object.entries(body).filter(([k])=>!['expectedVersion','objectRef'].includes(k)));
    if(Object.hasOwn(body,'objectRef'))data.assetId=(body.objectRef as ObjectRef|null)?.kind==='boiler'?(body.objectRef as ObjectRef).id:null;
    if(body.amountCents!==undefined && (!old||old.amountCents!==body.amountCents))data.amountOrigin='user_declared';
    return data;
  }
  async objectChange(tx:Tx,a:string,h:string,row:HomeExpense,body:Record<string,unknown>) {
    if(!Object.hasOwn(body,'objectRef'))return false;
    const next=body.objectRef as ObjectRef|null;
    const links=await tx.objectResourceLink.findMany({where:{expenseId:row.id,accountId:a,homeId:h,state:'active'}});
    let changed=false;
    for(const link of links) {
      if(next && ((next.kind==='object'&&link.objectId===next.id)||(next.kind==='boiler'&&link.boilerId===next.id)))continue;
      const updated=await tx.objectResourceLink.update({where:{id:link.id},data:{state:'removed',version:{increment:1}}});
      const kind=link.objectId?'object':'boiler',id=(link.objectId??link.boilerId)!;
      await tx.objectEvent.create({data:{accountId:a,homeId:h,targetKind:kind,targetId:id,kind:'unlinked',before:json({kind:'link',row:link,subjectKind:kind,subjectId:id}),after:json({kind:'link',row:updated,subjectKind:kind,subjectId:id})}});changed=true;
    }
    // A boiler uses its native assetId. A manual object uses the existing G1 reference table.
    if(next?.kind==='object'&&!links.some(l=>l.objectId===next.id)) {
      const link=await tx.objectResourceLink.create({data:{accountId:a,homeId:h,objectId:next.id,resourceType:'expense',resourceId:row.id,expenseId:row.id}});
      await tx.objectEvent.create({data:{accountId:a,homeId:h,targetKind:'object',targetId:next.id,kind:'linked',before:Prisma.JsonNull,after:json({kind:'link',row:link,subjectKind:'object',subjectId:next.id})}});changed=true;
    }
    return changed;
  }
}
