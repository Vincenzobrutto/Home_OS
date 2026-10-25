require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client');
const {assertDevelopmentDatabase}=require('../dist/prisma.service');
const {DocumentPolicy}=require('../dist/documents/access');
const {TrashService}=require('../dist/documents/trash.service');
const {SharingService}=require('../dist/sharing/sharing.service');
const {ReviewService}=require('../dist/review/review.service');
const {HomeObjectsService}=require('../dist/home-objects/home-objects.service');
const {PersonalExportService}=require('../dist/personal-export/personal-export.service');
const {digest}=require('../dist/security');
const clock={now:()=>new Date('2026-10-25T10:00:00Z')};
async function setup(t){
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const accounts=[];for(let i=0;i<2;i++)accounts.push(await db.account.create({data:{name:'Synthetic fix reviewer',email:randomUUID()+'@example.test',passwordHash:'not-login'}}));
 const [a,b]=accounts,h=await db.home.create({data:{name:'Synthetic fix home',address:'Synthetic'}});
 for(const who of accounts)await db.homeMembership.create({data:{accountId:who.id,homeId:h.id,role:'owner',validFrom:new Date('2026-01-01T00:00:00Z')}});
 const bytes=Buffer.from('Synthetic original'),storage={read:async()=>bytes,remove:async()=>{}},policy=new DocumentPolicy(db);
 const document=async(who=a)=>db.document.create({data:{homeId:h.id,uploaderId:who.id,name:'Synthetic original',visibility:'home',original:{create:{originalFilename:'synthetic.pdf',mimeType:'application/pdf',byteSize:bytes.length,sha256:digest(bytes),file:{create:{storageKey:randomUUID()}}}}},include:{original:true}});
 const trash=new TrashService(db,storage,policy,clock);
 return {db,a,b,h,storage,policy,document,trash};
}
test('trash continuation covers tied timestamps without duplicates and binds account and home',async t=>{
 const {db,a,b,h,trash,storage,document}=await setup(t),trashedAt=clock.now(),purgeAfter=new Date(+trashedAt+30*86400000);
 const ids=Array.from({length:1001},()=>randomUUID());
 await db.document.createMany({data:ids.map(id=>({id,homeId:h.id,uploaderId:a.id,name:'Synthetic pagination row',visibility:'private',trashedAt,purgeAfter,lifecycleVersion:2}))});
 const originals=ids.map(id=>({id,fileId:randomUUID(),key:randomUUID(),bytes:Buffer.from('Synthetic pagination original '+id)})),files=new Map(originals.map(row=>[row.key,row.bytes])),read=storage.read;
 storage.read=async key=>files.get(key)??read(key);
 await db.storedFile.createMany({data:originals.map(row=>({id:row.fileId,storageKey:row.key}))});
 await db.documentVersion.createMany({data:originals.map(row=>({documentId:row.id,fileId:row.fileId,version:1,originalFilename:'synthetic.pdf',mimeType:'application/pdf',byteSize:row.bytes.length,sha256:digest(row.bytes)}))});
 assert.equal(await db.documentVersion.count({where:{documentId:{in:ids}}}),1001);
 const other=await document(b);await db.document.update({where:{id:other.id},data:{name:'OTHER-UPLOADER-PRIVATE',trashedAt,purgeAfter,lifecycleVersion:2}});
 const first=await trash.list(a.id,h.id,{});assert.equal(first.items.length,500);assert.equal(first.total,1001);assert(first.nextCursor);
 await assert.rejects(()=>trash.list(b.id,h.id,{cursor:first.nextCursor}),e=>e.getStatus?.()===422);
 await assert.rejects(()=>trash.list(a.id,randomUUID(),{cursor:first.nextCursor}),e=>e.getStatus?.()===422);
 await assert.rejects(()=>trash.list(a.id,h.id,{cursor:'malformed'}),e=>e.getStatus?.()===422);
 await assert.rejects(()=>trash.list(a.id,h.id,{unknown:'ignored?'}),e=>e.getStatus?.()===422);
 const second=await trash.list(a.id,h.id,{cursor:first.nextCursor}),third=await trash.list(a.id,h.id,{cursor:second.nextCursor});
 assert.equal(second.items.length,500);assert.equal(third.items.length,1);assert.equal(third.nextCursor,null);
 assert.deepEqual([...first.items,...second.items,...third.items].map(row=>row.id),[...ids].sort().reverse());
});
for(const phase of ['active','trash','purge'])test('confirmed profile and export still deny another uploader private source after '+phase,async t=>{
 const {db,a,b,h,policy,document,trash}=await setup(t),doc=await document(b),brand='SYNTHETIC-PRIVATE-VALUE',secret='SYNTHETIC-PRIVATE-EXCERPT';
 const object=await db.homeObject.create({data:{accountId:a.id,homeId:h.id,name:'Synthetic object',type:'appliance',profile:{brand:{value:brand,origin:'extraction_confirmed',sources:[{documentId:doc.id,documentVersion:1,sha256:doc.original.sha256,page:1,excerpt:secret}]}}}});
 const objects=new HomeObjectsService(db,new ReviewService(db,{})),exporter=new PersonalExportService(db,policy);
 assert.equal((await objects.getObject(a.id,h.id,'object',object.id,{})).object.profile.fields.brand.value,brand);
 if(phase!=='active'){const moved=await trash.trash(b.id,h.id,doc.id,{expectedVersion:1},randomUUID());if(phase==='purge')await trash.purgeNow(b.id,h.id,doc.id,{expectedVersion:moved.entry.version},randomUUID());}
 await db.document.update({where:{id:doc.id},data:{visibility:'private'}});
 assert.equal(JSON.stringify(await objects.getObject(a.id,h.id,'object',object.id,{})).includes(brand),false);
 const exported=JSON.parse((await exporter.export(a.id,h.id,async()=>{})).toString());assert.equal(JSON.stringify(exported).includes(brand),false);assert.equal(JSON.stringify(exported).includes(secret),false);
});
test('export rechecks retained canonical profile proofs after the snapshot',async t=>{
 const {db,a,b,h,policy,document,trash}=await setup(t),doc=await document(b),brand='SYNTHETIC-RECHECK-BRAND';
 await db.homeObject.create({data:{accountId:a.id,homeId:h.id,name:'Synthetic object',type:'appliance',profile:{brand:{value:brand,origin:'extraction_confirmed',sources:[{documentId:doc.id,documentVersion:1,sha256:doc.original.sha256,page:1,excerpt:brand}]}}}});
 await trash.trash(b.id,h.id,doc.id,{expectedVersion:1},randomUUID());
 let transactions=0,authorized=false;
 const wrapped=new Proxy(db,{get(target,key){if(key==='$transaction')return async(...args)=>{if(++transactions===2)await db.document.update({where:{id:doc.id},data:{visibility:'private'}});return db.$transaction(...args);};return typeof target[key]==='function'?target[key].bind(target):target[key];}});
 await assert.rejects(()=>new PersonalExportService(wrapped,policy).export(a.id,h.id,async()=>{authorized=true;}),error=>error.getStatus?.()===403);
 assert.equal(authorized,false);
});
test('a pending sharing preview cannot survive trash followed by restore',async t=>{
 const {db,a,b,h,storage,document,trash}=await setup(t),doc=await document(),sharing=new SharingService(db,storage,clock);
 const preview=(await sharing.preview(a.id,h.id,{documentIds:[doc.id],recipient:{kind:'member',accountId:b.id},durationDays:7},randomUUID())).preview;
 const moved=await trash.trash(a.id,h.id,doc.id,{expectedVersion:1},randomUUID());
 assert((await db.sharePreview.findUnique({where:{id:preview.id}})).validUntil<=clock.now());
 await trash.restore(a.id,h.id,doc.id,{expectedVersion:moved.entry.version},randomUUID());
 await assert.rejects(()=>sharing.create(a.id,h.id,{previewId:preview.id,expectedPreviewVersion:1,manifestFingerprint:preview.manifestFingerprint,acknowledgedDocumentIds:[doc.id]},randomUUID()));
 assert.equal(await db.shareRecord.count({where:{homeId:h.id}}),0);
});
test('replaying an old trash request cannot expire a fresh preview after restore',async t=>{
 const {db,a,b,h,storage,document,trash}=await setup(t),doc=await document(),sharing=new SharingService(db,storage,clock),key=randomUUID();
 const moved=await trash.trash(a.id,h.id,doc.id,{expectedVersion:1},key);
 await trash.restore(a.id,h.id,doc.id,{expectedVersion:moved.entry.version},randomUUID());
 const preview=(await sharing.preview(a.id,h.id,{documentIds:[doc.id],recipient:{kind:'member',accountId:b.id},durationDays:7},randomUUID())).preview;
 assert.deepEqual(await trash.trash(a.id,h.id,doc.id,{expectedVersion:1},key),moved);
 assert((await db.sharePreview.findUnique({where:{id:preview.id}})).validUntil>clock.now());
 const created=await sharing.create(a.id,h.id,{previewId:preview.id,expectedPreviewVersion:1,manifestFingerprint:preview.manifestFingerprint,acknowledgedDocumentIds:[doc.id]},randomUUID());
 assert.equal(created.share.state,'pending');assert.equal(await db.shareRecord.count({where:{homeId:h.id,state:'pending'}}),1);
});
test('editing an unrelated field preserves canonical provenance without returning unavailable excerpts',async t=>{
 const {db,a,h,document,trash}=await setup(t),doc=await document(),secret='SYNTHETIC-PROVENANCE-TO-RETAIN';
 const brand={value:'Synthetic brand',origin:'extraction_confirmed',sources:[{documentId:doc.id,documentVersion:1,sha256:doc.original.sha256,page:1,excerpt:secret}]};
 const object=await db.homeObject.create({data:{accountId:a.id,homeId:h.id,name:'Synthetic object',type:'appliance',profile:{brand}}}),objects=new HomeObjectsService(db,new ReviewService(db,{}));
 const moved=await trash.trash(a.id,h.id,doc.id,{expectedVersion:1},randomUUID());
 const response=await objects.setProfile(a.id,h.id,object.id,{expectedVersion:1,values:{reference:'Synthetic declared reference'}},randomUUID());
 assert.equal(JSON.stringify(response).includes(secret),false);assert.equal(response.object.profile.fields.brand.sourceAvailable,false);
 const stored=(await db.homeObject.findUnique({where:{id:object.id}})).profile;
 assert.deepEqual(stored.brand,brand);assert.equal(stored.reference.value,'Synthetic declared reference');assert.equal(JSON.stringify(stored).includes('sourceAvailable'),false);
 await trash.restore(a.id,h.id,doc.id,{expectedVersion:moved.entry.version},randomUUID());
 const restored=await objects.getObject(a.id,h.id,'object',object.id,{});assert.equal(restored.object.profile.fields.brand.sourceAvailable,true);assert(JSON.stringify(restored).includes(secret));
});
