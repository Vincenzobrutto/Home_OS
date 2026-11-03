import {createHash} from 'node:crypto';
import {GiftInvitationError} from './gift-invitations';
import {activeGiftBenefit,makeGiftBenefit,type GiftBenefit} from './gift-benefit';

export type GiftAcceptanceReceipt={
  schemaVersion:1;id:string;practiceId:string;invitationId:string;jobId:string;accountId:string;
  requestKey:string;commandDigest:string;sourceFingerprint:string;homeId:string;acceptedAt:string;
  documents:{documentId:string;sha256:string}[];benefit:GiftBenefit|null;integrityDigest:string;
};
const inputKeys=['id','practiceId','invitationId','jobId','accountId','requestKey','commandDigest','sourceFingerprint','homeId','acceptedAt','documents','benefit'];
function invalid():never{throw new GiftInvitationError('invalid_input');}
function exact(input:unknown,keys:string[]):Record<string,unknown>{
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)invalid();
  const own=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input);
  if(own.length!==keys.length||own.some(k=>typeof k!=='string'||!keys.includes(k)))invalid();
  for(const key of keys){const d=descriptors[key];if(!d||!('value'in d)||!d.enumerable)invalid();}
  return input as Record<string,unknown>;
}
function id(value:unknown,max=100):string{
  if(typeof value!=='string'||!value.trim()||value!==value.trim()||Array.from(value).length>max||/[\p{Cc}\p{Cf}]/u.test(value))invalid();
  return value;
}
function hash(value:unknown):string{if(typeof value!=='string'||!/^[a-f0-9]{64}$/u.test(value))invalid();return value;}
function instant(value:unknown):string{
  if(typeof value!=='string'||value.length>27)invalid();
  const date=new Date(value);if(!Number.isFinite(date.getTime())||date.toISOString()!==value)invalid();return value;
}
function documents(input:unknown):GiftAcceptanceReceipt['documents']{
  if(!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype||input.length<1||input.length>50||Reflect.ownKeys(input).length!==input.length+1)invalid();
  const result:GiftAcceptanceReceipt['documents']=[];
  for(let i=0;i<input.length;i++){
    const d=Object.getOwnPropertyDescriptor(input,String(i));if(!d||!('value'in d)||!d.enumerable)invalid();
    const row=exact(d.value,['documentId','sha256']);result.push({documentId:id(row.documentId),sha256:hash(row.sha256)});
  }
  if(new Set(result.map(d=>d.documentId)).size!==result.length)invalid();return result;
}
function canonical(value:unknown):unknown{
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)]));
  return value;
}
const canonicalJson=(value:unknown)=>JSON.stringify(canonical(value));
function benefit(input:unknown,receiptId:string,accountId:string,acceptedAt:string):GiftBenefit|null{
  if(input===null)return null;
  try{
    // Validation uses the acceptance instant so historical receipts remain readable after expiry.
    if(!activeGiftBenefit(input,acceptedAt))invalid();
    const b=input as GiftBenefit;
    if(b.receiptId!==receiptId||b.accountId!==accountId||b.startsAt!==acceptedAt)invalid();
    const expected=makeGiftBenefit({id:b.id,receiptId:b.receiptId,accountId:b.accountId,acceptedAt,offerId:b.offerId,offerVersion:b.offerVersion});
    if(canonicalJson(expected)!==canonicalJson(input))invalid();return expected;
  }catch{invalid();}
}

/** Minimal accepted outcome. Contains no source descriptions, tokens or storage paths; not an authorization. */
export function makeGiftAcceptanceReceipt(input:unknown):GiftAcceptanceReceipt{
  const row=exact(input,inputKeys),receiptId=id(row.id),accountId=id(row.accountId),acceptedAt=instant(row.acceptedAt);
  const body={schemaVersion:1 as const,id:receiptId,practiceId:id(row.practiceId),invitationId:id(row.invitationId),jobId:id(row.jobId),accountId,
    requestKey:id(row.requestKey,120),commandDigest:hash(row.commandDigest),sourceFingerprint:hash(row.sourceFingerprint),homeId:id(row.homeId),acceptedAt,
    documents:documents(row.documents),benefit:benefit(row.benefit,receiptId,accountId,acceptedAt)};
  return {...body,integrityDigest:createHash('sha256').update(canonicalJson(body)).digest('hex')};
}

/** Canonical checksum detects incoherent storage, not a signature, permission or proof of ownership. */
export function parseGiftAcceptanceReceipt(input:unknown):GiftAcceptanceReceipt{
  const row=exact(input,['schemaVersion',...inputKeys,'integrityDigest']);if(row.schemaVersion!==1)invalid();
  const expected=makeGiftAcceptanceReceipt(Object.fromEntries(inputKeys.map(key=>[key,row[key]])));
  if(expected.integrityDigest!==hash(row.integrityDigest))invalid();return expected;
}
