require('reflect-metadata');
const {test}=require('node:test');const assert=require('node:assert/strict');
const {mkdir,mkdtemp,writeFile,utimes,lstat}=require('node:fs/promises');const {join}=require('node:path');
const {randomUUID}=require('node:crypto');
const {plainToInstance}=require('class-transformer');const {validateSync}=require('class-validator');
const {LocalFileStorage,safeFilename,detectOriginal,MAX_FILE_BYTES,storageUnavailable}=require('../dist/documents/storage');
const {DocumentPolicy,canReadDocument}=require('../dist/documents/access');
const {DocumentsService}=require('../dist/documents/documents.service');
const {UploadDocumentDto,ExportDocumentsDto,ListDocumentsDto}=require('../dist/documents/dto');
const {digest}=require('../dist/security');
const {png,pdf,jpeg}=require('./document-fixtures.cjs');
const homeId=randomUUID(),id=randomUUID();
async function testRoot(){const root=join(__dirname,'.storage-tests');await mkdir(root,{recursive:true});return mkdtemp(join(root,'case-'));}
function doc(){return{id,homeId,uploaderId:'A',name:'Originale',visibility:'private',createdAt:new Date(),original:{version:1,originalFilename:'prova.png',mimeType:'image/png',byteSize:png.length,sha256:digest(png),file:{storageKey:randomUUID()+'.bin'}}};}
const owner={role:'owner',validFrom:new Date(0),validUntil:null,revokedAt:null};
test('Rilevamento byte reali: PNG ammesso, HTML e file vuoti rifiutati, limite dimensione',async()=>{assert.equal(await detectOriginal(png),'image/png');assert.equal(await detectOriginal(pdf),'application/pdf');assert.equal(await detectOriginal(jpeg),'image/jpeg');await assert.rejects(detectOriginal(Buffer.from('<script>x</script>')),e=>e.getStatus()===415);await assert.rejects(detectOriginal(Buffer.alloc(0)),e=>e.getStatus()===422);await assert.rejects(detectOriginal(Buffer.alloc(MAX_FILE_BYTES+1)),e=>e.getStatus()===413);});
test('Nomi sicuri: traversal, caratteri controllo, separatori e nomi ZIP',()=>{assert.equal(safeFilename('../../cartella/documento.pdf'),'documento.pdf');assert.equal(safeFilename('C:\\temp\\documento.pdf'),'documento.pdf');assert(!safeFilename('a\r\nb.pdf').includes('\n'));assert.equal(safeFilename('...'),'documento');assert.equal(safeFilename(Buffer.from('fattura è.pdf').toString('latin1')),'fattura è.pdf');assert.equal(safeFilename('fattura è.pdf'),'fattura è.pdf');assert([...safeFilename('é'.repeat(200))].length<=120);});
test('Storage reale: scrittura/lettura originali, path traversal negato, cleanup orfani controllato',async()=>{const storage=new LocalFileStorage();storage.root=await testRoot();const key=await storage.write(png);assert.deepEqual(await storage.read(key),png);assert.throws(()=>storage.path('../outside'),e=>e.getStatus()===503);const old=new Date(Date.now()-2*86400_000);await utimes(storage.path(key),old,old);await assert.rejects(storage.cleanup(async()=>{throw Error('DB giù')}));assert((await lstat(storage.path(key))).isFile());await storage.cleanup(async()=>true);assert((await lstat(storage.path(key))).isFile());await storage.cleanup(async()=>false);await assert.rejects(storage.read(key),e=>e.getStatus()===503);});
test('Storage scrittura fallita produce errore stabile e nessun successo',async()=>{const storage=new LocalFileStorage();const temp=await testRoot();storage.root=join(temp,'file');await writeFile(storage.root,'occupied');await assert.rejects(storage.write(png),e=>e.getStatus()===503&&e.getResponse().code==='storage_unavailable');});
test('DTO documenti: titolo Unicode, private default, input export e paginazione',()=>{assert.equal(plainToInstance(UploadDocumentDto,{name:' Prova '}).visibility,'private');assert.equal(validateSync(plainToInstance(UploadDocumentDto,{name:'😀'.repeat(160)})).length,0);assert(validateSync(plainToInstance(UploadDocumentDto,{name:'x',visibility:'public'})).length);assert(validateSync(plainToInstance(ExportDocumentsDto,{documentIds:[id,id]})).length);assert(validateSync(plainToInstance(ExportDocumentsDto,{documentIds:[]})).length);assert(validateSync(plainToInstance(ListDocumentsDto,{limit:'51'})).length);});
test('Privacy non superata da owner: soltanto uploader o home esplicita',async()=>{assert(!canReadDocument(doc(),'B'));assert(canReadDocument({...doc(),visibility:'home'},'B'));const service=new DocumentsService({document:{findUnique:async()=>doc()}},{},{require:async()=>owner});await assert.rejects(service.get('B',homeId,id),e=>e.getStatus()===403);await assert.rejects(service.get('A',randomUUID(),id),e=>e.getStatus()===403);});
test('Membership scaduta/revocata e viewer: policy controllata per azione',async()=>{const db={homeMembership:{findUnique:async()=>({...owner,role:'viewer'})}};const policy=new DocumentPolicy(db);await policy.require('A',homeId);await assert.rejects(policy.require('A',homeId,'edit'),e=>e.getStatus()===403);await assert.rejects(policy.require('A',homeId,'export'),e=>e.getStatus()===403);db.homeMembership.findUnique=async()=>({...owner,revokedAt:new Date()});await assert.rejects(policy.require('A',homeId),e=>e.getStatus()===403);});
test('Download rileva perdita/corruzione originale senza esporre byte',async()=>{const service=new DocumentsService({}, {read:async()=>Buffer.from('corrotto')},{require:async()=>owner});await assert.rejects(service.originalBytes(doc()),e=>e.getStatus()===503);});
test('Revoca durante lettura impedisce risposta binaria',async()=>{let calls=0;const service=new DocumentsService({document:{findUnique:async()=>doc()}},{read:async()=>png},{require:async()=>{if(++calls===2)throw{getStatus:()=>403};return owner;}});await assert.rejects(service.file('A',homeId,id),e=>e.getStatus()===403);});
test('Upload con storage guasto non avvia una scrittura DB',async()=>{let writes=0;const service=new DocumentsService({account:{findUnique:async()=>({requiresEmailVerification:false})},uploadRequest:{findUnique:async()=>null},$transaction:async()=>writes++},{write:async()=>{throw Error('storage guasto')}},{require:async()=>owner});await assert.rejects(service.upload('A',homeId,{name:'x',visibility:'private'},{buffer:png,originalname:'x.png'},randomUUID()));assert.equal(writes,0);});
test('Errore transazione: cleanup soltanto se il DB prova che il file non è referenziato',async()=>{let removed=0;const db={account:{findUnique:async()=>({requiresEmailVerification:false})},uploadRequest:{findUnique:async()=>null},storedFile:{findUnique:async()=>null},$transaction:async()=>{throw Error('rollback')}};const service=new DocumentsService(db,{write:async()=>id+'.bin',remove:async()=>removed++},{require:async()=>owner});const run=()=>service.upload('A',homeId,{name:'x',visibility:'private'},{buffer:png,originalname:'x.png'},randomUUID());await assert.rejects(run());assert.equal(removed,1);db.storedFile.findUnique=async()=>{throw Error('commit incerto')};await assert.rejects(run());assert.equal(removed,1);});
test('Export misto vietato: nessuna lettura file né ZIP parziale',async()=>{let reads=0;const service=new DocumentsService({document:{findMany:async()=>[doc()]}},{read:async()=>{reads++;return png;}},{require:async()=>owner});await assert.rejects(service.export('A',homeId,[id,randomUUID()]),e=>e.getStatus()===403);assert.equal(reads,0);});
test('ZIP reale include originale integro e manifesto senza chiavi storage',async()=>{const document=doc();const service=new DocumentsService({document:{findMany:async()=>[document]}},{read:async()=>png},{require:async()=>owner});const zip=await service.export('A',homeId,[id]);assert.equal(zip.readUInt32LE(0),0x04034b50);assert(zip.includes(png));assert(zip.includes(Buffer.from('manifest.json')));assert(zip.includes(Buffer.from(digest(png))));assert(!zip.includes(Buffer.from(document.original.file.storageKey)));});

test('Corruzione a dimensione invariata: hash blocca download e intero ZIP',async()=>{
  const corrupt=Buffer.from(png);corrupt[corrupt.length-1]^=1;
  const service=new DocumentsService({document:{findMany:async()=>[doc()]}},{read:async()=>corrupt},{require:async()=>owner});
  const unavailable=e=>e.getStatus()===503&&e.getResponse().code==='storage_unavailable';
  await assert.rejects(service.originalBytes(doc()),unavailable);
  await assert.rejects(service.export('A',homeId,[id]),unavailable);
});

test('Export oltre limite rifiutato prima di leggere file',async()=>{
  let reads=0;const document=doc();document.original.byteSize=100*1024*1024+1;
  const service=new DocumentsService({document:{findMany:async()=>[document]}},{read:async()=>{reads++;return png;}},{require:async()=>owner});
  await assert.rejects(service.export('A',homeId,[id]),e=>e.getStatus()===413&&e.getResponse().code==='export_too_large');
  assert.equal(reads,0);
});

test('Export concorrenti limitati: guasto libera entrambi gli slot per un nuovo tentativo',async()=>{
  const pending=[];let fail=true;
  const service=new DocumentsService({document:{findMany:async()=>[doc()]}},{read:()=>fail?new Promise((resolve,reject)=>pending.push({resolve,reject})):Promise.resolve(png)},{require:async()=>owner});
  const first=service.export('A',homeId,[id]),second=service.export('A',homeId,[id]);
  const checks=[assert.rejects(first,e=>e.getStatus()===503),assert.rejects(second,e=>e.getStatus()===503)];
  // Wait for both requests to hold a slot at the IO boundary.
  for(let turn=0;pending.length<2&&turn<10;turn++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(pending.length,2);
  await assert.rejects(service.export('A',homeId,[id]),e=>e.getStatus()===429);
  for(const item of pending)item.reject(storageUnavailable());
  await Promise.all(checks);fail=false;
  assert.equal((await service.export('A',homeId,[id])).readUInt32LE(0),0x04034b50);
});
