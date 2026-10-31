// Synthetic originals and declarations only; run exclusively through the repository's owned offline DB runner.
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto'),path=require('node:path');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
const {GiftDocumentReleaseStore}=require('../dist/agency-practices/gift-document-release');
const receivedAuthor='Autore non verificato; documento ricevuto',generatedAuthor='Produzione dell’agenzia dichiarata dall’agente';
const rejected=code=>error=>error.code===code;
test('agent review bridges uploaded current files to Gift metadata on a new owned cluster',{timeout:180000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);
 const owned=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),db=new PrismaClient();
 await db.$connect();t.after(()=>db.$disconnect());
 const practices=new AgencyPracticesStore(db),releases=new GiftDocumentReleaseStore(db);
 const vault=await AgencyFileVault.open(path.join(owned.directory,'gift-release-vault-'+randomUUID()));
 const agency=await db.agency.create({data:{name:'Release agency DEMO'}}),foreign=await db.agency.create({data:{name:'Foreign release agency DEMO'}});
 const past=new Date('2026-01-01T00:00:00.000Z'),accounts=[];
 for(const role of ['admin','admin','viewer','agent']){
  const account=await db.account.create({data:{name:'Release agent DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic'}});
  await db.agencyMember.create({data:{agencyId:agency.id,accountId:account.id,role,validFrom:past}});accounts.push(account);
 }
 const [agent,other,viewer,readOnly]=accounts,bytes=Buffer.from('%PDF-1.4\nReceived final file DEMO\n%%EOF\n'),sha256=createHash('sha256').update(bytes).digest('hex');
 async function fixture(visibility='practice'){
  const practice=(await practices.create(agent.id,agency.id,'Gift release DEMO '+randomUUID(),randomUUID())).practice;
  for(const [account,access,canExport] of [[other,'edit',true],[viewer,'read',false],[readOnly,'read',true]]){
   await db.agencyPracticeGrant.create({data:{practiceId:practice.id,accountId:account.id,access,canExport,validFrom:past}});
  }
  const revision=async()=>(await practices.read(agent.id,agency.id,practice.id)).revision;
  await practices.upload(agent.id,agency.id,practice.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId:'document',visibility,originalFilename:'received-final-demo.pdf'}},bytes,vault);
  const input=async(overrides={})=>({key:randomUUID(),expectedRevision:await revision(),expectedSourceVersion:1,expectedSha256:sha256,title:'Documento finale DEMO',origin:'received',finalDocumentConfirmed:true,releaseApproved:true,...overrides});
  const release=(command,actor=agent,sourceId='document')=>releases.release(actor.id,agency.id,practice.id,sourceId,command);
  const snapshot=async()=>(await db.agencyPractice.findUniqueOrThrow({where:{id:practice.id}})).snapshot;
  return {practice,revision,input,release,snapshot};
 }
 await t.test('received release is durable, source-bound and truthful; no Home, document or benefit is created',async()=>{
  const f=await fixture(),missing=await releases.list(agent.id,agency.id,f.practice.id);
  assert.equal(missing.documents.length,1);assert.equal(missing.documents[0].state,'missing');
  assert.equal(missing.documents[0].filename,'received-final-demo.pdf');assert.equal(missing.documents[0].sourceVersion,1);assert.equal(missing.documents[0].sha256,sha256);
  assert.equal(missing.documents[0].descriptor,undefined);assert.equal(missing.certification,false);
  const homes=await db.home.count(),documents=await db.document.count(),benefits=await db.accountGiftBenefit.count();
  const command=await f.input(),saved=await f.release(command);assert.equal(saved.replay,false);
  const metadata=await new GiftDocumentReleaseStore(db).list(agent.id,agency.id,f.practice.id),entry=metadata.documents[0];
  assert.equal(entry.state,'current');assert.equal(entry.metadataVersion,1);assert.equal(metadata.revision,command.expectedRevision+1);
  assert.equal(entry.descriptor.origin,'received');assert.equal(entry.descriptor.author,receivedAuthor);assert.equal(entry.descriptor.lifecycle,'final');assert.equal(entry.descriptor.title,command.title);assert.equal(entry.descriptor.surface,undefined);
  assert.equal((await f.snapshot()).giftDocuments[0].recordedBy,agent.id);
  assert.doesNotMatch(JSON.stringify(metadata),/giftMetadataReceipts|recordId|recordedBy|receivedBy|tokenHash|passwordHash/);
  const packet=await practices.prepareGiftPacket(agent.id,agency.id,f.practice.id,{expectedRevision:metadata.revision,requestedHomeId:'gift-release-destination',recipients:[{subjectRef:'gift-recipient'}],documents:[{sourceId:'document',version:1,sha256}]});
  assert.equal(packet.documents[0].title,command.title);assert.equal(packet.documents[0].signatureVerification,'not_assessed');assert.equal(packet.canDeliver,false);
  entry.descriptor.title='Caller mutation';assert.equal((await releases.list(agent.id,agency.id,f.practice.id)).documents[0].descriptor.title,command.title);
  assert.equal(await db.home.count(),homes);assert.equal(await db.document.count(),documents);assert.equal(await db.accountGiftBenefit.count(),benefits);
 });
 await t.test('agency-produced upload is an attributed declaration, never a signature or approved mandate',async()=>{
  const f=await fixture(),command=await f.input({origin:'agency_generated',title:'Verbale consegna DEMO'});await f.release(command);
  const view=await releases.list(agent.id,agency.id,f.practice.id),descriptor=view.documents[0].descriptor;
  assert.equal(descriptor.author,generatedAuthor);assert.equal(descriptor.origin,'agency_generated');assert.equal(descriptor.lifecycle,'final');
  assert.equal(descriptor.surface,undefined);assert.equal(descriptor.signatureVerification,undefined);assert.equal(view.certification,false);
 });
 await t.test('all trusted surface qualifiers survive release and old-key replay cannot restore an older metadata revision',async()=>{
  const f=await fixture(),surface={kind:'commercial',qualification:'estimated',method:'Assumed A4 DEMO',geometryRevision:4,caveats:['Scale unverified','Owner review required']};
  await practices.registerGiftMetadata(agent.id,agency.id,f.practice.id,{agencyId:agency.id,practiceId:f.practice.id,sourceId:'document',sourceVersion:1,sha256,metadataVersion:1,origin:'agency_generated',lifecycle:'draft',author:'Synthetic existing producer',title:'Surface draft DEMO',surface},{key:randomUUID(),expectedRevision:await f.revision(),expectedMetadataVersion:null});
  const first=await f.input({origin:'agency_generated',title:'Surface final DEMO'}),saved=await f.release(first);
  assert.equal(saved.metadata.documents[0].metadataVersion,2);assert.deepEqual(saved.metadata.documents[0].descriptor.surface,surface);assert.equal(saved.metadata.documents[0].descriptor.lifecycle,'final');assert.equal(saved.metadata.documents[0].descriptor.author,'Synthetic existing producer');
  const second=await f.input({origin:'agency_generated',title:'Updated final title DEMO'});await f.release(second);
  const before=await f.snapshot(),replay=await new GiftDocumentReleaseStore(db).release(agent.id,agency.id,f.practice.id,'document',first);
  assert.equal(replay.replay,true);assert.equal(replay.receipt.recordId,saved.receipt.recordId);assert.deepEqual(await f.snapshot(),before);
  assert.equal(replay.metadata.documents[0].metadataVersion,3);assert.equal(replay.metadata.documents[0].descriptor.title,second.title);assert.deepEqual(replay.metadata.documents[0].descriptor.surface,surface);
  const changedSurface={...surface,geometryRevision:5,method:'Revised assumption DEMO',caveats:['Different current caveat']};
  await practices.registerGiftMetadata(agent.id,agency.id,f.practice.id,{...replay.metadata.documents[0].descriptor,metadataVersion:4,surface:changedSurface},{key:randomUUID(),expectedRevision:await f.revision(),expectedMetadataVersion:3});
  const newer=await f.snapshot(),historical=await f.release(first);
  assert.equal(historical.replay,true);assert.deepEqual(await f.snapshot(),newer);assert.deepEqual(historical.metadata.documents[0].descriptor.surface,changedSurface);
  const current=await f.release(await f.input({origin:'agency_generated'}));assert.equal(current.metadata.documents[0].metadataVersion,5);assert.deepEqual(current.metadata.documents[0].descriptor.surface,changedSurface);
 });
 await t.test('same-proof producer author, signed declaration and estimated surface survive explicit release and historical replay',async()=>{
  const f=await fixture(),surface={kind:'commercial',qualification:'estimated',method:'Synthetic producer paper assumption',geometryRevision:7,caveats:['Still an estimate','Signature not assessed']},author='Tecnico produttore DEMO';
  await practices.registerGiftMetadata(agent.id,agency.id,f.practice.id,{agencyId:agency.id,practiceId:f.practice.id,sourceId:'document',sourceVersion:1,sha256,metadataVersion:1,origin:'agency_generated',lifecycle:'signed',author,title:'Producer signed schedule DEMO',surface},{key:randomUUID(),expectedRevision:await f.revision(),expectedMetadataVersion:null});
  const first=await f.input({origin:'received',title:'Final title selected by agent DEMO'}),saved=await f.release(first),descriptor=saved.metadata.documents[0].descriptor;
  assert.equal(saved.metadata.documents[0].metadataVersion,2);assert.equal(descriptor.author,author);assert.equal(descriptor.lifecycle,'signed');assert.equal(descriptor.origin,'received');assert.equal(descriptor.title,first.title);assert.deepEqual(descriptor.surface,surface);
  const packet=await practices.prepareGiftPacket(agent.id,agency.id,f.practice.id,{expectedRevision:await f.revision(),requestedHomeId:'signed-release-destination',recipients:[{subjectRef:'gift-recipient'}],documents:[{sourceId:'document',version:1,sha256}]});
  assert.equal(packet.documents[0].lifecycle,'signed');assert.equal(packet.documents[0].signatureVerification,'not_assessed');assert.equal(packet.certification,false);
  const second=await f.input({origin:'agency_generated',title:'Newer explicit title DEMO'});await f.release(second);
  const before=await f.snapshot(),replay=await f.release(first);assert.equal(replay.replay,true);assert.equal(replay.receipt.recordId,saved.receipt.recordId);assert.deepEqual(await f.snapshot(),before);
  const current=replay.metadata.documents[0].descriptor;assert.equal(current.title,second.title);assert.equal(current.origin,'agency_generated');assert.equal(current.author,author);assert.equal(current.lifecycle,'signed');assert.deepEqual(current.surface,surface);
 });
 await t.test('concurrent identical requests append once; changed body with an old key conflicts without mutation',async()=>{
  const f=await fixture(),command=await f.input(),results=await Promise.all([f.release(command),f.release(command)]);
  assert.notEqual(results[0].replay,results[1].replay);assert.equal(results[0].receipt.recordId,results[1].receipt.recordId);
  const before=await f.snapshot();assert.equal(before.giftDocuments.length,1);assert.equal(before.giftMetadataReceipts.length,1);
  for(const change of [{title:'Different title'},{origin:'agency_generated'},{expectedRevision:command.expectedRevision+1}]){
   await assert.rejects(()=>f.release({...command,...change}),rejected('idempotency_conflict'));assert.deepEqual(await f.snapshot(),before);
  }
 });
 await t.test('practice CAS rejects a competing new command and preserves the winner',async()=>{
  const f=await fixture(),command=await f.input(),results=await Promise.allSettled([f.release(command),f.release({...command,key:randomUUID(),title:'Competitor DEMO'})]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.find(result=>result.status==='rejected').reason.code,'revision_conflict');
  const before=await f.snapshot();await assert.rejects(()=>f.release({...command,key:randomUUID()}),rejected('revision_conflict'));assert.deepEqual(await f.snapshot(),before);
 });
 await t.test('a replaced source exposes no stale metadata and cannot inherit old structured surface or replay old proof',async()=>{
  const f=await fixture(),surface={kind:'net',qualification:'estimated',method:'Prior assumed paper',geometryRevision:2,caveats:['Old unverified scale']};
  await practices.registerGiftMetadata(agent.id,agency.id,f.practice.id,{agencyId:agency.id,practiceId:f.practice.id,sourceId:'document',sourceVersion:1,sha256,metadataVersion:1,origin:'agency_generated',lifecycle:'final',author:'Historical producer DEMO',title:'PRIVATE OLD TITLE',surface},{key:randomUUID(),expectedRevision:await f.revision(),expectedMetadataVersion:null});
  const old=await f.input(),saved=await f.release(old);assert.equal(saved.metadata.documents[0].metadataVersion,2);
  const replacement=Buffer.from('%PDF-1.4\nReplacement received file DEMO\n%%EOF\n'),replacementSha=createHash('sha256').update(replacement).digest('hex');
  await practices.upload(agent.id,agency.id,f.practice.id,{key:randomUUID(),expectedRevision:await f.revision(),command:{operation:'replace',sourceId:'document',expectedSourceVersion:1,originalFilename:'current-demo.pdf'}},replacement,vault);
  const before=await f.snapshot(),stale=await releases.list(agent.id,agency.id,f.practice.id),entry=stale.documents[0];
  assert.equal(entry.state,'stale');assert.equal(entry.filename,'current-demo.pdf');assert.equal(entry.sourceVersion,2);assert.equal(entry.sha256,replacementSha);assert.equal(entry.descriptor,undefined);assert.equal(entry.metadataVersion,undefined);
  assert.doesNotMatch(JSON.stringify(stale),/PRIVATE OLD TITLE|Prior assumed paper|Historical producer|Old unverified scale/);
  await assert.rejects(()=>f.release(old),rejected('source_changed'));assert.deepEqual(await f.snapshot(),before);
  const changed=await f.release(await f.input({expectedSourceVersion:2,expectedSha256:replacementSha,title:'Current received DEMO'}));
  assert.equal(changed.metadata.documents[0].metadataVersion,3);assert.equal(changed.metadata.documents[0].descriptor.surface,undefined);assert.equal(changed.metadata.documents[0].descriptor.author,receivedAuthor);
 });
 await t.test('another assigned admin cannot list or release a private original; withdrawn documents vanish',async()=>{
  const f=await fixture('private'),command=await f.input();await f.release(command);
  assert.deepEqual((await releases.list(other.id,agency.id,f.practice.id)).documents,[]);
  const before=await f.snapshot();await assert.rejects(()=>f.release(command,other),rejected('access_denied'));assert.deepEqual(await f.snapshot(),before);
  await practices.mutate(agent.id,agency.id,f.practice.id,{key:randomUUID(),expectedRevision:await f.revision(),command:{operation:'withdraw',sourceId:'document',expectedSourceVersion:1}});
  assert.deepEqual((await releases.list(agent.id,agency.id,f.practice.id)).documents,[]);await assert.rejects(()=>f.release(command),rejected('access_denied'));
 });
 await t.test('foreign scope, read-only grant, viewer role and revoked export cannot release or recover authority by replay',async()=>{
  const f=await fixture(),command=await f.input(),before=await f.snapshot();
  await assert.rejects(()=>releases.list(agent.id,foreign.id,f.practice.id),rejected('access_denied'));
  await assert.rejects(()=>releases.release(agent.id,foreign.id,f.practice.id,'document',command),rejected('access_denied'));
  assert.equal((await releases.list(readOnly.id,agency.id,f.practice.id)).documents.length,1);
  for(const actor of [readOnly,viewer])await assert.rejects(()=>f.release(command,actor),rejected('access_denied'));
  await assert.rejects(()=>releases.list(viewer.id,agency.id,f.practice.id),rejected('access_denied'));assert.deepEqual(await f.snapshot(),before);
  await f.release(command);const released=await f.snapshot();
  await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.practice.id,accountId:agent.id}},data:{canExport:false}});
  await assert.rejects(()=>f.release(command),rejected('access_denied'));await assert.rejects(()=>releases.list(agent.id,agency.id,f.practice.id),rejected('access_denied'));assert.deepEqual(await f.snapshot(),released);
 });
 await t.test('client metadata privilege attempts and invalid source identities fail without consuming key or changing snapshot',async()=>{
  const f=await fixture(),command=await f.input(),before=await f.snapshot();
  for(const field of ['descriptor','author','surface','lifecycle','signed','metadataVersion','expectedMetadataVersion','accountId','agencyId','practiceId','homeId','certification']){
   await assert.rejects(()=>f.release({...command,[field]:{injected:true}}),rejected('invalid_input'));assert.deepEqual(await f.snapshot(),before);
  }
  for(const sourceId of ['', ' document', 'document ', 'x'.repeat(101),'document\n',null]){
   await assert.rejects(()=>f.release(command,agent,sourceId),rejected('invalid_input'));assert.deepEqual(await f.snapshot(),before);
  }
  const result=await f.release(command);assert.equal(result.replay,false);
 });
});
