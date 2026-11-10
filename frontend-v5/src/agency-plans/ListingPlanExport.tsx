import {useState} from 'react';
import type {PlanShape} from './PlanMeasurementView';
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

 const margin = 48, scale = 1440 / Math.max(width, height);
 const canvas = document.createElement('canvas');
 canvas.width = Math.ceil(width * scale) + margin * 2;
 canvas.height = Math.ceil(height * scale) + margin * 2;
 const context = canvas.getContext('2d');
 if (!context) throw new Error('canvas_unavailable');
 context.fillStyle = '#fff';
 context.fillRect(0, 0, canvas.width, canvas.height);
 context.font = '28px sans-serif';
 context.textAlign = 'center';
 context.textBaseline = 'middle';

 for (const room of rooms) {
  const outline = new Path2D();
  for (const ring of [room.points, ...room.holes]) {
   ring.forEach(([x,y], index) => {
    const px = (x - left) * scale + margin, py = (y - top) * scale + margin;
    if (index === 0) outline.moveTo(px, py);
    else outline.lineTo(px, py);
   });
   outline.closePath();
  }
  context.fillStyle = '#edf6f5';
  context.fill(outline, 'evenodd');
  context.strokeStyle = '#183438';
  context.lineWidth = 4;
  context.stroke(outline);

  const xs = room.points.map(point => (point[0] - left) * scale + margin);
  const ys = room.points.map(point => (point[1] - top) * scale + margin);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const y = (Math.min(...ys) + Math.max(...ys)) / 2;
  const textWidth = context.measureText(room.label).width;
  const corners = [[x-textWidth/2,y-16],[x+textWidth/2,y-16],[x-textWidth/2,y+16],[x+textWidth/2,y+16]];
  if (corners.every(([px,py]) => context.isPointInPath(outline, px!, py!, 'evenodd'))) {
   context.save();
   context.clip(outline, 'evenodd');
   context.fillStyle = '#183438';
   context.fillText(room.label, x, y);
   context.restore();
  }
 }
 return canvas.toDataURL('image/png');
}

export function ListingPlanExport({rooms,disabled}:{rooms:PlanShape[];disabled:boolean}) {
 const [preview,setPreview] = useState('');
 const [complete,setComplete] = useState(false);
 const [error,setError] = useState(false);

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
  <h3>Pianta per l’annuncio</h3>
  <button type="button" disabled={disabled} onClick={open}>Anteprima annuncio</button>
  {error&&<p role="alert">Impossibile creare l’immagine della planimetria.</p>}
  {preview&&<div>
   <p>{rooms.length} {rooms.length===1?'vano salvato':'vani salvati'}. Controlla che la pianta mostri tutti gli ambienti da pubblicare.</p>
   <img className={styles.listingPreview} src={preview} alt="Anteprima della pianta per l’annuncio dai contorni salvati"/>
   <label><input type="checkbox" checked={complete} disabled={disabled} onChange={event=>setComplete(event.target.checked)}/> La pianta è completa per l’annuncio</label>
   {complete&&!disabled?<a href={preview} download="planimetria-annuncio.png">Scarica immagine PNG</a>:<button type="button" disabled>Scarica immagine PNG</button>}
  </div>}
 </section>;
}
