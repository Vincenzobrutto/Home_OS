// Acceptance journey on a NEW owned synthetic cluster only. No real AI, mail or user files.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,randomBytes}=require('node:crypto'),path=require('node:path');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {Module,Global}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),cookieParser=require('cookie-parser');
const {PrismaClient}=require('../generated/client'),{PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service'),{SessionsService,digest,COOKIE}=require('../dist/security');
const {AgencyPracticesModule}=require('../dist/agency-practices/http'),{AgencyPracticesStore}=require('../dist/agency-practices/store');
const {AgencyDocumentAnalysisModule}=require('../dist/agency-document-analysis/module'),{DOCUMENT_ANALYSIS_APPLICATION}=require('../dist/agency-document-analysis/http-contracts'),{AgencyDocumentAnalysisStore}=require('../dist/agency-document-analysis/store');
const {prepareMandateDataPacket}=require('../dist/agency-practices/mandate-packet');
const {syntheticDocumentConfiguration,createHashBoundDocumentProvider}=require('./agency-document-fixture.cjs');
const {createAgencyDocumentsJourneyFixture}=require('./agency-documents-journey-fixture.cjs');

test('agency journey: uploaded succession and cadastral PDF to cited facts, open issues and blocked mandate',{timeout:240000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);
 const owned=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),db=new PrismaClient();await db.$connect();
 const fixture=createAgencyDocumentsJourneyFixture(),provider=createHashBoundDocumentProvider(fixture.manifest),configuration=syntheticDocumentConfiguration(),vaultRoot=path.join(owned.directory,'documents-journey-vault-'+randomUUID());
 const agency=await db.agency.create({data:{name:'Agenzia percorso documentale sintetico'}}),actors=[],past=new Date('2026-01-01');
 for(const [i,role]of ['agent','admin'].entries()){
  const account=await db.account.create({data:{name:'Agente percorso sintetico '+i,email:randomUUID()+'@example.test',passwordHash:'synthetic-no-login'}});
  await db.agencyMember.create({data:{agencyId:agency.id,accountId:account.id,role,validFrom:past}});
  const raw=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');await db.session.create({data:{id:digest(raw),accountId:account.id,csrfToken:csrf,expiresAt:new Date(Date.now()+3600000)}});actors.push({...account,raw,csrf});
 }
 const [agent,assignedAdmin]=actors;
 class Infra{}Global()(Infra);Module({providers:[{provide:PrismaService,useValue:db},{provide:SessionsService,useValue:new SessionsService(db)}],exports:[PrismaService,SessionsService]})(Infra);
 class Root{}Module({imports:[Infra,AgencyPracticesModule.register(vaultRoot),AgencyDocumentAnalysisModule.register(vaultRoot,{config:configuration,provider,autoStart:false,pollIntervalMs:1000,concurrency:1})]})(Root);
 const app=await NestFactory.create(Root,{logger:false});app.setGlobalPrefix('api/v5');app.use(cookieParser());await app.listen(0,'127.0.0.1');const origin=await app.getUrl();
 t.after(async()=>{app.getHttpServer().closeAllConnections?.();await app.close();await db.$disconnect();});
 const base='/api/v5/agencies/'+agency.id+'/practices',store=app.get(AgencyPracticesStore),ledger=app.get(AgencyDocumentAnalysisStore);
 const request=(suffix,options={},actor=agent)=>fetch(origin+base+suffix,{...options,headers:{cookie:COOKIE+'='+actor.raw,'x-account-context':actor.id,origin:'http://127.0.0.1:5174','x-csrf-token':actor.csrf,...options.headers}});
 const post=(suffix,body,actor=agent,key=randomUUID())=>request(suffix,{method:'POST',headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)},actor);
 async function json(response,status=200){assert.equal(response.status,status,await response.clone().text());return response.json();}
 const created=await json(await post('',{label:fixture.label}),201),practiceId=created.practice.id,prefix='/'+practiceId;
 await db.agencyPracticeGrant.create({data:{practiceId,accountId:assignedAdmin.id,access:'read',canExport:false,validFrom:past}});
 await ledger.provisionBudget({agencyId:agency.id,configuration,capMicros:0,expiresAt:new Date(Date.now()+3600000)});
 const revision=async()=>(await json(await request(prefix))).revision;
 const review=()=>request(prefix+'/review').then(r=>json(r));
 const proposals=()=>request(prefix+'/deed-proposals').then(r=>json(r));
 const findings=()=>request(prefix+'/findings').then(r=>json(r));
 const command=async(op,value)=>json(await post(prefix+'/'+op,{expectedRevision:await revision(),command:value}),201);
 const sources=new Map(),jobs=[],boundFacts={};let unitId;
 async function bind(sourceKey,candidateId,subjectKey){
  const records=await proposals(),record=records.records.find(r=>r.sourceId===sources.get(sourceKey));assert.ok(record);
  const candidate=record.result.proposals.find(p=>p.candidateId===candidateId);assert.ok(candidate);
  const result=await json(await post(prefix+'/deed-proposals/'+record.id+'/bindings',{expectedRevision:records.revision,candidateId,expectedFingerprint:record.result.fingerprint,unitId,subjectKey,acknowledgedDocumentRole:candidate.proposedDocumentRole,reason:'Associazione esplicita nel percorso di accettazione sintetico'}),201);
  return result.review.facts.find(f=>f.id===result.factId);
 }
 async function packet(fact){
  // Internal preparation helper, not an invented HTTP generation endpoint.
  return db.$transaction(async tx=>{const context=await store.documentAnalysisContext(tx,agent.id,agency.id,practiceId,'read');return prepareMandateDataPacket(context.actor,context.practice,{expectedRevision:context.practice.revision,unitId,subjectKey:'property',requiredFields:['cadastral.subaltern','cadastral.municipality'],bindings:[{field:'cadastral.subaltern',factId:fact.id,expectedFactVersion:fact.version}]},new Date().toISOString());});
 }

 await t.test('the agent uploads and classifies both physical PDFs in the same practice',async()=>{
  for(const document of fixture.documents){
   const form=new FormData();form.set('metadata',JSON.stringify({expectedRevision:await revision(),visibility:'private'}));form.set('file',new Blob([document.bytes],{type:'application/pdf'}),document.filename);
   const uploaded=await json(await request(prefix+'/sources',{method:'POST',headers:{'idempotency-key':randomUUID()},body:form}),201),source=uploaded.practice.documents.find(d=>d.filename===document.filename);assert.ok(source);sources.set(document.id,source.id);
   await json(await post(prefix+'/sources/'+source.id+'/classification',{expectedRevision:await revision(),expectedSourceVersion:1,kind:document.kind}),201);
  }
  const unit=await command('review',{operation:'unit',label:'Abitazione dei due eredi - sintetica'});unitId=unit.review.units[0].id;
  const state=await json(await request(prefix));assert.equal(state.documents.length,2);assert.deepEqual(state.documents.map(d=>d.kind).sort(),['cadastral','succession']);assert.equal(provider.calls.length,0);assert.deepEqual((await review()).facts,[]);
 });
 await t.test('explicit authorization produces hash-bound cited proposals, never confirmed facts or current owners',async()=>{
  for(const document of fixture.documents){
   const options=await json(await request(prefix+'/deed-analysis-options?sourceId='+sources.get(document.id)+'&expectedSourceVersion=1&pages='+document.pages.join(',')));
   assert.equal(options.available,true);assert.equal(options.offer.sourceSha256,document.sha256);assert.equal(options.offer.mode,'synthetic_fixture');assert.equal(options.offer.transfersData,false);
   const createdJob=await json(await post(prefix+'/deed-analysis-jobs',{expectedRevision:await revision(),sourceId:sources.get(document.id),expectedSourceVersion:1,pages:document.pages,offerId:options.offer.id,approved:true}),201);
   jobs.push(createdJob.job.id);await app.get(DOCUMENT_ANALYSIS_APPLICATION).run(createdJob.job.id);
   const status=await json(await request(prefix+'/deed-analysis-jobs/'+createdJob.job.id));assert.equal(status.state,'completed_with_proposals');assert.equal(status.spentMicros,0);
  }
  const data=await proposals(),succession=data.records.find(r=>r.sourceId===sources.get('succession')),cadastre=data.records.find(r=>r.sourceId===sources.get('cadastre'));
  assert.equal(data.canGenerateDraft,false);assert.equal(data.certification,false);assert.deepEqual((await review()).facts,[]);
  assert.equal(succession.result.proposals.find(p=>p.candidateId==='historical-mother').proposedDocumentRole,'historical_owner');
  assert.deepEqual(succession.result.proposals.filter(p=>p.proposedDocumentRole==='declared_heir').map(p=>p.proposedValue).sort(),fixture.people.heirs.slice().sort());
  assert.equal(succession.result.proposals.some(p=>p.candidateId==='invented-sub'),false);assert.ok(succession.result.issues.some(i=>i.candidateId==='invented-sub'&&i.code==='excerpt_not_found'));
  for(const [record,documentKey,expectedSub]of [[succession,'succession','12'],[cadastre,'cadastre','13']]){
   const proposed=record.result.proposals.find(p=>p.field==='cadastral.subaltern'),document=fixture.documents.find(d=>d.id===documentKey);
   assert.equal(proposed.proposedValue,expectedSub);assert.equal(proposed.evidence.page,2);assert.equal(proposed.evidence.sha256,document.sha256);assert.equal(proposed.evidence.version,1);assert.equal(proposed.lexicalEvidenceVerified,true);assert.equal(proposed.semanticEvidenceVerified,false);assert.equal(proposed.requiresHumanBinding,true);assert.deepEqual(record.bindings,[]);
   const original=await request(prefix+'/sources/'+sources.get(documentKey)+'/file?version=1&sha256='+document.sha256);assert.equal(original.status,200);assert.deepEqual(Buffer.from(await original.arrayBuffer()),document.bytes);
  }
  assert.ok(cadastre.result.proposals.every(p=>p.proposedDocumentRole==='unresolved'));assert.equal(cadastre.result.proposals.some(p=>p.field==='deed.date'),false);
  assert.deepEqual(provider.calls.map(c=>c.phase),['count','generate','count','generate']);
 });
 await t.test('binding and confirmation are separate, and an historical party remains explicitly historical',async()=>{
  const historical=await bind('succession','historical-mother','historical-owner');assert.equal(historical.status,'proposed');assert.equal(historical.confirmedValue,null);
  boundFacts.sub12=await bind('succession','succession-sub','property');assert.equal(boundFacts.sub12.status,'proposed');assert.equal(boundFacts.sub12.confirmedValue,null);
  const pending=await packet(boundFacts.sub12);assert.deepEqual(pending.fields,[]);assert.ok(pending.issues.some(i=>i.field==='cadastral.subaltern'&&i.code==='not_confirmed'));assert.equal(pending.canGenerateDraft,false);
  const confirmation=await command('review',{operation:'decide',factId:boundFacts.sub12.id,expectedFactVersion:boundFacts.sub12.version,action:'confirm',reason:null});boundFacts.sub12=confirmation.review.facts.find(f=>f.id===boundFacts.sub12.id);
  assert.equal(boundFacts.sub12.confirmedValue,'12');assert.equal(boundFacts.sub12.version,2);
  const declared=await command('review',{operation:'declare',unitId,subjectKey:'seller-luca',field:'party.name',value:fixture.people.heirs[0],visibility:'private'});const current=declared.review.facts.find(f=>f.subjectKey==='seller-luca');assert.equal(current.status,'proposed');assert.equal(current.origin,'declared');assert.deepEqual(current.evidence,[]);
  await command('review',{operation:'declare',unitId,subjectKey:'seller-sara',field:'party.name',value:fixture.people.heirs[1],visibility:'private'});
  const state=await review();assert.equal(state.facts.find(f=>f.id===historical.id).status,'proposed');assert.equal(state.facts.some(f=>f.subjectKey==='historical-owner'&&f.field==='party.role'),false);assert.equal(state.facts.filter(f=>f.field==='party.name'&&f.status==='confirmed').length,0);
 });
 await t.test('the explicit subaltern comparison records a difference without changing the confirmed value',async()=>{
  boundFacts.sub13=await bind('cadastre','cadastre-sub','property');
  const compared=await command('findings',{operation:'comparison',visibility:'private',question:{unitId,subjectKey:'property',epoch:'Situazione da verificare - documenti sintetici',field:'cadastral.subaltern',factIds:[boundFacts.sub12.id,boundFacts.sub13.id]}});
  const difference=compared.findings.comparisons[0];assert.equal(difference.status,'difference_to_review');assert.equal(difference.state,'open');assert.equal(difference.allConfirmed,false);assert.equal(difference.certification,false);assert.deepEqual(difference.values.map(v=>v.value).sort(),['12','13']);
  const state=await review();assert.equal(state.facts.find(f=>f.id===boundFacts.sub12.id).confirmedValue,'12');assert.equal(state.facts.find(f=>f.id===boundFacts.sub13.id).confirmedValue,null);
 });
 await t.test('succession and internal layout issues are manual observations, not automatic certifications',async()=>{
  const records=await proposals(),proof=records.records.find(r=>r.sourceId===sources.get('succession')).result.proposals.find(p=>p.candidateId==='succession-sub').evidence;
  await command('findings',{operation:'observation',unitId,kind:'succession_chain',description:'Madre proprietaria storica, due eredi dichiarati: catena successoria da verificare.',visibility:'private',evidence:[proof]});
  await command('findings',{operation:'observation',unitId,kind:'internal_layout',description:'Al sopralluogo sintetico si osserva una parete interna diversa dalla documentazione. Serve verifica tecnica.',visibility:'private',evidence:[proof]});
  const current=await findings();assert.equal(current.observations.length,2);assert.ok(current.observations.every(o=>o.state==='open'));assert.equal(current.comparisons[0].state,'open');assert.equal(current.certification,false);
  const prepared=await packet(boundFacts.sub12);assert.equal(prepared.fields.length,1);assert.equal(prepared.fields[0].value,'12');assert.equal(prepared.fields[0].evidence[0].sha256,fixture.documents[0].sha256);assert.ok(prepared.issues.some(i=>i.field==='cadastral.municipality'&&i.code==='missing'));assert.equal(prepared.templateState,'missing');assert.equal(prepared.canGenerateDraft,false);assert.equal(prepared.findingsAssessed,false);assert.equal(prepared.certification,false);assert.equal((await post(prefix+'/mandate-drafts',{})).status,404);
 });
 await t.test('reloading all views preserves proposals, decisions and issues without another provider dispatch',async()=>{
  const calls=provider.calls.length,before={review:await review(),findings:await findings(),proposals:await proposals()};
  for(const id of jobs)assert.equal((await json(await request(prefix+'/deed-analysis-jobs/'+id))).state,'completed_with_proposals');
  assert.deepEqual(await review(),before.review);assert.deepEqual(await findings(),before.findings);assert.deepEqual(await proposals(),before.proposals);assert.equal(provider.calls.length,calls);assert.equal(await db.agencyDocumentAnalysisJob.count({where:{practiceId}}),2);
  const hidden=await json(await request(prefix+'/deed-proposals',{},assignedAdmin));assert.deepEqual(hidden.records,[]);const otherReview=await json(await request(prefix+'/review',{},assignedAdmin)),otherFindings=await json(await request(prefix+'/findings',{},assignedAdmin));assert.deepEqual(otherReview.facts,[]);assert.deepEqual(otherFindings.observations,[]);assert.deepEqual(otherFindings.comparisons,[]);
 });
});
