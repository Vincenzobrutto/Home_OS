const {test}=require('node:test'),assert=require('node:assert/strict');
const {residual}=require('./gate-residual-fixture.cjs');
const {productExtraction}=require('../dist/object-onboarding/domain');
const {automaticPlan}=require('../dist/object-onboarding/automatic-plan');
const {ObjectOnboardingAnthropicProvider,OBJECT_ONBOARDING_SYSTEM}=require('../dist/object-onboarding/anthropic-provider');
const {wire}=require('./document-understanding-fixture.cjs');
const {detailed}=require('./quality-v3-measures.cjs');
function decode(f){const provider=new ObjectOnboardingAnthropicProvider(null,null);provider.logger={warn:()=>{}};return provider.decode({id:'offline',model:'offline',stop_reason:'end_turn',usage:{input_tokens:1,output_tokens:1},content:[{type:'text',text:JSON.stringify(wire(f.raw))}]},{request:{model:'offline',max_tokens:4096},context:f.context}).output;}
test('Q20 keeps literal receipt name, printed purchase date and 8990 cents through pooled wire, always visual review',async()=>{
 const f=await residual('Q20'),out=decode(f),score=detailed(f.original.gold,out,'review');
 assert.equal(out.documentInfo.title.value,'Documento commerciale');assert.equal(out.items[0].fields.name.value,'MACC CAFFE NUBEO C2');assert.equal(out.items[0].fields.purchaseDate.value,'2026-09-18');assert.equal(out.purchaseTotal.amountCents,8990);
 assert.deepEqual(score.measures.expenseDate,{correct:1,total:1});assert.throws(()=>automaticPlan(out));
 for(const excerpt of ['Data documento: 18.09.2026','Data scadenza: 18.09.2026','Data consegna prevista: 18.09.2026','Periodo di competenza: 18.09.2026','18.09.2026','Data acquisto: 18.09.2026 Data scadenza: 19.09.2026']){const bad=structuredClone(f);bad.raw.items[0].fields.purchaseDate.evidence.excerpt=excerpt;assert(!decode(bad).items[0].fields.purchaseDate,excerpt);assert.throws(()=>automaticPlan(decode(bad)));}
 const bad=structuredClone(f);bad.raw.items[0].fields.purchaseDate.value='2026-09-19';assert(!decode(bad).items[0].fields.purchaseDate);
});
test('Q29 accepts its literal technical-attachment heading with proven issuer, no invented object or expense',async()=>{
 const f=await residual('Q29'),out=decode(f);assert.equal(out.documentKind,'house_document');assert.equal(out.documentInfo.kind,'other');assert.equal(out.documentInfo.title.value,'Relazione materiali impianto');assert.equal(out.contacts[0].values.name,'Voltacervo Collaudo');assert.equal(out.contacts[0].values.fiscalId,'99900000300');assert.deepEqual(out.items,[]);assert.deepEqual(out.houseExpenses,[]);assert.equal(out.purchaseTotal,null);assert.equal(automaticPlan(out).documentOnly,true);
 const again=decode(f);assert.equal(again.contacts[0].id,out.contacts[0].id);
 for(const title of ['Relazione materiali impianto elettrico certificato','Dichiarazione di conformità']){const bad=structuredClone(f);bad.raw.documentInfo[0].title=title;assert.throws(()=>decode(bad));}
 const bad=structuredClone(f);bad.raw.documentInfo[0].kind='conformity_declaration';assert.throws(()=>decode(bad));
});
test('Q30 keeps the actual booklet title and identity, no quantity, unit conversion, cost or warranty inference',async()=>{
 const f=await residual('Q30'),out=decode(f);assert.equal(out.documentInfo.title.value,'Libretto caldaia');assert.equal(out.documentInfo.kind,'system_booklet');assert.equal(out.items[0].fields.name.value,'Caldaia Nubeo T24');assert.equal(out.items[0].quantity,null);assert.equal(out.items[0].fields.powerWatts,undefined);assert.equal(out.items[0].fields.purchaseDate,undefined);assert.equal(out.items[0].fields.warrantyEnd,undefined);assert.equal(out.purchaseTotal,null);assert.throws(()=>automaticPlan(out));
 const bad=structuredClone(f);bad.raw.documentInfo[0].title='Libretto caldaia Nubeo T24';assert.throws(()=>decode(bad));
 const unit=structuredClone(f);unit.raw.items[0].fields.powerWatts={value:'24000',evidence:{page:1,excerpt:'Potenza utile al riscaldamento: 24 kW',region:null}};assert(!decode(unit).items[0].fields.powerWatts);
});
test('unavailable pages, fabricated quotes, and customer identity never gain authority',async()=>{
 for(const id of ['Q29','Q30']){const f=await residual(id),bad=structuredClone(f);bad.context.pages=['Unrelated synthetic text'];assert.throws(()=>decode(bad));}
 const f=await residual('Q29');f.raw.facts=[{subjectIndex:-1,field:'issuer',value:'Cliente Collaudo V3 S.r.l.',evidence:{page:1,excerpt:'Spett.le Cliente Collaudo V3 S.r.l.',region:null}}];assert(!decode(f).contacts?.length);
 const q20=await residual('Q20');q20.context.allowedPages=[2];assert.throws(()=>productExtraction(q20.raw,q20.context));
});
test('prompt requires literal headings and separates technical booklets from labels without relaxing validation',()=>{
 assert.match(OBJECT_ONBOARDING_SYSTEM,/short contiguous printed heading/);assert.match(OBJECT_ONBOARDING_SYSTEM,/system_booklet/);assert.match(OBJECT_ONBOARDING_SYSTEM,/Do not expand a title/);
});
