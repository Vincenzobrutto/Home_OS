import {useEffect,useRef,useState} from 'react';
import {ApiError} from '../api/errors';
import type {AgencyReviewPort,DecisionBody,ReviewEvidence,ReviewFact,ReviewSnapshot,ReviewValue} from './api';
import styles from './review.module.css';
type Props={scopeKey:string;api:AgencyReviewPort;readOnly?:boolean;subjectLabels?:Record<string,string>;onOpenSource?:(e:ReviewEvidence)=>void;createKey?:()=>string};
type Pending={body:DecisionBody;key:string};
const labels:Record<string,string>={'party.name':'Nome della parte','party.role':'Ruolo dichiarato','party.right':'Diritto dichiarato','party.share':'Quota dichiarata','deed.date':'Data dell’atto','cadastral.municipality':'Comune catastale','cadastral.sheet':'Foglio','cadastral.parcel':'Particella','cadastral.subaltern':'Subalterno','surface.net':'Superficie interna','surface.cadastral':'Superficie catastale','surface.commercial':'Superficie commerciale','mandate.price':'Prezzo incarico','mandate.fee':'Provvigione dichiarata','mandate.duration':'Durata dichiarata','mandate.exclusive':'Esclusiva'};
const statuses={proposed:'Da controllare',confirmed:'Confermato dall’agente',rejected:'Rifiutato',stale:'Fonte superata'};
const display=(v:ReviewValue|null)=>v===null?'Da definire':typeof v==='boolean'?(v?'Sì':'No'):String(v);
export function ReviewWorkspace(p:Props){return <Workspace key={p.scopeKey} {...p}/>;}
function Workspace(p:Props){
 const [data,setData]=useState<ReviewSnapshot|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[denied,setDenied]=useState(false),[conflict,setConflict]=useState(false),[pending,setPending]=useState<Pending|null>(null),[message,setMessage]=useState(''),[reload,setReload]=useState(0);
 const [owner,setOwner]=useState<AgencyReviewPort|null>(null);
 const live=useRef(false),flight=useRef(false),generation=useRef(0);
 useEffect(()=>{generation.current++;live.current=true;flight.current=false;const controller=new AbortController();
  p.api.read(controller.signal).then(v=>{if(!controller.signal.aborted){setOwner(p.api);setData(v);setDenied(false);setMessage('');}}).catch(e=>{if(!controller.signal.aborted){setOwner(p.api);setData(null);if(e instanceof ApiError&&[401,403,404].includes(e.status))setDenied(true);else{setDenied(false);setMessage('Dati non disponibili. Riprova a caricarli.');}}}).finally(()=>{if(!controller.signal.aborted){setLoading(false);setBusy(false);setConflict(false);setPending(null);}});
  return()=>{live.current=false;controller.abort();};
 },[p.api,reload]);
 async function send(request:Pending){if(flight.current||!live.current)return;const current=generation.current;flight.current=true;setBusy(true);setMessage('');
  try{const result=await p.api.decide(request.body,request.key);if(!live.current||current!==generation.current)return;setData(result.review);setPending(null);setMessage('Decisione salvata nella pratica.');}
  catch(e){if(!live.current||current!==generation.current)return;if(e instanceof ApiError&&[401,403,404].includes(e.status)){setData(null);setDenied(true);setPending(null);}else if(e instanceof ApiError&&(e.status===409||e.code==='source_changed')){setConflict(true);setPending(null);setMessage('La pratica o la fonte è cambiata. Ricarica i dati prima di decidere.');}else if(e instanceof ApiError&&e.kind==='http'&&e.status<500&&e.status!==408){setPending(null);setMessage('Nessuna decisione registrata: controlla valore e motivazione.');}else{setPending(request);setMessage('Esito non disponibile. Puoi riprovare lo stesso invio oppure ricaricare la pratica.');}}
  finally{if(current===generation.current){flight.current=false;if(live.current)setBusy(false);}}
 }
 const locked=!!p.readOnly||busy||conflict||!!pending;
 const scoped=owner===p.api,waiting=loading||!scoped,visible=scoped&&!waiting?data:null;
 if(scoped&&denied)return <section className={styles.workspace} role="alert">Accesso ai dati non disponibile.</section>;
 return <section className={styles.workspace} aria-label="Revisione dati e fonti"><header><h2>Dati e fonti</h2><p>Controlla il contenuto del documento prima di confermare. La conferma registra una decisione, non una certificazione.</p></header>
  {waiting&&<p role="status">Caricamento dati…</p>}{scoped&&message&&<p role="status" className={styles.notice}>{message}</p>}
  {scoped&&pending&&<button type="button" disabled={busy} onClick={()=>send(pending)}>Riprova lo stesso invio</button>}
  {!waiting&&<button type="button" disabled={busy} onClick={()=>{setLoading(true);setData(null);setPending(null);setMessage('');setReload(v=>v+1);}}>Ricarica dati</button>}
  {visible&&!visible.facts.length&&<p>Nessun dato disponibile in questa vista. Non indica che il fascicolo sia completo.</p>}
  {visible?.facts.map(f=><FactCard key={`${f.id}:${f.version}`} fact={f} unit={visible.units.find(u=>u.id===f.unitId)?.label||'Unità da identificare'} subject={p.subjectLabels?.[f.subjectKey]||'Soggetto da identificare'} locked={locked} open={p.onOpenSource} decide={(action,value,reason)=>send({key:p.createKey?.()||crypto.randomUUID(),body:{expectedRevision:visible.revision,command:{operation:'decide',factId:f.id,expectedFactVersion:f.version,action,...(action==='correct'?{value}:{}),reason}}})}/>)}
 </section>;
}
function FactCard(p:{fact:ReviewFact;unit:string;subject:string;locked:boolean;open?:Props['onOpenSource'];decide:(action:'confirm'|'correct'|'reject',value:ReviewValue|undefined,reason:string|null)=>void}){
 const f=p.fact,[action,setAction]=useState<''|'confirm'|'correct'|'reject'>(''),[value,setValue]=useState(String(f.confirmedValue??f.proposedValue)),[reason,setReason]=useState('');
 const locked=p.locked||f.status==='stale',numeric=typeof f.proposedValue==='number',boolean=typeof f.proposedValue==='boolean';
 const correctionValid=boolean||(value.trim().length>0&&(!numeric||(Number.isFinite(Number(value))&&Number(value)>0)));
 const valid=action!==''&&(action!=='correct'||(reason.trim().length>0&&correctionValid));
 return <article className={styles.card} aria-label={labels[f.field]||'Dato'}><div><h3>{labels[f.field]||'Dato'}</h3><p>{p.unit} · {p.subject}</p><span className={styles.badge}>{statuses[f.status]}</span><p className={styles.value}>{display(f.status==='confirmed'?f.confirmedValue:f.proposedValue)}</p><small>{f.confirmedOrigin==='manual_correction'?'Correzione manuale motivata':f.origin==='extracted'?'Proposto dal documento':'Dichiarato dall’agente'}</small>{f.confirmedOrigin==='manual_correction'&&<p>Valore proposto in origine: {display(f.proposedValue)}</p>}</div>
 <div aria-label="Provenienza">{!f.evidence.length&&<p>Dato dichiarato: nessuna citazione documentale associata.</p>}{f.evidence.map((e,i)=><div key={i}><p>Fonte · versione {e.version} · pagina {e.page}</p><blockquote>{e.excerpt}</blockquote>{p.open&&<button type="button" disabled={f.status==='stale'} onClick={()=>p.open?.(e)}>Apri fonte · pagina {e.page}</button>}</div>)}</div>
 <form aria-label={`Decisione su ${labels[f.field]||'dato'}`} onSubmit={e=>{e.preventDefault();if(valid&&!locked&&action)p.decide(action,action==='correct'?(boolean?value==='true':numeric?Number(value):value.trim()):undefined,reason.trim()||null);}}>
  <label>Decisione<select value={action} disabled={locked} onChange={e=>setAction(e.target.value as typeof action)}><option value="">Scegli una decisione</option><option value="confirm">Conferma dato</option><option value="correct">Correggi dato</option><option value="reject">Rifiuta dato</option></select></label>
  {action==='correct'&&<label>Valore corretto{boolean?<select value={value} disabled={locked} onChange={e=>setValue(e.target.value)}><option value="true">Sì</option><option value="false">No</option></select>:<input type={numeric?'number':'text'} value={value} maxLength={500} disabled={locked} onChange={e=>setValue(e.target.value)}/>}</label>}
  <label>Motivazione{action==='correct'?' obbligatoria':''}<textarea maxLength={1000} value={reason} disabled={locked} onChange={e=>setReason(e.target.value)}/></label>
  <button type="submit" disabled={locked||!valid}>Registra decisione</button>{f.status==='stale'&&<p>Rivedi la fonte aggiornata: questo dato non può essere confermato.</p>}
 </form></article>;
}
