import {useState} from 'react';
import {createPortal} from 'react-dom';
import type {ListingDetails,ListingOpening,ListingPlanDraft,QuickEstimateScale,WallReview} from './api';
import type {PlanShape,Point} from './PlanMeasurementView';
import {insideShape,isBalcony,paperMetresPerPixel} from './scaleDetection';
import type {MeasurementConfiguration} from './measurement-types';
import {listingDoorOpposite, listingFacadeFill, listingFacadeOpposite, listingIllustration, listingOpeningOnDrawing, listingPerimeterBacking, listingPerimeterCorners, listingPublicationSegments, listingPublicationWalls, listingWalls, wallReviewReference} from './listingGeometry';
import {ListingPlanReview} from './ListingPlanReview';
import styles from './practice-plan.module.css';

import {LISTING_DRAWING_PIXELS,LISTING_OUTER_STROKE,LISTING_PARTITION_STROKE,listingRoomFill} from './listingStyle';

type PreviewOpening={index:number;kind:ListingOpening['kind'];start:Point;end:Point;far?:readonly [Point,Point]};
type ListingImage={url:string;width:number;height:number;openings:PreviewOpening[]};

function listingImage(rooms: PlanShape[],details?:ListingDetails,gross?:PlanShape,reviews:WallReview[]=[]) {
 let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
 const useReviewedGeometry=reviews.some(review=>wallReviewReference(rooms,review));
 const overrides=new Map(details?.contours?.map(entry=>[entry.id,entry.geometry]));
 const enclosedVeranda=(room:PlanShape)=>!!gross&&room.kind==='balcony'&&/\bverand/i.test(room.label)&&room.points.filter(point=>insideShape(point,gross)).length>=room.points.length/2;
 const publicationRooms=rooms.map(room=>enclosedVeranda(room)?{...room,kind:'room' as const}:room);
 const drawing=useReviewedGeometry?publicationRooms.map(room=>({...room,...overrides.get(room.id)})):listingIllustration(publicationRooms,details);
 const wallSource=useReviewedGeometry?publicationRooms:drawing;
 const {bands,covered}=listingPublicationWalls(wallSource,reviews,gross,true);
 for (const [x,y] of [...drawing.flatMap(room=>room.points),...(gross?.points??[]),...bands.flat()]) {
  left = Math.min(left, x);
  top = Math.min(top, y);
  right = Math.max(right, x);
  bottom = Math.max(bottom, y);
 }
 const width = right - left, height = bottom - top;
 if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('invalid_plan_bounds');

 const margin = 48, footer = 30, scale = LISTING_DRAWING_PIXELS / Math.max(width, height);

 const xs=rooms.flatMap(room=>room.points.map(([x])=>x)),ys=rooms.flatMap(room=>room.points.map(([,y])=>y));
 const originalSpan=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 const walls = details?.openings.length ? listingWalls(drawing) : [];
 const canvas = document.createElement('canvas');
 canvas.width = Math.ceil(width * scale) + margin * 2;
 canvas.height = Math.ceil(height * scale) + margin * 2 + footer;
 const context = canvas.getContext('2d');
 if (!context) throw new Error('canvas_unavailable');
 context.fillStyle = '#fff';
 context.fillRect(0, 0, canvas.width, canvas.height);
 context.textAlign = 'center';
 context.textBaseline = 'middle';
 context.lineJoin = 'round';
 context.lineCap = 'round';
 const position = ([x,y]: [number,number]): [number,number] => [(x-left)*scale+margin,(y-top)*scale+margin];

 const outlinePath=(room:PlanShape)=>{
  const outline = new Path2D();
  for (const ring of [room.points,...room.holes]) {
   ring.forEach((point,index) => {
    const [x,y] = position(point);
    if (index === 0) outline.moveTo(x,y);
    else outline.lineTo(x,y);
   });
   outline.closePath();
  }
  return outline;
 };
 const outlines = drawing.map(room => {
  const outline=outlinePath(room);
  context.fillStyle = listingRoomFill(room);
  context.fill(outline,'evenodd');
  return {room,outline};
 });

 const perimeter = new Path2D(), partitions = new Path2D(), outdoorWalls = new Path2D();
 const outdoor = drawing.filter(room=>room.kind!=='excluded'&&(isBalcony(room)||/terraz|giardin/i.test(room.label)));
 for (const [a,b] of listingWalls(outdoor)) {
  outdoorWalls.moveTo(...position(a));
  outdoorWalls.lineTo(...position(b));
 }
 const interior=drawing.filter(room=>!outdoor.includes(room));
 const wallLayout=gross||covered.size?interior.map(room=>listingPublicationSegments(room,wallSource.find(source=>source.id===room.id),covered,gross,drawing)):null;
 const remaining=wallLayout?wallLayout.flatMap(part=>part.segments):listingWalls(interior);
 const facadeWalls=wallLayout?.flatMap(part=>part.walls)??[];
 const backing=gross?listingPerimeterBacking(gross,drawing):[];
 for (const [a,b] of remaining) {
  const onBounds = ([axis,value]: [number,number]) =>
   Math.abs(a[axis]!-value)<1e-6 && Math.abs(b[axis]!-value)<1e-6;
  const bounds: Array<[number,number]> = [[0,left],[0,right],[1,top],[1,bottom]];
  const line = !gross&&bounds.some(onBounds) ? perimeter : partitions;
  line.moveTo(...position(a));
  line.lineTo(...position(b));
 }
 context.strokeStyle = '#53695e';
 context.lineWidth = 3.5;
 context.stroke(outdoorWalls);
 context.strokeStyle = '#253130';
 context.lineWidth = LISTING_PARTITION_STROKE;
 context.stroke(partitions);
 context.fillStyle = context.strokeStyle;
 const fillBand=(band:Point[])=>{
  context.beginPath();
  band.forEach((point,index)=>{if(index===0)context.moveTo(...position(point));else context.lineTo(...position(point));});
  context.closePath();context.fill();
 };
 bands.forEach(fillBand);
 if(gross){
  context.save();
  context.clip(outlinePath(gross),'evenodd');
  const mass=new Path2D();
  const facadePolygons=[...listingFacadeFill(facadeWalls),...(wallLayout?.flatMap(part=>part.corners)??[]),...backing.map(({inner,projected})=>[...inner,projected[1],projected[0]]),...listingPerimeterCorners(gross,backing)];
  for(const polygon of facadePolygons){
   const area=polygon.reduce((sum,[x,y],i)=>{
    const [nextX,nextY]=polygon[(i+1)%polygon.length]!;
    return sum+x*nextY-y*nextX;
   },0);
   const ring=area<0?[...polygon].reverse():polygon;
   ring.forEach((point,i)=>{if(i===0)mass.moveTo(...position(point));else mass.lineTo(...position(point));});
   mass.closePath();
  }
  context.fill(mass);
  context.restore();
 }
 context.lineWidth = gross?LISTING_OUTER_STROKE+4:LISTING_OUTER_STROKE;
 context.stroke(gross?outlinePath(gross):perimeter);

 const openings:PreviewOpening[]=[];
 for (const [index,opening] of (details?.openings??[]).entries()) {
  const placed=listingOpeningOnDrawing(opening,walls,originalSpan);
  const start=position(placed.start),end=position(placed.end);
  const facadeSide=listingFacadeOpposite(placed,facadeWalls)??listingFacadeOpposite(placed,backing);
  const opposite=facadeSide??listingDoorOpposite(placed,drawing,originalSpan*.035);
  const oppositePixels=opposite?[position(opposite[0]),position(opposite[1])] as const:null;
  if(Math.hypot(end[0]-start[0],end[1]-start[1])<3)continue;
  openings.push({index,kind:opening.kind,start,end,far:oppositePixels??undefined});
  const line=(a:Point,b:Point)=>{context.beginPath();context.moveTo(...a);context.lineTo(...b);context.stroke();};
  const span=Math.hypot(end[0]-start[0],end[1]-start[1]);
  const nx=(start[1]-end[1])/span,ny=(end[0]-start[0])/span;
  const shift=([x,y]:Point,d:number):Point=>[x+nx*d,y+ny*d];
  context.save();
  context.lineCap='butt';context.strokeStyle='#fff';context.lineWidth=16;
  line(start,end);
  if(oppositePixels){
   const [farStart,farEnd]=oppositePixels;
   context.fillStyle='#fff';
   context.beginPath();
   context.moveTo(...start);context.lineTo(...end);context.lineTo(...farEnd);context.lineTo(...farStart);
   context.closePath();context.fill();
   line(farStart,farEnd);
  }
  context.strokeStyle='#3c5453';context.lineWidth=2;
  for(const [i,point] of [start,end].entries()){
   const far=oppositePixels?.[i];
   if(!far||Math.hypot(far[0]-point[0],far[1]-point[1])<1)line(shift(point,-8),shift(point,8));
   else line(point,far);
  }
  if(opening.kind==='window'){
   const windowCentre=([x,y]:Point,[farX,farY]:Point):Point=>[(x+farX)/2,(y+farY)/2];
   const a=facadeSide&&oppositePixels?windowCentre(start,oppositePixels[0]):start;
   const b=facadeSide&&oppositePixels?windowCentre(end,oppositePixels[1]):end;
   line(shift(a,-3),shift(b,-3));line(shift(a,3),shift(b,3));
  }else{
   context.setLineDash([5,3]);line(start,end);
  }
  context.restore();
 }


 for (const {room,outline} of outlines) {
  const points = room.points.map(position);
  const xs = points.map(([x])=>x), ys = points.map(([,y])=>y);
  const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  const offsets = [0,-.2,.2,-.36,.36];
  const positions = offsets.flatMap(dy => offsets.map(dx => [
   (x0+x1)/2+dx*(x1-x0),(y0+y1)/2+dy*(y1-y0),
  ] as const));
  for (const size of [28,23,18,15]) {
   context.font = `${size}px sans-serif`;
   const halfWidth = context.measureText(room.label).width/2+3;
   const halfHeight = size*.55;
   const label = positions.find(([x,y]) => [-halfWidth,0,halfWidth].every(dx =>
    [-halfHeight,0,halfHeight].every(dy => context.isPointInPath(outline,x+dx,y+dy,'evenodd'))
   ));
   if (!label) continue;
   context.save();
   context.clip(outline,'evenodd');
   context.fillStyle = '#183438';
   context.fillText(room.label,...label);
   context.restore();
   break;
  }
 }
 context.font = '22px sans-serif';
 context.fillStyle = '#506463';
 context.fillText('Planimetria illustrativa',canvas.width/2,canvas.height-margin);
 return {url:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height,openings};
}

type ListingExportProps={
 rooms:PlanShape[];disabled:boolean;autoPreview?:boolean;details?:ListingDetails;toolbarHost?:HTMLElement|null;
 perimeter?:Pick<PlanShape,'points'|'holes'>|null;wallReviews?:WallReview[];
 review?:{sourceUrl:string;width:number;height:number;scale?:QuickEstimateScale;calibration?:MeasurementConfiguration['calibration'];hints?:ListingOpening[]};
 onSave?:(details:ListingPlanDraft)=>void;
};
export function listingScale({scale,calibration,width,height}:Pick<NonNullable<ListingExportProps['review']>,'scale'|'calibration'|'width'|'height'>):Point|null{
 const paper=scale?.mode==='paper'?scale:scale?undefined:calibration?.paper;
 if(paper)return paperMetresPerPixel(paper.format,paper.denominator,width,height);
 const reference=scale?.mode==='paper'?null:scale??(calibration?.confirmed?calibration:null);
 if(!reference)return null;
 const pixels=Math.hypot(reference.end[0]-reference.start[0],reference.end[1]-reference.start[1]);
 if(!(pixels>0&&reference.metres>0))return null;
 const factor=reference.metres/pixels;
 return [factor,factor];
}

export function ListingPlanExport({rooms,disabled,autoPreview=false,details,review,onSave,toolbarHost,perimeter,wallReviews}:ListingExportProps) {
 const gross=perimeter?{...perimeter,id:'gross',label:'Perimetro lordo'}:undefined;
 const [reviewing,setReviewing]=useState<number|null>(null);
 const [selectingOpening,setSelectingOpening]=useState(false);
 // In the listing task the image is drawn on entry: the component is keyed by geometry revision.
 const [initial] = useState<{preview:ListingImage|null;error:boolean}>(()=>{if(!autoPreview||!rooms.length)return {preview:null,error:false};try{return {preview:listingImage(rooms,details,gross,wallReviews),error:false};}catch{return {preview:null,error:true};}});
 const [preview,setPreview] = useState(initial.preview);
 const [complete,setComplete] = useState(false);
 const [error,setError] = useState(initial.error);

 function open() {
  try {
   setPreview(listingImage(rooms,details,gross,wallReviews));
   setError(false);
  } catch {
   setPreview(null);
   setError(true);
  }
 }

 const editAction=review&&onSave&&<button type="button" disabled={disabled} onClick={()=>setReviewing(-1)}>Modifica pianta per l’annuncio</button>;
 const openingAction=review&&onSave&&!!preview?.openings.length&&<button type="button" disabled={disabled} aria-pressed={selectingOpening}
  onClick={()=>setSelectingOpening(value=>!value)}>Ripristina un muro</button>;
 const downloadActions=<>
  <label><input type="checkbox" checked={complete} disabled={disabled} onChange={event=>setComplete(event.target.checked)}/> La pianta è completa per l’annuncio</label>
  {complete&&!disabled?<a href={preview?.url} download="planimetria-annuncio.png">Scarica immagine PNG</a>:<button type="button" disabled>Scarica immagine PNG</button>}
 </>;
 const toolbar=(editAction||preview)?<div className={styles.listingToolbar} role="group" aria-label="Comandi pianta per annuncio">
  {editAction}
  {openingAction}
  {preview&&downloadActions}
 </div>:null;

 return <section className={styles.panel} aria-label="Pianta per l’annuncio">
  {toolbarHost&&createPortal(toolbar,toolbarHost)}
  {!autoPreview&&<><h3>Pianta per l’annuncio</h3>
  <button type="button" disabled={disabled} onClick={open}>Anteprima annuncio</button></>}
  {autoPreview&&!rooms.length&&<p>Salva almeno un vano per preparare l’immagine dell’annuncio.</p>}
  {!toolbarHost&&<>{editAction}{openingAction}</>}
  {review&&onSave&&reviewing!==null&&<ListingPlanReview {...review} initialOpening={reviewing} metresPerPixel={listingScale(review)} scaleLabel={review.scale?'Scala salvata in Calcola superfici':'Scala del computo'} rooms={rooms} saved={details} perimeter={gross?{shape:gross,status:'saved'}:null} wallReviews={wallReviews} disabled={disabled}
   onClose={()=>setReviewing(null)} onApply={draft=>{onSave(draft);setReviewing(null);setSelectingOpening(false);}}/>}
  {error&&<p role="alert">Impossibile creare l’immagine della planimetria.</p>}
  {preview&&<div>
   <p>{rooms.length} {rooms.length===1?'vano salvato':'vani salvati'}. Controlla che la pianta mostri tutti gli ambienti da pubblicare.</p>
   {selectingOpening&&<p>Seleziona sulla pianta l’apertura da chiudere. Puoi controllarla prima di salvare.</p>}
   <div className={styles.listingPreviewMap}>
    <img className={styles.listingPreview} src={preview.url} alt="Anteprima della planimetria illustrativa per l’annuncio"/>
    {selectingOpening&&!disabled&&<svg className={styles.listingOpeningOverlay} viewBox={`0 0 ${preview.width} ${preview.height}`} aria-label="Aperture dell’anteprima">
     {preview.openings.map(({index,kind,start,end,far})=>{
      const select=()=>setReviewing(index);
      return <polygon key={index} points={[start,end,...(far?[far[1],far[0]]:[])].map(point=>point.join(',')).join(' ')}
       className={styles.listingOpeningMarker} vectorEffect="non-scaling-stroke"
       role="button" tabIndex={0} aria-label={`Seleziona ${kind==='door'?'porta':'finestra'} ${index+1}`}
       onClick={select} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}}}/>;
     })}
    </svg>}
   </div>
   {!toolbarHost&&downloadActions}
  </div>}
 </section>;
}
