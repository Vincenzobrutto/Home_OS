const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../dist/agency-practices/gift-registry');
const now='2026-10-31T15:00:00Z',hash='a'.repeat(64);
const window=()=>({validFrom:'2026-01-01T00:00:00Z',validUntil:null,revokedAt:null});
function fixture(){
 const actor={accountId:'agent',memberships:[{...window(),agencyId:'agency',accountId:'agent',role:'agent'}],grants:[{...window(),agencyId:'agency',practiceId:'practice',accountId:'agent',access:'edit',canExport:true}]};
 const practice={id:'practice',agencyId:'agency',label:'Synthetic',revision:1,sources:[{id:'source',agencyId:'agency',practiceId:'practice',uploaderId:'agent',visibility:'private',withdrawnAt:null,kind:'floor_plan',versions:[{version:1,sha256:hash,originalFilename:'synthetic.png',mimeType:'image/png',byteSize:100,receivedAt:now,receivedBy:'agent'}]}],dependents:[],receipts:[],events:[]};
 const descriptor={agencyId:'agency',practiceId:'practice',sourceId:'source',sourceVersion:1,sha256:hash,metadataVersion:1,origin:'agency_generated',lifecycle:'final',author:'Producer demo',title:'Prospetto demo',surface:{kind:'commercial',qualification:'estimated',method:'Assumed A4',geometryRevision:2,caveats:['Unverified paper size']}};
 const input={key:'register-1',expectedRevision:1,expectedMetadataVersion:null};
 return {actor,practice,descriptor,input};
}
const register=f=>R.registerGiftDocumentDescriptor(f.actor,f.practice,f.descriptor,f.input,now);
const select=p=>({expectedRevision:p.revision,requestedHomeId:'one-home',recipients:[{subjectRef:'owner-a'},{subjectRef:'owner-b'}],documents:[{sourceId:'source',version:1,sha256:hash}]});
const error=(fn,code)=>assert.throws(fn,e=>e.code===code);
test('registry stamps source-bound provenance, actor and receipt without changing caller state',()=>{
 const f=fixture(),before=structuredClone(f),out=register(f),entry=out.practice.giftDocuments[0];
 assert.deepEqual(f,before);assert.equal(out.practice.revision,2);assert.equal(entry.recordedBy,'agent');assert.equal(entry.recordedAt,now);
 assert.equal(entry.descriptor.surface.qualification,'estimated');assert.equal(out.receipt.recordId,entry.id);
});
test('server-only adapter prepares from stored metadata, never caller-supplied producer fields',()=>{
 const f=fixture(),p=register(f).practice,packet=R.prepareGiftFromRegistry(f.actor,p,select(p),now);
 assert.equal(packet.documents[0].title,'Prospetto demo');assert.equal(packet.recipients.length,2);assert.equal(packet.canDeliver,false);assert.equal(packet.homeDestinationAuthorized,false);
 const injected={...select(p),descriptors:[f.descriptor]};error(()=>R.prepareGiftFromRegistry(f.actor,p,injected,now),'invalid_input');
});
test('replay after JSON roundtrip is idempotent; changed body with same key conflicts',()=>{
 const f=fixture(),out=register(f);f.practice=JSON.parse(JSON.stringify(out.practice));
 const replay=register(f);assert.equal(replay.replay,true);assert.equal(replay.practice.revision,2);assert.equal(replay.practice.giftDocuments.length,1);assert.deepEqual(replay.receipt,out.receipt);
 f.descriptor.title='changed';error(()=>register(f),'idempotency_conflict');
});
test('new metadata versions preserve history and invalidate an earlier practice selection',()=>{
 const f=fixture();f.practice=register(f).practice;const old=select(f.practice);
 f.input={key:'register-2',expectedRevision:2,expectedMetadataVersion:1};f.descriptor.metadataVersion=2;f.descriptor.title='Version two';
 const out=register(f);assert.equal(out.practice.giftDocuments.length,2);assert.equal(out.practice.giftDocuments[0].descriptor.title,'Prospetto demo');
 error(()=>R.prepareGiftFromRegistry(f.actor,out.practice,old,now),'revision_conflict');
 assert.equal(R.prepareGiftFromRegistry(f.actor,out.practice,select(out.practice),now).documents[0].metadataVersion,2);
});
test('metadata views accept old snapshots but expose no private source to another actor',()=>{
 const f=fixture();assert.equal(R.giftDocumentMetadataView(f.actor,f.practice,now).documents[0].state,'missing');
 f.practice=register(f).practice;const other=structuredClone(f.actor);other.accountId='other';other.memberships[0].accountId='other';other.memberships[0].role='admin';other.grants[0].accountId='other';
 const view=R.giftDocumentMetadataView(other,f.practice,now);assert.deepEqual(view.documents,[]);assert.doesNotMatch(JSON.stringify(view),/Prospetto|source|recordId|metadataVersion/);
});
test('replaced originals report stale without exposing old descriptors or exporting old metadata',()=>{
 const f=fixture();f.practice=register(f).practice;f.practice.sources[0].versions.push({...f.practice.sources[0].versions[0],version:2,sha256:'b'.repeat(64),originalFilename:'new.png'});
 const view=R.giftDocumentMetadataView(f.actor,f.practice,now);assert.equal(view.documents[0].state,'stale');assert.ok(!Object.hasOwn(view.documents[0],'descriptor'));assert.doesNotMatch(JSON.stringify(view),/Prospetto/);
 const input=select(f.practice);input.documents[0]={sourceId:'source',version:2,sha256:'b'.repeat(64)};
 error(()=>R.prepareGiftFromRegistry(f.actor,f.practice,input,now),'source_changed');
});
test('draft registry entries are preserved for review but cannot be packaged',()=>{
 const f=fixture();f.descriptor.lifecycle='draft';const p=register(f).practice;
 assert.equal(R.giftDocumentMetadataView(f.actor,p,now).documents[0].descriptor.lifecycle,'draft');
 error(()=>R.prepareGiftFromRegistry(f.actor,p,select(p),now),'invalid_input');
});
test('revocation and source privacy are rechecked before replay',()=>{
 for(const mutate of [f=>f.actor.grants[0].revokedAt=now,f=>f.practice.sources[0].withdrawnAt=now,f=>f.practice.sources[0].uploaderId='other-agent']){
  const f=fixture();f.practice=register(f).practice;mutate(f);error(()=>register(f),'access_denied');
 }
});
test('viewer, missing export and read-only grant cannot register producer metadata',()=>{
 for(const mutate of [f=>f.actor.memberships[0].role='viewer',f=>f.actor.grants[0].canExport=false,f=>f.actor.grants[0].access='read']){
  const f=fixture();mutate(f);error(()=>register(f),'access_denied');
 }
});
test('wrong scope, stale source, metadata gaps and stale revision fail closed',()=>{
 for(const [mutate,code] of [[f=>f.descriptor.agencyId='other','invalid_input'],[f=>f.descriptor.practiceId='other','invalid_input'],[f=>f.descriptor.sourceVersion=2,'source_changed'],[f=>f.descriptor.metadataVersion=2,'invalid_input'],[f=>f.input.expectedRevision=2,'revision_conflict'],[f=>f.input.expectedMetadataVersion=1,'revision_conflict']]){
  const f=fixture();mutate(f);error(()=>register(f),code);
 }
});
test('registration DTO cannot claim producer fields, actors, certification or target Home access',()=>{
 for(const key of ['descriptor','author','recordedBy','certification','homeId','canDeliver']){
  const f=fixture();f.input[key]=true;error(()=>register(f),'invalid_input');
 }
});
test('tampered stored metadata or audit attribution is not accepted as a valid server record',()=>{
 for(const mutate of [p=>p.giftDocuments[0].descriptor.title='tampered',p=>p.giftDocuments[0].recordedBy='other',p=>p.giftDocuments[0].id='forged',p=>p.giftDocuments[0].descriptor.practiceId='other']){
  const f=fixture(),p=register(f).practice;mutate(p);error(()=>R.giftDocumentMetadataView(f.actor,p,now),'invalid_input');
 }
});
test('JSONB-style descriptor key reorder does not change the record fingerprint',()=>{
 const f=fixture(),p=register(f).practice;const d=p.giftDocuments[0].descriptor;
 p.giftDocuments[0].descriptor=Object.fromEntries(Object.entries(d).reverse());
 const view=R.giftDocumentMetadataView(f.actor,p,now);assert.equal(view.documents[0].state,'current');
});
test('missing registry, duplicates or uncontrolled version updates cannot synthesize a delivery',()=>{
 const f=fixture();error(()=>R.prepareGiftFromRegistry(f.actor,f.practice,select(f.practice),now),'invalid_input');
 const p=register(f).practice;p.giftDocuments.push(structuredClone(p.giftDocuments[0]));
 error(()=>R.giftDocumentMetadataView(f.actor,p,now),'invalid_input');
});
