const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto'),path=require('node:path');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
const {GiftInvitationsStore}=require('../dist/agency-practices/gift-invitations-store');
const {parseGiftInvitationCommand,giftInvitationCreationDigest}=require('../dist/agency-practices/gift-invitations');
const denied=(...codes)=>e=>codes.includes(e.code);

test('Gift invitations persist only on a new owned synthetic cluster',{timeout:180000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);
 const owned=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),db=new PrismaClient();
 await db.$connect();t.after(()=>db.$disconnect());
 const practices=new AgencyPracticesStore(db),invites=new GiftInvitationsStore(db),past=new Date('2026-01-01T00:00:00.000Z');
 const agency=await db.agency.create({data:{name:'Gift invitations DEMO'}}),issuer=await db.account.create({data:{name:'Issuer DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic'}});
 await db.agencyMember.create({data:{agencyId:agency.id,accountId:issuer.id,role:'admin',validFrom:past}});
 const vault=await AgencyFileVault.open(path.join(owned.directory,'gift-invites-vault-'+randomUUID()));
 const bytes=Buffer.from('%PDF-1.4\nGift invitation synthetic original\n%%EOF\n'),sha256=createHash('sha256').update(bytes).digest('hex');
 async function fixture({verified=true,visibility='practice'}={}){
  const recipient=await db.account.create({data:{name:'Recipient DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:verified?past:null}});
  const p=(await practices.create(issuer.id,agency.id,'Gift invitation DEMO '+randomUUID(),randomUUID())).practice;
  const revision=async()=>(await practices.read(issuer.id,agency.id,p.id)).revision;
  await practices.upload(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId:'gift-document',visibility,originalFilename:'gift-invitation-DEMO.pdf'}},bytes,vault);
  await practices.registerGiftMetadata(issuer.id,agency.id,p.id,{agencyId:agency.id,practiceId:p.id,sourceId:'gift-document',sourceVersion:1,sha256,metadataVersion:1,origin:'agency_generated',lifecycle:'final',author:'Agency DEMO',title:'Gift synthetic document'},{key:randomUUID(),expectedRevision:await revision(),expectedMetadataVersion:null});
  const command={key:randomUUID(),expectedRevision:await revision(),documents:[{sourceId:'gift-document',version:1,sha256}],recipientEmail:' '+recipient.email.toUpperCase()+' ',stipulationCompleted:true,releaseApproved:true,annualBenefit:false};
  const create=()=>invites.create(issuer.id,agency.id,p.id,command);
  const snapshot=async()=>(await db.agencyPractice.findUnique({where:{id:p.id}})).snapshot;
  return {recipient,p,command,create,revision,snapshot};
 }
 await t.test('one successful creation persists its manifest and only the secret hash',async()=>{
  const f=await fixture(),before=await f.snapshot(),homes=await db.home.count(),out=await f.create();
  assert.equal(out.replay,false);assert.match(out.secret,/^[A-Za-z0-9_-]{43}$/);assert.equal(out.version,1);assert.equal(out.state,'invited');assert.equal(out.canSend,false);assert.equal(out.canAccept,false);
  const row=await db.agencyGiftInvitation.findUnique({where:{id:out.id}});assert.ok(row);assert.equal(row.tokenHash,createHash('sha256').update(out.secret).digest('hex'));assert.equal(JSON.stringify(row).includes(out.secret),false);
  assert.equal(row.snapshot.packet.documents[0].sha256,sha256);assert.equal(row.snapshot.recipientEmail,f.recipient.email);assert.equal(row.snapshot.annualBenefit.requested,false);
  assert.deepEqual(await f.snapshot(),before);assert.equal(await db.home.count(),homes);assert.equal(await db.agencyMember.count({where:{accountId:f.recipient.id}}),0);
  assert.deepEqual(await new GiftInvitationsStore(db).landing(out.id,out.secret),{id:out.id,requiresAccount:true,canAccept:false});
 });
 await t.test('new store instance replays creation without a retrievable clear secret',async()=>{
  const f=await fixture(),first=await f.create(),row=await db.agencyGiftInvitation.findUnique({where:{id:first.id}});
  const replay=await new GiftInvitationsStore(db).create(issuer.id,agency.id,f.p.id,f.command);
  assert.equal(replay.id,first.id);assert.equal(replay.version,first.version);assert.equal(replay.replay,true);assert.equal(replay.secret,null);assert.equal(replay.requiresReissue,true);
  assert.deepEqual(await db.agencyGiftInvitation.findUnique({where:{id:first.id}}),row);
 });
 await t.test('concurrent identical creates produce one invitation and one non-secret replay',async()=>{
  const f=await fixture(),rs=await Promise.all([f.create(),f.create()]);assert.notEqual(rs[0].replay,rs[1].replay);assert.equal(rs[0].id,rs[1].id);
  assert.equal(rs.filter(r=>typeof r.secret==='string').length,1);assert.equal(rs.find(r=>r.replay).secret,null);assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),1);
 });
 await t.test('same key with a changed immutable body conflicts without another invitation',async()=>{
  const f=await fixture(),first=await f.create();
  await assert.rejects(()=>invites.create(issuer.id,agency.id,f.p.id,{...f.command,recipientEmail:'different@example.test'}),denied('idempotency_conflict'));
  assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),1);assert.equal((await db.agencyGiftInvitation.findUnique({where:{id:first.id}})).state,'invited');
 });
 await t.test('unrelated practice revision does not invalidate a valid creation replay',async()=>{
  const f=await fixture(),first=await f.create();
  await practices.review(issuer.id,agency.id,f.p.id,{key:randomUUID(),expectedRevision:await f.revision(),command:{operation:'unit',id:'unrelated-unit',label:'Unit DEMO'}});
  const replay=await f.create();assert.equal(replay.replay,true);assert.equal(replay.id,first.id);assert.equal(replay.secret,null);
 });
 await t.test('verified normal account claims and replays after another store instance without Agency membership or Home writes',async()=>{
  const f=await fixture(),created=await f.create(),homes=await db.home.count(),before=await f.snapshot();
  const claimed=await invites.claim(f.recipient.id,created.id,created.secret,created.version);assert.equal(claimed.state,'claimed');assert.equal(claimed.version,2);assert.equal(claimed.replay,false);assert.equal(claimed.canAccept,false);
  const replay=await new GiftInvitationsStore(db).claim(f.recipient.id,created.id,created.secret,created.version);assert.equal(replay.replay,true);assert.equal(replay.version,2);
  const row=await db.agencyGiftInvitation.findUnique({where:{id:created.id}});assert.equal(row.snapshot.claim.accountId,f.recipient.id);assert.equal(row.snapshot.state,'claimed');assert.equal(JSON.stringify(row).includes(created.secret),false);
  assert.equal(await db.home.count(),homes);assert.deepEqual(await f.snapshot(),before);assert.equal(await db.agencyMember.count({where:{accountId:f.recipient.id}}),0);
 });
 await t.test('concurrent claims for the same account bind once and return one replay',async()=>{
  const f=await fixture(),created=await f.create(),rs=await Promise.all([invites.claim(f.recipient.id,created.id,created.secret,1),invites.claim(f.recipient.id,created.id,created.secret,1)]);
  assert.notEqual(rs[0].replay,rs[1].replay);assert.equal(rs[0].version,2);assert.equal(rs[1].version,2);
  assert.equal((await db.agencyGiftInvitation.findUnique({where:{id:created.id}})).snapshot.claim.accountId,f.recipient.id);
 });
 await t.test('wrong verified account and malformed credential reveal no manifest and write no claim',async()=>{
  const f=await fixture(),created=await f.create(),wrong=await db.account.create({data:{name:'Wrong recipient DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:past}}),before=await db.agencyGiftInvitation.findUnique({where:{id:created.id}});
  await assert.rejects(()=>invites.claim(wrong.id,created.id,created.secret,1),denied('unavailable'));
  await assert.rejects(()=>invites.landing(created.id,'bad-secret'),denied('unavailable'));
  assert.deepEqual(await db.agencyGiftInvitation.findUnique({where:{id:created.id}}),before);
 });
 await t.test('matching but unverified account cannot claim until auth marks its email verified',async()=>{
  const f=await fixture({verified:false}),created=await f.create();
  await assert.rejects(()=>invites.claim(f.recipient.id,created.id,created.secret,1),denied('unavailable'));
  assert.equal((await db.agencyGiftInvitation.findUnique({where:{id:created.id}})).snapshot.claim,null);
  await db.account.update({where:{id:f.recipient.id},data:{emailVerifiedAt:past}});
  assert.equal((await invites.claim(f.recipient.id,created.id,created.secret,1)).state,'claimed');
 });
 await t.test('source replacement after invitation blocks claim and creation replay without changing the invitation',async()=>{
  const f=await fixture(),created=await f.create(),before=await db.agencyGiftInvitation.findUnique({where:{id:created.id}});
  await practices.upload(issuer.id,agency.id,f.p.id,{key:randomUUID(),expectedRevision:await f.revision(),command:{operation:'replace',sourceId:'gift-document',expectedSourceVersion:1,originalFilename:'replacement-DEMO.pdf'}},Buffer.from('%PDF-1.4\nGift replacement DEMO\n%%EOF\n'),vault);
  await assert.rejects(()=>invites.claim(f.recipient.id,created.id,created.secret,1),denied('unavailable','source_changed'));
  await assert.rejects(f.create,denied('unavailable','source_changed'));
  assert.deepEqual(await db.agencyGiftInvitation.findUnique({where:{id:created.id}}),before);
 });
 await t.test('revoked issuer export blocks new claim and creation replay',async()=>{
  const f=await fixture(),created=await f.create(),before=await db.agencyGiftInvitation.findUnique({where:{id:created.id}});
  await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:issuer.id}},data:{canExport:false}});
  await assert.rejects(()=>invites.claim(f.recipient.id,created.id,created.secret,1),denied('unavailable','access_denied'));
  await assert.rejects(f.create,denied('unavailable','access_denied'));
  assert.deepEqual(await db.agencyGiftInvitation.findUnique({where:{id:created.id}}),before);
 });
 await t.test('revoke is durable and idempotent and invalidates landing and claim',async()=>{
  const f=await fixture(),created=await f.create(),revoked=await invites.revoke(issuer.id,agency.id,f.p.id,created.id,1);
  assert.equal(revoked.state,'revoked');assert.equal(revoked.version,2);assert.equal(revoked.replay,false);
  assert.equal((await new GiftInvitationsStore(db).revoke(issuer.id,agency.id,f.p.id,created.id,1)).replay,true);
  await assert.rejects(()=>invites.landing(created.id,created.secret),denied('unavailable'));
  await assert.rejects(()=>invites.claim(f.recipient.id,created.id,created.secret,1),denied('unavailable'));
 });
 await t.test('snapshot state or version disagreement with SQL row blocks landing and claim without writes',async()=>{
  const f=await fixture(),created=await f.create(),row=await db.agencyGiftInvitation.findUnique({where:{id:created.id}}),snapshot=structuredClone(row.snapshot);
  snapshot.state='claimed';snapshot.version=2;snapshot.claim={accountId:f.recipient.id,claimedAt:snapshot.createdAt};
  await db.agencyGiftInvitation.update({where:{id:created.id},data:{snapshot}});
  const corrupt=await db.agencyGiftInvitation.findUnique({where:{id:created.id}});
  await assert.rejects(()=>invites.landing(created.id,created.secret),denied('invalid_input','unavailable'));
  await assert.rejects(()=>invites.claim(f.recipient.id,created.id,created.secret,1),denied('invalid_input','unavailable'));
  assert.deepEqual(await db.agencyGiftInvitation.findUnique({where:{id:created.id}}),corrupt);
 });
 await t.test('claimedAccountId disagreement with the sealed snapshot fails closed',async()=>{
  const f=await fixture(),created=await f.create();await invites.claim(f.recipient.id,created.id,created.secret,1);
  const other=await db.account.create({data:{name:'Mismatch DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic',emailVerifiedAt:past}});
  await db.agencyGiftInvitation.update({where:{id:created.id},data:{claimedAccountId:other.id}});
  const corrupt=await db.agencyGiftInvitation.findUnique({where:{id:created.id}});
  await assert.rejects(()=>invites.landing(created.id,created.secret),denied('invalid_input','unavailable'));
  await assert.rejects(()=>invites.claim(f.recipient.id,created.id,created.secret,2),denied('invalid_input','unavailable'));
  assert.deepEqual(await db.agencyGiftInvitation.findUnique({where:{id:created.id}}),corrupt);
 });
 await t.test('concurrent claim and revoke end durably revoked without creating Home',async()=>{
  const f=await fixture(),created=await f.create(),homes=await db.home.count();
  const rs=await Promise.allSettled([invites.claim(f.recipient.id,created.id,created.secret,1),invites.revoke(issuer.id,agency.id,f.p.id,created.id,1)]);
  assert.ok(rs.some(r=>r.status==='fulfilled'));
  if(rs[0].status==='rejected')assert.ok(denied('unavailable','revision_conflict')(rs[0].reason));
  if(rs[1].status==='rejected'){
   assert.equal(rs[1].reason.code,'revision_conflict');const current=await db.agencyGiftInvitation.findUnique({where:{id:created.id}});
   await invites.revoke(issuer.id,agency.id,f.p.id,created.id,current.version);
  }
  const final=await db.agencyGiftInvitation.findUnique({where:{id:created.id}});assert.equal(final.state,'revoked');assert.equal(final.snapshot.state,'revoked');assert.equal(await db.home.count(),homes);
  await assert.rejects(()=>new GiftInvitationsStore(db).landing(created.id,created.secret),denied('unavailable'));
  await assert.rejects(()=>new GiftInvitationsStore(db).claim(f.recipient.id,created.id,created.secret,final.version),denied('unavailable'));
 });
 await t.test('creation digest inconsistent with immutable snapshot cannot authorize a different same-key replay',async()=>{
  const f=await fixture(),created=await f.create(),different={...f.command,recipientEmail:'different-command@example.test'};
  const forgedDigest=giftInvitationCreationDigest(parseGiftInvitationCommand(different));
  await db.agencyGiftInvitation.update({where:{id:created.id},data:{creationDigest:forgedDigest}});
  const corrupt=await db.agencyGiftInvitation.findUnique({where:{id:created.id}});
  await assert.rejects(()=>new GiftInvitationsStore(db).create(issuer.id,agency.id,f.p.id,different),denied('invalid_input','unavailable'));
  assert.deepEqual(await db.agencyGiftInvitation.findUnique({where:{id:created.id}}),corrupt);assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),1);
 });
 await t.test('read-only issuer with export cannot create or revoke while existing recipient flow keeps export authority',async()=>{
  const f=await fixture(),created=await f.create(),before=await db.agencyGiftInvitation.findUnique({where:{id:created.id}}),homes=await db.home.count();
  await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:issuer.id}},data:{access:'read',canExport:true}});
  await assert.rejects(f.create,denied('access_denied'));
  await assert.rejects(()=>invites.create(issuer.id,agency.id,f.p.id,{...f.command,key:randomUUID()}),denied('access_denied'));
  await assert.rejects(()=>invites.revoke(issuer.id,agency.id,f.p.id,created.id,1),denied('access_denied'));
  assert.deepEqual(await db.agencyGiftInvitation.findUnique({where:{id:created.id}}),before);assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),1);
  assert.deepEqual(await invites.landing(created.id,created.secret),{id:created.id,requiresAccount:true,canAccept:false});
  assert.equal((await invites.claim(f.recipient.id,created.id,created.secret,1)).state,'claimed');assert.equal(await db.home.count(),homes);
 });
 await t.test('benefit request without a server offer fails before persisting an invitation',async()=>{
  const f=await fixture();await assert.rejects(()=>invites.create(issuer.id,agency.id,f.p.id,{...f.command,annualBenefit:true}),denied('benefit_unavailable'));
  assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),0);
 });
});
