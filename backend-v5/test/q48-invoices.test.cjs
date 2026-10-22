global.fetch=async()=>{throw Error('network_forbidden');};
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {q48}=require('./q48-fixture.cjs'),{wire}=require('./document-understanding-fixture.cjs');
const {ObjectOnboardingAnthropicProvider}=require('../dist/object-onboarding/anthropic-provider');
const {productExtraction}=require('../dist/object-onboarding/domain'),{automaticPlan}=require('../dist/object-onboarding/automatic-plan');
function decode(f){const provider=new ObjectOnboardingAnthropicProvider(null,null);provider.logger={warn:()=>{}};return provider.decode({id:'msg_offline',model:'offline',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:100},content:[{type:'text',text:JSON.stringify(wire(f.raw))}]},{request:{model:'offline',max_tokens:4096},context:f.context}).output;}
test('Q48 yields two independently identified, page-bound invoices matching unchanged gold',()=>{
 const f=q48(),out=decode(f);assert.equal(out.items.length,0);assert.equal(out.purchaseTotal,null);assert.equal(out.needsReview,true);assert.equal(out.houseExpenses.length,2);assert.throws(()=>automaticPlan(out));
 out.houseExpenses.forEach((e,i)=>{const g=f.original.gold.expenses[i];assert.equal(e.amountCandidates[0].amountCents,g.amountCents);assert.equal(e.proposedFields.supplier.value,g.supplier);assert.equal(e.proposedFields.documentDate.value,g.date);assert.equal(e.invoiceSegment.page,i+1);assert(e.amountCandidates[0].sources.every(s=>s.page===i+1&&s.sha256===f.original.sha256));});assert.notEqual(out.houseExpenses[0].id,out.houseExpenses[1].id);
});
test('segment identity is stable across candidate ids and order, and independent of the copy document id',()=>{
 const f=q48(),one=decode(f);f.raw.houseExpenses.reverse();f.raw.houseExpenses.forEach(e=>e.amountCandidates[0].id='different');const two=decode(f);assert.deepEqual(one.houseExpenses.map(e=>e.id).sort(),two.houseExpenses.map(e=>e.id).sort());f.context.snapshot={...f.snapshot,documentId:require('node:crypto').randomUUID()};const copy=decode(f);assert.deepEqual(two.houseExpenses.map(e=>e.fingerprint),copy.houseExpenses.map(e=>e.fingerprint));assert.notEqual(two.houseExpenses[0].id,copy.houseExpenses[0].id);
});
test('missing invoice anchors, copied identities, overlapping pages and global allocations are rejected',()=>{
 const mutations=[f=>delete f.raw.houseExpenses[1].fields.supplier,f=>delete f.raw.houseExpenses[1].fields.documentNumber,f=>delete f.raw.houseExpenses[1].fields.documentDate,f=>{f.raw.houseExpenses[1].fields.documentNumber.evidence.page=1;},f=>{f.raw.houseExpenses[1].amountCandidates[0].evidence.page=1;},f=>{f.raw.purchaseTotal={amountCents:36600,evidence:f.raw.houseExpenses[0].amountCandidates[0].evidence};},f=>{f.raw.houseExpenses[1].fields.documentNumber={...f.raw.houseExpenses[1].fields.documentNumber,value:'Q48/2026',evidence:{...f.raw.houseExpenses[1].fields.documentNumber.evidence,excerpt:'Numero Q48/2026'}};f.raw.houseExpenses[1].fields.supplier.value='Idroquarzo Collaudo';f.raw.houseExpenses[1].fields.supplier.evidence.excerpt='Idroquarzo Collaudo';f.raw.houseExpenses[1].fields.documentDate.value='2026-09-18';f.raw.houseExpenses[1].fields.documentDate.evidence.excerpt='Data documento: 18/09/2026';}];
 for(const mutate of mutations){const f=q48();mutate(f);assert.throws(()=>decode(f));}
});
test('a second invoice cannot borrow a region, page, amount or anchor outside the sent prefix',()=>{
 for(const mutate of [f=>{f.context.allowedPages=[1];},f=>{f.raw.houseExpenses[1].fields.supplier.evidence.region=null;},f=>{f.raw.houseExpenses[1].amountCandidates[0].amountCents=36600;},f=>{f.raw.houseExpenses[1].fields.documentDate.evidence.excerpt='Data documento: 18/09/2026';}]){const f=q48();mutate(f);assert.throws(()=>decode(f));}
});
test('same money or invoice number alone never merges different suppliers and physical invoices',()=>{
 const f=q48();f.raw.houseExpenses[1].amountCandidates[0].amountCents=12200;f.raw.houseExpenses[1].amountCandidates[0].evidence.excerpt='Totale documento: EUR 122,00';f.raw.houseExpenses[1].fields.documentNumber.value='Q48/2026';f.raw.houseExpenses[1].fields.documentNumber.evidence.excerpt='Numero fattura Q48/2026';const out=decode(f);assert.equal(out.houseExpenses.length,2);assert.notEqual(out.houseExpenses[0].invoiceSegment.key,out.houseExpenses[1].invoiceSegment.key);assert.throws(()=>automaticPlan(out));
});
test('abbreviating printed invoice identifiers cannot change its source-page identity',()=>{
 const f=q48(),before=decode(f);f.raw.houseExpenses[0].fields.supplier.value='Idroquarzo';f.raw.houseExpenses[0].fields.documentNumber.value='Q48';const after=decode(f);assert.equal(before.houseExpenses[0].invoiceSegment.key,after.houseExpenses[0].invoiceSegment.key);assert.equal(before.houseExpenses[0].id,after.houseExpenses[0].id);
});
test('single proposal in a multipage invoice is segmented and records the missing physical page',()=>{
 const f=q48();f.raw.houseExpenses.pop();const out=productExtraction(f.raw,f.context);assert.equal(out.houseExpenses.length,1);assert.equal(out.houseExpenses[0].invoiceSegment.page,1);assert.deepEqual(out.invoiceCoverage.pendingPages,[2]);
});
test('actual Q48 visual PDF crosses preparation and scoring with in-memory transport only',async()=>{
 const f=q48(),{createModelAdapter}=require('./quality-v3-model.cjs'),{fakeTransport,MODEL}=require('./quality-v3-model-fixture.cjs'),{detailed}=require('./quality-v3-measures.cjs');
 const transport=fakeTransport({reply:()=>wire(f.raw)}),adapter=createModelAdapter({model:MODEL,transport:transport.transport});let checks=0;
 const result=await adapter({id:'Q48',documentId:f.snapshot.documentId,documentVersion:1,sha256:f.original.sha256,gold:f.original.gold},{model:MODEL,reserveMicroUsd:250000,authorize:async()=>{checks++;}});
 assert.equal(result.observation.failureCode,null);assert.equal(result.automatic,'review');assert.equal(result.observation.complete,false);assert(checks>=4);assert.equal(transport.sends(),1);
 const request=transport.requests.find(r=>r.endpoint==='messages').body,original=request.messages[0].content[0];assert.equal(original.type,'document');assert.equal(original.source.data,f.original.bytes.toString('base64'));
 const score=detailed(f.original.gold,result.output,result.automatic);assert.deepEqual(score.measures.expenseAmountCents,{correct:2,total:2});assert.deepEqual(score.measures.expenseSupplier,{correct:2,total:2});assert.deepEqual(score.measures.expenseDate,{correct:2,total:2});assert.equal(score.detailedCriticalErrors,0);
});
