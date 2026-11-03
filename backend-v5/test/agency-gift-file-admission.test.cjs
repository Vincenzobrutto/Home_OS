// Synthetic admission port tests. No actual antivirus, storage service, Home or database is used.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {stageGiftOriginal}=require('../dist/agency-practices/gift-file-admission');
const {digest}=require('../dist/security'),{png}=require('./document-fixtures.cjs');
const {fileControlUnavailable}=require('../dist/documents/file-control');
const {HttpException}=require('@nestjs/common'),{PracticeError}=require('../dist/agency-practices/domain');
const proof=bytes=>({sha256:digest(bytes),byteSize:bytes.length,mimeType:'image/png',originalFilename:'C:\\fakepath\\plan<DEMO>.png'});
const receipt=()=>({engine:'microsoft_defender',checkedAt:new Date(),signatureVersion:'OFFLINE-STUB-NOT-A-REAL-SCAN'});
const code=e=>e.code||e.getResponse?.().code;
function port(){
 const files=new Map(),writes=[],reads=[],removes=[],keys=[],control=receipt();
 const storage={
  async writeVerified(bytes){const key=randomUUID()+'.bin';writes.push(bytes);keys.push(key);files.set(key,Buffer.from(bytes));return {key,control};},
  async read(key){reads.push(key);if(!files.has(key))throw Error('synthetic_missing');return Buffer.from(files.get(key));},
  async remove(key){removes.push(key);files.delete(key);}
 };
 return {storage,files,writes,reads,removes,keys,control};
}
test('Gift staging uses verified admission and independent readback, preserving proof and scanner receipt',async()=>{
 const p=port(),source=Buffer.from(png),out=await stageGiftOriginal(async()=>source,proof(source),p.storage);
 assert.equal(p.writes.length,1);assert.notEqual(p.writes[0],source);assert.deepEqual(p.writes[0],source);assert.deepEqual(p.reads,[out.storageKey]);assert.deepEqual(p.removes,[]);
 assert.equal(out.sha256,digest(source));assert.equal(out.byteSize,source.length);assert.equal(out.mimeType,'image/png');assert.equal(out.originalFilename,'plan_DEMO_.png');assert.deepEqual(out.control,p.control);assert.notEqual(out.control,p.control);assert.notEqual(out.control.checkedAt,p.control.checkedAt);
 assert.equal('homeId'in out,false);assert.equal('documentId'in out,false);assert.deepEqual([...p.files.keys()],[out.storageKey]);
});
test('source hash or size mismatch is rejected before any write',async()=>{
 for(const mutate of [x=>x.sha256='a'.repeat(64),x=>x.byteSize++]){
  const p=port(),expected=proof(png);mutate(expected);await assert.rejects(()=>stageGiftOriginal(async()=>png,expected,p.storage),e=>code(e)==='source_changed');assert.equal(p.writes.length,0);assert.equal(p.reads.length,0);assert.equal(p.removes.length,0);
 }
});
test('invalid proof or unsupported declared type is rejected before reading source',async()=>{
 for(const mutate of [x=>x.sha256='bad',x=>x.sha256=123,x=>x.byteSize=0,x=>x.byteSize=20*1024*1024+1,x=>x.mimeType='text/plain',x=>x.originalFilename='']){
  const p=port(),expected=proof(png);mutate(expected);let reads=0;await assert.rejects(()=>stageGiftOriginal(async()=>{reads++;return png;},expected,p.storage),e=>code(e)==='invalid_input');assert.equal(reads,0);assert.equal(p.writes.length,0);assert.deepEqual(p.removes,[]);
 }
});
test('detected type must match source proof and unsupported bytes never reach admission',async()=>{
 const p=port(),expected={...proof(png),mimeType:'application/pdf'};await assert.rejects(()=>stageGiftOriginal(async()=>png,expected,p.storage),e=>code(e)==='source_changed');assert.equal(p.writes.length,0);
 const text=Buffer.from('This is a synthetic plain text document.'),q=port();await assert.rejects(()=>stageGiftOriginal(async()=>text,{...proof(text),mimeType:'application/pdf'},q.storage),e=>code(e)==='unsupported_file_type');assert.equal(q.writes.length,0);
});
test('source read failure is sanitized and cannot write or remove any file',async()=>{
 const p=port();await assert.rejects(()=>stageGiftOriginal(async()=>{throw Error('private-source-path');},proof(png),p.storage),e=>code(e)==='storage_unavailable'&&!e.message.includes('private-source-path'));assert.equal(p.writes.length,0);assert.deepEqual(p.removes,[]);
});
test('an explicit scanner failure blocks staging without guessing a cleanup key',async()=>{
 const p=port(),existing=randomUUID()+'.bin';p.files.set(existing,Buffer.from('existing DEMO'));
 p.storage.writeVerified=async()=>{throw fileControlUnavailable();};await assert.rejects(()=>stageGiftOriginal(async()=>png,proof(png),p.storage),e=>code(e)==='file_check_unavailable');assert.deepEqual(p.removes,[]);assert.deepEqual([...p.files.keys()],[existing]);
});
test('unknown write outcome never deletes an object whose owned key was not returned',async()=>{
 const p=port(),unknown=randomUUID()+'.bin';p.storage.writeVerified=async bytes=>{p.files.set(unknown,Buffer.from(bytes));throw Error('uncertain-write-private-path');};
 await assert.rejects(()=>stageGiftOriginal(async()=>png,proof(png),p.storage),e=>code(e)==='storage_unavailable'&&!e.message.includes('private-path'));assert.deepEqual(p.removes,[]);assert.ok(p.files.has(unknown));
});
test('changed independent bytes remove only the just-written Home object, never an existing object',async()=>{
 const p=port(),existing=randomUUID()+'.bin',original=Buffer.from('existing DEMO');p.files.set(existing,original);p.storage.read=async key=>{p.reads.push(key);return Buffer.from('changed copy');};
 await assert.rejects(()=>stageGiftOriginal(async()=>png,proof(png),p.storage),e=>code(e)==='storage_unavailable');assert.equal(p.keys.length,1);assert.deepEqual(p.removes,[p.keys[0]]);assert.deepEqual([...p.files.keys()],[existing]);assert.deepEqual(p.files.get(existing),original);
});
test('readback failure cleans only its newly admitted key and sanitizes details',async()=>{
 const p=port();p.storage.read=async()=>{throw Error('private-home-path');};await assert.rejects(()=>stageGiftOriginal(async()=>png,proof(png),p.storage),e=>code(e)==='storage_unavailable'&&!e.message.includes('private-home-path'));assert.deepEqual(p.removes,p.keys);assert.equal(p.files.size,0);
});
test('missing or invalid scanner receipt fails closed and removes the new object',async()=>{
 for(const mutate of [c=>c.engine='unknown',c=>c.checkedAt=new Date('invalid'),c=>c.signatureVersion='']){
  const p=port();mutate(p.control);await assert.rejects(()=>stageGiftOriginal(async()=>png,proof(png),p.storage),e=>code(e)==='file_check_unavailable');assert.deepEqual(p.removes,p.keys);assert.equal(p.files.size,0);
 }
});
test('malformed returned key is never used as a cleanup path',async()=>{
 const p=port();p.storage.writeVerified=async()=>({key:'../../private-file',control:receipt()});await assert.rejects(()=>stageGiftOriginal(async()=>png,proof(png),p.storage),e=>code(e)==='storage_unavailable');assert.deepEqual(p.reads,[]);assert.deepEqual(p.removes,[]);
});
test('cleanup failure retains the admission failure and does not touch other paths',async()=>{
 for(const asynchronous of [true,false]){
  const p=port();p.storage.read=async()=>Buffer.from('changed');const remove=key=>{p.removes.push(key);throw Error('cleanup-private-path');};p.storage.remove=asynchronous?async key=>remove(key):remove;
  await assert.rejects(()=>stageGiftOriginal(async()=>png,proof(png),p.storage),e=>code(e)==='storage_unavailable'&&!e.message.includes('cleanup-private-path'));assert.deepEqual(p.removes,p.keys);
 }
});
test('expected proof is snapshotted before the asynchronous source reader can change the caller object',async()=>{
 const p=port(),expected=proof(png),hash=expected.sha256;const result=await stageGiftOriginal(async()=>{expected.sha256='b'.repeat(64);expected.originalFilename='changed.png';return png;},expected,p.storage);
 assert.equal(result.sha256,hash);assert.equal(result.originalFilename,'plan_DEMO_.png');
});

test('arbitrary HTTP diagnostics are sanitized across source, write and readback failures',async()=>{
 const secret='PRIVATE-PROVIDER-KEY C:\\private\\customer.pdf';
 for(const phase of ['source','write','read']){
  const p=port(),failure=()=>{throw new HttpException({code:'provider_internal_failure',message:secret,path:secret},500);};let source=async()=>png;
  if(phase==='source')source=async()=>failure();else if(phase==='write')p.storage.writeVerified=async()=>failure();else p.storage.read=async()=>failure();
  await assert.rejects(()=>stageGiftOriginal(source,proof(png),p.storage),e=>e.getStatus()===503&&code(e)==='storage_unavailable'&&!JSON.stringify(e.getResponse()).includes('PRIVATE-PROVIDER-KEY')&&!e.message.includes(secret));
  assert.deepEqual(p.removes,phase==='read'?p.keys:[]);
 }
});
test('allowlisted storage errors are reconstructed without their original body or message',async()=>{
 const secret='PRIVATE-DIAGNOSTIC-PATH';
 for(const known of ['storage_unavailable','file_check_unavailable','storage_capacity_low']){
  const p=port();p.storage.writeVerified=async()=>{throw new HttpException({code:known,message:secret,provider:secret},503);};
  await assert.rejects(()=>stageGiftOriginal(async()=>png,proof(png),p.storage),e=>e.getStatus()===503&&code(e)===known&&!JSON.stringify(e.getResponse()).includes(secret)&&!e.message.includes(secret));assert.deepEqual(p.removes,[]);
 }
 const p=port();p.storage.writeVerified=async()=>{throw new HttpException({code:'file_check_unavailable',message:secret},500);};
 await assert.rejects(()=>stageGiftOriginal(async()=>png,proof(png),p.storage),e=>code(e)==='storage_unavailable'&&!JSON.stringify(e.getResponse()).includes(secret));
});
test('known practice failures keep only their safe code rather than mutable diagnostics',async()=>{
 const p=port(),failure=new PracticeError('access_denied');failure.message='PRIVATE-SOURCE-DIAGNOSTIC';
 await assert.rejects(()=>stageGiftOriginal(async()=>{throw failure;},proof(png),p.storage),e=>e!==failure&&e.code==='access_denied'&&e.message==='access_denied');assert.equal(p.writes.length,0);
});
