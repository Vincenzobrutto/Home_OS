// Deidentified manual observations: NOT OCR, provider output or new campaign gold.
global.fetch=async()=>{throw Error('network_forbidden');};
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {productExtraction}=require('../dist/object-onboarding/domain');
const {proposedProfile}=require('../dist/object-onboarding/profile');
const {purchaseDateSource,orderDateSource}=require('../dist/object-onboarding/invoice-evidence');
const {automaticPlan}=require('../dist/object-onboarding/automatic-plan');
const {requiresPaymentReview}=require('../dist/object-onboarding/payment-review');
const ev=(excerpt,page=1)=>({page,excerpt,region:null});
function fixture(coffee=false){
 const name=coffee?'De’Longhi Rivelia EXAM440.35.B':'Frigorifero Combinato da Incasso Samsung';
 const date=coffee?'Ordine effettuato il: 14 giugno 2026':'Data di Ordine: 13/10/2024';
 const total=coffee?'Totale: 499,00 €':'PREZZO TOTALE € 924,15';
 const shipping=coffee?'Costi di spedizione: 0,00 €':'Spese di spedizione € 75,00';
 // Manual normalized row role: actual visual product line lacks this explicit role label.
 const price=name+' Prezzo articolo: '+(coffee?'499,00':'849,15')+' EUR';
 const lines=['Riepilogo dell’ordine',date,name,price,total,shipping,coffee?'Metodo di pagamento: conto bancario':'PAYPAL'];
 const raw={documentKind:'order_confirmation',documentInfo:[{kind:'purchase_order',title:lines[0],evidence:ev(lines[0])}],facts:[{subjectIndex:-1,field:'shippingCost',value:coffee?'0,00 €':'€ 75,00',evidence:ev(shipping)}],hasMoreItems:false,purchaseTotal:{amountCents:coffee?49900:92415,evidence:ev(total)},items:[{fields:{name:{value:name,evidence:ev(name)},orderDate:{value:coffee?'2026-06-14':'2024-10-13',evidence:ev(date)}},purchaseAmount:{amountCents:coffee?49900:84915,evidence:ev(price)},quantity:null,nameTruncated:false,disposition:'household_object',confidence:'high'}]};
 return {raw,lines,context:{kind:'text',pages:[lines.join('\n')],snapshot:{documentId:randomUUID(),documentVersion:1,documentSha256:'a'.repeat(64)}}};
}
for(const coffee of [false,true])test((coffee?'coffee':'Samsung')+': manual observations preserve order, row price, shipping and grand total independently',()=>{
 const f=fixture(coffee),x=productExtraction(f.raw,f.context),p=proposedProfile(x.items[0]);
 assert.equal(x.items.length,1);assert.equal(x.items[0].purchaseAmount.amountCents,coffee?49900:84915);assert.equal(x.purchaseTotal.amountCents,coffee?49900:92415);
 assert.equal(p.orderDate.value,coffee?'2026-06-14':'2024-10-13');assert.equal(p.purchaseDate,undefined);assert.equal(p.deliveredDate,undefined);assert.equal(p.warrantyStart,undefined);assert.equal(p.warrantyEnd,undefined);
 assert.equal(x.documentInfo.facts[0].field,'shippingCost');assert.equal(x.houseExpenses,undefined);assert.equal(p.serialNumber,undefined);if(!coffee)assert.equal(p.model,undefined);
 assert(requiresPaymentReview(x));assert.throws(()=>automaticPlan(x));
});
test('order labels never certify purchase/payment dates; bare dates borrow only their own order label',()=>{
 for(const label of ['Il tuo ordine del','Ordine effettuato il:','Data di Ordine:','Order date']){
 const quote=label+' 14 giugno 2026';assert.equal(purchaseDateSource(quote,'2026-06-14'),null);assert.equal(orderDateSource(quote,'2026-06-14'),quote);
 assert.equal(orderDateSource('14 giugno 2026','2026-06-14',quote),quote);
 }
 for(const quote of ['Data stampa 14 giugno 2026','Consegna prevista 14 giugno 2026','Pagamento 14 giugno 2026','Ordine effettuato il 14 giugno'])assert.equal(orderDateSource(quote,'2026-06-14'),null);
 assert.equal(orderDateSource('14 giugno 2026','2026-06-14','Ordine effettuato il\nCliente\n14 giugno 2026'),null);
});
test('provider cannot turn order date into purchase date; older drafts remap that proposal without warranty',()=>{
 const f=fixture(true),field=f.raw.items[0].fields.orderDate;f.raw.items[0].fields.purchaseDate=field;
 const x=productExtraction(f.raw,f.context);assert.equal(x.items[0].fields.purchaseDate,undefined);assert(x.needsReview);assert(x.reviewWarnings.some(w=>w.field==='item:0:purchaseDate'));
 const legacy=structuredClone(x.items[0]);delete legacy.fields.orderDate;legacy.fields.purchaseDate={value:field.value,source:{...x.items[0].fields.orderDate.source}};
 const p=proposedProfile(legacy);assert.equal(p.orderDate.value,field.value);assert.equal(p.purchaseDate,undefined);assert.equal(p.warrantyStart,undefined);
 assert(requiresPaymentReview({...x,documentKind:'purchase_document',items:[legacy]}));
});
test('delivery without year, return deadline and printing timestamp cannot fill effective dates',()=>{
 for(const [value,quote] of [['2026-06-16','Consegnato 16 giugno'],['2026-06-30','Periodo utile per il reso 30 giugno 2026'],['2026-08-01','Stampa 01/08/2026']]){
 const f=fixture(true);f.context.pages[0]+='\n'+quote;f.raw.items[0].fields.deliveredDate={value,evidence:ev(quote)};
 const x=productExtraction(f.raw,f.context);assert.equal(x.items[0].fields.deliveredDate,undefined);assert.equal(proposedProfile(x.items[0]).warrantyStart,undefined);assert(x.needsReview);
 }
});
test('taxable, discount, shipping and payment recap never replace a grand total or item price',()=>{
 for(const quote of ['Subtotale € 1.099,00','Sconto totale € 249,85','Spese di spedizione € 75,00','Totale IVA esclusa 409,02 €','PAYPAL € 924,15']){
 const f=fixture();f.context.pages[0]+='\n'+quote;f.raw.purchaseTotal={amountCents:92415,evidence:ev(quote)};
 const x=productExtraction(f.raw,f.context);assert.equal(x.purchaseTotal,null);assert(x.needsReview);assert.equal(x.items[0].purchaseAmount.amountCents,84915);
 }
 const f=fixture();f.raw.items[0].purchaseAmount.evidence=ev(f.lines[2]+'\n'+f.lines[5]);f.context.pages[0]+='\n'+f.raw.items[0].purchaseAmount.evidence.excerpt;f.raw.items[0].purchaseAmount.amountCents=7500;
 assert.equal(productExtraction(f.raw,f.context).items[0].purchaseAmount,undefined);
});
test('shipping fact requires complete printed role and currency, never arithmetic or another page',()=>{
 for(const quote of ['Spedizione 75,00','75,00 €','Sconto totale 75,00 €']){
 const f=fixture();f.context.pages[0]+='\n'+quote;f.raw.facts[0].evidence=ev(quote);assert.equal(productExtraction(f.raw,f.context).documentInfo.facts.length,0);
 }
 const f=fixture();f.raw.facts[0].evidence.page=2;const x=productExtraction(f.raw,f.context);assert.equal(x.documentInfo.facts.length,0);assert(x.needsReview);assert(x.reviewWarnings.some(w=>w.field==='-1:shippingCost'));
});
test('ambiguous accessory remains uncertain; duplicate page/product is rejected, not a second refrigerator',()=>{
 const f=fixture();const item=structuredClone(f.raw.items[0]);item.fields={name:{value:'Altro Incasso',evidence:ev('Altro Incasso')}};item.purchaseAmount=null;item.disposition='uncertain';f.context.pages[0]+='\nAltro Incasso';f.raw.items.push(item);
 const x=productExtraction(f.raw,f.context);assert.equal(x.items[1].disposition,'uncertain');assert.throws(()=>automaticPlan(x));
 f.raw.items=[f.raw.items[0],structuredClone(f.raw.items[0])];assert.throws(()=>productExtraction(f.raw,f.context),e=>e.code==='object_onboarding_repeated_item');
});

test('actual-looking visual price lines without a verified row role stay manual, with identity preserved',()=>{
 for(const coffee of [false,true]){
 const f=fixture(coffee),name=f.raw.items[0].fields.name.value,quote=name+'\n'+(coffee?'499,00 €':'€ 849,15');f.raw.items[0].purchaseAmount.evidence={page:1,excerpt:quote,region:{x:0.1,y:0.2,width:0.7,height:0.2}};
 for(const field of Object.values(f.raw.items[0].fields))field.evidence.region={x:0.1,y:0.1,width:0.7,height:0.2};f.raw.purchaseTotal.evidence.region={x:0.1,y:0.5,width:0.7,height:0.1};f.raw.documentInfo[0].evidence.region={x:0.1,y:0.05,width:0.7,height:0.1};f.raw.facts[0].evidence.region={x:0.1,y:0.5,width:0.7,height:0.1};
 const x=productExtraction(f.raw,{kind:'visual_pdf',pageCount:coffee?1:2,snapshot:f.context.snapshot});assert.equal(x.items[0].purchaseAmount,undefined);assert.equal(x.items[0].fields.name.value,name);assert.equal(x.items[0].fields.orderDate.source.basis,'provider_observed_image');assert(x.needsReview);assert.throws(()=>automaticPlan(x));
 }
});

test('repeated order product on a different physical page is rejected, not a second object',()=>{
 const f=fixture();f.context.pages.push(f.context.pages[0]);const repeated=structuredClone(f.raw.items[0]);
 for(const v of Object.values(repeated.fields))v.evidence.page=2;repeated.purchaseAmount.evidence.page=2;f.raw.items.push(repeated);
 assert.throws(()=>productExtraction(f.raw,f.context),e=>e.code==='object_onboarding_repeated_item');
});

test('a delivery notice cannot relabel an order heading as purchase date',()=>{
 const f=fixture();f.raw.documentInfo=undefined;f.raw.facts=undefined;f.raw.documentKind='delivery_notice';f.raw.purchaseTotal=null;f.raw.items[0].purchaseAmount=null;f.raw.items[0].fields.purchaseDate=f.raw.items[0].fields.orderDate;delete f.raw.items[0].fields.orderDate;
 const x=productExtraction(f.raw,f.context);assert.equal(x.items[0].fields.purchaseDate,undefined);assert(x.needsReview);
});

test('shipping value is the whole cited monetary value, never a substring or changed currency position',()=>{
 for(const value of ['75','75,00','75,00 €','€ 5,00','€ 750,00']){const f=fixture();f.raw.facts[0].value=value;const x=productExtraction(f.raw,f.context);assert.equal(x.documentInfo.facts.length,0);assert(x.needsReview);}
});
