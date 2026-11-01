import {digitalPlanSummary} from '../home-maps/snapshot';
import {randomUUID} from 'node:crypto';
import {Prisma,type AgencyGiftInvitation} from '../../generated/client';
import type {PrismaService} from '../prisma.service';
import {AgencyPracticesStore} from './store';
import {readGiftAcceptancePreparation,giftAcceptanceDigest,reservedGiftAcceptanceStates} from './gift-acceptance-preparation';
import {parseGiftReissueBody} from './gift-http-contracts';
import {requirePractice,type Actor,type Practice} from './domain';
import {prepareGiftFromRegistry} from './gift-registry';
import {assertGiftInvitationRecord,claimGiftInvitation,createGiftInvitation,giftInvitationCreationDigest,giftInvitationLanding,giftInvitationSourceFingerprint,GiftInvitationError,newGiftInvitationSecret,parseGiftInvitationCommand,revokeGiftInvitation,type GiftInvitation} from './gift-invitations';
function unavailable():never{throw new GiftInvitationError('unavailable');}
// Product decision: one full-access year, activated only by future Gift acceptance.
const FULL_ACCESS_GIFT_OFFER=Object.freeze({id:'dimora-full-access-v1',version:1});
const json=(r:GiftInvitation|Practice):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(r));
function snapshot(row:AgencyGiftInvitation):GiftInvitation{
 const r=row.snapshot as unknown as GiftInvitation;assertGiftInvitationRecord(r);
 if(r.id!==row.id||r.agencyId!==row.agencyId||r.practiceId!==row.practiceId||r.issuerAccountId!==row.issuerAccountId||r.creationKey!==row.creationKey||r.tokenHash!==row.tokenHash||r.version!==row.version||r.state!==row.state||r.expiresAt!==row.expiresAt.toISOString()||r.createdAt!==row.createdAt.toISOString()||(r.claim?.accountId??null)!==row.claimedAccountId)throw new GiftInvitationError('invalid_input');
 const original=parseGiftInvitationCommand({key:r.creationKey,expectedRevision:r.packet.practiceRevision,documents:r.packet.documents.map(d=>({sourceId:d.sourceId,version:d.version,sha256:d.sha256})),recipientEmail:r.recipientEmail,stipulationCompleted:r.declarations.stipulationCompleted,releaseApproved:r.declarations.releaseApproved,annualBenefit:r.annualBenefit.requested});
 if(giftInvitationCreationDigest(original)!==row.creationDigest)throw new GiftInvitationError('invalid_input');
 return r;
}
const summary=(r:GiftInvitation)=>({id:r.id,version:r.version,state:r.state,canSend:false as const,canAccept:false as const,createsHome:false as const,activatesBenefit:false as const});
const live=(r:GiftInvitation,now:string)=>{if(r.state==='revoked'||Date.parse(now)>=Date.parse(r.expiresAt)||Date.parse(now)<Date.parse(r.createdAt))unavailable();};

type GiftReissueCommand={key:string;expectedRevision:number;expectedVersion:number};
type GiftReissueReceipt={
 schemaVersion:1;accountId:string;key:string;digest:string;invitationId:string;expectedVersion:number;expectedRevision:number;
 replacementId:string;previousSeal:string;replacementSeal:string;sourceFingerprint:string;recordedAt:string;revision:number;
};
type GiftReissuePractice=Practice&{giftReissueReceipts?:GiftReissueReceipt[]};
function reissueObject(input:unknown,keys:string[]):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)throw new GiftInvitationError('invalid_input');
 const own=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input);
 if(own.length!==keys.length||own.some(k=>typeof k!=='string'||!keys.includes(k)))throw new GiftInvitationError('invalid_input');
 for(const key of keys){const d=descriptors[key];if(!d||!('value'in d)||!d.enumerable)throw new GiftInvitationError('invalid_input');}
 return input as Record<string,unknown>;
}
function reissueId(value:unknown):string{
 if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value))throw new GiftInvitationError('invalid_input');return value;
}
function reissueHash(value:unknown):string{
 if(typeof value!=='string'||!/^[a-f0-9]{64}$/u.test(value))throw new GiftInvitationError('invalid_input');return value;
}
function reissueCommand(input:unknown):GiftReissueCommand{
 const body=reissueObject(input,['key','expectedRevision','expectedVersion']);
 return parseGiftReissueBody({expectedRevision:body.expectedRevision,expectedVersion:body.expectedVersion},body.key);
}
function reissueDigest(accountId:string,agencyId:string,practiceId:string,invitationId:string,command:GiftReissueCommand){
 return giftAcceptanceDigest({schemaVersion:1,operation:'gift-reissue',accountId,agencyId,practiceId,invitationId,...command});
}
function reissueReceipts(practice:GiftReissuePractice):GiftReissueReceipt[]{
 if(!Array.isArray(practice.giftReissueReceipts??[])||(practice.giftReissueReceipts?.length??0)>100)throw new GiftInvitationError('invalid_input');
 const keys=new Set<string>(),oldIds=new Set<string>(),replacementIds=new Set<string>();
 return (practice.giftReissueReceipts??[]).map(value=>{
  const r=reissueObject(value,['schemaVersion','accountId','key','digest','invitationId','expectedVersion','expectedRevision','replacementId','previousSeal','replacementSeal','sourceFingerprint','recordedAt','revision']);
  if(r.schemaVersion!==1)throw new GiftInvitationError('invalid_input');
  const command=reissueCommand({key:r.key,expectedRevision:r.expectedRevision,expectedVersion:r.expectedVersion});
  const accountId=reissueId(r.accountId),invitationId=reissueId(r.invitationId),replacementId=reissueId(r.replacementId);
  if(invitationId===replacementId||typeof r.recordedAt!=='string'||!Number.isFinite(Date.parse(r.recordedAt))||new Date(r.recordedAt).toISOString()!==r.recordedAt||
   r.revision!==command.expectedRevision+1||!Number.isSafeInteger(r.revision)||Number(r.revision)>practice.revision)throw new GiftInvitationError('invalid_input');
  const digest=reissueHash(r.digest);
  if(digest!==reissueDigest(accountId,practice.agencyId,practice.id,invitationId,command))throw new GiftInvitationError('invalid_input');
  const requestKey=JSON.stringify([accountId,command.key]);
  if(keys.has(requestKey)||oldIds.has(invitationId)||replacementIds.has(replacementId))throw new GiftInvitationError('invalid_input');
  keys.add(requestKey);oldIds.add(invitationId);replacementIds.add(replacementId);
  return {schemaVersion:1,accountId,...command,digest,invitationId,replacementId,
   previousSeal:reissueHash(r.previousSeal),replacementSeal:reissueHash(r.replacementSeal),sourceFingerprint:reissueHash(r.sourceFingerprint),
   recordedAt:r.recordedAt,revision:Number(r.revision)};
 });
}

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
 private async acceptanceIdentity(tx:Prisma.TransactionClient,accountId:string,context:{actor:Actor;practice:Practice;row:AgencyGiftInvitation;record:GiftInvitation},expectedVersion:number,allowInvited=false){
  const r=context.record;
  await tx.$queryRaw`SELECT id FROM "Account" WHERE id=${accountId} FOR SHARE`;
  const account=await tx.account.findUnique({where:{id:accountId},select:{id:true,email:true,emailVerifiedAt:true}}),now=new Date();
  const stateAllowed=r.state==='claimed'&&r.claim?.accountId===accountId||allowInvited&&r.state==='invited';
  if(!account||!account.emailVerifiedAt||account.emailVerifiedAt>now||account.email.trim().toLowerCase()!==r.recipientEmail||!stateAllowed)unavailable();
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
   if(reissueReceipts(practice).some(r=>r.accountId===accountId&&r.key===b.key))throw new GiftInvitationError('idempotency_conflict');
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
 /** Agency-authorized recovery: replacement and old-link revocation commit together. No recipient job is abandoned. */
 async reissue(accountId:string,agencyId:string,practiceId:string,invitationId:string,input:unknown){
  reissueId(accountId);reissueId(agencyId);reissueId(practiceId);reissueId(invitationId);
  const command=reissueCommand(input),digest=reissueDigest(accountId,agencyId,practiceId,invitationId,command);
  return this.db.$transaction(async tx=>{
   const {actor,practice}=await this.practices.giftInvitationContext(tx,accountId,agencyId,practiceId);
   requirePractice(actor,practice,'edit',new Date().toISOString());
   if(await tx.agencyGiftAcceptanceReceipt.findUnique({where:{practiceId}}))unavailable();
   // begin/publication share the practice lock. Existing reservations must be cancelled by their owner first.
   if(await tx.agencyGiftAcceptanceJob.findFirst({where:{practiceId,state:{in:reservedGiftAcceptanceStates}},select:{id:true}}))unavailable();
   const receipts=reissueReceipts(practice),prior=receipts.find(r=>r.accountId===accountId&&r.key===command.key);
   if(prior&&prior.digest!==digest)throw new GiftInvitationError('idempotency_conflict');
   const target=await tx.agencyGiftInvitation.findUnique({where:{id:invitationId},select:{agencyId:true,practiceId:true}});
   if(!target||target.agencyId!==agencyId||target.practiceId!==practiceId)unavailable();
   const {record:previous}=await this.locked(tx,invitationId);
   if(previous.agencyId!==agencyId||previous.practiceId!==practiceId)unavailable();
   this.current(actor,practice,previous);
   const fresh=()=>{const at=new Date().toISOString();requirePractice(actor,practice,'edit',at);requirePractice(actor,practice,'export',at);this.current(actor,practice,previous);if(Date.parse(at)<Date.parse(previous.createdAt))unavailable();};
   if(prior){
    const replacement=await tx.agencyGiftInvitation.findUnique({where:{id:prior.replacementId},select:{agencyId:true,practiceId:true}});
    if(!replacement||replacement.agencyId!==agencyId||replacement.practiceId!==practiceId)throw new GiftInvitationError('invalid_input');
    const {record}=await this.locked(tx,prior.replacementId);
    if(previous.seal!==prior.previousSeal||previous.state!=='revoked'||previous.version!==command.expectedVersion+1||
     record.agencyId!==agencyId||record.practiceId!==practiceId||record.issuerAccountId!==accountId||record.creationKey!==command.key||
     record.seal!==prior.replacementSeal||record.sourceFingerprint!==prior.sourceFingerprint||record.sourceFingerprint!==previous.sourceFingerprint||
     record.packet.practiceRevision!==command.expectedRevision||record.packet.requestedHomeId!==previous.packet.requestedHomeId||
     record.createdAt!==prior.recordedAt||Date.parse(record.expiresAt)!==Date.parse(record.createdAt)+7*86400000||
     record.recipientEmail!==previous.recipientEmail||giftAcceptanceDigest(record.annualBenefit)!==giftAcceptanceDigest(previous.annualBenefit))throw new GiftInvitationError('invalid_input');
    fresh();this.current(actor,practice,record);
    return {...summary(record),secret:null,replay:true,requiresReissue:true};
   }
   if(await tx.agencyGiftInvitation.findUnique({where:{practiceId_issuerAccountId_creationKey:{practiceId,issuerAccountId:accountId,creationKey:command.key}}}))throw new GiftInvitationError('idempotency_conflict');
   if(previous.state==='revoked')unavailable();
   if(previous.version!==command.expectedVersion||practice.revision!==command.expectedRevision)throw new GiftInvitationError('revision_conflict');
   if(receipts.length>=100||await tx.agencyGiftInvitation.count({where:{practiceId}})>=100)throw new GiftInvitationError('invalid_input');
   const now=new Date().toISOString(),secret=newGiftInvitationSecret();
   const createCommand=parseGiftInvitationCommand({key:command.key,expectedRevision:command.expectedRevision,
    documents:previous.packet.documents.map(d=>({sourceId:d.sourceId,version:d.version,sha256:d.sha256})),
    recipientEmail:previous.recipientEmail,stipulationCompleted:true,releaseApproved:true,annualBenefit:previous.annualBenefit.requested});
   const offer=previous.annualBenefit.requested?{id:previous.annualBenefit.offerId,version:previous.annualBenefit.offerVersion}:null;
   const {record}=createGiftInvitation(actor,practice,createCommand,{id:randomUUID(),homeId:previous.packet.requestedHomeId,secret,expiresAt:new Date(Date.parse(now)+7*86400000).toISOString(),offer},now);
   if(record.sourceFingerprint!==previous.sourceFingerprint||giftAcceptanceDigest(record.annualBenefit)!==giftAcceptanceDigest(previous.annualBenefit))unavailable();
   const revoked=revokeGiftInvitation(previous,actor,practice,command.expectedVersion,now);
   fresh();live(record,new Date().toISOString());
   const updated=await tx.agencyGiftInvitation.updateMany({where:{id:previous.id,agencyId,practiceId,version:previous.version,state:previous.state},
    data:{version:revoked.record.version,state:revoked.record.state,snapshot:json(revoked.record)}});
   if(updated.count!==1)throw new GiftInvitationError('revision_conflict');
   await tx.agencyGiftInvitation.create({data:{id:record.id,agencyId,practiceId,issuerAccountId:accountId,creationKey:command.key,
    creationDigest:giftInvitationCreationDigest(createCommand),tokenHash:record.tokenHash,version:record.version,state:record.state,
    expiresAt:new Date(record.expiresAt),snapshot:json(record),createdAt:new Date(record.createdAt)}});
   const next:GiftReissuePractice={...structuredClone(practice),revision:practice.revision+1,giftReissueReceipts:[...receipts,{
    schemaVersion:1,accountId,...command,digest,invitationId:previous.id,replacementId:record.id,previousSeal:previous.seal,
    replacementSeal:record.seal,sourceFingerprint:record.sourceFingerprint,recordedAt:now,revision:practice.revision+1
   }]};
   const written=await tx.agencyPractice.updateMany({where:{id:practiceId,agencyId,revision:practice.revision},data:{revision:next.revision,snapshot:json(next)}});
   if(written.count!==1)throw new GiftInvitationError('revision_conflict');
   fresh();live(record,new Date().toISOString());
   return {...summary(record),secret,replay:false,requiresReissue:false};
  },{maxWait:5000,timeout:15000});
 }

 /** Agency-authorized management list: no source payload, token hashes or claimant identity. */
 async list(accountId:string,agencyId:string,practiceId:string){
  return this.db.$transaction(async tx=>{
   const {actor,practice}=await this.practices.giftInvitationContext(tx,accountId,agencyId,practiceId);
   const rows=await tx.agencyGiftInvitation.findMany({where:{agencyId,practiceId},orderBy:[{createdAt:'desc'},{id:'desc'}]});
   const invitations=rows.map(row=>{
    if(row.agencyId!==agencyId||row.practiceId!==practiceId)unavailable();
    const r=snapshot(row);return {id:r.id,version:r.version,state:r.state,createdAt:r.createdAt,expiresAt:r.expiresAt,recipientEmail:r.recipientEmail};
   });
   const accepted=await tx.agencyGiftAcceptanceReceipt.findUnique({where:{practiceId},select:{id:true}});
   requirePractice(actor,practice,'export',new Date().toISOString());
   return {practiceId,accepted:accepted!==null,invitations};
  },{maxWait:5000,timeout:15000});
 }
 /** Version-aware anonymous landing; legacy landing remains unchanged. */
 async landingStatus(id:string,secret:unknown){
  return this.db.$transaction(async tx=>{
   const {actor,practice,record}=await this.credentialContext(tx,id,secret);
   this.current(actor,practice,record);const now=new Date().toISOString();requirePractice(actor,practice,'export',now);giftInvitationLanding(record,secret,now);
   return {id:record.id,version:record.version,requiresAccount:true as const};
  },{maxWait:5000,timeout:15000});
 }
 /** Authenticated recipient-only manifest preview, before or after its own claim. No state is changed. */
 async recipientPreview(accountId:string,id:string,secret:unknown){
  if(typeof accountId!=='string'||!/^[a-f0-9-]{36}$/iu.test(accountId))unavailable();
  return this.db.$transaction(async tx=>{
   const context=await this.credentialContext(tx,id,secret);
   await this.acceptanceIdentity(tx,accountId,context,context.record.version,true);
   const {actor,practice,record}=context,agency=await tx.agency.findUnique({where:{id:record.agencyId},select:{id:true,name:true}});
   if(!agency||agency.id!==practice.agencyId)unavailable();
   if(record.state!=='invited'&&record.state!=='claimed')unavailable();const state=record.state;
   const documents=record.packet.documents.map(d=>({title:d.title,author:d.author,origin:d.origin,lifecycle:d.lifecycle,signatureVerification:d.signatureVerification,...(d.digitalPlan?{digitalPlan:digitalPlanSummary(d.digitalPlan)}:{}),...(d.surface?{surface:structuredClone(d.surface)}:{})}));
   this.current(actor,practice,record);const now=new Date().toISOString();requirePractice(actor,practice,'export',now);live(record,now);
   return {id:record.id,version:record.version,state,agencyName:agency.name,documents,annualBenefit:structuredClone(record.annualBenefit)};
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
