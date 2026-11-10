// NOMINAL-ONLY PROFILE: a fresh owned cluster with no other queued Gift fixtures is required.
// The runtime and filesystem are real; scanner receipts are synthetic and never a real AV verdict.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,randomBytes,createHash}=require('node:crypto'),path=require('node:path'),{readFile,readdir}=require('node:fs/promises'),{setTimeout:pause}=require('node:timers/promises');
const {Module,Global}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),cookieParser=require('cookie-parser');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service'),{SessionsService,digest,COOKIE}=require('../dist/security');
const {GiftAccountModule,GiftDeliveryModule}=require('../dist/agency-practices/gift-http');
const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
const {GiftDocumentReleaseStore}=require('../dist/agency-practices/gift-document-release'),{GiftInvitationsStore}=require('../dist/agency-practices/gift-invitations-store'),{GiftAcceptanceStore}=require('../dist/agency-practices/gift-acceptance-store');
const {LocalFileStorage}=require('../dist/documents/storage'),{WindowsDefenderScanner}=require('../dist/documents/file-control');
const {png}=require('./document-fixtures.cjs');
const sha256=createHash('sha256').update(png).digest('hex');

test('Gift runner rediscovers durable work on startup and interval using only its new owned nominal cluster',{timeout:60000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);
 const owned=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),db=new PrismaClient();await db.$connect();let app;
 t.after(async()=>{if(app)await app.close();await db.$disconnect();});
 // Fail before boot rather than dispatch another suite's queued/corrupt jobs or differently rooted files.
 assert.equal(await db.agencyGiftAcceptanceJob.count(),0,'Runner integration requires its own fresh cluster/profile');
 const past=new Date('2026-01-01T00:00:00.000Z'),agency=await db.agency.create({data:{name:'Runner Agency DEMO'}}),issuer=await db.account.create({data:{name:'Runner issuer DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:past}});
 await db.agencyMember.create({data:{agencyId:agency.id,accountId:issuer.id,role:'admin',validFrom:past}});
 const vaultRoot=path.join(owned.directory,'gift-runner-source-'+randomUUID()),homeRoot=path.join(owned.directory,'gift-runner-home-'+randomUUID()),vault=await AgencyFileVault.open(vaultRoot),practices=new AgencyPracticesStore(db),release=new GiftDocumentReleaseStore(db),invites=new GiftInvitationsStore(db),jobs=new GiftAcceptanceStore(db);
 async function fixture(label,annualBenefit=true){
  const recipient=await db.account.create({data:{name:'Runner recipient '+label+' DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:past}}),p=(await practices.create(issuer.id,agency.id,'Runner practice '+label+' DEMO',randomUUID())).practice;
  const revision=async()=>(await practices.read(issuer.id,agency.id,p.id)).revision,sourceId='runner-source-'+randomUUID();
  await practices.upload(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId,visibility:'practice',originalFilename:'runner-original-DEMO.png'}},png,vault);
  await release.release(issuer.id,agency.id,p.id,sourceId,{key:randomUUID(),expectedRevision:await revision(),expectedSourceVersion:1,expectedSha256:sha256,title:'Runner selected document '+label+' DEMO',origin:'received',finalDocumentConfirmed:true,releaseApproved:true});
  const invitation=await invites.create(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),documents:[{sourceId,version:1,sha256}],recipientEmail:recipient.email,stipulationCompleted:true,releaseApproved:true,annualBenefit}),claim=await invites.claim(recipient.id,invitation.id,invitation.secret,invitation.version);
  const queued=await jobs.begin(recipient.id,invitation.id,invitation.secret,{key:randomUUID(),expectedInvitationVersion:claim.version,home:{name:'Runner Home '+label+' DEMO',address:'Via Runner DEMO 1'}}),job=await db.agencyGiftAcceptanceJob.findUniqueOrThrow({where:{id:queued.jobId}}),item=await db.agencyGiftAcceptanceItem.findFirstOrThrow({where:{jobId:queued.jobId}});
  assert.equal(queued.state,'queued');assert.equal(queued.createsHome,false);assert.equal(queued.activatesBenefit,false);return {recipient,p,sourceId,invitation,job,item};
 }
 async function waitForState(jobId,wanted){
  const deadline=Date.now()+8000;let row;
  do{
   row=await db.agencyGiftAcceptanceJob.findUniqueOrThrow({where:{id:jobId}});if(row.state===wanted)return row;
   if(wanted==='accepted'&&['blocked_review','failed_final','cancelled'].includes(row.state))assert.fail('Runner reached '+row.state+' instead of accepted');
   await pause(40);
  }while(Date.now()<deadline);
  assert.fail('Runner did not reach '+wanted+' within 8s; observed '+row?.state);
 }
 async function noDelivery(f){
  assert.equal(await db.home.findUnique({where:{id:f.job.homeId}}),null);assert.equal(await db.homeMembership.count({where:{accountId:f.recipient.id}}),0);assert.equal(await db.document.count({where:{homeId:f.job.homeId}}),0);assert.equal(await db.agencyGiftAcceptanceReceipt.count({where:{jobId:f.job.id}}),0);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),0);assert.equal(await db.storedFile.findUnique({where:{id:f.item.storedFileId}}),null);
 }
 // These records are already durable before Nest/the runner exists. No in-memory wake/queue is retained.
 const initial=await fixture('startup'),revoked=await fixture('revoked'),corrupt=await fixture('corrupt');
 await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:revoked.p.id,accountId:issuer.id}},data:{canExport:false}});
 const badHome={name:'Altered confirmation DEMO',address:'Via altered DEMO 2'};await db.agencyGiftAcceptanceJob.update({where:{id:corrupt.job.id},data:{homeInput:badHome}});
 await noDelivery(initial);await noDelivery(revoked);await noDelivery(corrupt);
 class Infra{}Global()(Infra);Module({providers:[{provide:PrismaService,useValue:db},{provide:SessionsService,useValue:new SessionsService(db)}],exports:[PrismaService,SessionsService]})(Infra);
 class Root{}Module({imports:[Infra,GiftDeliveryModule.register(vaultRoot,{autoStart:true,pollIntervalMs:250,concurrency:1})]})(Root);
 app=await NestFactory.create(Root,{logger:false,abortOnError:false});app.setGlobalPrefix('api/v5');app.use(cookieParser());
 const storage=app.get(LocalFileStorage),scanner=app.get(WindowsDefenderScanner),scans=[];storage.root=homeRoot;
 scanner.scan=async(stage,expectedSha)=>{
  assert.equal(expectedSha,sha256);assert.deepEqual(await readFile(stage),png);assert.ok(stage.endsWith('.bin.part'));const relative=path.relative(homeRoot,stage);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));scans.push({stage,sha256:expectedSha});return {engine:'microsoft_defender',checkedAt:new Date(),signatureVersion:'synthetic-runner-no-real-av'};
 };
 // listen initializes the actual autoStart runner. This suite never calls wake(), poll() or runNext().
 await app.listen(0,'127.0.0.1');
 await t.test('startup discovers a previously persisted queued job and atomically publishes its original, sole-owner Home and year',async()=>{
  const row=await waitForState(initial.job.id,'accepted'),status=await jobs.get(initial.recipient.id,initial.job.id);assert.equal(row.attempts,1);assert.equal(status.state,'accepted');assert.equal(status.homeId,initial.job.homeId);assert.deepEqual(status.documents,[{documentId:initial.item.documentId,sha256}]);assert.ok(status.benefit);assert.equal(status.benefit.startsAt,status.acceptedAt);
  const home=await db.home.findUniqueOrThrow({where:{id:status.homeId}}),members=await db.homeMembership.findMany({where:{homeId:home.id}});assert.equal(home.name,'Runner Home startup DEMO');assert.equal(members.length,1);assert.equal(members[0].accountId,initial.recipient.id);assert.equal(members[0].role,'owner');assert.equal(await db.agencyMember.count({where:{accountId:initial.recipient.id}}),0);
  const doc=await db.document.findUniqueOrThrow({where:{id:initial.item.documentId},include:{original:{include:{file:true}}}});assert.equal(doc.uploaderId,initial.recipient.id);assert.equal(doc.visibility,'private');assert.equal(doc.original.version,1);assert.equal(doc.original.sha256,sha256);assert.equal(doc.original.fileId,initial.item.storedFileId);assert.equal(doc.original.fileControlSignature,'synthetic-runner-no-real-av');assert.equal(doc.giftProvenance.sourceId,initial.sourceId);assert.equal(doc.giftProvenance.origin,'received');assert.deepEqual(await storage.read(doc.original.file.storageKey),png);
  assert.equal(await db.agencyGiftAcceptanceReceipt.count({where:{jobId:initial.job.id}}),1);assert.equal(await db.accountGiftBenefit.count({where:{accountId:initial.recipient.id}}),1);assert.equal(scans.length,1);
 });
 await t.test('the running interval discovers newly persisted work without any explicit wake and does not duplicate the earlier delivery',async()=>{
  const initialReceipt=await jobs.get(initial.recipient.id,initial.job.id),late=await fixture('interval',false);await waitForState(late.job.id,'accepted');const status=await jobs.get(late.recipient.id,late.job.id);assert.equal(status.homeId,late.job.homeId);assert.deepEqual(status.documents,[{documentId:late.item.documentId,sha256}]);assert.equal(status.benefit,null);assert.equal(await db.accountGiftBenefit.count({where:{accountId:late.recipient.id}}),0);
  const original=await db.documentVersion.findUniqueOrThrow({where:{id:late.item.documentVersionId},include:{file:true}});assert.deepEqual(await storage.read(original.file.storageKey),png);assert.equal(await db.homeMembership.count({where:{accountId:late.recipient.id,role:'owner'}}),1);assert.equal(await db.document.count({where:{homeId:late.job.homeId}}),1);assert.equal(await db.agencyGiftAcceptanceReceipt.count({where:{jobId:late.job.id}}),1);
  const stillInitial=await jobs.get(initial.recipient.id,initial.job.id);assert.equal(stillInitial.homeId,initialReceipt.homeId);assert.deepEqual(stillInitial.documents,initialReceipt.documents);assert.deepEqual(stillInitial.benefit,initialReceipt.benefit);assert.equal(await db.document.count({where:{homeId:initial.job.homeId}}),1);assert.equal(await db.accountGiftBenefit.count({where:{accountId:initial.recipient.id}}),1);assert.equal(scans.length,2);assert.equal((await readdir(homeRoot)).filter(name=>name.endsWith('.bin')).length,2);
 });
 await t.test('a source authorization revoked before startup is blocked before scanning or publishing a Home/year',async()=>{
  const row=await waitForState(revoked.job.id,'blocked_review');assert.equal(row.lastError,'gift_review_required');assert.equal(row.attempts,1);assert.equal(row.leaseTokenHash,null);assert.equal(row.leaseUntil,null);await noDelivery(revoked);assert.equal((await db.agencyGiftAcceptanceItem.findUniqueOrThrow({where:{id:revoked.item.id}})).state,'pending');assert.equal(scans.length,2);
 });
 await t.test('a known corrupt queued preparation is quarantined without leasing, scanning, granting or repairing its immutable input',async()=>{
  const row=await waitForState(corrupt.job.id,'blocked_review');assert.equal(row.lastError,'gift_review_required');assert.equal(row.attempts,0);assert.equal(row.leaseEpoch,0);assert.equal(row.leaseTokenHash,null);assert.equal(row.leaseUntil,null);assert.deepEqual(row.homeInput,badHome);assert.equal(row.preparationDigest,corrupt.job.preparationDigest);await noDelivery(corrupt);assert.equal((await db.agencyGiftAcceptanceItem.findUniqueOrThrow({where:{id:corrupt.item.id}})).state,'pending');assert.equal(scans.length,2);
 });
 await t.test('after delivery runtime stops, a new account-only app still serves the accepted receipt, resolver and year without any Agency vault provider',async()=>{
  const before=await jobs.get(initial.recipient.id,initial.job.id),counts={homes:await db.home.count(),documents:await db.document.count(),benefits:await db.accountGiftBenefit.count()},scanCount=scans.length;
  assert.equal(before.state,'accepted');assert.ok(before.benefit);assert.equal(counts.homes,2);assert.equal(counts.documents,2);assert.equal(counts.benefits,1);
  await app.close();app=null;
  class ReadOnlyRoot{}Module({imports:[Infra,GiftAccountModule]})(ReadOnlyRoot);
  app=await NestFactory.create(ReadOnlyRoot,{logger:false,abortOnError:false});app.setGlobalPrefix('api/v5');app.use(cookieParser());
  assert.throws(()=>app.get(AgencyFileVault));assert.throws(()=>app.get(LocalFileStorage));
  const raw=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');await db.session.create({data:{id:digest(raw),accountId:initial.recipient.id,csrfToken:csrf,expiresAt:new Date(Date.now()+3600000)}});
  await app.listen(0,'127.0.0.1');const url=await app.getUrl(),headers={cookie:COOKIE+'='+raw,'x-account-context':initial.recipient.id};
  const get=route=>fetch(url+'/api/v5'+route,{headers});
  const receiptResponse=await get('/gift-acceptances/'+initial.job.id);assert.equal(receiptResponse.status,200);assert.equal(receiptResponse.headers.get('cache-control'),'no-store');assert.equal(receiptResponse.headers.get('referrer-policy'),'no-referrer');assert.deepEqual(await receiptResponse.json(),before);
  const resolver=await get('/gift-invitations/'+initial.invitation.id+'/my-acceptance');assert.equal(resolver.status,200);assert.deepEqual(await resolver.json(),before);
  const benefits=await get('/gift-benefits');assert.equal(benefits.status,200);assert.deepEqual(await benefits.json(),{fullAccess:true,scope:'all_owner_features',validUntil:before.benefit.endsAt});
  const capabilities=await get('/gift-capabilities');assert.equal(capabilities.status,200);const capability=await capabilities.json();assert.equal(capability.requiresVerifiedEmail,true);if(process.env.DIMORA_AGENCY_GIFT_ENABLED!=='1'||!process.env.DIMORA_AGENCY_STORAGE_ROOT)assert.equal(capability.enabled,false);
  assert.equal(scans.length,scanCount);assert.deepEqual({homes:await db.home.count(),documents:await db.document.count(),benefits:await db.accountGiftBenefit.count()},counts);assert.equal(await db.homeMembership.count({where:{homeId:before.homeId}}),1);assert.equal(await db.accountGiftBenefit.count({where:{accountId:initial.recipient.id}}),1);
 });
});
