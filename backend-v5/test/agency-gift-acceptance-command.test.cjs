const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseGiftAcceptanceCommand:parse,acceptanceCommandDigest:digest}=require('../dist/agency-practices/gift-acceptance-command');
const command=()=>({key:'accept-demo',expectedInvitationVersion:2,home:{name:'Casa DEMO',address:'Via Esempio 10, Bologna'}});
const invalid=fn=>assert.throws(fn,e=>e.code==='invalid_input');
test('acceptance normalizes explicit owner text without mutating the request',()=>{
 const input=command();input.key='  accept-demo  ';input.home.name='  Casa DEMO  ';input.home.address='  Via Esempio 10, Bologna  ';
 const before=structuredClone(input),result=parse(input);assert.deepEqual(result,command());assert.deepEqual(input,before);result.home.name='Caller change';assert.equal(input.home.name,'  Casa DEMO  ');
});
test('Home limits match CreateHomeDto code points after trimming, including emoji',()=>{
 const input=command(),point=String.fromCodePoint(0x1f3e0);input.home.name=' '+point.repeat(80)+' ';input.home.address=' '+point.repeat(200)+' ';
 const parsed=parse(input);assert.equal(Array.from(parsed.home.name).length,80);assert.equal(Array.from(parsed.home.address).length,200);
 for(const [field,length] of [['name',81],['address',201]]){const other=command();other.home[field]=point.repeat(length);invalid(()=>parse(other));}
});
test('blank or non-string Home values cannot be inferred from other fields',()=>{
 for(const field of ['name','address'])for(const value of ['', '   ',null,undefined,42,true,{}]){const input=command();input.home[field]=value;invalid(()=>parse(input));}
 const input=command();delete input.home;invalid(()=>parse(input));
});
test('control characters in key or Home text are rejected even at trimmed edges',()=>{
 for(const control of ['\0','\n','\t','\r',String.fromCharCode(127),String.fromCharCode(133)]){
  for(const field of ['name','address']){const input=command();input.home[field]=control+'Casa';invalid(()=>parse(input));}
  const input=command();input.key='accept'+control;invalid(()=>parse(input));
 }
});
test('internal keys are nonblank and bounded to 120 supplied UTF-16 units',()=>{
 const input=command();input.key='x'.repeat(120);assert.equal(parse(input).key.length,120);
 for(const value of ['', ' ', 'x'.repeat(121), ' '+ 'x'.repeat(120),null,undefined,3]){const other=command();other.key=value;invalid(()=>parse(other));}
});
test('expected invitation version is a safe positive integer',()=>{
 for(const value of [0,-1,1.2,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'2',null,undefined]){const input=command();input.expectedInvitationVersion=value;invalid(()=>parse(input));}
 const input=command();input.expectedInvitationVersion=Number.MAX_SAFE_INTEGER;assert.equal(parse(input).expectedInvitationVersion,Number.MAX_SAFE_INTEGER);
});
test('client cannot inject account, target Home, entitlement, manifest or acceptance outcome',()=>{
 for(const field of ['accountId','homeId','targetHomeId','annualBenefit','entitlement','token','manifest','acceptedAt','createsHome','state']){const input=command();input[field]='injected';invalid(()=>parse(input));}
 for(const field of ['id','homeId','ownerId','role','premium']){const input=command();input.home[field]='injected';invalid(()=>parse(input));}
});
test('only strict plain objects are accepted, excluding inherited, hidden and symbol fields',()=>{
 for(const input of [null,[],new Date(),Object.create(command()),Object.assign(Object.create(null),command())])invalid(()=>parse(input));
 const nested=command();nested.home=Object.assign(Object.create({inherited:true}),nested.home);invalid(()=>parse(nested));
 const hidden=command();Object.defineProperty(hidden,'accountId',{value:'hidden',enumerable:false});invalid(()=>parse(hidden));
 const symbol=command();symbol[Symbol('override')]='hidden';invalid(()=>parse(symbol));
});
test('accessors are rejected without executing user code',()=>{
 let calls=0;const input=command();Object.defineProperty(input.home,'name',{get(){calls++;return 'Getter Home';},enumerable:true});invalid(()=>parse(input));assert.equal(calls,0);
});
test('digest is canonical across trim and JSON key ordering but preserves meaningful inner whitespace',()=>{
 const reordered={home:{address:'  Via Esempio 10, Bologna  ',name:' Casa DEMO '},expectedInvitationVersion:2,key:' accept-demo '};
 assert.equal(digest(command()),digest(reordered));assert.match(digest(command()),/^[a-f0-9]{64}$/);
 const input=command();input.home.address='Via  Esempio 10, Bologna';assert.notEqual(digest(input),digest(command()));
});
test('digest binds key, expected version and both confirmed Home values',()=>{
 const first=digest(command());for(const mutate of [c=>c.key='other-key',c=>c.expectedInvitationVersion++,c=>c.home.name='Other Home',c=>c.home.address='Other address']){const input=command();mutate(input);assert.notEqual(digest(input),first);}
});
test('digest revalidates and does not absorb generated IDs, token or timestamp',()=>{
 for(const field of ['id','homeId','accountId','token','createdAt']){const input=command();input[field]='generated-or-injected';invalid(()=>digest(input));}
});
