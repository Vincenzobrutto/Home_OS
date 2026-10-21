require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {DocumentsService}=require('../dist/documents/documents.service'),{DocumentPolicy}=require('../dist/documents/access');
test('Document views: complete facets, current references, privacy and category keysets',async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();
 const accounts=await Promise.all(['A','B'].map(name=>db.account.create({data:{name:'Document views '+name,email:randomUUID()+'@example.test',passwordHash:'not-a-login'}})));
 const [a,b]=accounts.map(x=>x.id),home=await db.home.create({data:{name:'Document views isolated test',address:'Synthetic'}}),h=home.id;
 await db.homeMembership.createMany({data:[a,b].map(accountId=>({accountId,homeId:h,role:'owner',validFrom:new Date(0)}))});
 const ids=[],files=[],objects=[],scope={accountId:a,homeId:h};
 const service=new DocumentsService(db,{read(){throw Error('No file reads from views');}},new DocumentPolicy(db));
 const list=(query={},account=a)=>service.list(account,h,{limit:20,view:'all',...query});
 t.after(async()=>{
  await db.objectResourceLink.deleteMany({where:{homeId:h}});await db.homeExpense.deleteMany({where:{homeId:h}});
  await db.receiptObjectField.deleteMany({where:{homeId:h}});await db.homeObject.deleteMany({where:{id:{in:objects}}});
  await db.documentOrganization.deleteMany({where:{homeId:h}});await db.documentVersion.deleteMany({where:{documentId:{in:ids}}});
  await db.document.deleteMany({where:{id:{in:ids}}});await db.storedFile.deleteMany({where:{id:{in:files}}});
  await db.homeMembership.deleteMany({where:{homeId:h}});await db.home.delete({where:{id:h}});await db.account.deleteMany({where:{id:{in:[a,b]}}});await db.$disconnect();
 });
 async function doc(name,kind,collections=[],uploaderId=a,visibility='private',organize=true){
  const row=await db.document.create({data:{homeId:h,uploaderId,name,visibility,original:{create:{originalFilename:name+'.pdf',mimeType:'application/pdf',byteSize:100,sha256:'a'.repeat(64),file:{create:{storageKey:randomUUID()}}}}},include:{original:true}});
  ids.push(row.id);files.push(row.original.fileId);
  if(organize)await db.documentOrganization.create({data:{...scope,documentId:row.id,documentVersion:1,documentSha256:row.original.sha256,title:name,parts:[{kind}],collections}});
  return row;
 }
 const plans=[];for(let n=0;n<25;n++)plans.push(await doc('Plan '+n,'floor_plan',['building']));
 const building=await doc('CILA','cila',['building']),energy=await doc('APE','energy_certificate',['energy']);
 await doc('Purchase contract','contract',['contracts']);await doc('House rules','other',['unclassified']);
 const stale=await doc('Outdated organization','floor_plan',['building']);await db.documentOrganization.update({where:{accountId_homeId_documentId:{...scope,documentId:stale.id}},data:{documentSha256:'b'.repeat(64)}});
 const raw=await doc('Unconfirmed document','other',[],a,'private',false);
 const hidden=await doc('Private B','floor_plan',['building'],b);
 const shared=await doc('Shared B','other',[],b,'home',false);
 const obj=await db.homeObject.create({data:{...scope,name:'Synthetic electrical installation',type:'electrical'}});objects.push(obj.id);
 const direct=await doc('Electrical certificate','conformity_declaration',['technical']);
 await db.objectResourceLink.create({data:{...scope,objectId:obj.id,resourceType:'document',resourceId:direct.id,documentId:direct.id}});
 const invoice=await doc('Invoice','invoice',['purchases']);
 const expense=await db.homeExpense.create({data:{...scope,documentId:invoice.id,title:'Acconto synthetic expense',supplier:'Synthetic supplier',documentNumber:'14',documentDate:'2026-01-01',amountCents:100,spentOn:'2026-02-01'}});
 const expenseLink=await db.objectResourceLink.create({data:{...scope,objectId:obj.id,resourceType:'expense',resourceId:expense.id,expenseId:expense.id}});
 await db.homeExpense.create({data:{accountId:b,homeId:h,documentId:invoice.id,title:'Private other account expense',amountCents:999,spentOn:'2026-01-01'}});
 await db.objectResourceLink.create({data:{...scope,objectId:obj.id,resourceType:'document',resourceId:invoice.id,documentId:invoice.id}});
 await t.test('Rows deduplicate direct/expense references and expose only personal saved facts',async()=>{
  const row=(await list()).items.find(x=>x.id===invoice.id);
  assert.deepEqual(row.linkedObjects,[{id:obj.id,kind:'object',name:obj.name}]);
  assert.deepEqual(row.savedExpenses,[{id:expense.id,title:'Acconto synthetic expense',supplier:'Synthetic supplier',documentNumber:'14',documentDate:'2026-01-01',amountCents:100}]);
  assert.equal(row.name,'Invoice');
  await db.objectResourceLink.deleteMany({where:{documentId:invoice.id}});
 });
 await db.documentOrganization.update({where:{accountId_homeId_documentId:{...scope,documentId:plans[0].id}},data:{parts:[{kind:'floor_plan'},{kind:'ape'}],collections:['building','energy']}});
 await t.test('Facets are global before LIMIT; home overview returns groups, raw/stale stay only in All',async()=>{
  const page=await list();assert.equal(page.items.length,20);assert.deepEqual(page.summary,{views:{all:34,house:29,objects:2},groups:{plans:25,building:1,energy:1,contracts:1,other:1}});
  const overview=await list({view:'house'});assert.deepEqual(overview.items,[]);assert.equal(overview.nextCursor,null);assert.deepEqual(overview.summary,page.summary);
  const allIds=[];let cursor;do{const p=await list({cursor});allIds.push(...p.items.map(x=>x.id));cursor=p.nextCursor;}while(cursor);
  assert(!allIds.includes(hidden.id));assert(allIds.includes(raw.id)&&allIds.includes(stale.id)&&allIds.includes(shared.id));
 });
 await t.test('Category pagination preserves counts, never repeats files, binds cursor to view/group',async()=>{
  const first=await list({view:'house',group:'plans',limit:7});assert.equal(first.summary.groups.plans,25);
  const result=[...first.items];let cursor=first.nextCursor;while(cursor){const p=await list({view:'house',group:'plans',cursor,limit:9});result.push(...p.items);cursor=p.nextCursor;}
  assert.equal(result.length,25);assert.equal(new Set(result.map(x=>x.id)).size,25);
  for(const q of [{view:'house',group:'building'},{view:'all'},{view:'objects'},{view:'house',group:'plans',q:'different'}])await assert.rejects(list({...q,cursor:first.nextCursor}),e=>e.getStatus?.()===422);
 });
 await t.test('Search, explicit groups and personal ownership apply before counts; no owner leaks',async()=>{
  assert.equal((await list({q:'Plan 24'})).summary.views.all,1);
  assert.deepEqual((await list({view:'house',group:'building'})).items.map(x=>x.id),[building.id]);
  assert.deepEqual((await list({view:'house',group:'energy'})).items.map(x=>x.id),[energy.id]);
  assert.equal((await list({},b)).summary.views.all,2);assert.equal((await list({},b)).summary.views.house,0);
  assert.deepEqual(new Set((await list({view:'objects'})).items.map(x=>x.id)),new Set([direct.id,invoice.id]));
 });
 await t.test('Removed reference no longer classifies invoice as object; membership revocation denies facets',async()=>{
  await db.objectResourceLink.update({where:{id:expenseLink.id},data:{state:'removed'}});
  assert.equal((await list()).summary.views.objects,1);assert.equal((await list()).summary.views.house,30);
  await db.receiptObjectField.create({data:{...scope,objectId:obj.id,fieldKey:'name',value:'Name from inaccessible source',origin:'extraction_confirmed',documentId:hidden.id,documentVersion:1,documentSha256:'a'.repeat(64),sources:[{documentId:hidden.id,page:1,excerpt:'Synthetic name'}]}});
  assert.equal((await list()).summary.views.objects,0,'Unreadable object sources must not classify or count references');
  const row=(await list()).items.find(x=>x.id===direct.id);assert.deepEqual(row.linkedObjects,[],'Unreadable object name must not leak in row context');
  await db.homeMembership.update({where:{accountId_homeId:scope},data:{revokedAt:new Date()}});
  await assert.rejects(list(),e=>e.getStatus?.()===403);
 });
});
