require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,randomBytes}=require('node:crypto');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {PersonalExportService}=require('../dist/personal-export/personal-export.service'),{DocumentPolicy}=require('../dist/documents/access');
const {digest,hashPassword,SessionsService,COOKIE}=require('../dist/security');
const base='http://127.0.0.1:3001/api/v5',origin='http://127.0.0.1:5174';
test('personal-export-v1: real HTTP/DB, synthetic isolated accounts and fresh privacy checks',{timeout:90000},async t=>{
  assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
  const tag=randomUUID(),passwordHash=await hashPassword('Synthetic export fixture 123!');
  const a=await db.account.create({data:{name:'Export A',email:`export-a-${tag}@example.test`,passwordHash}}),b=await db.account.create({data:{name:'Export B secret',email:`export-b-${tag}@example.test`,passwordHash}});
  const home=await db.home.create({data:{name:'Export synthetic home',address:'Via Fixture',memberships:{create:[{accountId:a.id,role:'owner'},{accountId:b.id,role:'member'}]}}}),other=await db.home.create({data:{name:'Other home secret',address:'Other',memberships:{create:{accountId:b.id,role:'owner'}}}});
  async function session(account){const raw=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');await db.session.create({data:{id:digest(raw),accountId:account.id,csrfToken:csrf,expiresAt:new Date(Date.now()+3600000)}});return{account,raw,csrf};}
  const A=await session(a),B=await session(b),owned={accountId:a.id,homeId:home.id};
  // Metadata-only synthetic fixtures intentionally have no physical file: JSON export
  // must not read originals or imply their availability; product admission is untouched.
  async function document(account,name,visibility='private'){return db.document.create({data:{homeId:home.id,uploaderId:account.id,name,visibility,original:{create:{originalFilename:'fixture.pdf',mimeType:'application/pdf',byteSize:16,sha256:'a'.repeat(64),file:{create:{storageKey:randomUUID()+'.bin'}}}}},include:{original:true}});}
  const doc=await document(a,'Owned document'),foreign=await document(b,'Foreign document secret','home');
  const source=d=>({documentId:d.id,documentVersion:1,documentSha256:d.original.sha256,page:1,excerpt:d.id===doc.id?'Own evidence':'Foreign evidence secret'});
  const boiler=await db.boilerAsset.create({data:{...owned,name:'Own boiler',confirmed:{brand:{fieldKey:'brand',value:{kind:'text',text:'Own brand'},revision:1,origin:'proposal_accepted',sources:[source(doc)],note:null,confirmationId:randomUUID(),confirmedAt:new Date().toISOString()}}}});
  const mixed=await db.boilerAsset.create({data:{...owned,name:'Mixed readable boiler',confirmed:{brand:{fieldKey:'brand',value:{kind:'text',text:'Own confirmed value'},revision:1,origin:'proposal_accepted',sources:[source(foreign)],note:null,confirmationId:randomUUID(),confirmedAt:new Date().toISOString()}}}});
  for(const [asset,d] of [[boiler,doc],[mixed,foreign]])await db.analysisJob.create({data:{...owned,assetId:asset.id,state:'succeeded',documents:[{documentId:d.id,documentVersion:1,documentSha256:d.original.sha256}]}});
  const object=await db.homeObject.create({data:{...owned,name:'Archived own object',type:'other',state:'archived'}}),room=await db.homeRoom.create({data:{homeId:home.id,name:'Room included',type:'other',note:'Common room secret'}});
  await db.objectPosition.create({data:{...owned,objectId:object.id,roomIds:[room.id]}});
  const activity=await db.homeActivity.create({data:{...owned,title:'Original activity',assetId:mixed.id,state:'completed',dueDate:'2026-10-17'}}),work=await db.economicWork.create({data:{...owned,name:'Archived work',state:'archived',activityId:activity.id}});
  const expense=await db.homeExpense.create({data:{...owned,title:'Archived expense',amountCents:12345,spentOn:'2026-10-16',state:'archived',documentId:foreign.id,assetId:mixed.id,workId:work.id,economicProvenance:{amountCents:{origin:'extraction_confirmed',sources:[{...source(doc),sha256:doc.original.sha256,documentSha256:undefined} ]}}}});
  await db.homeExpense.create({data:{accountId:b.id,homeId:home.id,title:'Foreign cost secret',amountCents:999,spentOn:'2026-10-16'}});
  await db.homeObject.create({data:{accountId:b.id,homeId:home.id,name:'Foreign object secret',type:'other'}});
  await db.expenseHistory.create({data:{accountId:a.id,expenseId:expense.id,kind:'updated',before:{title:'Before',amountCents:10,documentId:foreign.id,documentLink:{name:'Foreign snapshot secret'},token:'Hidden history secret'},after:{...expense,createdAt:expense.createdAt.toISOString(),updatedAt:expense.updatedAt.toISOString(),hidden:'Hidden history secret'}}});
  await db.activityHistory.create({data:{accountId:a.id,activityId:activity.id,kind:'future_event',after:{title:'Future event secret'}}});
  const foreignLink=await db.objectResourceLink.create({data:{...owned,objectId:object.id,resourceType:'document',resourceId:foreign.id,documentId:foreign.id,state:'removed'}});
  await db.objectEvent.create({data:{...owned,targetKind:'object',targetId:object.id,kind:'unlinked',after:{kind:'link',row:foreignLink}}});
  await db.objectResourceLink.create({data:{...owned,objectId:object.id,resourceType:'document',resourceId:doc.id,documentId:doc.id}});
  const policy=new DocumentPolicy(db),service=new PersonalExportService(db,policy);
  async function http(who,homeId=home.id,{headers={},body={}}={}){const r=await fetch(`${base}/homes/${homeId}/personal-export`,{method:'POST',headers:{Origin:origin,Cookie:`${COOKIE}=${who.raw}`,'X-CSRF-Token':who.csrf,'X-Account-Context':who.account.id,'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});return{status:r.status,headers:r.headers,text:await r.text()};}
  const auth=()=>Promise.resolve();
  await t.test('An empty authorized home exports empty datasets without creating canonical data',async()=>{
    const empty=await db.home.create({data:{name:'Empty export fixture',address:'Via Fixture',memberships:{create:{accountId:a.id,role:'owner'}}}});
    const before=await Promise.all([db.document.count(),db.homeExpense.count(),db.economicWork.count(),db.homeActivity.count(),db.objectRequest.count()]);
    const r=await http(A,empty.id);assert.equal(r.status,200,r.text);const out=JSON.parse(r.text);for(const values of Object.values(out.data))assert.deepEqual(values,[]);
    assert.deepEqual(await Promise.all([db.document.count(),db.homeExpense.count(),db.economicWork.count(),db.homeActivity.count(),db.objectRequest.count()]),before);
  });
  await t.test('Real attachment contains own archived resources, exact cents/dates, no foreign references or secrets',async()=>{
    const r=await http(A);assert.equal(r.status,200,r.text);assert.match(r.headers.get('content-disposition'),/attachment; filename="dimora-casa-/);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-content-type-options'),'nosniff');
    const out=JSON.parse(r.text);assert.equal(out.formatVersion,1);assert.equal(out.data.objects[0].state,'archived');assert.equal(out.data.expenses[0].amountCents,12345);assert.equal(out.data.expenses[0].spentOn,'2026-10-16');assert.equal(out.data.expenses[0].documentId,null);assert.equal(out.data.expenses[0].provenance.amountCents.sources[0].documentId,doc.id);assert.equal(out.data.links.length,1);assert.equal(out.data.technicalAssets.length,2);assert.equal(out.data.rooms.length,1);
    for(const excluded of [foreign.id,b.id,b.email,'secret','passwordHash','storageKey','analysisDraftId','confirmationId','leaseToken'])assert(!r.text.includes(excluded),excluded);
    assert(out.limitations.includes('some_references_excluded'));assert(out.limitations.includes('some_history_snapshots_unavailable'));assert(out.limitations.includes('document_physical_availability_not_checked'));
  });
  await t.test('Same-home owner/member cannot export one another, other home/viewer/expired membership/context/CSRF/body denied',async()=>{
    const bResult=await http(B);assert.equal(bResult.status,200);assert(!bResult.text.includes(object.id));assert(!bResult.text.includes(doc.id));
    assert.equal((await http(A,other.id)).status,403);assert.equal((await http(A,home.id,{headers:{'X-CSRF-Token':'bad'}})).status,403);assert.equal((await http(A,home.id,{headers:{'X-Account-Context':b.id}})).status,401);assert.equal((await http(A,home.id,{headers:{'X-Account-Context':''}})).status,401);assert.equal((await http(A,home.id,{body:{accountId:b.id}})).status,422);
    const where={accountId_homeId:{accountId:a.id,homeId:home.id}};await db.homeMembership.update({where,data:{role:'viewer'}});assert.equal((await http(A)).status,403);await db.homeMembership.update({where,data:{role:'owner',validUntil:new Date(0)}});assert.equal((await http(A)).status,403);await db.homeMembership.update({where,data:{validUntil:null}});
  });
  await t.test('Revoked source hides technical asset and all current/historical identifiers, preserving own cost',async()=>{
    await db.document.update({where:{id:foreign.id},data:{visibility:'private'}});
    const out=JSON.parse((await service.export(a.id,home.id,auth)).toString());assert.equal(out.data.technicalAssets.length,1);assert.equal(out.data.expenses[0].assetId,null);assert.equal(out.data.activities[0].assetId,null);assert(!JSON.stringify(out).includes(mixed.id));assert(!JSON.stringify(out).includes(foreign.id));
    await db.document.update({where:{id:foreign.id},data:{visibility:'home'}});
  });
  function afterSnapshot(action){let done=false;const facade={$transaction:async(fn,options)=>{const out=await db.$transaction(fn,options);if(options?.isolationLevel==='RepeatableRead'&&!done){done=true;await action();}return out;}};return new PersonalExportService(facade,policy);}
  await t.test('Membership revoked after snapshot is denied using a fresh read; next attempt recovers',async()=>{
    const where={accountId_homeId:{accountId:a.id,homeId:home.id}},racing=afterSnapshot(()=>db.homeMembership.update({where,data:{revokedAt:new Date()}}));
    await assert.rejects(racing.export(a.id,home.id,auth),e=>e.getStatus()===403);await db.homeMembership.update({where,data:{revokedAt:null}});assert((await racing.export(a.id,home.id,auth)).length>0);
  });
  await t.test('Source visibility revoked after snapshot blocks the whole attachment, not a stale copy',async()=>{
    const racing=afterSnapshot(()=>db.document.update({where:{id:foreign.id},data:{visibility:'private'}}));
    await assert.rejects(racing.export(a.id,home.id,auth),e=>e.getStatus()===403);await db.document.update({where:{id:foreign.id},data:{visibility:'home'}});
  });
  await t.test('Logout after snapshot cannot deliver; session invalidation is real DB state',async()=>{
    const fresh=await session(a),sessions=new SessionsService(db),req={cookies:{[COOKIE]:fresh.raw},headers:{origin,'x-account-context':a.id,'x-csrf-token':fresh.csrf}};
    const racing=afterSnapshot(()=>db.session.delete({where:{id:digest(fresh.raw)}}));await assert.rejects(racing.export(a.id,home.id,()=>sessions.require(req,true)),e=>e.getStatus()===401);
  });
  await t.test('RepeatableRead keeps later datasets consistent with the initial snapshot during concurrent edits',async()=>{
    let changed=false;const facade={$transaction:(fn,options)=>db.$transaction(tx=>fn(new Proxy(tx,{get(target,key){if(key!=='homeObject')return target[key];return new Proxy(target.homeObject,{get(delegate,method){if(method!=='findMany')return delegate[method];return async args=>{const rows=await delegate.findMany(args);if(!changed){changed=true;await db.homeActivity.update({where:{id:activity.id},data:{title:'Concurrent newer activity'}});await db.homeExpense.update({where:{id:expense.id},data:{amountCents:54321}});}return rows;};}});}})),options)};
    const consistent=JSON.parse((await new PersonalExportService(facade,policy).export(a.id,home.id,auth)).toString());assert.equal(consistent.data.activities[0].title,'Original activity');assert.equal(consistent.data.expenses[0].amountCents,12345);assert.equal((await db.homeExpense.findUnique({where:{id:expense.id}})).amountCents,54321);
  });
});
