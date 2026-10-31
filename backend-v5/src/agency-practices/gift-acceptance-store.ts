import {createHash,randomUUID} from 'node:crypto';
import {Prisma,type AgencyGiftAcceptanceJob,type AgencyGiftAcceptanceItem} from '../../generated/client';
import type {PrismaService} from '../prisma.service';
import {GiftInvitationsStore} from './gift-invitations-store';
import {requirePractice} from './domain';
import {GiftInvitationError,giftInvitationLanding,giftInvitationSourceFingerprint,type GiftInvitation} from './gift-invitations';
import {acceptanceCommandDigest,parseGiftAcceptanceCommand,type GiftAcceptanceCommand} from './gift-acceptance-command';

type Item=AgencyGiftAcceptanceItem;
type Manifest={packet:GiftInvitation['packet'];annualBenefit:GiftInvitation['annualBenefit']};
const reservedStates=['queued','staging','ready','retryable','blocked_review','accepted'];
function fail(code:GiftInvitationError['code']='unavailable'):never{throw new GiftInvitationError(code);}
function canonical(v:unknown):unknown{
 if(Array.isArray(v))return v.map(canonical);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>[k,canonical(x)]));
 return v;
}
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const json=(v:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(v));
function validId(id:unknown):id is string{return typeof id==='string'&&/^[a-f0-9-]{36}$/iu.test(id);}
function immutableItem(i:Pick<Item,'id'|'ordinal'|'sourceId'|'sourceVersion'|'sourceSha256'|'documentId'|'documentVersionId'|'storedFileId'>){
 return {id:i.id,ordinal:i.ordinal,sourceId:i.sourceId,sourceVersion:i.sourceVersion,sourceSha256:i.sourceSha256,documentId:i.documentId,documentVersionId:i.documentVersionId,storedFileId:i.storedFileId};
}
/** Consistency checksum across JSONB key order; not a signature or a permission. */
function preparationDigest(row:Pick<AgencyGiftAcceptanceJob,'id'|'practiceId'|'invitationId'|'accountId'|'requestKey'|'commandDigest'|'invitationVersion'|'invitationSeal'|'sourceFingerprint'|'homeId'>&{homeInput:unknown;manifest:unknown},items:Parameters<typeof immutableItem>[0][]){
 return digest({schemaVersion:1,id:row.id,practiceId:row.practiceId,invitationId:row.invitationId,accountId:row.accountId,requestKey:row.requestKey,commandDigest:row.commandDigest,invitationVersion:row.invitationVersion,invitationSeal:row.invitationSeal,sourceFingerprint:row.sourceFingerprint,homeId:row.homeId,homeInput:row.homeInput,manifest:row.manifest,items:items.map(immutableItem)});
}
/** Internal pending record only. Accepted receipts will be separate, with descriptive staging fields erased. */
export function readGiftAcceptancePreparation(row:AgencyGiftAcceptanceJob,items:Item[]):{command:GiftAcceptanceCommand;manifest:Manifest}{
 if(!reservedStates.includes(row.state)||row.state==='accepted'||row.version<1||!Number.isSafeInteger(row.version))fail();
 const command=parseGiftAcceptanceCommand({key:row.requestKey,expectedInvitationVersion:row.invitationVersion,home:row.homeInput});
 if(acceptanceCommandDigest(command)!==row.commandDigest||!row.manifest||typeof row.manifest!=='object'||Array.isArray(row.manifest))fail('invalid_input');
 const manifest=row.manifest as unknown as Manifest,p=manifest.packet;
 if(Object.keys(manifest).sort().join(',')!=='annualBenefit,packet'||!p||p.practiceId!==row.practiceId||p.requestedHomeId!==row.homeId||giftInvitationSourceFingerprint(p)!==row.sourceFingerprint||!Array.isArray(p.documents)||p.documents.length<1||p.documents.length!==items.length)fail('invalid_input');
 const ids=new Set<string>();
 for(const [ordinal,item] of items.entries()){
  const d=p.documents[ordinal];
  if(item.jobId!==row.id||item.ordinal!==ordinal||item.sourceId!==d.sourceId||item.sourceVersion!==d.version||item.sourceSha256!==d.sha256)fail('invalid_input');
  for(const id of [item.id,item.documentId,item.documentVersionId,item.storedFileId]){if(!validId(id)||ids.has(id))fail('invalid_input');ids.add(id);}
 }
 if(preparationDigest(row,items)!==row.preparationDigest)fail('invalid_input');
 return {command,manifest};
}
const summary=(row:AgencyGiftAcceptanceJob,replay:boolean)=>({jobId:row.id,state:row.state,version:row.version,replay,createsHome:false as const,activatesBenefit:false as const});

/** Durable internal reservation. No controller, scanner, Home writes or benefit activation yet. */
export class GiftAcceptanceStore{
 private readonly invitations:GiftInvitationsStore;
 constructor(private readonly db:Pick<PrismaService,'$transaction'>){this.invitations=new GiftInvitationsStore(db);}
 async begin(accountId:string,invitationId:string,secret:unknown,input:unknown){
  if(!validId(accountId)||!validId(invitationId))fail();
  const command=parseGiftAcceptanceCommand(input),commandDigest=acceptanceCommandDigest(command);
  return this.db.$transaction(async tx=>{
   // Future accepted replay must precede this live context; this increment cannot publish acceptance.
   const {actor,practice,record}=await this.invitations.acceptanceContext(tx,accountId,invitationId,secret,command.expectedInvitationVersion);
   const stillLive=()=>{const now=new Date().toISOString();requirePractice(actor,practice,'export',now);giftInvitationLanding(record,secret,now);};
   // Practice was locked before invitation and Account: re-read reservations after that lock.
   const prior=await tx.agencyGiftAcceptanceJob.findFirst({where:{practiceId:record.practiceId,state:{in:reservedStates}}});
   if(prior){
    if(prior.accountId!==accountId||prior.invitationId!==invitationId)fail();
    if(prior.requestKey!==command.key||prior.commandDigest!==commandDigest)fail('idempotency_conflict');
    await tx.$queryRaw`SELECT id FROM "AgencyGiftAcceptanceJob" WHERE id=${prior.id} FOR UPDATE`;
    const row=await tx.agencyGiftAcceptanceJob.findUnique({where:{id:prior.id}});if(!row||row.accountId!==accountId||row.invitationId!==invitationId||row.practiceId!==record.practiceId)fail();
    const items=await tx.agencyGiftAcceptanceItem.findMany({where:{jobId:row.id},orderBy:{ordinal:'asc'}});
    const stored=readGiftAcceptancePreparation(row,items);
    if(row.invitationVersion!==record.version||row.invitationSeal!==record.seal||row.sourceFingerprint!==record.sourceFingerprint||digest(stored.manifest)!==digest({packet:record.packet,annualBenefit:record.annualBenefit}))fail();
    stillLive();return summary(row,true);
   }
   // A terminal previous attempt still owns its original command key. Never silently reuse it.
   if(await tx.agencyGiftAcceptanceJob.findUnique({where:{accountId_invitationId_requestKey:{accountId,invitationId,requestKey:command.key}}}))fail('idempotency_conflict');
   const id=randomUUID(),items=record.packet.documents.map((d,ordinal)=>({id:randomUUID(),jobId:id,ordinal,sourceId:d.sourceId,sourceVersion:d.version,sourceSha256:d.sha256,documentId:randomUUID(),documentVersionId:randomUUID(),storedFileId:randomUUID()}));
   const frozen={id,practiceId:record.practiceId,invitationId,accountId,requestKey:command.key,commandDigest,invitationVersion:record.version,invitationSeal:record.seal,sourceFingerprint:record.sourceFingerprint,homeId:record.packet.requestedHomeId,homeInput:json(command.home),manifest:json({packet:record.packet,annualBenefit:record.annualBenefit})};
   const row=await tx.agencyGiftAcceptanceJob.create({data:{...frozen,preparationDigest:preparationDigest(frozen,items),items:{create:items.map(i=>immutableItem(i))}}});
   stillLive();return summary(row,false);
  },{maxWait:5000,timeout:15000});
 }
 async get(accountId:string,jobId:string){
  if(!validId(accountId)||!validId(jobId))fail();
  return this.db.$transaction(async tx=>{
   // Account ownership precedes payload validation; never disclose a foreign job's contents/errors.
   const row=await tx.agencyGiftAcceptanceJob.findFirst({where:{id:jobId,accountId}});if(!row)fail();
   const items=await tx.agencyGiftAcceptanceItem.findMany({where:{jobId},orderBy:{ordinal:'asc'}});
   readGiftAcceptancePreparation(row,items);
   return {...summary(row,true),progress:{total:items.length,admitted:items.filter(i=>i.state==='admitted').length}};
  },{maxWait:5000,timeout:15000});
 }
}