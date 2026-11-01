import type {ApiTransport} from '../api/transport';
import {serviceError} from '../api/errors';
import {parseGiftCapabilities,parseGiftBenefits,parseGiftDocuments,parseGiftRelease,parseGiftInvitations,parseGiftInvitationCreated,parseGiftReissued,parseGiftRevocation,parseGiftLanding,parseGiftPreview,parseGiftClaim,parseGiftAcceptance,parseGiftResume,parseGiftCancellation,type GiftDocuments,type GiftAcceptance,type GiftResume} from './gift-wire';
export type GiftAgencyScope={accountId:string;agencyId:string;practiceId:string};
export type GiftReleaseInput={digitalPlan?:{planId:string;expectedPlanVersion:number;reviewed:true};expectedRevision:number;expectedSourceVersion:number;expectedSha256:string;title:string;origin:'received'|'agency_generated';finalDocumentConfirmed:true;releaseApproved:true};
export type GiftCreateInput={expectedRevision:number;documents:{sourceId:string;version:number;sha256:string}[];recipientEmail:string;stipulationCompleted:true;releaseApproved:true;annualBenefit:boolean};
export type GiftReissueInput={expectedRevision:number;expectedVersion:number};
export type GiftBeginInput={secret:string;expectedInvitationVersion:number;home:{name:string;address:string}};
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
function invalid():never{throw new TypeError('Invalid Gift request');}
function object(input:unknown,keys:string[]):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)invalid();
 const own=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input);if(own.length!==keys.length||own.some(key=>typeof key!=='string'||!keys.includes(key)))invalid();
 for(const key of keys){const d=descriptors[key];if(!d||!('value'in d)||!d.enumerable)invalid();}return input as Record<string,unknown>;
}
function text(input:unknown,max:number){if(typeof input!=='string'||input.length>max||!input.trim()||/[\p{Cc}\p{Cf}]/u.test(input))invalid();return input.trim();}
function uuid(input:unknown){if(typeof input!=='string'||input.length!==36||!UUID.test(input))invalid();return input.toLowerCase();}
function source(input:unknown){const value=text(input,100);if(value!==input||value==='.'||value==='..')invalid();return value;}
function positive(input:unknown){if(!Number.isSafeInteger(input)||Number(input)<1)invalid();return Number(input);}
function hash(input:unknown){if(typeof input!=='string'||input.length!==64||!/^[a-f0-9]{64}$/u.test(input))invalid();return input;}
function secret(input:unknown){if(typeof input!=='string'||input.length!==43||!/^[A-Za-z0-9_-]{43}$/u.test(input))invalid();return input;}
function key(input:unknown){return text(input,120);}
function homeText(input:unknown,max:number){if(typeof input!=='string'||!input.trim()||Array.from(input.trim()).length>max||Array.from(input).some(c=>{const n=c.codePointAt(0)!;return n<32||n>=127&&n<=159;}))invalid();return input.trim();}
function scope(input:GiftAgencyScope){const r=object(input,['accountId','agencyId','practiceId']);return {accountId:uuid(r.accountId),agencyId:uuid(r.agencyId),practiceId:uuid(r.practiceId)};}
function root(s:GiftAgencyScope){return '/agencies/'+encodeURIComponent(s.agencyId)+'/practices/'+encodeURIComponent(s.practiceId);}
function invitationPath(id:string){return '/gift-invitations/'+encodeURIComponent(id);}
function jobPath(id:string){return '/gift-acceptances/'+encodeURIComponent(id);}
function releaseMap(input:NonNullable<GiftReleaseInput['digitalPlan']>){const p=object(input,['planId','expectedPlanVersion','reviewed']);if(p.reviewed!==true)invalid();return {planId:source(p.planId),expectedPlanVersion:positive(p.expectedPlanVersion),reviewed:true as const};}
function releaseInput(input:GiftReleaseInput):GiftReleaseInput{
 const r=object(input,['expectedRevision','expectedSourceVersion','expectedSha256','title','origin','finalDocumentConfirmed','releaseApproved',...(input.digitalPlan?['digitalPlan']:[])]);if(r.finalDocumentConfirmed!==true||r.releaseApproved!==true||r.origin!=='received'&&r.origin!=='agency_generated')invalid();return {expectedRevision:positive(r.expectedRevision),expectedSourceVersion:positive(r.expectedSourceVersion),expectedSha256:hash(r.expectedSha256),title:text(r.title,300),origin:r.origin,finalDocumentConfirmed:true,releaseApproved:true,...(input.digitalPlan?{digitalPlan:releaseMap(input.digitalPlan)}:{})};
}
function createInput(input:GiftCreateInput):GiftCreateInput{
 const r=object(input,['expectedRevision','documents','recipientEmail','stipulationCompleted','releaseApproved','annualBenefit']);if(r.stipulationCompleted!==true||r.releaseApproved!==true||typeof r.annualBenefit!=='boolean'||!Array.isArray(r.documents)||Object.getPrototypeOf(r.documents)!==Array.prototype||r.documents.length<1||r.documents.length>50||Reflect.ownKeys(r.documents).length!==r.documents.length+1)invalid();
 const documents=[];for(let i=0;i<r.documents.length;i++){const d=Object.getOwnPropertyDescriptor(r.documents,String(i));if(!d||!('value'in d)||!d.enumerable)invalid();const row=object(d.value,['sourceId','version','sha256']);documents.push({sourceId:source(row.sourceId),version:positive(row.version),sha256:hash(row.sha256)});}if(new Set(documents.map(row=>row.sourceId)).size!==documents.length)invalid();documents.sort((a,b)=>a.sourceId<b.sourceId?-1:a.sourceId>b.sourceId?1:0);
 const recipientEmail=text(r.recipientEmail,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(recipientEmail))invalid();return {expectedRevision:positive(r.expectedRevision),documents,recipientEmail,stipulationCompleted:true,releaseApproved:true,annualBenefit:r.annualBenefit};
}
function beginInput(input:GiftBeginInput):GiftBeginInput{const r=object(input,['secret','expectedInvitationVersion','home']),home=object(r.home,['name','address']);return {secret:secret(r.secret),expectedInvitationVersion:positive(r.expectedInvitationVersion),home:{name:homeText(home.name,80),address:homeText(home.address,200)}};}
function same(actual:string,expected:string){if(actual!==expected)throw serviceError(200);}
function documentsInScope(value:GiftDocuments,s:GiftAgencyScope){same(value.practiceId,s.practiceId);for(const item of value.documents)if(item.state==='current')same(item.descriptor.agencyId,s.agencyId);return value;}
function owner<T extends GiftAcceptance|GiftResume>(value:T,accountId:string):T{if(value.state==='accepted'&&value.benefit)same(value.benefit.accountId,accountId);return value;}

/** One injected V5 transport. Credentials are only request bodies; this client owns no token/cache/retry state. */
export class GiftApi{
 private readonly transport:ApiTransport;
 constructor(transport:ApiTransport){this.transport=transport;}
 async capabilities(accountId:string,signal?:AbortSignal){const account=uuid(accountId);return parseGiftCapabilities(await this.transport.callJson<unknown>('/gift-capabilities',{accountId:account,signal}));}
 async benefits(accountId:string,signal?:AbortSignal){const account=uuid(accountId);return parseGiftBenefits(await this.transport.callJson<unknown>('/gift-benefits',{accountId:account,signal}));}
 async documents(input:GiftAgencyScope,signal?:AbortSignal){const s=scope(input);return documentsInScope(parseGiftDocuments(await this.transport.callJson<unknown>(root(s)+'/gift-documents',{accountId:s.accountId,signal})),s);}
 async listInvitations(input:GiftAgencyScope,signal?:AbortSignal){const s=scope(input),out=parseGiftInvitations(await this.transport.callJson<unknown>(root(s)+'/gift-invitations',{accountId:s.accountId,signal}));same(out.practiceId,s.practiceId);return out;}
 async releaseDocument(input:GiftAgencyScope,sourceId:string,body:GiftReleaseInput,idempotencyKey:string,signal?:AbortSignal){
  const s=scope(input),id=source(sourceId),command=releaseInput(body),requestKey=key(idempotencyKey),out=parseGiftRelease(await this.transport.callJson<unknown>(root(s)+'/sources/'+encodeURIComponent(id)+'/gift-release',{method:'POST',accountId:s.accountId,body:command,idempotencyKey:requestKey,signal}));documentsInScope(out.metadata,s);
  const selected=out.metadata.documents.find(item=>item.sourceId===id);if(!selected||selected.state!=='current'||selected.sourceVersion!==command.expectedSourceVersion||selected.sha256!==command.expectedSha256)throw serviceError(200);return out;
 }
 async createInvitation(input:GiftAgencyScope,body:GiftCreateInput,idempotencyKey:string,signal?:AbortSignal){const s=scope(input),command=createInput(body),requestKey=key(idempotencyKey);return parseGiftInvitationCreated(await this.transport.callJson<unknown>(root(s)+'/gift-invitations',{method:'POST',accountId:s.accountId,body:command,idempotencyKey:requestKey,signal}));}
 async reissueInvitation(input:GiftAgencyScope,invitationId:string,body:GiftReissueInput,idempotencyKey:string,signal?:AbortSignal){const s=scope(input),id=uuid(invitationId),r=object(body,['expectedRevision','expectedVersion']),command={expectedRevision:positive(r.expectedRevision),expectedVersion:positive(r.expectedVersion)},requestKey=key(idempotencyKey);return parseGiftReissued(await this.transport.callJson<unknown>(root(s)+'/gift-invitations/'+encodeURIComponent(id)+'/reissue',{method:'POST',accountId:s.accountId,body:command,idempotencyKey:requestKey,signal}));}
 async revokeInvitation(input:GiftAgencyScope,invitationId:string,expectedVersion:number,signal?:AbortSignal){const s=scope(input),id=uuid(invitationId),version=positive(expectedVersion),out=parseGiftRevocation(await this.transport.callJson<unknown>(root(s)+'/gift-invitations/'+encodeURIComponent(id)+'/revoke',{method:'POST',accountId:s.accountId,body:{expectedVersion:version},signal}));same(out.id,id);return out;}
 async landing(invitationId:string,credential:string,signal?:AbortSignal){const id=uuid(invitationId),token=secret(credential),out=parseGiftLanding(await this.transport.mutate<unknown>(invitationPath(id)+'/landing',{body:{secret:token},signal}));same(out.id,id);return out;}
 async preview(accountId:string,invitationId:string,credential:string,signal?:AbortSignal){const account=uuid(accountId),id=uuid(invitationId),token=secret(credential),out=parseGiftPreview(await this.transport.callJson<unknown>(invitationPath(id)+'/preview',{method:'POST',accountId:account,body:{secret:token},signal}));same(out.id,id);return out;}
 async claim(accountId:string,invitationId:string,credential:string,expectedVersion:number,signal?:AbortSignal){const account=uuid(accountId),id=uuid(invitationId),token=secret(credential),version=positive(expectedVersion),out=parseGiftClaim(await this.transport.callJson<unknown>(invitationPath(id)+'/claim',{method:'POST',accountId:account,body:{secret:token,expectedVersion:version},signal}));same(out.id,id);return out;}
 async begin(accountId:string,invitationId:string,body:GiftBeginInput,idempotencyKey:string,signal?:AbortSignal){const account=uuid(accountId),id=uuid(invitationId),command=beginInput(body),requestKey=key(idempotencyKey);return owner(parseGiftAcceptance(await this.transport.callJson<unknown>(invitationPath(id)+'/acceptances',{method:'POST',accountId:account,body:command,idempotencyKey:requestKey,signal})),account);}
 async resume(accountId:string,invitationId:string,signal?:AbortSignal){const account=uuid(accountId),id=uuid(invitationId);return owner(parseGiftResume(await this.transport.callJson<unknown>(invitationPath(id)+'/my-acceptance',{accountId:account,signal})),account);}
 async status(accountId:string,jobId:string,signal?:AbortSignal){const account=uuid(accountId),id=uuid(jobId),out=owner(parseGiftAcceptance(await this.transport.callJson<unknown>(jobPath(id),{accountId:account,signal})),account);same(out.jobId,id);return out;}
 async cancel(accountId:string,jobId:string,signal?:AbortSignal){const account=uuid(accountId),id=uuid(jobId),out=parseGiftCancellation(await this.transport.callJson<unknown>(jobPath(id)+'/cancel',{method:'POST',accountId:account,body:{},signal}));same(out.jobId,id);return out;}
}
