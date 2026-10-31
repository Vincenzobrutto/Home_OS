const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto'),path=require('node:path');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
test('Gift metadata persistence on a new owned synthetic cluster',{timeout:180000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);
 const owned=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),db=new PrismaClient();
 await db.$connect();t.after(()=>db.$disconnect());
 const store=new AgencyPracticesStore(db),vault=await AgencyFileVault.open(path.join(owned.directory,'gift-vault-'+randomUUID()));
 const agency=await db.agency.create({data:{name:'Gift synthetic agency'}}),past=new Date('2026-01-01'),accounts=[];
 for(const role of ['admin','admin','viewer']){
  const a=await db.account.create({data:{name:'Gift DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic'}});
  await db.agencyMember.create({data:{agencyId:agency.id,accountId:a.id,role,validFrom:past}});accounts.push(a);
 }
 const [a,b,viewer]=accounts,bytes=Buffer.from('%PDF-1.4\nSynthetic Gift document\n%%EOF\n'),sha256=createHash('sha256').update(bytes).digest('hex');
 async function fixture(visibility='practice',lifecycle='final'){
  const p=(await store.create(a.id,agency.id,'Gift DEMO '+randomUUID(),randomUUID())).practice;
  for(const [account,access] of [[b,'edit'],[viewer,'read']])await db.agencyPracticeGrant.create({data:{practiceId:p.id,accountId:account.id,access,canExport:account.id===b.id,validFrom:past}});
  const revision=async()=>(await store.read(a.id,agency.id,p.id)).revision;
  await store.upload(a.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId:'document',visibility,originalFilename:'synthetic-gift.pdf'}},bytes,vault);
  const descriptor={agencyId:agency.id,practiceId:p.id,sourceId:'document',sourceVersion:1,sha256,metadataVersion:1,origin:'agency_generated',lifecycle,author:'Synthetic agency producer',title:'Synthetic final schedule',surface:{kind:'commercial',qualification:'estimated',method:'Assumed A4',geometryRevision:1,caveats:['Paper size not verified']}};
  const command=async()=>({key:randomUUID(),expectedRevision:await revision(),expectedMetadataVersion:null});
  const register=(d,input)=>store.registerGiftMetadata(a.id,agency.id,p.id,d,input);
  const select=async()=>({expectedRevision:await revision(),requestedHomeId:'synthetic-destination',recipients:[{subjectRef:'holder-a'},{subjectRef:'holder-b'}],documents:[{sourceId:'document',version:1,sha256}]});
  const snapshot=async()=>(await db.agencyPractice.findUnique({where:{id:p.id}})).snapshot;
  return {p,revision,descriptor,command,register,select,snapshot};
 }
 await t.test('metadata survives JSONB and another store; preparing never writes Home or grants',async()=>{
  const f=await fixture(),saved=await f.register(f.descriptor,await f.command()),other=new AgencyPracticesStore(db);
  const view=await other.readGiftMetadata(a.id,agency.id,f.p.id);assert.equal(view.documents[0].state,'current');assert.equal(view.documents[0].descriptor.origin,'agency_generated');assert.equal('practice'in saved,false);
  const before=await f.snapshot(),homes=await db.home.count(),grants=await db.agencyPracticeGrant.count(),packet=await other.prepareGiftPacket(a.id,agency.id,f.p.id,await f.select());
  assert.equal(packet.recipients.length,2);assert.equal(packet.documents[0].surface.qualification,'estimated');assert.deepEqual(packet.documents[0].surface.caveats,['Paper size not verified']);
  for(const flag of ['canDeliver','createsHome','grantsAccess','certification','homeDestinationAuthorized','recipientIdentityVerified'])assert.equal(packet[flag],false);
  assert.deepEqual(await f.snapshot(),before);assert.equal(await db.home.count(),homes);assert.equal(await db.agencyPracticeGrant.count(),grants);
  view.documents[0].descriptor.title='Caller mutation';assert.equal((await other.readGiftMetadata(a.id,agency.id,f.p.id)).documents[0].descriptor.title,f.descriptor.title);
 });
 await t.test('concurrent identical commands persist one record and durable replay receipt',async()=>{
  const f=await fixture(),input=await f.command(),rs=await Promise.all([f.register(f.descriptor,input),f.register(f.descriptor,input)]);
  assert.notEqual(rs[0].replay,rs[1].replay);assert.equal(rs[0].receipt.recordId,rs[1].receipt.recordId);
  const replay=await new AgencyPracticesStore(db).registerGiftMetadata(a.id,agency.id,f.p.id,f.descriptor,input);assert.equal(replay.replay,true);assert.equal((await f.snapshot()).giftDocuments.length,1);assert.equal((await f.snapshot()).giftMetadataReceipts.length,1);
  await assert.rejects(()=>f.register({...f.descriptor,title:'Changed'},input),e=>e.code==='idempotency_conflict');
 });
 await t.test('competing commands cannot overwrite a winner at the same revision',async()=>{
  const f=await fixture(),input=await f.command(),rs=await Promise.allSettled([f.register(f.descriptor,input),f.register({...f.descriptor,title:'Competing'},{...input,key:randomUUID()})]);
  assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);assert.equal(rs.find(r=>r.status==='rejected').reason.code,'revision_conflict');assert.equal((await f.snapshot()).giftDocuments.length,1);
 });
 await t.test('metadata updates append history; old preparation revision cannot pass',async()=>{
  const f=await fixture();await f.register(f.descriptor,await f.command());const selection=await f.select(),old=await f.snapshot();
  await f.register({...f.descriptor,metadataVersion:2,title:'Second explicit version'},{key:randomUUID(),expectedRevision:await f.revision(),expectedMetadataVersion:1});
  const now=await f.snapshot();assert.equal(now.giftDocuments.length,2);assert.deepEqual(now.giftDocuments[0],old.giftDocuments[0]);
  await assert.rejects(async()=>store.prepareGiftPacket(a.id,agency.id,f.p.id,selection),e=>e.code==='revision_conflict');assert.equal((await store.prepareGiftPacket(a.id,agency.id,f.p.id,await f.select())).documents[0].metadataVersion,2);
 });
 await t.test('private source and its metadata stay invisible to another assigned admin',async()=>{
  const f=await fixture('private');await f.register(f.descriptor,await f.command());assert.deepEqual((await store.readGiftMetadata(b.id,agency.id,f.p.id)).documents,[]);
  await assert.rejects(async()=>store.prepareGiftPacket(b.id,agency.id,f.p.id,await f.select()),e=>e.code==='access_denied');
 });
 await t.test('viewer can read authorized metadata but cannot register or export',async()=>{
  const f=await fixture();await f.register(f.descriptor,await f.command());assert.equal((await store.readGiftMetadata(viewer.id,agency.id,f.p.id)).documents.length,1);const before=await f.snapshot();
  await assert.rejects(()=>store.registerGiftMetadata(viewer.id,agency.id,f.p.id,f.descriptor,{key:randomUUID(),expectedRevision:before.revision,expectedMetadataVersion:1}),e=>e.code==='access_denied');
  await assert.rejects(async()=>store.prepareGiftPacket(viewer.id,agency.id,f.p.id,await f.select()),e=>e.code==='access_denied');assert.deepEqual(await f.snapshot(),before);
 });
 await t.test('replacement marks metadata stale and blocks old-source replay without writes',async()=>{
  const f=await fixture(),input=await f.command();await f.register(f.descriptor,input);
  await store.upload(a.id,agency.id,f.p.id,{key:randomUUID(),expectedRevision:await f.revision(),command:{operation:'replace',sourceId:'document',expectedSourceVersion:1,originalFilename:'replacement.pdf'}},Buffer.from('%PDF-1.4\nReplacement DEMO\n%%EOF\n'),vault);
  const view=await store.readGiftMetadata(a.id,agency.id,f.p.id),before=await f.snapshot();assert.equal(view.documents[0].state,'stale');assert.equal(view.documents[0].descriptor,undefined);
  await assert.rejects(()=>f.register(f.descriptor,input),e=>e.code==='source_changed');
  const latest=before.sources[0].versions.at(-1),selection=await f.select();selection.documents=[{sourceId:'document',version:latest.version,sha256:latest.sha256}];
  await assert.rejects(async()=>store.prepareGiftPacket(a.id,agency.id,f.p.id,selection),e=>e.code==='source_changed');assert.deepEqual(await f.snapshot(),before);
 });
 await t.test('revoking export after registration prevents replay and preparation',async()=>{
  const f=await fixture(),input=await f.command();await f.register(f.descriptor,input);const before=await f.snapshot();
  await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:a.id}},data:{canExport:false}});
  await assert.rejects(()=>f.register(f.descriptor,input),e=>e.code==='access_denied');await assert.rejects(async()=>store.prepareGiftPacket(a.id,agency.id,f.p.id,{expectedRevision:before.revision}),e=>e.code==='access_denied');assert.deepEqual(await f.snapshot(),before);
 });
 await t.test('withdrawal removes metadata view and cannot be undone through replay',async()=>{
  const f=await fixture(),input=await f.command();await f.register(f.descriptor,input);
  await store.mutate(a.id,agency.id,f.p.id,{key:randomUUID(),expectedRevision:await f.revision(),command:{operation:'withdraw',sourceId:'document',expectedSourceVersion:1}});
  const before=await f.snapshot();assert.deepEqual((await store.readGiftMetadata(a.id,agency.id,f.p.id)).documents,[]);await assert.rejects(()=>f.register(f.descriptor,input),e=>e.code==='access_denied');assert.deepEqual(await f.snapshot(),before);
 });
 await t.test('bad trusted descriptor rolls back without consuming command key',async()=>{
  const f=await fixture(),input=await f.command(),before=await f.snapshot();await assert.rejects(()=>f.register({...f.descriptor,sha256:'b'.repeat(64)},input),e=>e.code==='source_changed');assert.deepEqual(await f.snapshot(),before);assert.equal((await f.register(f.descriptor,input)).replay,false);
 });
 await t.test('draft can be registered but not delivered; client metadata injection rejected',async()=>{
  const f=await fixture('practice','draft');await f.register(f.descriptor,await f.command());const selection=await f.select(),before=await f.snapshot();
  await assert.rejects(async()=>store.prepareGiftPacket(a.id,agency.id,f.p.id,selection),e=>e.code==='invalid_input');await assert.rejects(async()=>store.prepareGiftPacket(a.id,agency.id,f.p.id,{...selection,descriptor:{lifecycle:'signed'}}),e=>e.code==='invalid_input');assert.deepEqual(await f.snapshot(),before);
 });
});
