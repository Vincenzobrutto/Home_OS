require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service');
const {ReviewService}=require('../dist/review/review.service');
const {HomeObjectsService}=require('../dist/home-objects/home-objects.service');
const {ObjectOnboardingAccess}=require('../dist/object-onboarding/access');
const {ObjectOnboardingService}=require('../dist/object-onboarding/onboarding.service');
const {DocumentsService}=require('../dist/documents/documents.service'),{DocumentPolicy}=require('../dist/documents/access');

test('Only-document confirmation closes manual work without creating resources and preserves replay/security',async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaService();await db.$connect();
 const a=await db.account.create({data:{email:randomUUID()+'@example.test',name:'SYNTHETIC document only',passwordHash:'not-login'}});
 const h=await db.home.create({data:{name:'SYNTHETIC document only',address:'Via Test'}});
 await db.homeMembership.create({data:{accountId:a.id,homeId:h.id,role:'owner'}});
 const doc=await db.document.create({data:{homeId:h.id,uploaderId:a.id,name:'Synthetic regulation',original:{create:{originalFilename:'synthetic.pdf',mimeType:'application/pdf',byteSize:20,sha256:'a'.repeat(64),file:{create:{storageKey:randomUUID()}}}}},include:{original:true}});
 t.after(async()=>{const where={homeId:h.id};await db.objectOnboardingRequest.deleteMany({where});await db.objectOnboardingDraft.deleteMany({where});await db.documentOrganization.deleteMany({where});await db.documentVersion.delete({where:{documentId:doc.id}});await db.document.delete({where:{id:doc.id}});await db.storedFile.delete({where:{id:doc.original.fileId}});await db.homeMembership.deleteMany({where});await db.home.delete({where:{id:h.id}});await db.account.delete({where:{id:a.id}});await db.$disconnect();});
 const review=new ReviewService(db,{}),objects=new HomeObjectsService(db,review),access=new ObjectOnboardingAccess(db,review),service=new ObjectOnboardingService(access,objects,review,{now:()=>new Date('2026-10-18T10:00:00Z')});
 const {draft}=await service.manualDraft(a.id,h.id,{documentId:doc.id},randomUUID());
 const body={expectedVersion:draft.version,source:draft.snapshot,choices:[],documentOnly:true};
 await t.test('unorganized source cannot silently finish',async()=>{await assert.rejects(service.confirm(a.id,h.id,draft.id,body,randomUUID()));});
 await db.documentOrganization.create({data:{accountId:a.id,homeId:h.id,documentId:doc.id,documentVersion:1,documentSha256:'a'.repeat(64),title:'Synthetic regulation',parts:[{kind:'condominium_regulation',pageFrom:null,pageTo:null}],collections:['condominium']}});
 await t.test('archive flag rejects mixed choices and stale source',async()=>{
  await assert.rejects(service.confirm(a.id,h.id,draft.id,{...body,choices:[{itemId:draft.items[0].id,action:'skip'}]},randomUUID()));
  await assert.rejects(service.confirm(a.id,h.id,draft.id,{...body,source:{...draft.snapshot,sha256:'b'.repeat(64)}},randomUUID()));
 });
 const key=randomUUID();
 await t.test('explicit save confirms the draft with zero canonical creations',async()=>{
  const saved=await service.confirm(a.id,h.id,draft.id,body,key);
  assert.equal(saved.draft.state,'confirmed');assert.equal(saved.result.newObjects,0);assert.equal(saved.result.newExpenses,0);
  assert.equal(await db.homeObject.count({where:{homeId:h.id}}),0);assert.equal(await db.homeExpense.count({where:{homeId:h.id}}),0);assert.equal(await db.homeContact.count({where:{homeId:h.id}}),0);
 });
 await t.test('source moves to completed before paging and replay is stable',async()=>{
  const documents=new DocumentsService(db,{},new DocumentPolicy(db));
  assert.equal((await documents.list(a.id,h.id,{limit:20,workflow:'pending'})).items.length,0);
  assert.equal((await documents.list(a.id,h.id,{limit:20,workflow:'completed'})).items[0].workflowState,'completed');
  assert.equal((await service.confirm(a.id,h.id,draft.id,body,key)).draft.state,'confirmed');
  await db.homeMembership.update({where:{accountId_homeId:{accountId:a.id,homeId:h.id}},data:{role:'viewer'}});
  await assert.rejects(service.confirm(a.id,h.id,draft.id,body,key));
 });
});
