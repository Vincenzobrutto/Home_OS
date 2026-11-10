import {useEffect,useMemo,useRef,useState} from 'react';
import {ApiError} from '../api/errors';
import type {AgencyPlan,AgencyPlanPort,PlanEditBody,PlansResponse} from './api';
import {PolygonBuilder} from './PolygonBuilder';
import {PlanMeasurementView,type PlanShape} from './PlanMeasurementView';
import {isAppurtenance,netArea,overlapArea} from './scaleDetection';
import styles from './practice-plan.module.css';
type Request={key:string;body:PlanEditBody};
const kinds={room:'Vano / stanza',corridor:'Corridoio / disimpegno',bathroom:'Bagno',kitchen:'Cucina',balcony:'Balcone'};
const areaKinds={balcony:'Balcone',cellar:'Cantina'};
function findOverlappingRoom(geometry:PlanShape,rooms:PlanShape[]|null){
 const minimumOverlap=Math.max(0,netArea(geometry)*.01);
 return rooms?.find(room=>overlapArea(geometry,room,24)>minimumOverlap);
}
export function ManualRoomCreator(p:{forEstimate?:boolean;api:AgencyPlanPort;plan:AgencyPlan;revision:number;sourceUrl:string;onClose:()=>void;onUseExisting?:(id:string)=>void;onReload:()=>void;onSaved:(plans:PlansResponse,id:string)=>void;onDenied:(e:unknown)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;const d=dialog.current;if(d){if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');d.focus();}return()=>{alive.current=false;if(d?.open){if(typeof d.close==='function')d.close();else d.removeAttribute('open');}};},[]);
 const [roomId]=useState(()=>crypto.randomUUID()),[label,setLabel]=useState(''),[kind,setKind]=useState(''),[parentId,setParentId]=useState(''),[geometry,setGeometry]=useState<PlanShape|null>(null),[drawing,setDrawing]=useState(false),[reason,setReason]=useState(''),[preview,setPreview]=useState<{request:Request;plan:AgencyPlan}|null>(null),[pending,setPending]=useState<Request|null>(null),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false),[error,setError]=useState('');
 const locked=busy||!!pending||conflict;
 const areaLabel=p.forEstimate?areaKinds[kind as keyof typeof areaKinds]??'':label.trim();
 const overlappingRoom=useMemo(()=>p.forEstimate&&geometry?findOverlappingRoom(geometry,p.plan.rooms):undefined,[p.forEstimate,p.plan.rooms,geometry]);
 function invalidate(){setPreview(null);setError('');}
 function failure(e:unknown){if(!alive.current)return;if(e instanceof ApiError&&[401,403].includes(e.status)){p.onDenied(e);return;}if(e instanceof ApiError&&e.status===409){setConflict(true);setError('La pratica è cambiata. Ricarica prima di continuare.');return;}const code=e instanceof ApiError?e.code:'';setError(code==='region_overlap'?(p.forEstimate?'Il contorno si sovrappone a un vano già presente. Ridisegna l’area lungo il confine.':'Il contorno si sovrappone a un vano. Scegli “Ricava da…” per separarlo.'):code==='manual_room_multiple_components'?'Il ritaglio crea più parti separate. Ridisegna una sola zona connessa.':code==='manual_room_empty'?'La zona non intercetta il vano di origine oppure lo occupa interamente. Rivedi il contorno.' :code==='invalid_plan_input'&&p.forEstimate?'Il controllo non ha accettato il contorno. Verifica che i lati non si incrocino e che l’area non si sovrapponga a un contorno già presente. Puoi ridisegnarla senza chiudere questa finestra.':'Operazione non conclusa. Controlla il contorno o riprova.');}
 function makeRequest(shape:PlanShape|null):Request|null{
  if(!shape||!kind||!areaLabel)return null;
  if(p.forEstimate&&(shape===geometry?overlappingRoom:findOverlappingRoom(shape,p.plan.rooms)))return null;
  return {key:crypto.randomUUID(),body:{expectedRevision:p.revision,expectedPlanVersion:p.plan.version,reason:reason.trim()||'Vano ricalcato sul documento originale',command:{operation:'add_room',id:roomId,label:areaLabel,kind:kind==='cellar'?'room':kind,geometry:{points:shape.points,holes:shape.holes},...(parentId?{parentId}:{})}}};
 }
 async function showPreview(shape=geometry){
  const request=makeRequest(shape);
  if(!request||!p.api.preview)return;
  setBusy(true);setError('');
  try{const r=await p.api.preview(p.plan.id,request.body,request.key),plan=r.plans.plans.find(s=>s.id===p.plan.id);if(!plan)throw Error('Missing preview');if(alive.current)setPreview({request,plan});}catch(e){failure(e);}finally{if(alive.current)setBusy(false);}}
 async function commit(request:Request){setBusy(true);setError('');setPending(request);try{const r=await p.api.edit(p.plan.id,request.body,request.key);if(alive.current)p.onSaved(r.plans,roomId);}catch(e){if(e instanceof ApiError&&e.status===422)setPending(null);failure(e);}finally{if(alive.current)setBusy(false);}}
 const previewRooms=preview?.plan.rooms||[],newRoom=previewRooms.find(r=>r.id===roomId);
 const title=p.forEstimate?'Aggiungi area al calcolo':'Aggiungi vano';
 return <dialog ref={dialog} tabIndex={-1} className={`${styles.panel} ${styles.builderDialog}`} aria-label={p.forEstimate?title:'Aggiungi vano manualmente'} onCancel={e=>{e.preventDefault();if(!locked)p.onClose();}}>
  <h3>{title}</h3>
  {error&&<p role="alert">{error}</p>}
  {overlappingRoom&&<div className={styles.inlineWarning}>
   <p role="alert">Il nuovo contorno si sovrappone a «{overlappingRoom.label}». Se stai ricalcando la stessa area, usa quella già presente. Se è un’area diversa, ridisegnala lungo il confine.</p>
   {p.onUseExisting&&isAppurtenance(overlappingRoom)&&<button type="button" disabled={locked||drawing} onClick={()=>p.onUseExisting?.(overlappingRoom.id)}>Usa «{overlappingRoom.label}» già presente</button>}
  </div>}
  <fieldset disabled={locked||drawing}>
   {!p.forEstimate&&<label>Nome del nuovo vano<input maxLength={200} value={label} onChange={e=>{setLabel(e.target.value);invalidate();}} placeholder="Es. Corridoio"/></label>}
   <label>{p.forEstimate?'Tipo di area':'Tipo di vano'}<select value={kind} onChange={e=>{setKind(e.target.value);invalidate();}}><option value="">Scegli tipo</option>{Object.entries(p.forEstimate?areaKinds:kinds).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
   {p.forEstimate&&kind==='balcony'&&<p>Dopo aver aggiunto il balcone, scegli Coperto o Scoperto per includerlo nel totale.</p>}
   {!p.forEstimate&&<details open={parentId?true:undefined}><summary>Altre opzioni</summary>
   <label>Come aggiungere il vano<select value={parentId} onChange={e=>{setParentId(e.target.value);invalidate();}}><option value="">Nuovo spazio non riconosciuto</option>{p.plan.rooms?.map(r=><option key={r.id} value={r.id}>Ricava da {r.label}</option>)}</select></label>
   <label>Nota facoltativa<textarea maxLength={1000} value={reason} onChange={e=>{setReason(e.target.value);invalidate();}}/></label>
   </details>}
   <button type="button" disabled={p.forEstimate&&!areaLabel} onClick={()=>setDrawing(true)}>{p.forEstimate?(geometry?'Ridisegna contorno':'Disegna contorno'):geometry?'Ridisegna nuovo vano':'Disegna contorno del nuovo vano'}</button>
   {geometry&&!overlappingRoom&&<p>Contorno pronto per il salvataggio.</p>}
   <button type="button" disabled={!geometry||!kind||!areaLabel||!!overlappingRoom} onClick={()=>void showPreview()}>Controlla anteprima</button>
  </fieldset>
  {drawing&&p.plan.rasterSize&&<PolygonBuilder graphical sourceUrl={p.sourceUrl} width={p.plan.rasterSize.width} height={p.plan.rasterSize.height} initial={null} referenceShapes={p.plan.rooms||[]} onCancel={()=>setDrawing(false)} onDone={(shape,closedOnStart)=>{setGeometry(shape);setDrawing(false);invalidate();if(closedOnStart)void showPreview(shape);}}/>}
  {preview&&newRoom&&p.plan.rasterSize&&<section aria-label="Anteprima nuovo vano"><h4>Anteprima non salvata</h4><p>{parentId?'La zona selezionata è stata limitata al vano di origine. Controlla sia il nuovo vano sia il contorno rimanente.':'Controlla il contorno prima di aggiungerlo.'} Il computo precedente verrà invalidato e richiederà nuova verifica.</p><PlanMeasurementView drawingOnly readOnly scopeKey={preview.request.key} sourceUrl={p.sourceUrl} width={p.plan.rasterSize.width} height={p.plan.rasterSize.height} rooms={[newRoom,...previewRooms.filter(r=>r.id!==roomId)]} perimeter={null} issues={[]} onChange={()=>{}} onCreatePerimeter={()=>{}}/></section>}
  {pending&&!busy&&!conflict&&<button type="button" onClick={()=>void commit(pending)}>Riprova lo stesso salvataggio del vano</button>}
  {conflict&&<button type="button" onClick={p.onReload}>Chiudi e ricarica pratica</button>}
  <div className={styles.roomActions}>
   <button type="button" disabled={locked} onClick={p.onClose}>Annulla aggiunta</button>
   <button className={styles.primaryAction} type="button" disabled={locked||drawing||!geometry||!kind||!areaLabel||!!overlappingRoom} onClick={()=>{
    const request=preview?.request??makeRequest(geometry);
    if(request)void commit(request);
   }}>{p.forEstimate?'Aggiungi alla stima':'Salva nuovo vano'}</button>
  </div>
 </dialog>;
}
