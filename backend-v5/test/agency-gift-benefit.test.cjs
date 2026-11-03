const {test}=require('node:test'),assert=require('node:assert/strict');
const {makeGiftBenefit,activeGiftBenefit}=require('../dist/agency-practices/gift-benefit');
const input=(acceptedAt='2026-10-31T20:15:16.789Z')=>({id:'benefit-demo',receiptId:'receipt-demo',accountId:'account-demo',acceptedAt,offerId:'dimora-full-access-v1',offerVersion:1});
const invalid=fn=>assert.throws(fn,e=>e.code==='invalid_input');

test('benefit freezes full-access v1, account and receipt for twelve calendar months from acceptance',()=>{
 const body=input(),before=structuredClone(body),benefit=makeGiftBenefit(body);
 assert.deepEqual(benefit,{schemaVersion:1,id:'benefit-demo',receiptId:'receipt-demo',accountId:'account-demo',offerId:'dimora-full-access-v1',offerVersion:1,startsAt:'2026-10-31T20:15:16.789Z',endsAt:'2027-10-31T20:15:16.789Z'});assert.deepEqual(body,before);
 assert.equal('price'in benefit,false);assert.equal('permissions'in benefit,false);assert.equal('consent'in benefit,false);
});
test('February 29 clamps to February 28 next year and retains exact UTC clock',()=>{
 for(const accepted of ['2024-02-29T00:00:00.000Z','2024-02-29T23:59:59.999Z','2000-02-29T10:20:30.456Z']){
  const benefit=makeGiftBenefit(input(accepted));assert.equal(benefit.endsAt,accepted.replace(accepted.slice(0,10),accepted.startsWith('2000')?'2001-02-28':'2025-02-28'));
 }
});
test('a non-leap February 28 is retained even when next year has February 29',()=>{
 assert.equal(makeGiftBenefit(input('2023-02-28T11:12:13.014Z')).endsAt,'2024-02-28T11:12:13.014Z');
});
test('calendar year is not a fixed 365-day duration and Gregorian century rules are preserved',()=>{
 const leap=makeGiftBenefit(input('1999-03-01T09:00:00.000Z')),nonLeap=makeGiftBenefit(input('2099-03-01T09:00:00.000Z'));
 assert.equal(leap.endsAt,'2000-03-01T09:00:00.000Z');assert.equal((Date.parse(leap.endsAt)-Date.parse(leap.startsAt))/86400000,366);
 assert.equal(nonLeap.endsAt,'2100-03-01T09:00:00.000Z');assert.equal((Date.parse(nonLeap.endsAt)-Date.parse(nonLeap.startsAt))/86400000,365);
});
test('years below 100 are not remapped to the twentieth century',()=>{
 assert.equal(makeGiftBenefit(input('0099-12-31T23:59:59.123Z')).endsAt,'0100-12-31T23:59:59.123Z');
});
test('active interval includes the exact start and excludes the exact end',()=>{
 const benefit=makeGiftBenefit(input());assert.equal(activeGiftBenefit(benefit,'2026-10-31T20:15:16.788Z'),false);assert.equal(activeGiftBenefit(benefit,benefit.startsAt),true);
 assert.equal(activeGiftBenefit(benefit,'2027-10-31T20:15:16.788Z'),true);assert.equal(activeGiftBenefit(benefit,benefit.endsAt),false);assert.equal(activeGiftBenefit(benefit,'2027-11-01T00:00:00.000Z'),false);
});
test('clamped leap-year benefit has the same exclusive expiry boundary',()=>{
 const benefit=makeGiftBenefit(input('2024-02-29T23:59:59.999Z'));assert.equal(activeGiftBenefit(benefit,'2025-02-28T23:59:59.998Z'),true);assert.equal(activeGiftBenefit(benefit,'2025-02-28T23:59:59.999Z'),false);
});
test('input accepts only exact plain data fields with no authority or pricing injection',()=>{
 for(const extra of ['schemaVersion','startsAt','endsAt','price','admin','permissions','consent','freePlan','activated'])invalid(()=>makeGiftBenefit({...input(),[extra]:true}));
 for(const body of [null,[],new Date(),Object.assign(Object.create(null),input()),Object.assign(Object.create({inherited:true}),input())])invalid(()=>makeGiftBenefit(body));
 const missing=input();delete missing.receiptId;invalid(()=>makeGiftBenefit(missing));const symbolic=input();symbolic[Symbol('extra')]=true;invalid(()=>makeGiftBenefit(symbolic));
});
test('accessors and non-enumerable input fields are rejected without evaluating getters',()=>{
 let invoked=false;const accessor=input();Object.defineProperty(accessor,'id',{enumerable:true,get(){invoked=true;return 'forged';}});invalid(()=>makeGiftBenefit(accessor));assert.equal(invoked,false);
 const hidden=input();Object.defineProperty(hidden,'id',{enumerable:false,value:'benefit-demo'});invalid(()=>makeGiftBenefit(hidden));
});
test('IDs are bounded nonempty references and reject whitespace or control characters',()=>{
 for(const field of ['id','receiptId','accountId']){
  for(const value of ['',null,42,'  ',' leading','trailing ','a'.repeat(101),'hidden\nvalue','hidden\u007fvalue','hidden\u0085value','hidden\u200bvalue'])invalid(()=>makeGiftBenefit({...input(),[field]:value}));
  assert.equal(makeGiftBenefit({...input(),[field]:'a'.repeat(100)})[field],'a'.repeat(100));
 }
});
test('acceptance time must be a real canonical UTC ISO instant',()=>{
 for(const acceptedAt of ['',null,new Date(),'2026-10-31','2026-10-31T20:15:16Z','2026-10-31T20:15:16.789+00:00','2026-10-31T21:15:16.789+01:00','2025-02-29T00:00:00.000Z','2026-02-30T00:00:00.000Z','2026-04-31T00:00:00.000Z','2026-10-31T20:15:16.7890Z','not-a-date'])invalid(()=>makeGiftBenefit({...input(),acceptedAt}));
});
test('only the full-access v1 offer is admitted',()=>{
 for(const offerId of [undefined,null,'free','dimora-full-access-v2'])invalid(()=>makeGiftBenefit({...input(),offerId}));
 for(const offerVersion of [undefined,null,0,2,'1',NaN])invalid(()=>makeGiftBenefit({...input(),offerVersion}));
});
test('an overflowing anniversary is rejected with a domain error rather than RangeError',()=>{
 invalid(()=>makeGiftBenefit(input(new Date(8640000000000000).toISOString())));
});
test('active check validates every stored field and the exact anniversary rather than trusting a forged end',()=>{
 const benefit=makeGiftBenefit(input());
 for(const corrupt of [b=>b.endsAt='2030-10-31T20:15:16.789Z',b=>b.endsAt='2027-10-31T20:15:16.790Z',b=>b.startsAt='2026-10-30T20:15:16.789Z',b=>b.schemaVersion=2,b=>b.offerId='free',b=>b.offerVersion=2,b=>b.accountId='',b=>b.receiptId='bad\nref',b=>b.price=0,b=>delete b.id]){
  const changed=structuredClone(benefit);corrupt(changed);invalid(()=>activeGiftBenefit(changed,benefit.startsAt));
 }
 for(const now of ['',null,new Date(),'2026-11-01T00:00:00Z','2026-11-01T00:00:00.000+00:00'])invalid(()=>activeGiftBenefit(benefit,now));
});
