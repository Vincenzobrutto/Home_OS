import {useEffect,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router';
import {useAccount,useApi} from '../session/session';
import {newIdempotencyKey,queryKeys} from '../api/queryKeys';
import type {SessionResponse} from '../api/types';
import {userMessage,isApiError} from '../api/errors';
import {Modal} from '../document-intake/ReviewDialog';
import {ui} from '../components/ui';
import styles from '../routes/documents.module.css';

export type HouseDocumentsPlan={token:string;objectName:string;unavailable:boolean;archiveBlocked:boolean;documents:Array<{id:string;title:string;originalFilename:string;reason:string|null;willOrganize:boolean;relatedObjects:Array<{id:string;name:string}>;expenses:Array<{id:string;title:string;amountCents:number}>}>};
export function KeepHouseDocuments({homeId,objectId,onClose}:{homeId:string;objectId:string;onClose:()=>void}){
 const api=useApi(),account=useAccount(),cache=useQueryClient(),navigate=useNavigate();
 const path=`/homes/${encodeURIComponent(homeId)}/objects/object/${encodeURIComponent(objectId)}/house-documents`;
 const plan=useQuery({queryKey:['account',account.id,'home',homeId,'house-documents',objectId],queryFn:({signal})=>api.callJson<HouseDocumentsPlan>(path,{accountId:account.id,signal}),retry:false,refetchOnWindowFocus:false,refetchOnReconnect:false,gcTime:0});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[retryLocked,setRetryLocked]=useState(false);
 const attempt=useRef<{key:string;body:{expectedToken:string;documentIds:string[];archiveObject:boolean;detachRelatedObjects:boolean}}|null>(null),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const documents=plan.data?.documents??[];
 const canMove=!!plan.data&&!plan.data.unavailable&&!plan.data.archiveBlocked&&documents.length>0&&documents.every(d=>!d.reason);
 const costs=[...new Map(documents.flatMap(d=>d.expenses).map(e=>[e.id,e])).values()];
 const related=[...new Map(documents.flatMap(d=>d.relatedObjects??[]).map(o=>[o.id,o])).values()];
 async function confirm(){
  if(busy||!plan.data||!canMove&&!retryLocked)return;
  attempt.current??={key:newIdempotencyKey(),body:{expectedToken:plan.data.token,documentIds:documents.map(d=>d.id).sort(),archiveObject:true,detachRelatedObjects:related.length>0}};
  setBusy(true);setError('');setRetryLocked(true);
  try{const reply=await api.callJson<{documentIds:string[];archivedObject:boolean}>(path,{method:'POST',accountId:account.id,idempotencyKey:attempt.current.key,body:attempt.current.body});
   if(!live.current||cache.getQueryData<SessionResponse>(queryKeys.session)?.account?.id!==account.id)return;
   // Navigate before refetch: archiving can remount the object detail and close this dialog.
   navigate(`/home/${encodeURIComponent(homeId)}/documenti?workflow=all&view=house`,{state:{houseDocumentResult:{accountId:account.id,homeId,count:reply.documentIds.length,archived:reply.archivedObject}}});
   await cache.invalidateQueries({queryKey:['account',account.id,'home',homeId]});
  }catch(e){if(live.current){setError(userMessage(e));if(isApiError(e)&&e.kind==='http'&&e.status>=400&&e.status<500){attempt.current=null;setRetryLocked(false);}}}
  finally{if(live.current)setBusy(false);}
 }
 return <Modal labelledBy="keep-house-title" onClose={()=>{if(!busy)onClose();}}><div className={styles.conversionDialog}>
  <h2 id="keep-house-title">Sposta in Documenti della casa</h2>
  {plan.isPending?<p role="status">Controllo dei documenti e dei collegamenti…</p>:plan.isError?<p role="alert">{userMessage(plan.error)} <button className={ui.btn} onClick={()=>void plan.refetch()}>Riprova</button></p>:plan.data&&<>
   <p>Tutti i documenti di <strong>{plan.data.objectName}</strong>, comprese le fatture, verranno conservati nella casa. I file non vengono copiati o eliminati.</p>
   <p><strong>La scheda oggetto verrà archiviata e rimossa dagli oggetti attivi e dalle stanze.</strong> Potrai ritrovarla tra gli archiviati.</p>
   {!plan.data.documents.length&&<p>Nessun documento disponibile per questa operazione.</p>}
   {plan.data.unavailable&&<p>Alcuni collegamenti non sono consultabili. La scheda oggetto non può essere archiviata da qui.</p>}
   <ul className={styles.houseConversionList}>{plan.data.documents.map(doc=><li key={doc.id}>
    <strong>{doc.title}</strong>
    {doc.originalFilename!==doc.title&&<p>File: {doc.originalFilename}</p>}
    {doc.reason?<p>{doc.reason}</p>:<><p>Il collegamento all’oggetto verrà rimosso.</p>{doc.willOrganize&&<p>Sarà inserito in “Altri documenti della casa”. Potrai scegliere una tipologia più precisa in seguito.</p>}
     {!!doc.expenses.length&&<><p>Spese conservate nella casa, senza il riferimento a questo oggetto:</p><ul>{doc.expenses.map(e=><li key={e.id}>{e.title} · {new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(e.amountCents/100)}</li>)}</ul></>}
    </>}
   </li>)}</ul>
   {!!related.length&&<div className={styles.destination}><p><strong>Altri collegamenti da rimuovere</strong></p><p>Questi documenti o le loro spese sono collegati anche a:</p><ul>{related.map(o=><li key={o.id}>{o.name}</li>)}</ul><p>Confermando, rimuovi anche questi collegamenti. Le altre schede oggetto mantengono il loro stato; le spese restano registrate nella casa con gli stessi importi e documenti.</p></div>}
   {!canMove&&!!documents.length&&<p role="status">Per completare lo spostamento, risolvi prima i collegamenti non disponibili o le altre attività e spese ancora associate alla scheda.</p>}
   <p role="status"><strong>{documents.length} document{documents.length===1?'o':'i'} · {costs.length} spes{costs.length===1?'a':'e'} conservat{costs.length===1?'a':'e'}</strong></p>
  </>}
  {error&&<p role="alert">{error} {retryLocked?'L’esito potrebbe non essere arrivato: riprova con le stesse scelte.':'Aggiorna il riepilogo se i dati sono cambiati.'} {!retryLocked&&<button className={ui.btn} onClick={()=>{setError('');void plan.refetch();}}>Aggiorna riepilogo</button>}</p>}
  <div className={styles.toolbarActions}><button className={ui.btn} data-autofocus disabled={busy} onClick={onClose}>Annulla</button><button className={`${ui.btn} ${ui.primary}`} disabled={busy||!retryLocked&&(!plan.isSuccess||!canMove)} onClick={()=>void confirm()}>{busy?'Spostamento…':retryLocked?'Riprova conferma':'Sposta e archivia scheda'}</button></div>
 </div></Modal>;
}
