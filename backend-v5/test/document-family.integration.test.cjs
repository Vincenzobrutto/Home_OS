require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {DocumentsService}=require('../dist/documents/documents.service'),{DocumentPolicy}=require('../dist/documents/access');
test('Famiglia indipendente dal tipo: fixture isolate, nessun file/AI modificato',async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();
 const a=await db.account.create({data:{name:'Family fixture',email:randomUUID()+'@example.test',passwordHash:'not-login'}}),b=await db.account.create({data:{name:'Other fixture',email:randomUUID()+'@example.test',passwordHash:'not-login'}}),home=await db.home.create({data:{name:'Casa famiglia sintetica',address:'Via test'}}),scope={accountId:a.id,homeId:home.id};
 await db.homeMembership.createMany({data:[a,b].map(x=>({accountId:x.id,homeId:home.id,role:'owner',validFrom:new Date(0)}))});
 const doc=await db.document.create({data:{homeId:home.id,uploaderId:a.id,name:'Fattura sintetica',visibility:'private',original:{create:{originalFilename:'fixture.pdf',mimeType:'application/pdf',byteSize:10,sha256:'a'.repeat(64),file:{create:{storageKey:randomUUID()+'.bin'}}}}},include:{original:true}});
 const org=await db.documentOrganization.create({data:{...scope,documentId:doc.id,documentVersion:1,documentSha256:doc.original.sha256,title:'Fattura sintetica',parts:[{kind:'invoice',pageFrom:null,pageTo:null}],collections:['purchases'],houseDocument:true}});
 const obj=await db.homeObject.create({data:{...scope,name:'Videocitofono sintetico',type:'other'}}),cost=await db.homeExpense.create({data:{...scope,title:'Spesa esistente',spentOn:'2026-01-01',amountCents:12345,documentId:doc.id}});
 const links=await Promise.all([{resourceType:'document',resourceId:doc.id,documentId:doc.id},{resourceType:'expense',resourceId:cost.id,expenseId:cost.id}].map(data=>db.objectResourceLink.create({data:{...scope,objectId:obj.id,...data}})));
 const s=new DocumentsService(db,{read(){throw Error('Metadata only');}},new DocumentPolicy(db));let version=org.version;
 const input=family=>({expectedOrganizationVersion:version,documentVersion:1,sha256:doc.original.sha256,family});
 const deny=(p,status)=>assert.rejects(p,e=>e.getStatus?.()===status);
 t.after(async()=>{await db.objectOnboardingRequest.deleteMany({where:{homeId:home.id}});await db.objectResourceLink.deleteMany({where:{homeId:home.id}});await db.homeExpense.delete({where:{id:cost.id}});await db.homeObject.delete({where:{id:obj.id}});await db.documentOrganization.delete({where:{id:org.id}});await db.documentVersion.deleteMany({where:{documentId:doc.id}});await db.document.delete({where:{id:doc.id}});await db.storedFile.delete({where:{id:doc.original.fileId}});await db.home.delete({where:{id:home.id}});await db.account.deleteMany({where:{id:{in:[a.id,b.id]}}});await db.$disconnect();});
 await t.test('Ogni famiglia cambia gruppi/conteggi mantenendo tipo, fonte, spesa e collegamenti',async()=>{
  for(const family of ['plans','building','energy','contracts','other']){
   const body=input(family),key=randomUUID(),result=await s.changeHouseFamily(a.id,home.id,doc.id,body,key);version=result.organization.version;
   assert.equal(result.effectiveFamily,family);assert.deepEqual(result.organization.parts,org.parts);assert.deepEqual(result.organization.collections,org.collections);assert.equal(result.organization.title,org.title);
   const list=await s.list(a.id,home.id,{limit:20,view:'house',group:family});assert.equal(list.items[0].id,doc.id);assert.equal(list.summary.groups[family],1);
   for(const other of ['plans','building','energy','contracts','other'].filter(x=>x!==family))assert.equal(list.summary.groups[other],0);
   assert.deepEqual(await s.changeHouseFamily(a.id,home.id,doc.id,body,key),result);await deny(s.changeHouseFamily(a.id,home.id,doc.id,{...body,family:null},key),409);
  }
  assert.deepEqual(await db.document.findUnique({where:{id:doc.id},include:{original:true}}),doc);assert.deepEqual(await db.homeExpense.findUnique({where:{id:cost.id}}),cost);for(const l of links)assert.deepEqual(await db.objectResourceLink.findUnique({where:{id:l.id}}),l);
  assert.equal((await s.list(a.id,home.id,{limit:20,view:'objects'})).items.length,1);assert.equal((await s.list(a.id,home.id,{limit:20,view:'all'})).items.length,1);
 });
 await t.test('Automatico ripristina la famiglia dal tipo; concorrenza senza sovrascritture',async()=>{
  const reset=await s.changeHouseFamily(a.id,home.id,doc.id,input(null),randomUUID());version=reset.organization.version;assert.equal(reset.effectiveFamily,'other');assert.equal(reset.organization.houseFamily,null);
  const results=await Promise.allSettled(['energy','building'].map(f=>s.changeHouseFamily(a.id,home.id,doc.id,input(f),randomUUID())));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.getStatus(),409);
  version=(await db.documentOrganization.findUnique({where:{id:org.id}})).version;
 });
 await t.test('Input, privacy, viewer, SHA e classificazione obsoleta sono rifiutati',async()=>{
  await deny(s.changeHouseFamily(a.id,home.id,doc.id,input('invoice'),randomUUID()),422);await deny(s.changeHouseFamily(a.id,home.id,doc.id,{...input('plans'),parts:[]},randomUUID()),422);
  await deny(s.changeHouseFamily(b.id,home.id,doc.id,input('plans'),randomUUID()),403);await deny(s.changeHouseFamily(a.id,home.id,doc.id,{...input('plans'),sha256:'b'.repeat(64)},randomUUID()),409);await deny(s.changeHouseFamily(a.id,home.id,doc.id,{...input('plans'),expectedOrganizationVersion:1},randomUUID()),409);
  await db.homeMembership.update({where:{accountId_homeId:{accountId:a.id,homeId:home.id}},data:{role:'viewer'}});await deny(s.changeHouseFamily(a.id,home.id,doc.id,input('plans'),randomUUID()),403);
 });
});
