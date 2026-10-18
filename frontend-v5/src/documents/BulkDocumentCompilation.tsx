import {useEffect,useMemo,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useSearchParams} from 'react-router';
import type {DocumentSummary} from '../api/types';
import {newIdempotencyKey} from '../api/queryKeys';
import {isApiError,userMessage} from '../api/errors';
import {useAccount,useApi} from '../session/session';
import {IntakeClient} from '../intake-integration/client';
import type {AutomaticRun} from '../intake-integration/AutomaticIntake';
import type {Capabilities} from '../object-onboarding/model';
import {ui} from '../components/ui';
import styles from '../routes/documents.module.css';

export function BulkDocumentCompilation({homeId,selected,onClear,onLocked}:{homeId:string;selected:DocumentSummary[];onClear:()=>void;onLocked:(locked:boolean)=>void}){
 const api=useApi(),account=useAccount(),cache=useQueryClient(),[params,setParams]=useSearchParams();
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState('');
 const attempt=useRef<{ids:string[];batchKey:string;runKey:string;batchId?:string}|null>(null),sending=useRef(false),live=useRef(true);
 const client=useMemo(()=>new IntakeClient(api,account.id,homeId),[api,account.id,homeId]);
 const batchId=params.get('compilazione-ai'),first=selected[0]?.id;
 const caps=useQuery({queryKey:['account',account.id,'home',homeId,'onboarding','capabilities',first],queryFn:({signal})=>api.callJson<Capabilities>(`/homes/${homeId}/object-onboarding/capabilities?documentId=${first}`,{accountId:account.id,signal}),enabled:!!first,retry:false,gcTime:0});
 const result=useQuery({queryKey:['account',account.id,'home',homeId,'bulk-proposals',batchId],queryFn:({signal})=>api.callJson<{run:AutomaticRun|null}>(`/homes/${homeId}/object-onboarding/automatic-runs/batches/${batchId}`,{accountId:account.id,signal}),enabled:!!batchId,retry:false,refetchInterval:q=>q.state.data?.run?.state==='running'?1500:false});
 const run=result.data?.run;
 const readyDocuments=run?.entries.filter(e=>e.state==='completed'&&e.draftId&&e.documentId).map(e=>e.documentId!).sort().join(',')??'';
 useEffect(()=>{for(const id of readyDocuments.split(',').filter(Boolean))void cache.invalidateQueries({queryKey:['account',account.id,'home',homeId,'onboarding','capabilities',id]});},[readyDocuments,cache,account.id,homeId]);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{onLocked(busy||uncertain);return()=>onLocked(false);},[busy,uncertain,onLocked]);
 useEffect(()=>{if(run?.state==='finished')void cache.invalidateQueries({queryKey:['account',account.id,'home',homeId]});},[run?.id,run?.state,cache,account.id,homeId]);
 async function start(){
  if(sending.current)return;sending.current=true;setBusy(true);setError('');
  attempt.current??={ids:selected.map(d=>d.id),batchKey:newIdempotencyKey(),runKey:newIdempotencyKey()};const saved=attempt.current;
  try{if(!saved.batchId)saved.batchId=(await client.prepareExisting(saved.ids,saved.batchKey)).id;
   await api.callJson(`/homes/${homeId}/object-onboarding/automatic-runs`,{method:'POST',body:{batchId:saved.batchId,documentIds:saved.ids,consentToProviderTransfer:true,automaticProcessing:false,proposalOnly:true},idempotencyKey:saved.runKey,accountId:account.id});
   if(!live.current)return;setParams(previous=>{const next=new URLSearchParams(previous);next.set('compilazione-ai',saved.batchId!);return next;});attempt.current=null;setUncertain(false);setConsent(false);onClear();
  }catch(e){if(live.current){setError(userMessage(e));const ambiguous=!isApiError(e)||e.kind!=='http'||e.status>=500;setUncertain(ambiguous);if(!ambiguous){attempt.current=null;setConsent(false);}}}finally{sending.current=false;if(live.current)setBusy(false);}
 }
 function open(documentId:string,draftId:string){setParams(previous=>{const next=new URLSearchParams(previous);next.set('lotto',batchId!);next.set('oggetti-documento',documentId);next.set('oggetti-bozza',draftId);next.set('compila','ai');return next;});}
 return <>
  {!!selected.length&&<section className={ui.card} aria-label="Compilazione AI dei documenti selezionati">
   <h2>{selected.length} document{selected.length===1?'o selezionato':'i selezionati'}</h2>
   {selected.length>20&&<p role="alert">Seleziona al massimo 20 documenti alla volta.</p>}
   {caps.data?.budget&&<p>Budget AI residuo: {Number(caps.data.budget.remainingUsd).toFixed(2)} USD · {Math.max(0,caps.data.budget.maxCalls-caps.data.budget.callsUsed)} analisi disponibili.</p>}
   <label className={styles.bulkConsent}><input type="checkbox" checked={consent} disabled={busy||uncertain} onChange={e=>setConsent(e.target.checked)}/>Autorizzo l’invio dei documenti selezionati ad Anthropic, inclusi gli eventuali dati personali, per precompilare le schede. Massimo 0,25 USD per documento, entro il budget residuo. Oggetti e spese saranno salvati solo dopo la mia conferma.</label>
   <div className={styles.toolbarActions}><button type="button" className={`${ui.btn} ${ui.primary}`} disabled={busy||(!uncertain&&(!consent||selected.length>20||!caps.isSuccess||!!caps.data.budget?.disabledReason))} onClick={()=>void start()}>{busy?'Avvio…':uncertain?'Verifica l’avvio precedente':'Compila selezionati tramite AI'}</button><button type="button" className={ui.btn} disabled={busy||uncertain} onClick={onClear}>Annulla selezione AI</button></div>
   {caps.isError&&<p role="alert">Impossibile verificare il budget. <button className={ui.btn} onClick={()=>void caps.refetch()}>Riprova verifica budget</button></p>}
  </section>}
  {error&&<p role="alert">{error}{uncertain&&' L’esito è da verificare: il recupero riusa la stessa richiesta, senza un nuovo consenso o un secondo avvio.'}</p>}
  {batchId&&<section className={ui.card} aria-label="Stato compilazione AI selezionati"><h2>{run?.state==='finished'?(run.entries.some(e=>e.state==='completed')?'Proposte AI disponibili':'Compilazione terminata · da controllare'):'Compilazione AI dei selezionati'}</h2>{result.isError?<p role="alert">{userMessage(result.error)} <button className={ui.btn} onClick={()=>void result.refetch()}>Rileggi lo stato AI</button></p>:!run?<p role="status">Recupero della compilazione…</p>:<><p role="status">{run.entries.filter(e=>e.state==='completed').length} di {run.entries.length} proposte pronte. I dati si confermano nelle schede qui sotto.</p><ul>{run.entries.map((entry,i)=><li key={entry.documentId??i}><strong>{entry.name??'Documento non disponibile'}</strong> · {entry.state==='completed'?'Proposta pronta':entry.state==='attention'||entry.state==='unavailable'?entry.reason??'Da controllare':entry.state==='waiting'?'Analisi in corso':'In attesa'} {entry.documentId&&entry.draftId&&<button className={ui.btn} onClick={()=>open(entry.documentId!,entry.draftId!)}>Rivedi proposta</button>}</li>)}</ul></>}</section>}
 </>;
}
