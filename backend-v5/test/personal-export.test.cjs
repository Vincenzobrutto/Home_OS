require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {UnauthorizedException}=require('@nestjs/common');
const {Projection,ExportBudget,collect,scalars,EXPORT_LIMITS}=require('../dist/personal-export/projection');
const {PersonalExportService}=require('../dist/personal-export/personal-export.service');
const {PersonalExportController}=require('../dist/personal-export/personal-export.controller');
const projection=()=>new Projection(new Map([['doc',{version:1,sha256:'hash'}]]),new Set(['object']),new Set(['boiler']),new Set(['activity']),new Set(['expense']),new Set(['work']),new Set(['room']));
test('Allowlist drops unknown/nested values, preserves null/calendar/cents and normalized instants',()=>{
  assert.deepEqual(scalars({title:'Costo',amountCents:1999,spentOn:'2026-10-16',note:null,createdAt:new Date('2026-10-16T10:00:00Z'),passwordHash:'secret',state:{token:'secret'}},['title','amountCents','spentOn','note','createdAt','state']),{title:'Costo',amountCents:1999,spentOn:'2026-10-16',note:null,createdAt:'2026-10-16T10:00:00.000Z'});
});
test('Current and historical expense references/provenance exclude foreign identifiers, titles and raw source data',()=>{
  const p=projection(),raw={id:'expense',amountCents:42,documentId:'foreign',assetId:'boiler',workId:'work',economicObjectRef:{kind:'object',id:'object'},economicProvenance:{amountCents:{origin:'extraction_confirmed',token:'secret',sources:[{documentId:'foreign',documentVersion:1,sha256:'hash',excerpt:'foreign secret'}]},title:{origin:'user_declared',sources:[]}},analysisDraftId:'secret',documentLink:{name:'foreign secret'}};
  const output=JSON.stringify(p.history('expense','updated',raw));assert(!output.includes('foreign'));assert(!output.includes('secret'));assert(output.includes('boiler'));assert(p.refsExcluded);
  assert.equal(p.history('expense','future_event',{title:'future-secret'}),null);assert(p.historyLimited);
});
test('Confirmed fields and power provenance require owned matching version/hash; economic citation spelling supported',()=>{
  const p=projection(),owned={documentId:'doc',documentVersion:1,documentSha256:'hash',page:2,excerpt:'owned',token:'secret'},foreign={...owned,documentId:'foreign',excerpt:'foreign secret'};
  const result=p.confirmed({brand:{fieldKey:'brand',value:{kind:'text',text:'Marca',secret:'never'},revision:2,confirmationId:'secret',sources:[owned,foreign]},power:{fieldKey:'power',value:{kind:'power',measurements:[{value:'28',unit:'kW',quantityCode:'reported_nominal',quantityLabel:'Nominale',origin:'proposal_accepted',sources:[foreign]}]},sources:[]},future:{fieldKey:'future',value:{kind:'text',text:'never'}}});
  const output=JSON.stringify(result);assert(!output.includes('secret'));assert(!output.includes('foreign'));assert(!output.includes('never'));assert.equal(result.length,2);assert.equal(p.sources([{...owned,documentSha256:undefined,sha256:'hash'}]).length,1);assert.equal(p.sources([{...owned,documentVersion:2}]).length,0);
});
test('Links and their history cannot reveal either forbidden endpoint; room notes and unknown saved shapes omitted',()=>{
  const p=projection();assert.equal(p.link({objectId:'object',resourceType:'document',resourceId:'foreign',note:'secret'}),null);
  assert.equal(p.objectSnapshot({kind:'link',row:{objectId:'foreign',resourceType:'document',resourceId:'doc'}}),null);
  assert(!JSON.stringify(p.objectSnapshot({kind:'room',row:{id:'room',name:'Sala',note:'secret'}})).includes('secret'));
  assert.equal(p.objectSnapshot({kind:'future',row:{name:'secret'}}),null);assert(p.historyLimited);
  assert.equal(p.objectSnapshot({kind:'object',row:{id:'foreign',name:'foreign secret'}}).row,null);
});
test('Bounded batch reader rejects row overflow and raw byte overflow without truncation',async()=>{
  const budget=new ExportBudget();budget.rows=EXPORT_LIMITS.rows;
  await assert.rejects(collect(async take=>{assert.equal(take,1);return[{id:'overflow'}];},budget),e=>e.getResponse().code==='personal_export_too_large');
  assert.throws(()=>new ExportBudget().add([{id:'huge',value:'x'.repeat(EXPORT_LIMITS.bytes)}]),e=>e.getStatus()===413);
  let calls=0;assert.deepEqual(await collect(async take=>{assert(take<=100);calls++;return[];},new ExportBudget()),[]);assert.equal(calls,1);
});
test('Two pending exports maximum; failed builds release slots and never invoke delivery authorization',async()=>{
  const pending=[];let delay=true,authorized=0;const db={$transaction:()=>delay?new Promise((_resolve,reject)=>pending.push(reject)):Promise.reject(Error('DB secret'))};
  const service=new PersonalExportService(db,{}),auth=async()=>authorized++;
  const a=service.export('a','h',auth),b=service.export('a','h',auth),checks=[assert.rejects(a,e=>e.getResponse().code==='personal_export_unavailable'),assert.rejects(b,e=>e.getStatus()===503)];
  await assert.rejects(service.export('a','h',auth),e=>e.getResponse().code==='personal_export_busy');pending.forEach(reject=>reject(Error('DB secret')));await Promise.all(checks);delay=false;
  await assert.rejects(service.export('a','h',auth),e=>e.getResponse().code==='personal_export_unavailable'&&!JSON.stringify(e.getResponse()).includes('secret'));assert.equal(authorized,0);
});
test('Controller requires explicit context and empty input; logout detected before delivering attachment',async()=>{
  let called=0,sent=false;const sessions={require:async()=>({accountId:'a'})},exports={export:async(_a,_h,auth)=>{called++;await auth();return Buffer.from('{}');}};
  const c=new PersonalExportController(exports,sessions),res={setHeader(){},status(){return this;},send(){sent=true;}};
  await assert.rejects(c.export({headers:{}},'h',{}, {},res),e=>e.getStatus()===401);
  await assert.rejects(c.export({headers:{'x-account-context':'a'}},'h',{accountId:'b'},{},res),e=>e.getStatus()===422);assert.equal(called,0);
  let authCalls=0;sessions.require=async()=>{if(authCalls++)throw new UnauthorizedException();return {accountId:'a'};};
  await assert.rejects(c.export({headers:{'x-account-context':'a'}},'h',{}, {},res),e=>e.getStatus()===401);assert(!sent);
});
