import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link} from 'react-router';
import {useQueryClient} from '@tanstack/react-query';
import {isApiError} from '../api/errors';
import {queryKeys} from '../api/queryKeys';
import {Banner,Field,Loading,cx,ui} from '../components/ui';
import {validateNewPassword} from '../lib/validation';
import {clearPrivateCache} from '../session/queryClient';
import {refreshSession,useApi,useAuthSignals} from '../session/session';
import styles from './GiftLinkPage.module.css';

type SignupProps={invitationId:string;secret:string;loginPath:string};

export function GiftSignupEmail({invitationId,secret,loginPath,available}:SignupProps&{available:boolean}){
 const api=useApi();
 const request=useRef<AbortController|null>(null);
 const [state,setState]=useState<'idle'|'sending'|'sent'|'failed'>('idle');
 useEffect(()=>()=>request.current?.abort(),[]);

 async function send(){
  if(!available||request.current)return;
  const controller=new AbortController();
  request.current=controller;
  setState('sending');
  try{
   await api.gift.requestRegistrationEmail(invitationId,secret,controller.signal);
   if(!controller.signal.aborted)setState('sent');
  }catch{
   if(!controller.signal.aborted)setState('failed');
  }
 }

 return <>
  <p>Se è il tuo primo accesso, chiedi il link di verifica per l’indirizzo indicato nell’invito. Dopo la verifica potrai scegliere la password.</p>
  {state==='sent'&&<p role="status">Richiesta registrata. Controlla la posta e lo spam per continuare.</p>}
  {state==='failed'&&<p role="alert">Non siamo riusciti a confermare la richiesta. Controlla la posta prima di riaprire il link personale.</p>}
  {!available&&<p>La verifica email per i nuovi account è temporaneamente non disponibile.</p>}
  <div className={styles.actions}>
   {available&&<button type="button" className={cx(ui.btn,ui.primary)} disabled={state!=='idle'} onClick={()=>void send()}>
    {state==='sending'?'Richiesta in corso…':'Richiedi il link di verifica'}
   </button>}
   <Link className={ui.btn} to={loginPath}>Ho già un account</Link>
  </div>
 </>;
}

export function GiftSignupPassword({invitationId,secret,proof,loginPath,onForgetProof}:SignupProps&{proof:string;onForgetProof():void}){
 const api=useApi(),client=useQueryClient(),signals=useAuthSignals();
 const lifetime=useRef<AbortController|null>(null);
 const submitted=useRef(false);
 const checking=useRef(false);
 const [context,setContext]=useState<'loading'|'denied'|'unavailable'|{email:string}>('loading');
 const [contextRetry,setContextRetry]=useState(0);
 const [state,setState]=useState<'idle'|'submitting'|'check_session'|'denied'>('idle');
 const [password,setPassword]=useState('');
 const [error,setError]=useState<string>();

 useEffect(()=>{
  const controller=new AbortController();
  lifetime.current=controller;
  void api.gift.registrationContext(invitationId,secret,proof,controller.signal).then(({recipientEmail})=>{
   if(!controller.signal.aborted)setContext({email:recipientEmail});
  }).catch(cause=>{
   if(!controller.signal.aborted)setContext(isApiError(cause)&&[401,403,404,409,422].includes(cause.status)?'denied':'unavailable');
  });
  return()=>controller.abort();
 },[api,invitationId,secret,proof,contextRetry]);

 async function checkSession(){
  const controller=lifetime.current;
  if(!controller||controller.signal.aborted||checking.current)return;
  checking.current=true;
  setState('submitting');
  try{
   api.forgetCsrfToken();
   signals.reset();
   await client.cancelQueries({queryKey:queryKeys.session,exact:true});
   clearPrivateCache(client);
   await refreshSession(client,api);
  }catch{
   // The cookie may already have rotated. Session recovery is a read.
  }finally{
   checking.current=false;
   if(!controller.signal.aborted)setState('check_session');
  }
 }

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const controller=lifetime.current;
  if(typeof context!=='object'||!controller||controller.signal.aborted||submitted.current)return;
  const validation=validateNewPassword(password);
  if(validation){
   setError(validation);
   const field=event.currentTarget.elements.namedItem('password');
   if(field instanceof HTMLInputElement)field.focus();
   return;
  }
  submitted.current=true;
  setState('submitting');
  setError(undefined);
  setPassword('');
  try{
   const {account}=await api.gift.register(invitationId,secret,proof,password,controller.signal);
   if(controller.signal.aborted)return;
   if(account.email!==context.email){setState('check_session');return;}
   await checkSession();
  }catch(cause){
   if(controller.signal.aborted)return;
   const knownFailure=isApiError(cause)&&[400,401,403,404,409,422,429].includes(cause.status);
   setState(knownFailure?'denied':'check_session');
  }
 }

 const existing=<Link className={ui.btn} to={loginPath}>Ho già un account</Link>;
 if(context==='loading')return <Loading label="Verifica del link per la registrazione…"/>;
 if(context==='unavailable')return <Banner tone="warning" title="Verifica temporaneamente non disponibile">
  <p>Riprova a verificare il link ricevuto per email.</p>
  <div className={styles.actions}><button type="button" className={ui.btn} onClick={()=>{setContext('loading');setContextRetry(value=>value+1);}}>Riprova verifica</button>{existing}</div>
 </Banner>;
 if(context==='denied'||state==='denied')return <Banner tone="warning" title="Registrazione non disponibile">
  <p>Il link di verifica potrebbe essere scaduto o già usato. Accedi se hai un account oppure torna al link personale per richiedere una nuova verifica.</p>
  <div className={styles.actions}><button type="button" className={ui.btn} onClick={onForgetProof}>Torna al link personale</button>{existing}</div>
 </Banner>;
 if(state==='check_session')return <Banner tone="warning" title="Verifica l’accesso">
  <p>Controlla se l’account è già attivo. Puoi anche accedere con la password che hai scelto.</p>
  <div className={styles.actions}><button type="button" className={ui.btn} onClick={()=>void checkSession()}>Verifica accesso</button>{existing}</div>
 </Banner>;
 if(state==='submitting')return <Loading label="Creazione dell’account in corso…"/>;
 return <form className={styles.signupForm} onSubmit={event=>void submit(event)} noValidate>
  <h2>Crea il tuo account</h2>
  <Field label="Email dell’invito" name="email" type="email" value={context.email} readOnly autoComplete="username"/>
  <Field label="Password" name="password" type="password" autoComplete="new-password" required
   hint="Da 12 a 128 caratteri. Gli spazi contano." error={error}
   value={password} onChange={event=>{setPassword(event.target.value);setError(undefined);}}/>
  <div className={styles.actions}><button type="submit" className={cx(ui.btn,ui.primary)}>Crea account</button>{existing}</div>
 </form>;
}
