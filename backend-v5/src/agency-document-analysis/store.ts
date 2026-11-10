import {randomBytes,randomUUID} from 'node:crypto';
import {Prisma,type AgencyDocumentAnalysisJob as Job,type AgencyDocumentAnalysisDispatch as Dispatch} from '../../generated/client';
import type {PrismaService} from '../prisma.service';
import {AgencyPracticesStore} from '../agency-practices/store';
import {PracticeError,sourceReadable,type Actor,type Practice} from '../agency-practices/domain';
import {stageDeedProposals} from '../agency-practices/deed-records';
import type {TrustedDeedText} from '../agency-practices/deed-extraction';
import {DOCUMENT_ANALYSIS_PURPOSE,analysisFail,analysisDigest,analysisText,analysisInteger,analysisPages,analysisObject,analysisUsage,analysisCost,parseDocumentAnalysisConfiguration,parseDocumentAnalysisJobBody,parseDocumentAnalysisSelection,type DocumentAnalysisScope as Scope,type DocumentAnalysisConfiguration as Configuration,type DocumentAnalysisSelection as Selection,type DocumentAnalysisProof as Proof,type DocumentAnalysisJobBody,type DocumentAnalysisOffer,type DocumentAnalysisJobView,type DocumentAnalysisWorkJob,type DocumentAnalysisLease as Lease,type DocumentAnalysisPhase as Phase,type DocumentAnalysisUsage as Usage,type DocumentAnalysisState} from './domain';

type Tx=Prisma.TransactionClient;
const json=(value:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value));
const instant=()=>new Date();
const hash=(value:string)=>analysisDigest(value);
const terminal=['completed_with_proposals','completed_unusable','discarded_source_changed','denied_after_revocation','failed_before_dispatch'];
const transactionOptions={maxWait:5000,timeout:15000};
function identity(value:string){if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value))analysisFail();}
function scope(scope:Scope){identity(scope.accountId);identity(scope.agencyId);identity(scope.practiceId);}
function key(input:string){const k=analysisText(input);if(k.length<16)analysisFail();return k;}
function digest(input:string){if(typeof input!=='string'||!/^[a-f0-9]{64}$/u.test(input))analysisFail();return input;}
function proof(input:unknown):Proof{
 const r=analysisObject(input,['sourceId','version','sha256','sourceKind','pages']);
 if(!['deed','succession','cadastral'].includes(String(r.sourceKind)))analysisFail();
 return {sourceId:analysisText(r.sourceId,100),version:analysisInteger(r.version,1),sha256:digest(r.sha256 as string),sourceKind:r.sourceKind as Proof['sourceKind'],pages:analysisPages(r.pages)};
}
function captured(row:Job):{proof:Proof;config:Configuration}{return {proof:proof(row.proof),config:parseDocumentAnalysisConfiguration(row.configuration)};}
function jobScope(j:Job):Scope{return {accountId:j.accountId,agencyId:j.agencyId,practiceId:j.practiceId};}
function readable(actor:Actor,p:Practice,j:Job){const s=p.sources.find(s=>s.id===proof(j.proof).sourceId);if(actor.accountId!==j.accountId||!s||!sourceReadable(actor,p,s,new Date().toISOString()))analysisFail('access_denied');}
function current(actor:Actor,p:Practice,selected:Proof){const s=p.sources.find(s=>s.id===selected.sourceId);if(!s||!sourceReadable(actor,p,s,new Date().toISOString()))analysisFail('access_denied');const v=s.versions.at(-1);if(v?.version!==selected.version||v.sha256!==selected.sha256||s.kind!==selected.sourceKind)analysisFail('source_changed');if(v.mimeType!=='application/pdf')analysisFail();return s;}
function frozenSource(actor:Actor,p:Practice,selection:Selection):Proof{
 const s=p.sources.find(s=>s.id===selection.sourceId);if(!s||!sourceReadable(actor,p,s,new Date().toISOString()))analysisFail('access_denied');
 const v=s.versions.at(-1);if(!v||v.version!==selection.expectedSourceVersion)analysisFail('source_changed');if(!['deed','succession','cadastral'].includes(s.kind)||v.mimeType!=='application/pdf')analysisFail();
 return {sourceId:s.id,version:v.version,sha256:v.sha256,sourceKind:s.kind,pages:selection.pages};
}
function view(j:Job):DocumentAnalysisJobView{const {proof:p}=captured(j);return {id:j.id,sourceId:p.sourceId,sourceVersion:p.version,sourceKind:p.sourceKind,pages:p.pages,state:j.state as DocumentAnalysisState,version:j.version,capMicros:Number(j.capMicros),spentMicros:Number(j.spentMicros),committedMicros:Number(j.committedMicros),currency:j.currency,createdAt:j.createdAt.toISOString(),updatedAt:j.updatedAt.toISOString(),recordId:j.recordId,reason:j.reason};}
function work(j:Job):DocumentAnalysisWorkJob{const {proof,config}=captured(j);return {id:j.id,scope:jobScope(j),proof,config,offerId:j.offerId,state:j.state as DocumentAnalysisState,countedInputTokens:j.countedInputTokens,recordId:j.recordId,consentReceipt:j.consentReceipt};}
function fence(j:Job,lease:Lease){if(j.id!==lease.jobId||j.leaseEpoch!==lease.epoch||j.leaseTokenHash!==hash(lease.token)||!j.leaseUntil||j.leaseUntil<=instant()||!['leased_before_dispatch','dispatched'].includes(j.state))analysisFail('revision_conflict');}
function capability(d:Dispatch,lease:Lease){if(d.jobId!==lease.jobId||d.epoch!==lease.epoch||d.capabilityHash!==hash(lease.token))analysisFail('access_denied');}
function budgetValid(b:{purpose:string;configDigest:string;currency:string;revokedAt:Date|null;expiresAt:Date},config:Configuration){return b.purpose===DOCUMENT_ANALYSIS_PURPOSE&&b.configDigest===analysisDigest(config)&&b.currency===config.currency&&!b.revokedAt&&b.expiresAt>instant();}

/** Separate document-purpose ledger. No method performs provider IO or exposes a budget creation route. */
export class AgencyDocumentAnalysisStore{
 private readonly practices:AgencyPracticesStore;
 constructor(private readonly db:Pick<PrismaService,'$transaction'>){this.practices=new AgencyPracticesStore(db);}
 /** INTERNAL operator/test setup. Existing plan budgets cannot authorize document extraction. */
 async provisionBudget(input:{agencyId:string;configuration:Configuration;capMicros:number;expiresAt:Date}){
  identity(input.agencyId);const c=parseDocumentAnalysisConfiguration(input.configuration),cap=analysisInteger(input.capMicros);
  if(cap<c.capMicros||!(input.expiresAt instanceof Date)||input.expiresAt<=instant())analysisFail();
  return this.db.$transaction(tx=>tx.agencyDocumentAiBudget.create({data:{agencyId:input.agencyId,purpose:DOCUMENT_ANALYSIS_PURPOSE,configDigest:analysisDigest(c),currency:c.currency,capMicros:BigInt(cap),expiresAt:input.expiresAt}}),transactionOptions);
 }
 async available(s:Scope,configuration:Configuration){scope(s);const c=parseDocumentAnalysisConfiguration(configuration);return this.db.$transaction(async tx=>{await this.practices.documentAnalysisContext(tx,s.accountId,s.agencyId,s.practiceId);return !!await this.findBudget(tx,s.agencyId,c,false);},transactionOptions);}
 private async findBudget(tx:Tx,agencyId:string,c:Configuration,lock:boolean){
  const rows=await tx.agencyDocumentAiBudget.findMany({where:{agencyId,purpose:DOCUMENT_ANALYSIS_PURPOSE,configDigest:analysisDigest(c),currency:c.currency,revokedAt:null,expiresAt:{gt:instant()}},orderBy:[{expiresAt:'asc'},{id:'asc'}],take:100});
  for(const row of rows){if(lock)await tx.$queryRaw`SELECT id FROM "AgencyDocumentAiBudget" WHERE id=${row.id} FOR UPDATE`;const b=lock?await tx.agencyDocumentAiBudget.findUnique({where:{id:row.id}}):row;if(b&&budgetValid(b,c)&&b.capMicros-b.committedMicros>=BigInt(c.capMicros))return b;}
  return null;
 }
 async issueOffer(s:Scope,input:Selection,configuration:Configuration,pageCount:number):Promise<DocumentAnalysisOffer>{
  scope(s);const selected=parseDocumentAnalysisSelection(input),c=parseDocumentAnalysisConfiguration(configuration);analysisPages(selected.pages,analysisInteger(pageCount,1,20));
  return this.db.$transaction(async tx=>{
   const {actor,practice}=await this.practices.documentAnalysisContext(tx,s.accountId,s.agencyId,s.practiceId),p=frozenSource(actor,practice,selected),budget=await this.findBudget(tx,s.agencyId,c,false);if(!budget)analysisFail('access_denied');
   const expiresAt=new Date(Math.min(Date.now()+15*60_000,budget.expiresAt.getTime())),snapshot={purpose:DOCUMENT_ANALYSIS_PURPOSE,scope:s,proof:p,configuration:c,pageCount},id=randomUUID();
   await tx.agencyDocumentAnalysisOffer.create({data:{id,...s,snapshot:json(snapshot),digest:analysisDigest(snapshot),expiresAt}});
   return {id,sourceId:p.sourceId,sourceVersion:p.version,sourceSha256:p.sha256,sourceKind:p.sourceKind,pages:p.pages,purpose:DOCUMENT_ANALYSIS_PURPOSE,provider:c.provider,model:c.model,priceVersion:c.priceVersion,currency:c.currency,capMicros:c.capMicros,mode:c.mode,transfersData:c.transfersData,expiresAt:expiresAt.toISOString(),configVersion:c.configVersion};
  },transactionOptions);
 }
 async create(s:Scope,input:DocumentAnalysisJobBody,requestKey:string,configuration:Configuration):Promise<{job:DocumentAnalysisJobView;replay:boolean}>{
  scope(s);const body=parseDocumentAnalysisJobBody(input),k=key(requestKey),c=parseDocumentAnalysisConfiguration(configuration),commandDigest=analysisDigest(body);
  return this.db.$transaction(async tx=>{
   const {actor,practice}=await this.practices.documentAnalysisContext(tx,s.accountId,s.agencyId,s.practiceId);
   const previous=await tx.agencyDocumentAnalysisJob.findUnique({where:{accountId_practiceId_requestKey:{accountId:s.accountId,practiceId:s.practiceId,requestKey:k}}});
   if(previous){if(previous.commandDigest!==commandDigest)analysisFail('idempotency_conflict');readable(actor,practice,previous);return {job:view(previous),replay:true};}
   if(practice.revision!==body.expectedRevision)analysisFail('revision_conflict');
   const offered=await tx.agencyDocumentAnalysisOffer.findFirst({where:{id:body.offerId,...s}});if(!offered||offered.expiresAt<=instant())analysisFail('access_denied');
   const snapshot=analysisObject(offered.snapshot,['purpose','scope','proof','configuration','pageCount']);
   if(snapshot.purpose!==DOCUMENT_ANALYSIS_PURPOSE||offered.digest!==analysisDigest(snapshot)||analysisDigest(snapshot.scope)!==analysisDigest(s)||analysisDigest(snapshot.configuration)!==analysisDigest(c))analysisFail('invalid_input');
   const p=proof(snapshot.proof);current(actor,practice,p);
   if(p.sourceId!==body.sourceId||p.version!==body.expectedSourceVersion||analysisDigest(p.pages)!==analysisDigest(body.pages))analysisFail('source_changed');
   const activeProofKey=analysisDigest([DOCUMENT_ANALYSIS_PURPOSE,s.agencyId,s.practiceId,p.sourceId,p.version,p.sha256,p.pages]);
   // The practice lock makes this cross-actor check atomic before unique-index enforcement.
   if(await tx.agencyDocumentAnalysisJob.findUnique({where:{activeProofKey}})||await tx.agencyDocumentAnalysisJob.findUnique({where:{offerId:offered.id}}))analysisFail('idempotency_conflict');
   const budget=await this.findBudget(tx,s.agencyId,c,true);if(!budget)analysisFail('access_denied');
   const approvedAt=instant(),id=randomUUID(),consentReceipt=analysisDigest([DOCUMENT_ANALYSIS_PURPOSE,s,k,commandDigest,offered.id,offered.digest,approvedAt.toISOString()]);
   const row=await tx.agencyDocumentAnalysisJob.create({data:{id,...s,offerId:offered.id,budgetId:budget.id,requestKey:k,commandDigest,proof:json(p),configuration:json(c),consentReceipt,approvedAt,activeProofKey,capMicros:BigInt(c.capMicros),committedMicros:BigInt(c.capMicros),currency:c.currency}});
   await tx.agencyDocumentAiBudget.update({where:{id:budget.id},data:{committedMicros:{increment:c.capMicros}}});return {job:view(row),replay:false};
  },transactionOptions);
 }
 async list(s:Scope):Promise<{jobs:DocumentAnalysisJobView[]}>{scope(s);return this.db.$transaction(async tx=>{const {actor,practice}=await this.practices.documentAnalysisContext(tx,s.accountId,s.agencyId,s.practiceId,'read'),rows=await tx.agencyDocumentAnalysisJob.findMany({where:s,orderBy:[{createdAt:'desc'},{id:'desc'}],take:100});return {jobs:rows.filter(j=>{try{readable(actor,practice,j);return true;}catch{return false;}}).map(view)};},transactionOptions);}
 async get(s:Scope,id:string):Promise<DocumentAnalysisJobView>{scope(s);identity(id);return this.db.$transaction(async tx=>{const {actor,practice}=await this.practices.documentAnalysisContext(tx,s.accountId,s.agencyId,s.practiceId,'read'),j=await tx.agencyDocumentAnalysisJob.findFirst({where:{id,...s}});if(!j)analysisFail('access_denied');readable(actor,practice,j);return view(j);},transactionOptions);}
 async lookup(s:Scope,requestKey:string):Promise<{job:DocumentAnalysisJobView|null}>{scope(s);const k=key(requestKey);return this.db.$transaction(async tx=>{const {actor,practice}=await this.practices.documentAnalysisContext(tx,s.accountId,s.agencyId,s.practiceId,'read'),j=await tx.agencyDocumentAnalysisJob.findUnique({where:{accountId_practiceId_requestKey:{accountId:s.accountId,practiceId:s.practiceId,requestKey:k}}});if(!j)return {job:null};readable(actor,practice,j);return {job:view(j)};},transactionOptions);}
 /** No user authorization in this port: it only locks ledger rows and cannot expose source contents. */
 private async locked(tx:Tx,id:string){
  const peek=await tx.agencyDocumentAnalysisJob.findUnique({where:{id}});if(!peek)analysisFail('access_denied');
  await tx.$queryRaw`SELECT id FROM "AgencyPractice" WHERE id=${peek.practiceId} AND "agencyId"=${peek.agencyId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "AgencyDocumentAiBudget" WHERE id=${peek.budgetId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "AgencyDocumentAnalysisJob" WHERE id=${id} FOR UPDATE`;
  const j=await tx.agencyDocumentAnalysisJob.findUniqueOrThrow({where:{id}}),budget=await tx.agencyDocumentAiBudget.findUniqueOrThrow({where:{id:j.budgetId}}),dispatches=await tx.agencyDocumentAnalysisDispatch.findMany({where:{jobId:id},orderBy:{phase:'asc'}});
  if(j.agencyId!==budget.agencyId||budget.currency!==j.currency)analysisFail();this.assertConsent(j,await tx.agencyDocumentAnalysisOffer.findUniqueOrThrow({where:{id:j.offerId}}));return {j,budget,dispatches};
 }
 private async authorized(tx:Tx,j:Job,configuration:Configuration){
  const c=parseDocumentAnalysisConfiguration(configuration),frozen=captured(j),{actor,practice}=await this.practices.documentAnalysisContext(tx,j.accountId,j.agencyId,j.practiceId);
  if(analysisDigest(c)!==analysisDigest(frozen.config))analysisFail('source_changed');current(actor,practice,frozen.proof);
  await tx.$queryRaw`SELECT id FROM "AgencyDocumentAiBudget" WHERE id=${j.budgetId} FOR UPDATE`;
  const budget=await tx.agencyDocumentAiBudget.findUniqueOrThrow({where:{id:j.budgetId}}),offer=await tx.agencyDocumentAnalysisOffer.findUniqueOrThrow({where:{id:j.offerId}});
  this.assertConsent(j,offer);
  if(!budgetValid(budget,c)||offer.expiresAt<=instant())analysisFail('access_denied');return {actor,practice};
 }
 private assertConsent(j:Job,offer:{id:string;accountId:string;agencyId:string;practiceId:string;snapshot:unknown;digest:string}){
  const snapshot=analysisObject(offer.snapshot,['purpose','scope','proof','configuration','pageCount']),s=jobScope(j),config=captured(j).config;
  analysisPages(proof(j.proof).pages,analysisInteger(snapshot.pageCount,1,20));
  if(offer.accountId!==j.accountId||offer.agencyId!==j.agencyId||offer.practiceId!==j.practiceId||offer.digest!==analysisDigest(snapshot)||snapshot.purpose!==DOCUMENT_ANALYSIS_PURPOSE||analysisDigest(snapshot.scope)!==analysisDigest(s)||analysisDigest(snapshot.proof)!==analysisDigest(j.proof)||analysisDigest(snapshot.configuration)!==analysisDigest(config)||j.capMicros!==BigInt(config.capMicros)||j.currency!==config.currency||j.consentReceipt!==analysisDigest([DOCUMENT_ANALYSIS_PURPOSE,s,j.requestKey,j.commandDigest,offer.id,offer.digest,j.approvedAt.toISOString()]))analysisFail('invalid_input');
 }
 async claim(id:string,configuration:Configuration):Promise<{job:DocumentAnalysisWorkJob;lease:Lease;resume:Phase}|null>{
  identity(id);const c=parseDocumentAnalysisConfiguration(configuration);
  try{return await this.db.$transaction(async tx=>{
   const peek=await tx.agencyDocumentAnalysisJob.findUnique({where:{id}});if(!peek)return null;
   await this.authorized(tx,peek,c);const {j,dispatches}=await this.locked(tx,id);
   if(terminal.includes(j.state)||j.state==='uncertain_no_retry'||j.leaseUntil&&j.leaseUntil>instant())return null;
   const count=dispatches.find(d=>d.phase==='count'),generation=dispatches.find(d=>d.phase==='generate');
   if(generation||count&&count.state!=='settled'){
    await tx.agencyDocumentAnalysisJob.update({where:{id},data:{state:'uncertain_no_retry',reason:'dispatch_outcome_unknown',version:{increment:1},leaseTokenHash:null,leaseUntil:null}});return null;
   }
   const token=randomBytes(32).toString('hex'),epoch=j.leaseEpoch+1,row=await tx.agencyDocumentAnalysisJob.update({where:{id},data:{state:'leased_before_dispatch',leaseEpoch:epoch,leaseTokenHash:hash(token),leaseUntil:new Date(Date.now()+90_000),version:{increment:1},reason:null}});
   return {job:work(row),lease:{jobId:id,epoch,token},resume:count?'generate':'count'};
  },transactionOptions);}catch(error){if(error instanceof PracticeError&&['access_denied','source_changed'].includes(error.code)){await this.closeBeforeDispatch(id,error.code==='source_changed'?'discarded_source_changed':'denied_after_revocation');return null;}throw error;}
 }
 async context(lease:Lease,configuration:Configuration):Promise<DocumentAnalysisWorkJob>{return this.db.$transaction(async tx=>{const peek=await tx.agencyDocumentAnalysisJob.findUnique({where:{id:lease.jobId}});if(!peek)analysisFail('access_denied');await this.authorized(tx,peek,configuration);const {j}=await this.locked(tx,lease.jobId);fence(j,lease);return work(j);},transactionOptions);}
 async markDispatch(lease:Lease,phase:Phase,payloadDigest:string,configuration:Configuration,countPayloadDigest?:string){
  digest(payloadDigest);if(!['count','generate'].includes(phase))analysisFail();
  return this.db.$transaction(async tx=>{
   const peek=await tx.agencyDocumentAnalysisJob.findUnique({where:{id:lease.jobId}});if(!peek)analysisFail('access_denied');await this.authorized(tx,peek,configuration);const {j,dispatches}=await this.locked(tx,lease.jobId);fence(j,lease);
   if(dispatches.some(d=>d.phase===phase))analysisFail('idempotency_conflict');
   const count=dispatches.find(d=>d.phase==='count');if(phase==='count'&&dispatches.length||phase==='generate'&&(!count||count.state!=='settled'||j.countedInputTokens===null))analysisFail('revision_conflict');
   if(phase==='generate'&&digest(countPayloadDigest!)!==count!.payloadDigest)analysisFail('source_changed');
   const c=captured(j).config;
   if(phase==='generate'){
    const maximum=(BigInt(j.countedInputTokens!)*BigInt(c.inputMicrosPerMillion)+BigInt(c.maxOutputTokens)*BigInt(c.outputMicrosPerMillion)+999999n)/1000000n;
    if(j.spentMicros+maximum>j.capMicros)analysisFail('invalid_input');
   }
   const row=await tx.agencyDocumentAnalysisDispatch.create({data:{jobId:j.id,phase,epoch:lease.epoch,capabilityHash:hash(lease.token),payloadDigest}});
   await tx.agencyDocumentAnalysisJob.update({where:{id:j.id},data:{state:'dispatched',leaseUntil:new Date(Date.now()+90_000),version:{increment:1}}});return {id:row.id,phase,payloadDigest};
  },transactionOptions);
 }
 private async settled(tx:Tx,j:Job,dispatches:Dispatch[],lease:Lease,phase:Phase,input:Usage){
  const d=dispatches.find(d=>d.phase===phase);if(!d)analysisFail('access_denied');capability(d,lease);const usage=analysisUsage(input,phase),config=captured(j).config,cost=analysisCost(config,usage,phase),receiptIdentity=analysisDigest([config.provider,usage.providerRequestId]);
  if(d.state==='settled'){
   if(d.providerRequestId!==usage.providerRequestId||d.inputTokens!==usage.inputTokens||d.outputTokens!==usage.outputTokens||d.countedInputTokens!==(usage.countedInputTokens??null)||d.costMicros!==cost)analysisFail('idempotency_conflict');return {j,replay:true,costMicros:Number(cost)};
  }
  const duplicate=await tx.agencyDocumentAnalysisDispatch.findUnique({where:{receiptIdentity}});if(duplicate&&duplicate.id!==d.id)analysisFail('idempotency_conflict');
  const spent=j.spentMicros+cost,committed=spent>j.committedMicros?spent:j.committedMicros,extra=committed-j.committedMicros;
  await tx.agencyDocumentAnalysisDispatch.update({where:{id:d.id},data:{state:'settled',providerRequestId:usage.providerRequestId,receiptIdentity,inputTokens:usage.inputTokens,outputTokens:usage.outputTokens,countedInputTokens:usage.countedInputTokens??null,costMicros:cost,settledAt:instant()}});
  await tx.agencyDocumentAiBudget.update({where:{id:j.budgetId},data:{spentMicros:{increment:cost},committedMicros:{increment:extra}}});
  const liveCount=phase==='count'&&j.state==='dispatched'&&j.leaseEpoch===lease.epoch&&j.leaseTokenHash===hash(lease.token)&&!!j.leaseUntil&&j.leaseUntil>instant();
  const updated=await tx.agencyDocumentAnalysisJob.update({where:{id:j.id},data:{spentMicros:spent,committedMicros:committed,...(phase==='count'?{countedInputTokens:usage.countedInputTokens,...(liveCount?{state:'leased_before_dispatch'}:{state:'uncertain_no_retry',reason:'late_count_receipt',leaseTokenHash:null,leaseUntil:null})}:{}),version:{increment:1}}});
  return {j:updated,replay:false,costMicros:Number(cost)};
 }
 /** Internal dispatch capability only; remains valid for accounting after source/grant revocation. */
 async settle(lease:Lease,phase:Phase,usage:Usage){return this.db.$transaction(async tx=>{const {j,dispatches}=await this.locked(tx,lease.jobId),r=await this.settled(tx,j,dispatches,lease,phase,usage);return {replay:r.replay,costMicros:r.costMicros};},transactionOptions);}
 async markUncertain(lease:Lease,phase:Phase,reason='provider_outcome_unknown'){
  analysisText(reason);return this.db.$transaction(async tx=>{const {j,dispatches}=await this.locked(tx,lease.jobId),d=dispatches.find(d=>d.phase===phase);if(!d)analysisFail('access_denied');capability(d,lease);if(d.state==='settled')return;
   await tx.agencyDocumentAnalysisDispatch.update({where:{id:d.id},data:{state:'uncertain'}});await tx.agencyDocumentAnalysisJob.update({where:{id:j.id},data:{state:'uncertain_no_retry',reason,leaseTokenHash:null,leaseUntil:null,version:{increment:1}}});
  },transactionOptions);
 }
 private async finish(tx:Tx,j:Job,state:DocumentAnalysisState,reason:string|null,recordId:string|null=null){
  await tx.agencyDocumentAiBudget.update({where:{id:j.budgetId},data:{committedMicros:{decrement:j.committedMicros-j.spentMicros}}});
  return tx.agencyDocumentAnalysisJob.update({where:{id:j.id},data:{state,reason,recordId,committedMicros:j.spentMicros,activeProofKey:null,leaseTokenHash:null,leaseUntil:null,version:{increment:1}}});
 }
 private async closeBeforeDispatch(id:string,state:'failed_before_dispatch'|'discarded_source_changed'|'denied_after_revocation',reason=state){return this.db.$transaction(async tx=>{const {j,dispatches}=await this.locked(tx,id);if(terminal.includes(j.state))return;
  if(dispatches.some(d=>d.state!=='settled')){await tx.agencyDocumentAnalysisJob.update({where:{id},data:{state:'uncertain_no_retry',reason:'dispatch_outcome_unknown',leaseTokenHash:null,leaseUntil:null,version:{increment:1}}});return;}
  await this.finish(tx,j,state,reason);
 },transactionOptions);}
 async failBeforeDispatch(lease:Lease,reason='analysis_unavailable'){
  analysisText(reason);return this.db.$transaction(async tx=>{const {j,dispatches}=await this.locked(tx,lease.jobId);fence(j,lease);if(dispatches.some(d=>d.state!=='settled')||dispatches.some(d=>d.phase==='generate'))analysisFail('revision_conflict');await this.finish(tx,j,'failed_before_dispatch',reason);},transactionOptions);
 }
 async complete(lease:Lease,trusted:TrustedDeedText,candidates:unknown,usage:Usage,configuration:Configuration|null):Promise<{state:DocumentAnalysisState;recordId:string|null;replay:boolean}>{
  return this.db.$transaction(async tx=>{
   const peek=await tx.agencyDocumentAnalysisJob.findUnique({where:{id:lease.jobId}});if(!peek)analysisFail('access_denied');
   let context:{actor:Actor;practice:Practice}|undefined,denied:DocumentAnalysisState|undefined;
   if(configuration===null)denied='denied_after_revocation';
   else try{context=await this.authorized(tx,peek,configuration);}catch(error){if(!(error instanceof PracticeError))throw error;denied=error.code==='source_changed'?'discarded_source_changed':'denied_after_revocation';}
   const {j,dispatches}=await this.locked(tx,lease.jobId),generation=dispatches.find(d=>d.phase==='generate');if(!generation)analysisFail('access_denied');capability(generation,lease);
   if(terminal.includes(j.state)){await this.settled(tx,j,dispatches,lease,'generate',usage);return {state:j.state as DocumentAnalysisState,recordId:j.recordId,replay:true};}
   const result=await this.settled(tx,j,dispatches,lease,'generate',usage),updated=result.j;
   if(denied){await this.finish(tx,updated,denied,'source_or_access_changed');return {state:denied,recordId:null,replay:false};}
   let eligible=true;try{fence(j,lease);}catch{eligible=false;}
   if(!eligible||updated.spentMicros>updated.capMicros){await this.finish(tx,updated,'completed_unusable',eligible?'provider_cap_exceeded':'lease_expired');return {state:'completed_unusable',recordId:null,replay:false};}
   const p=proof(j.proof);
   let staged:ReturnType<typeof stageDeedProposals>;
   try{
    if(trusted.sourceId!==p.sourceId||trusted.version!==p.version||trusted.sha256!==p.sha256||analysisDigest(trusted.pages.map(p=>p.page))!==analysisDigest(p.pages))analysisFail('source_changed');
    staged=stageDeedProposals(context!.actor,context!.practice,trusted,candidates,{key:'document-job:'+j.id,expectedRevision:context!.practice.revision,visibility:'private'},new Date().toISOString());
   }catch(error){if(!(error instanceof PracticeError))throw error;await this.finish(tx,updated,'completed_unusable','provider_output_unusable');return {state:'completed_unusable',recordId:null,replay:false};}
   try{await this.authorized(tx,j,configuration!);}catch(error){if(!(error instanceof PracticeError))throw error;const state=error.code==='source_changed'?'discarded_source_changed':'denied_after_revocation';await this.finish(tx,updated,state,'source_or_access_changed');return {state,recordId:null,replay:false};}
   const persisted=await tx.agencyPractice.updateMany({where:{id:j.practiceId,agencyId:j.agencyId,revision:context!.practice.revision},data:{revision:staged.practice.revision,snapshot:json(staged.practice)}});if(persisted.count!==1)analysisFail('revision_conflict');
   const record=staged.practice as Practice&{deedRecords?:Array<{id:string;result:{proposals:unknown[]}}>},state=record.deedRecords?.find(r=>r.id===staged.receipt.recordId)?.result.proposals.length?'completed_with_proposals':'completed_unusable';
   await this.finish(tx,updated,state,state==='completed_unusable'?'no_usable_proposals':null,staged.receipt.recordId);return {state,recordId:staged.receipt.recordId,replay:staged.replay};
  },transactionOptions);
 }
 /** SQL rediscovery, no original payloads or automatic replay of uncertain transport. */
 async pending(limit=20):Promise<string[]>{analysisInteger(limit,1,100);return this.db.$transaction(async tx=>(await tx.agencyDocumentAnalysisJob.findMany({where:{state:{in:['queued','leased_before_dispatch','dispatched']},OR:[{leaseUntil:null},{leaseUntil:{lte:instant()}}]},orderBy:[{createdAt:'asc'},{id:'asc'}],take:limit,select:{id:true}})).map(j=>j.id),transactionOptions);}
}
