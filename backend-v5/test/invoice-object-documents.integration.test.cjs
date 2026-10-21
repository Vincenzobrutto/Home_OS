require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service');
const {ReviewService}=require('../dist/review/review.service');
const {HomeObjectsService}=require('../dist/home-objects/home-objects.service');
const {ExpensesService}=require('../dist/expenses/expenses.service');

test('invoice documents follow costs, deduplicate explicit links, respect privacy and paginate',async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaService();await db.$connect();
 const accounts=[],homes=[],files=[];const review=new ReviewService(db,{}),objects=new HomeObjectsService(db,review),expenses=new ExpensesService(db,review,{now:()=>new Date('2026-10-21T12:00:00Z')});
 t.after(async()=>{const where={accountId:{in:accounts}};for(const model of ['objectEvent','objectRequest','objectResourceLink','objectPosition','receiptObjectField','expenseHistory','expenseRequest'])await db[model].deleteMany({where});await db.homeExpense.deleteMany({where});await db.homeObject.deleteMany({where});await db.documentVersion.deleteMany({where:{document:{homeId:{in:homes}}}});await db.document.deleteMany({where:{homeId:{in:homes}}});await db.storedFile.deleteMany({where:{id:{in:files}}});await db.homeMembership.deleteMany({where:{homeId:{in:homes}}});await db.home.deleteMany({where:{id:{in:homes}}});await db.account.deleteMany({where:{id:{in:accounts}}});await db.$disconnect()});
 for(const name of ['owner','other']){const row=await db.account.create({data:{name:'SYNTHETIC invoice '+name,email:randomUUID()+'@example.test',passwordHash:'not-login'}});accounts.push(row.id)}
 const [a,b]=accounts,h=(await db.home.create({data:{name:'SYNTHETIC invoice-only test',address:'Test'}})).id;homes.push(h);
 for(const accountId of accounts)await db.homeMembership.create({data:{accountId,homeId:h,role:'owner',validFrom:new Date(0)}});
 const object=(await objects.createObject(a,h,{name:'Synthetic installation',type:'electrical',roomIds:[]},randomUUID())).object;
 const other=(await objects.createObject(a,h,{name:'Another installation',type:'electrical',roomIds:[]},randomUUID())).object;
 const docs=[];for(const number of [1,2]){const d=await db.document.create({data:{homeId:h,uploaderId:a,name:'Synthetic invoice '+number,visibility:'private',original:{create:{originalFilename:'synthetic.pdf',mimeType:'application/pdf',byteSize:10,sha256:String(number).repeat(64),file:{create:{storageKey:randomUUID()+'.bin'}}}}},include:{original:true}});docs.push(d);files.push(d.original.fileId)}
 const costs=[];for(let i=0;i<2;i++){const key=randomUUID(),body={title:i?'Saldo · Synthetic':'Acconto · Synthetic',category:'repairs_works',amountCents:10000,spentOn:i?'2026-07-08':'2026-06-16',documentId:docs[i].id,objectRef:object.ref};const first=await expenses.mutate(a,h,'create','',body,key,true);assert.equal((await expenses.mutate(a,h,'create','',body,key,true)).expense.id,first.expense.id);costs.push(first.expense)}
 const list=()=>objects.links(a,h,'object',object.ref.id,{resourceType:'document'});
 assert.equal((await list()).items.length,2);assert.equal(await db.homeExpense.count({where:{homeId:h}}),2);assert.equal(await db.document.count({where:{homeId:h}}),2);
 const linkedCosts=(await objects.links(a,h,'object',object.ref.id,{resourceType:'expense'})).items;assert.deepEqual(new Set(linkedCosts.map(x=>x.resource.document.id)),new Set(docs.map(x=>x.id)));
 await objects.addLink(a,h,'object',object.ref.id,{resourceType:'document',resourceId:docs[0].id},randomUUID());assert.equal((await list()).items.length,2,'explicit plus derived source appears once');
 const first=await objects.links(a,h,'object',object.ref.id,{resourceType:'document',limit:'1'}),second=await objects.links(a,h,'object',object.ref.id,{resourceType:'document',limit:'1',cursor:first.nextCursor});assert.equal(new Set([...first.items,...second.items].map(x=>x.resource.id)).size,2);
 await db.document.update({where:{id:docs[1].id},data:{uploaderId:b}});assert.equal((await list()).items.length,1,'private source transferred to another account is hidden');assert.equal((await objects.links(a,h,'object',object.ref.id,{resourceType:'expense'})).items.find(x=>x.resource.id===costs[1].id).resource.document,null);
 await db.document.update({where:{id:docs[1].id},data:{uploaderId:a}});
 await assert.rejects(expenses.mutate(a,h,'update',costs[1].id,{expectedVersion:costs[1].version,objectRef:other.ref},randomUUID(),true));
 const removed=await expenses.mutate(a,h,'update',costs[1].id,{expectedVersion:costs[1].version,objectRef:null},randomUUID(),true);
 const updated=await expenses.mutate(a,h,'update',costs[1].id,{expectedVersion:removed.expense.version,objectRef:other.ref},randomUUID(),true);assert.equal((await list()).items.length,1);assert.equal((await objects.links(a,h,'object',other.ref.id,{resourceType:'document'})).items[0].resource.id,docs[1].id);
 await expenses.mutate(a,h,'archive',costs[1].id,{expectedVersion:updated.expense.version},randomUUID(),true);assert.equal((await objects.links(a,h,'object',other.ref.id,{resourceType:'document'})).items.length,0,'archived cost does not leave a stale derived document link');
});
