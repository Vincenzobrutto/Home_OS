// Independent PR9 regressions. Synthetic data, owned offline runner DB only.
require('reflect-metadata');
global.fetch=async()=>{throw Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {DocumentPolicy}=require('../dist/documents/access'),{TrashService}=require('../dist/documents/trash.service');
const {ReviewService}=require('../dist/review/review.service'),{HomeObjectsService}=require('../dist/home-objects/home-objects.service');
const {ObjectOnboardingAccess}=require('../dist/object-onboarding/access'),{ObjectOnboardingService}=require('../dist/object-onboarding/onboarding.service');
const {productExtraction}=require('../dist/object-onboarding/domain'),{FloorPlanService}=require('../dist/object-onboarding/floor-plan.service');
const {IntakeBatchesService}=require('../dist/document-intake/batches.service');
const {SharingService}=require('../dist/sharing/sharing.service');
const {ExpensesService}=require('../dist/expenses/expenses.service'),{EconomicDocumentsService}=require('../dist/economy/document.service');
const {digest}=require('../dist/security');
const clock={now:()=>new Date('2026-10-23T10:00:00Z')};
const latch=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

test('PR9 independent regressions: confirmed data, durable JSON and concurrent readers',{timeout:90000},async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);
 const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const a=await db.account.create({data:{name:'Synthetic reviewer',email:randomUUID()+'@example.test',passwordHash:'not-login'}});
 const b=await db.account.create({data:{name:'Synthetic recipient',email:randomUUID()+'@example.test',passwordHash:'not-login'}});
 const h=await db.home.create({data:{name:'PR9 isolated review',address:'Test'}});
 await db.homeMembership.createMany({data:[a,b].map(x=>({accountId:x.id,homeId:h.id,role:'owner',validFrom:new Date('2026-01-01T00:00:00Z')}))});
 const bytes=new Map(),storage={remove:async()=>{},read:async key=>bytes.get(key)};
 const review=new ReviewService(db,{}),objects=new HomeObjectsService(db,review),policy=new DocumentPolicy(db),trash=new TrashService(db,storage,policy,clock);
 const access=new ObjectOnboardingAccess(db,review),onboarding=new ObjectOnboardingService(access,objects,review,clock);
 async function doc(name){
  const key=randomUUID(),body=Buffer.from('Synthetic bytes '+name);bytes.set(key,body);
  return db.document.create({data:{homeId:h.id,uploaderId:a.id,name,visibility:'home',original:{create:{originalFilename:name+'.pdf',mimeType:'application/pdf',byteSize:body.length,sha256:digest(body),file:{create:{storageKey:key}}}}},include:{original:true}});
 }
 async function purge(d){const moved=await trash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());return trash.purgeNow(a.id,h.id,d.id,{expectedVersion:moved.entry.version},randomUUID());}

 await t.test('confirmed extracted object remains readable after trash and purge',async()=>{
  const d=await doc('Synthetic confirmed appliance'),snapshot={documentId:d.id,documentVersion:1,documentSha256:d.original.sha256};
  const output=productExtraction({documentKind:'device_label',hasMoreItems:false,purchaseTotal:null,items:[{fields:{name:{value:d.name,evidence:{page:1,excerpt:d.name,region:null}}},quantity:null,nameTruncated:false,disposition:'household_object',confidence:'high'}]},{kind:'text',snapshot,pages:[d.name]});
  const raw=await db.objectOnboardingDraft.create({data:{accountId:a.id,homeId:h.id,documentId:d.id,documentVersion:1,documentSha256:d.original.sha256,mode:'extraction',output}});
  const draft=(await onboarding.getDraft(a.id,h.id,raw.id,{})).draft;
  const saved=await onboarding.confirm(a.id,h.id,raw.id,{expectedVersion:draft.version,source:draft.snapshot,choices:[{itemId:draft.items[0].id,action:'create',name:d.name,type:'appliance',unitNames:[],roomIds:[],fields:{},manual:null,expense:{action:'skip'},confirmHouseholdObject:true,acknowledgeExistingSource:false}]},randomUUID());
  const id=saved.draft.items[0].decision.objects[0].id;await objects.getObject(a.id,h.id,'object',id,{});
  const moved=await trash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());
  const status=async()=>{try{await objects.getObject(a.id,h.id,'object',id,{});return 200;}catch(e){return e.getStatus?.()??500;}};
  const afterTrash=await status();await trash.purgeNow(a.id,h.id,d.id,{expectedVersion:moved.entry.version},randomUUID());
  assert.equal(await db.homeObject.count({where:{id}}),1);
  assert.deepEqual([afterTrash,await status()],[200,200],'confirmed object must survive with an unavailable source');
 });

 await t.test('purge removes the original filename from durable intake append bodies',async()=>{
  const secret='PR9-PRIVATE-FILENAME-'+randomUUID(),d=await doc(secret),batches=new IntakeBatchesService(db,policy);
  const file=name=>({clientItemId:randomUUID(),filename:name,byteSize:d.original.byteSize,mimeType:'application/pdf'});
  const first=await batches.create(a.id,h.id,{items:[file('safe.pdf')]},randomUUID()),added=file(secret+'.pdf'),key=randomUUID();
  await batches.append(a.id,h.id,first.batch.id,{items:[added]},key);
  await db.documentIntakeItem.update({where:{batchId_clientItemId:{batchId:first.batch.id,clientItemId:added.clientItemId}},data:{documentId:d.id,documentVersion:1,documentSha256:d.original.sha256,uploadState:'stored'}});
  await purge(d);
  const row=await db.documentIntakeRequest.findUnique({where:{batchId_operation_key:{batchId:first.batch.id,operation:'append',key}}});
  assert.equal(JSON.stringify(row?.body??{}).includes(secret),false,'intake request body still contains purged filename');
 });

 await t.test('purge removes unconfirmed floor-plan names from ObjectRequest.response',async()=>{
  const secret='PR9-UNCONFIRMED-'+randomUUID(),d=await doc('Synthetic floor plan'),key=randomUUID();
  const floor=new FloorPlanService(access,undefined,undefined);
  await floor.mutate(a.id,h.id,d.id,{expectedVersion:0,documentVersion:1,documentSha256:d.original.sha256,plan:{points:[{number:1,page:1,x:.5,y:.5,name:secret,type:'other',included:true,roomId:null}],view:{page:1,x:0,y:0,width:1,height:1},warnings:[]}},key,false);
  assert.equal(await db.homeRoom.count({where:{homeId:h.id,name:secret}}),0);
  await purge(d);
  const row=await db.objectRequest.findUnique({where:{accountId_homeId_operation_target_key:{accountId:a.id,homeId:h.id,operation:'floor-plan:save',target:d.id,key}}});
  assert.equal(JSON.stringify(row?.response??{}).includes(secret),false,'unconfirmed plan retained in an idempotency response');
 });

 await t.test('economic retry replay after purge yields a controlled error, not a TypeError',async()=>{
  const d=await doc('Synthetic economic analysis'),expenses=new ExpensesService(db,review,clock),economic=new EconomicDocumentsService(expenses,review,storage);
  const first=await economic.start(a.id,h.id,{documentId:d.id,provider:'test_fixture_v1'},randomUUID());
  await db.economicAnalysisJob.update({where:{id:first.job.id},data:{state:'failed'}});
  const key=randomUUID(),body={expectedVersion:first.job.version};
  const second=await economic.retry(a.id,h.id,first.job.id,body,key);
  await db.economicAnalysisJob.update({where:{id:second.job.id},data:{state:'succeeded'}});await purge(d);
  let caught;try{await economic.retry(a.id,h.id,first.job.id,body,key);}catch(e){caught=e;}
  assert(caught,'deleted source cannot replay a usable result');
  assert.notEqual(caught.name,'TypeError',caught.message);
  assert.equal(typeof caught.getStatus,'function','typed response tombstone must not cause an internal exception');
  assert([403,409,410].includes(caught.getStatus()));
 });

 await t.test('share download and move-to-trash do not acquire opposite row locks',async()=>{
  const d=await doc('Synthetic concurrent share'),share=await db.shareRecord.create({data:{senderId:a.id,homeId:h.id,recipientKind:'member',recipientId:b.id,state:'accepted',manifest:{senderAccountId:a.id,recipientAccountId:b.id,homeId:h.id,expiresAt:'2026-10-30T10:00:00Z',items:[{documentId:d.id,documentVersion:1,sha256:d.original.sha256,name:d.name,byteSize:d.original.byteSize,mimeType:'application/pdf'}],totalBytes:d.original.byteSize},expiresAt:new Date('2026-10-30T10:00:00Z')}});
  // Positive control: the accepted share really reaches original validation/read.
  const control=await new SharingService(db,storage,clock).file(b.id,share.id,d.id,{});
  assert.equal(control.bytes.length,d.original.byteSize);
  const shareLocked=latch(),docLocked=latch(),releaseShare=latch();
  const hook=(match,after)=>({$transaction:(action,options)=>db.$transaction(tx=>action(new Proxy(tx,{get(target,key){if(key==='$queryRaw')return async(...args)=>{const result=await target.$queryRaw(...args),sql=Array.isArray(args[0])?args[0].join('?'):args[0]?.sql??'';if(match(sql))await after();return result;};const value=target[key];return typeof value==='function'?value.bind(target):value;}})),options)});
  const sharing=new SharingService(hook(sql=>sql.includes('"ShareRecord"')&&sql.includes('FOR UPDATE'),async()=>{shareLocked.resolve();await releaseShare.promise;}),storage,clock);
  const otherTrash=new TrashService(hook(sql=>sql.includes('"Document"')&&sql.includes('FOR UPDATE'),async()=>{docLocked.resolve();}),storage,policy,clock);
  const downloading=sharing.file(b.id,share.id,d.id,{});await shareLocked.promise;
  const moving=otherTrash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());await docLocked.promise;releaseShare.resolve();
  const results=await Promise.allSettled([downloading,moving]);
  const unexpected=results.filter(r=>r.status==='rejected'&&r.reason.getStatus?.()!==403);
  const deadlocks=results.filter(r=>r.status==='rejected'&&(r.reason.code==='P2034'||r.reason.meta?.code==='40P01'||/deadlock/i.test(r.reason.message)));
  assert.equal(deadlocks.length,0,'ShareRecord -> Document conflicts with Document -> ShareRecord');
  assert.equal(unexpected.length,0,unexpected.map(r=>r.reason.message).join('\n'));
 });
});
