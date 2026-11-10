import {createHash} from 'node:crypto';
import {PracticeError,requirePractice,sourceReadable,type Actor,type Practice,type Evidence} from './domain';
import {reviewDeedExtraction,type TrustedDeedText} from './deed-extraction';
import {applyReview} from './review';

type Result=ReturnType<typeof reviewDeedExtraction>;
type Binding={candidateId:string;unitId:string;subjectKey:string;factId:string;actorId:string;at:string;acknowledgedDocumentRole:string;reason:string|null};
type RecordItem={id:string;creatorId:string;visibility:'private'|'practice';sourceId:string;version:number;sha256:string;sourceKind:string;createdAt:string;result:Result;bindings:Binding[]};
type Receipt={accountId:string;key:string;digest:string;revision:number;recordId:string;factId:string|null};
type State=Practice&{deedRecords?:RecordItem[];deedReceipts?:Receipt[]};
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fail(code:PracticeError['code']):never{throw new PracticeError(code);}
function object(v:unknown,keys:string[]){if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k)))fail('invalid_input');return v as Record<string,unknown>;}
function text(v:unknown,max=100,multiline=false){if(typeof v!=='string'||!v.trim()||v.length>max||Array.from(v).some(c=>c.charCodeAt(0)<32&&!(multiline&&['\n','\r','\t'].includes(c))))fail('invalid_input');return v.trim();}
function integer(v:unknown){if(!Number.isSafeInteger(v)||Number(v)<1)fail('invalid_input');return Number(v);}
function visible(actor:Actor,p:Practice,r:RecordItem,now:string){const source=p.sources.find(s=>s.id===r.sourceId);return (r.visibility==='practice'||r.creatorId===actor.accountId)&&!!source&&sourceReadable(actor,p,source,now);}
function current(p:Practice,r:RecordItem){const source=p.sources.find(s=>s.id===r.sourceId),file=source?.versions.at(-1),dependency=p.dependents.find(d=>d.id==='deed-record:'+r.id);return !!file&&file.version===r.version&&file.sha256===r.sha256&&source?.kind===r.sourceKind&&dependency?.state==='current';}
function capacity(p:State){if((p.deedRecords?.length||0)>20||(p.deedReceipts?.length||0)>2000||Buffer.byteLength(JSON.stringify([p.deedRecords,p.deedReceipts]),'utf8')>2*1024*1024)fail('invalid_input');}
function prior(p:State,actor:Actor,key:string,digest:string){const r=p.deedReceipts?.find(r=>r.accountId===actor.accountId&&r.key===key);if(r&&r.digest!==digest)fail('idempotency_conflict');return r;}

export function deedProposalsView(actor:Actor,practice:Practice,now:string){
 requirePractice(actor,practice,'read',now);const p=practice as State;
 const records=(p.deedRecords||[]).filter(r=>visible(actor,p,r,now)).map(r=>{
  const metadata={id:r.id,creatorId:r.creatorId,visibility:r.visibility,sourceId:r.sourceId,version:r.version,sha256:r.sha256,sourceKind:r.sourceKind,createdAt:r.createdAt};
  return current(p,r)?{...metadata,status:'current' as const,result:structuredClone(r.result),bindings:structuredClone(r.bindings)}:{...metadata,status:'stale' as const,result:null,bindings:null};
 });
 return {revision:p.revision,records,certification:false as const,canGenerateDraft:false as const};
}

/** INTERNAL only. trusted must come from the authorized server decoder, never HTTP. */
export function stageDeedProposals(actor:Actor,original:Practice,trusted:TrustedDeedText,candidates:unknown,input:unknown,now:string){
 requirePractice(actor,original,'edit',now);if(!Number.isFinite(Date.parse(now)))fail('invalid_input');
 const request=object(input,['key','expectedRevision','visibility']),key=text(request.key,120),expectedRevision=integer(request.expectedRevision);
 if(!['private','practice'].includes(String(request.visibility)))fail('invalid_input');
 const visibility=request.visibility as RecordItem['visibility'],result=reviewDeedExtraction(actor,original,trusted,candidates,now);
 // An actual quote anchors invalidation even if no model candidate was usable.
 const page=trusted.pages.find(p=>p.text.trim());if(!page)fail('invalid_input');
 const anchor:Evidence={sourceId:result.sourceId,version:result.version,sha256:result.sha256,page:page.page,excerpt:Array.from(page.text.trim()).slice(0,1000).join('')};
 const digest=hash(['stage',expectedRevision,visibility,result.fingerprint]),old=prior(original as State,actor,key,digest);
 if(old){const existing=(original as State).deedRecords?.find(r=>r.id===old.recordId);if(!existing||!visible(actor,original,existing,now))fail('access_denied');if(!current(original,existing))fail('source_changed');return {practice:structuredClone(original),receipt:structuredClone(old),replay:true};}
 if(original.revision!==expectedRevision)fail('revision_conflict');
 const p=structuredClone(original) as State;p.deedRecords??=[];p.deedReceipts??=[];
 const id='deed_'+hash([actor.accountId,p.id,key]).slice(0,40);if(p.deedRecords.some(r=>r.id===id))fail('idempotency_conflict');
 p.deedRecords.push({id,creatorId:actor.accountId,visibility,sourceId:result.sourceId,version:result.version,sha256:result.sha256,sourceKind:p.sources.find(s=>s.id===result.sourceId)!.kind,createdAt:now,result,bindings:[]});
 p.dependents.push({id:'deed-record:'+id,state:'current',sources:[anchor]});p.revision++;
 const receipt:Receipt={accountId:actor.accountId,key,digest,revision:p.revision,recordId:id,factId:null};p.deedReceipts.push(receipt);capacity(p);
 p.events.push({id:p.events.length+1,actorId:actor.accountId,at:now,operation:'deed:stage',sourceId:result.sourceId,revision:p.revision});
 return {practice:p,receipt,replay:false};
}

/** Explicit human association only; the imported fact remains proposed. */
export function bindDeedProposal(actor:Actor,original:Practice,input:unknown,now:string){
 requirePractice(actor,original,'edit',now);if(!Number.isFinite(Date.parse(now)))fail('invalid_input');
 const r=object(input,['key','expectedRevision','recordId','candidateId','expectedFingerprint','unitId','subjectKey','acknowledgedDocumentRole','reason']);
 const key=text(r.key,120),expectedRevision=integer(r.expectedRevision),recordId=text(r.recordId),candidateId=text(r.candidateId),fingerprint=text(r.expectedFingerprint,64),unitId=text(r.unitId),subjectKey=text(r.subjectKey),acknowledgedDocumentRole=text(r.acknowledgedDocumentRole),reason=r.reason===null||r.reason===undefined?null:text(r.reason,1000,true);
 if(!/^[a-f0-9]{64}$/u.test(fingerprint))fail('invalid_input');
 const record=(original as State).deedRecords?.find(r=>r.id===recordId);
 if(!record||!visible(actor,original,record,now))fail('access_denied');if(!current(original,record))fail('source_changed');
 if(record.result.fingerprint!==fingerprint)fail('source_changed');
 const candidate=record.result.proposals.find(p=>p.candidateId===candidateId);if(!candidate||candidate.proposedDocumentRole!==acknowledgedDocumentRole||!original.units?.some(u=>u.id===unitId))fail('invalid_input');
 const digest=hash(['bind',expectedRevision,recordId,candidateId,fingerprint,unitId,subjectKey,acknowledgedDocumentRole,reason]),old=prior(original as State,actor,key,digest);
 if(old)return {practice:structuredClone(original),receipt:structuredClone(old),replay:true};
 if(original.revision!==expectedRevision)fail('revision_conflict');
 if(record.bindings.some(b=>b.candidateId===candidateId&&b.unitId===unitId&&b.subjectKey===subjectKey))fail('idempotency_conflict');
 const factId='deed_fact_'+hash([actor.accountId,original.id,key]).slice(0,40),reviewKey='deed_bind_'+hash([actor.accountId,original.id,key]).slice(0,40);
 const proposal=applyReview(actor,original,{key:reviewKey,expectedRevision,command:{operation:'propose',id:factId,unitId,subjectKey,field:candidate.field,value:candidate.proposedValue,origin:'extracted',visibility:record.visibility,evidence:[candidate.evidence]}},now);
 const p=proposal.practice as State,target=p.deedRecords!.find(r=>r.id===recordId)!;p.deedReceipts??=[];
 target.bindings.push({candidateId,unitId,subjectKey,factId,actorId:actor.accountId,at:now,acknowledgedDocumentRole,reason});
 const receipt:Receipt={accountId:actor.accountId,key,digest,revision:p.revision,recordId,factId};p.deedReceipts.push(receipt);capacity(p);
 return {practice:p,receipt,replay:false};
}
