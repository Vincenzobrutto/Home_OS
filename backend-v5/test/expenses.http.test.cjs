require('reflect-metadata');
const { test }=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {Module}=require('@nestjs/common');const {NestFactory}=require('@nestjs/core');const cookieParser=require('cookie-parser');
const {InfrastructureModule}=require('../dist/app.module');const {AuthModule}=require('../dist/auth/auth.module');const {HomesModule}=require('../dist/homes/homes.module');
const {DocumentsModule}=require('../dist/documents/documents.module');const {LocalFileStorage}=require('../dist/documents/storage');const {PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service');
const {ApiErrorFilter}=require('../dist/main');const {ExpensesController}=require('../dist/expenses/expenses.controller');const {ExpensesService}=require('../dist/expenses/expenses.service');const {ReviewService}=require('../dist/review/review.service');
const {pdf}=require('./document-fixtures.cjs');class H3Harness{}
Module({imports:[InfrastructureModule,AuthModule,HomesModule,DocumentsModule],controllers:[ExpensesController],providers:[{provide:ExpensesService,useFactory:db=>new ExpensesService(db,new ReviewService(db,{}),{now:()=>new Date()}),inject:[PrismaService]}]})(H3Harness);
test('H3: controller/sessioni/upload/file/DB reali; zero worker/provider AI',async t=>{
  assertDevelopmentDatabase(process.env.DATABASE_URL);const external=process.env.V5_EXPENSES_API==='1',app=external?null:await NestFactory.create(H3Harness,{logger:false});
  if(app){app.setGlobalPrefix('api/v5');app.use(cookieParser());app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});app.useGlobalFilters(new ApiErrorFilter());await app.listen(0,'127.0.0.1');}
  const base=external?'http://127.0.0.1:3001/api/v5':(await app.getUrl())+'/api/v5',db=app?app.get(PrismaService):new PrismaService(),accounts=[],homes=[];if(!app)await db.$connect();const storage=app?app.get(LocalFileStorage):new LocalFileStorage(),aiBefore=await db.aiAttempt.count();
  t.after(async()=>{
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
  const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
  const a=new Browser(),b=new Browser();let h,expense,doc,manual;
  await t.test('Sessioni, capabilities, Home e confini account reali',async()=>{
    for(const [client,name]of[[a,'A'],[b,'B']]){ok(await client.request('/session'));ok(await client.request('/auth/register','POST',{name:'HTTP H3 '+name,email:randomUUID()+'@example.test',password:'password-prova-h3-123'}),201);accounts.push(client.id);ok(await client.request('/session'));}
    h=ok(await a.request('/homes','POST',{name:'HTTP Spese H3',address:'Via test'}),201).home.id;homes.push(h);
    const caps=ok(await a.request(`/homes/${h}/expense-capabilities`));assert.equal(caps.apiVersion,'expenses-v1');assert.equal(caps.isSimulation,false);
    assert.equal((await b.request(`/homes/${h}/expense-capabilities`)).status,403);assert.equal((await a.request(`/homes/${h}/expense-capabilities`,'GET',undefined,{'X-Account-Context':b.id})).status,401);
  });
  await t.test('Originale autentico e costo documentale/manuale, replay e centesimi',async()=>{
    const form=new FormData();form.set('name','Fattura sintetica H3');form.set('visibility','private');form.set('file',new Blob([pdf]),'fattura-h3.pdf');doc=ok(await a.request(`/homes/${h}/documents`,'POST',form),201).document;
    const body={title:'Costo da fattura',amountCents:20,spentOn:'2026-01-01',documentId:doc.id},key=randomUUID(),first=await a.request(`/homes/${h}/expenses`,'POST',body,{'Idempotency-Key':key});expense=ok(first,201).expense;
    assert.deepEqual(ok(await a.request(`/homes/${h}/expenses`,'POST',body,{'Idempotency-Key':key}),201),first.data);assert.equal((await a.request(`/homes/${h}/expenses`,'POST',{...body,amountCents:21},{'Idempotency-Key':key})).status,409);
    manual=ok(await a.request(`/homes/${h}/expenses`,'POST',{title:'Costo manuale',amountCents:10,spentOn:'2026-01-01'}),201).expense;
    const summary=ok(await a.request(`/homes/${h}/expense-summary?year=2026`));assert.equal(summary.totalCents,30);assert.deepEqual(summary.totalsCents,{manual:10,document:20});assert.equal(ok(await a.request(`/homes/${h}/expenses?documentId=${doc.id}`)).items.length,1);
    assert.deepEqual(ok(await a.request(`/homes/${h}/documents/${doc.id}/file`)),pdf);assert(!JSON.stringify(expense).includes('storageKey'));
  });
  await t.test('Query/body stretti e stati/versioni autorevoli, originale invariato',async()=>{
    for(const q of ['year=2026&year=2025','state=paid','unknown=1','limit=51','source=estimate'])assert.equal((await a.request(`/homes/${h}/expenses?${q}`)).status,422);
    for(const body of [{amountCents:0},{amountCents:1.1},{currency:'USD'},{spentOn:'9999-01-01'},{state:'archived'}])assert.equal((await a.request(`/homes/${h}/expenses`,'POST',{title:'Non valida',amountCents:1,spentOn:'2026-01-01',...body})).status,422);
    manual=ok(await a.request(`/homes/${h}/expenses/${manual.id}/updates`,'POST',{expectedVersion:1,title:'Aggiornata'})).expense;
    assert.equal((await a.request(`/homes/${h}/expenses/${manual.id}/updates`,'POST',{expectedVersion:1,title:'Vecchia'})).status,409);
    manual=ok(await a.request(`/homes/${h}/expenses/${manual.id}/archive`,'POST',{expectedVersion:2,note:'Archivia prova'})).expense;assert.equal(ok(await a.request(`/homes/${h}/expense-summary?year=2026`)).totalCents,20);
    manual=ok(await a.request(`/homes/${h}/expenses/${manual.id}/restore`,'POST',{expectedVersion:3})).expense;assert.equal(manual.state,'active');assert.equal(ok(await a.request(`/homes/${h}/expenses/${manual.id}/history`)).items.length,4);assert.deepEqual(ok(await a.request(`/homes/${h}/documents/${doc.id}/file`)),pdf);
  });
  await t.test('Viewer/revoca e fonte riservata: redazione di dati già ottenuti',async()=>{
    await db.homeMembership.create({data:{accountId:b.id,homeId:h,role:'owner',validFrom:new Date(0)}});assert.deepEqual(ok(await b.request(`/homes/${h}/expenses`)).items,[]);assert.equal(ok(await b.request(`/homes/${h}/expense-summary?year=2026`)).totalCents,0);assert.equal((await b.request(`/homes/${h}/expenses/${expense.id}`)).status,403);
    await db.document.update({where:{id:doc.id},data:{uploaderId:b.id}});const detail=ok(await a.request(`/homes/${h}/expenses/${expense.id}`)).expense;assert.deepEqual(detail.documentLink,{state:'unavailable',document:null});assert.equal(detail.origin,'document');assert(!JSON.stringify(ok(await a.request(`/homes/${h}/expenses/${expense.id}/history`))).includes(doc.id));
    const where={accountId_homeId:{accountId:a.id,homeId:h}};await db.homeMembership.update({where,data:{role:'viewer'}});assert.deepEqual(ok(await a.request(`/homes/${h}/expenses/${manual.id}`)).expense.permissions,['read']);assert.equal((await a.request(`/homes/${h}/expenses/${manual.id}/archive`,'POST',{expectedVersion:4})).status,403);
    await db.homeMembership.update({where,data:{revokedAt:new Date()}});for(const path of['expense-capabilities','expense-summary','expenses',`expenses/${manual.id}`])assert.equal((await a.request(`/homes/${h}/${path}`)).status,403);assert.equal(await db.aiAttempt.count(),aiBefore);
  });
});
