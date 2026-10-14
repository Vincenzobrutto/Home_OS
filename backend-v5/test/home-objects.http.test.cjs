require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),cookieParser=require('cookie-parser');
const {InfrastructureModule}=require('../dist/app.module'),{AuthModule}=require('../dist/auth/auth.module'),{HomesModule}=require('../dist/homes/homes.module'),{DocumentsModule}=require('../dist/documents/documents.module');
const {PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service'),{LocalFileStorage}=require('../dist/documents/storage'),{ApiErrorFilter}=require('../dist/main');
const {HomeObjectsController}=require('../dist/home-objects/home-objects.controller'),{HomeObjectsService}=require('../dist/home-objects/home-objects.service'),{ReviewService}=require('../dist/review/review.service');
const {ExpensesController}=require('../dist/expenses/expenses.controller'),{ExpensesService}=require('../dist/expenses/expenses.service');
const {pdf}=require('./document-fixtures.cjs');class G1Harness{}
Module({imports:[InfrastructureModule,AuthModule,HomesModule,DocumentsModule],controllers:[HomeObjectsController,ExpensesController],providers:[
 {provide:HomeObjectsService,useFactory:db=>new HomeObjectsService(db,new ReviewService(db,{})),inject:[PrismaService]},
 {provide:ExpensesService,useFactory:db=>new ExpensesService(db,new ReviewService(db,{}),{now:()=>new Date()}),inject:[PrismaService]}
]})(G1Harness);
test('G1: HTTP/controller/auth/CSRF/originali/DB reali, nessun worker AI',async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);const external=process.env.V5_OBJECTS_API==='1',app=external?null:await NestFactory.create(G1Harness,{logger:false});
 if(app){app.setGlobalPrefix('api/v5');app.use(cookieParser());app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});app.useGlobalFilters(new ApiErrorFilter());await app.listen(0,'127.0.0.1');}
 const base=external?'http://127.0.0.1:3001/api/v5':(await app.getUrl())+'/api/v5',db=app?app.get(PrismaService):new PrismaService();if(!app)await db.$connect();
 const storage=app?app.get(LocalFileStorage):new LocalFileStorage(),accounts=[],homes=[],aiBefore=await db.aiAttempt.count();
 t.after(async()=>{
  for(const model of ['objectEvent','objectRequest','objectResourceLink','objectPosition','homeObject','homeRoom'])await db[model].deleteMany({where:{homeId:{in:homes}}});
  await db.expenseHistory.deleteMany({where:{accountId:{in:accounts}}});await db.expenseRequest.deleteMany({where:{accountId:{in:accounts}}});await db.homeExpense.deleteMany({where:{homeId:{in:homes}}});
  const docs=await db.document.findMany({where:{uploaderId:{in:accounts}},include:{original:{include:{file:true}}}}),files=docs.map(x=>x.original.file),ids=docs.map(x=>x.id);
  await db.uploadRequest.deleteMany({where:{accountId:{in:accounts}}});await db.documentVersion.deleteMany({where:{documentId:{in:ids}}});await db.document.deleteMany({where:{id:{in:ids}}});await db.storedFile.deleteMany({where:{id:{in:files.map(x=>x.id)}}});for(const file of files)await storage.remove(file.storageKey);
  await db.home.deleteMany({where:{id:{in:homes}}});await db.account.deleteMany({where:{id:{in:accounts}}});if(app)await app.close();else await db.$disconnect();
 });
 class Browser{
  cookie='';csrf='';id='';
  async request(path,method='GET',body,headers={}){
   const form=body instanceof FormData,r=await fetch(base+path,{method,headers:{Origin:'http://127.0.0.1:5174',Cookie:this.cookie,...(this.id?{'X-Account-Context':this.id}:{}),...(method!=='GET'?{'X-CSRF-Token':this.csrf,'Idempotency-Key':randomUUID(),...(!form?{'Content-Type':'application/json'}:{})}:{}),...headers},body:body===undefined?undefined:form?body:JSON.stringify(body)});
   if(r.headers.getSetCookie()[0])this.cookie=r.headers.getSetCookie()[0].split(';')[0];const data=r.headers.get('content-type')?.includes('application/json')?await r.json():Buffer.from(await r.arrayBuffer());
   if(path==='/session')this.csrf=data.csrfToken;if(data.account)this.id=data.account.id;assert.equal(r.headers.get('cache-control'),'no-store');return{status:r.status,data};
  }
 }
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;},a=new Browser(),b=new Browser();let h,room,obj,doc,expense,link;
 await t.test('Guard sessione/contesto/CSRF e ambienti Home condivisi',async()=>{
  for(const[client,name]of[[a,'A'],[b,'B']]){ok(await client.request('/session'));ok(await client.request('/auth/register','POST',{name:'HTTP G1 '+name,email:randomUUID()+'@example.test',password:'password-prova-g1-123'}),201);accounts.push(client.id);ok(await client.request('/session'));}
  h=ok(await a.request('/homes','POST',{name:'HTTP G1',address:'Via test'}),201).home.id;homes.push(h);
  assert.equal(ok(await a.request(`/homes/${h}/object-capabilities`)).apiVersion,'home-objects-v1');assert.equal((await b.request(`/homes/${h}/rooms`)).status,403);
  await db.homeMembership.create({data:{accountId:b.id,homeId:h,role:'member',validFrom:new Date(0)}});
  room=ok(await a.request(`/homes/${h}/rooms`,'POST',{name:'Cucina',type:'kitchen'}),201).room;assert.equal(ok(await b.request(`/homes/${h}/rooms/${room.id}`)).room.name,'Cucina');
  assert.equal((await a.request(`/homes/${h}/rooms`,'POST',{name:'Negata',type:'other'},{'X-CSRF-Token':'errato'})).status,403);
  assert.equal((await a.request(`/homes/${h}/rooms`,'GET',undefined,{'X-Account-Context':b.id})).status,401);
 });
 await t.test('Oggetto/posizione, replay identico e input stretti',async()=>{
  const body={name:'Lavatrice G1',type:'appliance',roomIds:[room.id]},key=randomUUID();const first=ok(await a.request(`/homes/${h}/objects`,'POST',body,{'Idempotency-Key':key}),201);obj=first.object;
  assert.deepEqual(ok(await a.request(`/homes/${h}/objects`,'POST',body,{'Idempotency-Key':key}),201),first);assert.equal((await a.request(`/homes/${h}/objects`,'POST',{...body,name:'Altro'},{'Idempotency-Key':key})).status,409);
  assert.equal((await b.request(`/homes/${h}/objects/object/${obj.ref.id}`)).status,403);assert.equal(ok(await b.request(`/homes/${h}/objects`)).items.length,0);
  for(const q of ['limit=51','q=A&q=B','type=unknown','roomId='+room.id+'&placement=unplaced'])assert.equal((await a.request(`/homes/${h}/objects?${q}`)).status,422);
  assert.equal((await a.request(`/homes/${h}/objects`,'POST',{...body,confirmed:{brand:'falsa'}})).status,422);
  assert.equal((await a.request(`/homes/${h}/objects/object/${obj.ref.id}/position`,'POST',{expectedVersion:0,roomIds:[]})).status,409);
  obj=ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}/position`,'POST',{expectedVersion:1,roomIds:[]})).object;assert.equal(obj.position.rooms.length,0);
 });
 await t.test('Originale byte-identico, costo unico e collegamento/rimozione',async()=>{
  const form=new FormData();form.set('name','Fattura G1');form.set('visibility','home');form.set('file',new Blob([pdf]),'fattura-g1.pdf');doc=ok(await a.request(`/homes/${h}/documents`,'POST',form),201).document;
  expense=ok(await a.request(`/homes/${h}/expenses`,'POST',{title:'Acquisto lavatrice',amountCents:30,spentOn:'2026-01-01',documentId:doc.id}),201).expense;
  link=ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}/links`,'POST',{resourceType:'expense',resourceId:expense.id}),201).link;
  const docs=ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}/links`,'POST',{resourceType:'document',resourceId:doc.id}),201).link;
  assert.equal(ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}/links?resourceType=expense`)).items[0].resource.id,expense.id);
  assert.equal(ok(await a.request(`/homes/${h}/expense-summary?year=2026`)).totalCents,30);assert.deepEqual(ok(await a.request(`/homes/${h}/documents/${doc.id}/file`)),pdf);
  await db.document.update({where:{id:doc.id},data:{uploaderId:b.id,visibility:'private'}});
  assert.equal(ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}/links?resourceType=document`)).items[0].resource,null);
  assert(!JSON.stringify(ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}/history`))).includes(doc.id));
  ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}/links/${docs.linkId}/remove`,'POST',{expectedVersion:1}));
  ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}/links/${link.linkId}/remove`,'POST',{expectedVersion:1}));
  assert.equal(ok(await a.request(`/homes/${h}/expenses/${expense.id}`)).expense.amountCents,30);
  await db.document.update({where:{id:doc.id},data:{uploaderId:a.id,visibility:'home'}});assert.deepEqual(ok(await a.request(`/homes/${h}/documents/${doc.id}/file`)),pdf);
 });
 await t.test('Archivio/ripristino, viewer/revoca e nessun consumo AI',async()=>{
  obj=ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}/archive`,'POST',{expectedVersion:1})).object;assert.equal(obj.state,'archived');
  obj=ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}/restore`,'POST',{expectedVersion:2})).object;assert.equal(obj.state,'active');
  await db.homeMembership.update({where:{accountId_homeId:{accountId:a.id,homeId:h}},data:{role:'viewer'}});
  assert.deepEqual(ok(await a.request(`/homes/${h}/objects/object/${obj.ref.id}`)).object.permissions,['read']);assert.equal((await a.request(`/homes/${h}/rooms`,'POST',{name:'Negata',type:'other'})).status,403);
  await db.homeMembership.update({where:{accountId_homeId:{accountId:a.id,homeId:h}},data:{revokedAt:new Date()}});for(const path of['object-capabilities','rooms','objects',`objects/object/${obj.ref.id}`,`objects/object/${obj.ref.id}/history`])assert.equal((await a.request(`/homes/${h}/${path}`)).status,403);
  assert.equal(await db.aiAttempt.count(),aiBefore);
 });
});
