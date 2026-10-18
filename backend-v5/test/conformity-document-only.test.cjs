require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict');
const fixtures=require('./document-understanding-fixture.cjs');
const {ObjectOnboardingAnthropicProvider}=require('../dist/object-onboarding/anthropic-provider');
const {automaticPlan}=require('../dist/object-onboarding/automatic-plan');
function decode(f){const provider=new ObjectOnboardingAnthropicProvider(null,null);provider.logger={warn(){}};return provider.decode({id:'msg_synthetic',model:'offline',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:100},content:[{type:'text',text:JSON.stringify(fixtures.wire(f.raw))}]},{context:fixtures.context(f),request:{model:'offline',max_tokens:4096}}).output;}
test('declaration is classified for the house with issuer/date and no technical object proposals',()=>{
 const f=fixtures.conformity(),out=decode(f);assert.equal(out.documentInfo.kind,'conformity_declaration');assert.equal(out.items.length,0);assert.equal(out.documentInfo.facts.length,2);assert(out.documentInfo.facts.some(x=>x.field==='issuer'));assert(out.documentInfo.facts.some(x=>x.field==='documentDate'));assert.equal(out.purchaseTotal,null);assert.deepEqual(automaticPlan(out),{choices:[],documentOnly:true});
});
test('missing optional technical details do not fail a readable declaration',()=>{
 const f=fixtures.conformity();f.raw.items[0].fields.name.evidence.excerpt='Unverified technical name';f.raw.facts.find(x=>x.field==='availablePowerKw').evidence.excerpt='Unverified technical power';f.raw.facts=f.raw.facts.filter(x=>!['issuer','documentDate'].includes(x.field));
 const out=decode(f);assert.equal(out.items.length,0);assert.deepEqual(out.documentInfo.facts,[]);assert.equal(out.needsReview,false);assert.deepEqual(automaticPlan(out),{choices:[],documentOnly:true});
});
test('old cached declaration subjects yield only document-only decisions',()=>{
 const f=fixtures.conformity(),out=require('../dist/object-onboarding/domain').productExtraction(f.raw,fixtures.context(f));assert.deepEqual(automaticPlan(out),{choices:out.items.map(i=>({itemId:i.id,action:'document_only'}))});
});
test('classification, identity of issuer and unexpected costs remain validated',()=>{
 const f=fixtures.conformity();f.raw.facts.find(x=>x.field==='issuer').value='Not on the source';const out=decode(f);assert(!out.documentInfo.facts.some(x=>x.field==='issuer'));assert(out.reviewWarnings.length);assert.deepEqual(automaticPlan(out),{choices:[],documentOnly:true});
 const bad=fixtures.conformity();bad.raw.documentInfo[0].evidence.excerpt='Forged classification';assert.throws(()=>decode(bad));
 const cost=fixtures.conformity();cost.raw.houseExpenses=fixtures.works().raw.houseExpenses;assert.throws(()=>decode(cost));
 const tooMany=fixtures.conformity();tooMany.raw.items=Array.from({length:21},()=>structuredClone(tooMany.raw.items[0]));assert.throws(()=>decode(tooMany));
});
test('an unreadable or uncertain declaration still requires review',()=>{const f=fixtures.conformity();f.raw.requiresHumanReview=true;assert.throws(()=>automaticPlan(decode(f)));});
test('cached declaration costs cannot fall through to purchase or system creation',()=>{const out=decode(fixtures.conformity());assert.throws(()=>automaticPlan({...out,purchaseTotal:{amountCents:10000}}));assert.throws(()=>automaticPlan({...out,houseExpenses:[{}]}));});
test('invoices still propose purchased or installed subjects and their house cost',()=>{
 const out=decode(fixtures.works());assert.equal(out.items.length,3);assert.equal(out.houseExpenses.length,1);assert.equal(out.houseExpenses[0].amountCandidates[0].amountCents,153720);
});
