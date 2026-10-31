import {createHash} from 'node:crypto';
import {GiftInvitationError} from './gift-invitations';

export type GiftAcceptanceCommand={key:string;expectedInvitationVersion:number;home:{name:string;address:string}};
function invalid():never{throw new GiftInvitationError('invalid_input');}
function object(input:unknown,allowed:string[]):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)invalid();
 for(const key of Reflect.ownKeys(input)){
  if(typeof key!=='string'||!allowed.includes(key))invalid();
  const descriptor=Object.getOwnPropertyDescriptor(input,key);
  if(!descriptor||descriptor.get||descriptor.set)invalid();
 }
 return input as Record<string,unknown>;
}
function hasControl(value:string):boolean{return Array.from(value).some(c=>{const code=c.codePointAt(0)!;return code<32||code>=127&&code<=159;});}
function homeText(value:unknown,max:number):string{
 if(typeof value!=='string'||hasControl(value))invalid();
 const normalized=value.trim(),length=Array.from(normalized).length;
 // Match CreateHomeDto: code points after trimming; preserve internal content.
 if(length<1||length>max)invalid();return normalized;
}
function keyText(value:unknown):string{
 // Existing internal Gift key convention bounds the supplied string before trimming.
 if(typeof value!=='string'||value.length>120||!value.trim()||hasControl(value))invalid();return value.trim();
}
/** Explicit owner-confirmed text only; identity, target Home and entitlement remain server-owned. */
export function parseGiftAcceptanceCommand(input:unknown):GiftAcceptanceCommand{
 const body=object(input,['key','expectedInvitationVersion','home']);
 if(!Number.isSafeInteger(body.expectedInvitationVersion)||Number(body.expectedInvitationVersion)<1)invalid();
 const home=object(body.home,['name','address']);
 return {key:keyText(body.key),expectedInvitationVersion:Number(body.expectedInvitationVersion),home:{name:homeText(home.name,80),address:homeText(home.address,200)}};
}
/** Canonical request identity; generated IDs, secrets, dates and outcome are not inputs. */
export function acceptanceCommandDigest(command:GiftAcceptanceCommand):string{
 const normalized=parseGiftAcceptanceCommand(command);
 return createHash('sha256').update(JSON.stringify({schemaVersion:'gift-acceptance-command-v1',key:normalized.key,expectedInvitationVersion:normalized.expectedInvitationVersion,home:{name:normalized.home.name,address:normalized.home.address}})).digest('hex');
}
