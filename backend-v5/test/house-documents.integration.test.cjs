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
  await db.boilerAsset.deleteMany({where:{homeId:h}});
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
 const body=(plan,archiveObject=true)=>({expectedToken:plan.token,documentIds:plan.documents.map(d=>d.id),archiveObject});
 await t.test('Anteprima senza scritture; conserva file/importi e rimuove la scheda dagli attivi e dalle stanze',async()=>{
  const {obj,doc,cost,room}=await fixture(),events=await db.objectEvent.count({where:{homeId:h}});
  const plan=await s.houseDocuments(a.id,h,obj.ref.id);assert.equal(plan.documents.length,1);assert.equal(plan.documents[0].expenses[0].amountCents,12345);assert.equal(plan.documents[0].reason,null);
  assert.equal(await db.objectEvent.count({where:{homeId:h}}),events);
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,body(plan,false),randomUUID()),422);
  const key=randomUUID(),input=body(plan),reply=await s.keepHouseDocuments(a.id,h,obj.ref.id,input,key);
  assert.deepEqual(reply,{documentIds:[doc.id],archivedObject:true});
  assert.deepEqual(await db.document.findUnique({where:{id:doc.id},include:{original:true}}),doc);
  const after=await db.homeExpense.findUnique({where:{id:cost.id}});assert.deepEqual({...after,version:cost.version,updatedAt:cost.updatedAt},cost);assert.equal(after.version,cost.version+1);
  assert.equal(await db.homeExpense.count({where:{documentId:doc.id}}),1);
  const kept=await s.getObject(a.id,h,'object',obj.ref.id,{});assert.equal(kept.object.state,'archived');assert.equal(kept.object.position.rooms.length,0);
  assert(!(await s.objects(a.id,h,{})).items.some(o=>o.ref.id===obj.ref.id));assert.equal((await db.homeRoom.findUnique({where:{id:room.id}})).state,'active');
  assert.equal(await db.objectResourceLink.count({where:{objectId:obj.ref.id,state:'active'}}),0);
  assert.equal((await db.documentOrganization.findFirst({where:{documentId:doc.id}})).title,doc.name);
  const house=await documents.list(a.id,h,{limit:50,view:'house',group:'other'});assert(house.items.some(d=>d.id===doc.id));
  const objects=await documents.list(a.id,h,{limit:50,view:'objects'});assert(!objects.items.some(d=>d.id===doc.id));
  const histories=await db.expenseHistory.count({where:{expenseId:cost.id}});
  assert.deepEqual(await s.keepHouseDocuments(a.id,h,obj.ref.id,input,key),reply);assert.equal(await db.expenseHistory.count({where:{expenseId:cost.id}}),histories);
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,{...input,archiveObject:false},key),409,'idempotency_conflict');
  await db.document.update({where:{id:doc.id},data:{uploaderId:b.id}});await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,input,key),403);
 });
 await t.test('Archivio automatico ripristinabile e classificazione esistente conservata',async()=>{
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
  const blocked=await s.houseDocuments(a.id,h,obj.ref.id);assert.equal(blocked.documents[0].reason,null);assert.equal(blocked.documents[0].relatedObjects[0].name,'Altro oggetto');
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,body(blocked),randomUUID()),409,'related_objects_confirmation_required');
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,{...body(blocked),detachRelatedObjects:true},randomUUID()),409,'object_has_other_resources');
 });
 await t.test('Acconto e saldo multioggetto: una conferma esplicita, stessi documenti/costi, altre schede conservate',async()=>{
  const {obj,doc,cost}=await fixture();
  const component=(await s.createObject(a.id,h,{name:'Componente sintetico',type:'other'},randomUUID())).object;
  await s.addLink(a.id,h,'object',component.ref.id,{resourceType:'document',resourceId:doc.id},randomUUID());
  const second=await db.document.create({data:{homeId:h,uploaderId:a.id,name:'Fattura saldo sintetica',visibility:'private',original:{create:{originalFilename:'saldo.pdf',mimeType:'application/pdf',byteSize:10,sha256:'b'.repeat(64),file:{create:{storageKey:randomUUID()+'.bin'}}}}},include:{original:true}});files.push(second.original.fileId);
  await s.addLink(a.id,h,'object',obj.ref.id,{resourceType:'document',resourceId:second.id},randomUUID());
  const saldo=await db.homeExpense.create({data:{accountId:a.id,homeId:h,title:'Saldo sintetico',amountCents:12345,spentOn:'2026-02-01',documentId:second.id}});
  await s.addLink(a.id,h,'object',component.ref.id,{resourceType:'expense',resourceId:saldo.id},randomUUID());
  const org=await db.documentOrganization.create({data:{accountId:a.id,homeId:h,documentId:second.id,documentVersion:1,documentSha256:second.original.sha256,title:'Fattura saldo sintetica',parts:[{kind:'invoice',pageFrom:null,pageTo:null}],collections:['purchases']}});
  let plan=await s.houseDocuments(a.id,h,obj.ref.id);assert.equal(plan.documents.length,2);assert(plan.documents.every(d=>d.reason===null));assert(plan.documents.some(d=>d.expenses.some(e=>e.id===saldo.id)));
  await db.homeObject.update({where:{id:component.ref.id},data:{name:'Componente rinominato',version:{increment:1}}});
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,{...body(plan),detachRelatedObjects:true},randomUUID()),409,'house_documents_changed');
  plan=await s.houseDocuments(a.id,h,obj.ref.id);
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,body(plan),randomUUID()),409,'related_objects_confirmation_required');
  const input={...body(plan),detachRelatedObjects:true},key=randomUUID(),reply=await s.keepHouseDocuments(a.id,h,obj.ref.id,input,key);
  assert(reply.archivedObject);assert.deepEqual(await db.documentOrganization.findUnique({where:{id:org.id}}),org);
  for(const before of [cost,saldo]){const after=await db.homeExpense.findUnique({where:{id:before.id}});assert.deepEqual({...after,updatedAt:before.updatedAt,version:before.version},before);assert.equal(after.version,before.version+1);}
  assert.equal(await db.homeExpense.count({where:{documentId:{in:[doc.id,second.id]}}}),2);
  assert.equal((await s.getObject(a.id,h,'object',component.ref.id,{})).object.state,'active');
  assert.equal(await db.objectResourceLink.count({where:{state:'active',OR:[{documentId:{in:[doc.id,second.id]}},{expenseId:{in:[cost.id,saldo.id]}}]}}),0);
  const house=await documents.list(a.id,h,{limit:50,view:'house',group:'other'});assert([doc.id,second.id].every(id=>house.items.some(d=>d.id===id)));
  const count=await db.expenseHistory.count({where:{expenseId:{in:[cost.id,saldo.id]}}});assert.equal(count,2);assert.deepEqual(await s.keepHouseDocuments(a.id,h,obj.ref.id,input,key),reply);assert.equal(await db.expenseHistory.count({where:{expenseId:{in:[cost.id,saldo.id]}}}),count);
  assert((await s.history(a.id,h,'object',component.ref.id,{})).items.some(e=>e.kind==='unlinked'));
 });
 await t.test('Fonte privata di un’altra scheda e riferimenti nativi: nessun aggiramento o nome esposto',async()=>{
  const {obj,doc}=await fixture();
  const hidden=(await s.createObject(a.id,h,{name:'Nome riservato da non esporre',type:'other'},randomUUID())).object;
  await s.addLink(a.id,h,'object',hidden.ref.id,{resourceType:'document',resourceId:doc.id},randomUUID());
  const proof=await db.document.create({data:{homeId:h,uploaderId:b.id,name:'Fonte riservata',visibility:'private',original:{create:{originalFilename:'private.pdf',mimeType:'application/pdf',byteSize:10,sha256:'c'.repeat(64),file:{create:{storageKey:randomUUID()+'.bin'}}}}},include:{original:true}});files.push(proof.original.fileId);
  await db.receiptObjectField.create({data:{accountId:a.id,homeId:h,objectId:hidden.ref.id,fieldKey:'name',value:'Nome riservato da non esporre',origin:'extraction_confirmed',documentId:proof.id,documentVersion:1,documentSha256:proof.original.sha256,sources:[{documentId:proof.id,page:1,excerpt:'Nome riservato da non esporre'}]}});
  const privatePlan=await s.houseDocuments(a.id,h,obj.ref.id);assert(privatePlan.documents[0].reason.includes('non è consultabile'));assert.equal(privatePlan.documents[0].relatedObjects.length,0);assert(!JSON.stringify(privatePlan).includes('Nome riservato'));
  await rejected(s.keepHouseDocuments(a.id,h,obj.ref.id,{...body(privatePlan),detachRelatedObjects:true},randomUUID()),409,'house_documents_unavailable');
  const second=await fixture(),boiler=await db.boilerAsset.create({data:{accountId:a.id,homeId:h,name:'Caldaia sintetica'}});
  await s.addLink(a.id,h,'boiler',boiler.id,{resourceType:'document',resourceId:second.doc.id},randomUUID());
  const nativePlan=await s.houseDocuments(a.id,h,second.obj.ref.id);assert(nativePlan.documents[0].reason.includes('caldaia'));
  await rejected(s.keepHouseDocuments(a.id,h,second.obj.ref.id,{...body(nativePlan),detachRelatedObjects:true},randomUUID()),409,'house_documents_unavailable');
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
