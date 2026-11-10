import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {isApiError} from '../api/errors';
import {Banner,cx,ui} from '../components/ui';
import type {GiftApi,GiftAgencyScope,GiftCreateInput,GiftReleaseInput,GiftReissueInput} from './gift-api';
import type {GiftDocumentRow,GiftDocuments,GiftInvitations} from './gift-wire';
import {buildGiftLink} from './gift-link-memory';
import styles from './AgencyGiftPanel.module.css';

export type AgencyGiftPanelProps={api:Pick<GiftApi,'documents'|'listInvitations'|'releaseDocument'|'createInvitation'|'revokeInvitation'|'reissueInvitation'>;scope:GiftAgencyScope;readOnly:boolean;onChanged?:()=>void};
type Snapshot={documents:GiftDocuments;invitations:GiftInvitations};
type Selection={sourceId:string;version:number;sha256:string;metadataVersion:number};
type Pending=({kind:'release';sourceId:string;body:GiftReleaseInput}|{kind:'create';body:GiftCreateInput}|{kind:'reissue';invitationId:string;body:GiftReissueInput})&{key:string;phase:'sending'|'uncertain'|'reconciled'};
type Editor={sourceId:string;title:string;origin:'received'|'agency_generated';final:boolean;approved:boolean;digitalPlanId?:string;mapReviewed?:boolean};
const eligible=(row:GiftDocumentRow)=>row.state==='current'&&row.descriptor.lifecycle!=='draft';
const stateLabel={missing:'Da preparare',stale:'Versione aggiornata: rilascio da ripetere',current:'Pronto per la selezione'};
function message(error:unknown){
 if(isApiError(error)){
  if(error.status===401||error.status===403)return 'Accesso alla Gift non disponibile con questa sessione. Nessun dato della pratica viene mostrato.';
  if(error.code==='unavailable')return 'Gift non disponibile: controlla gli accessi e lo stato della pratica.';
  if(error.code==='invalid_input'||error.status===422)return 'Controlla i dati e le conferme prima di riprovare.';
  if(error.status===409)return 'La pratica o l’invito sono cambiati. Aggiorna gli elenchi prima di procedere.';
 }
 return 'Esito non confermato. Verifica lo stato sul server prima di ripetere lo stesso invio.';
}
const uncertain=(error:unknown)=>!isApiError(error)||error.kind==='service'||error.status>=500;

/** All credentials and retry commands live only in this scoped component, never in a query cache. */
export function AgencyGiftPanel(props:AgencyGiftPanelProps){return <ScopedGiftPanel key={[props.scope.accountId,props.scope.agencyId,props.scope.practiceId].join(':')} {...props}/>;}
function ScopedGiftPanel({api,scope,readOnly,onChanged}:AgencyGiftPanelProps){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[needsRefresh,setNeedsRefresh]=useState(false);
 const [selected,setSelected]=useState<Selection[]>([]),[editor,setEditor]=useState<Editor|null>(null),[email,setEmail]=useState(''),[stipulated,setStipulated]=useState(false),[approved,setApproved]=useState(false),[annual,setAnnual]=useState(false),[pending,setPending]=useState<Pending|null>(null);
 const [link,setLink]=useState<{id:string;value:string}|null>(null),[linkUnavailable,setLinkUnavailable]=useState(false);
 const alive=useRef(true),controllers=useRef(new Set<AbortController>()),locked=useRef(false);
 const {accountId,agencyId,practiceId}=scope;
 const capturedScope=useCallback(()=>({accountId,agencyId,practiceId}),[accountId,agencyId,practiceId]);
 const controller=()=>{const c=new AbortController();controllers.current.add(c);return c;};
 const valid=(c:AbortController)=>alive.current&&!c.signal.aborted;
 const clearPrivate=()=>{setSnapshot(null);setSelected([]);setEditor(null);setLink(null);setLinkUnavailable(false);setPending(null);};
 const fail=(e:unknown)=>{setError(message(e));if(isApiError(e)&&(e.status===401||e.status===403))clearPrivate();};
 const apply=useCallback((next:Snapshot)=>{
  setSnapshot(next);setNeedsRefresh(false);setEditor(null);
  setSelected(previous=>previous.filter(s=>next.documents.documents.some(d=>eligible(d)&&d.state==='current'&&d.sourceId===s.sourceId&&d.sourceVersion===s.version&&d.sha256===s.sha256&&d.metadataVersion===s.metadataVersion)));
 },[]);
 const read=useCallback(async(signal:AbortSignal)=>{
  const requestScope=capturedScope(),[documents,invitations]=await Promise.all([api.documents(requestScope,signal),api.listInvitations(requestScope,signal)]);return {documents,invitations};
 },[api,capturedScope]);
 useEffect(()=>{
  alive.current=true;const c=new AbortController(),active=controllers.current;active.add(c);
  void read(c.signal).then(next=>{if(!c.signal.aborted){apply(next);setLoading(false);}}).catch(e=>{if(!c.signal.aborted){setError(message(e));setSnapshot(null);setLoading(false);}}).finally(()=>active.delete(c));
  return()=>{alive.current=false;for(const request of active)request.abort();active.clear();};
 },[read,apply]);
 async function refresh(){
  if(locked.current)return;locked.current=true;setBusy(true);setError('');const c=controller();
  try{const next=await read(c.signal);if(valid(c)){apply(next);setLoading(false);setPending(p=>p?{...p,phase:'reconciled'}:null);setNotice(pending?'Stato verificato. Puoi ripetere soltanto lo stesso invio; nessun nuovo invio è partito.':'Elenchi aggiornati. Le versioni cambiate devono essere selezionate di nuovo.');}}
  catch(e){if(valid(c))fail(e);}finally{controllers.current.delete(c);if(valid(c)){locked.current=false;setBusy(false);setLoading(false);}}
 }
 async function send(request:Pending){
  if(readOnly||locked.current||snapshot?.invitations.accepted)return;locked.current=true;setBusy(true);setError('');setNotice('');setPending({...request,phase:'sending'});if(request.kind==='reissue'){setLink(null);setLinkUnavailable(false);}const c=controller(),requestScope=capturedScope();
  try{
   if(request.kind==='release'){
    const result=await api.releaseDocument(requestScope,request.sourceId,request.body,request.key,c.signal);
    if(valid(c)){setSnapshot(previous=>previous?{...previous,documents:result.metadata}:previous);setSelected(previous=>previous.filter(s=>s.sourceId!==request.sourceId));setEditor(null);setPending(null);setNotice('Documento rilasciato. Selezionalo esplicitamente per includerlo nella Gift.');onChanged?.();}
   }else{
    const result=request.kind==='create'?await api.createInvitation(requestScope,request.body,request.key,c.signal):await api.reissueInvitation(requestScope,request.invitationId,request.body,request.key,c.signal);
    if(valid(c)){
     setPending(null);setNeedsRefresh(true);setLink(result.secret?{id:result.id,value:buildGiftLink(window.location.origin,result.id,result.secret)}:null);setLinkUnavailable(result.secret===null);
     setNotice(result.secret?(request.kind==='reissue'?'Link rigenerato: il vecchio link non è più valido. Il nuovo link scade tra 7 giorni. Copialo e invialo tu: nessuna email è partita.':'Link personale creato. Copialo e invialo tu al destinatario: Dimora non ha inviato email.'):'Invito registrato. Il segreto non viene restituito nei tentativi ripetuti: aggiorna gli elenchi per trovare l’ultimo invito aperto.');onChanged?.();
    }
   }
  }catch(e){if(valid(c)){fail(e);if(!(isApiError(e)&&(e.status===401||e.status===403))){if(uncertain(e))setPending({...request,phase:'uncertain'});else{setPending(null);setNeedsRefresh(true);}}}}
  finally{controllers.current.delete(c);if(valid(c)){locked.current=false;setBusy(false);}}
 }
 function release(event:FormEvent){
  event.preventDefault();if(editor?.digitalPlanId&&!editor.mapReviewed)return;
  if(!snapshot||!editor||!editor.final||!editor.approved||!editor.title.trim()||pending||needsRefresh||readOnly)return;
  const row=snapshot.documents.documents.find(d=>d.sourceId===editor.sourceId);if(!row)return;
  void send({kind:'release',sourceId:row.sourceId,key:crypto.randomUUID(),phase:'sending',body:{expectedRevision:snapshot.documents.revision,expectedSourceVersion:row.sourceVersion,expectedSha256:row.sha256,title:editor.title.trim(),origin:editor.origin,finalDocumentConfirmed:true,releaseApproved:true,...(editor.digitalPlanId?{digitalPlan:{planId:editor.digitalPlanId,expectedPlanVersion:row.digitalPlans!.find(p=>p.id===editor.digitalPlanId)!.version,reviewed:true as const}}:{})}});
 }
 function create(event:FormEvent){
  event.preventDefault();if(!snapshot||pending||needsRefresh||readOnly||snapshot.invitations.accepted||!stipulated||!approved||selected.length<1||selected.length>50||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim()))return;
  void send({kind:'create',key:crypto.randomUUID(),phase:'sending',body:{expectedRevision:snapshot.documents.revision,documents:selected.map(({sourceId,version,sha256})=>({sourceId,version,sha256})),recipientEmail:email.trim().toLowerCase(),stipulationCompleted:true,releaseApproved:true,annualBenefit:annual}});
 }
 function reissue(id:string,version:number){
  if(!snapshot||readOnly||locked.current||pending||needsRefresh||snapshot.invitations.accepted)return;
  void send({kind:'reissue',invitationId:id,key:crypto.randomUUID(),phase:'sending',body:{expectedRevision:snapshot.documents.revision,expectedVersion:version}});
 }
 async function revoke(id:string,version:number){
  if(readOnly||locked.current||pending||needsRefresh)return;locked.current=true;setBusy(true);setError('');const c=controller();
  try{const result=await api.revokeInvitation(capturedScope(),id,version,c.signal);if(valid(c)){setSnapshot(previous=>previous?{...previous,invitations:{...previous.invitations,invitations:previous.invitations.invitations.map(row=>row.id===id?{...row,version:result.version,state:result.state}:row)}}:previous);if(link?.id===id)setLink(null);setNotice('Invito revocato. Il vecchio link non può più essere usato per una nuova accettazione.');onChanged?.();}}
  catch(e){if(valid(c)){fail(e);setNeedsRefresh(true);}}finally{controllers.current.delete(c);if(valid(c)){locked.current=false;setBusy(false);}}
 }
 async function copy(){if(!link)return;try{await navigator.clipboard.writeText(link.value);if(alive.current)setNotice('Link copiato. Invialo personalmente al destinatario.');}catch{if(alive.current)setNotice('Copia automatica non disponibile. Seleziona e copia il link dal campo.');}}
 const blocked=busy||!!pending||needsRefresh,openInvitation=snapshot?.invitations.invitations.some(i=>i.state!=='revoked');
 return <section className={styles.panel} aria-label="Gift al nuovo proprietario">
  <header className={styles.header}><div><h2>Gift al nuovo proprietario</h2><p>Dopo la stipula, consegna i documenti scelti nella casa Dimora del destinatario.</p></div><button type="button" className={ui.btn} disabled={busy} onClick={()=>void refresh()}>{pending?'Verifica stato sul server':'Aggiorna elenchi'}</button></header>
  <p className={styles.note}>Un solo account destinatario. Il proprietario completa il normale accesso e l’accettazione; l’agenzia non ottiene accesso alle sue aggiunte.</p>
  {error&&<Banner tone="error" role="alert" title="Operazione non completata"><p>{error}</p></Banner>}
  {notice&&<p role="status" className={styles.note}>{notice}</p>}
  {loading?<p role="status">Caricamento documenti e inviti…</p>:snapshot?<>
   {readOnly&&<p className={styles.note}>Consultazione: il rilascio dei documenti e la gestione degli inviti richiedono accesso in modifica.</p>}
   {snapshot.invitations.accepted&&<Banner title="Gift già accettata"><p>La casa del destinatario è indipendente dalla pratica. Questi controlli non modificano i documenti già consegnati.</p></Banner>}
   {needsRefresh&&<p className={styles.note}>Aggiorna gli elenchi prima di altre operazioni.</p>}
   <h3>1. Prepara e scegli i documenti</h3><p>Nessun documento viene incluso automaticamente. Bozze e versioni cambiate richiedono una nuova verifica.</p>
   {!snapshot.documents.documents.length?<p>Nessun documento disponibile con questo accesso. Caricalo prima nel fascicolo della pratica.</p>:<ul className={styles.documents} aria-label="Documenti della pratica">{snapshot.documents.documents.map(row=><li key={row.sourceId} className={styles.document}>
    <div className={styles.rowHeader}><strong>{row.state==='current'?row.descriptor.title:row.filename}</strong><span className={styles.badge}>{row.state==='current'&&row.descriptor.lifecycle==='draft'?'Bozza: non selezionabile':stateLabel[row.state]}</span></div>
    <p className={styles.details}>File: {row.filename} · versione {row.sourceVersion}{row.state==='current'?` · metadati ${row.metadataVersion}`:''}</p>
    {row.state==='current'&&<><p>{row.descriptor.origin==='received'?'Ricevuto dall’agenzia':'Prodotto dall’agenzia'} · autore dichiarato: {row.descriptor.author}</p><p>{row.descriptor.lifecycle==='signed'?'Sottoscritto dichiarato · firma non verificata':row.descriptor.lifecycle==='draft'?'Bozza':'Finale dichiarato'}</p>
     {row.descriptor.digitalPlan&&<p>Con mappa digitale: {row.descriptor.digitalPlan.roomCount} vani · {row.descriptor.digitalPlan.qualification==='estimated'?'scala stimata':row.descriptor.digitalPlan.qualification==='reviewed'?'scala revisionata':'senza misura verificata'}. Una copia modificabile sarà consegnata con il file originale.</p>}
     {row.descriptor.surface&&<div className={styles.surface}><strong>Superficie · {row.descriptor.surface.qualification==='estimated'?'Stima':row.descriptor.surface.qualification==='reviewed'?'Revisionata':'Da verificare'}</strong><p>{row.descriptor.surface.method} · revisione geometria {row.descriptor.surface.geometryRevision}</p>{!!row.descriptor.surface.caveats.length&&<ul>{row.descriptor.surface.caveats.map(c=><li key={c}>{c}</li>)}</ul>}<p>La qualifica e i limiti seguono il documento; non certificano la misura.</p></div>}
    </>}
    {!readOnly&&!snapshot.invitations.accepted&&<div className={styles.actions}>{eligible(row)&&row.state==='current'&&<label className={styles.check}><input type="checkbox" checked={selected.some(s=>s.sourceId===row.sourceId)} disabled={blocked||!!openInvitation} onChange={e=>setSelected(previous=>e.target.checked?[...previous,{sourceId:row.sourceId,version:row.sourceVersion,sha256:row.sha256,metadataVersion:row.metadataVersion}]:previous.filter(s=>s.sourceId!==row.sourceId))}/>Includi {row.descriptor.title}</label>}<button type="button" className={ui.btn} disabled={blocked||!!openInvitation} onClick={()=>setEditor({sourceId:row.sourceId,title:row.state==='current'?row.descriptor.title:row.filename,origin:row.state==='current'?row.descriptor.origin:'received',final:false,approved:false})}>{row.state==='current'?'Rivedi rilascio':'Prepara per la Gift'} · {row.filename}</button></div>}
   </li>)}</ul>}
   {editor&&!readOnly&&<form className={styles.form} onSubmit={release} noValidate><h4>Verifica il documento per la consegna</h4><p>Le conferme riguardano la versione del file indicata sopra. Autore, firma e superfici restano metadati gestiti dal server.</p><fieldset disabled={blocked}><label>Titolo per il proprietario<input maxLength={300} value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})}/></label><label>Origine del documento<select value={editor.origin} onChange={e=>setEditor({...editor,origin:e.target.value as Editor['origin']})}><option value="received">Ricevuto dall’agenzia</option><option value="agency_generated">Prodotto dall’agenzia</option></select></label>{!!snapshot.documents.documents.find(r=>r.sourceId===editor.sourceId)?.digitalPlans?.length&&<><label>Mappa digitale da consegnare<select value={editor.digitalPlanId??''} onChange={e=>setEditor({...editor,digitalPlanId:e.target.value||undefined,mapReviewed:false})}><option value="">Solo file originale</option>{snapshot.documents.documents.find(r=>r.sourceId===editor.sourceId)?.digitalPlans?.map(p=><option key={p.id} value={p.id} disabled={p.pending||p.roomCount===0}>{p.roomCount} vani · geometria {p.geometryRevision}{p.pending?' · proposta da adottare prima':''}</option>)}</select></label>{editor.digitalPlanId&&<label className={styles.check}><input type="checkbox" checked={!!editor.mapReviewed} onChange={e=>setEditor({...editor,mapReviewed:e.target.checked})}/>Ho controllato sull’originale contorni, nomi dei vani e limiti della scala. Autorizzo la copia digitale nella casa del proprietario.</label>}</>}<label className={styles.check}><input type="checkbox" checked={editor.final} onChange={e=>setEditor({...editor,final:e.target.checked})}/>Confermo che questa versione è un documento finale</label><label className={styles.check}><input type="checkbox" checked={editor.approved} onChange={e=>setEditor({...editor,approved:e.target.checked})}/>Autorizzo la consegna di questo documento al proprietario</label><div className={styles.actions}><button className={cx(ui.btn,ui.primary)} disabled={!editor.title.trim()||!editor.final||!editor.approved||!!editor.digitalPlanId&&!editor.mapReviewed}>Rilascia documento</button><button type="button" className={ui.btn} onClick={()=>setEditor(null)}>Annulla preparazione</button></div></fieldset></form>}
   {!readOnly&&!snapshot.invitations.accepted&&<form className={styles.form} onSubmit={create} noValidate><h3>2. Crea il link personale</h3>{openInvitation&&<p>Esiste già un invito aperto. Consulta o revoca l’invito prima di preparare un’altra consegna.</p>}<fieldset disabled={blocked||!!openInvitation}><label>Email del nuovo proprietario<input type="email" autoComplete="off" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><p>Documenti selezionati: {selected.length} · massimo 50. Il destinatario dovrà usare e verificare questa email.</p><label className={styles.check}><input type="checkbox" checked={stipulated} onChange={e=>setStipulated(e.target.checked)}/>La stipula è stata completata</label><label className={styles.check}><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/>Autorizzo la consegna dei soli documenti selezionati</label><label className={styles.check}><input type="checkbox" checked={annual} onChange={e=>setAnnual(e.target.checked)}/>Includi un anno di tutte le funzioni proprietario di Dimora</label><p>L’anno opzionale decorre dall’accettazione del proprietario. Nessun anno è attivo alla creazione del link; i documenti restano nella casa anche dopo la sua scadenza.</p><button className={cx(ui.btn,ui.primary)} disabled={!stipulated||!approved||selected.length<1||selected.length>50||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim())}>Crea link personale</button></fieldset></form>}
   {pending&&<Banner tone="warning" title={pending.phase==='sending'?'Invio in corso':'Invio da verificare'}><p>I dati e la chiave di questo invio sono conservati solo finché resti in questa schermata. Non vengono inviati di nuovo automaticamente.</p>{pending.phase==='reconciled'&&!readOnly&&<button type="button" className={ui.btn} disabled={busy||snapshot.invitations.accepted} onClick={()=>void send(pending)}>Riprova lo stesso invio</button>}</Banner>}
   {link&&!readOnly&&<div className={styles.link}><h3>Link personale pronto</h3><p>Visibile solo in questa sessione. Copialo prima di uscire: non viene memorizzato nel browser né inviato via email.</p><label>Link personale Gift<textarea readOnly value={link.value} rows={3} spellCheck={false}/></label><div className={styles.actions}><button type="button" className={cx(ui.btn,ui.primary)} onClick={()=>void copy()}>Copia link</button><button type="button" className={ui.btn} onClick={()=>setLink(null)}>Nascondi link</button></div></div>}
   {linkUnavailable&&<Banner tone="warning" title="Link non recuperabile"><p>Il link personale viene mostrato una sola volta. Aggiorna gli elenchi e usa “Rigenera link” sull’ultimo invito ancora aperto. La rigenerazione invalida il vecchio link; nessuna email viene inviata automaticamente.</p></Banner>}
   <h3>Inviti della pratica</h3><p>Rigenerare un link mantiene destinatario, documenti e anno eventuale, sostituisce il vecchio link e assegna 7 giorni al nuovo invito. Una ricezione già in corso richiede una verifica prima della rigenerazione.</p>{!snapshot.invitations.invitations.length?<p>Nessun invito registrato nell’ultimo aggiornamento.</p>:<ul className={styles.invitations}>{snapshot.invitations.invitations.map(invitation=><li key={invitation.id}><div><strong>{invitation.recipientEmail}</strong><p>{invitation.state==='invited'?'In attesa del proprietario':invitation.state==='claimed'?'Accesso verificato · accettazione da completare':'Revocato'} · scadenza {new Date(invitation.expiresAt).toLocaleDateString('it-IT')}</p></div>{!readOnly&&!snapshot.invitations.accepted&&invitation.state!=='revoked'&&<div className={styles.invitationActions}><button type="button" className={ui.btn} disabled={blocked} onClick={()=>reissue(invitation.id,invitation.version)}>Rigenera link per {invitation.recipientEmail}</button><button type="button" className={ui.btn} disabled={blocked} onClick={()=>void revoke(invitation.id,invitation.version)}>Revoca invito a {invitation.recipientEmail}</button></div>}</li>)}</ul>}
  </>:<p>Nessun dato della pratica disponibile. Usa “Aggiorna elenchi” per riprovare.</p>}
 </section>;
}
