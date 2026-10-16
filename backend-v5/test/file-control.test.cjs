// Offline scanner fault injection; real filesystem only in an isolated test directory.
require('reflect-metadata');const {test}=require('node:test'),assert=require('node:assert/strict');
const {mkdir,mkdtemp,writeFile,readdir}=require('node:fs/promises'),{join}=require('node:path'),{randomUUID}=require('node:crypto');
const {WindowsDefenderScanner,fileControlUnavailable}=require('../dist/documents/file-control');
const {LocalFileStorage}=require('../dist/documents/storage'),{digest}=require('../dist/security'),{png}=require('./document-fixtures.cjs');
async function root(){const base=join(__dirname,'.storage-tests');await mkdir(base,{recursive:true});return mkdtemp(join(base,'file-control-'));}
async function staged(){const dir=await root(),path=join(dir,randomUUID()+'.bin.part');await writeFile(path,png);return path;}
const receipt=()=>({engine:'microsoft_defender',checkedAt:new Date(),signatureVersion:'offline-fixture'});
test('File admission: stage stays private until verdict, original bytes and receipt preserved',async()=>{
  const storage=new LocalFileStorage({scan:async path=>{assert(path.endsWith('.part'));assert.equal((await readdir(storage.root)).filter(p=>p.endsWith('.bin')).length,0);return receipt();}});storage.root=await root();
  const result=await storage.writeVerified(png);assert.equal(result.control.engine,'microsoft_defender');assert.deepEqual(await storage.read(result.key),png);assert.deepEqual(await readdir(storage.root),[result.key]);
});
test('Failed scanner never admits a file and does not touch existing originals',async()=>{
  const storage=new LocalFileStorage({scan:async()=>{throw fileControlUnavailable();}});storage.root=await root();const existing=randomUUID()+'.bin';await writeFile(join(storage.root,existing),png);
  await assert.rejects(storage.writeVerified(png),e=>e.getResponse().code==='file_check_unavailable');assert.deepEqual(await readdir(storage.root),[existing]);assert.deepEqual(await storage.read(existing),png);
});
test('Low disk reserve fails before staging or scan',async()=>{
  let scans=0;const storage=new class extends LocalFileStorage{async availableBytes(){return 0n;}}({scan:async()=>{scans++;return receipt();}});storage.root=await root();
  await assert.rejects(storage.writeVerified(png),e=>e.getResponse().code==='storage_capacity_low');assert.equal(scans,0);assert.deepEqual(await readdir(storage.root),[]);
});
test('Unknown verdict and altered bytes fail closed without leaking scanner output',async()=>{
  const path=await staged();let changed=false;const scanner=new class extends WindowsDefenderScanner{async engine(){return{executable:'offline',signatureVersion:'offline-fixture'};}async command(_exe,args){assert(args.includes('-DisableRemediation'));if(changed)await writeFile(path,Buffer.from('changed'));return{code:changed?0:2,stdout:'private-path-and-engine-details'};}}();
  const rejects=e=>e.getResponse().code==='file_check_unavailable'&&!JSON.stringify(e.getResponse()).includes('private-path');
  await assert.rejects(scanner.scan(path,digest(png)),rejects);changed=true;await assert.rejects(scanner.scan(path,digest(png)),rejects);
});
test('Two concurrent checks maximum and failure frees both slots',async()=>{
  const path=await staged(),pending=[];let delayed=true;const scanner=new class extends WindowsDefenderScanner{async engine(){return{executable:'offline',signatureVersion:'offline'};}command(){return delayed?new Promise(resolve=>pending.push(resolve)):Promise.resolve({code:0,stdout:''});}}();
  const a=scanner.scan(path,digest(png)),b=scanner.scan(path,digest(png)),checks=[assert.rejects(a),assert.rejects(b)];
  for(let i=0;pending.length<2&&i<100;i++)await new Promise(r=>setTimeout(r,1));assert.equal(pending.length,2);await assert.rejects(scanner.scan(path,digest(png)),e=>e.getStatus()===503);
  for(const release of pending)release({code:2,stdout:''});await Promise.all(checks);delayed=false;assert.equal((await scanner.scan(path,digest(png))).engine,'microsoft_defender');
});
test('Invalid stage path or digest rejected before scanner invocation',async()=>{
  let called=0;const scanner=new class extends WindowsDefenderScanner{async engine(){called++;throw Error();}}();
  await assert.rejects(scanner.scan('outside.pdf',digest(png)));await assert.rejects(scanner.scan(await staged(),'0'.repeat(64)));assert.equal(called,0);
});
