import {randomUUID} from 'node:crypto';
import {Prisma,type AgencyGiftInvitation} from '../../generated/client';
import type {PrismaService} from '../prisma.service';
import {AgencyPracticesStore} from './store';
import {readGiftAcceptancePreparation,giftAcceptanceDigest} from './gift-acceptance-preparation';
import {requirePractice,type Actor,type Practice} from './domain';
import {prepareGiftFromRegistry} from './gift-registry';
import {assertGiftInvitationRecord,claimGiftInvitation,createGiftInvitation,giftInvitationCreationDigest,giftInvitationLanding,giftInvitationSourceFingerprint,GiftInvitationError,newGiftInvitationSecret,parseGiftInvitationCommand,revokeGiftInvitation,type GiftInvitation} from './gift-invitations';
function unavailable():never{throw new GiftInvitationError('unavailable');}
// Product decision: one full-access year, activated only by future Gift acceptance.
const FULL_ACCESS_GIFT_OFFER=Object.freeze({id:'dimora-full-access-v1',version:1});
const json=(r:GiftInvitation):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(r));
function snapshot(row:AgencyGiftInvitation):GiftInvitation{
 const r=row.snapshot as unknown as GiftInvitation;assertGiftInvitationRecord(r);
 if(r.id!==row.id||r.agencyId!==row.agencyId||r.practiceId!==row.practiceId||r.issuerAccountId!==row.issuerAccountId||r.creationKey!==row.creationKey||r.tokenHash!==row.tokenHash||r.version!==row.version||r.state!==row.state||r.expiresAt!==row.expiresAt.toISOString()||r.createdAt!==row.createdAt.toISOString()||(r.claim?.accountId??null)!==row.claimedAccountId)throw new GiftInvitationError('invalid_input');
 const original=parseGiftInvitationCommand({key:r.creationKey,expectedRevision:r.packet.practiceRevision,documents:r.packet.documents.map(d=>({sourceId:d.sourceId,version:d.version,sha256:d.sha256})),recipientEmail:r.recipientEmail,stipulationCompleted:r.declarations.stipulationCompleted,releaseApproved:r.declarations.releaseApproved,annualBenefit:r.annualBenefit.requested});
 if(giftInvitationCreationDigest(original)!==row.creationDigest)throw new GiftInvitationError('invalid_input');
 return r;
}
const summary=(r:GiftInvitation)=>({id:r.id,version:r.version,state:r.state,canSend:false as const,canAccept:false as const,createsHome:false as const,activatesBenefit:false as const});
const live=(r:GiftInvitation,now:string)=>{if(r.state==='revoked'||Date.parse(now)>=Date.parse(r.expiresAt)||Date.parse(now)<Date.parse(r.createdAt))unavailable();};

/** Internal persistence port. No controller accepts account proof, offer, destination or token hash. */
export class GiftInvitationsStore{
 private readonly practices:AgencyPracticesStore;
 constructor(private readonly db:Pick<PrismaService,'$transaction'>){this.practices=new AgencyPracticesStore(db);}
 private current(actor:Actor,practice:Practice,r:GiftInvitation){
  const packet=prepareGiftFromRegistry(actor,practice,{expectedRevision:practice.revision,requestedHomeId:r.packet.requestedHomeId,recipients:r.packet.recipients,documents:r.packet.documents.map(d=>({sourceId:d.sourceId,version:d.version,sha256:d.sha256}))},new Date().toISOString());
  if(giftInvitationSourceFingerprint(packet)!==r.sourceFingerprint)unavailable();
 }
 private async locked(tx:Prisma.TransactionClient,id:string){
  await tx.$queryRaw`SELECT id FROM "AgencyGiftInvitation" WHERE id=${id} FOR UPDATE`;
  const row=await tx.agencyGiftInvitation.findUnique({where:{id}});if(!row)unavailable();return {row,record:snapshot(row)};
 }
 private async credentialContext(tx:Prisma.TransactionClient,id:string,secret:unknown){
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/iu.test(id))unavailable();
  const peek=await tx.agencyGiftInvitation.findUnique({where:{id}});if(!peek)unavailable();const initial=snapshot(peek);
  giftInvitationLanding(initial,secret,new Date().toISOString());
  const {actor,practice}=await this.practices.giftInvitationContext(tx,initial.issuerAccountId,initial.agencyId,initial.practiceId);
  const {row,record}=await this.locked(tx,id);
  if(record.agencyId!==initial.agencyId||record.practiceId!==initial.practiceId||record.issuerAccountId!==initial.issuerAccountId)unavailable();
  giftInvitationLanding(record,secret,new Date().toISOString());this.current(actor,practice,record);
  return {actor,practice,row,record};
 }
 private async acceptanceIdentity(tx:Prisma.TransactionClient,accountId:string,context:{actor:Actor;practice:Practice;row:AgencyGiftInvitation;record:GiftInvitation},expectedVersion:number){
  const r=context.record;
  await tx.$queryRaw`SELECT id FROM "Account" WHERE id=${accountId} FOR SHARE`;
  const account=await tx.account.findUnique({where:{id:accountId},select:{id:true,email:true,emailVerifiedAt:true}}),now=new Date();
  if(!account||!account.emailVerifiedAt||account.emailVerifiedAt>now||account.email.trim().toLowerCase()!==r.recipientEmail||r.state!=='claimed'||r.claim?.accountId!==accountId)unavailable();
  if(r.version!==expectedVersion)throw new GiftInvitationError('revision_conflict');
  requirePractice(context.actor,context.practice,'export',now.toISOString());live(r,now.toISOString());
  return context;
 }
 /** Internal acceptance prerequisite: identity is read under lock, never asserted by the browser. */
 async acceptanceContext(tx:Prisma.TransactionClient,accountId:string,id:string,secret:unknown,expectedVersion:number){
  return this.acceptanceIdentity(tx,accountId,await this.credentialContext(tx,id,secret),expectedVersion);
 }
 /** Worker-only revalidation. Caller must hold a verified durable job; this is not a public credential. */
 async claimedAcceptanceContext(tx:Prisma.TransactionClient,jobId:string){
  if(typeof jobId!=='string'||!/^[a-f0-9-]{36}$/iu.test(jobId))unavailable();
  const job=await tx.agencyGiftAcceptanceJob.findUnique({where:{id:jobId}});if(!job)unavailable();
  const items=await tx.agencyGiftAcceptanceItem.findMany({where:{jobId},orderBy:{ordinal:'asc'}}),prepared=readGiftAcceptancePreparation(job,items);
  const peek=await tx.agencyGiftInvitation.findUnique({where:{id:job.invitationId}});if(!peek)unavailable();const initial=snapshot(peek);live(initial,new Date().toISOString());
  const {actor,practice}=await this.practices.giftInvitationContext(tx,initial.issuerAccountId,initial.agencyId,initial.practiceId);
  const {row,record}=await this.locked(tx,job.invitationId);
  if(record.agencyId!==initial.agencyId||record.practiceId!==job.practiceId||record.issuerAccountId!==initial.issuerAccountId||record.seal!==job.invitationSeal||record.sourceFingerprint!==job.sourceFingerprint||giftAcceptanceDigest(prepared.manifest)!==giftAcceptanceDigest({packet:record.packet,annualBenefit:record.annualBenefit}))unavailable();
  live(record,new Date().toISOString());this.current(actor,practice,record);
  return this.acceptanceIdentity(tx,job.accountId,{actor,practice,row,record},job.invitationVersion);
 }
 async create(accountId:string,agencyId:string,practiceId:string,input:unknown){
  const b=parseGiftInvitationCommand(input),creationDigest=giftInvitationCreationDigest(b);
  return this.db.$transaction(async tx=>{
   const {actor,practice}=await this.practices.giftInvitationContext(tx,accountId,agencyId,practiceId);
   requirePractice(actor,practice,'edit',new Date().toISOString());
   if(await tx.agencyGiftAcceptanceReceipt.findUnique({where:{practiceId}}))unavailable();
   const prior=await tx.agencyGiftInvitation.findUnique({where:{practiceId_issuerAccountId_creationKey:{practiceId,issuerAccountId:accountId,creationKey:b.key}}});
   if(prior){
    if(prior.creationDigest!==creationDigest)throw new GiftInvitationError('idempotency_conflict');
    const {record}=await this.locked(tx,prior.id);live(record,new Date().toISOString());this.current(actor,practice,record);requirePractice(actor,practice,'export',new Date().toISOString());
    requirePractice(actor,practice,'edit',new Date().toISOString());
    return {...summary(record),secret:null,replay:true,requiresReissue:true};
   }
   if(await tx.agencyGiftInvitation.count({where:{practiceId}})>=100)throw new GiftInvitationError('invalid_input');
   const now=new Date().toISOString(),secret=newGiftInvitationSecret();
   // The agency flag freezes the approved full-access offer; claim does not activate it.
   const {record}=createGiftInvitation(actor,practice,b,{id:randomUUID(),homeId:randomUUID(),secret,expiresAt:new Date(Date.parse(now)+7*86400000).toISOString(),offer:FULL_ACCESS_GIFT_OFFER},now);
   requirePractice(actor,practice,'edit',new Date().toISOString());requirePractice(actor,practice,'export',new Date().toISOString());live(record,new Date().toISOString());
   await tx.agencyGiftInvitation.create({data:{id:record.id,agencyId,practiceId,issuerAccountId:accountId,creationKey:b.key,creationDigest,tokenHash:record.tokenHash,version:record.version,state:record.state,expiresAt:new Date(record.expiresAt),snapshot:json(record),createdAt:new Date(record.createdAt)}});
   return {...summary(record),secret,replay:false,requiresReissue:false};
  },{maxWait:5000,timeout:15000});
 }
 async landing(id:string,secret:unknown){
  return this.db.$transaction(async tx=>{const {actor,practice,record}=await this.credentialContext(tx,id,secret);requirePractice(actor,practice,'export',new Date().toISOString());return giftInvitationLanding(record,secret,new Date().toISOString());},{maxWait:5000,timeout:15000});
 }
 async claim(accountId:string,id:string,secret:unknown,expectedVersion:number){
  return this.db.$transaction(async tx=>{
   const {actor,practice,record}=await this.credentialContext(tx,id,secret);
   await tx.$queryRaw`SELECT id FROM "Account" WHERE id=${accountId} FOR SHARE`;
   const account=await tx.account.findUnique({where:{id:accountId},select:{id:true,email:true,emailVerifiedAt:true}});if(!account)unavailable();
   const now=new Date().toISOString(),result=claimGiftInvitation(record,secret,{accountId:account.id,email:account.email,emailVerifiedAt:account.emailVerifiedAt?.toISOString()??null},record.sourceFingerprint,expectedVersion,now);
   requirePractice(actor,practice,'export',new Date().toISOString());giftInvitationLanding(result.record,secret,new Date().toISOString());
   if(!result.replay){const updated=await tx.agencyGiftInvitation.updateMany({where:{id,version:record.version,state:record.state},data:{version:result.record.version,state:result.record.state,claimedAccountId:result.record.claim!.accountId,snapshot:json(result.record)}});if(updated.count!==1)throw new GiftInvitationError('revision_conflict');}
   return {...summary(result.record),replay:result.replay};
  },{maxWait:5000,timeout:15000});
 }
 async revoke(accountId:string,agencyId:string,practiceId:string,id:string,expectedVersion:number){
  return this.db.$transaction(async tx=>{
   const {actor,practice}=await this.practices.giftInvitationContext(tx,accountId,agencyId,practiceId),{record}=await this.locked(tx,id);
   requirePractice(actor,practice,'edit',new Date().toISOString());
   const result=revokeGiftInvitation(record,actor,practice,expectedVersion,new Date().toISOString());requirePractice(actor,practice,'export',new Date().toISOString());
   requirePractice(actor,practice,'edit',new Date().toISOString());
   if(!result.replay){const updated=await tx.agencyGiftInvitation.updateMany({where:{id,version:record.version,state:record.state},data:{version:result.record.version,state:result.record.state,snapshot:json(result.record)}});if(updated.count!==1)throw new GiftInvitationError('revision_conflict');}
   return {...summary(result.record),replay:result.replay};
  },{maxWait:5000,timeout:15000});
 }
}
