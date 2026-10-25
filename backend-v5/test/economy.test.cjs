const {test}=require('node:test');const assert=require('node:assert/strict');const d=require('../dist/economy/domain');
const today='2026-10-14',base={title:'Gas',amountCents:8000,spentOn:'2026-09-30'};
test('S1: family is derived, single-valued; work archive does not reclassify',()=>{
  for(const c of d.categories)assert(d.families.includes(d.family(c,null)));
  assert.equal(d.family('repairs_works',null),'maintenance_repairs');assert.equal(d.family('repairs_works','archived-work'),'works_purchases');
  assert.equal(d.family('insurance',null),'taxes_insurance');assert.equal(d.family('financing',null),'financing');assert.equal(d.family(null,null),'unclassified');assert.equal(d.family('other',null),'unclassified');
});
test('S1: minimal manual input and boundary validation; no trusted family/payment/provider',()=>{
  const row=d.expenseValues(base,today);assert.equal(row.category,null);assert.equal(row.supplier,null);assert.equal(row.amountCents,8000);
  for(const extra of [{family:'utilities'},{amountOrigin:'extraction_confirmed'},{state:'paid'},{currency:'USD'},{accountId:'another'},{provider:'anthropic'},{objectRef:{kind:'asset',id:'invalid'}},{category:''}])assert.throws(()=>d.expenseValues({...base,...extra},today));
  assert.throws(()=>d.expenseValues({...base,amountCents:0},today));assert.throws(()=>d.expenseValues({...base,amountCents:0.1},today));assert.throws(()=>d.expenseValues({...base,spentOn:'2026-10-15'},today));
});
test('S1: optional metadata and update competence merged against existing values',()=>{
  assert.equal(d.expenseValues({...base,supplier:'  caffe\u0301  '},today).supplier,'caffé');assert.throws(()=>d.expenseValues({...base,competenceFrom:'2026-01-01'},today));
  const changes=d.expenseValues({expectedVersion:1,competenceTo:'2026-09-30'},today,true);d.competence({competenceFrom:'2026-09-01',...changes});assert.throws(()=>d.competence({competenceFrom:'2026-10-01',...changes}));assert.throws(()=>d.expenseValues({expectedVersion:1},today,true));
});
test('S1: filter combinations, nullable category, literal search and period clipping',()=>{
  assert.equal(d.economyQuery({},today).to,today);assert.equal(d.economyQuery({year:'2025'},today).to,'2025-12-31');assert.equal(d.economyQuery({family:'unclassified'},today).family,'unclassified');
  for(const q of [{year:['2026']},{from:'2026-01-01'},{year:'2026',from:'2026-01-01',to:today},{category:'gas',family:'financing'},{objectKind:'object'},{limit:'51'},{source:'paid'},{state:'active'}]){if(q.state)assert.throws(()=>d.economyQuery(q,today,true));else assert.throws(()=>d.economyQuery(q,today));}
  assert.equal(d.economyQuery({category:'repairs_works',family:'works_purchases',q:'  10%_  '},today).q,'10%_');assert.equal(d.economyQuery({category:'unclassified',family:'unclassified'},today).category,'unclassified');
});
test('S1: calendar comparison, earliest year, leap-day clamping and exact percentages',()=>{
  assert.equal(d.comparisonPeriod('0001-01-01','0001-12-31'),null);assert.deepEqual(d.comparisonPeriod('2024-02-29','2024-03-01'),{from:'2023-02-28',to:'2023-03-01',calendarAdjustment:'leap_day_clamped'});
  assert.equal(d.percent(600n,7400n),'811');assert.equal(d.percent(-1n,20000n),'-1');assert.equal(d.percent(1n,0n),null);assert.equal(d.percent(90071992547409930n,10n),'90071992547409930000');
});

test('invoice month is optional and separate from service competence',()=>{
 const input={title:'Bolletta sintetica',amountCents:3670,spentOn:'2026-09-16',category:'internet_services',invoiceMonth:'2026-09',competenceFrom:'2026-08-01',competenceTo:'2026-08-31'};
 const value=d.expenseValues(input,'2026-10-25');assert.equal(value.invoiceMonth,'2026-09');assert.equal(value.competenceFrom,'2026-08-01');
 const legacy={...input};delete legacy.invoiceMonth;assert(!Object.hasOwn(d.expenseValues(legacy,'2026-10-25'),'invoiceMonth'));
 for(const invoiceMonth of ['2026-13','2026-00','0000-09','26-09','2026-9','2026-09-01',202609,{}])assert.throws(()=>d.expenseValues({...input,invoiceMonth},'2026-10-25'));
 assert.equal(d.expenseValues({expectedVersion:1,invoiceMonth:null},'2026-10-25',true).invoiceMonth,null);
 assert.throws(()=>d.expenseValues({...input,competenceTo:null},'2026-10-25'));
});
