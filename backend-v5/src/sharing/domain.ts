import { ForbiddenException, HttpException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { conflict, ids, invalid, object, uuid, version } from '../review/domain';

export type Recipient = { kind:'member'; accountId:string } | { kind:'external' };
export const unavailable = () => new ForbiddenException({code:'share_unavailable',message:'Condivisione non disponibile.'});
export const changed = () => conflict('share_conflict','La condivisione è cambiata. Rileggila prima di continuare.');
export const rateLimited = () => new HttpException({code:'share_try_later',message:'Troppi tentativi. Riprova più tardi.'},429);
export function selection(input:unknown) {
  const b=object(input,['documentIds','recipient','durationDays']);
  const r=object(b.recipient,['kind','accountId']);
  let recipient:Recipient;
  if(r.kind==='member')recipient={kind:'member',accountId:uuid(r.accountId)};
  else if(r.kind==='external'&&r.accountId===undefined)recipient={kind:'external'};
  else throw invalid();
  if(typeof b.durationDays!=='number'||![1,7,30].includes(b.durationDays))throw invalid();
  return {documentIds:ids(b.documentIds,20).sort(),recipient,durationDays:b.durationDays};
}
export function creation(input:unknown){const b=object(input,['previewId','expectedPreviewVersion','manifestFingerprint','acknowledgedDocumentIds']);if(b.expectedPreviewVersion!==1||typeof b.manifestFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(b.manifestFingerprint))throw invalid();return {previewId:uuid(b.previewId),expectedPreviewVersion:1,manifestFingerprint:b.manifestFingerprint,acknowledgedDocumentIds:ids(b.acknowledgedDocumentIds,20).sort()};}
export function action(input:unknown){const b=object(input,['expectedVersion']);return {expectedVersion:version(b.expectedVersion)};}
export function confirmPairing(input:unknown){const b=object(input,['expectedVersion','claimId','comparisonCode','confirmRecipient']);if(b.confirmRecipient!==true)throw invalid();return {expectedVersion:version(b.expectedVersion),claimId:uuid(b.claimId),comparisonCode:normalizeCode(b.comparisonCode,8),confirmRecipient:true};}
export function claimBody(input:unknown){const b=object(input,['code','discloseAccount']);if(b.discloseAccount!==true)throw invalid();return {code:normalizeCode(b.code,10),discloseAccount:true};}
export function normalizeCode(input:unknown,length:number){if(typeof input!=='string'||input.length>30)throw unavailable();const code=input.toUpperCase().replace(/[ -]/g,'');if(code.length!==length||!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/.test(code))throw unavailable();return code;}
const alphabet='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function randomCode(length:number){return [...randomBytes(length)].map(n=>alphabet[n%alphabet.length]).join('');}
export function page(input:unknown){const b=object(input,['limit','cursor']);if(b.limit!==undefined&&(typeof b.limit!=='string'||!/^([1-9]|[1-4][0-9]|50)$/.test(b.limit)))throw invalid();if(b.cursor!==undefined&&(typeof b.cursor!=='string'||b.cursor.length>1000||!/^[A-Za-z0-9_-]+$/.test(b.cursor)))throw invalid();return {limit:b.limit===undefined?20:Number(b.limit),cursor:b.cursor as string|undefined};}
export function requestKey(input:unknown){if(typeof input!=='string'||!/^[A-Za-z0-9_-]{16,100}$/.test(input))throw invalid();return input;}
