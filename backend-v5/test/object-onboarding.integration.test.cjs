// Dedicated V5 DB only. Provider and manufacturer transport never use the network.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service');
const {ReviewService}=require('../dist/review/review.service');
const {HomeObjectsService}=require('../dist/home-objects/home-objects.service');
const {ObjectOnboardingAccess}=require('../dist/object-onboarding/access');
const {ObjectOnboardingService}=require('../dist/object-onboarding/onboarding.service');
const {onboardingCandidates,onboardingExpenseCandidates}=require('../dist/object-onboarding/candidates');
const {OnboardingAiConfig,OnboardingAiBudget}=require('../dist/object-onboarding/ai-budget');
const {OnboardingAiAnalysis,ObjectOnboardingAnthropicTransport}=require('../dist/object-onboarding/ai-analysis');
const {ObjectOnboardingAnthropicProvider}=require('../dist/object-onboarding/anthropic-provider');
const {OnboardingJobService}=require('../dist/object-onboarding/jobs.service');
const {PdfTextExtractor}=require('../dist/review/pdf-text');
const {receiptFixturePdf}=require('../dist/receipt-assistance/fixture-provider');
const {productExtraction}=require('../dist/object-onboarding/domain');
const {digest}=require('../dist/security');
const bytes=receiptFixturePdf('multiple'),hash=digest(bytes),model='claude-sonnet-5-5';
const ev=excerpt=>({page:1,excerpt,region:null}),f=(value,excerpt=value)=>({value,evidence:ev(excerpt)});
const raw=()=>({documentKind:'purchase_document',hasMoreItems:false,purchaseTotal:{amountCents:22990,evidence:ev('Totale documento: 229,90 EUR')},items:[{fields:{name:f('Macchina caffe demo'),brand:f('Lume','Marca: Lume'),model:f('Mini 90','Modello: Mini 90')},quantity:null,nameTruncated:false,disposition:'household_object',confidence:'high'},{fields:{name:f('Tostapane demo','Secondo articolo: Tostapane demo')},quantity:null,nameTruncated:false,disposition:'household_object',confidence:'high'}]});
class OfflineConfig extends OnboardingAiConfig {constructor(){super();this.env={ONBOARDING_AI_ENABLED:'true',ONBOARDING_AI_MODEL:model,ONBOARDING_AI_CAMPAIGN_ID:'onboarding-offline-'+randomUUID(),ONBOARDING_AI_BUDGET_USD:'2',ONBOARDING_AI_MAX_CALLS:'8',ONBOARDING_AI_ALLOWED_SHA256:hash,ANTHROPIC_API_KEY:'offline-not-key'};}get environment(){return this.env;}}
const errorCode=code=>e=>(e.getResponse?.().code??e.code)===code;
test('Full onboarding: DB, real PDF parser, fake provider; atomicity, replay, privacy, multiple products, jobs', {timeout:120000},async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaService();await db.$connect();const ids=[],homes=[],files=[],content=new Map(),documentBytes=new Map(),campaigns=[];
 const clock={now:()=>new Date('2026-10-17T09:00:00Z')},review=new ReviewService(db,{}),objects=new HomeObjectsService(db,review),access=new ObjectOnboardingAccess(db,review),service=new ObjectOnboardingService(access,objects,review,clock);
 const config=new OfflineConfig(),budget=new OnboardingAiBudget(db,config),transport=new ObjectOnboardingAnthropicTransport(config);campaigns.push(config.campaign);let sent=0,counted=0,mode='ok',fakeOutput=null;
 transport.fetchImpl=async url=>{if(url.endsWith('/models/'+model))return Response.json({id:model});if(url.endsWith('/messages/count_tokens')){counted++;return Response.json({input_tokens:1000});}if(url.endsWith('/messages')){sent++;if(mode==='lost')throw Error('offline lost');return Response.json({id:'msg_offline_object',model,stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({...fakeOutput??raw(),items:(fakeOutput??raw()).items.map(item=>({...item,fields:Object.entries(item.fields).map(([field,value])=>({field,...value}))})),...(fakeOutput?.houseExpenses?{houseExpenses:fakeOutput.houseExpenses.map(item=>({...item,fields:Object.entries(item.fields).map(([field,value])=>({field,...value}))}))}:{})})}],usage:{input_tokens:1000,output_tokens:400}});}throw Error('Forbidden unexpected network URL '+url);};
 const ai=new OnboardingAiAnalysis(db,new ObjectOnboardingAnthropicProvider(new PdfTextExtractor(),transport),transport,budget),jobs=new OnboardingJobService(db,access,{read:async key=>content.get(key)},ai,objects);
 t.after(async()=>{const where={accountId:{in:ids}};await db.contactRequest.deleteMany({where});await db.homeContact.deleteMany({where});await db.objectOnboardingComparison.deleteMany({where});await db.objectOnboardingBinding.deleteMany({where});await db.objectOnboardingAttempt.deleteMany({where:{job:where}});await db.objectOnboardingJob.deleteMany({where});await db.objectOnboardingRequest.deleteMany({where});await db.objectOnboardingDraft.deleteMany({where});for(const m of ['receiptObjectField','objectEvent','objectRequest','objectResourceLink','objectPosition'])await db[m].deleteMany({where});for(const m of ['expenseHistory','expenseRequest'])await db[m].deleteMany({where});await db.homeExpense.deleteMany({where});await db.homeObject.deleteMany({where});await db.documentOrganization.deleteMany({where});await db.documentVersion.deleteMany({where:{document:{uploaderId:{in:ids}}}});await db.document.deleteMany({where:{uploaderId:{in:ids}}});await db.storedFile.deleteMany({where:{id:{in:files}}});await db.homeMembership.deleteMany({where:{homeId:{in:homes}}});await db.home.deleteMany({where:{id:{in:homes}}});await db.account.deleteMany({where:{id:{in:ids}}});await db.objectOnboardingCampaign.deleteMany({where:{id:{in:campaigns}}});await db.$disconnect();});
 const account=async()=>{const a=await db.account.create({data:{name:'SYNTHETIC onboarding',email:randomUUID()+'@example.test',passwordHash:'not-login',emailVerifiedAt:new Date()}});ids.push(a.id);return a.id;};const a=await account(),b=await account();const home=await db.home.create({data:{name:'SYNTHETIC onboarding only',address:'Via Test'}}),h=home.id;homes.push(h);for(const accountId of [a,b])await db.homeMembership.create({data:{accountId,homeId:h,role:'owner'}});
 async function document(payload=bytes){const key=randomUUID();content.set(key,payload);const d=await db.document.create({data:{homeId:h,uploaderId:a,name:'SYNTHETIC order',visibility:'private',original:{create:{originalFilename:'synthetic.pdf',mimeType:'application/pdf',byteSize:payload.length,sha256:digest(payload),file:{create:{storageKey:key}}}}},include:{original:true}});files.push(d.original.fileId);documentBytes.set(d.id,payload);return d;}
 async function extracted(doc,output=raw()){const snapshot={documentId:doc.id,documentVersion:1,documentSha256:doc.original.sha256},[parsed]=await new PdfTextExtractor().extract([{snapshot,bytes:documentBytes.get(doc.id)}]);const d=await db.objectOnboardingDraft.create({data:{accountId:a,homeId:h,documentId:doc.id,documentVersion:1,documentSha256:doc.original.sha256,mode:'extraction',output:productExtraction(output,{kind:'text',snapshot,pages:parsed.pages})}});return (await service.getDraft(a,h,d.id,{})).draft;}
 const create=(item,name=item.fields.name?.value??'New')=>({itemId:item.id,action:'create',name,type:'appliance',unitNames:[],roomIds:[],fields:Object.fromEntries(Object.keys(item.profile).map(k=>[k,{action:'accept'}])),manual:null,expense:{action:'skip'},confirmHouseholdObject:true,acknowledgeExistingSource:false});
 const confirm=(d,choices,key=randomUUID())=>service.confirm(a,h,d.id,{expectedVersion:d.version,source:d.snapshot,choices},key);
 let doc,d,first,second;
 await t.test('analysis consent and exact SHA precede parsing and every transfer; separate budget',async()=>{doc=await document();const before=[sent,counted];await assert.rejects(jobs.start(a,h,{documentId:doc.id,provider:'anthropic',consentToProviderTransfer:false},randomUUID()));config.env.ONBOARDING_AI_ALLOWED_SHA256='0'.repeat(64);await assert.rejects(jobs.start(a,h,{documentId:doc.id,provider:'anthropic',consentToProviderTransfer:true},randomUUID()),errorCode('onboarding_document_not_authorized'));config.env.ONBOARDING_AI_ALLOWED_SHA256=hash;assert.deepEqual([sent,counted],before);await assert.rejects(jobs.start(b,h,{documentId:doc.id,provider:'anthropic',consentToProviderTransfer:true},randomUUID()));});
 await t.test('real queue/parser and billing publish proposals only; replay starts one Messages call',async()=>{const body={documentId:doc.id,provider:'anthropic',consentToProviderTransfer:true},key=randomUUID();const [one,two]=await Promise.all([jobs.start(a,h,body,key),jobs.start(a,h,body,key)]);assert.equal(one.job.id,two.job.id);const originalCampaign=config.env.ONBOARDING_AI_CAMPAIGN_ID;config.env.ONBOARDING_AI_CAMPAIGN_ID='onboarding-other-process-'+randomUUID();assert.equal(await jobs.claim(one.job.id),null);config.env.ONBOARDING_AI_CAMPAIGN_ID=originalCampaign;const claimed=await jobs.claim(one.job.id);assert(claimed);await jobs.run(claimed);await jobs.run(claimed);const job=(await jobs.get(a,h,one.job.id,{})).job;assert.equal(job.state,'succeeded',job.errorCode);assert.equal(sent,1);assert.equal(counted,1);d=(await service.getDraft(a,h,job.draftId,{})).draft;assert.equal(d.items.length,2);assert.equal(await db.homeObject.count({where:{homeId:h}}),0);assert.equal(await db.homeExpense.count({where:{homeId:h}}),0);assert.equal((await jobs.recover(a,h,key,{})).job.id,job.id);});
 await t.test('candidate selection scoped and paginated; no automatic target',async()=>{const existing=(await objects.createObject(a,h,{name:'Existing unrelated',type:'other',roomIds:[]},randomUUID())).object;const page=await onboardingCandidates(access,a,h,d.id,{itemId:d.items[0].id,limit:'1'});assert.equal(page.items[0].id,existing.ref.id);assert.equal(page.items[0].reason,'manual_selection');assert.equal((await onboardingCandidates(access,a,h,d.id,{itemId:d.items[0].id,q:'no result'})).items.length,0);});
 await t.test('multiple confirmation failure rolls all objects back; a grand total is never allocated',async()=>{const before=await db.homeObject.count({where:{homeId:h}}),bad=create(d.items[1]);bad.fields.brand={action:'accept'};await assert.rejects(confirm(d,[create(d.items[0]),bad]));assert.equal(await db.homeObject.count({where:{homeId:h}}),before);const cost=create(d.items[0]);cost.expense={action:'create',title:'Invalid allocation',amountCents:22990,spentOn:'2026-09-15',supplier:null};await assert.rejects(confirm(d,[cost]));assert.equal(await db.homeExpense.count({where:{homeId:h}}),0);});
 await t.test('partial confirmation, deferred second item, canonical original and stable confirmation receipt',async()=>{const key=randomUUID(),choices=[create(d.items[0]),{itemId:d.items[1].id,action:'defer'}],before=d;const result=await confirm(d,choices,key);d=result.draft;first=d.items[0].decision.objects[0].id;assert.equal(result.result.newObjects,1);assert.equal(d.state,'open');assert.equal(d.items[1].decision.state,'deferred');assert.equal((await service.recover(a,h,d.id,key,{})).status,'confirmed');const replay=await confirm(before,choices,key);assert.equal(replay.result.newObjects,1);assert.equal(await db.objectResourceLink.count({where:{homeId:h,objectId:first,documentId:doc.id,state:'active'}}),1);await assert.rejects(confirm(before,[{itemId:d.items[0].id,action:'skip'}],key),errorCode('idempotency_conflict'));const next=create(d.items[1]);next.acknowledgeExistingSource=true;d=(await confirm(d,[next])).draft;second=d.items[1].decision.objects[0].id;assert.equal(d.state,'confirmed');assert.notEqual(first,second);assert.equal(await db.objectResourceLink.count({where:{documentId:doc.id,state:'active'}}),2);});
 await t.test('same source copy cannot create a second object for the same item',async()=>{const copy=await document(),draft=await extracted(copy);await assert.rejects(confirm(draft,[create(draft.items[0])]),errorCode('onboarding_object_exists'));const candidates=await onboardingCandidates(access,a,h,draft.id,{itemId:draft.items[0].id});assert.equal(candidates.items[0].id,first);assert.equal(candidates.items[0].reason,'confirmed_item');});
 await t.test('manual multi onboarding, saved decisions, target conflict and deferred comparison',async()=>{const doc2=await document();let manual=(await service.manualDraft(a,h,{documentId:doc2.id},randomUUID())).draft;manual=(await service.addItem(a,h,manual.id,{expectedVersion:manual.version},randomUUID())).draft;assert.equal(manual.items.length,2);manual=(await service.saveReview(a,h,manual.id,{expectedVersion:manual.version,review:{forms:{[manual.items[1].id]:{name:'Preserved form'}}}},randomUUID())).draft;const other=await objects.createObject(a,h,{name:'Private profile test',type:'appliance',roomIds:[]},randomUUID());let target=other.object;target=(await objects.setProfile(a,h,target.ref.id,{expectedVersion:target.version,values:{brand:'Confirmed'}},randomUUID())).object;
 const rawDraft=await db.objectOnboardingDraft.findUnique({where:{id:manual.id}});const output=rawDraft.output;output.items[0].fields.brand={value:'Different',source:{documentId:doc2.id,documentVersion:1,sha256:hash,page:1,excerpt:'Different',basis:'verified_text',region:null}};await db.objectOnboardingDraft.update({where:{id:manual.id},data:{output}});manual=(await service.getDraft(a,h,manual.id,{})).draft;
 const link={itemId:manual.items[0].id,action:'link',targets:[{id:target.ref.id,expectedVersion:target.version}],fields:{brand:{action:'accept'}},manual:null,expense:{action:'skip'}};await assert.rejects(confirm(manual,[link]));link.fields.brand.action='defer';manual=(await confirm(manual,[link])).draft;assert.equal((await objects.getObject(a,h,'object',target.ref.id,{})).object.profile.fields.brand.value,'Confirmed');assert.equal(manual.review.forms[manual.items[1].id].name,'Preserved form');const comparison=(await service.comparisonsFor(a,h,target.ref.id,{})).items[0];assert.equal(comparison.proposed.value,'Different');await service.keepComparison(a,h,comparison.id,{expectedVersion:comparison.version},randomUUID());assert.equal((await service.comparisonsFor(a,h,target.ref.id,{})).items.length,0);});
 await t.test('single receipt optional cost is canonical, replay-safe, and existing cost can be reused without duplication',async()=>{
  const single=await document(receiptFixturePdf('purchase')),r=raw();r.items=r.items.slice(0,1);r.purchaseTotal={amountCents:17990,evidence:ev('Totale documento: 179,90 EUR')};let receipt=await extracted(single,r);const c=create(receipt.items[0]);c.expense={action:'create',title:'SYNTHETIC purchase',amountCents:17990,spentOn:'2026-09-15',supplier:'Demo store'};const saved=(await confirm(receipt,[c])).draft,target=saved.items[0].decision.objects[0];const cost=await db.homeExpense.findFirstOrThrow({where:{homeId:h,documentId:single.id}});assert.equal(cost.amountCents,17990);assert.equal(await db.objectResourceLink.count({where:{objectId:target.id,expenseId:cost.id,state:'active'}}),1);
  const copy=await document(receiptFixturePdf('purchase'));receipt=await extracted(copy,r);const link={itemId:receipt.items[0].id,action:'link',targets:[{id:target.id,expectedVersion:target.version}],fields:{brand:{action:'keep'},model:{action:'keep'}},manual:null,expense:c.expense};await assert.rejects(confirm(receipt,[link]),errorCode('onboarding_expense_exists'));assert.equal(await db.homeExpense.count({where:{homeId:h}}),1);link.expense={action:'link',id:cost.id,expectedVersion:cost.version};const reused=await confirm(receipt,[link]);assert.equal(reused.result.newObjects,0);assert.equal(reused.result.newExpenses,0);assert.equal(await db.homeExpense.count({where:{homeId:h}}),1);
 });
 await t.test('same amount/date candidates are ranked across the complete scope and checked again atomically',async()=>{
  const original=receiptFixturePdf('purchase'),payload=Buffer.from(original.toString().replace('Data documento:','Data acquisto :'));assert.equal(payload.length,original.length);
  const single=await document(payload),r=raw();r.items=r.items.slice(0,1);r.items[0].fields.purchaseDate=f('2026-09-15','Data acquisto : 2026-09-15');r.purchaseTotal={amountCents:17990,evidence:ev('Totale documento: 179,90 EUR')};
  let receipt=await extracted(single,r);const candidates=await onboardingExpenseCandidates(access,a,h,receipt.id,{limit:'1'});assert.equal(candidates.items[0].rank,1);assert.equal(candidates.items[0].amountCents,17990);
  const c=create(receipt.items[0]);c.expense={action:'create',title:'Distinct synthetic purchase',amountCents:17990,spentOn:'2026-09-15',supplier:null};const count=await db.homeObject.count({where:{homeId:h}});
  await assert.rejects(confirm(receipt,[c]),errorCode('onboarding_possible_expense_duplicate'));assert.equal(await db.homeObject.count({where:{homeId:h}}),count);
  c.expense.acknowledgePossibleDuplicate=true;const result=await confirm(receipt,[c]);assert.equal(result.result.newExpenses,1);assert.equal(result.result.newObjects,1);
  const copy=await document(payload);receipt=await extracted(copy,r);const same=await onboardingExpenseCandidates(access,a,h,receipt.id,{limit:'1'});assert.equal(same.items[0].rank,2);
  const target=await db.homeObject.findUniqueOrThrow({where:{id:result.draft.items[0].decision.objects[0].id}});const duplicate={itemId:receipt.items[0].id,action:'link',targets:[{id:target.id,expectedVersion:target.version}],fields:{brand:{action:'keep'},model:{action:'keep'},purchaseDate:{action:'keep'},warrantyStart:{action:'keep'},warrantyEnd:{action:'keep'}},manual:null,expense:c.expense};await assert.rejects(confirm(receipt,[duplicate]),errorCode('onboarding_expense_exists'));
 });
 await t.test('excluded purchase item creates no object, expense or binding and retains its original document',async()=>{
  const single=await document(receiptFixturePdf('purchase')),r=raw();r.items=r.items.slice(0,1);r.purchaseTotal={amountCents:17990,evidence:ev('Totale documento: 179,90 EUR')};const receipt=await extracted(single,r),item=receipt.items[0];
  const before={objects:await db.homeObject.count({where:{homeId:h}}),expenses:await db.homeExpense.count({where:{homeId:h}})};
  await assert.rejects(async()=>confirm(receipt,[{itemId:item.id,action:'skip',expense:{action:'create',title:'Forbidden cost',amountCents:17990,spentOn:'2026-09-15',supplier:null}}]));
  const result=await confirm(receipt,[{itemId:item.id,action:'skip'}]);assert.equal(result.result.newObjects,0);assert.equal(result.result.newExpenses,0);assert.equal(result.draft.items[0].decision.state,'skipped');
  assert.equal(await db.homeObject.count({where:{homeId:h}}),before.objects);assert.equal(await db.homeExpense.count({where:{homeId:h}}),before.expenses);assert.equal(await db.objectOnboardingBinding.count({where:{documentId:single.id}}),0);assert.ok(await db.document.findUnique({where:{id:single.id}}));
 });
 await t.test('invoice plus two bills: canonical house costs without objects, recovery and duplicate guard',async()=>{
  const {bill}=require('./house-expense-fixture.cjs');
  const count=await db.homeObject.count({where:{homeId:h}});
  for(const fixture of [bill('electricity','SYNTH-EL-01',8450),bill('gas','SYNTH-GAS-02',5620)]){
   const source=await document(fixture.bytes);fakeOutput=fixture.raw;config.env.ONBOARDING_AI_ALLOWED_SHA256=fixture.sha;
   const start=await jobs.start(a,h,{documentId:source.id,provider:'anthropic',consentToProviderTransfer:true},randomUUID());await jobs.run(await jobs.claim(start.job.id));const job=(await jobs.get(a,h,start.job.id,{})).job;assert.equal(job.state,'succeeded',job.errorCode);const d=(await service.getDraft(a,h,job.draftId,{})).draft,item=d.houseExpenses[0];fakeOutput=null;config.env.ONBOARDING_AI_ALLOWED_SHA256=hash;
   assert.equal(d.items.length,0);const selection={itemId:item.id,action:'create',values:{title:item.proposedFields.title.value,supplier:item.proposedFields.supplier.value,documentNumber:item.proposedFields.documentNumber.value,documentDate:'2026-09-15',spentOn:'2026-09-15',category:item.proposedFields.category.value,amountCents:item.amountCandidates[0].amountCents},amountSelection:{mode:'candidate',candidateId:'total'}};
   const key=randomUUID(),body={expectedVersion:d.version+1,source:d.snapshot,choices:[],houseExpenses:[selection]},pending={path:'/drafts/'+d.id+'/confirmations',key,body};
   const reviewed=(await service.saveReview(a,h,d.id,{expectedVersion:d.version,review:{forms:{},pending}},randomUUID())).draft;
   assert.deepEqual(reviewed.review.pending.body,body);
   const saved=await service.confirm(a,h,d.id,reviewed.review.pending.body,key);await service.confirm(a,h,d.id,body,key);
   assert.equal(saved.result.newObjects,0);assert.equal(saved.result.newExpenses,1);assert.equal(saved.draft.state,'confirmed');
   const cost=await db.homeExpense.findFirstOrThrow({where:{documentId:source.id}});assert.equal(cost.assetId,null);assert.equal(cost.amountOrigin,'extraction_confirmed');assert.equal(await db.objectResourceLink.count({where:{expenseId:cost.id}}),0);assert.equal(await db.homeExpense.count({where:{documentId:source.id}}),1);
   const copy=await document(fixture.bytes),copyDraft=await extracted(copy,fixture.raw);const candidates=await onboardingExpenseCandidates(access,a,h,copyDraft.id,{itemId:copyDraft.houseExpenses[0].id});assert.equal(candidates.items[0].id,cost.id);assert.equal(candidates.items[0].rank,2);
   await assert.rejects(service.confirm(a,h,copyDraft.id,{expectedVersion:copyDraft.version,source:copyDraft.snapshot,choices:[],houseExpenses:[{...selection,itemId:copyDraft.houseExpenses[0].id}]},randomUUID()),errorCode('onboarding_expense_exists'));
   const reused=await service.confirm(a,h,copyDraft.id,{expectedVersion:copyDraft.version,source:copyDraft.snapshot,choices:[],houseExpenses:[{itemId:copyDraft.houseExpenses[0].id,action:'link_existing',expenseId:cost.id,expectedExpenseVersion:cost.version}]},randomUUID());assert.equal(reused.result.newExpenses,0);
  }
  assert.equal(await db.homeObject.count({where:{homeId:h}}),count);
 });
 await t.test('verified purchase fields survive wire, PDF, projection, one confirmation and replay despite an optional delivery omission',async()=>{
  const fixture=require('./document-understanding-fixture.cjs'),x=fixture.invoice();x.lines=['Fattura','Macchina caffe Boreale TestP17','Marca: Boreale','Modello: TestP17','REF: BP17-REF','Data acquisto: 18/04/2026','Totale documento: 127,43 EUR','Consegna prevista: 20/04/2026'];
  x.raw.items[0].fields={name:f(x.lines[1]),brand:f('Boreale',x.lines[2]),model:f('TestP17',x.lines[3]),reference:f('BP17-REF',x.lines[4]),purchaseDate:f('2026-04-18',x.lines[5]),deliveredDate:f('2026-04-20',x.lines[7])};x.raw.purchaseTotal={amountCents:12743,evidence:ev(x.lines[6])};
  const source=await document(fixture.pdf(x.lines)),snapshot={documentId:source.id,documentVersion:1,documentSha256:source.original.sha256},[parsed]=await new PdfTextExtractor().extract([{snapshot,bytes:documentBytes.get(source.id)}]),context={kind:'text',snapshot,pages:parsed.pages};
  const decode=raw=>new ObjectOnboardingAnthropicProvider(null,null).decode({id:'msg_synthetic',model:'offline',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(fixture.wire(raw))}],usage:{input_tokens:1000,output_tokens:400}},{context,request:{model:'offline',max_tokens:4096}}).output;
  const output=decode(x.raw);assert.equal(output.needsReview,true);assert.equal(output.purchaseExpenseReady,true);assert.equal(output.items[0].fields.deliveredDate,undefined);
  assert.equal(decode({...x.raw,requiresHumanReview:true}).purchaseExpenseReady,false,'provider uncertainty must never be hidden by an optional warning');
  const uncertain=structuredClone(x.raw);uncertain.items[0].quantity={value:2,evidence:ev(x.lines[1])};assert.equal(decode(uncertain).purchaseExpenseReady,false,'quantity uncertainty blocks a proposed cost');
  const stored=await db.objectOnboardingDraft.create({data:{accountId:a,homeId:h,documentId:source.id,documentVersion:1,documentSha256:source.original.sha256,mode:'extraction',output}}),draft=(await service.getDraft(a,h,stored.id,{})).draft;
  assert.equal(draft.purchaseExpenseReady,true);assert.equal(draft.purchaseTotal.amountCents,12743);const item=draft.items[0];assert.equal(item.fields.name.value,x.lines[1]);for(const [k,v]of Object.entries({brand:'Boreale',model:'TestP17',reference:'BP17-REF',purchaseDate:'2026-04-18'}))assert.equal(item.profile[k].value,v);
  const selection=create(item);selection.expense={action:'create',title:x.lines[1],amountCents:12743,spentOn:'2026-04-18',supplier:null};const key=randomUUID(),result=await confirm(draft,[selection],key);await confirm(draft,[selection],key);assert.equal(result.result.newObjects,1);assert.equal(result.result.newExpenses,1);
  const objectId=result.draft.items[0].decision.objects[0].id,object=(await objects.getObject(a,h,'object',objectId,{})).object;for(const [k,v]of Object.entries({brand:'Boreale',model:'TestP17',reference:'BP17-REF',purchaseDate:'2026-04-18'})){assert.equal(object.profile.fields[k].value,v);assert.equal(object.profile.fields[k].origin,'extraction_confirmed');}
  const cost=await db.homeExpense.findFirstOrThrow({where:{documentId:source.id}});assert.equal(cost.amountCents,12743);assert.equal(cost.spentOn,'2026-04-18');assert.equal(cost.category,'purchase_replacement');assert.equal(await db.homeExpense.count({where:{documentId:source.id}}),1);assert.equal(await db.objectResourceLink.count({where:{objectId,documentId:source.id,state:'active'}}),1);assert.equal(await db.objectResourceLink.count({where:{objectId,expenseId:cost.id,state:'active'}}),1);
 });
 await t.test('confirmed extracted fields and drafts redact after private source transfer',async()=>{await db.document.update({where:{id:doc.id},data:{uploaderId:b}});const redacted=(await service.getDraft(a,h,d.id,{})).draft;assert.equal(redacted.snapshot,null);assert.equal(redacted.items.length,0);await assert.rejects(objects.getObject(a,h,'object',first,{}));await assert.rejects(service.getDraft(b,h,d.id,{}));});
 await t.test('unknown paid outcome is not sent twice or silently retried',async()=>{const doc3=await document();mode='lost';const started=await jobs.start(a,h,{documentId:doc3.id,provider:'anthropic',consentToProviderTransfer:true},randomUUID());await jobs.run(await jobs.claim(started.job.id));const job=(await jobs.get(a,h,started.job.id,{})).job;assert.equal(job.state,'uncertain');const before=sent;await assert.rejects(jobs.start(a,h,{documentId:doc3.id,provider:'anthropic',consentToProviderTransfer:true},randomUUID()),errorCode('analysis_outcome_unknown'));assert.equal(sent,before);
 assert.equal((await jobs.capabilities(a,h,{documentId:doc3.id})).canStartAnalysis,false);
 const flags=await jobs.capabilities(a,h,{documentId:doc3.id});assert.equal(flags.canStartWithUncertainAcknowledgement,true);
 const extraKey=randomUUID(),extraBody={documentId:doc3.id,provider:'anthropic',consentToProviderTransfer:true,acknowledgePreviousUncertainAnalysis:true};
 const extra=await jobs.start(a,h,extraBody,extraKey);assert.equal((await jobs.start(a,h,extraBody,extraKey)).job.id,extra.job.id);assert.equal(sent,before);
 const oldAttempt=await db.objectOnboardingAttempt.findUniqueOrThrow({where:{jobId:started.job.id}});assert.equal(oldAttempt.state,'uncertain');assert.equal(oldAttempt.actualMicroUsd,null);
 // Synthetic retry was reserved but never dispatched: release only that fixture's unused reservation.
 await budget.fail(extra.job.id);await db.objectOnboardingJob.update({where:{id:extra.job.id},data:{state:'failed'}});

 const originalCampaign=config.environment.ONBOARDING_AI_CAMPAIGN_ID;
 config.environment.ONBOARDING_AI_CAMPAIGN_ID=originalCampaign+'-separately-authorized';campaigns.push(config.campaign);
 assert.equal((await jobs.capabilities(a,h,{documentId:doc3.id})).canStartAnalysis,true);
 const authorized=await jobs.start(a,h,{documentId:doc3.id,provider:'anthropic',consentToProviderTransfer:true},randomUUID());
 assert.equal(authorized.job.state,'queued');assert.equal(sent,before);
 const priorAttempt=await db.objectOnboardingAttempt.findUniqueOrThrow({where:{jobId:started.job.id}});assert.equal(priorAttempt.state,'uncertain');assert.equal(priorAttempt.actualMicroUsd,null);
 config.environment.ONBOARDING_AI_CAMPAIGN_ID=originalCampaign;
 });
 await t.test('pilot manual item costs enforce consent, cumulative total and atomic rollback',async()=>{
  const source=await document(Buffer.concat([bytes,Buffer.from('\n%allocation-'+randomUUID())]));let draft=await extracted(source);
  const make=(item,cents,ack=false)=>({...create(item),acknowledgeExistingSource:ack,expense:{action:'create',title:'Manual item quota',amountCents:cents,spentOn:'2026-01-01',supplier:null,manualItemAmount:true}});
  const missing=make(draft.items[0],9900);delete missing.expense.manualItemAmount;await assert.rejects(async()=>confirm(draft,[missing]));
  await assert.rejects(async()=>confirm(draft,[make(draft.items[0],9900),make(draft.items[1],14000)]));assert.equal(await db.homeExpense.count({where:{documentId:source.id}}),0);
  await confirm(draft,[make(draft.items[0],9900)]);draft=(await service.getDraft(a,h,draft.id,{})).draft;
  await assert.rejects(async()=>confirm(draft,[make(draft.items[1],14000,true)]));assert.equal(await db.homeExpense.count({where:{documentId:source.id}}),1);
  const key=randomUUID(),body={expectedVersion:draft.version,source:draft.snapshot,choices:[make(draft.items[1],13090,true)]};await service.confirm(a,h,draft.id,body,key);await service.confirm(a,h,draft.id,body,key);
  const costs=await db.homeExpense.findMany({where:{documentId:source.id}});assert.equal(costs.length,2);assert.equal(costs.reduce((n,c)=>n+c.amountCents,0),22990);
 });
 await t.test('pilot replacement is versioned, explicit and updates both profile and basic model',async()=>{
  const source=await document(Buffer.concat([bytes,Buffer.from('\n%replace-'+randomUUID())]));const draft=await extracted(source),target=(await objects.createObject(a,h,{name:'SYNTHETIC previous model',type:'appliance',roomIds:[]},randomUUID())).object;
  await db.homeObject.update({where:{id:target.ref.id},data:{profile:{model:{value:'Previous 80',origin:'user_declared',sources:[]}}}});
  await db.receiptObjectField.create({data:{accountId:a,homeId:h,objectId:target.ref.id,fieldKey:'model',value:'Previous 80',origin:'user_declared',sources:[]}});
  const link={itemId:draft.items[0].id,action:'link',targets:[{id:target.ref.id,expectedVersion:target.version}],manual:null,fields:{model:{action:'replace',expectedValue:'Previous 80',consent:true}},expense:{action:'skip'}};
  await assert.rejects(async()=>confirm(draft,[{...link,fields:{model:{action:'replace',expectedValue:'Previous 80'}}}]));
  await assert.rejects(async()=>confirm(draft,[{...link,fields:{model:{action:'replace',expectedValue:'stale',consent:true}}}]));
  await confirm(draft,[link]);assert.equal((await db.homeObject.findUnique({where:{id:target.ref.id}})).profile.model.value,'Mini 90');assert.equal((await db.receiptObjectField.findUnique({where:{objectId_fieldKey:{objectId:target.ref.id,fieldKey:'model'}}})).value,'Mini 90');
 });

 await t.test('multiple manual allocations confirm together within the same atomic request',async()=>{
  const doc=await document(Buffer.concat([bytes,Buffer.from('\n%multi-allocation-'+randomUUID())]));const output=raw();
  const d=await extracted(doc,output);const choices=d.items.map((item,i)=>({...create(item,'Quota simultanea '+i),expense:{action:'create',title:'Quota simultanea '+i,amountCents:i?13090:9900,spentOn:'2025-06-13',supplier:null,manualItemAmount:true}}));
  const result=await confirm(d,choices);assert.equal(result.result.newExpenses,2);assert.equal(await db.homeExpense.count({where:{documentId:doc.id}}),2);
 });

 await t.test('one final invoice confirmation excludes the other row from objects and canonical costs, including replay',async()=>{
  const source=await document(Buffer.concat([bytes,Buffer.from('\n%unified-exclusion-'+randomUUID())])),draft=await extracted(source);
  const included={...create(draft.items[0]),expense:{action:'create',title:'SYNTHETIC included item',amountCents:9999,spentOn:'2025-06-13',supplier:null,manualItemAmount:true}};
  const key=randomUUID(),choices=[included,{itemId:draft.items[1].id,action:'skip'}],before=await db.homeObject.count({where:{homeId:h}});
  const result=await confirm(draft,choices,key);await confirm(draft,choices,key);
  assert.equal(result.draft.state,'confirmed');assert.equal(result.result.newObjects,1);assert.equal(result.result.newExpenses,1);
  assert.equal(result.draft.items[1].decision.state,'skipped');assert.equal(result.draft.items[1].decision.objects.length,0);
  assert.equal(await db.homeObject.count({where:{homeId:h}}),before+1);
  const expenses=await db.homeExpense.findMany({where:{documentId:source.id}});assert.equal(expenses.length,1);assert.equal(expenses[0].amountCents,9999);
  assert.equal(await db.document.count({where:{id:source.id}}),1);assert.equal((await service.recover(a,h,draft.id,key,{})).status,'confirmed');
 });

 await t.test('V11 four document kinds preserve role, canonical confirmation and replay',async()=>{
 const fixtures=require('./document-understanding-fixture.cjs');
 for(const kind of ['conformity','invoice','utility','label']){
  const fixture=fixtures[kind](),doc=await document(fixtures.pdf(fixture.lines)),draft=await extracted(doc,fixture.raw);assert.equal(draft.documentInfo.kind,fixture.raw.documentInfo[0].kind);let choices=[],houseExpenses=[];
  if(kind==='utility'){const item=draft.houseExpenses[0],amount=item.amountCandidates.find(a=>a.role==='current_document_total');houseExpenses=[{itemId:item.id,action:'create',acknowledgePossibleDuplicate:true,values:{title:'SYNTHETIC V11 bill',category:'electricity',amountCents:amount.amountCents,spentOn:'2026-09-15',objectRef:null},amountSelection:{mode:'candidate',candidateId:amount.id}}];}
  else{const selected=create(draft.items[0],kind==='label'?'SYNTHETIC label X100':undefined);if(kind==='conformity'){assert.equal(draft.items[0].proposedType,'electrical');selected.type='electrical';assert.equal(draft.items[0].profile.purchaseDate,undefined);assert.equal(draft.items[0].profile.powerWatts,undefined);}if(kind==='invoice')selected.expense={action:'create',title:'SYNTHETIC V11 purchase',amountCents:9999,spentOn:'2025-06-13',supplier:'Lume',acknowledgePossibleDuplicate:true};choices=[selected];}
  const key=randomUUID(),body={expectedVersion:draft.version,source:draft.snapshot,choices,houseExpenses},done=await service.confirm(a,h,draft.id,body,key);assert.equal(done.result.newObjects,kind==='utility'?0:1);assert.equal(done.result.newExpenses,['invoice','utility'].includes(kind)?1:0);assert.deepEqual((await service.confirm(a,h,draft.id,body,key)).result,done.result);if(kind==='label')assert.equal(done.draft.items[0].profile.serialNumber.value,'DEMO123');
  await assert.rejects(service.getDraft(b,h,draft.id,{}),e=>e.getStatus?.()===403);
 }
 });
 await t.test('V11 conformity allows existing system, house-only and no-subject document without fabricated costs',async()=>{
 const f=require('./document-understanding-fixture.cjs'),fixture=f.conformity(),before=await db.homeObject.count({where:{homeId:h}});
 const source=await document(Buffer.concat([f.pdf(fixture.lines),Buffer.from('\n%only-house')])),draft=await extracted(source,fixture.raw);const done=await confirm(draft,[{itemId:draft.items[0].id,action:'document_only'}]);assert.equal(done.draft.state,'confirmed');assert.equal(done.result.newObjects,0);assert.equal(await db.homeObject.count({where:{homeId:h}}),before);assert.equal(done.draft.documentInfo.facts.find(f=>f.field==='availablePowerKw').value,'6');
 const target=await objects.createObject(a,h,{name:'SYNTHETIC quadro',type:'electrical',roomIds:[]},randomUUID()),next=await document(Buffer.concat([f.pdf(fixture.lines),Buffer.from('\n%link')])),linkedDraft=await extracted(next,fixture.raw);const linked=await confirm(linkedDraft,[{itemId:linkedDraft.items[0].id,action:'link',targets:[{id:target.object.ref.id,expectedVersion:target.object.version}],fields:{},manual:null,expense:{action:'skip'}}]);assert.equal(linked.result.newObjects,0);assert.equal(await db.objectResourceLink.count({where:{objectId:target.object.ref.id,documentId:next.id,state:'active'}}),1);
 fixture.raw.items=[];fixture.raw.facts=fixture.raw.facts.filter(f=>f.subjectIndex===-1);const emptyDoc=await document(Buffer.concat([f.pdf(fixture.lines),Buffer.from('\n%no-subject')])),empty=await extracted(emptyDoc,fixture.raw),emptyBody={expectedVersion:empty.version,source:empty.snapshot,choices:[],documentOnly:true},key=randomUUID();const result=await service.confirm(a,h,empty.id,emptyBody,key);assert.equal(result.draft.state,'confirmed');assert.equal(result.result.newObjects,0);assert.equal((await service.confirm(a,h,empty.id,emptyBody,key)).result.newObjects,0);
 });
 await t.test('V12 works invoice saves systems and one house expense atomically, replays and prevents duplicate allocation',async()=>{
  const f=require('./document-understanding-fixture.cjs'),fixture=f.works(),doc=await document(f.pdf(fixture.lines)),draft=await extracted(doc,fixture.raw),bill=draft.houseExpenses[0];assert.equal(draft.items[0].subjectKind,'system');assert.equal(draft.items[0].proposedType,'electrical');
  const choices=draft.items.map(i=>({...create(i,'SYNTHETIC V12 distinct '+i.fields.name.value),type:i.proposedType??'other'})),house={itemId:bill.id,action:'create',acknowledgePossibleDuplicate:true,values:{title:'SYNTHETIC lavori casa',category:'repairs_works',amountCents:153720,spentOn:'2026-07-08',documentDate:'2026-07-08',objectRef:null},amountSelection:{mode:'candidate',candidateId:'total'}};
  const beforeObjects=await db.homeObject.count({where:{homeId:h}}),beforeExpenses=await db.homeExpense.count({where:{homeId:h}});
  await assert.rejects(service.confirm(a,h,draft.id,{expectedVersion:draft.version,source:draft.snapshot,choices:[{...choices[0],expense:{action:'create',title:'dup',amountCents:153720,spentOn:'2026-07-08',supplier:null,manualItemAmount:true}}],houseExpenses:[house]},randomUUID()));assert.equal(await db.homeObject.count({where:{homeId:h}}),beforeObjects);
  await assert.rejects(service.confirm(a,h,draft.id,{expectedVersion:draft.version,source:draft.snapshot,choices:[{itemId:draft.items[0].id,action:'skip'},...choices.slice(1)],houseExpenses:[house]},randomUUID()));assert.equal(await db.homeExpense.count({where:{homeId:h}}),beforeExpenses);
  await assert.rejects(service.confirm(a,h,draft.id,{expectedVersion:draft.version,source:draft.snapshot,choices:[choices[0],{itemId:draft.items[1].id,action:'defer'},choices[2]],houseExpenses:[house]},randomUUID()));
  const key=randomUUID(),body={expectedVersion:draft.version,source:draft.snapshot,choices,houseExpenses:[house]},done=await service.confirm(a,h,draft.id,body,key);assert.equal(done.draft.state,'confirmed');assert.equal(done.result.newObjects,3);assert.equal(done.result.newExpenses,1);const cost=await db.homeExpense.findFirstOrThrow({where:{homeId:h,documentId:doc.id}});assert.equal(cost.category,'repairs_works');assert.equal(cost.amountCents,153720);assert.equal(cost.assetId,null);assert.equal(await db.objectResourceLink.count({where:{expenseId:cost.id}}),0);assert.equal(await db.objectResourceLink.count({where:{documentId:doc.id,state:'active'}}),3);await service.confirm(a,h,draft.id,body,key);assert.equal(await db.homeExpense.count({where:{homeId:h}}),beforeExpenses+1);
  const serviceOnly=f.works();serviceOnly.raw.items=[];serviceOnly.raw.facts=serviceOnly.raw.facts.filter(x=>x.subjectIndex===-1);const onlyDoc=await document(Buffer.concat([f.pdf(serviceOnly.lines),Buffer.from('\n%service-only')])),only=await extracted(onlyDoc,serviceOnly.raw),saved=await service.confirm(a,h,only.id,{expectedVersion:only.version,source:only.snapshot,choices:[],houseExpenses:[{...house,itemId:only.houseExpenses[0].id}]},randomUUID());assert.equal(saved.result.newObjects,0);assert.equal(saved.result.newExpenses,1);
 });
 await t.test('V12 individually printed price above grand total remains reviewable but cannot create a cost',async()=>{
  const f=require('./document-understanding-fixture.cjs'),fixture=f.invoice(),line=fixture.lines[1]+' Prezzo articolo: 150,00 EUR';fixture.lines.push(line);fixture.raw.items[0].purchaseAmount={amountCents:15000,evidence:{page:1,excerpt:line,region:null}};const doc=await document(f.pdf(fixture.lines)),draft=await extracted(doc,fixture.raw),selected=create(draft.items[0]);selected.expense={action:'create',title:'SYNTHETIC mismatch',amountCents:15000,spentOn:'2025-06-13',supplier:null,acknowledgePossibleDuplicate:true};const before=await db.homeObject.count({where:{homeId:h}});await assert.rejects(confirm(draft,[selected]),e=>e.getStatus?.()===422);assert.equal(await db.homeObject.count({where:{homeId:h}}),before);assert.equal(await db.homeExpense.count({where:{documentId:doc.id}}),0);assert.equal((await service.getDraft(a,h,draft.id,{})).draft.state,'open');
 });
 await t.test('order confirmation saves explicitly declared cost with date, original and replay',async()=>{
 const source=await document(Buffer.concat([bytes,Buffer.from('\n%order-cost-'+randomUUID())]));const value=raw();value.documentKind='order_confirmation';value.items=value.items.slice(0,1);value.purchaseTotal=null;
 const draft=await extracted(source,value),selected=create(draft.items[0],'SYNTHETIC TV');selected.expense={action:'create',title:'SYNTHETIC TV',amountCents:44400,spentOn:'2026-06-14',supplier:null};const key=randomUUID();
 const result=await confirm(draft,[selected],key);assert.equal(result.result.newExpenses,1);assert.equal(result.result.newObjects,1);await confirm(draft,[selected],key);assert.equal(await db.homeExpense.count({where:{documentId:source.id}}),1);
 });
 await t.test('manual unknown source saves object and declared purchase cost atomically, with replay and profile',async()=>{
 const doc=await document(Buffer.concat([bytes,Buffer.from('\n%manual-unknown-'+randomUUID())]));
 const draft=(await service.manualDraft(a,h,{documentId:doc.id},randomUUID())).draft;assert.equal(draft.documentKind,'unsupported');
 const selected=create(draft.items[0],'SYNTHETIC coffee');selected.fields={brand:{action:'manual',value:'Lume'},purchaseDate:{action:'manual',value:'2026-06-14'}};selected.expense={action:'create',title:'SYNTHETIC coffee',amountCents:49900,spentOn:'2026-06-14',supplier:null};
 const key=randomUUID(),result=await confirm(draft,[selected],key);assert.equal(result.result.newObjects,1);assert.equal(result.result.newExpenses,1);
 assert.equal((await confirm(draft,[selected],key)).result.newExpenses,1);assert.equal(await db.homeExpense.count({where:{documentId:doc.id}}),1);
 });
 await t.test('manual invoice records row amounts against an explicitly declared total; manual bill has no product',async()=>{
  const doc=await document(Buffer.concat([bytes,Buffer.from('\n%manual-unified-'+randomUUID())]));
  let draft=(await service.manualDraft(a,h,{documentId:doc.id,documentKind:'purchase_document'},randomUUID())).draft;
  assert.equal(draft.documentKind,'purchase_document');draft=(await service.addItem(a,h,draft.id,{expectedVersion:draft.version},randomUUID())).draft;
  const choices=draft.items.map((item,i)=>({...create(item,'SYNTHETIC manual row '+i),expense:{action:'create',title:'Manual row '+i,amountCents:i?4990:9999,spentOn:'2025-06-13',supplier:null,manualItemAmount:true,acknowledgePossibleDuplicate:true}}));
  const body={expectedVersion:draft.version,source:draft.snapshot,choices,manualPurchaseTotalCents:14989},key=randomUUID();
  await assert.rejects(service.confirm(a,h,draft.id,{...body,manualPurchaseTotalCents:10000},randomUUID()));
  assert.equal(await db.homeExpense.count({where:{documentId:doc.id}}),0);
  const result=await service.confirm(a,h,draft.id,body,key);await service.confirm(a,h,draft.id,body,key);assert.equal(result.result.newExpenses,2);
  const costs=await db.homeExpense.findMany({where:{documentId:doc.id}});assert.equal(costs.reduce((n,c)=>n+c.amountCents,0),14989);
  const bill=await document(Buffer.concat([bytes,Buffer.from('\n%manual-bill-'+randomUUID())]));const manual=(await service.manualDraft(a,h,{documentId:bill.id,documentKind:'utility_bill'},randomUUID())).draft;
  assert.equal(manual.items.length,0);assert.equal(manual.houseExpenses.length,1);assert.equal(manual.houseExpenses[0].amountCandidates.length,0);
 });

 await t.test('manual type change converts an empty generic draft to a bill, confirms only a house expense and preserves replay',async()=>{
  const source=await document(Buffer.concat([bytes,Buffer.from('\n%manual-kind-'+randomUUID())]));
  const initial=(await service.manualDraft(a,h,{documentId:source.id},randomUUID())).draft;
  const body={expectedVersion:initial.version,documentKind:'utility_bill'},key=randomUUID();
  await assert.rejects(service.changeManualKind(b,h,initial.id,body,randomUUID()));
  const bill=(await service.changeManualKind(a,h,initial.id,body,key)).draft;
  assert.equal(bill.id,initial.id);assert.equal(bill.items.length,0);assert.equal(bill.houseExpenses.length,1);assert.equal(bill.documentKind,'utility_bill');
  assert.equal((await service.changeManualKind(a,h,initial.id,body,key)).draft.version,bill.version);
  await assert.rejects(service.changeManualKind(a,h,initial.id,{...body,documentKind:'unsupported'},randomUUID()));
  const selection={itemId:bill.houseExpenses[0].id,action:'create',values:{title:'SYNTHETIC bill',category:'electricity',supplier:'SYNTHETIC supplier',amountCents:9321,spentOn:'2026-01-17',objectRef:null},amountSelection:{mode:'manual'},acknowledgePossibleDuplicate:true};
  const confirmation={expectedVersion:bill.version,source:bill.snapshot,choices:[],houseExpenses:[selection]},confirmationKey=randomUUID();
  const result=await service.confirm(a,h,bill.id,confirmation,confirmationKey);assert.equal(result.result.newObjects,0);assert.equal(result.result.newExpenses,1);assert.equal(result.draft.state,'confirmed');
  await service.confirm(a,h,bill.id,confirmation,confirmationKey);const costs=await db.homeExpense.findMany({where:{documentId:source.id}});assert.equal(costs.length,1);assert.equal(costs[0].amountCents,9321);assert.equal(costs[0].supplier,'SYNTHETIC supplier');assert.equal(await db.objectResourceLink.count({where:{documentId:source.id}}),0);
  await assert.rejects(service.changeManualKind(a,h,bill.id,{expectedVersion:result.draft.version,documentKind:'unsupported'},randomUUID()));
 });
 for(const kind of ['invoice','receipt'])for(const optional of ['none','create','link'])await t.test(kind+' direct expense with optional object '+optional,async()=>{
  const source=await document(Buffer.concat([bytes,Buffer.from('\n%manual-purchase-'+randomUUID())]));
  let draft=(await service.manualDraft(a,h,{documentId:source.id},randomUUID())).draft;
  draft=(await service.changeManualKind(a,h,draft.id,{expectedVersion:draft.version,documentKind:kind},randomUUID())).draft;
  assert.equal(draft.documentKind,'purchase_document');assert.equal(draft.items.length,0);assert.equal(draft.houseExpenses[0].documentKind,'simple_invoice');
  let choices=[];
  if(optional!=='none'){
   draft=(await service.addItem(a,h,draft.id,{expectedVersion:draft.version},randomUUID())).draft;
   if(optional==='create')choices=[create(draft.items[0],'SYNTHETIC optional object '+kind)];
   else{const target=(await objects.createObject(a,h,{name:'SYNTHETIC existing optional',type:'appliance',roomIds:[]},randomUUID())).object;choices=[{itemId:draft.items[0].id,action:'link',targets:[{id:target.ref.id,expectedVersion:target.version}],fields:{},manual:null,expense:{action:'skip'}}];}
  }
  const selection={itemId:draft.houseExpenses[0].id,action:'create',values:{title:'SYNTHETIC '+kind,category:'purchase_replacement',supplier:'SYNTHETIC supplier',amountCents:9321,spentOn:'2026-01-17',objectRef:null},amountSelection:{mode:'manual'},acknowledgePossibleDuplicate:true};
  const body={expectedVersion:draft.version,source:draft.snapshot,choices,houseExpenses:[selection]},key=randomUUID();
  const result=await service.confirm(a,h,draft.id,body,key);assert.equal(result.result.newObjects,optional==='create'?1:0);assert.equal(result.result.newExpenses,1);assert.equal(result.draft.state,'confirmed');
  await service.confirm(a,h,draft.id,body,key);assert.equal(await db.homeExpense.count({where:{documentId:source.id}}),1);assert.equal(await db.objectResourceLink.count({where:{documentId:source.id}}),optional==='none'?0:1);
 });
 await t.test('manual kind change protects saved input and pending confirmations; bill can still save only the document',async()=>{
  const source=await document(Buffer.concat([bytes,Buffer.from('\n%kind-guards-'+randomUUID())]));let draft=(await service.manualDraft(a,h,{documentId:source.id},randomUUID())).draft;
  draft=(await service.saveReview(a,h,draft.id,{expectedVersion:draft.version,review:{forms:{[draft.items[0].id]:{name:'SYNTHETIC preserved'}}}},randomUUID())).draft;
  await assert.rejects(service.changeManualKind(a,h,draft.id,{expectedVersion:draft.version,documentKind:'utility_bill'},randomUUID()),errorCode('onboarding_kind_has_data'));
  draft=(await service.saveReview(a,h,draft.id,{expectedVersion:draft.version,review:{pending:{key:randomUUID()}}},randomUUID())).draft;
  await assert.rejects(service.changeManualKind(a,h,draft.id,{expectedVersion:draft.version,documentKind:'utility_bill'},randomUUID()),errorCode('onboarding_kind_locked'));
  draft=(await service.saveReview(a,h,draft.id,{expectedVersion:draft.version,review:{forms:{}}},randomUUID())).draft;
  draft=(await service.changeManualKind(a,h,draft.id,{expectedVersion:draft.version,documentKind:'utility_bill'},randomUUID())).draft;
  await db.documentOrganization.create({data:{accountId:a,homeId:h,documentId:source.id,documentVersion:source.original.version,documentSha256:source.original.sha256,title:'SYNTHETIC bill only',parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],collections:['utilities']}});
  const result=await service.confirm(a,h,draft.id,{expectedVersion:draft.version,source:draft.snapshot,choices:[],documentOnly:true},randomUUID());assert.equal(result.draft.state,'confirmed');assert.equal(result.result.newObjects,0);assert.equal(result.result.newExpenses,0);assert.equal(await db.homeExpense.count({where:{documentId:source.id}}),0);
 });

 await t.test('contact acceptance and skip share the canonical confirmation, with replay, field protection and atomic rollback',async()=>{
  const fixture=require('./document-understanding-fixture.cjs'),{data}=require('./contacts-extraction-fixture.cjs');const x=data(),source=await document(fixture.pdf(x.lines)),draft=await extracted(source,x.raw),p=draft.contacts[0];assert.equal(p.values.phone,'030 1234567');const body={expectedVersion:draft.version,source:draft.snapshot,documentOnly:true,choices:[],contacts:[{proposalId:p.id,action:'save'}]},key=randomUUID();const saved=await service.confirm(a,h,draft.id,body,key,true);await service.confirm(a,h,draft.id,body,key,true);assert.equal(saved.result.newContacts,1);const id=saved.draft.contacts[0].decision.contactId;assert.equal(await db.homeContact.count({where:{accountId:a,homeId:h}}),1);
  const copy=await document(fixture.pdf(x.lines)),again=await extracted(copy,x.raw);await service.confirm(a,h,again.id,{expectedVersion:again.version,source:again.snapshot,documentOnly:true,choices:[],contacts:[{proposalId:again.contacts[0].id,action:'skip'}]},randomUUID());assert.equal(await db.contactResourceLink.count({where:{contactId:id}}),1);
  const fresh=await document(fixture.pdf([...x.lines,'Documento aggiuntivo'])),third=await extracted(fresh,x.raw);await assert.rejects(service.confirm(a,h,third.id,{expectedVersion:third.version,source:third.snapshot,documentOnly:true,choices:[],contacts:[{proposalId:third.contacts[0].id,action:'save',contactId:randomUUID(),expectedVersion:1}]},randomUUID()),errorCode('contact_version_conflict'));assert.equal((await db.objectOnboardingDraft.findUniqueOrThrow({where:{id:third.id}})).version,third.version);assert.equal(await db.contactResourceLink.count({where:{contactId:id}}),1);
  await service.confirm(a,h,third.id,{expectedVersion:third.version,source:third.snapshot,documentOnly:true,choices:[],contacts:[{proposalId:third.contacts[0].id,action:'save'}]},randomUUID(),true);assert.equal(await db.homeContact.count({where:{accountId:a,homeId:h}}),1);assert.equal(await db.contactResourceLink.count({where:{contactId:id}}),2);
 });
 await t.test('home pilot is account scoped, consent gated and persistent across budget instances',async()=>{
  const cfg=new OfflineConfig();cfg.env.ONBOARDING_AI_SCOPE='home';cfg.env.ONBOARDING_AI_ACCOUNT_ID=a;cfg.env.ONBOARDING_AI_HOME_ID=h;cfg.env.ONBOARDING_AI_ALLOWED_SHA256='';cfg.env.ONBOARDING_AI_BUDGET_USD='5';cfg.env.ONBOARDING_AI_MAX_CALLS='40';campaigns.push(cfg.campaign);
  const pilot=new OnboardingAiBudget(db,cfg),doc=await document(Buffer.concat([bytes,Buffer.from('\n%pilot-scope-'+randomUUID())]));
  assert.equal(pilot.requireSource(doc.original.sha256,a,h).maxCalls,40);assert.throws(()=>pilot.requireSource(doc.original.sha256,b,h));assert.throws(()=>pilot.requireSource(doc.original.sha256,a,randomUUID()));assert.throws(()=>pilot.requireSource(doc.original.sha256));
  const pilotAi=new OnboardingAiAnalysis(db,{}, {},pilot),pilotJobs=new OnboardingJobService(db,access,{read:async()=>bytes},pilotAi,objects);
  await assert.rejects(pilotJobs.start(a,h,{documentId:doc.id,provider:'anthropic',consentToProviderTransfer:false},randomUUID()));assert.equal(await db.objectOnboardingAttempt.count({where:{campaignId:cfg.campaign}}),0);
  const started=await pilotJobs.start(a,h,{documentId:doc.id,provider:'anthropic',consentToProviderTransfer:true},randomUUID());assert.equal(started.job.state,'queued');
  const second=new OnboardingAiBudget(db,cfg);let snap=await db.$transaction(tx=>second.snapshot(tx,doc.original.sha256,a,h));assert.equal(snap.callsUsed,1);assert.equal(snap.remainingUsd,'4.750000');
  await db.objectOnboardingJob.update({where:{id:started.job.id},data:{state:'uncertain'}});await db.objectOnboardingAttempt.update({where:{jobId:started.job.id},data:{state:'uncertain'}});
  await assert.rejects(pilotJobs.start(a,h,{documentId:doc.id,provider:'anthropic',consentToProviderTransfer:true},randomUUID()),errorCode('analysis_outcome_unknown'));
  snap=await db.$transaction(tx=>second.snapshot(tx,doc.original.sha256,a,h));assert.equal(snap.callsUsed,1);assert.equal(snap.remainingUsd,'4.750000');
 });
 await t.test('home pilot stops at either 5 USD or 40 analyses, including concurrent reservations',async()=>{
  for(const scenario of ['money','calls']){
   const cfg=new OfflineConfig();Object.assign(cfg.env,{ONBOARDING_AI_SCOPE:'home',ONBOARDING_AI_ACCOUNT_ID:a,ONBOARDING_AI_HOME_ID:h,ONBOARDING_AI_ALLOWED_SHA256:'',ONBOARDING_AI_BUDGET_USD:'5',ONBOARDING_AI_MAX_CALLS:'40'});campaigns.push(cfg.campaign);const pilot=new OnboardingAiBudget(db,cfg),doc=await document();
   await db.objectOnboardingCampaign.create({data:{id:cfg.campaign,limitMicroUsd:5000000,maxCalls:40}});
   const count=scenario==='money'?20:39,rows=Array.from({length:count+2},()=>({id:randomUUID(),accountId:a,homeId:h,documentId:doc.id,documentVersion:1,documentSha256:doc.original.sha256,mimeType:'application/pdf',provider:'anthropic',consentToProviderTransfer:true,key:randomUUID(),digest:randomUUID(),state:'failed'}));
   await db.objectOnboardingJob.createMany({data:rows});await db.objectOnboardingAttempt.createMany({data:rows.slice(0,count).map(row=>({jobId:row.id,campaignId:cfg.campaign,model,promptVersion:'offline',inputMicroUsdPerToken:2,outputMicroUsdPerToken:10,reservedMicroUsd:250000,actualMicroUsd:scenario==='money'?240000:1000,state:'settled'}))});
   if(scenario==='money'){await assert.rejects(db.$transaction(tx=>pilot.reserve(tx,rows[count].id,doc.original.sha256,a,h)),errorCode('ai_budget_exhausted'));}
   else {const results=await Promise.allSettled(rows.slice(count).map(row=>db.$transaction(tx=>pilot.reserve(tx,row.id,doc.original.sha256,a,h))));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);}
   const snap=await db.$transaction(tx=>new OnboardingAiBudget(db,cfg).snapshot(tx,doc.original.sha256,a,h));assert.equal(snap.available,false);assert.equal(snap.disabledReason,scenario==='money'?'ai_budget_exhausted':'ai_evaluation_limit_reached');assert(snap.callsUsed<=40);assert(Number(snap.committedUsd)<=5);
  }
 });

 await t.test('home pilot processes the same consented job end to end without a hash allowlist',async()=>{
  const cfg=new OfflineConfig();Object.assign(cfg.env,{ONBOARDING_AI_SCOPE:'home',ONBOARDING_AI_ACCOUNT_ID:a,ONBOARDING_AI_HOME_ID:h,ONBOARDING_AI_ALLOWED_SHA256:'',ONBOARDING_AI_BUDGET_USD:'5',ONBOARDING_AI_MAX_CALLS:'40'});campaigns.push(cfg.campaign);
  const budget=new OnboardingAiBudget(db,cfg),tr=new ObjectOnboardingAnthropicTransport(cfg);mode='ok';tr.fetchImpl=transport.fetchImpl;
  const analysis=new OnboardingAiAnalysis(db,new ObjectOnboardingAnthropicProvider(new PdfTextExtractor(),tr),tr,budget),workerJobs=new OnboardingJobService(db,access,{read:async key=>content.get(key)},analysis,objects);
  const doc=await document(Buffer.concat([bytes,Buffer.from('\n%home-worker-'+randomUUID())])),started=await workerJobs.start(a,h,{documentId:doc.id,provider:'anthropic',consentToProviderTransfer:true},randomUUID()),sentBefore=sent;
  cfg.env.ONBOARDING_AI_ACCOUNT_ID=b;assert.equal(await workerJobs.claim(started.job.id),null);cfg.env.ONBOARDING_AI_ACCOUNT_ID=a;
  cfg.env.ONBOARDING_AI_HOME_ID=randomUUID();assert.equal(await workerJobs.claim(started.job.id),null);cfg.env.ONBOARDING_AI_HOME_ID=h;
  const claimed=await workerJobs.claim(started.job.id);assert.equal(claimed.id,started.job.id);await workerJobs.run(claimed);
  const completed=await db.objectOnboardingJob.findUnique({where:{id:started.job.id}});assert.equal(completed.state,'succeeded');assert(completed.draftId);assert.equal(sent-sentBefore,1);
  assert.equal((await service.getDraft(a,h,completed.draftId,{})).draft.items.length,2);assert.equal(await workerJobs.claim(started.job.id),null);assert.equal(sent-sentBefore,1);assert.equal(await db.objectOnboardingAttempt.count({where:{campaignId:cfg.campaign}}),1);
 });

});
