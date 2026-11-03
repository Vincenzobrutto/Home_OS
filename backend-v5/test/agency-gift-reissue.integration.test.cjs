// Synthetic data only. This suite must run on a NEW cluster owned by the repository offline runner.
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash,randomBytes}=require('node:crypto'),path=require('node:path');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
const {GiftInvitationsStore}=require('../dist/agency-practices/gift-invitations-store');
const {GiftAcceptanceStore}=require('../dist/agency-practices/gift-acceptance-store'),{GiftAcceptanceWorker}=require('../dist/agency-practices/gift-acceptance-worker');
const {LocalFileStorage}=require('../dist/documents/storage');
const {createGiftInvitation,parseGiftInvitationCommand,giftInvitationCreationDigest}=require('../dist/agency-practices/gift-invitations');
const {makeGiftAcceptanceReceipt}=require('../dist/agency-practices/gift-acceptance-receipt');
const denied=(...codes)=>error=>codes.includes(error.code);
test('atomic Gift link reissue preserves manifests and cannot abandon acceptance on a new owned cluster',{timeout:240000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);
 const owned=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const practices=new AgencyPracticesStore(db),invites=new GiftInvitationsStore(db),jobs=new GiftAcceptanceStore(db),past=new Date('2026-01-01T00:00:00.000Z');
 const agency=await db.agency.create({data:{name:'Reissue agency DEMO'}}),accounts=[];
 for(const role of ['admin','admin','agent','viewer']){
  const account=await db.account.create({data:{name:'Reissue actor DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:past}});
  await db.agencyMember.create({data:{agencyId:agency.id,accountId:account.id,role,validFrom:past}});accounts.push(account);
 }
 const [issuer,other,readOnly,viewer]=accounts,vault=await AgencyFileVault.open(path.join(owned.directory,'gift-reissue-vault-'+randomUUID()));
 const bytes=Buffer.from('%PDF-1.4\nGift reissue original DEMO\n%%EOF\n'),sha256=createHash('sha256').update(bytes).digest('hex');
 async function fixture({claimed=false,visibility='practice',expired=false,annualBenefit=true}={}){
  const recipient=await db.account.create({data:{name:'Reissue recipient DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:past}});
  const p=(await practices.create(issuer.id,agency.id,'Reissue practice DEMO '+randomUUID(),randomUUID())).practice;
  for(const [account,access,canExport] of [[other,'edit',true],[readOnly,'read',true],[viewer,'read',false]])await db.agencyPracticeGrant.create({data:{practiceId:p.id,accountId:account.id,access,canExport,validFrom:past}});
  const revision=async()=>(await practices.read(issuer.id,agency.id,p.id)).revision,snapshot=async()=>(await db.agencyPractice.findUniqueOrThrow({where:{id:p.id}})).snapshot;
  await practices.upload(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId:'reissue-document',visibility,originalFilename:'reissue-original-DEMO.pdf'}},bytes,vault);
  const surface={kind:'commercial',qualification:'estimated',method:'Synthetic assumed A4',geometryRevision:3,caveats:['Unverified scale DEMO']};
  await practices.registerGiftMetadata(issuer.id,agency.id,p.id,{agencyId:agency.id,practiceId:p.id,sourceId:'reissue-document',sourceVersion:1,sha256,metadataVersion:1,origin:'agency_generated',lifecycle:'final',author:'Producer DEMO',title:'Original release DEMO',surface},{key:randomUUID(),expectedRevision:await revision(),expectedMetadataVersion:null});
  const createCommand={key:randomUUID(),expectedRevision:await revision(),documents:[{sourceId:'reissue-document',version:1,sha256}],recipientEmail:recipient.email,stipulationCompleted:true,releaseApproved:true,annualBenefit};
  let invitation;
  if(expired){
   const at=new Date(Date.now()-8*86400000).toISOString(),secret=randomBytes(32).toString('base64url'),window={validFrom:past.toISOString(),validUntil:null,revokedAt:null};
   const actor={accountId:issuer.id,memberships:[{...window,agencyId:agency.id,accountId:issuer.id,role:'admin'}],grants:[{...window,agencyId:agency.id,practiceId:p.id,accountId:issuer.id,access:'edit',canExport:true}]};
   const {record}=createGiftInvitation(actor,await snapshot(),createCommand,{id:randomUUID(),homeId:randomUUID(),secret,expiresAt:new Date(Date.parse(at)+7*86400000).toISOString(),offer:{id:'dimora-full-access-v1',version:1}},at);
   await db.agencyGiftInvitation.create({data:{id:record.id,agencyId:agency.id,practiceId:p.id,issuerAccountId:issuer.id,creationKey:record.creationKey,creationDigest:giftInvitationCreationDigest(parseGiftInvitationCommand(createCommand)),tokenHash:record.tokenHash,version:record.version,state:record.state,expiresAt:new Date(record.expiresAt),createdAt:new Date(record.createdAt),snapshot:record}});
   invitation={id:record.id,version:record.version,secret};
  }else invitation=await invites.create(issuer.id,agency.id,p.id,createCommand);
  const associated=claimed?await invites.claim(recipient.id,invitation.id,invitation.secret,invitation.version):invitation;
  const command=async(overrides={})=>({key:randomUUID(),expectedRevision:await revision(),expectedVersion:associated.version,...overrides});
  const reissue=(input,account=issuer,target=invitation.id)=>invites.reissue(account.id,agency.id,p.id,target,input);
  const begin=()=>jobs.begin(recipient.id,invitation.id,invitation.secret,{key:randomUUID(),expectedInvitationVersion:associated.version,home:{name:'Casa reissue DEMO',address:'Via Esempio DEMO'}});
  return {p,recipient,invitation,associated,revision,snapshot,command,reissue,createCommand,begin};
 }
 const row=id=>db.agencyGiftInvitation.findUniqueOrThrow({where:{id}});
 await t.test('first reissue commits a new secret/hash and old revocation with unchanged recipient, Home target, source and annual offer',async()=>{
  const f=await fixture(),original=await row(f.invitation.id),input=await f.command(),homes=await db.home.count(),out=await f.reissue(input),replacement=await row(out.id),old=await row(original.id);
  assert.notEqual(out.id,original.id);assert.notEqual(out.secret,f.invitation.secret);assert.match(out.secret,/^[A-Za-z0-9_-]{43}$/);assert.equal(out.replay,false);assert.equal(out.requiresReissue,false);assert.equal(out.version,1);assert.equal(out.state,'invited');
  assert.equal(old.state,'revoked');assert.equal(old.version,original.version+1);assert.equal(old.tokenHash,original.tokenHash);assert.equal(old.snapshot.seal,original.snapshot.seal);
  assert.equal(replacement.tokenHash,createHash('sha256').update(out.secret).digest('hex'));assert.equal(replacement.snapshot.recipientEmail,original.snapshot.recipientEmail);assert.equal(replacement.snapshot.packet.requestedHomeId,original.snapshot.packet.requestedHomeId);assert.deepEqual(replacement.snapshot.packet.documents,original.snapshot.packet.documents);assert.deepEqual(replacement.snapshot.annualBenefit,original.snapshot.annualBenefit);
  assert.equal(replacement.expiresAt.getTime()-replacement.createdAt.getTime(),7*86400000);assert.equal(replacement.snapshot.claim,null);assert.equal((await f.snapshot()).revision,input.expectedRevision+1);assert.equal((await f.snapshot()).giftReissueReceipts.length,1);
  for(const secret of [out.secret,f.invitation.secret]){assert.equal(JSON.stringify(await f.snapshot()).includes(secret),false);assert.equal(JSON.stringify([old,replacement]).includes(secret),false);}
  await assert.rejects(()=>invites.landing(f.invitation.id,f.invitation.secret),denied('unavailable'));assert.equal((await invites.landingStatus(out.id,out.secret)).version,1);
  assert.equal(await db.home.count(),homes);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),0);
 });
 await t.test('concurrent identical reissues return exactly one secret and durable replay without a second rotation',async()=>{
  const f=await fixture(),input=await f.command(),results=await Promise.all([f.reissue(input),f.reissue(input)]);
  assert.notEqual(results[0].replay,results[1].replay);assert.equal(results[0].id,results[1].id);assert.equal(results.filter(result=>typeof result.secret==='string').length,1);assert.equal(results.find(result=>result.replay).secret,null);
  const before=await f.snapshot(),rows=await db.agencyGiftInvitation.findMany({where:{practiceId:f.p.id}}),replay=await new GiftInvitationsStore(db).reissue(issuer.id,agency.id,f.p.id,f.invitation.id,input);
  assert.equal(replay.replay,true);assert.equal(replay.requiresReissue,true);assert.equal(replay.secret,null);assert.deepEqual(await f.snapshot(),before);assert.deepEqual(await db.agencyGiftInvitation.findMany({where:{practiceId:f.p.id}}),rows);assert.equal(rows.length,2);
 });
 await t.test('same key with another target/version/revision conflicts; create/reissue command keys do not cross operations',async()=>{
  const f=await fixture(),input=await f.command(),first=await f.reissue(input),before=await f.snapshot();
  for(const change of [{expectedVersion:input.expectedVersion+1},{expectedRevision:input.expectedRevision+1}])await assert.rejects(()=>f.reissue({...input,...change}),denied('idempotency_conflict'));
  await assert.rejects(()=>f.reissue(input,issuer,first.id),denied('idempotency_conflict'));
  await assert.rejects(()=>invites.create(issuer.id,agency.id,f.p.id,{...f.createCommand,key:input.key,expectedRevision:input.expectedRevision}),denied('idempotency_conflict'));assert.deepEqual(await f.snapshot(),before);
  const otherFixture=await fixture(),collision=await otherFixture.command({key:otherFixture.createCommand.key});
  await assert.rejects(()=>otherFixture.reissue(collision),denied('idempotency_conflict'));assert.equal((await row(otherFixture.invitation.id)).state,'invited');
 });
 await t.test('historical reissue replay preserves the actual revoked replacement after a later reissue and never resurrects it',async()=>{
  const f=await fixture(),firstInput=await f.command(),first=await f.reissue(firstInput);
  const second=await invites.reissue(issuer.id,agency.id,f.p.id,first.id,{key:randomUUID(),expectedRevision:await f.revision(),expectedVersion:first.version});
  const before=await f.snapshot(),replay=await f.reissue(firstInput);assert.equal(replay.id,first.id);assert.equal(replay.state,'revoked');assert.equal(replay.secret,null);assert.equal(replay.replay,true);assert.equal(replay.requiresReissue,true);assert.deepEqual(await f.snapshot(),before);
  assert.equal((await row(second.id)).state,'invited');assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),3);
 });
 await t.test('claim-before-begin may reissue; any reserved state blocks it until owner cancellation without abandoning the job',async()=>{
  const f=await fixture({claimed:true}),queued=await f.begin(),input=await f.command(),before=await row(f.invitation.id);
  for(const state of ['queued','staging','ready','retryable','blocked_review','accepted']){
   // Only worker-owned mutable state is manufactured, including an accepted-without-receipt fail-closed case.
   await db.agencyGiftAcceptanceJob.update({where:{id:queued.jobId},data:{state}});const job=await db.agencyGiftAcceptanceJob.findUniqueOrThrow({where:{id:queued.jobId}});
   await assert.rejects(()=>f.reissue(input),denied('unavailable'));assert.deepEqual(await db.agencyGiftAcceptanceJob.findUniqueOrThrow({where:{id:queued.jobId}}),job);assert.deepEqual(await row(f.invitation.id),before);
  }
  await db.agencyGiftAcceptanceJob.update({where:{id:queued.jobId},data:{state:'queued'}});
  const storage=new LocalFileStorage({scan:async()=>{throw Error('no scanner expected');}});storage.root=path.join(owned.directory,'gift-reissue-home-'+randomUUID());
  await new GiftAcceptanceWorker(db,vault,storage).cancel(f.recipient.id,queued.jobId);
  const next=await f.reissue(input);assert.equal(next.state,'invited');assert.equal((await jobs.get(f.recipient.id,queued.jobId)).state,'cancelled');assert.equal((await row(f.invitation.id)).state,'revoked');
  const noJob=await fixture({claimed:true}),replacement=await noJob.reissue(await noJob.command());assert.equal(replacement.state,'invited');assert.equal((await row(replacement.id)).claimedAccountId,null);
 });
 await t.test('concurrent begin versus reissue has one winner: a valid claimed job or a revoked link, never an orphaned reservation',async()=>{
  const f=await fixture({claimed:true}),input=await f.command(),results=await Promise.allSettled([f.begin(),f.reissue(input)]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.ok(denied('unavailable','revision_conflict')(results.find(result=>result.status==='rejected').reason));
  const job=await db.agencyGiftAcceptanceJob.findFirst({where:{practiceId:f.p.id}}),old=await row(f.invitation.id);
  if(job){assert.equal(old.state,'claimed');assert.equal((await jobs.get(f.recipient.id,job.id)).state,'queued');const current=await db.$transaction(tx=>new GiftInvitationsStore(db).claimedAcceptanceContext(tx,job.id));assert.equal(current.record.id,old.id);assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),1);}
  else{assert.equal(old.state,'revoked');assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),2);}
 });
 await t.test('source replacement or current metadata change cannot be silently refreshed by reissue',async()=>{
  const f=await fixture(),input=await f.command(),old=await row(f.invitation.id);
  await practices.registerGiftMetadata(issuer.id,agency.id,f.p.id,{agencyId:agency.id,practiceId:f.p.id,sourceVersion:1,sha256,metadataVersion:2,title:'Different current release DEMO',sourceId:'reissue-document',origin:'agency_generated',lifecycle:'final',author:'Producer DEMO',surface:old.snapshot.packet.documents[0].surface},{key:randomUUID(),expectedRevision:await f.revision(),expectedMetadataVersion:1});
  const before=await f.snapshot();await assert.rejects(()=>f.reissue({...input,expectedRevision:before.revision}),denied('unavailable'));assert.deepEqual(await row(f.invitation.id),old);assert.deepEqual(await f.snapshot(),before);
  const changed=await fixture(),changeInput=await changed.command(),oldRow=await row(changed.invitation.id);
  await practices.upload(issuer.id,agency.id,changed.p.id,{key:randomUUID(),expectedRevision:await changed.revision(),command:{operation:'replace',sourceId:'reissue-document',expectedSourceVersion:1,originalFilename:'new-current-DEMO.pdf'}},Buffer.from('%PDF-1.4\nChanged source DEMO\n%%EOF\n'),vault);
  const changedRevision=await changed.revision();await assert.rejects(()=>changed.reissue({...changeInput,expectedRevision:changedRevision}),denied('source_changed','unavailable'));assert.deepEqual(await row(changed.invitation.id),oldRow);
 });
 await t.test('wrong version/revision, manual revocation, foreign scope, private originals and insufficient export/edit leave state unchanged',async()=>{
  const f=await fixture(),input=await f.command(),before=await row(f.invitation.id),practice=await f.snapshot();
  for(const change of [{expectedVersion:2},{expectedRevision:input.expectedRevision+1}])await assert.rejects(()=>f.reissue({...input,...change}),denied('revision_conflict'));
  for(const actor of [readOnly,viewer])await assert.rejects(()=>f.reissue(input,actor),denied('access_denied'));
  const foreign=await fixture();await assert.rejects(()=>f.reissue(input,issuer,foreign.invitation.id),denied('unavailable'));assert.deepEqual(await row(f.invitation.id),before);assert.deepEqual(await f.snapshot(),practice);
  const privateFixture=await fixture({visibility:'private'}),privateInput=await privateFixture.command();await assert.rejects(()=>privateFixture.reissue(privateInput,other),denied('access_denied'));
  await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:issuer.id}},data:{canExport:false}});await assert.rejects(()=>f.reissue(input),denied('access_denied'));assert.deepEqual(await row(f.invitation.id),before);
  const revoked=await fixture();await invites.revoke(issuer.id,agency.id,revoked.p.id,revoked.invitation.id,1);const revokedBefore=await row(revoked.invitation.id),revokedInput=await revoked.command({expectedVersion:2});await assert.rejects(()=>revoked.reissue(revokedInput),denied('unavailable'));assert.deepEqual(await row(revoked.invitation.id),revokedBefore);
 });
 await t.test('an expired unused link can be replaced with a fresh explicit seven-day window',async()=>{
  const f=await fixture({expired:true}),old=await row(f.invitation.id);assert.ok(old.expiresAt<new Date());await assert.rejects(()=>invites.landing(f.invitation.id,f.invitation.secret),denied('unavailable'));
  const next=await f.reissue(await f.command()),current=await row(next.id);assert.equal(current.expiresAt.getTime()-current.createdAt.getTime(),7*86400000);assert.ok(current.expiresAt>new Date());assert.equal((await row(old.id)).state,'revoked');assert.equal((await invites.landingStatus(next.id,next.secret)).version,1);
 });
 await t.test('a rejected commit rolls back old revocation, replacement and receipt; retry with the same key remains possible',async()=>{
  const f=await fixture(),input=await f.command(),old=await row(f.invitation.id),before=await f.snapshot(),failure=Error('synthetic commit rejected');
  const failing={$transaction:(work,options)=>db.$transaction(async tx=>{await work(tx);throw failure;},options)};
  await assert.rejects(()=>new GiftInvitationsStore(failing).reissue(issuer.id,agency.id,f.p.id,f.invitation.id,input),error=>error===failure);
  assert.deepEqual(await row(f.invitation.id),old);assert.deepEqual(await f.snapshot(),before);assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),1);
  const success=await f.reissue(input);assert.equal(success.replay,false);assert.match(success.secret,/^[A-Za-z0-9_-]{43}$/);
 });
 await t.test('accepted receipt prevents reissue and remains readable independently after Agency export is revoked',async()=>{
  const f=await fixture({annualBenefit:false}),invitation=await row(f.invitation.id),at=new Date().toISOString(),homeId=invitation.snapshot.packet.requestedHomeId;
  await db.home.create({data:{id:homeId,name:'Accepted synthetic Home',address:'Synthetic address',memberships:{create:{accountId:f.recipient.id,role:'owner',validFrom:new Date(at)}}}});
  // Valid minimal accepted receipt with logical references, as after owner purge. No copier execution is claimed here.
  const receipt=makeGiftAcceptanceReceipt({id:randomUUID(),practiceId:f.p.id,invitationId:f.invitation.id,jobId:randomUUID(),accountId:f.recipient.id,requestKey:randomUUID(),commandDigest:'b'.repeat(64),sourceFingerprint:invitation.snapshot.sourceFingerprint,homeId,acceptedAt:at,documents:[{documentId:randomUUID(),sha256}],benefit:null});
  await db.agencyGiftAcceptanceReceipt.create({data:{id:receipt.id,practiceId:receipt.practiceId,invitationId:receipt.invitationId,jobId:receipt.jobId,accountId:receipt.accountId,requestKey:receipt.requestKey,commandDigest:receipt.commandDigest,sourceFingerprint:receipt.sourceFingerprint,homeId,acceptedAt:new Date(at),snapshot:receipt}});
  const before=await row(f.invitation.id),input=await f.command();await assert.rejects(()=>f.reissue(input),denied('unavailable'));assert.deepEqual(await row(f.invitation.id),before);
  await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:issuer.id}},data:{canExport:false}});assert.equal((await jobs.forInvitation(f.recipient.id,f.invitation.id)).homeId,homeId);
 });
 await t.test('invitation/ledger growth is bounded at one hundred records without rotating the latest valid link',async()=>{
  const f=await fixture();let current=f.invitation;
  for(let i=0;i<99;i++)current=await invites.reissue(issuer.id,agency.id,f.p.id,current.id,{key:randomUUID(),expectedRevision:await f.revision(),expectedVersion:current.version});
  const before=await f.snapshot(),last=await row(current.id);assert.equal(before.giftReissueReceipts.length,99);assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),100);
  await assert.rejects(()=>invites.reissue(issuer.id,agency.id,f.p.id,current.id,{key:randomUUID(),expectedRevision:before.revision,expectedVersion:current.version}),denied('invalid_input'));
  assert.deepEqual(await row(current.id),last);assert.deepEqual(await f.snapshot(),before);assert.equal((await invites.landingStatus(current.id,current.secret)).version,1);
 });
});
