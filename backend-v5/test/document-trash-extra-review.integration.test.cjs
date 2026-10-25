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
const clock={now:()=>new Date('2026-10-24T10:00:00Z')};
function barrier(){let release;const promise=new Promise(resolve=>release=resolve);return {promise,release};}
async function setup(t){
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const accounts=[];for(let i=0;i<2;i++)accounts.push(await db.account.create({data:{name:'Synthetic extra reviewer',email:randomUUID()+'@example.test',passwordHash:'not-login'}}));
 const [a,b]=accounts,h=await db.home.create({data:{name:'Synthetic extra review',address:'Synthetic'}});
 for(const who of accounts)await db.homeMembership.create({data:{accountId:who.id,homeId:h.id,role:'owner',validFrom:new Date('2026-01-01T00:00:00Z')}});
 const bytes=Buffer.from('Synthetic share original'),storage={read:async()=>bytes,remove:async()=>{}};
 const doc=await db.document.create({data:{homeId:h.id,uploaderId:a.id,name:'Synthetic concurrent original',visibility:'home',original:{create:{originalFilename:'synthetic.pdf',mimeType:'application/pdf',byteSize:bytes.length,sha256:digest(bytes),file:{create:{storageKey:randomUUID()}}}}},include:{original:true}});
 return {db,a,b,h,doc,storage,policy:new DocumentPolicy(db)};
}

test('moving to trash must not invert Document and SharePreview locks against share creation',{timeout:90000},async t=>{
 const {db,a,b,h,doc,storage,policy}=await setup(t),sharing=new SharingService(db,storage,clock);
 const preview=(await sharing.preview(a.id,h.id,{documentIds:[doc.id],recipient:{kind:'member',accountId:b.id},durationDays:7},randomUUID())).preview;
 const previewLocked=barrier(),documentLocked=barrier(),resume=barrier();
 const sharingDb={$transaction:(action,options)=>db.$transaction(tx=>action(new Proxy(tx,{get(target,key){
  if(key!=='$queryRaw')return typeof target[key]==='function'?target[key].bind(target):target[key];
  return async(...args)=>{const out=await target.$queryRaw(...args);if(JSON.stringify(args).includes('SharePreview')&&JSON.stringify(args).includes('FOR UPDATE')){previewLocked.release();await resume.promise;}return out;};
 }})),options)};
 const trashDb={$transaction:(action,options)=>db.$transaction(tx=>action(new Proxy(tx,{get(target,key){
  if(key!=='document')return typeof target[key]==='function'?target[key].bind(target):target[key];
  return new Proxy(target.document,{get(delegate,method){if(method!=='findUnique')return delegate[method];return async args=>{const out=await delegate.findUnique(args);if(args.where.id===doc.id&&args.include?.original){documentLocked.release();await resume.promise;}return out;};}});
 }})),options)};
 const create=new SharingService(sharingDb,storage,clock).create(a.id,h.id,{previewId:preview.id,expectedPreviewVersion:1,manifestFingerprint:preview.manifestFingerprint,acknowledgedDocumentIds:[doc.id]},randomUUID());
 const observedCreate=create.catch(error=>error);await Promise.race([previewLocked.promise,observedCreate.then(()=>{throw Error('share_preview_lock_barrier_missing');})]);
 const move=new TrashService(trashDb,storage,policy,clock).trash(a.id,h.id,doc.id,{expectedVersion:1},randomUUID());
 const observedMove=move.catch(error=>error);
 try{
  await Promise.race([documentLocked.promise,observedMove.then(()=>{throw Error('document_lock_barrier_missing');})]);resume.release();
  const results=await Promise.allSettled([create,move]);
  const failures=results.filter(result=>result.status==='rejected').map(result=>({code:result.reason.code,status:result.reason.getStatus?.(),message:String(result.reason.message)}));
  console.log('OFFLINE_TRASH_PREVIEW_LOCKS '+JSON.stringify(failures));
  assert.equal(failures.some(error=>/deadlock|40P01|P2034/i.test(JSON.stringify(error))),false,'concurrent share creation and trash must not deadlock');
  assert(results[1].status==='fulfilled','moving an authorized original must finish without a database error');
 }finally{resume.release();await Promise.allSettled([observedCreate,observedMove]);}
});

test('trash listing must expose every restorable entry or a continuation cursor',{timeout:90000},async t=>{
 const {db,a,h,storage,policy}=await setup(t),trashedAt=clock.now(),purgeAfter=new Date(+trashedAt+30*86400000);
 const rows=Array.from({length:501},(_,i)=>({id:randomUUID(),fileId:randomUUID(),name:'Synthetic overflow '+i,bytes:Buffer.from('Synthetic overflow original '+randomUUID())}));
 const files=new Map(rows.map(row=>['synthetic-overflow-'+row.fileId,row.bytes])),read=storage.read;storage.read=async key=>files.get(key)??read(key);
 await db.document.createMany({data:rows.map(row=>({id:row.id,homeId:h.id,uploaderId:a.id,name:row.name,visibility:'private',trashedAt,purgeAfter,lifecycleVersion:2}))});
 await db.storedFile.createMany({data:rows.map(row=>({id:row.fileId,storageKey:'synthetic-overflow-'+row.fileId}))});
 await db.documentVersion.createMany({data:rows.map(row=>({documentId:row.id,fileId:row.fileId,version:1,originalFilename:'synthetic.pdf',mimeType:'application/pdf',byteSize:row.bytes.length,sha256:digest(row.bytes)}))});
 assert.equal(await db.documentVersion.count({where:{documentId:{in:rows.map(row=>row.id)}}}),501,'every listed document has a valid original');
 const trash=new TrashService(db,storage,policy,clock),result=await trash.list(a.id,h.id,{});
 assert.equal(await db.document.count({where:{homeId:h.id,trashedAt:{not:null},purgedAt:null}}),501);
 const hidden=rows.find(row=>!result.items.some(item=>item.id===row.id));
 if(hidden)assert.equal((await trash.restore(a.id,h.id,hidden.id,{expectedVersion:2},randomUUID())).restored,true,'positive control: the hidden document is actually restorable if its id is known');
 assert(result.items.length===501||result.nextCursor,'the oldest entry must remain reachable; an unannounced cap cannot silently hide it');
});

for(const phase of ['trash','purge'])test('object profile keeps its confirmed value without exposing unavailable source excerpts after '+phase,{timeout:90000},async t=>{
 const {db,a,h,doc,storage,policy}=await setup(t),trash=new TrashService(db,storage,policy,clock),objects=new HomeObjectsService(db,new ReviewService(db,{}));
 const brand='Synthetic retained brand',secret='SYNTHETIC-UNCONFIRMED-CITATION-'+randomUUID();
 const source={documentId:doc.id,documentVersion:doc.original.version,sha256:doc.original.sha256,page:1,excerpt:brand+'; '+secret,basis:'verified_text',region:null};
 const object=await db.homeObject.create({data:{accountId:a.id,homeId:h.id,name:'Synthetic retained object',type:'appliance',profile:{brand:{value:brand,origin:'extraction_confirmed',sources:[source]}}}});
 const active=await objects.getObject(a.id,h.id,'object',object.id,{});assert(JSON.stringify(active).includes(secret),'positive control: the active source really exposes its citation');
 const moved=await trash.trash(a.id,h.id,doc.id,{expectedVersion:1},randomUUID());
 if(phase==='purge')await trash.purgeNow(a.id,h.id,doc.id,{expectedVersion:moved.entry.version},randomUUID());
 const shown=await objects.getObject(a.id,h.id,'object',object.id,{});
 assert.equal(shown.object.profile.fields.brand.value,brand,'the confirmed canonical value must stay');
 assert.equal(JSON.stringify(shown).includes(secret),false,'a confirmed value does not authorize reading the unavailable original excerpt');
});

for(const phase of ['trash','purge'])test('personal export preserves a confirmed object profile while omitting source citations after '+phase,{timeout:90000},async t=>{
 const {db,a,h,doc,storage,policy}=await setup(t),trash=new TrashService(db,storage,policy,clock),exporter=new PersonalExportService(db,policy);
 const brand='Synthetic exportable confirmed brand',source={documentId:doc.id,documentVersion:doc.original.version,sha256:doc.original.sha256,page:1,excerpt:brand,basis:'verified_text',region:null};
 const object=await db.homeObject.create({data:{accountId:a.id,homeId:h.id,name:'Synthetic exportable object',type:'appliance',profile:{brand:{value:brand,origin:'extraction_confirmed',sources:[source]}}}});
 const exported=async()=>JSON.parse((await exporter.export(a.id,h.id,async()=>{})).toString()).data.objects.find(row=>row.id===object.id);
 assert.equal((await exported()).profile.brand.value,brand,'positive control: the active confirmed profile is exported');
 const moved=await trash.trash(a.id,h.id,doc.id,{expectedVersion:1},randomUUID());
 if(phase==='purge')await trash.purgeNow(a.id,h.id,doc.id,{expectedVersion:moved.entry.version},randomUUID());
 const shown=await exported();assert(shown,'the object itself remains exported');
 assert.equal(shown.profile.brand?.value,brand,'confirmed profile values stay, even when the citation must disappear');
});
