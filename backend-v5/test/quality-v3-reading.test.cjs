const {test}=require('node:test');
const assert=require('node:assert/strict');
const {localPageSelection,progressiveComplete}=require('../dist/object-onboarding/reading');
const {readObjectType}=require('../dist/object-onboarding/object-type');
const {onboardingUsageCost}=require('../dist/review/anthropic');
const {automaticPlan,AutomaticReviewNeeded}=require('../dist/object-onboarding/automatic-plan');
const {ObjectOnboardingAnthropicProvider}=require('../dist/object-onboarding/anthropic-provider');
const {ProviderFailure}=require('../dist/review/provider');
const {digest}=require('../dist/security');
const {readProgressively}=require('../dist/object-onboarding/reading');

test('local page selection keeps relevant pages and excludes only clearly marked detail pages',()=>{
 const pages=['Fattura n. A1, fornitore e data','Dettaglio consumi pagina 1','Riepilogo importi e totale fattura','Condizioni generali','Installatore e modello: X','Pagina finale con firma'];
 assert.deepEqual(localPageSelection(pages),[1,3,5,6]);
 assert.deepEqual(localPageSelection(['uno','due']),[1,2]);
 assert.deepEqual(localPageSelection([]),[]);
});

test('uncertain or unsupported taxonomy wording can never be promoted to certain',()=>{
 const proof=(excerpt)=>({page:1,excerpt,region:null,basis:'verified_text'});
 const read=(value,certainty,excerpt,primary='Modulo MX')=>readObjectType({value,certainty,evidence:proof(excerpt)},x=>x,primary);
 assert.equal(read('appliance','certain','Modulo MX').certainty,'uncertain');
 assert.equal(read('appliance','certain','Modulo MX elettrodomestico').certainty,'certain');
 assert.equal(read('heating','certain','Modulo MX caldaia','Caldaia MX').certainty,'uncertain');
 assert.equal(read('heating','uncertain','Modulo MX elettrodomestico').certainty,'uncertain');
 assert.throws(()=>read('boiler','certain','Caldaia MX','Caldaia MX'));
});

test('automatic object creation requires explicit verified certainty and retains source safety checks',()=>{
 const base={documentKind:'delivery_notice',evidenceMode:'text',needsReview:false,reviewWarnings:[],houseExpenses:[],items:[{id:'x',fields:{name:{value:'Lavatrice Q',source:{basis:'verified_text'}}},nameTruncated:false,disposition:'household_object',quantity:{value:1},objectType:{value:'appliance',certainty:'certain',source:{basis:'verified_text'}}}]};
 assert.equal(automaticPlan(base).choices[0].type,'appliance');
 for(const objectType of [undefined,{...base.items[0].objectType,certainty:'uncertain'},{...base.items[0].objectType,source:{basis:'provider_observed_image'}}]){
  const output={...base,items:[{...base.items[0],objectType}]};
  assert.throws(()=>automaticPlan(output),AutomaticReviewNeeded);
 }
});

test('progressive completion is only a conservative extraction signal',()=>{
 const output={documentKind:'product_document',needsReview:false,items:[{fields:{name:'x'},objectType:{certainty:'certain'}}]};
 assert.equal(progressiveComplete(output),true);
 assert.equal(progressiveComplete({...output,needsReview:true}),false);
 assert.equal(progressiveComplete({...output,items:[{...output.items[0],objectType:{certainty:'uncertain'}}]}),false);
});

test('cached token usage costs uncached, cache-write premium and model-specific reads conservatively',()=>{
 const response=(usage)=>({id:'msg_test',model:'claude-sonnet-5-5',stop_reason:'end_turn',content:[{type:'text',text:'{}'}],usage:{input_tokens:1000,output_tokens:100,...usage}});
 const priced={input:2,output:10};
 assert.equal(onboardingUsageCost(response({}), 'claude-sonnet-5-5',priced).cost,3000);
 assert.equal(onboardingUsageCost(response({cache_creation_input_tokens:1000}), 'claude-sonnet-5-5',priced).cost,5500);
 assert.equal(onboardingUsageCost(response({cache_read_input_tokens:1000}), 'claude-sonnet-5-5',priced).cost,3100);
 assert.throws(()=>onboardingUsageCost(response({cache_read_input_tokens:-1}),'claude-sonnet-5-5',priced));
 assert.throws(()=>onboardingUsageCost(response({cache_creation_input_tokens:50000}),'claude-sonnet-5-5',priced));
});

test('provider prepares full and local-page text requests with original physical page citations',async()=>{
 const bytes=Buffer.from('synthetic PDF bytes'),snapshot={documentId:'synthetic',documentVersion:1,documentSha256:digest(bytes)};let sent;
 const parser={extract:async()=>[{snapshot,pages:['header supplier','dettaglio consumi','riepilogo importi e totale fattura','condizioni generali','modello: X','firma finale']}]};
 const transport={prepareStructured:async(model,system,messages,schema)=>{sent=messages;return{model,system,messages,max_tokens:4096,output_config:{format:{schema}}};}};
 const provider=new ObjectOnboardingAnthropicProvider(parser,transport),input={bytes,snapshot,mimeType:'application/pdf'},signal=new AbortController().signal;
 const local=await provider.prepare(input,'offline',signal,async()=>{},'products',{mode:'local_pages'});
 assert.deepEqual(local.reading.sentPages,[1,3,5,6]);assert.match(sent[0].content,/"page":3/);assert.doesNotMatch(sent[0].content,/dettaglio consumi|condizioni generali/);
 assert.throws(()=>require('../dist/object-onboarding/domain').productExtraction({documentKind:'delivery_notice',hasMoreItems:false,items:[{fields:{name:{value:'X',evidence:{page:2,excerpt:'X',region:null}}},quantity:null,nameTruncated:false,disposition:'household_object',confidence:'high'}]},local.context));
 const full=await provider.prepare(input,'offline',signal,async()=>{});assert.equal(full.reading.sentPages.length,6);assert.match(sent[0].content,/dettaglio consumi/);
});

test('progressive scan preparation renders only the authorized page prefix and preserves page numbering',async()=>{
 const bytes=Buffer.from('synthetic scanned PDF'),snapshot={documentId:'synthetic-scan',documentVersion:1,documentSha256:digest(bytes)},rendered=[];let sent;
 const parser={extract:async()=>{throw new ProviderFailure('pdf_text_unavailable');},pageCount:async()=>6,renderPage:async(_input,page)=>{rendered.push(page);return{bytes:Buffer.from('page-'+page),pageCount:6};}};
 const transport={prepareStructured:async(model,system,messages,schema)=>{sent=messages;return{model,system,messages,max_tokens:4096,output_config:{format:{schema}}};}};
 const provider=new ObjectOnboardingAnthropicProvider(parser,transport),prepared=await provider.prepare({bytes,snapshot,mimeType:'application/pdf'},'offline',new AbortController().signal,async()=>{},'products',{mode:'progressive',throughPage:2});
 assert.deepEqual(rendered,[1,2]);assert.deepEqual(prepared.reading.sentPages,[1,2]);assert.equal(prepared.context.pageCount,6);assert.equal(sent[0].content.filter(b=>b.type==='image').length,2);assert(sent[0].content[2].text.includes('Physical page 2 of 6'));
});

test('progressive scan mock stops at the first complete page and reserves through the injected reader',async()=>{
 const calls=[],result=await readProgressively(6,async throughPage=>{calls.push(throughPage);return{needsReview:throughPage<3};},value=>!value.needsReview);
 assert.deepEqual(calls,[1,2,3]);assert.equal(result.pagesRead,3);assert.equal(result.complete,true);
 const exhausted=await readProgressively(2,async page=>({page}),()=>false);assert.equal(exhausted.pagesRead,2);assert.equal(exhausted.complete,false);
 await assert.rejects(()=>readProgressively(0,async()=>null,()=>false),RangeError);
});
