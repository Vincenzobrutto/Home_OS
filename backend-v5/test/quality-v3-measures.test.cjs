const {test}=require('node:test'),assert=require('node:assert/strict');
const {detailed}=require('./quality-v3-measures.cjs');
test('live measures count wrong automatic expense and unexpected professional as critical, including absent optional gold',()=>{
 const g={id:'Q01',documentKind:'utility_bill',items:[],expenses:[{amountCents:100,date:'2026-01-01',supplier:'Demo'}],contacts:[],automatic:'complete'};
 const o={documentKind:'utility_bill',items:[],houseExpenses:[{amountCandidates:[{role:'current_document_total',amountCents:200}],proposedFields:{documentDate:{value:'2026-01-01'},supplier:{value:'Demo'}}}],contacts:[{values:{name:'Customer'}}]};
 const r=detailed(g,o,'complete');assert.equal(r.measures.expenseAmountCents.correct,0);assert.equal(r.measures.expenseAmountCents.total,1);assert.equal(r.extraProposals.professionals,1);assert(r.detailedCriticalErrors>=2);
});
test('label brand/model can match a short name but never treats visually observed citations as verified text',()=>{
 const g={documentKind:'device_label',items:[{name:'Lavatrice Demo X',brand:'Demo',model:'X',type:'appliance'}],expenses:[],contacts:[],automatic:'review'};
 const o={documentKind:'device_label',items:[{fields:{brand:{value:'Demo',source:{page:1,excerpt:'Demo',basis:'provider_observed_image'}},model:{value:'X'}},objectType:{value:'appliance',certainty:'uncertain'}}]};
 const r=detailed(g,o,'review');assert.equal(r.measures.labelBrandModel.correct,1);assert.equal(r.unverifiedVisual,1);assert.equal(r.badTextEvidence,0);assert.equal(r.detailedCriticalErrors,0);assert.equal(detailed(g,o,'complete').detailedCriticalErrors>=1,true);
});
test('missing output remains missing, no false stability fingerprint or vacuous quality pass',()=>{const r=detailed({id:'Q47',documentKind:'house_document',items:[],expenses:[],contacts:[]},null,'review');assert.equal(r.measures.documentKind.correct,0);assert.equal(r.canonicalFingerprint,null);assert.equal(r.measures.difficultReview.correct,1);});
test('a source-supported short product name can identify the gold subject without weakening citation checks',()=>{
 const {metrics}=require('./quality-v3-score.cjs'),g={documentKind:'product_document',items:[{name:'Lavatrice Demo X',brand:'Demo',model:'X',type:'appliance',typeCertain:true}],expenses:[],contacts:[],automatic:'complete'},proof={page:1,excerpt:'Lavatrice Demo X',basis:'verified_text'};
 const output={documentKind:'product_document',items:[{fields:{name:{value:'Lavatrice',source:proof},brand:{value:'Demo',source:proof},model:{value:'X',source:proof}},objectType:{value:'appliance',certainty:'certain'}}]};
 assert.equal(metrics(g,{output,automatic:'complete'},['Lavatrice Demo X']).criticalAutomaticErrors,0);
 output.items[0].fields.name.source={...proof,excerpt:'INVENTED'};assert(metrics(g,{output,automatic:'complete'},['Lavatrice Demo X']).criticalAutomaticErrors>0);
});
