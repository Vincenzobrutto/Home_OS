import { useState } from 'react';
import type {PlanMeasurementReport} from './api';
import type {MeasurementConfiguration} from './measurement-types';
import {PlanSurfaceSummary} from './PlanSurfaceSummary';
import styles from './plan-measurement.module.css';
export type Point=[number,number];
export type PlanShape={id:string;label:string;points:Point[];holes:Point[][]};
export type PlanMeasurementProps={scopeKey:string;sourceUrl:string;width:number;height:number;rooms:PlanShape[];perimeter:PlanShape|null;issues:string[];onChange:(view:'rooms'|'perimeter',shape:PlanShape)=>void;onCreatePerimeter:()=>void;readOnly?:boolean;drawingOnly?:boolean;simple?:boolean;onAddRoom?:()=>void;onSaveGeometry?:()=>void;hasUnsavedChanges?:boolean;onRemoveRoom?:(shape:PlanShape)=>void;configuration?:MeasurementConfiguration|null;measurement?:PlanMeasurementReport|null;measurementsOutdated?:boolean;candidateIds?:string[];excludedCandidateIds?:string[]};
const path=(s:PlanShape)=>[s.points,...s.holes].map(p=>'M'+p.map(v=>v.join(',')).join('L')+'Z').join('');
/** Controlled editor: source URL is supplied only after source authorization; no localStorage or live API side effects. */
export function PlanMeasurementView(props:PlanMeasurementProps){return <PlanMeasurementEditor key={props.scopeKey} {...props}/>;}
function PlanMeasurementEditor(props:PlanMeasurementProps){
 const [removeId,setRemoveId]=useState<string|null>(null);
 const [selectedView,setView]=useState<'rooms'|'perimeter'>('rooms'),[selection,setSelection]=useState<string|null>(null),[ringIndex,setRingIndex]=useState(0),[showLines,setShowLines]=useState(true),[insert,setInsert]=useState(false),[vertex,setVertex]=useState<number|null>(null),[dragging,setDragging]=useState<number|null>(null),[zoom,setZoom]=useState(1),[undo,setUndo]=useState<Array<{view:'rooms'|'perimeter';shape:PlanShape}>>([]);
 const view=props.drawingOnly?'rooms':selectedView;
 const accessories=props.configuration?.base==='gross_perimeter'?props.rooms.filter(r=>!props.configuration!.mainRegionIds.includes(r.id)):[];
 const shapes=view==='rooms'?props.rooms:[...(props.perimeter?[props.perimeter]:[]),...accessories],selected=shapes.find(s=>s.id===selection)||(props.simple?undefined:shapes[0]),ring=selected?[selected.points,...selected.holes][ringIndex]||selected.points:[];
 const shapeView=selected&&selected.id!==props.perimeter?.id?'rooms':'perimeter';
 function selectShape(id:string){if(props.simple&&props.hasUnsavedChanges&&selected?.id!==id)return;setRemoveId(null);setSelection(id);setRingIndex(0);setVertex(null);setInsert(false);}
 function change(next:PlanShape,record=true){if(props.readOnly)return;if(record&&selected)setUndo(u=>[...u.slice(-49),{view:shapeView,shape:structuredClone(selected)}]);props.onChange(shapeView,next);}
 function mode(next:'rooms'|'perimeter'){setView(next);setSelection(null);setRingIndex(0);setVertex(null);setDragging(null);setInsert(false);}
 function add(edge:number){if(!selected||props.readOnly)return;const next=structuredClone(selected),p=[next.points,...next.holes][ringIndex]||next.points,a=p[edge]!,b=p[(edge+1)%p.length]!;p.splice(edge+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);change(next);setVertex(edge+1);}
 function remove(){if(!selected||vertex===null||ring.length<=3||props.readOnly)return;const next=structuredClone(selected),p=[next.points,...next.holes][ringIndex]||next.points;p.splice(vertex,1);change(next);setVertex(null);}
 return <section className={styles.workspace} aria-label="Analisi della planimetria">
  {!props.drawingOnly&&<div className={styles.tabs} role="tablist" aria-label="Vista della planimetria">
   <button type="button" role="tab" aria-selected={view==='rooms'} onClick={()=>mode('rooms')}>Singoli vani</button>
   <button type="button" role="tab" aria-selected={view==='perimeter'} onClick={()=>mode('perimeter')}>Perimetro commerciale</button>
  </div>}
  {!!props.candidateIds?.length&&<p>Arancione: aree non censite da verificare, non vani confermati.</p>}
  {!!props.excludedCandidateIds?.length&&<p>Tratteggio grigio: aree scartate, mantenute visibili solo per il confronto.</p>}
  {!props.drawingOnly&&<p>{view==='rooms'?'Vani e pertinenze restano distinti. Le geometrie sono proposte da controllare.':'Il perimetro lordo comprende i muri interni: il dettaglio dei vani resta disponibile e non viene sommato di nuovo. Balconi e altre pertinenze si computano separatamente.'}</p>}
  {!props.drawingOnly&&props.issues.length>0&&<details className={styles.warning}><summary>{props.issues.length} {props.issues.length===1?'verifica aperta':'verifiche aperte'} sui contorni</summary><ul>{[...new Set(props.issues)].map(issue=><li key={issue}>{issue}</li>)}</ul></details>}
  {view==='perimeter'&&!props.perimeter&&<div className={styles.warning}><p>Il perimetro lordo non è ancora disponibile. La somma degli interni non lo sostituisce.</p><button type="button" disabled={props.readOnly} onClick={props.onCreatePerimeter}>Definisci perimetro</button></div>}
  {props.simple&&<>
   <div className={styles.editorToolbar} role="group" aria-label="Strumenti della mappa">
    <button type="button" aria-pressed={!selected} disabled={props.hasUnsavedChanges} onClick={()=>{setSelection(null);setVertex(null);setInsert(false);}}>Seleziona</button>
    {props.onAddRoom&&<button type="button" disabled={props.readOnly||props.hasUnsavedChanges} onClick={props.onAddRoom}>Aggiungi vano</button>}
    {props.onRemoveRoom&&<button type="button" aria-label="Elimina vano selezionato" disabled={props.readOnly||!selected||props.hasUnsavedChanges} onClick={()=>selected&&setRemoveId(selected.id)}>Elimina</button>}
    {props.onSaveGeometry&&<button className={styles.saveAction} type="button" disabled={props.readOnly||!props.hasUnsavedChanges} onClick={props.onSaveGeometry}>Salva modifiche</button>}
   </div>
   <p className={styles.editHint}>{selected?<><strong>{selected.label}</strong> · {props.hasUnsavedChanges?'Modifiche da salvare.':(props.readOnly?'Solo consultazione.':'Trascina i punti per correggere il contorno.')}</>:(props.readOnly?'Seleziona un vano per consultarlo.':'Tocca un vano per modificarlo.')}</p>
  </>}
  <div className={styles.controls} hidden={!!props.simple||(!!props.readOnly&&!!props.drawingOnly)}>
   {shapes.length>0&&<label>Geometria<select aria-label="Geometria" value={selected?.id||''} onChange={e=>{setRemoveId(null);setSelection(e.target.value);setRingIndex(0);setVertex(null);}}>{shapes.map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></label>}
   {selected&&selected.holes.length>0&&<label>Contorno<select aria-label="Contorno" value={ringIndex} onChange={e=>{setRingIndex(Number(e.target.value));setVertex(null);}}><option value={0}>Esterno</option>{selected.holes.map((_,i)=><option key={i} value={i+1}>Vuoto {i+1}</option>)}</select></label>}
   <label><input type="checkbox" checked={showLines} onChange={e=>setShowLines(e.target.checked)}/> Mostra contorni</label>
   <label>Zoom<input aria-label="Zoom" type="range" min="1" max="4" step=".25" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><output>{Math.round(zoom*100)}%</output><button type="button" disabled={zoom===1} onClick={()=>setZoom(1)}>Adatta al riquadro</button>
   {!props.readOnly&&view==='rooms'&&selected&&props.onRemoveRoom&&<button type="button" onClick={()=>setRemoveId(selected.id)}>Elimina vano selezionato</button>}
   {!props.readOnly&&<><button type="button" disabled={!selected} aria-pressed={insert} onClick={()=>setInsert(v=>!v)}>Aggiungi punto su un lato</button><button type="button" disabled={vertex===null||ring.length<=3} onClick={remove}>Elimina punto</button><button type="button" disabled={!undo.length} onClick={()=>{const previous=undo.at(-1);if(previous){props.onChange(previous.view,previous.shape);setUndo(u=>u.slice(0,-1));setVertex(null);}}}>Annulla modifica</button></>}
  </div>
  {props.simple&&selected&&!props.readOnly&&<div className={styles.vertexTools} role="group" aria-label="Correzione del vano selezionato">
   {selected.holes.length>0&&<label>Contorno<select aria-label="Contorno" value={ringIndex} onChange={e=>{setRingIndex(Number(e.target.value));setVertex(null);}}><option value={0}>Esterno</option>{selected.holes.map((_,i)=><option key={i} value={i+1}>Vuoto {i+1}</option>)}</select></label>}
   <button type="button" aria-pressed={insert} onClick={()=>setInsert(v=>!v)}>Aggiungi punto su un lato</button>
   <button type="button" disabled={vertex===null||ring.length<=3} onClick={remove}>Elimina punto</button>
   <button type="button" disabled={!undo.length} onClick={()=>{const previous=undo.at(-1);if(previous){props.onChange(previous.view,previous.shape);setUndo(u=>u.slice(0,-1));setVertex(null);}}}>Annulla modifica</button>
  </div>}
  {props.simple&&<div className={styles.zoomTools} role="group" aria-label="Zoom planimetria"><button type="button" aria-label="Riduci zoom" disabled={zoom<=1} onClick={()=>setZoom(v=>Math.max(1,v-.25))}>−</button><output aria-live="polite">{Math.round(zoom*100)}%</output><button type="button" aria-label="Aumenta zoom" disabled={zoom>=4} onClick={()=>setZoom(v=>Math.min(4,v+.25))}>+</button><button type="button" disabled={zoom===1} onClick={()=>setZoom(1)}>Adatta</button></div>}
  {!props.readOnly&&selected&&removeId===selected.id&&<div role="group" aria-label="Conferma eliminazione vano"><p>Eliminare {selected.label} dalla mappa? Il computo va verificato di nuovo.</p><button type="button" onClick={()=>{setRemoveId(null);props.onRemoveRoom?.(selected);}}>Conferma eliminazione</button><button type="button" onClick={()=>setRemoveId(null)}>Annulla eliminazione</button></div>}
  <div className={props.simple?styles.scroll+' '+styles.simpleScroll:styles.scroll}><svg role="img" aria-label={view==='rooms'?'Contorni dei singoli vani':'Perimetro lordo commerciale'} viewBox={`0 0 ${props.width} ${props.height}`} style={{width:props.simple?`min(${zoom*100}%, ${zoom*65*props.width/props.height}vh)`:`${zoom*100}%`}}
   onPointerMove={e=>{if(dragging===null||!selected||props.readOnly)return;const matrix=e.currentTarget.getScreenCTM();if(!matrix)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()),next=structuredClone(selected),points=[next.points,...next.holes][ringIndex]||next.points;points[dragging]=[Math.max(0,Math.min(props.width,p.x)),Math.max(0,Math.min(props.height,p.y))];change(next,false);}}
   onPointerUp={()=>setDragging(null)} onPointerCancel={()=>setDragging(null)}>
   <image href={props.sourceUrl} x="0" y="0" width={props.width} height={props.height}/>
   {showLines&&shapes.map(s=><path key={s.id} data-testid={`shape-${s.id}`} d={path(s)} fill={props.excludedCandidateIds?.includes(s.id)?'none':props.candidateIds?.includes(s.id)?'rgba(255,155,0,.2)':'rgba(0,125,154,.08)'} fillRule="evenodd" strokeDasharray={props.excludedCandidateIds?.includes(s.id)?'6 4':undefined} stroke={props.excludedCandidateIds?.includes(s.id)?'#87948f':props.candidateIds?.includes(s.id)?'#b76b00':s.id===selected?.id?'#006d80':'#c73572'} strokeWidth={Math.max(props.width/800,1)} role={props.simple?'button':undefined} aria-label={props.simple?'Seleziona vano '+s.label:undefined} tabIndex={props.simple?0:undefined} onClick={()=>selectShape(s.id)} onKeyDown={e=>{if(props.simple&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectShape(s.id);}}}/>)}
   {showLines&&selected&&!props.readOnly&&ring.map((p,i)=><g key={i}>
    {insert&&<circle role="button" aria-label={`Inserisci punto sul lato ${i+1}`} tabIndex={0} cx={(p[0]+ring[(i+1)%ring.length]![0])/2} cy={(p[1]+ring[(i+1)%ring.length]![1])/2} r={props.width/150} fill="#ffa620" onClick={()=>add(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();add(i);}}}/>}
    <circle role="button" aria-label={`Vertice ${i+1}`} tabIndex={0} cx={p[0]} cy={p[1]} r={props.width/200} fill={vertex===i?'#ffa620':'white'} stroke="#006d80" strokeWidth={props.width/800} onPointerDown={e=>{e.preventDefault();setVertex(i);setDragging(i);setUndo(u=>[...u.slice(-49),{view:shapeView,shape:structuredClone(selected)}]);e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);}} onClick={()=>setVertex(i)} onKeyDown={e=>{if(e.key==='Enter')setVertex(i);}}/>
   </g>)}
  </svg></div>
  {!props.drawingOnly&&<><PlanSurfaceSummary view={view} rooms={props.rooms.filter(r=>!props.excludedCandidateIds?.includes(r.id))} configuration={props.configuration} measurement={props.measurement} measurementsOutdated={props.measurementsOutdated} onSelect={id=>{if(!shapes.some(s=>s.id===id))setView('rooms');setSelection(id);setRingIndex(0);setVertex(null);setInsert(false);}}/>
  <p className={styles.note}>Conferma scala, perimetro e regole sui muri prima del computo. Il risultato è una misura sul documento, non un rilievo certificato.</p></>}
 </section>;
}
