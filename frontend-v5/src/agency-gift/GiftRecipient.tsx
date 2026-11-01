import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import type {Account} from '../api/types';
import {isApiError} from '../api/errors';
import {newIdempotencyKey} from '../api/queryKeys';
import type {GiftApi,GiftBeginInput} from './gift-api';
import type {GiftAcceptance,GiftAccepted,GiftPreview} from './gift-wire';
import styles from './GiftRecipient.module.css';
export type GiftRecipientProps={
 api:Pick<GiftApi,'resume'|'preview'|'claim'|'begin'|'status'|'cancel'>;account:Account;invitationId:string;secret:string|null;verificationAvailable:boolean;
 onSecretConsumed():void;onRefreshSession():Promise<unknown>;onRequestVerification():Promise<unknown>;onOpenHome(homeId:string):void;
};
type Identity={api:GiftRecipientProps['api'];credentialMissing:boolean;verifiedAt:string|null;email:string};
type View={kind:'verification'}|{kind:'missing'}|{kind:'preview';preview:GiftPreview}|{kind:'job';job:GiftAcceptance}|{kind:'uncertain'}|{kind:'cancelled'}|{kind:'denied'}|{kind:'error'};
type Attempt={api:GiftRecipientProps['api'];key:string;secret:string;claimVersion:number;home:{name:string;address:string};body:GiftBeginInput|null};
type Context={owner:Identity;controller:AbortController};
const polling=new Set(['queued','staging','ready','retryable']);
const statusLabels:Record<string,string>={queued:'Documenti in attesa di acquisizione',staging:'Acquisizione dei documenti in corso',ready:'Preparazione della casa',retryable:'Acquisizione temporaneamente sospesa',blocked_review:'Serve una verifica dell’agenzia',failed_final:'Acquisizione da rivedere con l’agenzia',cancelled:'Acquisizione annullata'};
const privateError=(error:unknown)=>isApiError(error)&&[401,403,404].includes(error.status);
const formatDate=(value:string)=>new Date(value).toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'});
const validHome=(value:string,max:number)=>!!value.trim()&&Array.from(value.trim()).length<=max&&!Array.from(value).some(c=>{const n=c.codePointAt(0)!;return n<32||n>=127&&n<=159;});

/** Controlled recipient surface. Routing, credential custody and normal account registration stay with the parent. */
export function GiftRecipient(p:GiftRecipientProps){return <Recipient key={p.account.id+':'+p.invitationId} {...p}/>;}
function Recipient(p:GiftRecipientProps){
 const {api,account,invitationId,secret}=p,accountId=account.id,verifiedAt=account.emailVerifiedAt??null;
 const identity=useMemo(()=>({api,credentialMissing:secret===null,verifiedAt,email:account.email}),[api,secret,verifiedAt,account.email]);
 const [entry,setEntry]=useState<{owner:Identity;view:View}|null>(null),[notice,setNotice]=useState<{owner:Identity;text:string}|null>(null),[flight,setFlight]=useState<Identity|null>(null),[reload,setReload]=useState(0);
 const [name,setName]=useState(''),[address,setAddress]=useState(''),[consent,setConsent]=useState(false);
 const active=useRef<Context|null>(null),attempt=useRef<Attempt|null>(null),sending=useRef<Context|null>(null),consumed=useRef(false);
 const callbacks=useRef({onSecretConsumed:p.onSecretConsumed,onRefreshSession:p.onRefreshSession,onRequestVerification:p.onRequestVerification});
 useEffect(()=>{callbacks.current={onSecretConsumed:p.onSecretConsumed,onRefreshSession:p.onRefreshSession,onRequestVerification:p.onRequestVerification};},[p.onSecretConsumed,p.onRefreshSession,p.onRequestVerification]);
 useEffect(()=>()=>{attempt.current=null;},[]);
 const adopt=useCallback((job:GiftAcceptance)=>{
  if(active.current?.owner!==identity)return;attempt.current=null;setEntry({owner:identity,view:{kind:'job',job}});setNotice(null);
  if(!consumed.current){consumed.current=true;callbacks.current.onSecretConsumed();}
 },[identity]);
 useEffect(()=>{
  const ctx={owner:identity,controller:new AbortController()};active.current=ctx;const current=()=>active.current===ctx&&!ctx.controller.signal.aborted;
  async function load(){
   try{
    const resumed=await api.resume(accountId,invitationId,ctx.controller.signal);if(!current())return;
    // Accepted and queued work is recoverable even after the account email or link credential changed.
    if(resumed.state!=='not_started'){adopt(resumed);return;}
    if(attempt.current&&attempt.current.api!==api)attempt.current=null;
    if(!verifiedAt){setEntry({owner:identity,view:{kind:'verification'}});return;}
    if(attempt.current){setEntry({owner:identity,view:{kind:'uncertain'}});return;}
    if(!secret){setEntry({owner:identity,view:{kind:'missing'}});return;}
    const preview=await api.preview(accountId,invitationId,secret,ctx.controller.signal);if(current())setEntry({owner:identity,view:{kind:'preview',preview}});
   }catch(error){if(current()){setEntry({owner:identity,view:{kind:privateError(error)?'denied':'error'}});if(privateError(error))attempt.current=null;}}
  }
  void load();return()=>{ctx.controller.abort();if(active.current===ctx)active.current=null;};
 },[identity,api,accountId,invitationId,secret,verifiedAt,reload,adopt]);
 const view=entry?.owner===identity?entry.view:null,busy=flight===identity,message=notice?.owner===identity?notice.text:'';
 useEffect(()=>{
  if(busy||view?.kind!=='job'||!polling.has(view.job.state))return;
  const controller=new AbortController(),jobId=view.job.jobId;
  const timer=setTimeout(()=>{void api.status(accountId,jobId,controller.signal).then(job=>{
   if(!controller.signal.aborted&&active.current?.owner===identity)adopt(job);
  }).catch(error=>{
   if(controller.signal.aborted||active.current?.owner!==identity)return;
   if(privateError(error)){setEntry({owner:identity,view:{kind:'denied'}});attempt.current=null;}else setNotice({owner:identity,text:'Lo stato non è disponibile in questo momento. Rileggilo prima di continuare.'});
  });},1500);
  return()=>{clearTimeout(timer);controller.abort();};
 },[api,accountId,identity,view,busy,adopt]);
 async function recover(ctx:Context){
  const result=await api.resume(accountId,invitationId,ctx.controller.signal);if(active.current!==ctx||ctx.controller.signal.aborted)return;
  if(result.state!=='not_started')adopt(result);else setEntry({owner:identity,view:{kind:'uncertain'}});
 }
 async function send(request:Attempt){
  const ctx=active.current;if(!ctx||ctx.owner!==identity||busy||sending.current===ctx)return;sending.current=ctx;setFlight(identity);setNotice(null);
  try{
   if(!request.body){const claim=await api.claim(accountId,invitationId,request.secret,request.claimVersion,ctx.controller.signal);if(active.current!==ctx||ctx.controller.signal.aborted)return;request.body={secret:request.secret,expectedInvitationVersion:claim.version,home:{...request.home}};}
   const result=await api.begin(accountId,invitationId,request.body,request.key,ctx.controller.signal);if(active.current===ctx&&!ctx.controller.signal.aborted)adopt(result);
  }catch(error){
   if(active.current!==ctx||ctx.controller.signal.aborted)return;
   if(privateError(error)){attempt.current=null;setEntry({owner:identity,view:{kind:'denied'}});return;}
   // A lost POST result never causes a new key, another Home or an automatic re-submission.
   try{await recover(ctx);}catch(recoveryError){if(active.current!==ctx||ctx.controller.signal.aborted)return;if(privateError(recoveryError)){attempt.current=null;setEntry({owner:identity,view:{kind:'denied'}});}else setEntry({owner:identity,view:{kind:'uncertain'}});}
  }finally{if(sending.current===ctx)sending.current=null;if(active.current===ctx&&!ctx.controller.signal.aborted)setFlight(null);}
 }
 function submit(event:FormEvent){
  event.preventDefault();if(busy||attempt.current||view?.kind!=='preview'||!secret)return;
  if(!validHome(name,80)||!validHome(address,200)||!consent){setNotice({owner:identity,text:'Indica nome e indirizzo della casa e conferma la ricezione.'});return;}
  const request:Attempt={api,key:newIdempotencyKey(),secret,claimVersion:view.preview.version,home:{name:name.trim(),address:address.trim()},body:null};attempt.current=request;void send(request);
 }
 async function checkOutcome(){const ctx=active.current;if(!ctx||ctx.owner!==identity||busy)return;setFlight(identity);setNotice(null);try{await recover(ctx);}catch(error){if(active.current!==ctx||ctx.controller.signal.aborted)return;if(privateError(error)){attempt.current=null;setEntry({owner:identity,view:{kind:'denied'}});}else setNotice({owner:identity,text:'Non riusciamo ancora a verificare l’esito. Nessun nuovo invio è stato avviato.'});}finally{if(active.current===ctx&&!ctx.controller.signal.aborted)setFlight(null);}}
 async function refreshStatus(){
  const ctx=active.current;if(!ctx||ctx.owner!==identity||busy||view?.kind!=='job')return;setFlight(identity);setNotice(null);
  try{const job=await api.status(accountId,view.job.jobId,ctx.controller.signal);if(active.current===ctx&&!ctx.controller.signal.aborted)adopt(job);}catch(error){if(active.current!==ctx||ctx.controller.signal.aborted)return;if(privateError(error))setEntry({owner:identity,view:{kind:'denied'}});else setNotice({owner:identity,text:'Stato non disponibile. Riprova a leggerlo.'});}finally{if(active.current===ctx&&!ctx.controller.signal.aborted)setFlight(null);}
 }
 async function cancel(){
  const ctx=active.current;if(!ctx||ctx.owner!==identity||busy||view?.kind!=='job'||view.job.state==='accepted')return;setFlight(identity);setNotice(null);
  try{await api.cancel(accountId,view.job.jobId,ctx.controller.signal);if(active.current===ctx&&!ctx.controller.signal.aborted){attempt.current=null;setEntry({owner:identity,view:{kind:'cancelled'}});}}catch(error){if(active.current!==ctx||ctx.controller.signal.aborted)return;if(privateError(error))setEntry({owner:identity,view:{kind:'denied'}});else setNotice({owner:identity,text:'Annullamento non confermato. Rileggi lo stato prima di riprovare.'});}finally{if(active.current===ctx&&!ctx.controller.signal.aborted)setFlight(null);}
 }
 async function verification(action:'request'|'refresh'){
  const ctx=active.current;if(!ctx||ctx.owner!==identity||busy)return;setFlight(identity);setNotice(null);
  try{await(action==='request'?callbacks.current.onRequestVerification():callbacks.current.onRefreshSession());if(active.current!==ctx||ctx.controller.signal.aborted)return;if(action==='request')setNotice({owner:identity,text:'Richiesta registrata. Controlla la posta e lo spam; la consegna dell’email non è confermata.'});else{setEntry(null);setReload(n=>n+1);}}
  catch{if(active.current===ctx&&!ctx.controller.signal.aborted)setNotice({owner:identity,text:'Verifica non completata. Riprova con la sessione corretta.'});}finally{if(active.current===ctx&&!ctx.controller.signal.aborted)setFlight(null);}
 }
 function reloadView(){if(busy)return;setEntry(null);setNotice(null);setReload(n=>n+1);}
 return <section className={styles.recipient} aria-label="Ricezione Gift">
  {!view?<div role="status" className={styles.card}><h1>La tua casa in Dimora</h1><p>Verifica della Gift in corso…</p></div>:view.kind==='job'&&view.job.state==='accepted'?<Accepted job={view.job} onOpenHome={p.onOpenHome}/>:<>
   <header className={styles.heading}><p className={styles.eyebrow}>Dall’agenzia alla tua casa</p><h1>La tua casa in Dimora</h1></header>
   {message&&<p className={styles.notice} role="status">{message}</p>}
   {view.kind==='verification'?<div className={styles.card}><h2>Conferma la tua email</h2><p>Usa l’account con l’indirizzo a cui l’agenzia ha destinato la Gift. La conferma è necessaria per vedere i documenti e riceverli.</p><p>Dopo la conferma, torna a questa scheda e premi “Ho già confermato l’email”. Puoi anche riaprire il link personale dell’agenzia.</p><p className={styles.email}>{account.email}</p>{p.verificationAvailable?<button disabled={busy} onClick={()=>void verification('request')}>Richiedi email di conferma</button>:<p>La verifica email non è disponibile in questo ambiente. La ricezione resterà in attesa finché sarà attivata.</p>}<button disabled={busy} onClick={()=>void verification('refresh')}>Ho già confermato l’email</button></div>:view.kind==='missing'?<div className={styles.card}><h2>Riapri il link originale</h2><p>Per iniziare serve il link personale ricevuto dall’agenzia. Dopo una ricarica il codice non resta nel browser. Le acquisizioni già avviate vengono recuperate con il tuo account.</p><button disabled={busy} onClick={reloadView}>Verifica di nuovo</button></div>:view.kind==='denied'?<div className={styles.card} role="alert"><h2>Gift non disponibile per questo accesso</h2><p>Riapri il link originale con l’account previsto. Nessun documento viene mostrato a un account diverso.</p><button disabled={busy} onClick={reloadView}>Verifica di nuovo</button></div>:view.kind==='error'?<div className={styles.card} role="alert"><h2>Impossibile leggere la Gift</h2><p>Verifica la connessione e riprova. La ricezione non viene simulata.</p><button disabled={busy} onClick={reloadView}>Riprova a leggere la Gift</button></div>:view.kind==='cancelled'||view.kind==='job'&&view.job.state==='cancelled'?<div className={styles.card} role="status"><h2>Acquisizione annullata</h2><p>Questa acquisizione è stata annullata. Per una nuova consegna rivolgiti all’agenzia.</p></div>:view.kind==='job'?<div className={styles.card} role="status"><h2>{statusLabels[view.job.state]}</h2><p>La casa comparirà quando l’acquisizione sarà completata. I file vengono controllati prima di essere aggiunti.</p>{'progress'in view.job&&view.job.progress&&<p>{view.job.progress.admitted} di {view.job.progress.total} documenti acquisiti</p>}{!polling.has(view.job.state)&&<p>L’agenzia deve verificare la pratica prima di proseguire.</p>}<div className={styles.actions}><button disabled={busy} onClick={()=>void refreshStatus()}>Aggiorna stato</button><button disabled={busy} onClick={()=>void cancel()}>Annulla acquisizione</button></div></div>:view.kind==='uncertain'?<div className={styles.card}><h2>Verifica dell’esito necessaria</h2><p role="alert">L’esito dell’invio non è ancora confermato. Nome, indirizzo e richiesta restano bloccati per evitare una seconda acquisizione.</p><fieldset disabled className={styles.form}><label>Nome della casa<input value={name} readOnly/></label><label>Indirizzo della casa<input value={address} readOnly/></label></fieldset><div className={styles.actions}><button disabled={busy} onClick={()=>void checkOutcome()}>Verifica esito</button><button disabled={busy} onClick={()=>{const request=attempt.current;if(request&&request.api===api)void send(request);}}>Riprova lo stesso invio</button></div></div>:<>
    <div className={styles.card}><h2>{view.preview.agencyName} ti consegna la casa</h2><p>I documenti selezionati diventeranno la base della tua casa. Potrai continuare ad aggiungere i tuoi contenuti.</p>{view.preview.annualBenefit.requested?<p className={styles.year}>L’agenzia include 12 mesi di tutte le funzioni per il proprietario, dall’accettazione completata.</p>:<p>La Gift comprende la casa e i documenti selezionati.</p>}</div>
    <ul className={styles.documents} aria-label="Documenti che riceverai">{view.preview.documents.map((document,index)=><li className={styles.card} key={index}><h3>{document.title}</h3><p>{document.origin==='agency_generated'?'Produzione dell’agenzia dichiarata':'Documento ricevuto dall’agenzia'}</p><p>Autore dichiarato: {document.author}</p><p>{document.lifecycle==='signed'?'Sottoscrizione dichiarata · firma non verificata':'Documento finale dichiarato'}</p>{document.digitalPlan&&<p>Riceverai anche la mappa digitale con {document.digitalPlan.roomCount} vani, modificabile nella tua casa. Le misure restano da verificare.</p>}{document.surface&&<div className={styles.surface}><h4>{document.surface.qualification==='estimated'?'Stima':document.surface.qualification==='reviewed'?'Rivista dall’agente':'Da verificare'} · {document.surface.kind==='commercial'?'Superficie commerciale':document.surface.kind==='net'?'Superficie netta':'Superficie catastale'}</h4><p>Metodo: {document.surface.method}</p>{!!document.surface.caveats.length&&<ul>{document.surface.caveats.map((c,i)=><li key={i}>{c}</li>)}</ul>}</div>}</li>)}</ul>
    <form className={styles.card} onSubmit={submit} noValidate><h2>Conferma la tua nuova casa</h2><p>Creeremo una nuova casa nel tuo account, con i soli documenti selezionati dall’agenzia.</p><fieldset disabled={busy} className={styles.form}><label>Nome della casa<input required maxLength={160} autoComplete="off" value={name} onChange={e=>{if(!busy)setName(e.target.value);}}/></label><label>Indirizzo della casa<input required maxLength={400} autoComplete="street-address" value={address} onChange={e=>{if(!busy)setAddress(e.target.value);}}/></label><label className={styles.consent}><input type="checkbox" checked={consent} onChange={e=>{if(!busy)setConsent(e.target.checked);}}/>Confermo di ricevere questi documenti in una nuova casa del mio account.</label><button type="submit" className={styles.primary} disabled={busy}>{busy?'Acquisizione in avvio…':'Ricevi la casa e i documenti'}</button></fieldset></form>
   </>}
  </>}
 </section>;
}
function Accepted({job,onOpenHome}:{job:GiftAccepted;onOpenHome(homeId:string):void}){
 return <div className={styles.complete}><p className={styles.eyebrow}>Benvenuto a casa</p><h1>La tua casa è pronta</h1><p>Hai ricevuto {job.documents.length} {job.documents.length===1?'documento':'documenti'}. Li trovi nella tua casa e puoi aggiungerne altri.</p>{job.benefit&&<div className={styles.year}><h2>Un anno di Dimora incluso</h2><p>Tutte le funzioni per il proprietario, dal <time dateTime={job.benefit.startsAt}>{formatDate(job.benefit.startsAt)}</time> al <time dateTime={job.benefit.endsAt}>{formatDate(job.benefit.endsAt)}</time>.</p></div>}<p>La casa e i documenti ricevuti rimangono nel tuo account. Le tue aggiunte sono gestite da te.</p><button className={styles.primary} onClick={()=>onOpenHome(job.homeId)}>Apri la mia casa</button><p>Se l’agenzia ha incluso la mappa digitale, la trovi in Ambienti → Mappa ricevuta dall’agenzia.</p></div>;
}
