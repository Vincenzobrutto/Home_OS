// Synthetic route-level UI contract tests. No API server, database, email or product fallback.
import {act,fireEvent,screen,waitFor} from '@testing-library/react';
import {describe,expect,it,vi} from 'vitest';
import {createFakeFetch,renderApp,seededBackend,PASSWORD_A} from '../test/harness';
import type {FetchLike} from '../api/client';
import type {SessionResponse} from '../api/types';
const id=(n:number)=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
const ownerId=id(1),invitationId=id(2),homeId=id(3),newAccountId=id(4),jobId=id(5),receiptId=id(6),documentId=id(7),benefitId=id(8);
const token='G'.repeat(43),verifiedAt='2026-10-31T10:00:00.000Z',acceptedAt='2026-10-31T12:00:00.000Z',endsAt='2027-10-31T12:00:00.000Z',path='/gift/'+invitationId;
const signupProof='S'.repeat(43),signupPassword='  Password sintetica 123!  ';
const json=(value:unknown,status=200)=>Response.json(value,{status});
function preview(){return {id:invitationId,version:1,state:'invited',agencyName:'Agenzia sintetica',documents:[{title:'Documento sintetico della casa',author:'Autore dichiarato',origin:'received',lifecycle:'final',signatureVerification:'not_assessed'}],annualBenefit:{requested:false}};}
function accepted(){return {jobId,state:'accepted',receiptId,receiptVersion:1,replay:true,homeId,acceptedAt,documents:[{documentId,sha256:'a'.repeat(64)}],benefit:{schemaVersion:1,id:benefitId,receiptId,accountId:ownerId,offerId:'dimora-full-access-v1',offerVersion:1,startsAt:acceptedAt,endsAt},createsHome:true,activatesBenefit:true};}
async function fixture(options:{authenticated?:boolean;accepted?:boolean;changedEmail?:boolean;recipientEmail?:string;recoveryDisabled?:boolean;loseRegistrationResponse?:boolean}={}){
 const seed=seededBackend(),backend=seed.backend;
 // Existing mock accounts normally use human-readable IDs; only these synthetic fixtures use wire UUIDs.
 function remapAccount(before:string,after:string){const account=backend.accounts.get(before)!;backend.accounts.delete(before);backend.accounts.set(after,{...account,id:after});for(const member of backend.memberships)if(member.accountId===before)member.accountId=after;for(const session of backend.sessions.values())if(session.accountId===before)session.accountId=after;}
 remapAccount(seed.a.id,ownerId);const home=backend.homes.get(seed.homeA1.id)!;backend.homes.delete(seed.homeA1.id);backend.homes.set(homeId,{...home,id:homeId,name:'Casa Gift sintetica'});for(const member of backend.memberships)if(member.homeId===seed.homeA1.id)member.homeId=homeId;
 const control=createFakeFetch(backend),calls:Array<{url:string;init:RequestInit}>=[],unhandled:string[]=[];
 let landingHandler:(credential:string)=>Response|Promise<Response>=credential=>{expect(credential).toBe(token);return json({id:invitationId,version:1,requiresAccount:true});};
 let verificationChallenge:{accountId:string;token:string;consumed:boolean}|null=null;
 let registrationEmailRequested=false;
 let registrationConsumed=false;
 let signupContext=(credential:string,proof:string):Response|Promise<Response>=>{
  if(credential!==token||proof!==signupProof||!registrationEmailRequested||registrationConsumed)return json({error:{code:'unavailable',message:'Synthetic invalid signup'}},404);
  return json({recipientEmail:options.recipientEmail??'new@example.test'});
 };
 const account=backend.accounts.get(ownerId)!;account.emailVerifiedAt=options.changedEmail?null:verifiedAt;account.requiresEmailVerification=true;if(options.changedEmail)account.email='changed@example.test';
 const session=()=>backend.sessions.get(control.cookie()??'');
 const fetch:FetchLike=async(url,init)=>{
  calls.push({url,init});const route=url.replace(/^\/api\/v5/u,''),headers=new Headers(init.headers),method=init.method??'GET';
  if(route.includes('/gift-')||route.startsWith('/auth/email-verification')){
   const current=session();expect(current).toBeDefined();expect(init.credentials).toBe('include');expect(init.cache).toBe('no-store');
   if(method!=='GET')expect(headers.get('X-CSRF-Token')).toBe(current!.csrf);
   if(route.endsWith('/landing')){expect(method).toBe('POST');const body=JSON.parse(String(init.body)) as {secret:string};expect(Object.keys(body)).toEqual(['secret']);expect(headers.has('X-Account-Context')).toBe(false);return landingHandler(body.secret);}
   if(route.endsWith('/registration-email')){
    expect(current!.accountId).toBeNull();expect(headers.has('X-Account-Context')).toBe(false);expect(method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({secret:token});registrationEmailRequested=true;
    return json({message:'Richiesta sintetica registrata.'},202);
   }
   if(route.endsWith('/registration-context')){
    expect(current!.accountId).toBeNull();expect(headers.has('X-Account-Context')).toBe(false);expect(method).toBe('POST');
    const body=JSON.parse(String(init.body)) as {secret:string;proof:string};expect(Object.keys(body)).toEqual(['secret','proof']);
    return signupContext(body.secret,body.proof);
   }
   if(route.endsWith('/register')){
    expect(current!.accountId).toBeNull();expect(headers.has('X-Account-Context')).toBe(false);expect(method).toBe('POST');
    expect(registrationEmailRequested).toBe(true);expect(registrationConsumed).toBe(false);
    expect(JSON.parse(String(init.body))).toEqual({secret:token,proof:signupProof,password:signupPassword});
    registrationConsumed=true;
    const email=options.recipientEmail??'new@example.test';
    const created=await control.fetch('/api/v5/auth/register',{...init,body:JSON.stringify({name:'Proprietario',email,password:signupPassword})});
    expect(created.status).toBe(201);
    const value=await created.json() as {account:{id:string}};
    remapAccount(value.account.id,newAccountId);
    const registered=backend.accounts.get(newAccountId)!;
    registered.emailVerifiedAt=verifiedAt;
    registered.requiresEmailVerification=true;
    if(options.loseRegistrationResponse)throw Error('Synthetic lost response after commit');
    return json({account:{id:newAccountId,name:'Proprietario',email,emailVerifiedAt:verifiedAt,requiresEmailVerification:true}},201);
   }
   if(route==='/auth/email-verification/complete'){
    expect(method).toBe('POST');expect(headers.has('X-Account-Context')).toBe(false);const body=JSON.parse(String(init.body)) as {token:string};
    if(!verificationChallenge||verificationChallenge.consumed||body.token!==verificationChallenge.token)return json({error:{code:'recovery_invalid',message:'Synthetic challenge invalid'}},422);
    if(current!.accountId!==verificationChallenge.accountId)return json({error:{code:'recovery_logout_required',message:'Synthetic account mismatch'}},409);
    verificationChallenge.consumed=true;backend.accounts.get(verificationChallenge.accountId)!.emailVerifiedAt=verifiedAt;return new Response(null,{status:204});
   }
   expect(current!.accountId).toBeTruthy();expect(headers.get('X-Account-Context')).toBe(current!.accountId);
   if(route==='/gift-invitations/'+invitationId+'/my-acceptance'){expect(method).toBe('GET');return json(options.accepted?accepted():{state:'not_started'});}
   if(route==='/gift-invitations/'+invitationId+'/preview'){
    expect(method).toBe('POST');expect(backend.accounts.get(current!.accountId!)?.email).toBe(options.recipientEmail??'a@example.test');expect(backend.accounts.get(current!.accountId!)?.emailVerifiedAt).toBeTruthy();expect(JSON.parse(String(init.body))).toEqual({secret:token});return json(preview());
   }
   if(route==='/gift-benefits'){expect(method).toBe('GET');return json({fullAccess:!!options.accepted,scope:'all_owner_features',validUntil:options.accepted?endsAt:null});}
   if(route==='/auth/email-verification'){expect(method).toBe('POST');expect(JSON.parse(String(init.body))).toEqual({});verificationChallenge={accountId:current!.accountId!,token:'V'.repeat(43),consumed:false};return json({message:'Richiesta sintetica registrata.'},202);}
   unhandled.push(route);return json({error:{code:'unexpected_test_request',message:'Unexpected synthetic request'}},500);
  }
  const response=await control.fetch(url,init);
  if(route==='/auth/register'&&response.status===201){const value=await response.json() as {account:{id:string;name:string;email:string}};remapAccount(value.account.id,newAccountId);const registered=backend.accounts.get(newAccountId)!;registered.emailVerifiedAt=null;registered.requiresEmailVerification=true;return json({account:{...value.account,id:newAccountId}},201);}
  if(route==='/session'&&response.ok){const value=await response.json() as SessionResponse,stored=value.account?backend.accounts.get(value.account.id):undefined;return json({...value,account:value.account?{...value.account,emailVerifiedAt:stored?.emailVerifiedAt??null,requiresEmailVerification:true}:null,authRecovery:{enabled:!options.recoveryDisabled}});}
  return response;
 };
 if(options.authenticated){const initial=await(await fetch('/api/v5/session',{method:'GET',credentials:'include',cache:'no-store'})).json() as SessionResponse;await fetch('/api/v5/auth/login',{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':initial.csrfToken},body:JSON.stringify({email:account.email,password:PASSWORD_A})});calls.length=0;}
 return {fetch,calls,unhandled,backend,control,setLanding:(handler:typeof landingHandler)=>landingHandler=handler,setSignupContext:(handler:typeof signupContext)=>signupContext=handler,issuedVerificationPath:()=>verificationChallenge?'/verifica-email#token='+verificationChallenge.token:null};
}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes;});return {promise,resolve};}
function noUnintendedWrites(calls:Array<{url:string;init:RequestInit}>){expect(calls.filter(call=>(call.init.method??'GET')!=='GET'&&/\/homes(?:\/|$)|\/claim$|\/acceptances$/u.test(call.url))).toEqual([]);expect(calls.some(call=>/\/agencies\/|\/sources\//u.test(call.url))).toBe(false);}
function noCredentialOutsideBodies(calls:Array<{url:string;init:RequestInit}>){for(const call of calls){expect(call.url).not.toContain(token);expect(JSON.stringify(call.init.headers)).not.toContain(token);}}

describe('Gift application through actual routes, session and API client with synthetic transport',()=>{
 it('scrubs a guest personal link and keeps credentials only in explicit POST bodies, not next/cache/storage',async()=>{
  const persist=vi.spyOn(Storage.prototype,'setItem'),f=await fixture(),x=renderApp({path:path+'#token='+token,fetch:f.fetch});
  const register=await screen.findByRole('button',{name:'Richiedi il link di verifica'});expect(x.router.state.location.hash).toBe('');expect(x.router.state.location.search).toBe('');expect(register).toBeEnabled();expect(f.calls.some(call=>call.url.endsWith('/registration-email'))).toBe(false);expect(screen.getByRole('link',{name:'Ho già un account'})).toHaveAttribute('href','/accedi?next='+encodeURIComponent(path));
  const landing=f.calls.filter(call=>call.url.endsWith('/landing'));expect(landing).toHaveLength(1);expect(JSON.parse(String(landing[0]!.init.body))).toEqual({secret:token});expect(f.calls.some(call=>call.url.endsWith('/preview'))).toBe(false);noCredentialOutsideBodies(f.calls);expect(JSON.stringify(x.queryClient.getQueryCache().getAll().map(query=>query.state.data))).not.toContain(token);expect(persist).not.toHaveBeenCalled();expect(f.unhandled).toEqual([]);noUnintendedWrites(f.calls);
 });
 it('creates a normal verified session from the email proof and a single password while leaving acceptance explicit',async()=>{
  const persist=vi.spyOn(Storage.prototype,'setItem'),f=await fixture({recipientEmail:'new@example.test'});
  const x=renderApp({path:path+'#token='+token,fetch:f.fetch});
  const request=await screen.findByRole('button',{name:'Richiedi il link di verifica'});
  expect(f.calls.some(call=>call.url.endsWith('/registration-email'))).toBe(false);
  await x.user.click(request);await screen.findByText(/Richiesta registrata/);
  expect(request).toBeDisabled();
  expect(f.calls.filter(call=>call.url.endsWith('/registration-email'))).toHaveLength(1);
  expect(f.calls.some(call=>call.url.endsWith('/register')||call.url.endsWith('/preview'))).toBe(false);
  await act(()=>x.router.navigate(path+'#token='+token+'&signup='+signupProof));
  const email=await screen.findByLabelText('Email dell’invito');
  expect(email).toHaveValue('new@example.test');expect(email).toHaveAttribute('readonly');
  expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();
  expect(x.router.state.location.hash).toBe('');expect(x.router.state.location.search).toBe('');
  const password=screen.getByLabelText('Password');
  await x.user.type(password,signupPassword);
  const form=password.closest('form')!;
  await act(()=>{fireEvent.submit(form);fireEvent.submit(form);});
  expect(await screen.findByRole('heading',{name:'Agenzia sintetica ti consegna la casa'})).toBeInTheDocument();
  expect(f.calls.filter(call=>call.url.endsWith('/register'))).toHaveLength(1);
  const previewCall=f.calls.find(call=>call.url.endsWith('/preview'))!;
  expect(new Headers(previewCall.init.headers).get('X-Account-Context')).toBe(newAccountId);
  expect(new Headers(previewCall.init.headers).get('X-CSRF-Token')).toBe(x.api.currentCsrfToken);
  expect(screen.getByRole('checkbox',{name:/Confermo di ricevere/})).not.toBeChecked();
  noUnintendedWrites(f.calls);noCredentialOutsideBodies(f.calls);
  const cache=JSON.stringify(x.queryClient.getQueryCache().getAll().map(query=>query.state.data));
  expect(cache).not.toContain(signupProof);expect(cache).not.toContain(signupPassword);
  expect(f.calls.every(call=>!call.url.includes(signupProof)&&!JSON.stringify(call.init.headers).includes(signupProof))).toBe(true);
  expect(persist).not.toHaveBeenCalled();expect(f.unhandled).toEqual([]);
 });
 it('recovers a lost registration result by checking the rotated session without resending the password',async()=>{
  const f=await fixture({recipientEmail:'new@example.test',loseRegistrationResponse:true});
  const x=renderApp({path:path+'#token='+token,fetch:f.fetch});
  await x.user.click(await screen.findByRole('button',{name:'Richiedi il link di verifica'}));
  await screen.findByText(/Richiesta registrata/);
  await act(()=>x.router.navigate(path+'#token='+token+'&signup='+signupProof));
  await x.user.type(await screen.findByLabelText('Password'),signupPassword);
  await x.user.click(screen.getByRole('button',{name:'Crea account'}));
  await x.user.click(await screen.findByRole('button',{name:'Verifica accesso'}));
  expect(await screen.findByRole('heading',{name:'Agenzia sintetica ti consegna la casa'})).toBeInTheDocument();
  expect(f.calls.filter(call=>call.url.endsWith('/register'))).toHaveLength(1);noUnintendedWrites(f.calls);
 });
 it('ignores an obsolete email context after the proof changes',async()=>{
  const f=await fixture(),later=deferred<Response>(),second='K'.repeat(43);
  f.setSignupContext((_,proof)=>proof===signupProof?later.promise:json({recipientEmail:'second@example.test'}));
  const x=renderApp({path:path+'#token='+token+'&signup='+signupProof,fetch:f.fetch});
  await waitFor(()=>expect(f.calls.filter(call=>call.url.endsWith('/registration-context'))).toHaveLength(1));
  const stale=f.calls.find(call=>call.url.endsWith('/registration-context'))!;
  await act(()=>x.router.navigate(path+'#token='+token+'&signup='+second));
  expect(await screen.findByLabelText('Email dell’invito')).toHaveValue('second@example.test');
  expect(stale.init.signal?.aborted).toBe(true);
  await act(async()=>later.resolve(json({recipientEmail:'first@example.test'})));
  expect(screen.getByLabelText('Email dell’invito')).toHaveValue('second@example.test');
  expect(f.calls.some(call=>call.url.endsWith('/register')||call.url.endsWith('/registration-email'))).toBe(false);
 });
 it('shows login when first registration email is unavailable',async()=>{
  const f=await fixture({recoveryDisabled:true});renderApp({path:path+'#token='+token,fetch:f.fetch});
  expect(await screen.findByText(/verifica email per i nuovi account è temporaneamente non disponibile/)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Ho già un account'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Richiedi il link di verifica'})).not.toBeInTheDocument();
  expect(f.calls.some(call=>call.url.endsWith('/registration-email'))).toBe(false);
 });
 it('uses normal login on the shared transport and returns to the Gift with rotated CSRF and the in-memory credential',async()=>{
  const f=await fixture(),x=renderApp({path:path+'#token='+token,fetch:f.fetch});await x.user.click(await screen.findByRole('link',{name:'Ho già un account'}));await x.user.type(await screen.findByLabelText('Email'),'a@example.test');await x.user.type(screen.getByLabelText('Password'),PASSWORD_A);await x.user.click(screen.getByRole('button',{name:'Accedi'}));
  expect(await screen.findByRole('heading',{name:'Agenzia sintetica ti consegna la casa'})).toBeInTheDocument();expect(x.router.state.location.pathname).toBe(path);expect(x.router.state.location.search).toBe('');expect(x.router.state.location.hash).toBe('');expect(f.calls.filter(call=>call.url.endsWith('/auth/login'))).toHaveLength(1);
  const check=f.calls.find(call=>call.url.endsWith('/preview'))!;expect(JSON.parse(String(check.init.body))).toEqual({secret:token});expect(new Headers(check.init.headers).get('X-CSRF-Token')).toBe(x.api.currentCsrfToken);expect(new Headers(check.init.headers).get('X-Account-Context')).toBe(ownerId);expect(f.calls.filter(call=>call.url.endsWith('/session')).length).toBeGreaterThanOrEqual(2);expect(f.unhandled).toEqual([]);noCredentialOutsideBodies(f.calls);noUnintendedWrites(f.calls);
 });
 it('normal fresh registration reaches real email verification before preview, claim or Home creation',async()=>{
  const f=await fixture(),x=renderApp({path:path+'#token='+token,fetch:f.fetch});await x.user.click(await screen.findByRole('link',{name:'Ho già un account'}));await x.user.click(await screen.findByRole('link',{name:'Crea un account Dimora'}));await x.user.type(await screen.findByLabelText('Nome'),'Nuovo proprietario sintetico');await x.user.type(screen.getByLabelText('Email'),'new@example.test');await x.user.type(screen.getByLabelText(/^Password/),'Password sintetica nuova 123!');await x.user.click(screen.getByRole('button',{name:'Crea account'}));
  expect(await screen.findByRole('heading',{name:'Conferma la tua email'})).toBeInTheDocument();expect(x.router.state.location.pathname).toBe(path);expect(f.calls.filter(call=>call.url.endsWith('/auth/register'))).toHaveLength(1);expect(f.calls.some(call=>call.url.endsWith('/auth/login'))).toBe(false);expect(f.calls.some(call=>call.url.endsWith('/preview'))).toBe(false);expect(screen.queryByText('Documento sintetico della casa')).not.toBeInTheDocument();
  await x.user.click(screen.getByRole('button',{name:'Richiedi email di conferma'}));expect(await screen.findByText(/Richiesta registrata/)).toBeInTheDocument();const verify=f.calls.find(call=>call.url.endsWith('/auth/email-verification'))!;expect(new Headers(verify.init.headers).get('X-Account-Context')).toBe(newAccountId);expect(new Headers(verify.init.headers).get('X-CSRF-Token')).toBe(x.api.currentCsrfToken);expect(f.unhandled).toEqual([]);noCredentialOutsideBodies(f.calls);noUnintendedWrites(f.calls);
 });
 it('authenticated token-free accepted resume survives changed/unverified email and opens the normal Home',async()=>{
  const f=await fixture({authenticated:true,accepted:true,changedEmail:true}),x=renderApp({path,fetch:f.fetch});expect(await screen.findByRole('heading',{name:'La tua casa è pronta'})).toBeInTheDocument();expect(screen.getByText('changed@example.test')).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Conferma la tua email'})).not.toBeInTheDocument();expect(f.calls.some(call=>call.url.endsWith('/landing')||call.url.endsWith('/preview'))).toBe(false);
  await x.user.click(screen.getByRole('button',{name:'Apri la mia casa'}));await waitFor(()=>expect(x.router.state.location.pathname).toBe('/home/'+homeId+'/casa'));expect(await screen.findByRole('heading',{name:'Casa Gift sintetica'})).toBeInTheDocument();expect(f.calls.some(call=>call.url==='/api/v5/homes/'+homeId&&(call.init.method??'GET')==='GET')).toBe(true);expect(f.unhandled).toEqual([]);noCredentialOutsideBodies(f.calls);noUnintendedWrites(f.calls);
 });
 it('a token-free signed-out recipient can reach normal login to resume an existing delivery',async()=>{
  const f=await fixture(),x=renderApp({path,fetch:f.fetch});const login=await screen.findByRole('link',{name:'Accedi per riprendere'});expect(login).toHaveAttribute('href','/accedi?next='+encodeURIComponent(path));expect(f.calls.some(call=>call.url.endsWith('/landing'))).toBe(false);await x.user.click(login);expect(await screen.findByRole('heading',{name:'Accedi'})).toBeInTheDocument();expect(x.router.state.location.search).toBe('?next='+encodeURIComponent(path));expect(f.unhandled).toEqual([]);noCredentialOutsideBodies(f.calls);noUnintendedWrites(f.calls);
 });

 it('a temporary landing failure retries only the same in-memory credential after an explicit click',async()=>{
  const f=await fixture();let attempts=0;f.setLanding(credential=>{expect(credential).toBe(token);return ++attempts===1?json({error:{code:'service_unavailable',message:'PRIVATE synthetic infrastructure'}},503):json({id:invitationId,version:1,requiresAccount:true});});const x=renderApp({path:path+'#token='+token,fetch:f.fetch});
  expect(await screen.findByText('Verifica temporaneamente non disponibile')).toBeInTheDocument();expect(f.calls.filter(call=>call.url.endsWith('/landing'))).toHaveLength(1);expect(screen.queryByRole('button',{name:'Richiedi il link di verifica'})).not.toBeInTheDocument();expect(document.body.textContent).not.toContain('PRIVATE');await x.user.click(screen.getByRole('button',{name:'Riprova verifica'}));expect(await screen.findByRole('button',{name:'Richiedi il link di verifica'})).toBeInTheDocument();const landings=f.calls.filter(call=>call.url.endsWith('/landing'));expect(landings).toHaveLength(2);expect(landings.map(call=>JSON.parse(String(call.init.body)) as unknown)).toEqual([{secret:token},{secret:token}]);expect(f.calls.some(call=>call.url.includes('/reissue')||call.url.endsWith('/gift-invitations'))).toBe(false);expect(x.router.state.location.hash).toBe('');noCredentialOutsideBodies(f.calls);expect(f.unhandled).toEqual([]);
 });
 it('new credentials for the same invitation hide the previous ready CTA and ignore a superseded late landing response',async()=>{
  const f=await fixture(),x=renderApp({path:path+'#token='+token,fetch:f.fetch});await screen.findByRole('button',{name:'Richiedi il link di verifica'});const second='H'.repeat(43),third='J'.repeat(43),late=deferred<Response>(),latest=deferred<Response>();f.setLanding(credential=>credential===second?late.promise:credential===third?latest.promise:Promise.reject(Error('Unexpected synthetic credential')));
  await act(()=>x.router.navigate(path+'#token='+second));await waitFor(()=>expect(f.calls.filter(call=>call.url.endsWith('/landing'))).toHaveLength(2));expect(screen.queryByRole('button',{name:'Richiedi il link di verifica'})).not.toBeInTheDocument();expect(screen.queryByRole('link',{name:'Ho già un account'})).not.toBeInTheDocument();const oldSignal=f.calls.filter(call=>call.url.endsWith('/landing'))[1]!.init.signal;
  await act(()=>x.router.navigate(path+'#token='+third));await waitFor(()=>expect(f.calls.filter(call=>call.url.endsWith('/landing'))).toHaveLength(3));expect(oldSignal?.aborted).toBe(true);await act(async()=>late.resolve(json({id:invitationId,version:1,requiresAccount:true})));expect(screen.queryByRole('button',{name:'Richiedi il link di verifica'})).not.toBeInTheDocument();await act(async()=>latest.resolve(json({error:{code:'unavailable',message:'Synthetic revoked link'}},404)));expect(await screen.findByText('Link non disponibile')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Richiedi il link di verifica'})).not.toBeInTheDocument();expect(x.router.state.location.hash).toBe('');for(const secret of [token,second,third]){expect(JSON.stringify(x.queryClient.getQueryCache().getAll().map(query=>query.state.data))).not.toContain(secret);expect(f.calls.some(call=>call.url.includes(secret))).toBe(false);}expect(f.unhandled).toEqual([]);noUnintendedWrites(f.calls);
 });

 it('same-SPA normal email verification returns to the pending token-free Gift without bypassing the challenge',async()=>{
  const f=await fixture({recipientEmail:'new@example.test'}),x=renderApp({path:path+'#token='+token,fetch:f.fetch});await x.user.click(await screen.findByRole('link',{name:'Ho già un account'}));await x.user.click(await screen.findByRole('link',{name:'Crea un account Dimora'}));await x.user.type(await screen.findByLabelText('Nome'),'Proprietario sintetico da verificare');await x.user.type(screen.getByLabelText('Email'),'new@example.test');await x.user.type(screen.getByLabelText(/^Password/),'Password sintetica nuova 123!');await x.user.click(screen.getByRole('button',{name:'Crea account'}));await screen.findByRole('heading',{name:'Conferma la tua email'});expect(f.calls.some(call=>call.url.endsWith('/preview'))).toBe(false);
  await x.user.click(screen.getByRole('button',{name:'Richiedi email di conferma'}));await screen.findByText(/Richiesta registrata/);const verificationPath=f.issuedVerificationPath();expect(verificationPath).toBeTruthy();await act(()=>x.router.navigate(verificationPath!));await x.user.click(await screen.findByRole('button',{name:'Conferma email'}));expect(await screen.findByRole('heading',{name:'Email confermata'})).toBeInTheDocument();const back=screen.getByRole('link',{name:'Torna alla Gift'});expect(back).toHaveAttribute('href',path);expect(x.router.state.location.hash).toBe('');
  expect(f.calls.filter(call=>call.url.endsWith('/auth/email-verification/complete'))).toHaveLength(1);expect(JSON.parse(String(f.calls.find(call=>call.url.endsWith('/auth/email-verification/complete'))!.init.body))).toEqual({token:'V'.repeat(43)});await x.user.click(back);expect(await screen.findByRole('heading',{name:'Agenzia sintetica ti consegna la casa'})).toBeInTheDocument();expect(x.router.state.location.pathname).toBe(path);expect(x.router.state.location.search).toBe('');expect(x.router.state.location.hash).toBe('');const preview=f.calls.find(call=>call.url.endsWith('/preview'))!;expect(JSON.parse(String(preview.init.body))).toEqual({secret:token});expect(new Headers(preview.init.headers).get('X-Account-Context')).toBe(newAccountId);expect(f.unhandled).toEqual([]);for(const credential of [token,'V'.repeat(43)]){expect(f.calls.some(call=>call.url.includes(credential))).toBe(false);expect(JSON.stringify(x.queryClient.getQueryCache().getAll().map(query=>query.state.data))).not.toContain(credential);}noUnintendedWrites(f.calls);
 });
});
