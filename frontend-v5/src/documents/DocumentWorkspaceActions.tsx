import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useCurrentHome } from '../routes/HomePages';
import { useAccount, useApi } from '../session/session';
import type { DocumentSummary } from '../api/types';
import { newIdempotencyKey } from '../api/queryKeys';
import { filtersFromParams, filtersToParams } from '../lib/documentSearch';
import { userMessage } from '../api/errors';
import { DocumentWorkflowStatus } from './DocumentWorkflowStatus';
import {documentDisplayTitle} from './presentation';
import { ui } from '../components/ui';
import { IntakeClient } from '../intake-integration/client';
import { IntakePage } from '../intake-integration/IntakePage';
import { DocumentCompilationActions, type CompilationMode } from '../object-onboarding/DocumentCompilationActions';
import { houseDocumentType } from '../document-intake/model';
import { Modal } from '../document-intake/ReviewDialog';
import { useDocumentFile, useObjectUrl } from './hooks';
import {PdfPreview} from './PdfPreview';
import styles from '../routes/documents.module.css';
import { impactLines, trashPaths, type TrashMove, type TrashPreview } from './trash';
import { useTrashNotice } from './TrashNotice';

export function DocumentWorkspaceActions({homeId,document:doc}:{homeId:string;document:DocumentSummary}) {
 const account=useAccount(),api=useApi(),cache=useQueryClient(),[params,setParams]=useSearchParams();
 const [opening,setOpening]=useState(false),[error,setError]=useState(''),[original,setOriginal]=useState(false),[removing,setRemoving]=useState(false),[busy,setBusy]=useState(false);
 const key=useRef(newIdempotencyKey()),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const client=useMemo(()=>new IntakeClient(api,account.id,homeId),[api,account.id,homeId]);
 const active=params.get('oggetti-documento')===doc.id;
 const editable=useCurrentHome().permissions.includes('edit');
 const notify=useTrashNotice();
 // The server remains authoritative; the trash preview is fetched only on explicit deletion.
 const removal=useQuery({queryKey:['account',account.id,'home',homeId,'document-trash-preview',doc.id],queryFn:({signal})=>api.callJson<TrashPreview>(trashPaths.preview(homeId,doc.id),{accountId:account.id,signal}),enabled:removing,retry:false,gcTime:0});
 const impact=removal.data?.allowed?impactLines(removal.data.impact):null;
 async function open(mode:CompilationMode,draftId?:string){
  if(opening)return;setOpening(true);setError('');
  try{const batch=await client.prepareExisting([doc.id],key.current);if(!live.current)return;
   setParams(previous=>{const next=new URLSearchParams(previous);next.set('lotto',batch.id);next.set('oggetti-documento',doc.id);next.set('compila',mode);next.delete('oggetti-bozza');next.delete('oggetti-analisi');if(draftId)next.set('oggetti-bozza',draftId);return next;});
  }catch(e){if(live.current)setError(userMessage(e));}finally{if(live.current)setOpening(false);}
 }
 function close(){setParams(previous=>{const next=new URLSearchParams(previous);for(const key of ['lotto','oggetti-documento','oggetti-bozza','oggetti-analisi','compila'])next.delete(key);return next;});}
 async function remove(){if(busy)return;setBusy(true);setError('');try{const moved=await api.callJson<TrashMove>(trashPaths.preview(homeId,doc.id),{method:'POST',body:{expectedVersion:doc.version},accountId:account.id,idempotencyKey:key.current});notify(moved.entry);if(live.current)setRemoving(false);await cache.invalidateQueries({queryKey:['account',account.id,'home',homeId]});}catch(e){if(live.current)setError(userMessage(e));}finally{if(live.current)setBusy(false);}}
 const menuRef=useRef<HTMLDetailsElement>(null);
 const closeMenu=()=>{if(menuRef.current){menuRef.current.open=false;menuRef.current.querySelector('summary')?.focus();}};
 const house=houseDocumentType(doc.originalFilename+' '+doc.name,doc.organization?.parts.map(p=>p.kind));
 return <div className={`${styles.workspace} ${styles.compactWorkspace}`}>
  <div className={styles.workspaceHeader}><DocumentWorkflowStatus compact state={doc.workflowState}/><div className={styles.toolbarActions}>
   {editable&&<DocumentCompilationActions compact backSearch={filtersToParams({...filtersFromParams(params),workflow:filtersFromParams(params).workflow??'all'}).toString()} workflowState={doc.workflowState} houseDocument={!!house} homeId={homeId} documentId={doc.id} documentKind={doc.organization?.parts.every(p=>p.kind==='utility_bill')?'utility_bill':undefined} onOpen={(mode,draft)=>void open(mode,draft)}/>}
   <button type="button" className={ui.btn} onClick={()=>{setOriginal(v=>!v);if(menuRef.current)menuRef.current.open=false;}} aria-expanded={original} aria-controls={'original-'+doc.id}>{original?'Chiudi originale':'Vedi originale'}</button>
   {editable&&<details ref={menuRef} className={styles.documentMenu} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();closeMenu();}}}><summary aria-label={'Altre azioni per '+documentDisplayTitle(doc,'Documento senza titolo')}>Altre azioni</summary><div className={styles.documentMenuItems}>
    {editable&&<button type="button" className={ui.btn} onClick={()=>{setError('');setRemoving(true);closeMenu();}}>Elimina</button>}
   </div></details>}
  </div></div>
  {opening&&<p role="status">Apertura della scheda…</p>}{error&&<p role="alert">{error}</p>}
  {original&&<div id={'original-'+doc.id} className={styles.inlineOriginal}><Original homeId={homeId} documentId={doc.id} filename={doc.originalFilename}/></div>}
  {active&&<section className={styles.reviewPanel} aria-label={'Revisione di '+doc.originalFilename}><IntakePage workspace/><button type="button" className={ui.btn} onClick={close}>Chiudi revisione</button></section>}
  {removing&&<Modal labelledBy={'remove-'+doc.id} onClose={()=>{if(!busy)setRemoving(false);}}><div className={styles.panel}><h2 id={'remove-'+doc.id}>Spostare nel cestino?</h2><p>{doc.originalFilename}</p>{removal.isPending?<p>Controllo dei collegamenti…</p>:removal.isError?<p role="alert">{userMessage(removal.error)}</p>:removal.data?.allowed?<><p>Resterà nel cestino per 30 giorni: potrai ripristinarlo, poi sarà eliminato definitivamente con l’originale.</p>{impact?.sources&&<p>{impact.sources}</p>}{impact?.shares&&<p>{impact.shares}</p>}{doc.aiAnalysisSucceeded&&<p>Se il documento è stato inviato ad Anthropic per l’analisi, quella copia segue la politica di conservazione di Anthropic: Dimora non può richiamarla.</p>}</>:<p>{removal.data?.reason}</p>}{error&&<p role="alert">{error}</p>}<div className={styles.toolbarActions}><button type="button" className={ui.btn} data-autofocus disabled={busy} onClick={()=>setRemoving(false)}>Annulla</button><button type="button" className={`${ui.btn} ${ui.primary}`} disabled={busy||!removal.data?.allowed} onClick={()=>void remove()}>{busy?'Spostamento…':'Sposta nel cestino'}</button>{removal.isError&&<button className={ui.btn} onClick={()=>void removal.refetch()}>Riprova</button>}</div></div></Modal>}
 </div>;
}
function Original({homeId,documentId,filename}:{homeId:string;documentId:string;filename:string}){const file=useDocumentFile(homeId,documentId,true),url=useObjectUrl(file.data?.blob);return <div role="region" aria-label="Documento originale">{file.isPending?<p>Apertura originale…</p>:file.isError?<p role="alert">{userMessage(file.error)}</p>:url?file.data.contentType.startsWith('image/')?<img src={url} alt="Immagine del documento originale" className={styles.original}/>:<PdfPreview blob={file.data.blob} url={url} filename={filename}/>:null}</div>;}
