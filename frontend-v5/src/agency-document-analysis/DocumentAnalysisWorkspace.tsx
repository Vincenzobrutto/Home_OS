import {useEffect,useEffectEvent,useMemo,useRef,useState} from 'react';
import {isApiError} from '../api/errors';
import {analysisPages,type AnalysisJob,type AnalysisOptions,type AnalysisScope,type AnalysisSource,type DocumentAnalysisPort} from './api';
import {clearPendingAnalysis,loadPendingAnalysis,savePendingAnalysis,type PendingAnalysis} from './pending';
import styles from './analysis.module.css';

type Props={api:DocumentAnalysisPort;scope:AnalysisScope;sources:AnalysisSource[];practiceRevision:number;readOnly:boolean;onCompleted?:(recordId:string)=>void;onAccessDenied?:()=>void;pollIntervalMs?:number};
const active=(job:AnalysisJob|null)=>!!job&&['queued','leased_before_dispatch','dispatched'].includes(job.state);
const labels:Record<AnalysisJob['state'],string>={queued:'In attesa',leased_before_dispatch:'Preparazione del documento',dispatched:'Analisi in corso',completed_with_proposals:'Proposte pronte da verificare',completed_unusable:'Nessuna proposta utilizzabile',discarded_source_changed:'Documento cambiato: risultato scartato',denied_after_revocation:'Accesso modificato: risultato non disponibile',uncertain_no_retry:'Esito incerto: nessun reinvio automatico',failed_before_dispatch:'Analisi non avviata'};
function draftPages(value:string){if(!value.trim())return undefined;try{if(!/^[1-9]\d?(?:\s*,\s*[1-9]\d?)*$/u.test(value.trim()))return null;return analysisPages(value.split(',').map(v=>Number(v.trim())));}catch{return null;}}
const amount=(micros:number,currency:string)=>`${(micros/1_000_000).toLocaleString('it-IT',{maximumFractionDigits:6})} ${currency}`;
export function DocumentAnalysisWorkspace(p:Props){return <Workspace key={JSON.stringify([p.scope.accountId,p.scope.agencyId,p.scope.practiceId])} {...p}/>;}
function Workspace(p:Props){
 const bound=useMemo(()=>({accountId:p.scope.accountId,agencyId:p.scope.agencyId,practiceId:p.scope.practiceId}),[p.scope.accountId,p.scope.agencyId,p.scope.practiceId]);
 const [sourceId,setSourceId]=useState(''),[pages,setPages]=useState(''),[options,setOptions]=useState<AnalysisOptions|null>(null),[approval,setApproval]=useState<string|null>(null),[jobs,setJobs]=useState<AnalysisJob[]>([]),[job,setJob]=useState<AnalysisJob|null>(null),[pending,setPending]=useState<PendingAnalysis|null>(null),[busy,setBusy]=useState(false),[quoting,setQuoting]=useState(false),[message,setMessage]=useState(''),[denied,setDenied]=useState(false),[pollStopped,setPollStopped]=useState(false);
 const live=useRef(false),epoch=useRef(0),quoteEpoch=useRef(0),flight=useRef(false),requests=useRef(new Set<AbortController>()),completed=useRef(new Set<string>());
 const source=p.sources.find(s=>s.id===sourceId),selectedPages=draftPages(pages),running=active(job),locked=busy||!!pending||running||job?.state==='uncertain_no_retry';
 const offer=options?.offer,offerMatches=!!offer&&!!source&&options.source.id===source.id&&options.source.version===source.version&&options.source.kind===source.kind&&selectedPages!==null&&JSON.stringify(offer.pages)===JSON.stringify(selectedPages??offer.pages),approved=offerMatches&&approval===offer?.id;
 const controller=()=>{const c=new AbortController();requests.current.add(c);return c;};
 const valid=(c:AbortController,g=epoch.current)=>live.current&&!c.signal.aborted&&g===epoch.current;
 function fail(error:unknown){
  if(isApiError(error)&&[401,403,404].includes(error.status)){setDenied(true);setJobs([]);setJob(null);setOptions(null);setPending(null);clearPendingAnalysis(bound);p.onAccessDenied?.();return;}
  setMessage(isApiError(error)&&error.status===409?'La pratica o le condizioni sono cambiate. Richiedi una nuova lettura prima di autorizzare.':isApiError(error)&&error.status===422?'Controlla documento, pagine e condizioni dell’analisi.':'Non riesco a verificare lo stato. Nessuna analisi viene reinviata automaticamente.');
 }
 function publish(next:AnalysisJob){setJob(next);setJobs(prior=>[next,...prior.filter(j=>j.id!==next.id)]);setPollStopped(false);if(next.recordId&&!completed.current.has(next.id)){completed.current.add(next.id);p.onCompleted?.(next.recordId);}}
 async function reconcile(request:PendingAnalysis){const c=controller(),g=epoch.current;try{const r=await p.api.lookup(request.key,c.signal);if(!valid(c,g))return;if(r.job){clearPendingAnalysis(bound);setPending(null);setMessage('');publish(r.job);}else setMessage('Avvio non ancora verificato. Puoi controllare di nuovo o riprovare soltanto lo stesso avvio.');}catch(e){if(valid(c,g))fail(e);}finally{requests.current.delete(c);}}
 async function quote(explicitPages?:number[]){if(!source||p.readOnly||locked)return;const c=controller(),g=epoch.current,q=++quoteEpoch.current;setQuoting(true);setApproval(null);setMessage('');try{const result=await p.api.options(source.id,source.version,explicitPages,c.signal);if(!valid(c,g)||q!==quoteEpoch.current)return;setOptions(result);if(result.offer)setPages(result.offer.pages.join(','));}catch(e){if(valid(c,g)&&q===quoteEpoch.current){setOptions(null);fail(e);}}finally{requests.current.delete(c);if(valid(c,g)&&q===quoteEpoch.current)setQuoting(false);}}
 async function readJob(id:string){const c=controller(),g=epoch.current;try{const result=await p.api.read(id,c.signal);if(valid(c,g)){setMessage('');publish(result);}}catch(e){if(valid(c,g))fail(e);}finally{requests.current.delete(c);}}
 const boot=useEffectEvent(async(c:AbortController,g:number)=>{if(!valid(c,g))return;flight.current=false;setBusy(false);setQuoting(false);setApproval(null);setOptions(null);const saved=loadPendingAnalysis(bound);if(saved){setPending(saved);await reconcile(saved);}try{const r=await p.api.list(c.signal);if(valid(c,g)){setJobs(r.jobs);if(!saved){const existing=r.jobs.find(j=>active(j)||j.state==='uncertain_no_retry');if(existing)publish(existing);}}}catch(e){if(valid(c,g))fail(e);}});
 const quoteCurrent=useEffectEvent(()=>{if(source&&!p.readOnly&&!locked)void quote(draftPages(pages)??undefined);});
 const pollRead=useEffectEvent((id:string,signal:AbortSignal)=>p.api.read(id,signal));
 const receive=useEffectEvent((next:AnalysisJob)=>publish(next));
 const pollFailure=useEffectEvent((error:unknown)=>fail(error));
 useEffect(()=>{
  live.current=true;epoch.current++;const g=epoch.current,c=new AbortController();requests.current.add(c);let mounted=true;queueMicrotask(()=>{if(mounted)void boot(c,g);});
  const all=requests.current;return()=>{mounted=false;live.current=false;for(const request of all)request.abort();all.clear();};
 },[p.api,bound]);
 useEffect(()=>{if(!sourceId||p.readOnly||locked)return;let current=true;queueMicrotask(()=>{if(current)quoteCurrent();});return()=>{current=false;};},[p.api,sourceId,source?.version,source?.kind,p.practiceRevision,p.readOnly,locked]);
 const jobId=job?.id,jobState=job?.state;
 useEffect(()=>{
  if(!jobId||!jobState||!['queued','leased_before_dispatch','dispatched'].includes(jobState))return;const id=jobId,c=new AbortController(),g=epoch.current;const activeRequests=requests.current;activeRequests.add(c);let timer:ReturnType<typeof setTimeout>|undefined,attempts=0;
  async function poll(){if(++attempts>60){if(valid(c,g))setPollStopped(true);return;}try{const next=await pollRead(id,c.signal);if(!valid(c,g))return;receive(next);if(active(next))timer=setTimeout(()=>void poll(),Math.max(10,p.pollIntervalMs??1500));}catch(e){if(valid(c,g)){setPollStopped(true);pollFailure(e);}}}
  timer=setTimeout(()=>void poll(),Math.max(10,p.pollIntervalMs??1500));return()=>{c.abort();activeRequests.delete(c);if(timer)clearTimeout(timer);};
 },[p.api,jobId,jobState,p.pollIntervalMs]);
 async function start(retry?:PendingAnalysis){
  if(flight.current||p.readOnly||busy||!retry&&(!offer||!offerMatches||!approved||!options||locked))return;
  if(!retry&&Date.parse(offer!.expiresAt)<=Date.now()){setApproval(null);setMessage('Le condizioni sono scadute. Aggiornale prima di autorizzare.');return;}
  const request=retry??{key:crypto.randomUUID(),body:{expectedRevision:options!.revision,sourceId:offer!.sourceId,expectedSourceVersion:offer!.sourceVersion,pages:[...offer!.pages],offerId:offer!.id,approved:true as const}};
  try{savePendingAnalysis(bound,request);}catch{setMessage('Impossibile preparare un avvio recuperabile. Ricarica e riprova.');return;}
  flight.current=true;setBusy(true);setPending(request);setApproval(null);setMessage('');const c=controller(),g=epoch.current;
  try{const result=await p.api.create(request.body,request.key,c.signal);if(!valid(c,g))return;clearPendingAnalysis(bound);setPending(null);setOptions(null);publish(result.job);}
  catch(e){if(valid(c,g)){if(isApiError(e)&&e.kind==='http'&&e.status<500&&e.status!==408){clearPendingAnalysis(bound);setPending(null);setOptions(null);fail(e);}else setMessage('La risposta dell’avvio non è arrivata. Verifica lo stato prima di riprovare lo stesso avvio.');}}
  finally{requests.current.delete(c);if(g===epoch.current){flight.current=false;if(live.current)setBusy(false);}}
 }
 if(denied)return <section className={styles.panel} role="alert">Accesso all’analisi documentale non disponibile.</section>;
 return <section className={styles.panel} aria-label="Analisi documentale"><h2>Analizza atto o visura</h2><p>Le proposte conservano le citazioni e richiedono associazione e conferma separate. Il modello dell’agenzia resta necessario per una vera bozza d’incarico.</p>
  {message&&<p role="status">{message}</p>}{p.readOnly&&<p>Analisi consultabile. Per avviarla serve accesso in gestione.</p>}
  {pending&&<div className={styles.notice}><p>Avvio da verificare. Documento e pagine restano quelli già autorizzati.</p><button type="button" disabled={busy} onClick={()=>void reconcile(pending)}>Verifica avvio</button><button type="button" disabled={busy||p.readOnly} onClick={()=>void start(pending)}>Riprova lo stesso avvio</button></div>}
  <form onSubmit={e=>{e.preventDefault();void start();}}><fieldset disabled={p.readOnly||locked||quoting}><label>Documento da analizzare<select value={sourceId} onChange={e=>{setSourceId(e.target.value);setPages('');setOptions(null);setApproval(null);}}><option value="">Scegli atto, successione o visura</option>{p.sources.filter(s=>['deed','succession','cadastral'].includes(s.kind)).map(s=><option key={s.id} value={s.id}>{s.filename} · v{s.version}</option>)}</select></label>{!p.sources.some(s=>['deed','succession','cadastral'].includes(s.kind))&&<p>Carica e classifica un PDF come Atto, Successione o Visura nei documenti della pratica.</p>}
   <label>Pagine fisiche, separate da virgola<input value={pages} inputMode="numeric" placeholder="Tutte le pagine" onChange={e=>{setPages(e.target.value);setApproval(null);}}/></label>{selectedPages===null&&<p>Inserisci pagine crescenti e distinte da 1 a 20.</p>}<button type="button" disabled={!source||selectedPages===null} onClick={()=>void quote(selectedPages??undefined)}>Aggiorna condizioni</button>
   {quoting&&<p role="status">Verifica del documento e delle condizioni…</p>}{options&&!options.available&&<p>{options.reason==='provider_disabled'?'Analisi documentale non configurata in questo ambiente.':options.reason==='pdf_text_unavailable'?'Questo PDF non ha testo leggibile in tutte le pagine. Nessuna analisi è stata inviata.':'Analisi non disponibile per questo documento o con questo accesso.'}</p>}
   {offerMatches&&offer&&<div className={styles.notice}>{offer.mode==='synthetic_fixture'?<p><strong>Collaudo sintetico</strong> · nessun invio esterno · costo zero.</p>:<p>Le pagine selezionate saranno inviate a {offer.provider} ({offer.model}). Limite massimo: {amount(offer.capMicros,offer.currency)}.</p>}<p>Pagine: {offer.pages.join(', ')} · versione documento {offer.sourceVersion}.</p><label className={styles.check}><input type="checkbox" checked={approved} onChange={e=>setApproval(e.target.checked?offer.id:null)}/>Autorizzo questa analisi del documento e delle pagine indicate con il limite indicato.</label></div>}
   <button type="submit" disabled={!offerMatches||!approved}>Avvia analisi documentale</button></fieldset></form>
  {job&&<div className={styles.notice} role="status"><h3>{labels[job.state]}</h3><p>Pagine {job.pages.join(', ')} · {job.state==='uncertain_no_retry'?'Costo e risultato da verificare; nessun nuovo invio automatico.':'Costo registrato: '+amount(job.spentMicros,job.currency)}</p>{job.recordId&&<button type="button" onClick={()=>p.onCompleted?.(job.recordId!)}>Apri proposte da verificare</button>}{pollStopped&&<p>Aggiornamento automatico fermato. Puoi controllare lo stato.</p>}<button type="button" onClick={()=>void readJob(job.id)}>Aggiorna stato analisi</button></div>}
  {jobs.length>0&&<details><summary>Analisi della pratica</summary><ul>{jobs.map(row=><li key={row.id}>{labels[row.state]} · pagine {row.pages.join(', ')} <button type="button" disabled={busy||!!pending} onClick={()=>void readJob(row.id)}>Segui analisi {row.id.slice(0,8)}</button></li>)}</ul></details>}
 </section>;
}
