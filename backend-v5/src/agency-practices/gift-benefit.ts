import {PracticeError} from './domain';

export type GiftBenefit={
  schemaVersion:1;id:string;receiptId:string;accountId:string;
  offerId:'dimora-full-access-v1';offerVersion:1;startsAt:string;endsAt:string;
};
function invalid():never{throw new PracticeError('invalid_input');}
function exact(input:unknown,keys:string[]):Record<string,unknown>{
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)invalid();
  const own=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input);
  if(own.length!==keys.length||own.some(k=>typeof k!=='string'||!keys.includes(k)))invalid();
  for(const key of keys){const d=descriptors[key];if(!d||!('value'in d)||!d.enumerable)invalid();}
  return input as Record<string,unknown>;
}
function id(value:unknown):string{
  if(typeof value!=='string'||!value.trim()||value!==value.trim()||Array.from(value).length>100||/[\p{Cc}\p{Cf}]/u.test(value))invalid();
  return value;
}
function instant(value:unknown):Date{
  if(typeof value!=='string'||value.length>27)invalid();
  const date=new Date(value);
  if(!Number.isFinite(date.getTime())||date.toISOString()!==value)invalid();
  return date;
}
function annualEnd(start:Date):string{
  const targetYear=start.getUTCFullYear()+1,month=start.getUTCMonth();
  const leap=targetYear%4===0&&(targetYear%100!==0||targetYear%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month];
  if(days===undefined)invalid();
  const end=new Date(start.getTime());
  // setUTCFullYear avoids Date.UTC's special interpretation of years 0..99.
  end.setUTCFullYear(targetYear,month,Math.min(start.getUTCDate(),days));
  if(!Number.isFinite(end.getTime())||end.getTime()<=start.getTime())invalid();
  return end.toISOString();
}
function offer(row:Record<string,unknown>){
  if(row.offerId!=='dimora-full-access-v1'||row.offerVersion!==1)invalid();
}

/** Internal benefit record: no pricing, permission, admin or consent decisions are made here. */
export function makeGiftBenefit(input:unknown):GiftBenefit{
  const row=exact(input,['id','receiptId','accountId','acceptedAt','offerId','offerVersion']);offer(row);
  const accepted=instant(row.acceptedAt);
  return {schemaVersion:1,id:id(row.id),receiptId:id(row.receiptId),accountId:id(row.accountId),offerId:'dimora-full-access-v1',offerVersion:1,startsAt:accepted.toISOString(),endsAt:annualEnd(accepted)};
}

/** Caller must load the benefit for the authenticated account; this is only an interval check. */
export function activeGiftBenefit(input:unknown,now:unknown):boolean{
  const row=exact(input,['schemaVersion','id','receiptId','accountId','offerId','offerVersion','startsAt','endsAt']);
  if(row.schemaVersion!==1)invalid();offer(row);id(row.id);id(row.receiptId);id(row.accountId);
  const starts=instant(row.startsAt),ends=instant(row.endsAt),at=instant(now);
  if(row.endsAt!==annualEnd(starts))invalid();
  return starts.getTime()<=at.getTime()&&at.getTime()<ends.getTime();
}
