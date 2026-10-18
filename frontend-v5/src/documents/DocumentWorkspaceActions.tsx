import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useCurrentHome } from '../routes/HomePages';
import { useAccount, useApi } from '../session/session';
import type { DocumentSummary } from '../api/types';
import { newIdempotencyKey } from '../api/queryKeys';
import { userMessage } from '../api/errors';
import { ui } from '../components/ui';
import { IntakeClient } from '../intake-integration/client';
import { IntakePage } from '../intake-integration/IntakePage';
import { DocumentCompilationActions, type CompilationMode } from '../object-onboarding/DocumentCompilationActions';
import { houseDocumentType } from '../document-intake/model';
import { Modal } from '../document-intake/ReviewDialog';
import { useDocumentFile, useObjectUrl } from './hooks';
import styles from '../routes/documents.module.css';

export function DocumentWorkspaceActions({homeId,document:doc}:{homeId:string;document:DocumentSummary}) {
 const account=useAccount(),api=useApi(),cache=useQueryClient(),[params,setParams]=useSearchParams();
 const [opening,setOpening]=useState(false),[error,setError]=useState(''),[original,setOriginal]=useState(false),[removing,setRemoving]=useState(false),[busy,setBusy]=useState(false);
 const key=useRef(newIdempotencyKey()),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const client=useMemo(()=>new IntakeClient(api,account.id,homeId),[api,account.id,homeId]);
 const active=params.get('oggetti-documento')===doc.id;
 const editable=useCurrentHome().permissions.includes('edit');
 // The server remains authoritative; capabilities are fetched only on explicit removal.
 const removal=useQuery({queryKey:['account',account.id,'home',homeId,'document-removal',doc.id],queryFn:({signal})=>api.callJson<{allowed:boolean;reason:string|null}>(`/homes/${homeId}/documents/${doc.id}/removal`,{accountId:account.id,signal}),enabled:removing,retry:false,gcTime:0});
 async function open(mode:CompilationMode,draftId?:string){
  if(opening)return;setOpening(true);setError('');
  try{const batch=await client.prepareExisting([doc.id],key.current);if(!live.current)return;
   setParams(previous=>{const next=new URLSearchParams(previous);next.set('lotto',batch.id);next.set('oggetti-documento',doc.id);next.set('compila',mode);next.delete('oggetti-bozza');next.delete('oggetti-analisi');if(draftId)next.set('oggetti-bozza',draftId);return next;});
  }catch(e){if(live.current)setError(userMessage(e));}finally{if(live.current)setOpening(false);}
 }
 function close(){setParams(previous=>{const next=new URLSearchParams(previous);for(const key of ['lotto','oggetti-documento','oggetti-bozza','oggetti-analisi','compila'])next.delete(key);return next;});}
 async function remove(){if(busy)return;setBusy(true);setError('');try{await api.callJson(`/homes/${homeId}/documents/${doc.id}/removal`,{method:'POST',body:{expectedVersion:doc.version},accountId:account.id,idempotencyKey:key.current});if(live.current){setRemoving(false);await cache.invalidateQueries({queryKey:['account',account.id,'home',homeId]});}}catch(e){if(live.current)setError(userMessage(e));}finally{if(live.current)setBusy(false);}}
 const house=houseDocumentType(doc.originalFilename+' '+doc.name,doc.organization?.parts.map(p=>p.kind));
 return <div className={styles.workspace}>
  <div className={styles.toolbarActions}>
   <button type="button" className={ui.btn} onClick={()=>setOriginal(v=>!v)} aria-expanded={original}>{original?'Chiudi originale':'Vedi originale'}</button>
   {editable&&(house?<><button type="button" className={ui.btn} disabled={opening} onClick={()=>void open('manuale')}>Compila manualmente</button><button type="button" className={`${ui.btn} ${ui.primary}`} disabled={opening} onClick={()=>void open('ai')}>Compila tramite AI</button></>:<DocumentCompilationActions homeId={homeId} documentId={doc.id} documentKind={doc.organization?.parts.every(p=>p.kind==='utility_bill')?'utility_bill':undefined} onOpen={(mode,draft)=>void open(mode,draft)}/>)}
   {editable&&<button type="button" className={ui.btn} onClick={()=>{setError('');setRemoving(true);}}>Elimina</button>}
  </div>
  {opening&&<p role="status">Apertura della scheda…</p>}{error&&<p role="alert">{error}</p>}
  {original&&<Original homeId={homeId} documentId={doc.id}/>}
  {active&&<section className={styles.reviewPanel} aria-label={'Revisione di '+doc.originalFilename}><IntakePage workspace/><button type="button" className={ui.btn} onClick={close}>Chiudi revisione</button></section>}
  {removing&&<Modal labelledBy={'remove-'+doc.id} onClose={()=>{if(!busy)setRemoving(false);}}><div className={styles.panel}><h2 id={'remove-'+doc.id}>Eliminare questo documento?</h2><p>{doc.originalFilename}</p>{removal.isPending?<p>Controllo dei collegamenti…</p>:removal.isError?<p role="alert">{userMessage(removal.error)}</p>:removal.data?.allowed?<p>Il documento e l’originale saranno eliminati definitivamente.</p>:<p>{removal.data?.reason}</p>}{error&&<p role="alert">{error}</p>}<div className={styles.toolbarActions}><button type="button" className={ui.btn} data-autofocus disabled={busy} onClick={()=>setRemoving(false)}>Annulla</button><button type="button" className={`${ui.btn} ${ui.primary}`} disabled={busy||!removal.data?.allowed} onClick={()=>void remove()}>{busy?'Eliminazione…':'Elimina documento'}</button>{removal.isError&&<button className={ui.btn} onClick={()=>void removal.refetch()}>Riprova</button>}</div></div></Modal>}
 </div>;
}
function Original({homeId,documentId}:{homeId:string;documentId:string}){const file=useDocumentFile(homeId,documentId,true),url=useObjectUrl(file.data?.blob);return <div>{file.isPending?<p>Apertura originale…</p>:file.isError?<p role="alert">{userMessage(file.error)}</p>:url?file.data.contentType.startsWith('image/')?<img src={url} alt="Documento originale" className={styles.original}/>:<object data={url} type="application/pdf" className={styles.original} aria-label="Documento originale"><a href={url} target="_blank" rel="noreferrer">Apri originale PDF</a></object>:null}</div>;}
