import {useEffect,useMemo,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router';
import {useQueryClient} from '@tanstack/react-query';
import {PublicShell} from '../components/AppShell';
import {Banner,ErrorState,Loading,ui,useDocumentTitle} from '../components/ui';
import {isApiError} from '../api/errors';
import {queryKeys} from '../api/queryKeys';
import {refreshSession,useApi,useSession} from '../session/session';
import {useLogout} from '../session/hooks';
import {safeGiftNext} from './gift-link-memory';
import {useGiftLinks} from './GiftLinkProvider';
import {GiftRecipient} from './GiftRecipient';
import styles from './GiftLinkPage.module.css';
export function GiftLinkPage(){
 useDocumentTitle('La tua casa in Dimora');
 const {invitationId=''}=useParams(),links=useGiftLinks(),secret=links.get(invitationId);
 const session=useSession(),api=useApi(),client=useQueryClient(),navigate=useNavigate(),logout=useLogout();
 const next=safeGiftNext('/gift/'+invitationId),account=session.data?.account;
 const [retry,setRetry]=useState(0);
 const landingIdentity=useMemo(()=>({id:invitationId,hasSecret:secret!==null,retry}),[invitationId,secret,retry]);
 const [landing,setLanding]=useState<{owner:typeof landingIdentity;status:'ready'|'unavailable'|'temporary'}|null>(null);
 useEffect(()=>{
  if(next==='/'||!secret||account||session.isPending)return;
  const c=new AbortController();
  api.gift.landing(invitationId,secret,c.signal).then(()=>{if(!c.signal.aborted)setLanding({owner:landingIdentity,status:'ready'});}).catch(error=>{if(!c.signal.aborted)setLanding({owner:landingIdentity,status:isApiError(error)&&[401,403,404,422].includes(error.status)?'unavailable':'temporary'});});
  return()=>c.abort();
 },[api,invitationId,secret,account,session.isPending,next,landingIdentity]);
 const guest=()=>{
  if(!secret)return <Banner title="Riapri il link personale"><p>Per iniziare, apri di nuovo il link che ti ha dato l’agenzia. Dopo l’avvio potrai riprendere con il tuo account anche ricaricando la pagina.</p><Link className={ui.btn} to={'/accedi?next='+encodeURIComponent(next)}>Accedi per riprendere</Link></Banner>;
  if(landing?.owner!==landingIdentity)return <Loading label="Verifica del link…"/>;
  if(landing.status==='temporary')return <Banner tone="warning" title="Verifica temporaneamente non disponibile"><p>Non siamo riusciti a verificare il link. Puoi riprovare senza chiedere un altro invito.</p><button className={ui.btn} onClick={()=>setRetry(v=>v+1)}>Riprova verifica</button><Link className={ui.btn} to={'/accedi?next='+encodeURIComponent(next)}>Accedi per riprendere</Link></Banner>;
  if(landing.status==='unavailable')return <Banner tone="warning" title="Link non disponibile"><p>Il link potrebbe essere scaduto o sostituito. Chiedi all’agenzia un nuovo link personale.</p><Link className={ui.btn} to={'/accedi?next='+encodeURIComponent(next)}>Hai già ricevuto la casa? Accedi</Link></Banner>;
  return <><p>Accedi o crea il tuo normale account Dimora con l’email indicata all’agenzia. Potrai controllare i documenti prima di accettare la consegna.</p><div className={styles.actions}><Link className={ui.btn} to={'/accedi?next='+encodeURIComponent(next)}>Ho già un account</Link><Link className={ui.btn} to={'/registrati?next='+encodeURIComponent(next)}>Crea il tuo account</Link></div><p>La casa ricevuta diventerà il tuo spazio: potrai aggiungere documenti e proseguire nel tempo.</p></>;
 };
 return <PublicShell><div className={styles.page}>{account?<p>La tua casa continua in Dimora</p>:<h1>La tua casa continua in Dimora</h1>}{next==='/'?<Banner tone="warning" title="Link non disponibile"><p>Riapri il link personale ricevuto dall’agenzia.</p></Banner>:session.isPending?<Loading label="Verifica della sessione…"/>:session.isError?<ErrorState error={session.error} onRetry={()=>void session.refetch()} retrying={session.isFetching}/>:account?<><div className={styles.account}><p>Stai usando l’account <strong>{account.email}</strong>.</p><button className={ui.btn} disabled={logout.isPending} onClick={()=>logout.mutate()}>Esci da questo account</button></div><GiftRecipient key={account.id+':'+invitationId} api={api.gift} account={account} invitationId={invitationId} secret={secret} verificationAvailable={session.data?.authRecovery?.enabled===true} onSecretConsumed={()=>links.forget(invitationId)} onRefreshSession={()=>refreshSession(client,api)} onRequestVerification={()=>api.requestEmailVerification(account.id)} onOpenHome={homeId=>{void client.invalidateQueries({queryKey:queryKeys.homes(account.id)});void client.invalidateQueries({queryKey:['account',account.id,'gift','benefits']});void navigate('/home/'+encodeURIComponent(homeId)+'/casa');}}/></>:guest()}</div></PublicShell>;
}
