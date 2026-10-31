import {useEffect,useRef,useState} from 'react';
import {ApiError} from '../api/errors';
import type {AgencyPlan,AgencyPlanPort,PlanEditBody,PlansResponse} from './api';
import {PolygonBuilder} from './PolygonBuilder';
import {PlanMeasurementView,type PlanShape} from './PlanMeasurementView';
import styles from './practice-plan.module.css';
type Request={key:string;body:PlanEditBody};
const kinds={room:'Vano / stanza',corridor:'Corridoio / disimpegno',bathroom:'Bagno',kitchen:'Cucina',balcony:'Balcone'};
export function ManualRoomCreator(p:{api:AgencyPlanPort;plan:AgencyPlan;revision:number;sourceUrl:string;onClose:()=>void;onReload:()=>void;onSaved:(plans:PlansResponse,id:string)=>void;onDenied:(e:unknown)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;const d=dialog.current;if(d){if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');d.focus();}return()=>{alive.current=false;if(d?.open){if(typeof d.close==='function')d.close();else d.removeAttribute('open');}};},[]);
 const [roomId]=useState(()=>crypto.randomUUID()),[label,setLabel]=useState(''),[kind,setKind]=useState(''),[parentId,setParentId]=useState(''),[geometry,setGeometry]=useState<PlanShape|null>(null),[drawing,setDrawing]=useState(false),[reason,setReason]=useState(''),[preview,setPreview]=useState<{request:Request;plan:AgencyPlan}|null>(null),[pending,setPending]=useState<Request|null>(null),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false),[error,setError]=useState('');
 const locked=busy||!!pending||conflict;
 function invalidate(){setPreview(null);setError('');}
 function failure(e:unknown){if(!alive.current)return;if(e instanceof ApiError&&[401,403].includes(e.status)){p.onDenied(e);return;}if(e instanceof ApiError&&e.status===409){setConflict(true);setError('La pratica è cambiata. Ricarica prima di continuare.');return;}const code=e instanceof ApiError?e.code:'';setError(code==='region_overlap'?'Il contorno si sovrappone a un vano. Scegli “Ricava da…” per separarlo.':code==='manual_room_multiple_components'?'Il ritaglio crea più parti separate. Ridisegna una sola zona connessa.':code==='manual_room_empty'?'La zona non intercetta il vano di origine oppure lo occupa interamente. Rivedi il contorno.':'Operazione non conclusa. Controlla il contorno o riprova.');}
 async function showPreview(){if(!geometry||!kind||!label.trim()||!reason.trim()||!p.api.preview)return;setBusy(true);setError('');const request={key:crypto.randomUUID(),body:{expectedRevision:p.revision,expectedPlanVersion:p.plan.version,reason:reason.trim(),command:{operation:'add_room',id:roomId,label:label.trim(),kind,geometry:{points:geometry.points,holes:geometry.holes},...(parentId?{parentId}:{})}}};try{const r=await p.api.preview(p.plan.id,request.body,request.key),plan=r.plans.plans.find(s=>s.id===p.plan.id);if(!plan)throw Error('Missing preview');if(alive.current)setPreview({request,plan});}catch(e){failure(e);}finally{if(alive.current)setBusy(false);}}
 async function commit(request:Request){setBusy(true);setError('');setPending(request);try{const r=await p.api.edit(p.plan.id,request.body,request.key);if(alive.current)p.onSaved(r.plans,roomId);}catch(e){if(e instanceof ApiError&&e.status===422)setPending(null);failure(e);}finally{if(alive.current)setBusy(false);}}
 const previewRooms=preview?.plan.rooms||[],newRoom=previewRooms.find(r=>r.id===roomId);
 return <dialog ref={dialog} tabIndex={-1} className={`${styles.panel} ${styles.builderDialog}`} aria-label="Aggiungi vano manualmente" onCancel={e=>{e.preventDefault();if(!locked)p.onClose();}}>
  <h3>Disegna / aggiungi vano</h3><p>Ricalca lo spazio sull’originale. Prima del salvataggio vedrai il risultato effettivo.</p>
  {error&&<p role="alert">{error}</p>}
  <fieldset disabled={locked||drawing}>
   <label>Nome del nuovo vano<input maxLength={200} value={label} onChange={e=>{setLabel(e.target.value);invalidate();}} placeholder="Es. Corridoio"/></label>
   <label>Tipo di vano<select value={kind} onChange={e=>{setKind(e.target.value);invalidate();}}><option value="">Scegli tipo</option>{Object.entries(kinds).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
   <label>Come aggiungere il vano<select value={parentId} onChange={e=>{setParentId(e.target.value);invalidate();}}><option value="">Nuovo spazio non riconosciuto</option>{p.plan.rooms?.map(r=><option key={r.id} value={r.id}>Ricava da {r.label}</option>)}</select></label>
   <p>{parentId?'Disegna la zona da separare. Verrà ritagliata entro il vano scelto e sottratta da esso: gli altri vani restano invariati.':'Il nuovo contorno deve essere distinto dagli altri vani. Se lo spazio è già accorpato, scegli “Ricava da…”.'}</p>
   <button type="button" onClick={()=>setDrawing(true)}>{geometry?'Ridisegna nuovo vano':'Disegna contorno del nuovo vano'}</button>
   {geometry&&<p>Contorno pronto: {geometry.points.length} punti. Non ancora salvato.</p>}
   <label>Motivo dell’aggiunta<textarea maxLength={1000} value={reason} onChange={e=>{setReason(e.target.value);invalidate();}}/></label>
   <button type="button" disabled={!geometry||!kind||!label.trim()||!reason.trim()} onClick={()=>void showPreview()}>Controlla anteprima</button>
  </fieldset>
  {drawing&&p.plan.rasterSize&&<PolygonBuilder sourceUrl={p.sourceUrl} width={p.plan.rasterSize.width} height={p.plan.rasterSize.height} initial={null} referenceShapes={p.plan.rooms||[]} onCancel={()=>setDrawing(false)} onDone={s=>{setGeometry(s);setDrawing(false);invalidate();}}/>}
  {preview&&newRoom&&p.plan.rasterSize&&<section aria-label="Anteprima nuovo vano"><h4>Anteprima non salvata</h4><p>{parentId?'La zona selezionata è stata limitata al vano di origine. Controlla sia il nuovo vano sia il contorno rimanente.':'Controlla il contorno prima di aggiungerlo.'} Il computo precedente verrà invalidato e richiederà nuova verifica.</p><PlanMeasurementView readOnly scopeKey={preview.request.key} sourceUrl={p.sourceUrl} width={p.plan.rasterSize.width} height={p.plan.rasterSize.height} rooms={[newRoom,...previewRooms.filter(r=>r.id!==roomId)]} perimeter={null} issues={[]} onChange={()=>{}} onCreatePerimeter={()=>{}}/><button type="button" disabled={locked} onClick={()=>void commit(preview.request)}>Salva nuovo vano</button></section>}
  {pending&&!busy&&!conflict&&<button type="button" onClick={()=>void commit(pending)}>Riprova lo stesso salvataggio del vano</button>}
  {conflict&&<button type="button" onClick={p.onReload}>Chiudi e ricarica pratica</button>}
  <button type="button" disabled={locked} onClick={p.onClose}>Annulla aggiunta</button>
 </dialog>;
}
