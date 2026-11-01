import {giftDigitalPlan,digitalPlanSummary,assertCurrentDigitalPlan} from '../home-maps/snapshot';
import type {StoredPlan} from '../agency-plans/records';
import {Prisma} from '../../generated/client';
import type {PrismaService} from '../prisma.service';
import {AgencyPracticesStore} from './store';
import {exportManifest,PracticeError,requirePractice,sourceReadable,type Actor,type Practice} from './domain';
import {giftDocumentMetadataView,registerGiftDocumentDescriptor,type GiftMetadataState,type GiftDocumentRecord} from './gift-registry';
import {parseGiftDocumentDescriptor,type GiftDocumentDescriptor} from './gift-packet';
import {safeFilename} from '../documents/storage';

export type GiftDocumentRelease={
  digitalPlan?:{planId:string;expectedPlanVersion:number;reviewed:true};
  key:string;expectedRevision:number;expectedSourceVersion:number;expectedSha256:string;
  title:string;origin:'received'|'agency_generated';finalDocumentConfirmed:true;releaseApproved:true;
};
const AUTHORS={
  received:'Autore non verificato; documento ricevuto',
  agency_generated:'Produzione dell’agenzia dichiarata dall’agente'
} as const;
function fail(code:PracticeError['code']='invalid_input'):never{throw new PracticeError(code);}
function object(value:unknown,keys:string[]):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail();
  const own=Reflect.ownKeys(value);
  if(own.length!==keys.length||own.some(k=>typeof k!=='string'||!keys.includes(k)))fail();
  for(const key of keys){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor||!('value'in descriptor)||!descriptor.enumerable)fail();
  }
  return value as Record<string,unknown>;
}
function text(value:unknown,max:number):string{
  // Match the registry's supplied UTF-16 bounds while rejecting invisible/control input.
  if(typeof value!=='string'||value.length>max||!value.trim()||/[\p{Cc}\p{Cf}]/u.test(value))fail();
  return value.trim();
}
function positive(value:unknown):number{
  if(!Number.isSafeInteger(value)||Number(value)<1)fail();return Number(value);
}
function sha(value:unknown):string{
  if(typeof value!=='string'||!/^[a-f0-9]{64}$/u.test(value))fail();return value;
}
function identity(value:unknown):void{
  if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value))fail();
}
function sourceIdentity(value:unknown):string{
  const id=text(value,100);if(id!==value)fail();return id;
}
function scope(accountId:unknown,agencyId:unknown,practiceId:unknown):void{
  identity(accountId);identity(agencyId);identity(practiceId);
}
/** Agent declarations only: provenance, signatures, surface qualifications and scope remain server-owned. */
export function parseGiftDocumentRelease(input:unknown):GiftDocumentRelease{
  const body=object(input,['key','expectedRevision','expectedSourceVersion','expectedSha256','title','origin','finalDocumentConfirmed','releaseApproved',...(input&&typeof input==='object'&&Object.hasOwn(input,'digitalPlan')?['digitalPlan']:[])]);
  if(body.finalDocumentConfirmed!==true||body.releaseApproved!==true||body.origin!=='received'&&body.origin!=='agency_generated')fail();
  return {
    ...(body.digitalPlan!==undefined?{digitalPlan:planSelection(body.digitalPlan)}:{}),
    key:text(body.key,120),expectedRevision:positive(body.expectedRevision),
    expectedSourceVersion:positive(body.expectedSourceVersion),expectedSha256:sha(body.expectedSha256),
    title:text(body.title,300),origin:body.origin,finalDocumentConfirmed:true,releaseApproved:true
  };
}

function planSelection(v:unknown):NonNullable<GiftDocumentRelease['digitalPlan']>{
 const p=object(v,['planId','expectedPlanVersion','reviewed']);if(p.reviewed!==true)fail();
 return {planId:text(p.planId,120),expectedPlanVersion:positive(p.expectedPlanVersion),reviewed:true};
}

const json=(value:Practice):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value));
function proof(sourceId:string,command:GiftDocumentRelease){
  return {sourceId,version:command.expectedSourceVersion,sha256:command.expectedSha256};
}
function fresh(actor:Actor,practice:Practice,sourceId:string,command:GiftDocumentRelease){
  const now=new Date().toISOString();
  requirePractice(actor,practice,'edit',now);requirePractice(actor,practice,'export',now);
  exportManifest(actor,practice,[proof(sourceId,command)],now);
}
function listing(actor:Actor,practice:GiftMetadataState){
  const now=new Date().toISOString();requirePractice(actor,practice,'export',now);
  const metadata=giftDocumentMetadataView(actor,practice,now);
  const documents=metadata.documents.map(item=>{
    const source=practice.sources.find(s=>s.id===item.sourceId);
    if(!source||!sourceReadable(actor,practice,source,now,'export'))fail('access_denied');
    const current=source.versions.at(-1);if(!current)fail();
    const plans=((practice as Practice&{planAnalyses?:StoredPlan[]}).planAnalyses??[]).filter(p=>p.proof.sourceId===item.sourceId&&p.proof.version===current.version&&p.proof.sha256===current.sha256).map(p=>({id:p.id,version:p.version,geometryRevision:p.geometryRevision,roomCount:p.rooms.length,pending:p.surfaceProposal?.state==='pending'}));
    const base={sourceId:item.sourceId,sourceVersion:item.sourceVersion,sha256:item.sha256,
      filename:safeFilename(current.originalFilename),state:item.state,
      ...(plans.length?{digitalPlans:plans}:{})};
    // No historical title/descriptor/version or audit receipts escape through stale/missing rows.
    if(item.state==='current'&&item.descriptor.digitalPlan){try{assertCurrentDigitalPlan(practice,item.descriptor.digitalPlan);}catch{return {...base,state:'stale' as const};}}
    const {digitalPlan,...descriptor}=item.state==='current'?item.descriptor:{digitalPlan:undefined};
    return item.state==='current'?{...base,state:'current' as const,metadataVersion:item.metadataVersion,
      descriptor:{...structuredClone(descriptor),...(digitalPlan?{digitalPlan:digitalPlanSummary(digitalPlan)}:{})}}:base;
  });
  const clock=new Date().toISOString();requirePractice(actor,practice,'export',clock);
  for(const item of documents){
    const source=practice.sources.find(s=>s.id===item.sourceId);
    if(!source||!sourceReadable(actor,practice,source,clock,'export'))fail('access_denied');
  }
  return {practiceId:practice.id,revision:practice.revision,documents,certification:false as const};
}
function latestRecord(practice:GiftMetadataState,sourceId:string):GiftDocumentRecord|undefined{
  // The metadata view validates the complete record history for this visible source first.
  const entries=(practice.giftDocuments??[]).filter(record=>record.descriptor.sourceId===sourceId);
  return entries.reduce<GiftDocumentRecord|undefined>((last,entry)=>
    !last||entry.descriptor.metadataVersion>last.descriptor.metadataVersion?entry:last,undefined);
}
function replayRecord(practice:GiftMetadataState,accountId:string,key:string):GiftDocumentRecord|undefined{
  if(!Array.isArray(practice.giftMetadataReceipts??[]))fail();
  const matches=(practice.giftMetadataReceipts??[]).filter(receipt=>receipt?.accountId===accountId&&receipt.key===key);
  if(matches.length>1)fail();
  const receipt=matches[0];if(!receipt)return undefined;
  if(!Array.isArray(practice.giftDocuments??[]))fail();
  const records=(practice.giftDocuments??[]).filter(record=>record?.id===receipt.recordId);
  if(records.length!==1||!Number.isSafeInteger(receipt.metadataVersion)||receipt.metadataVersion<1)fail();
  const record=records[0],descriptor=parseGiftDocumentDescriptor(record.descriptor);
  if(descriptor.metadataVersion!==receipt.metadataVersion)fail();
  // registerGiftDocumentDescriptor validates the receipt digest and original record fingerprint.
  return {...record,descriptor};
}

/** An explicit agent review makes a current uploaded file eligible for later Gift selection. */
export class GiftDocumentReleaseStore{
  private readonly practices:AgencyPracticesStore;
  constructor(private readonly db:Pick<PrismaService,'$transaction'>){this.practices=new AgencyPracticesStore(db);}
  async list(accountId:string,agencyId:string,practiceId:string){
    scope(accountId,agencyId,practiceId);
    return this.db.$transaction(async tx=>{
      const {actor,practice}=await this.practices.giftInvitationContext(tx,accountId,agencyId,practiceId);
      return listing(actor,practice);
    },{maxWait:5000,timeout:15000});
  }
  async release(accountId:string,agencyId:string,practiceId:string,sourceId:string,input:unknown){
    scope(accountId,agencyId,practiceId);sourceId=sourceIdentity(sourceId);
    const command=parseGiftDocumentRelease(input);
    return this.db.$transaction(async tx=>{
      const {actor,practice}=await this.practices.giftInvitationContext(tx,accountId,agencyId,practiceId);
      fresh(actor,practice,sourceId,command);
      const state=practice as GiftMetadataState;
      // Validate history through the existing registry before deriving a metadata version.
      giftDocumentMetadataView(actor,state,new Date().toISOString());
      const prior=replayRecord(state,accountId,command.key),previous=latestRecord(state,sourceId);
      const basis=prior?.descriptor??previous?.descriptor;
      const metadataVersion=prior?prior.descriptor.metadataVersion:(previous?.descriptor.metadataVersion??0)+1;
      const expectedMetadataVersion=prior
        ?(metadataVersion===1?null:metadataVersion-1)
        :(previous?.descriptor.metadataVersion??null);
      const currentBasis=basis&&basis.sourceId===sourceId&&basis.sourceVersion===command.expectedSourceVersion&&basis.sha256===command.expectedSha256
        ?basis:undefined;
      const surface=currentBasis?.surface;
      if(prior&&(prior.descriptor.digitalPlan?.planId!==command.digitalPlan?.planId||prior.descriptor.digitalPlan?.planVersion!==command.digitalPlan?.expectedPlanVersion))fail('idempotency_conflict');
      const digitalPlan=command.digitalPlan?(prior?.descriptor.digitalPlan??giftDigitalPlan(practice,sourceId,command.digitalPlan,accountId,new Date().toISOString())):undefined;
      const descriptor:GiftDocumentDescriptor={
        agencyId,practiceId,sourceId,sourceVersion:command.expectedSourceVersion,sha256:command.expectedSha256,
        metadataVersion,origin:command.origin,lifecycle:currentBasis?.lifecycle==='signed'?'signed':'final',
        author:currentBasis?.author??AUTHORS[command.origin],title:command.title,
        ...(surface?{surface:structuredClone(surface)}:{}),...(digitalPlan?{digitalPlan}:{})
      };
      const result=registerGiftDocumentDescriptor(actor,state,descriptor,{
        key:command.key,expectedRevision:command.expectedRevision,expectedMetadataVersion
      },new Date().toISOString());
      if(!result.replay){
        const updated=await tx.agencyPractice.updateMany({
          where:{id:practiceId,agencyId,revision:practice.revision},
          data:{revision:result.practice.revision,snapshot:json(result.practice)}
        });
        if(updated.count!==1)fail('revision_conflict');
      }
      fresh(actor,result.practice,sourceId,command);
      return {receipt:result.receipt,replay:result.replay,metadata:listing(actor,result.practice)};
    },{maxWait:5000,timeout:15000});
  }
}
