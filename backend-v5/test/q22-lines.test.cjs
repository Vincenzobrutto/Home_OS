global.fetch=async()=>{throw Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {q22}=require('./q22-fixture.cjs');
const {productExtraction}=require('../dist/object-onboarding/domain');
const {automaticPlan}=require('../dist/object-onboarding/automatic-plan');
const {verifiedInvoiceLine}=require('../dist/object-onboarding/invoice-lines');
const {metrics}=require('./quality-v3-score.cjs');
const compact=s=>s.replace(/\s+/gu,' ').trim();
test('actual Q22 PDF: explicit row amounts, quantity and common labelled purchase date fill omissions and satisfy unchanged gold',async()=>{
 const f=await q22(),out=productExtraction(f.raw,f.context),plan=automaticPlan(out),score=metrics(f.original.gold,{output:out,automatic:'complete'},f.context.pages);
 assert.deepEqual(out.items.map(i=>i.purchaseAmount.amountCents),[30000,50000]);assert.deepEqual(out.items.map(i=>i.fields.purchaseDate.value),['2026-09-18','2026-09-18']);assert.deepEqual(out.items.map(i=>i.quantity.value),[1,1]);assert.equal(out.purchaseTotal.amountCents,80000);
 assert.equal(out.needsReview,false);assert.equal(out.reviewWarnings,undefined);assert.deepEqual(plan.choices.map(c=>[c.expense.amountCents,c.expense.spentOn]),[[30000,'2026-09-18'],[50000,'2026-09-18']]);
 assert.deepEqual(score.measures.expenseAmountCents,{correct:2,total:2});assert.deepEqual(score.measures.expenseDate,{correct:2,total:2});assert.equal(score.criticalAutomaticErrors,0);assert.equal(score.badTextEvidence,0);
 assert.notEqual(out.items[0].invoiceLine.key,out.items[1].invoiceLine.key);for(const i of out.items){assert(compact(f.context.pages[0]).includes(compact(i.purchaseAmount.source.excerpt)));assert.match(i.fields.purchaseDate.source.excerpt,/Data acquisto/u);assert.equal(i.purchaseAmount.source.sha256,f.original.sha256);}
});
test('supplied row-only citations expand to their actual header; pooled schema and adapter work in all text modes without network',async()=>{
 const f=await q22(),{wire}=require('./document-understanding-fixture.cjs'),{createModelAdapter}=require('./quality-v3-model.cjs'),{MODEL,fakeTransport}=require('./quality-v3-model-fixture.cjs');
 f.raw.items.forEach((item,i)=>{item.quantity={value:1,evidence:{page:1,excerpt:f.rows[i].trim(),region:null}};item.purchaseAmount={amountCents:i?50000:30000,evidence:{page:1,excerpt:f.rows[i].trim(),region:null}};});
 const fake=fakeTransport({reply:()=>wire(f.raw)}),adapter=createModelAdapter({transport:fake.transport,model:MODEL});
 for(const mode of ['full','local_pages','progressive']){const r=await adapter({id:'Q22',sha256:f.original.sha256,documentId:f.context.snapshot.documentId,documentVersion:1,gold:f.original.gold,mode,...(mode==='progressive'?{throughPage:1}:{})},{model:MODEL,reserveMicroUsd:250000,authorize:async()=>{}});assert.equal(r.observation.failureCode,null);assert.equal(r.automatic,'complete');assert.deepEqual(r.output.items.map(i=>i.purchaseAmount.amountCents),[30000,50000]);assert(r.output.items.every(i=>i.purchaseAmount.source.excerpt.startsWith('Descrizione')));}
 assert.equal(fake.sends(),3);
});
test('changing the grand total never changes either printed price; removing row money never divides it',async()=>{
 const f=await q22();f.context.pages[0]=f.context.pages[0].replaceAll('800.00 EUR','900.00 EUR');f.raw.purchaseTotal.amountCents=90000;f.raw.purchaseTotal.evidence.excerpt='Totale documento: 900.00 EUR';
 assert.deepEqual(productExtraction(f.raw,f.context).items.map(i=>i.purchaseAmount.amountCents),[30000,50000]);
 f.context.pages[0]=f.context.pages[0].replace('300.00 EUR','prezzo assente');for(const field of Object.values(f.raw.items[0].fields))field.evidence.excerpt='Forno Nubeo N4';f.raw.items[0].objectType.evidence.excerpt='Forno Nubeo N4';const out=productExtraction(f.raw,f.context);assert.equal(out.items[0].purchaseAmount,undefined);assert.equal(out.items[1].purchaseAmount.amountCents,50000);assert.throws(()=>automaticPlan(out));
});
test('unit prices, currencies, percentages, negatives, ambiguous duplicate rows and absent headers cannot yield a local row cost',async()=>{
 const f=await q22(),name='Forno Nubeo N4';
 for(const mutate of [p=>p.replace('Importo','Prezzo unitario'),p=>p.replace('300.00 EUR','300.00 USD'),p=>p.replace('300.00 EUR','300.00 EUR%'),p=>p.replace('300.00 EUR','-300.00 EUR'),p=>p.replace('300.00 EUR','0.00 EUR'),p=>p.replace('Quantità: 1   300.00','Quantità: 0   300.00'),p=>p+'\nDescrizione Quantità / periodo Importo\n'+f.rows[0],p=>p.replace(/Descrizione[^\n]+Importo/u,'Colonne assenti')])assert.equal(verifiedInvoiceLine({...f.context,pages:[mutate(f.context.pages[0])]},name,1),null);
 assert.equal(verifiedInvoiceLine({...f.context,allowedPages:[2]},name,1),null);assert.equal(verifiedInvoiceLine({...f.context,kind:'visual_pdf',pageCount:2},name,1),null);
});
test('no issue, expected delivery, payment, ambiguous or cross-page date can replace an absent purchase date',async()=>{
 const f=await q22();
 for(const replacement of ['Data documento: 18/09/2026','Data fattura: 18/09/2026','Data acquisto: 18/09/2026 solo il Forno','Data acquisto: 18/09/2099','Consegna prevista: 18/09/2026','Pagamento: 18/09/2026','Data acquisto: 18/09','Data acquisto: 18/09/2026\nData acquisto: 19/09/2026']){
  const ctx={...f.context,pages:[f.context.pages[0].replace('Data acquisto: 18/09/2026',replacement),f.context.pages[1]+'\nData acquisto: 18/09/2026']},out=productExtraction(f.raw,ctx);assert(out.items.every(i=>!i.fields.purchaseDate),replacement);assert.throws(()=>automaticPlan(out));
 }
});
test('invalid supplied prices, dates and quantities retain warnings; no silent replacement with local evidence',async()=>{
 const f=await q22();const forged=structuredClone(f.raw);forged.items[0].invoiceLine={key:'forged',page:1,row:1};assert.throws(()=>productExtraction(forged,f.context));for(const field of ['amount','date','quantity']){const raw=structuredClone(f.raw),item=raw.items[0],evidence={page:1,excerpt:f.rows[0].trim(),region:null};
  if(field==='amount')item.purchaseAmount={amountCents:50000,evidence};if(field==='date')item.fields.purchaseDate={value:'2026-09-19',evidence:{page:1,excerpt:'Data acquisto: 18/09/2026',region:null}};if(field==='quantity')item.quantity={value:2,evidence};
  const out=productExtraction(raw,f.context);assert.equal(out.needsReview,true);assert(out.reviewWarnings.length);assert.throws(()=>automaticPlan(out));if(field==='amount')assert.equal(out.items[0].purchaseAmount,undefined);if(field==='date')assert.equal(out.items[0].fields.purchaseDate,undefined);if(field==='quantity')assert.equal(out.items[0].quantity,null);
 }
});
test('same physical row cannot become two item costs via shortened names; identity survives copy, order and abbreviation',async()=>{
 const f=await q22(),base=productExtraction(f.raw,f.context),copy=structuredClone(f.raw);copy.items.reverse();copy.items[1].fields.name.value='Forno Nubeo';
 const next=productExtraction(copy,{...f.context,snapshot:{...f.context.snapshot,documentId:require('node:crypto').randomUUID()}});assert.equal(next.items[1].invoiceLine.key,base.items[0].invoiceLine.key);assert.notEqual(next.items[1].id,base.items[0].id);
 const duplicate=structuredClone(f.raw.items[0]);duplicate.fields.name.value='Forno Nubeo';f.raw.items.push(duplicate);assert.throws(()=>productExtraction(f.raw,f.context),e=>e.code==='object_onboarding_repeated_item');
});
