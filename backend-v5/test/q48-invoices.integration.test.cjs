// Isolated synthetic DB only; never uses the app connection or provider network.
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
const {q48}=require('./q48-fixture.cjs');
const code=expected=>e=>(e.getResponse?.().code??e.code)===expected;
test('Q48 separate invoice confirmation, privacy, transaction rollback and durable idempotency',async t=>{
 const rawUrl=process.env.QUALITY_V3_DATABASE_URL,url=new URL(rawUrl??'invalid:');
 assert.equal(url.protocol,'postgresql:');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55433');assert.equal(url.pathname,'/dimora_v5_quality_v3_test');assert.equal(url.username,'quality_test');
 const db=new PrismaClient({datasources:{db:{url:rawUrl}}});await db.$connect();t.after(()=>db.$disconnect());
 const review=new ReviewService(db,{}),access=new ObjectOnboardingAccess(db,review),clock={now:()=>new Date('2026-10-22T12:00:00Z')};
 const service=()=>new ObjectOnboardingService(access,new HomeObjectsService(db,review),review,clock);
 const account=async()=>db.account.create({data:{name:'SYNTHETIC Q48',email:randomUUID()+'@example.test',passwordHash:'not-login',emailVerifiedAt:new Date()}});
 const a=await account(),b=await account(),outsider=await account(),home=await db.home.create({data:{name:'SYNTHETIC Q48 only',address:'Via Test'}}),h=home.id;
 for(const x of [a,b])await db.homeMembership.create({data:{accountId:x.id,homeId:h,role:'owner'}});
 async function draft(mutate){const f=q48();mutate?.(f);const doc=await db.document.create({data:{homeId:h,uploaderId:a.id,name:'SYNTHETIC Q48 invoices',visibility:'private',original:{create:{originalFilename:'Q48.pdf',mimeType:'application/pdf',sha256:f.original.sha256,byteSize:f.original.bytes.length,file:{create:{storageKey:'synthetic-q48-'+randomUUID()}}}}},include:{original:true}});f.context.snapshot={...f.snapshot,documentId:doc.id};const output=productExtraction(f.raw,f.context),row=await db.objectOnboardingDraft.create({data:{accountId:a.id,homeId:h,documentId:doc.id,documentVersion:1,documentSha256:f.original.sha256,mode:'extraction',output}});return{doc,row,view:(await service().getDraft(a.id,h,row.id,{})).draft};}
 const counts=()=>db.homeExpense.count({where:{homeId:h}});
 function choice(item){return{itemId:item.id,action:'create',values:{title:item.proposedFields.title.value,amountCents:item.amountCandidates[0].amountCents,spentOn:item.proposedFields.documentDate.value,documentDate:item.proposedFields.documentDate.value,documentNumber:item.proposedFields.documentNumber.value,supplier:item.proposedFields.supplier.value,category:'repairs_works'},amountSelection:{mode:'candidate',candidateId:item.amountCandidates[0].id},acknowledgePossibleDuplicate:true};}
 const body=(d,choices=d.houseExpenses.map(choice))=>({expectedVersion:d.version,source:d.snapshot,choices:[],houseExpenses:choices});
 const first=await draft(),initial=body(first.view),key=randomUUID();
 await t.test('only source owner can see invoice metadata, candidates or confirm',async()=>{
  assert.equal(first.view.houseExpenses.length,2);assert.notEqual(first.view.houseExpenses[0].id,first.view.houseExpenses[1].id);
  for(const actor of [b,outsider]){await assert.rejects(service().getDraft(actor.id,h,first.row.id,{}));await assert.rejects(onboardingExpenseCandidates(access,actor.id,h,first.row.id,{itemId:first.view.houseExpenses[0].id}));await assert.rejects(service().confirm(actor.id,h,first.row.id,initial,randomUUID()));}assert.equal(await counts(),0);
 });
 await t.test('automatic mode cannot bypass required per-invoice review',async()=>{await assert.rejects(service().confirm(a.id,h,first.row.id,initial,randomUUID(),true),code('onboarding_multiple_invoices_review'));assert.equal(await counts(),0);});
 await t.test('sum, cross-invoice values, manual amounts and changed anchors cannot be confirmed',async()=>{
  for(const mutate of [c=>c.values.amountCents=36600,c=>c.values.supplier='Termonimbo Collaudo',c=>c.values.documentNumber='Q48-B',c=>c.values.documentDate='2026-09-19',c=>c.amountSelection={mode:'manual'}]){const c=choice(first.view.houseExpenses[0]);mutate(c);await assert.rejects(service().confirm(a.id,h,first.row.id,body(first.view,[c]),randomUUID()));}assert.equal(await counts(),0);
 });
 await t.test('failure in second invoice rolls back first expense and request atomically',async()=>{const choices=first.view.houseExpenses.map(choice);choices[1].values.amountCents=36600;const failedKey=randomUUID();await assert.rejects(service().confirm(a.id,h,first.row.id,body(first.view,choices),failedKey));assert.equal(await counts(),0);assert.equal(await db.objectOnboardingRequest.count({where:{accountId:a.id,key:failedKey}}),0);});
 await t.test('concurrent identical confirmation makes exactly two separate expenses and one request',async()=>{
  const results=await Promise.all([service().confirm(a.id,h,first.row.id,initial,key),service().confirm(a.id,h,first.row.id,initial,key)]);assert(results.every(r=>r.result.newExpenses===2));assert.equal(await counts(),2);
  const expenses=await db.homeExpense.findMany({where:{homeId:h},orderBy:{amountCents:'asc'}});assert.deepEqual(expenses.map(e=>[e.amountCents,e.supplier,e.documentDate]),[[12200,'Idroquarzo Collaudo','2026-09-18'],[24400,'Termonimbo Collaudo','2026-09-19']]);assert(expenses.every(e=>e.documentId===first.doc.id));assert.notEqual(expenses[0].economicProvenance._invoiceSegment.key,expenses[1].economicProvenance._invoiceSegment.key);
  expenses.forEach((e,i)=>assert.equal(e.economicProvenance.amountCents.sources[0].page,i+1));assert.equal(await db.homeObject.count({where:{homeId:h}}),0);assert.equal(await db.homeContact.count({where:{homeId:h}}),0);
 });
 await t.test('replay from another DB client is read-only; new keys and changed payload cannot duplicate',async()=>{
  const other=new PrismaClient({datasources:{db:{url:rawUrl}}});try{const r=new ReviewService(other,{}),svc=new ObjectOnboardingService(new ObjectOnboardingAccess(other,r),new HomeObjectsService(other,r),r,clock);const replay=await svc.confirm(a.id,h,first.row.id,initial,key);assert.equal(replay.result.newExpenses,2);}finally{await other.$disconnect();}
  await assert.rejects(service().confirm(a.id,h,first.row.id,initial,randomUUID()));const changed=structuredClone(initial);changed.houseExpenses[0].action='defer';delete changed.houseExpenses[0].values;delete changed.houseExpenses[0].amountSelection;delete changed.houseExpenses[0].acknowledgePossibleDuplicate;await assert.rejects(service().confirm(a.id,h,first.row.id,changed,key),code('idempotency_conflict'));assert.equal(await counts(),2);
 });
 await t.test('same-SHA copy cannot create invoices again or link invoice one to expense two',async()=>{
  const abbreviated=await draft(f=>{f.raw.houseExpenses[0].fields.supplier.value='Idroquarzo';f.raw.houseExpenses[0].fields.documentNumber.value='Q48';});await assert.rejects(service().confirm(a.id,h,abbreviated.row.id,body(abbreviated.view),randomUUID()),code('onboarding_expense_exists'));
  const copy=await draft();await assert.rejects(service().confirm(a.id,h,copy.row.id,body(copy.view),randomUUID()),code('onboarding_expense_exists'));assert.equal(await counts(),2);
  const expenses=await db.homeExpense.findMany({where:{homeId:h},orderBy:{amountCents:'asc'}});const link=(item,e)=>({itemId:item.id,action:'link_existing',expenseId:e.id,expectedExpenseVersion:e.version});await assert.rejects(service().confirm(a.id,h,copy.row.id,body(copy.view,[link(copy.view.houseExpenses[0],expenses[1])]),randomUUID()),code('onboarding_invoice_segment_conflict'));
  const linked=await service().confirm(a.id,h,copy.row.id,body(copy.view,copy.view.houseExpenses.map((item,i)=>link(item,expenses[i]))),randomUUID());assert.equal(linked.result.newExpenses,0);assert.equal(await counts(),2);
 });
 await t.test('partial confirmation and defer preserve the other invoice without merging',async()=>{
  const partial=await draft(),expenses=await db.homeExpense.findMany({where:{homeId:h},orderBy:{amountCents:'asc'}}),item=partial.view.houseExpenses[0];const one=await service().confirm(a.id,h,partial.row.id,body(partial.view,[{itemId:item.id,action:'link_existing',expenseId:expenses[0].id,expectedExpenseVersion:expenses[0].version},{itemId:partial.view.houseExpenses[1].id,action:'defer'}]),randomUUID());assert.equal(one.draft.state,'open');assert.equal(one.draft.houseExpenses[1].decision.state,'deferred');assert.equal(await counts(),2);
 });
 await t.test('source revocation redacts both invoices and blocks confirmation replay',async()=>{
  await db.document.update({where:{id:first.doc.id},data:{uploaderId:b.id}});const redacted=(await service().getDraft(a.id,h,first.row.id,{})).draft;assert.equal(redacted.snapshot,null);assert(!redacted.houseExpenses?.length);assert(!JSON.stringify(redacted).includes('Idroquarzo'));await assert.rejects(service().confirm(a.id,h,first.row.id,initial,key));assert.equal(await counts(),2);await db.document.update({where:{id:first.doc.id},data:{uploaderId:a.id}});
 });
 await t.test('version/SHA change and viewer role block writes including replay',async()=>{
  await db.documentVersion.update({where:{id:first.doc.original.id},data:{sha256:'f'.repeat(64)}});await assert.rejects(service().confirm(a.id,h,first.row.id,initial,key));await db.documentVersion.update({where:{id:first.doc.original.id},data:{sha256:first.doc.original.sha256}});
  await db.homeMembership.updateMany({where:{accountId:a.id,homeId:h},data:{role:'viewer'}});await assert.rejects(service().confirm(a.id,h,first.row.id,initial,key));await db.homeMembership.updateMany({where:{accountId:a.id,homeId:h},data:{role:'owner'}});assert.equal(await counts(),2);
 });
});
