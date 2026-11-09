import {useEffect,useMemo,useRef,useState,type KeyboardEvent,type MouseEvent,type PointerEvent} from 'react';
import {MAX_PLAN_ZOOM,usePlanZoom} from '../components/usePlanZoom';
import type {ListingDetails,ListingOpening} from './api';
import type {PlanShape,Point} from './PlanMeasurementView';
import {carryListingOpening,changeListingVertex,listingDrawing,listingIllustration,listingOpeningOnDrawing,listingWalls,placeListingOpening} from './listingGeometry';
import {detectListingOpenings,distinctOpenings} from './listingOpeningDetection';
import {listingRoomFill} from './listingStyle';
import styles from './practice-plan.module.css';

type Draft=Omit<ListingDetails,'geometryRevision'>;
type Row={opening:ListingOpening;confirmed:boolean};
type Subject={room:string;vertex:number}|{row:number;part:'body'|'start'|'end'};
type Drag={id:number;origin:Point;point:Point;subject:Subject};
type Props={sourceUrl:string;width:number;height:number;rooms:PlanShape[];saved?:ListingDetails;
 hints?:ListingOpening[];disabled:boolean;onClose:()=>void;onApply:(details:Draft)=>void};
const mid=(a:Point,b:Point):Point=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const length=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const path=(room:PlanShape)=>[room.points,...room.holes].map(ring=>'M '+ring.map(point=>point.join(' ')).join(' L ')+' Z').join(' ');

export function ListingPlanReview(p:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=dialog.current;if(el&&!el.open){if(typeof el.showModal==='function')el.showModal();else el.setAttribute('open','');}},[]);
 const alignments=p.saved?.alignments;
 const [contours,setContours]=useState(p.saved?.contours??[]);
 const [rows,setRows]=useState<Row[]>(()=>p.saved?.openings.map(opening=>({opening,confirmed:true}))??[]);
 const [roomId,setRoom]=useState('');
 const [selected,setSelected]=useState(-1);
 const [tool,setTool]=useState<'select'|ListingOpening['kind']>('select');
 const [original,setOriginal]=useState(false);
 const [start,setStart]=useState<Point|null>(null);
 const [drag,setDrag]=useState<Drag|null>(null);
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const {zoom,setZoom,scrollRef,mapRef}=usePlanZoom({requireControl:true});
 const drawing=useMemo(()=>listingIllustration(p.rooms,{alignments:alignments??[],contours}),[p.rooms,alignments,contours]);
 const walls=useMemo(()=>listingWalls(drawing),[drawing]);
 const xs=p.rooms.flatMap(room=>room.points.map(([x])=>x)),ys=p.rooms.flatMap(room=>room.points.map(([,y])=>y));
 const span=Math.max(1,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 const padding=span*.07;
 const left=xs.length?Math.max(0,Math.min(...xs)-padding):0,top=ys.length?Math.max(0,Math.min(...ys)-padding):0;
 const right=xs.length?Math.min(p.width,Math.max(...xs)+padding):p.width,bottom=ys.length?Math.min(p.height,Math.max(...ys)+padding):p.height;
 const activeRoom=drawing.find(room=>room.id===roomId),active=rows[selected];
 const pending=rows.flatMap((row,i)=>row.confirmed?[]:[i]);
 const busy=p.disabled||working;
 const shownOpening=(row:Row)=>listingOpeningOnDrawing(row.opening,walls,span);
 function clamp(x:number,y:number):Point{return [Math.max(left,Math.min(right,x)),Math.max(top,Math.min(bottom,y))];}
 function position(event:MouseEvent|PointerEvent){
  const matrix=mapRef.current?.getScreenCTM?.();
  if(!matrix)return null;
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  return clamp(point.x,point.y);
 }
 function chooseOpening(index:number){setSelected(index);setRoom('');setNotice('');}
 function focusOpening(index:number){
  chooseOpening(index);
  const matrix=mapRef.current?.getScreenCTM?.(),viewport=scrollRef.current,row=rows[index];
  if(!matrix||!viewport||!row)return;
  const {start,end}=shownOpening(row),screen=new DOMPoint(...mid(start,end)).matrixTransform(matrix),box=viewport.getBoundingClientRect();
  viewport.scrollLeft+=screen.x-box.left-viewport.clientWidth/2;
  viewport.scrollTop+=screen.y-box.top-viewport.clientHeight/2;
 }
 async function detect(){
  setWorking(true);setNotice('');
  try{
   const candidates=await detectListingOpenings(p.sourceUrl,listingDrawing(p.rooms),p.hints??[]);
   const existing=rows.map(row=>row.opening);
   const additions=distinctOpenings([...existing,...candidates]).filter(item=>!existing.includes(item)).slice(0,100-rows.length);
   if(additions.length){
    setRows([...rows,...additions.map(opening=>({opening,confirmed:false}))]);
    setTool('select');setStart(null);chooseOpening(rows.length);setOriginal(true);
   }
   setNotice(additions.length?'Controlla le proposte sulla mappa.':'Nessuna nuova apertura proposta.');
  }catch{setNotice('Lettura automatica non riuscita. Puoi aggiungere le aperture sulla mappa.');}
  finally{setWorking(false);}
 }
 function writeOpening(index:number,opening:ListingOpening){
  setRows(current=>current.map((row,i)=>i===index?{...row,opening}:row));
 }
 function add(event:MouseEvent){
  if(busy||tool==='select'||rows.length>=100)return;
  const point=position(event);
  if(!point)return;
  if(!start){setStart(point);setNotice('');return;}
  const opening=placeListingOpening({kind:tool,start,end:point},walls,span*.018);
  if(!opening||length(opening.start,opening.end)<span*.002){setNotice('Scegli due punti distinti sullo stesso muro.');return;}
  setRows([...rows,{opening,confirmed:true}]);chooseOpening(rows.length);setTool('select');setStart(null);
 }
 function editedOpening(index:number,part:'body'|'start'|'end',point:Point){
  const row=rows[index];
  if(!row)return null;
  const opening=shownOpening(row);
  return part==='body'?placeListingOpening(opening,walls,span*.025,point):placeListingOpening({...opening,[part]:point},walls,span*.025);
 }
 function apply(subject:Subject,point:Point){
  if('room' in subject){
   const before=drawing.find(room=>room.id===subject.room),after=changeListingVertex(drawing,subject.room,subject.vertex,point);
   if(!before||!after){setNotice('Il punto incrocerebbe un altro contorno.');return;}
   const next=[...contours.filter(c=>c.id!==after.id),{id:after.id,geometry:{points:after.points,holes:after.holes}}];
   if(next.reduce((sum,{geometry})=>sum+geometry.points.length+geometry.holes.reduce((n,ring)=>n+ring.length,0),0)>4096){setNotice('Limite di punti modificabili raggiunto.');return;}
   setContours(next);
   setRows(rows.map(row=>{
    const drawn=shownOpening(row),moved=carryListingOpening(drawn,before,after);
    return moved===drawn?row:{...row,opening:moved};
   }));
  }else{
   const next=editedOpening(subject.row,subject.part,point);
   if(!next||length(next.start,next.end)<span*.002){setNotice('L’apertura deve rimanere su un muro.');return;}
   writeOpening(subject.row,next);
  }
  setNotice('');
 }
 function begin(event:PointerEvent<SVGElement>,subject:Subject){
  if(busy||tool!=='select'||event.button!==0)return;
  const point=position(event);
  if(!point)return;
  event.stopPropagation();
  if('row' in subject)chooseOpening(subject.row);
  mapRef.current?.setPointerCapture?.(event.pointerId);
  setDrag({id:event.pointerId,subject,origin:point,point});
 }
 function finish(event:PointerEvent){
  if(!drag||drag.id!==event.pointerId)return;
  const point=position(event);
  setDrag(null);
  if(point&&length(point,drag.origin)>.001)apply(drag.subject,point);
 }
 function arrow(event:KeyboardEvent<SVGElement>,point:Point,subject:Subject){
  const directions:Record<string,Point>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const direction=directions[event.key];
  if(!direction||busy)return;
  event.preventDefault();
  const step=Math.max(1,span/500)*(event.shiftKey?5:1);
  apply(subject,clamp(point[0]+step*direction[0],point[1]+step*direction[1]));
 }
 const draggedOpening=drag&&'row' in drag.subject?editedOpening(drag.subject.row,drag.subject.part,drag.point):null;
 const draggedRoom=drag&&'room' in drag.subject?changeListingVertex(drawing,drag.subject.room,drag.subject.vertex,drag.point):null;
 function handle(point:Point,label:string,subject:Subject){
  return <circle key={label} cx={point[0]} cy={point[1]} r={span/(190*zoom)} role="button" tabIndex={busy?-1:0} aria-label={label}
   className={styles.listingHandle} onPointerDown={e=>begin(e,subject)} onKeyDown={e=>arrow(e,point,subject)}/>;
 }
 function activate(event:KeyboardEvent<SVGElement>,select:()=>void){if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}}
 function chooseRoom(id:string){if(tool==='select'&&!busy){setRoom(id);setSelected(-1);setNotice('');}}
 function pickTool(next:typeof tool){setTool(next);setStart(null);setNotice('');if(next!=='select'){setRoom('');setSelected(-1);}}
 const shown=active?(draggedOpening??shownOpening(active)):null;
 return <dialog className={`${styles.panel} ${styles.builderDialog} ${styles.listingReviewDialog}`} ref={dialog} aria-label="Editor pianta per annuncio" onCancel={e=>{e.preventDefault();p.onClose();}}>
  <h3>Modifica pianta per l’annuncio</h3>
  <div className={styles.listingReviewTools}>
   <button type="button" disabled={busy} aria-pressed={tool==='select'} onClick={()=>pickTool('select')}>Seleziona</button>
   {(['door','window'] as const).map(kind=><button key={kind} type="button" disabled={busy||rows.length>=100} aria-pressed={tool===kind}
    onClick={()=>pickTool(kind)}>{kind==='door'?'Aggiungi porta':'Aggiungi finestra'}</button>)}
   <button type="button" disabled={busy} onClick={()=>void detect()}>{working?'Ricerca in corso…':'Cerca porte e finestre'}</button>
   <label><input type="checkbox" checked={original} onChange={e=>setOriginal(e.target.checked)}/> Mostra originale</label>
   <label>Zoom <input aria-label="Zoom pianta" type="range" min="1" max={MAX_PLAN_ZOOM} step=".25" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
  </div>
  <div className={styles.listingReviewControls} aria-live="polite">
   {tool!=='select'?<span>{start?'Fai clic sul secondo estremo sullo stesso muro.':'Fai clic sul primo estremo dell’apertura.'}</span>:active?<>
    <strong>{active.opening.kind==='door'?'Porta':'Finestra'} {selected+1} di {rows.length}</strong>
    <span>Trascina il simbolo per spostarlo o un estremo per ridimensionarlo.</span>
    {!active.confirmed&&<button type="button" disabled={busy} onClick={()=>setRows(rows.map((row,i)=>i===selected?{...row,confirmed:true}:row))}>Conferma</button>}
    <label>Tipo <select value={active.opening.kind} disabled={busy} onChange={e=>writeOpening(selected,{...active.opening,kind:e.target.value as ListingOpening['kind']})}><option value="door">Porta</option><option value="window">Finestra</option></select></label>
    <button type="button" disabled={busy} onClick={()=>{setRows(rows.filter((_,i)=>i!==selected));setSelected(-1);}}>Scarta</button>
   </>:<span>{activeRoom?activeRoom.label+' · Trascina i punti blu per spostare i muri.':'Seleziona un vano per spostare i suoi punti, oppure fai clic su un’apertura.'}</span>}
   {pending.length>0&&tool==='select'&&<button type="button" disabled={busy} onClick={()=>focusOpening(pending.find(i=>i>selected)??pending[0]!)}>Prossima da verificare · {pending.length}</button>}
   {notice&&<span role="status">{notice}</span>}
  </div>
  <div ref={scrollRef} className={styles.listingReviewMap}><svg ref={mapRef} className={styles.builder} style={{width:`${zoom*100}%`,height:`${zoom*100}%`}}
   viewBox={[left,top,right-left,bottom-top].join(' ')} aria-label="Pianta illustrativa modificabile" onClick={add}
   onPointerMove={e=>{if(drag?.id===e.pointerId){const point=position(e);if(point)setDrag({...drag,point});}}}
   onPointerUp={finish} onPointerCancel={()=>setDrag(null)} onLostPointerCapture={()=>setDrag(null)}>
   {original&&<image href={p.sourceUrl} width={p.width} height={p.height} pointerEvents="none"/>}
   {drawing.map(room=>{
    const shape=draggedRoom?.id===room.id?draggedRoom:room,isSelected=roomId===room.id;
    return <path key={room.id} d={path(shape)} fill={listingRoomFill(room)} fillRule="evenodd" fillOpacity={original ? .24 : 1}
     stroke={isSelected?'#00819a':'#253130'} strokeWidth={isSelected?3:2} vectorEffect="non-scaling-stroke"
     role="button" tabIndex={tool==='select'&&!busy?0:-1} aria-label={room.label+' · modifica muri'} aria-pressed={isSelected}
     onClick={()=>chooseRoom(room.id)} onKeyDown={e=>activate(e,()=>chooseRoom(room.id))}/>;
   })}
   {drawing.map(room=>{
    const xs=room.points.map(p=>p[0]),ys=room.points.map(p=>p[1]);
    return <text key={room.id} x={(Math.min(...xs)+Math.max(...xs))/2} y={(Math.min(...ys)+Math.max(...ys))/2}
     fontSize={span/45} textAnchor="middle" pointerEvents="none">{room.label}</text>;
   })}
   {tool==='select'&&rows.map((row,i)=>{
    const {start:a,end:b,kind}=selected===i&&draggedOpening?draggedOpening:shownOpening(row);
    const color=selected===i?'#007e81':row.confirmed?'#304e53':'#b36a00';
    const coords={x1:a[0],y1:a[1],x2:b[0],y2:b[1]};
    return <g key={i}>
     <line {...coords} stroke="white" strokeWidth="7" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
     <line {...coords} stroke={color} strokeWidth={kind==='window'?3:2} strokeDasharray={kind==='door'?'4 2':undefined} vectorEffect="non-scaling-stroke" pointerEvents="none"/>
     <line {...coords} stroke="transparent" strokeWidth="19" vectorEffect="non-scaling-stroke"
      className={styles.listingOpeningHit} role="button" tabIndex={busy?-1:0} aria-label={(kind==='door'?'Porta ':'Finestra ')+(i+1)}
      onPointerDown={e=>begin(e,{row:i,part:'body'})} onClick={()=>{if(!busy)chooseOpening(i);}}
      onKeyDown={e=>{activate(e,()=>chooseOpening(i));arrow(e,mid(a,b),{row:i,part:'body'});}}/>
    </g>;
   })}
   {tool==='select'&&activeRoom&&(draggedRoom??activeRoom).points.map((point,i)=>handle(point,`Punto ${i+1} · ${activeRoom.label}`,{room:activeRoom.id,vertex:i}))}
   {tool==='select'&&shown&&(['start','end'] as const).map((part,i)=>handle(shown[part],`Estremo ${i+1} dell’apertura`,{row:selected,part}))}
   {start&&<circle cx={start[0]} cy={start[1]} r={span/(190*zoom)} fill="#b54900" stroke="#b54900" strokeWidth="6" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
  </svg></div>
  <div className={styles.listingReviewFooter}>
   <span>{rows.length-pending.length} aperture confermate{pending.length>0?' · le proposte non confermate non compaiono nel PNG':''}</span>
   <button type="button" onClick={p.onClose}>Chiudi</button>
   <button type="button" disabled={busy||!!start||!!drag} onClick={()=>p.onApply({openings:rows.filter(row=>row.confirmed).map(row=>row.opening),alignments:alignments??[],contours})}>Salva dettagli per l’annuncio</button>
  </div>
 </dialog>;
}
