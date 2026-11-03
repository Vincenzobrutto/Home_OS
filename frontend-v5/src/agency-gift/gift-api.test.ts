import {describe,it,expect,vi} from 'vitest';
import {ApiTransport,type FetchLike} from '../api/transport';
import {GiftApi,type GiftAgencyScope,type GiftReleaseInput,type GiftCreateInput,type GiftBeginInput} from './gift-api';
const id=(n:number)=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0'),account=id(1),agency=id(2),practice=id(3),invitation=id(4),job=id(5),hash='a'.repeat(64),secret='S'.repeat(43),csrf='C'.repeat(43),key='caller-stable-key-000001';
const scope=():GiftAgencyScope=>({accountId:account,agencyId:agency,practiceId:practice}),root='/agencies/'+agency+'/practices/'+practice;
const documents=(sourceId='source/demo?#')=>({practiceId:practice,revision:5,documents:[{sourceId,sourceVersion:3,sha256:hash,filename:'prospetto.pdf',state:'current',metadataVersion:2,descriptor:{agencyId:agency,practiceId:practice,sourceId,sourceVersion:3,sha256:hash,metadataVersion:2,origin:'agency_generated',lifecycle:'final',author:'Autore dichiarato',title:'Prospetto DEMO'}}],certification:false});
const release=():GiftReleaseInput=>({expectedRevision:4,expectedSourceVersion:3,expectedSha256:hash,title:' Prospetto DEMO ',origin:'agency_generated',finalDocumentConfirmed:true,releaseApproved:true});
const create=():GiftCreateInput=>({expectedRevision:5,documents:[{sourceId:'source/demo?#',version:3,sha256:hash}],recipientEmail:' Recipient@Example.test ',stipulationCompleted:true,releaseApproved:true,annualBenefit:true});
const begin=():GiftBeginInput=>({secret,expectedInvitationVersion:2,home:{name:' Casa DEMO ',address:' Via DEMO 1 '}});
const pending=()=>({jobId:job,state:'queued',version:1,replay:false,createsHome:false,activatesBenefit:false});
const preview=()=>({id:invitation,version:1,state:'invited',agencyName:'Agency DEMO',documents:[{title:'Prospetto DEMO',author:'Autore dichiarato',origin:'agency_generated',lifecycle:'final',signatureVerification:'not_assessed'}],annualBenefit:{requested:false}});
const accepted=()=>({jobId:job,state:'accepted',receiptId:id(7),receiptVersion:1,replay:true,homeId:id(6),acceptedAt:'2026-10-31T12:00:00.000Z',documents:[{documentId:id(9),sha256:hash}],benefit:{schemaVersion:1,id:id(8),receiptId:id(7),accountId:account,offerId:'dimora-full-access-v1',offerVersion:1,startsAt:'2026-10-31T12:00:00.000Z',endsAt:'2027-10-31T12:00:00.000Z'},createsHome:true,activatesBenefit:true});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
function client(response:unknown|((path:string,init:RequestInit)=>unknown)){
 const fetch=vi.fn<FetchLike>(async(path,init)=>path.endsWith('/session')?json({csrfToken:csrf,account:null}):json(typeof response==='function'?response(path,init):response));const transport=new ApiTransport({fetch});return {fetch,transport,api:new GiftApi(transport)};
}
const body=(call:[string,RequestInit])=>JSON.parse(String(call[1].body)) as Record<string,unknown>;

describe('Gift API uses the existing V5 transport with validated scope and DTOs',()=>{
 it('anonymous landing shares the existing CSRF session and places its credential only in the POST body',async()=>{
  const c=client({id:invitation,version:1,requiresAccount:true});await c.transport.getSession();const signal=new AbortController().signal;await c.api.landing(invitation,secret,signal);
  expect(c.fetch).toHaveBeenCalledTimes(2);const [path,init]=c.fetch.mock.calls[1]!;expect(path).toBe('/api/v5/gift-invitations/'+invitation+'/landing');expect(path).not.toContain(secret);expect(init.method).toBe('POST');expect(body(c.fetch.mock.calls[1]!)).toEqual({secret});const headers=new Headers(init.headers);expect(headers.get('x-csrf-token')).toBe(csrf);expect(headers.has('x-account-context')).toBe(false);expect(headers.has('idempotency-key')).toBe(false);expect(init.credentials).toBe('include');expect(init.cache).toBe('no-store');expect(init.signal).toBe(signal);
 });
 it('reads account capabilities and benefits without manufacturing an active year or allocating another transport session',async()=>{
  const c=client((path:string)=>path.endsWith('/gift-capabilities')?{enabled:false,requiresVerifiedEmail:true}:{fullAccess:false,scope:'all_owner_features',validUntil:null});expect((await c.api.capabilities(account)).enabled).toBe(false);expect((await c.api.benefits(account)).fullAccess).toBe(false);
  expect(c.fetch.mock.calls.map(call=>call[0])).toEqual(['/api/v5/gift-capabilities','/api/v5/gift-benefits']);for(const call of c.fetch.mock.calls)expect(new Headers(call[1].headers).get('x-account-context')).toBe(account);
 });
 it('reads documents and invitation lists under the captured account/practice scope and forwards AbortSignal',async()=>{
  const c=client((path:string)=>path.endsWith('/gift-documents')?documents():{practiceId:practice,accepted:false,invitations:[]}),s=scope(),signal=new AbortController().signal,read=c.api.documents(s,signal);s.practiceId=id(99);await read;await c.api.listInvitations(scope(),signal);
  expect(c.fetch.mock.calls.map(call=>call[0])).toEqual(['/api/v5'+root+'/gift-documents','/api/v5'+root+'/gift-invitations']);for(const call of c.fetch.mock.calls){expect(call[1].signal).toBe(signal);expect(new Headers(call[1].headers).get('x-account-context')).toBe(account);}
 });
 it('encodes a valid source ID as one path segment and sends the narrow release command/header without declared authority extras',async()=>{
  const c=client({replay:false,metadata:documents()}),signal=new AbortController().signal;await c.api.releaseDocument(scope(),'source/demo?#',release(),key,signal);const call=c.fetch.mock.calls[1]!;expect(call[0]).toBe('/api/v5'+root+'/sources/source%2Fdemo%3F%23/gift-release');expect(body(call)).toEqual({...release(),title:'Prospetto DEMO'});expect(new Headers(call[1].headers).get('idempotency-key')).toBe(key);expect(new Headers(call[1].headers).get('x-account-context')).toBe(account);expect(call[1].signal).toBe(signal);
 });
 it('clones and normalizes the creation request before CSRF await so caller mutation cannot alter its meaning',async()=>{
  const c=client({id:invitation,version:1,state:'invited',secret,replay:false,requiresReissue:false}),input=create(),op=c.api.createInvitation(scope(),input,key);input.documents[0]!.sourceId='changed';input.recipientEmail='changed@example.test';await op;const call=c.fetch.mock.calls[1]!;expect(call[0]).toBe('/api/v5'+root+'/gift-invitations');expect(body(call)).toEqual({...create(),recipientEmail:'recipient@example.test'});expect(new Headers(call[1].headers).get('idempotency-key')).toBe(key);expect(body(call)).not.toHaveProperty('key');
 });
 it('uses authenticated preview/claim and agency revoke paths with version-only authority and shared CSRF',async()=>{
  const c=client((path:string)=>path.endsWith('/preview')?preview():path.endsWith('/claim')?{id:invitation,version:2,state:'claimed',replay:false}:{id:invitation,version:3,state:'revoked',replay:false});await c.api.preview(account,invitation,secret);await c.api.claim(account,invitation,secret,1);await c.api.revokeInvitation(scope(),invitation,2);
  expect(c.fetch.mock.calls.filter(call=>call[0].endsWith('/session'))).toHaveLength(1);const requests=c.fetch.mock.calls.filter(call=>!call[0].endsWith('/session'));expect(requests.map(call=>call[0])).toEqual(['/api/v5/gift-invitations/'+invitation+'/preview','/api/v5/gift-invitations/'+invitation+'/claim','/api/v5'+root+'/gift-invitations/'+invitation+'/revoke']);expect(requests.map(body)).toEqual([{secret},{secret,expectedVersion:1},{expectedVersion:2}]);for(const call of requests){expect(new Headers(call[1].headers).get('x-account-context')).toBe(account);expect(new Headers(call[1].headers).get('x-csrf-token')).toBe(csrf);expect(call[0]).not.toContain(secret);}
 });
 it('begin sends only owner-confirmed Home text and the caller key, then resolves status without credentials in URL or cache keys',async()=>{
  const c=client((path:string)=>path.endsWith('/my-acceptance')?{state:'not_started'}:pending()),signal=new AbortController().signal;await c.api.begin(account,invitation,begin(),key,signal);await c.api.resume(account,invitation,signal);await c.api.status(account,job,signal);
  const call=c.fetch.mock.calls[1]!;expect(call[0]).toBe('/api/v5/gift-invitations/'+invitation+'/acceptances');expect(body(call)).toEqual({...begin(),home:{name:'Casa DEMO',address:'Via DEMO 1'}});expect(new Headers(call[1].headers).get('idempotency-key')).toBe(key);expect(c.fetch.mock.calls[2]![0]).toBe('/api/v5/gift-invitations/'+invitation+'/my-acceptance');expect(c.fetch.mock.calls[3]![0]).toBe('/api/v5/gift-acceptances/'+job);for(const request of c.fetch.mock.calls.slice(1)){expect(request[1].signal).toBe(signal);expect(request[0]).not.toContain(secret);}
 });
 it('cancel has its distinct minimal DTO and sends an empty authenticated body',async()=>{
  const c=client({jobId:job,state:'cancelled',replay:false});expect((await c.api.cancel(account,job)).state).toBe('cancelled');const call=c.fetch.mock.calls[1]!;expect(call[0]).toBe('/api/v5/gift-acceptances/'+job+'/cancel');expect(body(call)).toEqual({});expect(new Headers(call[1].headers).get('x-account-context')).toBe(account);
 });
 it('rejects malformed IDs, source traversal, commands, explicit keys and privileged fields before ANY session/network side effect',async()=>{
  const c=client({});const invalid=[()=>c.api.capabilities('bad'),()=>c.api.documents({...scope(),practiceId:'bad'}),()=>c.api.landing(invitation,secret+'\n'),()=>c.api.claim(account,invitation,secret,0),()=>c.api.releaseDocument(scope(),'..',release(),key),()=>c.api.releaseDocument(scope(),'.',release(),key),()=>c.api.releaseDocument(scope(),'source/demo?#',{...release(),author:'forged'} as GiftReleaseInput,key),()=>c.api.createInvitation(scope(),{...create(),homeId:id(6)} as GiftCreateInput,key),()=>c.api.begin(account,invitation,{...begin(),home:{name:'n'.repeat(81),address:'address'}},key),()=>c.api.begin(account,invitation,begin(),'bad\nkey'),()=>c.api.begin(account,invitation,{...begin(),home:{name:'',address:'address'}},key),()=>c.api.createInvitation(scope(),{...create(),documents:Array(1)},key),()=>c.api.createInvitation(scope(),{...create(),documents:[...create().documents,...create().documents]},key),()=>c.api.releaseDocument(scope(),'source/demo?#',release(),'')];
  for(const invoke of invalid)await expect(invoke()).rejects.toBeInstanceOf(TypeError);expect(c.fetch).not.toHaveBeenCalled();
 });
 it('does not evaluate command getters, echo credentials, or silently accept hidden fields during input validation',async()=>{
  const c=client({}),input=begin();let touched=false;Object.defineProperty(input,'secret',{enumerable:true,get(){touched=true;return secret;}});await expect(c.api.begin(account,invitation,input,key)).rejects.toBeInstanceOf(TypeError);expect(touched).toBe(false);expect(c.fetch).not.toHaveBeenCalled();
  try{await c.api.landing(invitation,'private-invalid-credential');expect.unreachable();}catch(error){expect(String(error)).not.toContain('private-invalid-credential');}
 });
 it('binds response IDs to the target invitation/job for every recipient and revoke/cancel operation',async()=>{
  for(const [wire,invoke]of [
   [{id:id(99),version:1,requiresAccount:true},(api:GiftApi)=>api.landing(invitation,secret)],
   [{...preview(),id:id(99)},(api:GiftApi)=>api.preview(account,invitation,secret)],
   [{id:id(99),version:2,state:'claimed',replay:false},(api:GiftApi)=>api.claim(account,invitation,secret,1)],
   [{id:id(99),version:2,state:'revoked',replay:false},(api:GiftApi)=>api.revokeInvitation(scope(),invitation,1)],
   [{...pending(),jobId:id(99)},(api:GiftApi)=>api.status(account,job)],
   [{jobId:id(99),state:'cancelled',replay:false},(api:GiftApi)=>api.cancel(account,job)],
  ] as const)await expect(invoke(client(wire).api)).rejects.toMatchObject({kind:'service',status:200});
 });
 it('binds document practice/agency scopes and release target proofs instead of trusting a structurally valid foreign response',async()=>{
  const foreign=documents();foreign.practiceId=id(99);foreign.documents[0]!.descriptor.practiceId=id(99);await expect(client(foreign).api.documents(scope())).rejects.toMatchObject({kind:'service',status:200});
  const otherAgency=documents();otherAgency.documents[0]!.descriptor.agencyId=id(99);await expect(client(otherAgency).api.documents(scope())).rejects.toMatchObject({kind:'service',status:200});
  await expect(client({practiceId:id(99),accepted:false,invitations:[]}).api.listInvitations(scope())).rejects.toMatchObject({kind:'service',status:200});await expect(client({replay:false,metadata:documents('another-source')}).api.releaseDocument(scope(),'source/demo?#',release(),key)).rejects.toMatchObject({kind:'service',status:200});
 });
 it('binds an accepted benefit to the currently requested account for begin, status and token-free resume',async()=>{
  const foreign=accepted();foreign.benefit.accountId=id(99);for(const invoke of [(api:GiftApi)=>api.begin(account,invitation,begin(),key),(api:GiftApi)=>api.status(account,job),(api:GiftApi)=>api.resume(account,invitation)])await expect(invoke(client(foreign).api)).rejects.toMatchObject({kind:'service',status:200});
  const own=client(accepted());expect((await own.api.status(account,job)).state).toBe('accepted');
 });
 it('propagates HTTP denial and malformed response failures without replacing them with an empty registry or a successful action',async()=>{
  const fetch=vi.fn<FetchLike>(async()=>json({error:{code:'unavailable',message:'Gift non disponibile.'}},404)),api=new GiftApi(new ApiTransport({fetch}));await expect(api.status(account,job)).rejects.toMatchObject({status:404,code:'unavailable'});expect(fetch).toHaveBeenCalledTimes(1);
  await expect(client({enabled:false,requiresVerifiedEmail:true,tokenHash:'injected'}).api.capabilities(account)).rejects.toMatchObject({kind:'service',status:200});await expect(client({replay:false,metadata:documents(),receipt:{key:'private'}}).api.releaseDocument(scope(),'source/demo?#',release(),key)).rejects.toMatchObject({kind:'service',status:200});
 });
 it('does not automatically retry an uncertain POST or allocate a replacement key; an explicit caller retry retains the same input',async()=>{
  const fetch=vi.fn<FetchLike>(async path=>{if(path.endsWith('/session'))return json({csrfToken:csrf,account:null});throw new TypeError('synthetic connection lost');}),api=new GiftApi(new ApiTransport({fetch}));await expect(api.begin(account,invitation,begin(),key)).rejects.toMatchObject({kind:'service',status:0});expect(fetch).toHaveBeenCalledTimes(2);await expect(api.begin(account,invitation,begin(),key)).rejects.toMatchObject({kind:'service',status:0});expect(fetch).toHaveBeenCalledTimes(3);expect(body(fetch.mock.calls[1]!)).toEqual(body(fetch.mock.calls[2]!));expect(new Headers(fetch.mock.calls[1]![1].headers).get('idempotency-key')).toBe(key);expect(new Headers(fetch.mock.calls[2]![1].headers).get('idempotency-key')).toBe(key);
 });
});
it('Home confirmation preserves valid Unicode joiners like the canonical backend command',async()=>{
 const c=client(pending()),input=begin();input.home={name:' Casa 👨‍👩‍👧 ',address:' Via DEMO‌ 1 '};
 await c.api.begin(account,invitation,input,key);
 const call=c.fetch.mock.calls.find(([path])=>path.endsWith('/acceptances'));expect(call).toBeDefined();
 expect(body(call!).home).toEqual({name:'Casa 👨‍👩‍👧',address:'Via DEMO‌ 1'});
});
describe('atomic Gift link reissue transport',()=>{
 it('uses the shared CSRF/account transport, exact revisions and stable key without sending a secret',async()=>{
  const c=client({id:id(10),version:1,state:'invited',secret,replay:false,requiresReissue:false});
  const signal=new AbortController().signal,out=await c.api.reissueInvitation(scope(),invitation,{expectedRevision:5,expectedVersion:2},key,signal);
  expect(out.id).toBe(id(10));const call=c.fetch.mock.calls.at(-1)!;expect(call[0]).toBe('/api/v5'+root+'/gift-invitations/'+invitation+'/reissue');
  expect(body(call)).toEqual({expectedRevision:5,expectedVersion:2});const headers=new Headers(call[1].headers);expect(headers.get('idempotency-key')).toBe(key);expect(headers.get('x-account-context')).toBe(account);expect(headers.get('x-csrf-token')).toBe(csrf);expect(call[1].signal).toBe(signal);
 });
 it('preserves historical replacement state but never manufactures a replay secret',async()=>{
  const c=client({id:id(10),version:2,state:'revoked',secret:null,replay:true,requiresReissue:true});const out=await c.api.reissueInvitation(scope(),invitation,{expectedRevision:5,expectedVersion:2},key);expect(out).toMatchObject({state:'revoked',secret:null,replay:true});
 });
 it('rejects body overrides or invalid versions before any request',async()=>{
  const c=client({});for(const value of [{expectedRevision:0,expectedVersion:1},{expectedRevision:1,expectedVersion:2,secret},{expectedRevision:1,expectedVersion:'2'}])await expect(c.api.reissueInvitation(scope(),invitation,value as never,key)).rejects.toThrow();expect(c.fetch).not.toHaveBeenCalled();
 });
 it('rejects fresh revoked output or leaked replay credentials',async()=>{
  for(const result of [{id:id(10),version:2,state:'revoked',secret,replay:false,requiresReissue:false},{id:id(10),version:1,state:'invited',secret,replay:true,requiresReissue:true}]){
   const c=client(result);await expect(c.api.reissueInvitation(scope(),invitation,{expectedRevision:5,expectedVersion:2},key)).rejects.toMatchObject({kind:'service'});
  }
 });
});

it('sends optional digital plan reference without dropping it at the strict transport boundary',async()=>{
 const {api,fetch,transport}=client({replay:false,metadata:documents()});await transport.getSession();
 await api.releaseDocument(scope(),'source/demo?#',{...release(),digitalPlan:{planId:'plan-DEMO',expectedPlanVersion:3,reviewed:true}},key);
 const sent=JSON.parse(String(fetch.mock.calls.at(-1)![1]!.body));expect(sent.digitalPlan).toEqual({planId:'plan-DEMO',expectedPlanVersion:3,reviewed:true});expect(sent).not.toHaveProperty('rooms');
});
