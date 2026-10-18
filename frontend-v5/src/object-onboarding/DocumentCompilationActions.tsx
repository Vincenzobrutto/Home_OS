import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useAccount, useApi } from '../session/session';
import { newIdempotencyKey, queryKeys } from '../api/queryKeys';
import { isUnauthorized, userMessage } from '../api/errors';
import { IntakeClient } from '../intake-integration/client';
import { ui } from '../components/ui';
import { handleUnauthorized } from '../session/queryClient';
import styles from './onboarding.module.css';
import type { Capabilities, Draft } from './model';

export type CompilationMode = 'manuale' | 'ai';
export function DocumentCompilationActions({homeId,documentId,onOpen,documentKind,houseDocument=false}:{houseDocument?:boolean;documentKind?:'purchase_document'|'utility_bill';homeId:string;documentId:string;onOpen?:(mode:CompilationMode,draftId?:string)=>void}) {
 const account=useAccount(),api=useApi(),navigate=useNavigate(),cache=useQueryClient();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const live=useRef(true);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const attempt=useRef<string|null>(null),sending=useRef(false),organizationKey=useRef(newIdempotencyKey());
 const key=['account',account.id,'home',homeId,'onboarding','capabilities',documentId];
 const caps=useQuery({queryKey:key,queryFn:({signal})=>api.callJson<Capabilities>(`/homes/${encodeURIComponent(homeId)}/object-onboarding/capabilities?documentId=${encodeURIComponent(documentId)}`,{accountId:account.id,signal}),retry:false,gcTime:0});
 const open=async(mode:CompilationMode,draftId?:string)=>{
  const current=()=>live.current&&cache.getQueryData<{account:{id:string}|null}>(queryKeys.session)?.account?.id===account.id;if(!current())return;
  if(onOpen){onOpen(mode,draftId);return;}
  if(draftId&&caps.data?.drafts.some(d=>d.id===draftId&&d.state==='confirmed')){navigate(`/home/${encodeURIComponent(homeId)}/documenti/${encodeURIComponent(documentId)}/oggetti?compila=${mode}&bozza=${encodeURIComponent(draftId)}`);return;}
  sending.current=true;setBusy(true);setError('');try{
   const batch=await new IntakeClient(api,account.id,homeId).prepareExisting([documentId],organizationKey.current);if(!current())return;
   navigate(`/home/${encodeURIComponent(homeId)}/documenti/organizza?lotto=${encodeURIComponent(batch.id)}&oggetti-documento=${encodeURIComponent(documentId)}&compila=${mode}${draftId?'&oggetti-bozza='+encodeURIComponent(draftId):''}`);
  }catch(e){if(isUnauthorized(e))await handleUnauthorized(cache);if(current())setError(userMessage(e));}finally{sending.current=false;if(live.current)setBusy(false);}
 };
 async function manual(){
  if(sending.current)return;
  if(houseDocument){await open('manuale');return;}
  const existing=caps.data?.drafts.find(d=>d.state==='open');
  if(existing){await open('manuale',existing.id);return;}
  sending.current=true;setBusy(true);setError('');attempt.current??=newIdempotencyKey();
  try {const result=await api.callJson<{draft:Draft}>(`/homes/${encodeURIComponent(homeId)}/object-onboarding/manual-drafts`,{method:'POST',body:{documentId,...(documentKind?{documentKind}:{})},idempotencyKey:attempt.current,accountId:account.id});
   if(result.draft.snapshot?.documentId!==documentId)throw Error('La scheda non appartiene a questo documento.');
   await cache.invalidateQueries({queryKey:key});await open('manuale',result.draft.id);
  }catch(e){if(isUnauthorized(e))await handleUnauthorized(cache);if(live.current)setError(userMessage(e));}finally{sending.current=false;if(live.current)setBusy(false);}
 }
 async function ai(){
  if(sending.current)return;
  const existing=caps.data?.drafts.find(d=>d.state==='open');
  if(!existing){await open('ai');return;}
  sending.current=true;setBusy(true);setError('');
  try{const reply=await api.callJson<{draft:Draft}>(`/homes/${encodeURIComponent(homeId)}/object-onboarding/drafts/${encodeURIComponent(existing.id)}`,{accountId:account.id});if(reply.draft.snapshot?.documentId!==documentId)throw Error('La scheda non appartiene a questo documento.');await open('ai',reply.draft.mode==='manual'&&!reply.draft.review?.pending?undefined:existing.id);}catch(e){if(isUnauthorized(e))await handleUnauthorized(cache);if(live.current)setError(userMessage(e));}finally{sending.current=false;if(live.current)setBusy(false);}
 }
 const ready=caps.data?.drafts.find(d=>d.state==='open'&&(d.mode==='extraction'||caps.data?.job?.state==='succeeded'&&caps.data.job.draftId===d.id));
 const accepted=!caps.data?.drafts.some(d=>d.state==='open')&&caps.data?.drafts.find(d=>d.state==='confirmed');
 if(accepted)return <button type="button" className={ui.btn} onClick={()=>open('manuale',accepted.id)}>Proposta accettata · Vedi dettaglio</button>;
 return <div><div className={styles.row}>
  <button type="button" className={ui.btn} disabled={busy||!caps.isSuccess||!caps.data.manualAvailable} onClick={()=>void manual()}>{busy?'Apertura scheda…':'Compila manualmente'}</button>
  <button type="button" className={`${ui.btn} ${ui.primary}`} disabled={busy||!caps.isSuccess} onClick={()=>ready?void open('ai',ready.id):void ai()}>{ready?'Rivedi proposta':'Compila tramite AI'}</button>
 </div>{(error||caps.isError)&&<p role="alert">{error||'Impossibile verificare le opzioni.'} <button type="button" className={ui.btn} aria-label="Riprova le opzioni di compilazione" onClick={()=>void caps.refetch()}>Riprova</button></p>}</div>;
}
