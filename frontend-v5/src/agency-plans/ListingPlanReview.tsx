import {useEffect,useMemo,useRef,useState,type MouseEvent} from 'react';
import {MAX_PLAN_ZOOM,usePlanZoom} from '../components/usePlanZoom';
import type {ListingAlignment,ListingDetails,ListingOpening,ListingWallRef} from './api';
import type {PlanShape,Point} from './PlanMeasurementView';
import {alignListingWall,listingDrawing} from './listingGeometry';
import {detectListingOpenings,distinctOpenings} from './listingOpeningDetection';
import styles from './practice-plan.module.css';

type ReviewRow=ListingOpening&{confirmed:boolean};
type Draft=Omit<ListingDetails,'geometryRevision'>;
type Props={
 sourceUrl:string;width:number;height:number;rooms:PlanShape[];saved?:ListingDetails;
 hints?:ListingOpening[];disabled:boolean;onClose:()=>void;onApply:(details:Draft)=>void;
};

export function ListingPlanReview(p:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const current=dialog.current;if(current&&!current.open){if(typeof current.showModal==='function')current.showModal();else current.setAttribute('open','');}},[]);
 const [rows,setRows]=useState<ReviewRow[]>(()=>p.saved?.openings.map(item=>({...item,confirmed:true}))??[]);
 const [alignments,setAlignments]=useState<ListingAlignment[]>(p.saved?.alignments??[]);
 const [active,setActive]=useState<number|null>(null);
 const [mode,setMode]=useState<'opening'|'wall'|'browse'>('browse');
 const [kind,setKind]=useState<ListingOpening['kind']>('door');
 const [start,setStart]=useState<Point|null>(null);
 const [target,setTarget]=useState<ListingWallRef|null>(null);
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const {zoom,setZoom,scrollRef,mapRef}=usePlanZoom({requireControl:true});
 const drawing=useMemo(()=>listingDrawing(p.rooms,alignments),[p.rooms,alignments]);
 const pending=rows.filter(row=>!row.confirmed).length;
 const points=p.rooms.flatMap(room=>room.points);
 const xs=points.map(([x])=>x),ys=points.map(([,y])=>y);
 const padding=Math.max(p.width,p.height)*.025;
 const left=Math.max(0,Math.min(...xs)-padding),top=Math.max(0,Math.min(...ys)-padding);
 const right=Math.min(p.width,Math.max(...xs)+padding),bottom=Math.min(p.height,Math.max(...ys)+padding);
 const viewBox=points.length?`${left} ${top} ${right-left} ${bottom-top}`:`0 0 ${p.width} ${p.height}`;

 async function detect(){
  setWorking(true);setNotice('');
  try{
   const candidates=await detectListingOpenings(p.sourceUrl,listingDrawing(p.rooms),p.hints??[]);
   setRows(current=>{
    const merged=distinctOpenings([...current,...candidates]);
    return [...current,...merged.filter(item=>!current.includes(item as ReviewRow)).map(item=>({...item,confirmed:false}))];
   });
   setNotice(candidates.length?`${candidates.length} proposte da confrontare con l’originale.`:'Nessuna proposta trovata. Puoi segnare le aperture sulla pianta.');
  }catch{setNotice('Lettura automatica non riuscita. Puoi segnare le aperture sulla pianta.');}
  finally{setWorking(false);}
 }
 function edit(index:number|null){
  setActive(index);setStart(null);setMode('opening');setNotice('');
  if(index!==null)setKind(rows[index]!.kind);
 }
 function mark(event:MouseEvent<SVGSVGElement>){
  if(mode!=='opening'||p.disabled)return;
  const matrix=event.currentTarget.getScreenCTM();
  if(!matrix)return;
  const position=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  const point:Point=[Math.max(0,Math.min(p.width,position.x)),Math.max(0,Math.min(p.height,position.y))];
  if(!start){setStart(point);return;}
  if(Math.hypot(point[0]-start[0],point[1]-start[1])<2)return;
  const item:ReviewRow={kind,start,end:point,confirmed:true};
  setRows(current=>active===null?[...current,item]:current.map((row,i)=>i===active?item:row));
  setStart(null);setActive(null);setMode('browse');
 }
 function selectWall(wall:ListingWallRef){
  if(!target){setTarget(wall);return;}
  if(target.roomId===wall.roomId&&target.start===wall.start){setTarget(null);return;}
  const alignment={target,reference:wall};
  if(!alignListingWall(drawing,alignment)){
   setNotice('Questo allineamento interferisce con un altro contorno. Scegli un riferimento diverso.');
   return;
  }
  setAlignments(current=>[...current,alignment]);setTarget(null);setMode('browse');
  setNotice('Parete allineata nella pianta per annuncio.');
 }
 const setRow=(i:number,patch:Partial<ReviewRow>)=>setRows(current=>current.map((row,index)=>index===i?{...row,...patch}:row));
 return <dialog className={`${styles.panel} ${styles.builderDialog}`} ref={dialog} aria-label="Porte, finestre e pareti" onCancel={event=>{event.preventDefault();p.onClose();}}>
  <h3>Porte, finestre e pareti</h3>
  <p>Controlla sull’originale le aperture da mostrare nell’annuncio. Le pareti colorate indicano i lati selezionabili quando attivi l’allineamento.</p>
  <div className={styles.row}>
   <button type="button" disabled={working||p.disabled} onClick={()=>void detect()}>{working?'Ricerca in corso…':'Cerca porte e finestre'}</button>
   <button type="button" disabled={p.disabled} aria-pressed={mode==='opening'} onClick={()=>edit(null)}>Aggiungi apertura</button>
   <button type="button" disabled={p.disabled} aria-pressed={mode==='wall'} onClick={()=>{setMode(mode==='wall'?'browse':'wall');setTarget(null);setStart(null);setNotice('');}}>Allinea parete</button>
   <button type="button" disabled={!alignments.length||p.disabled} onClick={()=>{setTarget(null);setAlignments(current=>current.slice(0,-1));}}>Annulla ultimo allineamento</button>
  </div>
  {mode==='opening'&&<label>Tipo di apertura<select value={kind} onChange={event=>setKind(event.target.value as ListingOpening['kind'])}><option value="door">Porta</option><option value="window">Finestra</option></select></label>}
  {mode==='opening'&&<p>{start?'Fai clic sul secondo estremo.':'Fai clic sul primo estremo dell’apertura.'}</p>}
  {pending>0&&<p>Nell’immagine compariranno solo le aperture confermate.</p>}
  {mode==='wall'&&<p>{target?'Scegli la parete di riferimento.':'Scegli il lato da allineare, poi il riferimento.'}</p>}
  {notice&&<p role="status">{notice}</p>}
  <label>Zoom originale<input type="range" min="1" max={MAX_PLAN_ZOOM} step=".25" value={zoom} onChange={event=>setZoom(Number(event.target.value))}/></label>
  <div ref={scrollRef} className={styles.builderScroll}><svg ref={mapRef} className={styles.builder} style={{width:`${zoom*100}%`}} viewBox={viewBox} aria-label="Originale con aperture e pareti" onClick={mark}>
   <image href={p.sourceUrl} width={p.width} height={p.height}/>
   {mode==='wall'&&drawing.flatMap(room=>room.points.map((point,i)=>{
    const end=room.points[(i+1)%room.points.length]!, wall={roomId:room.id,start:point,end};
    return <line key={`${room.id}:${i}`} x1={point[0]} y1={point[1]} x2={end[0]} y2={end[1]}
     role="button" tabIndex={0} aria-label={`Parete ${room.label} ${i+1}`}
     stroke={target?.start===point?'#df7c00':'#05829a99'} strokeWidth="9" vectorEffect="non-scaling-stroke"
     onClick={()=>selectWall(wall)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectWall(wall);}}}/>;
   }))}
   {rows.map((row,i)=><g key={i} pointerEvents="none">
    <line x1={row.start[0]} y1={row.start[1]} x2={row.end[0]} y2={row.end[1]}
     stroke={i===active?'#b54900':row.confirmed?'#007e66':'#e58400'} strokeWidth="5" vectorEffect="non-scaling-stroke"/>
    <text x={(row.start[0]+row.end[0])/2} y={(row.start[1]+row.end[1])/2-8}
     textAnchor="middle" fontSize={Math.max(p.width,p.height)/65} fill="#263535" stroke="white" strokeWidth="4" paintOrder="stroke">{i+1}</text>
   </g>)}
   {start&&<circle cx={start[0]} cy={start[1]} r={Math.max(p.width,p.height)/240} fill="#b54900" pointerEvents="none"/>}
  </svg></div>
  <p>{pending} da verificare · {rows.length-pending} confermate · {alignments.length} allineamenti</p>
  {!!rows.length&&<ol>{rows.map((row,i)=><li key={i}>
   <label>{`Apertura ${i+1}`}<select value={row.kind} disabled={p.disabled} onChange={event=>setRow(i,{kind:event.target.value as ListingOpening['kind']})}><option value="door">Porta</option><option value="window">Finestra</option></select></label>
   <span>{row.confirmed?'Confermata':'Da verificare'}</span>
   {!row.confirmed&&<button type="button" disabled={p.disabled} onClick={()=>setRow(i,{confirmed:true})}>Conferma</button>}
   <button type="button" disabled={p.disabled} onClick={()=>edit(i)}>Correggi estremi</button>
   <button type="button" disabled={p.disabled} onClick={()=>{setRows(current=>current.filter((_,index)=>index!==i));setMode('browse');setActive(null);setStart(null);}}>Scarta</button>
  </li>)}</ol>}
  <div className={styles.roomActions}>
   <button type="button" onClick={p.onClose}>Chiudi</button>
   <button type="button" disabled={p.disabled||working||mode!=='browse'} onClick={()=>p.onApply({
    openings:rows.filter(row=>row.confirmed).map(({kind,start,end})=>({kind,start,end})),alignments,
   })}>Salva dettagli per l’annuncio</button>
  </div>
 </dialog>;
}
