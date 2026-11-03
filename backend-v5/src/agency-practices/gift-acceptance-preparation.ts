import {createHash} from 'node:crypto';
import type {AgencyGiftAcceptanceJob,AgencyGiftAcceptanceItem} from '../../generated/client';
import {GiftInvitationError,giftInvitationSourceFingerprint,type GiftInvitation} from './gift-invitations';
import {acceptanceCommandDigest,parseGiftAcceptanceCommand,type GiftAcceptanceCommand} from './gift-acceptance-command';
type Item=AgencyGiftAcceptanceItem;
type Manifest={packet:GiftInvitation['packet'];annualBenefit:GiftInvitation['annualBenefit']};
export const reservedGiftAcceptanceStates=['queued','staging','ready','retryable','blocked_review','accepted'];
function fail(code:GiftInvitationError['code']='unavailable'):never{throw new GiftInvitationError(code);}
function canonical(v:unknown):unknown{
 if(Array.isArray(v))return v.map(canonical);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>[k,canonical(x)]));
 return v;
}
export const giftAcceptanceDigest=(v:unknown)=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
function validId(id:unknown):id is string{return typeof id==='string'&&/^[a-f0-9-]{36}$/iu.test(id);}
export function immutableGiftAcceptanceItem(i:Pick<Item,'id'|'ordinal'|'sourceId'|'sourceVersion'|'sourceSha256'|'documentId'|'documentVersionId'|'storedFileId'>){
 return {id:i.id,ordinal:i.ordinal,sourceId:i.sourceId,sourceVersion:i.sourceVersion,sourceSha256:i.sourceSha256,documentId:i.documentId,documentVersionId:i.documentVersionId,storedFileId:i.storedFileId};
}
/** Consistency checksum across JSONB key order; not a signature or a permission. */
export function giftAcceptancePreparationDigest(row:Pick<AgencyGiftAcceptanceJob,'id'|'practiceId'|'invitationId'|'accountId'|'requestKey'|'commandDigest'|'invitationVersion'|'invitationSeal'|'sourceFingerprint'|'homeId'>&{homeInput:unknown;manifest:unknown},items:Parameters<typeof immutableGiftAcceptanceItem>[0][]){
 return giftAcceptanceDigest({schemaVersion:1,id:row.id,practiceId:row.practiceId,invitationId:row.invitationId,accountId:row.accountId,requestKey:row.requestKey,commandDigest:row.commandDigest,invitationVersion:row.invitationVersion,invitationSeal:row.invitationSeal,sourceFingerprint:row.sourceFingerprint,homeId:row.homeId,homeInput:row.homeInput,manifest:row.manifest,items:items.map(immutableGiftAcceptanceItem)});
}
/** Internal pending record only. Accepted receipts will be separate, with descriptive staging fields erased. */
export function readGiftAcceptancePreparation(row:AgencyGiftAcceptanceJob,items:Item[]):{command:GiftAcceptanceCommand;manifest:Manifest}{
 if(![...reservedGiftAcceptanceStates,'failed_final'].includes(row.state)||row.state==='accepted'||row.version<1||!Number.isSafeInteger(row.version))fail();
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
 if(giftAcceptancePreparationDigest(row,items)!==row.preparationDigest)fail('invalid_input');
 return {command,manifest};
}
