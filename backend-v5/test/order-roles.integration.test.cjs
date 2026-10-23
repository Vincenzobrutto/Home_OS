// Offline manual transcription decisions, not extraction of the actual raster originals.
global.fetch=async()=>{throw Error('network_forbidden');};
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto');
const {PrismaClient}=require('../generated/client');
const {ReviewService}=require('../dist/review/review.service'),{HomeObjectsService}=require('../dist/home-objects/home-objects.service'),{ObjectOnboardingAccess}=require('../dist/object-onboarding/access'),{ObjectOnboardingService}=require('../dist/object-onboarding/onboarding.service');
const {productExtraction}=require('../dist/object-onboarding/domain');
const hash=s=>createHash('sha256').update(s).digest('hex');
test('real-order manual cases: isolated storage, canonical dates, privacy and durable replay',async t=>{
 const raw=process.env.QUALITY_V3_DATABASE_URL,u=new URL(raw??'invalid:');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55433');assert.equal(u.pathname,'/dimora_v5_quality_v3_test');assert.equal(u.username,'quality_test');
 const db=new PrismaClient({datasources:{db:{url:raw}}});await db.$connect();t.after(()=>db.$disconnect());
 const service=client=>{const review=new ReviewService(client,{}),objects=new HomeObjectsService(client,review);return new ObjectOnboardingService(new ObjectOnboardingAccess(client,review),objects,review,{now:()=>new Date('2026-10-23T12:00:00Z')});};const svc=service(db);
 const a=await db.account.create({data:{name:'Offline order',email:randomUUID()+'@example.test',passwordHash:'not-login'}}),b=await db.account.create({data:{name:'Other owner',email:randomUUID()+'@example.test',passwordHash:'not-login'}});
 await t.test('confirmed coffee proposal: private sourced date, explicit cost, durable replay and reload without duplicates',async()=>{
  const home=await db.home.create({data:{name:'Synthetic confirmed order',address:'Test'}});for(const account of [a,b])await db.homeMembership.create({data:{accountId:account.id,homeId:home.id,role:'owner'}});
  // Manual deidentified observations, not the actual PDF or a new provider result.
  const lines=['Riepilogo dell’ordine','Ordine effettuato il: 14 giugno 2026','De’Longhi Rivelia EXAM440.35.B','Totale: 499,00 €','Costi di spedizione: 0,00 €'];
  const ev=excerpt=>({page:1,excerpt,region:null}),sha=hash(lines.join('\n'));
  async function extracted(){
   const doc=await db.document.create({data:{homeId:home.id,uploaderId:a.id,name:'Synthetic coffee order',visibility:'private',original:{create:{originalFilename:'synthetic.pdf',mimeType:'application/pdf',sha256:sha,byteSize:1,file:{create:{storageKey:'not-stored-'+randomUUID()}}}}}});
   const output=productExtraction({documentKind:'order_confirmation',documentInfo:[{kind:'purchase_order',title:lines[0],evidence:ev(lines[0])}],facts:[],hasMoreItems:false,purchaseTotal:{amountCents:49900,evidence:ev(lines[3])},items:[{fields:{name:{value:lines[2],evidence:ev(lines[2])},orderDate:{value:'2026-06-14',evidence:ev(lines[1])}},purchaseAmount:null,quantity:null,nameTruncated:false,disposition:'household_object',confidence:'high'}]},{kind:'text',pages:[lines.join('\n')],snapshot:{documentId:doc.id,documentVersion:1,documentSha256:sha}});
   const row=await db.objectOnboardingDraft.create({data:{accountId:a.id,homeId:home.id,documentId:doc.id,documentVersion:1,documentSha256:sha,mode:'extraction',output}});return (await svc.getDraft(a.id,home.id,row.id,{})).draft;
  }
  const d=await extracted(),i=d.items[0];assert.equal(i.profile.purchaseDate.value,'2026-06-14');assert.equal(i.profile.purchaseDate.origin,'derived_from_order');assert.equal(i.profile.purchaseDate.sources[0].documentId,d.document.id);assert.equal(i.profile.warrantyStart,undefined);
  await assert.rejects(svc.getDraft(b.id,home.id,d.id,{}));assert.equal(await db.homeObject.count({where:{homeId:home.id}}),0);assert.equal(await db.homeExpense.count({where:{homeId:home.id}}),0);
  const c={itemId:i.id,action:'create',name:i.fields.name.value,type:'appliance',unitNames:[],roomIds:[],fields:{orderDate:{action:'accept'},purchaseDate:{action:'accept'}},manual:null,confirmHouseholdObject:true,acknowledgeExistingSource:false,expense:{action:'create',title:'Acquisto da ordine confermato',amountCents:49900,spentOn:'2026-06-14',supplier:null}},body={expectedVersion:d.version,source:d.snapshot,choices:[c]},key=randomUUID();
  await assert.rejects(svc.confirm(b.id,home.id,d.id,body,key));const r=await svc.confirm(a.id,home.id,d.id,body,key);assert.equal(r.result.newObjects,1);assert.equal(r.result.newExpenses,1);
  await Promise.all([svc.confirm(a.id,home.id,d.id,body,key),svc.confirm(a.id,home.id,d.id,body,key)]);
  const other=new PrismaClient({datasources:{db:{url:raw}}});try{await service(other).confirm(a.id,home.id,d.id,body,key);}finally{await other.$disconnect();}
  const object=await db.homeObject.findFirstOrThrow({where:{homeId:home.id}});assert.equal(object.profile.purchaseDate.origin,'derived_from_order');assert.equal(object.profile.warrantyStart,undefined);assert.equal(object.profile.deliveredDate,undefined);
  const copy=await extracted(),repeat={itemId:copy.items[0].id,action:'link',targets:[{id:object.id,expectedVersion:object.version}],fields:{},manual:null,expense:c.expense};
  await assert.rejects(svc.confirm(a.id,home.id,copy.id,{expectedVersion:copy.version,source:copy.snapshot,choices:[repeat]},randomUUID()));
  const linked=await svc.confirm(a.id,home.id,copy.id,{expectedVersion:copy.version,source:copy.snapshot,choices:[{...repeat,expense:{action:'skip'}}]},randomUUID());assert.equal(linked.result.newObjects,0);assert.equal(linked.result.newExpenses,0);
  assert.equal(await db.homeObject.count({where:{homeId:home.id}}),1);assert.equal(await db.homeExpense.count({where:{homeId:home.id}}),1);assert.equal((await db.homeExpense.findFirstOrThrow({where:{homeId:home.id}})).amountCents,49900);
 });
 for(const coffee of [false,true])await t.test(coffee?'coffee':'Samsung',async t=>{
 const h=await db.home.create({data:{name:'Offline order',address:'Test'}});for(const account of [a,b])await db.homeMembership.create({data:{accountId:account.id,homeId:h.id,role:'owner'}});
 const name=coffee?'De’Longhi Rivelia EXAM440.35.B':'Frigorifero Combinato da Incasso Samsung',date=coffee?'2026-06-14':'2024-10-13',amount=coffee?49900:84915;
 async function draft(){const doc=await db.document.create({data:{homeId:h.id,uploaderId:a.id,name:'Offline order',visibility:'private',original:{create:{originalFilename:'offline.pdf',mimeType:'application/pdf',sha256:hash('order-case-'+coffee),byteSize:1,file:{create:{storageKey:'not-stored-'+randomUUID()}}}}}});const d=(await svc.manualDraft(a.id,h.id,{documentId:doc.id},randomUUID())).draft;return {doc,d};}
 const {doc,d}=await draft(),choice={itemId:d.items[0].id,action:'create',name,type:'appliance',unitNames:[],roomIds:[],fields:{orderDate:{action:'manual',value:date},...(coffee?{brand:{action:'manual',value:'De’Longhi'},model:{action:'manual',value:'EXAM440.35.B'}}:{brand:{action:'manual',value:'Samsung'}})},manual:null,confirmHouseholdObject:true,expense:{action:'skip'},acknowledgeExistingSource:false},body={expectedVersion:d.version,source:d.snapshot,choices:[choice]},key=randomUUID();
 await t.test('another owner cannot read or confirm this private source',async()=>{await assert.rejects(svc.getDraft(b.id,h.id,d.id,{}));await assert.rejects(svc.confirm(b.id,h.id,d.id,body,key));assert.equal(await db.homeObject.count({where:{homeId:h.id}}),0);});
 const saved=await svc.confirm(a.id,h.id,d.id,body,key),id=saved.draft.items[0].decision.objects[0].id;
 await t.test('order-only decision creates one object with no expense, room, purchase date or guarantee',async()=>{
 assert.equal(saved.result.newObjects,1);assert.equal(saved.result.newExpenses,0);const object=await db.homeObject.findUniqueOrThrow({where:{id}});assert.equal(object.profile.orderDate.value,date);for(const field of ['purchaseDate','deliveredDate','warrantyStart','warrantyEnd'])assert.equal(object.profile[field],undefined);if(!coffee)assert.equal(object.profile.model,undefined);assert.equal(await db.homeExpense.count({where:{homeId:h.id}}),0);
 });
 await t.test('concurrent and different-client durable replay keeps one object',async()=>{
 await Promise.all([svc.confirm(a.id,h.id,d.id,body,key),svc.confirm(a.id,h.id,d.id,body,key)]);const other=new PrismaClient({datasources:{db:{url:raw}}});try{await service(other).confirm(a.id,h.id,d.id,body,key);}finally{await other.$disconnect();}assert.equal(await db.homeObject.count({where:{homeId:h.id}}),1);
 });
 await t.test('same file reload links the existing object; only a human-declared cost/date creates an expense',async()=>{
 const copy=await draft(),object=await db.homeObject.findUniqueOrThrow({where:{id}});const selected={itemId:copy.d.items[0].id,action:'link',targets:[{id,expectedVersion:object.version}],fields:{},manual:null,expense:{action:'create',title:'Costo articolo dichiarato',amountCents:amount,spentOn:date,supplier:null}};
 const body2={expectedVersion:copy.d.version,source:copy.d.snapshot,choices:[selected]},key2=randomUUID();const r=await svc.confirm(a.id,h.id,copy.d.id,body2,key2);assert.equal(r.result.newObjects,0);assert.equal(r.result.newExpenses,1);await svc.confirm(a.id,h.id,copy.d.id,body2,key2);
 const cost=await db.homeExpense.findFirstOrThrow({where:{homeId:h.id}});assert.equal(cost.amountCents,amount);assert.equal(cost.amountOrigin,'user_declared');assert.equal(await db.homeExpense.count({where:{homeId:h.id}}),1);
 });
 await t.test('another same-SHA reload cannot register the same cost again',async()=>{
 const copy=await draft(),object=await db.homeObject.findUniqueOrThrow({where:{id}}),c={itemId:copy.d.items[0].id,action:'link',targets:[{id,expectedVersion:object.version}],fields:{},manual:null,expense:{action:'create',title:'Repeated cost',amountCents:amount,spentOn:date,supplier:null}};
 await assert.rejects(svc.confirm(a.id,h.id,copy.d.id,{expectedVersion:copy.d.version,source:copy.d.snapshot,choices:[c]},randomUUID()));assert.equal(await db.homeExpense.count({where:{homeId:h.id}}),1);
 });
 await t.test('source version, SHA and revocation deny replay; changed key payload cannot be accepted',async()=>{
 const altered=structuredClone(body);altered.choices[0].name+=' altered';await assert.rejects(svc.confirm(a.id,h.id,d.id,altered,key));
 const original=await db.documentVersion.findFirstOrThrow({where:{documentId:doc.id}});for(const change of [{version:2},{sha256:'e'.repeat(64)}]){await db.documentVersion.update({where:{id:original.id},data:change});await assert.rejects(svc.confirm(a.id,h.id,d.id,body,key));await db.documentVersion.update({where:{id:original.id},data:{version:original.version,sha256:original.sha256}});}
 await db.document.update({where:{id:doc.id},data:{uploaderId:b.id}});await assert.rejects(svc.confirm(a.id,h.id,d.id,body,key));assert.equal(await db.homeObject.count({where:{homeId:h.id}}),1);assert.equal(await db.homeExpense.count({where:{homeId:h.id}}),1);
 });
 });
});
