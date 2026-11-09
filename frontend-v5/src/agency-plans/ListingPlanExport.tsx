import {useState} from 'react';
import type {PlanShape} from './PlanMeasurementView';
import {isBalcony} from './scaleDetection';
import {listingWalls, simplifyListingRooms} from './listingGeometry';
import styles from './practice-plan.module.css';

function listingImage(rooms: PlanShape[]) {
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
 const drawing = simplifyListingRooms(rooms, 3.2 / scale);
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
  const outdoor = room.kind !== 'excluded' && (isBalcony(room) || /terraz/i.test(room.label));
  context.fillStyle = outdoor ? '#e0ece6' : '#f4f6f5';
  context.fill(outline,'evenodd');
  return {room,outline};
 });

 const perimeter = new Path2D(), partitions = new Path2D();
 for (const [a,b] of listingWalls(drawing)) {
  const onBounds = ([axis,value]: [number,number]) =>
   Math.abs(a[axis]!-value)<1e-6 && Math.abs(b[axis]!-value)<1e-6;
  const bounds: Array<[number,number]> = [[0,left],[0,right],[1,top],[1,bottom]];
  const line = bounds.some(onBounds) ? perimeter : partitions;
  line.moveTo(...position(a));
  line.lineTo(...position(b));
 }
 context.strokeStyle = '#183438';
 context.lineWidth = 3.5;
 context.stroke(partitions);
 context.lineWidth = 5;
 context.stroke(perimeter);

 for (const {room,outline} of outlines) {
  const points = room.points.map(position);
  const xs = points.map(([x])=>x), ys = points.map(([,y])=>y);
  const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  const offsets = [0,-.2,.2,-.36,.36];
  const positions = offsets.flatMap(dy => offsets.map(dx => [
   (x0+x1)/2+dx*(x1-x0),(y0+y1)/2+dy*(y1-y0),
  ] as const));
  for (const size of [28,23,18]) {
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

export function ListingPlanExport({rooms,disabled,autoPreview=false}:{rooms:PlanShape[];disabled:boolean;autoPreview?:boolean}) {
 // In the listing task the image is drawn on entry: the component is keyed by geometry revision.
 const [initial] = useState(()=>{if(!autoPreview||!rooms.length)return {preview:'',error:false};try{return {preview:listingImage(rooms),error:false};}catch{return {preview:'',error:true};}});
 const [preview,setPreview] = useState(initial.preview);
 const [complete,setComplete] = useState(false);
 const [error,setError] = useState(initial.error);

 function open() {
  try {
   setPreview(listingImage(rooms));
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
  {error&&<p role="alert">Impossibile creare l’immagine della planimetria.</p>}
  {preview&&<div>
   <p>{rooms.length} {rooms.length===1?'vano salvato':'vani salvati'}. Controlla che la pianta mostri tutti gli ambienti da pubblicare.</p>
   <img className={styles.listingPreview} src={preview} alt="Anteprima della planimetria illustrativa per l’annuncio"/>
   <label><input type="checkbox" checked={complete} disabled={disabled} onChange={event=>setComplete(event.target.checked)}/> La pianta è completa per l’annuncio</label>
   {complete&&!disabled?<a href={preview} download="planimetria-annuncio.png">Scarica immagine PNG</a>:<button type="button" disabled>Scarica immagine PNG</button>}
  </div>}
 </section>;
}
