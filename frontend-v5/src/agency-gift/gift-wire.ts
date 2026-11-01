import {serviceError} from '../api/errors';
export type DigitalPlanSummary={planId:string;geometryRevision:number;page:number;roomCount:number;qualification:'estimated'|'reviewed'|'unverified';caveats:string[]};
export type GiftSurface={kind:'net'|'cadastral'|'commercial';qualification:'estimated'|'reviewed'|'unverified';method:string;geometryRevision:number;caveats:string[]};
export type GiftDescriptor={agencyId:string;practiceId:string;sourceId:string;sourceVersion:number;sha256:string;metadataVersion:number;origin:'received'|'agency_generated';lifecycle:'draft'|'final'|'signed';author:string;title:string;surface?:GiftSurface;digitalPlan?:DigitalPlanSummary};
export type GiftDocumentRow={sourceId:string;sourceVersion:number;sha256:string;filename:string;digitalPlans?:{id:string;version:number;geometryRevision:number;roomCount:number;pending:boolean}[]}&({state:'missing'|'stale'}|{state:'current';metadataVersion:number;descriptor:GiftDescriptor});
export type GiftDocuments={practiceId:string;revision:number;documents:GiftDocumentRow[];certification:false};
export type GiftRelease={replay:boolean;metadata:GiftDocuments};
export type GiftInvitationState='invited'|'claimed'|'revoked';
export type GiftInvitationCreated={id:string;version:number;state:'invited'|'claimed';secret:string|null;replay:boolean;requiresReissue:boolean};
export type GiftReissued=Omit<GiftInvitationCreated,'state'>&{state:GiftInvitationState};
export type GiftInvitations={practiceId:string;accepted:boolean;invitations:{id:string;version:number;state:GiftInvitationState;createdAt:string;expiresAt:string;recipientEmail:string}[]};
export type GiftCapabilities={enabled:boolean;requiresVerifiedEmail:true};
export type GiftBenefits={fullAccess:boolean;scope:'all_owner_features';validUntil:string|null};
export type GiftLanding={id:string;version:number;requiresAccount:true};
export type GiftAnnualBenefit={requested:false}|{requested:true;offerId:'dimora-full-access-v1';offerVersion:1;activated:false};
export type GiftPreviewDocument={title:string;author:string;origin:'received'|'agency_generated';lifecycle:'final'|'signed';signatureVerification:'not_assessed';surface?:GiftSurface;digitalPlan?:DigitalPlanSummary};
export type GiftPreview={id:string;version:number;state:'invited'|'claimed';agencyName:string;documents:GiftPreviewDocument[];annualBenefit:GiftAnnualBenefit};
export type GiftClaim={id:string;version:number;state:'claimed';replay:boolean};
export type GiftRevocation={id:string;version:number;state:'revoked';replay:boolean};
export type GiftBenefit={schemaVersion:1;id:string;receiptId:string;accountId:string;offerId:'dimora-full-access-v1';offerVersion:1;startsAt:string;endsAt:string};
export type GiftAccepted={jobId:string;state:'accepted';receiptId:string;receiptVersion:1;replay:boolean;homeId:string;acceptedAt:string;documents:{documentId:string;sha256:string}[];benefit:GiftBenefit|null;createsHome:true;activatesBenefit:boolean};
export type GiftPendingState='queued'|'staging'|'ready'|'retryable'|'blocked_review'|'failed_final'|'cancelled';
export type GiftPending={jobId:string;state:GiftPendingState;version:number;replay:boolean;createsHome:false;activatesBenefit:false;progress?:{total:number;admitted:number}};
export type GiftAcceptance=GiftAccepted|GiftPending;
export type GiftResume=GiftAcceptance|{state:'not_started'};
export type GiftCancellation={jobId:string;state:'cancelled';replay:boolean};
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
function invalid():never{throw serviceError(200);}
function parse<T>(work:()=>T):T{try{return work();}catch{throw serviceError(200);}}
function object(input:unknown,required:string[],optional:string[]=[]):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)invalid();
 const keys=Reflect.ownKeys(input),allowed=[...required,...optional],descriptors=Object.getOwnPropertyDescriptors(input);
 if(required.some(key=>!Object.hasOwn(descriptors,key))||keys.some(key=>typeof key!=='string'||!allowed.includes(key)))invalid();
 for(const key of keys){const d=descriptors[key as string];if(!d||!('value'in d)||!d.enumerable)invalid();}
 return input as Record<string,unknown>;
}
function text(input:unknown,max:number):string{if(typeof input!=='string'||input!==input.trim()||!input||input.length>max||/[\p{Cc}\p{Cf}]/u.test(input))invalid();return input;}
function uuid(input:unknown){const value=text(input,36);if(value.length!==36||!UUID.test(value))invalid();return value.toLowerCase();}
function hash(input:unknown){if(typeof input!=='string'||input.length!==64||!/^[a-f0-9]{64}$/u.test(input))invalid();return input;}
function token(input:unknown){if(typeof input!=='string'||input.length!==43||!/^[A-Za-z0-9_-]{43}$/u.test(input))invalid();return input;}
function integer(input:unknown,min=1,max=Number.MAX_SAFE_INTEGER){if(!Number.isSafeInteger(input)||Number(input)<min||Number(input)>max)invalid();return Number(input);}
function boolean(input:unknown):boolean{if(typeof input!=='boolean')invalid();return input;}
function oneOf<T extends string>(input:unknown,values:readonly T[]):T{if(typeof input!=='string'||!values.includes(input as T))invalid();return input as T;}
function date(input:unknown){const value=text(input,27),at=new Date(value);if(!Number.isFinite(at.getTime())||at.toISOString()!==value)invalid();return value;}
function email(input:unknown){const value=text(input,254);if(value!==value.toLowerCase()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value))invalid();return value;}
function array<T>(input:unknown,min:number,max:number,item:(value:unknown)=>T):T[]{
 if(!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype||input.length<min||input.length>max||Reflect.ownKeys(input).length!==input.length+1)invalid();
 const result:T[]=[];for(let i=0;i<input.length;i++){const d=Object.getOwnPropertyDescriptor(input,String(i));if(!d||!('value'in d)||!d.enumerable)invalid();result.push(item(d.value));}return result;
}
function unique(values:string[]){if(new Set(values).size!==values.length)invalid();}
function surface(input:unknown):GiftSurface{
 const r=object(input,['kind','qualification','method','geometryRevision','caveats']),qualification=oneOf(r.qualification,['estimated','reviewed','unverified'] as const),caveats=array(r.caveats,0,30,value=>text(value,500));unique(caveats);if(qualification==='estimated'&&!caveats.length)invalid();
 return {kind:oneOf(r.kind,['net','cadastral','commercial'] as const),qualification,method:text(r.method,200),geometryRevision:integer(r.geometryRevision),caveats};
}
function mapSummary(input:unknown):DigitalPlanSummary{const p=object(input,['planId','geometryRevision','page','roomCount','qualification','caveats']);return {planId:text(p.planId,120),geometryRevision:integer(p.geometryRevision),page:integer(p.page,1,20),roomCount:integer(p.roomCount,1,100),qualification:oneOf(p.qualification,['estimated','reviewed','unverified'] as const),caveats:array(p.caveats,1,220,v=>text(v,500))};}
function descriptor(input:unknown):GiftDescriptor{
 const r=object(input,['agencyId','practiceId','sourceId','sourceVersion','sha256','metadataVersion','origin','lifecycle','author','title'],['surface','digitalPlan']);
 return {agencyId:uuid(r.agencyId),practiceId:uuid(r.practiceId),sourceId:text(r.sourceId,100),sourceVersion:integer(r.sourceVersion),sha256:hash(r.sha256),metadataVersion:integer(r.metadataVersion),origin:oneOf(r.origin,['received','agency_generated'] as const),lifecycle:oneOf(r.lifecycle,['draft','final','signed'] as const),author:text(r.author,200),title:text(r.title,300),...(Object.hasOwn(r,'surface')?{surface:surface(r.surface)}:{}),...(r.digitalPlan?{digitalPlan:mapSummary(r.digitalPlan)}:{})};
}
function documents(input:unknown):GiftDocuments{
 const r=object(input,['practiceId','revision','documents','certification']),practiceId=uuid(r.practiceId);if(r.certification!==false)invalid();
 const items=array(r.documents,0,Number.MAX_SAFE_INTEGER,value=>{
  const row=object(value,['sourceId','sourceVersion','sha256','filename','state'],['metadataVersion','descriptor','digitalPlans']),state=oneOf(row.state,['missing','stale','current'] as const),base={sourceId:text(row.sourceId,100),sourceVersion:integer(row.sourceVersion),sha256:hash(row.sha256),filename:text(row.filename,4096),...(row.digitalPlans?{digitalPlans:array(row.digitalPlans,0,100,v=>{const p=object(v,['id','version','geometryRevision','roomCount','pending']);return {id:text(p.id,120),version:integer(p.version),geometryRevision:integer(p.geometryRevision),roomCount:integer(p.roomCount,0,100),pending:boolean(p.pending)};})}:{})};
  if(state!=='current'){if(Object.hasOwn(row,'descriptor')||Object.hasOwn(row,'metadataVersion'))invalid();return {...base,state};}
  const d=descriptor(row.descriptor),metadataVersion=integer(row.metadataVersion);if(d.practiceId!==practiceId||d.sourceId!==base.sourceId||d.sourceVersion!==base.sourceVersion||d.sha256!==base.sha256||d.metadataVersion!==metadataVersion)invalid();return {...base,state,metadataVersion,descriptor:d};
 });unique(items.map(item=>item.sourceId));return {practiceId,revision:integer(r.revision),documents:items,certification:false};
}
function annual(input:unknown):GiftAnnualBenefit{
 const r=object(input,['requested'],['offerId','offerVersion','activated']);if(r.requested===false){object(input,['requested']);return {requested:false};}
 if(r.requested!==true||r.offerId!=='dimora-full-access-v1'||r.offerVersion!==1||r.activated!==false)invalid();return {requested:true,offerId:'dimora-full-access-v1',offerVersion:1,activated:false};
}
function endOfYear(start:string){
 const end=new Date(start),year=end.getUTCFullYear()+1,month=end.getUTCMonth(),leap=year%4===0&&(year%100!==0||year%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month]!;end.setUTCFullYear(year,month,Math.min(end.getUTCDate(),days));return end.toISOString();
}
function benefit(input:unknown,receiptId:string,acceptedAt:string):GiftBenefit{
 const r=object(input,['schemaVersion','id','receiptId','accountId','offerId','offerVersion','startsAt','endsAt']);if(r.schemaVersion!==1||r.offerId!=='dimora-full-access-v1'||r.offerVersion!==1)invalid();const startsAt=date(r.startsAt),endsAt=date(r.endsAt),ownerReceipt=uuid(r.receiptId);if(ownerReceipt!==receiptId||startsAt!==acceptedAt||endsAt!==endOfYear(startsAt))invalid();
 return {schemaVersion:1,id:uuid(r.id),receiptId:ownerReceipt,accountId:uuid(r.accountId),offerId:'dimora-full-access-v1',offerVersion:1,startsAt,endsAt};
}
function acceptance(input:unknown):GiftAcceptance{
 const probe=object(input,['jobId','state','replay','createsHome','activatesBenefit'],['version','progress','receiptId','receiptVersion','homeId','acceptedAt','documents','benefit']);
 if(probe.state==='accepted'){
  const r=object(input,['jobId','state','receiptId','receiptVersion','replay','homeId','acceptedAt','documents','benefit','createsHome','activatesBenefit']);if(r.receiptVersion!==1||r.createsHome!==true)invalid();const receiptId=uuid(r.receiptId),acceptedAt=date(r.acceptedAt),grant=r.benefit===null?null:benefit(r.benefit,receiptId,acceptedAt);if(r.activatesBenefit!==(grant!==null))invalid();
  const items=array(r.documents,1,50,value=>{const item=object(value,['documentId','sha256']);return {documentId:uuid(item.documentId),sha256:hash(item.sha256)};});unique(items.map(item=>item.documentId));
  return {jobId:uuid(r.jobId),state:'accepted',receiptId,receiptVersion:1,replay:boolean(r.replay),homeId:uuid(r.homeId),acceptedAt,documents:items,benefit:grant,createsHome:true,activatesBenefit:grant!==null};
 }
 const r=object(input,['jobId','state','version','replay','createsHome','activatesBenefit'],['progress']),state=oneOf(r.state,['queued','staging','ready','retryable','blocked_review','failed_final','cancelled'] as const);if(r.createsHome!==false||r.activatesBenefit!==false)invalid();let progress:GiftPending['progress'];
 if(Object.hasOwn(r,'progress')){const p=object(r.progress,['total','admitted']),total=integer(p.total,0,50),admitted=integer(p.admitted,0,total);if(total===0&&!['cancelled','failed_final'].includes(state))invalid();progress={total,admitted};}
 return {jobId:uuid(r.jobId),state,version:integer(r.version),replay:boolean(r.replay),createsHome:false,activatesBenefit:false,...(progress?{progress}:{})};
}

export const parseGiftCapabilities=(input:unknown):GiftCapabilities=>parse(()=>{const r=object(input,['enabled','requiresVerifiedEmail']);if(r.requiresVerifiedEmail!==true)invalid();return {enabled:boolean(r.enabled),requiresVerifiedEmail:true};});
export const parseGiftBenefits=(input:unknown):GiftBenefits=>parse(()=>{const r=object(input,['fullAccess','scope','validUntil']),fullAccess=boolean(r.fullAccess);if(r.scope!=='all_owner_features'||fullAccess&&r.validUntil===null||!fullAccess&&r.validUntil!==null)invalid();return {fullAccess,scope:'all_owner_features',validUntil:r.validUntil===null?null:date(r.validUntil)};});
export const parseGiftDocuments=(input:unknown):GiftDocuments=>parse(()=>documents(input));
export const parseGiftRelease=(input:unknown):GiftRelease=>parse(()=>{const r=object(input,['replay','metadata']);return {replay:boolean(r.replay),metadata:documents(r.metadata)};});
export const parseGiftInvitationCreated=(input:unknown):GiftInvitationCreated=>parse(()=>{
 const r=object(input,['id','version','state','secret','replay','requiresReissue']),replay=boolean(r.replay),version=integer(r.version),state=oneOf(r.state,['invited','claimed'] as const);if(replay?(r.secret!==null||r.requiresReissue!==true):(r.requiresReissue!==false||state!=='invited'||version!==1))invalid();
 return {id:uuid(r.id),version,state,secret:replay?null:token(r.secret),replay,requiresReissue:replay};
});
export const parseGiftReissued=(input:unknown):GiftReissued=>parse(()=>{
 const r=object(input,['id','version','state','secret','replay','requiresReissue']),replay=boolean(r.replay),version=integer(r.version),state=oneOf(r.state,['invited','claimed','revoked'] as const);if(replay?(r.secret!==null||r.requiresReissue!==true):(r.requiresReissue!==false||state!=='invited'||version!==1))invalid();
 return {id:uuid(r.id),version,state,secret:replay?null:token(r.secret),replay,requiresReissue:replay};
});
export const parseGiftInvitations=(input:unknown):GiftInvitations=>parse(()=>{
 const r=object(input,['practiceId','accepted','invitations']),invitations=array(r.invitations,0,100,value=>{const item=object(value,['id','version','state','createdAt','expiresAt','recipientEmail']),createdAt=date(item.createdAt),expiresAt=date(item.expiresAt);if(Date.parse(expiresAt)<=Date.parse(createdAt))invalid();return {id:uuid(item.id),version:integer(item.version),state:oneOf(item.state,['invited','claimed','revoked'] as const),createdAt,expiresAt,recipientEmail:email(item.recipientEmail)};});unique(invitations.map(item=>item.id));return {practiceId:uuid(r.practiceId),accepted:boolean(r.accepted),invitations};
});
export const parseGiftLanding=(input:unknown):GiftLanding=>parse(()=>{const r=object(input,['id','version','requiresAccount']);if(r.requiresAccount!==true)invalid();return {id:uuid(r.id),version:integer(r.version),requiresAccount:true};});
export const parseGiftPreview=(input:unknown):GiftPreview=>parse(()=>{
 const r=object(input,['id','version','state','agencyName','documents','annualBenefit']),items=array(r.documents,1,50,value=>{const d=object(value,['title','author','origin','lifecycle','signatureVerification'],['surface','digitalPlan']);if(d.signatureVerification!=='not_assessed')invalid();return {title:text(d.title,300),author:text(d.author,200),origin:oneOf(d.origin,['received','agency_generated'] as const),lifecycle:oneOf(d.lifecycle,['final','signed'] as const),signatureVerification:'not_assessed' as const,...(Object.hasOwn(d,'surface')?{surface:surface(d.surface)}:{}),...(d.digitalPlan?{digitalPlan:mapSummary(d.digitalPlan)}:{})};});
 return {id:uuid(r.id),version:integer(r.version),state:oneOf(r.state,['invited','claimed'] as const),agencyName:text(r.agencyName,200),documents:items,annualBenefit:annual(r.annualBenefit)};
});
export const parseGiftClaim=(input:unknown):GiftClaim=>parse(()=>{const r=object(input,['id','version','state','replay']);if(r.state!=='claimed')invalid();return {id:uuid(r.id),version:integer(r.version),state:'claimed',replay:boolean(r.replay)};});
export const parseGiftRevocation=(input:unknown):GiftRevocation=>parse(()=>{const r=object(input,['id','version','state','replay']);if(r.state!=='revoked')invalid();return {id:uuid(r.id),version:integer(r.version),state:'revoked',replay:boolean(r.replay)};});
export const parseGiftAcceptance=(input:unknown):GiftAcceptance=>parse(()=>acceptance(input));
export const parseGiftResume=(input:unknown):GiftResume=>parse(()=>{if(input&&typeof input==='object'&&!Array.isArray(input)&&Object.getOwnPropertyDescriptor(input,'state')?.value==='not_started'){object(input,['state']);return {state:'not_started'};}return acceptance(input);});
export const parseGiftCancellation=(input:unknown):GiftCancellation=>parse(()=>{const r=object(input,['jobId','state','replay']);if(r.state!=='cancelled')invalid();return {jobId:uuid(r.jobId),state:'cancelled',replay:boolean(r.replay)};});
