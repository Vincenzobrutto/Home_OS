// Unit adapter tests only: all SQL rows, receipts and clock values are synthetic.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {GiftBenefitsStore}=require('../dist/agency-practices/gift-benefits-store');
const {makeGiftBenefit}=require('../dist/agency-practices/gift-benefit');
const {makeGiftAcceptanceReceipt}=require('../dist/agency-practices/gift-acceptance-receipt');
const account='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',now='2026-10-31T12:00:00.000Z';
function grant({suffix='a',accountId=account,startsAt='2026-01-01T00:00:00.000Z'}={}){
 const benefit=makeGiftBenefit({id:'benefit-'+suffix,receiptId:'receipt-'+suffix,accountId,acceptedAt:startsAt,offerId:'dimora-full-access-v1',offerVersion:1});
 const receipt=makeGiftAcceptanceReceipt({id:benefit.receiptId,practiceId:'practice-'+suffix,invitationId:'invitation-'+suffix,jobId:'job-'+suffix,accountId,requestKey:'key-'+suffix,commandDigest:'a'.repeat(64),sourceFingerprint:'b'.repeat(64),homeId:'home-'+suffix,acceptedAt:startsAt,documents:[{documentId:'document-'+suffix,sha256:'c'.repeat(64)}],benefit});
 return {id:benefit.id,receiptId:benefit.receiptId,accountId,offerId:benefit.offerId,offerVersion:benefit.offerVersion,startsAt:new Date(benefit.startsAt),endsAt:new Date(benefit.endsAt),receipt:{id:receipt.id,practiceId:receipt.practiceId,invitationId:receipt.invitationId,jobId:receipt.jobId,accountId,requestKey:receipt.requestKey,commandDigest:receipt.commandDigest,sourceFingerprint:receipt.sourceFingerprint,homeId:receipt.homeId,acceptedAt:new Date(receipt.acceptedAt),snapshot:receipt}};
}
function harness(rows,at=now){
 const calls=[],transactions=[];let clocks=0;
 const tx=new Proxy({accountGiftBenefit:{findMany:async query=>{calls.push(query);return rows;}}},{get(target,key){if(key!=='accountGiftBenefit')throw Error('unexpected_private_join:'+String(key));return target[key];}});
 const db={$transaction:async(work,options)=>{transactions.push(options);return work(tx);}};
 const store=new GiftBenefitsStore(db,()=>{clocks++;return new Date(at);});
 return {store,db,calls,transactions,clocks:()=>clocks};
}
const rejected=code=>e=>e.code===code&&e.constructor.name==='GiftInvitationError';
const none={fullAccess:false,scope:'all_owner_features',validUntil:null};
const reverse=value=>Array.isArray(value)?value.map(reverse):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverse(v)])):value;

test('no Gift grant returns a minimal false summary with only an account-filtered receipt query',async()=>{
 const h=harness([]);assert.deepEqual(await h.store.capabilities(account),none);assert.equal(h.clocks(),1);assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0],{where:{accountId:account},include:{receipt:true}});assert.equal(h.transactions.length,1);
});
test('malformed account identifiers are denied before clock or database access',async()=>{
 for(const id of [null,undefined,42,'','account-demo','a'.repeat(101),account+' ',' '+account,account+'\n','g0000000-0000-4000-8000-000000000001']){
  const h=harness([]);await assert.rejects(()=>h.store.capabilities(id),rejected('invalid_input'));assert.equal(h.calls.length,0);assert.equal(h.transactions.length,0);assert.equal(h.clocks(),0);
 }
});
test('accepted account grant works without Agency, original sources or HomeMembership joins',async()=>{
 const row=grant(),h=harness([row]);row.privateDiagnostic='PRIVATE-SQL-DATA';row.receipt.privateExtra='PRIVATE-RECEIPT-DATA';
 assert.deepEqual(await h.store.capabilities(account),{fullAccess:true,scope:'all_owner_features',validUntil:'2027-01-01T00:00:00.000Z'});assert.equal(h.calls.length,1);
});
test('active interval includes start and excludes end using only the injected server clock',async()=>{
 const row=grant();assert.equal((await harness([row],'2025-12-31T23:59:59.999Z').store.capabilities(account)).fullAccess,false);
 assert.equal((await harness([row],'2026-01-01T00:00:00.000Z').store.capabilities(account)).fullAccess,true);
 assert.equal((await harness([row],'2026-12-31T23:59:59.999Z').store.capabilities(account)).fullAccess,true);
 assert.deepEqual(await harness([row],'2027-01-01T00:00:00.000Z').store.capabilities(account),none);
});
test('expired and future grants alone are not active Gift coverage',async()=>{
 const rows=[grant({suffix:'old',startsAt:'2024-01-01T00:00:00.000Z'}),grant({suffix:'future',startsAt:'2027-01-01T00:00:00.000Z'})];assert.deepEqual(await harness(rows).store.capabilities(account),none);
});
test('overlapping active grants select their maximum end without stacking or counting future coverage',async()=>{
 const rows=[grant({suffix:'first'}),grant({suffix:'later',startsAt:'2026-07-01T00:00:00.000Z'}),grant({suffix:'future',startsAt:'2026-11-01T00:00:00.000Z'}),grant({suffix:'old',startsAt:'2024-01-01T00:00:00.000Z'})];
 assert.deepEqual(await harness(rows).store.capabilities(account),{fullAccess:true,scope:'all_owner_features',validUntil:'2027-07-01T00:00:00.000Z'});
});
test('foreign rows returned by a faulty adapter are rejected before parsing their receipt',async()=>{
 const row=grant({accountId:other});let touched=false;Object.defineProperty(row,'receipt',{get(){touched=true;throw Error('PRIVATE-FOREIGN-RECEIPT');}});
 const h=harness([row]);await assert.rejects(()=>h.store.capabilities(account),rejected('unavailable'));assert.equal(touched,false);assert.deepEqual(h.calls[0].where,{accountId:account});
});
test('a linked receipt for another account is refused before its snapshot is accessed',async()=>{
 const row=grant();row.receipt.accountId=other;let touched=false;Object.defineProperty(row.receipt,'snapshot',{get(){touched=true;throw Error('PRIVATE-FOREIGN-SNAPSHOT');}});
 await assert.rejects(()=>harness([row]).store.capabilities(account),rejected('invalid_input'));assert.equal(touched,false);
});
test('benefit SQL columns must match the fixed offer, anniversary and accepted snapshot binding',async()=>{
 for(const corrupt of [r=>r.id='other-benefit',r=>r.receiptId='other-receipt',r=>r.offerId='unknown-offer',r=>r.offerVersion=2,r=>r.startsAt=new Date('2026-01-02T00:00:00.000Z'),r=>r.endsAt=new Date('2027-01-02T00:00:00.000Z')]){
  const row=grant();corrupt(row);await assert.rejects(()=>harness([row]).store.capabilities(account),rejected('invalid_input'));
 }
});
test('every mirrored receipt SQL field must equal the parsed accepted snapshot',async()=>{
 for(const field of ['id','practiceId','invitationId','jobId','requestKey','commandDigest','sourceFingerprint','homeId']){
  const row=grant();row.receipt[field]+='-changed';await assert.rejects(()=>harness([row]).store.capabilities(account),rejected('invalid_input'));
 }
 const row=grant();row.receipt.acceptedAt=new Date('2026-01-02T00:00:00.000Z');await assert.rejects(()=>harness([row]).store.capabilities(account),rejected('invalid_input'));
});
test('corrupt receipt checksum, missing benefit or unknown snapshot fields cannot grant access',async()=>{
 for(const corrupt of [r=>r.receipt.snapshot.integrityDigest='e'.repeat(64),r=>r.receipt.snapshot.email='PRIVATE-EMAIL',r=>r.receipt.snapshot.benefit.accountId=other,r=>r.receipt=null]){
  const row=grant();corrupt(row);await assert.rejects(()=>harness([row]).store.capabilities(account),rejected('invalid_input'));
 }
 const row=grant(),{schemaVersion,integrityDigest,...body}=row.receipt.snapshot;assert.equal(schemaVersion,1);assert.ok(integrityDigest);row.receipt.snapshot=makeGiftAcceptanceReceipt({...body,benefit:null});await assert.rejects(()=>harness([row]).store.capabilities(account),rejected('invalid_input'));
});
test('an owned expired or future malformed row fails closed even when another valid grant is active',async()=>{
 for(const startsAt of ['2024-01-01T00:00:00.000Z','2027-01-01T00:00:00.000Z']){
  const bad=grant({suffix:'bad',startsAt});bad.receipt.snapshot.integrityDigest='e'.repeat(64);await assert.rejects(()=>harness([grant(),bad]).store.capabilities(account),rejected('invalid_input'));
 }
});
test('all owned rows are considered without a hidden 100-row truncation',async()=>{
 const rows=Array.from({length:100},(_,i)=>grant({suffix:'old-'+i,startsAt:'2024-01-01T00:00:00.000Z'}));rows.push(grant({suffix:'last-active',startsAt:'2026-10-01T00:00:00.000Z'}));const h=harness(rows);
 assert.deepEqual(await h.store.capabilities(account),{fullAccess:true,scope:'all_owner_features',validUntil:'2027-10-01T00:00:00.000Z'});assert.equal(h.calls[0].take,undefined);assert.deepEqual(h.calls[0].where,{accountId:account});
});
test('duplicate benefit or receipt rows are rejected rather than treated as extra entitlement',async()=>{
 const first=grant(),duplicateId=grant({suffix:'second'});duplicateId.id=first.id;
 await assert.rejects(()=>harness([first,duplicateId]).store.capabilities(account),rejected('invalid_input'));
 await assert.rejects(()=>harness([first,structuredClone(first)]).store.capabilities(account),rejected('invalid_input'));
});
test('SQL dates and clock values must be finite Dates rather than caller-provided strings',async()=>{
 for(const field of ['startsAt','endsAt'])for(const value of [new Date('invalid'),'2027-01-01T00:00:00.000Z',null]){
  const row=grant();row[field]=value;await assert.rejects(()=>harness([row]).store.capabilities(account),rejected('invalid_input'));
 }
 const row=grant();row.receipt.acceptedAt=new Date('invalid');await assert.rejects(()=>harness([row]).store.capabilities(account),rejected('invalid_input'));
 const h=harness([],'invalid');await assert.rejects(()=>h.store.capabilities(account),rejected('invalid_input'));assert.equal(h.calls.length,0);
});
test('JSONB key order remains valid while response contains no receipt or document details',async()=>{
 const row=grant();row.receipt.snapshot=reverse(row.receipt.snapshot);const response=await harness([row]).store.capabilities(account);
 assert.deepEqual(response,{fullAccess:true,scope:'all_owner_features',validUntil:'2027-01-01T00:00:00.000Z'});assert.doesNotMatch(JSON.stringify(response),/receipt|document|practice|token|accountId|email/);
});
test('database failures are unavailable rather than a false grant or private diagnostic response',async()=>{
 const h=harness([]);h.db.$transaction=async()=>{throw Error('PRIVATE-DATABASE-PATH');};await assert.rejects(()=>h.store.capabilities(account),e=>rejected('unavailable')(e)&&!e.message.includes('PRIVATE-DATABASE-PATH'));
});
