require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {productExtraction,productCandidates}=require('../dist/object-onboarding/domain');
const {proposedProfile}=require('../dist/object-onboarding/profile');
const {shortProductName}=require('../dist/object-onboarding/short-name');
const {ObjectOnboardingAnthropicProvider}=require('../dist/object-onboarding/anthropic-provider');
const snapshot={documentId:'10000000-0000-4000-8000-000000000001',documentVersion:1,documentSha256:'a'.repeat(64)};
const common='Boreale Dispositivo casa — '+ 'Descrizione commerciale documentata e funzioni disponibili '.repeat(3);
const title=common+'Modello ZX-82/B, variante Blu 256 GB';
const context=visual=>visual?{kind:'visual_pdf',snapshot,pageCount:1}:{kind:'text',snapshot,pages:[title+'\nModello ZX-82/B']};
const proof=(excerpt,visual)=>({page:1,excerpt,region:visual?{x:.1,y:.1,width:.8,height:.2}:null});
const value=(name=title,visual=false)=>({documentKind:'product_document',hasMoreItems:false,purchaseTotal:null,items:[{fields:{name:{value:name,evidence:proof(name,visual)},model:{value:'ZX-82/B',evidence:proof('Modello ZX-82/B',visual)}},quantity:null,nameTruncated:false,disposition:'household_object',confidence:'high'}]});
const fails=(fn,code='analysis_invalid_output')=>assert.throws(fn,e=>e.code===code);

test('long verified titles become a literal short name with full model/variant evidence and mandatory review',()=>{
 for(const visual of [false,true]){
  const output=productExtraction(value(title,visual),context(visual)),item=output.items[0];
  assert.equal(item.fields.name.value,'Boreale Dispositivo casa');assert.equal(item.fullName,title);
  assert.equal(item.fields.name.source.excerpt,title);assert.equal(item.fields.name.source.documentId,snapshot.documentId);
  assert.equal(item.fields.name.source.sha256,snapshot.documentSha256);
  assert.equal(item.nameTruncated,true);assert.equal(output.needsReview,true);assert.equal(output.purchaseExpenseReady,false);
  const {automaticPlan,AutomaticReviewNeeded}=require('../dist/object-onboarding/automatic-plan');
  assert.throws(()=>automaticPlan(output),AutomaticReviewNeeded);
  assert.equal(proposedProfile(item).model.value,'ZX-82/B');assert(item.fullName.endsWith('variante Blu 256 GB'));
  assert(output.reviewWarnings.some(w=>w.field==='item:0:name'));
  assert.equal(productCandidates(item,[{id:'other',version:1,accountId:'a',homeId:'h',state:'active',name:item.fields.name.value,brand:null,model:null,confirmedItemFingerprints:[]}],{accountId:'a',homeId:'h'}).length,0);
 }
});

test('shortening cannot rescue fabricated text, invalid source pages/regions or oversized source descriptions',()=>{
 const forged=value();forged.items[0].fields.name.evidence.excerpt='Boreale Dispositivo casa';
 fails(()=>productExtraction(forged,context(false)),'evidence_unverified');
 for(const mutate of [x=>x.items[0].fields.name.evidence.page=2,x=>x.items[0].fields.name.evidence.region.width=2]){
  const raw=value(title,true);mutate(raw);fails(()=>productExtraction(raw,context(true)));
 }
 const long=value('A '.repeat(1001),true);fails(()=>productExtraction(long,context(true)));
 const injection=value();injection.items[0].fullName='different variant';fails(()=>productExtraction(injection,context(false)));
 const badCitation=value();badCitation.items[0].fields.name.evidence.documentId='foreign';fails(()=>productExtraction(badCitation,context(false)));
});

test('different trailing variants retain distinct stable identities despite the same display name',()=>{
 const red=title.replace('Blu 256 GB','Rosso 512 GB');
 const raw=value();raw.items.push(value(red).items[0]);
 const ctx={...context(false),pages:[title+'\n'+red+'\nModello ZX-82/B']};
 const first=productExtraction(raw,ctx),again=productExtraction(raw,ctx);
 assert.equal(first.items[0].fields.name.value,first.items[1].fields.name.value);
 assert.notEqual(first.items[0].fingerprint,first.items[1].fingerprint);
 assert.deepEqual(first.items.map(i=>i.id),again.items.map(i=>i.id));assert.notEqual(first.items[0].fullName,first.items[1].fullName);
 const order={...raw,documentKind:'order_confirmation',items:[raw.items[0],structuredClone(raw.items[0])]};
 fails(()=>productExtraction(order,ctx),'object_onboarding_repeated_item');
});

test('names at the canonical bound are unchanged; word boundaries and Unicode never crop identifiers',()=>{
 assert.equal(shortProductName('N'.repeat(120)),'N'.repeat(120));
 assert.throws(()=>shortProductName('N'.repeat(121)));
 const unicode='Dispositivo 🏠 '+ 'qualità '.repeat(20)+'ZX82';
 const short=shortProductName(unicode);assert([...short].length<=120);assert(unicode.startsWith(short));assert(!short.endsWith('\uD83C'));assert(!short.endsWith('qualit'));
 const plain='Apparato ambiente '+ 'parola '.repeat(30)+'variante speciale';assert(plain.startsWith(shortProductName(plain)));
 const original=value('Nome completo breve');original.items[0].fields.name.evidence=proof('Nome completo breve',false);
 const item=productExtraction(original,{...context(false),pages:['Nome completo breve\nModello ZX-82/B']}).items[0];
 assert.equal(item.fullName,undefined);assert.equal(item.nameTruncated,false);
});

test('wire decoder keeps long-title evidence entirely offline and validates the shortened projection',()=>{
 const provider=new ObjectOnboardingAnthropicProvider({},{}),raw=value(title,true);
 const wire={...raw,items:raw.items.map(i=>({...i,fields:Object.entries(i.fields).map(([field,v])=>({field,...v}))}))};
 const model='claude-sonnet-5-5';
 const reply={id:'msg_offline',model,stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(wire)}],usage:{input_tokens:1000,output_tokens:100}};
 const output=provider.decode(reply,{request:{model,max_tokens:4096},context:context(true)}).output;
 assert.equal(output.items[0].fullName,title);assert([...output.items[0].fields.name.value].length<=120);
});

test('price validation uses the complete title before abbreviation, never a shared display prefix',()=>{
 const raw=value();raw.documentKind='purchase_document';
 const line=title+' — Totale riga: 37,90 EUR';
 raw.items[0].purchaseAmount={amountCents:3790,evidence:proof(line,false)};
 const ctx={...context(false),pages:[line+'\nModello ZX-82/B']};
 const accepted=productExtraction(raw,ctx);assert.equal(accepted.items[0].purchaseAmount.amountCents,3790);
 raw.items[0].purchaseAmount.evidence=proof('Boreale Dispositivo casa — Totale riga: 37,90 EUR',false);
 const rejected=productExtraction(raw,{...ctx,pages:[...ctx.pages,raw.items[0].purchaseAmount.evidence.excerpt]});
 assert.equal(rejected.items[0].purchaseAmount,undefined);assert.equal(rejected.needsReview,true);
});

test('compatibility qualifiers after the display boundary still prevent inferred catalog identity',()=>{
 const full='Samsung XR7 — '+ 'Descrizione commerciale documentata '.repeat(5)+'accessorio compatibile con altri dispositivi';
 const raw=value(full);delete raw.items[0].fields.model;
 const output=productExtraction(raw,{...context(false),pages:[full]});
 assert.equal(output.items[0].fields.name.value,'Samsung XR7');
 assert.deepEqual(proposedProfile(output.items[0]),{});assert(output.items[0].fullName.endsWith('accessorio compatibile con altri dispositivi'));
});
