global.fetch=async()=>{throw Error('network_forbidden');};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createModelAdapter,checkedObservation}=require('./quality-v3-model.cjs');
const {load}=require('./corpus-v3/corpus.cjs');
const {MODEL,houseDocument,fakeTransport}=require('./quality-v3-model-fixture.cjs');
const {ProviderFailure}=require('../dist/review/provider');
const source=load().cases.find(c=>c.id==='Q31'),item={id:source.id,sha256:source.sha256,documentId:'synthetic-only',documentVersion:1,gold:source.gold};
const pages=['Planimetria catastale sintetica','dettaglio consumi','Riepilogo importi e totale fattura'];
const parser={extract:async([input])=>[{snapshot:input.snapshot,pages}]};
const context=(extra={})=>({model:MODEL,reserveMicroUsd:250000,authorize:async()=>{},...extra});
test('model adapter has no implicit transport and checks source, model, budget and authorization context',async()=>{
 assert.throws(()=>createModelAdapter({model:MODEL}));const fake=fakeTransport(),adapter=createModelAdapter({transport:fake.transport,model:MODEL,parser});
 await assert.rejects(()=>adapter(item,{}));await assert.rejects(()=>adapter({...item,sha256:'0'.repeat(64)},context()));assert.equal(fake.requests.length,0);
 await assert.rejects(()=>adapter(item,context({model:'unrecognized'})));assert.equal(fake.sends(),0);
});
test('actual HTTP preparation, wire decoding, citation validation, cache pricing and automatic policy on text',async()=>{
 const fake=fakeTransport({reply:()=>houseDocument()}),adapter=createModelAdapter({transport:fake.transport,model:MODEL,parser});let checks=0;
 const result=await adapter(item,context({authorize:async()=>{checks++;}}));assert(checks>=4);assert.equal(result.costMicroUsd,2250);assert.equal(result.output.documentKind,'house_document');assert.equal(result.automatic,'complete');assert.equal(result.observation.complete,true);assert.equal(result.observation.usage.cacheCreation,100);
 assert.deepEqual(fake.requests.map(r=>r.endpoint),['models/'+MODEL,'messages/count_tokens','messages']);assert.equal(fake.requests[2].body.system[0].cache_control.ttl,'5m');assert.equal(fake.requests[2].body.output_config.format.type,'json_schema');
});
test('full, local pages and progressive text prefix preserve physical page numbers',async()=>{
 const fake=fakeTransport(),adapter=createModelAdapter({transport:fake.transport,model:MODEL,parser});
 const full=await adapter(item,context());assert.deepEqual(full.observation.reading.sentPages,[1,2,3]);
 const local=await adapter({...item,mode:'local_pages'},context());assert.deepEqual(local.observation.reading.sentPages,[1,3]);
 const prefix=await adapter({...item,mode:'progressive',throughPage:1},context());assert.deepEqual(prefix.observation.reading.sentPages,[1]);assert.deepEqual(JSON.parse(fake.requests.at(-1).body.messages[0].content).pages.map(p=>p.page),[1]);
 await assert.rejects(()=>adapter({...item,mode:'progressive',throughPage:4},context()));
});
test('scans render authorized prefixes; visual completion always remains separate from automatic permission',async()=>{
 const rendered=[],scan=load().cases.find(c=>c.id==='Q48'),scanItem={...item,id:scan.id,sha256:scan.sha256};
 const visualParser={extract:async()=>{throw new ProviderFailure('pdf_text_unavailable');},pageCount:async()=>2,renderPage:async(_input,page)=>{rendered.push(page);return{bytes:Buffer.from('offline PNG'),pageCount:2};}};
 const fake=fakeTransport({reply:()=>houseDocument({visual:true,page:2})}),adapter=createModelAdapter({transport:fake.transport,model:MODEL,parser:visualParser});
 const result=await adapter({...scanItem,mode:'progressive',throughPage:2},context());assert.deepEqual(rendered,[1,2]);assert.equal(result.observation.complete,true);assert.equal(result.automatic,'review');assert.equal(result.observation.failureCode,null);
 const rejected=await adapter({...scanItem,mode:'progressive',throughPage:1},context());assert.equal(rejected.observation.failureCode,'analysis_invalid_output');assert.equal(rejected.observation.complete,false);assert.equal(rejected.costMicroUsd,2250);
});
test('invalid JSON/citation/stop reason: known usage is charged, no completion or automatic creation',async()=>{
 for(const options of [{invalidJson:true},{reply:()=>houseDocument({title:'INVENTED, absent from source'})},{stopReason:'max_tokens'}]){
  const fake=fakeTransport(options),adapter=createModelAdapter({transport:fake.transport,model:MODEL,parser});const r=await adapter(item,context());assert.equal(r.output,null);assert.equal(r.costMicroUsd,2250);assert.equal(r.automatic,'review');assert.equal(r.observation.complete,false);assert.equal(r.observation.failureCode,'analysis_invalid_output');
 }
});
test('aborted/revoked authorization, invalid usage and over-reserve costs cannot be dispatched or settled as valid',async()=>{
 const fake=fakeTransport(),adapter=createModelAdapter({transport:fake.transport,model:MODEL,parser});const abort=new AbortController();abort.abort();
 await assert.rejects(()=>adapter(item,context({signal:abort.signal})));assert.equal(fake.requests.length,0);
 await assert.rejects(()=>adapter(item,context({authorize:async()=>{throw Error('scope revoked');}})));assert.equal(fake.requests.length,0);
 await assert.rejects(()=>adapter(item,context({reserveMicroUsd:1})));
 const invalid=fakeTransport({usage:{input_tokens:-1}});await assert.rejects(()=>createModelAdapter({transport:invalid.transport,model:MODEL,parser})(item,context()));
});
test('durable observation contains only bounded metadata, never raw response/prompt/text',async()=>{
 const fake=fakeTransport(),r=await createModelAdapter({transport:fake.transport,model:MODEL,parser})(item,context());
 const packed=checkedObservation({...r.observation,raw:'PRIVATE',prompt:'PRIVATE'});assert(!JSON.stringify(packed).includes('PRIVATE'));
 assert.throws(()=>checkedObservation({...packed,complete:'yes'}));assert.throws(()=>checkedObservation({...packed,reading:{...packed.reading,sentPages:[2,1]}}));
 assert.throws(()=>checkedObservation({...packed,complete:true,failureCode:'analysis_invalid_output'}));assert.throws(()=>checkedObservation({...packed,usage:{...packed.usage,input:1}}));
});
