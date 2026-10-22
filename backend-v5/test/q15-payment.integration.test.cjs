// Fresh isolated synthetic DB only. No app DB, original storage or provider access.
global.fetch=async()=>{throw Error('network_forbidden');};
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client');
const {ReviewService}=require('../dist/review/review.service');
const {HomeObjectsService}=require('../dist/home-objects/home-objects.service');
const {ObjectOnboardingAccess}=require('../dist/object-onboarding/access');
const {ObjectOnboardingService}=require('../dist/object-onboarding/onboarding.service');
const {onboardingExpenseCandidates}=require('../dist/object-onboarding/candidates');
const {productExtraction}=require('../dist/object-onboarding/domain');
const {q15}=require('./q15-fixture.cjs');
const code=expected=>e=>(e.getResponse?.().code??e.code)===expected;
test('Q15 source guard, manual confirmation, privacy and durable idempotency',async t=>{
 const rawUrl=process.env.QUALITY_V3_DATABASE_URL,url=new URL(rawUrl??'invalid:');
 assert.equal(url.protocol,'postgresql:');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55433');assert.equal(url.pathname,'/dimora_v5_quality_v3_test');assert.equal(url.username,'quality_test');
 const db=new PrismaClient({datasources:{db:{url:rawUrl}}});await db.$connect();t.after(()=>db.$disconnect());
 const service=client=>{const review=new ReviewService(client,{});return new ObjectOnboardingService(new ObjectOnboardingAccess(client,review),new HomeObjectsService(client,review),review,{now:()=>new Date('2026-10-23T12:00:00Z')});};
 const svc=service(db),account=()=>db.account.create({data:{name:'SYNTHETIC Q15',email:randomUUID()+'@example.test',passwordHash:'not-login',emailVerifiedAt:new Date()}});
 const a=await account(),b=await account(),outsider=await account(),home=await db.home.create({data:{name:'SYNTHETIC Q15 only',address:'Via Test'}}),h=home.id;
 for(const actor of [a,b])await db.homeMembership.create({data:{accountId:actor.id,homeId:h,role:'owner'}});
 const f=await q15();
 async function draft(mutate){
  const doc=await db.document.create({data:{homeId:h,uploaderId:a.id,name:'SYNTHETIC Q15',visibility:'private',original:{create:{originalFilename:'Q15.pdf',mimeType:'application/pdf',sha256:f.original.sha256,byteSize:f.original.bytes.length,file:{create:{storageKey:'synthetic-q15-'+randomUUID()}}}}},include:{original:true}});
  const output=productExtraction(f.raw,{...f.context,snapshot:{...f.context.snapshot,documentId:doc.id}});mutate?.(output);
  const row=await db.objectOnboardingDraft.create({data:{accountId:a.id,homeId:h,documentId:doc.id,documentVersion:1,documentSha256:f.original.sha256,mode:'extraction',output}});
  const view=(await svc.getDraft(a.id,h,row.id,{})).draft,item=view.houseExpenses[0];
  const body={expectedVersion:view.version,source:view.snapshot,choices:[],houseExpenses:[{itemId:item.id,action:'create',values:{title:item.proposedFields.title.value,category:'maintenance',supplier:'Voltacervo Collaudo',amountCents:24400,spentOn:'2026-09-18',documentDate:'2026-09-18'},amountSelection:{mode:'candidate',candidateId:item.amountCandidates[0].id},acknowledgePossibleDuplicate:true}],contacts:[{proposalId:view.contacts[0].id,action:'save'}]};
  return{doc,row,view,body};
 }
 const counts=async()=>({expenses:await db.homeExpense.count({where:{homeId:h}}),contacts:await db.homeContact.count({where:{homeId:h}}),objects:await db.homeObject.count({where:{homeId:h}})});
 const zero={expenses:0,contacts:0,objects:0},first=await draft(),key=randomUUID();
 await t.test('other owner and outsider cannot read source, candidates, flags or confirm',async()=>{
  for(const actor of [b,outsider]){await assert.rejects(svc.getDraft(actor.id,h,first.row.id,{}));await assert.rejects(onboardingExpenseCandidates(svc.access,actor.id,h,first.row.id,{itemId:first.view.houseExpenses[0].id}));await assert.rejects(svc.confirm(actor.id,h,first.row.id,first.body,randomUUID()));}assert.deepEqual(await counts(),zero);
 });
 await t.test('repeated automatic confirmation and contact-only bypass create no resources or successful receipt',async()=>{
  for(const body of [first.body,first.body,{...first.body,houseExpenses:[]}]){
   const attempted=randomUUID();await assert.rejects(svc.confirm(a.id,h,first.row.id,body,attempted,true),code('onboarding_payment_review'));assert.equal(await db.objectOnboardingRequest.count({where:{accountId:a.id,key:attempted}}),0);
  }assert.deepEqual(await counts(),zero);
 });
 await t.test('cached omitted, outdated or mismatched source check fails closed even with model review false',async()=>{
  for(const mutate of [o=>{delete o.paymentReview;},o=>o.paymentReview.policy='old',o=>o.paymentReview.documentSha256='f'.repeat(64),o=>o.paymentReview.documentId=randomUUID(),o=>o.paymentReview.documentVersion=2]){
   const stale=await draft(o=>{o.needsReview=false;o.paymentReview.reason=null;mutate(o);});await assert.rejects(svc.confirm(a.id,h,stale.row.id,stale.body,randomUUID(),true),code('onboarding_payment_review'));
  }assert.deepEqual(await counts(),zero);
 });
 await t.test('taxable 200 EUR cannot borrow the 244 EUR current-total candidate; rollback includes contacts',async()=>{
  const changed=structuredClone(first.body);changed.houseExpenses[0].values.amountCents=20000;
  const attempted=randomUUID();await assert.rejects(svc.confirm(a.id,h,first.row.id,changed,attempted));assert.deepEqual(await counts(),zero);assert.equal(await db.objectOnboardingRequest.count({where:{accountId:a.id,key:attempted}}),0);
 });
 await t.test('explicit concurrent manual confirmation creates exactly one 244 EUR expense and one opted-in contact',async()=>{
  const results=await Promise.all([svc.confirm(a.id,h,first.row.id,first.body,key),svc.confirm(a.id,h,first.row.id,first.body,key)]);
  assert(results.every(r=>r.result.newExpenses===1&&r.result.newContacts===1));assert.deepEqual(await counts(),{expenses:1,contacts:1,objects:0});
  const expense=await db.homeExpense.findFirstOrThrow({where:{homeId:h}});assert.equal(expense.amountCents,24400);assert.equal(expense.supplier,'Voltacervo Collaudo');assert.equal(expense.documentId,first.doc.id);assert.equal(expense.economicProvenance.amountCents.sources[0].sha256,f.original.sha256);
  assert.equal(await db.objectOnboardingRequest.count({where:{accountId:a.id,key}}),1);
 });
 await t.test('durable replay from another DB client, changed payload and new keys never duplicate',async()=>{
  const other=new PrismaClient({datasources:{db:{url:rawUrl}}});try{const result=await service(other).confirm(a.id,h,first.row.id,first.body,key);assert.equal(result.result.newExpenses,1);assert.equal(result.result.newContacts,1);}finally{await other.$disconnect();}
  const changed=structuredClone(first.body);changed.houseExpenses[0].values.amountCents=20000;await assert.rejects(svc.confirm(a.id,h,first.row.id,changed,key),code('idempotency_conflict'));await assert.rejects(svc.confirm(a.id,h,first.row.id,first.body,randomUUID()));assert.deepEqual(await counts(),{expenses:1,contacts:1,objects:0});
 });
 await t.test('revoked private source redacts metadata and blocks replay; restored source keeps one expense',async()=>{
  await db.document.update({where:{id:first.doc.id},data:{uploaderId:b.id}});const redacted=(await svc.getDraft(a.id,h,first.row.id,{})).draft;
  assert.equal(redacted.snapshot,null);assert.equal(redacted.state,'unavailable');assert(!redacted.houseExpenses?.length);assert(!redacted.contacts?.length);assert(!JSON.stringify(redacted).includes('Voltacervo'));assert(!redacted.paymentReview);
  await assert.rejects(svc.confirm(a.id,h,first.row.id,first.body,key));await db.document.update({where:{id:first.doc.id},data:{uploaderId:a.id}});
 });
 await t.test('SHA, version, viewer and removed membership block writes and persisted replay',async()=>{
  for(const change of [{sha256:'e'.repeat(64)},{version:2}]){await db.documentVersion.update({where:{id:first.doc.original.id},data:change});await assert.rejects(svc.confirm(a.id,h,first.row.id,first.body,key));await db.documentVersion.update({where:{id:first.doc.original.id},data:{sha256:f.original.sha256,version:1}});}
  await db.homeMembership.updateMany({where:{accountId:a.id,homeId:h},data:{role:'viewer'}});await assert.rejects(svc.confirm(a.id,h,first.row.id,first.body,key));
  // No deletion even in the test: moving the membership tests absence from this home.
  const other=await db.home.create({data:{name:'SYNTHETIC membership target',address:'Via Test'}});await db.homeMembership.updateMany({where:{accountId:a.id,homeId:h},data:{homeId:other.id}});await assert.rejects(svc.confirm(a.id,h,first.row.id,first.body,key));assert.deepEqual(await counts(),{expenses:1,contacts:1,objects:0});
 });
});
