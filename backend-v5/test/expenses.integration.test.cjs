require('reflect-metadata');
const { test } = require('node:test'); const assert = require('node:assert/strict'); const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('../generated/client'); const { assertDevelopmentDatabase } = require('../dist/prisma.service');
const { ExpensesService } = require('../dist/expenses/expenses.service'); const { ReviewService } = require('../dist/review/review.service');
test('H3: spese persistenti, somme precise, privacy/CAS/replay e keyset PostgreSQL', async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL); const db = new PrismaClient(); await db.$connect();
  const accounts = await Promise.all(['A', 'B'].map(n => db.account.create({ data: { name: 'Spese H3 ' + n, email: randomUUID() + '@example.test', passwordHash: 'not-a-login-hash' } })));
  const [a,b] = accounts.map(x => x.id), homes = await Promise.all(['H3', 'Altra H3'].map(name => db.home.create({ data: { name, address: 'Via test' } }))), [h,other] = homes.map(x => x.id);
  await db.homeMembership.createMany({ data: [{accountId:a,homeId:h,role:'owner'},{accountId:b,homeId:h,role:'owner'},{accountId:a,homeId:other,role:'owner'}].map(x => ({...x,validFrom:new Date(0)})) });
  const doc = await db.document.create({ data: { homeId:h,uploaderId:b,name:'Fonte riservata di B',visibility:'home',original:{create:{originalFilename:'fattura.pdf',mimeType:'application/pdf',byteSize:100,sha256:'a'.repeat(64),file:{create:{storageKey:randomUUID()+'.bin'}}}} },include:{original:true} });
  const asset = await db.boilerAsset.create({data:{accountId:a,homeId:h,name:'Caldaia H3 fonte'}}), aiBefore=await db.aiAttempt.count();
  const s=new ExpensesService(db,new ReviewService(db,{}),{now:()=>new Date('2026-10-14T12:00:00Z')});
  const deny=(p,status,code)=>assert.rejects(p,e=>e.getStatus?.()===status&&(!code||e.getResponse().code===code));
  let manual,document,createKey,body;
  t.after(async()=>{
    await db.expenseHistory.deleteMany({where:{accountId:{in:[a,b]}}});await db.expenseRequest.deleteMany({where:{accountId:{in:[a,b]}}});await db.homeExpense.deleteMany({where:{homeId:{in:[h,other]}}});
    await db.boilerAsset.delete({where:{id:asset.id}});await db.documentVersion.deleteMany({where:{documentId:doc.id}});await db.document.delete({where:{id:doc.id}});await db.storedFile.delete({where:{id:doc.original.fileId}});
    await db.home.deleteMany({where:{id:{in:[h,other]}}});await db.account.deleteMany({where:{id:{in:[a,b]}}});await db.$disconnect();
  });
  await t.test('Capabilities reale e anno senza costi',async()=>{
    const caps=await s.capabilities(a,h,{});assert.equal(caps.apiVersion,'expenses-v1');assert.equal(caps.today,'2026-10-14');assert.equal(caps.isSimulation,false);
    const summary=await s.summary(a,h,{});assert.equal(summary.totalCents,0);assert.deepEqual(summary.counts,{manual:0,document:0});await deny(s.capabilities(b,other,{}),403);
  });
  await t.test('Create concorrente e risposta persa: unico costo/evento; 10+20 centesimi esatti',async()=>{
    createKey=randomUUID();body={title:'  Documentata A ',amountCents:20,spentOn:'2026-10-14',documentId:doc.id,assetId:asset.id,note:'Importo inserito da me'};
    const results=await Promise.all([s.create(a,h,body,createKey),s.create(a,h,{...body,title:'Documentata A'},createKey)]);assert.deepEqual(results[0],results[1]);document=results[0].expense;
    assert.equal(await db.homeExpense.count({where:{homeId:h}}),1);assert.equal(await db.expenseHistory.count({where:{expenseId:document.id}}),1);
    manual=(await s.create(a,h,{title:'Manuale',amountCents:10,spentOn:'2026-10-13'},randomUUID())).expense;
    const summary=await s.summary(a,h,{year:'2026'});assert.equal(summary.totalCents,30);assert.deepEqual(summary.totalsCents,{manual:10,document:20});
    assert.equal((await s.list(a,h,{assetId:asset.id})).items.length,1);assert.equal(await db.homeExpense.count({where:{homeId:h}}),2);
    await deny(s.create(a,h,{...body,amountCents:21},createKey),409,'idempotency_conflict');
  });
  await t.test('Owner B non legge costi, storia o totali di A; altre Home e riferimenti negati',async()=>{
    await deny(s.get(b,h,document.id,{}),403);await deny(s.history(b,h,document.id,{}),403);assert.equal((await s.summary(b,h,{})).totalCents,0);
    assert.deepEqual((await s.list(b,h,{})).items,[]);await deny(s.get(a,other,document.id,{}),403);
    await deny(s.create(b,h,{title:'Altro',amountCents:10,spentOn:'2026-10-14',assetId:asset.id},randomUUID()),403);
    await deny(s.create(a,h,{title:'Futura',amountCents:10,spentOn:'2026-10-15'},randomUUID()),422);
  });
  await t.test('Update no-op e due versioni concorrenti: una sola modifica',async()=>{
    assert.equal((await s.update(a,h,manual.id,{expectedVersion:1,title:'Manuale'},randomUUID())).expense.version,1);
    const result=await Promise.allSettled(['Prima','Seconda'].map(title=>s.update(a,h,manual.id,{expectedVersion:1,title},randomUUID())));
    assert.equal(result.filter(x=>x.status==='fulfilled').length,1);assert.equal(result.find(x=>x.status==='rejected').reason.getResponse().code,'expense_version_conflict');
    manual=(await s.get(a,h,manual.id,{})).expense;assert.equal(manual.version,2);assert.equal(await db.expenseHistory.count({where:{expenseId:manual.id}}),2);
  });
  await t.test('Archive/restore con note, replay e totali, documenti e caldaia invariati',async()=>{
    const beforeDoc=await db.document.findUnique({where:{id:doc.id},include:{original:true}}),beforeAsset=await db.boilerAsset.findUnique({where:{id:asset.id}}),key=randomUUID(),action={expectedVersion:2,note:'Archiviazione di prova'};
    const archived=await s.action(a,h,manual.id,'archive',action,key);assert.equal(archived.expense.state,'archived');assert.equal((await s.summary(a,h,{})).totalCents,20);assert.deepEqual(await s.action(a,h,manual.id,'archive',action,key),archived);
    await deny(s.update(a,h,manual.id,{expectedVersion:3,title:'x'},randomUUID()),409,'expense_state_conflict');
    manual=(await s.action(a,h,manual.id,'restore',{expectedVersion:3,note:'Ripristino'},randomUUID())).expense;assert.equal(manual.archivedAt,null);assert.equal((await s.summary(a,h,{})).totalCents,30);
    assert.equal((await s.history(a,h,manual.id,{})).items.find(x=>x.kind==='archived').note,action.note);
    assert.deepEqual(await db.document.findUnique({where:{id:doc.id},include:{original:true}}),beforeDoc);assert.deepEqual(await db.boilerAsset.findUnique({where:{id:asset.id}}),beforeAsset);
  });
  await t.test('Riferimenti divenuti privati redatti in dettaglio/storia e replay',async()=>{
    await db.document.update({where:{id:doc.id},data:{visibility:'private'}});await db.boilerAsset.update({where:{id:asset.id},data:{accountId:b}});
    const detail=(await s.get(a,h,document.id,{})).expense;assert.equal(detail.origin,'document');assert.deepEqual(detail.documentLink,{state:'unavailable',document:null});assert.deepEqual(detail.assetLink,{state:'unavailable',asset:null});
    const serialized=JSON.stringify(await s.history(a,h,document.id,{}));for(const hidden of [doc.id,doc.name,asset.id,asset.name])assert(!serialized.includes(hidden));
    assert.deepEqual((await s.create(a,h,body,createKey)).expense.documentLink,{state:'unavailable',document:null});await deny(s.list(a,h,{documentId:doc.id}),403);
  });
  await t.test('Keyset su 25 record/timestamp identici, limite variabile e cursor scope/filtri',async()=>{
    await db.homeExpense.createMany({data:Array.from({length:25},(_,i)=>({accountId:a,homeId:h,title:'Pagina '+i,amountCents:1,spentOn:'2025-12-31',createdAt:new Date('2025-01-01T00:00:00Z')}))});
    const seen=new Set(),cursors=new Set();let cursor;do{const page=await s.list(a,h,{year:'2025',limit:cursor?'7':'2',...(cursor?{cursor}: {})});for(const row of page.items){assert(!seen.has(row.id));seen.add(row.id);}cursor=page.nextCursor;if(cursor){assert(!cursors.has(cursor));cursors.add(cursor);}}while(cursor);assert.equal(seen.size,25);
    const first=await s.list(a,h,{year:'2025',limit:'2'});await deny(s.list(a,h,{year:'2026',cursor:first.nextCursor}),422);await deny(s.list(b,h,{year:'2025',cursor:first.nextCursor}),422);
    assert.equal((await s.summary(a,h,{year:'2025'})).totalCents,25);assert.equal((await s.summary(a,h,{year:'2024'})).totalCents,0);
    await db.homeExpense.createMany({data:Array.from({length:4},(_,i)=>({accountId:a,homeId:other,title:'Importo grande '+i,amountCents:999999999,spentOn:'2026-01-01'}))});
    assert.equal((await s.summary(a,other,{year:'2026'})).totalCents,3999999996);
  });
  await t.test('Viewer read-only, revoca/scadenza bloccano letture, replay e storia; zero AI',async()=>{
    const where={accountId_homeId:{accountId:a,homeId:h}};await db.homeMembership.update({where,data:{role:'viewer'}});assert.deepEqual((await s.get(a,h,manual.id,{})).expense.permissions,['read']);
    await deny(s.create(a,h,{title:'x',amountCents:10,spentOn:'2026-10-14'},randomUUID()),403);await db.homeMembership.update({where,data:{role:'owner',revokedAt:new Date()}});
    await Promise.all([s.get(a,h,manual.id,{}),s.history(a,h,manual.id,{}),s.summary(a,h,{}),s.create(a,h,body,createKey)].map(p=>deny(p,403)));
    await db.homeMembership.update({where,data:{revokedAt:null,validUntil:new Date(0)}});await deny(s.capabilities(a,h,{}),403);assert.equal(await db.aiAttempt.count(),aiBefore);
  });
});
