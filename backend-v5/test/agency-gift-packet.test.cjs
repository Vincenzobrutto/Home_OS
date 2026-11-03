const {test}=require('node:test'),assert=require('node:assert/strict');
const {prepareAgencyGiftPacket:prepare}=require('../dist/agency-practices/gift-packet');
const now='2026-10-31T15:00:00.000Z',hash='a'.repeat(64);
const window=()=>({validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,revokedAt:null});
function fixture(){
 const actor={accountId:'agent',memberships:[{...window(),agencyId:'agency',accountId:'agent',role:'agent'}],grants:[{...window(),agencyId:'agency',practiceId:'practice',accountId:'agent',access:'edit',canExport:true}]};
 const practice={id:'practice',agencyId:'agency',label:'Synthetic',revision:3,sources:[{id:'source',agencyId:'agency',practiceId:'practice',uploaderId:'agent',visibility:'private',withdrawnAt:null,kind:'floor_plan',versions:[{version:1,sha256:hash,originalFilename:'synthetic.png',mimeType:'image/png',byteSize:123,receivedAt:now,receivedBy:'agent'}]}],dependents:[],receipts:[],events:[]};
 const descriptors=[{agencyId:'agency',practiceId:'practice',sourceId:'source',sourceVersion:1,sha256:hash,metadataVersion:1,origin:'agency_generated',lifecycle:'final',author:'Agenzia demo',title:'Prospetto sintetico',surface:{kind:'commercial',qualification:'estimated',method:'assumed A4, declared scale',geometryRevision:2,caveats:['Scala stimata, non misura verificata']}}];
 const input={expectedRevision:3,requestedHomeId:'home-selected',recipients:[{subjectRef:'owner-a'}],documents:[{sourceId:'source',version:1,sha256:hash}]};
 return {actor,practice,descriptors,input};
}
const run=f=>prepare(f.actor,f.practice,f.descriptors,f.input,now);
const classified=f=>prepare(f.actor,f.practice,f.descriptors,f.input,now,1);
const rejected=(f,code='invalid_input')=>assert.throws(()=>run(f),e=>e.code===code);
test('one selected recipient has one requested destination; preparation grants nothing',()=>{
 const f=fixture(),before=structuredClone(f),p=run(f);
 assert.equal(p.requestedHomeId,'home-selected');assert.deepEqual(p.recipients,[{subjectRef:'owner-a'}]);
 for(const key of ['canDeliver','createsHome','grantsAccess','confirmsFacts','certification','recipientIdentityVerified','homeDestinationAuthorized'])assert.equal(p[key],false);
 assert.equal(p.purpose,'internal_preview');assert.deepEqual(f,before);assert.doesNotMatch(JSON.stringify(p),/tokenHash|storageKey|memberships|receipts/);
});
test('surface kind, method, caveats and estimate survive intact without technical certification',()=>{
 const f=fixture(),p=run(f);assert.deepEqual(p.documents[0].surface,f.descriptors[0].surface);assert.equal(p.documents[0].signatureVerification,'not_assessed');
 p.documents[0].surface.caveats.push('caller mutation');assert.equal(f.descriptors[0].surface.caveats.length,1);
});
test('received and agency-produced documents supported; signed means label, not verified signature',()=>{
 const f=fixture();f.descriptors[0].origin='received';f.descriptors[0].lifecycle='signed';delete f.descriptors[0].surface;
 const p=run(f);assert.equal(p.documents[0].origin,'received');assert.equal(p.documents[0].lifecycle,'signed');assert.equal(p.documents[0].signatureVerification,'not_assessed');assert.ok(!Object.hasOwn(p.documents[0],'surface'));
});
test('fingerprint stable across ordering and time, but tied to recipients, destination, provenance and metadata',()=>{
 const f=fixture(),p=run(f);f.input.recipients.reverse();assert.equal(run(f).fingerprint,p.fingerprint);
 assert.equal(prepare(f.actor,f.practice,f.descriptors,f.input,'2026-10-31T15:01:00Z').fingerprint,p.fingerprint);
 for(const mutate of [f=>f.input.requestedHomeId='other-home',f=>f.input.recipients[0].subjectRef='owner-c',f=>f.descriptors[0].metadataVersion++,f=>f.descriptors[0].author='Other producer',f=>f.descriptors[0].surface.geometryRevision++]){
  const x=fixture();mutate(x);assert.notEqual(run(x).fingerprint,p.fingerprint);
 }
});
test('drafts and lost estimate caveats are refused',()=>{
 const f=fixture();f.descriptors[0].lifecycle='draft';rejected(f);
 const g=fixture();g.descriptors[0].surface.caveats=[];rejected(g);
});
test('private source is not accessible merely because actor is admin',()=>{
 const f=fixture();f.actor.memberships[0].role='admin';f.practice.sources[0].uploaderId='another-agent';rejected(f,'access_denied');
});
test('revoked membership, expired grant, viewer and missing export deny preparation',()=>{
 for(const mutate of [f=>f.actor.memberships[0].revokedAt=now,f=>f.actor.grants[0].validUntil=now,f=>f.actor.memberships[0].role='viewer',f=>f.actor.grants[0].canExport=false]){
  const f=fixture();mutate(f);rejected(f,'access_denied');
 }
});
test('whole mixed source selection denied, including after an earlier successful preview',()=>{
 const f=fixture();run(f);f.practice.sources.push({...structuredClone(f.practice.sources[0]),id:'other',uploaderId:'other-agent'});
 f.input.documents.push({sourceId:'other',version:1,sha256:hash});rejected(f,'access_denied');
 const g=fixture();run(g);g.practice.sources[0].withdrawnAt=now;rejected(g,'access_denied');
});
test('source and metadata scope/version/SHA must agree with current authorized original',()=>{
 for(const mutate of [f=>f.input.documents[0].version=2,f=>f.descriptors[0].sourceVersion=2,f=>f.descriptors[0].sha256='b'.repeat(64)]){
  const f=fixture();mutate(f);rejected(f,'source_changed');
 }
 for(const mutate of [f=>f.descriptors[0].practiceId='other',f=>f.descriptors[0].agencyId='other',f=>f.descriptors[0].sourceId='unknown']){
  const f=fixture();mutate(f);rejected(f);
 }
 const f=fixture();f.practice.revision++;rejected(f,'revision_conflict');
});
test('client cannot smuggle producer metadata, ownership, signatures or direct delivery into selection',()=>{
 for(const key of ['descriptors','canDeliver','verifiedOwner','signature','homeMembership','signed']){
  const f=fixture();f.input[key]=true;rejected(f);
 }
 for(const key of ['email','verified','role','homeId']){const f=fixture();f.input.recipients[0][key]='injected';rejected(f);}
});
test('empty, duplicate, oversized and nonplain selections fail closed',()=>{
 for(const mutate of [f=>f.input.recipients=[],f=>f.input.recipients.push({...f.input.recipients[0]}),f=>f.input.documents=[],f=>f.input.documents.push({...f.input.documents[0]}),f=>f.descriptors.push({...f.descriptors[0]}),f=>f.input=Object.assign(Object.create({inherited:true}),f.input),f=>f.input.requestedHomeId=' ',f=>f.input.expectedRevision=NaN,f=>f.input.recipients=Array.from({length:21},(_,i)=>({subjectRef:'person-'+i})),f=>f.input.documents=Array.from({length:51},(_,i)=>({sourceId:'source-'+i,version:1,sha256:hash})),f=>f.descriptors=Array.from({length:51},()=>({...f.descriptors[0]}))]){
  const f=fixture();mutate(f);rejected(f);
 }
});
test('no extra producer, invalid lifecycle, control characters or fabricated certification accepted',()=>{
 for(const mutate of [f=>f.descriptors[0].origin='ai',f=>f.descriptors[0].lifecycle='certified',f=>f.descriptors[0].certification=true,f=>f.descriptors[0].author='bad\nname',f=>f.descriptors[0].metadataVersion=0,f=>f.descriptors[0].surface.qualification='verified_by_ai']){
  const f=fixture();mutate(f);rejected(f);
 }
});


test('ordering of several selected originals and metadata does not alter canonical fingerprint',()=>{
 const f=fixture();f.practice.sources.push({...structuredClone(f.practice.sources[0]),id:'source-2'});
 f.input.documents.push({sourceId:'source-2',version:1,sha256:hash});f.descriptors.push({...structuredClone(f.descriptors[0]),sourceId:'source-2',title:'Second synthetic document'});
 const expected=run(f).fingerprint;f.input.documents.reverse();f.descriptors.reverse();assert.equal(run(f).fingerprint,expected);
});

test('synthetic shared packet stays compatible with frontend harness without exposing actor or registry state',()=>{
 const f=require('../../fixtures/agency-gift/input-v1.json'),expected=require('../../frontend-v5/tests/fixtures/agency-gift/packet-v1.json');
 const result=prepare(f.actor,f.practice,f.descriptors,f.input,f.now);
 assert.deepEqual(result,expected);assert.equal(result.documents.length,2);assert.equal(result.recipients.length,1);
 assert.equal(result.documents.find(d=>d.origin==='agency_generated').surface.qualification,'estimated');
 assert.doesNotMatch(JSON.stringify(result),/memberships|grants"|giftMetadataReceipts|storageKey|tokenHash/);
});

test('v1 rejects two distinct accounts rather than silently keeping the first',()=>{
 const f=fixture();f.input.recipients.push({subjectRef:'second-account'});rejected(f);
});

test('classification policy snapshots explicit Agency kinds with exact Home types and declared family-only groups',()=>{
 const expected={floor_plan:['floor_plan','building'],ape:['ape','energy'],deed:[null,'property'],succession:[null,'property'],cadastral:[null,'building'],unclassified:[null,'unclassified'],other:[null,'unclassified']};
 for(const [sourceKind,[documentKind,family]] of Object.entries(expected)){
  const f=fixture();f.practice.sources[0].kind=sourceKind;
  f.practice.sources[0].versions[0].originalFilename='APE-rogito-planimetria.pdf';f.descriptors[0].title='APE rogito planimetria';
  const packet=classified(f);assert.equal(packet.classificationPolicyVersion,1);
  assert.deepEqual(packet.documents[0].classification,{policyVersion:1,sourceKind,documentKind,family});
  assert.equal(packet.confirmsFacts,false);assert.equal(packet.certification,false);
 }
});

test('classification policy fingerprints all raw kinds, including unsupported or unclassified sources',()=>{
 const fingerprints=new Set();
 for(const kind of ['unclassified','other','deed','succession','cadastral','floor_plan','ape']){
  const f=fixture();f.practice.sources[0].kind=kind;fingerprints.add(classified(f).fingerprint);
 }
 assert.equal(fingerprints.size,7);
 const legacy=run(fixture());assert.equal(Object.hasOwn(legacy,'classificationPolicyVersion'),false);assert.equal(Object.hasOwn(legacy.documents[0],'classification'),false);
});

test('classification remains server-owned, scoped to current source proof and absent for private excluded originals',()=>{
 const f=fixture();f.input.classificationPolicyVersion=1;rejected(f);
 const g=fixture();g.actor.memberships[0].role='admin';g.practice.sources[0].uploaderId='other';
 assert.throws(()=>classified(g),e=>e.code==='access_denied');
 const h=fixture();h.practice.sources[0].versions[0].version=2;assert.throws(()=>classified(h),e=>e.code==='source_changed');
 const x=fixture();x.practice.sources[0].kind='contract';assert.throws(()=>classified(x),e=>e.code==='invalid_input');
});

test('classification parser refuses invented mappings, policy versions and accessor payloads',()=>{
 const {giftClassification,parseGiftClassification}=require('../dist/agency-practices/gift-classification');
 for(const change of [{family:'property'},{documentKind:'contract'},{policyVersion:2},{sourceKind:'Floor_Plan'},{sourceKind:''},{sourceKind:'__proto__'},{certification:true}])assert.throws(()=>parseGiftClassification({...giftClassification('floor_plan'),...change}),e=>e.code==='invalid_input');
 let reads=0;const input=giftClassification('ape');Object.defineProperty(input,'sourceKind',{enumerable:true,get(){reads++;return 'ape';}});
 assert.throws(()=>parseGiftClassification(input),e=>e.code==='invalid_input');assert.equal(reads,0);
});
