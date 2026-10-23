require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {DocumentsService}=require('../dist/documents/documents.service'),{DocumentPolicy}=require('../dist/documents/access'),{TrashService}=require('../dist/documents/trash.service');
const DAY=86400000,SENTINEL='Zafferano-Cestino-7Q4';
const status=code=>e=>e.getStatus()===code;
const coded=(code,expected)=>e=>e.getStatus()===code&&e.getResponse().code===expected;

test('Cestino lotto 1: documents move to the trash, stay private, restore, expire and leave no content',async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();
 const account=name=>db.account.create({data:{name,email:randomUUID()+'@example.test',passwordHash:'not-login'}});
 const a=await account('Uploader'),b=await account('Other owner'),h=await db.home.create({data:{name:'Synthetic trash',address:'Test'}});
 await db.homeMembership.createMany({data:[a,b].map(x=>({homeId:h.id,accountId:x.id,role:'owner'}))});
 let clock=new Date('2026-10-23T10:00:00.000Z');const removed=[];let failRemove=0;
 const storage={remove:async k=>{if(failRemove>0){failRemove--;const e=new Error('busy');e.code='EBUSY';throw e;}removed.push(k);}};
 const policy=new DocumentPolicy(db),documents=new DocumentsService(db,storage,policy),trash=new TrashService(db,storage,policy,{now:()=>clock});
 const fileIds=[];
 t.after(async()=>{const where={homeId:h.id};
  await db.shareEvent.deleteMany({where:{share:where}});await db.shareRecord.deleteMany({where});await db.sharePreview.deleteMany({where});
  await db.objectOnboardingRequest.deleteMany({where});await db.objectOnboardingJob.deleteMany({where});await db.objectOnboardingDraft.deleteMany({where});await db.documentOrganization.deleteMany({where});
  await db.documentIntakeItem.deleteMany({where:{batch:where}});await db.documentIntakeBatch.deleteMany({where});
  await db.contactResourceLink.deleteMany({where:{contact:where}});await db.homeContact.deleteMany({where});await db.homeHistoryEvent.deleteMany({where});await db.homeExpense.deleteMany({where});
  await db.trashRequest.deleteMany({where});await db.deletionRecord.deleteMany({where});await db.uploadRequest.deleteMany({where});
  await db.documentVersion.deleteMany({where:{document:where}});await db.document.deleteMany({where});await db.storedFile.deleteMany({where:{id:{in:fileIds}}});
  await db.homeMembership.deleteMany({where});await db.home.delete({where:{id:h.id}});await db.account.deleteMany({where:{id:{in:[a.id,b.id]}}});await db.$disconnect();});
 async function doc(name,visibility='home'){const d=await db.document.create({data:{homeId:h.id,uploaderId:a.id,name,visibility,original:{create:{originalFilename:name+'.pdf',mimeType:'application/pdf',byteSize:100,sha256:randomUUID().replace(/-/g,'').padEnd(64,'a'),file:{create:{storageKey:randomUUID()+'.bin'}}}}},include:{original:{include:{file:true}}}});fileIds.push(d.original.fileId);return d;}
 const share=d=>db.shareRecord.create({data:{senderId:a.id,homeId:h.id,recipientKind:'member',recipientId:b.id,state:'accepted',manifest:{senderAccountId:a.id,recipientAccountId:b.id,homeId:h.id,expiresAt:new Date(+clock+7*DAY).toISOString(),items:[{documentId:d.id,documentVersion:1,sha256:d.original.sha256,name:d.name,byteSize:100,mimeType:'application/pdf'}],totalBytes:100},expiresAt:new Date(+clock+7*DAY)}});
 const listed=async who=>(await documents.list(who.id,h.id,{limit:50})).items.map(x=>x.id);

 const invoice=await doc('Fattura caldaia'),shared=await share(invoice);
 const contact=await db.homeContact.create({data:{accountId:a.id,homeId:h.id,name:'Idraulico'}});await db.contactResourceLink.create({data:{contactId:contact.id,resourceKind:'document',resourceId:invoice.id}});
 await db.homeHistoryEvent.create({data:{accountId:a.id,homeId:h.id,title:'Caldaia',year:2026,sortKey:'2026',documentIds:[invoice.id]}});
 await db.homeExpense.create({data:{accountId:a.id,homeId:h.id,title:'Caldaia',amountCents:49900,spentOn:'2026-06-14',documentId:invoice.id}});

 await t.test('Preview shows what the document is a source of; only the uploader may use the trash',async()=>{
  const p=await trash.preview(a.id,h.id,invoice.id);
  assert.equal(p.allowed,true);assert.deepEqual(p.impact,{expenses:1,objects:0,contacts:1,historyEvents:1,activeShares:1});
  await assert.rejects(trash.preview(b.id,h.id,invoice.id),status(403));
  await assert.rejects(trash.trash(b.id,h.id,invoice.id,{expectedVersion:1},randomUUID()),status(403));
 });
 await t.test('A running analysis blocks the move',async()=>{
  const busy=await doc('In analisi');const job=await db.objectOnboardingJob.create({data:{accountId:a.id,homeId:h.id,documentId:busy.id,documentVersion:1,documentSha256:busy.original.sha256,mimeType:'application/pdf',provider:'fixture',consentToProviderTransfer:false,state:'running',key:randomUUID(),digest:'c'.repeat(64)}});
  assert.equal((await trash.preview(a.id,h.id,busy.id)).allowed,false);
  await assert.rejects(trash.trash(a.id,h.id,busy.id,{expectedVersion:1},randomUUID()),coded(409,'document_busy'));
  await db.objectOnboardingJob.update({where:{id:job.id},data:{state:'succeeded'}});
 });
 let entry;
 await t.test('Move is versioned, idempotent and revokes shares at once',async()=>{
  await assert.rejects(trash.trash(a.id,h.id,invoice.id,{expectedVersion:2},randomUUID()),coded(409,'document_version_conflict'));
  const key=randomUUID(),first=await trash.trash(a.id,h.id,invoice.id,{expectedVersion:1},key);
  assert.deepEqual(await trash.trash(a.id,h.id,invoice.id,{expectedVersion:1},key),first);
  await assert.rejects(trash.trash(a.id,h.id,invoice.id,{expectedVersion:3},key),coded(409,'idempotency_conflict'));
  await assert.rejects(trash.trash(a.id,h.id,invoice.id,{expectedVersion:1},randomUUID()),coded(409,'document_in_trash'));
  entry=first.entry;assert.equal(first.revokedShares,1);assert.equal(entry.purgeAfter,new Date(+clock+30*DAY).toISOString());
  const s=await db.shareRecord.findUnique({where:{id:shared.id}});assert.equal(s.state,'revoked');assert.equal(await db.shareEvent.count({where:{shareId:shared.id,kind:'revoke'}}),1);
 });
 await t.test('A trashed document disappears everywhere for everyone',async()=>{
  for(const who of [a,b]){assert(!(await listed(who)).includes(invoice.id));await assert.rejects(documents.get(who.id,h.id,invoice.id),status(403));await assert.rejects(documents.file(who.id,h.id,invoice.id),status(403));}
  await assert.rejects(documents.export(a.id,h.id,[invoice.id]),status(403));
  await assert.rejects(documents.removalCapability(a.id,h.id,invoice.id),status(403));
  assert.deepEqual((await trash.list(a.id,h.id,{})).items.map(x=>x.id),[invoice.id]);
  assert.deepEqual((await trash.list(b.id,h.id,{})).items,[]);
 });
 await t.test('Restore is versioned and brings the document back; revoked shares stay revoked',async()=>{
  await assert.rejects(trash.restore(b.id,h.id,invoice.id,{expectedVersion:entry.version},randomUUID()),status(403));
  await assert.rejects(trash.restore(a.id,h.id,invoice.id,{expectedVersion:entry.version+1},randomUUID()),coded(409,'trash_version_conflict'));
  assert.deepEqual(await trash.restore(a.id,h.id,invoice.id,{expectedVersion:entry.version},randomUUID()),{restored:true,document:{id:invoice.id}});
  assert((await listed(b)).includes(invoice.id));assert.equal((await db.shareRecord.findUnique({where:{id:shared.id}})).state,'revoked');
  assert.deepEqual((await trash.list(a.id,h.id,{})).items,[]);
 });
 await t.test('Concurrent moves: exactly one wins',async()=>{
  const results=await Promise.allSettled([1,2].map(()=>trash.trash(a.id,h.id,invoice.id,{expectedVersion:1},randomUUID())));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert(results.find(r=>r.status==='rejected').reason.getStatus()===409);
 });
 await t.test('After 30 days the content is deleted automatically; the placeholder keeps confirmed data linked',async()=>{
  const current=(await trash.list(a.id,h.id,{})).items[0];clock=new Date(+clock+29*DAY);await trash.tick();
  assert.equal((await db.document.findUnique({where:{id:invoice.id}})).purgedAt,null);
  clock=new Date(+clock+2*DAY);
  await assert.rejects(trash.restore(a.id,h.id,invoice.id,{expectedVersion:current.version},randomUUID()),coded(409,'trash_expired'));
  await trash.tick();await trash.tick();
  const row=await db.document.findUnique({where:{id:invoice.id},include:{original:true}});
  assert.equal(row.name,'');assert(row.purgedAt);assert.equal(row.original,null);
  assert.equal(await db.storedFile.count({where:{id:invoice.original.fileId}}),0);assert.deepEqual(removed,[invoice.original.file.storageKey]);
  const record=await db.deletionRecord.findUnique({where:{resourceKind_resourceId:{resourceKind:'document',resourceId:invoice.id}}});assert.equal(record.reason,'expired');assert(record.fileRemovedAt);
  assert.equal(await db.homeExpense.count({where:{documentId:invoice.id}}),1);assert.equal(await db.contactResourceLink.count({where:{resourceId:invoice.id}}),0);
  assert.equal((await db.shareRecord.findUnique({where:{id:shared.id}})).manifest.items[0].name,'');
  assert.deepEqual((await trash.list(a.id,h.id,{})).items,[]);
 });
 await t.test('Delete now retries a failed physical removal on the next tick',async()=>{
  const d=await doc('Da eliminare subito','private');const moved=await trash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());
  await assert.rejects(trash.purgeNow(a.id,h.id,d.id,{expectedVersion:moved.entry.version+1},randomUUID()),coded(409,'trash_version_conflict'));
  failRemove=1;assert.deepEqual(await trash.purgeNow(a.id,h.id,d.id,{expectedVersion:moved.entry.version},randomUUID()),{purged:true,document:{id:d.id}});
  const pending=()=>db.deletionRecord.findUnique({where:{resourceKind_resourceId:{resourceKind:'document',resourceId:d.id}}});
  assert.equal((await pending()).fileRemovedAt,null);assert(!removed.includes(d.original.file.storageKey));
  await trash.tick();assert((await pending()).fileRemovedAt);assert(removed.includes(d.original.file.storageKey));
 });
 await t.test('Empty trash leaves no trace of the document text anywhere in the database',async()=>{
  const d=await doc(SENTINEL+' Garanzia','private'),source={accountId:a.id,homeId:h.id,documentId:d.id,documentVersion:1,documentSha256:d.original.sha256};
  await db.documentOrganization.create({data:{...source,title:SENTINEL+' titolo',parts:[{kind:'invoice',note:SENTINEL}],collections:['purchases']}});
  const draft=await db.objectOnboardingDraft.create({data:{...source,mode:'extraction',output:{items:[{name:SENTINEL+' prodotto'}]},review:{text:SENTINEL}}});
  await db.objectOnboardingRequest.create({data:{accountId:a.id,homeId:h.id,operation:'synthetic',target:draft.id,key:randomUUID(),digest:'d'.repeat(64),response:{echo:SENTINEL}}});
  const batch=await db.documentIntakeBatch.create({data:{accountId:a.id,homeId:h.id,key:randomUUID(),digest:'b'.repeat(64),totalBytes:100,items:{create:{clientItemId:randomUUID(),ordinal:0,filename:SENTINEL+'.pdf',byteSize:100,mimeType:'application/pdf',uploadState:'stored',documentId:d.id,documentVersion:1,documentSha256:d.original.sha256,proposal:{title:SENTINEL}}}}});
  await share(d);await db.documentVersion.update({where:{documentId:d.id},data:{originalFilename:SENTINEL+'.pdf'}});
  await trash.trash(a.id,h.id,d.id,{expectedVersion:1},randomUUID());
  const key=randomUUID();assert.deepEqual(await trash.empty(a.id,h.id,{},key),{purged:1});assert.deepEqual(await trash.empty(a.id,h.id,{},key),{purged:1});
  const columns=await db.$queryRaw`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() AND data_type IN ('text','jsonb','character varying','json','ARRAY') AND table_name<>'_prisma_migrations'`;
  const hits=[];
  for(const {table_name,column_name} of columns){const [row]=await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${table_name}" WHERE "${column_name}"::text LIKE $1`,'%'+SENTINEL+'%');if(row.n)hits.push(table_name+'.'+column_name);}
  assert.deepEqual(hits,[]);
  assert.equal(await db.documentIntakeItem.count({where:{batchId:batch.id}}),1);
 });
});
