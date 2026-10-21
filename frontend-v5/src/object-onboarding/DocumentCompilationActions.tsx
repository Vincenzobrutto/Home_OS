import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useAccount, useApi } from '../session/session';
import { newIdempotencyKey, queryKeys } from '../api/queryKeys';
import { isUnauthorized, userMessage } from '../api/errors';
import { IntakeClient } from '../intake-integration/client';
import { ui } from '../components/ui';
import { handleUnauthorized } from '../session/queryClient';
import type { DocumentWorkflowState } from '../api/types';
import type { Capabilities, Draft } from './model';

export type CompilationMode = 'manuale' | 'ai';
export function DocumentCompilationActions({homeId,documentId,onOpen,documentKind,compact=false,workflowState,backSearch}:{backSearch?:string;compact?:boolean;workflowState?:DocumentWorkflowState;houseDocument?:boolean;documentKind?:'purchase_document'|'utility_bill';homeId:string;documentId:string;onOpen?:(mode:CompilationMode,draftId?:string)=>void}) {
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
  const existing=caps.data?.drafts.find(d=>d.state==='open');
  if(existing){await open('manuale',existing.id);return;}
  sending.current=true;setBusy(true);setError('');attempt.current??=newIdempotencyKey();
  try {const result=await api.callJson<{draft:Draft}>(`/homes/${encodeURIComponent(homeId)}/object-onboarding/manual-drafts`,{method:'POST',body:{documentId,...(documentKind?{documentKind}:{})},idempotencyKey:attempt.current,accountId:account.id});
   if(result.draft.snapshot?.documentId!==documentId)throw Error('La scheda non appartiene a questo documento.');
   await cache.invalidateQueries({queryKey:key});await open('manuale',result.draft.id);
  }catch(e){if(isUnauthorized(e))await handleUnauthorized(cache);if(live.current)setError(userMessage(e));}finally{sending.current=false;if(live.current)setBusy(false);}
 }
 const saved=caps.data?.drafts.find(d=>d.state==='open'&&d.hasSavedCompilation);
 const ready=caps.data?.drafts.find(d=>d.state==='open'&&(d.mode==='extraction'||caps.data?.job?.state==='succeeded'&&caps.data.job.draftId===d.id));
 const accepted=!caps.data?.drafts.some(d=>d.state==='open')&&caps.data?.drafts.find(d=>d.state==='confirmed');
 if(compact){
  if(workflowState==='completed')return <button type="button" className={`${ui.btn} ${ui.primary}`} onClick={()=>navigate(`/home/${encodeURIComponent(homeId)}/documenti/${encodeURIComponent(documentId)}`,{state:{documentsSearch:backSearch,documentsAccountId:account.id}})}>Vedi dettagli</button>;
  if(workflowState==='analyzing')return <button type="button" className={ui.btn} disabled>In analisi…</button>;
  if(workflowState==='attention')return <button type="button" className={ui.btn} onClick={()=>navigate(`/home/${encodeURIComponent(homeId)}/documenti/${encodeURIComponent(documentId)}`,{state:{documentsSearch:backSearch,documentsAccountId:account.id}})}>Apri documento</button>;
  if(saved)return <button type="button" className={`${ui.btn} ${ui.primary}`} disabled={busy} onClick={()=>void open('manuale',saved.id)}>Riprendi compilazione</button>;
  if(ready)return <button type="button" className={`${ui.btn} ${ui.primary}`} disabled={busy} onClick={()=>void open('ai',ready.id)}>Rivedi proposta</button>;
 }
 if(!compact&&accepted)return <button type="button" className={ui.btn} onClick={()=>open('manuale',accepted.id)}>Proposta accettata · Vedi dettaglio</button>;
 return <div><button type="button" className={`${ui.btn} ${ui.primary}`} disabled={busy||!caps.isSuccess||(!saved&&!ready&&!caps.data.manualAvailable)} onClick={()=>saved?void open('manuale',saved.id):ready?void open('ai',ready.id):void manual()}>{busy?'Apertura scheda…':saved?'Riprendi compilazione':ready?'Rivedi proposta':'Compila'}</button>{(error||caps.isError)&&<p role="alert">{error||'Impossibile verificare le opzioni.'} <button type="button" className={ui.btn} onClick={()=>void caps.refetch()}>Riprova le opzioni</button></p>}</div>;
}
