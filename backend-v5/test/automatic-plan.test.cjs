const {test}=require('node:test'),assert=require('node:assert/strict');
const {automaticPlan,AutomaticReviewNeeded}=require('../dist/object-onboarding/automatic-plan');
const s={documentId:'00000000-0000-4000-8000-000000000001',documentVersion:1,sha256:'a'.repeat(64),page:1,excerpt:'synthetic',basis:'verified_text',region:null};
const v=(value,excerpt='synthetic')=>({value,source:{...s,excerpt}});
// Projected output of a fully checked textual source. These are fixtures, not
// permission to bypass the production validator or infer payment from an order.
const verified=()=>({evidenceMode:'text',paymentReview:{documentId:s.documentId,documentVersion:s.documentVersion,documentSha256:s.sha256,policy:'payment-review-v1',reason:null}});
const product=()=>({...verified(),documentKind:'purchase_document',needsReview:false,purchaseTotal:{amountCents:49900,source:s},items:[{id:'one',fingerprint:'a',quantity:{value:1,source:s},nameTruncated:false,disposition:'household_object',objectType:{value:'appliance',certainty:'certain',source:{...s,excerpt:'Elettrodomestico: Macchina caffe sintetica'}},fields:{name:v('Macchina caffe sintetica'),brand:v('Lume'),model:v('A1'),purchaseDate:v('2026-06-14','Data acquisto: 14/06/2026')}}]});
test('clear purchase creates one object and one proven purchase cost',()=>{const p=automaticPlan(product());assert.equal(p.choices[0].expense.amountCents,49900);assert.equal(p.choices[0].expense.spentOn,'2026-06-14');assert.equal(p.choices[0].fields.brand.action,'accept');});
for(const [title,change]of [['date',o=>delete o.items[0].fields.purchaseDate],['amount',o=>o.purchaseTotal=null],['truncated',o=>o.items[0].nameTruncated=true],['consumable',o=>o.items[0].disposition='consumable'],['quantity',o=>o.items[0].quantity=null],['multiple units',o=>o.items[0].quantity.value=2],['incomplete source',o=>o.needsReview=true],['warning',o=>o.reviewWarnings=[{field:'name',reason:'missing'}]]])test('asks for targeted review: '+title,()=>{const o=product();change(o);assert.throws(()=>automaticPlan(o),AutomaticReviewNeeded);});
test('two known line prices remain separate; the grand total is never copied twice',()=>{const o=product();o.items[0].purchaseAmount={amountCents:30000,source:s};o.items.push({...structuredClone(o.items[0]),id:'two',fingerprint:'b',purchaseAmount:{amountCents:19900,source:s}});const p=automaticPlan(o);assert.deepEqual(p.choices.map(c=>c.expense.amountCents),[30000,19900]);delete o.items[1].purchaseAmount;assert.throws(()=>automaticPlan(o),AutomaticReviewNeeded);});
test('house document creates no asset or expense',()=>{assert.deepEqual(automaticPlan({documentKind:'house_document',needsReview:false,items:[],purchaseTotal:null,documentInfo:{kind:'floor_plan'}}),{choices:[],documentOnly:true});});
const bill=()=>({...verified(),documentKind:'utility_bill',needsReview:false,items:[],purchaseTotal:null,houseExpenses:[{id:'cost',documentKind:'utility_bill',proposedFields:{competenceFrom:{value:'2025-08-01'},competenceTo:{value:'2025-08-31'},title:{value:'Energia sintetica'},category:{value:'electricity'},documentDate:{value:'2025-09-23'}},amountCandidates:[{id:'total',role:'current_document_total',amountCents:6797}],amountSelectionRequired:false}]});
test('bill creates only a house expense',()=>{const p=automaticPlan(bill());assert.equal(p.choices.length,0);assert.equal(p.houseExpenses[0].values.amountCents,6797);assert.equal(p.houseExpenses[0].values.objectRef,null);});
test('bill with TV fee, arrears or ambiguous totals requires review instead of dropping money',()=>{const o=bill();o.houseExpenses[0].amountCandidates.push({id:'due',role:'amount_due',amountCents:7697});assert.throws(()=>automaticPlan(o),AutomaticReviewNeeded);});
test('device label can create a sheet without inventing a purchase',()=>{const o=product();o.documentKind='device_label';o.purchaseTotal=null;delete o.items[0].fields.purchaseDate;assert.equal(automaticPlan(o).choices[0].expense.action,'skip');});

test('a bill without service period is never automatically saved under issue month',()=>{const b=bill();delete b.houseExpenses[0].proposedFields.competenceFrom;assert.throws(()=>automaticPlan(b),AutomaticReviewNeeded);});

for(const [label,change,message] of [
 ['missing payment policy',o=>delete o.paymentReview,/regime di pagamento/],
 ['split payment',o=>{o.paymentReview.reason='split_payment';},/regime di pagamento/],
 ['unverified purchase date',o=>{o.items[0].fields.purchaseDate.source.excerpt='Data ordine: 14/06/2026';},/regime di pagamento/],
 ['missing type',o=>delete o.items[0].objectType,/tipologia/],
 ['uncertain type',o=>{o.items[0].objectType.certainty='uncertain';},/tipologia/],
 ['visual type source',o=>{o.items[0].objectType.source.basis='visual';},/tipologia/],
])test('current guard remains blocking: '+label,()=>{const o=product();change(o);assert.throws(()=>automaticPlan(o),e=>e instanceof AutomaticReviewNeeded&&message.test(e.message));});
