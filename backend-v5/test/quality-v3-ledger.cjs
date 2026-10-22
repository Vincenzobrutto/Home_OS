// Reuse the EXISTING onboarding ledger and reservation implementation in an
// isolated synthetic database. No transport, .env loading, or product DB access.
require('reflect-metadata');
const {createHash}=require('node:crypto');
const {PrismaClient}=require('../generated/client');
const {OnboardingAiBudget,OnboardingAiConfig}=require('../dist/object-onboarding/ai-budget');
const {RESERVE_MICRO_USD,MODEL_PRICES}=require('../dist/review/ai-config');
const {OBJECT_ONBOARDING_PROMPT_VERSION}=require('../dist/object-onboarding/anthropic-provider');
const {ONBOARDING_READING_VERSION}=require('../dist/object-onboarding/reading');
const {CampaignLimit}=require('./quality-v3-runner.cjs');
const {load}=require('./corpus-v3/corpus.cjs');
const {checkedObservation,MODEL_ADAPTER_VERSION}=require('./quality-v3-model.cjs');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>{throw new CampaignLimit(code);};
function assertQualityDatabase(raw){
 let url;try{url=new URL(raw);}catch{fail('quality_database_required');}
 if(!['postgresql:','postgres:'].includes(url.protocol)||!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='55433'||!['/dimora_v5_quality_v3_test','/dimora_v5_quality_v3_campaign'].includes(url.pathname)||url.search)fail('quality_database_required');
}
function entry(attempt){
 const state=['reserved','sending'].includes(attempt.state)?'uncertain':attempt.state;
 return{id:attempt.job.key,state,reserveMicroUsd:attempt.reservedMicroUsd,costMicroUsd:attempt.actualMicroUsd,...(['quality-v3-score-v1','quality-v3-score-v2'].includes(attempt.output?.schema)?{score:attempt.output.score}:{}),...(attempt.output?.observation?{observation:checkedObservation(attempt.output.observation)}:{})};
}
class PrismaCampaignLedger {
 static async open(options){
  assertQualityDatabase(options.databaseUrl);
  if(!/^fase0-quality-v3-[A-Za-z0-9_-]{1,64}$/.test(options.campaignId)||!Number.isSafeInteger(options.maxCalls)||options.maxCalls<1||options.maxCalls>150||!Number.isSafeInteger(options.budgetMicroUsd)||options.budgetMicroUsd<1||options.budgetMicroUsd>12_000_000||!MODEL_PRICES[options.model])fail('invalid_campaign');
  const db=new PrismaClient({datasources:{db:{url:options.databaseUrl}}});
  const ledger=new PrismaCampaignLedger(db,options);
  try{await db.$connect();await ledger.verifyScope();return ledger;}catch(error){await db.$disconnect();throw error;}
 }
 constructor(db,options){
  this.db=db;this.options=Object.freeze({...options});this.corpus=new Map(load().cases.map(c=>[c.id,c]));
  const policy=this.options,allowedHashes=new Set([...this.corpus.values()].map(c=>c.sha256));
  // Explicit evaluation policy only; production .env and 10 USD/50-call cap stay
  // unchanged. This subclass is not registered in the application container.
  class SyntheticConfig extends OnboardingAiConfig {
   settings(){return{campaign:policy.campaignId,model:policy.model,maxCalls:policy.maxCalls,limitMicroUsd:policy.budgetMicroUsd,price:MODEL_PRICES[policy.model]};}
   sourceAuthorized(sha,accountId,homeId){return accountId===policy.accountId&&homeId===policy.homeId&&allowedHashes.has(sha);}
  }
  this.budget=new OnboardingAiBudget(db,new SyntheticConfig());
 }
 async verifyScope(db=this.db){
  const scope=await db.homeMembership.findUnique({where:{accountId_homeId:{accountId:this.options.accountId,homeId:this.options.homeId}},include:{account:true,home:true}});
  if(!scope||scope.revokedAt||scope.role!=='owner'||scope.validFrom.getTime()>Date.now()||scope.validUntil&&scope.validUntil.getTime()<=Date.now()||!scope.account.email.endsWith('@example.test')||scope.home.name!=='SYNTHETIC QUALITY V3')fail('synthetic_scope_required');
 }
 request(item){
  const c=this.corpus.get(item.id),run=item.run??1,mode=item.mode??'full',throughPage=item.throughPage??null;
  if(!c||!Number.isSafeInteger(run)||run<1||run>2||!['full','local_pages','progressive'].includes(mode)||(mode==='progressive'?!Number.isSafeInteger(throughPage)||throughPage<1||throughPage>c.pages:throughPage!==null)||item.sha256!==c.sha256||!item.documentId||item.documentVersion!==1||hash(item.gold)!==hash(c.gold))fail('invalid_synthetic_case');
  const key=`${this.options.campaignId}:${item.id}:${run}:${mode}:${throughPage??0}`;
  if(item.protocol!==undefined&&item.protocol!==MODEL_ADAPTER_VERSION)fail('invalid_adapter_protocol');
  const digest=hash({key,documentId:item.documentId,sha256:c.sha256,gold:c.gold,model:this.options.model,prompt:OBJECT_ONBOARDING_PROMPT_VERSION,reading:ONBOARDING_READING_VERSION,pages:item.pages??[],...(item.protocol?{protocol:item.protocol}:{})});
  return{key,digest,c};
 }
 async lock(tx){await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'onboarding-ai-budget:'+this.options.campaignId},0))::text AS locked`;}
 async existing(tx,request){
  const job=await tx.objectOnboardingJob.findUnique({where:{accountId_homeId_key:{accountId:this.options.accountId,homeId:this.options.homeId,key:request.key}},include:{attempt:true}});
  if(job&&(job.digest!==request.digest||job.provider!=='quality-v3-offline'||job.attempt?.campaignId!==this.options.campaignId||job.attempt.model!==this.options.model||job.attempt.promptVersion!==OBJECT_ONBOARDING_PROMPT_VERSION))fail('campaign_identity_conflict');
  return job;
 }
 async validate(tx,item,request){
   await this.verifyScope(tx);
   const incompatible=await tx.objectOnboardingAttempt.findFirst({where:{campaignId:this.options.campaignId,OR:[{model:{not:this.options.model}},{promptVersion:{not:OBJECT_ONBOARDING_PROMPT_VERSION}},{job:{accountId:{not:this.options.accountId}}},{job:{homeId:{not:this.options.homeId}}}]}});
   if(incompatible)fail('campaign_identity_conflict');
   const original=await tx.document.findUnique({where:{id:item.documentId},include:{original:true}});
   if(!original||original.homeId!==this.options.homeId||original.uploaderId!==this.options.accountId||original.visibility!=='private'||original.original?.version!==1||original.original.sha256!==request.c.sha256||original.original.mimeType!==request.c.mimeType)fail('synthetic_source_changed');
 }
 async authorize(item,{afterResponse=false}={}){
  const request=this.request(item);
  // Uncertainty forbids every new transfer. Only the original dispatcher may
  // validate a response it has already received, then settle its known charge.
  await this.db.$transaction(async tx=>{await this.lock(tx);await this.validate(tx,item,request);const job=await this.existing(tx,request);if(job?.attempt.state!=='sending'&&!(afterResponse&&job?.attempt.state==='uncertain'))fail('analysis_outcome_unknown');});
 }
 async read(item){
  const request=this.request(item);
  return this.db.$transaction(async tx=>{await this.lock(tx);await this.validate(tx,item,request);const job=await this.existing(tx,request);return job?entry({...job.attempt,job}):null;});
 }
 async claim(item){
  const request=this.request(item);
  return this.db.$transaction(async tx=>{
   await this.lock(tx);await this.validate(tx,item,request);
   const prior=await this.existing(tx,request);
   if(prior){
    await tx.objectOnboardingAttempt.updateMany({where:{id:prior.attempt.id,state:{in:['reserved','sending']}},data:{state:'uncertain'}});
    return{dispatch:false,entry:entry({...prior.attempt,job:prior})};
   }
   const job=await tx.objectOnboardingJob.create({data:{accountId:this.options.accountId,homeId:this.options.homeId,documentId:item.documentId,documentVersion:1,documentSha256:request.c.sha256,mimeType:request.c.mimeType,provider:'quality-v3-offline',consentToProviderTransfer:false,purpose:'quality_v3',key:request.key,digest:request.digest,state:'running'}});
   const attempt=await this.budget.reserve(tx,job.id,request.c.sha256,this.options.accountId,this.options.homeId);
   await tx.objectOnboardingAttempt.update({where:{id:attempt.id},data:{state:'sending',sentAt:new Date()}});
   return{dispatch:true,entry:{...entry({...attempt,job}),state:'sending'}};
  });
 }
 async settle(item,response,score){
  const request=this.request(item);
  const observation=response.observation?checkedObservation(response.observation):null;
  if(observation){
   const r=observation.reading,mode=item.mode??'full',count=mode==='progressive'?item.throughPage:request.c.pages;
   if(r.totalPages!==request.c.pages||r.mode!==mode||mode!=='local_pages'&&(r.sentPages.length!==count||r.sentPages.some((p,i)=>p!==i+1)))fail('reading_identity_conflict');
  }
  await this.db.$transaction(async tx=>{
   await this.lock(tx);const job=await this.existing(tx,request);
   if(!job||!Number.isSafeInteger(response.costMicroUsd)||response.costMicroUsd<0||response.costMicroUsd>job.attempt.reservedMicroUsd)fail('invalid_settlement');
   const updated=await tx.objectOnboardingAttempt.updateMany({where:{id:job.attempt.id,state:{in:['sending','uncertain']}},data:{state:'settled',actualMicroUsd:response.costMicroUsd,responseAt:new Date(),...(score||observation?{output:{schema:observation?'quality-v3-score-v2':'quality-v3-score-v1',score,...(observation?{observation}:{})}}:{})}});
   if(updated.count!==1)fail('settlement_conflict');
   await tx.objectOnboardingJob.update({where:{id:job.id},data:{state:'succeeded'}});
  });
 }
 async uncertain(item,code){
  const request=this.request(item);
  await this.db.$transaction(async tx=>{
   await this.lock(tx);const job=await this.existing(tx,request);if(!job)fail('missing_reservation');
   await tx.objectOnboardingAttempt.updateMany({where:{id:job.attempt.id,state:{in:['reserved','sending']}},data:{state:'uncertain'}});
   await tx.objectOnboardingJob.updateMany({where:{id:job.id,state:'running'},data:{state:'failed',errorCode:code==='invalid_settlement'?'invalid_settlement':'provider_outcome_unknown'}});
  });
 }
 async entries(){return(await this.db.objectOnboardingAttempt.findMany({where:{campaignId:this.options.campaignId,job:{accountId:this.options.accountId,homeId:this.options.homeId}},include:{job:true},orderBy:{id:'asc'}})).map(entry);}
 async close(){await this.db.$disconnect();}
}
module.exports={PrismaCampaignLedger,assertQualityDatabase,RESERVE_MICRO_USD};
