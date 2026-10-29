'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client');
const {assertDevelopmentDatabase}=require('../dist/prisma.service');
const {AgencyPracticesStore}=require('../dist/agency-practices/store');
const past=new Date('2026-01-01T00:00:00Z');
test('agency practice persistence: isolated PostgreSQL, replay, privacy and concurrency',{timeout:90000},async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);
 const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());const store=new AgencyPracticesStore(db),tag=randomUUID();
 const accounts=[];for(const name of ['owner','colleague','outsider','viewer'])accounts.push(await db.account.create({data:{name:'Agency DEMO '+name,email:tag+'-'+name+'@example.test',passwordHash:'synthetic-no-login'}}));
 const [A,B,C,V]=accounts,agency=await db.agency.create({data:{name:'Agency DEMO A'}}),other=await db.agency.create({data:{name:'Agency DEMO B'}});
 for(const [a,id,role] of [[A,agency.id,'admin'],[B,agency.id,'agent'],[V,agency.id,'viewer'],[C,other.id,'admin']])await db.agencyMember.create({data:{agencyId:id,accountId:a.id,role,validFrom:past}});
 let p;
 const deny=fn=>assert.rejects(fn,e=>e.code==='access_denied');
 const req=(sourceId,expectedRevision=1,key=randomUUID(),visibility='practice',hash='a'.repeat(64))=>({key,expectedRevision,command:{operation:'attach',sourceId,visibility,file:{sha256:hash,originalFilename:'atto-demo.pdf',mimeType:'application/pdf',byteSize:100}}});
 await t.test('create persists one practice and grant, same-key concurrency is idempotent',async()=>{
  const key=randomUUID(),before=await db.agencyPractice.count({where:{agencyId:agency.id}});
  const [one,two]=await Promise.all([store.create(A.id,agency.id,'Casa DEMO',key),store.create(A.id,agency.id,'Casa DEMO',key)]);
  assert.equal(one.practice.id,two.practice.id);p=one.practice;
  assert.equal(await db.agencyPractice.count({where:{agencyId:agency.id}}),before+1);
  assert.equal(await db.agencyCreateRequest.count({where:{agencyId:agency.id,accountId:A.id,key}}),1);
  await assert.rejects(()=>store.create(A.id,agency.id,'Different',key),e=>e.code==='idempotency_conflict');
 });
 await t.test('unassigned admin/agent, viewer and other agency cannot create or read unrelated practices',async()=>{
  await deny(()=>store.read(B.id,agency.id,p.id));await deny(()=>store.read(C.id,agency.id,p.id));await deny(()=>store.read(A.id,other.id,p.id));await deny(()=>store.create(V.id,agency.id,'Viewer denied',randomUUID()));
 });
 await t.test('persisted concurrent upload metadata uses one revision and one ledger entry',async()=>{
  const r=req('source-1',1),[one,two]=await Promise.all([store.mutate(A.id,agency.id,p.id,r),store.mutate(A.id,agency.id,p.id,r)]);
  assert.equal(one.receipt.revision,2);assert.equal(two.receipt.revision,2);assert.notEqual(one.replay,two.replay);
  const saved=await db.agencyPractice.findUnique({where:{id:p.id}});assert.equal(saved.snapshot.receipts.length,1);assert.equal(saved.snapshot.events.length,1);assert.equal(saved.revision,2);
 });
 await t.test('stale concurrent edits do not overwrite; loser transaction writes nothing',async()=>{
  const results=await Promise.allSettled([store.mutate(A.id,agency.id,p.id,req('source-2',2)),store.mutate(A.id,agency.id,p.id,req('source-3',2))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'revision_conflict');
  const saved=await db.agencyPractice.findUnique({where:{id:p.id}});assert.equal(saved.revision,3);assert.equal(saved.snapshot.sources.length,2);assert.equal(saved.snapshot.receipts.length,2);
 });
 await t.test('private original metadata invisible to another assigned agent and owner role',async()=>{
  await db.agencyPracticeGrant.create({data:{practiceId:p.id,accountId:B.id,access:'edit',canExport:true,validFrom:past}});
  await store.mutate(A.id,agency.id,p.id,req('private-1',3,randomUUID(),'private'));
  const owner=await store.read(A.id,agency.id,p.id),colleague=await store.read(B.id,agency.id,p.id);assert.equal(owner.visibleDocumentCount,3);assert.equal(colleague.visibleDocumentCount,2);assert.doesNotMatch(JSON.stringify(colleague),/private-1|snapshot|sha256|receipts/);
  await deny(()=>store.manifest(B.id,agency.id,p.id,[{sourceId:'source-1',version:1,sha256:'a'.repeat(64)},{sourceId:'private-1',version:1,sha256:'a'.repeat(64)}]));
  await db.agencyMember.update({where:{agencyId_accountId:{agencyId:agency.id,accountId:B.id}},data:{role:'admin'}});
  assert.equal((await store.read(B.id,agency.id,p.id)).visibleDocumentCount,2);
  await deny(()=>store.manifest(B.id,agency.id,p.id,[{sourceId:'private-1',version:1,sha256:'a'.repeat(64)}]));
  await db.agencyMember.update({where:{agencyId_accountId:{agencyId:agency.id,accountId:B.id}},data:{role:'agent'}});
 });
 await t.test('replacement retains old snapshot and exact original ledger in PostgreSQL',async()=>{
  await store.mutate(A.id,agency.id,p.id,{key:randomUUID(),expectedRevision:4,command:{operation:'replace',sourceId:'source-1',expectedSourceVersion:1,file:{sha256:'b'.repeat(64),originalFilename:'atto-v2.pdf',mimeType:'application/pdf',byteSize:120}}});
  const saved=await db.agencyPractice.findUnique({where:{id:p.id}}),s=saved.snapshot.sources.find(s=>s.id==='source-1');assert.equal(s.versions.length,2);assert.equal(s.versions[0].sha256,'a'.repeat(64));assert.equal(s.versions[1].sha256,'b'.repeat(64));
  await assert.rejects(()=>store.manifest(A.id,agency.id,p.id,[{sourceId:'source-1',version:1,sha256:'a'.repeat(64)}]),e=>e.code==='source_changed');
 });
 await t.test('revocation blocks prior reads, exports and mutation replays',async()=>{
  const r=req('source-b',5),result=await store.mutate(B.id,agency.id,p.id,r);assert.equal(result.practice.revision,6);
  await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:p.id,accountId:B.id}},data:{revokedAt:new Date()}});
  await deny(()=>store.read(B.id,agency.id,p.id));await deny(()=>store.mutate(B.id,agency.id,p.id,r));await deny(()=>store.manifest(B.id,agency.id,p.id,[{sourceId:'source-1',version:2,sha256:'b'.repeat(64)}]));
 });
 await t.test('viewer with overly permissive assignment still cannot mutate or export',async()=>{
  await db.agencyPracticeGrant.create({data:{practiceId:p.id,accountId:V.id,access:'edit',canExport:true,validFrom:past}});assert.equal((await store.read(V.id,agency.id,p.id)).visibleDocumentCount,3);
  await deny(()=>store.mutate(V.id,agency.id,p.id,req('viewer-source',6)));await deny(()=>store.manifest(V.id,agency.id,p.id,[{sourceId:'source-1',version:2,sha256:'b'.repeat(64)}]));
 });
 await t.test('failed malformed mutation leaves revision and JSON snapshot byte-equivalent',async()=>{
  const before=await db.agencyPractice.findUnique({where:{id:p.id}});const r=req('bad',6);r.command.file.byteSize=0;await assert.rejects(()=>store.mutate(A.id,agency.id,p.id,r),e=>e.code==='invalid_input');const after=await db.agencyPractice.findUnique({where:{id:p.id}});assert.deepEqual(after.snapshot,before.snapshot);assert.equal(after.revision,before.revision);
 });
 await t.test('fresh Prisma client reads persisted state; no process-local store',async()=>{
  const second=new PrismaClient();try{const another=new AgencyPracticesStore(second);assert.equal((await another.read(A.id,agency.id,p.id)).revision,6);}finally{await second.$disconnect();}
 });
});
