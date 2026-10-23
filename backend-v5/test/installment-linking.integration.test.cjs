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

test('Acconto/saldo: manual purchase reconciliation, replay, source copies and privacy',async t=>{
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
 const cost=(d,s)=>({itemId:d.houseExpenses[0].id,action:'create',values:{title:s.kind+' climatizzatori',category:'repairs_works',amountCents:210450,spentOn:s.date,documentDate:s.date,documentNumber:s.number,supplier:'Fornitore collaudo'},amountSelection:{mode:'manual'},purchaseReview:{mode:'confirmed_total',confirmedTotalCents:210450}});
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
  const houseForm={candidateId:'',amount:'',manual:true,title:order[1].kind+' climatizzatori',supplier:'',date:'',category:'',mode:'defer',expenseId:'',ack:false,periodFrom:'',periodTo:'',dueOn:'',purchaseMode:'',purchaseTotal:''};
  const compilation={saved:true,documentTitle:'Fattura '+order[1].kind,documentKind:'invoice',replaceOrganization:false,reuseCopy:false,documentOnly:false,manualTotal:'',contacts:[],houseForms:{[second.d.houseExpenses[0].id]:houseForm}};
  second.d=(await svc.saveReview(a.id,h,second.d.id,{expectedVersion:second.d.version,review:{compilation,forms:{},pending:{path:'/drafts/'+second.d.id+'/confirmations',key:randomUUID(),body:{}}}},randomUUID())).draft;
  const secondBody=body(second.d,await links(second.d,ids),pending(second.d)),secondKey=randomUUID();
  const linked=await svc.confirm(a.id,h,second.d.id,secondBody,secondKey);
  await t.test('explicit link attaches both invoices to each existing object; unresolved balance creates no extra expense',async()=>{
   assert.equal(linked.result.newObjects,0);assert.equal(linked.result.newExpenses,0);assert.equal(linked.draft.state,'open');assert.deepEqual(await counts(h),{objects:3,expenses:1});
   for(const id of ids){const docs=(await objects.links(a.id,h,'object',id,{resourceType:'document'})).items;assert.deepEqual(new Set(docs.map(x=>x.resource.id)),new Set([first.doc.id,second.doc.id]));}
  });
  await t.test('partial compilation reopens durably with deferred cost and invoice label, without stale pending',async()=>{
   const reopened=(await svc.getDraft(a.id,h,second.d.id,{})).draft;
   assert.deepEqual(reopened.review.compilation.houseForms,compilation.houseForms);assert.equal(reopened.review.pending,undefined);assert.deepEqual(reopened.review.forms,{});
   await assert.rejects(svc.getDraft(b.id,h,second.d.id,{}));assert.deepEqual(await counts(h),{objects:3,expenses:1});
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
  await t.test('a second total, including an acknowledged duplicate, is blocked pending purchase review',async()=>{
   const attempt=cost(current,order[1]);attempt.acknowledgePossibleDuplicate=true;
   await assert.rejects(svc.confirm(a.id,h,current.id,body(current,[],[attempt]),randomUUID()),code('onboarding_purchase_review'));assert.deepEqual(await counts(h),{objects:3,expenses:1});
  });
  let reviewedBody,reviewedKey;
  await t.test('explicit human total is not inferred from invoice amounts; one cost even concurrently',async()=>{
   const e=await db.homeExpense.findFirstOrThrow({where:{homeId:h}});
   const c={itemId:current.houseExpenses[0].id,action:'link_existing',expenseId:e.id,expectedExpenseVersion:e.version,purchaseReview:{mode:'same_purchase',confirmedTotalCents:199900}};
   reviewedBody=body(current,[],[c]);reviewedKey=randomUUID();
   const results=await Promise.all([svc.confirm(a.id,h,current.id,reviewedBody,reviewedKey),svc.confirm(a.id,h,current.id,reviewedBody,reviewedKey)]);
   assert(results.every(x=>x.result.newExpenses===0));assert.deepEqual(await counts(h),{objects:3,expenses:1});
   const saved=await db.homeExpense.findUniqueOrThrow({where:{id:e.id}});assert.equal(saved.amountCents,199900);assert.equal(saved.amountOrigin,'user_declared');assert.equal(saved.economicProvenance._purchaseReview.sources.length,2);assert.equal(saved.version,e.version+1);assert.equal(saved.economicProvenance.amountCents.origin,'user_declared');assert.deepEqual(saved.economicProvenance.amountCents.sources,[]);
   const other=new PrismaClient({datasources:{db:{url:rawUrl}}});try{await services(other).svc.confirm(a.id,h,current.id,reviewedBody,reviewedKey);}finally{await other.$disconnect();}assert.equal(await db.expenseHistory.count({where:{expenseId:e.id,kind:'updated'}}),1);
  });
  await t.test('both files reloaded after reconciliation cannot create any additional cost',async()=>{
   for(const s of order){const copy=await draft(h,s);await assert.rejects(svc.confirm(a.id,h,copy.d.id,body(copy.d,await links(copy.d,ids),[cost(copy.d,s)]),randomUUID()),code('onboarding_expense_exists'));assert.deepEqual(await counts(h),{objects:3,expenses:1});}
  });
  await t.test('source SHA/version, viewer and missing amount deny reconciliation replay/writes',async()=>{
   for(const change of [{sha256:'e'.repeat(64)},{version:2}]){await db.documentVersion.update({where:{id:first.doc.original.id},data:change});await assert.rejects(svc.confirm(a.id,h,current.id,reviewedBody,reviewedKey));await db.documentVersion.update({where:{id:first.doc.original.id},data:{sha256:first.doc.original.sha256,version:1}});}
   await db.homeMembership.updateMany({where:{accountId:a.id,homeId:h},data:{role:'viewer'}});await assert.rejects(svc.confirm(a.id,h,current.id,reviewedBody,reviewedKey));await db.homeMembership.updateMany({where:{accountId:a.id,homeId:h},data:{role:'owner'}});
   const missing=structuredClone(reviewedBody);delete missing.houseExpenses[0].purchaseReview.confirmedTotalCents;await assert.rejects(async()=>svc.confirm(a.id,h,current.id,missing,randomUUID()));assert.deepEqual(await counts(h),{objects:3,expenses:1});
  });
  await t.test('primary source revocation denies reconciliation replay from the second document',async()=>{
   await db.document.update({where:{id:first.doc.id},data:{uploaderId:b.id}});await assert.rejects(svc.confirm(a.id,h,current.id,reviewedBody,reviewedKey));await db.document.update({where:{id:first.doc.id},data:{uploaderId:a.id}});
  });
  await t.test('revoked source denies old confirmation replay',async()=>{
   await db.document.update({where:{id:first.doc.id},data:{uploaderId:b.id}});await assert.rejects(svc.confirm(a.id,h,first.d.id,firstBody,key));assert.deepEqual(await counts(h),{objects:3,expenses:1});
  });
 });
 await t.test('new invoice cannot create duplicate named objects: transaction rolls back',async()=>{
  const h=await home(),first=await draft(h,sources[0]);await svc.confirm(a.id,h,first.d.id,body(first.d,create(first.d),pending(first.d)),randomUUID());
  const second=await draft(h,sources[1]);await assert.rejects(svc.confirm(a.id,h,second.d.id,body(second.d,create(second.d),pending(second.d)),randomUUID()),code('onboarding_invoice_object_review'));assert.deepEqual(await counts(h),{objects:3,expenses:0});
 });
 await t.test('same-purchase confirmation cannot bypass a different or incomplete object set or automatic review',async()=>{
  const h=await home(),first=await draft(h,sources[0]);const saved=await svc.confirm(a.id,h,first.d.id,body(first.d,create(first.d),[cost(first.d,sources[0])]),randomUUID()),ids=saved.draft.items.map(x=>x.decision.objects[0].id);
  const second=await draft(h,sources[1]),choices=await links(second.d,ids);choices[2]={itemId:second.d.items[2].id,action:'defer'};
  const partial=(await svc.confirm(a.id,h,second.d.id,body(second.d,choices,pending(second.d)),randomUUID())).draft,e=await db.homeExpense.findFirstOrThrow({where:{homeId:h}});
  const choice={itemId:partial.houseExpenses[0].id,action:'link_existing',expenseId:e.id,expectedExpenseVersion:e.version,purchaseReview:{mode:'same_purchase',confirmedTotalCents:199900}};
  await assert.rejects(svc.confirm(a.id,h,partial.id,body(partial,[],[choice]),randomUUID()),code('onboarding_purchase_objects_review'));
  await assert.rejects(svc.confirm(a.id,h,partial.id,body(partial,[],[choice]),randomUUID(),true),code('onboarding_purchase_review'));assert.deepEqual(await counts(h),{objects:3,expenses:1});assert.equal((await db.homeExpense.findUniqueOrThrow({where:{id:e.id}})).amountCents,210450);
 });
 await t.test('two distinct documents confirmed concurrently cannot create the same named objects twice',async()=>{
  const h=await home(),x=await draft(h,sources[0]),y=await draft(h,sources[1]);
  const results=await Promise.allSettled([x,y].map(z=>svc.confirm(a.id,h,z.d.id,body(z.d,create(z.d),pending(z.d)),randomUUID())));assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.deepEqual(await counts(h),{objects:3,expenses:0});
 });
 await t.test('Italian accented names and case cannot bypass the repeated-object guard',async()=>{
  const h=await home(),x=await draft(h,sources[0]),y=await draft(h,sources[1]);
  const first=create(x.d).map((c,i)=>({...c,name:'Unità climatizzazione '+i})),second=create(y.d).map((c,i)=>({...c,name:'UNITÀ CLIMATIZZAZIONE '+i}));
  await svc.confirm(a.id,h,x.d.id,body(x.d,first,pending(x.d)),randomUUID());await assert.rejects(svc.confirm(a.id,h,y.d.id,body(y.d,second,pending(y.d)),randomUUID()),code('onboarding_invoice_object_review'));assert.deepEqual(await counts(h),{objects:3,expenses:0});
 });
 await t.test('equal invoice totals still require explicit review and one versioned cost, not two',async()=>{
  const h=await home(),first=await draft(h,sources[0]);const one=await svc.confirm(a.id,h,first.d.id,body(first.d,create(first.d),[cost(first.d,sources[0])]),randomUUID()),ids=one.draft.items.map(x=>x.decision.objects[0].id);
  const second=await draft(h,sources[1]),linked=(await svc.confirm(a.id,h,second.d.id,body(second.d,await links(second.d,ids),pending(second.d)),randomUUID())).draft,e=await db.homeExpense.findFirstOrThrow({where:{homeId:h}});
  await svc.confirm(a.id,h,linked.id,body(linked,[],[{itemId:linked.houseExpenses[0].id,action:'link_existing',expenseId:e.id,expectedExpenseVersion:e.version,purchaseReview:{mode:'same_purchase',confirmedTotalCents:210450}}]),randomUUID());
  const saved=await db.homeExpense.findUniqueOrThrow({where:{id:e.id}});assert.equal(saved.amountCents,210450);assert.equal(saved.version,e.version+1);assert.deepEqual(await counts(h),{objects:3,expenses:1});assert.equal(await db.expenseHistory.count({where:{expenseId:e.id,kind:'updated'}}),1);
 });
 await t.test('an unconfirmed acconto amount rolls back objects, cost and confirmation receipt',async()=>{
  const h=await home(),x=await draft(h,sources[0]),c=cost(x.d,sources[0]),key=randomUUID();delete c.purchaseReview;
  await assert.rejects(svc.confirm(a.id,h,x.d.id,body(x.d,create(x.d),[c]),key),code('onboarding_purchase_amount_review'));assert.deepEqual(await counts(h),{objects:0,expenses:0});assert.equal(await db.objectOnboardingRequest.count({where:{accountId:a.id,key}}),0);
 });
 await t.test('abbreviated names retain durable full variants, source privacy and cross-client idempotence',async()=>{
  const {productExtraction}=require('../dist/object-onboarding/domain');
  const h=await home(),full='Apparato domestico — '+ 'Descrizione commerciale completa '.repeat(5)+'Modello ZX-82/B variante Blu 256 GB';
  const doc=await db.document.create({data:{homeId:h,uploaderId:a.id,name:'Synthetic long title',visibility:'private',original:{create:{originalFilename:'synthetic.pdf',mimeType:'application/pdf',sha256:hash(full),byteSize:1,file:{create:{storageKey:'not-stored-'+randomUUID()}}}}},include:{original:true}});
  const snap={documentId:doc.id,documentVersion:1,documentSha256:doc.original.sha256},proof={page:1,excerpt:full,region:null};
  const output=productExtraction({documentKind:'product_document',hasMoreItems:false,purchaseTotal:null,items:[{fields:{name:{value:full,evidence:proof},model:{value:'ZX-82/B',evidence:proof}},quantity:null,nameTruncated:false,disposition:'household_object',confidence:'high'}]},{kind:'text',snapshot:snap,pages:[full]});
  const row=await db.objectOnboardingDraft.create({data:{accountId:a.id,homeId:h,documentId:doc.id,documentVersion:1,documentSha256:snap.documentSha256,mode:'extraction',output}});
  const d=(await services(db).svc.getDraft(a.id,h,row.id,{})).draft;
  assert.equal(d.items[0].fullName,full);assert.equal(d.items[0].fields.name.value,'Apparato domestico');assert.equal(d.needsReview,true);
  await assert.rejects(svc.getDraft(b.id,h,row.id,{}));
  const choice={...create(d)[0],name:d.items[0].fields.name.value,fields:{model:{action:'accept'}}},request=body(d,[choice]);
  await assert.rejects(svc.confirm(a.id,h,d.id,{...request,expectedVersion:d.version+1},randomUUID()));
  await assert.rejects(svc.confirm(a.id,h,d.id,{...request,source:{...d.snapshot,sha256:'f'.repeat(64)}},randomUUID()));
  assert.deepEqual(await counts(h),{objects:0,expenses:0});
  const key=randomUUID(),saved=await svc.confirm(a.id,h,d.id,request,key);
  const replay=await services(db).svc.confirm(a.id,h,d.id,request,key);
  assert.deepEqual(replay.result,saved.result);assert.deepEqual(await counts(h),{objects:1,expenses:0});
  const objectId=saved.draft.items[0].decision.objects[0].id,field=await db.receiptObjectField.findUniqueOrThrow({where:{objectId_fieldKey:{objectId,fieldKey:'name'}}});
  assert.equal(field.value,'Apparato domestico');assert.equal(field.sources[0].excerpt,full);assert.equal(field.documentSha256,snap.documentSha256);
  const target=await db.homeObject.findUniqueOrThrow({where:{id:objectId}});assert.equal(target.profile.model.value,'ZX-82/B');
  assert.equal((await svc.getDraft(a.id,h,d.id,{})).draft.items[0].fullName,full);
  await db.documentVersion.update({where:{documentId:doc.id},data:{sha256:'b'.repeat(64)}});
  const stale=(await svc.getDraft(a.id,h,d.id,{})).draft;assert.equal(stale.state,'unavailable');assert.deepEqual(stale.items,[]);assert(!JSON.stringify(stale).includes(full));
  await assert.rejects(svc.confirm(a.id,h,d.id,request,key));assert.deepEqual(await counts(h),{objects:1,expenses:0});
 });

});
