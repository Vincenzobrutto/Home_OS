global.fetch=async()=>{throw Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {q48}=require('./q48-fixture.cjs'),{pagedWire,decode}=require('./q48-coverage-fixture.cjs');
const {productExtraction}=require('../dist/object-onboarding/domain');
const {invoicePageOutput,checkedInvoiceCoverage}=require('../dist/object-onboarding/invoice-coverage');
const {onboardingSchemaFor,onboardingWireOutput}=require('../dist/object-onboarding/anthropic-provider');
const {automaticPlan}=require('../dist/object-onboarding/automatic-plan');
const {progressiveComplete}=require('../dist/object-onboarding/reading');
const {detailed}=require('./quality-v3-measures.cjs');
const {protocolAudit}=require('./protocol-audit.cjs');

test('offline documented-subset audit covers text, image, single-page and every 1–20 page wire schema',t=>{
 const records=[];
 for(const [kind,pages] of [['text',[]],['image',[]],['visual_pdf',[]],...Array.from({length:20},(_,i)=>['visual_pdf',Array.from({length:i+1},(_,j)=>j+1)])]){
  const schema=onboardingSchemaFor(kind,pages),audit=protocolAudit(schema);
  assert.deepEqual(audit.issues,[]);assert.equal(audit.optional,0);assert.equal(audit.unions,0);
  assert.equal(audit.remoteAcceptance,'not_proven');
  if(kind==='visual_pdf'&&pages.length===2)records.push({pages:2,schemaBytes:Buffer.byteLength(JSON.stringify(schema)),...audit});
 }
 t.diagnostic(JSON.stringify({event:'offline_protocol_audit',records}));
});

test('offline audit rejects structural, reference, constraint and documented complexity counterexamples without retaining content',()=>{
 const closed=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
 const examples=[
  [{type:'object',properties:{},required:[]},'object_not_closed'],
  [{$ref:'https://private.example/document'},'nonlocal_reference'],
  [{$ref:'#/definitions/absent'},'unresolved_reference'],
  [{type:'string',maxLength:1},'keyword_not_audited'],
  [{type:'array',items:{type:'string'},minItems:2},'unsupported_min_items'],
  [{type:'string',enum:[{secret:'PRIVATE'}]},'complex_enum'],
  [{...closed({safe:{type:'string'}}),required:['missing']},'invalid_required'],
  [closed(Object.fromEntries(Array.from({length:17},(_,i)=>['f'+i,{anyOf:[{type:'string'},{type:'null'}]}]))),'union_limit_exceeded'],
  [{...closed(Object.fromEntries(Array.from({length:25},(_,i)=>['f'+i,{type:'string'}]))),required:[]},'optional_limit_exceeded'],
 ];
 const recursive={$ref:'#/definitions/loop',definitions:{loop:{$ref:'#/definitions/loop'}}};examples.push([recursive,'recursive_schema']);
 for(const [schema,issue]of examples){const result=protocolAudit(schema);assert(result.issues.includes(issue));assert(!JSON.stringify(result).includes('PRIVATE'));assert(!JSON.stringify(result).includes('private.example'));}
});

test('token counting succeeds without checking output grammar, and a subsequent 400 is diagnosed without reading its body or retrying',async()=>{
 const {ObjectOnboardingAnthropicTransport}=require('../dist/object-onboarding/ai-analysis');
 const transport=new ObjectOnboardingAnthropicTransport({headers:()=>({})}),calls=[],diagnostics=[];
 const onFailure=transport.onHttpFailure.bind(transport);
 transport.onHttpFailure=d=>{diagnostics.push(d);onFailure(d);};
 let bodyReads=0;
 transport.fetchImpl=async(url,options)=>{
  const endpoint=new URL(url).pathname,body=options.body?JSON.parse(options.body):null;calls.push({endpoint,body});
  if(endpoint.startsWith('/v1/models/'))return new Response(JSON.stringify({id:'claude-sonnet-5-5'}),{status:200});
  if(endpoint==='/v1/messages/count_tokens')return new Response(JSON.stringify({input_tokens:500}),{status:200});
  return {ok:false,status:400,headers:new Headers({'request-id':'req_safe_test'}),text:async()=>{bodyReads++;throw Error('PRIVATE');},json:async()=>{bodyReads++;throw Error('PRIVATE');}};
 };
 const invalidSchema={type:'object',properties:{amount:{type:'number',minimum:0}},required:['amount'],additionalProperties:false};
 const prepared=await transport.prepareStructured('claude-sonnet-5-5','Synthetic public instructions',[{role:'user',content:'Synthetic public input'}],invalidSchema,new AbortController().signal);
 assert.equal(calls.length,2);assert(!Object.hasOwn(calls[1].body,'output_config'));
 assert.deepEqual(prepared.output_config.format.schema,invalidSchema);
 await assert.rejects(transport.send(prepared,new AbortController().signal),e=>e.code==='provider_request_rejected');
 assert.equal(calls.length,3);assert.equal(bodyReads,0);
 assert.deepEqual(diagnostics,[{status:400,endpoint:'messages',requestId:'req_safe_test'}]);
});

// Resolve the wire-only indirection before checking the unchanged page contract.
function expandedSchema(schema){
 const expand=value=>{
  if(Array.isArray(value))return value.map(expand);
  if(!value||typeof value!=='object')return value;
  if(value.$ref){assert.equal(value.$ref,'#/definitions/invoiceExpense');assert.deepEqual(Object.keys(value),['$ref']);return expand(schema.definitions.invoiceExpense);}
  return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='definitions').map(([key,child])=>[key,expand(child)]));
 };
 return expand(schema);
}
test('visual schema requires a separate slot for every sent physical page, including a non-contiguous selection',()=>{
 const schema=expandedSchema(onboardingSchemaFor('visual_pdf',[1,3])),slots=schema.properties.invoicePages;
 assert(schema.required.includes('invoicePages'));assert.deepEqual(slots.required,['p1','p3']);assert.equal(slots.additionalProperties,false);assert.equal(slots.properties.p1.properties.expenses.items.properties.fields.items.properties.evidence.type,'integer');
 assert(!onboardingSchemaFor('text').properties.invoicePages);assert(!onboardingSchemaFor('image').properties.invoicePages);
});

test('multipage wire shares one expense definition while preserving the entire expanded legacy schema for 1–20 sent pages',()=>{
 const {invoicePagesSchema}=require('../dist/object-onboarding/invoice-coverage');
 for(let length=1;length<=20;length++){
  const sent=Array.from({length},(_,i)=>i+1),schema=onboardingSchemaFor('visual_pdf',sent);
  assert(schema.definitions?.invoiceExpense,'one reusable expense grammar is required');
  const original=onboardingSchemaFor('visual_pdf');
  original.properties.invoicePages=invoicePagesSchema(original.properties.houseExpenses.items,sent);
  original.required.splice(original.required.indexOf('sources'),0,'invoicePages');
  assert.deepEqual(expandedSchema(schema),original);
  assert.deepEqual(schema.properties.houseExpenses.items,{$ref:'#/definitions/invoiceExpense'});
  for(const page of sent)assert.deepEqual(schema.properties.invoicePages.properties['p'+page].properties.expenses.items,{$ref:'#/definitions/invoiceExpense'});
  if(length===20)assert(JSON.stringify(schema).length<JSON.stringify(original).length/2);
 }
});

test('shared definition remains strict and cannot leak between preparations or alter single-page/image/text schemas',()=>{
 for(const kind of ['text','image','visual_pdf'])assert(!onboardingSchemaFor(kind).definitions);
 const first=onboardingSchemaFor('visual_pdf',[1,3]),second=onboardingSchemaFor('visual_pdf',[1,3]);
 assert(first.definitions?.invoiceExpense,'shared definition is required');
 const expense=first.definitions.invoiceExpense;
 assert.equal(expense.additionalProperties,false);assert.deepEqual(expense.required,['fields','amountCandidates']);
 assert.equal(expense.properties.fields.items.additionalProperties,false);
 assert.equal(expense.properties.fields.items.properties.evidence.type,'integer');
 expense.properties.fields.items.properties.field.enum.push('invented_field');
 assert(!JSON.stringify(second).includes('invented_field'));
 assert.deepEqual(expandedSchema(second).properties.invoicePages.required,['p1','p3']);
 let unions=0;const visit=x=>{if(!x||typeof x!=='object')return;if(x.anyOf||Array.isArray(x.type))unions++;Object.values(x).forEach(visit);};visit(second);assert.equal(unions,0);
});
test('both Q48 page slots produce two independent complete proposals matching unchanged gold; review stays mandatory',()=>{
 const f=q48(),out=decode(f),s=detailed(f.original.gold,out,'review');
 assert.deepEqual(out.invoiceCoverage,{version:'invoice-coverage-v1',totalPages:2,sentPages:[1,2],coveredPages:[1,2],pendingPages:[]});
 for(const key of ['expenseAmountCents','expenseDate','expenseSupplier'])assert.deepEqual(s.measures[key],{correct:2,total:2});assert.equal(s.detailedCriticalErrors,0);
 assert.deepEqual(out.houseExpenses.map(e=>e.amountCandidates[0].amountCents),[12200,24400]);assert.equal(out.purchaseTotal,null);assert.deepEqual(out.items,[]);assert.equal(out.needsReview,true);assert.throws(()=>automaticPlan(out));
});
test('legacy single-proposal output cannot silently certify the second page; its identity is stable when coverage grows',()=>{
 const f=q48(),full=decode(f);f.raw.houseExpenses.pop();f.raw.requiresHumanReview=false;
 const one=productExtraction(f.raw,f.context);assert.deepEqual(one.invoiceCoverage.coveredPages,[1]);assert.deepEqual(one.invoiceCoverage.pendingPages,[2]);assert.equal(one.needsReview,true);assert.equal(one.houseExpenses[0].id,full.houseExpenses[0].id);assert.throws(()=>automaticPlan({...one,needsReview:false}));assert.equal(progressiveComplete({...one,needsReview:false}),false);
});
test('missing/extra page slots, duplicate invoices, global totals or costs, and cross-page proofs remain rejected',()=>{
 const f=q48();const mutations=[r=>delete r.invoicePages.p2,r=>r.invoicePages.p3=r.invoicePages.p2,r=>r.invoicePages.p2.expenses=[],r=>r.invoicePages.p1.expenses.push(r.invoicePages.p1.expenses[0]),r=>r.houseExpenses=r.invoicePages.p1.expenses,r=>r.purchaseTotal=[{amountCents:36600,evidence:0}],r=>r.invoicePages.p2.expenses=r.invoicePages.p1.expenses,r=>r.invoicePages.p2.kind='other'];
 for(const mutate of mutations){const raw=pagedWire(f);mutate(raw);assert.throws(()=>{const r=invoicePageOutput(raw,f.context);return productExtraction(onboardingWireOutput(r.output),{...f.context,invoiceExpensePages:r.expensePages});});}
 const foreign=pagedWire(f);assert.throws(()=>invoicePageOutput(foreign,{...f.context,allowedPages:[1]}));assert.throws(()=>invoicePageOutput(foreign,{kind:'image',snapshot:f.snapshot}));
});
test('unreadable, other and continuation pages stay explicitly pending without inventing an expense',()=>{
 const f=q48();for(const kind of ['unreadable','other','continuation']){const raw=pagedWire(f,[1,2],[2]);raw.invoicePages.p2.kind=kind;const r=invoicePageOutput(raw,f.context),out=productExtraction(onboardingWireOutput(r.output),{...f.context,invoiceExpensePages:r.expensePages});assert.equal(out.houseExpenses.length,1);assert.deepEqual(out.invoiceCoverage.pendingPages,[2]);assert.equal(out.houseExpenses[0].amountCandidates[0].amountCents,12200);}
 const input=pagedWire(f),before=JSON.stringify(input);invoicePageOutput(input,f.context);assert.equal(JSON.stringify(input),before);
});
test('progressive prefix records unseen page 2; metadata is bounded, complete, ordered and tied to the sent pages',()=>{
 const f=q48(),prefix=decode(f,[1]);assert.deepEqual(prefix.invoiceCoverage,{version:'invoice-coverage-v1',totalPages:2,sentPages:[1],coveredPages:[1],pendingPages:[2]});
 const safe=checkedInvoiceCoverage({...prefix.invoiceCoverage,raw:'PRIVATE'});assert(!JSON.stringify(safe).includes('PRIVATE'));
 for(const change of [{totalPages:21},{coveredPages:[1,2]},{coveredPages:[1,1]},{pendingPages:[]},{sentPages:[2,1]},{version:'forged'}])assert.throws(()=>checkedInvoiceCoverage({...safe,...change}));
 assert.throws(()=>productExtraction({...f.raw,invoiceCoverage:safe},f.context));
});
test('actual Q48 preparation, wire decode and durable-observation sanitizer cover both full pages and both prefixes offline',async()=>{
 const f=q48(),{createModelAdapter,checkedObservation}=require('./quality-v3-model.cjs'),{fakeTransport,MODEL}=require('./quality-v3-model-fixture.cjs');
 const fake=fakeTransport({reply:body=>pagedWire(f,Object.keys(body.output_config.format.schema.properties.invoicePages.properties).map(k=>Number(k.slice(1))))}),adapter=createModelAdapter({model:MODEL,transport:fake.transport});
 for(const input of [{mode:'full'},{mode:'local_pages'},{mode:'progressive',throughPage:1},{mode:'progressive',throughPage:2}]){
  const r=await adapter({id:'Q48',documentId:f.snapshot.documentId,documentVersion:1,sha256:f.original.sha256,gold:f.original.gold,...input},{model:MODEL,reserveMicroUsd:250000,authorize:async()=>{}});assert.equal(r.observation.failureCode,null);assert.equal(r.automatic,'review');assert.equal(r.output.houseExpenses.length,input.throughPage===1?1:2);assert.deepEqual(r.observation.invoiceCoverage.pendingPages,input.throughPage===1?[2]:[]);assert.equal(r.observation.complete,false);
  const packed=checkedObservation({...r.observation,raw:'PRIVATE'});assert(!JSON.stringify(packed).includes('PRIVATE'));assert(!JSON.stringify(packed).includes('Termonimbo'));assert.throws(()=>checkedObservation({...packed,invoiceCoverage:{...packed.invoiceCoverage,sentPages:[2]}}));
 }
 assert.equal(fake.sends(),4);
});
