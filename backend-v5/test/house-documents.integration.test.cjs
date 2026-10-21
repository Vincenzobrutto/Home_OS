require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {HomeObjectsService}=require('../dist/home-objects/home-objects.service'),{ReviewService}=require('../dist/review/review.service');
const {DocumentsService}=require('../dist/documents/documents.service'),{DocumentPolicy}=require('../dist/documents/access');

test('Conserva documenti nella casa: transazione su sole fixture, nessun worker AI',async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();
 const a=await db.account.create({data:{name:'Fixture casa',email:randomUUID()+'@example.test',passwordHash:'not-login'}});
 const b=await db.account.create({data:{name:'Fixture altro',email:randomUUID()+'@example.test',passwordHash:'not-login'}});
 const home=await db.home.create({data:{name:'Casa sintetica',address:'Via test'}}),h=home.id;
 await db.homeMembership.createMany({data:[a,b].map(x=>({accountId:x.id,homeId:h,role:'owner',validFrom:new Date(0)}))});
 const s=new HomeObjectsService(db,new ReviewService(db,{})),files=[];
 const documents=new DocumentsService(db,{read:()=>{throw Error('No original reads in metadata conversion');}},new DocumentPolicy(db));
 const rejected=(promise,status,code)=>assert.rejects(promise,e=>e.getStatus?.()===status&&(!code||e.getResponse().code===code));
 t.after(async()=>{
  for(const model of ['objectEvent','objectRequest','objectResourceLink','objectPosition','receiptObjectField','homeObject','homeRoom','expenseHistory','expenseRequest','homeExpense','activityHistory','activityRequest','homeActivity','objectOnboardingRequest','documentOrganization']){
   const accountOnly=['expenseHistory','expenseRequest','activityHistory','activityRequest'].includes(model);
   await db[model].deleteMany({where:accountOnly?{accountId:{in:[a.id,b.id]}}:{homeId:h}});
  }
  const docs=await db.document.findMany({where:{homeId:h},select:{id:true}});
  await db.documentVersion.deleteMany({where:{documentId:{in:docs.map(d=>d.id)}}});await db.document.deleteMany({where:{homeId:h}});await db.storedFile.deleteMany({where:{id:{in:files}}});
  await db.home.delete({where:{id:h}});await db.account.deleteMany({where:{id:{in:[a.id,b.id]}}});await db.$disconnect();
 });
 async function fixture(){
  const room=(await s.createRoom(a.id,h,{name:'Stanza test',type:'other'},randomUUID())).room;
  const obj=(await s.createObject(a.id,h,{name:'Scheda creata per errore',type:'other',roomIds:[room.id]},randomUUID())).object;
  const doc=await db.document.create({data:{homeId:h,uploaderId:a.id,name:'APE sintetico',visibility:'private',original:{create:{originalFilename:'test.pdf',mimeType:'application/pdf',byteSize:10,sha256:'a'.repeat(64),file:{create:{storageKey:randomUUID()+'.bin'}}}}},include:{original:true}});files.push(doc.original.fileId);
  await s.addLink(a.id,h,'object',obj.ref.id,{resourceType:'document',resourceId:doc.id},randomUUID());
  const cost=await db.homeExpense.create({data:{accountId:a.id,homeId:h,title:'Spesa sintetica',amountCents:12345,spentOn:'2026-01-01',documentId:doc.id}});
  await s.addLink(a.id,h,'object',obj.ref.id,{resourceType:'expense',resourceId:cost.id},randomUUID());
  return {obj,doc,cost,room};
 }
 const body=(plan,archiveObject=false)=>({expectedToken:plan.token,documentIds:plan.documents.map(d=>d.id),archiveObject});
 await t.test('Anteprima senza scritture; conserva file/importi, rimuove riferimenti e mantiene la stanza',async()=>{
  const {obj,doc,cost,room}=await fixture(),events=await db.objectEvent.count({where:{homeId:h}});
  const plan=await s.houseDocuments(a.id,h,obj.ref.id);assert.equal(plan.documents.length,1);assert.equal(plan.documents[0].expenses[0].amountCents,12345);assert.equal(plan.documents[0].reason,null);
  assert.equal(await db.objectEvent.count({where:{homeId:h}}),events);
  const key=randomUUID(),input=body(plan),reply=await s.keepHouseDocuments(a.id,h,obj.ref.id,input,key);
  assert.deepEqual(reply,{documentIds:[doc.id],archivedObject:false});
  assert.deepEqual(await db.document.findUnique({where:{id:doc.id},include:{original:true}}),doc);
  const after=await db.homeExpense.findUnique({where:{id:cost.id}});assert.deepEqual({...after,version:cost.version,updatedAt:cost.updatedAt},cost);assert.equal(after.version,cost.version+1);
  assert.equal(await db.homeExpense.count({where:{documentId:doc.id}}),1);
  const kept=await s.getObject(a.id,h,'object',obj.ref.id,{});assert.equal(kept.object.state,'active');assert.equal(kept.object.position.rooms[0].id,room.id);
  assert.equal(await db.objectResourceLink.count({where:{objectId:obj.ref.id,state:'active'}}),0);
  assert.equal((await db.documentOrganization.findFirst({where:{documentId:doc.id}})).title,doc.name);
  const house=await documents.list(a.id,h,{limit:50,view:'house',group:'other'});assert(house.items.some(d=>d.id===doc.id));
  const objects=await documents.list(a.id,h,{limit:50,view:'objects'});assert(!objects.items.some(d=>d.id===doc.id));
  const histories=await db.expenseHistory.count({where:{expenseId:cost.id}});
  assert.deepEqual(await s.keepHouseDocuments(a.id,h,obj.ref.id,input,key),reply);assert.equal(await db.expenseHistory.count({where:{expenseId:cost.id}}),histories);
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,{...input,archiveObject:true},key),409,'idempotency_conflict');
  await db.document.update({where:{id:doc.id},data:{uploaderId:b.id}});await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,input,key),403);
 });
 await t.test('Archivio facoltativo ripristinabile e classificazione esistente conservata',async()=>{
  const {obj,doc}=await fixture();
  const org=await db.documentOrganization.create({data:{accountId:a.id,homeId:h,documentId:doc.id,documentVersion:1,documentSha256:doc.original.sha256,title:'APE già classificato',parts:[{kind:'other',pageFrom:null,pageTo:null}],collections:['unclassified']}});
  const plan=await s.houseDocuments(a.id,h,obj.ref.id),input=body(plan,true),key=randomUUID();
  await s.keepHouseDocuments(a.id,h,obj.ref.id,input,key);await s.keepHouseDocuments(a.id,h,obj.ref.id,input,key);
  assert.deepEqual(await db.documentOrganization.findUnique({where:{id:org.id}}),org);
  const after=(await s.getObject(a.id,h,'object',obj.ref.id,{})).object;assert.equal(after.state,'archived');assert.equal(after.position.rooms.length,0);
  assert((await s.history(a.id,h,'object',obj.ref.id,{})).items.some(e=>e.kind==='position_updated'));
  const restored=await s.objectAction(a.id,h,obj.ref.id,'restore',{expectedVersion:after.version},randomUUID());assert.equal(restored.object.state,'active');
 });
 await t.test('Token scaduto, attività residue e documenti multioggetto: nessuna modifica parziale',async()=>{
  const {obj,doc,cost}=await fixture(),plan=await s.houseDocuments(a.id,h,obj.ref.id);
  await db.homeExpense.update({where:{id:cost.id},data:{version:{increment:1}}});
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,body(plan),randomUUID()),409,'house_documents_changed');
  const activity=await db.homeActivity.create({data:{accountId:a.id,homeId:h,title:'Attività test',dueDate:'2026-01-01'}});
  await s.addLink(a.id,h,'object',obj.ref.id,{resourceType:'activity',resourceId:activity.id},randomUUID());
  const next=await s.houseDocuments(a.id,h,obj.ref.id);assert(next.archiveBlocked);
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,body(next,true),randomUUID()),409,'object_has_other_resources');
  assert.equal(await db.objectResourceLink.count({where:{objectId:obj.ref.id,state:'active'}}),3);
  const other=(await s.createObject(a.id,h,{name:'Altro oggetto',type:'other'},randomUUID())).object;
  await s.addLink(a.id,h,'object',other.ref.id,{resourceType:'document',resourceId:doc.id},randomUUID());
  const blocked=await s.houseDocuments(a.id,h,obj.ref.id);assert(blocked.documents[0].reason.includes('altri collegamenti'));
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,body(blocked),randomUUID()),409,'house_documents_unavailable');
 });
 await t.test('Elaborazione automatica pendente, privacy, viewer e replay con permessi revocati',async()=>{
  const {obj,doc}=await fixture();
  await db.objectOnboardingRequest.create({data:{accountId:a.id,homeId:h,operation:'automatic-intake-v1',target:randomUUID(),key:randomUUID(),digest:'a'.repeat(64),response:{finished:false,entries:[{documentId:doc.id,state:'waiting'}]}}});
  const blocked=await s.houseDocuments(a.id,h,obj.ref.id);assert(blocked.documents[0].reason.includes('elaborazione'));
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,body(blocked),randomUUID()),409);
  await rejected(s.houseDocuments(b.id,h,obj.ref.id),403);
  await db.document.update({where:{id:doc.id},data:{uploaderId:b.id}});const privatePlan=await s.houseDocuments(a.id,h,obj.ref.id);assert.equal(privatePlan.documents.length,0);assert(privatePlan.unavailable);
  assert(!JSON.stringify(privatePlan).includes(doc.name));
  await db.homeMembership.update({where:{accountId_homeId:{accountId:a.id,homeId:h}},data:{role:'viewer'}});
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,body(blocked),randomUUID()),403);
 });
});
