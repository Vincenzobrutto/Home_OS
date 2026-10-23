require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {objectProfileViews,objectProfileView}=require('../dist/object-onboarding/access');
const a='account-a',h='home-a',sha='a'.repeat(64);
const source=(id,version=1,hash=sha)=>({documentId:id,documentVersion:version,sha256:hash,page:1,excerpt:'Synthetic',basis:'verified_text',region:null});
const field=(sources,value='Synthetic brand')=>({value,origin:'extraction_confirmed',sources});
function fixture(){
 const calls=[];
 const docs=[{id:'readable',homeId:h,uploaderId:a,visibility:'private',original:{version:1,sha256:sha}},{id:'foreign-private',homeId:h,uploaderId:'account-b',visibility:'private',original:{version:1,sha256:sha}},{id:'wrong-home',homeId:'home-b',uploaderId:a,visibility:'home',original:{version:1,sha256:sha}}];
 const tx={receiptObjectField:{findMany:async options=>{calls.push(['receipt',options]);return[{objectId:'one',fieldKey:'model',value:'Synthetic model',origin:'user_declared',sources:[]}];}},document:{findMany:async options=>{calls.push(['documents',options]);return docs.filter(d=>d.homeId===options.where.homeId&&options.where.id.in.includes(d.id));}}};
 return {tx,calls};
}
test('batch profiles keep every source proof mandatory, including private visibility, home, SHA and version',async()=>{
 const {tx,calls}=fixture();
 const targets=[{id:'one',profile:{brand:field([source('readable')])}},{id:'two',profile:{brand:field([source('readable'),source('foreign-private')]),serialNumber:field([source('readable',2)]),reference:field([source('readable',1,'b'.repeat(64))]),model:field([source('wrong-home')])}}];
 const before=structuredClone(targets),result=await objectProfileViews(tx,a,h,targets);
 assert.equal(result.get('one').fields.brand.value,'Synthetic brand');assert.equal(result.get('one').fields.model.value,'Synthetic model');assert.equal(result.get('one').unavailable,false);
 assert.deepEqual(result.get('two'),{fields:{},unavailable:true});assert.deepEqual(targets,before);
 assert.equal(calls.filter(c=>c[0]==='receipt').length,1);assert.equal(calls.filter(c=>c[0]==='documents').length,1);
 assert.deepEqual(calls[0][1].where,{accountId:a,homeId:h,objectId:{in:['one','two']},fieldKey:{in:['brand','model']}});
});
test('user declarations and per-object receipt fallback stay independent; single-object façade uses the same policy',async()=>{
 const {tx}=fixture();const declared={brand:{value:'Declared',origin:'user_declared',sources:[]}};
 const result=await objectProfileViews(tx,a,h,[{id:'one',profile:declared},{id:'other',profile:null}]);
 assert.equal(result.get('one').fields.brand.value,'Declared');assert.equal(result.get('one').fields.model.value,'Synthetic model');assert.deepEqual(result.get('other'),{fields:{},unavailable:false});
 assert.deepEqual(await objectProfileView(tx,a,h,'one',declared),result.get('one'));
});
test('empty batch performs no reads and an inaccessible source cannot become readable through another target',async()=>{
 const {tx,calls}=fixture();assert.deepEqual(await objectProfileViews(tx,a,h,[]),new Map());assert.equal(calls.length,0);
 const result=await objectProfileViews(tx,a,h,[{id:'one',profile:{brand:field([source('readable')])}},{id:'two',profile:{brand:field([source('foreign-private')])}}]);
 assert.equal(result.get('one').fields.brand.value,'Synthetic brand');assert.equal(result.get('two').unavailable,true);assert.deepEqual(result.get('two').fields,{});
});
