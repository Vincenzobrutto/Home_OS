const {test}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client');const {assertDevelopmentDatabase}=require('../dist/prisma.service');const {digest}=require('../dist/security');
const base='http://127.0.0.1:3001/api/v5',origin='http://127.0.0.1:5174';
const {png,pdf,jpeg}=require('./document-fixtures.cjs');
class Browser {
  cookie='';csrf='';accountId='';
  async request(path,method='GET',data,extra={}) {
    const multipart=data instanceof FormData;
    const response=await fetch(base+path,{method,headers:{Origin:origin,...(this.cookie?{Cookie:this.cookie}:{}),...(this.accountId?{'X-Account-Context':this.accountId}:{}),...(method==='GET'?{}:{'X-CSRF-Token':this.csrf,...(multipart?{}:{'Content-Type':'application/json'})}),...extra},body:data===undefined?undefined:multipart?data:JSON.stringify(data),signal:AbortSignal.timeout(20000)});
    const cookie=response.headers.getSetCookie()[0];if(cookie)this.cookie=cookie.split(';')[0];
    const json=(response.headers.get('content-type')??'').includes('application/json');
    const body=response.status===204?null:json?await response.json():Buffer.from(await response.arrayBuffer());
    if(path==='/session'&&response.status===200)this.csrf=body.csrfToken;
    if(body?.account?.id)this.accountId=body.account.id;
    return{status:response.status,body,headers:response.headers};
  }
  upload(homeId,bytes,name='originale.png',visibility='private',key=randomUUID(),filename='originale.png') {
    const form=new FormData();form.set('name',name);form.set('visibility',visibility);form.set('file',new Blob([bytes],{type:'application/octet-stream'}),filename);
    return this.request(`/homes/${homeId}/documents`,'POST',form,{'Idempotency-Key':key});
  }
}
function zipEntries(buffer){
  const entries=new Map();let eocd=-1;
  for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--){if(buffer.readUInt32LE(i)===0x06054b50){eocd=i;break;}}
  assert(eocd>=0);let offset=buffer.readUInt32LE(eocd+16);const count=buffer.readUInt16LE(eocd+10);
  for(let n=0;n<count;n++){assert.equal(buffer.readUInt32LE(offset),0x02014b50);assert.equal(buffer.readUInt16LE(offset+10),0);const size=buffer.readUInt32LE(offset+20),nameLen=buffer.readUInt16LE(offset+28),extraLen=buffer.readUInt16LE(offset+30),commentLen=buffer.readUInt16LE(offset+32),local=buffer.readUInt32LE(offset+42);const name=buffer.subarray(offset+46,offset+46+nameLen).toString('utf8');const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28);entries.set(name,buffer.subarray(start,start+size));offset+=46+nameLen+extraLen+commentLen;}
  return entries;
}
test('documents-v1 — API/PostgreSQL/storage reali, originali e privacy',{timeout:90000},async t=>{
  assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
  const A=new Browser(),B=new Browser(),tag=randomUUID(),password='Password documenti locale 123!';let homeA,otherA,homeB,privateDoc,sharedDoc,key,privateB;
  await t.test('Setup sintetico: account A/B, due Home A, Home B',async()=>{
    for(const [browser,name] of [[A,'A'],[B,'B']]){await browser.request('/session');assert.equal((await browser.request('/auth/register','POST',{name:`Documenti ${name}`,email:`${tag}-${name}@example.test`,password})).status,201);await browser.request('/session');}
    async function home(browser,name){const r=await browser.request('/homes','POST',{name,address:'Via Sintetica'},{'Idempotency-Key':randomUUID()});assert.equal(r.status,201);return r.body.home.id;}
    homeA=await home(A,'Documenti Casa A');otherA=await home(A,'Documenti Altra A');homeB=await home(B,'Documenti Casa B');
  });
  await t.test('Upload private e retry idempotente: un originale integro, fonte e hash',async()=>{
    key=randomUUID();const r=await A.upload(homeA,png,'Immagine privata','private',key);assert.equal(r.status,201,JSON.stringify(r.body));privateDoc=r.body.document;
    assert.equal(privateDoc.sha256,digest(png));assert.equal(privateDoc.mimeType,'image/png');assert.equal(privateDoc.status,'stored');assert.equal(privateDoc.visibility,'private');assert.equal(privateDoc.storageKey,undefined);
    const again=await A.upload(homeA,png,'Immagine privata','private',key);assert.equal(again.status,201);assert.equal(again.body.document.id,privateDoc.id);
    const conflict=await A.upload(homeA,png,'Titolo diverso','private',key);assert.equal(conflict.status,409);assert.equal(conflict.body.error.code,'idempotency_conflict');
    assert.equal((await A.request(`/homes/${homeA}/documents`)).body.items.length,1);
    const original=await A.request(`/homes/${homeA}/documents/${privateDoc.id}/file`);assert.equal(original.status,200);assert.deepEqual(original.body,png);assert.match(original.headers.get('content-disposition'),/attachment/);assert.equal(original.headers.get('cache-control'),'no-store');
  });
  await t.test('PDF e JPEG originali, home esplicita e nomi sicuri',async()=>{
    const r=await A.upload(homeA,pdf,'PDF condiviso','home',randomUUID(),'../../fascicolò.pdf');assert.equal(r.status,201,JSON.stringify(r.body));sharedDoc=r.body.document;assert.equal(sharedDoc.originalFilename,'fascicolò.pdf');assert.equal(sharedDoc.mimeType,'application/pdf');
    const image=await A.upload(homeA,jpeg,'Foto','private',randomUUID(),'foto.jpg');assert.equal(image.status,201,JSON.stringify(image.body));assert.equal(image.body.document.mimeType,'image/jpeg');
    for(const [doc,bytes] of [[sharedDoc,pdf],[image.body.document,jpeg]])assert.deepEqual((await A.request(`/homes/${homeA}/documents/${doc.id}/file`)).body,bytes);
  });
  await t.test('Due upload concorrenti con la stessa chiave restituiscono un solo documento',async()=>{
    const before=await db.document.count({where:{homeId:homeA}}),concurrentKey=randomUUID();
    const [one,two]=await Promise.all([A.upload(homeA,png,'Concorrente','private',concurrentKey),A.upload(homeA,png,'Concorrente','private',concurrentKey)]);
    assert.equal(one.status,201,JSON.stringify(one.body));assert.equal(two.status,201,JSON.stringify(two.body));assert.equal(one.body.document.id,two.body.document.id);assert.equal(await db.document.count({where:{homeId:homeA}}),before+1);
  });
  await t.test('Account/casa/context distinti: lista, dettaglio e file vietati',async()=>{
    for(const path of [`/homes/${homeA}/documents`,`/homes/${homeA}/documents/${privateDoc.id}`,`/homes/${homeA}/documents/${privateDoc.id}/file`])assert.equal((await B.request(path)).status,403);
    assert.equal((await A.request(`/homes/${otherA}/documents/${privateDoc.id}`)).status,403);assert.equal((await A.request(`/homes/${homeA}/documents/${randomUUID()}`)).status,403);
    const changed=await A.request(`/homes/${homeA}/documents`,'GET',undefined,{'X-Account-Context':B.accountId});assert.equal(changed.status,401);assert.equal(changed.body.error.code,'account_context_changed');
    assert.equal((await A.request(`/homes/${homeA}/documents/not-a-uuid`)).status,422);
    assert.equal((await B.request(`/homes/${homeB}/documents`)).body.items.length,0);
  });
  await t.test('Membro B vede home ma non private A; owner A non vede private B',async()=>{
    await db.homeMembership.create({data:{accountId:B.accountId,homeId:homeA,role:'member',validFrom:new Date()}});
    const list=await B.request(`/homes/${homeA}/documents`);assert.equal(list.status,200);assert.deepEqual(list.body.items.map(d=>d.id),[sharedDoc.id]);
    assert.equal((await B.request(`/homes/${homeA}/documents/${privateDoc.id}/file`)).status,403);assert.deepEqual((await B.request(`/homes/${homeA}/documents/${sharedDoc.id}/file`)).body,pdf);
    const own=await B.upload(homeA,png,'Privato B');assert.equal(own.status,201);privateB=own.body.document;
    assert.equal((await A.request(`/homes/${homeA}/documents/${privateB.id}`)).status,403);assert(!(await A.request(`/homes/${homeA}/documents`)).body.items.some(d=>d.id===privateB.id));
  });
  await t.test('Paginazione senza duplicati, cursor altro account/casa rifiutato',async()=>{
    const first=await A.request(`/homes/${homeA}/documents?limit=1`);assert.equal(first.status,200);assert(first.body.nextCursor);const second=await A.request(`/homes/${homeA}/documents?limit=1&cursor=${encodeURIComponent(first.body.nextCursor)}`);assert.equal(second.status,200);assert.notEqual(first.body.items[0].id,second.body.items[0].id);
    assert.equal((await B.request(`/homes/${homeA}/documents?cursor=${encodeURIComponent(first.body.nextCursor)}`)).status,422);assert.equal((await A.request(`/homes/${otherA}/documents?cursor=${encodeURIComponent(first.body.nextCursor)}`)).status,422);
  });
  await t.test('ZIP reale selettivo, manifest e rifiuto intero export misto',async()=>{
    const result=await A.request(`/homes/${homeA}/documents/export`,'POST',{documentIds:[privateDoc.id,sharedDoc.id]});assert.equal(result.status,200);assert.match(result.headers.get('content-type'),/application\/zip/);
    const entries=zipEntries(result.body),manifest=JSON.parse(entries.get('manifest.json').toString());assert.equal(entries.size,3);assert.equal(manifest.documents.length,2);assert.deepEqual(entries.get(`${privateDoc.id}-${privateDoc.originalFilename}`),png);assert.deepEqual(entries.get(`${sharedDoc.id}-${sharedDoc.originalFilename}`),pdf);
    assert(!result.body.includes(Buffer.from('storageKey')));assert.equal((await A.request(`/homes/${homeA}/documents/export`,'POST',{documentIds:[sharedDoc.id,privateB.id]})).status,403);
    assert.equal((await A.request(`/homes/${homeA}/documents/export`,'POST',{documentIds:[]})).status,422);
  });
  await t.test('Viewer legge condivisi, upload/ZIP negati; revoca blocca tutti i percorsi',async()=>{
    const where={accountId_homeId:{accountId:B.accountId,homeId:homeA}};await db.homeMembership.update({where,data:{role:'viewer'}});
    assert.equal((await B.request(`/homes/${homeA}/documents/${sharedDoc.id}/file`)).status,200);assert.equal((await B.upload(homeA,png)).status,403);assert.equal((await B.request(`/homes/${homeA}/documents/export`,'POST',{documentIds:[sharedDoc.id]})).status,403);
    await db.homeMembership.update({where,data:{revokedAt:new Date()}});
    for(const path of [`/homes/${homeA}/documents`,`/homes/${homeA}/documents/${sharedDoc.id}`,`/homes/${homeA}/documents/${sharedDoc.id}/file`])assert.equal((await B.request(path)).status,403);
    assert.equal((await B.upload(homeA,png)).status,403);
  });
  await t.test('File vuoto, HTML mascherato, dimensione e CSRF rifiutati senza nuovi record',async()=>{
    const before=await db.document.count({where:{homeId:homeA}});
    assert.equal((await A.upload(homeA,Buffer.alloc(0))).status,422);assert.equal((await A.upload(homeA,Buffer.from('<html>non PDF</html>'),'Spoof','private',randomUUID(),'fake.pdf')).status,415);
    const huge=await A.upload(homeA,Buffer.alloc(20*1024*1024+1));assert.equal(huge.status,413);assert.equal(huge.body.error.code,'file_too_large');
    const form=new FormData();form.set('file',new Blob([png]),'a.png');form.set('name','x');assert.equal((await A.request(`/homes/${homeA}/documents`,'POST',form,{'X-CSRF-Token':'bad','Idempotency-Key':randomUUID()})).status,403);
    assert.equal(await db.document.count({where:{homeId:homeA}}),before);
  });
  await t.test('Originale temporaneamente mancante: download/ZIP 503, mai successo parziale',async()=>{
    const {rename}=require('node:fs/promises'),{join,resolve}=require('node:path');
    const original=await db.documentVersion.findUnique({where:{documentId:privateDoc.id},include:{file:true}});assert.match(original.file.storageKey,/^[a-f0-9-]{36}\.bin$/);
    const root=resolve(__dirname,'../storage-private'),file=join(root,original.file.storageKey),hold=file+'.test-held';
    await rename(file,hold);
    try {
      const download=await A.request(`/homes/${homeA}/documents/${privateDoc.id}/file`);assert.equal(download.status,503);assert.equal(download.body.error.code,'storage_unavailable');assert(!JSON.stringify(download.body).includes(root));
      const zip=await A.request(`/homes/${homeA}/documents/export`,'POST',{documentIds:[sharedDoc.id,privateDoc.id]});assert.equal(zip.status,503);assert.equal(zip.body.error.code,'storage_unavailable');
    } finally {await rename(hold,file);}
    assert.deepEqual((await A.request(`/homes/${homeA}/documents/${privateDoc.id}/file`)).body,png);
  });
});
