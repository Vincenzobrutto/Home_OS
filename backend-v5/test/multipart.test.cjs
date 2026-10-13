require('reflect-metadata');
const {test}=require('node:test');const assert=require('node:assert/strict');
const {Readable}=require('node:stream');const multer=require('multer');
const {png}=require('./document-fixtures.cjs');
const {DOCUMENT_UPLOAD_LIMITS}=require('../dist/documents/documents.controller');
async function multipart(fields,files=1){
  const boundary='dimora-test-boundary';const chunks=[];
  for(const [name,value] of fields)chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  for(let i=0;i<files;i++){chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="prova.png"\r\nContent-Type: image/png\r\n\r\n`),png,Buffer.from('\r\n'));}
  chunks.push(Buffer.from(`--${boundary}--\r\n`));const body=Buffer.concat(chunks);
  const req=Readable.from([body]);req.headers={'content-type':`multipart/form-data; boundary=${boundary}`,'content-length':String(body.length)};
  const middleware=multer({limits:DOCUMENT_UPLOAD_LIMITS}).single('file');
  await new Promise((resolve,reject)=>middleware(req,{},error=>error?reject(error):resolve()));return req;
}
test('Parser multipart reale accetta file, titolo e visibilità insieme',async()=>{
  const req=await multipart([['name','Originale'],['visibility','private']]);assert.equal(req.body.name,'Originale');assert.equal(req.body.visibility,'private');assert.deepEqual(req.file.buffer,png);
});
test('Parser multipart reale rifiuta un terzo campo o un secondo file',async()=>{
  await assert.rejects(multipart([['name','Originale'],['visibility','private'],['extra','non ammesso']]),e=>e.code==='LIMIT_FIELD_COUNT');
  await assert.rejects(multipart([['name','Originale']],2),e=>e.code==='LIMIT_FILE_COUNT');
});
