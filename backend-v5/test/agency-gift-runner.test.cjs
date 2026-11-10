// Runner unit mocks only: SQL delegates, timers and worker IO are all controlled in memory.
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {GiftJobsRunner,giftDeliveryConfigured}=require('../dist/agency-practices/gift-runner');
const {GiftInvitationError}=require('../dist/agency-practices/gift-invitations'),{PracticeError}=require('../dist/agency-practices/domain');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function job(state='queued',extra={}){return {id:randomUUID(),state,version:1,leaseUntil:null,leaseTokenHash:null,lastError:null,createdAt:new Date(Date.now()-120000),updatedAt:new Date(Date.now()-60000),...extra};}
// Small generic predicate evaluator for the actual ORM query, not a replacement runner.
function matches(row,where){
 return Object.entries(where).every(([field,wanted])=>{
  if(field==='OR')return wanted.some(branch=>matches(row,branch));if(field==='AND')return wanted.every(branch=>matches(row,branch));
  const actual=row[field];if(wanted&&typeof wanted==='object'&&!(wanted instanceof Date))return Object.entries(wanted).every(([op,value])=>op==='in'?value.includes(actual):op==='lte'?actual!==null&&actual!==undefined&&actual<=value:false);
  return actual===wanted;
 });
}
function timers(t){
 const handles=new Set(),created=[],cleared=[];
 t.mock.method(globalThis,'setInterval',(callback,ms)=>{const handle={callback,ms,unreferenced:false,unref(){this.unreferenced=true;}};handles.add(handle);created.push(handle);return handle;});
 t.mock.method(globalThis,'clearInterval',handle=>{cleared.push(handle);handles.delete(handle);});
 return {created,cleared,tick(){for(const h of [...handles])h.callback();}};
}
function harness(t,options={}){
 const time=timers(t),rows=new Map((options.jobs||[]).map(r=>[r.id,structuredClone(r)])),receipts=new Map(),queries=[],locks=[],updates=[],calls=[],transactions=[];
 let failQueries=0,failTransaction=0,selectOverride=null,inFlight=0,maxInFlight=0;
 const tx={
  $queryRaw:async(...args)=>{locks.push(args);return [];},
  agencyGiftAcceptanceJob:{
   findMany:async query=>{queries.push(query);if(failQueries>0){failQueries--;throw Error('PRIVATE-SQL-DETAIL');}if(selectOverride)return selectOverride(query);return [...rows.values()].filter(row=>matches(row,query.where)).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id)).slice(0,query.take).map(r=>({id:r.id}));},
   findUnique:async({where})=>rows.has(where.id)?structuredClone(rows.get(where.id)):null,
   update:async({where,data})=>{const row=rows.get(where.id);assert.ok(row);updates.push({id:where.id,data:structuredClone(data)});for(const [key,value] of Object.entries(data))row[key]=value&&typeof value==='object'&&'increment'in value?row[key]+value.increment:value;return structuredClone(row);}
  },
  agencyGiftAcceptanceReceipt:{findUnique:async({where})=>receipts.get(where.jobId)||null}
 };
 const db={$transaction:async(work,config)=>{transactions.push(config);if(failTransaction===transactions.length)throw Error('PRIVATE-DB-UNCERTAIN');return work(tx);}};
 const worker={runNext:async(id,continueWork)=>{calls.push({id,continueWork});inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);try{return await (options.run?options.run({id,continueWork,rows,receipts}):Promise.resolve().then(()=>{rows.get(id).state='accepted';return {state:'accepted'};}));}finally{inFlight--;}}};
 const vaultCalls=[],vault={assertGiftDestination:async root=>{vaultCalls.push(root);if(options.vaultFailure)throw options.vaultFailure;}};
 const storage={root:'SYNTHETIC-PRIVATE-HOME-STORAGE'},runtime={autoStart:true,pollIntervalMs:1000,concurrency:1,...options.runtime},runner=new GiftJobsRunner(db,worker,vault,storage,runtime);
 const releases=[];t.after(async()=>{for(const release of releases)release();await runner.onModuleDestroy();});
 return {runner,time,rows,receipts,queries,locks,updates,calls,transactions,vaultCalls,storage,runtime,releases,maxInFlight:()=>maxInFlight,setFailQueries:n=>failQueries=n,setFailTransaction:n=>failTransaction=n,setSelect:fn=>selectOverride=fn};
}

test('runtime bounds are checked without starting timers or SQL',()=>{
 const db={},worker={},vault={},storage={root:'SYNTHETIC'};
 for(const pollIntervalMs of [0,249,60001,250.5,NaN,Infinity,'1000'])assert.throws(()=>new GiftJobsRunner(db,worker,vault,storage,{autoStart:true,pollIntervalMs,concurrency:1}),/gift_runtime_invalid/);
 for(const concurrency of [0,3,1.5,NaN,Infinity,'1'])assert.throws(()=>new GiftJobsRunner(db,worker,vault,storage,{autoStart:true,pollIntervalMs:1000,concurrency}),/gift_runtime_invalid/);
 assert.doesNotThrow(()=>new GiftJobsRunner(db,worker,vault,storage,{autoStart:false,pollIntervalMs:250,concurrency:1}));assert.doesNotThrow(()=>new GiftJobsRunner(db,worker,vault,storage,{autoStart:false,pollIntervalMs:60000,concurrency:2}));
});
test('delivery is configured only by explicit enable flag and a storage root',()=>{
 for(const env of [{},{DIMORA_AGENCY_GIFT_ENABLED:'1'},{DIMORA_AGENCY_GIFT_ENABLED:'0',DIMORA_AGENCY_STORAGE_ROOT:'SYNTHETIC'},{DIMORA_AGENCY_GIFT_ENABLED:'true',DIMORA_AGENCY_STORAGE_ROOT:'SYNTHETIC'}])assert.equal(giftDeliveryConfigured(env),false);
 assert.equal(giftDeliveryConfigured({DIMORA_AGENCY_GIFT_ENABLED:'1',DIMORA_AGENCY_STORAGE_ROOT:'SYNTHETIC'}),true);
});
test('initialization validates independent storage even with autoStart disabled, and wake cannot poll SQL',async t=>{
 const h=harness(t,{jobs:[job()],runtime:{autoStart:false}});await h.runner.onModuleInit();h.runner.wake();h.runner.wake();await settle();assert.deepEqual(h.vaultCalls,[h.storage.root]);assert.equal(h.queries.length,0);assert.equal(h.calls.length,0);assert.equal(h.time.created.length,0);
});
test('failed destination validation prevents poll and worker start',async t=>{
 const failure=Error('synthetic_destination_not_independent'),h=harness(t,{jobs:[job()],vaultFailure:failure});await assert.rejects(()=>h.runner.onModuleInit(),e=>e===failure);h.runner.wake();await settle();assert.equal(h.calls.length,0);assert.equal(h.queries.length,0);assert.equal(h.time.created.length,0);
});
test('autoStart immediately rediscovers durable eligible SQL jobs and respects retry backoff and leases',async t=>{
 const q=job('queued'),r=job('ready'),old=job('retryable'),recent=job('retryable',{updatedAt:new Date(Date.now()-1000)}),expired=job('staging',{leaseUntil:new Date(Date.now()-1000)}),unleased=job('staging'),live=job('staging',{leaseUntil:new Date(Date.now()+120000)}),done=job('accepted');
 const h=harness(t,{jobs:[q,r,old,recent,expired,unleased,live,done],runtime:{concurrency:2}});await h.runner.onModuleInit();await settle();assert.equal(h.time.created.length,1);assert.equal(h.time.created[0].unreferenced,true);assert.equal(h.calls.length,2);
 for(let i=0;i<3;i++){h.time.tick();await settle();}assert.deepEqual(new Set(h.calls.map(c=>c.id)),new Set([q.id,r.id,old.id,expired.id,unleased.id]));assert.equal(h.calls.length,5);assert.ok(h.queries.every(query=>query.take<=20));
});
for(const concurrency of [1,2])test('controlled worker promises never exceed configured concurrency '+concurrency,async t=>{
 const jobs=Array.from({length:4},()=>job()),pending=new Map();
 const h=harness(t,{jobs,runtime:{concurrency},run:({id,rows})=>{const d=deferred();pending.set(id,d);return d.promise.then(()=>{rows.get(id).state='accepted';});}});h.releases.push(()=>{for(const p of pending.values())p.resolve();});await h.runner.onModuleInit();await settle();assert.equal(h.calls.length,concurrency);assert.equal(h.maxInFlight(),concurrency);
 h.runner.wake();h.time.tick();await settle();assert.equal(h.calls.length,concurrency);const queries=h.queries.length;
 for(const c of h.calls)pending.get(c.id).resolve();await settle();assert.equal(h.calls.length,concurrency);assert.equal(h.queries.length,queries);
 h.time.tick();await settle();assert.equal(h.calls.length,Math.min(4,concurrency*2));assert.equal(h.maxInFlight(),concurrency);
});
test('duplicate SQL candidate IDs are not dispatched twice while already running',async t=>{
 const first=job(),second=job(),gates=[];const h=harness(t,{jobs:[first,second],runtime:{concurrency:2},run:()=>{const d=deferred();gates.push(d);return d.promise;}});h.releases.push(()=>gates.forEach(d=>d.resolve()));h.setSelect(()=>[{id:first.id},{id:first.id},{id:second.id}]);await h.runner.onModuleInit();await settle();assert.deepEqual(h.calls.map(c=>c.id),[first.id,second.id]);assert.equal(h.maxInFlight(),2);
});
test('shutdown flips continueWork false and waits for bounded work without redispatching',async t=>{
 const d=deferred(),h=harness(t,{jobs:[job()],run:()=>d.promise});h.releases.push(()=>d.resolve());await h.runner.onModuleInit();await settle();assert.equal(h.calls[0].continueWork(),true);const queuedTick=h.time.created[0].callback,queries=h.queries.length;let finished=false;
 const closing=h.runner.onModuleDestroy().then(()=>{finished=true;});assert.equal(h.calls[0].continueWork(),false);await settle();assert.equal(finished,false);queuedTick();h.runner.wake();await settle();assert.equal(h.queries.length,queries);
 d.resolve();await closing;assert.equal(finished,true);assert.equal(h.time.cleared.length,1);queuedTick();await settle();assert.equal(h.queries.length,queries);
});
test('rejected unknown worker is retried only by a later poll, never an immediate hot loop',async t=>{
 const hold=deferred(),row=job();let attempts=0;const h=harness(t,{jobs:[row],run:()=>++attempts===1?Promise.reject(Error('PRIVATE-WORKER-DETAIL')):hold.promise});h.releases.push(()=>hold.resolve());await h.runner.onModuleInit();await settle();assert.equal(h.calls.length,1);assert.equal(h.queries.length,1);assert.equal(h.updates.length,0);assert.equal(h.rows.get(row.id).state,'queued');
 h.time.tick();await settle();assert.equal(h.calls.length,2);assert.equal(h.queries.length,2);
});
for(const [state,error] of [['queued',()=>new GiftInvitationError('invalid_input')],['ready',()=>new PracticeError('access_denied')],['staging',()=>new GiftInvitationError('invalid_input')]])test('known pre-lease '+state+' failure is quarantined under a job lock',async t=>{
 const row=job(state,{leaseUntil:state==='staging'?new Date(Date.now()-1000):null}),h=harness(t,{jobs:[row],run:()=>Promise.reject(error())});await h.runner.onModuleInit();await settle();const current=h.rows.get(row.id);assert.equal(current.state,'blocked_review');assert.equal(current.version,2);assert.equal(current.lastError,'gift_review_required');assert.equal(current.leaseUntil,null);assert.equal(current.leaseTokenHash,null);assert.ok(h.locks.some(args=>String(args[0]).includes('FOR UPDATE')));assert.equal(h.updates.length,1);
 h.time.tick();await settle();assert.equal(h.calls.length,1);
});
test('null-lease staging is rediscovered and a known invalid preparation is quarantined rather than stuck',async t=>{
 const row=job('staging'),h=harness(t,{jobs:[row],run:()=>Promise.reject(new GiftInvitationError('invalid_input'))});await h.runner.onModuleInit();await settle();assert.equal(h.calls.length,1);assert.equal(h.rows.get(row.id).state,'blocked_review');
});
test('a newly live worker lease is never overwritten by runner quarantine',async t=>{
 const row=job(),until=new Date(Date.now()+120000),h=harness(t,{jobs:[row],run:({rows,id})=>{Object.assign(rows.get(id),{state:'staging',leaseUntil:until,leaseTokenHash:'owned-by-other-worker'});throw new PracticeError('source_changed');}});await h.runner.onModuleInit();await settle();assert.equal(h.updates.length,0);assert.equal(h.rows.get(row.id).state,'staging');assert.equal(h.rows.get(row.id).leaseTokenHash,'owned-by-other-worker');assert.deepEqual(h.rows.get(row.id).leaseUntil,until);
 h.time.tick();await settle();assert.equal(h.calls.length,1);
});
test('an accepted receipt discovered after worker failure prevents quarantine',async t=>{
 const row=job(),h=harness(t,{jobs:[row],run:({receipts,id})=>{receipts.set(id,{id:'accepted-receipt'});throw new GiftInvitationError('invalid_input');}});await h.runner.onModuleInit();await settle();assert.equal(h.updates.length,0);assert.equal(h.rows.get(row.id).state,'queued');assert.equal(h.receipts.get(row.id).id,'accepted-receipt');
});
test('unknown SQL outcomes remain for later poll without unsafe quarantine or raw diagnostic logs',async t=>{
 const logs=[];for(const method of ['log','warn','error','info','debug'])t.mock.method(console,method,(...args)=>logs.push(args));
 const row=job(),h=harness(t,{jobs:[row],run:()=>Promise.reject(new GiftInvitationError('invalid_input'))});h.setFailTransaction(2);await h.runner.onModuleInit();await settle();assert.equal(h.rows.get(row.id).state,'queued');assert.equal(h.updates.length,0);assert.equal(h.calls.length,1);
 h.time.tick();await settle();assert.equal(h.rows.get(row.id).state,'blocked_review');assert.deepEqual(logs,[]);
});
test('SQL polling failure does not dispatch or loop immediately and can recover on the interval',async t=>{
 const h=harness(t,{jobs:[job()]});h.setFailQueries(1);await h.runner.onModuleInit();await settle();assert.equal(h.calls.length,0);assert.equal(h.queries.length,1);h.time.tick();await settle();assert.equal(h.calls.length,1);assert.equal(h.queries.length,2);
});
