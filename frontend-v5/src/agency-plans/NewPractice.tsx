import {useEffect,useRef,useState} from 'react';
import type {ApiTransport} from '../api/transport';
import type {AgencyPractice} from './api';
import {emptyProfile,profileLabels,type Profile} from './journey';
import type {MandateReading} from './readMandate';
import {PdfPreview} from '../documents/PdfPreview';
import styles from './practice-plan.module.css';

export function NewPractice({api,accountId,agencyId,onCreated,onCancel}:{api:Pick<ApiTransport,'callJson'>;accountId:string;agencyId:string;onCreated:(id:string)=>void;onCancel:()=>void}){
 const [previewUrl,setPreviewUrl]=useState(''),[previewPage,setPreviewPage]=useState(1);
 const [file,setFile]=useState<File|null>(null),[step,setStep]=useState<'upload'|'review'>('upload');
 const [label,setLabel]=useState(''),[profile,setProfile]=useState<Profile>(emptyProfile),[reading,setReading]=useState<MandateReading|null>(null);
 const [creationStarted,setCreationStarted]=useState(false),[createdPractice,setCreatedPractice]=useState<string|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false);
 const live=useRef(true),reader=useRef<AbortController|null>(null),flight=useRef(false);
 const creation=useRef<{key:string;label:string;file:File|null;profile:Profile;practice:AgencyPractice|null;uploadKey:string;form:FormData|null;sourceId:string|null;saveKey:string;saveBody:unknown}|null>(null);
 useEffect(()=>{live.current=true;return()=>{live.current=false;reader.current?.abort();};},[]);
 useEffect(()=>()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);},[previewUrl]);
 async function analyze(){
  if(!file||busy)return;setPreviewUrl(URL.createObjectURL(file));setPreviewPage(1);setBusy(true);setError('');const c=new AbortController();reader.current=c;
  try{const {readMandate}=await import('./readMandate');const result=await readMandate(file,c.signal);if(live.current){setReading(result);setProfile(result.profile);setLabel(result.profile.address?'Vendita · '+result.profile.address:file.name.replace(/\.pdf$/i,''));setStep('review');}}
  catch{if(live.current){setReading(null);setLabel(file.name.replace(/\.pdf$/i,''));setStep('review');setError('Lettura non disponibile. Puoi compilare i dati e allegare il file alla pratica.');}}
  finally{if(live.current)setBusy(false);}
 }
 async function create(){
  if(flight.current||!label.trim()||!profile.seller.trim()||!profile.address.trim()||!confirmed)return;
  flight.current=true;setBusy(true);setError('');
  const root='/agencies/'+encodeURIComponent(agencyId)+'/practices';
  creation.current??={key:crypto.randomUUID(),label:label.trim(),file,profile:structuredClone(profile),practice:null,uploadKey:crypto.randomUUID(),form:null,sourceId:null,saveKey:crypto.randomUUID(),saveBody:null};
  setCreationStarted(true);
  const request=creation.current;
  try{
   if(!request.practice){const r=await api.callJson<{practice:AgencyPractice}>(root,{method:'POST',accountId,idempotencyKey:request.key,body:{label:request.label}});request.practice=r.practice;if(live.current)setCreatedPractice(r.practice.id);}
   const path=root+'/'+request.practice.id;
   if(request.file&&!request.sourceId){
    if(!request.form){const form=new FormData();form.set('file',request.file);form.set('metadata',JSON.stringify({expectedRevision:request.practice.revision,visibility:'practice'}));request.form=form;}
    const uploaded=await api.callJson<{practice:AgencyPractice;receipt:{sourceId:string}}>(path+'/sources',{method:'POST',accountId,idempotencyKey:request.uploadKey,body:request.form});
    request.practice=uploaded.practice;request.sourceId=uploaded.receipt.sourceId;
   }
   request.saveBody??={expectedRevision:request.practice.revision,command:{operation:'profile',profile:request.profile,sourceId:request.sourceId,version:request.sourceId?1:null}};
   await api.callJson(path+'/journey',{method:'POST',accountId,idempotencyKey:request.saveKey,body:request.saveBody});
   if(live.current)onCreated(request.practice.id);
  }catch{if(live.current)setError('Creazione non completata. Riprova per riprendere dallo stesso passaggio.');}
  finally{flight.current=false;if(live.current)setBusy(false);}
 }
 const frozen=busy||creationStarted;
 return <section className={styles.panel} aria-label="Nuova pratica di vendita">
  <h2>Nuova pratica di vendita</h2>
  <p>{step==='upload'?'1 · Carica incarico':'2 · Controlla dati'} → Fascicolo</p>
  {error&&<p role="alert">{error}</p>}
  {step==='upload'?<>
   <h3>Parti dall’incarico firmato</h3>
   <label>Incarico firmato PDF<input type="file" accept="application/pdf" disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
   <p>Il documento verrà allegato alla pratica e sarà visibile agli agenti autorizzati della pratica.</p>
   <button type="button" disabled={!file||busy} onClick={()=>void analyze()}>{busy?'Lettura in corso…':'Leggi incarico e continua'}</button>
   <button type="button" disabled={busy} onClick={()=>{setFile(null);setStep('review');}}>Crea senza incarico</button>
  </>:<>
   <p>{reading?.warning??'Compila i dati della pratica.'}</p>
   {file&&<p>Documento · {file.name}</p>}
   <div className={styles.mandateReview}><fieldset disabled={frozen}>
    <label>Nome o riferimento immobile<input value={label} maxLength={200} onChange={e=>setLabel(e.target.value)}/></label>
    <div className={styles.fieldGrid}>{(Object.keys(profileLabels) as Array<keyof Profile>).map(field=><label key={field}>{profileLabels[field]}{['seller','address'].includes(field)&&' · richiesto'}<input value={profile[field]} maxLength={500} onChange={e=>{setProfile({...profile,[field]:e.target.value});setConfirmed(false);}}/>{reading?.pages[field]&&<small>Incarico · pagina {reading.pages[field]} <button type="button" onClick={()=>setPreviewPage(reading.pages[field]??1)}>Vedi fonte</button></small>}</label>)}</div>
    <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Ho controllato i dati e confermo quelli inseriti</label>
   </fieldset>{file&&previewUrl&&<section aria-label="Incarico originale"><h3>Incarico originale</h3><PdfPreview key={previewPage} blob={file} url={previewUrl} filename={file.name} initialPage={previewPage}/></section>}</div>
   <button type="button" disabled={busy||!confirmed||!label.trim()||!profile.seller.trim()||!profile.address.trim()} onClick={()=>void create()}>{creationStarted?'Riprendi creazione della pratica':'Conferma e crea pratica'}</button>
   {createdPractice&&<p>Pratica creata. Il completamento dei dati e dell’allegato è in corso.</p>}
  </>}
  {createdPractice&&!busy&&error&&<button type="button" onClick={()=>onCreated(createdPractice)}>Apri la pratica creata e completa dal fascicolo</button>}
  <button type="button" disabled={frozen} onClick={onCancel}>Annulla nuova pratica</button>
 </section>;
}
