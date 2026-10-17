import {useEffect,useRef,useState} from 'react';
import {useQueries,useQueryClient} from '@tanstack/react-query';
import {useApi,useAccount} from '../session/session';
import {useCurrentHome} from '../routes/HomePages';
import {newIdempotencyKey} from '../api/queryKeys';
import {userMessage} from '../api/errors';
import {ui} from '../components/ui';
import type {Capabilities,Job} from '../object-onboarding/model';
import type {IntakeItem} from '../document-intake/model';
/** One existing campaign, one request key per original; never retry a provider call. */
export function BatchProposals({batchId,items}:{batchId:string;items:IntakeItem[]}){
 const api=useApi(),account=useAccount(),home=useCurrentHome(),cache=useQueryClient();
 const [picked,setPicked]=useState<string[]>([]),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const live=useRef(true);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const lock=useRef(false),base='/homes/'+encodeURIComponent(home.id)+'/object-onboarding';
 const documents=items.flatMap(i=>i.documentLink.document?[i.documentLink.document]:[]);
 const queries=useQueries({queries:documents.map(d=>({queryKey:['account',account.id,'home',home.id,'onboarding','capabilities',d.id],queryFn:({signal}:{signal:AbortSignal})=>api.callJson<Capabilities>(base+'/capabilities?documentId='+encodeURIComponent(d.id),{accountId:account.id,signal}),retry:false,refetchInterval:(q:{state:{data:Capabilities|undefined}})=>['queued','running'].includes(q.state.data?.job?.state??'')?2000:false}))});
 const ready=(c:Capabilities|undefined)=>!!c?.aiAvailable&&c.canStartAnalysis!==false&&!c.drafts.length&&!c.job;
 const selected=documents.filter((d,i)=>picked.includes(d.id)&&ready(queries[i]?.data));
 const signature=documents.map(d=>d.id).join(':');
 const [approvedSignature,setApprovedSignature]=useState('');
 const allowed=consent&&approvedSignature===signature;
 const budget=queries.find(q=>q.data?.budget)?.data?.budget;
 async function start(){if(lock.current||!allowed||!selected.length)return;lock.current=true;setBusy(true);setError('');try{
   for(const d of selected){if(!live.current)break;
    // Save before sending. A lost HTTP response is recovered with the same server request key.
    const slot=['dimora-proposal',account.id,home.id,batchId,d.id].join(':');
    let key=sessionStorage.getItem(slot);if(!key){key=newIdempotencyKey();sessionStorage.setItem(slot,key);}
    await api.callJson<{job:Job}>(base+'/jobs',{method:'POST',accountId:account.id,idempotencyKey:key,body:{documentId:d.id,provider:'anthropic',consentToProviderTransfer:true}});
    await cache.invalidateQueries({queryKey:['account',account.id,'home',home.id,'onboarding','capabilities',d.id]});
   }
   setPicked([]);setConsent(false);
  }catch(e){setError(userMessage(e)+' I documenti già avviati restano disponibili. Un nuovo clic recupera la stessa richiesta, senza duplicare l’invio.');await cache.invalidateQueries({queryKey:['account',account.id,'home',home.id,'onboarding','capabilities']});}finally{lock.current=false;setBusy(false);}}
 if(!documents.length)return null;
 return <section className={ui.card} aria-label="Proposte da questo caricamento"><h2>Oggetti e spese dai documenti</h2>
 <p>Seleziona i documenti da leggere. Fatture e ricevute possono proporre acquisti; le bollette propongono spese della casa senza oggetto.</p>
 <fieldset disabled={busy} style={{border:0,padding:0,margin:0}}><legend>Documenti da analizzare</legend>{documents.map((d,i)=>{const c=queries[i]?.data,status=c?.drafts.length?'Proposta pronta':({queued:'In coda',running:'Lettura in corso',succeeded:'Proposta pronta',failed:'Lettura non riuscita',uncertain:'Esito da verificare'} as Record<string,string>)[c?.job?.state??'']??(queries[i]?.isError?'Stato non disponibile':ready(c)?'Da preparare':'Analisi non disponibile');return <p key={d.id}><label><input type="checkbox" disabled={!ready(c)} checked={picked.includes(d.id)} onChange={e=>{setPicked(old=>e.target.checked?[...old,d.id]:old.filter(id=>id!==d.id));setConsent(false);}}/> {d.name}</label> · <span>{status}</span></p>;})}
 {!!selected.length&&<label><input type="checkbox" checked={allowed} onChange={e=>{setConsent(e.target.checked);setApprovedSignature(signature);}}/> Autorizzo l’invio dei {selected.length} documenti selezionati ad Anthropic, inclusi eventuali dati personali, per preparare oggetti e spese.</label>}
 <p><button className={`${ui.btn} ${ui.primary}`} disabled={!allowed||!selected.length||busy} onClick={()=>void start()}>Prepara {selected.length||''} proposte</button></p></fieldset>
 {budget&&<p>Budget residuo: {Number(budget.remainingUsd).toFixed(2)} USD · {budget.callsUsed}/{budget.maxCalls} analisi. Riserva massima 0,25 USD per documento.</p>}
 {error&&<p role="alert">{error}</p>}</section>;
}
