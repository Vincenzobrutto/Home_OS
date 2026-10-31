import { createHash } from 'node:crypto';
import { exportManifest, PracticeError, requirePractice, sourceReadable, type Actor, type Practice } from './domain';
import { parseGiftDocumentDescriptor, prepareAgencyGiftPacket, type GiftDocumentDescriptor } from './gift-packet';

/** Server-owned metadata history; not a producer/identity/signature certification. */
export type GiftDocumentRecord = {
  id:string; descriptor:GiftDocumentDescriptor; recordedBy:string; recordedAt:string; fingerprint:string;
};
type GiftMetadataReceipt = {
  accountId:string;key:string;digest:string;recordId:string;metadataVersion:number;revision:number;
};
export type GiftMetadataState = Practice & {
  giftDocuments?:GiftDocumentRecord[];giftMetadataReceipts?:GiftMetadataReceipt[];
};
function fail(code:PracticeError['code']):never { throw new PracticeError(code); }
function object(v:unknown,keys:string[]):Record<string,unknown> {
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||
    Object.keys(v).some(k=>!keys.includes(k)))fail('invalid_input');
  return v as Record<string,unknown>;
}
function text(v:unknown,max=120):string {
  if(typeof v!=='string'||!v.trim()||v.length>max||Array.from(v).some(c=>c.charCodeAt(0)<32))fail('invalid_input');
  return v.trim();
}
function positive(v:unknown):number {
  if(!Number.isSafeInteger(v)||Number(v)<1)fail('invalid_input');
  return Number(v);
}
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function recordFingerprint(d:GiftDocumentDescriptor,actor:string,at:string) {
  // Parser reconstructs descriptor keys so PostgreSQL JSONB key ordering is irrelevant.
  return digest([parseGiftDocumentDescriptor(d),actor,at]);
}
function record(input:unknown,practice:Practice):GiftDocumentRecord {
  const r=object(input,['id','descriptor','recordedBy','recordedAt','fingerprint']);
  const d=parseGiftDocumentDescriptor(r.descriptor),id=text(r.id),by=text(r.recordedBy,100),at=text(r.recordedAt,100);
  if(!Number.isFinite(Date.parse(at))||d.agencyId!==practice.agencyId||d.practiceId!==practice.id||
    r.fingerprint!==recordFingerprint(d,by,at)||id!==digest([practice.id,d.sourceId,d.metadataVersion]))fail('invalid_input');
  return {id,descriptor:d,recordedBy:by,recordedAt:at,fingerprint:r.fingerprint as string};
}
function latest(practice:GiftMetadataState,sourceId:string):GiftDocumentRecord|undefined {
  if(!Array.isArray(practice.giftDocuments??[]))fail('invalid_input');
  const matching=(practice.giftDocuments??[]).filter(r=>r.descriptor?.sourceId===sourceId).map(r=>record(r,practice));
  if(new Set(matching.map(r=>r.descriptor.metadataVersion)).size!==matching.length)fail('invalid_input');
  return matching.sort((a,b)=>b.descriptor.metadataVersion-a.descriptor.metadataVersion)[0];
}

/** INTERNAL: producer/registry supplies descriptor; the client command cannot attest metadata. */
export function registerGiftDocumentDescriptor(
  actor:Actor,original:GiftMetadataState,trustedDescriptor:unknown,input:unknown,now:string
) {
  requirePractice(actor,original,'edit',now);requirePractice(actor,original,'export',now);
  const d=parseGiftDocumentDescriptor(trustedDescriptor);
  if(d.agencyId!==original.agencyId||d.practiceId!==original.id)fail('invalid_input');
  // Check current original and permission even on replay, before touching stored metadata.
  exportManifest(actor,original,[{sourceId:d.sourceId,version:d.sourceVersion,sha256:d.sha256}],now);
  const r=object(input,['key','expectedRevision','expectedMetadataVersion']);
  const key=text(r.key),expectedRevision=positive(r.expectedRevision);
  const expectedMetadataVersion=r.expectedMetadataVersion===null?null:positive(r.expectedMetadataVersion);
  const commandDigest=digest([original.id,actor.accountId,key,expectedRevision,expectedMetadataVersion,d]);
  if(!Array.isArray(original.giftMetadataReceipts??[]))fail('invalid_input');
  const prior=(original.giftMetadataReceipts??[]).find(p=>p.accountId===actor.accountId&&p.key===key);
  if(prior){
    if(prior.digest!==commandDigest)fail('idempotency_conflict');
    return {practice:structuredClone(original),receipt:structuredClone(prior),replay:true};
  }
  if(original.revision!==expectedRevision)fail('revision_conflict');
  const previous=latest(original,d.sourceId);
  if((previous?.descriptor.metadataVersion??null)!==expectedMetadataVersion)fail('revision_conflict');
  if(d.metadataVersion!==(previous?.descriptor.metadataVersion??0)+1)fail('invalid_input');
  if((original.giftDocuments?.length??0)>=500||(original.giftMetadataReceipts?.length??0)>=1000)fail('invalid_input');
  const practice=structuredClone(original),id=digest([practice.id,d.sourceId,d.metadataVersion]);
  const entry:GiftDocumentRecord={id,descriptor:structuredClone(d),recordedBy:actor.accountId,recordedAt:now,
    fingerprint:recordFingerprint(d,actor.accountId,now)};
  practice.giftDocuments??=[];practice.giftMetadataReceipts??=[];
  practice.giftDocuments.push(entry);practice.revision++;
  const receipt={accountId:actor.accountId,key,digest:commandDigest,recordId:id,metadataVersion:d.metadataVersion,revision:practice.revision};
  practice.giftMetadataReceipts.push(receipt);
  practice.events.push({id:practice.events.length+1,actorId:actor.accountId,at:now,operation:'gift-metadata:register',sourceId:d.sourceId,revision:practice.revision});
  return {practice,receipt:structuredClone(receipt),replay:false};
}

export function giftDocumentMetadataView(actor:Actor,practice:GiftMetadataState,now:string) {
  requirePractice(actor,practice,'read',now);
  // No private source counts, historical filenames, receipts or metadata from a replaced original.
  const documents=practice.sources.filter(s=>sourceReadable(actor,practice,s,now)).map(s=>{
    const v=s.versions.at(-1);if(!v)fail('invalid_input');
    const current=latest(practice,s.id),base={sourceId:s.id,sourceVersion:v.version,sha256:v.sha256};
    if(!current)return {...base,state:'missing' as const};
    const d=current.descriptor;
    if(d.sourceVersion!==v.version||d.sha256!==v.sha256)return {...base,state:'stale' as const};
    return {...base,state:'current' as const,metadataVersion:d.metadataVersion,descriptor:structuredClone(d),
      recordedBy:current.recordedBy,recordedAt:current.recordedAt};
  });
  return {practiceId:practice.id,revision:practice.revision,documents,certification:false as const};
}

/** Server resolves stored descriptors; no descriptor field belongs to the selection DTO. */
export function prepareGiftFromRegistry(actor:Actor,practice:GiftMetadataState,input:unknown,now:string) {
  requirePractice(actor,practice,'export',now);
  const r=object(input,['expectedRevision','requestedHomeId','recipients','documents']);
  const originals=exportManifest(actor,practice,r.documents,now);
  const descriptors=originals.map(s=>{
    const entry=latest(practice,s.sourceId);if(!entry)fail('invalid_input');
    if(entry.descriptor.sourceVersion!==s.version||entry.descriptor.sha256!==s.sha256)fail('source_changed');
    return entry.descriptor;
  });
  return prepareAgencyGiftPacket(actor,practice,descriptors,input,now);
}
