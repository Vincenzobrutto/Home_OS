import { useState } from 'react';
import styles from './plan-measurement.module.css';
export type Point=[number,number];
export type PlanShape={id:string;label:string;points:Point[];holes:Point[][]};
export type PlanMeasurementProps={scopeKey:string;sourceUrl:string;width:number;height:number;rooms:PlanShape[];perimeter:PlanShape|null;issues:string[];onChange:(view:'rooms'|'perimeter',shape:PlanShape)=>void;onCreatePerimeter:()=>void;readOnly?:boolean};
const path=(s:PlanShape)=>[s.points,...s.holes].map(p=>'M'+p.map(v=>v.join(',')).join('L')+'Z').join('');
/** Controlled editor: source URL is supplied only after source authorization; no localStorage or live API side effects. */
export function PlanMeasurementView(props:PlanMeasurementProps){return <PlanMeasurementEditor key={props.scopeKey} {...props}/>;}
function PlanMeasurementEditor(props:PlanMeasurementProps){
 const [view,setView]=useState<'rooms'|'perimeter'>('rooms'),[selection,setSelection]=useState<string|null>(null),[ringIndex,setRingIndex]=useState(0),[showLines,setShowLines]=useState(true),[insert,setInsert]=useState(false),[vertex,setVertex]=useState<number|null>(null),[dragging,setDragging]=useState<number|null>(null),[zoom,setZoom]=useState(1),[undo,setUndo]=useState<Array<{view:'rooms'|'perimeter';shape:PlanShape}>>([]);
 const shapes=view==='rooms'?props.rooms:props.perimeter?[props.perimeter]:[],selected=shapes.find(s=>s.id===selection)||shapes[0],ring=selected?[selected.points,...selected.holes][ringIndex]||selected.points:[];
 function change(next:PlanShape,record=true){if(props.readOnly)return;if(record&&selected)setUndo(u=>[...u.slice(-49),{view,shape:structuredClone(selected)}]);props.onChange(view,next);}
 function mode(next:'rooms'|'perimeter'){setView(next);setSelection(null);setRingIndex(0);setVertex(null);setDragging(null);setInsert(false);}
 function add(edge:number){if(!selected||props.readOnly)return;const next=structuredClone(selected),p=[next.points,...next.holes][ringIndex]||next.points,a=p[edge]!,b=p[(edge+1)%p.length]!;p.splice(edge+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);change(next);setVertex(edge+1);}
 function remove(){if(!selected||vertex===null||ring.length<=3||props.readOnly)return;const next=structuredClone(selected),p=[next.points,...next.holes][ringIndex]||next.points;p.splice(vertex,1);change(next);setVertex(null);}
 return <section className={styles.workspace} aria-label="Analisi della planimetria">
  <div className={styles.tabs} role="tablist" aria-label="Vista della planimetria">
   <button type="button" role="tab" aria-selected={view==='rooms'} onClick={()=>mode('rooms')}>Singoli vani</button>
   <button type="button" role="tab" aria-selected={view==='perimeter'} onClick={()=>mode('perimeter')}>Perimetro commerciale</button>
  </div>
  <p>{view==='rooms'?'Vani e pertinenze restano distinti. Le geometrie sono proposte da controllare.':'Il perimetro lordo comprende i muri interni: il dettaglio dei vani resta disponibile e non viene sommato di nuovo. Balconi e altre pertinenze si computano separatamente.'}</p>
  {props.issues.length>0&&<div role="status" className={styles.warning}><strong>Da verificare</strong><ul>{props.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></div>}
  {view==='perimeter'&&!props.perimeter&&<div className={styles.warning}><p>Il perimetro lordo non è ancora disponibile. La somma degli interni non lo sostituisce.</p><button type="button" disabled={props.readOnly} onClick={props.onCreatePerimeter}>Definisci perimetro</button></div>}
  <div className={styles.controls}>
   {shapes.length>0&&<label>Geometria<select aria-label="Geometria" value={selected?.id||''} onChange={e=>{setSelection(e.target.value);setRingIndex(0);setVertex(null);}}>{shapes.map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></label>}
   {selected&&selected.holes.length>0&&<label>Contorno<select aria-label="Contorno" value={ringIndex} onChange={e=>{setRingIndex(Number(e.target.value));setVertex(null);}}><option value={0}>Esterno</option>{selected.holes.map((_,i)=><option key={i} value={i+1}>Vuoto {i+1}</option>)}</select></label>}
   <label><input type="checkbox" checked={showLines} onChange={e=>setShowLines(e.target.checked)}/> Mostra contorni</label>
   <label>Zoom<input aria-label="Zoom" type="range" min="1" max="3" step=".25" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
   {!props.readOnly&&<><button type="button" disabled={!selected} aria-pressed={insert} onClick={()=>setInsert(v=>!v)}>Aggiungi punto su un lato</button><button type="button" disabled={vertex===null||ring.length<=3} onClick={remove}>Elimina punto</button><button type="button" disabled={!undo.length} onClick={()=>{const previous=undo.at(-1);if(previous){props.onChange(previous.view,previous.shape);setUndo(u=>u.slice(0,-1));setVertex(null);}}}>Annulla modifica</button></>}
  </div>
  <div className={styles.scroll}><svg role="img" aria-label={view==='rooms'?'Contorni dei singoli vani':'Perimetro lordo commerciale'} viewBox={`0 0 ${props.width} ${props.height}`} style={{width:`${zoom*100}%`}}
   onPointerMove={e=>{if(dragging===null||!selected||props.readOnly)return;const matrix=e.currentTarget.getScreenCTM();if(!matrix)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()),next=structuredClone(selected),points=[next.points,...next.holes][ringIndex]||next.points;points[dragging]=[Math.max(0,Math.min(props.width,p.x)),Math.max(0,Math.min(props.height,p.y))];change(next,false);}}
   onPointerUp={()=>setDragging(null)} onPointerCancel={()=>setDragging(null)}>
   <image href={props.sourceUrl} x="0" y="0" width={props.width} height={props.height}/>
   {showLines&&shapes.map(s=><path key={s.id} data-testid={`shape-${s.id}`} d={path(s)} fill="rgba(0,125,154,.08)" fillRule="evenodd" stroke={s.id===selected?.id?'#006d80':'#c73572'} strokeWidth={Math.max(props.width/800,1)} onClick={()=>{setSelection(s.id);setRingIndex(0);setVertex(null);}}/>)}
   {showLines&&selected&&!props.readOnly&&ring.map((p,i)=><g key={i}>
    {insert&&<circle role="button" aria-label={`Inserisci punto sul lato ${i+1}`} tabIndex={0} cx={(p[0]+ring[(i+1)%ring.length]![0])/2} cy={(p[1]+ring[(i+1)%ring.length]![1])/2} r={props.width/150} fill="#ffa620" onClick={()=>add(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();add(i);}}}/>}
    <circle role="button" aria-label={`Vertice ${i+1}`} tabIndex={0} cx={p[0]} cy={p[1]} r={props.width/200} fill={vertex===i?'#ffa620':'white'} stroke="#006d80" strokeWidth={props.width/800} onPointerDown={e=>{e.preventDefault();setVertex(i);setDragging(i);setUndo(u=>[...u.slice(-49),{view,shape:structuredClone(selected)}]);e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);}} onClick={()=>setVertex(i)} onKeyDown={e=>{if(e.key==='Enter')setVertex(i);}}/>
   </g>)}
  </svg></div>
  <p className={styles.note}>Conferma scala, perimetro e regole sui muri prima del computo. Il risultato è una misura sul documento, non un rilievo certificato.</p>
 </section>;
}
