import {useRef,useState,type PointerEvent} from 'react';
import {Link} from 'react-router';
import type {MapView,Point} from './api';
import {fromClient,roomAt,polygonPath,sceneFence,type DeviceMarker} from './spatial';
import styles from './map.module.css';
export type DeviceDrop={expectedVersion:number;objectId:string;regionId:string;x:number;y:number;expectedPositionVersion:number};
type Gesture={pointerId:number;marker:DeviceMarker;start:Point;point:Point;fence:string;moved:boolean;version:number};
export function DeviceLayer({data,markers,homeId,canMove,onDrop,onMessage,onChoose}:{data:MapView;markers:DeviceMarker[];homeId:string;canMove:boolean;onDrop:(body:DeviceDrop,message:string)=>void|Promise<void>;onMessage:(s:string)=>void;onChoose:(marker:DeviceMarker)=>void}){
 const layer=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null),suppressClick=useRef(false),[preview,setPreview]=useState<{key:string;point:Point}|null>(null);
 const f=data.layout.frame,fence=sceneFence(data),destination=preview?roomAt(data.rooms,preview.point):null;
 function cancel(message:string){if(gesture.current?.moved)suppressClick.current=true;gesture.current=null;setPreview(null);if(message)onMessage(message);}
 function move(e:PointerEvent<HTMLAnchorElement>){const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;
  if(!canMove||g.fence!==fence){cancel('La mappa o gli ambienti sono cambiati: riprendi lo spostamento dai dati aggiornati.');return;}
  if(Math.hypot(e.clientX-g.start[0],e.clientY-g.start[1])<6&&!g.moved)return;
  const point=layer.current?fromClient(e.clientX,e.clientY,layer.current.getBoundingClientRect(),f):null;if(!point)return;g.moved=true;g.point=point;suppressClick.current=true;setPreview({key:g.marker.key,point});e.preventDefault();
 }
 async function end(e:PointerEvent<HTMLAnchorElement>){const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;gesture.current=null;
  if(g.moved)suppressClick.current=true;
  if(!g.moved){setPreview(null);return;}e.preventDefault();
  if(!canMove||g.fence!==fence){setPreview(null);onMessage('La mappa o la posizione sono cambiate: ricarica prima di spostare l’oggetto.');return;}
  const point=layer.current?fromClient(e.clientX,e.clientY,layer.current.getBoundingClientRect(),f):g.point;
  const target=point?roomAt(data.rooms,point):null;
  if(!target||!point){setPreview(null);onMessage('Spostamento annullato: rilascia l’oggetto dentro una stanza, fuori dai muri e dai vuoti.');return;}
  const root=layer.current,map=root?.parentElement,viewport=map?.closest('[data-map-viewport]'),clip=viewport?.getBoundingClientRect();
  const outsideClip=clip&&(e.clientX<clip.left||e.clientX>clip.right||e.clientY<clip.top||e.clientY>clip.bottom);
  // Pointer capture must not let a drop through a clipped zoomed map, a sticky footer or another panel.
  const hit=typeof document.elementFromPoint==='function'?document.elementFromPoint(e.clientX,e.clientY):undefined;
  if(outsideClip||hit!==undefined&&(!hit||!map?.contains(hit))){setPreview(null);onMessage('Spostamento annullato: rilascia nella parte visibile della planimetria.');return;}
  setPreview({key:g.marker.key,point});
  try{await onDrop({expectedVersion:g.version,objectId:g.marker.objectId,regionId:target.id,x:point[0],y:point[1],expectedPositionVersion:g.marker.positionVersion},target.id===g.marker.regionId?'Posizione di '+g.marker.name+' salvata in '+target.name+'.':g.marker.name+' spostato da '+g.marker.roomName+' a '+target.name+'. Anche l’associazione alla stanza è aggiornata.');}finally{setPreview(null);}
 }
 return <div ref={layer} className={styles.deviceLayer} aria-label="Elettrodomestici sulla planimetria">
 {preview&&<svg viewBox={'0 0 '+f.width+' '+f.height} className={styles.dropOverlay} aria-hidden="true">{destination&&<path d={polygonPath(destination)} fillRule="evenodd" className={styles.dropRoom}/>}</svg>}
 {markers.map(marker=>{const p=preview?.key===marker.key?preview.point:marker.point,isDragging=preview?.key===marker.key;
  return <Link key={marker.key} to={'/home/'+homeId+'/oggetti/object/'+marker.objectId} className={[styles.device,marker.indicative?styles.indicative:'',marker.needsReview?styles.reviewMarker:'',isDragging?styles.dragging:''].join(' ')} style={{left:p[0]/f.width*100+'%',top:p[1]/f.height*100+'%'}} aria-label={'Apri '+marker.name} title={marker.name+' · '+marker.roomName+(marker.indicative?' · posizione indicativa':'')+(marker.needsReview?' · da riconfermare':'')+(canMove?' · trascina per spostare; spazio per usare i campi posizione':'')} aria-description={marker.roomName+(marker.indicative?' · posizione indicativa':'')+(marker.needsReview?' · da riconfermare':'')} draggable={false}
   onDragStart={e=>e.preventDefault()}
   onPointerDown={e=>{suppressClick.current=false;if(!canMove||e.button!==0||e.ctrlKey||e.metaKey||e.altKey||gesture.current)return;
    gesture.current={pointerId:e.pointerId,marker,start:[e.clientX,e.clientY],point:marker.point,fence,moved:false,version:data.version};
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Capture may be unavailable in synthetic DOM tests. No automatic write. */}
   }} onPointerMove={move} onPointerUp={end} onPointerCancel={()=>cancel('Spostamento annullato.')} onLostPointerCapture={()=>{if(gesture.current)cancel('Spostamento annullato.');}}
   onClick={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();suppressClick.current=false;}}}
   onKeyDown={e=>{if(e.key==='Escape'&&gesture.current){e.preventDefault();cancel('Spostamento annullato.');}if(e.key===' '&&canMove){e.preventDefault();onChoose(marker);}}}>
   <span className={styles.deviceIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 10h12M9 6v2m0 5v3"/></svg></span>
   <span className={styles.deviceName} data-align={p[0]>f.width*.7?'right':p[0]<f.width*.3?'left':'center'}>{marker.name}{marker.needsReview?' · da riconfermare':''}</span>
  </Link>;
 })}
 {preview&&<span className={styles.dropHint} role="status">{!canMove?'Salvataggio della posizione…':destination?'Rilascia in '+destination.name:'Rilascia dentro una stanza'}</span>}
 </div>;
}
