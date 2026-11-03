import {publishGiftMap} from '../home-maps/publication';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {HttpException} from '@nestjs/common';
import {Prisma,type AgencyGiftAcceptanceJob,type AgencyGiftAcceptanceItem} from '../../generated/client';
import type {PrismaService} from '../prisma.service';
import type {AgencyFileVault} from './files';
import {PracticeError,requirePractice} from './domain';
import {GiftInvitationError} from './gift-invitations';
import {GiftInvitationsStore} from './gift-invitations-store';
import {readGiftAcceptancePreparation,giftAcceptanceDigest} from './gift-acceptance-preparation';
import {stageGiftOriginal,type StagedGiftOriginal} from './gift-file-admission';
import {makeGiftAcceptanceReceipt} from './gift-acceptance-receipt';
import {makeGiftBenefit} from './gift-benefit';
import {readAcceptedGift} from './gift-acceptance-read';
import {parseGiftDocumentProvenance} from '../documents/gift-provenance';
import {collectionsFor,type ClassificationPart} from '../document-intake/domain';
import {safeFilename,type LocalFileStorage} from '../documents/storage';

type Storage=Pick<LocalFileStorage,'root'|'read'|'writeVerified'|'remove'>;
type Vault=Pick<AgencyFileVault,'read'|'assertGiftDestination'>;
type Lease={job:AgencyGiftAcceptanceJob;tokenHash:string;epoch:number};
const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const json=(v:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(v));
const validId=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9-]{36}$/iu.test(v);
function fail():never{throw new GiftInvitationError('unavailable');}
class GiftLeaseLost extends Error{}
function errorKind(error:unknown):{state:'blocked_review'|'retryable';code:string}{
 if(error instanceof GiftLeaseLost)return {state:'retryable',code:'gift_retry_later'};
 if(error instanceof Error&&error.message==='agency_gift_storage_invalid')return {state:'blocked_review',code:'gift_storage_configuration'};
 if(error instanceof GiftInvitationError||error instanceof PracticeError)return {state:'blocked_review',code:'gift_review_required'};
 if(error instanceof HttpException){
  const body=error.getResponse(),code=body&&typeof body==='object'?(body as {code?:unknown}).code:null;
  if(['file_check_unavailable','storage_capacity_low','storage_unavailable'].includes(String(code)))return {state:'retryable',code:String(code)};
 }
 return {state:'retryable',code:'storage_unavailable'};
}
function control(item:AgencyGiftAcceptanceItem,job:AgencyGiftAcceptanceJob){
 const c=item.control as null|{engine?:unknown;checkedAt?:unknown;signatureVersion?:unknown};
 if(item.state!=='admitted'||!item.storageKey||!Number.isSafeInteger(item.admittedEpoch)||item.admittedEpoch!<1||item.admittedEpoch!>job.leaseEpoch||!c||typeof c!=='object'||Object.keys(c).sort().join(',')!=='checkedAt,engine,signatureVersion'||c.engine!=='microsoft_defender'||typeof c.checkedAt!=='string'||!Number.isFinite(Date.parse(c.checkedAt))||new Date(c.checkedAt).toISOString()!==c.checkedAt||Date.parse(c.checkedAt)>Date.now()||typeof c.signatureVersion!=='string'||!c.signatureVersion.trim()||c.signatureVersion.length>200||/[\p{Cc}\p{Cf}]/u.test(c.signatureVersion))fail();
 return {engine:'microsoft_defender',checkedAt:new Date(c.checkedAt),signatureVersion:c.signatureVersion};
}

/** Internal queue worker: no HTTP proof fields and no live AI/email/payment operations. */
export class GiftAcceptanceWorker{
 private readonly invitations:GiftInvitationsStore;
 constructor(private readonly db:Pick<PrismaService,'$transaction'>,private readonly vault:Vault,private readonly storage:Storage){this.invitations=new GiftInvitationsStore(db);}
 private async lock(tx:Prisma.TransactionClient,id:string){
  await tx.$queryRaw`SELECT id FROM "AgencyGiftAcceptanceJob" WHERE id=${id} FOR UPDATE`;
  const job=await tx.agencyGiftAcceptanceJob.findUnique({where:{id}});if(!job)fail();
  const items=await tx.agencyGiftAcceptanceItem.findMany({where:{jobId:id},orderBy:{ordinal:'asc'}});
  return {job,items};
 }
 private fence(job:AgencyGiftAcceptanceJob,lease:Lease){
  if(job.state!=='staging'||job.leaseEpoch!==lease.epoch||job.leaseTokenHash!==lease.tokenHash||!job.leaseUntil||job.leaseUntil<=new Date())throw new GiftLeaseLost();
 }
 private async take(id:string){
  return this.db.$transaction(async tx=>{
   const {job,items}=await this.lock(tx,id);
   const accepted=await tx.agencyGiftAcceptanceReceipt.findUnique({where:{jobId:id}});if(accepted){await readAcceptedGift(tx,accepted,job.accountId);return {result:{jobId:id,state:'accepted',replay:true}};}
   if(job.state==='accepted')fail();
   if(!['queued','retryable','staging','ready'].includes(job.state))return {result:{jobId:id,state:job.state,replay:true}};
   if(job.leaseUntil&&job.leaseUntil>new Date())return {result:{jobId:id,state:job.state,replay:true}};
   readGiftAcceptancePreparation(job,items);
   if(job.attempts>=5){await tx.agencyGiftAcceptanceJob.update({where:{id},data:{state:'failed_final',version:{increment:1},leaseTokenHash:null,leaseUntil:null,lastError:'gift_retry_limit'}});return {result:{jobId:id,state:'failed_final',replay:false}};}
   const tokenHash=hash(randomBytes(32)),epoch=job.leaseEpoch+1;
   const updated=await tx.agencyGiftAcceptanceJob.update({where:{id},data:{state:'staging',version:{increment:1},leaseEpoch:epoch,leaseTokenHash:tokenHash,leaseUntil:new Date(Date.now()+120000),attempts:{increment:1},lastError:null}});
   return {lease:{job:updated,tokenHash,epoch}};
  },{maxWait:5000,timeout:15000});
 }
 private async authorized(lease:Lease){
  return this.db.$transaction(async tx=>{
   const context=await this.invitations.claimedAcceptanceContext(tx,lease.job.id);
   const {job,items}=await this.lock(tx,lease.job.id);this.fence(job,lease);
   const prepared=readGiftAcceptancePreparation(job,items);
   if(job.accountId!==lease.job.accountId||job.invitationId!==lease.job.invitationId||job.preparationDigest!==lease.job.preparationDigest||context.record.seal!==job.invitationSeal||giftAcceptanceDigest(prepared.manifest)!==giftAcceptanceDigest({packet:context.record.packet,annualBenefit:context.record.annualBenefit}))fail();
   return {job,items,...prepared};
  },{maxWait:5000,timeout:15000});
 }
 private async admit(lease:Lease,item:AgencyGiftAcceptanceItem,staged:StagedGiftOriginal){
  await this.db.$transaction(async tx=>{
   const current=await this.lock(tx,lease.job.id);this.fence(current.job,lease);readGiftAcceptancePreparation(current.job,current.items);
   const target=current.items.find(i=>i.id===item.id);if(!target||target.state!=='pending'||target.storedFileId!==item.storedFileId||target.sourceSha256!==staged.sha256)fail();
   // Atomic reservation makes existing cleanup protect admitted staging after a restart.
   await tx.storedFile.create({data:{id:target.storedFileId,storageKey:staged.storageKey}});
   await tx.agencyGiftAcceptanceItem.update({where:{id:item.id},data:{state:'admitted',storageKey:staged.storageKey,control:json(staged.control),admittedEpoch:lease.epoch}});
   this.fence(current.job,lease);
   await tx.agencyGiftAcceptanceJob.update({where:{id:current.job.id},data:{version:{increment:1},leaseUntil:new Date(Date.now()+120000)}});
  },{maxWait:5000,timeout:15000});
 }
 private async verifyCopies(lease:Lease){
  const prepared=await this.authorized(lease),keys=new Set<string>();
  const selected=await this.db.$transaction(async tx=>{
   const files=[];
   for(const item of prepared.items){
    const receipt=control(item,prepared.job),file=await tx.storedFile.findUnique({where:{id:item.storedFileId},include:{original:{select:{id:true}}}});
    if(!file||file.storageKey!==item.storageKey||file.original||keys.has(file.storageKey))fail();keys.add(file.storageKey);
    files.push({item,receipt,key:file.storageKey,proof:prepared.manifest.packet.documents[item.ordinal]});
   }
   return files;
  },{maxWait:5000,timeout:15000});
  // Slow bytes readback remains outside the short publication transaction.
  for(const file of selected){const bytes=await this.storage.read(file.key);if(bytes.length!==file.proof.byteSize||hash(bytes)!==file.proof.sha256)throw new GiftInvitationError('unavailable');}
  return selected;
 }
 private async publish(lease:Lease){
  const verified=await this.verifyCopies(lease);
  return this.db.$transaction(async tx=>{
   const context=await this.invitations.claimedAcceptanceContext(tx,lease.job.id),{job,items}=await this.lock(tx,lease.job.id);this.fence(job,lease);
   const prepared=readGiftAcceptancePreparation(job,items),now=new Date(),acceptedAt=now.toISOString();
   const stillLive=()=>{const clock=new Date().toISOString();requirePractice(context.actor,context.practice,'export',clock);if(context.record.state!=='claimed'||Date.parse(clock)>=Date.parse(context.record.expiresAt)||Date.parse(clock)<Date.parse(context.record.createdAt))fail();};
   if(job.preparationDigest!==lease.job.preparationDigest||context.record.seal!==job.invitationSeal||giftAcceptanceDigest(prepared.manifest)!==giftAcceptanceDigest({packet:context.record.packet,annualBenefit:context.record.annualBenefit}))fail();
   if(await tx.agencyGiftAcceptanceReceipt.findUnique({where:{practiceId:job.practiceId}})||await tx.home.findUnique({where:{id:job.homeId}}))fail();
   for(const item of items){
    const prior=verified.find(f=>f.item.id===item.id);control(item,job);
    if(!prior||prior.key!==item.storageKey||giftAcceptanceDigest(prior.item.control)!==giftAcceptanceDigest(item.control))fail();
    await tx.$queryRaw`SELECT id FROM "StoredFile" WHERE id=${item.storedFileId} FOR UPDATE`;
    const file=await tx.storedFile.findUnique({where:{id:item.storedFileId},include:{original:{select:{id:true}}}});if(!file||file.original||file.storageKey!==item.storageKey)fail();
   }
   stillLive();
   await tx.home.create({data:{id:job.homeId,name:prepared.command.home.name,address:prepared.command.home.address,memberships:{create:{accountId:job.accountId,role:'owner',validFrom:now}}}});
   for(const item of items){
    const d=prepared.manifest.packet.documents[item.ordinal],scan=control(item,job);
    const provenance=parseGiftDocumentProvenance({schemaVersion:1,kind:'agency_gift',invitationId:job.invitationId,agencyId:prepared.manifest.packet.agencyId,practiceId:job.practiceId,sourceId:d.sourceId,sourceVersion:d.version,sourceSha256:d.sha256,metadataVersion:d.metadataVersion,origin:d.origin,author:d.author,title:d.title,...(d.classification?{classification:d.classification}:{}),...(d.surface?{surface:d.surface}:{})});if(!provenance)fail();
    await tx.document.create({data:{id:item.documentId,homeId:job.homeId,uploaderId:job.accountId,name:d.title,visibility:'private',giftProvenance:json(provenance),original:{create:{id:item.documentVersionId,version:1,originalFilename:safeFilename(d.originalFilename),mimeType:d.mimeType,byteSize:d.byteSize,sha256:d.sha256,fileId:item.storedFileId,fileControlEngine:scan.engine,fileControlCheckedAt:scan.checkedAt,fileControlSignature:scan.signatureVersion}}}});
    const classification=provenance.classification;
    if(classification&&classification.family!=='unclassified'){
     const parts:ClassificationPart[]=[{kind:classification.documentKind??'other',pageFrom:null,pageTo:null}];
     await tx.documentOrganization.create({data:{accountId:job.accountId,homeId:job.homeId,documentId:item.documentId,documentVersion:1,documentSha256:d.sha256,title:d.title,parts:json(parts),collections:collectionsFor(parts),houseDocument:true,houseFamily:classification.family,classificationOrigin:'agency_gift'}});
    }
    if(d.digitalPlan)await publishGiftMap(tx,{accountId:job.accountId,homeId:job.homeId,documentId:item.documentId,sha256:d.sha256,snapshot:d.digitalPlan});
   }
   const receiptId=randomUUID(),offer=prepared.manifest.annualBenefit;
   const benefit=offer.requested?makeGiftBenefit({id:randomUUID(),receiptId,accountId:job.accountId,acceptedAt,offerId:offer.offerId,offerVersion:offer.offerVersion}):null;
   const receipt=makeGiftAcceptanceReceipt({id:receiptId,practiceId:job.practiceId,invitationId:job.invitationId,jobId:job.id,accountId:job.accountId,requestKey:job.requestKey,commandDigest:job.commandDigest,sourceFingerprint:job.sourceFingerprint,homeId:job.homeId,acceptedAt,documents:items.map(i=>({documentId:i.documentId,sha256:i.sourceSha256})),benefit});
   await tx.agencyGiftAcceptanceReceipt.create({data:{id:receipt.id,practiceId:receipt.practiceId,invitationId:receipt.invitationId,jobId:receipt.jobId,accountId:receipt.accountId,requestKey:receipt.requestKey,commandDigest:receipt.commandDigest,sourceFingerprint:receipt.sourceFingerprint,homeId:receipt.homeId,acceptedAt:now,snapshot:json(receipt)}});
   if(benefit)await tx.accountGiftBenefit.create({data:{id:benefit.id,receiptId,accountId:job.accountId,offerId:benefit.offerId,offerVersion:benefit.offerVersion,startsAt:new Date(benefit.startsAt),endsAt:new Date(benefit.endsAt)}});
   this.fence(job,lease);
   await tx.agencyGiftAcceptanceJob.update({where:{id:job.id},data:{state:'accepted',version:{increment:1},homeInput:Prisma.DbNull,manifest:Prisma.DbNull,leaseTokenHash:null,leaseUntil:null,lastError:null}});
   await tx.agencyGiftAcceptanceItem.updateMany({where:{jobId:job.id},data:{state:'published',storageKey:null,control:Prisma.DbNull,admittedEpoch:null}});
   stillLive();this.fence(job,lease);return {jobId:job.id,state:'accepted',replay:false};
  },{maxWait:5000,timeout:15000});
 }
 /** Owner-authorized recovery only. Never removes published files or acts while another lease is live. */
 async cancel(accountId:string,jobId:string){
  if(!validId(accountId)||!validId(jobId))fail();
  const result=await this.db.$transaction(async tx=>{
   const {job,items}=await this.lock(tx,jobId);
   if(job.accountId!==accountId||await tx.agencyGiftAcceptanceReceipt.findUnique({where:{jobId}}))fail();
   if(job.state==='cancelled')return {keys:[] as string[],replay:true};
   if(job.state==='accepted')fail();
   if(job.leaseUntil&&job.leaseUntil>new Date())throw new GiftInvitationError('revision_conflict');
   readGiftAcceptancePreparation(job,items);
   const keys:string[]=[];
   for(const item of items){
    await tx.$queryRaw`SELECT id FROM "StoredFile" WHERE id=${item.storedFileId} FOR UPDATE`;
    const file=await tx.storedFile.findUnique({where:{id:item.storedFileId},include:{original:{select:{id:true}}}});
    if(item.state==='admitted'){
     control(item,job);if(!file||file.original||file.storageKey!==item.storageKey)fail();
     keys.push(file.storageKey);await tx.storedFile.delete({where:{id:file.id}});
    }else if(item.state!=='pending'||file)fail();
   }
   await tx.agencyGiftAcceptanceItem.updateMany({where:{jobId},data:{state:'abandoned',storageKey:null,control:Prisma.DbNull,admittedEpoch:null}});
   await tx.agencyGiftAcceptanceJob.update({where:{id:jobId},data:{state:'cancelled',version:{increment:1},homeInput:Prisma.DbNull,manifest:Prisma.DbNull,leaseTokenHash:null,leaseUntil:null}});
   return {keys,replay:false};
  },{maxWait:5000,timeout:15000});
  for(const key of result.keys){
   // A failed lookup leaves bytes for ordinary orphan cleanup; never delete after an uncertain result.
   try{const referenced=await this.db.$transaction(tx=>tx.storedFile.findUnique({where:{storageKey:key}}));if(!referenced)await this.storage.remove(key);}catch{/* No reference remains published; private orphan cleanup can retry after its normal threshold. */}
  }
  return {jobId,state:'cancelled',replay:result.replay};
 }
 private async yieldLease(lease:Lease){
  return this.db.$transaction(async tx=>{
   const {job,items}=await this.lock(tx,lease.job.id);this.fence(job,lease);readGiftAcceptancePreparation(job,items);
   const state=items.every(i=>i.state==='admitted')?'ready':'queued';
   await tx.agencyGiftAcceptanceJob.update({where:{id:job.id},data:{state,version:{increment:1},leaseTokenHash:null,leaseUntil:null}});
   return {jobId:job.id,state,replay:false};
  },{maxWait:5000,timeout:15000});
 }
 async runNext(jobId:string,continueWork:()=>boolean=()=>true){
  if(!validId(jobId))fail();
  const taken=await this.take(jobId);if(taken.result)return taken.result;const lease=taken.lease!;
  try{
   await this.vault.assertGiftDestination(this.storage.root);
   // Renew after every admitted file: no transaction or SQL lock is held during scanning.
   for(const item of (await this.authorized(lease)).items){
    if(!continueWork())return this.yieldLease(lease);
    if(item.state==='admitted')continue;
    const current=await this.authorized(lease),d=current.manifest.packet.documents[item.ordinal];
    const staged=await stageGiftOriginal(()=>this.vault.read(d.sha256,d.byteSize),d,this.storage);
    // On an uncertain persistence outcome do not compensate by deleting a possibly reserved object.
    await this.admit(lease,item,staged);
   }
   if(!continueWork())return this.yieldLease(lease);
   return await this.publish(lease);
  }catch(error){
   return this.db.$transaction(async tx=>{
    const accepted=await tx.agencyGiftAcceptanceReceipt.findUnique({where:{jobId}});if(accepted){await readAcceptedGift(tx,accepted,lease.job.accountId);return {jobId,state:'accepted',replay:true};}
    const {job}=await this.lock(tx,jobId);
    if(job.state==='accepted'){const receipt=await tx.agencyGiftAcceptanceReceipt.findUnique({where:{jobId}});if(!receipt)fail();await readAcceptedGift(tx,receipt,lease.job.accountId);return {jobId,state:'accepted',replay:true};}
    if(job.leaseEpoch!==lease.epoch||job.leaseTokenHash!==lease.tokenHash)return {jobId,state:job.state,replay:true};
    const kind=errorKind(error);
    await tx.agencyGiftAcceptanceJob.update({where:{id:jobId},data:{state:kind.state,version:{increment:1},leaseTokenHash:null,leaseUntil:null,lastError:kind.code}});
    return {jobId,state:kind.state,replay:false};
   },{maxWait:5000,timeout:15000});
  }
 }
}
