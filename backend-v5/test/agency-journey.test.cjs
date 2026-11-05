const {test}=require('node:test'),assert=require('node:assert/strict');
const {emptyJourney,journeyView,updateJourney}=require('../dist/agency-practices/journey');
const now='2026-11-05T10:00:00.000Z',window={validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,revokedAt:null};
function fixture(){
 const practice={id:'practice',agencyId:'agency',label:'DEMO',revision:1,sources:[],events:[],receipts:[],dependents:[]};
 const actor={accountId:'agent',memberships:[{...window,accountId:'agent',agencyId:'agency',role:'agent'}],grants:[{...window,accountId:'agent',agencyId:'agency',practiceId:'practice',access:'edit',canExport:true}]};
 return {actor,practice};
}
const input=(command,expectedRevision=1,key='key')=>({key,expectedRevision,command});
test('legacy practices get an empty journey, then stage saves once with CAS and receipt',()=>{
 const {actor,practice}=fixture();assert.deepEqual(journeyView(actor,practice,now).state,emptyJourney());
 const request=input({operation:'stage',stage:'closing'}),r=updateJourney(actor,practice,request,now);
 assert.equal(r.practice.journey.stage,'closing');assert.equal(r.practice.revision,2);
 assert.equal(updateJourney(actor,r.practice,request,now).replay,true);
 assert.equal(practice.journey,undefined);
 assert.throws(()=>updateJourney(actor,r.practice,input({operation:'stage',stage:'completed'}),now),e=>e.code==='idempotency_conflict');
 assert.throws(()=>updateJourney(actor,r.practice,input({operation:'stage',stage:'completed'},1,'other'),now),e=>e.code==='revision_conflict');
});
test('read-only grants cannot write and revoked memberships cannot replay',()=>{
 const {actor,practice}=fixture(),request=input({operation:'stage',stage:'completed'}),r=updateJourney(actor,practice,request,now);
 const read=structuredClone(actor);read.grants[0].access='read';
 assert.throws(()=>updateJourney(read,practice,request,now),e=>e.code==='access_denied');
 actor.memberships[0].revokedAt=now;
 assert.throws(()=>updateJourney(actor,r.practice,request,now),e=>e.code==='access_denied');
});
test('profile requires shared readable current source; replacement invalidates the derived profile',()=>{
 const {actor,practice}=fixture();
 practice.sources.push({id:'source',practiceId:practice.id,agencyId:practice.agencyId,kind:'other',visibility:'private',uploaderId:actor.accountId,withdrawnAt:null,versions:[{version:1,sha256:'a'.repeat(64)}]});
 const command={operation:'profile',sourceId:'source',version:1,profile:{...emptyJourney().profile,seller:'Venditore DEMO',address:'Via sintetica 1'}};
 assert.throws(()=>updateJourney(actor,practice,input(command),now),e=>e.code==='access_denied');
 practice.sources[0].visibility='practice';
 const saved=updateJourney(actor,practice,input(command),now).practice;
 assert.equal(journeyView(actor,saved,now).state.profile.seller,'Venditore DEMO');
 saved.sources[0].versions.push({version:2,sha256:'b'.repeat(64)});
 const view=journeyView(actor,saved,now);
 assert.equal(view.profileStale,true);assert.equal(view.state.profile.seller,'');
});
test('checklist persists answers/custom/waiting, while hidden source assignments stay private',()=>{
 const {actor,practice}=fixture();
 practice.sources.push({id:'hidden',practiceId:practice.id,agencyId:practice.agencyId,kind:'other',visibility:'private',uploaderId:'another',withdrawnAt:null,versions:[{version:1}]});
 practice.journey=emptyJourney();practice.journey.checklist.assignments.hidden='identity';
 const command={operation:'checklist',checklist:{answers:{condo:'yes'},custom:[{id:'extra',label:'Documento DEMO',when:'Prima della stipula'}],assignments:{},waiting:['ape']}};
 const saved=updateJourney(actor,practice,input(command),now).practice;
 assert.equal(saved.journey.checklist.assignments.hidden,'identity');
 const view=journeyView(actor,saved,now);
 assert.equal(view.state.checklist.assignments.hidden,undefined);assert.deepEqual(view.state.checklist.waiting,['ape']);
 assert.throws(()=>updateJourney(actor,practice,input({...command,checklist:{...command.checklist,assignments:{hidden:'identity'}}}),now),e=>e.code==='access_denied');
});
test('strict command rejects extra fields, unknown stage and excessive payloads',()=>{
 const {actor,practice}=fixture();
 for(const command of [{operation:'stage',stage:'arbitrary'},{operation:'stage',stage:'preparation',profile:{}},{operation:'listing',listing:{title:'x',description:'y',confirmed:true}}]){
  assert.throws(()=>updateJourney(actor,practice,input(command),now),e=>e.code==='invalid_input');
 }
});

test('simulated acquisitions persist as requests without creating a received source',()=>{
 const {actor,practice}=fixture(),checklist={...emptyJourney().checklist,purchaseRequests:['floor_plan','cadastral']};
 const r=updateJourney(actor,practice,input({operation:'checklist',checklist}),now);
 assert.deepEqual(journeyView(actor,r.practice,now).state.checklist.purchaseRequests,['floor_plan','cadastral']);assert.deepEqual(r.practice.sources,[]);
 assert.throws(()=>updateJourney(actor,practice,input({operation:'checklist',checklist:{...checklist,purchaseRequests:['deed']}}),now),e=>e.code==='invalid_input');
 assert.throws(()=>updateJourney(actor,practice,input({operation:'checklist',checklist:{...checklist,custom:[{id:'ape',label:'Collision',when:''}]}}),now),e=>e.code==='invalid_input');
});
