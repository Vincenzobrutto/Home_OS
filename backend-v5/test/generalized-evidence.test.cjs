// Offline contract variants, NOT an extraction benchmark or edited campaign gold.
global.fetch=async()=>{throw Error('network_forbidden');};
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {purchaseDateSource,orderDateSource,tableQuantity,tablePurchaseAmount}=require('../dist/object-onboarding/invoice-evidence');
const {purchaseGrandTotal,shippingMoney}=require('../dist/object-onboarding/role-evidence');
const {productExtraction}=require('../dist/object-onboarding/domain');
const {requiresPaymentReview,paymentReview}=require('../dist/object-onboarding/payment-review');
const ev=excerpt=>({page:1,excerpt,region:null});
const context=page=>({kind:'text',pages:[page],snapshot:{documentId:randomUUID(),documentVersion:1,documentSha256:'c'.repeat(64)}});
for(const label of ['Data dell’ordine','Data d’ordine','Ordine effettuato in data','Order placed on','Ordered on','Data ordine'])test('order role with different wording: '+label,()=>{
 const quote=label+'\n07/03/2024';assert.equal(orderDateSource(quote,'2024-03-07'),quote);assert.equal(purchaseDateSource(quote,'2024-03-07'),null);
 assert.equal(orderDateSource('07/03/2024','2024-03-07',quote),quote);assert.equal(orderDateSource('07/03/2024','2024-03-07',label+'\nUnrelated field\n07/03/2024'),null);
});
for(const label of ['Data d’acquisto','Acquisto effettuato in data','Purchased on','Acquisto del','Acquistato il'])test('purchase role with different wording: '+label,()=>{
 const quote=label+' : 2024-03-07';assert.equal(purchaseDateSource(quote,'2024-03-07'),quote);assert.equal(orderDateSource(quote,'2024-03-07'),null);
});
test('issue/payment/estimated/delivery dates and incomplete years never fill purchase/order',()=>{
 for(const quote of ['Data fattura 07/03/2024','Data di fattura: 07/03/2024','Issue date 07/03/2024','Payment date 07/03/2024','Delivery date 07/03/2024','Ordine del 07/03/2024 - consegna prevista 07/03/2024','Order date 07/03','Manufactured 07/03/2024']){
 assert.equal(purchaseDateSource(quote,'2024-03-07'),null);assert.equal(orderDateSource(quote,'2024-03-07'),null);
 }
});
for(const label of ['Importo totale','Totale ordine','Totale fattura','Grand total','Order total','Total amount'])test('grand total semantic role: '+label,()=>{
 assert(purchaseGrandTotal(label+'\nEUR 1,234.56',123456));assert(!purchaseGrandTotal(label+' EUR 1,234.56',123455));
 assert(!purchaseGrandTotal(label+' - 1.234,56 EUR',123456));assert(!purchaseGrandTotal(label+' 1.234,56 USD',123456));
});
test('subtotal, taxable, shipping, due balance, tax and payment never become a grand total',()=>{
 for(const label of ['Subtotale','Subtotal','Totale IVA esclusa','Tax total','Totale da pagare','Amount due','Shipping total','Sconto totale','Payment total'])assert(!purchaseGrandTotal(label+' EUR 123,45',12345));
 for(const value of ['Totale 1,23,45 EUR','Totale EUR 12,00 IVA EUR 3,45','Totale 123,45%','Totale -123,45 EUR','Totale (123,45 EUR)'])assert(!purchaseGrandTotal(value,12345));
});
for(const label of ['Spedizione','Spese di trasporto','Costi trasporto','Shipping charges','Shipping cost','Delivery fee'])test('shipping semantic role: '+label,()=>{
 assert.equal(shippingMoney(label+' :\nEUR 12.34'),'EUR 12.34');assert.equal(shippingMoney(label+' 0,00 €'),'0,00 €');assert.equal(shippingMoney(label+' -12,34 EUR'),null);
});
test('free shipping wording, percentages, payment balances and ambiguous amounts stay absent',()=>{
 for(const quote of ['Shipping free','Delivery date: 07/03/2024','Shipping 12%','Spedizione 12,00 USD','Shipping EUR 12.00 EUR 3.00','Spedizione -12,00 EUR','Metodo di pagamento € 12,00'])assert.equal(shippingMoney(quote),null);
});
const permutations=xs=>xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>i!==j)).map(rest=>[x,...rest])):[[]];
const roles=['description','quantity','unit','total'];
const labels={description:'Product',quantity:'Qty.',unit:'Unit price (EUR)',total:'Line total (EUR)'};
for(const [index,order] of permutations(roles).entries())test('column permutation '+index+' keeps printed price and quantity, independent of names/amounts',()=>{
 const name='NuovaMarca apparato '+index,amount=12345+index*137,money=(amount/100).toFixed(2),separator=[' | ','\t',';'][index%3];
 const row={description:name,quantity:'2',unit:'1.01',total:money};
 const quote=[order.map(k=>labels[k]).join(separator),order.map(k=>row[k]).join(separator)].join('\n');
 assert.equal(tableQuantity(quote,name),2);assert.equal(tablePurchaseAmount(quote,name),amount);assert.equal(tablePurchaseAmount(quote,'Missing product'),null);
 const missing=[order.map(k=>labels[k]).join(separator),order.map(k=>k==='total'?'':row[k]).join(separator)].join('\n');assert.equal(tablePurchaseAmount(missing,name),null);
 assert.equal(tablePurchaseAmount(quote+'\n'+order.map(k=>row[k]).join(separator),name),null);
});
test('no table inference from unit price, foreign currencies, cross-row cells or repeated headers',()=>{
 for(const header of ['Descrizione\tQuantità\tTotale (EUR)\tTotale (EUR)','Descrizione\tQuantità\tQuantità\tTotale (EUR)']){const quote=header+'\nAster apparato\t1\t10,00 EUR\t20,00 EUR';assert.equal(tablePurchaseAmount(quote,'Aster apparato'),null);assert.equal(tableQuantity(quote,'Aster apparato'),null);}
 for(const quote of ['Product | Quantity | Unit price (EUR)\nAster apparato | 3 | 10.00','Product | Quantity | Total (EUR)\nAster apparato | 3 | USD 10.00','Product | Quantity | Total\nAster apparato | 3 | 10.00','Product | Quantity | Total (EUR)\nAster apparato | 3 |\nOther item | 1 | 10.00','Product | Quantity | Total (EUR)\nAster apparato | 3 | 10.00\nProduct | Total (EUR) | Quantity\nAster apparato | 20.00 | 2'])assert.equal(tablePurchaseAmount(quote,'Aster apparato'),null);
});
function fixture(){
 const name='AsterNova apparato Z7',table='Total (EUR) | Product | Quantity | Unit price (EUR)\n123.45 | '+name+' | 1 | 8.00',date='Purchased on: 2024-03-07',total='Grand total: EUR 135.79';
 const page=[table,date,total].join('\n');return {name,table,date,total,ctx:context(page),raw:{documentKind:'purchase_document',hasMoreItems:false,items:[{fields:{name:{value:name,evidence:ev(name)},brand:{value:'AsterNova',evidence:ev(name)},purchaseDate:{value:'2024-03-07',evidence:ev(date)}},quantity:{value:1,evidence:ev(table)},purchaseAmount:{amountCents:12345,evidence:ev(table)},nameTruncated:false,disposition:'household_object',confidence:'high'}],purchaseTotal:{amountCents:13579,evidence:ev(total)}}};
}
test('complete validator accepts unknown explicit brand and reordered columns, without allocating shipping',()=>{
 const f=fixture(),x=productExtraction(f.raw,f.ctx);assert.equal(x.items[0].fields.brand.value,'AsterNova');assert.equal(x.items[0].purchaseAmount.amountCents,12345);assert.equal(x.purchaseTotal.amountCents,13579);assert.equal(x.items[0].quantity.value,1);assert(!x.needsReview);
});
test('unknown price layout or forged optional citation keeps readable identity, with field-specific review',()=>{
 const f=fixture();f.raw.items[0].purchaseAmount.evidence=ev('unseen private material');const x=productExtraction(f.raw,f.ctx);assert.equal(x.items[0].fields.name.value,f.name);assert.equal(x.items[0].purchaseAmount,undefined);assert(x.needsReview);assert(x.reviewWarnings.some(w=>w.field==='0:purchaseAmount'));assert(!JSON.stringify(x).includes('unseen private material'));
});
test('a bare price cannot borrow a semantic role from another page',()=>{
 const f=fixture();f.raw.items[0].purchaseAmount.evidence=ev(f.name+' EUR 123.45');f.ctx.pages[0]+='\n'+f.raw.items[0].purchaseAmount.evidence.excerpt;f.ctx.pages.push('Prezzo articolo EUR 123.45');assert.equal(productExtraction(f.raw,f.ctx).items[0].purchaseAmount,undefined);
});
test('payment guard recognizes order-date role, not order substrings in unrelated text',()=>{
 const f=fixture(),x=productExtraction(f.raw,f.ctx);x.items[0].fields.purchaseDate.source.excerpt='Purchased on 2024-03-07; border reference';assert.equal(requiresPaymentReview(x),false);
 x.items[0].fields.purchaseDate.source.excerpt='Order placed on 2024-03-07';assert.equal(requiresPaymentReview(x),true);assert.equal(paymentReview(f.ctx).reason,null);
});
test('local verified invoice fallback shares purchase semantics rather than a second fixed heading',()=>{
 const {verifiedInvoiceLine}=require('../dist/object-onboarding/invoice-lines');
 const table='Descrizione Quantità / periodo Importo\nAsterNova apparato Quantità: 1 EUR 123,45';
 for(const label of ['Acquistato il','Purchased on','Acquisto effettuato in data'])assert.equal(verifiedInvoiceLine(context(label+' 2024-03-07\n'+table),'AsterNova apparato',1).purchaseDate.value,'2024-03-07');
 for(const label of ['Data fattura','Ordine del','Payment date'])assert.equal(verifiedInvoiceLine(context(label+' 2024-03-07\n'+table),'AsterNova apparato',1).purchaseDate,null);
});

test('a purchase date qualified for one product is never copied to every invoice row',()=>{
 const {verifiedInvoiceLine}=require('../dist/object-onboarding/invoice-lines'),table='Descrizione Quantità / periodo Importo\nAsterNova apparato Quantità: 1 EUR 123,45';
 for(const label of ['Purchased on 2024-03-07 only this product','Acquisto del 07/03/2024 solo un articolo'])assert.equal(verifiedInvoiceLine(context(label+'\n'+table),'AsterNova apparato',1).purchaseDate,null);
});

test('a free-form row cannot borrow another product price merely because its name is in the quote',()=>{
 const f=fixture();
 for(const quote of [f.name+' EUR 123.45\nAnother product - Line total EUR 99.00',f.name+'\nAnother product - Line total EUR 123.45']){
 f.ctx.pages[0]+='\n'+quote;f.raw.items[0].purchaseAmount.evidence=ev(quote);const x=productExtraction(f.raw,f.ctx);assert.equal(x.items[0].purchaseAmount,undefined);assert.equal(x.items[0].fields.brand.value,'AsterNova');assert(x.needsReview);
 }
});
test('a labelled row with a different separator or name prefix keeps its own printed amount',()=>{
 const f=fixture();for(const quote of ['Product: '+f.name+' — Row total: EUR 123.45',f.name+' Importo riga = 123,45 €']){
 f.ctx.pages[0]+='\n'+quote;f.raw.items[0].purchaseAmount.evidence=ev(quote);assert.equal(productExtraction(f.raw,f.ctx).items[0].purchaseAmount.amountCents,12345);
 }
});

test('decimals in product specifications are not mistaken for a second price',()=>{
 const {labelledProductAmount}=require('../dist/object-onboarding/role-evidence');
 assert(labelledProductAmount('AsterNova 2.20L — Row total EUR 123.45','AsterNova 2.20L',12345));
 assert(labelledProductAmount('AsterNova 2.20L — Row total EUR 123.45\nOther product Line total EUR 99.00','AsterNova 2.20L',12345));
 assert(!labelledProductAmount('AsterNova 2.20L\nOther product Line total EUR 123.45','AsterNova 2.20L',12345));
});

test('legacy draft with issue date or unlabelled date cannot authorize automatic financial confirmation',()=>{
 for(const quote of ['Data fattura 07/03/2024','2024-03-07']){const f=fixture(),x=productExtraction(f.raw,f.ctx);x.items[0].fields.purchaseDate.source.excerpt=quote;assert(requiresPaymentReview(x));}
});

test('uncertainty is field-specific: bad/missing price keeps quantity, bad/missing quantity keeps price',()=>{
 const name='AsterNova apparato';
 for(const price of ['', 'USD 12.00', 'unknown']){const quote='Product | Quantity | Total (EUR)\n'+name+' | 2 | '+price;assert.equal(tableQuantity(quote,name),2);assert.equal(tablePurchaseAmount(quote,name),null);}
 const quantityOnly='Qty | Product\n2 | '+name;assert.equal(tableQuantity(quantityOnly,name),2);assert.equal(tablePurchaseAmount(quantityOnly,name),null);
 for(const count of ['', 'unknown', '99']){const quote='Product | Quantity | Total (EUR)\n'+name+' | '+count+' | 12.00';assert.equal(tableQuantity(quote,name),null);assert.equal(tablePurchaseAmount(quote,name),1200);}
 const priceOnly='Product | Line total\n'+name+' | EUR 12.00';assert.equal(tableQuantity(priceOnly,name),null);assert.equal(tablePurchaseAmount(priceOnly,name),1200);
});

test('a missing or invalid row price preserves quantity but blocks automatic fallback to grand total',()=>{
 const {automaticPlan}=require('../dist/object-onboarding/automatic-plan');
 const f=fixture(),bad='Total (EUR) | Product | Quantity\nunknown | '+f.name+' | 1';f.ctx.pages[0]+='\n'+bad;f.raw.items[0].purchaseAmount=null;f.raw.items[0].quantity.evidence=ev(bad);
 const x=productExtraction(f.raw,f.ctx);assert.equal(x.items[0].quantity.value,1);assert.equal(x.items[0].purchaseAmount,undefined);assert.equal(x.items[0].fields.brand.value,'AsterNova');assert.equal(x.purchaseTotal.amountCents,13579);assert(x.needsReview);assert(x.reviewWarnings.some(w=>w.field==='0:purchaseAmount'));assert(requiresPaymentReview(x));assert.throws(()=>automaticPlan(x));
});
