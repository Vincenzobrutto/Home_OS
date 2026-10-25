'use strict';
global.fetch=async()=>{throw Error('network_forbidden_in_bill_completion');};
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {assertOfflineDatabase}=require('./offline-policy.cjs');
const {PrismaService}=require('../dist/prisma.service');
const {ReviewService}=require('../dist/review/review.service');
const {HomeObjectsService}=require('../dist/home-objects/home-objects.service');
const {ObjectOnboardingAccess}=require('../dist/object-onboarding/access');
const {ObjectOnboardingService}=require('../dist/object-onboarding/onboarding.service');
const {DocumentPolicy}=require('../dist/documents/access');
const {DocumentsService}=require('../dist/documents/documents.service');
const {IntakeBatchesService}=require('../dist/document-intake/batches.service');
const status=n=>e=>e.getStatus?.()===n;
const code=name=>e=>(e.getResponse?.().code??e.code)===name;

test('Bill completion: real services on disposable offline DB, canonical type, workflow and durable replay',{timeout:60000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);
 const db=new PrismaService();await db.$connect();
 const accounts=[],homes=[],fileIds=[],storageCalls=[];
 const review=new ReviewService(db,{}),policy=new DocumentPolicy(db);
 const service=new ObjectOnboardingService(new ObjectOnboardingAccess(db,review),new HomeObjectsService(db,review),review,{now:()=>new Date()});
 const documents=new DocumentsService(db,{read:async()=>{storageCalls.push('read');throw Error('storage_not_allowed');},remove:async()=>{storageCalls.push('remove');throw Error('storage_not_allowed');}},policy);
 const intake=new IntakeBatchesService(db,policy);
 t.after(async()=>{
  try{
   const where={homeId:{in:homes}};
   await db.documentIntakeRequest.deleteMany({where:{batch:where}});await db.documentIntakeItem.deleteMany({where:{batch:where}});await db.documentIntakeBatch.deleteMany({where});
   for(const model of ['objectOnboardingComparison','objectOnboardingBinding','objectOnboardingRequest','objectOnboardingJob','objectOnboardingDraft','expenseHistory','expenseRequest','homeExpense','objectEvent','objectResourceLink','homeObject','documentOrganization'])await db[model].deleteMany({where:{accountId:{in:accounts}}});
   await db.documentVersion.deleteMany({where:{document:where}});await db.document.deleteMany({where});await db.storedFile.deleteMany({where:{id:{in:fileIds}}});
   await db.homeMembership.deleteMany({where});await db.home.deleteMany({where:{id:{in:homes}}});await db.account.deleteMany({where:{id:{in:accounts}}});
  }finally{await db.$disconnect();}
 });
 for(const name of ['A','B'])accounts.push((await db.account.create({data:{name:'Synthetic workflow '+name,email:randomUUID()+'@example.test',passwordHash:'not-login',emailVerifiedAt:new Date()}})).id);
 for(const name of ['Primary','Other'])homes.push((await db.home.create({data:{name:'Synthetic workflow '+name,address:'Synthetic address'}})).id);
 const [a,b]=accounts,[h,otherHome]=homes;
 // The fixture intentionally starts before this test; no dependence on sub-millisecond Node/PG clock ordering.
 for(const [accountId,homeId] of [[a,h],[b,h],[a,otherHome]])await db.homeMembership.create({data:{accountId,homeId,role:'owner',validFrom:new Date('2020-01-01T00:00:00Z')}});
 const source=await db.document.create({data:{homeId:h,uploaderId:a,name:'Synthetic utility document',visibility:'private',original:{create:{originalFilename:'synthetic-bill.pdf',mimeType:'application/pdf',byteSize:100,sha256:'a'.repeat(64),file:{create:{storageKey:randomUUID()+'.bin'}}}}},include:{original:true}});fileIds.push(source.original.fileId);
 const counts=async()=>({objects:await db.homeObject.count({where:{homeId:h}}),expenses:await db.homeExpense.count({where:{homeId:h}})});
 const ledgers=()=>Promise.all(['aiAttempt','economicAiAttempt','receiptAiAttempt','objectOnboardingAttempt'].map(model=>db[model].count()));
 const beforeLedgers=await ledgers();
 const current=()=>documents.get(a,h,source.id).then(r=>r.document);
 const listed=workflow=>documents.list(a,h,{limit:20,workflow}).then(r=>r.items.map(x=>x.id));
 const pending=async()=>{assert((await listed('pending')).includes(source.id));assert(!(await listed('completed')).includes(source.id));};
 let draft,confirmation,key,confirmed;
 await t.test('manual bill selection leaves the source pending and creates no canonical data',async()=>{
  const initial=(await service.manualDraft(a,h,{documentId:source.id},randomUUID())).draft;assert.equal(initial.documentKind,'unsupported');
  draft=(await service.changeManualKind(a,h,initial.id,{expectedVersion:initial.version,documentKind:'utility_bill'},randomUUID())).draft;
  assert.equal(draft.documentKind,'utility_bill');assert.equal(draft.items.length,0);assert.equal(draft.houseExpenses.length,1);
  assert.equal((await current()).organization,null);await pending();assert.deepEqual(await counts(),{objects:0,expenses:0});
 });
 await t.test('saving incomplete compilation preserves inputs but never completes or creates an expense',async()=>{
  const compilation={saved:true,documentTitle:'Synthetic bill',documentKind:'utility_bill',replaceOrganization:false,reuseCopy:false,documentOnly:false,manualTotal:'',contacts:[],houseForms:{[draft.houseExpenses[0].id]:{candidateId:'',amount:'12,',manual:true,title:'Synthetic bill',supplier:'Synthetic supplier',date:'2026-01-17',category:'electricity',mode:'create',expenseId:'',ack:false,periodFrom:'2025-12-01',periodTo:'',dueOn:'2026-02-20'}}};
  draft=(await service.saveReview(a,h,draft.id,{expectedVersion:draft.version,review:{forms:{},compilation}},randomUUID())).draft;
  const restored=(await service.getDraft(a,h,draft.id,{})).draft;
  assert.equal(restored.review.compilation.houseForms[draft.houseExpenses[0].id].amount,'12,');assert.equal(restored.review.compilation.houseForms[draft.houseExpenses[0].id].periodTo,'');
  assert.equal(restored.state,'open');assert.equal((await current()).organization,null);await pending();assert.deepEqual(await counts(),{objects:0,expenses:0});
 });
 await t.test('canonical utility classification alone stays pending while the expense draft is open',async()=>{
  const batch=(await intake.prepareExisting(a,h,{documentIds:[source.id]},randomUUID())).batch,item=batch.items[0];
  const payload={expectedVersion:batch.version,mode:'single',items:[{itemId:item.id,expectedVersion:item.version,expectedOrganizationVersion:0,replaceOrganization:false,selection:{action:'organize',title:'Synthetic bill',parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],target:{kind:'home'}}}]};
  const result=await intake.organize(a,h,batch.id,payload,randomUUID());assert.equal(result.results[item.id].state,'confirmed');
  assert.deepEqual((await current()).organization.parts,[{kind:'utility_bill',pageFrom:null,pageTo:null}]);await pending();assert.deepEqual(await counts(),{objects:0,expenses:0});
  confirmation={expectedVersion:draft.version,source:draft.snapshot,choices:[],houseExpenses:[{itemId:draft.houseExpenses[0].id,action:'create',amountSelection:{mode:'manual'},values:{title:'Synthetic bill',category:'electricity',supplier:'Synthetic supplier',amountCents:9321,spentOn:'2026-01-17',documentDate:'2026-01-17',competenceFrom:'2025-12-01',competenceTo:'2025-12-31',dueOn:'2026-02-20',objectRef:null},acknowledgePossibleDuplicate:true}]};key=randomUUID();
 });
 await t.test('invalid amount and mismatched source cannot confirm or change the pending state',async()=>{
  await assert.rejects(service.confirm(a,h,draft.id,{...confirmation,source:{...draft.snapshot,sha256:'b'.repeat(64)}},randomUUID()),code('onboarding_source_changed'));
  const cost=confirmation.houseExpenses[0];await assert.rejects(async()=>service.confirm(a,h,draft.id,{...confirmation,houseExpenses:[{...cost,values:{...cost.values,amountCents:0}}]},randomUUID()),status(422));
  await pending();assert.deepEqual(await counts(),{objects:0,expenses:0});assert.equal((await service.getDraft(a,h,draft.id,{})).draft.state,'open');
 });
 await t.test('another owner and a different home cannot read, prepare or confirm this private source',async()=>{
  await assert.rejects(documents.get(b,h,source.id),status(403));await assert.rejects(service.getDraft(b,h,draft.id,{}),status(403));
  await assert.rejects(intake.prepareExisting(b,h,{documentIds:[source.id]},randomUUID()),status(403));await assert.rejects(service.confirm(b,h,draft.id,confirmation,randomUUID()),status(403));
  await assert.rejects(documents.get(a,otherHome,source.id),status(403));assert(!(await documents.list(b,h,{limit:20})).items.some(x=>x.id===source.id));assert.deepEqual(await counts(),{objects:0,expenses:0});
 });
 await t.test('final confirmation creates exactly one expense with all seven fields and completes the document',async()=>{
  confirmed=await service.confirm(a,h,draft.id,confirmation,key);assert.equal(confirmed.result.newObjects,0);assert.equal(confirmed.result.newExpenses,1);assert.equal(confirmed.draft.state,'confirmed');
  const expenses=await db.homeExpense.findMany({where:{homeId:h,documentId:source.id}});assert.equal(expenses.length,1);
  const e=expenses[0];assert.deepEqual({supplier:e.supplier,amountCents:e.amountCents,category:e.category,documentDate:e.documentDate,competenceFrom:e.competenceFrom,competenceTo:e.competenceTo,dueOn:e.dueOn},{supplier:'Synthetic supplier',amountCents:9321,category:'electricity',documentDate:'2026-01-17',competenceFrom:'2025-12-01',competenceTo:'2025-12-31',dueOn:'2026-02-20'});
  assert.deepEqual(await counts(),{objects:0,expenses:1});assert(!(await listed('pending')).includes(source.id));assert((await listed('completed')).includes(source.id));assert.equal((await current()).workflowState,'completed');assert.equal((await current()).organization.parts[0].kind,'utility_bill');
 });
 await t.test('concurrent same-key replay creates no duplicates and a changed body cannot reuse the key',async()=>{
  const replies=await Promise.all([service.confirm(a,h,draft.id,confirmation,key),service.confirm(a,h,draft.id,confirmation,key)]);for(const result of replies)assert.deepEqual(result,confirmed);
  await assert.rejects(service.confirm(a,h,draft.id,{...confirmation,expectedVersion:confirmation.expectedVersion+1},key),code('idempotency_conflict'));
  assert.deepEqual(await counts(),{objects:0,expenses:1});assert.equal((await current()).workflowState,'completed');
 });
 await t.test('a new open draft returns the document to pending; explicitly saving only the document closes it without another expense',async()=>{
  const next=(await service.manualDraft(a,h,{documentId:source.id},randomUUID())).draft;assert.notEqual(next.id,draft.id);assert.equal(next.documentKind,'utility_bill');await pending();
  const result=await service.confirm(a,h,next.id,{expectedVersion:next.version,source:next.snapshot,choices:[],documentOnly:true},randomUUID());assert.equal(result.draft.state,'confirmed');assert.deepEqual(await counts(),{objects:0,expenses:1});assert.equal((await current()).workflowState,'completed');
 });
 await t.test('sharing the original never shares personal classification or workflow; revoked membership denies access',async()=>{
  await db.document.update({where:{id:source.id},data:{visibility:'home'}});
  const visible=(await documents.get(b,h,source.id)).document;assert.equal(visible.organization,null);assert.equal(visible.workflowState,'to_compile');
  await db.homeMembership.update({where:{accountId_homeId:{accountId:b,homeId:h}},data:{revokedAt:new Date()}});await assert.rejects(documents.get(b,h,source.id),status(403));await assert.rejects(documents.list(b,h,{limit:20}),status(403));
 });
 await t.test('no AI attempt or physical storage operation occurred',async()=>{assert.deepEqual(await ledgers(),beforeLedgers);assert.deepEqual(storageCalls,[]);});
});
