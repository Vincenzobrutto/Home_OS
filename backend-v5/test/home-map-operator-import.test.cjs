const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {parseOperatorPlanImport,OPERATOR_IMPORT_CAVEAT}=require('../dist/home-maps/operator-import');
const {mapDigest}=require('../dist/home-maps/snapshot');
const actor=randomUUID(),documentId=randomUUID(),roomId=randomUUID(),sha='a'.repeat(64);
function fixture(){
 const content={schemaVersion:1,planId:'synthetic-reconstruction',planVersion:2,geometryRevision:1,source:{sourceId:documentId,version:2,sha256:sha,page:1},frame:{width:100,height:100,rasterSha256:'b'.repeat(64),coordinateSystem:'rendered-page-top-left',transform:[1,0,0,-1,0,100]},rooms:[{id:'kitchen',name:'Cucina',type:'kitchen',points:[[0,0],[40,0],[40,40],[0,40]],holes:[]},{id:'hall',name:'Corridoio',type:'corridor',points:[[0,50],[80,50],[80,60],[0,60]],holes:[]}],calibration:null,qualification:'unverified',mainPerimeter:null,caveats:[OPERATOR_IMPORT_CAVEAT,'Nessuna revisione di completezza o misura dichiarata.'],reviewedBy:actor,reviewedAt:'2026-11-03T12:00:00.000Z'};
 return {expectedAccountEmail:'owner@example.test',documentId,expectedDocumentVersion:2,expectedDocumentSha256:sha,snapshot:{...content,digest:mapDigest(content)},bindings:[{regionId:'kitchen',kind:'existing',roomId},{regionId:'hall',kind:'create',name:'Corridoio',type:'hall'}],reason:'Importazione tecnica sintetica della bozza',provenance:{kind:'backoffice_reconstruction',sourceDigest:'c'.repeat(64),note:'Soltanto fixture sintetica'}};
}
function resigned(input){const content={...input.snapshot};delete content.digest;input.snapshot.digest=mapDigest(content);return input;}
test('operator manifest is exact, detached and preserves physical source version and explicit binding choices',()=>{const input=fixture(),parsed=parseOperatorPlanImport(input);assert.equal(parsed.expectedDocumentVersion,2);assert.equal(parsed.snapshot.source.sourceId,documentId);assert.equal(parsed.snapshot.qualification,'unverified');assert.equal(parsed.bindings[0].regionId,'hall');parsed.snapshot.rooms[0].points[0][0]=10;assert.equal(input.snapshot.rooms[0].points[0][0],0);});
test('operator import rejects inferred review, calibration, source substitution and unsupported provenance',()=>{
 const variants=[x=>x.snapshot.caveats=[],x=>x.snapshot.qualification='reviewed',x=>x.snapshot.source.sourceId=randomUUID(),x=>x.snapshot.source.version=1,x=>x.snapshot.source.sha256='b'.repeat(64),x=>x.provenance.kind='agency_gift',x=>x.expectedAccountEmail='Owner@example.test'];
 for(const mutate of variants){const input=fixture();mutate(input);assert.throws(()=>parseOperatorPlanImport(resigned(input)));}
});
test('every region requires a single explicit mapping, no duplicate existing room or hidden create options',()=>{
 for(const mutate of [x=>x.bindings.pop(),x=>x.bindings[1].regionId='kitchen',x=>x.bindings.push({...x.bindings[0]}),x=>x.bindings[1]={regionId:'hall',kind:'existing',roomId},x=>x.bindings[1].type='invented',x=>x.bindings[1].automatic=true,x=>x.bindings[0].name='Do not rename']){const input=fixture();mutate(input);assert.throws(()=>parseOperatorPlanImport(input));}
});
test('operator manifests reject reserved dictionary region IDs before persistence',()=>{
 for(const id of ['__proto__','constructor','prototype']){const input=fixture();input.snapshot.rooms[0].id=id;input.bindings[0].regionId=id;resigned(input);assert.throws(()=>parseOperatorPlanImport(input),error=>error.getStatus?.()===422);}
});
test('technical manifest rejects unknown fields and prototypes/accessors without evaluating them',()=>{
 const extra=fixture();extra.admin=true;assert.throws(()=>parseOperatorPlanImport(extra));
 const inherited=Object.assign(Object.create({admin:true}),fixture());assert.throws(()=>parseOperatorPlanImport(inherited));
 let evaluated=false;const accessor=fixture();Object.defineProperty(accessor.snapshot,'rooms',{enumerable:true,get(){evaluated=true;return [];}});assert.throws(()=>parseOperatorPlanImport(accessor));assert.equal(evaluated,false);
 const sparse=fixture();delete sparse.bindings[0];assert.throws(()=>parseOperatorPlanImport(sparse));
});
module.exports={fixture};
