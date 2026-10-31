import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {requirePractice,type Actor,type Practice} from './domain';
import {prepareGiftFromRegistry,type GiftMetadataState} from './gift-registry';

type Packet=ReturnType<typeof prepareGiftFromRegistry>;
export class GiftInvitationError extends Error {
  constructor(readonly code:'invalid_input'|'unavailable'|'revision_conflict'|'benefit_unavailable'){super(code);}
}
function fail(code:GiftInvitationError['code']):never{throw new GiftInvitationError(code);}
function object(v:unknown,keys:string[]):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k)))fail('invalid_input');
 return v as Record<string,unknown>;
}
function text(v:unknown,max=100):string{if(typeof v!=='string'||!v.trim()||v.length>max||Array.from(v).some(c=>c.charCodeAt(0)<32))fail('invalid_input');return v.trim();}
function email(v:unknown){const s=text(v,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(s))fail('invalid_input');return s;}
function time(v:unknown){const s=text(v,40),n=Date.parse(s);if(!Number.isFinite(n))fail('invalid_input');return n;}
function canonical(v:unknown):unknown{
 if(Array.isArray(v))return v.map(canonical);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>[k,canonical(x)]));
 return v;
}
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const secretHash=(s:string)=>createHash('sha256').update(s).digest('hex');
export const newGiftInvitationSecret=()=>randomBytes(32).toString('base64url');

/** Excludes broad practice revision/time; source or metadata changes still invalidate the invitation. */
export function giftInvitationSourceFingerprint(packet:Packet){
 return digest({agencyId:packet.agencyId,practiceId:packet.practiceId,requestedHomeId:packet.requestedHomeId,recipients:packet.recipients,documents:packet.documents});
}
export type GiftInvitation={
 schemaVersion:1;id:string;agencyId:string;practiceId:string;issuerAccountId:string;creationKey:string;
 createdAt:string;expiresAt:string;recipientEmail:string;tokenHash:string;packet:Packet;
 sourceFingerprint:string;seal:string;version:number;state:'invited'|'claimed'|'revoked';
 claim:null|{accountId:string;claimedAt:string};revokedAt:string|null;
 annualBenefit:{requested:false}|{requested:true;offerId:string;offerVersion:number;activated:false};
};
type ServerCreation={id:string;homeId:string;secret:string;expiresAt:string;offer:null|{id:string;version:number}};
type TrustedAccount={accountId:string;email:string;emailVerifiedAt:string|null};
function seal(r:GiftInvitation){return digest({schemaVersion:r.schemaVersion,id:r.id,agencyId:r.agencyId,practiceId:r.practiceId,issuerAccountId:r.issuerAccountId,creationKey:r.creationKey,createdAt:r.createdAt,expiresAt:r.expiresAt,recipientEmail:r.recipientEmail,tokenHash:r.tokenHash,packet:r.packet,sourceFingerprint:r.sourceFingerprint,annualBenefit:r.annualBenefit});}
function validate(r:GiftInvitation){
 if(!r||r.schemaVersion!==1||!['invited','claimed','revoked'].includes(r.state)||!Number.isSafeInteger(r.version)||r.version<1||
   !/^[a-f0-9]{64}$/u.test(r.tokenHash)||r.seal!==seal(r)||r.sourceFingerprint!==giftInvitationSourceFingerprint(r.packet)||
   r.packet.agencyId!==r.agencyId||r.packet.practiceId!==r.practiceId||r.packet.preparedBy!==r.issuerAccountId||r.packet.recipients.length!==1||
   time(r.expiresAt)<=time(r.createdAt)||email(r.recipientEmail)!==r.recipientEmail)fail('invalid_input');
 if(r.state==='invited'&&(r.claim!==null||r.revokedAt!==null)||r.state==='claimed'&&(!r.claim||r.revokedAt!==null)||r.state==='revoked'&&!r.revokedAt)fail('invalid_input');
 if(r.claim){text(r.claim.accountId);if(time(r.claim.claimedAt)<time(r.createdAt)||time(r.claim.claimedAt)>=time(r.expiresAt))fail('invalid_input');}
}
function credential(r:GiftInvitation,secret:unknown,now:string){
 validate(r);
 if(typeof secret!=='string'||!/^[A-Za-z0-9_-]{43}$/u.test(secret)||r.state==='revoked'||time(now)>=time(r.expiresAt)||time(now)<time(r.createdAt))fail('unavailable');
 if(!timingSafeEqual(Buffer.from(secretHash(secret),'hex'),Buffer.from(r.tokenHash,'hex')))fail('unavailable');
}

/** Internal candidate only: adapter must persist before a link can be issued. No HTTP accepts server fields. */
export function createGiftInvitation(actor:Actor,practice:GiftMetadataState,input:unknown,server:ServerCreation,now:string){
 const b=object(input,['key','expectedRevision','documents','recipientEmail','stipulationCompleted','releaseApproved','annualBenefit']);
 if(b.stipulationCompleted!==true||b.releaseApproved!==true||typeof b.annualBenefit!=='boolean')fail('invalid_input');
 if(!/^[A-Za-z0-9_-]{43}$/u.test(server.secret)||time(server.expiresAt)<=time(now)||time(server.expiresAt)>time(now)+30*86400000)fail('invalid_input');
 const recipientEmail=email(b.recipientEmail),id=text(server.id),key=text(b.key,120);
 const packet=prepareGiftFromRegistry(actor,practice,{expectedRevision:b.expectedRevision,requestedHomeId:text(server.homeId),recipients:[{subjectRef:'gift-recipient'}],documents:b.documents},now);
 let annualBenefit:GiftInvitation['annualBenefit']={requested:false};
 if(b.annualBenefit){if(!server.offer||!Number.isSafeInteger(server.offer.version)||server.offer.version<1)fail('benefit_unavailable');annualBenefit={requested:true,offerId:text(server.offer.id),offerVersion:server.offer.version,activated:false};}
 const record:GiftInvitation={schemaVersion:1,id,agencyId:practice.agencyId,practiceId:practice.id,issuerAccountId:actor.accountId,creationKey:key,createdAt:now,expiresAt:server.expiresAt,recipientEmail,tokenHash:secretHash(server.secret),packet,sourceFingerprint:giftInvitationSourceFingerprint(packet),seal:'',version:1,state:'invited',claim:null,revokedAt:null,annualBenefit};
 record.seal=seal(record);validate(record);
 return {record,canSend:false as const,canAccept:false as const,createsHome:false as const,activatesBenefit:false as const};
}

/** Anonymous view contains neither original metadata, email, Home reference nor claimant. */
export function giftInvitationLanding(record:GiftInvitation,secret:unknown,now:string){
 credential(record,secret,now);return {id:record.id,requiresAccount:true as const,canAccept:false as const};
}

/** Account and current manifest must be resolved by auth/source adapters, never by a claim DTO. */
export function claimGiftInvitation(record:GiftInvitation,secret:unknown,account:TrustedAccount,currentSourceFingerprint:string,expectedVersion:number,now:string){
 credential(record,secret,now);
 if(!account.emailVerifiedAt||time(account.emailVerifiedAt)>time(now)||email(account.email)!==record.recipientEmail)fail('unavailable');
 const accountId=text(account.accountId);
 if(currentSourceFingerprint!==record.sourceFingerprint)fail('unavailable');
 if(record.claim){if(record.claim.accountId!==accountId)fail('unavailable');return {record:structuredClone(record),replay:true,canAccept:false as const,createsHome:false as const,activatesBenefit:false as const};}
 if(record.version!==expectedVersion)fail('revision_conflict');
 const next=structuredClone(record);next.version++;next.state='claimed';next.claim={accountId,claimedAt:now};
 return {record:next,replay:false,canAccept:false as const,createsHome:false as const,activatesBenefit:false as const};
}
export function revokeGiftInvitation(record:GiftInvitation,actor:Actor,practice:Practice,expectedVersion:number,now:string){
 requirePractice(actor,practice,'export',now);validate(record);
 if(practice.id!==record.practiceId||practice.agencyId!==record.agencyId)fail('unavailable');
 if(record.state==='revoked')return {record:structuredClone(record),replay:true};
 if(record.version!==expectedVersion)fail('revision_conflict');
 const next=structuredClone(record);next.version++;next.state='revoked';next.revokedAt=now;return {record:next,replay:false};
}
