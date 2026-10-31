// Pure exception filter tests: fake HTTP host/response only, no Nest application or services.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {HttpException,UnauthorizedException,ForbiddenException,BadRequestException,UnprocessableEntityException}=require('@nestjs/common');
const {GiftErrorFilter}=require('../dist/agency-practices/gift-http');
const {GiftInvitationError}=require('../dist/agency-practices/gift-invitations'),{PracticeError}=require('../dist/agency-practices/domain');
const privateMarker='PRIVATE-TOKEN-OR-PROVIDER-DIAGNOSTIC';
function filtered(error){
 const result={headers:{},status:null,body:null};
 const response={set(values){Object.assign(result.headers,values);return response;},status(value){result.status=value;return response;},json(value){result.body=value;return response;}};
 const host={switchToHttp(){return {getResponse(){return response;}};}};
 new GiftErrorFilter().catch(error,host);return result;
}
function publicEnvelope(result,status,code){
 assert.equal(result.status,status);assert.equal(result.headers['Cache-Control'],'no-store');assert.equal(result.headers['X-Content-Type-Options'],'nosniff');assert.equal(result.headers['Referrer-Policy'],'no-referrer');
 assert.deepEqual(Object.keys(result.body),['error']);assert.deepEqual(Object.keys(result.body.error).sort(),['code','message','requestId']);assert.equal(result.body.error.code,code);assert.equal(typeof result.body.error.message,'string');assert.ok(result.body.error.message.length>0);
 assert.match(result.body.error.requestId,/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu);assert.equal(JSON.stringify(result.body).includes(privateMarker),false);
}

test('Gift failures map to documented statuses with private headers and minimal envelopes',()=>{
 for(const [code,status] of [['unavailable',404],['invalid_input',422],['revision_conflict',409],['idempotency_conflict',409],['benefit_unavailable',503]]){
  const error=new GiftInvitationError(code);error.message=privateMarker;error.detail={token:privateMarker};publicEnvelope(filtered(error),status,code);
 }
});
test('Practice failures retain safe codes without echoing message or context',()=>{
 for(const [code,status] of [['access_denied',403],['invalid_input',422],['revision_conflict',409],['idempotency_conflict',409],['source_changed',409]]){
  const error=new PracticeError(code);error.message=privateMarker;error.path=privateMarker;publicEnvelope(filtered(error),status,code);
 }
});
test('missing session and account-context change remain distinguishable without session diagnostics',()=>{
 publicEnvelope(filtered(new UnauthorizedException({code:'account_context_changed',message:privateMarker,accountId:privateMarker})),401,'account_context_changed');
 publicEnvelope(filtered(new UnauthorizedException(privateMarker)),401,'unauthenticated');
 publicEnvelope(filtered(new UnauthorizedException({code:privateMarker,message:privateMarker})),401,'unauthenticated');
});
test('CSRF failures and rate limits preserve status without provider or request body details',()=>{
 publicEnvelope(filtered(new ForbiddenException({code:'csrf_invalid',message:privateMarker,secret:privateMarker})),403,'csrf_invalid');
 publicEnvelope(filtered(new HttpException({code:privateMarker,message:privateMarker},429)),429,'rate_limited');
});
test('HTTP validation errors are normalized and never expose field or raw input diagnostics',()=>{
 publicEnvelope(filtered(new BadRequestException({message:[privateMarker],fieldErrors:{secret:privateMarker}})),422,'invalid_input');
 publicEnvelope(filtered(new UnprocessableEntityException({code:privateMarker,message:privateMarker,providedValue:privateMarker})),422,'invalid_input');
});
test('known storage failure codes expose only the static public response',()=>{
 for(const code of ['storage_unavailable','file_check_unavailable','storage_capacity_low'])publicEnvelope(filtered(new HttpException({code,message:privateMarker,scannerOutput:privateMarker,path:privateMarker},503)),503,code);
});
test('unknown HTTP errors and private bodies become generic unavailable responses',()=>{
 for(const error of [new HttpException({code:privateMarker,message:privateMarker,path:privateMarker,token:privateMarker},500),new HttpException({code:privateMarker,message:privateMarker},503),new HttpException(privateMarker,500)])publicEnvelope(filtered(error),503,'service_unavailable');
});
test('ordinary failures produce generic 503 rather than an accidental success or raw diagnostic',()=>{
 const error=new Error(privateMarker);error.privateContext={path:privateMarker};publicEnvelope(filtered(error),503,'service_unavailable');publicEnvelope(filtered({message:privateMarker,status:200}),503,'service_unavailable');
});
test('request IDs are fresh while equivalent public errors remain generic',()=>{
 const first=filtered(new Error(privateMarker)),second=filtered(new Error(privateMarker));publicEnvelope(first,503,'service_unavailable');publicEnvelope(second,503,'service_unavailable');assert.notEqual(first.body.error.requestId,second.body.error.requestId);assert.equal(first.body.error.message,second.body.error.message);
});
test('filter handling does not log raw errors or HTTP payloads',t=>{
 const logs=[];for(const method of ['log','warn','error','debug'])t.mock.method(console,method,(...args)=>logs.push(args));
 publicEnvelope(filtered(new HttpException({code:privateMarker,message:privateMarker,provider:privateMarker},500)),503,'service_unavailable');publicEnvelope(filtered(new Error(privateMarker)),503,'service_unavailable');assert.deepEqual(logs,[]);
});

test('Gift error diagnostics never execute code getters, coercion or throwing response accessors',()=>{
 let touched=0;const getterBody={message:privateMarker};Object.defineProperty(getterBody,'code',{get(){touched++;throw Error(privateMarker);}});
 const coercionBody={code:{toString(){touched++;throw Error(privateMarker);}},message:privateMarker};
 class BrokenResponse extends HttpException{getResponse(){throw Error(privateMarker);}}
 for(const error of [new HttpException(getterBody,503),new HttpException(coercionBody,503),new BrokenResponse(privateMarker,503)])publicEnvelope(filtered(error),503,'service_unavailable');
 assert.equal(touched,0);
});