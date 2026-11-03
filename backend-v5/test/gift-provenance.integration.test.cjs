const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {publicDocument,DocumentsService}=require('../dist/documents/documents.service');
const {TrashService}=require('../dist/documents/trash.service'),{DocumentPolicy}=require('../dist/documents/access');
const hash='a'.repeat(64);
const provenance=()=>({schemaVersion:1,kind:'agency_gift',invitationId:'invitation-DEMO',agencyId:'agency-DEMO',practiceId:'practice-DEMO',sourceId:'source-DEMO',sourceVersion:3,sourceSha256:hash,metadataVersion:2,origin:'agency_generated',author:'Agency DEMO',title:'Synthetic surface schedule',surface:{kind:'commercial',qualification:'estimated',method:'Assumed A4, declared scale',geometryRevision:4,caveats:['Paper format not verified']}});
const unavailable=fn=>assert.throws(fn,e=>e.getStatus()===503&&e.getResponse().code==='storage_unavailable');

test('Gift provenance metadata-only JSONB projection on a new owned cluster; no acceptance or file admission',{timeout:180000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN);assertDevelopmentDatabase(process.env.DATABASE_URL);
 const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const owner=await db.account.create({data:{name:'Provenance metadata DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic'}});
 const home=await db.home.create({data:{name:'Synthetic provenance Home',address:'Via DEMO 1',memberships:{create:{accountId:owner.id,role:'owner'}}}});
 async function createDoc(giftProvenance,sha256=hash){
  const row=await db.document.create({data:{homeId:home.id,uploaderId:owner.id,name:'Metadata fixture only',visibility:'private',...(giftProvenance===undefined?{}:{giftProvenance}),original:{create:{version:1,originalFilename:'metadata-DEMO.pdf',mimeType:'application/pdf',byteSize:100,sha256,file:{create:{storageKey:randomUUID()+'.bin'}}}}},select:{id:true}});
  return db.document.findUniqueOrThrow({where:{id:row.id},include:{original:{include:{file:true}}}});
 }
 await t.test('JSONB roundtrip keeps local version1 and source version3 with estimate method and caveats',async()=>{
  const selected=provenance(),row=await createDoc(selected),detail=publicDocument(row,true,true),list=publicDocument(row,true);
  assert.deepEqual(row.giftProvenance,selected);assert.equal(detail.source,'agency_gift');assert.equal(detail.version,1);assert.equal(detail.giftProvenance.sourceVersion,3);assert.equal(detail.giftProvenance.metadataVersion,2);assert.deepEqual(detail.giftProvenance.surface,selected.surface);
  assert.equal(list.source,'agency_gift');assert.equal('giftProvenance'in list,false);assert.equal('sha256'in list,false);
  detail.giftProvenance.surface.caveats.push('caller mutation');const again=await db.document.findUniqueOrThrow({where:{id:row.id}});assert.deepEqual(again.giftProvenance.surface.caveats,['Paper format not verified']);
 });
 await t.test('nullable origin keeps existing manual documents and permissions unchanged',async()=>{
  const row=await createDoc(undefined);assert.equal(row.giftProvenance,null);const detail=publicDocument(row,false,true);assert.equal(detail.source,'manual_upload');assert.equal('giftProvenance'in detail,false);assert.deepEqual(detail.permissions,['read']);
 });
 await t.test('malformed persisted provenance and private injection fail closed instead of manual fallback',async()=>{
  for(const gift of [{...provenance(),schemaVersion:2},{...provenance(),email:'private@example.test'},{...provenance(),surface:{...provenance().surface,caveats:[]}}]){
   const row=await createDoc(gift);unavailable(()=>publicDocument(row,true,true));unavailable(()=>publicDocument(row,true));
  }
 });
 await t.test('stored source SHA must match the Home original metadata before projection',async()=>{
  const row=await createDoc(provenance(),'b'.repeat(64));unavailable(()=>publicDocument(row,true,true));unavailable(()=>publicDocument(row,false));
 });
 await t.test('actual trash/restore preserves provenance; permanent purge clears SQL JSON and denies public detail',async()=>{
  const selected=provenance(),row=await createDoc(selected),removed=[],storage={remove:async key=>{removed.push(key);}},policy=new DocumentPolicy(db),trash=new TrashService(db,storage,policy),documents=new DocumentsService(db,storage,policy);
  const first=await trash.trash(owner.id,home.id,row.id,{expectedVersion:1},randomUUID());
  const trashed=await db.document.findUniqueOrThrow({where:{id:row.id}});assert.deepEqual(trashed.giftProvenance,selected);assert.ok(trashed.trashedAt);
  await assert.rejects(()=>documents.get(owner.id,home.id,row.id),e=>e.getStatus()===403);
  await trash.restore(owner.id,home.id,row.id,{expectedVersion:first.entry.version},randomUUID());
  const restored=await db.document.findUniqueOrThrow({where:{id:row.id}});assert.equal(restored.trashedAt,null);assert.deepEqual(restored.giftProvenance,selected);
  const opened=await documents.get(owner.id,home.id,row.id);assert.equal(opened.document.source,'agency_gift');assert.deepEqual(opened.document.giftProvenance,selected);
  const again=await trash.trash(owner.id,home.id,row.id,{expectedVersion:1},randomUUID());
  await trash.purgeNow(owner.id,home.id,row.id,{expectedVersion:again.entry.version},randomUUID());
  const purged=await db.document.findUniqueOrThrow({where:{id:row.id},include:{original:{include:{file:true}}}});
  assert.ok(purged.purgedAt);assert.equal(purged.name,'');assert.equal(purged.original,null);assert.equal(purged.giftProvenance,null);
  const [state]=await db.$queryRaw`SELECT "giftProvenance" IS NULL AS cleared FROM "Document" WHERE id=${row.id}`;assert.equal(state.cleared,true);
  await assert.rejects(()=>documents.get(owner.id,home.id,row.id),e=>e.getStatus()===403);unavailable(()=>publicDocument(purged,true,true));
  assert.deepEqual(removed,[row.original.file.storageKey]);
 });
});
