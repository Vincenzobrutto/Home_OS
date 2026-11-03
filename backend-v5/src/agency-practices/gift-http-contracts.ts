import {PracticeError} from './domain';
import {GiftInvitationError,parseGiftInvitationCommand} from './gift-invitations';
import {parseGiftAcceptanceCommand} from './gift-acceptance-command';

function invalid():never{throw new GiftInvitationError('invalid_input');}
function exact(input:unknown,keys:string[]):Record<string,unknown>{
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)invalid();
  const own=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input);
  if(own.length!==keys.length||own.some(k=>typeof k!=='string'||!keys.includes(k)))invalid();
  for(const key of keys){const d=descriptors[key];if(!d||!('value'in d)||!d.enumerable)invalid();}
  return input as Record<string,unknown>;
}
function secret(input:unknown):string{
  if(typeof input!=='string'||!/^[A-Za-z0-9_-]{43}$/u.test(input))invalid();return input;
}
function version(input:unknown):number{
  if(!Number.isSafeInteger(input)||Number(input)<1)invalid();return Number(input);
}
function key(input:unknown):string{
  if(typeof input!=='string'||input.length>120||!input.trim()||Array.from(input).some(c=>{const code=c.codePointAt(0)!;return code<32||code>=127&&code<=159;}))invalid();
  return input.trim();
}
function canonical<T>(parse:()=>T):T{
  try{return parse();}catch(error){
    if((error instanceof PracticeError||error instanceof GiftInvitationError)&&error.code==='invalid_input')invalid();
    throw error;
  }
}
function documents(input:unknown){
  if(!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype||input.length<1||input.length>50||Reflect.ownKeys(input).length!==input.length+1)invalid();
  const result:Record<string,unknown>[]=[];
  for(let i=0;i<input.length;i++){
    const d=Object.getOwnPropertyDescriptor(input,String(i));if(!d||!('value'in d)||!d.enumerable)invalid();
    const item=exact(d.value,['sourceId','version','sha256']);result.push({sourceId:item.sourceId,version:item.version,sha256:item.sha256});
  }
  return result;
}

/** Transport syntax only: account, source authority, Home ID and offer are resolved by server services. */
export function parseGiftLandingBody(input:unknown){
  const body=exact(input,['secret']);return {secret:secret(body.secret)};
}
export function parseGiftClaimBody(input:unknown){
  const body=exact(input,['secret','expectedVersion']);return {secret:secret(body.secret),expectedVersion:version(body.expectedVersion)};
}
export function parseGiftVersionBody(input:unknown){
  const body=exact(input,['expectedVersion']);return {expectedVersion:version(body.expectedVersion)};
}
export function parseGiftAcceptanceBody(input:unknown,keyHeader:unknown){
  const body=exact(input,['secret','expectedInvitationVersion','home']),home=exact(body.home,['name','address']);
  const credential=secret(body.secret),requestKey=key(keyHeader);
  const command=canonical(()=>parseGiftAcceptanceCommand({key:requestKey,expectedInvitationVersion:body.expectedInvitationVersion,home:{name:home.name,address:home.address}}));
  return {secret:credential,command};
}
export function parseGiftCreateBody(input:unknown,keyHeader:unknown){
  const body=exact(input,['expectedRevision','documents','recipientEmail','stipulationCompleted','releaseApproved','annualBenefit']);
  const requestKey=key(keyHeader),selected=documents(body.documents);
  return canonical(()=>parseGiftInvitationCommand({key:requestKey,expectedRevision:body.expectedRevision,documents:selected,recipientEmail:body.recipientEmail,stipulationCompleted:body.stipulationCompleted,releaseApproved:body.releaseApproved,annualBenefit:body.annualBenefit}));
}
/** Reissue changes only a personal link: recipient, manifest, destination and offer stay server-owned. */
export function parseGiftReissueBody(input:unknown,keyHeader:unknown){
  const body=exact(input,['expectedRevision','expectedVersion']);
  return {key:key(keyHeader),expectedRevision:version(body.expectedRevision),expectedVersion:version(body.expectedVersion)};
}
