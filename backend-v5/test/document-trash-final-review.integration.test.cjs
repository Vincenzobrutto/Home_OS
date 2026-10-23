// Independent review of 66c2915. Synthetic records, owned offline DB only.
require('reflect-metadata');
global.fetch=async()=>{throw Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {DocumentPolicy}=require('../dist/documents/access'),{TrashService}=require('../dist/documents/trash.service');
const {SharingService}=require('../dist/sharing/sharing.service'),{PersonalExportService}=require('../dist/personal-export/personal-export.service');
const {ReceiptAssistanceService}=require('../dist/receipt-assistance/receipt.service'),{ReviewService}=require('../dist/review/review.service');
const {IntakeBatchesService}=require('../dist/document-intake/batches.service');
const {digest}=require('../dist/security');
const clock={now:()=>new Date('2026-10-23T10:00:00Z')};
async function setup(t){
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const account=name=>db.account.create({data:{name,email:randomUUID()+'@example.test',passwordHash:'not-login'}});
 const a=await account('Final review owner'),b=await account('Final review recipient'),h=await db.home.create({data:{name:'Synthetic final review',address:'Synthetic'}});
 for(const who of [a,b])await db.homeMembership.create({data:{accountId:who.id,homeId:h.id,role:'owner',validFrom:new Date('2026-01-01T00:00:00Z')}});
 const bodies=new Map(),storage={remove:async()=>{},read:async key=>bodies.get(key)},policy=new DocumentPolicy(db),trash=new TrashService(db,storage,policy,clock),sharing=new SharingService(db,storage,clock);
 const document=async()=>{
  const body=Buffer.from('Synthetic final review original '+randomUUID()),storageKey=randomUUID();bodies.set(storageKey,body);
  return db.document.create({data:{homeId:h.id,uploaderId:a.id,name:'Synthetic original '+randomUUID(),visibility:'home',original:{create:{originalFilename:'synthetic.pdf',mimeType:'application/pdf',byteSize:body.length,sha256:digest(body),file:{create:{storageKey}}}}},include:{original:true}});
 };
 return {db,a,b,h,d:await document(),document,storage,policy,trash,sharing};
}

test('post-commit trash revocation must not revoke a first share created after a concurrent restore',{timeout:90000},async t=>{
 const {db,a,b,h,d,storage,policy,trash,sharing}=await setup(t);
 assert.equal(await db.shareRecord.count({where:{homeId:h.id}}),0,'no previous shares can accidentally serialize the race');
 let release,observed,transactions=0;
 const resume=new Promise(resolve=>release=resolve),read=new Promise(resolve=>observed=resolve);
 const facade={$transaction:(action,options)=>db.$transaction(async tx=>{
  if(++transactions!==2)return action(tx);
  return action(new Proxy(tx,{get(target,key){
   if(key!=='document')return typeof target[key]==='function'?target[key].bind(target):target[key];
   return new Proxy(target.document,{get(delegate,method){
    if(method!=='findUnique')return delegate[method];
    return async args=>{const row=await delegate.findUnique(args);if(args.where.id===d.id&&args.select?.lifecycleVersion){observed(row);await resume;}return row;};
   }});
  }}));
 },options)};
 const pending=new TrashService(facade,storage,policy,clock).trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());
 try{
  const snapshot=await Promise.race([read,pending.then(()=>{throw Error('expected_post_commit_barrier_missing');})]);assert(snapshot.trashedAt);
  await trash.restore(a.id,h.id,d.id,{expectedVersion:snapshot.lifecycleVersion},randomUUID());
  const preview=(await sharing.preview(a.id,h.id,{documentIds:[d.id],recipient:{kind:'member',accountId:b.id},durationDays:7},randomUUID())).preview;
  const fresh=(await sharing.create(a.id,h.id,{previewId:preview.id,expectedPreviewVersion:1,manifestFingerprint:preview.manifestFingerprint,acknowledgedDocumentIds:[d.id]},randomUUID())).share;
  await sharing.recipientAction(b.id,fresh.id,'accept',{expectedVersion:fresh.version},randomUUID());
  assert((await sharing.file(b.id,fresh.id,d.id)).bytes.length,'positive control: new share is authorized after restore');
  release();await pending;
  assert.equal((await db.document.findUnique({where:{id:d.id}})).trashedAt,null);
  assert.equal((await db.shareRecord.findUnique({where:{id:fresh.id}})).state,'accepted','revocation from the previous lifecycle must not affect this new share');
  assert((await sharing.file(b.id,fresh.id,d.id)).bytes.length);
 }finally{release();await pending.catch(()=>{});}
});

for(const phase of ['trash','purge'])test('personal export must not release document metadata captured before '+phase,{timeout:90000},async t=>{
 const {db,a,h,d,policy,trash}=await setup(t),exporter=new PersonalExportService(db,policy);
 const original=JSON.parse((await exporter.export(a.id,h.id,async()=>{})).toString());
 assert(original.data.documents.some(row=>row.id===d.id&&row.name===d.name),'positive control: active document is included');
 let captured=false;
 const facade={$transaction:async(action,options)=>{
  const result=await db.$transaction(action,options);
  if(options?.isolationLevel==='RepeatableRead'&&!captured){
   captured=true;const moved=await trash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());
   if(phase==='purge')await trash.purgeNow(a.id,h.id,d.id,{expectedVersion:moved.entry.version},randomUUID());
  }
  return result;
 }};
 let bytes;
 try{bytes=await new PersonalExportService(facade,policy).export(a.id,h.id,async()=>{});}
 catch(error){assert.equal(error.getStatus?.(),403);return;}
 assert(captured);const current=await db.document.findUnique({where:{id:d.id}});assert(current.trashedAt);if(phase==='purge')assert(current.purgedAt);
 const out=JSON.parse(bytes.toString());
 assert.equal(out.data.documents.some(row=>row.id===d.id),false,'fresh export check must exclude a document already in trash, including its name and original metadata');
});

test('a new receipt can reuse an object and keep confirmed values whose previous source is in trash',{timeout:90000},async t=>{
 const {db,a,h,d,document,trash}=await setup(t),receipts=new ReceiptAssistanceService(db,new ReviewService(db,{}),clock,undefined,undefined);
 const brand='Synthetic confirmed brand',first=(await receipts.manual(a.id,h.id,{documentId:d.id},randomUUID())).draft;
 const extraction=source=>({brand:{value:brand,sources:[{documentId:source.id,page:1,excerpt:brand}]}});
 await db.receiptDraft.update({where:{id:first.id},data:{mode:'extraction',fields:extraction(d)}});
 const created=await receipts.confirm(a.id,h.id,first.id,{expectedVersion:1,object:{action:'create',values:{name:'Synthetic appliance',brand,model:null},origins:{name:'manual',brand:'extraction',model:null}},expense:{action:'skip'}},randomUUID());
 const objectId=created.draft.confirmation.object.id;
 const controlDoc=await document(),control=(await receipts.manual(a.id,h.id,{documentId:controlDoc.id},randomUUID())).draft;
 await db.receiptDraft.update({where:{id:control.id},data:{mode:'extraction',fields:extraction(controlDoc)}});
 const reusable=await receipts.confirm(a.id,h.id,control.id,{expectedVersion:1,object:{action:'reuse',targetId:objectId,targetVersion:1,fields:[{field:'brand',action:'keep_existing'}]},expense:{action:'skip'}},randomUUID());
 assert.equal(reusable.draft.confirmation.object.id,objectId,'positive control: the same choice works before trash');
 assert.equal((await db.receiptObjectField.findUnique({where:{objectId_fieldKey:{objectId,fieldKey:'brand'}}})).documentId,d.id);
 await trash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());
 assert.equal((await receipts.objectFields(a.id,h.id,objectId,{})).fields.brand.value,brand);
 const next=await document(),second=(await receipts.manual(a.id,h.id,{documentId:next.id},randomUUID())).draft;
 await db.receiptDraft.update({where:{id:second.id},data:{mode:'extraction',fields:extraction(next)}});
 const current=await db.homeObject.findUnique({where:{id:objectId}});
 const result=await receipts.confirm(a.id,h.id,second.id,{expectedVersion:1,object:{action:'reuse',targetId:objectId,targetVersion:current.version,fields:[{field:'brand',action:'keep_existing'}]},expense:{action:'skip'}},randomUUID());
 assert.equal(result.draft.confirmation.object.id,objectId);assert.equal(result.draft.confirmation.newObjects,0);
 assert.equal(await db.homeObject.count({where:{accountId:a.id,homeId:h.id}}),1);
 assert.equal((await receipts.objectFields(a.id,h.id,objectId,{})).fields.brand.value,brand);
});

test('purge removes a document title from the durable direct-organization request body',{timeout:90000},async t=>{
 const {db,a,h,d,policy,trash}=await setup(t),batches=new IntakeBatchesService(db,policy),clientItemId=randomUUID(),secret='SYNTHETIC-DOCUMENT-TITLE-'+randomUUID();
 const batch=(await batches.create(a.id,h.id,{items:[{clientItemId,filename:'synthetic.pdf',mimeType:'application/pdf',byteSize:d.original.byteSize}]},randomUUID())).batch;
 const item=await db.documentIntakeItem.update({where:{batchId_clientItemId:{batchId:batch.id,clientItemId}},data:{documentId:d.id,documentVersion:1,documentSha256:d.original.sha256,uploadState:'stored',pageCount:1}});
 const key=randomUUID(),selection={action:'organize',title:secret,parts:[{kind:'receipt',pageFrom:1,pageTo:1}],target:{kind:'home'}};
 await batches.organize(a.id,h.id,batch.id,{expectedVersion:batch.version,mode:'single',items:[{itemId:item.id,expectedVersion:item.version,expectedOrganizationVersion:0,replaceOrganization:false,selection}]},key);
 const lookup={batchId_operation_key:{batchId:batch.id,operation:'organize',key}},before=await db.documentIntakeRequest.findUnique({where:lookup});
 assert.equal(before.results[item.id].state,'confirmed');assert(JSON.stringify(before.body).includes(secret),'positive control: direct organization really persisted the title');
 const moved=await trash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());await trash.purgeNow(a.id,h.id,d.id,{expectedVersion:moved.entry.version},randomUUID());
 assert.equal(await db.documentOrganization.count({where:{documentId:d.id}}),0);
 const after=await db.documentIntakeRequest.findUnique({where:lookup});assert.equal(after.digest,before.digest);
 assert.equal(JSON.stringify(after.body).includes(secret),false,'the document title must not survive definitive deletion inside an organize ledger body');
});
