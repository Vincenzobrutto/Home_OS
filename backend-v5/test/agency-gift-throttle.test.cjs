// Unit SQL fixtures only: no connection, HTTP server or real identity is used.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {HttpException}=require('@nestjs/common');
const {GiftThrottle}=require('../dist/agency-practices/gift-throttle');
const {GiftInvitationError}=require('../dist/agency-practices/gift-invitations');
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0'),W=900000,start=Date.parse('2026-11-01T10:00:00.000Z');
const rate=error=>error instanceof HttpException&&error.getStatus()===429&&error.getResponse().code==='rate_limited';
const unavailable=error=>error instanceof HttpException&&error.getStatus()===503&&error.getResponse().code==='service_unavailable'&&!JSON.stringify(error.getResponse()).includes('PRIVATE');
const invalid=error=>error instanceof GiftInvitationError&&error.code==='invalid_input';
function fixture(){
 let now=start,serial=Promise.resolve(),fail=null,response=null,cleanupFail=false,commits=0,rollbacks=0;
 const rows=new Map(),calls=[],cleanup=[];
 const db={$transaction:async(work,config)=>{
  let release;const prior=serial;serial=new Promise(resolve=>release=resolve);await prior;
  const draft=structuredClone(rows),tx={
   $queryRaw:async(strings,...values)=>{
    calls.push({sql:strings.join('?'),values,config});if(fail)throw fail;if(response!==null)return response;
    const [key,expiresAt,max,maximum]=values;const previous=draft.get(key),count=previous?previous.count>=max?maximum:previous.count+1:1;
    draft.set(key,{count,expiresAt:previous?.expiresAt??expiresAt});return [{count}];
   },
   authThrottle:{deleteMany:async query=>{
    cleanup.push(query);if(cleanupFail)throw Error('PRIVATE cleanup failure');let count=0;
    for(const [key,row] of draft)if(key.startsWith(query.where.key.startsWith)&&row.expiresAt<=query.where.expiresAt.lte){draft.delete(key);count++;}return {count};
   }}
  };
  try{const result=await work(tx);rows.clear();for(const [key,row] of draft)rows.set(key,row);commits++;return result;}catch(error){rollbacks++;throw error;}finally{release();}
 }};
 const throttle=new GiftThrottle(db,()=>new Date(now));return {throttle,rows,calls,cleanup,db,at:value=>now=value,fail:error=>fail=error,response:value=>response=value,cleanupFail:()=>cleanupFail=true,commits:()=>commits,rollbacks:()=>rollbacks};
}

test('landing allows exactly60 per IP and denied attempts commit saturated counters outside the transaction',async()=>{
 const f=fixture();for(let n=0;n<60;n++)await f.throttle.check('landing',{ip:'192.0.2.1'});await assert.rejects(()=>f.throttle.check('landing',{ip:'192.0.2.1'}),rate);await assert.rejects(()=>f.throttle.check('landing',{ip:'192.0.2.1'}),rate);assert.equal(f.commits(),62);assert.equal(f.rollbacks(),0);assert.equal(f.rows.size,1);assert.equal([...f.rows.values()][0].count,61);
});
test('fixed window counts the instant before the boundary separately from at and after it',async()=>{
 const f=fixture(),boundary=Math.floor(start/W)*W+W;f.at(boundary-1);for(let n=0;n<60;n++)await f.throttle.check('landing',{ip:'192.0.2.2'});const previous=f.calls.at(-1).values[0];await assert.rejects(()=>f.throttle.check('landing',{ip:'192.0.2.2'}),rate);
 f.at(boundary);await f.throttle.check('landing',{ip:'192.0.2.2'});const fresh=f.calls.at(-1).values[0];assert.notEqual(fresh,previous);f.at(boundary+1);await f.throttle.check('landing',{ip:'192.0.2.2'});assert.equal(f.calls.at(-1).values[0],fresh);assert.equal(f.rows.get(fresh).count,2);assert.equal(f.rows.has(previous),false);
});
test('mutation IP limit is240 without an account; independent IPs and scopes retain independent buckets',async()=>{
 const f=fixture();for(let n=0;n<240;n++)await f.throttle.check('mutation',{ip:'192.0.2.3'});await assert.rejects(()=>f.throttle.check('mutation',{ip:'192.0.2.3'}),rate);await f.throttle.check('mutation',{ip:'192.0.2.4'});await f.throttle.check('read',{ip:'192.0.2.3'});await f.throttle.check('landing',{ip:'192.0.2.3'});assert.equal(f.rows.size,4);
});
test('mutation account limit120 aggregates different IPs and blocked attempts still update both counters',async()=>{
 const f=fixture();for(let n=0;n<120;n++)await f.throttle.check('mutation',{ip:'192.0.2.5',accountId:id(1)});await assert.rejects(()=>f.throttle.check('mutation',{ip:'192.0.2.6',accountId:id(1)}),rate);assert.equal(f.rows.size,3);assert.deepEqual([...f.rows.values()].map(row=>row.count).sort((a,b)=>a-b),[1,120,121]);assert.equal(f.commits(),121);assert.equal(f.rollbacks(),0);
});
test('read account limit600 supports legitimate polling while independent accounts do not share account counters',async()=>{
 const f=fixture();for(let n=0;n<600;n++)await f.throttle.check('read',{ip:'192.0.2.7',accountId:id(2)});await assert.rejects(()=>f.throttle.check('read',{ip:'192.0.2.7',accountId:id(2)}),rate);await f.throttle.check('read',{ip:'192.0.2.7',accountId:id(3)});assert.equal(f.rows.size,3);assert.deepEqual([...f.rows.values()].map(row=>row.count).sort((a,b)=>a-b),[1,601,602]);
});
test('read IP limit1200 also bounds a guest without an account',async()=>{
 const f=fixture();for(let n=0;n<1200;n++)await f.throttle.check('read',{ip:'192.0.2.8'});await assert.rejects(()=>f.throttle.check('read',{ip:'192.0.2.8'}),rate);assert.equal([...f.rows.values()][0].count,1201);
});
test('keys are opaque pseudonymous Gift namespace values and SQL never receives raw identity',async()=>{
 const f=fixture(),ip='2001:db8::cafe',accountId=id(4);await f.throttle.check('mutation',{ip,accountId});assert.equal(f.calls.length,2);
 for(const call of f.calls){const [key,expiry]=call.values;assert.match(key,/^gift:v1:[a-f0-9]{64}$/);assert(!JSON.stringify(call).includes(ip));assert(!JSON.stringify(call).includes(accountId));assert(expiry instanceof Date);assert(expiry>new Date(start)&&expiry<=new Date(start+W));assert.match(call.sql,/ON CONFLICT \(key\) DO UPDATE/);assert.match(call.sql,/CASE WHEN/);assert.match(call.sql,/RETURNING count/);assert.equal(call.config.timeout,15000);}
 assert.notEqual(f.calls[0].values[0],f.calls[1].values[0]);
});
test('normalized IPv6 and IPv4-mapped addresses cannot evade an existing IP bucket',async()=>{
 const f=fixture();await f.throttle.check('landing',{ip:'2001:db8::1'});await f.throttle.check('landing',{ip:'2001:0DB8:0:0:0:0:0:1'});assert.equal(f.rows.size,1);await f.throttle.check('landing',{ip:'192.0.2.9'});await f.throttle.check('landing',{ip:'::ffff:192.0.2.9'});await f.throttle.check('landing',{ip:'::ffff:c000:209'});assert.equal(f.rows.size,2);assert.deepEqual([...f.rows.values()].map(row=>row.count),[2,3]);
});
test('UUID case is normalized while landing uses only its documented IP limit',async()=>{
 const f=fixture(),account='abcdef00-0000-0000-0000-000000000001';await f.throttle.check('mutation',{ip:'192.0.2.10',accountId:account});await f.throttle.check('mutation',{ip:'192.0.2.10',accountId:account.toUpperCase()});assert.equal(f.rows.size,2);await f.throttle.check('landing',{ip:'192.0.2.10',accountId:account});assert.equal(f.rows.size,3);
});
test('invalid scope, unknown identity and bounded malformed data are refused before SQL or clock work',async()=>{
 const f=fixture(),bad=[null,[],{},Object.assign(Object.create(null),{ip:'192.0.2.11'}),{ip:'host.example.test'},{ip:'192.0.2.11\n'},{ip:'192.0.2.11,198.51.100.1'},{ip:'x'.repeat(1000)},{ip:'192.0.2.11',accountId:'no'},{ip:'192.0.2.11',accountId:null},{ip:'192.0.2.11',token:'PRIVATE'},{ip:'192.0.2.11',email:'PRIVATE'},{ip:'192.0.2.11',invitationId:id(9)}];
 const accessor={};Object.defineProperty(accessor,'ip',{enumerable:true,get(){throw Error('Must not execute');}});bad.push(accessor,{ip:'192.0.2.11',[Symbol('private')]:'secret'});
 for(const identity of bad)await assert.rejects(()=>f.throttle.check('landing',identity),invalid);for(const scope of ['other','__proto__','landing\n',{},null])await assert.rejects(()=>f.throttle.check(scope,{ip:'192.0.2.11'}),invalid);assert.equal(f.calls.length,0);assert.equal(f.commits(),0);
});
test('atomic upsert fixtures admit exactly the configured count under concurrent checks, not read-then-write',async()=>{
 const f=fixture(),outcomes=await Promise.allSettled(Array.from({length:250},()=>f.throttle.check('mutation',{ip:'192.0.2.12'})));assert.equal(outcomes.filter(row=>row.status==='fulfilled').length,240);assert.equal(outcomes.filter(row=>row.status==='rejected'&&rate(row.reason)).length,10);assert.equal(f.commits(),250);assert.equal(f.rollbacks(),0);assert.equal([...f.rows.values()][0].count,241);
});
test('saturation before addition prevents integer overflow from an already maximal SQL count',async()=>{
 const f=fixture();await f.throttle.check('landing',{ip:'192.0.2.13'});const row=[...f.rows.values()][0];row.count=2147483647;await assert.rejects(()=>f.throttle.check('landing',{ip:'192.0.2.13'}),rate);assert.equal([...f.rows.values()][0].count,61);
});
test('cleanup is Gift-only and expired-only, preserving recovery counters and current windows',async()=>{
 const f=fixture();f.rows.set('recovery-private-hash',{count:5,expiresAt:new Date(start-86400000)});f.rows.set('gift:v1:'+'a'.repeat(64),{count:5,expiresAt:new Date(start-86400001)});f.rows.set('gift:v1:'+'b'.repeat(64),{count:5,expiresAt:new Date(start+1000)});await f.throttle.check('landing',{ip:'192.0.2.14'});assert(f.rows.has('recovery-private-hash'));assert(!f.rows.has('gift:v1:'+'a'.repeat(64)));assert(f.rows.has('gift:v1:'+'b'.repeat(64)));assert.deepEqual(f.cleanup[0],{where:{key:{startsWith:'gift:v1:'},expiresAt:{lte:new Date(start)}}});
});
test('SQL and cleanup failures fail closed with generic503 and no partially committed counters',async()=>{
 for(const cleanup of [false,true]){const f=fixture();if(cleanup)f.cleanupFail();else f.fail(Error('PRIVATE SQL connection details'));await assert.rejects(()=>f.throttle.check('mutation',{ip:'192.0.2.15',accountId:id(6)}),unavailable);assert.equal(f.rows.size,0);assert.equal(f.commits(),0);assert.equal(f.rollbacks(),1);}
});
test('malformed SQL counts and unknown clock failure cannot silently allow a request',async()=>{
 for(const value of [[],[{count:0}],[{count:-1}],[{count:1.5}],[{count:'1'}],[{count:62}],[{count:1},{count:1}],{}]){const f=fixture();f.response(value);await assert.rejects(()=>f.throttle.check('landing',{ip:'192.0.2.16'}),unavailable);assert.equal(f.commits(),0);}
 for(const clock of [()=>new Date(NaN),()=>{throw Error('PRIVATE clock failure');},()=>null,()=>new Date(8640000000000000)]){let calls=0;const throttle=new GiftThrottle({$transaction:async()=>{calls++;}},clock);await assert.rejects(()=>throttle.check('read',{ip:'192.0.2.16'}),unavailable);assert.equal(calls,0);}
});
