const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseGiftDocumentRelease:parse}=require('../dist/agency-practices/gift-document-release');
const command=()=>({key:'gift-release-demo',expectedRevision:3,expectedSourceVersion:2,expectedSha256:'a'.repeat(64),title:'Documento casa DEMO',origin:'received',finalDocumentConfirmed:true,releaseApproved:true});
const invalid=fn=>assert.throws(fn,error=>error.code==='invalid_input');
test('release parses explicit declarations and trims only agent-entered key/title without mutating input',()=>{
 const input=command();input.key='  gift-release-demo  ';input.title='  Documento casa DEMO  ';
 const before=structuredClone(input),result=parse(input);assert.deepEqual(result,command());assert.deepEqual(input,before);
 result.title='Caller mutation';assert.equal(input.title,'  Documento casa DEMO  ');
});
test('received and agency-generated are declarations, while arbitrary origin and false/missing confirmations fail',()=>{
 const input=command();input.origin='agency_generated';assert.equal(parse(input).origin,'agency_generated');
 for(const value of ['ai','signed','verified',null,undefined,4]){const other=command();other.origin=value;invalid(()=>parse(other));}
 for(const field of ['finalDocumentConfirmed','releaseApproved'])for(const value of [false,'true',1,null,undefined]){
  const other=command();other[field]=value;invalid(()=>parse(other));
 }
});
test('practice/source revisions are positive safe integers and source SHA is canonical lowercase hex',()=>{
 for(const field of ['expectedRevision','expectedSourceVersion'])for(const value of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'2',null,undefined]){
  const input=command();input[field]=value;invalid(()=>parse(input));
 }
 for(const value of ['', 'a'.repeat(63),'a'.repeat(65),'A'.repeat(64),'g'.repeat(64),' '+'a'.repeat(64),null,42]){
  const input=command();input.expectedSha256=value;invalid(()=>parse(input));
 }
 const input=command();input.expectedRevision=Number.MAX_SAFE_INTEGER;assert.equal(parse(input).expectedRevision,Number.MAX_SAFE_INTEGER);
});
test('key and title use supplied UTF-16 bounds of 120 and 300, including before trimming',()=>{
 for(const [field,max] of [['key',120],['title',300]]){
  const input=command();input[field]='x'.repeat(max);assert.equal(parse(input)[field].length,max);
  for(const value of ['', ' ', 'x'.repeat(max+1),' '+'x'.repeat(max),null,undefined,7,true,{}]){
   const other=command();other[field]=value;invalid(()=>parse(other));
  }
 }
});
test('control and invisible formatting characters are rejected even at trimmed edges',()=>{
 for(const control of ['\0','\n','\t','\r',String.fromCharCode(127),String.fromCharCode(133),'\u200b']){
  for(const field of ['key','title']){const input=command();input[field]=control+'text';invalid(()=>parse(input));}
 }
});
test('privileged metadata, signature, identity, destination and caller metadata version cannot be injected',()=>{
 for(const field of ['sourceId','descriptor','author','recordedBy','recordedAt','agencyId','practiceId','accountId','homeId','metadataVersion','expectedMetadataVersion','surface','lifecycle','signed','certification','signatureVerification','canDeliver','annualBenefit']){
  const input=command();input[field]={injected:true};invalid(()=>parse(input));
 }
});
test('only exact plain objects are allowed: prototypes, missing fields, hidden and symbol overrides fail',()=>{
 for(const input of [null,[],new Date(),Object.create(command()),Object.assign(Object.create(null),command())])invalid(()=>parse(input));
 const missing=command();delete missing.releaseApproved;invalid(()=>parse(missing));
 const hidden=command();Object.defineProperty(hidden,'surface',{value:{qualification:'reviewed'},enumerable:false});invalid(()=>parse(hidden));
 const symbol=command();symbol[Symbol('surface')]=true;invalid(()=>parse(symbol));
 const hiddenKnown=command();Object.defineProperty(hiddenKnown,'title',{value:'hidden title',enumerable:false});invalid(()=>parse(hiddenKnown));
});
test('accessors are refused without executing caller code',()=>{
 let calls=0;const input=command();Object.defineProperty(input,'title',{enumerable:true,get(){calls++;return 'Injected';}});
 invalid(()=>parse(input));assert.equal(calls,0);
});
test('JSON key order and trim normalize identically while meaningful inner whitespace is retained',()=>{
 const input=command(),reordered=Object.fromEntries(Object.entries(input).reverse());reordered.title='  Documento casa DEMO  ';
 assert.deepEqual(parse(reordered),parse(input));input.title='Documento  casa DEMO';assert.equal(parse(input).title,'Documento  casa DEMO');
});
