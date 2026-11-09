import {useState} from 'react';
import type {ListingDetails,ListingOpening} from './api';
import type {PlanShape,Point} from './PlanMeasurementView';
import {isBalcony} from './scaleDetection';
import {listingDrawing, listingWalls} from './listingGeometry';
import {ListingPlanReview} from './ListingPlanReview';
import styles from './practice-plan.module.css';

function roomFill(room: PlanShape) {
 if (room.kind !== 'excluded' && (isBalcony(room) || /terraz|giardin/i.test(room.label))) return '#d2e2d4';
 if (/bagno|servizi/i.test(room.label)) return '#dbe9e8';
 if (/camera/i.test(room.label)) return '#e1e5ec';
 if (/cucina/i.test(room.label)) return '#f2e1cd';
 if (/soggiorno|salone/i.test(room.label)) return '#eee0d5';
 if (/disimpegno|corridoio/i.test(room.label)) return '#eeeae0';
 return '#f0f1ee';
}

function listingImage(rooms: PlanShape[],details?:ListingDetails) {
 let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
 for (const room of rooms) {
  for (const [x,y] of room.points) {
   left = Math.min(left, x);
   top = Math.min(top, y);
   right = Math.max(right, x);
   bottom = Math.max(bottom, y);
  }
 }
 const width = right - left, height = bottom - top;
 if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('invalid_plan_bounds');

 const margin = 48, footer = 30, scale = 1440 / Math.max(width, height);
 const drawing = listingDrawing(rooms,details?.alignments);
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

 const outlines = drawing.map(room => {
  const outline = new Path2D();
  for (const ring of [room.points,...room.holes]) {
   ring.forEach((point,index) => {
    const [x,y] = position(point);
    if (index === 0) outline.moveTo(x,y);
    else outline.lineTo(x,y);
   });
   outline.closePath();
  }
  context.fillStyle = roomFill(room);
  context.fill(outline,'evenodd');
  return {room,outline};
 });

 const perimeter = new Path2D(), partitions = new Path2D(), outdoorWalls = new Path2D();
 const outdoor = drawing.filter(room=>room.kind!=='excluded'&&(isBalcony(room)||/terraz|giardin/i.test(room.label)));
 for (const [a,b] of listingWalls(outdoor)) {
  outdoorWalls.moveTo(...position(a));
  outdoorWalls.lineTo(...position(b));
 }
 for (const [a,b] of listingWalls(drawing.filter(room=>!outdoor.includes(room)))) {
  const onBounds = ([axis,value]: [number,number]) =>
   Math.abs(a[axis]!-value)<1e-6 && Math.abs(b[axis]!-value)<1e-6;
  const bounds: Array<[number,number]> = [[0,left],[0,right],[1,top],[1,bottom]];
  const line = bounds.some(onBounds) ? perimeter : partitions;
  line.moveTo(...position(a));
  line.lineTo(...position(b));
 }
 context.strokeStyle = '#53695e';
 context.lineWidth = 3.5;
 context.stroke(outdoorWalls);
 context.strokeStyle = '#253130';
 context.lineWidth = 6.5;
 context.stroke(partitions);
 context.lineWidth = 8;
 context.stroke(perimeter);

 for (const opening of details?.openings??[]) {
  let start=position(opening.start),end=position(opening.end);
  const length=Math.hypot(end[0]-start[0],end[1]-start[1]);
  if(length<3)continue;
  const dx=(end[0]-start[0])/length,dy=(end[1]-start[1])/length;
  // Move the symbol onto the closest wall face when the raster mark is nearby.
  let best=18;
  let snapped:[Point,Point]|undefined;
  for(const [a,b] of walls){
   const [ax,ay]=position(a),[bx,by]=position(b),span=Math.hypot(bx-ax,by-ay);
   if(span<length*.55)continue;
   const ux=(bx-ax)/span,uy=(by-ay)/span;
   if(Math.abs(ux*dx+uy*dy)<.95)continue;
   const project=([x,y]:Point)=>Math.max(0,Math.min(span,(x-ax)*ux+(y-ay)*uy));
   const u=project(start),v=project(end);
   if(Math.abs(u-v)<length*.55)continue;
   const offset=Math.abs((start[0]+end[0]-2*ax)*uy-(start[1]+end[1]-2*ay)*ux)/2;
   if(offset>=best)continue;
   best=offset;snapped=[[ax+u*ux,ay+u*uy],[ax+v*ux,ay+v*uy]];
  }
  if(snapped)[start,end]=snapped;
  const line=(a:Point,b:Point)=>{context.beginPath();context.moveTo(...a);context.lineTo(...b);context.stroke();};
  const span=Math.hypot(end[0]-start[0],end[1]-start[1]);
  const nx=(start[1]-end[1])/span,ny=(end[0]-start[0])/span;
  const shift=([x,y]:Point,d:number):Point=>[x+nx*d,y+ny*d];
  context.save();
  context.lineCap='butt';context.strokeStyle='#fff';context.lineWidth=16;
  line(start,end);
  context.strokeStyle='#3c5453';context.lineWidth=2;
  for(const point of [start,end])line(shift(point,-8),shift(point,8));
  if(opening.kind==='window'){
   line(shift(start,-3),shift(end,-3));line(shift(start,3),shift(end,3));
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
 return canvas.toDataURL('image/png');
}

type ListingExportProps={
 rooms:PlanShape[];disabled:boolean;autoPreview?:boolean;details?:ListingDetails;
 review?:{sourceUrl:string;width:number;height:number;hints?:ListingOpening[];onSave:(details:Omit<ListingDetails,'geometryRevision'>)=>void};
};
export function ListingPlanExport({rooms,disabled,autoPreview=false,details,review}:ListingExportProps) {
 const [reviewing,setReviewing]=useState(false);
 // In the listing task the image is drawn on entry: the component is keyed by geometry revision.
 const [initial] = useState(()=>{if(!autoPreview||!rooms.length)return {preview:'',error:false};try{return {preview:listingImage(rooms,details),error:false};}catch{return {preview:'',error:true};}});
 const [preview,setPreview] = useState(initial.preview);
 const [complete,setComplete] = useState(false);
 const [error,setError] = useState(initial.error);

 function open() {
  try {
   setPreview(listingImage(rooms,details));
   setError(false);
  } catch {
   setPreview('');
   setError(true);
  }
 }

 return <section className={styles.panel} aria-label="Pianta per l’annuncio">
  {!autoPreview&&<><h3>Pianta per l’annuncio</h3>
  <button type="button" disabled={disabled} onClick={open}>Anteprima annuncio</button></>}
  {autoPreview&&!rooms.length&&<p>Salva almeno un vano per preparare l’immagine dell’annuncio.</p>}
  {review&&<button type="button" disabled={disabled} onClick={()=>setReviewing(true)}>Porte, finestre e pareti</button>}
  {review&&reviewing&&<ListingPlanReview {...review} rooms={rooms} saved={details} disabled={disabled}
   onClose={()=>setReviewing(false)} onApply={draft=>{review.onSave(draft);setReviewing(false);}}/>}
  {error&&<p role="alert">Impossibile creare l’immagine della planimetria.</p>}
  {preview&&<div>
   <p>{rooms.length} {rooms.length===1?'vano salvato':'vani salvati'}. Controlla che la pianta mostri tutti gli ambienti da pubblicare.</p>
   <img className={styles.listingPreview} src={preview} alt="Anteprima della planimetria illustrativa per l’annuncio"/>
   <label><input type="checkbox" checked={complete} disabled={disabled} onChange={event=>setComplete(event.target.checked)}/> La pianta è completa per l’annuncio</label>
   {complete&&!disabled?<a href={preview} download="planimetria-annuncio.png">Scarica immagine PNG</a>:<button type="button" disabled>Scarica immagine PNG</button>}
  </div>}
 </section>;
}
