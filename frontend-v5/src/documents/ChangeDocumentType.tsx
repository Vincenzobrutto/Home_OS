import {useEffect,useId,useRef,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useAccount,useApi} from '../session/session';
import {isApiError,userMessage} from '../api/errors';
import {newIdempotencyKey,queryKeys} from '../api/queryKeys';
import type {DocumentDetail,DocumentSummary,SessionResponse} from '../api/types';
import {KINDS,KIND_LABEL} from '../document-intake/model';
import {IntakeClient} from '../intake-integration/client';
import {organizeDocuments,type OrganizationPayload} from '../intake-integration/organization';
import {documentTypePayload,sameTypeSource,typeParts,TYPE_CHANGED} from './documentTypeChange';
import {ui} from '../components/ui';
import styles from '../routes/documents.module.css';

type Props={homeId:string;document:DocumentSummary};
export function ChangeDocumentType(props:Props){
 const account=useAccount();
 return <TypeEditor key={[account.id,props.homeId,props.document.id,props.document.version,props.document.organization?.version??0].join(':')} {...props}/>;
}
function TypeEditor({homeId,document}:Props){
 const api=useApi(),account=useAccount(),cache=useQueryClient(),id=useId();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[snapshot,setSnapshot]=useState<DocumentDetail|null>(null),[kinds,setKinds]=useState<string[]>([]),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false),[reload,setReload]=useState(false),[saved,setSaved]=useState(false);
 const live=useRef(true),flight=useRef(false),trigger=useRef<HTMLButtonElement>(null),first=useRef<HTMLSelectElement>(null),attempt=useRef<{prepareKey:string;key:string;kinds:string[];payload?:OrganizationPayload}|null>(null),read=useRef<AbortController|null>(null);
 useEffect(()=>{live.current=true;return()=>{live.current=false;read.current?.abort();};},[]);
 useEffect(()=>{if(open&&snapshot&&!busy)first.current?.focus();},[open,snapshot,busy]);
 const active=()=>live.current&&cache.getQueryData<SessionResponse>(queryKeys.session)?.account?.id===account.id;
 async function load(){
  if(flight.current)return;flight.current=true;setOpen(true);setBusy(true);setSnapshot(null);setError('');setSaved(false);setReload(false);read.current?.abort();const controller=new AbortController();read.current=controller;
  try{const doc=await api.getDocument(homeId,document.id,controller.signal,account.id);if(!active())return;if(doc.id!==document.id||doc.homeId!==homeId||!sameTypeSource(doc,doc))throw Error('Documento non disponibile.');setSnapshot(doc);setKinds(typeParts(doc).map(p=>p.kind));attempt.current=null;setUncertain(false);}
  catch(e){if(active()){setError(userMessage(e));setReload(true);}}
  finally{flight.current=false;if(active())setBusy(false);}
 }
 function close(){if(busy)return;setOpen(false);setError('');trigger.current?.focus();}
 async function save(){
  if(flight.current||!snapshot||reload||!valid||!changed)return;flight.current=true;setBusy(true);setError('');
  attempt.current??={prepareKey:newIdempotencyKey(),key:newIdempotencyKey(),kinds:[...kinds]};
  const current=attempt.current,client=new IntakeClient(api,account.id,homeId);
  try{
   if(!current.payload){
    const batch=await client.prepareExisting([document.id],current.prepareKey);if(!active())return;
    const fresh=await api.getDocument(homeId,document.id,undefined,account.id);if(!active())return;
    if(!sameTypeSource(snapshot,fresh))throw Error(TYPE_CHANGED);
    current.payload=documentTypePayload(snapshot,current.kinds,batch);
   }
   if(!active())return;
   const result=await organizeDocuments(client,current.payload,current.key);if(!active())return;
   if(result.outcome.status==='uncertain'){setUncertain(true);setError(result.outcome.message??'Esito da verificare.');return;}
   if(result.outcome.status!=='done'||result.outcome.results.some(r=>r.status!=='confirmed')){attempt.current=null;setUncertain(false);setReload(true);setError(TYPE_CHANGED);return;}
   attempt.current=null;setUncertain(false);setOpen(false);setSaved(true);
   await cache.invalidateQueries({queryKey:['account',account.id,'home',homeId,'intake']});
   if(active())await cache.invalidateQueries({queryKey:queryKeys.documentsAll(account.id,homeId)});
   if(active())trigger.current?.focus();
  }catch(e){if(active()){setError(e instanceof Error&&e.message===TYPE_CHANGED?TYPE_CHANGED:userMessage(e));if(e instanceof Error&&e.message===TYPE_CHANGED||isApiError(e)&&e.kind==='http'&&e.status<500){attempt.current=null;setUncertain(false);setReload(true);if(isApiError(e)&&e.kind==='http'&&[403,404].includes(e.status)){setSnapshot(null);setKinds([]);void cache.invalidateQueries({queryKey:queryKeys.documentsAll(account.id,homeId)});}}else setUncertain(true);}}
  finally{flight.current=false;if(active())setBusy(false);}
 }
 const changed=!!snapshot&&kinds.some((k,i)=>k!==typeParts(snapshot)[i]?.kind),valid=kinds.length>0&&kinds.every(k=>KINDS.includes(k as typeof KINDS[number]));
 return <>
  <button type="button" ref={trigger} className={styles.familyTrigger} aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>{if(open)close();else if(uncertain)setOpen(true);else void load();}} disabled={busy}>Correggi tipo</button>
  {saved&&<span role="status">Tipo aggiornato.</span>}
  {open&&<form id={id} className={styles.familyEditor} aria-label={'Tipo del documento: '+document.name} onSubmit={e=>{e.preventDefault();void save();}}>
   {busy&&!snapshot&&<p role="status">Lettura del tipo attuale…</p>}
   {snapshot&&typeParts(snapshot).map((part,index)=><div key={index}>
    <label htmlFor={id+'-'+index}>{kinds.length===1?'Tipo del documento':`Tipo della parte ${index+1}`}{part.pageFrom!==null?` · pagine ${part.pageFrom}–${part.pageTo}`:''}</label>
    <select id={id+'-'+index} ref={index===0?first:undefined} value={kinds[index]??''} disabled={busy||uncertain||reload} onChange={e=>{setKinds(old=>old.map((k,i)=>i===index?e.target.value:k));setError('');}}><option value="">Scegli il tipo</option>{KINDS.map(kind=><option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}</select>
   </div>)}
   <p className={styles.note}>Cambia solo il tipo. Titolo, file, collegamenti e spese già salvate restano invariati.</p>
   {uncertain&&<p role="status">Esito da verificare. Riprova la stessa scelta prima di modificarla.</p>}
   {error&&<p role="alert">{error}</p>}
   <div className={styles.toolbarActions}><button type="button" className={`${ui.btn} ${ui.small}`} disabled={busy} onClick={close}>{uncertain?'Chiudi':'Annulla'}</button>{reload?<button type="button" className={`${ui.btn} ${ui.small}`} disabled={busy} onClick={()=>void load()}>Rileggi tipo</button>:<button type="submit" className={`${ui.btn} ${ui.small}`} disabled={busy||!valid||!changed}>{busy?'Salvataggio…':uncertain?'Riprova salvataggio':'Salva tipo'}</button>}</div>
  </form>}
 </>;
}
