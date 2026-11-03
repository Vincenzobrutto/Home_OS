import {HttpException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import type {PrismaService} from '../prisma.service';
import {GiftInvitationError} from './gift-invitations';

export type GiftThrottleScope='landing'|'mutation'|'read';
export type GiftThrottleIdentity={ip:string;accountId?:string};
const WINDOW_MS=15*60*1000,PREFIX='gift:v1:';
const LIMITS={landing:{ip:60},mutation:{ip:240,account:120},read:{ip:1200,account:600}} as const;
function invalid():never{throw new GiftInvitationError('invalid_input');}
function unavailable():never{throw new HttpException({code:'service_unavailable',message:'Servizio temporaneamente non disponibile.'},503);}
function identity(input:GiftThrottleIdentity):GiftThrottleIdentity{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)invalid();
 const descriptors=Object.getOwnPropertyDescriptors(input),keys=Reflect.ownKeys(input);
 if(!Object.hasOwn(descriptors,'ip')||keys.some(key=>typeof key!=='string'||!['ip','accountId'].includes(key)))invalid();
 for(const key of keys){const descriptor=descriptors[key as string];if(!descriptor||!('value'in descriptor)||!descriptor.enumerable)invalid();}
 const ip=descriptors.ip.value,accountId=descriptors.accountId?.value;
 if(typeof ip!=='string'||ip.length>45||ip!==ip.trim()||!isIP(ip))invalid();
 let address=ip;
 if(isIP(ip)===6){
  // Socket IPv6 spellings and IPv4-mapped loopback share a stable bucket.
  try{address=new URL('http://['+ip+']/').hostname.slice(1,-1);}catch{invalid();}
  const mapped=/^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/iu.exec(address);
  if(mapped){const high=parseInt(mapped[1],16),low=parseInt(mapped[2],16);address=[high>>8,high&255,low>>8,low&255].join('.');}
 }
 if(accountId!==undefined&&(typeof accountId!=='string'||accountId.length!==36||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(accountId)))invalid();
 return {ip:address,...(accountId===undefined?{}:{accountId:accountId.toLowerCase()})};
}
function bucket(scope:GiftThrottleScope,kind:'ip'|'account',value:string,window:number){return PREFIX+createHash('sha256').update(JSON.stringify([scope,kind,value,window])).digest('hex');}

/**
 * Server-derived Express IP/account only. Keys are pseudonymous, not anonymous.
 * No credential, invitation, email or document is accepted by this counter API.
 * Fixed windows expire after at most 15 minutes; cleanup affects only expired Gift counters.
 * A denied attempt still commits every counter. No account, billing, consent or Gift state is changed.
 */
export class GiftThrottle{
 constructor(private readonly db:Pick<PrismaService,'$transaction'>,private readonly clock:()=>Date=()=>new Date()){}
 async check(scope:GiftThrottleScope,input:GiftThrottleIdentity):Promise<void>{
  if(typeof scope!=='string'||!Object.hasOwn(LIMITS,scope))invalid();
  const who=identity(input),limits=LIMITS[scope];let now:Date,window:number,expiresAt:Date;
  try{now=this.clock();if(!(now instanceof Date)||!Number.isFinite(now.getTime()))unavailable();window=Math.floor(now.getTime()/WINDOW_MS);expiresAt=new Date((window+1)*WINDOW_MS);if(!Number.isFinite(expiresAt.getTime()))unavailable();}catch{unavailable();}
  const counters:Array<{key:string;max:number}>=[{key:bucket(scope,'ip',who.ip,window),max:limits.ip}];
  if(who.accountId&&'account'in limits)counters.push({key:bucket(scope,'account',who.accountId,window),max:limits.account});
  let blocked:boolean;
  try{
   blocked=await this.db.$transaction(async tx=>{
    let denied=false;
    for(const counter of counters){
     const maximum=counter.max+1;
     // Saturate inside SQL before addition: even an existing MAX_INT cannot overflow.
     const rows=await tx.$queryRaw<Array<{count:number}>>`INSERT INTO "AuthThrottle" (key,count,"expiresAt") VALUES (${counter.key},1,${expiresAt}) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "AuthThrottle".count >= ${counter.max} THEN ${maximum} ELSE "AuthThrottle".count+1 END RETURNING count`;
     if(!Array.isArray(rows)||rows.length!==1||!Number.isSafeInteger(rows[0]?.count)||rows[0].count<1||rows[0].count>maximum)unavailable();
     if(rows[0].count>counter.max)denied=true;
    }
    // Never delete recovery/login counters or unexpired Gift counters.
    await tx.authThrottle.deleteMany({where:{key:{startsWith:PREFIX},expiresAt:{lte:now}}});
    return denied;
   },{maxWait:5000,timeout:15000});
  }catch{unavailable();}
  // Throwing in the transaction would roll back denied attempts and bypass the limit.
  if(blocked)throw new HttpException({code:'rate_limited',message:'Troppi tentativi. Riprova più tardi.'},429);
 }
}
