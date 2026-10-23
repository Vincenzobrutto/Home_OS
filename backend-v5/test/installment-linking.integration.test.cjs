// Offline manual-workflow regression. No provider, inferred invoice total or real file is embedded.
global.fetch=async()=>{throw Error('network_forbidden');};
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto');
const {PrismaClient}=require('../generated/client');
const {ReviewService}=require('../dist/review/review.service');
const {HomeObjectsService}=require('../dist/home-objects/home-objects.service');
const {ObjectOnboardingAccess}=require('../dist/object-onboarding/access');
const {ObjectOnboardingService}=require('../dist/object-onboarding/onboarding.service');
const {onboardingCandidates}=require('../dist/object-onboarding/candidates');
const code=expected=>e=>(e.getResponse?.().code??e.code)===expected;
const hash=s=>createHash('sha256').update(s).digest('hex');

test('Acconto/saldo: manual linking, replay, source copies and diagnostic of missing reconciliation',async t=>{
 const rawUrl=process.env.QUALITY_V3_DATABASE_URL,url=new URL(rawUrl??'invalid:');
 assert.equal(url.protocol,'postgresql:');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55433');assert.equal(url.pathname,'/dimora_v5_quality_v3_test');assert.equal(url.username,'quality_test');
 const db=new PrismaClient({datasources:{db:{url:rawUrl}}});await db.$connect();t.after(()=>db.$disconnect());
 const services=client=>{const review=new ReviewService(client,{}),objects=new HomeObjectsService(client,review),access=new ObjectOnboardingAccess(client,review);return {objects,access,svc:new ObjectOnboardingService(access,objects,review,{now:()=>new Date('2026-10-23T12:00:00Z')})};};
 const {svc,objects,access}=services(db);
 const actors=[];for(let i=0;i<2;i++)actors.push(await db.account.create({data:{name:'Offline installment test',email:randomUUID()+'@example.test',passwordHash:'not-login'}}));
 const [a,b]=actors;
 const manifest=process.env.INSTALLMENT_SOURCE_MANIFEST?JSON.parse(require('node:fs').readFileSync(process.env.INSTALLMENT_SOURCE_MANIFEST,'utf8')):null;
 const sources=[{kind:'acconto',date:'2025-07-23',number:'FE25-37',source:manifest?.find(x=>x.id===10)},{kind:'saldo',date:'2025-07-28',number:'FE25-38',source:manifest?.find(x=>x.id===9)}];
 const names=['Climatizzatore Sensira A','Climatizzatore Sensira B','Climatizzatore Stylish']; // Manual labels, not extracted identities/quantities.
 async function home(){const h=await db.home.create({data:{name:'Offline installment scenario',address:'Test'}});for(const actor of actors)await db.homeMembership.create({data:{accountId:actor.id,homeId:h.id,role:'owner'}});return h.id;}
 async function draft(h,s){
  const doc=await db.document.create({data:{homeId:h,uploaderId:a.id,name:'Offline '+s.kind,visibility:'private',original:{create:{originalFilename:'offline.pdf',mimeType:'application/pdf',sha256:s.source?.sha256??hash('offline-'+s.kind),byteSize:s.source?.bytes??1,file:{create:{storageKey:'not-stored-'+randomUUID()}}}}},include:{original:true}});
  let d=(await svc.manualDraft(a.id,h,{documentId:doc.id,documentKind:'purchase_document'},randomUUID())).draft;
  d=(await svc.changeManualKind(a.id,h,d.id,{expectedVersion:d.version,documentKind:'invoice'},randomUUID())).draft;
  for(let i=0;i<3;i++)d=(await svc.addItem(a.id,h,d.id,{expectedVersion:d.version},randomUUID())).draft;
  return {doc,d};
 }
 const counts=async h=>({objects:await db.homeObject.count({where:{homeId:h}}),expenses:await db.homeExpense.count({where:{homeId:h}})});
 const body=(d,choices,houseExpenses)=>({expectedVersion:d.version,source:d.snapshot,choices,...(houseExpenses?{houseExpenses}:{})});
 const create=d=>d.items.map((x,i)=>({itemId:x.id,action:'create',name:names[i],type:'appliance',unitNames:[],roomIds:[],fields:{},manual:null,expense:{action:'skip'},confirmHouseholdObject:true,acknowledgeExistingSource:false}));
 async function links(d,ids){return Promise.all(d.items.map(async(x,i)=>({itemId:x.id,action:'link',targets:[{id:ids[i],expectedVersion:(await db.homeObject.findUniqueOrThrow({where:{id:ids[i]}})).version}],fields:{},manual:null,expense:{action:'skip'}})));}
 const cost=(d,s)=>({itemId:d.houseExpenses[0].id,action:'create',values:{title:s.kind+' climatizzatori',category:'repairs_works',amountCents:210450,spentOn:s.date,documentDate:s.date,documentNumber:s.number,supplier:'Fornitore collaudo'},amountSelection:{mode:'manual'}});
 const pending=d=>[{itemId:d.houseExpenses[0].id,action:'defer'}];
 for(const order of [sources,[...sources].reverse()])await t.test(order.map(s=>s.kind).join(' -> '),async t=>{
  const h=await home(),first=await draft(h,order[0]),second=await draft(h,order[1]);
  await t.test('another owner cannot inspect or confirm private sources',async()=>{
   await assert.rejects(svc.getDraft(b.id,h,first.d.id,{}));await assert.rejects(svc.confirm(b.id,h,first.d.id,body(first.d,create(first.d),pending(first.d)),randomUUID()));assert.deepEqual(await counts(h),{objects:0,expenses:0});
  });
  const firstBody=body(first.d,create(first.d),[cost(first.d,order[0])]),key=randomUUID();
  const initial=await svc.confirm(a.id,h,first.d.id,firstBody,key),ids=initial.draft.items.map(x=>x.decision.objects[0].id);
  await t.test('first document creates three manually declared objects and one document cost; concurrent replay writes nothing',async()=>{
   await Promise.all([svc.confirm(a.id,h,first.d.id,firstBody,key),svc.confirm(a.id,h,first.d.id,firstBody,key)]);assert.deepEqual(await counts(h),{objects:3,expenses:1});
  });
  await t.test('existing objects are selectable for the second document',async()=>{
   for(let i=0;i<3;i++){const result=await onboardingCandidates(access,a.id,h,second.d.id,{itemId:second.d.items[i].id});assert(result.items.some(x=>x.id===ids[i]));}
  });
  const secondBody=body(second.d,await links(second.d,ids),pending(second.d)),secondKey=randomUUID();
  const linked=await svc.confirm(a.id,h,second.d.id,secondBody,secondKey);
  await t.test('explicit link attaches both invoices to each existing object; unresolved balance creates no extra expense',async()=>{
   assert.equal(linked.result.newObjects,0);assert.equal(linked.result.newExpenses,0);assert.equal(linked.draft.state,'open');assert.deepEqual(await counts(h),{objects:3,expenses:1});
   for(const id of ids){const docs=(await objects.links(a.id,h,'object',id,{resourceType:'document'})).items;assert.deepEqual(new Set(docs.map(x=>x.resource.id)),new Set([first.doc.id,second.doc.id]));}
  });
  await t.test('durable replay from a different client and changed-key rejection',async()=>{
   const other=new PrismaClient({datasources:{db:{url:rawUrl}}});try{await services(other).svc.confirm(a.id,h,second.d.id,secondBody,secondKey);}finally{await other.$disconnect();}
   const altered=structuredClone(secondBody);altered.choices[0].action='defer';delete altered.choices[0].targets;delete altered.choices[0].fields;delete altered.choices[0].manual;delete altered.choices[0].expense;
   await assert.rejects(svc.confirm(a.id,h,second.d.id,altered,secondKey),code('idempotency_conflict'));assert.deepEqual(await counts(h),{objects:3,expenses:1});
  });
  for(const s of order)await t.test('same-file reload '+s.kind+' cannot recreate the objects or cost',async()=>{
   const copy=await draft(h,s);await assert.rejects(svc.confirm(a.id,h,copy.d.id,body(copy.d,create(copy.d),pending(copy.d)),randomUUID()),code('onboarding_object_exists'));
   if(s===order[0])await assert.rejects(svc.confirm(a.id,h,copy.d.id,body(copy.d,await links(copy.d,ids),[cost(copy.d,s)]),randomUUID()),code('onboarding_expense_exists'));
   const r=await svc.confirm(a.id,h,copy.d.id,body(copy.d,await links(copy.d,ids),pending(copy.d)),randomUUID());assert.equal(r.result.newObjects,0);assert.deepEqual(await counts(h),{objects:3,expenses:1});
  });
  const current=(await svc.getDraft(a.id,h,second.d.id,{})).draft;
  await t.test('DIAGNOSTIC: reusing the first cost for a different-SHA invoice is rejected',async()=>{
   const e=await db.homeExpense.findFirstOrThrow({where:{homeId:h}}),c={itemId:current.houseExpenses[0].id,action:'link_existing',expenseId:e.id,expectedExpenseVersion:e.version};
   await assert.rejects(svc.confirm(a.id,h,current.id,body(current,[],[c]),randomUUID()),code('expense_document_conflict'));assert.deepEqual(await counts(h),{objects:3,expenses:1});
  });
  await t.test('DIAGNOSTIC: second invoice full amount is accepted as a separate cost; reconciliation requirement NOT MET',async()=>{
   await svc.confirm(a.id,h,current.id,body(current,[],[cost(current,order[1])]),randomUUID());assert.deepEqual(await counts(h),{objects:3,expenses:2});
   const e=await db.homeExpense.aggregate({where:{homeId:h},_sum:{amountCents:true}});assert.equal(e._sum.amountCents,420900); // Observed behavior, NOT an approved total for the real purchase.
  });
  await t.test('both files reloaded after both costs exist cannot create any additional cost',async()=>{
   for(const s of order){const copy=await draft(h,s);await assert.rejects(svc.confirm(a.id,h,copy.d.id,body(copy.d,await links(copy.d,ids),[cost(copy.d,s)]),randomUUID()),code('onboarding_expense_exists'));assert.deepEqual(await counts(h),{objects:3,expenses:2});}
  });
  await t.test('revoked source denies old confirmation replay',async()=>{
   await db.document.update({where:{id:first.doc.id},data:{uploaderId:b.id}});await assert.rejects(svc.confirm(a.id,h,first.d.id,firstBody,key));assert.deepEqual(await counts(h),{objects:3,expenses:2});
  });
 });
 await t.test('DIAGNOSTIC: manual create on a distinct invoice can duplicate the same declared objects',async()=>{
  const h=await home();for(const s of sources){const {d}=await draft(h,s);await svc.confirm(a.id,h,d.id,body(d,create(d),pending(d)),randomUUID());}assert.deepEqual(await counts(h),{objects:6,expenses:0}); // Does not claim automatic creation would pass.
 });
});
