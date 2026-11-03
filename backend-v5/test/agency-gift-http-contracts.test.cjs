const {test}=require('node:test'),assert=require('node:assert/strict');
const H=require('../dist/agency-practices/gift-http-contracts'),I=require('../dist/agency-practices/gift-invitations'),A=require('../dist/agency-practices/gift-acceptance-command');
const {PracticeError}=require('../dist/agency-practices/domain');
const secret='A'.repeat(43),header='request-key-DEMO';
const create=()=>({expectedRevision:4,documents:[{sourceId:' b ',version:2,sha256:'b'.repeat(64)},{sourceId:'a',version:1,sha256:'a'.repeat(64)}],recipientEmail:' Recipient@Example.test ',stipulationCompleted:true,releaseApproved:true,annualBenefit:true});
const accept=()=>({secret,expectedInvitationVersion:2,home:{name:' Casa DEMO ',address:' Via DEMO 12 '}});
const invalid=fn=>assert.throws(fn,e=>e instanceof I.GiftInvitationError&&e.code==='invalid_input');
const parsers=[{make:()=>({secret}),parse:b=>H.parseGiftLandingBody(b)},{make:()=>({secret,expectedVersion:2}),parse:b=>H.parseGiftClaimBody(b)},{make:()=>({expectedVersion:2}),parse:b=>H.parseGiftVersionBody(b)},{make:create,parse:b=>H.parseGiftCreateBody(b,header)},{make:accept,parse:b=>H.parseGiftAcceptanceBody(b,header)}];
function replace(module,key,replacement,check){const original=module[key];module[key]=replacement;try{check();}finally{module[key]=original;}}

test('landing, claim and version body parsers return only their transport fields',()=>{
 assert.deepEqual(H.parseGiftLandingBody({secret}),{secret});assert.deepEqual(H.parseGiftClaimBody({secret,expectedVersion:2}),{secret,expectedVersion:2});assert.deepEqual(H.parseGiftVersionBody({expectedVersion:2}),{expectedVersion:2});
});
test('create obtains key only from header and applies canonical invitation normalization',()=>{
 const input=create(),before=structuredClone(input),parsed=H.parseGiftCreateBody(input,' '+header+' ');assert.deepEqual(input,before);
 assert.deepEqual(parsed,{key:header,expectedRevision:4,documents:[{sourceId:'a',version:1,sha256:'a'.repeat(64)},{sourceId:'b',version:2,sha256:'b'.repeat(64)}],recipientEmail:'recipient@example.test',stipulationCompleted:true,releaseApproved:true,annualBenefit:true});
 parsed.documents[0].sourceId='changed';assert.equal(input.documents[1].sourceId,'a');assert.equal(input.documents[0].sourceId,' b ');
});
test('acceptance passes header key to canonical owner-confirmed Home parser and clones nested Home',()=>{
 const input=accept(),before=structuredClone(input),parsed=H.parseGiftAcceptanceBody(input,' '+header+' ');assert.deepEqual(input,before);
 assert.deepEqual(parsed,{secret,command:{key:header,expectedInvitationVersion:2,home:{name:'Casa DEMO',address:'Via DEMO 12'}}});parsed.command.home.name='changed';assert.equal(input.home.name,' Casa DEMO ');
});
test('secret must be exactly 43 base64url characters without trimming or decoding',()=>{
 for(const value of ['',null,42,secret.slice(1),secret+'A',' '+secret,secret+' ',secret.slice(0,42)+'=','%41'+secret.slice(1),'é'.repeat(43),new String(secret)]){
  invalid(()=>H.parseGiftLandingBody({secret:value}));invalid(()=>H.parseGiftClaimBody({secret:value,expectedVersion:1}));invalid(()=>H.parseGiftAcceptanceBody({...accept(),secret:value},header));
 }
 const varied='Ab0_-'.repeat(8)+'Ab0';assert.equal(H.parseGiftLandingBody({secret:varied}).secret,varied);
});
test('version fields require positive safe integers rather than strings, fractions or overflow',()=>{
 for(const value of [undefined,null,0,-1,1.5,'1',NaN,Infinity,Number.MAX_SAFE_INTEGER+1,1n]){
  invalid(()=>H.parseGiftClaimBody({secret,expectedVersion:value}));invalid(()=>H.parseGiftVersionBody({expectedVersion:value}));invalid(()=>H.parseGiftAcceptanceBody({...accept(),expectedInvitationVersion:value},header));invalid(()=>H.parseGiftCreateBody({...create(),expectedRevision:value},header));
 }
 assert.equal(H.parseGiftVersionBody({expectedVersion:Number.MAX_SAFE_INTEGER}).expectedVersion,Number.MAX_SAFE_INTEGER);
});
test('unknown privileged fields and body-supplied keys are refused instead of ignored',()=>{
 for(const {make,parse} of parsers)for(const key of ['key','accountId','homeId','offer','offerId','tokenHash','verifiedEmail','issuerAccountId','permissions','descriptors'])invalid(()=>parse({...make(),[key]:'injected'}));
 const b=accept();b.home.homeId='injected';invalid(()=>H.parseGiftAcceptanceBody(b,header));
 const c=create();c.documents[0].descriptor={lifecycle:'signed'};invalid(()=>H.parseGiftCreateBody(c,header));
});
test('every required body field must be present as an own plain data property',()=>{
 for(const {make,parse} of parsers){
  for(const key of Object.keys(make())){const b=make();delete b[key];invalid(()=>parse(b));}
  for(const b of [null,[],new Date(),Object.assign(Object.create(null),make()),Object.assign(Object.create({inherited:true}),make())])invalid(()=>parse(b));
 }
});
test('top-level accessors, symbols and non-enumerable fields are rejected without evaluating getters',()=>{
 for(const {make,parse} of parsers){
  const key=Object.keys(make())[0],b=make();let touched=false;Object.defineProperty(b,key,{enumerable:true,get(){touched=true;return 'forged';}});invalid(()=>parse(b));assert.equal(touched,false);
  const symbol=make();symbol[Symbol('private')]='secret';invalid(()=>parse(symbol));const hidden=make();Object.defineProperty(hidden,key,{enumerable:false,value:hidden[key]});invalid(()=>parse(hidden));
 }
});
test('nested Home properties are strict data fields with no getters or hidden extras',()=>{
 for(const key of ['name','address']){
  const b=accept();let touched=false;Object.defineProperty(b.home,key,{enumerable:true,get(){touched=true;return 'forged';}});invalid(()=>H.parseGiftAcceptanceBody(b,header));assert.equal(touched,false);
 }
 const b=accept();b.home[Symbol('private')]=true;invalid(()=>H.parseGiftAcceptanceBody(b,header));
 const c=accept();Object.defineProperty(c.home,'name',{enumerable:false,value:'hidden'});invalid(()=>H.parseGiftAcceptanceBody(c,header));
});
test('document selection is dense and contains exact plain source/version/hash rows',()=>{
 for(const documents of [null,[],Array.from({length:51},(_,i)=>({sourceId:'source-'+i,version:1,sha256:'a'.repeat(64)})),Array(1),[{sourceId:'a',version:1,sha256:'a'.repeat(64),accountId:'injected'}],[Object.assign(Object.create(null),{sourceId:'a',version:1,sha256:'a'.repeat(64)})]])invalid(()=>H.parseGiftCreateBody({...create(),documents},header));
 const b=create();b.documents.extra='private';invalid(()=>H.parseGiftCreateBody(b,header));const c=create();c.documents[Symbol('private')]=true;invalid(()=>H.parseGiftCreateBody(c,header));
 let touched=false;const d=create();Object.defineProperty(d.documents,'0',{enumerable:true,get(){touched=true;return {};}});invalid(()=>H.parseGiftCreateBody(d,header));assert.equal(touched,false);
 const e=create();Object.defineProperty(e.documents[0],'sourceId',{enumerable:true,get(){touched=true;return 'forged';}});invalid(()=>H.parseGiftCreateBody(e,header));assert.equal(touched,false);
});
test('canonical source, email and release validation is preserved',()=>{
 for(const change of [b=>b.documents[0].sha256='A'.repeat(64),b=>b.documents[0].sourceId='',b=>b.documents[0].version=0,b=>b.recipientEmail='not-email',b=>b.stipulationCompleted=false,b=>b.releaseApproved=false,b=>b.annualBenefit='true']){const b=create();change(b);invalid(()=>H.parseGiftCreateBody(b,header));}
 const b=create();b.documents[0].sourceId='a';invalid(()=>H.parseGiftCreateBody(b,header));
});
test('header must be one bounded string with C0/C1 controls denied before normalization',()=>{
 for(const value of [undefined,null,42,[],[header],[header,header],'','  ',new String(header),'a'.repeat(121),' '+ 'a'.repeat(120),'bad\nkey','bad\u007fkey','bad\u0085key']){
  invalid(()=>H.parseGiftCreateBody(create(),value));invalid(()=>H.parseGiftAcceptanceBody(accept(),value));
 }
 assert.equal(H.parseGiftCreateBody(create(),'a'.repeat(120)).key,'a'.repeat(120));assert.equal(H.parseGiftAcceptanceBody(accept(),' '+ 'a'.repeat(118)+' ').command.key,'a'.repeat(118));
});
test('owner-confirmed Home text retains existing canonical length and control rules',()=>{
 const b=accept();b.home={name:'🧱'.repeat(80),address:'a'.repeat(200)};assert.equal(H.parseGiftAcceptanceBody(b,header).command.home.name,b.home.name);
 for(const home of [{name:'n'.repeat(81),address:'address'},{name:'name',address:'a'.repeat(201)},{name:' ',address:'address'},{name:'name',address:''},{name:'bad\nname',address:'address'},{name:'name',address:'bad\u0085address'}])invalid(()=>H.parseGiftAcceptanceBody({...accept(),home},header));
});
test('known domain validation failures normalize to safe GiftInvitationError without original diagnostics',()=>{
 for(const target of [{module:I,key:'parseGiftInvitationCommand',invoke:()=>H.parseGiftCreateBody(create(),header)},{module:A,key:'parseGiftAcceptanceCommand',invoke:()=>H.parseGiftAcceptanceBody(accept(),header)}]){
  const original=new PracticeError('invalid_input');original.message='PRIVATE-DOMAIN-DIAGNOSTIC';replace(target.module,target.key,()=>{throw original;},()=>assert.throws(target.invoke,e=>e instanceof I.GiftInvitationError&&e.code==='invalid_input'&&e.message==='invalid_input'&&e!==original));
 }
});
test('unexpected and non-validation domain errors are not mislabeled as input errors',()=>{
 for(const failure of [new Error('unexpected domain failure'),new PracticeError('access_denied'),new I.GiftInvitationError('unavailable')]){
  replace(I,'parseGiftInvitationCommand',()=>{throw failure;},()=>assert.throws(()=>H.parseGiftCreateBody(create(),header),e=>e===failure));
  replace(A,'parseGiftAcceptanceCommand',()=>{throw failure;},()=>assert.throws(()=>H.parseGiftAcceptanceBody(accept(),header),e=>e===failure));
 }
});
