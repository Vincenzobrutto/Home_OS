import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeFetch, renderApp, seededBackend } from '../test/harness';
import type { FetchLike } from '../api/client';
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
    expect(await screen.findByRole('button',{name:'Esci e continua'})).toBeInTheDocument();expect(screen.queryByLabelText('Nuova password')).not.toBeInTheDocument();
  });
});
