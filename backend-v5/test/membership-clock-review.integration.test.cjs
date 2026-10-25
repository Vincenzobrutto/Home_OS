// Independent observation on a new offline cluster; no tolerance in authorization.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client');
const {assertDevelopmentDatabase}=require('../dist/prisma.service');
const {ReviewService}=require('../dist/review/review.service');
const {validMembership}=require('../dist/security');

test('observe PostgreSQL-default membership time against Node and keep strict authorization',{timeout:90000},async t=>{
<<<<<<< HEAD
 require('./offline-policy.cjs').assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);
=======
 assertDevelopmentDatabase(process.env.DATABASE_URL);
>>>>>>> origin/codex/cestino-correzioni-backend-20261025
 const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const a=await db.account.create({data:{name:'Synthetic clock observer',email:randomUUID()+'@example.test',passwordHash:'not-login'}});
 const review=new ReviewService(db,{}),stats={samples:240,futureOnReturn:0,require403:0,explicitPastPass:0,minDeltaMs:Infinity,maxDeltaMs:-Infinity};
 for(let i=0;i<stats.samples;i++){
  const home=await db.home.create({data:{name:'Synthetic clock home',address:'Synthetic'}});
  const member=await db.homeMembership.create({data:{accountId:a.id,homeId:home.id,role:'owner'}});
  const now=new Date(),delta=member.validFrom.getTime()-now.getTime();
  stats.minDeltaMs=Math.min(stats.minDeltaMs,delta);stats.maxDeltaMs=Math.max(stats.maxDeltaMs,delta);
  if(delta>0){stats.futureOnReturn++;assert.equal(validMembership(member,now),false);}
  try{await db.$transaction(tx=>review.require(tx,a.id,home.id,true));}
  catch(error){assert.equal(error.getStatus?.(),403);stats.require403++;}
  await db.homeMembership.update({where:{id:member.id},data:{validFrom:new Date(Date.now()-1000)}});
  await db.$transaction(tx=>review.require(tx,a.id,home.id,true));stats.explicitPastPass++;
 }
 assert.equal(stats.explicitPastPass,stats.samples);
 const now=new Date(),boundary={validFrom:new Date(now.getTime()+1),validUntil:null,revokedAt:null};
 assert.equal(validMembership(boundary,now),false,'a future membership must remain forbidden; do not add tolerance');
 assert.equal(validMembership({...boundary,validFrom:now},now),true);
 assert.equal(validMembership({...boundary,validFrom:now,revokedAt:now},now),false);
 assert.equal(validMembership({...boundary,validFrom:now,validUntil:now},now),false);
 console.log('OFFLINE_MEMBERSHIP_CLOCK '+JSON.stringify(stats));
});
