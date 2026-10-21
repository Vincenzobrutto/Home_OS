import {ARCHIVE_GROUPS,canonicalFamily} from './families';
import {useEffect,useId,useRef,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useAccount,useApi} from '../session/session';
import {newIdempotencyKey,queryKeys} from '../api/queryKeys';
import {isApiError,userMessage} from '../api/errors';
import type {DocumentSummary,DocumentGroup,SessionResponse} from '../api/types';
import {HOUSE_DOCUMENT_GROUPS} from './DocumentViews';
import {ui} from '../components/ui';
import styles from '../routes/documents.module.css';

export function ChangeHouseFamily({homeId,document,onChanged,archive=false}:{archive?:boolean;homeId:string;document:DocumentSummary;onChanged:(family:DocumentGroup)=>void}){
 const api=useApi(),account=useAccount(),cache=useQueryClient(),id=useId();
 const [open,setOpen]=useState(false),[value,setValue]=useState((archive?canonicalFamily(document.organization?.houseFamily??undefined):document.organization?.houseFamily)??'auto'),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState('');
 const live=useRef(true),flight=useRef(false),attempt=useRef<{key:string;body:unknown}|null>(null);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const org=document.organization;
 async function save(){
  if(flight.current||!org?.documentSha256)return;flight.current=true;setBusy(true);setError('');
  attempt.current??={key:newIdempotencyKey(),body:{expectedOrganizationVersion:org.version,documentVersion:document.version,sha256:org.documentSha256,family:value==='auto'?null:value,...(archive?{scope:'archive'}:{})}};
  try{
   const result=await api.callJson<{effectiveFamily:DocumentGroup;archiveFamily?:DocumentGroup}>(`/homes/${encodeURIComponent(homeId)}/documents/${encodeURIComponent(document.id)}/house-family`,{method:'POST',accountId:account.id,idempotencyKey:attempt.current.key,body:attempt.current.body});
   if(!live.current||cache.getQueryData<SessionResponse>(queryKeys.session)?.account?.id!==account.id)return;
   onChanged(archive?canonicalFamily(result.archiveFamily??result.effectiveFamily)!:result.effectiveFamily);
   await cache.invalidateQueries({queryKey:queryKeys.documentsAll(account.id,homeId)});
   if(live.current){setOpen(false);setUncertain(false);attempt.current=null;}
  }catch(e){if(live.current){setError(userMessage(e));if(isApiError(e)&&e.kind==='http'&&e.status<500){attempt.current=null;setUncertain(false);}else setUncertain(true);}}
  finally{flight.current=false;if(live.current)setBusy(false);}
 }
 if(!open)return <button type="button" className={styles.familyTrigger} disabled={!org?.documentSha256} onClick={()=>{setValue((archive?canonicalFamily(org?.houseFamily??undefined):org?.houseFamily)??'auto');setOpen(true);}}>Cambia famiglia</button>;
 return <div className={styles.familyEditor}>
  <label htmlFor={id}>Famiglia</label><select id={id} autoFocus value={value} disabled={busy||uncertain} onChange={e=>setValue(e.target.value)}><option value="auto">Automatico dal tipo</option>{(archive?ARCHIVE_GROUPS:HOUSE_DOCUMENT_GROUPS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
  <div className={styles.toolbarActions}><button className={`${ui.btn} ${ui.small}`} disabled={busy} onClick={()=>{setOpen(false);setError('');attempt.current=null;setUncertain(false);}}>Annulla</button><button className={`${ui.btn} ${ui.small}`} disabled={busy} onClick={()=>void save()}>{busy?'Salvataggio…':uncertain?'Riprova salvataggio':'Salva famiglia'}</button></div>
  <p className={styles.note}>Cambia solo la famiglia: tipo, file e collegamenti restano invariati.</p>
  {error&&<p role="alert">{error}{uncertain?' Riprova con la stessa scelta per verificare l’esito.':null} {!uncertain&&<button className={`${ui.btn} ${ui.small}`} onClick={()=>void cache.invalidateQueries({queryKey:queryKeys.documentsAll(account.id,homeId)})}>Aggiorna elenco</button>}</p>}
 </div>;
}
