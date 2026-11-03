import {ServiceUnavailableException} from '@nestjs/common';
import type {PrismaService} from '../prisma.service';
import {PracticeError,sourceReadable} from '../agency-practices/domain';
import {AgencyPracticesStore} from '../agency-practices/store';
import type {AgencyFileVault} from '../agency-practices/files';
import {AgencyDeedTextDecoder} from '../agency-practices/deed-text';
import {ProviderFailure} from '../review/provider';
import type {TrustedDeedText} from '../agency-practices/deed-extraction';
import {analysisPages,analysisCost,type DocumentAnalysisConfiguration,type DocumentAnalysisJobBody,type DocumentAnalysisJobView,type DocumentAnalysisLease,type DocumentAnalysisOffer,type DocumentAnalysisPhase,type DocumentAnalysisScope,type DocumentAnalysisSelection,type DocumentAnalysisUsage,type DocumentAnalysisWorkJob} from './domain';
import type {DocumentAnalysisApplicationPort,DocumentAnalysisOptions,DocumentOptionsSelection} from './http-contracts';
import {documentDispatchDigest,validateDocumentCandidates,type DocumentProviderRequest} from './provider-port';
import type {DocumentAnalysisRuntime} from './config';

export interface DocumentAnalysisLedger {
 issueOffer(scope:DocumentAnalysisScope,selection:DocumentAnalysisSelection,config:DocumentAnalysisConfiguration,pageCount:number):Promise<DocumentAnalysisOffer>;
 available(scope:DocumentAnalysisScope,config:DocumentAnalysisConfiguration):Promise<boolean>;
 create(scope:DocumentAnalysisScope,body:DocumentAnalysisJobBody,key:string,config:DocumentAnalysisConfiguration):Promise<{job:DocumentAnalysisJobView;replay:boolean}>;
 list(scope:DocumentAnalysisScope):Promise<{jobs:DocumentAnalysisJobView[]}>;
 lookup(scope:DocumentAnalysisScope,key:string):Promise<{job:DocumentAnalysisJobView|null}>;
 get(scope:DocumentAnalysisScope,id:string):Promise<DocumentAnalysisJobView>;
 claim(id:string,config:DocumentAnalysisConfiguration):Promise<{job:DocumentAnalysisWorkJob;lease:DocumentAnalysisLease;resume:'count'|'generate'}|null>;
 context(lease:DocumentAnalysisLease,config:DocumentAnalysisConfiguration):Promise<DocumentAnalysisWorkJob>;
 markDispatch(lease:DocumentAnalysisLease,phase:DocumentAnalysisPhase,payloadDigest:string,config:DocumentAnalysisConfiguration,countPayloadDigest?:string):Promise<unknown>;
 settle(lease:DocumentAnalysisLease,phase:DocumentAnalysisPhase,usage:DocumentAnalysisUsage):Promise<unknown>;
 failBeforeDispatch(lease:DocumentAnalysisLease,code:string):Promise<unknown>;
 markUncertain(lease:DocumentAnalysisLease,phase:DocumentAnalysisPhase,code:string):Promise<unknown>;
 complete(lease:DocumentAnalysisLease,trusted:TrustedDeedText,candidates:unknown,usage:DocumentAnalysisUsage,config:DocumentAnalysisConfiguration|null):Promise<unknown>;
 pending(limit?:number):Promise<string[]>;
}
const unavailable=()=>new ServiceUnavailableException({code:'provider_disabled',message:'Analisi documentale non configurata.'});

/** Explicit port composition. Only decoder text is trusted; provider output remains unbound proposals. */
export class AgencyDocumentAnalysisApplication implements DocumentAnalysisApplicationPort{
 private readonly practices:Pick<AgencyPracticesStore,'readFile'|'documentAnalysisContext'>;
 constructor(private readonly db:Pick<PrismaService,'$transaction'>,private readonly ledger:DocumentAnalysisLedger,private readonly vault:AgencyFileVault|null,private readonly runtime:DocumentAnalysisRuntime,private readonly decoder:Pick<AgencyDeedTextDecoder,'decode'>=new AgencyDeedTextDecoder(),practices?:Pick<AgencyPracticesStore,'readFile'|'documentAnalysisContext'>){this.practices=practices??new AgencyPracticesStore(db);}
 private configured(){const {config,provider}=this.runtime;if(!config||!provider||!provider.available()||!this.vault)throw unavailable();return {config,provider};}
 private async selection(scope:DocumentAnalysisScope,selection:DocumentOptionsSelection){
  return this.db.$transaction(async tx=>{
   const {actor,practice}=await this.practices.documentAnalysisContext(tx,scope.accountId,scope.agencyId,scope.practiceId),source=practice.sources.find(s=>s.id===selection.sourceId),now=new Date().toISOString();
   if(!source||!sourceReadable(actor,practice,source,now))throw new PracticeError('access_denied');const file=source.versions.at(-1)!;
   if(file.version!==selection.expectedSourceVersion)throw new PracticeError('source_changed');
   return {revision:practice.revision,source:{id:source.id,version:file.version,kind:source.kind,sha256:file.sha256,filename:file.originalFilename},mimeType:file.mimeType};
  },{maxWait:5000,timeout:15000});
 }
 private async decode(scope:DocumentAnalysisScope,proof:DocumentAnalysisWorkJob['proof']){
  if(!this.vault)throw unavailable();
  const selection={sourceId:proof.sourceId,version:proof.version,sha256:proof.sha256};
  const file=await this.practices.readFile(scope.accountId,scope.agencyId,scope.practiceId,selection,this.vault),text=await this.decoder.decode({...selection,...file});
  const pages=analysisPages(proof.pages,text.pages.length);
  return {...text,pages:pages.map(page=>text.pages.find(p=>p.page===page)!)};
 }
 async options(scope:DocumentAnalysisScope,selection:DocumentOptionsSelection):Promise<DocumentAnalysisOptions>{
  const current=await this.selection(scope,selection),base={revision:current.revision,canEdit:true,source:current.source,pageCount:null,offer:null};
  let configured:ReturnType<AgencyDocumentAnalysisApplication['configured']>;try{configured=this.configured();}catch{return {...base,available:false,reason:'provider_disabled'};}
  if(!['deed','succession','cadastral'].includes(current.source.kind)||current.mimeType!=='application/pdf')return {...base,available:false,reason:'unsupported_source_kind'};
  if(!await this.ledger.available(scope,configured.config))return {...base,available:false,reason:'budget_unavailable'};
  // Physical page count comes from the same honest native-text decoder; no OCR fallback.
  const file=await this.practices.readFile(scope.accountId,scope.agencyId,scope.practiceId,{sourceId:current.source.id,version:current.source.version,sha256:current.source.sha256},this.vault!);
  let text:TrustedDeedText;try{text=await this.decoder.decode({...file,sourceId:current.source.id,version:current.source.version,sha256:current.source.sha256});}catch(error){if(error instanceof ProviderFailure)return {...base,available:false,reason:['pdf_text_unavailable','deed_media_unsupported','analysis_limits_exceeded'].includes(error.code)?error.code:'pdf_invalid'};throw error;}
  const after=await this.selection(scope,selection);
  if(after.source.sha256!==current.source.sha256||after.source.kind!==current.source.kind)throw new PracticeError('source_changed');
  const pages=analysisPages(selection.pages??text.pages.map(p=>p.page),text.pages.length),offer=await this.ledger.issueOffer(scope,{sourceId:selection.sourceId,expectedSourceVersion:selection.expectedSourceVersion,pages},configured.config,text.pages.length);
  return {...base,revision:after.revision,available:true,reason:null,pageCount:text.pages.length,offer};
 }
 async request(scope:DocumentAnalysisScope,body:DocumentAnalysisJobBody,key:string){return this.ledger.create(scope,body,key,this.configured().config);}
 list(scope:DocumentAnalysisScope){return this.ledger.list(scope);}
 read(scope:DocumentAnalysisScope,id:string){return this.ledger.get(scope,id);}
 lookup(scope:DocumentAnalysisScope,key:string){return this.ledger.lookup(scope,key);}
 /** One durable job, no retry loop. SQL claim/markers are the authority after restarts. */
 async run(jobId:string,continueWork:()=>boolean=()=>true){
  const {config,provider}=this.configured(),claimed=await this.ledger.claim(jobId,config);if(!claimed)return;
  const {lease}=claimed;let phase:DocumentAnalysisPhase=claimed.resume,marked=false;
  try{
   const currentConfig=()=>this.configured().config;
   const mark=async(phase:DocumentAnalysisPhase,digest:string,countDigest?:string)=>{
    marked=true;
    try{await this.ledger.markDispatch(lease,phase,digest,currentConfig(),countDigest);}
    catch(error){
     // A domain rejection rolls the marker transaction back. Unknown SQL outcomes keep the conservative marker path.
     if(error instanceof PracticeError)marked=false;
     throw error;
    }
   };
   let job=await this.ledger.context(lease,currentConfig());
   const trusted=await this.decode(job.scope,job.proof);
   job=await this.ledger.context(lease,currentConfig());
   if(!continueWork())return;
   let request:DocumentProviderRequest={config:job.config,proof:job.proof,text:trusted};
   if(phase==='count'){
    const digest=documentDispatchDigest(request,'count');await this.ledger.context(lease,currentConfig());
    await mark('count',digest);
    const usage=await provider.count(request);await this.ledger.settle(lease,'count',usage);marked=false;
    phase='generate';job=await this.ledger.context(lease,currentConfig());
   }
   if(!continueWork())return;
   if(job.countedInputTokens===null)throw new PracticeError('invalid_input');
   const maximum=analysisCost(job.config,{providerRequestId:'bound',inputTokens:job.countedInputTokens,outputTokens:job.config.maxOutputTokens})+BigInt(job.config.countMicrosPerRequest);
   if(maximum>BigInt(job.config.capMicros)){await this.ledger.failBeforeDispatch(lease,'budget_insufficient');return;}
   job=await this.ledger.context(lease,currentConfig());request={config:job.config,proof:job.proof,text:trusted};
   const digest=documentDispatchDigest(request,'generate');await mark('generate',digest,documentDispatchDigest(request,'count'));
   const response=await provider.generate(request);
   let candidates:unknown;try{candidates=validateDocumentCandidates(job.proof.sourceKind,response.proposal);}catch{candidates={candidates:[]};}
   // Server attaches the authorized proof; the provider cannot pick a different source.
   await this.ledger.complete(lease,trusted,{sourceId:job.proof.sourceId,version:job.proof.version,sha256:job.proof.sha256,...candidates as {candidates:unknown[]}},response.usage,this.runtime.config);marked=false;
  }catch(error){
   // A known marker includes uncertain persistence failures: never infer a free/not-sent retry.
   if(marked)await this.ledger.markUncertain(lease,phase,'provider_unavailable');
   else await this.ledger.failBeforeDispatch(lease,error instanceof PracticeError&&error.code==='source_changed'?'source_changed':error instanceof PracticeError&&error.code==='access_denied'?'access_denied':'analysis_unavailable');
  }
 }
}
