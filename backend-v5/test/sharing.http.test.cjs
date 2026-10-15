require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),cookieParser=require('cookie-parser');
const {InfrastructureModule}=require('../dist/app.module'),{AuthModule}=require('../dist/auth/auth.module'),{HomesModule}=require('../dist/homes/homes.module'),{DocumentsModule}=require('../dist/documents/documents.module');
const {SharingHomeController,ReceivedSharesController,ShareClaimsController}=require('../dist/sharing/sharing.controller'),{SharingService}=require('../dist/sharing/sharing.service');
const {PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service'),{LocalFileStorage}=require('../dist/documents/storage'),{ApiErrorFilter}=require('../dist/main');
const baseline=new Date(),clock={now:()=>new Date(now)};let now=baseline;
class Harness{} Module({imports:[InfrastructureModule,AuthModule,HomesModule,DocumentsModule],controllers:[SharingHomeController,ReceivedSharesController,ShareClaimsController],providers:[SharingService,{provide:'SHARING_CLOCK',useValue:clock}]})(Harness);

test('C1 real HTTP/PostgreSQL/files: selective delivery without widening Home or economic rights',async t=>{
  assertDevelopmentDatabase(process.env.DATABASE_URL);const app=await NestFactory.create(Harness,{logger:false});app.setGlobalPrefix('api/v5');app.use(cookieParser());app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');next();});app.useGlobalFilters(new ApiErrorFilter());await app.listen(0,'127.0.0.1');
  const base=(await app.getUrl())+'/api/v5',db=app.get(PrismaService),storage=app.get(LocalFileStorage),accounts=[],homes=[];
  const ai=await db.aiAttempt.count(),economic=await db.economicAiAttempt.count();
  t.after(async()=>{
    now=baseline;
    const shares=await db.shareRecord.findMany({where:{homeId:{in:homes}},select:{id:true}});
    await db.shareEvent.deleteMany({where:{shareId:{in:shares.map(s=>s.id)}}});await db.shareRecord.deleteMany({where:{id:{in:shares.map(s=>s.id)}}});
    await db.sharePreview.deleteMany({where:{homeId:{in:homes}}});await db.shareRequest.deleteMany({where:{accountId:{in:accounts}}});
    const originals=await db.documentVersion.findMany({where:{document:{homeId:{in:homes}}},include:{file:true}});
    await db.uploadRequest.deleteMany({where:{homeId:{in:homes}}});await db.documentVersion.deleteMany({where:{id:{in:originals.map(v=>v.id)}}});
    await db.document.deleteMany({where:{homeId:{in:homes}}});await db.storedFile.deleteMany({where:{id:{in:originals.map(v=>v.fileId)}}});
    for(const v of originals)await storage.remove(v.file.storageKey);
    await db.home.deleteMany({where:{id:{in:homes}}});await db.account.deleteMany({where:{id:{in:accounts}}});await app.close();
  });
  class Client{
    cookie='';csrf='';id='';
    async req(path,method='GET',body,extra={}){
      const multipart=body instanceof FormData;
      const r=await fetch(base+path,{method,headers:{Origin:'http://127.0.0.1:5174',Cookie:this.cookie,...(this.id?{'X-Account-Context':this.id}:{}),...(method==='POST'?{'X-CSRF-Token':this.csrf,'Idempotency-Key':randomUUID(),...(!multipart?{'Content-Type':'application/json'}:{})}:{}),...extra},body:body===undefined?undefined:multipart?body:JSON.stringify(body)});
      if(r.headers.getSetCookie()[0])this.cookie=r.headers.getSetCookie()[0].split(';')[0];
      const data=r.headers.get('content-type')?.includes('application/json')?await r.json():Buffer.from(await r.arrayBuffer());
      if(path==='/session')this.csrf=data.csrfToken;if(data.account)this.id=data.account.id;
      return {status:r.status,data,headers:r.headers};
    }
    async init(){ok(await this.req('/session'));ok(await this.req('/auth/register','POST',{name:'C1 synthetic',email:randomUUID()+'@example.test',password:'C1-test-only-password-123'}),201);accounts.push(this.id);ok(await this.req('/session'));}
  }
  const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
  const a=new Client(),b=new Client(),c=new Client(),anonymous=new Client();let h,doc,otherDoc,external,claim,accepted,key,createBody,preview;
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9ZkAAAAASUVORK5CYII=','base64');
  const source=()=>({documentIds:[doc.id],recipient:{kind:'external'},durationDays:7});
  const prepare=async recipient=>ok(await a.req(`/homes/${h}/share-previews`,'POST',{...source(),...(recipient?{recipient}:{})}),201).preview;
  const create=async recipient=>{const p=await prepare(recipient);return ok(await a.req(`/homes/${h}/shares`,'POST',{previewId:p.id,expectedPreviewVersion:1,manifestFingerprint:p.manifestFingerprint,acknowledgedDocumentIds:p.items.map(i=>i.documentId)}),201).share;};
  const ownerPath=id=>`/homes/${h}/shares/${id}`;
  const upload=async(client,name)=>{const f=new FormData();f.set('name',name);f.set('visibility','private');f.set('file',new Blob([png]),'test.png');return ok(await client.req(`/homes/${h}/documents`,'POST',f),201).document;};
  await t.test('Authenticated setup; own private originals and no implicit sharing',async()=>{
    for(const client of [a,b,c])await client.init();h=ok(await a.req('/homes','POST',{name:'C1 isolated synthetic',address:'Synthetic'}),201).home.id;homes.push(h);
    await db.homeMembership.update({where:{accountId_homeId:{accountId:a.id,homeId:h}},data:{validFrom:new Date(0)}});
    await db.homeMembership.create({data:{accountId:b.id,homeId:h,role:'member',validFrom:new Date(0)}});
    doc=await upload(a,'C1 private original');otherDoc=await upload(b,'B personal original');
    assert.equal((await b.req(`/homes/${h}/documents/${doc.id}`)).status,403);
    const caps=ok(await a.req(`/homes/${h}/sharing-capabilities`));assert.equal(caps.externalPairing,true);assert.equal(caps.economy,false);assert.equal(caps.technicalData,false);
    const people=ok(await a.req(`/homes/${h}/sharing-recipients`)).items;assert.deepEqual(people.map(p=>p.id),[b.id]);assert.equal(people[0].identityVerified,false);
    const picker=ok(await a.req(`/homes/${h}/sharing-documents`)).items;assert(picker.some(i=>i.documentId===doc.id&&i.eligible));assert(!picker.some(i=>i.documentId===otherDoc.id));
    await db.document.update({where:{id:otherDoc.id},data:{visibility:'home'}});
    const visible=ok(await a.req(`/homes/${h}/sharing-documents`)).items.find(i=>i.documentId===otherDoc.id);assert.equal(visible.eligible,false);assert.equal(visible.ineligibleReason,'not_uploader');
    await db.document.update({where:{id:otherDoc.id},data:{visibility:'private'}});
  });
  await t.test('Strict input, source ownership, other Home, anonymous, CSRF and context',async()=>{
    for(const body of [{...source(),expenseIds:[randomUUID()]},{...source(),documentIds:[]},{...source(),documentIds:[doc.id,doc.id]},{...source(),recipient:{kind:'external',accountId:b.id}}])assert.equal((await a.req(`/homes/${h}/share-previews`,'POST',body)).status,422);
    assert.equal((await a.req(`/homes/${h}/share-previews`,'POST',{...source(),documentIds:[otherDoc.id]})).status,403);
    assert.equal((await c.req(`/homes/${h}/share-previews`,'POST',source())).status,403);
    assert.equal((await anonymous.req('/received-shares')).status,401);
    assert.equal((await a.req(`/homes/${h}/share-previews`,'POST',source(),{'X-CSRF-Token':'bad'})).status,403);
    assert.equal((await a.req(`/homes/${h}/shares`,'GET',undefined,{'X-Account-Context':b.id})).status,401);
    assert.equal((await a.req(`/homes/${h}/shares?limit=2&limit=3`)).status,422);
  });
  await t.test('Preview consent is bound; expired preview never grants access',async()=>{
    preview=await prepare();createBody={previewId:preview.id,expectedPreviewVersion:1,manifestFingerprint:preview.manifestFingerprint,acknowledgedDocumentIds:[doc.id]};
    assert.equal((await a.req(`/homes/${h}/shares`,'POST',{...createBody,manifestFingerprint:'0'.repeat(64)})).status,422);
    assert.equal((await a.req(`/homes/${h}/shares`,'POST',{...createBody,acknowledgedDocumentIds:[otherDoc.id]})).status,422);
    now=new Date(+baseline+600000);assert.equal((await a.req(`/homes/${h}/shares`,'POST',createBody)).status,409);now=baseline;
    assert.equal(await db.shareRecord.count({where:{homeId:h}}),0);preview=await prepare();createBody={...createBody,previewId:preview.id,manifestFingerprint:preview.manifestFingerprint};
  });
  await t.test('Concurrent create and lost response replay produce one invite, secret shown once',async()=>{
    key=randomUUID();const results=await Promise.all([a.req(`/homes/${h}/shares`,'POST',createBody,{'Idempotency-Key':key}),a.req(`/homes/${h}/shares`,'POST',createBody,{'Idempotency-Key':key})]);
    const rows=results.map(r=>ok(r,201).share);assert.equal(rows[0].id,rows[1].id);external=rows.find(s=>s.pairing.code);assert(external);assert.equal(rows.filter(s=>s.pairing.code===null).length,1);
    assert.equal(await db.shareRecord.count({where:{homeId:h}}),1);assert.equal(external.state,'awaiting_pairing');
    const stored=JSON.stringify(await db.shareRecord.findUnique({where:{id:external.id}}))+JSON.stringify(await db.shareRequest.findMany({where:{accountId:a.id}}));assert(!stored.includes(external.pairing.code));
    assert.equal((await a.req(`/homes/${h}/shares`,'POST',createBody)).status,409);
  });
  await t.test('External claim grants no file; other account and used code denied',async()=>{
    await db.homeMembership.update({where:{accountId_homeId:{accountId:b.id,homeId:h}},data:{revokedAt:baseline}});
    assert.equal((await b.req(`/received-shares/${external.id}`)).status,403);
    const claimKey=randomUUID(),body={code:external.pairing.code,discloseAccount:true};claim=ok(await b.req('/sharing/code-claims','POST',body,{'Idempotency-Key':claimKey}),201).share;
    assert.equal(claim.state,'awaiting_confirmation');assert.deepEqual(claim.items,[]);assert(claim.comparison.code);assert.equal(claim.pairing,null);
    assert(!JSON.stringify(claim).includes(doc.id));assert(!JSON.stringify(claim).includes('C1 private original'));assert(!Object.hasOwn(claim,'homeId'));
    assert.equal((await c.req('/sharing/code-claims','POST',body)).status,403);
    assert.equal(ok(await b.req('/sharing/code-claims','POST',body,{'Idempotency-Key':claimKey}),201).share.comparison.claimId,claim.comparison.claimId);
    assert.equal((await b.req(`/received-shares/${external.id}/documents/${doc.id}/file`)).status,403);
  });
  await t.test('Claim/version/comparison bound approval; recipient must still accept',async()=>{
    const owner=ok(await a.req(ownerPath(external.id))).share;
    const body={expectedVersion:owner.version,claimId:owner.pairing.claim.id,comparisonCode:owner.pairing.claim.comparisonCode,confirmRecipient:true};
    assert.equal((await a.req(ownerPath(external.id)+'/confirm-pairing','POST',{...body,comparisonCode:'22222222'})).status,409);
    assert.equal((await a.req(ownerPath(external.id)+'/confirm-pairing','POST',{...body,claimId:randomUUID()})).status,409);
    const pending=ok(await a.req(ownerPath(external.id)+'/confirm-pairing','POST',body)).share;assert.equal(pending.state,'pending');
    const receiver=ok(await b.req(`/received-shares/${pending.id}`)).share;assert.deepEqual(receiver.items,[]);assert(receiver.permissions.includes('accept'));
    assert.equal((await b.req(`/received-shares/${pending.id}/documents/${doc.id}/file`)).status,403);
  });
  await t.test('Accept/retry returns one real original without Home/Document access or economic rows',async()=>{
    const pending=ok(await b.req(`/received-shares/${external.id}`)).share,acceptKey=randomUUID(),body={expectedVersion:pending.version};
    accepted=ok(await b.req(`/received-shares/${external.id}/accept`,'POST',body,{'Idempotency-Key':acceptKey})).share;
    assert.equal(accepted.state,'accepted');assert.equal(accepted.items.length,1);
    assert.equal(ok(await b.req(`/received-shares/${external.id}/accept`,'POST',body,{'Idempotency-Key':acceptKey})).share.version,accepted.version);
    const file=await b.req(`/received-shares/${external.id}/documents/${doc.id}/file`);assert.deepEqual(ok(file),png);assert.equal(file.headers.get('cache-control'),'no-store');assert.match(file.headers.get('content-disposition'),/^attachment/);
    assert.equal((await b.req(`/homes/${h}`)).status,403);assert.equal((await b.req(`/homes/${h}/documents/${doc.id}/file`)).status,403);
    assert.equal((await b.req(`/received-shares/${external.id}/documents/${otherDoc.id}/file`)).status,403);assert.equal((await anonymous.req(`/received-shares/${external.id}/documents/${doc.id}/file`)).status,401);
    assert.equal(await db.homeExpense.count({where:{homeId:h}}),0);
  });
  await t.test('Source replacement redacts contents; no cached source IDs in replay',async()=>{
    const v=await db.documentVersion.findUnique({where:{documentId:doc.id}});await db.documentVersion.update({where:{id:v.id},data:{sha256:'f'.repeat(64)}});
    const hidden=ok(await b.req(`/received-shares/${external.id}`)).share;assert.equal(hidden.state,'unavailable');assert(!JSON.stringify(hidden).includes(doc.id));assert.equal(hidden.senderName,null);assert.deepEqual(hidden.permissions,[]);
    assert.equal((await b.req(`/received-shares/${external.id}/documents/${doc.id}/file`)).status,403);
    const replay=ok(await a.req(`/homes/${h}/shares`,'POST',createBody,{'Idempotency-Key':key}),201).share;assert.equal(replay.state,'unavailable');assert.deepEqual(replay.items,[]);
    await db.documentVersion.update({where:{id:v.id},data:{sha256:v.sha256}});
  });
  await t.test('Revocation stops recipient access and replays without changing original visibility',async()=>{
    const r=ok(await a.req(ownerPath(external.id)+'/revoke','POST',{expectedVersion:accepted.version})).share;assert.equal(r.state,'revoked');
    assert.equal((await b.req(`/received-shares/${external.id}/documents/${doc.id}/file`)).status,403);
    const replay=ok(await a.req(`/homes/${h}/shares`,'POST',createBody,{'Idempotency-Key':key}),201).share;assert.equal(replay.state,'revoked');assert.equal(replay.pairing,null);assert.deepEqual(replay.items,[]);
    assert.equal((await db.document.findUnique({where:{id:doc.id}})).visibility,'private');
  });
  await t.test('Code rotation invalidates old claimant and secret, without another share',async()=>{
    const s=await create(),oldCode=s.pairing.code,claimed=ok(await c.req('/sharing/code-claims','POST',{code:oldCode,discloseAccount:true}),201).share;
    const rotated=ok(await a.req(ownerPath(s.id)+'/rotate-code','POST',{expectedVersion:claimed.version})).share;
    assert(rotated.pairing.code);assert.notEqual(rotated.pairing.code,oldCode);assert.equal(rotated.state,'awaiting_pairing');
    assert.equal((await c.req(`/received-shares/${s.id}`)).status,403);
    assert.equal((await b.req('/sharing/code-claims','POST',{code:oldCode,discloseAccount:true})).status,403);
    const next=ok(await b.req('/sharing/code-claims','POST',{code:rotated.pairing.code,discloseAccount:true}),201).share;assert.notEqual(next.comparison.claimId,claimed.comparison.claimId);
  });
  await t.test('Member-only grant and decline are distinct; stale concurrent action rejected',async()=>{
    await db.homeMembership.update({where:{accountId_homeId:{accountId:b.id,homeId:h}},data:{revokedAt:null}});const s=await create({kind:'member',accountId:b.id});
    const replies=await Promise.all([b.req(`/received-shares/${s.id}/accept`,'POST',{expectedVersion:s.version}),b.req(`/received-shares/${s.id}/decline`,'POST',{expectedVersion:s.version})]);
    assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);
    const second=await create({kind:'member',accountId:b.id});const declined=ok(await b.req(`/received-shares/${second.id}/decline`,'POST',{expectedVersion:second.version})).share;assert.equal(declined.state,'declined');assert.deepEqual(declined.items,[]);
  });
  await t.test('Exact expiry, code expiry, claimant expiry and membership revocation fail closed',async()=>{
    const s=await create({kind:'member',accountId:b.id});ok(await b.req(`/received-shares/${s.id}/accept`,'POST',{expectedVersion:s.version}));
    now=new Date(s.expiresAt);assert.equal(ok(await b.req(`/received-shares/${s.id}`)).share.state,'expired');assert.equal((await b.req(`/received-shares/${s.id}/documents/${doc.id}/file`)).status,403);now=baseline;
    const code=await create();now=new Date(+baseline+900000);assert.equal((await b.req('/sharing/code-claims','POST',{code:code.pairing.code,discloseAccount:true})).status,403);now=baseline;
    await db.homeMembership.update({where:{accountId_homeId:{accountId:a.id,homeId:h}},data:{revokedAt:baseline}});
    const hidden=ok(await b.req(`/received-shares/${s.id}`)).share;assert.equal(hidden.state,'unavailable');assert.deepEqual(hidden.items,[]);assert.equal((await a.req(ownerPath(s.id))).status,403);
    await db.homeMembership.update({where:{accountId_homeId:{accountId:a.id,homeId:h}},data:{revokedAt:null}});
  });
  await t.test('Keyset pagination bound to account and sender/recipient context',async()=>{
    const first=ok(await a.req(`/homes/${h}/shares?limit=1`));assert(first.nextCursor);
    assert.equal((await a.req('/received-shares?cursor='+first.nextCursor)).status,422);
    assert.equal((await b.req('/received-shares?cursor='+first.nextCursor)).status,422);
    const second=ok(await a.req(`/homes/${h}/shares?limit=1&cursor=${first.nextCursor}`));assert.notEqual(first.items[0].id,second.items[0].id);
    assert.equal((await a.req(`/homes/${h}/shares?unknown=1`)).status,422);
  });
  await t.test('Viewer cannot share own original and expired claimant cannot disclose or approve',async()=>{
    await db.homeMembership.update({where:{accountId_homeId:{accountId:b.id,homeId:h}},data:{role:'viewer'}});
    assert.deepEqual(ok(await b.req(`/homes/${h}/sharing-capabilities`)).permissions,[]);
    assert.equal((await b.req(`/homes/${h}/share-previews`,'POST',{documentIds:[otherDoc.id],recipient:{kind:'external'},durationDays:1})).status,403);
    await db.homeMembership.update({where:{accountId_homeId:{accountId:b.id,homeId:h}},data:{role:'member'}});
    const s=await create(),claimed=ok(await b.req('/sharing/code-claims','POST',{code:s.pairing.code,discloseAccount:true}),201).share;
    now=new Date(claimed.comparison.expiresAt);
    const hidden=ok(await b.req(`/received-shares/${s.id}`)).share;assert.equal(hidden.state,'unavailable');assert.equal(hidden.comparison,null);assert.deepEqual(hidden.items,[]);
    const owner=ok(await a.req(ownerPath(s.id))).share;assert(!owner.permissions.includes('confirm_pairing'));assert(owner.permissions.includes('rotate_code'));now=baseline;
  });
  await t.test('Persistent rate limit counts failed guesses; no paid AI or quota reset',async()=>{
    now=new Date(+baseline+60000);
    const guessed=require('../dist/sharing/domain').randomCode(10);
    for(let i=0;i<5;i++)assert.equal((await c.req('/sharing/code-claims','POST',{code:guessed,discloseAccount:true})).status,403);
    const limited=await c.req('/sharing/code-claims','POST',{code:guessed,discloseAccount:true});assert.equal(limited.status,429);assert.equal(limited.data.error.code,'share_try_later');
    assert.equal(await db.aiAttempt.count(),ai);assert.equal(await db.economicAiAttempt.count(),economic);
  });
});
