require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client');
const {assertDevelopmentDatabase}=require('../dist/prisma.service');
const {ReviewService}=require('../dist/review/review.service');
const {ObjectOnboardingAccess}=require('../dist/object-onboarding/access');
const {onboardingCandidates}=require('../dist/object-onboarding/candidates');

test('R05 synthetic candidate query measurements retain source privacy and membership checks',{timeout:60000},async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);
 const db=new PrismaClient({log:[{emit:'event',level:'query'}]});await db.$connect();t.after(()=>db.$disconnect());
 let queries=[];db.$on('query',event=>queries.push(event.query));
 const account=async()=>db.account.create({data:{name:'SYNTHETIC query audit',email:randomUUID()+'@example.test',passwordHash:'not-login',emailVerifiedAt:new Date()}});
 const a=await account(),b=await account(),home=await db.home.create({data:{name:'SYNTHETIC query measurements',address:'Via Test'}}),h=home.id;
 for(const accountId of [a.id,b.id])await db.homeMembership.create({data:{accountId,homeId:h,role:'owner'}});
 const room=await db.homeRoom.create({data:{homeId:h,name:'Synthetic room',type:'other'}});
 const docs=[];for(let i=0;i<3;i++)docs.push(await db.document.create({data:{homeId:h,uploaderId:a.id,name:'Synthetic source '+i,visibility:'private',original:{create:{originalFilename:'synthetic.pdf',mimeType:'application/pdf',byteSize:1,sha256:String(i+1).repeat(64),file:{create:{storageKey:'synthetic-query-'+randomUUID()}}}}},include:{original:true}}));
 const proof=d=>({documentId:d.id,documentVersion:1,sha256:d.original.sha256,page:1,excerpt:'SYNTHETIC QUERY BRAND',basis:'verified_text',region:null});
 const profile=sources=>({brand:{value:'SYNTHETIC QUERY BRAND',origin:'extraction_confirmed',sources}});
 const targets=[];for(let i=0;i<50;i++){const target=await db.homeObject.create({data:{accountId:a.id,homeId:h,name:'Synthetic unit '+String(i).padStart(2,'0'),type:'appliance',profile:profile([proof(docs[0])])}});targets.push(target.id);await db.objectPosition.create({data:{accountId:a.id,homeId:h,objectId:target.id,roomIds:[room.id]}});}
 const itemId='synthetic-query-item',draft=await db.objectOnboardingDraft.create({data:{accountId:a.id,homeId:h,documentId:docs[0].id,documentVersion:1,documentSha256:docs[0].original.sha256,mode:'extraction',output:{documentKind:'product_document',items:[{id:itemId,fingerprint:'synthetic-query-fingerprint',fields:{},quantity:null,nameTruncated:false,disposition:'uncertain'}],purchaseTotal:null,needsReview:true}}});
 const access=new ObjectOnboardingAccess(db,new ReviewService(db,{})),measurements=[];
 for(const sourceCount of [1,3]){
  if(sourceCount===3)await db.homeObject.updateMany({where:{id:{in:targets}},data:{profile:profile(docs.map(proof))}});
  for(const count of [1,10,50]){
   queries=[];const result=await onboardingCandidates(access,a.id,h,draft.id,{itemId,limit:String(count)});const captured=queries.slice();
   assert.equal(result.items.length,count);assert.equal(result.hasLinkedExpenses,false);assert(result.items.every(i=>i.profile.fields.brand.value==='SYNTHETIC QUERY BRAND'&&i.rooms.length===1&&i.rooms[0]===room.name));
   assert.equal(result.nextCursor!==null,count<50);
   measurements.push({candidates:count,sourcesPerProfile:sourceCount,sqlStatements:captured.length,sourceLocks:captured.filter(q=>q.includes('FOR SHARE')).length});
  }
 }
 // Same membership does not confer access to another owner's private draft.
 await assert.rejects(onboardingCandidates(access,b.id,h,draft.id,{itemId,limit:'50'}),e=>e.getStatus?.()===403);
 await db.document.update({where:{id:docs[1].id},data:{uploaderId:b.id}});
 const revoked=await onboardingCandidates(access,a.id,h,draft.id,{itemId,limit:'50'});
 assert.equal(revoked.items.length,50);assert(revoked.items.every(i=>i.profile.unavailable&&!Object.hasOwn(i.profile.fields,'brand')));
 assert(!JSON.stringify(revoked).includes('SYNTHETIC QUERY BRAND'));
 await db.homeMembership.delete({where:{accountId_homeId:{accountId:a.id,homeId:h}}});
 await assert.rejects(onboardingCandidates(access,a.id,h,draft.id,{itemId,limit:'50'}),e=>e.getStatus?.()===403);
 // Record statements, not SQL/parameters/timing: this is a scaling baseline, not a latency benchmark.
 t.diagnostic('R05_QUERY_COUNTS '+JSON.stringify(measurements));
});
