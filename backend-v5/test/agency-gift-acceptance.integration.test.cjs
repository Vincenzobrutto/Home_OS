const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto'),path=require('node:path');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
const {GiftInvitationsStore}=require('../dist/agency-practices/gift-invitations-store');
const {createGiftInvitation,claimGiftInvitation}=require('../dist/agency-practices/gift-invitations');
const {GiftAcceptanceStore}=require('../dist/agency-practices/gift-acceptance-store');
const denied=(...codes)=>e=>codes.includes(e.code);

test('Gift acceptance jobs queue only on a new owned synthetic cluster; no Home or benefit activation',{timeout:180000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);
 const owned=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const practices=new AgencyPracticesStore(db),invites=new GiftInvitationsStore(db),jobs=new GiftAcceptanceStore(db),past=new Date('2026-01-01T00:00:00.000Z');
 const agency=await db.agency.create({data:{name:'Acceptance queue DEMO'}}),issuer=await db.account.create({data:{name:'Acceptance issuer DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic'}});
 await db.agencyMember.create({data:{agencyId:agency.id,accountId:issuer.id,role:'admin',validFrom:past}});
 const vault=await AgencyFileVault.open(path.join(owned.directory,'gift-acceptance-vault-'+randomUUID()));
 const bytes=Buffer.from('%PDF-1.4\nSynthetic Gift acceptance original\n%%EOF\n'),sha256=createHash('sha256').update(bytes).digest('hex');
 async function fixture({claimed=true,annualBenefit=false}={}){
  const recipient=await db.account.create({data:{name:'Acceptance recipient DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:past}});
  const p=(await practices.create(issuer.id,agency.id,'Acceptance practice DEMO '+randomUUID(),randomUUID())).practice;
  const revision=async()=>(await practices.read(issuer.id,agency.id,p.id)).revision;
  await practices.upload(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId:'gift-selected-source',visibility:'practice',originalFilename:'acceptance-original-DEMO.pdf'}},bytes,vault);
  await practices.registerGiftMetadata(issuer.id,agency.id,p.id,{agencyId:agency.id,practiceId:p.id,sourceId:'gift-selected-source',sourceVersion:1,sha256,metadataVersion:1,origin:'agency_generated',lifecycle:'final',author:'Acceptance Agency DEMO',title:'Selected schedule DEMO',surface:{kind:'commercial',qualification:'estimated',method:'Assumed A4',geometryRevision:1,caveats:['Paper size unverified']}},{key:randomUUID(),expectedRevision:await revision(),expectedMetadataVersion:null});
  const invitationCommand={key:randomUUID(),expectedRevision:await revision(),documents:[{sourceId:'gift-selected-source',version:1,sha256}],recipientEmail:recipient.email,stipulationCompleted:true,releaseApproved:true,annualBenefit};
  const invitation=await invites.create(issuer.id,agency.id,p.id,invitationCommand);
  const association=claimed?await invites.claim(recipient.id,invitation.id,invitation.secret,invitation.version):invitation;
  const command={key:randomUUID(),expectedInvitationVersion:association.version,home:{name:' Casa confermata DEMO ',address:' Via confermata DEMO 1 '}};
  const begin=()=>jobs.begin(recipient.id,invitation.id,invitation.secret,command);
  return {recipient,p,revision,invitationCommand,invitation,association,command,begin};
 }
 const noPrivateData=(result,f)=>{
  const wire=JSON.stringify(result);assert.doesNotMatch(wire,/"(?:tokenHash|secret|recipientEmail|packet|home|homeId|homeName|address|documents|sourceFingerprint)"/);for(const privateValue of [f.invitation.secret,f.recipient.email,'Casa confermata DEMO','Via confermata DEMO 1','gift-selected-source','acceptance-original-DEMO.pdf'])assert.equal(wire.includes(privateValue),false);
 };
 await t.test('claimed owner queues a persistent job with explicit Home confirmation but no Home/documents/benefit yet',async()=>{
  const f=await fixture({annualBenefit:true}),homes=await db.home.count(),documents=await db.document.count(),out=await f.begin();
  assert.equal(out.state,'queued');assert.equal(out.version,1);assert.equal(out.replay,false);assert.equal(out.createsHome,false);assert.equal(out.activatesBenefit,false);assert.match(out.jobId,/^[a-f0-9-]{36}$/i);
  const row=await db.agencyGiftAcceptanceJob.findUnique({where:{id:out.jobId}});assert.ok(row);
  const invitationRow=await db.agencyGiftInvitation.findUnique({where:{id:f.invitation.id}});
  assert.deepEqual(invitationRow.snapshot.annualBenefit,{requested:true,offerId:'dimora-full-access-v1',offerVersion:1,activated:false});
  assert.deepEqual(row.manifest.annualBenefit,invitationRow.snapshot.annualBenefit);
 assert.equal(JSON.stringify(row).includes(f.invitation.secret),false);assert.match(JSON.stringify(row),/Casa confermata DEMO/);assert.match(JSON.stringify(row),/Via confermata DEMO 1/);
  const status=await new GiftAcceptanceStore(db).get(f.recipient.id,out.jobId);assert.equal(status.jobId,out.jobId);assert.equal(status.state,'queued');noPrivateData(status,f);noPrivateData(out,f);
  assert.equal(await db.home.count(),homes);assert.equal(await db.document.count(),documents);assert.equal(await db.agencyMember.count({where:{accountId:f.recipient.id}}),0);
 });
 await t.test('same key and normalized body replay after another store instance with the same job ID',async()=>{
  const f=await fixture(),first=await f.begin(),row=await db.agencyGiftAcceptanceJob.findUnique({where:{id:first.jobId}}),replay=await new GiftAcceptanceStore(db).begin(f.recipient.id,f.invitation.id,f.invitation.secret,{...f.command,home:{name:f.command.home.name.trim(),address:f.command.home.address.trim()}});
  assert.equal(replay.replay,true);assert.equal(replay.jobId,first.jobId);assert.equal(replay.version,first.version);assert.deepEqual(await db.agencyGiftAcceptanceJob.findUnique({where:{id:first.jobId}}),row);assert.equal(await db.agencyGiftAcceptanceJob.count({where:{invitationId:f.invitation.id}}),1);
 });
 await t.test('concurrent identical begins reserve only one job and one replay',async()=>{
  const f=await fixture(),rs=await Promise.all([f.begin(),f.begin()]);assert.notEqual(rs[0].replay,rs[1].replay);assert.equal(rs[0].jobId,rs[1].jobId);assert.equal(await db.agencyGiftAcceptanceJob.count({where:{invitationId:f.invitation.id}}),1);
 });
 await t.test('same key with changed Home confirmation conflicts without rewriting the queued job',async()=>{
  const f=await fixture(),first=await f.begin(),before=await db.agencyGiftAcceptanceJob.findUnique({where:{id:first.jobId}});
  await assert.rejects(()=>jobs.begin(f.recipient.id,f.invitation.id,f.invitation.secret,{...f.command,home:{...f.command.home,address:'Via differente DEMO 2'}}),denied('idempotency_conflict'));assert.deepEqual(await db.agencyGiftAcceptanceJob.findUnique({where:{id:first.jobId}}),before);
 });
 await t.test('a second key cannot create another job for the same invitation',async()=>{
  const f=await fixture();await f.begin();await assert.rejects(()=>jobs.begin(f.recipient.id,f.invitation.id,f.invitation.secret,{...f.command,key:randomUUID()}),denied('idempotency_conflict'));assert.equal(await db.agencyGiftAcceptanceJob.count({where:{invitationId:f.invitation.id}}),1);
 });
 await t.test('another invitation for a practice already reserved cannot create a second Home job',async()=>{
  const f=await fixture();await f.begin();const next=await invites.create(issuer.id,agency.id,f.p.id,{...f.invitationCommand,key:randomUUID()}),claim=await invites.claim(f.recipient.id,next.id,next.secret,next.version);
  await assert.rejects(()=>jobs.begin(f.recipient.id,next.id,next.secret,{...f.command,key:randomUUID(),expectedInvitationVersion:claim.version}),denied('unavailable'));assert.equal(await db.agencyGiftAcceptanceJob.count({where:{practiceId:f.p.id}}),1);
 });
 await t.test('an invitation must be associated with the verified owner before queueing acceptance',async()=>{
  const f=await fixture({claimed:false});await assert.rejects(f.begin,denied('unavailable'));assert.equal(await db.agencyGiftAcceptanceJob.count({where:{invitationId:f.invitation.id}}),0);
 });
 await t.test('wrong account or secret cannot queue or inspect an owner job',async()=>{
  const f=await fixture(),wrong=await db.account.create({data:{name:'Wrong acceptance account DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:past}});
  await assert.rejects(()=>jobs.begin(wrong.id,f.invitation.id,f.invitation.secret,f.command),denied('unavailable'));await assert.rejects(()=>jobs.begin(f.recipient.id,f.invitation.id,'B'.repeat(43),f.command),denied('unavailable'));
  const out=await f.begin();await assert.rejects(()=>jobs.get(wrong.id,out.jobId),denied('unavailable'));await assert.rejects(()=>jobs.get(issuer.id,out.jobId),denied('unavailable'));await assert.rejects(()=>jobs.get(f.recipient.id,randomUUID()),denied('unavailable'));noPrivateData(await jobs.get(f.recipient.id,out.jobId),f);
 });
 await t.test('expected invitation revision and current account verification remain authoritative',async()=>{
  const f=await fixture();await assert.rejects(()=>jobs.begin(f.recipient.id,f.invitation.id,f.invitation.secret,{...f.command,expectedInvitationVersion:f.association.version+10}),denied('revision_conflict','unavailable'));
  await db.account.update({where:{id:f.recipient.id},data:{emailVerifiedAt:null}});await assert.rejects(f.begin,denied('unavailable'));assert.equal(await db.agencyGiftAcceptanceJob.count({where:{invitationId:f.invitation.id}}),0);
 });
 await t.test('revoked invitation cannot begin acceptance',async()=>{
  const f=await fixture();await invites.revoke(issuer.id,agency.id,f.p.id,f.invitation.id,f.association.version);await assert.rejects(f.begin,denied('unavailable'));assert.equal(await db.agencyGiftAcceptanceJob.count({where:{invitationId:f.invitation.id}}),0);
 });
 await t.test('expired but otherwise valid sealed invitation cannot begin acceptance',async()=>{
  const f=await fixture(),practice=(await db.agencyPractice.findUnique({where:{id:f.p.id}})).snapshot,row=await db.agencyGiftInvitation.findUnique({where:{id:f.invitation.id}}),window={validFrom:past.toISOString(),validUntil:null,revokedAt:null};
  const actor={accountId:issuer.id,memberships:[{...window,agencyId:agency.id,accountId:issuer.id,role:'admin'}],grants:[{...window,agencyId:agency.id,practiceId:f.p.id,accountId:issuer.id,access:'edit',canExport:true}]};
  const at='2026-10-01T12:00:00.000Z',expiresAt='2026-10-02T12:00:00.000Z';
  const created=createGiftInvitation(actor,practice,f.invitationCommand,{id:row.id,homeId:row.snapshot.packet.requestedHomeId,secret:f.invitation.secret,expiresAt,offer:f.invitationCommand.annualBenefit?{id:'dimora-full-access-v1',version:1}:null},at).record;
  const claimed=claimGiftInvitation(created,f.invitation.secret,{accountId:f.recipient.id,email:f.recipient.email,emailVerifiedAt:past.toISOString()},created.sourceFingerprint,1,'2026-10-01T12:01:00.000Z').record;
  await db.agencyGiftInvitation.update({where:{id:row.id},data:{version:claimed.version,state:claimed.state,claimedAccountId:f.recipient.id,createdAt:new Date(claimed.createdAt),expiresAt:new Date(claimed.expiresAt),snapshot:claimed}});
  await assert.rejects(f.begin,denied('unavailable'));assert.equal(await db.agencyGiftAcceptanceJob.count({where:{invitationId:f.invitation.id}}),0);
 });
 await t.test('replaced source blocks both new begin and replay without changing an existing queued job',async()=>{
  const f=await fixture(),out=await f.begin(),before=await db.agencyGiftAcceptanceJob.findUnique({where:{id:out.jobId}});
  await practices.upload(issuer.id,agency.id,f.p.id,{key:randomUUID(),expectedRevision:await f.revision(),command:{operation:'replace',sourceId:'gift-selected-source',expectedSourceVersion:1,originalFilename:'changed-acceptance-DEMO.pdf'}},Buffer.from('%PDF-1.4\nChanged acceptance source DEMO\n%%EOF\n'),vault);
  await assert.rejects(f.begin,denied('unavailable','source_changed','access_denied'));assert.deepEqual(await db.agencyGiftAcceptanceJob.findUnique({where:{id:out.jobId}}),before);
 });
 await t.test('issuer export revoked before begin prevents any queued acceptance',async()=>{
  const f=await fixture();await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:issuer.id}},data:{canExport:false}});
  await assert.rejects(f.begin,denied('unavailable','access_denied'));assert.equal(await db.agencyGiftAcceptanceJob.count({where:{invitationId:f.invitation.id}}),0);
 });
 await t.test('corrupted Home confirmation fails closed and a foreign account cannot inspect its validation error',async()=>{
  const f=await fixture(),out=await f.begin();assert.equal((await jobs.get(f.recipient.id,out.jobId)).state,'queued');
  await db.agencyGiftAcceptanceJob.update({where:{id:out.jobId},data:{homeInput:{name:'Altered confirmation DEMO',address:'Via alterata DEMO 2'}}});
  const before=await db.agencyGiftAcceptanceJob.findUnique({where:{id:out.jobId}}),wrong=await db.account.create({data:{name:'Foreign corrupt job DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:past}});
  await assert.rejects(()=>jobs.get(f.recipient.id,out.jobId),denied('invalid_input','unavailable'));await assert.rejects(()=>jobs.get(wrong.id,out.jobId),denied('unavailable'));assert.deepEqual(await db.agencyGiftAcceptanceJob.findUnique({where:{id:out.jobId}}),before);
 });
 await t.test('corrupted source proof in the frozen manifest cannot produce a status response',async()=>{
  const f=await fixture(),out=await f.begin(),row=await db.agencyGiftAcceptanceJob.findUnique({where:{id:out.jobId}}),manifest=structuredClone(row.manifest);manifest.packet.documents[0].sha256='b'.repeat(64);
  await db.agencyGiftAcceptanceJob.update({where:{id:out.jobId},data:{manifest}});const before=await db.agencyGiftAcceptanceJob.findUnique({where:{id:out.jobId}});
  await assert.rejects(()=>jobs.get(f.recipient.id,out.jobId),denied('invalid_input','unavailable'));assert.deepEqual(await db.agencyGiftAcceptanceJob.findUnique({where:{id:out.jobId}}),before);
 });
 await t.test('item source and planned target IDs are cross-checked against the immutable preparation',async()=>{
  for(const change of [{sourceVersion:999},{documentId:randomUUID()}]){
   const f=await fixture(),out=await f.begin(),item=await db.agencyGiftAcceptanceItem.findFirst({where:{jobId:out.jobId}});assert.ok(item);
   await db.agencyGiftAcceptanceItem.update({where:{id:item.id},data:change});const before=await db.agencyGiftAcceptanceItem.findUnique({where:{id:item.id}});
   await assert.rejects(()=>jobs.get(f.recipient.id,out.jobId),denied('invalid_input','unavailable'));assert.deepEqual(await db.agencyGiftAcceptanceItem.findUnique({where:{id:item.id}}),before);
  }
 });
 await t.test('owner can read only minimal queued status after export revocation or a current email change; begin remains denied',async()=>{
  const f=await fixture(),out=await f.begin();
  await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:issuer.id}},data:{canExport:false}});
  await assert.rejects(f.begin,denied('unavailable','access_denied'));const revokedStatus=await jobs.get(f.recipient.id,out.jobId);assert.equal(revokedStatus.state,'queued');noPrivateData(revokedStatus,f);
  await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:issuer.id}},data:{canExport:true}});
  const changed=randomUUID()+'@example.test';await db.account.update({where:{id:f.recipient.id},data:{email:changed,emailVerifiedAt:past}});
  await assert.rejects(f.begin,denied('unavailable'));const changedStatus=await jobs.get(f.recipient.id,out.jobId);assert.equal(changedStatus.state,'queued');noPrivateData(changedStatus,f);assert.equal(JSON.stringify(changedStatus).includes(changed),false);
 });
});
