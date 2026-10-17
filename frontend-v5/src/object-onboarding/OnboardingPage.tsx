import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import { ApiError, isApiError, isUnauthorized, userMessage } from '../api/errors';
import { newIdempotencyKey, queryKeys } from '../api/queryKeys';
import { Banner, ErrorState, Loading, ui, useDocumentTitle } from '../components/ui';
import { useDocumentFile, useObjectUrl } from '../documents/hooks';
import { saveBlob } from '../lib/files';
import { handleUnauthorized } from '../session/queryClient';
import { useAccount, useApi } from '../session/session';
import { useCurrentHome } from '../routes/HomePages';
import type { DocumentDetail } from '../api/types';
import { choice, initialForm, type Capabilities, type Draft, type Form, type Job, type Pending } from './model';
import { ItemEditor } from './ItemEditor';
import pages from '../routes/pages.module.css';
import styles from './onboarding.module.css';

type Reply={draft:Draft;result?:{newObjects:number;newExpenses:number}|null};
export function OnboardingPage(){const home=useCurrentHome(),account=useAccount(),{documentId=''}=useParams();return <Container key={[account.id,home.id,documentId].join(':')} documentId={documentId}/>;}
function Container({documentId}:{documentId:string}){
 const home=useCurrentHome(),account=useAccount(),api=useApi(),cache=useQueryClient();
 const [params,setParams]=useSearchParams(),draftId=params.get('bozza'),jobId=params.get('analisi');
 const root='/home/'+encodeURIComponent(home.id),base='/homes/'+encodeURIComponent(home.id)+'/object-onboarding';
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false),[blocked,setBlocked]=useState(false),[pendingView,setPendingView]=useState<Pending|null>(null);
 const pending=useRef<Pending|null>(null),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const current=()=>live.current&&cache.getQueryData<{account:{id:string}|null}>(queryKeys.session)?.account?.id===account.id;
 const caps=useQuery({queryKey:['account',account.id,'home',home.id,'onboarding','capabilities',documentId],queryFn:({signal})=>api.callJson<Capabilities>(base+'/capabilities?documentId='+encodeURIComponent(documentId),{accountId:account.id,signal}),retry:false,gcTime:0});
 const doc=useQuery({queryKey:['account',account.id,'home',home.id,'onboarding','document',documentId],queryFn:({signal})=>api.getDocument(home.id,documentId,signal,account.id),retry:false,gcTime:0});
 const draft=useQuery({queryKey:['account',account.id,'home',home.id,'onboarding','draft',draftId],queryFn:async({signal})=>{const result=await api.callJson<Reply>(base+'/drafts/'+encodeURIComponent(draftId!),{accountId:account.id,signal});if(result.draft.snapshot&&result.draft.snapshot.documentId!==documentId)throw new ApiError({kind:'http',status:422,code:'onboarding_source_mismatch',message:'Queste proposte appartengono a un altro documento. Riapri il percorso dal documento corretto.'});return result;},enabled:!!draftId,retry:false,gcTime:0});
 const job=useQuery({queryKey:['account',account.id,'home',home.id,'onboarding','job',jobId],queryFn:({signal})=>api.callJson<{job:Job}>(base+'/jobs/'+encodeURIComponent(jobId!),{accountId:account.id,signal}),enabled:!!jobId&&!draftId,retry:false,gcTime:0,refetchInterval:q=>q.state.data&&['queued','running'].includes(q.state.data.job.state)?1000:false});
 useEffect(()=>{if(job.data?.job.state==='succeeded'&&job.data.job.draftId)setParams({bozza:job.data.job.draftId},{replace:true});},[job.data,setParams]);
 async function fail(e:unknown){if(isUnauthorized(e))await handleUnauthorized(cache);if(!current())return;if(isApiError(e)&&e.status===403)setBlocked(true);setError(userMessage(e));}
 async function write<T>(path:string,body:unknown,key=newIdempotencyKey()):Promise<T>{setBusy(true);setError('');const attempt=pending.current??{path,body,key};pending.current=attempt;try{const result=await api.callJson<T>(base+attempt.path,{method:'POST',body:attempt.body,idempotencyKey:attempt.key,accountId:account.id});if(!current())throw new Error('Contesto cambiato.');pending.current=null;setUncertain(false);setPendingView(null);return result;}catch(e){if(current()){if(isApiError(e)&&e.kind==='http'&&e.status<500){pending.current=null;setUncertain(false);setPendingView(null);}else{setUncertain(true);setPendingView(attempt);}}await fail(e);throw e;}finally{if(current())setBusy(false);}}
 const invalidate=()=>cache.invalidateQueries({queryKey:['account',account.id,'home',home.id]});
 async function begin(ai:boolean){try{if(ai){const result=await write<{job:Job}>('/jobs',{documentId,provider:'anthropic',consentToProviderTransfer:consent});setParams({analisi:result.job.id});}else{const result=await write<Reply>('/manual-drafts',{documentId});setParams({bozza:result.draft.id});}await caps.refetch();}catch{/* surfaced above */}}
 async function retry(){if(!pending.current)return;const attempt=pending.current;try{const result=await write<Reply&{job?:Job}>(attempt.path,attempt.body,attempt.key);if(result.job)setParams({analisi:result.job.id});else if(result.draft){setParams({bozza:result.draft.id});await draft.refetch();}await invalidate();}catch{/* same request remains recoverable */}}
 useDocumentTitle('Organizza gli oggetti dal documento');
 const queryError=doc.error??caps.error??draft.error??job.error;
 if(blocked)return <ErrorState error={new Error('Accesso non disponibile. Riapri la casa prima di continuare.')}/>;
 if(queryError)return <ErrorState error={queryError} onRetry={()=>{void doc.refetch();void caps.refetch();if(draftId)void draft.refetch();if(jobId)void job.refetch();}}/>;
 if(doc.isPending||caps.isPending||draftId&&draft.isPending)return <Loading label="Caricamento del documento e delle proposte…"/>;
 const source=doc.data;
 if(!source)return <p>Documento non disponibile.</p>;
 return <div className={pages.stack}>
  <Link to={root+'/documenti/'+encodeURIComponent(documentId)}>← Torna al documento</Link>
  <header><h1 className={pages.title}>Dal documento agli oggetti di casa</h1><p>{source.name}</p><p>Controlla ciò che il sistema propone, scegli le schede e conferma. Nessun oggetto o costo viene creato dalla sola analisi.</p></header>
  {error&&<Banner tone="error"><p>{error}</p></Banner>}
  {uncertain&&<Banner tone="warning"><p>Esito non ancora verificato. I campi sono bloccati per evitare richieste diverse o doppioni.</p><button type="button" className={ui.btn} disabled={busy} onClick={()=>void retry()}>Verifica ripetendo la stessa richiesta</button>{pendingView?.path==='/jobs'&&<p>Nessuna seconda analisi: verrà recuperato lo stesso incarico.</p>}</Banner>}
  {!draftId&&<section className={ui.card}>
   <h2>Leggi i prodotti nel documento</h2><p>Ricevute, ordini e foto di etichette possono proporre uno o più oggetti, con quantità, dati e collegamenti da verificare.</p>
   {caps.data?.aiAvailable?<><label className={styles.check}><input type="checkbox" checked={consent} disabled={busy||uncertain} onChange={e=>setConsent(e.target.checked)}/>Autorizzo l’invio di questo documento ad Anthropic per riconoscere gli articoli. Il documento può contenere dati personali. L’analisi consuma il budget configurato (riserva massima 0,25 USD).</label><p><button type="button" className={ui.btnPrimary} disabled={!consent||busy||uncertain||['queued','running','uncertain'].includes(caps.data?.job?.state??'')||!!jobId&&['queued','running','uncertain'].includes(job.data?.job.state??'queued')} onClick={()=>void begin(true)}>Analizza e proponi gli oggetti</button></p></>:<Banner tone="info"><p>{jobId||caps.data?.job?'Nessun nuovo invio è disponibile. Segui l’analisi già autorizzata oppure continua manualmente.':'L’analisi AI di questo documento non è abilitata. Puoi compilare le proposte manualmente; il documento resta sul servizio locale.'}</p></Banner>}
   {jobId&&<div aria-live="polite"><p>{job.data?.job.state==='succeeded'?'Analisi completata':job.data?.job.state==='unavailable'?'La fonte non è più disponibile per questa analisi. Riapri il documento.':job.data?.job.state==='failed'?'Non è stato possibile leggere gli articoli. Puoi compilare manualmente.':job.data?.job.state==='uncertain'?'Esito dell’invio incerto: nessuna nuova analisi automatica verrà avviata. Puoi compilare manualmente.':'Analisi in corso…'}</p>{job.data?.job.errorCode&&<p className={styles.source}>Esito: {job.data.job.errorCode}</p>}{job.data?.job.billing?.actualUsd!==null&&job.data?.job.billing?.actualUsd!==undefined&&<p>Costo: {Number(job.data.job.billing.actualUsd).toFixed(6)} USD</p>}</div>}
   <p><button type="button" className={ui.btn} disabled={busy||uncertain||!caps.data?.manualAvailable} onClick={()=>void begin(false)}>Compila le proposte manualmente</button></p>
   {caps.data?.job&&['queued','running','uncertain'].includes(caps.data.job.state)&&<p><Link to={'?analisi='+caps.data.job.id}>Riprendi l’analisi già avviata</Link></p>}
   {!!caps.data?.drafts.length&&<><h3>Riprendi un percorso</h3><ul>{caps.data.drafts.map(d=><li key={d.id}><Link to={'?bozza='+d.id}>{d.state==='confirmed'?'Vedi l’esito confermato':'Riprendi le proposte'}</Link></li>)}</ul></>}
  </section>}
  {draft.data&&<DraftEditor key={draft.data.draft.id} draft={draft.data.draft} busy={busy} locked={uncertain} clearPending={()=>{pending.current=null;setUncertain(false);setPendingView(null);setError('');}} write={write} refresh={async()=>{await draft.refetch();await invalidate();}} base={base} root={root} onFailure={fail} api={api} accountId={account.id}/>}
  <details className={ui.card}><summary>Vedi il documento originale</summary><Original doc={source} homeId={home.id}/></details>
 </div>;
}
type EditorProps={draft:Draft;busy:boolean;locked:boolean;clearPending:()=>void;write:<T>(path:string,body:unknown,key?:string)=>Promise<T>;refresh:()=>Promise<void>;base:string;root:string;onFailure:(e:unknown)=>Promise<void>;api:ReturnType<typeof useApi>;accountId:string};
function DraftEditor({draft,busy,locked,clearPending,write,refresh,base,root,onFailure,api,accountId}:EditorProps){
 const [forms,setForms]=useState<Record<string,Form>>(()=>draft.review?.forms??{}),[selected,setSelected]=useState<string[]>([]),[message,setMessage]=useState('');
 const [recoveryOverride,setRecoveryOverride]=useState<{version:number;value:Pending|null}|null>(null);
 const recovery=recoveryOverride?.version===draft.version?recoveryOverride.value:draft.review?.pending??null;
 const setRecovery=(value:Pending|null)=>setRecoveryOverride({version:draft.version,value});
 const form=(item:Draft['items'][number]):Form=>{const initial=initialForm(item,draft),saved=forms[item.id];return {...initial,...saved,fields:{...initial.fields,...saved?.fields}};};
 const path='/drafts/'+encodeURIComponent(draft.id);
 const disabled=busy||locked||!!recovery||!draft.permissions.includes('edit');
 async function confirm(ids:string[],action?:'skip'|'defer'){
  setMessage('');let reviewSaved=false;try{
   const choices=ids.map(id=>{const item=draft.items.find(x=>x.id===id)!;return action?{itemId:id,action}:choice(item,form(item));});
   const attempt={path:path+'/confirmations',key:newIdempotencyKey(),body:{expectedVersion:draft.version+1,source:draft.snapshot,choices}};
   await write<Reply>(path+'/review',{expectedVersion:draft.version,review:{forms,pending:attempt}});reviewSaved=true;
   setRecovery(attempt);
   const result=await write<Reply>(attempt.path,attempt.body,attempt.key);setRecovery(null);setSelected([]);setMessage(action==='defer'?'Articolo lasciato da riprendere.':action==='skip'?'Articolo non censito come oggetto.':`Confermato: ${result.result?.newObjects??0} nuovi oggetti e ${result.result?.newExpenses??0} nuove spese.`);await refresh();
  }catch(e){if(isApiError(e)&&e.kind==='http'&&e.status<500){setRecovery(null);if(reviewSaved){try{await write<Reply>(path+'/review',{expectedVersion:draft.version+1,review:{forms}});}catch{/* refresh below */}}await refresh();await onFailure(e);}}}
 async function recover(replay:boolean){if(!recovery)return;try{if(replay){await write<Reply>(recovery.path,recovery.body,recovery.key);setRecovery(null);await refresh();}else{const result=await api.callJson<{status:string}>(base+path+'/confirmations/'+encodeURIComponent(recovery.key),{accountId});if(result.status==='confirmed'){clearPending();setRecovery(null);setMessage('Conferma recuperata: nessun doppione.');await refresh();}else setMessage('La conferma non risulta registrata. Puoi inviare la stessa scelta con il pulsante qui sotto.');}}catch(e){await onFailure(e);}}
 async function enrich(id:string,body:{brand:string;reference:string;productUrl?:string}){try{await write<Reply>(path+'/review',{expectedVersion:draft.version,review:{forms}});await refresh();const latest=await api.callJson<Reply>(base+path,{accountId});await write<Reply>(path+'/items/'+encodeURIComponent(id)+'/enrichment',body);const updated=await api.callJson<Reply>(base+path,{accountId});const item=updated.draft.items.find(i=>i.id===id);if(item)setForms(old=>{const f=old[id]??initialForm(item,latest.draft);return {...old,[id]:{...f,fields:{...Object.fromEntries(Object.keys(item.profile).map(k=>[k,{action:'accept'}])),...f.fields}}};});await refresh();setMessage('Ricerca ufficiale completata. Controlla le nuove proposte.');}catch(e){await onFailure(e);}}
 if(!draft.snapshot)return <Banner tone="warning"><p>La fonte non è più disponibile. Nessun dato della proposta viene mostrato.</p></Banner>;
 const open=draft.items.filter(i=>!i.decision||i.decision.state==='deferred');
 return <section className={styles.stack}>
  <h2>{draft.state==='confirmed'?'Esito dell’organizzazione':'Rivedi gli articoli'}</h2>
  {draft.mode==='manual'&&<p>Compilazione manuale: i dati inseriti da te saranno distinti dai valori letti automaticamente.</p>}
  {draft.needsReview&&<Banner tone="warning"><p>La fonte richiede un controllo: verifica le descrizioni, le quantità e le parti non leggibili nell’originale. Puoi aggiungere un articolo mancante.</p></Banner>}
  {message&&<Banner tone="info"><p>{message}</p></Banner>}
  {recovery&&<Banner tone="warning"><p>Una conferma è da verificare. Manteniamo la stessa scelta e la stessa chiave anche dopo aver ricaricato la pagina.</p><div className={styles.row}><button type="button" className={ui.btn} disabled={busy} onClick={()=>void recover(false)}>Controlla l’esito</button><button type="button" className={ui.btn} disabled={busy} onClick={()=>void recover(true)}>Invia la stessa conferma</button></div></Banner>}
  {draft.items.map(item=>item.decision&&['confirmed','skipped'].includes(item.decision.state)?<article className={ui.card} key={item.id}><h3>{item.fields.name?.value??forms[item.id]?.name??'Articolo'}</h3><p>{item.decision.state==='skipped'?'Non censito come oggetto':'Organizzato: originale collegato, senza duplicarlo.'}</p>{item.decision.objects.map((target,i)=>target.id?<p key={target.id}><Link className={ui.btn} to={root+'/oggetti/object/'+target.id}>Apri {target.name}</Link></p>:<p key={i}>Scheda non più disponibile.</p>)}</article>:<article className={ui.card} key={item.id}>
   <div className={styles.row}>{draft.items.length>1&&<label className={styles.check}><input type="checkbox" checked={selected.includes(item.id)} disabled={disabled} onChange={e=>setSelected(old=>e.target.checked?[...old,item.id]:old.filter(id=>id!==item.id))}/>Includi nella conferma multipla</label>}</div>
   <h3>{item.fields.name?.value||form(item).name||'Articolo da identificare'}</h3>{item.decision?.state==='deferred'&&<p>Da riprendere</p>}
   <ItemEditor api={api} accountId={accountId} base={base} draft={draft} item={item} form={form(item)} disabled={disabled} change={value=>setForms(old=>({...old,[item.id]:value}))} enrich={body=>enrich(item.id,body)}/>
   <div className={styles.row}><button type="button" className={ui.btnPrimary} disabled={disabled} onClick={()=>void confirm([item.id])}>Conferma questo articolo</button><button type="button" className={ui.btn} disabled={disabled} onClick={()=>void confirm([item.id],'defer')}>Decidi più avanti</button><button type="button" className={ui.btn} disabled={disabled} onClick={()=>void confirm([item.id],'skip')}>Non creare un oggetto</button></div>
  </article>)}
  {draft.state==='open'&&<div className={styles.row}>
   {draft.items.length>1&&<button type="button" className={ui.btnPrimary} disabled={disabled||!selected.length} onClick={()=>void confirm(selected)}>Conferma {selected.length} articoli selezionati</button>}
   <button type="button" className={ui.btn} disabled={disabled} onClick={()=>void write<Reply>(path+'/review',{expectedVersion:draft.version,review:{forms}}).then(async()=>{setMessage('Scelte salvate. Puoi riprendere dal documento.');await refresh();}).catch(()=>{})}>Salva e riprendi più tardi</button>
   <button type="button" className={ui.btn} disabled={disabled||draft.items.length>=20} onClick={()=>void write<Reply>(path+'/items',{expectedVersion:draft.version}).then(refresh).catch(()=>{})}>Aggiungi un altro articolo</button>
  </div>}
  {!open.length&&<p>Non ci sono altri articoli da rivedere.</p>}
 </section>;
}
function Original({doc,homeId}:{doc:DocumentDetail;homeId:string}){const file=useDocumentFile(homeId,doc.id,true),url=useObjectUrl(file.isError?undefined:file.data?.blob);if(file.isPending)return <Loading label="Caricamento originale…"/>;if(file.isError)return <ErrorState error={file.error} onRetry={()=>void file.refetch()}/>;if(!url)return null;return <div className={styles.stack}>{doc.mimeType==='application/pdf'?<object className={styles.preview} data={url} type="application/pdf" aria-label={'Originale '+doc.name}><p>Scarica l’originale per leggerlo sul dispositivo.</p></object>:<img className={styles.preview} src={url} alt={'Originale '+doc.name}/>}<button type="button" className={ui.btn} onClick={()=>file.data&&saveBlob(file.data.blob,file.data.filename??doc.originalFilename)}>Scarica originale</button></div>;}
