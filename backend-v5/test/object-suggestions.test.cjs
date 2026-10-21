require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {ForbiddenException}=require('@nestjs/common');
const {invoiceObjectSuggestions,onboardingObjectSuggestions,suggestionContext,relatedExpense}=require('../dist/object-onboarding/object-suggestions');
const {EconomyPolicy}=require('../dist/economy/policy');
const {automaticPlan,AutomaticReviewNeeded}=require('../dist/object-onboarding/automatic-plan');
const cost=(title='Acconto adeguamento quadro elettrico',supplier='Tecnico fittizio')=>({id:'cost',documentKind:'simple_invoice',proposedFields:{title:{value:title,sources:[]},supplier:{value:supplier,sources:[]}},amountCandidates:[]});
const output=item=>({items:[],houseExpenses:[item],documentKind:'purchase_document',needsReview:false,purchaseTotal:null});
test('category is proposed only when all readable matching costs agree and the scan is complete',async()=>{
 const id=randomUUID(),original=EconomyPolicy.prototype.subject;EconomyPolicy.prototype.subject=async()=>({name:'Quadro elettrico',state:'active'});
 try{for(const [categories,wanted] of [[['repairs_works','repairs_works'],'repairs_works'],[['repairs_works','maintenance'],undefined],[Array(50).fill('repairs_works'),undefined]]){
  let calls=0;const tx={$queryRaw:async()=>++calls===1?[]:categories.map(category=>({objectId:id,assetId:null,title:'Saldo quadro elettrico',supplier:'Tecnico fittizio',category}))};
  const result=await invoiceObjectSuggestions(tx,'account','home',output(cost()),cost(),{});assert.equal(result.items[0].category,wanted);
 }}finally{EconomyPolicy.prototype.subject=original;}
});

test('same supplier needs two distinctive shared terms, independently of installment amount/date',()=>{
 const c=suggestionContext(output(cost()),cost());assert(relatedExpense(c,{title:'Saldo · adeguamento quadro elettrico',supplier:' TECNICO   FITTIZIO '}));
 for(const prior of [{title:'Riparazione scarico cucina',supplier:'Tecnico fittizio'},{title:'Acconto lavori impianto manutenzione',supplier:'Tecnico fittizio'},{title:'Saldo quadro elettrico',supplier:'Altro fornitore'},{title:'Elettrico',supplier:'Tecnico fittizio'}])assert.equal(relatedExpense(c,prior),false);
});
test('rule applies to another object and ignores generic installment words',()=>{
 const item=cost('Acconto riparazione frigorifero compressore','Officina demo'),c=suggestionContext(output(item),item);
 assert(relatedExpense(c,{title:'Saldo riparazione frigorifero compressore',supplier:'Officina demo'}));
 assert(!relatedExpense(c,{title:'Acconto lavori di manutenzione',supplier:'Officina demo'}));
 assert(!relatedExpense({...c,supplier:''},{title:'Frigorifero compressore',supplier:''}));
});
test('suggestions are scoped reads, deduplicate references and omit inaccessible/archived objects',async()=>{
 const a=randomUUID(),h=randomUUID(),id=randomUUID(),hidden=randomUUID(),archived=randomUUID();let calls=0;
 const tx={$queryRaw:async sql=>{assert(sql.values.includes(a));assert(sql.values.includes(h));calls++;return calls===1?[{id},{id:hidden},{id:archived}]:[{objectId:id,assetId:null,title:'Saldo quadro elettrico',supplier:'Tecnico fittizio'}];}};
 const original=EconomyPolicy.prototype.subject;EconomyPolicy.prototype.subject=async(_tx,account,home,ref)=>{assert.equal(account,a);assert.equal(home,h);if(ref.id===hidden)throw new ForbiddenException();return {ref,name:'Quadro elettrico',state:ref.id===archived?'archived':'active'};};
 try{assert.deepEqual(await invoiceObjectSuggestions(tx,a,h,output(cost()),cost(),{}),{items:[{ref:{kind:'object',id},name:'Quadro elettrico',reason:'supplier_and_description'}]});assert.equal(calls,2);}finally{EconomyPolicy.prototype.subject=original;}
});
test('existing native boiler expense can propose that same reference after source policy validation',async()=>{
 const id=randomUUID();let calls=0;const item=cost('Acconto revisione bruciatore caldaia','Tecnico demo');const tx={$queryRaw:async()=>++calls===1?[]:[{objectId:null,assetId:id,title:'Saldo revisione bruciatore caldaia',supplier:'Tecnico demo'}]};const original=EconomyPolicy.prototype.subject;
 EconomyPolicy.prototype.subject=async(_tx,_a,_h,ref)=>{assert.deepEqual(ref,{kind:'boiler',id});return {ref,name:'Caldaia esistente',state:'active'};};
 try{assert.equal((await invoiceObjectSuggestions(tx,'a','h',output(item),item,{})).items[0].ref.kind,'boiler');}finally{EconomyPolicy.prototype.subject=original;}
});
test('unreadable current source and foreign item reject before candidate queries; bills have no suggestions',async()=>{
 let queries=0;const tx={$queryRaw:async()=>{queries++;return [];}},item=cost(),draft={documentId:randomUUID(),output:output(item)};
 const access={run:async(_a,_h,write,fn)=>{assert.equal(write,false);return fn(tx);},draft:async()=>draft,source:async()=>null};
 await assert.rejects(onboardingObjectSuggestions(access,{},'a','h','draft',{itemId:'cost'}));assert.equal(queries,0);
 access.source=async()=>({});await assert.rejects(onboardingObjectSuggestions(access,{},'a','h','draft',{itemId:'foreign'}));assert.equal(queries,0);
 assert.deepEqual(await invoiceObjectSuggestions(tx,'a','h',output(item),{...item,documentKind:'utility_bill'},{}),{items:[]});assert.equal(queries,0);
});
test('explicit invoice installment is held for review before an automatic object or expense can be created',()=>{
 for(const title of ['Acconto quadro elettrico','Saldo riparazione frigorifero'])assert.throws(()=>automaticPlan(output(cost(title))),AutomaticReviewNeeded);
});
test('brand/model match in the existing object name remains an explicit proposal when invoice name is abbreviated',async()=>{
 const id=randomUUID(),item=cost('Acconto elettrodomestico',''),s={documentId:randomUUID(),documentVersion:1,sha256:'a'.repeat(64),page:1,excerpt:'DEMO PX50'};
 const out=output(item);out.items=[{fields:{name:{value:'Prodotto Demo',source:s},brand:{value:'DEMO',source:s},model:{value:'PX50',source:s}},nameTruncated:false}];
 const tx={$queryRaw:async sql=>{assert(sql.values.includes(' demo '));assert(sql.values.includes(' px50 '));return [{id,reason:'product_identity'}];}},original=EconomyPolicy.prototype.subject;
 EconomyPolicy.prototype.subject=async()=>({ref:{kind:'object',id},name:'DEMO PX50 nome completo',state:'active'});
 try{assert.equal((await invoiceObjectSuggestions(tx,'a','h',out,item,{})).items[0].reason,'product_identity');}finally{EconomyPolicy.prototype.subject=original;}
});
