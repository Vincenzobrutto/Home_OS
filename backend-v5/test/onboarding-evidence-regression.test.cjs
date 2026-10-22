// Offline constructed responses, not recorded model outputs or an accuracy rerun.
global.fetch=async()=>{throw Error('network_forbidden');};
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict');
const fixtures=require('./document-understanding-fixture.cjs');
const {bill}=require('./house-expense-fixture.cjs');
const {ObjectOnboardingAnthropicProvider}=require('../dist/object-onboarding/anthropic-provider');
const {automaticPlan}=require('../dist/object-onboarding/automatic-plan');
const headings=['Targhetta lavatrice','Targhetta caldaia','Etichetta energetica UE','Targhetta forno','Targhetta climatizzatore','Targhetta centrale allarme','Targhetta pompa acqua'];
function visual(heading,page=1){
 const f=fixtures.label();f.raw.documentInfo[0].title=heading;f.raw.documentInfo[0].evidence.excerpt=heading;
 const visit=x=>{if(!x||typeof x!=='object')return;if(x.evidence){x.evidence.page=page;x.evidence.region={x:.1,y:.2,width:.6,height:.1};}Object.values(x).forEach(visit);};visit(f.raw);
 return {raw:f.raw,context:{kind:page===1?'image':'visual_pdf',snapshot:fixtures.context(f).snapshot,pageCount:page,allowedPages:[page]}};
}
function decode(raw,context){const provider=new ObjectOnboardingAnthropicProvider(null,null);provider.logger={warn:()=>{}};return provider.decode({id:'msg_offline',model:'offline',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:100},content:[{type:'text',text:JSON.stringify(fixtures.wire(raw))}]},{request:{model:'offline',max_tokens:4096},context}).output;}
for(const heading of headings)test('literal visual label heading survives pooled-wire validation: '+heading,()=>{
 for(const page of [1,2]){const f=visual(heading,page),out=decode(f.raw,f.context);assert.equal(out.documentInfo.title.value,heading);assert.equal(out.items[0].fields.brand.value,'Lume');assert.equal(out.items[0].fields.reference.value,'X100');assert.equal(out.items[0].fields.brand.source.basis,'provider_observed_image');assert.equal(out.items[0].fields.brand.source.page,page);assert.throws(()=>automaticPlan(out));}
});
test('visual evidence never gains a fabricated heading, wrong page, invalid box or text verification',()=>{
 const variants=[f=>{f.raw.documentInfo[0].title='Targhetta inventata';},f=>{f.raw.documentInfo[0].evidence.excerpt='Etichetta spedizione';f.raw.documentInfo[0].title='Etichetta spedizione';},f=>{f.raw.documentInfo[0].evidence.page=2;},f=>{f.raw.documentInfo[0].evidence.region.width=1;},f=>{f.raw.documentInfo[0].evidence.region=null;},f=>{f.context={...f.context,kind:'text',pages:['Unrelated text']};f.raw.documentInfo[0].evidence.region=null;}];
 for(const mutate of variants){const f=visual('Targhetta lavatrice');mutate(f);assert.throws(()=>decode(f.raw,f.context));}
 const f=visual('Targhetta lavatrice',2);f.context.allowedPages=[1];assert.throws(()=>decode(f.raw,f.context));
});
function amount(line,cents=8450,role='current_document_total'){
 const f=bill();f.raw.houseExpenses[0].amountCandidates=[{id:'current',amountCents:cents,role,label:'Printed amount',evidence:{page:1,excerpt:line,region:null}}];
 return {raw:f.raw,context:{...fixtures.context(f),pages:[f.lines.concat(line).join('\n')]}};
}
for(const line of ['Totale documento corrente EUR 84,50','Totale documento corrente:\n84,50 EUR','Importo documento corrente: EUR 84,50'])test('current document total preserves the entire printed semantic label: '+line,()=>{
 const f=amount(line),out=decode(f.raw,f.context);assert.equal(out.houseExpenses[0].amountCandidates[0].amountCents,8450);assert.equal(out.houseExpenses[0].amountCandidates[0].sources[0].excerpt,line);assert.equal(automaticPlan(out).houseExpenses[0].values.amountCents,8450);
});
test('current wording never promotes VAT, arrears, a payable balance, foreign money or an invented value',()=>{
 for(const line of ['Totale IVA corrente EUR 84,50','Totale documento corrente imponibile EUR 84,50','Totale documento corrente da pagare EUR 84,50','Importo arretrati correnti EUR 84,50','Totale documento corrente EUR 84,50%','Totale documento corrente USD 84,50','Totale documento corrente EUR 104,50 IVA EUR 84,50']){const f=amount(line),out=decode(f.raw,f.context);assert.equal(out.houseExpenses[0].amountCandidates.length,0,line);assert.throws(()=>automaticPlan(out));}
 const f=amount('Totale documento corrente EUR 84,50',9999),out=decode(f.raw,f.context);assert.equal(out.houseExpenses[0].amountCandidates.length,0);assert.throws(()=>automaticPlan(out));
});
test('missing source and competing printed totals still require review',()=>{
 const f=amount('Totale documento corrente EUR 84,50');f.context.pages=['Unrelated text'];assert.equal(decode(f.raw,f.context).houseExpenses[0].amountCandidates.length,0);
 const g=amount('Totale documento corrente EUR 84,50');g.context.pages[0]+='\nTotale documento corrente EUR 90,00';g.raw.houseExpenses[0].amountCandidates.push({id:'second',amountCents:9000,role:'current_document_total',label:'Other total',evidence:{page:1,excerpt:'Totale documento corrente EUR 90,00',region:null}});const out=decode(g.raw,g.context);assert.equal(out.houseExpenses[0].amountCandidates.length,2);assert.equal(out.houseExpenses[0].amountSelectionRequired,true);assert.throws(()=>automaticPlan(out));
});
test('purchase and works totals use the same literal current-document wording without inventing allocation',()=>{
 for(const factory of [fixtures.invoice,fixtures.works]){const f=factory(),line='Totale documento corrente EUR 99,99';f.lines.push(line);f.raw.purchaseTotal={amountCents:9999,evidence:{page:1,excerpt:line,region:null}};if(f.raw.houseExpenses.length)f.raw.houseExpenses[0].amountCandidates=[{id:'total',role:'current_document_total',amountCents:9999,label:'Total',evidence:{page:1,excerpt:line,region:null}}];const out=decode(f.raw,fixtures.context(f));assert.equal(out.purchaseTotal.amountCents,9999);assert.equal(out.items.filter(i=>i.purchaseAmount).length,0);if(f.raw.houseExpenses.length)assert.equal(out.houseExpenses[0].amountCandidates[0].amountCents,9999);}
});
test('real synthetic PDF parser keeps current total citation and rejects a different amount',async()=>{
 const {load}=require('./corpus-v3/corpus.cjs'),{PdfTextExtractor}=require('../dist/review/pdf-text');const c=load().cases.find(c=>c.id==='Q01');
 const snapshot={...fixtures.context(bill()).snapshot,documentSha256:c.sha256},[parsed]=await new PdfTextExtractor().extract([{snapshot,bytes:c.bytes}]);
 const f=amount('Totale documento corrente\nEUR 118,47',11847);f.raw.houseExpenses[0].fields={};f.context={kind:'text',snapshot,pages:parsed.pages};const out=decode(f.raw,f.context);assert.equal(out.houseExpenses[0].amountCandidates[0].amountCents,11847);f.raw.houseExpenses[0].amountCandidates[0].amountCents=9150;assert.equal(decode(f.raw,f.context).houseExpenses[0].amountCandidates.length,0);
});
test('title failure diagnostic is a bounded enum with no original/model contents',()=>{
 const f=visual('Targhetta lavatrice');f.raw.documentInfo[0].title='PRIVATE';const provider=new ObjectOnboardingAnthropicProvider(null,null),logs=[];provider.logger={warn:x=>logs.push(JSON.parse(x))};
 assert.throws(()=>provider.decode({id:'msg_offline',model:'offline',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:100},content:[{type:'text',text:JSON.stringify(fixtures.wire(f.raw))}]},{request:{model:'offline',max_tokens:4096},context:f.context}));assert.equal(logs[0].evidenceReason,'document_title');assert(!JSON.stringify(logs).includes('PRIVATE'));
});
test('new extractor cannot reuse the completed paid campaign receipt',()=>{
 const receipt=require('../../docs/v5/fase0-quality-v3-authorization-20261022.json');
 const {validateAuthorization}=require('./quality-v3-authorization.cjs');
 assert.throws(()=>validateAuthorization(receipt,{campaignId:receipt.campaignId,model:receipt.model,budgetMicroUsd:receipt.budgetMicroUsd,maxCalls:receipt.maxCalls}),e=>e.code==='synthetic_authorization_mismatch');
});
test('two invoices in one visual file remain rejected instead of being merged into one expense',()=>{
 const f=fixtures.works(),context={kind:'visual_pdf',snapshot:fixtures.context(f).snapshot,pageCount:2};
 const visit=(x,page)=>{if(!x||typeof x!=='object')return;if(x.evidence){x.evidence.page=page;x.evidence.region={x:.1,y:.1,width:.7,height:.2};}Object.values(x).forEach(v=>visit(v,page));};visit(f.raw,1);
 const second=structuredClone(f.raw.houseExpenses[0]);visit(second,2);f.raw.houseExpenses.push(second);
 assert.throws(()=>decode(f.raw,context),e=>e.code==='analysis_invalid_output');
});
