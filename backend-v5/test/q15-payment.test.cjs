global.fetch=async()=>{throw Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {productExtraction}=require('../dist/object-onboarding/domain');
const {automaticPlan,AutomaticReviewNeeded}=require('../dist/object-onboarding/automatic-plan');
const {paymentReview,requiresPaymentReview}=require('../dist/object-onboarding/payment-review');
const {q15}=require('./q15-fixture.cjs'),fixtures=require('./document-understanding-fixture.cjs');
test('actual Q15 PDF: omitted payable and false model review cannot authorize the correct total automatically',async()=>{
 const f=await q15(),out=productExtraction(f.raw,f.context);
 assert.equal(f.original.gold.automatic,'review');assert.equal(f.original.gold.expenses[0].amountCents,24400);
 assert.equal(out.houseExpenses[0].amountCandidates.length,1);assert.equal(out.houseExpenses[0].amountCandidates[0].amountCents,24400);
 assert.equal(out.contacts[0].values.name,'Voltacervo Collaudo');assert.equal(out.contacts[0].values.fiscalId,'99900000300');
 assert.equal(out.reviewWarnings,undefined);assert.equal(out.houseExpenses[0].reviewWarnings,undefined);
 assert.equal(out.paymentReview.reason,'split_payment');assert.equal(out.needsReview,true);
 for(const contacts of [false,true])assert.throws(()=>automaticPlan({...out,needsReview:false},contacts),AutomaticReviewNeeded);
 assert.deepEqual(Object.keys(out.paymentReview).sort(),['documentId','documentSha256','documentVersion','policy','reason']);
});
test('source guard covers line breaks, hyphenation, case and fiscal wording without matching generic VAT or payment',()=>{
 const f=fixtures.works(),context=fixtures.context(f);
 for(const text of ['SPLIT\nPAYMENT','split-payment','split\u2011payment','splitpay\u00adment','Scissione\ndei pagamenti','IVA versata dal committente'])assert.equal(paymentReview({...context,pages:[text]}).reason,'split_payment',text);
 for(const text of ['IVA 22% EUR 44,00','Pagamento con bonifico','Totale da pagare EUR 244,00','split paymentXYZ','nonpayment'])assert.equal(paymentReview({...context,pages:[text]}).reason,null,text);
});
test('a source page excluded from the model prefix or local selection still blocks financial automation',()=>{
 const f=fixtures.works();f.raw.items=[];f.raw.facts=[];const context={...fixtures.context(f),allowedPages:[1],pages:[f.lines.join('\n'),'Condizioni contrattuali: scissione dei pagamenti']};
 const out=productExtraction(f.raw,context);assert.equal(out.paymentReview.reason,'split_payment');assert.throws(()=>automaticPlan(out));
});
test('ordinary service invoice remains automatic; legacy/unknown policy and mismatched source require review',()=>{
 const f=fixtures.works();f.raw.items=[];f.raw.facts=[];const context=fixtures.context(f),out=productExtraction(f.raw,context);
 assert.equal(out.needsReview,false);assert.equal(automaticPlan(out).houseExpenses[0].values.amountCents,153720);
 for(const paymentReview of [undefined,{...out.paymentReview,policy:'old'},{...out.paymentReview,reason:'unknown'}])assert.throws(()=>automaticPlan({...out,paymentReview}));
 assert.equal(requiresPaymentReview(out,context.snapshot),false);for(const change of [{documentId:'other'},{documentVersion:2},{documentSha256:'0'.repeat(64)}])assert.equal(requiresPaymentReview(out,{...context.snapshot,...change}),true);
});
test('source flags cannot be supplied by a provider; existing invalid amount and citation validation remains active',async()=>{
 const f=await q15();assert.throws(()=>productExtraction({...f.raw,paymentReview:{reason:null}},f.context));
 f.raw.houseExpenses[0].amountCandidates[0].amountCents=20000;const out=productExtraction(f.raw,f.context);assert.equal(out.houseExpenses[0].amountCandidates.length,0);assert(out.houseExpenses[0].reviewWarnings.length);assert.throws(()=>automaticPlan(out));
 f.raw.documentInfo[0].evidence.excerpt='Invented title';assert.throws(()=>productExtraction(f.raw,f.context));
});
test('real preparation, pooled decoding and model adapter keep Q15 under review in every reading mode, entirely in memory',async()=>{
 const f=await q15(),{createModelAdapter}=require('./quality-v3-model.cjs'),{MODEL,fakeTransport}=require('./quality-v3-model-fixture.cjs');
 const fake=fakeTransport({reply:()=>fixtures.wire(f.raw)}),adapter=createModelAdapter({model:MODEL,transport:fake.transport});
 for(const mode of ['full','local_pages','progressive']){
  const result=await adapter({id:'Q15',sha256:f.original.sha256,documentId:f.context.snapshot.documentId,documentVersion:1,gold:f.original.gold,mode,...(mode==='progressive'?{throughPage:1}:{})},{model:MODEL,reserveMicroUsd:250000,authorize:async()=>{}});
  assert.equal(result.observation.failureCode,null);assert.equal(result.output.houseExpenses[0].amountCandidates[0].amountCents,24400);assert.equal(result.automatic,'review');assert.equal(result.output.paymentReview.reason,'split_payment');
 }
 assert.equal(fake.sends(),3); // injected transport, zero external sockets
});
test('frozen v24 authorization is refused by the changed source policy, without any dispatch',()=>{
 const a=require('../../docs/v5/fase0-quality-v24-authorization-20261023.json');assert.throws(()=>require('./quality-v3-authorization.cjs').validateAuthorization(a,{campaignId:a.campaignId,model:a.model,maxCalls:150,budgetMicroUsd:12000000}),e=>e.code==='synthetic_authorization_mismatch');
});
