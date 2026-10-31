// Real owned filesystem and database; scanner receipts below are SYNTHETIC, not a real antivirus verdict.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto'),path=require('node:path');
const {readFile,unlink,readdir}=require('node:fs/promises');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
const {GiftInvitationsStore}=require('../dist/agency-practices/gift-invitations-store');
const {GiftAcceptanceStore}=require('../dist/agency-practices/gift-acceptance-store');
const {GiftAcceptanceWorker}=require('../dist/agency-practices/gift-acceptance-worker');
const {GiftBenefitsStore}=require('../dist/agency-practices/gift-benefits-store');
const {stageGiftOriginal}=require('../dist/agency-practices/gift-file-admission');
const {LocalFileStorage}=require('../dist/documents/storage'),{fileControlUnavailable}=require('../dist/documents/file-control');
const {DocumentsService}=require('../dist/documents/documents.service'),{DocumentPolicy}=require('../dist/documents/access'),{TrashService}=require('../dist/documents/trash.service');
const {png,pdf}=require('./document-fixtures.cjs');
const denied=(...codes)=>error=>codes.includes(error.code);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// This suite never starts a web server, background poller, real scanner or AI/provider transport.
test('Gift copier accepts synthetic bytes on a new owned cluster; independent Home and optional full-access year',{timeout:240000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);
 const owned=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const practices=new AgencyPracticesStore(db),invites=new GiftInvitationsStore(db),jobs=new GiftAcceptanceStore(db),past=new Date('2026-01-01T00:00:00.000Z');
 const agency=await db.agency.create({data:{name:'Gift copier Agency DEMO'}}),issuer=await db.account.create({data:{name:'Gift copier issuer DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic'}});
 await db.agencyMember.create({data:{agencyId:agency.id,accountId:issuer.id,role:'admin',validFrom:past}});
 async function fixture({annualBenefit=false,scannerFails=false,afterScan}={}){
  const recipient=await db.account.create({data:{name:'Gift copier recipient DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:past}});
  const p=(await practices.create(issuer.id,agency.id,'Gift copier practice DEMO '+randomUUID(),randomUUID())).practice;
  const revision=async()=>(await practices.read(issuer.id,agency.id,p.id)).revision;
  const vaultRoot=path.join(owned.directory,'gift-worker-source-'+randomUUID()),vault=await AgencyFileVault.open(vaultRoot);
  const sourceBytes=[Buffer.from(png),Buffer.concat([png,Buffer.from('synthetic version 2')]),Buffer.concat([png,Buffer.from('synthetic version 3')])],bytes=sourceBytes[2],sha256=sha(bytes),sourceId='gift-selected-source';
  await practices.upload(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId,visibility:'practice',originalFilename:'gift-worker-DEMO.png'}},sourceBytes[0],vault);
  // The delivered Home has its own version 1, even when the selected Agency source is version 3.
  for(const sourceVersion of [1,2])await practices.upload(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'replace',sourceId,expectedSourceVersion:sourceVersion,originalFilename:'gift-worker-DEMO.png'}},sourceBytes[sourceVersion],vault);
  await practices.upload(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId:'gift-unselected-source',visibility:'practice',originalFilename:'not-selected-DEMO.pdf'}},pdf,vault);
  const surface={kind:'commercial',qualification:'estimated',method:'Assumed A4',geometryRevision:7,caveats:['Paper size unverified','Owner must review measured outlines']};
  await practices.registerGiftMetadata(issuer.id,agency.id,p.id,{agencyId:agency.id,practiceId:p.id,sourceId,sourceVersion:3,sha256,metadataVersion:1,origin:'agency_generated',lifecycle:'final',author:'Agency author DEMO',title:'Selected surface schedule DEMO',surface},{key:randomUUID(),expectedRevision:await revision(),expectedMetadataVersion:null});
  const invitation=await invites.create(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),documents:[{sourceId,version:3,sha256}],recipientEmail:recipient.email,stipulationCompleted:true,releaseApproved:true,annualBenefit});
  const association=await invites.claim(recipient.id,invitation.id,invitation.secret,invitation.version);
  const command={key:randomUUID(),expectedInvitationVersion:association.version,home:{name:' Casa ricevuta DEMO ',address:' Via ricevuta DEMO 1 '}};
  const scans=[],storage=new LocalFileStorage({scan:async(stage,expectedSha)=>{
   scans.push({stage,sha256:expectedSha});assert.equal(expectedSha,sha256);assert.deepEqual(await readFile(stage),bytes);
   const relative=path.relative(storage.root,stage);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));assert.ok(stage.endsWith('.bin.part'));
   if(typeof scannerFails==='function'?await scannerFails(scans.length):scannerFails)throw fileControlUnavailable();
   if(afterScan)await afterScan({db,p,recipient,issuer,agency});
   return {engine:'microsoft_defender',checkedAt:new Date(),signatureVersion:'synthetic-gift-worker-no-real-av'};
  }});storage.root=path.join(owned.directory,'gift-worker-home-'+randomUUID());
  const worker=new GiftAcceptanceWorker(db,vault,storage),begin=()=>jobs.begin(recipient.id,invitation.id,invitation.secret,command);
  return {recipient,p,revision,vaultRoot,vault,bytes,sha256,sourceId,surface,invitation,association,command,storage,scans,worker,begin};
 }
 const rowFor=jobId=>db.agencyGiftAcceptanceJob.findUniqueOrThrow({where:{id:jobId}});
 async function assertNoHome(f,jobId){
  const row=await rowFor(jobId);assert.equal(await db.home.findUnique({where:{id:row.homeId}}),null);assert.equal(await db.document.count({where:{homeId:row.homeId}}),0);
  assert.equal(await db.agencyGiftAcceptanceReceipt.count({where:{jobId}}),0);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),0);
 }
 async function accepted(f){
  const queued=await f.begin(),run=await f.worker.runNext(queued.jobId);assert.equal(run.jobId,queued.jobId);assert.equal(run.state,'accepted');assert.equal(run.replay,false);
  const status=await jobs.get(f.recipient.id,queued.jobId);assert.equal(status.state,'accepted');assert.equal(status.jobId,queued.jobId);assert.ok(status.homeId);assert.equal(status.documents.length,1);
  return {queued,run,status};
 }
 const noPrivateResult=(value,f)=>{
  const wire=JSON.stringify(value);assert.doesNotMatch(wire,/"(?:secret|tokenHash|recipientEmail|storageKey|sourceFingerprint|packet|homeInput|manifest)"/);
  for(const secret of [f.invitation.secret,f.recipient.email,'gift-selected-source','not-selected-DEMO.pdf','Via ricevuta DEMO 1'])assert.equal(wire.includes(secret),false);
 };
 await t.test('claim alone reserves no Home, document, receipt or annual benefit',async()=>{
  const f=await fixture({annualBenefit:true}),invite=await db.agencyGiftInvitation.findUniqueOrThrow({where:{id:f.invitation.id}});
  assert.equal(invite.state,'claimed');assert.equal(await db.home.findUnique({where:{id:invite.snapshot.packet.requestedHomeId}}),null);
  assert.equal(await db.document.count({where:{homeId:invite.snapshot.packet.requestedHomeId}}),0);assert.equal(await db.agencyGiftAcceptanceJob.count({where:{invitationId:f.invitation.id}}),0);
  assert.equal(await db.agencyGiftAcceptanceReceipt.count({where:{invitationId:f.invitation.id}}),0);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),0);assert.equal(f.scans.length,0);
  assert.deepEqual(invite.snapshot.annualBenefit,{requested:true,offerId:'dimora-full-access-v1',offerVersion:1,activated:false});
 });
 await t.test('acceptance without annual flag delivers only the selected private original to the sole owner; local and source versions stay distinct',async()=>{
  const f=await fixture(),{status}=await accepted(f),home=await db.home.findUniqueOrThrow({where:{id:status.homeId}}),members=await db.homeMembership.findMany({where:{homeId:status.homeId}});
  assert.equal(home.name,'Casa ricevuta DEMO');assert.equal(home.address,'Via ricevuta DEMO 1');assert.equal(members.length,1);assert.equal(members[0].accountId,f.recipient.id);assert.equal(members[0].role,'owner');assert.equal(members[0].revokedAt,null);assert.equal(await db.agencyMember.count({where:{accountId:f.recipient.id}}),0);
  assert.equal(status.benefit,null);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),0);assert.equal(f.scans.length,1);
  const doc=await db.document.findUniqueOrThrow({where:{id:status.documents[0].documentId},include:{original:{include:{file:true}}}});
  assert.equal(await db.document.count({where:{homeId:home.id}}),1);assert.equal(doc.homeId,home.id);assert.equal(doc.uploaderId,f.recipient.id);assert.equal(doc.visibility,'private');assert.equal(doc.original.version,1);assert.equal(doc.original.sha256,f.sha256);assert.equal(status.documents[0].sha256,f.sha256);
  assert.equal(doc.original.fileControlEngine,'microsoft_defender');assert.equal(doc.original.fileControlSignature,'synthetic-gift-worker-no-real-av');assert.ok(doc.original.fileControlCheckedAt instanceof Date);
  assert.deepEqual(doc.giftProvenance,{schemaVersion:1,kind:'agency_gift',invitationId:f.invitation.id,agencyId:agency.id,practiceId:f.p.id,sourceId:f.sourceId,sourceVersion:3,sourceSha256:f.sha256,metadataVersion:1,origin:'agency_generated',author:'Agency author DEMO',title:'Selected surface schedule DEMO',surface:f.surface});
  assert.deepEqual(await f.storage.read(doc.original.file.storageKey),f.bytes);
  const documents=new DocumentsService(db,f.storage,new DocumentPolicy(db)),opened=await documents.get(f.recipient.id,home.id,doc.id);assert.equal(opened.document.source,'agency_gift');assert.equal(opened.document.version,1);assert.deepEqual(opened.document.giftProvenance.surface.caveats,f.surface.caveats);
  await assert.rejects(()=>documents.get(issuer.id,home.id,doc.id),error=>error.getStatus()===403);await assert.rejects(()=>jobs.get(issuer.id,status.jobId),denied('unavailable'));noPrivateResult(status,f);
 });
 await t.test('annual flag activates one full-access calendar year exactly at acceptance',async()=>{
  const f=await fixture({annualBenefit:true}),before=Date.now(),{status}=await accepted(f),after=Date.now(),benefit=status.benefit;assert.ok(benefit);
  assert.equal(benefit.schemaVersion,1);assert.equal(benefit.accountId,f.recipient.id);assert.equal(benefit.offerId,'dimora-full-access-v1');assert.equal(benefit.offerVersion,1);assert.equal(benefit.startsAt,status.acceptedAt);assert.ok(Date.parse(benefit.startsAt)>=before&&Date.parse(benefit.startsAt)<=after);
  const expectedEnd=new Date(benefit.startsAt);expectedEnd.setUTCFullYear(expectedEnd.getUTCFullYear()+1);assert.equal(benefit.endsAt,expectedEnd.toISOString());
  const persisted=await db.accountGiftBenefit.findUniqueOrThrow({where:{receiptId:benefit.receiptId}});assert.equal(persisted.id,benefit.id);assert.equal(persisted.accountId,f.recipient.id);assert.equal(persisted.startsAt.toISOString(),benefit.startsAt);assert.equal(persisted.endsAt.toISOString(),benefit.endsAt);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),1);
  const receipt=await db.agencyGiftAcceptanceReceipt.findUniqueOrThrow({where:{jobId:status.jobId}});assert.equal(receipt.id,benefit.receiptId);assert.equal(receipt.acceptedAt.toISOString(),status.acceptedAt);noPrivateResult(status,f);
 });
 await t.test('accepted Home bytes stay independent after removal of owned Agency source bytes and issuer export revocation',async()=>{
  const f=await fixture(),{status}=await accepted(f),doc=await db.document.findUniqueOrThrow({where:{id:status.documents[0].documentId},include:{original:{include:{file:true}}}}),sourcePath=path.join(f.vaultRoot,'object-'+f.sha256);
  assert.notEqual(path.resolve(f.storage.path(doc.original.file.storageKey)).toLowerCase(),path.resolve(sourcePath).toLowerCase());
  // Deliberately remove this exact synthetic object only; do not remove a vault or a shared storage root.
  assert.equal(path.dirname(sourcePath),f.vaultRoot);await unlink(sourcePath);await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:issuer.id}},data:{canExport:false}});
  await assert.rejects(()=>f.vault.read(f.sha256,f.bytes.length));assert.deepEqual(await f.storage.read(doc.original.file.storageKey),f.bytes);
  const documents=new DocumentsService(db,f.storage,new DocumentPolicy(db)),opened=await documents.get(f.recipient.id,status.homeId,doc.id);assert.equal(opened.document.sha256,f.sha256);assert.equal((await jobs.get(f.recipient.id,status.jobId)).homeId,status.homeId);
 });
 await t.test('accepted begin, worker and receipt replay retain IDs and the original year despite token revoke, changed email and revoked issuer export',async()=>{
  const f=await fixture({annualBenefit:true}),{queued,status}=await accepted(f),before=await db.agencyGiftAcceptanceReceipt.findUniqueOrThrow({where:{jobId:queued.jobId}});
  await invites.revoke(issuer.id,agency.id,f.p.id,f.invitation.id,f.association.version);await db.account.update({where:{id:f.recipient.id},data:{email:randomUUID()+'@example.test',emailVerifiedAt:past}});await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:issuer.id}},data:{canExport:false}});
  const replay=await f.begin(),rerun=await f.worker.runNext(queued.jobId),again=await jobs.get(f.recipient.id,queued.jobId);assert.equal(replay.replay,true);assert.equal(replay.state,'accepted');assert.equal(replay.jobId,queued.jobId);assert.equal(rerun.replay,true);assert.equal(rerun.state,'accepted');
  assert.equal(again.homeId,status.homeId);assert.equal(again.acceptedAt,status.acceptedAt);assert.deepEqual(again.documents,status.documents);assert.deepEqual(again.benefit,status.benefit);assert.equal(f.scans.length,1);
  assert.deepEqual(await db.agencyGiftAcceptanceReceipt.findUniqueOrThrow({where:{jobId:queued.jobId}}),before);assert.equal(await db.homeMembership.count({where:{homeId:status.homeId}}),1);assert.equal(await db.document.count({where:{homeId:status.homeId}}),1);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),1);
 });
 await t.test('synthetic scanner rejection leaves a retryable job and no Home, document, receipt or year',async()=>{
  const f=await fixture({annualBenefit:true,scannerFails:true}),queued=await f.begin(),result=await f.worker.runNext(queued.jobId);assert.equal(result.state,'retryable');assert.equal(result.replay,false);assert.equal(f.scans.length,1);await assertNoHome(f,queued.jobId);
  assert.deepEqual(await readdir(f.storage.root),[]);noPrivateResult(result,f);
 });
 await t.test('source replaced after queueing blocks review before publishing Home or activating annual benefit',async()=>{
  const f=await fixture({annualBenefit:true}),queued=await f.begin();await practices.upload(issuer.id,agency.id,f.p.id,{key:randomUUID(),expectedRevision:await f.revision(),command:{operation:'replace',sourceId:f.sourceId,expectedSourceVersion:3,originalFilename:'replacement-DEMO.png'}},Buffer.concat([png,Buffer.from('synthetic replacement')]),f.vault);
  const result=await f.worker.runNext(queued.jobId);assert.equal(result.state,'blocked_review');assert.equal(result.replay,false);await assertNoHome(f,queued.jobId);assert.equal(f.scans.length,0);noPrivateResult(result,f);
 });
 await t.test('owner can trash, restore and permanently purge a delivered Gift original without receipt replay resurrecting it',async()=>{
  const f=await fixture(),{queued,status}=await accepted(f),id=status.documents[0].documentId,before=await db.document.findUniqueOrThrow({where:{id},include:{original:{include:{file:true}}}}),policy=new DocumentPolicy(db),trash=new TrashService(db,f.storage,policy),documents=new DocumentsService(db,f.storage,policy);
  const moved=await trash.trash(f.recipient.id,status.homeId,id,{expectedVersion:1},randomUUID());assert.deepEqual((await db.document.findUniqueOrThrow({where:{id}})).giftProvenance,before.giftProvenance);
  await trash.restore(f.recipient.id,status.homeId,id,{expectedVersion:moved.entry.version},randomUUID());assert.equal((await documents.get(f.recipient.id,status.homeId,id)).document.source,'agency_gift');
  const again=await trash.trash(f.recipient.id,status.homeId,id,{expectedVersion:1},randomUUID());await trash.purgeNow(f.recipient.id,status.homeId,id,{expectedVersion:again.entry.version},randomUUID());
  await assert.rejects(()=>f.storage.read(before.original.file.storageKey));await assert.rejects(()=>documents.get(f.recipient.id,status.homeId,id),error=>error.getStatus()===403);
  const receipt=await jobs.get(f.recipient.id,queued.jobId);assert.deepEqual(receipt.documents,status.documents);assert.equal(receipt.homeId,status.homeId);assert.equal((await f.worker.runNext(queued.jobId)).replay,true);await f.begin();
  const purged=await db.document.findUniqueOrThrow({where:{id},include:{original:true}});assert.ok(purged.purgedAt);assert.equal(purged.name,'');assert.equal(purged.original,null);assert.equal(purged.giftProvenance,null);assert.equal(await db.document.count({where:{homeId:status.homeId}}),1);assert.equal(f.scans.length,1);await assert.rejects(()=>f.storage.read(before.original.file.storageKey));
 });
 await t.test('same or nested Agency/Home roots are rejected before any Gift Home is published',async()=>{
  for(const location of ['same','home-inside-vault','vault-inside-home']){
   const f=await fixture(),queued=await f.begin();f.storage.root=location==='same'?f.vaultRoot:location==='home-inside-vault'?path.join(f.vaultRoot,'home-child'):path.dirname(f.vaultRoot);
   const result=await f.worker.runNext(queued.jobId);assert.equal(result.state,'blocked_review');assert.equal(result.replay,false);await assertNoHome(f,queued.jobId);assert.equal(f.scans.length,0);
  }
 });
 await t.test('concurrent worker callers share the durable lease and one copy; live lease cannot be cancelled',async()=>{
  let reached,release;const reachedScan=new Promise(resolve=>{reached=resolve;}),continueScan=new Promise(resolve=>{release=resolve;});
  const f=await fixture({annualBenefit:true,afterScan:async()=>{reached();await continueScan;}}),queued=await f.begin(),first=f.worker.runNext(queued.jobId);
  await reachedScan;
  try{
   const other=await new GiftAcceptanceWorker(db,f.vault,f.storage).runNext(queued.jobId);assert.equal(other.jobId,queued.jobId);assert.equal(other.state,'staging');assert.equal(other.replay,true);
   await assert.rejects(()=>f.worker.cancel(f.recipient.id,queued.jobId),denied('revision_conflict'));await assertNoHome(f,queued.jobId);
  }finally{release();}
  assert.equal((await first).state,'accepted');const result=await jobs.get(f.recipient.id,queued.jobId);assert.equal(result.state,'accepted');assert.equal(f.scans.length,1);
  assert.equal(await db.document.count({where:{homeId:result.homeId}}),1);assert.equal(await db.homeMembership.count({where:{accountId:f.recipient.id}}),1);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),1);assert.equal((await f.begin()).jobId,queued.jobId);
 });
 await t.test('a single synthetic scanner outage retries the same job and publishes exactly one Home and original',async()=>{
  const f=await fixture({annualBenefit:true,scannerFails:attempt=>attempt===1}),queued=await f.begin();assert.equal((await f.worker.runNext(queued.jobId)).state,'retryable');await assertNoHome(f,queued.jobId);
  const retry=await new GiftAcceptanceWorker(db,f.vault,f.storage).runNext(queued.jobId);assert.equal(retry.state,'accepted');assert.equal(retry.replay,false);const result=await jobs.get(f.recipient.id,queued.jobId);
  assert.equal(f.scans.length,2);assert.equal((await rowFor(queued.jobId)).attempts,2);assert.equal(await db.homeMembership.count({where:{accountId:f.recipient.id}}),1);assert.equal(await db.document.count({where:{homeId:result.homeId}}),1);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),1);assert.equal((await readdir(f.storage.root)).filter(name=>name.endsWith('.bin')).length,1);
  const replay=await f.begin();assert.equal(replay.jobId,queued.jobId);assert.equal(replay.replay,true);assert.deepEqual(replay.documents,result.documents);assert.deepEqual(replay.benefit,result.benefit);
 });
 await t.test('an admitted copy from an expired earlier lease resumes without rescanning or replacing its reserved bytes',async()=>{
  const f=await fixture(),queued=await f.begin(),job=await rowFor(queued.jobId),item=await db.agencyGiftAcceptanceItem.findFirstOrThrow({where:{jobId:queued.jobId}}),proof=job.manifest.packet.documents[0];
  const staged=await stageGiftOriginal(()=>f.vault.read(proof.sha256,proof.byteSize),proof,f.storage);
  // Only mutable worker state is manufactured; immutable preparation/checksum and source proof remain original.
  await db.storedFile.create({data:{id:item.storedFileId,storageKey:staged.storageKey}});
  await db.agencyGiftAcceptanceItem.update({where:{id:item.id},data:{state:'admitted',storageKey:staged.storageKey,control:JSON.parse(JSON.stringify(staged.control)),admittedEpoch:1}});
  await db.agencyGiftAcceptanceJob.update({where:{id:job.id},data:{state:'staging',version:{increment:1},leaseEpoch:1,leaseTokenHash:sha(Buffer.from('expired synthetic lease')),leaseUntil:new Date(Date.now()-60000),attempts:1}});
  const result=await new GiftAcceptanceWorker(db,f.vault,f.storage).runNext(job.id);assert.equal(result.state,'accepted');assert.equal(result.replay,false);assert.equal(f.scans.length,1);
  const status=await jobs.get(f.recipient.id,job.id),doc=await db.document.findUniqueOrThrow({where:{id:status.documents[0].documentId},include:{original:{include:{file:true}}}});
  assert.equal(doc.id,item.documentId);assert.equal(doc.original.id,item.documentVersionId);assert.equal(doc.original.fileId,item.storedFileId);assert.equal(doc.original.file.storageKey,staged.storageKey);assert.deepEqual(await f.storage.read(staged.storageKey),f.bytes);assert.equal((await rowFor(job.id)).leaseEpoch,2);assert.equal((await rowFor(job.id)).attempts,2);
 });
 await t.test('cancelling a staged blocked job removes only its unlinked reservation and owned copy, never other files or Agency bytes',async()=>{
  const f=await fixture({annualBenefit:true,afterScan:async({db,p,issuer})=>{await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:p.id,accountId:issuer.id}},data:{canExport:false}});}}),queued=await f.begin();
  const blocked=await f.worker.runNext(queued.jobId);assert.equal(blocked.state,'blocked_review');await assertNoHome(f,queued.jobId);
  const item=await db.agencyGiftAcceptanceItem.findFirstOrThrow({where:{jobId:queued.jobId}});assert.equal(item.state,'admitted');assert.ok(item.storageKey);assert.ok(await db.storedFile.findUnique({where:{id:item.storedFileId}}));assert.deepEqual(await f.storage.read(item.storageKey),f.bytes);
  const unrelated=await f.storage.writeVerified(f.bytes),unrelatedId=randomUUID();await db.storedFile.create({data:{id:unrelatedId,storageKey:unrelated.key}});
  const cancelled=await f.worker.cancel(f.recipient.id,queued.jobId);assert.equal(cancelled.state,'cancelled');assert.equal(cancelled.replay,false);await assertNoHome(f,queued.jobId);
  assert.equal(await db.storedFile.findUnique({where:{id:item.storedFileId}}),null);await assert.rejects(()=>f.storage.read(item.storageKey));assert.deepEqual(await f.storage.read(unrelated.key),f.bytes);assert.ok(await db.storedFile.findUnique({where:{id:unrelatedId}}));assert.deepEqual(await f.vault.read(f.sha256,f.bytes.length),f.bytes);
  const status=await jobs.get(f.recipient.id,queued.jobId);assert.equal(status.state,'cancelled');noPrivateResult(status,f);const replay=await f.worker.cancel(f.recipient.id,queued.jobId);assert.equal(replay.state,'cancelled');assert.equal(replay.replay,true);assert.equal((await f.worker.runNext(queued.jobId)).state,'cancelled');await assertNoHome(f,queued.jobId);
 });
 await t.test('cancel requires the job owner, is idempotent for queued work, and cannot undo an accepted receipt',async()=>{
  const f=await fixture(),queued=await f.begin();await assert.rejects(()=>f.worker.cancel(issuer.id,queued.jobId),denied('unavailable'));assert.equal((await rowFor(queued.jobId)).state,'queued');
  const cancelled=await f.worker.cancel(f.recipient.id,queued.jobId);assert.equal(cancelled.state,'cancelled');assert.equal(cancelled.replay,false);assert.equal((await f.worker.cancel(f.recipient.id,queued.jobId)).replay,true);await assertNoHome(f,queued.jobId);assert.equal(f.scans.length,0);
  const completed=await fixture({annualBenefit:true}),{status}=await accepted(completed);await assert.rejects(()=>completed.worker.cancel(completed.recipient.id,status.jobId),denied('unavailable'));await assert.rejects(()=>completed.worker.cancel(issuer.id,status.jobId),denied('unavailable'));
  const unchanged=await jobs.get(completed.recipient.id,status.jobId);assert.equal(unchanged.state,'accepted');assert.equal(unchanged.homeId,status.homeId);assert.deepEqual(unchanged.documents,status.documents);assert.deepEqual(unchanged.benefit,status.benefit);
 });
 await t.test('a failure after actual Document creation rolls back publication atomically and retries the admitted reservation without a new scan',async()=>{
  const f=await fixture({annualBenefit:true}),queued=await f.begin(),job=await rowFor(queued.jobId),planned=await db.agencyGiftAcceptanceItem.findFirstOrThrow({where:{jobId:queued.jobId}});let injected=false,createdInside=null;
  const faultDb={$transaction:async(work,options)=>db.$transaction(async tx=>{
   const document=new Proxy(tx.document,{get(target,key){
    if(key==='create')return async(...args)=>{const created=await target.create(...args);createdInside=created.id;assert.equal(created.id,planned.documentId);assert.ok(await tx.home.findUnique({where:{id:job.homeId}}));if(!injected){injected=true;throw new Error('synthetic failure after actual document create');}return created;};
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
   }});
   const wrapped=new Proxy(tx,{get(target,key){if(key==='document')return document;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});return work(wrapped);
  },options)};
  const failed=await new GiftAcceptanceWorker(faultDb,f.vault,f.storage).runNext(queued.jobId);assert.equal(failed.state,'retryable');assert.equal(failed.replay,false);assert.equal(injected,true);assert.equal(createdInside,planned.documentId);await assertNoHome(f,queued.jobId);
  assert.equal(await db.document.findUnique({where:{id:createdInside}}),null);assert.equal(await db.documentVersion.findUnique({where:{id:planned.documentVersionId}}),null);
  const admitted=await db.agencyGiftAcceptanceItem.findUniqueOrThrow({where:{id:planned.id}});assert.equal(admitted.state,'admitted');assert.ok(admitted.storageKey);assert.equal((await db.storedFile.findUniqueOrThrow({where:{id:planned.storedFileId}})).storageKey,admitted.storageKey);assert.deepEqual(await f.storage.read(admitted.storageKey),f.bytes);assert.equal(f.scans.length,1);
  const completed=await f.worker.runNext(queued.jobId);assert.equal(completed.state,'accepted');assert.equal(completed.replay,false);const receipt=await jobs.get(f.recipient.id,queued.jobId);assert.equal(receipt.homeId,job.homeId);assert.deepEqual(receipt.documents,[{documentId:planned.documentId,sha256:f.sha256}]);assert.equal(f.scans.length,1);
  const original=await db.documentVersion.findUniqueOrThrow({where:{id:planned.documentVersionId},include:{file:true}});assert.equal(original.fileId,planned.storedFileId);assert.equal(original.file.storageKey,admitted.storageKey);assert.equal(await db.document.count({where:{homeId:job.homeId}}),1);assert.equal(await db.homeMembership.count({where:{accountId:f.recipient.id}}),1);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),1);assert.equal((await rowFor(queued.jobId)).attempts,2);
 });
 await t.test('a lost result after accepted transaction commit resolves from the durable receipt without compensating bytes or extending the year',async()=>{
  const f=await fixture({annualBenefit:true}),queued=await f.begin(),planned=await db.agencyGiftAcceptanceItem.findFirstOrThrow({where:{jobId:queued.jobId}}),removed=[];let lost=false;
  const actualRemove=f.storage.remove.bind(f.storage);f.storage.remove=async key=>{removed.push(key);return actualRemove(key);};
  const faultDb={$transaction:async(work,options)=>{const result=await db.$transaction(work,options);if(!lost&&result&&result.jobId===queued.jobId&&result.state==='accepted'&&result.replay===false){lost=true;throw new Error('synthetic result lost after successful commit');}return result;}};
  const outcome=await new GiftAcceptanceWorker(faultDb,f.vault,f.storage).runNext(queued.jobId);assert.equal(lost,true);assert.equal(outcome.state,'accepted');assert.equal(outcome.replay,true);
  const receipt=await jobs.get(f.recipient.id,queued.jobId),storedReceipt=await db.agencyGiftAcceptanceReceipt.findUniqueOrThrow({where:{jobId:queued.jobId}}),benefit=await db.accountGiftBenefit.findUniqueOrThrow({where:{receiptId:storedReceipt.id}}),doc=await db.document.findUniqueOrThrow({where:{id:planned.documentId},include:{original:{include:{file:true}}}});
  assert.equal(receipt.homeId,storedReceipt.homeId);assert.equal(receipt.acceptedAt,storedReceipt.acceptedAt.toISOString());assert.deepEqual(receipt.documents,[{documentId:planned.documentId,sha256:f.sha256}]);assert.equal(receipt.benefit.id,benefit.id);assert.equal(receipt.benefit.startsAt,benefit.startsAt.toISOString());assert.equal(receipt.benefit.endsAt,benefit.endsAt.toISOString());assert.deepEqual(await f.storage.read(doc.original.file.storageKey),f.bytes);
  assert.equal((await f.begin()).replay,true);assert.equal((await f.worker.runNext(queued.jobId)).replay,true);assert.deepEqual((await jobs.get(f.recipient.id,queued.jobId)).benefit,receipt.benefit);assert.deepEqual(await db.agencyGiftAcceptanceReceipt.findUniqueOrThrow({where:{jobId:queued.jobId}}),storedReceipt);assert.deepEqual(await db.accountGiftBenefit.findUniqueOrThrow({where:{id:benefit.id}}),benefit);
  assert.equal(await db.homeMembership.count({where:{accountId:f.recipient.id}}),1);assert.equal(await db.document.count({where:{homeId:receipt.homeId}}),1);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),1);assert.equal(f.scans.length,1);assert.deepEqual(removed,[]);assert.deepEqual(await readdir(f.storage.root),[doc.original.file.storageKey]);
 });
 await t.test('a replaced lease fences the old worker before admission; ordinary cleanup later removes only its unreserved orphan',async()=>{
  let jobId,newHolder=null;
  const f=await fixture({annualBenefit:true,afterScan:async()=>{
   if(newHolder)return;const row=await rowFor(jobId);newHolder=await db.agencyGiftAcceptanceJob.update({where:{id:jobId},data:{leaseEpoch:row.leaseEpoch+1,leaseTokenHash:sha(Buffer.from('new synthetic lease holder')),leaseUntil:new Date(Date.now()+120000),version:{increment:1}}});
  }}),queued=await f.begin();jobId=queued.jobId;const planned=await db.agencyGiftAcceptanceItem.findFirstOrThrow({where:{jobId}});
  const obsolete=await f.worker.runNext(jobId);assert.equal(obsolete.state,'staging');assert.equal(obsolete.replay,true);assert.ok(newHolder);assert.deepEqual(await rowFor(jobId),newHolder);await assertNoHome(f,jobId);
  const untouched=await db.agencyGiftAcceptanceItem.findUniqueOrThrow({where:{id:planned.id}});assert.equal(untouched.state,'pending');assert.equal(untouched.storageKey,null);assert.equal(untouched.control,null);assert.equal(await db.storedFile.findUnique({where:{id:planned.storedFileId}}),null);assert.equal(f.scans.length,1);
  const orphans=(await readdir(f.storage.root)).filter(name=>name.endsWith('.bin'));assert.equal(orphans.length,1);assert.deepEqual(await f.storage.read(orphans[0]),f.bytes);
  // Expire only the newer synthetic lease, preserving its identity and the immutable preparation.
  await db.agencyGiftAcceptanceJob.update({where:{id:jobId},data:{leaseUntil:new Date(Date.now()-60000)}});
  const recovered=await new GiftAcceptanceWorker(db,f.vault,f.storage).runNext(jobId);assert.equal(recovered.state,'accepted');assert.equal(recovered.replay,false);const status=await jobs.get(f.recipient.id,jobId),original=await db.documentVersion.findUniqueOrThrow({where:{id:planned.documentVersionId},include:{file:true}});
  assert.deepEqual(status.documents,[{documentId:planned.documentId,sha256:f.sha256}]);assert.equal(original.fileId,planned.storedFileId);assert.notEqual(original.file.storageKey,orphans[0]);assert.equal(f.scans.length,2);assert.equal((await rowFor(jobId)).leaseEpoch,newHolder.leaseEpoch+1);assert.equal(await db.homeMembership.count({where:{accountId:f.recipient.id}}),1);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),1);
  await f.storage.cleanup(async key=>!!(await db.storedFile.findUnique({where:{storageKey:key}})),Date.now()+25*3600000);
  await assert.rejects(()=>f.storage.read(orphans[0]));assert.deepEqual(await f.storage.read(original.file.storageKey),f.bytes);assert.deepEqual(await readdir(f.storage.root),[original.file.storageKey]);assert.ok(await db.storedFile.findUnique({where:{id:planned.storedFileId}}));assert.deepEqual(await f.vault.read(f.sha256,f.bytes.length),f.bytes);
 });
 await t.test('an accepted job missing its receipt fails closed without claiming success or recreating the existing Home and original',async()=>{
  const f=await fixture(),{queued,status}=await accepted(f),job=await rowFor(queued.jobId),receipt=await db.agencyGiftAcceptanceReceipt.findUniqueOrThrow({where:{jobId:queued.jobId}}),doc=await db.document.findUniqueOrThrow({where:{id:status.documents[0].documentId},include:{original:{include:{file:true}}}});
  assert.equal(status.benefit,null);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),0);await db.agencyGiftAcceptanceReceipt.delete({where:{id:receipt.id}});
  await assert.rejects(()=>jobs.get(f.recipient.id,queued.jobId),denied('unavailable'));await assert.rejects(()=>f.worker.runNext(queued.jobId),denied('unavailable'));await assert.rejects(f.begin,denied('unavailable'));
  assert.deepEqual(await rowFor(queued.jobId),job);assert.equal((await db.home.findUniqueOrThrow({where:{id:status.homeId}})).id,status.homeId);assert.equal(await db.homeMembership.count({where:{accountId:f.recipient.id}}),1);assert.equal(await db.document.count({where:{homeId:status.homeId}}),1);
  assert.deepEqual(await db.document.findUniqueOrThrow({where:{id:doc.id},include:{original:{include:{file:true}}}}),doc);assert.deepEqual(await f.storage.read(doc.original.file.storageKey),f.bytes);assert.equal(await db.agencyGiftAcceptanceReceipt.count({where:{jobId:queued.jobId}}),0);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),0);assert.equal(f.scans.length,1);
 });
 await t.test('account full-access summary is receipt-backed and independent of later Home access, with an exclusive anniversary end',async()=>{
  const f=await fixture({annualBenefit:true}),{status}=await accepted(f),benefits=new GiftBenefitsStore(db);
  assert.deepEqual(await benefits.capabilities(f.recipient.id),{fullAccess:true,scope:'all_owner_features',validUntil:status.benefit.endsAt});
  assert.deepEqual(await benefits.capabilities(issuer.id),{fullAccess:false,scope:'all_owner_features',validUntil:null});
  await db.homeMembership.update({where:{accountId_homeId:{accountId:f.recipient.id,homeId:status.homeId}},data:{revokedAt:new Date()}});
  await assert.rejects(()=>jobs.get(f.recipient.id,status.jobId),denied('unavailable'));
  assert.deepEqual(await benefits.capabilities(f.recipient.id),{fullAccess:true,scope:'all_owner_features',validUntil:status.benefit.endsAt});
  assert.deepEqual(await new GiftBenefitsStore(db,()=>new Date(status.benefit.endsAt)).capabilities(f.recipient.id),{fullAccess:false,scope:'all_owner_features',validUntil:null});
  assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),1);
 });
 await t.test('an accepted practice cannot issue another Gift or replace its owner Home',async()=>{
  const f=await fixture(),{status}=await accepted(f);
  const revision=await f.revision();
  await assert.rejects(()=>invites.create(issuer.id,agency.id,f.p.id,{key:randomUUID(),expectedRevision:revision,documents:[{sourceId:f.sourceId,version:3,sha256:f.sha256}],recipientEmail:f.recipient.email,stipulationCompleted:true,releaseApproved:true,annualBenefit:true}),denied('unavailable'));
  assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),1);assert.equal(await db.homeMembership.count({where:{accountId:f.recipient.id}}),1);assert.equal((await jobs.get(f.recipient.id,status.jobId)).homeId,status.homeId);
 });});
