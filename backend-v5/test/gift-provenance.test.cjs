const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseGiftDocumentProvenance:parse}=require('../dist/documents/gift-provenance');
const {publicDocument}=require('../dist/documents/documents.service');
const hash='a'.repeat(64);
const origin=()=>({schemaVersion:1,kind:'agency_gift',invitationId:'invite-demo',agencyId:'agency-demo',practiceId:'practice-demo',sourceId:'source-demo',sourceVersion:5,sourceSha256:hash,metadataVersion:3,origin:'agency_generated',author:'Agency DEMO',title:'Prospetto DEMO',surface:{kind:'commercial',qualification:'estimated',method:'A4 presunto',geometryRevision:7,caveats:['Formato non verificato']}});
const doc=(giftProvenance)=>({id:'home-document',homeId:'home-demo',name:'Documento ricevuto',createdAt:new Date('2026-10-31T00:00:00.000Z'),visibility:'private',giftProvenance,original:{originalFilename:'demo.pdf',mimeType:'application/pdf',byteSize:123,version:1,sha256:hash}});
const unavailable=fn=>assert.throws(fn,e=>e.getStatus()===503&&e.getResponse().code==='storage_unavailable');

test('Gift provenance absent keeps old manual projection and permissions unchanged',()=>{
 for(const absent of [undefined,null]){
  assert.equal(parse(absent),null);const p=publicDocument(doc(absent),false,true);
  assert.equal(p.source,'manual_upload');assert.equal('giftProvenance'in p,false);assert.deepEqual(p.permissions,['read']);
 }
});
test('Gift projection distinguishes local document version from frozen Agency source version',()=>{
 const p=publicDocument(doc(origin()),true,true);assert.equal(p.source,'agency_gift');assert.equal(p.version,1);assert.equal(p.giftProvenance.sourceVersion,5);assert.equal(p.giftProvenance.metadataVersion,3);assert.equal(p.sha256,hash);assert.deepEqual(p.permissions,['read','export']);
});
test('list indicates Gift origin without exposing its detailed source metadata',()=>{
 const p=publicDocument(doc(origin()),true);assert.equal(p.source,'agency_gift');assert.equal('giftProvenance'in p,false);assert.equal('sha256'in p,false);assert.equal(JSON.stringify(p).includes('practice-demo'),false);
});
test('estimated method and caveats preserved with no mutable references to stored metadata',()=>{
 const stored=origin(),p=publicDocument(doc(stored),true,true);assert.deepEqual(p.giftProvenance.surface,stored.surface);p.giftProvenance.surface.caveats.push('caller mutation');assert.deepEqual(stored.surface.caveats,['Formato non verificato']);
});
test('malformed present provenance cannot silently become manual_upload',()=>{
 for(const bad of [false,[],{},'gift',{...origin(),kind:'manual_upload'},{...origin(),schemaVersion:2},{...origin(),sourceVersion:0},{...origin(),sourceSha256:'bad'},Object.assign(Object.create({inherited:true}),origin())]){
  unavailable(()=>parse(bad));unavailable(()=>publicDocument(doc(bad),false));
 }
});
test('Gift provenance rejects injected private account, token, ledger or certification fields',()=>{
 for(const field of ['email','accountId','token','tokenHash','ledger','packet','certification'])unavailable(()=>parse({...origin(),[field]:'injected'}));
 unavailable(()=>parse({...origin(),surface:{...origin().surface,verified:true}}));
});
test('estimate loses neither method nor explanation and sparse/non-text caveats are rejected',()=>{
 for(const mutate of [p=>p.surface.method='',p=>p.surface.caveats=[],p=>p.surface.caveats=['same','same'],p=>p.surface.caveats=[4],p=>p.surface.caveats=Array(1),p=>p.surface.geometryRevision=1.5,p=>p.author='bad\nvalue']){const p=origin();mutate(p);unavailable(()=>parse(p));}
});
test('copied bytes must agree with the source SHA before any Gift metadata is projected',()=>{
 const d=doc(origin());d.original.sha256='b'.repeat(64);unavailable(()=>publicDocument(d,true,true));unavailable(()=>publicDocument(d,true));
});
