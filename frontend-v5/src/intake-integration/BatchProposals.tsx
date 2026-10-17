import {Link} from 'react-router';
import {proposalStatus,proposalIdentity} from '../object-onboarding/proposalStatus';
import {useEffect,useRef,useState} from 'react';
import {useQueries,useQueryClient} from '@tanstack/react-query';
import {useApi,useAccount} from '../session/session';
import {useCurrentHome} from '../routes/HomePages';
import {newIdempotencyKey} from '../api/queryKeys';
import {userMessage} from '../api/errors';
import {ui} from '../components/ui';
import type {Capabilities,Job,Draft} from '../object-onboarding/model';
import type {IntakeItem} from '../document-intake/model';
/** One existing campaign, one request key per original; never retry a provider call. */
export function BatchProposals({batchId,items}:{batchId:string;items:IntakeItem[]}){
 const api=useApi(),account=useAccount(),home=useCurrentHome(),cache=useQueryClient();
 const [picked,setPicked]=useState<string[]>([]),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const live=useRef(true);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const lock=useRef(false),base='/homes/'+encodeURIComponent(home.id)+'/object-onboarding';
 const documents=items.flatMap(i=>i.documentLink.document?[i.documentLink.document]:[]);
 const queries=useQueries({queries:documents.map(d=>({queryKey:['account',account.id,'home',home.id,'onboarding','capabilities',d.id],queryFn:({signal}:{signal:AbortSignal})=>api.callJson<Capabilities>(base+'/capabilities?documentId='+encodeURIComponent(d.id),{accountId:account.id,signal}),retry:false,refetchInterval:(q:{state:{data:Capabilities|undefined}})=>['queued','running'].includes(q.state.data?.job?.state??'')?2000:false}))});
 const outcomes=useQueries({queries:documents.map((d,i)=>{const status=proposalStatus(queries[i]?.data);return {queryKey:['account',account.id,'home',home.id,'onboarding','draft',status.draftId??d.id],queryFn:async({signal}:{signal:AbortSignal})=>{const reply=await api.callJson<{draft:Draft}>(base+'/drafts/'+encodeURIComponent(status.draftId!),{accountId:account.id,signal});if(reply.draft?.snapshot&&reply.draft.snapshot.documentId!==d.id)throw new Error('Fonte della proposta non corrispondente.');return reply;},enabled:status.state==='confirmed'&&!queries[i]?.isError,retry:false,gcTime:0};})});
 const ready=(c:Capabilities|undefined)=>!!c?.aiAvailable&&!c.drafts.length&&(c.canStartWithUncertainAcknowledgement===true||c.canStartAnalysis!==false&&!c.job);
 const selected=documents.filter((d,i)=>picked.includes(d.id)&&ready(queries[i]?.data));
 const repeated=selected.some(d=>queries[documents.findIndex(x=>x.id===d.id)]?.data?.canStartWithUncertainAcknowledgement);
 const signature=documents.map(d=>d.id).join(':');
 const [approvedSignature,setApprovedSignature]=useState('');
 const allowed=consent&&approvedSignature===signature;
 const budget=queries.find(q=>q.data?.budget)?.data?.budget;
 async function start(){if(lock.current||!allowed||!selected.length)return;lock.current=true;setBusy(true);setError('');try{
   for(const d of selected){if(!live.current)break;
    // Save before sending. A lost HTTP response is recovered with the same server request key.
    const retry=queries[documents.findIndex(x=>x.id===d.id)]?.data;
    const slot=['dimora-proposal',account.id,home.id,batchId,d.id,...(retry?.canStartWithUncertainAcknowledgement?[retry.job?.id??'retry']:[])].join(':');
    let key=sessionStorage.getItem(slot);if(!key){key=newIdempotencyKey();sessionStorage.setItem(slot,key);}
    await api.callJson<{job:Job}>(base+'/jobs',{method:'POST',accountId:account.id,idempotencyKey:key,body:{documentId:d.id,provider:'anthropic',consentToProviderTransfer:true,...(retry?.canStartWithUncertainAcknowledgement?{acknowledgePreviousUncertainAnalysis:true}:{})}});
    await cache.invalidateQueries({queryKey:['account',account.id,'home',home.id,'onboarding','capabilities',d.id]});
   }
   setPicked([]);setConsent(false);
  }catch(e){setError(userMessage(e)+' I documenti già avviati restano disponibili. Un nuovo clic recupera la stessa richiesta, senza duplicare l’invio.');await cache.invalidateQueries({queryKey:['account',account.id,'home',home.id,'onboarding','capabilities']});}finally{lock.current=false;setBusy(false);}}
 if(!documents.length)return null;
 const allConfirmed=queries.every(q=>q.isSuccess&&proposalStatus(q.data).state==='confirmed');
 const eligible=documents.filter((_,i)=>ready(queries[i]?.data));
 return <section className={ui.card} aria-label="Proposte da questo caricamento"><h2>{allConfirmed?'Proposte accettate':eligible.length?'Oggetti e spese dai documenti':'Stato delle proposte'}</h2>
 {allConfirmed?<p>Le scelte per questi documenti sono già registrate. Apri un dettaglio per consultarle.</p>:!!eligible.length&&<p>Scegli i documenti da leggere. Gli esiti già disponibili restano consultabili.</p>}
 <ul>{documents.map((d,i)=>{const c=queries[i]?.data,status=proposalStatus(c),selectable=ready(c),root='/home/'+encodeURIComponent(home.id)+'/documenti/'+encodeURIComponent(d.id)+'/oggetti';return <li key={d.id}>
 {selectable?<label><input type="checkbox" disabled={busy} checked={picked.includes(d.id)} onChange={e=>{setPicked(old=>e.target.checked?[...old,d.id]:old.filter(id=>id!==d.id));setConsent(false);}}/> {d.name}</label>:<span>{!queries[i]?.isError&&!outcomes[i]?.isError&&proposalIdentity(outcomes[i]?.data?.draft)||d.name}</span>}
 {' · '}{queries[i]?.isPending?'Controllo stato…':queries[i]?.isError?'Stato non disponibile':status.label}
 {!selectable&&!queries[i]?.isPending&&<>{' · '}<Link to={status.draftId?root+'?bozza='+encodeURIComponent(status.draftId):root}>{status.state==='confirmed'?'Vedi dettaglio':status.state==='review'?'Rivedi proposta':'Controlla esito'}</Link></>}
 </li>;})}</ul>
 {!!eligible.length&&<fieldset disabled={busy} style={{border:0,padding:0,margin:0}}><legend className="visually-hidden">Autorizzazione all’analisi</legend>
 {!!selected.length&&<label><input type="checkbox" checked={allowed} onChange={e=>{setConsent(e.target.checked);setApprovedSignature(signature);}}/> Autorizzo l’invio dei {selected.length} documenti selezionati ad Anthropic, inclusi eventuali dati personali, per preparare oggetti e spese.{repeated&&' Autorizzo un nuovo tentativo per gli esiti da verificare: ogni tentativo usa un’ulteriore riserva massima di 0,25 USD nello stesso budget; le precedenti riserve restano impegnate.'}</label>}
 <p><button className={`${ui.btn} ${ui.primary}`} disabled={!allowed||!selected.length||busy} onClick={()=>void start()}>Prepara {selected.length||''} proposte</button></p></fieldset>}

 {budget&&!allConfirmed&&<p>Budget residuo: {Number(budget.remainingUsd).toFixed(2)} USD · {budget.callsUsed}/{budget.maxCalls} analisi. Riserva massima 0,25 USD per documento.</p>}
 {queries.some(q=>!q.data?.drafts.length&&['uncertain','failed'].includes(q.data?.job?.state??''))&&<p role="alert">Non sono state prodotte proposte per alcuni file. Le analisi con esito incerto non vengono ripetute automaticamente e la loro riserva resta impegnata. Seleziona il documento per autorizzare consapevolmente un nuovo tentativo, entro il budget residuo.</p>}
 {error&&<p role="alert">{error}</p>}</section>;
}
