const {test}=require('node:test'),assert=require('node:assert/strict');
const I=require('../dist/agency-practices/gift-invitations'),R=require('../dist/agency-practices/gift-registry');
const base=require('../../fixtures/agency-gift/input-v1.json'),now='2026-10-31T20:55:00.000Z',secret='A'.repeat(43);
function fixture(){
 const f=structuredClone(base);let practice=f.practice;
 for(const d of f.descriptors)practice=R.registerGiftDocumentDescriptor(f.actor,practice,d,{key:'meta-'+d.sourceId,expectedRevision:practice.revision,expectedMetadataVersion:null},now).practice;
 const command={key:'invite-create',expectedRevision:practice.revision,documents:f.input.documents,recipientEmail:'  Recipient@Example.test  ',stipulationCompleted:true,releaseApproved:true,annualBenefit:false};
 const server={id:'invite-demo',homeId:'future-home-demo',secret,expiresAt:'2026-11-07T20:55:00.000Z',offer:null};
 const account={accountId:'recipient-account',email:'recipient@example.test',emailVerifiedAt:'2026-10-30T12:00:00.000Z'};
 const create=()=>I.createGiftInvitation(f.actor,practice,command,server,now);
 return {actor:f.actor,practice,command,server,account,create};
}
const error=(fn,code)=>assert.throws(fn,e=>e.code===code);
const claim=(f,r,version=r.version)=>I.claimGiftInvitation(r,secret,f.account,r.sourceFingerprint,version,now);
test('invitation candidate freezes one recipient and authorized sources, storing hash not raw secret',()=>{
 const f=fixture(),out=f.create(),r=out.record;assert.equal(r.recipientEmail,'recipient@example.test');assert.equal(r.packet.recipients.length,1);assert.equal(r.state,'invited');assert.equal(r.claim,null);assert.match(r.tokenHash,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(r).includes(secret),false);
 for(const flag of ['canSend','canAccept','createsHome','activatesBenefit'])assert.equal(out[flag],false);
 assert.equal(r.packet.documents.find(d=>d.surface).surface.qualification,'estimated');
});
test('source fingerprint ignores practice revision/time but changes with actual selected source metadata',()=>{
 const r=fixture().create().record,p=structuredClone(r.packet);p.practiceRevision++;p.preparedAt='2026-11-01T00:00:00.000Z';assert.equal(I.giftInvitationSourceFingerprint(p),r.sourceFingerprint);
 p.documents[0].metadataVersion++;assert.notEqual(I.giftInvitationSourceFingerprint(p),r.sourceFingerprint);
});
test('stipulation and explicit release are required; client cannot inject account, Home or activation',()=>{
 for(const field of ['stipulationCompleted','releaseApproved']){const f=fixture();f.command[field]=false;error(f.create,'invalid_input');}
 for(const field of ['accountId','homeId','tokenHash','activated','offer']){const f=fixture();f.command[field]='injected';error(f.create,'invalid_input');}
});
test('annual benefit is unavailable without a server offer, never silently downgraded',()=>{
 const f=fixture();f.command.annualBenefit=true;error(f.create,'benefit_unavailable');
 f.server.offer={id:'synthetic-offer',version:1};const r=f.create().record;assert.deepEqual(r.annualBenefit,{requested:true,offerId:'synthetic-offer',offerVersion:1,activated:false});assert.equal(claim(f,r).activatesBenefit,false);
});
test('anonymous landing exposes no documents, recipient, claimant or Home',()=>{
 const r=fixture().create().record;assert.deepEqual(I.giftInvitationLanding(r,secret,now),{id:'invite-demo',requiresAccount:true,canAccept:false});
});
test('wrong or malformed token, expiry boundary and future start return unavailable',()=>{
 const r=fixture().create().record;for(const token of ['',null,'B'.repeat(43),secret+'extra'])error(()=>I.giftInvitationLanding(r,token,now),'unavailable');
 for(const at of [r.expiresAt,'2026-10-30T20:55:00.000Z'])error(()=>I.giftInvitationLanding(r,secret,at),'unavailable');
});
test('claim binds a verified normal account only; it does not accept, create Home or activate benefit',()=>{
 const f=fixture(),r=f.create().record,before=structuredClone(r),out=claim(f,r);assert.deepEqual(r,before);assert.equal(out.record.state,'claimed');assert.deepEqual(out.record.claim,{accountId:f.account.accountId,claimedAt:now});assert.equal(out.record.version,2);
 for(const flag of ['canAccept','createsHome','activatesBenefit'])assert.equal(out[flag],false);
});
test('claim replay for the same account preserves version and dates without needing a new association',()=>{
 const f=fixture(),claimed=claim(f,f.create().record).record,out=claim(f,claimed,1);assert.equal(out.replay,true);assert.deepEqual(out.record,claimed);
});
test('wrong/unverified/future-verification email cannot claim',()=>{
 for(const mutate of [a=>a.email='other@example.test',a=>a.emailVerifiedAt=null,a=>a.emailVerifiedAt='2026-11-01T00:00:00.000Z']){const f=fixture(),r=f.create().record;mutate(f.account);error(()=>claim(f,r),'unavailable');}
});
test('a different account cannot take an already claimed invitation even with the same verified email',()=>{
 const f=fixture(),r=claim(f,f.create().record).record;f.account.accountId='other-account';error(()=>claim(f,r),'unavailable');
});
test('changed current sources block new claim and replay',()=>{
 const f=fixture(),r=f.create().record;error(()=>I.claimGiftInvitation(r,secret,f.account,'b'.repeat(64),1,now),'unavailable');
 const claimed=claim(f,r).record;error(()=>I.claimGiftInvitation(claimed,secret,f.account,'b'.repeat(64),2,now),'unavailable');
});
test('JSONB key order does not break the immutable manifest seal',()=>{
 const r=fixture().create().record;r.packet=Object.fromEntries(Object.entries(r.packet).reverse());assert.equal(I.giftInvitationLanding(r,secret,now).requiresAccount,true);
});
test('changed immutable recipient, destination, benefit or source fails validation',()=>{
 for(const mutate of [r=>r.recipientEmail='other@example.test',r=>r.packet.requestedHomeId='other-home',r=>r.packet.documents[0].title='forged',r=>r.annualBenefit={requested:true,offerId:'forged',offerVersion:1,activated:false}]){const r=fixture().create().record;mutate(r);error(()=>I.giftInvitationLanding(r,secret,now),'invalid_input');}
});
test('revocation requires practice export, preserves history and prevents further use',()=>{
 const f=fixture(),r=f.create().record,out=I.revokeGiftInvitation(r,f.actor,f.practice,1,now);assert.equal(r.state,'invited');assert.equal(out.record.state,'revoked');error(()=>I.giftInvitationLanding(out.record,secret,now),'unavailable');assert.equal(I.revokeGiftInvitation(out.record,f.actor,f.practice,1,now).replay,true);
 f.actor.grants[0].canExport=false;error(()=>I.revokeGiftInvitation(r,f.actor,f.practice,1,now),'access_denied');
});
test('claim and revoke refuse competing versions',()=>{
 const f=fixture(),r=f.create().record;error(()=>claim(f,r,9),'revision_conflict');error(()=>I.revokeGiftInvitation(r,f.actor,f.practice,9,now),'revision_conflict');
});
test('creation refuses sources without metadata or current permission and excessive expiry',()=>{
 const f=fixture();f.practice.giftDocuments=[];error(f.create,'invalid_input');const g=fixture();g.actor.grants[0].canExport=false;error(g.create,'access_denied');
 const h=fixture();h.server.expiresAt='2026-12-01T00:00:00.000Z';error(h.create,'invalid_input');
});

test('new invitation freezes classification while explicitly recreated legacy records retain their old fingerprint',()=>{
 const f=fixture(),record=f.create().record;
 assert.equal(record.packet.classificationPolicyVersion,1);assert.ok(record.packet.documents.every(d=>d.classification?.policyVersion===1));
 const selected=record.packet.documents[0],source=f.practice.sources.find(s=>s.id===selected.sourceId),before=source.kind;
 source.kind=before==='other'?'unclassified':'other';
 const selection={expectedRevision:f.practice.revision,requestedHomeId:record.packet.requestedHomeId,recipients:record.packet.recipients,documents:f.command.documents};
 const current=R.prepareGiftFromRegistry(f.actor,f.practice,selection,now,1);
 assert.notEqual(I.giftInvitationSourceFingerprint(current),record.sourceFingerprint);
 error(()=>I.claimGiftInvitation(record,secret,f.account,I.giftInvitationSourceFingerprint(current),record.version,now),'unavailable');
 const legacy=I.createGiftInvitation(f.actor,f.practice,f.command,f.server,now,null).record;
 assert.equal(Object.hasOwn(legacy.packet,'classificationPolicyVersion'),false);assert.ok(legacy.packet.documents.every(d=>!Object.hasOwn(d,'classification')));
 const legacyCurrent=R.prepareGiftFromRegistry(f.actor,f.practice,selection,now);
 assert.equal(I.giftInvitationSourceFingerprint(legacyCurrent),legacy.sourceFingerprint);assert.equal(claim(f,legacy).record.state,'claimed');
});
