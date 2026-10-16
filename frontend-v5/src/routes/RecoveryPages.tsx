import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { isApiError, userMessage } from '../api/errors';
import { PublicShell } from '../components/AppShell';
import { Banner, cx, ui, useDocumentTitle } from '../components/ui';
import { useLogout } from '../session/hooks';
import { refreshSession, useApi, useSession } from '../session/session';
import { clearPrivateCache } from '../session/queryClient';
import styles from './pages.module.css';
const recoveryMessage = (error:unknown) => isApiError(error)&&error.code==='recovery_unavailable'?'Il recupero dell’accesso non è disponibile in questo momento. Riprova più tardi.':userMessage(error);

export function RecoveryRequestPage() {
  useDocumentTitle('Recupera l’accesso');
  const api=useApi(),location=useLocation(),session=useSession(),logout=useLogout();
  const [email,setEmail]=useState((location.state as {email?:string}|null)?.email??'');
  const [pending,setPending]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState(''),[wait,setWait]=useState(0);
  const emailRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(!wait)return;const timer=window.setTimeout(()=>setWait(n=>n-1),1000);return()=>window.clearTimeout(timer);},[wait]);
  const submit=async(event:FormEvent)=>{event.preventDefault();if(pending||wait||session.data?.account)return;setError('');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setError('Scrivi un indirizzo email completo.');emailRef.current?.focus();return;}setPending(true);try{await api.requestRecovery(email.trim());setSent(true);setWait(60);}catch(e){setError(recoveryMessage(e));}finally{setPending(false);}};
  return <PublicShell><div className={styles.authWrap}><h1>{sent?'Controlla la tua email':'Recupera l’accesso'}</h1>
    {session.data?.account&&<Banner title="Esci prima di recuperare l’accesso"><p>Sei connesso come {session.data.account.name}. Nessun account viene cambiato finché non esci.</p><button className={ui.btn} disabled={logout.isPending} onClick={()=>logout.mutate()}>Esci e continua</button>{logout.isError&&<p role="alert">{userMessage(logout.error)}</p>}</Banner>}
    {sent?<><p>Se il recapito è associato a un account, riceverai le istruzioni per scegliere una nuova password.</p><p>Indirizzo indicato: <strong>{email}</strong></p><p>Il link vale 30 minuti e si usa una sola volta. Un nuovo invio non invalida i link precedenti: dopo il primo reset riuscito, tutti smettono di funzionare.</p><p>Controlla spam e indirizzo scritto. La richiesta non conferma che l’email sia stata consegnata.</p></>:<p>Scrivi l’email con cui hai creato l’account Dimora.</p>}
    {error&&<Banner tone="error" role="alert" title="Richiesta non completata"><p>{error}</p></Banner>}
    <form onSubmit={submit} className={styles.form} noValidate>{!sent&&<label>Email<input ref={emailRef} name="email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>}<button className={cx(ui.btn,ui.primary)} disabled={pending||wait>0||!!session.data?.account}>{pending?'Richiesta in corso…':wait?`Invia di nuovo tra ${wait} s`:sent?'Invia di nuovo':'Invia il link'}</button></form>
    {sent&&<button className={ui.btn} onClick={()=>{setSent(false);setWait(0);setError('');}}>Usa un altro indirizzo</button>}
    <details><summary>Non hai più accesso alla casella?</summary><p>In questa versione il recupero avviene solo tramite la casella dell’account. Non possiamo riattivarlo con un nome, un altro indirizzo o documenti della casa.</p></details><p><Link to="/accedi">Torna all’accesso</Link></p>
  </div></PublicShell>;
}

export function RecoveryLinkPage({verification=false}:{verification?:boolean}) {
  useDocumentTitle(verification?'Verifica email':'Scegli una nuova password');
  const location=useLocation(),navigate=useNavigate(),api=useApi(),session=useSession(),logout=useLogout(),queryClient=useQueryClient();
  const [token,setToken]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('token')??'');
  const [password,setPassword]=useState(''),[visible,setVisible]=useState(false),[pending,setPending]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(''),[invalid,setInvalid]=useState(!/^[A-Za-z0-9_-]{43}$/.test(token));
  const passwordRef=useRef<HTMLInputElement>(null);
  // Remove the secret from the URL/history before the page can be interacted with.
  // It remains only in this component's memory and is cleared after success/unmount.
  useLayoutEffect(()=>{if(location.hash)void navigate(location.pathname,{replace:true});},[location.hash,location.pathname,navigate]);
  const submit=async(event:FormEvent)=>{event.preventDefault();if(pending||!token)return;setError('');if(!verification&&([...password].length<12||[...password].length>128)){setError('Usa da 12 a 128 caratteri. Gli spazi contano.');passwordRef.current?.focus();return;}setPending(true);try{
    if(verification)await api.completeEmailVerification(token);else await api.completeRecovery(token,password);
    setToken('');setPassword('');clearPrivateCache(queryClient);api.forgetCsrfToken();await refreshSession(queryClient,api);setDone(true);
  }catch(e){if(isApiError(e)&&e.code==='recovery_invalid')setInvalid(true);else setError(isApiError(e)&&e.kind==='service'?'Esito non confermato: l’operazione potrebbe essere riuscita. Riprova; se il link non è più valido, prova ad accedere con la nuova password.':recoveryMessage(e));}finally{setPending(false);}};
  const account=session.data?.account;
  return <PublicShell><div className={styles.authWrap}><h1>{done?(verification?'Email confermata':'Password aggiornata'):invalid?'Link non più valido':verification?'Conferma il tuo indirizzo email':'Scegli una nuova password'}</h1>
    {done?<><p>{verification?'Il recapito è stato confermato. Il link non crea un nuovo accesso.':'La nuova password è attiva. Abbiamo chiuso l’accesso su tutti i dispositivi.'}</p><Link to={verification&&account?'/case':'/accedi'}>{verification&&account?'Vai alle tue case':'Vai all’accesso'}</Link></>:invalid?<><p>Il link è scaduto, è già stato usato oppure non è completo. Se hai già cambiato la password, prova ad accedere con quella nuova.</p><Link to={verification?'/case':'/recupera-accesso'}>{verification?'Accedi e chiedi un nuovo link':'Chiedi un nuovo link'}</Link></>:<>
      {error&&<Banner tone="error" role="alert" title="Operazione non completata"><p>{error}</p></Banner>}
      {!session.data?(session.isError?<Banner tone="error" role="alert" title="Sessione non disponibile"><p>{userMessage(session.error)}</p><button className={ui.btn} onClick={()=>void session.refetch()}>Riprova</button></Banner>:<p>Controllo della sessione…</p>):account?<><p>Sei connesso come {account.name}. Per usare questo link, esci prima dall’account corrente. Il link non viene consumato.</p><button className={ui.btn} disabled={logout.isPending} onClick={()=>logout.mutate()}>Esci e continua</button>{logout.isError&&<p role="alert">{userMessage(logout.error)}</p>}<p><Link to="/case">Resta connesso</Link></p></>:<form className={styles.form} onSubmit={submit} noValidate>
        {!verification&&<><label>Nuova password<input ref={passwordRef} name="password" type={visible?'text':'password'} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /></label><button type="button" className={ui.btn} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?'Nascondi':'Mostra'}</button><p>Da 12 a 128 caratteri. Gli spazi vengono conservati. Chiuderemo l’accesso su tutti i dispositivi.</p></>}
        <button className={cx(ui.btn,ui.primary)} disabled={pending}>{pending?'Conferma in corso…':verification?'Conferma email':'Salva nuova password'}</button>
      </form>}
    </>}<p><Link to="/accedi">Torna all’accesso</Link></p>
  </div></PublicShell>;
}
export function VerificationLinkPage() { return <RecoveryLinkPage verification />; }
