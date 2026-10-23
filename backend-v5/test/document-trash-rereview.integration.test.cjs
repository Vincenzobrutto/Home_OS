// Independent second review. Only synthetic records inside the owned offline DB.
require('reflect-metadata');
global.fetch=async()=>{throw Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {DocumentPolicy}=require('../dist/documents/access'),{TrashService}=require('../dist/documents/trash.service');
const {ReviewService}=require('../dist/review/review.service'),{SharingService}=require('../dist/sharing/sharing.service');
const {ReceiptAssistanceService}=require('../dist/receipt-assistance/receipt.service');
const {PersonalExportService}=require('../dist/personal-export/personal-export.service');
const {readableReceiptProofKeys,receiptProofKey}=require('../dist/receipt-assistance/access');
const {IntakeBatchesService}=require('../dist/document-intake/batches.service'),{digest}=require('../dist/security');
const clock={now:()=>new Date('2026-10-23T10:00:00Z')},denied=e=>e.getStatus?.()===403;

test('PR9 second review: restore, confirmed proof scope, deferred data and durable replay',{timeout:90000},async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const account=name=>db.account.create({data:{name,email:randomUUID()+'@example.test',passwordHash:'not-login'}});
 const a=await account('Synthetic owner A'),b=await account('Synthetic owner B'),h=await db.home.create({data:{name:'Independent re-review',address:'Synthetic'}});
 for(const who of [a,b])await db.homeMembership.create({data:{accountId:who.id,homeId:h.id,role:'owner',validFrom:new Date('2026-01-01T00:00:00Z')}});
 const bytes=new Map(),storage={remove:async()=>{},read:async key=>bytes.get(key)},policy=new DocumentPolicy(db),trash=new TrashService(db,storage,policy,clock),review=new ReviewService(db,{});
 const receipts=new ReceiptAssistanceService(db,review,clock,undefined,undefined),exporter=new PersonalExportService(db,policy),sharing=new SharingService(db,storage,clock);
 async function doc(name,owner=a,visibility='private'){
  const storageKey=randomUUID(),body=Buffer.from('Synthetic '+name);bytes.set(storageKey,body);
  return db.document.create({data:{homeId:h.id,uploaderId:owner.id,name,visibility,original:{create:{originalFilename:name+'.pdf',mimeType:'application/pdf',byteSize:body.length,sha256:digest(body),file:{create:{storageKey}}}}},include:{original:true}});
 }
 const share=d=>db.shareRecord.create({data:{senderId:a.id,homeId:h.id,recipientKind:'member',recipientId:b.id,state:'accepted',manifest:{senderAccountId:a.id,recipientAccountId:b.id,homeId:h.id,expiresAt:'2026-10-30T10:00:00Z',items:[{documentId:d.id,documentVersion:1,sha256:d.original.sha256,name:d.name,byteSize:d.original.byteSize,mimeType:'application/pdf'}],totalBytes:d.original.byteSize},expiresAt:new Date('2026-10-30T10:00:00Z')}});
 const exported=async()=>JSON.parse((await exporter.export(a.id,h.id,async()=>{})).toString());
 async function purge(d){const moved=await trash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());return trash.purgeNow(a.id,h.id,d.id,{expectedVersion:moved.entry.version},randomUUID());}

 await t.test('restore cannot revive a share even after post-commit revocation was interrupted',async()=>{
  const d=await doc('Interrupted revocation',a,'home'),s=await share(d);assert((await sharing.file(b.id,s.id,d.id)).bytes.length);
  let transactions=0;
  const failSecond={$transaction:(action,options)=>{if(++transactions===2)throw Error('synthetic_interrupted_revocation');return db.$transaction(action,options);}};
  const interrupted=new TrashService(failSecond,storage,policy,clock);
  await assert.rejects(interrupted.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID()),/synthetic_interrupted_revocation/);
  const moved=await db.document.findUnique({where:{id:d.id}});assert(moved.trashedAt);assert.equal((await db.shareRecord.findUnique({where:{id:s.id}})).state,'accepted');
  await assert.rejects(sharing.file(b.id,s.id,d.id),denied);
  await trash.restore(a.id,h.id,d.id,{expectedVersion:moved.lifecycleVersion},randomUUID());
  assert.equal((await db.document.findUnique({where:{id:d.id}})).trashedAt,null);
  assert.equal((await db.shareRecord.findUnique({where:{id:s.id}})).state,'revoked');await assert.rejects(sharing.file(b.id,s.id,d.id),denied);
 });

 await t.test('confirmed proof exception never authorizes private foreign, cross-home or new source reads',async()=>{
  const d=await doc('Foreign private proof',b),proof={documentId:d.id,documentVersion:1,documentSha256:d.original.sha256};
  const keys=who=>db.$transaction(tx=>readableReceiptProofKeys(tx,who.id,h.id,[proof]));
  assert(!(await keys(a)).has(receiptProofKey(proof)));assert((await keys(b)).has(receiptProofKey(proof)));
  const wrong={...proof,documentVersion:7,documentSha256:'f'.repeat(64)};
  assert(!(await db.$transaction(tx=>readableReceiptProofKeys(tx,b.id,h.id,[wrong]))).size);
  const moved=await trash.trash(b.id,h.id,d.id,{expectedVersion:1},randomUUID());
  for(const phase of ['trashed','purged']){
   assert(!(await keys(a)).size);assert((await keys(b)).has(receiptProofKey(proof)));
   assert(!(await db.$transaction(tx=>readableReceiptProofKeys(tx,b.id,randomUUID(),[proof]))).size);
   await assert.rejects(receipts.manual(b.id,h.id,{documentId:d.id},randomUUID()),denied);
   if(phase==='trashed')await trash.purgeNow(b.id,h.id,d.id,{expectedVersion:moved.entry.version},randomUUID());
  }
  await db.homeMembership.update({where:{accountId_homeId:{accountId:b.id,homeId:h.id}},data:{revokedAt:clock.now()}});
  await assert.rejects(exporter.export(b.id,h.id,async()=>{}),denied);
  await db.homeMembership.update({where:{accountId_homeId:{accountId:b.id,homeId:h.id}},data:{revokedAt:null}});
 });

 await t.test('export must exclude deferred unconfirmed comparisons from a trashed source',async()=>{
  const secret='UNCONFIRMED-EXPORT-'+randomUUID(),d=await doc('Deferred comparison');
  const object=await db.homeObject.create({data:{accountId:a.id,homeId:h.id,name:'Confirmed existing object',type:'appliance'}});
  await db.receiptObjectField.create({data:{accountId:a.id,homeId:h.id,objectId:object.id,fieldKey:'brand',value:'Existing confirmed brand',origin:'user_declared'}});
  const draft=(await receipts.manual(a.id,h.id,{documentId:d.id},randomUUID())).draft;
  await db.receiptDraft.update({where:{id:draft.id},data:{mode:'extraction',fields:{brand:{value:secret,sources:[{documentId:d.id,page:1,excerpt:secret}]}}}});
  await receipts.confirm(a.id,h.id,draft.id,{expectedVersion:1,object:{action:'reuse',targetId:object.id,targetVersion:1,fields:[{field:'brand',action:'defer'}]},expense:{action:'skip'}},randomUUID());
  assert(JSON.stringify(await exported()).includes(secret),'positive control: deferred proposal is exported while source is readable');
  const comparison=await db.receiptComparison.findFirst({where:{draftId:draft.id,state:'open'}});assert(comparison);
  await trash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());
  assert.equal((await receipts.getComparison(a.id,h.id,comparison.id,{})).comparison.proposed,null);
  assert.equal((await db.receiptObjectField.findUnique({where:{objectId_fieldKey:{objectId:object.id,fieldKey:'brand'}}})).value,'Existing confirmed brand');
  assert.equal(JSON.stringify(await exported()).includes(secret),false,'unconfirmed proposal must stay hidden in personal export too');
 });

 await t.test('confirmed receipt fields stay readable in the receipt fields endpoint after trash',async()=>{
  const d=await doc('Confirmed receipt field'),brand='ConfirmedBrand-'+randomUUID(),draft=(await receipts.manual(a.id,h.id,{documentId:d.id},randomUUID())).draft;
  await db.receiptDraft.update({where:{id:draft.id},data:{mode:'extraction',fields:{brand:{value:brand,sources:[{documentId:d.id,page:1,excerpt:brand}]}}}});
  const result=await receipts.confirm(a.id,h.id,draft.id,{expectedVersion:1,object:{action:'create',values:{name:'Confirmed appliance',brand,model:null},origins:{name:'manual',brand:'extraction',model:null}},expense:{action:'skip'}},randomUUID());
  const id=result.draft.confirmation.object.id;
  assert.equal((await receipts.objectFields(a.id,h.id,id,{})).fields.brand.value,brand);
  await trash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());
  assert.equal((await receipts.objectFields(a.id,h.id,id,{})).fields.brand.value,brand,'confirmed field must remain usable with source unavailable');
 });

 await t.test('purge scopes intake client ids to their own batch and preserves other filenames',async()=>{
  const d=await doc('Repeated document across batches'),batches=new IntakeBatchesService(db,policy),x=randomUUID(),y=randomUUID(),secret='UNRELATED-FILE-'+randomUUID();
  const file=(clientItemId,filename)=>({clientItemId,filename,byteSize:d.original.byteSize,mimeType:'application/pdf'});
  const first=(await batches.create(a.id,h.id,{items:[file(randomUUID(),'anchor1.pdf')]},randomUUID())).batch;
  const second=(await batches.create(a.id,h.id,{items:[file(randomUUID(),'anchor2.pdf')]},randomUUID())).batch;
  await batches.append(a.id,h.id,first.id,{items:[file(x,'source1.pdf')]},randomUUID());
  const key=randomUUID();await batches.append(a.id,h.id,second.id,{items:[file(y,'source2.pdf'),file(x,secret+'.pdf')]},key);
  for(const [batchId,clientItemId]of [[first.id,x],[second.id,y]])await db.documentIntakeItem.update({where:{batchId_clientItemId:{batchId,clientItemId}},data:{documentId:d.id,documentVersion:1,documentSha256:d.original.sha256,uploadState:'stored'}});
  const lookup={batchId_operation_key:{batchId:second.id,operation:'append',key}},before=await db.documentIntakeRequest.findUnique({where:lookup});
  await purge(d);const after=await db.documentIntakeRequest.findUnique({where:lookup});assert.equal(after.digest,before.digest);
  assert.equal(after.body.items.find(i=>i.clientItemId===y).filename,'documento-eliminato');
  assert.equal(after.body.items.find(i=>i.clientItemId===x).filename,secret+'.pdf','clientItemId is unique inside one batch, not globally');
 });

 await t.test('replay of an old trash request does not revoke a new share created after restore',async()=>{
  const d=await doc('Old trash replay',a,'home'),old=await share(d),key=randomUUID();
  const moved=await trash.trash(a.id,h.id,d.id,{expectedVersion:1},key);await trash.restore(a.id,h.id,d.id,{expectedVersion:moved.entry.version},randomUUID());
  assert.equal((await db.shareRecord.findUnique({where:{id:old.id}})).state,'revoked');
  const fresh=await share(d);assert((await sharing.file(b.id,fresh.id,d.id)).bytes.length);
  await trash.trash(a.id,h.id,d.id,{expectedVersion:1},key);
  assert.equal((await db.document.findUnique({where:{id:d.id}})).trashedAt,null);
  assert.equal((await db.shareRecord.findUnique({where:{id:fresh.id}})).state,'accepted','a replay must not revoke shares created in a later document lifecycle');
 });
});
