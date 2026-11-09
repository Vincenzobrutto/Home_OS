import {useEffect,useLayoutEffect,useMemo,useRef,useState,type MouseEvent} from 'react';
import {MAX_PLAN_ZOOM,usePlanZoom} from '../components/usePlanZoom';
import type {ListingAlignment,ListingDetails,ListingOpening,ListingWallRef} from './api';
import type {PlanShape,Point} from './PlanMeasurementView';
import {alignListingWall,listingDrawing,suggestListingAlignments} from './listingGeometry';
import {detectListingOpenings,distinctOpenings} from './listingOpeningDetection';
import styles from './practice-plan.module.css';

type ReviewRow=ListingOpening&{confirmed:boolean};
type Draft=Omit<ListingDetails,'geometryRevision'>;
type Props={
 sourceUrl:string;width:number;height:number;rooms:PlanShape[];saved?:ListingDetails;
 hints?:ListingOpening[];disabled:boolean;onClose:()=>void;onApply:(details:Draft)=>void;
};
const center=({start,end}:ListingOpening|ListingWallRef):Point=>[(start[0]+end[0])/2,(start[1]+end[1])/2];

export function ListingPlanReview(p:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const current=dialog.current;if(current&&!current.open){if(typeof current.showModal==='function')current.showModal();else current.setAttribute('open','');}},[]);
 const [rows,setRows]=useState<ReviewRow[]>(()=>p.saved?.openings.map(item=>({...item,confirmed:true}))??[]);
 const [alignments,setAlignments]=useState<ListingAlignment[]>(p.saved?.alignments??[]);
 const [active,setActive]=useState(0);
 const [mode,setMode]=useState<'opening'|'wall'|'browse'>('browse');
 const [editing,setEditing]=useState(false);
 const [kind,setKind]=useState<ListingOpening['kind']>('door');
 const [start,setStart]=useState<Point|null>(null);
 const [target,setTarget]=useState<ListingWallRef|null>(null);
 const [choice,setChoice]=useState(0);
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const {zoom,setZoom,scrollRef,mapRef}=usePlanZoom({requireControl:true});
 const drawing=useMemo(()=>listingDrawing(p.rooms,alignments),[p.rooms,alignments]);
 const suggestions=useMemo(()=>target?suggestListingAlignments(drawing,target):[],[drawing,target]);
 const suggestion=suggestions[choice];
 const adjusted=useMemo(()=>suggestion?alignListingWall(drawing,suggestion):null,[drawing,suggestion]);
 const selected=rows[active];
 const pending=rows.filter(row=>!row.confirmed).length;
 const points=p.rooms.flatMap(room=>room.points);
 const xs=points.map(([x])=>x),ys=points.map(([,y])=>y);
 const padding=Math.max(p.width,p.height)*.025;
 const left=Math.max(0,Math.min(...xs)-padding),top=Math.max(0,Math.min(...ys)-padding);
 const right=Math.min(p.width,Math.max(...xs)+padding),bottom=Math.min(p.height,Math.max(...ys)+padding);
 const viewBox=points.length?`${left} ${top} ${right-left} ${bottom-top}`:`0 0 ${p.width} ${p.height}`;

 useLayoutEffect(()=>{
  const map=mapRef.current,viewport=scrollRef.current,subject=mode==='wall'?target:selected;
  if(!map||!viewport||!subject)return;
  const matrix=map.getScreenCTM?.();
  if(!matrix)return;
  const [x,y]=center(subject);
  const point=new DOMPoint(x,y).matrixTransform(matrix);
  const box=viewport.getBoundingClientRect();
  viewport.scrollLeft+=point.x-box.left-viewport.clientWidth/2;
  viewport.scrollTop+=point.y-box.top-viewport.clientHeight/2;
 },[mapRef,scrollRef,mode,target,selected]);

 function resetTool(next:'browse'|'wall'|'opening'){
  setMode(next);setStart(null);setTarget(null);setNotice('');
 }
 function show(index:number){
  setActive(index);resetTool('browse');
 }
 async function detect(){
  setWorking(true);setNotice('');
  try{
   const candidates=await detectListingOpenings(p.sourceUrl,listingDrawing(p.rooms),p.hints??[]);
   const additions=distinctOpenings([...rows,...candidates]).filter(item=>!rows.includes(item as ReviewRow));
   const next=[...rows,...additions.map(item=>({...item,confirmed:false}))].slice(0,100);
   const first=next.findIndex(row=>!row.confirmed);
   setRows(next);resetTool('browse');
   if(first>=0){setActive(first);setZoom(value=>Math.max(value,1.75));}
   setNotice(additions.length?'Controlla le proposte una alla volta sulla pianta.':'Nessuna nuova proposta. Puoi segnare un’apertura sulla pianta.');
  }catch{setNotice('Lettura automatica non riuscita. Puoi segnare le aperture sulla pianta.');}
  finally{setWorking(false);}
 }
 function edit(existing:boolean){
  setEditing(existing);resetTool('opening');
  if(existing&&selected)setKind(selected.kind);
 }
 function advance(next:ReviewRow[],from:number){
  setRows(next);resetTool('browse');
  const after=next.findIndex((row,i)=>i>=from&&!row.confirmed);
  const first=next.findIndex(row=>!row.confirmed);
  setActive(after>=0?after:first>=0?first:Math.max(0,Math.min(from,next.length-1)));
 }
 function confirm(){
  advance(rows.map((row,i)=>i===active?{...row,confirmed:true}:row),active+1);
 }
 function mark(event:MouseEvent<SVGSVGElement>){
  if(mode!=='opening'||p.disabled||(!editing&&rows.length>=100))return;
  const matrix=event.currentTarget.getScreenCTM();
  if(!matrix)return;
  const position=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  const point:Point=[Math.max(0,Math.min(p.width,position.x)),Math.max(0,Math.min(p.height,position.y))];
  if(!start){setStart(point);return;}
  if(Math.hypot(point[0]-start[0],point[1]-start[1])<2)return;
  const item:ReviewRow={kind,start,end:point,confirmed:true};
  if(editing)advance(rows.map((row,i)=>i===active?item:row),active+1);
  else {setRows([...rows,item]);show(rows.length);}
 }
 function selectWall(wall:ListingWallRef){
  setTarget(wall);setChoice(0);setNotice('');
 }
 function applyWall(){
  if(!suggestion||!adjusted||alignments.length>=60)return;
  setAlignments([...alignments,suggestion]);resetTool('wall');setNotice('Allineamento applicato alla pianta per annuncio.');
 }
 function guideLine(start:Point,end:Point,color:string,dashed=false){
  return <line x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} stroke={color}
   strokeWidth="5" vectorEffect="non-scaling-stroke" strokeDasharray={dashed?'7 5':undefined} pointerEvents="none"/>;
 }
 const adjustedRoom=adjusted?.find(room=>room.id===target?.roomId);
 const targetRoom=drawing.find(room=>room.id===target?.roomId);
 const edgeIndex=target&&targetRoom?targetRoom.points.indexOf(target.start):-1;

 return <dialog className={`${styles.panel} ${styles.builderDialog} ${styles.listingReviewDialog}`} ref={dialog} aria-label="Porte, finestre e pareti" onCancel={event=>{event.preventDefault();p.onClose();}}>
  <h3>Porte, finestre e pareti</h3>
  <div className={styles.listingReviewTools}>
   <button type="button" disabled={working||p.disabled} onClick={()=>void detect()}>{working?'Ricerca in corso…':'Cerca porte e finestre'}</button>
   <button type="button" disabled={working||p.disabled||rows.length>=100} aria-pressed={mode==='opening'&&!editing} onClick={()=>edit(false)}>Aggiungi apertura</button>
   <button type="button" disabled={working||p.disabled||alignments.length>=60} aria-pressed={mode==='wall'} onClick={()=>resetTool(mode==='wall'?'browse':'wall')}>Allinea parete</button>
   <label>Zoom <input aria-label="Zoom originale" type="range" min="1" max={MAX_PLAN_ZOOM} step=".25" value={zoom} onChange={event=>setZoom(Number(event.target.value))}/></label>
  </div>
  <div className={styles.listingReviewControls} aria-live="polite">
   {mode==='browse'&&selected&&<>
    <strong>Apertura {active+1} di {rows.length}</strong>
    {selected.confirmed&&<span>Confermata</span>}
    <label>Tipo <select value={selected.kind} disabled={p.disabled||working} onChange={event=>{const type=event.target.value as ListingOpening['kind'];setRows(rows.map((row,i)=>i===active?{...row,kind:type}:row));}}><option value="door">Porta</option><option value="window">Finestra</option></select></label>
    {!selected.confirmed&&<button type="button" disabled={p.disabled||working} onClick={confirm}>Conferma</button>}
    <button type="button" disabled={p.disabled||working} onClick={()=>edit(true)}>Modifica estremi</button>
    <button type="button" disabled={p.disabled||working} onClick={()=>advance(rows.filter((_,i)=>i!==active),active)}>Scarta</button>
    <button type="button" aria-label="Apertura precedente" disabled={active===0||working} onClick={()=>show(active-1)}>←</button>
    <button type="button" aria-label="Apertura successiva" disabled={active>=rows.length-1||working} onClick={()=>show(active+1)}>→</button>
   </>}
   {mode==='opening'&&<>
    <label>Tipo <select value={kind} onChange={event=>setKind(event.target.value as ListingOpening['kind'])}><option value="door">Porta</option><option value="window">Finestra</option></select></label>
    <span>{start?'Fai clic sul secondo estremo.':'Fai clic sul primo estremo sulla pianta.'}</span>
    <button type="button" onClick={()=>resetTool('browse')}>Annulla</button>
   </>}
   {mode==='wall'&&<>
    <span>{suggestion?'Arancione: lato attuale · tratteggio: riferimento · verde: proposta.':target?'Per questo lato non ho trovato un riferimento vicino e compatibile.':'Seleziona il lato da correggere sulla pianta.'}</span>
    {suggestion&&<button type="button" disabled={p.disabled} onClick={applyWall}>Applica allineamento</button>}
    {suggestions.length>1&&<button type="button" onClick={()=>setChoice((choice+1)%suggestions.length)}>Altro riferimento</button>}
    {alignments.length>0&&<button type="button" disabled={p.disabled} onClick={()=>{setTarget(null);setAlignments(alignments.slice(0,-1));}}>Annulla ultimo allineamento</button>}
   </>}
   {notice&&<span role="status">{notice}</span>}
  </div>
  <div ref={scrollRef} className={styles.listingReviewMap}><svg ref={mapRef} className={styles.builder} style={{width:`${zoom*100}%`}} viewBox={viewBox} aria-label="Originale con aperture e pareti" onClick={mark}>
   <image href={p.sourceUrl} width={p.width} height={p.height}/>
   {mode==='wall'&&drawing.flatMap(room=>room.points.map((point,i)=>{
    const end=room.points[(i+1)%room.points.length]!,wall={roomId:room.id,start:point,end};
    return <line key={`${room.id}:${i}`} x1={point[0]} y1={point[1]} x2={end[0]} y2={end[1]}
     role="button" tabIndex={0} aria-label={`Parete ${room.label} ${i+1}`}
     stroke="#05829a88" strokeWidth="11" vectorEffect="non-scaling-stroke"
     onClick={()=>selectWall(wall)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectWall(wall);}}}/>;
   }))}
   {mode==='wall'&&target&&guideLine(target.start,target.end,'#df7c00')}
   {mode==='wall'&&suggestion&&guideLine(suggestion.reference.start,suggestion.reference.end,'#005c76',true)}
   {mode==='wall'&&adjustedRoom&&edgeIndex>=0&&guideLine(adjustedRoom.points[edgeIndex]!,adjustedRoom.points[(edgeIndex+1)%adjustedRoom.points.length]!,'#007e55')}
   {mode!=='wall'&&selected&&(mode==='browse'||editing)&&guideLine(selected.start,selected.end,selected.confirmed?'#007e66':'#e58400')}
   {start&&<circle cx={start[0]} cy={start[1]} r={Math.max(p.width,p.height)/240} fill="#b54900" pointerEvents="none"/>}
  </svg></div>
  <div className={styles.listingReviewFooter}>
   <span>{pending} da verificare · {rows.length-pending} confermate · {alignments.length} allineamenti</span>
   <button type="button" onClick={p.onClose}>Chiudi</button>
   <button type="button" disabled={p.disabled||working||mode==='opening'} onClick={()=>p.onApply({
    openings:rows.filter(row=>row.confirmed).map(({kind,start,end})=>({kind,start,end})),alignments,
   })}>Salva dettagli per l’annuncio</button>
  </div>
 </dialog>;
}
