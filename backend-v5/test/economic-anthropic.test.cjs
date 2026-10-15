// OFFLINE: all HTTP is stubbed; no key, provider account, DB or paid request is used.
require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {EconomicAnthropicProvider,ECONOMIC_SYSTEM,ECONOMIC_OUTPUT_SCHEMA}=require('../dist/economy/document-anthropic');
const {AnthropicTransport}=require('../dist/review/anthropic');
const {PdfTextExtractor}=require('../dist/review/pdf-text');
const {economicFixturePdf}=require('../dist/economy/document-fixture');
const {printedCents,printedDates}=require('../dist/economy/document-evidence');
const {digest}=require('../dist/security');
const model='offline-model';
const signal=()=>new AbortController().signal;
const snapshot={documentId:randomUUID(),documentVersion:1,documentSha256:'local-hash'};
const raw=()=>({documentKind:'utility_bill',currency:'EUR',currencyEvidence:{page:1,excerpt:'Totale corrente bolletta: 80,00 EUR'},fields:[{field:'category',value:'gas',page:1,excerpt:'Bolletta gas settembre'}],amounts:[{id:'current',amountCents:8000,role:'current_document_total',label:'Corrente',page:1,excerpt:'Totale corrente bolletta: 80,00 EUR'},{id:'arrears',amountCents:2000,role:'arrears_balance',label:'Arretrati',page:1,excerpt:'Saldo precedenti bollette: 20,00 EUR'}]});
const answer=(data=raw(),extra={})=>({id:'msg_offline',model,stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(data)}],usage:{input_tokens:900,output_tokens:400},...extra});
const prepared=(pages=['Bolletta gas settembre\nTotale corrente bolletta: 80,00 EUR\nSaldo precedenti bollette: 20,00 EUR'])=>({request:{model,max_tokens:4096},document:{snapshot,pages}});
const provider=()=>new EconomicAnthropicProvider(new PdfTextExtractor(),{});
const fails=(fn,code)=>assert.throws(fn,e=>e.code===code);

test('Economy adapter: real PDF parser, stubbed model/count/Messages; only pages transmitted',async()=>{
  const transport=new AnthropicTransport({headers:()=>({'content-type':'application/json'})});
  const calls=[];
  transport.fetchImpl=async(url,opts)=>{calls.push({url,body:opts.body&&JSON.parse(opts.body)});if(url.endsWith('/models/'+model))return Response.json({id:model});if(url.endsWith('/messages/count_tokens'))return Response.json({input_tokens:1000});if(url.endsWith('/messages'))return Response.json(answer());throw Error('No network allowed');};
  const bytes=economicFixturePdf('gas'),original={...snapshot,documentSha256:digest(bytes)};
  const adapter=new EconomicAnthropicProvider(new PdfTextExtractor(),transport);
  const request=await adapter.prepare({snapshot:original,bytes},model,signal());
  assert.equal(calls.length,2);assert(calls.every(c=>!c.url.endsWith('/messages')));
  assert.deepEqual(request.request.output_config.format.schema,ECONOMIC_OUTPUT_SCHEMA);
  assert(!JSON.stringify(calls).includes(original.documentId));assert(!JSON.stringify(calls).includes(original.documentSha256));
  const response=await transport.send(request.request,signal());
  const result=adapter.decode(response,request);
  assert.equal(calls.length,3);assert.equal(result.output.amountSelectionRequired,true);
  assert.equal(result.output.amountCandidates[0].sources[0].sha256,original.documentSha256);
  assert.deepEqual(result.usage,{input:900,output:400});
  assert.match(ECONOMIC_SYSTEM,/UNTRUSTED DATA/);
});
test('Unverified pages/excerpts, amount, category and forged identity fail closed',()=>{
  for(const mutate of [r=>r.amounts[0].page=2,r=>r.amounts[0].excerpt='Invented total 80,00 EUR',r=>r.amounts[0].amountCents=10000,r=>r.fields[0].value='electricity',r=>r.amounts[0].documentId=randomUUID(),r=>r.fields.push({...r.fields[0]})]){const r=raw();mutate(r);assert.throws(()=>provider().decode(answer(r),prepared()),e=>['evidence_unverified','analysis_invalid_output'].includes(e.code));}
});
test('Non EUR, mixed currencies and unsupported documents produce no economic proposal',()=>{
  const r=raw();r.currency='unsupported';fails(()=>provider().decode(answer(r),prepared()),'no_supported_economic_data');
  r.currency='EUR';r.documentKind='unsupported';fails(()=>provider().decode(answer(r),prepared()),'no_supported_economic_data');
  fails(()=>provider().decode(answer(),prepared([...prepared().document.pages,'Other total USD 80.00'])),'evidence_unverified');
  const noCurrency=raw();noCurrency.currencyEvidence={page:1,excerpt:'Bolletta gas settembre'};fails(()=>provider().decode(answer(noCurrency),prepared()),'evidence_unverified');
});
test('Locale evidence: grouped decimals and Italian calendar dates, without arithmetic inference',()=>{
  assert.deepEqual(printedCents('Totale EUR 1.234,56'),[123456]);
  assert.deepEqual(printedCents('EUR 1,234.56'),[123456]);
  assert.deepEqual(printedCents('EUR 1\u00a0234,56'),[123456]);
  assert.deepEqual(printedCents('EUR 12.34,56'),[]);
  assert.deepEqual(printedCents('EUR -80,00'),[]);
  assert.deepEqual(printedCents('EUR - 80,00'),[]);
  assert.deepEqual(printedCents('(80,00)'),[]);
  assert.deepEqual(printedCents('EUR 80'),[]);
  assert.deepEqual(printedDates('30/09/2026; 30 settembre 2026; 31/02/2026'),['2026-09-30']);
  const text='Totale documento EUR 1.234,56\nData fattura: 30/09/2026';
  const r=raw();r.documentKind='simple_invoice';r.currencyEvidence={page:1,excerpt:text.split('\n')[0]};r.fields=[{field:'documentDate',value:'2026-09-30',page:1,excerpt:'Data fattura: 30/09/2026'}];r.amounts=[{id:'gross',amountCents:123456,role:'current_document_total',label:'Lordo',page:1,excerpt:text.split('\n')[0]}];
  const decoded=provider().decode(answer(r),prepared([text])).output;
  assert.equal(decoded.proposedFields.documentDate.value,'2026-09-30');assert.equal(decoded.amountSelectionRequired,false);
  r.amounts[0].amountCents=123457;fails(()=>provider().decode(answer(r),prepared([text])),'evidence_unverified');
});
test('Truncation, refusal, tool calls, invalid JSON, wrong model and unsafe usage are rejected',()=>{
  for(const response of [answer(raw(),{stop_reason:'max_tokens'}),answer(raw(),{stop_reason:'refusal'}),answer(raw(),{content:[{type:'tool_use'}]}),answer(raw(),{content:[{type:'text',text:'bad json'}]}),answer(raw(),{model:'other'}),answer(raw(),{usage:{input_tokens:100,output_tokens:5000}})])fails(()=>provider().decode(response,prepared()),'analysis_invalid_output');
  fails(()=>provider().decode(answer(raw(),{usage:{input_tokens:49999,output_tokens:100}}),prepared()),'analysis_limits_exceeded');
});
test('Prepare: abort, corrupt snapshot and excessive tokens never dispatch Messages',async()=>{
  let calls=0;const parser={extract:async()=>{calls++;return [prepared().document];}};
  const adapter=new EconomicAnthropicProvider(parser,{});const abort=new AbortController();abort.abort();
  await assert.rejects(adapter.prepare({},model,abort.signal),e=>e.code==='analysis_timeout');assert.equal(calls,0);
  await assert.rejects(new EconomicAnthropicProvider(new PdfTextExtractor(),{}).prepare({snapshot,bytes:economicFixturePdf('gas')},model,signal()),e=>e.code==='storage_unavailable');
  const transport=new AnthropicTransport({headers:()=>({})});const urls=[];
  transport.fetchImpl=async url=>{urls.push(url);return Response.json(url.includes('/models/')?{id:model}:{input_tokens:50000});};
  await assert.rejects(new EconomicAnthropicProvider(parser,transport).prepare({},model,signal()),e=>e.code==='analysis_limits_exceeded');
  assert(!urls.some(u=>u.endsWith('/messages')));
});
