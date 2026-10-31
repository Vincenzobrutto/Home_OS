const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseGiftReissueBody}=require('../dist/agency-practices/gift-http-contracts');
const {GiftInvitationsStore}=require('../dist/agency-practices/gift-invitations-store');
const {GiftInvitationError}=require('../dist/agency-practices/gift-invitations');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const command=()=>({key:'reissue-command-demo',expectedRevision:4,expectedVersion:2});
const invalid=fn=>assert.throws(fn,error=>error instanceof GiftInvitationError&&error.code==='invalid_input');
const rejected=code=>error=>error instanceof GiftInvitationError&&error.code===code;

test('reissue transport accepts only revision/version plus the header key, normalizing without mutation',()=>{
 const body={expectedRevision:4,expectedVersion:2},before=structuredClone(body);
 assert.deepEqual(parseGiftReissueBody(body,' reissue-command-demo '),command());assert.deepEqual(body,before);
 assert.deepEqual(parseGiftReissueBody({expectedVersion:2,expectedRevision:4},'reissue-command-demo'),command());
});
test('both reissue revisions are positive safe integers, not caller strings or overflow',()=>{
 for(const field of ['expectedRevision','expectedVersion'])for(const value of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'2',null,undefined,1n]){
  invalid(()=>parseGiftReissueBody({expectedRevision:4,expectedVersion:2,[field]:value},'key-demo'));
 }
 assert.equal(parseGiftReissueBody({expectedRevision:Number.MAX_SAFE_INTEGER,expectedVersion:1},'key-demo').expectedRevision,Number.MAX_SAFE_INTEGER);
});
test('reissue header key is mandatory, bounded and rejects controls before trimming',()=>{
 for(const key of [undefined,null,4,[],['key'],'','  ','x'.repeat(121),' '+'x'.repeat(120),'key\n','key\u007f','key\u0085'])invalid(()=>parseGiftReissueBody({expectedRevision:4,expectedVersion:2},key));
 assert.equal(parseGiftReissueBody({expectedRevision:4,expectedVersion:2},'x'.repeat(120)).key.length,120);
});
test('reissue body cannot override recipient, packet, source proofs, dates, destination, offer, author or raw secret',()=>{
 for(const field of ['key','recipientEmail','accountId','agencyId','practiceId','invitationId','replacementId','homeId','documents','packet','sourceFingerprint','annualBenefit','offer','author','secret','tokenHash','expiresAt','createdAt']){
  invalid(()=>parseGiftReissueBody({expectedRevision:4,expectedVersion:2,[field]:'injected'},'key-demo'));
 }
});
test('reissue input uses exact own plain data fields, rejecting getters without executing them',()=>{
 for(const input of [null,[],new Date(),Object.create({expectedRevision:4,expectedVersion:2}),Object.assign(Object.create(null),{expectedRevision:4,expectedVersion:2}),{expectedRevision:4}])invalid(()=>parseGiftReissueBody(input,'key-demo'));
 let calls=0;const input={expectedVersion:2};Object.defineProperty(input,'expectedRevision',{enumerable:true,get(){calls++;return 4;}});invalid(()=>parseGiftReissueBody(input,'key-demo'));assert.equal(calls,0);
 const symbol={expectedRevision:4,expectedVersion:2};symbol[Symbol('secret')]='hidden';invalid(()=>parseGiftReissueBody(symbol,'key-demo'));
 const hidden={expectedRevision:4,expectedVersion:2};Object.defineProperty(hidden,'expectedVersion',{value:2,enumerable:false});invalid(()=>parseGiftReissueBody(hidden,'key-demo'));
});
test('store rejects malformed identity or privileged command before opening a transaction',async()=>{
 let calls=0;const store=new GiftInvitationsStore({$transaction:async()=>{calls++;throw Error('unexpected database access');}});
 for(const slot of [0,1,2,3])for(const value of [null,'',id(1)+'\n',' '+id(1),'not-a-uuid']){
  const args=[id(1),id(2),id(3),id(4),command()];args[slot]=value;
  await assert.rejects(()=>store.reissue(...args),rejected('invalid_input'));
 }
 for(const field of ['secret','recipientEmail','documents','packet','expectedFingerprint','homeId','accountId','keyHeader']){
  await assert.rejects(()=>store.reissue(id(1),id(2),id(3),id(4),{...command(),[field]:'injected'}),rejected('invalid_input'));
 }
 const accessor=command();Object.defineProperty(accessor,'key',{enumerable:true,get(){throw Error('private getter');}});
 await assert.rejects(()=>store.reissue(id(1),id(2),id(3),id(4),accessor),rejected('invalid_input'));assert.equal(calls,0);
});
