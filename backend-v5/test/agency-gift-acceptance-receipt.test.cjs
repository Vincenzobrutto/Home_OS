const {test}=require('node:test'),assert=require('node:assert/strict');
const {makeGiftAcceptanceReceipt,parseGiftAcceptanceReceipt}=require('../dist/agency-practices/gift-acceptance-receipt');
const {makeGiftBenefit}=require('../dist/agency-practices/gift-benefit');
const body=()=>({id:'receipt-demo',practiceId:'practice-demo',invitationId:'invitation-demo',jobId:'job-demo',accountId:'account-demo',requestKey:'accept-demo',commandDigest:'a'.repeat(64),sourceFingerprint:'b'.repeat(64),homeId:'home-demo',acceptedAt:'2024-02-29T12:13:14.567Z',documents:[{documentId:'document-a',sha256:'c'.repeat(64)},{documentId:'document-b',sha256:'d'.repeat(64)}],benefit:null});
const grant=(b=body())=>makeGiftBenefit({id:'benefit-demo',receiptId:b.id,accountId:b.accountId,acceptedAt:b.acceptedAt,offerId:'dimora-full-access-v1',offerVersion:1});
const invalid=fn=>assert.throws(fn,e=>e.code==='invalid_input'&&e.constructor.name==='GiftInvitationError');
const reverse=value=>Array.isArray(value)?value.map(reverse):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverse(v)])):value;

test('minimal receipt freezes accepted outcome without private source content or a benefit by default',()=>{
 const input=body(),before=structuredClone(input),receipt=makeGiftAcceptanceReceipt(input);assert.deepEqual(input,before);assert.equal(receipt.schemaVersion,1);assert.equal(receipt.benefit,null);assert.match(receipt.integrityDigest,/^[a-f0-9]{64}$/);
 const {schemaVersion,integrityDigest,...rest}=receipt;assert.equal(schemaVersion,1);assert.ok(integrityDigest);assert.deepEqual(rest,input);assert.deepEqual(parseGiftAcceptanceReceipt(receipt),receipt);
 for(const key of ['email','homeName','address','storageKey','tokenHash','permissions'])assert.equal(key in receipt,false);
});
test('annual full-access benefit is bound to receipt, account and acceptance instant',()=>{
 const b=body();b.benefit=grant(b);const r=makeGiftAcceptanceReceipt(b);assert.deepEqual(r.benefit,b.benefit);assert.equal(r.benefit.endsAt,'2025-02-28T12:13:14.567Z');assert.deepEqual(parseGiftAcceptanceReceipt(r),r);
});
test('JSONB-style key ordering at every object level leaves the checksum valid',()=>{
 const b=body();b.benefit=grant(b);const r=makeGiftAcceptanceReceipt(b),reordered=JSON.parse(JSON.stringify(reverse(r)));assert.deepEqual(parseGiftAcceptanceReceipt(reordered),r);
});
test('changing any accepted reference or document proof without updating checksum is rejected',()=>{
 const r=makeGiftAcceptanceReceipt(body());
 for(const field of ['id','practiceId','invitationId','jobId','accountId','requestKey','homeId']){const changed=structuredClone(r);changed[field]+='-other';invalid(()=>parseGiftAcceptanceReceipt(changed));}
 for(const mutate of [x=>x.commandDigest='e'.repeat(64),x=>x.sourceFingerprint='f'.repeat(64),x=>x.acceptedAt='2024-02-29T12:13:14.568Z',x=>x.documents[0].sha256='e'.repeat(64),x=>x.documents[0].documentId='other-document',x=>x.documents.reverse()]){const changed=structuredClone(r);mutate(changed);invalid(()=>parseGiftAcceptanceReceipt(changed));}
});
test('checksum must be a canonical lowercase SHA-256 and schema version is exact',()=>{
 const r=makeGiftAcceptanceReceipt(body());for(const value of ['',null,'x'.repeat(64),'a'.repeat(63),r.integrityDigest.toUpperCase(),'e'.repeat(64)])invalid(()=>parseGiftAcceptanceReceipt({...r,integrityDigest:value}));
 for(const value of [0,2,'1',null])invalid(()=>parseGiftAcceptanceReceipt({...r,schemaVersion:value}));const missing={...r};delete missing.integrityDigest;invalid(()=>parseGiftAcceptanceReceipt(missing));
});
test('unknown outer or document fields cannot smuggle personal data or authority into a receipt',()=>{
 for(const key of ['email','sourceTitle','originalFilename','homeName','address','storageKey','token','manifest','permissions','agencyName','price']){
  invalid(()=>makeGiftAcceptanceReceipt({...body(),[key]:'private-or-forged'}));const b=body();b.documents[0][key]='private-or-forged';invalid(()=>makeGiftAcceptanceReceipt(b));
 }
 invalid(()=>makeGiftAcceptanceReceipt({...body(),schemaVersion:1}));invalid(()=>makeGiftAcceptanceReceipt({...body(),integrityDigest:'e'.repeat(64)}));
 const r=makeGiftAcceptanceReceipt(body());invalid(()=>parseGiftAcceptanceReceipt({...r,email:'private@example.test'}));
});
test('all required input keys must be own plain enumerable data properties',()=>{
 for(const key of Object.keys(body())){const missing=body();delete missing[key];invalid(()=>makeGiftAcceptanceReceipt(missing));}
 for(const value of [null,[],new Date(),Object.assign(Object.create(null),body()),Object.assign(Object.create({inherited:true}),body())])invalid(()=>makeGiftAcceptanceReceipt(value));
 const symbolic=body();symbolic[Symbol('private')]='value';invalid(()=>makeGiftAcceptanceReceipt(symbolic));
 let called=false;const getter=body();Object.defineProperty(getter,'id',{enumerable:true,get(){called=true;return 'getter-id';}});invalid(()=>makeGiftAcceptanceReceipt(getter));assert.equal(called,false);
 const hidden=body();Object.defineProperty(hidden,'id',{enumerable:false,value:'receipt-demo'});invalid(()=>makeGiftAcceptanceReceipt(hidden));
});
test('identifiers and request key are bounded nonempty and exclude invisible controls',()=>{
 for(const key of ['id','practiceId','invitationId','jobId','accountId','homeId','requestKey']){
  const max=key==='requestKey'?120:100;for(const value of ['',null,42,'  ',' leading','trailing ','a'.repeat(max+1),'bad\nref','bad\u007fref','bad\u0085ref','bad\u200bref'])invalid(()=>makeGiftAcceptanceReceipt({...body(),[key]:value}));
  assert.equal(makeGiftAcceptanceReceipt({...body(),[key]:'a'.repeat(max)})[key],'a'.repeat(max));
 }
 const b=body();b.documents[0].documentId='a'.repeat(101);invalid(()=>makeGiftAcceptanceReceipt(b));
});
test('hash fields reject non-hex, uppercase, truncated and non-string values',()=>{
 for(const field of ['commandDigest','sourceFingerprint'])for(const value of ['A'.repeat(64),'z'.repeat(64),'a'.repeat(63),null,42])invalid(()=>makeGiftAcceptanceReceipt({...body(),[field]:value}));
 for(const value of ['A'.repeat(64),'bad',null,42]){const b=body();b.documents[0].sha256=value;invalid(()=>makeGiftAcceptanceReceipt(b));}
});
test('acceptance timestamp is a real canonical UTC ISO instant',()=>{
 for(const value of ['',null,new Date(),'2024-02-29','2024-02-29T12:13:14Z','2024-02-29T12:13:14.567+00:00','2024-02-29T13:13:14.567+01:00','2025-02-29T12:13:14.567Z','2024-02-30T12:13:14.567Z'])invalid(()=>makeGiftAcceptanceReceipt({...body(),acceptedAt:value}));
});
test('one to fifty distinct document IDs are required while matching hashes do not merge documents',()=>{
 invalid(()=>makeGiftAcceptanceReceipt({...body(),documents:[]}));invalid(()=>makeGiftAcceptanceReceipt({...body(),documents:Array.from({length:51},(_,i)=>({documentId:'document-'+i,sha256:'c'.repeat(64)}))}));
 const duplicate=body();duplicate.documents[1].documentId=duplicate.documents[0].documentId;invalid(()=>makeGiftAcceptanceReceipt(duplicate));
 const many={...body(),documents:Array.from({length:50},(_,i)=>({documentId:'document-'+i,sha256:'c'.repeat(64)}))};assert.equal(makeGiftAcceptanceReceipt(many).documents.length,50);
});
test('sparse or extended document arrays and accessor items are rejected without evaluating them',()=>{
 const sparse=Array(2);sparse[1]={documentId:'one',sha256:'c'.repeat(64)};invalid(()=>makeGiftAcceptanceReceipt({...body(),documents:sparse}));
 const extra=body().documents;extra.privatePath='private';invalid(()=>makeGiftAcceptanceReceipt({...body(),documents:extra}));
 let called=false;const getter=body().documents;Object.defineProperty(getter,'0',{enumerable:true,get(){called=true;return {documentId:'fake',sha256:'c'.repeat(64)};}});invalid(()=>makeGiftAcceptanceReceipt({...body(),documents:getter}));assert.equal(called,false);
});
test('benefit must have matching receipt, account and exact start plus its valid annual end',()=>{
 for(const change of [b=>b.receiptId='other-receipt',b=>b.accountId='other-account',b=>b.startsAt='2024-02-29T12:13:14.568Z',b=>b.endsAt='2028-02-29T12:13:14.567Z',b=>b.offerId='free',b=>b.offerVersion=2,b=>b.permissions=['admin']]){
  const b=body();b.benefit=grant(b);change(b.benefit);invalid(()=>makeGiftAcceptanceReceipt(b));
 }
 const b=body();b.benefit=makeGiftBenefit({id:'benefit-demo',receiptId:b.id,accountId:b.accountId,acceptedAt:'2023-01-01T00:00:00.000Z',offerId:'dimora-full-access-v1',offerVersion:1});invalid(()=>makeGiftAcceptanceReceipt(b));
});
test('only null represents no grant; boolean flags or incomplete benefit objects are invalid here',()=>{
 for(const value of [false,true,undefined,{},[],{requested:false}])invalid(()=>makeGiftAcceptanceReceipt({...body(),benefit:value}));
 assert.equal(makeGiftAcceptanceReceipt(body()).benefit,null);
});
test('historical accepted receipt remains parseable after its benefit has expired',()=>{
 const b={...body(),acceptedAt:'2020-01-01T00:00:00.000Z'};b.benefit=grant(b);const r=makeGiftAcceptanceReceipt(b);assert.equal(r.benefit.endsAt,'2021-01-01T00:00:00.000Z');assert.deepEqual(parseGiftAcceptanceReceipt(r),r);
});
test('returned documents and benefit do not retain caller-owned mutable references',()=>{
 const b=body();b.benefit=grant(b);const r=makeGiftAcceptanceReceipt(b);r.documents[0].documentId='caller-change';r.benefit.endsAt='2040-01-01T00:00:00.000Z';assert.equal(b.documents[0].documentId,'document-a');assert.equal(b.benefit.endsAt,'2025-02-28T12:13:14.567Z');
 const fresh=makeGiftAcceptanceReceipt(b),parsed=parseGiftAcceptanceReceipt(fresh);parsed.documents[0].sha256='e'.repeat(64);assert.equal(fresh.documents[0].sha256,'c'.repeat(64));
});
