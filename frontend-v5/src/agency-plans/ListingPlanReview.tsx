import {useEffect,useMemo,useRef,useState,type KeyboardEvent,type MouseEvent,type PointerEvent} from 'react';
import {MAX_PLAN_ZOOM,usePlanZoom} from '../components/usePlanZoom';
import type {ListingDetails,ListingOpening,ListingPlanDraft} from './api';
import type {PlanShape,Point} from './PlanMeasurementView';
import {carryListingOpening,changeListingVertex,listingAlignmentGuides,listingDoorOpposite,listingDrawing,listingIllustration,listingOpeningOnDrawing,listingWalls,moveListingWall,placeListingOpening,placeScaledListingDoor,proposeSharedPlanWall,suggestInternalWallThickness} from './listingGeometry';
import {detectListingOpenings,distinctOpenings,readListingRaster} from './listingOpeningDetection';
import type {ScaleReference} from './scaleDetection';
import {listingRoomFill} from './listingStyle';
import styles from './practice-plan.module.css';

type Draft=ListingPlanDraft;
type Row={opening:ListingOpening;confirmed:boolean};
type Subject={room:string;vertex:number}|{room:string;edge:number}|{row:number;part:'body'|'start'|'end'};
type RoomSubject=Extract<Subject,{room:string}>;
type Drag={id:number;origin:Point;point:Point;unitsPerPixel:number;shift:boolean;subject:Subject};
type Props={editPlan?:boolean;saveError?:string;sourceUrl:string;width:number;height:number;rooms:PlanShape[];saved?:ListingDetails;
 metresPerPixel?:Point|null;scaleLabel?:string;hints?:ListingOpening[];disabled:boolean;onClose:()=>void;onApply:(details:Draft)=>void};
const mid=(a:Point,b:Point):Point=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const length=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const path=(room:PlanShape)=>[room.points,...room.holes].map(ring=>'M '+ring.map(point=>point.join(' ')).join(' L ')+' Z').join(' ');

export function ListingPlanReview(p:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=dialog.current;if(el&&!el.open){if(typeof el.showModal==='function')el.showModal();else el.setAttribute('open','');}},[]);
 const alignments=p.editPlan?undefined:p.saved?.alignments;
 const [contours,setContours]=useState(p.editPlan?[]:p.saved?.contours??[]);
 const [rows,setRows]=useState<Row[]>(()=>p.saved?.openings.map(opening=>({opening,confirmed:true}))??[]);
 const [roomId,setRoom]=useState('');
 const [selected,setSelected]=useState(-1);
 const [tool,setTool]=useState<'select'|'scale'|'wall'|ListingOpening['kind']>('select');
 const [referencePoints,setReferencePoints]=useState<Point[]>([]);
 const [referenceMetres,setReferenceMetres]=useState('');
 const [manualScale,setManualScale]=useState<Draft['scale']>();
 const [detectedScale,setDetectedScale]=useState<{metresPerPixel:Point|null;bar?:ScaleReference}|null>(null);
 const [manualDoor,setManualDoor]=useState(false);
 const [readingReference,setReadingReference]=useState(false);
 const [notice,setNotice]=useState('');
 const [wallProposal,setWallProposal]=useState<ReturnType<typeof proposeSharedPlanWall>>(null);
 const factor=manualScale?manualScale.metres/length(manualScale.start,manualScale.end):null;
 const doorScale:Point|null|undefined=factor?[factor,factor]:p.metresPerPixel??detectedScale?.metresPerPixel;
 const calibrating=tool==='scale';
 const realMetres=Number(referenceMetres.trim().replace(',','.'));
 const validReference=referencePoints.length===2&&realMetres>0&&realMetres<=1e6;
 const readingScale=tool==='door'&&!manualDoor&&!doorScale&&!detectedScale;
 useEffect(()=>{
  if(!readingScale&&!readingReference)return;
  const controller=new AbortController();
  void import('./detectPlanScale').then(({detectPlanScale})=>detectPlanScale(p.sourceUrl,controller.signal))
   .then(({bar,ambiguous})=>{
    if(controller.signal.aborted)return;
    if(readingReference){
     if(bar&&!ambiguous){
      setReferencePoints([bar.start,bar.end]);setReferenceMetres(String(bar.metres));
      setNotice('Barra da '+bar.metres+' m individuata. Controlla le due tacche sull’originale.');
     }else setNotice('Barra non riconosciuta con certezza. Puoi indicare le due tacche.');
     setReadingReference(false);
    }
    const factor=bar&&!ambiguous?bar.metres/Math.hypot(bar.end[0]-bar.start[0],bar.end[1]-bar.start[1]):0;
    setDetectedScale(Number.isFinite(factor)&&factor>0&&bar?{metresPerPixel:[factor,factor],bar}:{metresPerPixel:null});
   }).catch(()=>{
    if(!controller.signal.aborted){setDetectedScale({metresPerPixel:null});if(readingReference){setReadingReference(false);setNotice('Lettura non riuscita. Puoi indicare le due tacche.');}}
   });
  return()=>controller.abort();
 },[p.sourceUrl,readingScale,readingReference]);
 const [original,setOriginal]=useState(!!p.editPlan);
 const [ortho,setOrtho]=useState(false);
 const [start,setStart]=useState<Point|null>(null);
 const [drag,setDrag]=useState<Drag|null>(null);
 const isDragging=drag!==null;
 useEffect(()=>{
  if(!isDragging)return;
  function updateShift(event:globalThis.KeyboardEvent){
   if(event.key==='Shift')setDrag(current=>current&&{...current,shift:event.shiftKey});
  }
  function resetShift(){setDrag(current=>current&&{...current,shift:false});}
  window.addEventListener('keydown',updateShift);
  window.addEventListener('keyup',updateShift);
  window.addEventListener('blur',resetShift);
  return ()=>{
   window.removeEventListener('keydown',updateShift);
   window.removeEventListener('keyup',updateShift);
   window.removeEventListener('blur',resetShift);
  };
 },[isDragging]);
 const [working,setWorking]=useState(false);
 const {zoom,setZoom,scrollRef,mapRef}=usePlanZoom({requireControl:true});
 const baseline=useMemo(()=>p.editPlan?p.rooms:listingIllustration(p.rooms,p.saved),[p.editPlan,p.rooms,p.saved]);
 const drawing=useMemo(()=>{
  const edits=new Map(contours.map(c=>[c.id,c.geometry]));
  return baseline.map(room=>({...room,...edits.get(room.id)}));
 },[baseline,contours]);
 const walls=useMemo(()=>listingWalls(drawing),[drawing]);
 const xs=p.rooms.flatMap(room=>room.points.map(([x])=>x)),ys=p.rooms.flatMap(room=>room.points.map(([,y])=>y));
 const span=Math.max(1,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 const padding=span*.07;
 const left=xs.length?Math.max(0,Math.min(...xs)-padding):0,top=ys.length?Math.max(0,Math.min(...ys)-padding):0;
 const right=xs.length?Math.min(p.width,Math.max(...xs)+padding):p.width,bottom=ys.length?Math.min(p.height,Math.max(...ys)+padding):p.height;
 const activeRoom=drawing.find(room=>room.id===roomId),active=rows[selected];
 const pending=rows.flatMap((row,i)=>row.confirmed?[]:[i]);
 const busy=p.disabled||working||readingReference;
 const shownOpening=(row:Row)=>listingOpeningOnDrawing(row.opening,walls,span);
 function clamp(x:number,y:number):Point{return [Math.max(left,Math.min(right,x)),Math.max(top,Math.min(bottom,y))];}
 function position(event:MouseEvent|PointerEvent){
  const matrix=mapRef.current?.getScreenCTM?.();
  if(!matrix)return null;
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  return calibrating?[Math.max(0,Math.min(p.width,point.x)),Math.max(0,Math.min(p.height,point.y))] as Point:clamp(point.x,point.y);
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
  if(tool==='wall')return;
  setWorking(true);setNotice('');
  try{
   const candidates=await detectListingOpenings(p.sourceUrl,p.editPlan?drawing:listingDrawing(p.rooms),p.hints??[]);
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
  if(busy||readingScale||tool==='select'||tool==='wall')return;
  const point=position(event);
  if(!point)return;
  if(tool==='scale'){
   if(referencePoints.length===1&&length(referencePoints[0]!,point)<1){
    setNotice('Scegli un secondo punto distinto.');
    return;
   }
   setReferencePoints(referencePoints.length===1?[referencePoints[0]!,point]:[point]);
   setNotice('');
   return;
  }
  if(rows.length>=100)return;
  const scaled=tool==='door'&&!manualDoor&&doorScale;
  if(!scaled&&!start){setStart(point);setNotice('');return;}
  const opening=scaled?placeScaledListingDoor(point,walls,span*.018,scaled,drawing,span*.035)
   :start?placeListingOpening({kind:tool,start,end:point},walls,span*.018):null;
  if(!opening||(!scaled&&length(opening.start,opening.end)<span*.002)){
   setNotice(scaled?'Scegli un tratto di muro adatto alla porta.':'Scegli due punti distinti sullo stesso muro.');
   return;
  }
  setRows([...rows,{opening,confirmed:true}]);chooseOpening(rows.length);setTool('select');setStart(null);
 }
 function editedOpening(index:number,part:'body'|'start'|'end',point:Point){
  const row=rows[index];
  if(!row)return null;
  const opening=shownOpening(row);
  return part==='body'?placeListingOpening(opening,walls,span*.025,point):placeListingOpening({...opening,[part]:point},walls,span*.025);
 }
 function roomEdit(subject:RoomSubject,point:Point,origin:Point,snap=0){
  const delta:Point=[point[0]-origin[0],point[1]-origin[1]];
  if(Math.hypot(...delta)<.001)return null;
  const room=drawing.find(room=>room.id===subject.room);
  if(!room)return null;
  const after='edge' in subject
   ?moveListingWall(drawing,room.id,subject.edge,delta)
   :changeListingVertex(drawing,room.id,subject.vertex,clamp(
    room.points[subject.vertex]![0]+delta[0],room.points[subject.vertex]![1]+delta[1],
   ),snap);
  return after?.points.every(([x,y])=>x>=left&&x<=right&&y>=top&&y<=bottom)?after:null;
 }
 function snapDistance(unitsPerPixel:number,shift:boolean){
  return ortho||shift?12*unitsPerPixel:0;
 }
 function apply(subject:Subject,point:Point,origin:Point,snap=0){
  if('room' in subject){
   const before=drawing.find(room=>room.id===subject.room),after=roomEdit(subject,point,origin,snap);
   if(!before||!after){setNotice('Lo spostamento uscirebbe dalla mappa o incrocerebbe un contorno.');return;}
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
  const matrix=mapRef.current?.getScreenCTM?.();
  const scale=matrix?Math.hypot(matrix.a,matrix.b):0;
  setDrag({id:event.pointerId,subject,origin:point,point,unitsPerPixel:scale?1/scale:0,shift:event.shiftKey});
 }
 function finish(event:PointerEvent){
  if(!drag||drag.id!==event.pointerId)return;
  const point=position(event);
  setDrag(null);
  if(point&&length(point,drag.origin)>.001)apply(drag.subject,point,drag.origin,snapDistance(drag.unitsPerPixel,event.shiftKey));
 }
 function arrow(event:KeyboardEvent<SVGElement>,point:Point,subject:Subject){
  const directions:Record<string,Point>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const direction=directions[event.key];
  if(!direction||busy)return;
  event.preventDefault();
  const step=Math.max(1,span/500)*(event.shiftKey?5:1);
  apply(subject,clamp(point[0]+step*direction[0],point[1]+step*direction[1]),point);
 }
 const draggedOpening=drag&&'row' in drag.subject?editedOpening(drag.subject.row,drag.subject.part,drag.point):null;
 const draggedRoom=drag&&'room' in drag.subject
  ?roomEdit(drag.subject,drag.point,drag.origin,snapDistance(drag.unitsPerPixel,drag.shift)):null;
 const previewDrawing=draggedRoom?drawing.map(room=>room.id===draggedRoom.id?draggedRoom:room):drawing;
 const guides=drag&&'room' in drag.subject&&activeRoom&&draggedRoom
  ?listingAlignmentGuides(drawing,activeRoom,draggedRoom,drag.subject,2*drag.unitsPerPixel):[];
 function previewOpening(row:Row){
  const opening=shownOpening(row);
  return draggedRoom&&activeRoom?carryListingOpening(opening,activeRoom,draggedRoom):opening;
 }
 function handle(point:Point,label:string,subject:Subject){
  return <circle key={label} cx={point[0]} cy={point[1]} r={span/(190*zoom)} role="button" tabIndex={busy?-1:0} aria-label={label}
   className={styles.listingHandle} onPointerDown={e=>begin(e,subject)} onKeyDown={e=>arrow(e,point,subject)}/>;
 }
 function activate(event:KeyboardEvent<SVGElement>,select:()=>void){if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}}
 function chooseRoom(id:string){if(tool==='select'&&!busy){setRoom(id);setSelected(-1);setNotice('');}}
 function pickTool(next:typeof tool){
  if(wallProposal)return;
  if(next==='scale'){setReferencePoints([]);setReferenceMetres('');setZoom(1);}
  setManualDoor(false);setTool(next);setStart(null);setNotice('');if(next!=='select'&&next!=='wall'){setRoom('');setSelected(-1);}}
 function applyReference(){
  if(!validReference)return;
  setManualScale({mode:'manual',start:referencePoints[0]!,end:referencePoints[1]!,metres:realMetres});
  pickTool('door');
 }
 async function reviewWall(index:number){
  if(busy||wallProposal||!activeRoom)return;
  setWorking(true);setNotice('Cerco entrambi i bordi sul documento originale…');
  try{
   const proposal=proposeSharedPlanWall(drawing,activeRoom.id,index,await readListingRaster(p.sourceUrl));
   setWallProposal(proposal);
   setNotice(proposal?'':'Il documento non mostra una correzione affidabile per entrambi i vani. Prova un altro lato.');
  }catch{setNotice('Impossibile leggere i bordi dal documento originale.');}
  finally{setWorking(false);}
 }
 function acceptWall(){
  if(!wallProposal||busy)return;
  const changed=wallProposal.rooms;
  const next=[...contours.filter(c=>!changed.some(room=>room.id===c.id)),...changed.map(room=>({id:room.id,geometry:{points:room.points,holes:room.holes}}))];
  if(next.reduce((n,{geometry})=>n+geometry.points.length+geometry.holes.reduce((sum,ring)=>sum+ring.length,0),0)>4096){setNotice('Limite di punti modificabili raggiunto.');return;}
  setContours(next);
  setRows(rows.map(row=>{
   const opening=shownOpening(row);
   for(const after of changed){
    const carried=carryListingOpening(opening,drawing.find(room=>room.id===after.id)!,after);
    if(carried!==opening)return {...row,opening:carried};
   }
   return row;
  }));
  setWallProposal(null);
  setTool('select');
  setNotice('Correzione applicata alla bozza. Premi Salva modifiche alla planimetria per confermarla.');
 }
 function suggestWalls(){
  const suggestion=suggestInternalWallThickness(drawing);
  if(!suggestion){setNotice('Nessuna coppia di muri interni abbastanza simile da uniformare.');return;}
  const changed=suggestion.drawing.filter((room,i)=>room!==drawing[i]);
  if(changed.some(room=>room.points.some(([x,y])=>x<0||y<0||x>p.width||y>p.height)))return;
  const next=[...contours.filter(c=>!changed.some(room=>room.id===c.id)),...changed.map(room=>({id:room.id,geometry:{points:room.points,holes:room.holes}}))];
  if(next.reduce((n,{geometry})=>n+geometry.points.length+geometry.holes.reduce((sum,ring)=>sum+ring.length,0),0)>4096){setNotice('Limite di punti modificabili raggiunto.');return;}
  setContours(next);
  setRows(rows.map(row=>{
   const before=shownOpening(row);
   for(const after of changed){
    const moved=carryListingOpening(before,drawing.find(room=>room.id===after.id)!,after);
    if(moved!==before)return {...row,opening:moved};
   }
   return row;
  }));
  setNotice(suggestion.adjusted===1?'1 muro interno uniformato in anteprima. Salva per confermare.':suggestion.adjusted+' muri interni uniformati in anteprima. Salva per confermare.');
 }
 const automaticBar=!p.metresPerPixel?detectedScale?.bar:undefined;
 const scaleToSave=manualScale??(automaticBar?{mode:'bar' as const,start:automaticBar.start,end:automaticBar.end,metres:automaticBar.metres}:undefined);
 function saveDetails(){
  const explicitIds=new Set(contours.map(contour=>contour.id));
  const original=p.editPlan?[]:listingDrawing(p.rooms,alignments);
  const savedContours=p.editPlan?contours:drawing.flatMap(({id,points,holes},i)=>{
   const before=original[i];
   const geometry={points,holes};
   return explicitIds.has(id)||JSON.stringify(geometry)!==JSON.stringify({points:before?.points,holes:before?.holes})?[{id,geometry}]:[];
  });
  p.onApply({...(scaleToSave?{scale:scaleToSave}:{}),openings:rows.filter(row=>row.confirmed).map(row=>row.opening),alignments:alignments??[],contours:savedContours});
 }
 const shown=active?(draggedOpening??shownOpening(active)):null;
 return <dialog className={`${styles.panel} ${styles.builderDialog} ${styles.listingReviewDialog}`} ref={dialog} aria-label={p.editPlan?'Editor grafico della planimetria':'Editor pianta per annuncio'} onCancel={e=>{e.preventDefault();p.onClose();}}>
  <h3>{p.editPlan?'Modifica la planimetria':'Modifica pianta per l’annuncio'}</h3>
  {p.saveError&&<p role="alert">{p.saveError}</p>}
  <div className={styles.listingReviewTools}>
   <button type="button" disabled={busy||!!wallProposal} aria-pressed={tool==='select'} onClick={()=>pickTool('select')}>Seleziona</button>
   {(['door','window'] as const).map(kind=><button key={kind} type="button" disabled={busy||tool==='wall'||rows.length>=100} aria-pressed={tool===kind}
    onClick={()=>pickTool(kind)}>{kind==='door'?'Aggiungi porta':'Aggiungi finestra'}</button>)}
   <button type="button" disabled={busy||tool==='wall'||isDragging} aria-pressed={calibrating} onClick={()=>pickTool('scale')}>{doorScale?'Cambia scala':'Imposta scala'}</button>
   <button type="button" disabled={busy||tool==='wall'} onClick={()=>void detect()}>{working?'Ricerca in corso…':'Cerca porte e finestre'}</button>
   {p.editPlan?<button type="button" disabled={busy||!activeRoom||tool!=='select'||isDragging} onClick={()=>{setOriginal(true);pickTool('wall');}}>Verifica parete condivisa</button>:<button type="button" disabled={busy||tool!=='select'||isDragging} onClick={suggestWalls}>Uniforma muri interni</button>}
   <label><input type="checkbox" checked={ortho} disabled={busy||!!drag} onChange={e=>setOrtho(e.target.checked)}/> Orto <kbd>Shift</kbd></label>
   <label><input type="checkbox" checked={original} disabled={tool==='wall'} onChange={e=>setOriginal(e.target.checked)}/> Mostra originale</label>
   <label>Zoom <input aria-label="Zoom pianta" type="range" min="1" max={MAX_PLAN_ZOOM} step=".25" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
  </div>
  <div className={styles.listingReviewControls} aria-live="polite">
   {tool==='wall'?<>
    {wallProposal?<><strong>Proposta per {wallProposal.rooms.map(room=>room.label).join(' e ')}</strong>
     <span>Confronta i due bordi evidenziati con la tavola originale. Usa la proposta solo se seguono la parete.</span>
     <button type="button" disabled={busy} onClick={acceptWall}>Usa correzione</button>
    </>:<span>Seleziona il lato del vano {activeRoom?.label} lungo la parete da verificare.</span>}
    <button type="button" disabled={busy} onClick={()=>{setWallProposal(null);setTool('select');setNotice('');}}>{wallProposal?'Scarta proposta':'Annulla verifica'}</button>
   </>:calibrating?<>
    <span>{referencePoints.length===0?'Seleziona il primo punto sul documento originale.':referencePoints.length===1?'Seleziona il secondo punto.':'Indica la distanza reale tra i due punti.'}</span>
    {referencePoints.length===2&&<label>Distanza reale (m)
     <input type="text" inputMode="decimal" value={referenceMetres} onChange={e=>setReferenceMetres(e.target.value)}
      onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();applyReference();}}}/>
    </label>}
    <button type="button" disabled={busy||!validReference} onClick={applyReference}>Usa questa scala</button>
    <button type="button" disabled={busy} onClick={()=>{setNotice('');setReadingReference(true);}}>{readingReference?'Cerco la barra…':'Rileggi barra metrica'}</button>
    <button type="button" onClick={()=>{setReadingReference(false);pickTool('select');}}>Annulla misura</button>
   </>:tool!=='select'?<>
    <span>{readingScale?'Cerco la barra metrica nella planimetria…'
     :tool==='door'&&!manualDoor&&doorScale?'Fai clic sul muro per posizionare una porta da 80 cm.'
     :start?'Fai clic sul secondo estremo sullo stesso muro.'
     :tool==='door'&&!manualDoor?'Barra metrica non riconosciuta. Scegli Imposta scala oppure indica a mano i due estremi della porta.'
     :'Fai clic sul primo estremo dell’apertura.'}</span>
    {readingScale&&<button type="button" onClick={()=>setManualDoor(true)}>Indica due estremi</button>}
   </>:active?<>
    <strong>{active.opening.kind==='door'?'Porta':'Finestra'} {selected+1} di {rows.length}</strong>
    <span>Trascina il simbolo per spostarlo o un estremo per ridimensionarlo.</span>
    {!active.confirmed&&<button type="button" disabled={busy} onClick={()=>setRows(rows.map((row,i)=>i===selected?{...row,confirmed:true}:row))}>Conferma</button>}
    <label>Tipo <select value={active.opening.kind} disabled={busy} onChange={e=>writeOpening(selected,{...active.opening,kind:e.target.value as ListingOpening['kind']})}><option value="door">Porta</option><option value="window">Finestra</option></select></label>
    <button type="button" disabled={busy} onClick={()=>{setRows(rows.filter((_,i)=>i!==selected));setSelected(-1);}}>Scarta</button>
   </>:<span>{activeRoom?activeRoom.label+' · Trascina un lato per spostare la parete o un punto per correggere il contorno.'+(ortho?' Orto allinea i punti vicini in orizzontale o verticale.':''):'Seleziona un vano per spostare pareti e punti, oppure fai clic su un’apertura.'}</span>}
   {pending.length>0&&tool==='select'&&<button type="button" disabled={busy} onClick={()=>focusOpening(pending.find(i=>i>selected)??pending[0]!)}>Prossima da verificare · {pending.length}</button>}
   {!calibrating&&doorScale&&<span>{manualScale?'Nuova scala · salva i dettagli per conservarla':p.metresPerPixel?p.scaleLabel??'Scala salvata':'Scala da barra metrica'}</span>}
   {notice&&<span role="status">{notice}</span>}
  </div>
  <div ref={scrollRef} className={styles.listingReviewMap}><svg ref={mapRef} className={styles.builder} style={{width:`${zoom*100}%`,height:`${zoom*100}%`}}
   viewBox={(calibrating?[0,0,p.width,p.height]:[left,top,right-left,bottom-top]).join(' ')} aria-label={p.editPlan?'Planimetria modificabile':'Pianta illustrativa modificabile'} onClick={add}
   onPointerMove={e=>{
    if(drag?.id!==e.pointerId)return;
    const point=position(e);
    if(point)setDrag({...drag,point,shift:e.shiftKey});
   }}
   onPointerUp={finish} onPointerCancel={()=>setDrag(null)} onLostPointerCapture={()=>setDrag(null)}>
   {(original||calibrating)&&<image href={p.sourceUrl} width={p.width} height={p.height} pointerEvents="none"/>}
   {!calibrating&&drawing.map(room=>{
    const shape=draggedRoom?.id===room.id?draggedRoom:room,isSelected=roomId===room.id;
    return <path key={room.id} d={path(shape)} fill={listingRoomFill(room)} fillRule="evenodd" fillOpacity={original ? .24 : 1}
     stroke={isSelected?'#00819a':'#253130'} strokeWidth={isSelected?3:2} vectorEffect="non-scaling-stroke"
     role="button" tabIndex={tool==='select'&&!busy?0:-1} aria-label={room.label+' · modifica muri'} aria-pressed={isSelected}
     onClick={()=>chooseRoom(room.id)} onKeyDown={e=>activate(e,()=>chooseRoom(room.id))}/>;
   })}
   {!calibrating&&drawing.map(room=>{
    const xs=room.points.map(p=>p[0]),ys=room.points.map(p=>p[1]);
    return <text key={room.id} x={(Math.min(...xs)+Math.max(...xs))/2} y={(Math.min(...ys)+Math.max(...ys))/2}
     fontSize={span/45} textAnchor="middle" pointerEvents="none">{room.label}</text>;
   })}
   {(tool==='select'||tool==='wall')&&activeRoom&&!busy&&!wallProposal&&(draggedRoom??activeRoom).points.map((a,i,points)=>{
    const b=points[(i+1)%points.length]!;
    const subject={room:activeRoom.id,edge:i};
    const draggingWall=drag&&'edge' in drag.subject&&drag.subject.edge===i;
    return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth="16" vectorEffect="non-scaling-stroke"
     className={styles.listingWallHit} data-moving={draggingWall||tool==='wall'?'true':undefined} role="button" tabIndex={0}
     aria-label={`Parete ${i+1} · ${activeRoom.label}`}
     onPointerDown={e=>begin(e,subject)} onClick={tool==='wall'?()=>void reviewWall(i):undefined}
     onKeyDown={e=>tool==='wall'?activate(e,()=>void reviewWall(i)):arrow(e,mid(a,b),subject)}/>;
   })}
   {wallProposal&&<g aria-label="Contorni proposti sulla tavola originale" pointerEvents="none">
    {wallProposal.sides.map(([a,b],i)=><line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#a34c06" strokeWidth="3" vectorEffect="non-scaling-stroke"/>)}
   </g>}
   {tool==='select'&&rows.map((row,i)=>{
    const opening=selected===i&&draggedOpening?draggedOpening:previewOpening(row);
    const {start:a,end:b,kind}=opening;
    const opposite=listingDoorOpposite(opening,previewDrawing,span*.035);
    const color=selected===i?'#007e81':row.confirmed?'#304e53':'#b36a00';
    const coords={x1:a[0],y1:a[1],x2:b[0],y2:b[1]};
    const subject={row:i,part:'body' as const};
    return <g key={i} onPointerDown={e=>begin(e,subject)} onClick={()=>{if(!busy)chooseOpening(i);}}>
     <line {...coords} stroke="white" strokeWidth="7" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
     {opposite&&<g>
      <polygon className={styles.listingDoorHit} points={[a,b,opposite[1],opposite[0]].map(point=>point.join(',')).join(' ')} fill="white"/>
      <line x1={opposite[0][0]} y1={opposite[0][1]} x2={opposite[1][0]} y2={opposite[1][1]} stroke="white" strokeWidth="7" vectorEffect="non-scaling-stroke"/>
      {[a,b].map((point,j)=><line key={j} x1={point[0]} y1={point[1]} x2={opposite[j]![0]} y2={opposite[j]![1]} stroke={color} vectorEffect="non-scaling-stroke"/>)}
     </g>}
     <line {...coords} stroke={color} strokeWidth={kind==='window'?3:2} strokeDasharray={kind==='door'?'4 2':undefined} vectorEffect="non-scaling-stroke" pointerEvents="none"/>
     <line {...coords} stroke="transparent" strokeWidth="19" vectorEffect="non-scaling-stroke"
      className={styles.listingOpeningHit} role="button" tabIndex={busy?-1:0} aria-label={(kind==='door'?'Porta ':'Finestra ')+(i+1)}
      onKeyDown={e=>{activate(e,()=>chooseOpening(i));arrow(e,mid(a,b),subject);}}/>
    </g>;
   })}
   <g aria-hidden="true" pointerEvents="none">
    {guides.map(([a,b],i)=><line key={i} className={styles.listingAlignmentGuide}
     x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} vectorEffect="non-scaling-stroke"/>)}
   </g>
   {tool==='select'&&activeRoom&&(draggedRoom??activeRoom).points.map((point,i)=>handle(point,`Punto ${i+1} · ${activeRoom.label}`,{room:activeRoom.id,vertex:i}))}
   {tool==='select'&&shown&&(['start','end'] as const).map((part,i)=>handle(shown[part],`Estremo ${i+1} dell’apertura`,{row:selected,part}))}
   {calibrating&&<g aria-hidden="true" pointerEvents="none">
    {referencePoints.length===2&&<line x1={referencePoints[0]![0]} y1={referencePoints[0]![1]}
     x2={referencePoints[1]![0]} y2={referencePoints[1]![1]} className={styles.listingAlignmentGuide} vectorEffect="non-scaling-stroke"/>}
    {referencePoints.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={Math.max(p.width,p.height)/(250*zoom)} fill="#a91e69"/>)}
   </g>}
   {start&&<circle cx={start[0]} cy={start[1]} r={span/(190*zoom)} fill="#b54900" stroke="#b54900" strokeWidth="6" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
  </svg></div>
  <div className={styles.listingReviewFooter}>
   <span>{rows.length-pending.length} aperture confermate{pending.length>0?' · le proposte non confermate non compaiono nel PNG':''}</span>
   <button type="button" onClick={p.onClose}>Chiudi</button>
   <button type="button" disabled={busy||tool==='wall'||calibrating||!!start||!!drag} onClick={saveDetails}>{p.editPlan?'Salva modifiche alla planimetria':'Salva dettagli per l’annuncio'}</button>
  </div>
 </dialog>;
}
