require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {DocumentsService}=require('../dist/documents/documents.service'),{DocumentPolicy}=require('../dist/documents/access');
test('Document workspace: persisted workflow before pagination and safe canonical removal',async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();
 const a=await db.account.create({data:{name:'Synthetic workspace',email:randomUUID()+'@example.test',passwordHash:'not-login'}}),b=await db.account.create({data:{name:'Other',email:randomUUID()+'@example.test',passwordHash:'not-login'}}),h=await db.home.create({data:{name:'Synthetic workspace',address:'Test'}});
 await db.homeMembership.createMany({data:[a,b].map(x=>({homeId:h.id,accountId:x.id,role:'owner'}))});
 const fileIds=[],removed=[],service=new DocumentsService(db,{remove:async k=>removed.push(k)},new DocumentPolicy(db));
 t.after(async()=>{const where={homeId:h.id};await db.objectOnboardingRequest.deleteMany({where});await db.objectOnboardingJob.deleteMany({where});await db.objectOnboardingDraft.deleteMany({where});await db.documentOrganization.deleteMany({where});await db.documentIntakeItem.deleteMany({where:{batch:where}});await db.documentIntakeBatch.deleteMany({where});await db.uploadRequest.deleteMany({where});await db.documentVersion.deleteMany({where:{document:where}});await db.document.deleteMany({where});await db.storedFile.deleteMany({where:{id:{in:fileIds}}});await db.homeMembership.deleteMany({where});await db.home.delete({where:{id:h.id}});await db.account.deleteMany({where:{id:{in:[a.id,b.id]}}});await db.$disconnect();});
 async function doc(name){const d=await db.document.create({data:{homeId:h.id,uploaderId:a.id,name,original:{create:{originalFilename:name+'.pdf',mimeType:'application/pdf',byteSize:100,sha256:'a'.repeat(64),file:{create:{storageKey:randomUUID()+'.bin'}}}}},include:{original:true}});fileIds.push(d.original.fileId);return d;}
 const plan=await doc('Planimetria'),invoice=await doc('Fattura'),object=await doc('Oggetto'),fresh=await doc('Sbagliato');
 for(const [d,kind,collection] of [[plan,'floor_plan','building'],[invoice,'invoice','purchases']])await db.documentOrganization.create({data:{accountId:a.id,homeId:h.id,documentId:d.id,documentVersion:1,documentSha256:'a'.repeat(64),title:d.name,parts:[{kind,pageFrom:null,pageTo:null}],collections:[collection]}});
 await db.objectOnboardingDraft.create({data:{accountId:a.id,homeId:h.id,documentId:object.id,documentVersion:1,documentSha256:'a'.repeat(64),mode:'manual',state:'confirmed',output:{}}});
 await db.objectOnboardingJob.create({data:{accountId:a.id,homeId:h.id,documentId:object.id,documentVersion:1,documentSha256:'a'.repeat(64),mimeType:'application/pdf',provider:'fixture',consentToProviderTransfer:false,state:'uncertain',key:randomUUID(),digest:'c'.repeat(64),updatedAt:new Date('2020-01-01')}});
 const list=(workflow,cursor)=>service.list(a.id,h.id,{limit:1,workflow,...cursor?{cursor}:{}});
 await t.test('Da completare and Completati use the canonical list before keyset pagination',async()=>{let cursor,all=[];do{const r=await list('pending',cursor);all.push(...r.items.map(d=>d.id));cursor=r.nextCursor;}while(cursor);assert.deepEqual(new Set(all),new Set([invoice.id,fresh.id]));const completed=await service.list(a.id,h.id,{limit:20,workflow:'completed'});assert.deepEqual(new Set(completed.items.map(d=>d.id)),new Set([plan.id,object.id]));const pending=await list('pending');await assert.rejects(list('completed',pending.nextCursor));});
 await t.test('Workflow labels match filters, current source, personal drafts and latest job',async()=>{
  const inProgress=await doc('In analisi'),ready=await doc('Proposta'),failed=await doc('Errore');
  const source=d=>({accountId:a.id,homeId:h.id,documentId:d.id,documentVersion:1,documentSha256:'a'.repeat(64)});
  await db.objectOnboardingJob.createMany({data:[[inProgress,'running'],[failed,'failed']].map(([d,state])=>({...source(d),mimeType:'application/pdf',provider:'fixture',consentToProviderTransfer:false,state,key:randomUUID(),digest:'c'.repeat(64)}))});
  await db.objectOnboardingDraft.create({data:{...source(ready),mode:'extraction',output:{}}});
  const rows=(await service.list(a.id,h.id,{limit:20})).items;
  const state=d=>rows.find(r=>r.id===d.id).workflowState;
  assert.equal(state(plan),'completed');assert.equal(state(object),'completed');assert.equal(state(invoice),'to_compile');assert.equal(state(fresh),'to_compile');assert.equal(state(inProgress),'analyzing');assert.equal(state(ready),'review');assert.equal(state(failed),'attention');
  await db.document.update({where:{id:plan.id},data:{visibility:'home'}});
  assert.equal((await service.list(b.id,h.id,{limit:20})).items.find(d=>d.id===plan.id).workflowState,'to_compile');
  await db.document.update({where:{id:plan.id},data:{visibility:'private'}});
 });
 await t.test('A new open revision returns a previously completed document to Da completare',async()=>{await db.objectOnboardingDraft.create({data:{accountId:a.id,homeId:h.id,documentId:object.id,documentVersion:1,documentSha256:'a'.repeat(64),mode:'manual',output:{}}});assert((await service.list(a.id,h.id,{limit:20,workflow:'pending'})).items.some(d=>d.id===object.id));});
 await t.test('Delete removes all disposable upload references, original, and supports durable replay',async()=>{for(let i=0;i<2;i++)await db.documentIntakeBatch.create({data:{accountId:a.id,homeId:h.id,key:randomUUID(),digest:'b'.repeat(64),totalBytes:100,items:{create:{clientItemId:randomUUID(),ordinal:0,filename:'Sbagliato.pdf',byteSize:100,mimeType:'application/pdf',uploadState:i?'duplicate':'stored',documentId:fresh.id,documentVersion:1,documentSha256:'a'.repeat(64)}}}});assert.equal((await service.removalCapability(a.id,h.id,fresh.id)).allowed,true);await assert.rejects(service.removalCapability(b.id,h.id,fresh.id),e=>e.getStatus()===403);await assert.rejects(service.remove(a.id,h.id,fresh.id,{expectedVersion:2},randomUUID()),e=>e.getStatus()===409);const key=randomUUID();assert.deepEqual(await service.remove(a.id,h.id,fresh.id,{expectedVersion:1},key),{removed:true});assert.deepEqual(await service.remove(a.id,h.id,fresh.id,{expectedVersion:1},key),{removed:true});assert.equal(await db.document.count({where:{id:fresh.id}}),0);assert.equal(await db.documentIntakeItem.count({where:{documentId:fresh.id}}),0);assert.equal(removed.length,2);});
 await t.test('Linked or revised sources remain intact, viewer cannot remove',async()=>{assert.equal((await service.removalCapability(a.id,h.id,object.id)).allowed,false);await assert.rejects(service.remove(a.id,h.id,object.id,{expectedVersion:1},randomUUID()),e=>e.getStatus()===409);assert(await db.document.findUnique({where:{id:object.id}}));await db.homeMembership.update({where:{accountId_homeId:{accountId:a.id,homeId:h.id}},data:{role:'viewer'}});await assert.rejects(service.removalCapability(a.id,h.id,invoice.id),e=>e.getStatus()===403);});
 await t.test('workflow summary counts all pages with list-equivalent states and privacy, including viewer and revocation',async()=>{
  for(let i=0;i<55;i++)await doc('Aggregate '+i);
  const counts={to_compile:0,review:0,analyzing:0,attention:0,completed:0};let cursor;
  do{const page=await service.list(a.id,h.id,{limit:20,...cursor?{cursor}:{}});for(const item of page.items)counts[item.workflowState]++;cursor=page.nextCursor;}while(cursor);
  assert.deepEqual((await service.workflowSummary(a.id,h.id,{})).counts,counts);assert(counts.to_compile>50);
  for(const workflow of ['to_compile','review']){
   const page=await service.list(a.id,h.id,{limit:50,workflow});assert(page.items.every(item=>item.workflowState===workflow));assert.equal(page.items.length,Math.min(50,counts[workflow]));
  }
  assert.deepEqual((await service.workflowSummary(b.id,h.id,{})).counts,{to_compile:0,review:0,analyzing:0,attention:0,completed:0});
  await assert.rejects(service.workflowSummary(a.id,h.id,{q:'ignored'}));
  await db.document.update({where:{id:plan.id},data:{visibility:'home'}});assert.equal((await service.workflowSummary(b.id,h.id,{})).counts.to_compile,1);
  await db.document.update({where:{id:plan.id},data:{visibility:'private'}});
  await db.documentVersion.updateMany({where:{documentId:plan.id},data:{sha256:'b'.repeat(64)}});const changed=(await service.workflowSummary(a.id,h.id,{})).counts;assert.equal(changed.completed,counts.completed-1);assert.equal(changed.to_compile,counts.to_compile+1);
  await db.documentVersion.updateMany({where:{documentId:plan.id},data:{sha256:'a'.repeat(64)}});
  await db.homeMembership.delete({where:{accountId_homeId:{accountId:b.id,homeId:h.id}}});await assert.rejects(service.workflowSummary(b.id,h.id,{}));
 });

});

