import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import type {PlanMeasurementReport} from './api';
import type {MeasurementConfiguration} from './measurement-types';
import {MAX_PLAN_ZOOM,usePlanZoom} from '../components/usePlanZoom';
import {insideShape,isBalcony} from './scaleDetection';
import {PlanSurfaceSummary} from './PlanSurfaceSummary';
import styles from './plan-measurement.module.css';
export type Point=[number,number];
export type PlanShape={kind?:string;id:string;label:string;points:Point[];holes:Point[][];symbols?:Array<{id:string;reason:string;point?:Point}>};
export type PlanMeasurementProps={scopeKey:string;sourceUrl:string;width:number;height:number;rooms:PlanShape[];perimeter:PlanShape|null;issues:string[];hideRoomSummary?:boolean;initialView?:'rooms'|'perimeter';onChange:(view:'rooms'|'perimeter',shape:PlanShape)=>void;onCreatePerimeter:()=>void;readOnly?:boolean;drawingOnly?:boolean;simple?:boolean;onAddRoom?:()=>void;onSaveGeometry?:()=>void;hasUnsavedChanges?:boolean;onRemoveRoom?:(shape:PlanShape)=>void;configuration?:MeasurementConfiguration|null;measurement?:PlanMeasurementReport|null;measurementsOutdated?:boolean;candidateIds?:string[];excludedCandidateIds?:string[];
 /** Simple map only: faint, non-interactive outlines shown for context (e.g. rooms under the gross perimeter). */
 contextShapes?:PlanShape[];warnIds?:string[];mapLabel?:string;toolbarActions?:ReactNode;onDiscard?:()=>void;
 /** Changing `key` selects the shape, brings it into view and marks `point` when known. */
 focus?:{id:string;point?:Point;preferSingleHole?:boolean;key:number;number?:number;wholePage?:boolean}|null};
const path=(s:PlanShape)=>[s.points,...s.holes].map(p=>'M'+p.map(v=>v.join(',')).join('L')+'Z').join('');
/** Controlled editor: source URL is supplied only after source authorization; no localStorage or live API side effects. */
export function PlanMeasurementView(props:PlanMeasurementProps){return <PlanMeasurementEditor key={props.scopeKey} {...props}/>;}
function PlanMeasurementEditor(props:PlanMeasurementProps){
 const [removeId,setRemoveId]=useState<string|null>(null);
 const [selectedView,setView]=useState<'rooms'|'perimeter'>(props.initialView??'rooms'),[selection,setSelection]=useState<string|null>(null),[ringIndex,setRingIndex]=useState(0),[showLines,setShowLines]=useState(true),[insert,setInsert]=useState(false),[vertex,setVertex]=useState<number|null>(null),[undo,setUndo]=useState<Array<{view:'rooms'|'perimeter';shape:PlanShape}>>([]);
 const {zoom,setZoom,scrollRef,mapRef}=usePlanZoom({requireControl:true});
 const [mapScale,setMapScale]=useState<number>();
 const drag=useRef<{pointerId:number;index:number;start:DOMPoint;original:Point;moved:boolean}|null>(null);
 useEffect(()=>{
  const map=mapRef.current;
  if(!map)return;
  const measure=()=>{
   const matrix=map.getScreenCTM?.();
   if(matrix?.a)setMapScale(Math.abs(matrix.a));
  };
  measure();
  if(typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(measure);
  observer.observe(map);
  return ()=>observer.disconnect();
 },[mapRef,props.width,props.height]);
 const hitRadius=mapScale?9/mapScale:props.width/80;
 const view=props.drawingOnly?'rooms':selectedView;
 const accessories=props.rooms.filter(room=>isBalcony(room)||props.configuration?.base==='gross_perimeter'&&!props.configuration.mainRegionIds.includes(room.id));
 const shapes=props.simple?[...(props.perimeter?[props.perimeter]:[]),...props.rooms]:view==='rooms'?props.rooms:[...(props.perimeter?[props.perimeter]:[]),...accessories],selected=shapes.find(s=>s.id===selection)||(props.simple?undefined:shapes[0]),ring=selected?[selected.points,...selected.holes][ringIndex]||selected.points:[];
 const shapeView=selected&&selected.id!==props.perimeter?.id?'rooms':'perimeter';
 function selectShape(id:string){if(props.simple&&props.hasUnsavedChanges&&selected?.id!==id)return;setRemoveId(null);setSelection(id);setRingIndex(0);setVertex(null);setInsert(false);}
 function change(next:PlanShape,record=true){if(props.readOnly)return;if(record&&selected)setUndo(u=>[...u.slice(-49),{view:shapeView,shape:structuredClone(selected)}]);props.onChange(shapeView,next);}
 const focusKey=props.focus?.key;
 const [seenFocus,setSeenFocus]=useState<number>();
 if(focusKey!==seenFocus){
  setSeenFocus(focusKey);
  const target=props.focus;
  if(target?.wholePage){setZoom(1);setSelection(null);setRemoveId(null);setVertex(null);setInsert(false);}
  else if(target?.number!==undefined)setZoom(current=>Math.max(current,3));
  const targetShape=target&&shapes.find(shape=>shape.id===target.id);
  if(targetShape&&!(props.hasUnsavedChanges&&selected?.id!==targetShape.id)){
   const point=target?.point;
   const holeIndex=point
    ?targetShape.holes.findIndex(points=>insideShape(point,{points,holes:[]}))
    :target?.preferSingleHole&&targetShape.holes.length===1?0:-1;
   setRemoveId(null);
   setSelection(targetShape.id);
   setShowLines(true);
   setRingIndex(holeIndex+1);
   setVertex(null);
   setInsert(false);
  }
 }
 useEffect(()=>{
  const target=props.focus,scroll=scrollRef.current,map=mapRef.current;
  if(!target)return;
  const shape=shapes.find(s=>s.id===target.id)??props.contextShapes?.find(s=>s.id===target.id);
  const point=target.point??(shape?[(Math.min(...shape.points.map(p=>p[0]))+Math.max(...shape.points.map(p=>p[0])))/2,(Math.min(...shape.points.map(p=>p[1]))+Math.max(...shape.points.map(p=>p[1])))/2] as Point:null);
  if(scroll&&target.wholePage){scroll.scrollLeft=0;scroll.scrollTop=0;}
  else if(scroll&&map&&point){
   const matrix=map.getScreenCTM?.();
   if(matrix){
    const viewport=scroll.getBoundingClientRect();
    scroll.scrollLeft+=matrix.e+point[0]*matrix.a-viewport.left-scroll.clientWidth/2;
    scroll.scrollTop+=matrix.f+point[1]*matrix.d-viewport.top-scroll.clientHeight/2;
   }
  }
  scroll?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[focusKey]);
 const marker=props.focus?.point??null;
 const highlighted=props.focus?.number!==undefined&&shapes.find(shape=>shape.id===props.focus?.id);
 function nudge(index:number,dx:number,dy:number){if(!selected||props.readOnly)return;const next=structuredClone(selected),points=[next.points,...next.holes][ringIndex]||next.points,p=points[index];if(!p)return;points[index]=[Math.max(0,Math.min(props.width,p[0]+dx)),Math.max(0,Math.min(props.height,p[1]+dy))];change(next);setVertex(index);}
 function startDrag(event:PointerEvent<SVGCircleElement>,index:number){
  const matrix=mapRef.current?.getScreenCTM();
  if(event.button!==0||!event.isPrimary||!matrix||!ring[index])return;
  const start=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  const distance=([x,y]:Point)=>Math.hypot(x-start.x,y-start.y);
  // Adjacent hit targets can overlap at low zoom. Use the nearest visible point.
  const nearest=ring.reduce((best,point,i)=>distance(point)<distance(ring[best]!)?i:best,index);
  event.preventDefault();
  setVertex(nearest);
  drag.current={pointerId:event.pointerId,index:nearest,start,original:ring[nearest]!,moved:false};
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function moveVertex(event:PointerEvent<SVGSVGElement>){
  const active=drag.current;
  if(!active||active.pointerId!==event.pointerId||!selected||props.readOnly)return;
  const matrix=event.currentTarget.getScreenCTM();
  if(!matrix)return;
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  const dx=point.x-active.start.x,dy=point.y-active.start.y;
  if(!active.moved&&Math.hypot(dx,dy)*Math.abs(matrix.a)<3)return;
  const next=structuredClone(selected),points=[next.points,...next.holes][ringIndex]||next.points;
  points[active.index]=[
   Math.max(0,Math.min(props.width,active.original[0]+dx)),
   Math.max(0,Math.min(props.height,active.original[1]+dy)),
  ];
  change(next,!active.moved);
  active.moved=true;
 }
 function stopDrag(event:PointerEvent<SVGSVGElement>){
  if(drag.current?.pointerId===event.pointerId)drag.current=null;
 }
 function mode(next:'rooms'|'perimeter'){setView(next);setSelection(null);setRingIndex(0);setVertex(null);drag.current=null;setInsert(false);}
 function add(edge:number,click?:{x:number;y:number}){
  if(!selected||props.readOnly)return;
  const next=structuredClone(selected);
  const points=[next.points,...next.holes][ringIndex]||next.points;
  const start=points[edge]!,end=points[(edge+1)%points.length]!;
  const dx=end[0]-start[0],dy=end[1]-start[1];
  const lengthSquared=dx*dx+dy*dy;
  if(!lengthSquared)return;
  let fraction=.5;
  if(click){
   const matrix=mapRef.current?.getScreenCTM();
   if(!matrix)return;
   const point=new DOMPoint(click.x,click.y).matrixTransform(matrix.inverse());
   fraction=((point.x-start[0])*dx+(point.y-start[1])*dy)/lengthSquared;
   if(fraction<=0||fraction>=1)return;
  }
  points.splice(edge+1,0,[start[0]+fraction*dx,start[1]+fraction*dy]);
  change(next);
  setVertex(edge+1);
 }
 function remove(){if(!selected||vertex===null||ring.length<=3||props.readOnly)return;const next=structuredClone(selected),p=[next.points,...next.holes][ringIndex]||next.points;p.splice(vertex,1);change(next);setVertex(null);}
 function includeSelectedHole(){
  if(props.readOnly||!selected||ringIndex===0||!selected.holes[ringIndex-1])return;
  const holes=selected.holes.filter((_,index)=>index!==ringIndex-1);
  change({...selected,holes});
  setRingIndex(0);
  setVertex(null);
  setInsert(false);
 }
 return <section className={styles.workspace} aria-label="Analisi della planimetria">
  {!props.drawingOnly&&!props.simple&&<div className={styles.tabs} role="tablist" aria-label="Vista della planimetria">
   <button type="button" role="tab" aria-selected={view==='rooms'} onClick={()=>mode('rooms')}>Singoli vani</button>
   <button type="button" role="tab" aria-selected={view==='perimeter'} onClick={()=>mode('perimeter')}>Perimetro commerciale</button>
  </div>}
  {!!props.candidateIds?.length&&<p>Arancione: aree non censite da verificare, non vani confermati.</p>}
  {!!props.excludedCandidateIds?.length&&<p>Tratteggio grigio: aree scartate, mantenute visibili solo per il confronto.</p>}
  {!props.drawingOnly&&!props.simple&&<p>{view==='rooms'?'Vani e pertinenze restano distinti. Le geometrie sono proposte da controllare.':'Il perimetro lordo comprende i muri interni: il dettaglio dei vani resta disponibile e non viene sommato di nuovo. Balconi e altre pertinenze si computano separatamente.'}</p>}
  {!props.drawingOnly&&!props.simple&&props.issues.length>0&&<details className={styles.warning}><summary>{props.issues.length} {props.issues.length===1?'verifica aperta':'verifiche aperte'} sui contorni</summary><ul>{[...new Set(props.issues)].map(issue=><li key={issue}>{issue}</li>)}</ul></details>}
  {!props.simple&&view==='perimeter'&&!props.perimeter&&<div className={styles.warning}><p>Il perimetro lordo non è ancora disponibile. La somma degli interni non lo sostituisce.</p><button type="button" disabled={props.readOnly} onClick={props.onCreatePerimeter}>Definisci perimetro</button></div>}
  {props.simple&&<>
   <div className={styles.editorToolbar} role="group" aria-label="Strumenti della mappa">
    <button type="button" aria-pressed={!selected} disabled={props.hasUnsavedChanges} onClick={()=>{setSelection(null);setVertex(null);setInsert(false);}}>Seleziona</button>
    {props.onAddRoom&&<button type="button" disabled={props.readOnly||props.hasUnsavedChanges} onClick={props.onAddRoom}>Aggiungi vano</button>}
    {props.toolbarActions}
    {props.onRemoveRoom&&<button type="button" aria-label="Elimina vano selezionato" disabled={props.readOnly||!selected||selected.id===props.perimeter?.id||props.hasUnsavedChanges} onClick={()=>selected&&setRemoveId(selected.id)}>Elimina</button>}
    <div className={styles.zoomTools} role="group" aria-label="Zoom planimetria" title="Ctrl + rotellina sulla mappa"><button type="button" aria-label="Riduci zoom" disabled={zoom<=1} onClick={()=>setZoom(v=>Math.max(1,v-.25))}>−</button><output aria-live="polite">{Math.round(zoom*100)}%</output><button type="button" aria-label="Aumenta zoom" disabled={zoom>=MAX_PLAN_ZOOM} onClick={()=>setZoom(v=>Math.min(MAX_PLAN_ZOOM,v+.25))}>+</button><button type="button" aria-label="Adatta al riquadro" disabled={zoom===1} onClick={()=>setZoom(1)}>1:1</button></div>
    {props.onDiscard&&props.hasUnsavedChanges&&<button type="button" disabled={props.readOnly} onClick={()=>{props.onDiscard?.();setVertex(null);setUndo([]);}}>Scarta modifiche</button>}
    {props.onSaveGeometry&&<button className={styles.saveAction} type="button" disabled={props.readOnly||!props.hasUnsavedChanges} onClick={props.onSaveGeometry}>Salva modifiche</button>}
    {selected&&!props.readOnly&&<div className={styles.vertexTools} role="group" aria-label="Correzione del vano selezionato">
     {selected.holes.length>0&&<label>Contorno<select aria-label="Contorno" value={ringIndex} onChange={e=>{setRingIndex(Number(e.target.value));setVertex(null);setInsert(false);}}><option value={0}>Esterno</option>{selected.holes.map((_,i)=><option key={i} value={i+1}>Vuoto {i+1}</option>)}</select></label>}
     {ringIndex>0&&selected.holes[ringIndex-1]&&<button type="button" onClick={includeSelectedHole}>Includi area nel vano</button>}
     <button type="button" aria-pressed={insert} onClick={()=>setInsert(v=>!v)}>Aggiungi punto su un lato</button>
     <button type="button" disabled={vertex===null||ring.length<=3} onClick={remove}>Elimina punto</button>
     <button type="button" disabled={!undo.length} onClick={()=>{const previous=undo.at(-1);if(previous){props.onChange(previous.view,previous.shape);setUndo(u=>u.slice(0,-1));setVertex(null);}}}>Annulla modifica</button>
    </div>}
   </div>
   <p className={styles.editHint}>{selected?<><strong>{selected.label}</strong> · {insert?'Fai clic sul contorno per aggiungere un punto.':props.hasUnsavedChanges?'Modifiche da salvare.':(props.readOnly?'Solo consultazione.':ringIndex>0?'Modifica i punti del vuoto o includi tutta l’area nel vano.':'Trascina i punti, oppure selezionali con Tab e spostali con le frecce.')}</>:(props.readOnly?'Seleziona un vano per consultarlo.':'Tocca un vano per modificarlo.')} Zoom con Ctrl + rotellina.</p>
  </>}
  <div className={styles.controls} hidden={!!props.simple||(!!props.readOnly&&!!props.drawingOnly)}>
   {shapes.length>0&&<label>Geometria<select aria-label="Geometria" value={selected?.id||''} onChange={e=>{setRemoveId(null);setSelection(e.target.value);setRingIndex(0);setVertex(null);}}>{shapes.map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></label>}
   {selected&&selected.holes.length>0&&<label>Contorno<select aria-label="Contorno" value={ringIndex} onChange={e=>{setRingIndex(Number(e.target.value));setVertex(null);setInsert(false);}}><option value={0}>Esterno</option>{selected.holes.map((_,i)=><option key={i} value={i+1}>Vuoto {i+1}</option>)}</select></label>}
   <label><input type="checkbox" checked={showLines} onChange={e=>setShowLines(e.target.checked)}/> Mostra contorni</label>
   <label>Zoom<input aria-label="Zoom" type="range" min="1" max={MAX_PLAN_ZOOM} step=".25" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><output>{Math.round(zoom*100)}%</output><button type="button" disabled={zoom===1} onClick={()=>setZoom(1)}>Adatta al riquadro</button>
   {!props.readOnly&&view==='rooms'&&selected&&props.onRemoveRoom&&<button type="button" onClick={()=>setRemoveId(selected.id)}>Elimina vano selezionato</button>}
   {!props.readOnly&&<><button type="button" disabled={!selected} aria-pressed={insert} onClick={()=>setInsert(v=>!v)}>Aggiungi punto su un lato</button><button type="button" disabled={vertex===null||ring.length<=3} onClick={remove}>Elimina punto</button><button type="button" disabled={!undo.length} onClick={()=>{const previous=undo.at(-1);if(previous){props.onChange(previous.view,previous.shape);setUndo(u=>u.slice(0,-1));setVertex(null);}}}>Annulla modifica</button></>}
  </div>
  {!props.readOnly&&selected&&removeId===selected.id&&<div role="group" aria-label="Conferma eliminazione vano"><p>Eliminare {selected.label} dalla mappa? Il computo va verificato di nuovo.</p><button type="button" onClick={()=>{setRemoveId(null);props.onRemoveRoom?.(selected);}}>Conferma eliminazione</button><button type="button" onClick={()=>setRemoveId(null)}>Annulla eliminazione</button></div>}
  <div ref={scrollRef} className={props.simple?styles.scroll+' '+styles.simpleScroll:styles.scroll}><svg ref={mapRef} role="img" aria-label={props.mapLabel??(view==='rooms'?'Contorni dei singoli vani':'Perimetro lordo commerciale')} viewBox={`0 0 ${props.width} ${props.height}`} style={{width:props.simple?`min(${zoom*100}%, ${zoom*65*props.width/props.height}vh)`:`${zoom*100}%`}}
   onPointerMove={moveVertex} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}>
   <image href={props.sourceUrl} x="0" y="0" width={props.width} height={props.height}/>
   {showLines&&props.contextShapes?.map(s=><path key={'context-'+s.id} data-testid={`context-${s.id}`} d={path(s)} fill="none" stroke="#7d8f8c" strokeDasharray="5 4" strokeWidth={Math.max(props.width/1200,1)} pointerEvents="none"/>)}
   {showLines&&shapes.map(s=><path key={s.id} data-testid={`shape-${s.id}`} d={path(s)} fill={props.excludedCandidateIds?.includes(s.id)?'none':props.candidateIds?.includes(s.id)||props.warnIds?.includes(s.id)?'rgba(255,155,0,.2)':'rgba(0,125,154,.08)'} fillRule="evenodd" strokeDasharray={props.excludedCandidateIds?.includes(s.id)?'6 4':undefined} stroke={props.excludedCandidateIds?.includes(s.id)?'#87948f':props.candidateIds?.includes(s.id)||props.warnIds?.includes(s.id)?'#b76b00':s.id===selected?.id?'#006d80':'#c73572'} strokeWidth={Math.max(props.width/800,1)} role={props.simple?'button':undefined} aria-label={props.simple?'Seleziona vano '+s.label:undefined} tabIndex={props.simple?0:undefined} onClick={()=>selectShape(s.id)} onKeyDown={e=>{if(props.simple&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectShape(s.id);}}}/>)}
   {showLines&&selected&&!props.readOnly&&insert&&ring.map(([x,y],i)=>{
    const [nextX,nextY]=ring[(i+1)%ring.length]!;
    return <line key={i} role="button" aria-label={`Inserisci punto sul lato ${i+1}`} tabIndex={0}
     x1={x} y1={y} x2={nextX} y2={nextY} className={styles.insertEdge}
     strokeWidth="14" vectorEffect="non-scaling-stroke" pointerEvents="stroke"
     onClick={event=>add(i,event.detail===0?undefined:{x:event.clientX,y:event.clientY})}
     onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();add(i);}}}/>;
   })}
   {showLines&&selected&&!props.readOnly&&ring.map((p,i)=><g key={i}>
    <circle role="button" aria-label={`Vertice ${i+1}`} tabIndex={0} cx={p[0]} cy={p[1]} r={hitRadius} fill="transparent" pointerEvents={insert?"none":"fill"} style={{touchAction:'none',cursor:'grab'}} onPointerDown={event=>startDrag(event,i)} onClick={event=>{if(event.detail===0)setVertex(i);}} onKeyDown={e=>{const step=Math.max(props.width,props.height)/(e.shiftKey?60:600),moves:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};if(e.key==='Enter')setVertex(i);else if(moves[e.key]){e.preventDefault();nudge(i,...moves[e.key]!);}else if((e.key==='Delete'||e.key==='Backspace')&&ring.length>3){e.preventDefault();setVertex(i);const next=structuredClone(selected),points=[next.points,...next.holes][ringIndex]||next.points;points.splice(i,1);change(next);setVertex(null);}}}/>
    <circle aria-hidden="true" cx={p[0]} cy={p[1]} r=".1" fill="none" stroke={vertex===i?'#b45b00':'#006d80'} strokeWidth="5" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
   </g>)}
   {highlighted&&<path data-testid="focus-outline" d={path(highlighted)} fill="none" stroke="#a34c06" strokeWidth="3" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
   {marker&&<circle data-testid="focus-marker" aria-hidden="true" cx={marker[0]} cy={marker[1]} r=".1" fill="none" stroke="#d14900" strokeWidth="26" strokeOpacity=".55" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
  </svg></div>
  {!props.drawingOnly&&!props.simple&&!(props.hideRoomSummary&&view==='rooms')&&<><PlanSurfaceSummary view={view} rooms={props.rooms.filter(r=>!props.excludedCandidateIds?.includes(r.id))} configuration={props.configuration} measurement={props.measurement} measurementsOutdated={props.measurementsOutdated} onSelect={id=>{if(!shapes.some(s=>s.id===id))setView('rooms');setSelection(id);setRingIndex(0);setVertex(null);setInsert(false);}}/>
  <p className={styles.note}>Conferma scala, perimetro e regole sui muri prima del computo. Il risultato è una misura sul documento, non un rilievo certificato.</p></>}
 </section>;
}
