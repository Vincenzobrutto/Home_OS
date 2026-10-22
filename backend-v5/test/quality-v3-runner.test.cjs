const {test}=require('node:test'),assert=require('node:assert/strict');
const {runCampaign}=require('./quality-v3-runner.cjs');
test('campaign requires an explicit ledger and durable limits have one configuration source',async()=>{
 let calls=0;const provider=async()=>{calls++;};
 await assert.rejects(()=>runCampaign({cases:[{id:'Q01'}],provider}),e=>e.code==='invalid_ledger');
 const ledger={claim:async()=>{throw Error('not reached');},settle:async()=>{},uncertain:async()=>{},entries:async()=>[]};
 await assert.rejects(()=>runCampaign({cases:[],provider,ledger,maxCalls:1}),e=>e.code==='configure_limits_on_durable_ledger');assert.equal(calls,0);
});
test('mock campaign runs all 52 synthetic cases, scores observations and resumes without duplicates',async()=>{
 const cases=Array.from({length:52},(_,i)=>({id:`Q${String(i+1).padStart(2,'0')}`,gold:{documentKind:'unsupported',items:[],expenses:[],contacts:[],automatic:'review'},output:{documentKind:'unsupported',items:[],needsReview:true,houseExpenses:[]},pages:[]}));let calls=0;
 const provider=async()=>{calls++;return{state:'settled',costMicroUsd:1000,output:{documentKind:'unsupported',items:[],needsReview:true,houseExpenses:[]},automatic:'review'};};
 const first=await runCampaign({cases,provider,ledger:new Map(),maxCalls:52,budgetMicroUsd:52000,reserveMicroUsd:1000});assert.equal(first.calls,52);assert.equal(first.settled,52);assert.equal(calls,52);assert.equal(first.metrics.criticalAutomaticErrors,0);
 const resumed=await runCampaign({cases,provider,ledger:first.ledger,maxCalls:52,budgetMicroUsd:52000,reserveMicroUsd:1000});assert.equal(resumed.calls,52);assert.equal(calls,52);
});
test('uncertain or interrupted provider outcome retains reservation and is never retried on resume',async()=>{let calls=0;const cases=[{id:'Q01'}],provider=async()=>{calls++;return{state:'uncertain'};};const a=await runCampaign({cases,provider,ledger:new Map(),maxCalls:2,budgetMicroUsd:2000,reserveMicroUsd:1000});const b=await runCampaign({cases,provider,ledger:a.ledger,maxCalls:2,budgetMicroUsd:2000,reserveMicroUsd:1000});assert.equal(a.uncertain,1);assert.equal(b.uncertain,1);assert.equal(b.committedMicroUsd,1000);assert.equal(calls,1);const interrupted=await runCampaign({cases,provider,ledger:new Map([['Q01',{state:'sending',reserveMicroUsd:1000}]]),maxCalls:2,budgetMicroUsd:2000,reserveMicroUsd:1000});assert.equal(interrupted.uncertain,1);assert.equal(calls,1);});
test('campaign checks call and money ceilings before dispatch',async()=>{let calls=0;const provider=async()=>{calls++;return{state:'settled',costMicroUsd:1000};};await assert.rejects(()=>runCampaign({cases:[{id:'Q01'},{id:'Q02'}],provider,ledger:new Map(),maxCalls:1,budgetMicroUsd:5000,reserveMicroUsd:1000}),e=>e.code==='call_limit');assert.equal(calls,1);calls=0;await assert.rejects(()=>runCampaign({cases:[{id:'Q01'}],provider,ledger:new Map(),maxCalls:2,budgetMicroUsd:999,reserveMicroUsd:1000}),e=>e.code==='budget_limit');assert.equal(calls,0);});
