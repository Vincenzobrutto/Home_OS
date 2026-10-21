require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {ObjectOnboardingService}=require('../dist/object-onboarding/onboarding.service');
const {ExpensesService}=require('../dist/expenses/expenses.service');
const {EconomyPolicy}=require('../dist/economy/policy');

test('deposit and balance use separate documents and stable expense keys on the same installation; same source stays blocked',async()=>{
 const a=randomUUID(),h=randomUUID(),ref={kind:'object',id:randomUUID()},calls=[];
 let sameSource=false;
 const tx={$queryRaw:async()=>sameSource?[{id:'already-saved'}]:[],homeExpense:{findMany:async()=>[],update:async q=>({id:q.where.id,...q.data})},expenseHistory:{updateMany:async()=>{}},expenseRequest:{updateMany:async()=>{}}};
 const original=ExpensesService.prototype.mutateInTransaction,saved=EconomyPolicy.prototype.saved;
 ExpensesService.prototype.mutateInTransaction=async(_tx,account,home,op,_id,values,key,atomic)=>{assert.equal(account,a);assert.equal(home,h);assert.equal(op,'create');assert.equal(atomic,true);calls.push({values,key});return {expense:{id:randomUUID()}};};
 EconomyPolicy.prototype.saved=async(_tx,row)=>row;
 try{
  const service=new ObjectOnboardingService({}, {}, {}, {now:()=>new Date()});
  for(const [prefix,amount] of [['Acconto',50000],['Saldo',153720]]){
   const draft={id:randomUUID(),documentId:randomUUID(),documentSha256:randomUUID()},item={id:'cost',amountCandidates:[],proposedFields:{}};
   const selected={confirmation:{mode:'create',amountSelection:{mode:'manual'},values:{title:prefix+' · Impianto sintetico',amountCents:amount,spentOn:'2026-07-08',category:'repairs_works',objectRef:ref}}};
   assert.equal((await service.houseCost(tx,a,h,draft,item,selected)).newExpenses,1);
   sameSource=true;await assert.rejects(service.houseCost(tx,a,h,draft,item,selected),e=>e.getResponse().code==='onboarding_expense_exists');sameSource=false;
  }
  assert.equal(calls.length,2);assert.deepEqual(calls.map(c=>c.values.objectRef),[ref,ref]);assert.notEqual(calls[0].values.documentId,calls[1].values.documentId);assert.notEqual(calls[0].key,calls[1].key);assert.deepEqual(calls.map(c=>c.values.amountCents),[50000,153720]);
 }finally{ExpensesService.prototype.mutateInTransaction=original;EconomyPolicy.prototype.saved=saved;}
});

test('expense preparation checks account/home and refuses inaccessible or archived installation references',async()=>{
 const a=randomUUID(),h=randomUUID(),ref={kind:'object',id:randomUUID()},policy=new EconomyPolicy({});let state='active',readable=true,exists=true;
 const tx={homeObject:{findFirst:async q=>{assert.deepEqual(q.where,{id:ref.id,accountId:a,homeId:h});return exists?{id:ref.id,name:'Sintetico',state}:null;}},$queryRaw:async()=>readable?[{id:ref.id}]:[]};
 await policy.prepare(tx,a,h,{objectRef:ref},null);
 readable=false;await assert.rejects(policy.prepare(tx,a,h,{objectRef:ref},null));readable=true;
 state='archived';await assert.rejects(policy.prepare(tx,a,h,{objectRef:ref},null),e=>e.getResponse().code==='resource_state_conflict');state='active';exists=false;await assert.rejects(policy.prepare(tx,a,h,{objectRef:ref},null));
});
