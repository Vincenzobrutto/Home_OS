import {randomUUID} from 'node:crypto';
import {Prisma,type AgencyGiftAcceptanceJob} from '../../generated/client';
import type {PrismaService} from '../prisma.service';
import {GiftInvitationsStore} from './gift-invitations-store';
import {readGiftAcceptancePreparation,reservedGiftAcceptanceStates,giftAcceptanceDigest,giftAcceptancePreparationDigest,immutableGiftAcceptanceItem} from './gift-acceptance-preparation';
import {requirePractice} from './domain';
import {readAcceptedGift,acceptedGiftSummary} from './gift-acceptance-read';
import {GiftInvitationError,giftInvitationLanding} from './gift-invitations';
import {acceptanceCommandDigest,parseGiftAcceptanceCommand} from './gift-acceptance-command';

const reservedStates=reservedGiftAcceptanceStates;
function fail(code:GiftInvitationError['code']='unavailable'):never{throw new GiftInvitationError(code);}
const json=(v:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(v));
function validId(id:unknown):id is string{return typeof id==='string'&&/^[a-f0-9-]{36}$/iu.test(id);}
const summary=(row:AgencyGiftAcceptanceJob,replay:boolean)=>({jobId:row.id,state:row.state,version:row.version,replay,createsHome:false as const,activatesBenefit:false as const});

/** Internal reservation/status port. Publication belongs to the verified worker, never to begin/claim. */
export class GiftAcceptanceStore{
 private readonly invitations:GiftInvitationsStore;
 constructor(private readonly db:Pick<PrismaService,'$transaction'>){this.invitations=new GiftInvitationsStore(db);}
 async begin(accountId:string,invitationId:string,secret:unknown,input:unknown){
  if(!validId(accountId)||!validId(invitationId))fail();
  const command=parseGiftAcceptanceCommand(input),commandDigest=acceptanceCommandDigest(command);
  try{return await this.db.$transaction(async tx=>{
   const accepted=await tx.agencyGiftAcceptanceReceipt.findFirst({where:{invitationId,accountId}});
   if(accepted){const r=await readAcceptedGift(tx,accepted,accountId);if(r.requestKey!==command.key||r.commandDigest!==commandDigest)fail('idempotency_conflict');return acceptedGiftSummary(r,true);}
   // Pending acceptance still requires current invitation, identity and Agency sources.
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
    if(row.state==='accepted'){const receipt=await tx.agencyGiftAcceptanceReceipt.findUnique({where:{jobId:row.id}});if(!receipt)fail();const r=await readAcceptedGift(tx,receipt,accountId);if(r.requestKey!==command.key||r.commandDigest!==commandDigest)fail('idempotency_conflict');return acceptedGiftSummary(r,true);}
    const stored=readGiftAcceptancePreparation(row,items);
    if(row.invitationVersion!==record.version||row.invitationSeal!==record.seal||row.sourceFingerprint!==record.sourceFingerprint||giftAcceptanceDigest(stored.manifest)!==giftAcceptanceDigest({packet:record.packet,annualBenefit:record.annualBenefit}))fail();
    stillLive();return summary(row,true);
   }
   // A terminal previous attempt still owns its original command key. Never silently reuse it.
   if(await tx.agencyGiftAcceptanceJob.findUnique({where:{accountId_invitationId_requestKey:{accountId,invitationId,requestKey:command.key}}}))fail('idempotency_conflict');
   const id=randomUUID(),items=record.packet.documents.map((d,ordinal)=>({id:randomUUID(),jobId:id,ordinal,sourceId:d.sourceId,sourceVersion:d.version,sourceSha256:d.sha256,documentId:randomUUID(),documentVersionId:randomUUID(),storedFileId:randomUUID()}));
   const frozen={id,practiceId:record.practiceId,invitationId,accountId,requestKey:command.key,commandDigest,invitationVersion:record.version,invitationSeal:record.seal,sourceFingerprint:record.sourceFingerprint,homeId:record.packet.requestedHomeId,homeInput:json(command.home),manifest:json({packet:record.packet,annualBenefit:record.annualBenefit})};
   const row=await tx.agencyGiftAcceptanceJob.create({data:{...frozen,preparationDigest:giftAcceptancePreparationDigest(frozen,items),items:{create:items.map(i=>immutableGiftAcceptanceItem(i))}}});
   stillLive();return summary(row,false);
  },{maxWait:5000,timeout:15000});}catch(error){
   // A publication may win while the live path waits on its locks. Retry only the accepted receipt read.
   return this.db.$transaction(async tx=>{
    const accepted=await tx.agencyGiftAcceptanceReceipt.findFirst({where:{invitationId,accountId}});if(!accepted)throw error;
    const r=await readAcceptedGift(tx,accepted,accountId);if(r.requestKey!==command.key||r.commandDigest!==commandDigest)fail('idempotency_conflict');return acceptedGiftSummary(r,true);
   },{maxWait:5000,timeout:15000});
  }
 }
 /** Token-free authenticated resume; absence never reveals another account's invitation or work. */
 async forInvitation(accountId:string,invitationId:string){
  if(!validId(accountId)||!validId(invitationId))fail();
  const result=await this.db.$transaction(async tx=>{
   const receipt=await tx.agencyGiftAcceptanceReceipt.findFirst({where:{accountId,invitationId}});
   if(receipt)return acceptedGiftSummary(await readAcceptedGift(tx,receipt,accountId),true);
   const job=await tx.agencyGiftAcceptanceJob.findFirst({where:{accountId,invitationId},orderBy:{createdAt:'desc'},select:{id:true}});
   return job?.id??null;
  },{maxWait:5000,timeout:15000});
  return typeof result==='string'?this.get(accountId,result):result??{state:'not_started' as const};
 }
 async get(accountId:string,jobId:string){
  if(!validId(accountId)||!validId(jobId))fail();
  return this.db.$transaction(async tx=>{
   const accepted=await tx.agencyGiftAcceptanceReceipt.findFirst({where:{jobId,accountId}});if(accepted)return acceptedGiftSummary(await readAcceptedGift(tx,accepted,accountId),true);
   // Account ownership precedes payload validation; never disclose a foreign job's contents/errors.
   const row=await tx.agencyGiftAcceptanceJob.findFirst({where:{id:jobId,accountId}});if(!row)fail();
   if(row.state==='accepted'){const receipt=await tx.agencyGiftAcceptanceReceipt.findUnique({where:{jobId}});if(!receipt)fail();return acceptedGiftSummary(await readAcceptedGift(tx,receipt,accountId),true);}
   if(['cancelled','failed_final'].includes(row.state))return {...summary(row,true),progress:{total:0,admitted:0}};
   const items=await tx.agencyGiftAcceptanceItem.findMany({where:{jobId},orderBy:{ordinal:'asc'}});
   readGiftAcceptancePreparation(row,items);
   return {...summary(row,true),progress:{total:items.length,admitted:items.filter(i=>i.state==='admitted').length}};
  },{maxWait:5000,timeout:15000});
 }
}