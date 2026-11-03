import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeFetch, renderApp, seededBackend } from '../test/harness';
import type { FetchLike } from '../api/client';
import type { SessionResponse } from '../api/types';
import { queryKeys } from '../api/queryKeys';
const token='a'.repeat(43);
function transport(status=204) {
  const backend=seededBackend().backend,base=createFakeFetch(backend),calls:Array<{url:string;body:Record<string,string>}>=[];
  const fetch:FetchLike=async(url,init)=>{
    if(url.includes('/auth/password-recovery')){
      calls.push({url,body:JSON.parse(String(init.body)) as Record<string,string>});
      if(!url.endsWith('/complete'))return Response.json({message:'Se il recapito è associato a un account, riceverai le istruzioni.'},{status:202});
      return status===204?new Response(null,{status:204}):Response.json({error:{code:'recovery_invalid',message:'Link non più valido.'}},{status});
    }
    return base.fetch(url,init);
  };
  return {backend,fetch,calls};
}

async function verificationTransport(signedIn=false,logoutCode?:string) {
  const seeded=seededBackend(),control=createFakeFetch(seeded.backend),calls:Array<{url:string;init:RequestInit}>=[];
  if(signedIn){
    const session=await(await control.fetch('/api/v5/session',{method:'GET',credentials:'include'})).json() as {csrfToken:string};
    await control.fetch('/api/v5/auth/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},body:JSON.stringify({email:'a@example.test',password:'password-di-prova-A'})});
  }
  const signedInCookie=control.cookie();let verified=false;
  const fetch:FetchLike=async(url,init)=>{
    calls.push({url,init});
    if(url.endsWith('/auth/email-verification/complete')){
      if(logoutCode&&control.cookie()===signedInCookie)return Response.json({error:{code:logoutCode,message:'Esci dall’account corrente prima di continuare con questo link.'}},{status:409});
      verified=true;return new Response(null,{status:204});
    }
    const response=await control.fetch(url,init);
    if(url.endsWith('/session')&&response.ok){
      const session=await response.json() as SessionResponse;
      return Response.json({...session,account:session.account?{...session.account,emailVerifiedAt:verified?'2026-10-31T20:00:00.000Z':null}:null});
    }
    return response;
  };
  return {fetch,calls,control,account:seeded.a,otherAccount:seeded.b,backend:seeded.backend};
}

describe('[mock] recupero account',()=>{
  it('login exposes a recovery entry and email stays out of URL',async()=>{
    const t=transport(),{user,router}=renderApp({path:'/accedi',...t});
    await user.type(await screen.findByLabelText('Email'),'a@example.test');await user.click(screen.getByRole('link',{name:'Hai dimenticato la password?'}));
    expect(await screen.findByRole('heading',{name:'Recupera l’accesso'})).toBeInTheDocument();expect(screen.getByRole('textbox',{name:'Email'})).toHaveValue('a@example.test');expect(router.state.location.search).toBe('');
  });
  it('request is neutral and repeat is throttled in the UI',async()=>{
    const t=transport(),{user}=renderApp({path:'/recupera-accesso',...t});
    await user.type(await screen.findByRole('textbox',{name:'Email'}),'missing@example.test');await user.click(screen.getByRole('button',{name:'Invia il link'}));
    expect(await screen.findByRole('heading',{name:'Controlla la tua email'})).toBeInTheDocument();expect(screen.getByText(/Se il recapito è associato/)).toBeInTheDocument();expect(screen.getByRole('button',{name:/Invia di nuovo tra/})).toBeDisabled();expect(t.calls).toHaveLength(1);
  });
  it('opening a valid link erases fragment without consuming the challenge',async()=>{
    const t=transport(),{router}=renderApp({path:`/recupera-password#token=${token}`,...t});
    await screen.findByRole('heading',{name:'Scegli una nuova password'});await waitFor(()=>expect(router.state.location.hash).toBe(''));expect(t.calls).toHaveLength(0);
  });
  it('successful explicit reset returns to normal login without automatic authentication',async()=>{
    const t=transport(),{user,router}=renderApp({path:`/recupera-password#token=${token}`,...t});
    await user.type(await screen.findByLabelText('Nuova password'),'Nuova password di prova 123!');await user.click(screen.getByRole('button',{name:'Salva nuova password'}));
    expect(await screen.findByRole('heading',{name:'Password aggiornata'})).toBeInTheDocument();expect(t.calls[0]?.body.token).toBe(token);await user.click(screen.getByRole('link',{name:'Vai all’accesso'}));expect(await screen.findByRole('heading',{name:'Accedi'})).toBeInTheDocument();expect(router.state.location.pathname).toBe('/accedi');
  });
  it('used or expired link offers new request and no source account identity',async()=>{
    const t=transport(422),{user}=renderApp({path:`/recupera-password#token=${token}`,...t});
    await user.type(await screen.findByLabelText('Nuova password'),'Nuova password di prova 123!');await user.click(screen.getByRole('button',{name:'Salva nuova password'}));
    expect(await screen.findByRole('heading',{name:'Link non più valido'})).toBeInTheDocument();expect(screen.getByRole('link',{name:'Chiedi un nuovo link'})).toBeInTheDocument();
  });
  it('incomplete link does not send a request',async()=>{
    const t=transport();renderApp({path:'/recupera-password#token=bad',...t});
    expect(await screen.findByRole('heading',{name:'Link non più valido'})).toBeInTheDocument();expect(t.calls).toHaveLength(0);
  });
  it('unconfigured recovery is not described as the whole app being unreachable',async()=>{
    const t=transport();const fetch:FetchLike=(url,init)=>url.endsWith('/auth/password-recovery')?Promise.resolve(Response.json({error:{code:'recovery_unavailable',message:'Not configured'}},{status:503})):t.fetch(url,init);
    const {user}=renderApp({path:'/recupera-accesso',fetch});await user.type(await screen.findByRole('textbox',{name:'Email'}),'a@example.test');await user.click(screen.getByRole('button',{name:'Invia il link'}));
    expect(await screen.findByText('Il recupero dell’accesso non è disponibile in questo momento. Riprova più tardi.')).toBeInTheDocument();
  });
  it('a signed-in browser must explicitly log out before using a reset link',async()=>{
    const seeded=seededBackend(),control=createFakeFetch(seeded.backend);
    const session=await(await control.fetch('/api/v5/session',{method:'GET',credentials:'include'})).json() as {csrfToken:string};
    await control.fetch('/api/v5/auth/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},body:JSON.stringify({email:'a@example.test',password:'password-di-prova-A'})});
    renderApp({path:`/recupera-password#token=${token}`,fetch:control.fetch});
    expect(await screen.findByRole('button',{name:'Esci e continua'})).toBeInTheDocument();expect(screen.queryByLabelText('Nuova password')).not.toBeInTheDocument();expect(seeded.backend.log.some(call=>call.path==='/auth/password-recovery/complete')).toBe(false);
  });

  it('a signed-in account can submit email verification and refreshes the same normal session',async()=>{
    const t=await verificationTransport(true),{user,router,queryClient}=renderApp({path:`/verifica-email#token=${token}`,...t});
    await user.click(await screen.findByRole('button',{name:'Conferma email'}));
    expect(await screen.findByRole('heading',{name:'Email confermata'})).toBeInTheDocument();
    const completion=t.calls.find(call=>call.url.endsWith('/auth/email-verification/complete'));
    expect(JSON.parse(String(completion?.init.body))).toEqual({token});expect(completion?.init.credentials).toBe('include');expect(new Headers(completion?.init.headers).get('X-CSRF-Token')).toBeTruthy();
    expect(t.calls.filter(call=>call.url.endsWith('/session'))).toHaveLength(2);
    expect(queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account).toMatchObject({id:t.account.id,emailVerifiedAt:'2026-10-31T20:00:00.000Z'});
    expect(t.calls.some(call=>/\/auth\/(login|logout|register)$/.test(call.url))).toBe(false);expect(router.state.location.hash).toBe('');
    expect(screen.getByRole('link',{name:'Vai alle tue case'})).toHaveAttribute('href','/case');expect(screen.queryByRole('button',{name:'Esci e continua'})).not.toBeInTheDocument();
  });
  for(const logoutCode of ['recovery_logout_required','logout_required'])it(`email verification offers explicit logout only after server ${logoutCode}`,async()=>{
    const t=await verificationTransport(true,logoutCode),{user,queryClient}=renderApp({path:`/verifica-email#token=${token}`,...t});
    expect(screen.queryByRole('button',{name:'Esci e continua'})).not.toBeInTheDocument();await user.click(await screen.findByRole('button',{name:'Conferma email'}));
    const logout=await screen.findByRole('button',{name:'Esci e continua'});expect(screen.queryByRole('button',{name:'Conferma email'})).not.toBeInTheDocument();
    expect(t.calls.filter(call=>call.url.endsWith('/auth/email-verification/complete'))).toHaveLength(1);expect(t.calls.some(call=>call.url.endsWith('/auth/logout'))).toBe(false);expect(queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id).toBe(t.account.id);
    await user.click(logout);await user.click(await screen.findByRole('button',{name:'Conferma email'}));expect(await screen.findByRole('heading',{name:'Email confermata'})).toBeInTheDocument();
    expect(t.calls.filter(call=>call.url.endsWith('/auth/email-verification/complete')).map(call=>JSON.parse(String(call.init.body)) as unknown)).toEqual([{token},{token}]);
    expect(queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account).toBeNull();expect(screen.getByRole('link',{name:'Vai all’accesso'})).toHaveAttribute('href','/accedi');expect(t.calls.some(call=>call.url.endsWith('/auth/login'))).toBe(false);
  });
  it('guest email verification does not sign in or put the secret in navigation',async()=>{
    const t=await verificationTransport(),{user,router,queryClient}=renderApp({path:`/verifica-email#token=${token}`,...t});
    await user.click(await screen.findByRole('button',{name:'Conferma email'}));expect(await screen.findByRole('heading',{name:'Email confermata'})).toBeInTheDocument();
    expect(queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account).toBeNull();expect(t.calls.some(call=>/\/auth\/(login|register)$/.test(call.url))).toBe(false);expect(router.state.location.hash).toBe('');expect(router.state.location.search).toBe('');
    await user.click(screen.getByRole('link',{name:'Vai all’accesso'}));expect(await screen.findByRole('heading',{name:'Accedi'})).toBeInTheDocument();expect(router.state.location.pathname).toBe('/accedi');expect(router.state.location.search).toBe('');
  });
  it('an unrelated verification conflict stays an error without guessing an account mismatch',async()=>{
    const t=await verificationTransport(true),fetch:FetchLike=(url,init)=>url.endsWith('/auth/email-verification/complete')?Promise.resolve(Response.json({error:{code:'other_conflict',message:'Riprova più tardi.'}},{status:409})):t.fetch(url,init);
    const {user}=renderApp({path:`/verifica-email#token=${token}`,fetch});await user.click(await screen.findByRole('button',{name:'Conferma email'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Riprova più tardi.');expect(screen.getByRole('button',{name:'Conferma email'})).toBeEnabled();expect(screen.queryByRole('button',{name:'Esci e continua'})).not.toBeInTheDocument();
  });

  it('a server logout requirement is scoped to the submitting session account, not a later identity',async()=>{
    const t=await verificationTransport(true,'recovery_logout_required'),{user,queryClient}=renderApp({path:`/verifica-email#token=${token}`,...t});
    await user.click(await screen.findByRole('button',{name:'Conferma email'}));expect(await screen.findByRole('button',{name:'Esci e continua'})).toBeInTheDocument();
    const previous=queryClient.getQueryData<SessionResponse>(queryKeys.session)!;
    await t.control.fetch('/api/v5/auth/logout',{method:'POST',credentials:'include',headers:{'X-CSRF-Token':previous.csrfToken}});
    const anonymous=await(await t.control.fetch('/api/v5/session',{method:'GET',credentials:'include'})).json() as SessionResponse;
    await t.control.fetch('/api/v5/auth/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-CSRF-Token':anonymous.csrfToken},body:JSON.stringify({email:t.otherAccount.email,password:'password-di-prova-B'})});
    await act(()=>queryClient.invalidateQueries({queryKey:queryKeys.session}));
    expect(queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id).toBe(t.otherAccount.id);expect(await screen.findByRole('button',{name:'Conferma email'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Esci e continua'})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Conferma email'}));expect(await screen.findByRole('heading',{name:'Email confermata'})).toBeInTheDocument();
    expect(queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id).toBe(t.otherAccount.id);
  });
});
