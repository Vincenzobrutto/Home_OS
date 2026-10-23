global.fetch=async()=>{throw Error('network_forbidden');};
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {productExtraction,productCandidates}=require('../dist/object-onboarding/domain');
const {automaticPlan,AutomaticReviewNeeded}=require('../dist/object-onboarding/automatic-plan');
const {proposedProfile}=require('../dist/object-onboarding/profile');
const snapshot={documentId:'20000000-0000-4000-8000-000000000001',documentVersion:1,documentSha256:'a'.repeat(64)};
const norm=s=>s.normalize('NFC').replace(/\s+/gu,' ').trim();
const proof=(value,visual=false,page=1)=>({page,excerpt:value,region:visual?{x:.1,y:.1,width:.8,height:.2}:null});
function row(name,visual=false,page=1){const source=proof(name,visual,page);return {fields:{name:{value:name,evidence:source},model:{value:'ZX-82/B',evidence:source}},quantity:null,nameTruncated:false,disposition:'household_object',confidence:'high'};}
const input=items=>({documentKind:'order_confirmation',hasMoreItems:false,purchaseTotal:null,items});
const fails=fn=>assert.throws(fn);

test('252 multilingual/separator/whitespace cases preserve the full variant, model and source without external I/O',()=>{
 const names=['Dispositivo ambiente','Appareil de cuisine','Gerät für die Küche','Συσκευή οικίας','家庭用機器 製品','جهاز منزلي','Dispositivo 🏠 ambiente'];
 const separators=[' — ',' - ',' | ', ', ', '; ', ' '],spaces=[' ','\n','\u00a0'];let cases=0;
 for(const visual of [false,true])for(const name of names)for(const separator of separators)for(const space of spaces){
  const full=(name+separator+'descrizione documentata '.repeat(12)+'Modello ZX-82/B variante Blu 256 GB').replaceAll(' ',space);
  const ctx=visual?{kind:'visual_pdf',snapshot,pageCount:1}:{kind:'text',snapshot,pages:[full]};
  const output=productExtraction(input([row(full,visual)]),ctx),item=output.items[0];
  assert.equal(item.fullName,norm(full));assert(item.fullName.startsWith(item.fields.name.value));assert([...item.fields.name.value].length<=120);
  assert.equal(item.fields.name.source.excerpt,full);assert.equal(item.fields.name.source.sha256,snapshot.documentSha256);assert.equal(item.fields.name.source.documentVersion,1);
  assert.equal(proposedProfile(item).model.value,'ZX-82/B');assert(item.fullName.endsWith('variante Blu 256 GB'));
  assert.equal(item.nameTruncated,true);assert.equal(output.needsReview,true);assert.throws(()=>automaticPlan(output),AutomaticReviewNeeded);cases++;
 }
 assert.equal(cases,252);
});

test('twenty similar variants keep their identities across item and field order; no shared-prefix candidate match',()=>{
 const titles=Array.from({length:20},(_,i)=>'Apparato domestico — '+'descrizione documentata '.repeat(10)+'Modello ZX-82/B variante '+i);
 const rows=titles.map(name=>row(name)),ctx={kind:'text',snapshot,pages:[titles.join('\n')]};
 const first=productExtraction(input(rows),ctx),reordered=productExtraction(input([...rows].reverse().map(item=>({...item,fields:{model:item.fields.model,name:item.fields.name}}))),ctx);
 assert.equal(first.items.length,20);assert.equal(new Set(first.items.map(i=>i.fields.name.value)).size,1);assert.equal(new Set(first.items.map(i=>i.fingerprint)).size,20);
 const identity=output=>Object.fromEntries(output.items.map(i=>[i.fullName,{id:i.id,fingerprint:i.fingerprint}]));assert.deepEqual(identity(reordered),identity(first));
 for(const item of first.items)assert.equal(productCandidates(item,[{id:'other',accountId:'a',homeId:'h',state:'active',name:item.fields.name.value,brand:null,model:null,confirmedItemFingerprints:[]}],{accountId:'a',homeId:'h'}).length,0);
 fails(()=>productExtraction(input([...rows,rows[0]]),ctx));
 fails(()=>productExtraction(input([rows[0],structuredClone(rows[0])]),ctx));
});

test('a similar sibling quote or a page outside the sent selection cannot validate the extended identity',()=>{
 const base='Apparato domestico — '+'descrizione documentata '.repeat(10)+'Modello ZX-82/B variante ',blue=base+'Blu',red=base+'Rossa';
 const textRow=row(blue);textRow.fields.name.evidence=proof(red,false,2);
 fails(()=>productExtraction(input([textRow]),{kind:'text',snapshot,pages:[blue,red]}));
 const valid=row(blue,true,2),ctx={kind:'visual_pdf',snapshot,pageCount:3,allowedPages:[2]};
 assert.equal(productExtraction(input([valid]),ctx).items[0].fields.name.source.page,2);
 for(const page of [0,1,3,4]){const forged=structuredClone(valid);forged.fields.name.evidence.page=page;fails(()=>productExtraction(input([forged]),ctx));}
});

test('the source-description bound is exact and does not crop a whole identifier or accept provider fullName',()=>{
 const prefix='Apparato domestico — ',tail=' Modello ZX-82/B variante Blu';
 const full=prefix+'a'.repeat(2000-prefix.length-tail.length)+tail;
 const ctx={kind:'visual_pdf',snapshot,pageCount:1},output=productExtraction(input([row(full,true)]),ctx);
 assert.equal([...output.items[0].fullName].length,2000);assert.equal(output.items[0].fields.name.value,'Apparato domestico');
 fails(()=>productExtraction(input([row(full+'x',true)]),ctx));
 fails(()=>productExtraction(input([row('X'.repeat(121)+' Modello ZX-82/B',true)]),ctx));
 const injected=row(full,true);injected.fullName='provider override';fails(()=>productExtraction(input([injected]),ctx));
});

test('abbreviation never promotes a consumable, uncertain accessory or low-confidence item',()=>{
 const full='Accessorio domestico — '+'descrizione documentata '.repeat(10)+'Modello ZX-82/B variante Blu';
 for(const disposition of ['consumable','uncertain']){
  const item=row(full);item.disposition=disposition;
  const output=productExtraction(input([item]),{kind:'text',snapshot,pages:[full]});assert.equal(output.items[0].disposition,disposition);assert.equal(output.needsReview,true);assert.throws(()=>automaticPlan(output),AutomaticReviewNeeded);
 }
 const low=row(full);low.confidence='low';const output=productExtraction(input([low]),{kind:'text',snapshot,pages:[full]});
 assert.deepEqual(output.items,[]);assert.equal(output.needsReview,true);
});

test('canonically equivalent Unicode preserves identity while source copies retain distinct document-bound item IDs',()=>{
 const full='Dispositivo caffè — '+'qualità e descrizione documentata '.repeat(10)+'Modello ZX-82/B variante Blu';
 const extract=(name,snap)=>productExtraction(input([row(name)]),{kind:'text',snapshot:snap,pages:[name]}).items[0];
 const nfc=extract(full.normalize('NFC'),snapshot),nfd=extract(full.normalize('NFD'),snapshot);
 assert.equal(nfc.fullName,nfd.fullName);assert.equal(nfc.fields.name.value,nfd.fields.name.value);assert.equal(nfc.fingerprint,nfd.fingerprint);assert.equal(nfc.id,nfd.id);
 const copied=extract(full,{...snapshot,documentId:'20000000-0000-4000-8000-000000000002'});
 assert.equal(copied.fingerprint,nfc.fingerprint);assert.notEqual(copied.id,nfc.id);assert.notEqual(copied.fields.name.source.documentId,nfc.fields.name.source.documentId);
});
