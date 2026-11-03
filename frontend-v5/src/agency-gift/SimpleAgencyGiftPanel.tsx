import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {Banner,cx,ui} from '../components/ui';
import {isApiError} from '../api/errors';
import type {AgencyGiftPanelProps} from './AgencyGiftPanel';
import type {GiftDocuments,GiftInvitations} from './gift-wire';
import {advanceDelivery,deliveryJournal,reissueJournal,DeliveryProblem,giftTitle,unavailableReason,type DeliveryChoice,type DeliveryJournal} from './simple-delivery';
import {buildGiftLink} from './gift-link-memory';
import styles from './AgencyGiftPanel.module.css';

export function SimpleAgencyGiftPanel(props:AgencyGiftPanelProps){return <DeliveryPanel key={[props.scope.accountId,props.scope.agencyId,props.scope.practiceId].join(':')} {...props}/>;}
function DeliveryPanel({api,scope,readOnly,onChanged}:AgencyGiftPanelProps){
 const bound=useMemo(()=>({accountId:scope.accountId,agencyId:scope.agencyId,practiceId:scope.practiceId}),[scope.accountId,scope.agencyId,scope.practiceId]);
 const [documents,setDocuments]=useState<GiftDocuments|null>(null),[invitations,setInvitations]=useState<GiftInvitations|null>(null);
 const [selected,setSelected]=useState<DeliveryChoice[]>([]),[maps,setMaps]=useState<Record<string,{id:string;version:number}>>({});
 const [email,setEmail]=useState(''),[annual,setAnnual]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[needsRefresh,setNeedsRefresh]=useState(false),[paused,setPaused]=useState(false),[reconciled,setReconciled]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[rowError,setRowError]=useState<string|null>(null),[link,setLink]=useState<string|null>(null),[linkUnavailable,setLinkUnavailable]=useState(false);
 const previousReadOnly=useRef(readOnly),readGeneration=useRef(0);
 const alive=useRef(true),lock=useRef(false),run=useRef<DeliveryJournal|null>(null),requests=useRef(new Set<AbortController>());
 const controller=()=>{const c=new AbortController();requests.current.add(c);return c;};
 const valid=(c:AbortController)=>alive.current&&!c.signal.aborted;
 function fail(e:unknown){
  if(isApiError(e)&&[401,403,404].includes(e.status)){setDocuments(null);setInvitations(null);setSelected([]);setMaps({});setLink(null);run.current=null;setPaused(false);setError('Accesso alla pratica non disponibile.');return;}
  setError(e instanceof DeliveryProblem?e.message:isApiError(e)&&e.status===409?'La pratica è cambiata: aggiorna l’elenco prima di procedere.':isApiError(e)&&e.status===422?'Controlla il documento indicato e i dati della consegna.':'Non riesco a verificare l’operazione. Nessun invio viene ripetuto automaticamente.');
 }
 const read=useCallback(async()=>{
  const c=controller(),generation=++readGeneration.current;
  try{
   const [docs,inv]=await Promise.all([api.documents(bound,c.signal),api.listInvitations(bound,c.signal)]);if(!valid(c)||generation!==readGeneration.current)return;
   setError('');setDocuments(docs);setInvitations(inv);setNeedsRefresh(false);setReconciled(!!run.current?.pending);
   if(inv.accepted)setLink(null);
   if(!run.current)setSelected(previous=>previous.filter(choice=>docs.documents.some(row=>row.sourceId===choice.sourceId&&row.sourceVersion===choice.version&&row.sha256===choice.sha256&&choice.metadataVersion===(row.state==='current'?row.metadataVersion:undefined)&&!unavailableReason(row))));
  }catch(e){if(valid(c)&&generation===readGeneration.current){setNeedsRefresh(true);setReconciled(false);fail(e);}}
  finally{requests.current.delete(c);if(valid(c)&&generation===readGeneration.current)setLoading(false);}
 // The scoped component remounts on account/practice changes. All requests are aborted on departure.
 },[api,bound]);
 useEffect(()=>{alive.current=true;let mounted=true;queueMicrotask(()=>{if(mounted)void read();});const active=requests.current;return()=>{mounted=false;alive.current=false;for(const c of active)c.abort();active.clear();run.current=null;};},[read]);
 useEffect(()=>{const lost=readOnly&&!previousReadOnly.current;previousReadOnly.current=readOnly;if(lost){setLink(null);setLinkUnavailable(false);run.current=null;setPaused(false);for(const c of requests.current)c.abort();lock.current=false;setBusy(false);void read();}},[readOnly,read]);
 async function send(){
  if(lock.current||!run.current||readOnly)return;lock.current=true;setBusy(true);setError('');setRowError(null);setPaused(false);setReconciled(false);const c=controller(),journal=run.current;
  try{
   const result=await advanceDelivery(api,bound,journal,c.signal,docs=>{if(valid(c)){setDocuments(docs);setSelected(structuredClone(journal.choices));}});if(!valid(c))return;
   run.current=null;setLink(result.secret?buildGiftLink(window.location.origin,result.id,result.secret):null);setLinkUnavailable(!result.secret);setNotice(result.secret?'Gift pronta. Copia il link e condividilo con il proprietario.':'Il link è già stato creato. Aggiorna l’elenco per rigenerarlo.');setNeedsRefresh(true);onChanged?.();await read();
  }catch(e){if(valid(c)){
   const uncertain=!(e instanceof DeliveryProblem)&&(!isApiError(e)||e.kind==='service'||e.status>=500);
   if(uncertain){setPaused(true);setError('La risposta si è interrotta. Verifica lo stato prima di riprendere la stessa consegna.');}
   else{setRowError(e instanceof DeliveryProblem?e.sourceId??null:journal.pending?.kind==='release'?journal.pending.sourceId:null);run.current=null;setNeedsRefresh(true);fail(e);}
  }}finally{requests.current.delete(c);lock.current=false;if(alive.current)setBusy(false);}
 }
 function create(e:FormEvent){
  e.preventDefault();if(!documents||readOnly||blocked||invitations?.accepted||openInvitation)return;
  try{run.current=deliveryJournal(bound,documents,selected.map(choice=>({...choice,...(maps[choice.sourceId]?{mapId:maps[choice.sourceId]!.id,mapVersion:maps[choice.sourceId]!.version}:{})})),email,annual,true);void send();}catch(problem){if(problem instanceof DeliveryProblem)setRowError(problem.sourceId??null);fail(problem);}
 }
 function regenerate(id:string,version:number){if(!documents||blocked||readOnly||invitations?.accepted)return;setLink(null);run.current=reissueJournal(bound,documents,id,version);void send();}
 async function revoke(id:string,version:number){
  if(lock.current||blocked||readOnly)return;lock.current=true;setBusy(true);setLink(null);const c=controller();
  try{await api.revokeInvitation(bound,id,version,c.signal);if(valid(c)){setNotice('Link revocato. Puoi preparare una nuova consegna.');await read();}}
  catch(e){if(valid(c)){setNeedsRefresh(true);fail(e);}}finally{requests.current.delete(c);lock.current=false;if(alive.current)setBusy(false);}
 }
 async function copy(){if(!link)return;try{await navigator.clipboard.writeText(link);if(alive.current)setNotice('Link copiato. Condividilo con il proprietario.');}catch{if(alive.current)setNotice('Seleziona e copia il link dal campo qui sotto.');}}
 const blocked=busy||loading||needsRefresh||paused,openInvitation=invitations?.invitations.some(i=>i.state!=='revoked'),accepted=!!invitations?.accepted;
 return <section id="consegna-gift" className={styles.panel} aria-label="Consegna Gift" tabIndex={-1}>
  <header className={styles.header}><div><h2>Consegna la casa al proprietario</h2><p>Scegli cosa troverà nella sua casa Dimora quando accetterà la Gift.</p></div><button type="button" className={ui.btn} disabled={busy||loading} onClick={()=>{setLoading(true);void read();}}>{paused?'Verifica stato':'Aggiorna elenco'}</button></header>
  {error&&<Banner tone="error" role="alert" title="Consegna da controllare"><p>{error}</p></Banner>}
  {notice&&<p role="status" className={styles.note}>{notice}</p>}
  {readOnly&&<p>Puoi consultare la consegna. Per modificarla serve accesso in gestione alla pratica.</p>}
  {loading&&!documents?<p role="status">Caricamento dei documenti della pratica…</p>:documents&&invitations?<>
   {accepted?<Banner title="Gift già accettata"><p>Il proprietario ha ricevuto la casa e i documenti scelti.</p></Banner>:null}
   <form className={styles.form} onSubmit={create} noValidate>
    <fieldset disabled={blocked||readOnly||accepted||!!openInvitation}>
     <h3>Documenti da trasferire</h3><p>Seleziona le versioni finali che vuoi lasciare al proprietario.</p>
     <ul className={styles.documents} aria-label="Documenti da trasferire">{documents.documents.map(row=>{const reason=unavailableReason(row),choice=selected.some(c=>c.sourceId===row.sourceId),plans=row.digitalPlans??[],readyPlans=plans.filter(p=>!p.pending&&p.roomCount>0),existingMap=row.state==='current'?row.descriptor.digitalPlan:undefined;
      return <li key={row.sourceId} className={styles.document}>
       <label className={styles.check}><input type="checkbox" checked={choice} disabled={!!reason} onChange={e=>setSelected(previous=>e.target.checked?[...previous,{sourceId:row.sourceId,version:row.sourceVersion,sha256:row.sha256,...(row.state==='current'?{metadataVersion:row.metadataVersion}:{})}]:previous.filter(c=>c.sourceId!==row.sourceId))}/><strong>{giftTitle(row)}</strong></label>
       {reason&&<p>{reason}</p>}{rowError===row.sourceId&&<p role="alert">Controlla questo documento nella pratica prima di riprovare.</p>}
       {existingMap?<p>Mappa digitale inclusa · {existingMap.roomCount} ambienti</p>:choice&&plans.length>0?<>
        {readyPlans.length>1&&<label>Mappa digitale per {giftTitle(row)}<select value={maps[row.sourceId]?.id??''} onChange={e=>setMaps(previous=>{const next={...previous},plan=readyPlans.find(p=>p.id===e.target.value);if(plan)next[row.sourceId]={id:plan.id,version:plan.version};else delete next[row.sourceId];return next;})}><option value="">Scegli la mappa della pratica</option>{readyPlans.map(plan=><option key={plan.id} value={plan.id}>{plan.roomCount} ambienti</option>)}</select></label>}
        {readyPlans.length===1&&<label className={styles.check}><input type="checkbox" checked={maps[row.sourceId]?.id===readyPlans[0]!.id&&maps[row.sourceId]?.version===readyPlans[0]!.version} onChange={e=>setMaps(previous=>{const next={...previous};if(e.target.checked)next[row.sourceId]={id:readyPlans[0]!.id,version:readyPlans[0]!.version};else delete next[row.sourceId];return next;})}/>Includi la mappa digitale · {readyPlans[0]!.roomCount} ambienti</label>}
        <p className={styles.details}>{readyPlans.length?'La mappa della pratica conserva le indicazioni su scala e misure.':'La mappa ha modifiche da verificare nella pratica. Puoi consegnare il file originale.'}</p>
       </>:null}
       <details><summary>Dettagli del documento</summary><p>{row.filename} · versione {row.sourceVersion}</p>{row.state==='current'&&<><p>{row.descriptor.origin==='agency_generated'?'Prodotto dall’agenzia':'Ricevuto nella pratica'}</p>{row.descriptor.surface&&<p>{row.descriptor.surface.qualification==='estimated'?'Superficie stimata':'Superficie da controllare'} · {row.descriptor.surface.method}. {row.descriptor.surface.caveats.join(' · ')}</p>}</>}</details>
      </li>;
     })}</ul>
     {!documents.documents.length&&<p>Carica i documenti nel fascicolo della pratica: compariranno qui per la consegna.</p>}
     <p>{selected.length} documenti selezionati</p>
     <label>Email del proprietario<input type="email" autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label>
     <label className={styles.check}><input type="checkbox" checked={annual} onChange={e=>setAnnual(e.target.checked)}/>Regala un anno di tutte le funzioni Dimora</label>
     <p>Consegna dopo la stipula: il proprietario riceverà una copia dei documenti selezionati.</p>
     <button className={cx(ui.btn,ui.primary)} disabled={selected.length<1||selected.length>50||!/^\S+@\S+\.\S+$/u.test(email.trim())}>{busy?'Preparazione della Gift…':'Crea link Gift'}</button>
    </fieldset>
   </form>
   {paused&&<Banner tone="warning" title="Consegna da riprendere"><p>I passaggi già completati sono conservati. Verifica lo stato, poi riprendi lo stesso invio.</p>{reconciled&&!readOnly&&<button className={ui.btn} type="button" disabled={busy} onClick={()=>void send()}>Riprendi la stessa consegna</button>}</Banner>}
   {link&&!readOnly&&<div className={styles.link}><h3>Gift pronta</h3><p>Il proprietario aprirà il link, accederà a Dimora e riceverà la sua casa con i documenti scelti.</p><label>Link Gift<textarea readOnly value={link} rows={3}/></label><button className={cx(ui.btn,ui.primary)} type="button" onClick={()=>void copy()}>Copia link</button><p>Copia il link prima di uscire. Puoi condividerlo tu con il proprietario.</p></div>}
   {linkUnavailable&&!readOnly&&<p>Il link non è recuperabile da questa risposta. Aggiorna l’elenco e usa Rigenera link.</p>}
   {!accepted&&invitations.invitations.length>0&&<details open={!!openInvitation}><summary>Link della consegna</summary><ul className={styles.invitations}>{invitations.invitations.map(inv=><li key={inv.id}><div><strong>{inv.recipientEmail}</strong><p>{inv.state==='revoked'?'Revocato':'In attesa del proprietario'}</p></div>{inv.state!=='revoked'&&!readOnly&&<div className={styles.actions}><button className={ui.btn} type="button" disabled={blocked} onClick={()=>regenerate(inv.id,inv.version)}>Rigenera link</button><button className={ui.btn} type="button" disabled={blocked} onClick={()=>void revoke(inv.id,inv.version)}>Revoca link</button></div>}</li>)}</ul></details>}
  </>:!loading&&<p>Nessun dato disponibile con questo accesso.</p>}
 </section>;
}
