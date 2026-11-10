const {test}=require('node:test'),assert=require('node:assert/strict');
const {giftDigitalPlan,parseDigitalPlan,assertCurrentDigitalPlan,mapDigest}=require('../dist/home-maps/snapshot');
const {planFixture}=require('./home-map-fixture.cjs');
const now='2026-11-01T08:00:00.000Z',hash='a'.repeat(64);
function fixture(){return {sources:[{id:'map-source',kind:'floor_plan',versions:[{version:1,sha256:hash}]}],planAnalyses:[planFixture()]};}
const build=p=>giftDigitalPlan(p,'map-source',{planId:'synthetic-map',expectedPlanVersion:3,reviewed:true},'reviewer',now);
test('reviewed room/corridor/balcony copy retains exact geometry, holes, scale and source but no private jobs',()=>{
 const p=fixture(),s=build(p);assert.equal(s.rooms.length,3);assert.equal(s.qualification,'reviewed');assert.deepEqual(s.rooms[1].points,p.planAnalyses[0].rooms[1].points);assert.equal(s.source.page,1);assert.equal(s.calibration.metres,10);
 assert.doesNotMatch(JSON.stringify(s),/calls|creatorId|pixelArea|costUSD|sourceProposal|events/);s.rooms[0].points[0][0]=99;assert.equal(p.planAnalyses[0].rooms[0].points[0][0],5);
});
test('snapshot JSONB key order round trip is stable',()=>{const s=build(fixture());const sorted=JSON.parse(JSON.stringify(s),(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).reverse()):v);assert.deepEqual(parseDigitalPlan(sorted),s);});
for(const [name,mutate]of [
 ['new plan version',p=>p.planAnalyses[0].version++],
 ['changed geometry with old source',p=>p.planAnalyses[0].rooms[0].points[0][0]=6],
 ['changed source',p=>p.sources[0].versions[0].sha256='f'.repeat(64)],
 ['pending proposal',p=>p.planAnalyses[0].surfaceProposal={state:'pending'}]
])test(name+' invalidates release before delivery',()=>{const p=fixture(),s=build(p);mutate(p);assert.throws(()=>assertCurrentDigitalPlan(p,s));});
test('uncalibrated geometry can be a map but not a reviewed measurement',()=>{const p=fixture();p.planAnalyses[0].measurementConfiguration=null;const s=build(p);assert.equal(s.qualification,'unverified');assert.match(s.caveats[0],/Scala non disponibile/);});
test('assumed A4 never becomes verified',()=>{const p=fixture();const {paperCalibration}=require('../dist/agency-plans/geometry');p.planAnalyses[0].rasterSize={width:210,height:297};p.planAnalyses[0].measurementConfiguration={calibration:paperCalibration({format:'A4',orientation:'portrait',denominator:100,widthUnits:210,heightUnits:297})};const s=build(p);assert.equal(s.qualification,'estimated');assert.equal(s.calibration.confirmed,false);});
for(const [name,mutate]of [
 ['out of page',s=>s.rooms[0].points[0][0]=-1],
 ['overlap',s=>s.rooms[1].points=s.rooms[0].points],
 ['invented scale qualification',s=>s.qualification='estimated'],
 ['duplicate room names',s=>s.rooms[1].name=s.rooms[0].name],
 ['tampering digest',s=>s.source.sha256='f'.repeat(64)]
])test(name+' is refused even with recomputed content digest when applicable',()=>{const s=build(fixture());mutate(s);if(name!=='tampering digest'){const content={...s};delete content.digest;s.digest=mapDigest(content);}assert.throws(()=>parseDigitalPlan(s));});
