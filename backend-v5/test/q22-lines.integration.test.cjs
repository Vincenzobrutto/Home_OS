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
const {automaticPlan}=require('../dist/object-onboarding/automatic-plan');
const {q22}=require('./q22-fixture.cjs');
const code=expected=>e=>(e.getResponse?.().code??e.code)===expected;
test('Q22 independent row costs: canonical binding, privacy, rollback and durable idempotency',async t=>{
 const rawUrl=process.env.QUALITY_V3_DATABASE_URL,url=new URL(rawUrl??'invalid:');
 assert.equal(url.protocol,'postgresql:');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55433');assert.equal(url.pathname,'/dimora_v5_quality_v3_test');assert.equal(url.username,'quality_test');
 const db=new PrismaClient({datasources:{db:{url:rawUrl}}});await db.$connect();t.after(()=>db.$disconnect());
 const service=client=>{const review=new ReviewService(client,{});return new ObjectOnboardingService(new ObjectOnboardingAccess(client,review),new HomeObjectsService(client,review),review,{now:()=>new Date('2026-10-23T12:00:00Z')});};
 const svc=service(db),account=()=>db.account.create({data:{name:'SYNTHETIC Q22',email:randomUUID()+'@example.test',passwordHash:'not-login',emailVerifiedAt:new Date()}});
 const a=await account(),b=await account(),outsider=await account();
 async function home(){const row=await db.home.create({data:{name:'SYNTHETIC Q22 only',address:'Via Test'}});for(const actor of [a,b])await db.homeMembership.create({data:{accountId:actor.id,homeId:row.id,role:'owner'}});return row.id;}
 const h=await home(),h2=await home(),f=await q22();
 async function draft(homeId=h,mutate){
  const doc=await db.document.create({data:{homeId,uploaderId:a.id,name:'SYNTHETIC Q22',visibility:'private',original:{create:{originalFilename:'Q22.pdf',mimeType:'application/pdf',sha256:f.original.sha256,byteSize:f.original.bytes.length,file:{create:{storageKey:'synthetic-q22-'+randomUUID()}}}}},include:{original:true}});
  const raw=structuredClone(f.raw);mutate?.(raw);const output=productExtraction(raw,{...f.context,snapshot:{...f.context.snapshot,documentId:doc.id}});
  const row=await db.objectOnboardingDraft.create({data:{accountId:a.id,homeId,documentId:doc.id,documentVersion:1,documentSha256:f.original.sha256,mode:'extraction',output}}),view=(await svc.getDraft(a.id,homeId,row.id,{})).draft;
  return{doc,row,view,output,body:{expectedVersion:view.version,source:view.snapshot,...automaticPlan(output)}};
 }
 const counts=async homeId=>({expenses:await db.homeExpense.count({where:{homeId}}),objects:await db.homeObject.count({where:{homeId}}),contacts:await db.homeContact.count({where:{homeId}})});
 const first=await draft(),key=randomUUID(),zero={expenses:0,objects:0,contacts:0};
 await t.test('private row amounts, common date, metadata and candidates remain hidden from another owner and outsider',async()=>{
  for(const actor of [b,outsider]){await assert.rejects(svc.getDraft(actor.id,h,first.row.id,{}));await assert.rejects(onboardingExpenseCandidates(svc.access,actor.id,h,first.row.id,{itemId:first.view.items[0].id}));await assert.rejects(svc.confirm(actor.id,h,first.row.id,first.body,randomUUID(),true));}assert.deepEqual(await counts(h),zero);
 });
 await t.test('wrong second-row amount or date rolls back first object, expense and receipt atomically',async()=>{
  for(const mutate of [c=>c.expense.amountCents=40000,c=>c.expense.spentOn='2026-09-19']){const body=structuredClone(first.body),attempt=randomUUID();mutate(body.choices[1]);await assert.rejects(svc.confirm(a.id,h,first.row.id,body,attempt,true),code('onboarding_item_cost_review'));assert.deepEqual(await counts(h),zero);assert.equal(await db.objectOnboardingRequest.count({where:{accountId:a.id,key:attempt}}),0);}
 });
 await t.test('concurrent automatic confirmation creates exactly two objects and the two printed costs/dates',async()=>{
  const results=await Promise.all([svc.confirm(a.id,h,first.row.id,first.body,key,true),svc.confirm(a.id,h,first.row.id,first.body,key,true)]);assert(results.every(r=>r.result.newObjects===2&&r.result.newExpenses===2));assert.deepEqual(await counts(h),{objects:2,expenses:2,contacts:0});
  const costs=await db.homeExpense.findMany({where:{homeId:h},orderBy:{amountCents:'asc'}});assert.deepEqual(costs.map(e=>[e.amountCents,e.spentOn,e.supplier]),[[30000,'2026-09-18',null],[50000,'2026-09-18',null]]);assert.notEqual(costs[0].economicProvenance._invoiceLine.key,costs[1].economicProvenance._invoiceLine.key);
  for(const e of costs){assert.equal(e.documentId,first.doc.id);assert.equal(e.amountOrigin,'extraction_confirmed');assert.equal(e.economicProvenance.amountCents.sources[0].sha256,f.original.sha256);assert.match(e.economicProvenance.spentOn.sources[0].excerpt,/Data acquisto/u);const link=await db.objectResourceLink.findFirstOrThrow({where:{expenseId:e.id,state:'active'}}),object=await db.homeObject.findUniqueOrThrow({where:{id:link.objectId}});assert.equal(object.profile.purchaseDate.value,'2026-09-18');assert(e.amountCents===30000?object.name.startsWith('Forno'):object.name.startsWith('Frigorifero'));}
 });
 await t.test('replay from a different DB client is durable; changed body and new key cannot create more resources',async()=>{
  const other=new PrismaClient({datasources:{db:{url:rawUrl}}});try{const replay=await service(other).confirm(a.id,h,first.row.id,first.body,key,true);assert.equal(replay.result.newExpenses,2);}finally{await other.$disconnect();}
  const changed=structuredClone(first.body);changed.choices[0].expense.amountCents=40000;await assert.rejects(svc.confirm(a.id,h,first.row.id,changed,key,true),code('idempotency_conflict'));await assert.rejects(svc.confirm(a.id,h,first.row.id,first.body,randomUUID(),true));assert.deepEqual(await counts(h),{objects:2,expenses:2,contacts:0});
 });
 let partial;
 await t.test('one row can be confirmed manually while the other stays pending, without any division',async()=>{
  partial=await draft(h2);const body={...partial.body,choices:[partial.body.choices[0],{itemId:partial.view.items[1].id,action:'defer'}]},result=await svc.confirm(a.id,h2,partial.row.id,body,randomUUID());assert.equal(result.draft.state,'open');assert.equal(result.result.newExpenses,1);assert.deepEqual(await counts(h2),{objects:1,expenses:1,contacts:0});
 });
 await t.test('same-SHA copy with an abbreviated name cannot duplicate the first row while total headroom remains',async()=>{
  const copy=await draft(h2,raw=>raw.items[0].fields.name.value='Forno Nubeo'),body={...copy.body,choices:[{...copy.body.choices[0],acknowledgeExistingSource:true}]};
  assert.equal(copy.output.items[0].invoiceLine.key,partial.output.items[0].invoiceLine.key);await assert.rejects(svc.confirm(a.id,h2,copy.row.id,body,randomUUID()),code('onboarding_expense_exists'));assert.deepEqual(await counts(h2),{objects:1,expenses:1,contacts:0});
  const view=(await svc.getDraft(a.id,h2,partial.row.id,{})).draft,body2={expectedVersion:view.version,source:view.snapshot,choices:[{...partial.body.choices[1],acknowledgeExistingSource:true}]};await svc.confirm(a.id,h2,partial.row.id,body2,randomUUID());assert.deepEqual(await counts(h2),{objects:2,expenses:2,contacts:0});
 });
 await t.test('linking the other row expense fails, linking the exact row to its existing object creates nothing',async()=>{
  const copy=await draft(),costs=await db.homeExpense.findMany({where:{homeId:h},orderBy:{amountCents:'asc'}}),link=await db.objectResourceLink.findFirstOrThrow({where:{expenseId:costs[0].id,state:'active'}}),object=await db.homeObject.findUniqueOrThrow({where:{id:link.objectId}});
  const body=expense=>({expectedVersion:copy.view.version,source:copy.view.snapshot,choices:[{itemId:copy.view.items[0].id,action:'link',targets:[{id:object.id,expectedVersion:object.version}],fields:{},manual:null,expense:{action:'link',id:expense.id,expectedVersion:expense.version}}]});
  await assert.rejects(svc.confirm(a.id,h,copy.row.id,body(costs[1]),randomUUID()),code('onboarding_invoice_line_conflict'));const result=await svc.confirm(a.id,h,copy.row.id,body(costs[0]),randomUUID());assert.equal(result.result.newExpenses,0);assert.equal(result.result.newObjects,0);assert.deepEqual(await counts(h),{objects:2,expenses:2,contacts:0});
 });
 await t.test('source revocation redacts row data and denies saved replay, SHA/version changes also deny',async()=>{
  await db.document.update({where:{id:first.doc.id},data:{uploaderId:b.id}});const view=(await svc.getDraft(a.id,h,first.row.id,{})).draft;assert.equal(view.snapshot,null);assert.deepEqual(view.items,[]);assert(!JSON.stringify(view).includes('Nubeo'));await assert.rejects(svc.confirm(a.id,h,first.row.id,first.body,key,true));await db.document.update({where:{id:first.doc.id},data:{uploaderId:a.id}});
  for(const change of [{sha256:'e'.repeat(64)},{version:2}]){await db.documentVersion.update({where:{id:first.doc.original.id},data:change});await assert.rejects(svc.confirm(a.id,h,first.row.id,first.body,key,true));await db.documentVersion.update({where:{id:first.doc.original.id},data:{sha256:f.original.sha256,version:1}});}
 });
 await t.test('viewer and lost membership block writes including replay; no cross-home resources or contacts',async()=>{
  await db.homeMembership.updateMany({where:{accountId:a.id,homeId:h},data:{role:'viewer'}});await assert.rejects(svc.confirm(a.id,h,first.row.id,first.body,key,true));const elsewhere=await db.home.create({data:{name:'SYNTHETIC membership target',address:'Via Test'}});await db.homeMembership.updateMany({where:{accountId:a.id,homeId:h},data:{homeId:elsewhere.id}});await assert.rejects(svc.confirm(a.id,h,first.row.id,first.body,key,true));assert.deepEqual(await counts(h),{objects:2,expenses:2,contacts:0});assert.deepEqual(await counts(elsewhere.id),zero);
 });
});
