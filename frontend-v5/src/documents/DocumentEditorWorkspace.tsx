import {PdfPreview} from './PdfPreview';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useBlocker,useNavigate,useSearchParams} from 'react-router';
import {useCurrentHome} from '../routes/HomePages';
import {useAccount,useApi} from '../session/session';
import {useDocument,useDocumentFile,useDocumentSearch,useObjectUrl} from './hooks';
import {filtersFromParams,filtersToParams} from '../lib/documentSearch';
import {newIdempotencyKey} from '../api/queryKeys';
import {userMessage} from '../api/errors';
import {IntakeClient} from '../intake-integration/client';
import {IntakePage} from '../intake-integration/IntakePage';
import {DocumentWorkflowStatus} from './DocumentWorkflowStatus';
import {DocumentEditorContext} from './DocumentEditorContext';
import {Icon} from '../components/Icon';
import {ErrorState,Loading,ui,useDocumentTitle} from '../components/ui';
import styles from './editor.module.css';

export function DocumentEditorWorkspace(){
 const home=useCurrentHome(),account=useAccount(),api=useApi(),navigate=useNavigate(),[params]=useSearchParams();
 const documentId=params.get('oggetti-documento')??'',root=`/home/${home.id}/documenti`;
 const filters=useMemo(()=>({...filtersFromParams(params),workflow:'pending' as const}),[params]);
 const queue=useDocumentSearch(home.id,filters,true),document=useDocument(home.id,documentId);
 const rows=queue.data?.pages.flatMap(page=>page.items)??[];
 const [preview,setPreview]=useState(true),[mobileOriginalId,setMobileOriginalId]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const mobileOriginal=mobileOriginalId===documentId;
 const setMobileOriginal=(value:boolean)=>setMobileOriginalId(value?documentId:null);
 const dirty=useRef(false),live=useRef(true),keys=useRef(new Map<string,string>());
 const client=useMemo(()=>new IntakeClient(api,account.id,home.id),[api,account.id,home.id]);
 useDocumentTitle('Completa i dati del documento · '+home.name);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{dirty.current=false;},[documentId]);
 useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(dirty.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
 const canLeave=useCallback(()=>!dirty.current||window.confirm('Le modifiche non salvate saranno scartate. Vuoi lasciare questa scheda?'),[]);
 // Covers links outside this workspace and browser history as well as its own back button.
 const blocker=useBlocker(({currentLocation,nextLocation})=>dirty.current&&(currentLocation.pathname!==nextLocation.pathname||new URLSearchParams(currentLocation.search).get('oggetti-documento')!==new URLSearchParams(nextLocation.search).get('oggetti-documento')));
 useEffect(()=>{
  if(blocker.state!=='blocked')return;
  if(canLeave()){dirty.current=false;blocker.proceed();}else blocker.reset();
 },[blocker,canLeave]);
 function leave(upload=false){const next=filtersToParams(filters);if(upload)next.set('aggiungi','1');navigate(root+'?'+next.toString());}
 async function select(id:string,confirmed=false,savedId?:string){
  if(busy||(!confirmed&&!canLeave()))return;setBusy(true);setError('');
  try{if(!keys.current.has(id))keys.current.set(id,newIdempotencyKey());const batch=await client.prepareExisting([id],keys.current.get(id)!);if(!live.current)return;
   const next=filtersToParams(filters);next.set('lotto',batch.id);next.set('oggetti-documento',id);next.set('compila','manuale');if(savedId)next.set('documento-salvato',savedId);dirty.current=false;navigate(root+'?'+next.toString());
  }catch(e){if(live.current)setError(userMessage(e));}finally{if(live.current)setBusy(false);}
 }
 async function complete(id:string){if(!live.current)return;dirty.current=false;const next=rows.find(row=>row.id!==id&&!['completed','analyzing','attention'].includes(row.workflowState??'to_compile'));if(next){await select(next.id,true,id);}else{const search=filtersToParams(filters);search.set('documento-salvato',id);navigate(root+'?'+search.toString());}}
 return <div className={styles.editor}>
  <button type="button" className={styles.back} onClick={()=>leave()}>Torna a Documenti</button>
  <header className={styles.heading}><h1 tabIndex={-1}>Completa i dati del documento</h1><p>Controlla i dati e salva, un documento alla volta.</p></header>
  {params.has("documento-salvato")&&<p role="status">Documento precedente salvato. Puoi continuare con la scheda successiva.</p>}
  {error&&<p role="alert">{error}</p>}
  <div className={styles.mobileViews} role="group" aria-label="Vista del documento"><button type="button" className={ui.btn} aria-pressed={!mobileOriginal} onClick={()=>setMobileOriginal(false)}>Compila</button><button type="button" className={ui.btn} aria-pressed={mobileOriginal} onClick={()=>{setPreview(true);setMobileOriginal(true);}}>Originale</button></div>
  <div className={`${mobileOriginal?styles.originalView:styles.formView} ${styles.layout} ${preview?styles.withPreview:''}`}>
   <aside className={styles.queue} aria-label="Documenti da completare">
    <button type="button" className={ui.btn} disabled={busy} onClick={()=>leave(true)}><Icon name="plus"/> Aggiungi file</button>
    <h2>Da fare</h2><label className={styles.mobileQueue}>Documento da completare<select className={ui.input} value={documentId} disabled={busy} onChange={e=>void select(e.target.value)}>{!rows.some(row=>row.id===documentId)&&<option value={documentId}>{document.data?.name??'Documento corrente'}</option>}{rows.map((row,index)=><option key={row.id} value={row.id}>{index+1}. {row.name}</option>)}</select></label>
    {queue.isPending?<Loading label="Caricamento documenti…"/>:queue.isError?<ErrorState error={queue.error} onRetry={()=>void queue.refetch()}/>:<nav aria-label="Coda dei documenti">{!rows.some(row=>row.id===documentId)&&document.data&&<button type="button" className={styles.selected} aria-current="true">{document.data.name}<span>Documento corrente</span></button>}{rows.map(row=><button key={row.id} type="button" className={row.id===documentId?styles.selected:''} aria-current={row.id===documentId?'true':undefined} disabled={busy} onClick={()=>{if(row.id!==documentId)void select(row.id);}}><strong>{row.name}</strong><DocumentWorkflowStatus state={row.workflowState}/></button>)}</nav>}
    {queue.hasNextPage&&<button type="button" className={ui.btn} disabled={queue.isFetchingNextPage} onClick={()=>void queue.fetchNextPage()}>Altri documenti</button>}
   </aside>
   <section className={styles.form} aria-label="Scheda del documento" onChangeCapture={()=>{dirty.current=true;}}>
    {document.isPending?<Loading label="Apertura documento…"/>:document.isError?<ErrorState error={document.error}/>:<>
     <header className={styles.documentHead}><h2>{document.data.name}</h2><p>Inserisci i dati oppure usa l’AI per precompilarli. Controlla le proposte prima di salvare.</p>{!preview&&<button type="button" className={ui.btn} onClick={()=>setPreview(true)}>Apri anteprima</button>}</header>
     <DocumentEditorContext.Provider value={{complete,pause:(saved=false)=>{if(saved)dirty.current=false;leave();},showOriginal:()=>{setPreview(true);setMobileOriginal(true);}}}><IntakePage workspace key={documentId}/></DocumentEditorContext.Provider>
    </>}
   </section>
   {preview&&<aside className={styles.preview} aria-label="Anteprima del documento"><header><div><h2>Originale</h2><p>{document.data?.originalFilename}</p></div><button type="button" className={styles.back} onClick={()=>setPreview(false)}>Chiudi anteprima</button></header><Original key={documentId} homeId={home.id} documentId={documentId}/></aside>}
  </div>
 </div>;
}
function Original({homeId,documentId}:{homeId:string;documentId:string}){
 const file=useDocumentFile(homeId,documentId,true),url=useObjectUrl(file.data?.blob);
 return file.isPending?<Loading label="Apertura originale…"/>:file.isError?<ErrorState error={file.error} onRetry={()=>void file.refetch()}/>:url?(file.data.contentType.startsWith('image/')?<img src={url} alt="Documento originale"/>:<PdfPreview blob={file.data.blob} url={url}/>):null;
}
