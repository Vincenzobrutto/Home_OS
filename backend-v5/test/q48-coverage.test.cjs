global.fetch=async()=>{throw Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {q48}=require('./q48-fixture.cjs'),{pagedWire,decode}=require('./q48-coverage-fixture.cjs');
const {productExtraction}=require('../dist/object-onboarding/domain');
const {invoicePageOutput,checkedInvoiceCoverage}=require('../dist/object-onboarding/invoice-coverage');
const {onboardingSchemaFor,onboardingWireOutput}=require('../dist/object-onboarding/anthropic-provider');
const {automaticPlan}=require('../dist/object-onboarding/automatic-plan');
const {progressiveComplete}=require('../dist/object-onboarding/reading');
const {detailed}=require('./quality-v3-measures.cjs');
test('visual schema requires a separate slot for every sent physical page, including a non-contiguous selection',()=>{
 const schema=onboardingSchemaFor('visual_pdf',[1,3]),slots=schema.properties.invoicePages;
 assert(schema.required.includes('invoicePages'));assert.deepEqual(slots.required,['p1','p3']);assert.equal(slots.additionalProperties,false);assert.equal(slots.properties.p1.properties.expenses.items.properties.fields.items.properties.evidence.type,'integer');
 assert(!onboardingSchemaFor('text').properties.invoicePages);assert(!onboardingSchemaFor('image').properties.invoicePages);
});
test('both Q48 page slots produce two independent complete proposals matching unchanged gold; review stays mandatory',()=>{
 const f=q48(),out=decode(f),s=detailed(f.original.gold,out,'review');
 assert.deepEqual(out.invoiceCoverage,{version:'invoice-coverage-v1',totalPages:2,sentPages:[1,2],coveredPages:[1,2],pendingPages:[]});
 for(const key of ['expenseAmountCents','expenseDate','expenseSupplier'])assert.deepEqual(s.measures[key],{correct:2,total:2});assert.equal(s.detailedCriticalErrors,0);
 assert.deepEqual(out.houseExpenses.map(e=>e.amountCandidates[0].amountCents),[12200,24400]);assert.equal(out.purchaseTotal,null);assert.deepEqual(out.items,[]);assert.equal(out.needsReview,true);assert.throws(()=>automaticPlan(out));
});
test('legacy single-proposal output cannot silently certify the second page; its identity is stable when coverage grows',()=>{
 const f=q48(),full=decode(f);f.raw.houseExpenses.pop();f.raw.requiresHumanReview=false;
 const one=productExtraction(f.raw,f.context);assert.deepEqual(one.invoiceCoverage.coveredPages,[1]);assert.deepEqual(one.invoiceCoverage.pendingPages,[2]);assert.equal(one.needsReview,true);assert.equal(one.houseExpenses[0].id,full.houseExpenses[0].id);assert.throws(()=>automaticPlan({...one,needsReview:false}));assert.equal(progressiveComplete({...one,needsReview:false}),false);
});
test('missing/extra page slots, duplicate invoices, global totals or costs, and cross-page proofs remain rejected',()=>{
 const f=q48();const mutations=[r=>delete r.invoicePages.p2,r=>r.invoicePages.p3=r.invoicePages.p2,r=>r.invoicePages.p2.expenses=[],r=>r.invoicePages.p1.expenses.push(r.invoicePages.p1.expenses[0]),r=>r.houseExpenses=r.invoicePages.p1.expenses,r=>r.purchaseTotal=[{amountCents:36600,evidence:0}],r=>r.invoicePages.p2.expenses=r.invoicePages.p1.expenses,r=>r.invoicePages.p2.kind='other'];
 for(const mutate of mutations){const raw=pagedWire(f);mutate(raw);assert.throws(()=>{const r=invoicePageOutput(raw,f.context);return productExtraction(onboardingWireOutput(r.output),{...f.context,invoiceExpensePages:r.expensePages});});}
 const foreign=pagedWire(f);assert.throws(()=>invoicePageOutput(foreign,{...f.context,allowedPages:[1]}));assert.throws(()=>invoicePageOutput(foreign,{kind:'image',snapshot:f.snapshot}));
});
test('unreadable, other and continuation pages stay explicitly pending without inventing an expense',()=>{
 const f=q48();for(const kind of ['unreadable','other','continuation']){const raw=pagedWire(f,[1,2],[2]);raw.invoicePages.p2.kind=kind;const r=invoicePageOutput(raw,f.context),out=productExtraction(onboardingWireOutput(r.output),{...f.context,invoiceExpensePages:r.expensePages});assert.equal(out.houseExpenses.length,1);assert.deepEqual(out.invoiceCoverage.pendingPages,[2]);assert.equal(out.houseExpenses[0].amountCandidates[0].amountCents,12200);}
 const input=pagedWire(f),before=JSON.stringify(input);invoicePageOutput(input,f.context);assert.equal(JSON.stringify(input),before);
});
test('progressive prefix records unseen page 2; metadata is bounded, complete, ordered and tied to the sent pages',()=>{
 const f=q48(),prefix=decode(f,[1]);assert.deepEqual(prefix.invoiceCoverage,{version:'invoice-coverage-v1',totalPages:2,sentPages:[1],coveredPages:[1],pendingPages:[2]});
 const safe=checkedInvoiceCoverage({...prefix.invoiceCoverage,raw:'PRIVATE'});assert(!JSON.stringify(safe).includes('PRIVATE'));
 for(const change of [{totalPages:21},{coveredPages:[1,2]},{coveredPages:[1,1]},{pendingPages:[]},{sentPages:[2,1]},{version:'forged'}])assert.throws(()=>checkedInvoiceCoverage({...safe,...change}));
 assert.throws(()=>productExtraction({...f.raw,invoiceCoverage:safe},f.context));
});
test('actual Q48 preparation, wire decode and durable-observation sanitizer cover both full pages and both prefixes offline',async()=>{
 const f=q48(),{createModelAdapter,checkedObservation}=require('./quality-v3-model.cjs'),{fakeTransport,MODEL}=require('./quality-v3-model-fixture.cjs');
 const fake=fakeTransport({reply:body=>pagedWire(f,Object.keys(body.output_config.format.schema.properties.invoicePages.properties).map(k=>Number(k.slice(1))))}),adapter=createModelAdapter({model:MODEL,transport:fake.transport});
 for(const input of [{mode:'full'},{mode:'local_pages'},{mode:'progressive',throughPage:1},{mode:'progressive',throughPage:2}]){
  const r=await adapter({id:'Q48',documentId:f.snapshot.documentId,documentVersion:1,sha256:f.original.sha256,gold:f.original.gold,...input},{model:MODEL,reserveMicroUsd:250000,authorize:async()=>{}});assert.equal(r.observation.failureCode,null);assert.equal(r.automatic,'review');assert.equal(r.output.houseExpenses.length,input.throughPage===1?1:2);assert.deepEqual(r.observation.invoiceCoverage.pendingPages,input.throughPage===1?[2]:[]);assert.equal(r.observation.complete,false);
  const packed=checkedObservation({...r.observation,raw:'PRIVATE'});assert(!JSON.stringify(packed).includes('PRIVATE'));assert(!JSON.stringify(packed).includes('Termonimbo'));assert.throws(()=>checkedObservation({...packed,invoiceCoverage:{...packed.invoiceCoverage,sentPages:[2]}}));
 }
 assert.equal(fake.sends(),4);
});
