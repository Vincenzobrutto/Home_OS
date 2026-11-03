import {useRef,useState,type PointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {Link} from 'react-router';
import type {MapView,Point} from './api';
import {fromClient,roomAt,polygonPath,sceneFence,type DeviceMarker} from './spatial';
import {displayFrame,toDisplayPoint,orientationTransform,type MapTurn,type ViewFrame} from './orientation';
import styles from './map.module.css';
export type DeviceDrop={expectedVersion:number;objectId:string;regionId:string;x:number;y:number;expectedPositionVersion:number};
type TrayObject=MapView['objects'][number];
type SourceBase={key:string;objectId:string;name:string;positionVersion:number};
type DragSource=SourceBase&({kind:'marker';regionId:string;roomName:string;point:Point}|{kind:'tray'});
type LayerRect=Pick<DOMRect,'left'|'top'|'width'|'height'>;
type Gesture={pointerId:number;source:DragSource;start:Point;point:Point|null;fence:string;bounds:LayerRect;moved:boolean;version:number};
type Preview={source:DragSource;point:Point};
export function DeviceLayer({data,markers,homeId,canMove,onDrop,onMessage,onChoose,turn=0,viewport,trayTarget,unplaced=[],onChooseUnplaced}:{data:MapView;markers:DeviceMarker[];homeId:string;canMove:boolean;turn?:MapTurn;viewport?:ViewFrame;trayTarget?:HTMLElement|null;unplaced?:MapView['objects'];onChooseUnplaced?:(object:TrayObject)=>void;onDrop:(body:DeviceDrop,message:string)=>void|Promise<void>;onMessage:(s:string)=>void;onChoose:(marker:DeviceMarker)=>void}){
 const layer=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null),suppressClick=useRef<string|null>(null),[preview,setPreview]=useState<Preview|null>(null);
 const f:ViewFrame=viewport??data.layout.frame,view=displayFrame(f,turn),fence=sceneFence(data)+':view:'+JSON.stringify([turn,f.x??0,f.y??0,f.width,f.height]),destination=preview?roomAt(data.rooms,preview.point):null;
 const trayObjects=unplaced.flatMap(candidate=>{const current=data.objects.find(o=>o.id===candidate.id);return current?[current]:[];});
 function readBounds():LayerRect|null{const b=layer.current?.getBoundingClientRect();return b&&[b.left,b.top,b.width,b.height].every(Number.isFinite)&&b.width>0&&b.height>0?{left:b.left,top:b.top,width:b.width,height:b.height}:null;}
 function unchangedBounds(before:LayerRect,now:LayerRect|null){return !!now&&(['left','top','width','height'] as const).every(key=>Math.abs(before[key]-now[key])<=.5);}
 function cancel(message:string,forceSuppress=false){if(gesture.current&&(gesture.current.moved||forceSuppress))suppressClick.current=gesture.current.source.key;gesture.current=null;setPreview(null);if(message)onMessage(message);}
 function begin(e:PointerEvent<HTMLElement>,source:DragSource){
  suppressClick.current=null;if(!canMove||e.button!==0||e.ctrlKey||e.metaKey||e.altKey||gesture.current)return;
  const bounds=readBounds();if(!bounds){onMessage('Planimetria non pronta: riprova lo spostamento quando è visibile.');return;}
  gesture.current={pointerId:e.pointerId,source,start:[e.clientX,e.clientY],point:source.kind==='marker'?source.point:null,fence,bounds,moved:false,version:data.version};
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Capture may be unavailable in synthetic DOM tests. No automatic write. */}
 }
 function consumeClick(e:{preventDefault:()=>void;stopPropagation:()=>void},key:string){if(suppressClick.current!==key)return false;e.preventDefault();e.stopPropagation();suppressClick.current=null;return true;}
 function move(e:PointerEvent<HTMLElement>){const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;
  if(!canMove||g.fence!==fence){cancel('La mappa o gli ambienti sono cambiati: riprendi lo spostamento dai dati aggiornati.');return;}
  const bounds=readBounds();if(!unchangedBounds(g.bounds,bounds)){cancel('Inquadratura cambiata: riprendi lo spostamento nella vista aggiornata.',true);return;}
  if(Math.hypot(e.clientX-g.start[0],e.clientY-g.start[1])<6&&!g.moved)return;
  const point=fromClient(e.clientX,e.clientY,bounds!,f,turn);if(!point)return;g.moved=true;g.point=point;suppressClick.current=g.source.key;setPreview({source:g.source,point});e.preventDefault();
 }
 async function end(e:PointerEvent<HTMLElement>){const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;gesture.current=null;
  if(g.moved)suppressClick.current=g.source.key;
  if(!g.moved){setPreview(null);return;}e.preventDefault();
  if(!canMove||g.fence!==fence){setPreview(null);onMessage('La mappa o la posizione sono cambiate: ricarica prima di spostare l’oggetto.');return;}
  const bounds=readBounds();if(!unchangedBounds(g.bounds,bounds)){setPreview(null);onMessage('Inquadratura cambiata: riprendi lo spostamento nella vista aggiornata.');return;}
  const point=fromClient(e.clientX,e.clientY,bounds!,f,turn);
  const target=point?roomAt(data.rooms,point):null;
  if(!target||!point){setPreview(null);onMessage('Spostamento annullato: rilascia l’oggetto dentro una stanza, fuori dai muri e dai vuoti.');return;}
  const root=layer.current,map=root?.parentElement,viewport=map?.closest('[data-map-viewport]'),clip=viewport?.getBoundingClientRect();
  const outsideClip=clip&&(e.clientX<clip.left||e.clientX>clip.right||e.clientY<clip.top||e.clientY>clip.bottom);
  // Pointer capture must not let a drop through a clipped zoomed map, a sticky footer or another panel.
  const hit=typeof document.elementFromPoint==='function'?document.elementFromPoint(e.clientX,e.clientY):undefined;
  if(outsideClip||hit!==undefined&&(!hit||!map?.contains(hit))){setPreview(null);onMessage('Spostamento annullato: rilascia nella parte visibile della planimetria.');return;}
  setPreview({source:g.source,point});
  const source=g.source,message=source.kind==='tray'?source.name+' posizionato in '+target.name+'. Anche l’associazione alla stanza è aggiornata.':target.id===source.regionId?'Posizione di '+source.name+' salvata in '+target.name+'.':source.name+' spostato da '+source.roomName+' a '+target.name+'. Anche l’associazione alla stanza è aggiornata.';
  try{await onDrop({expectedVersion:g.version,objectId:source.objectId,regionId:target.id,x:point[0],y:point[1],expectedPositionVersion:source.positionVersion},message);}finally{setPreview(null);}
 }
 const ghost=preview?.source.kind==='tray'&&!markers.some(m=>m.objectId===preview.source.objectId)?toDisplayPoint(preview.point,f,turn):null;
 return <><div ref={layer} className={styles.deviceLayer} aria-label="Elettrodomestici sulla planimetria">
 {preview&&<svg viewBox={'0 0 '+view.width+' '+view.height} className={styles.dropOverlay} aria-hidden="true"><g transform={orientationTransform(f,turn)}>{destination&&<path d={polygonPath(destination)} fillRule="evenodd" className={styles.dropRoom}/>}</g></svg>}
 {markers.map(marker=>{const p=toDisplayPoint(preview?.source.key===marker.key?preview.point:marker.point,f,turn),isDragging=preview?.source.key===marker.key;
  return <Link key={marker.key} to={'/home/'+homeId+'/oggetti/object/'+marker.objectId} className={[styles.device,marker.indicative?styles.indicative:'',marker.needsReview?styles.reviewMarker:'',isDragging?styles.dragging:''].join(' ')} style={{left:p[0]/view.width*100+'%',top:p[1]/view.height*100+'%'}} aria-label={'Apri '+marker.name} title={marker.name+' · '+marker.roomName+(marker.indicative?' · posizione indicativa':'')+(marker.needsReview?' · da riconfermare':'')+(canMove?' · trascina per spostare; spazio per usare i campi posizione':'')} aria-description={marker.roomName+(marker.indicative?' · posizione indicativa':'')+(marker.needsReview?' · da riconfermare':'')} draggable={false}
   onDragStart={e=>e.preventDefault()}
   onPointerDown={e=>begin(e,{...marker,kind:'marker'})} onPointerMove={move} onPointerUp={end} onPointerCancel={()=>cancel('Spostamento annullato.')} onLostPointerCapture={()=>{if(gesture.current)cancel('Spostamento annullato.');}}
   onClick={e=>{consumeClick(e,marker.key);}}
   onKeyDown={e=>{if(e.key==='Escape'&&gesture.current){e.preventDefault();cancel('Spostamento annullato.');}if(e.key===' '&&canMove){e.preventDefault();onChoose(marker);}}}>
   <span className={styles.deviceIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 10h12M9 6v2m0 5v3"/></svg></span>
   <span className={styles.deviceName} data-align={p[0]>view.width*.7?'right':p[0]<view.width*.3?'left':'center'}>{marker.name}{marker.needsReview?' · da riconfermare':''}</span>
  </Link>;
 })}
 {ghost&&preview&&<span className={[styles.device,styles.dragging,styles.trayGhost].join(' ')} aria-hidden="true" data-tray-ghost style={{left:ghost[0]/view.width*100+'%',top:ghost[1]/view.height*100+'%',pointerEvents:'none'}}><span className={styles.deviceIcon}><svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 10h12M9 6v2m0 5v3"/></svg></span><span className={styles.deviceName} data-align={ghost[0]>view.width*.7?'right':ghost[0]<view.width*.3?'left':'center'}>{preview.source.name}</span></span>}
 {preview&&<span className={styles.dropHint} role="status">{!canMove?'Salvataggio della posizione…':destination?'Rilascia in '+destination.name:'Rilascia dentro una stanza'}</span>}
 </div>{trayTarget&&createPortal(<div className={styles.trayItems} role="list" aria-label="Oggetti da posizionare">{trayObjects.map(object=>{
  const source:DragSource={kind:'tray',key:'tray:'+object.id,objectId:object.id,name:object.name,positionVersion:object.positionVersion};
  return <div role="listitem" key={object.id}><button type="button" disabled={!canMove} className={[styles.trayItem,preview?.source.key===source.key?styles.trayDragging:''].join(' ')} aria-label={'Posiziona '+object.name} title="Trascina nella stanza oppure seleziona per usare i controlli posizione" draggable={false}
   onDragStart={e=>e.preventDefault()} onPointerDown={e=>begin(e,source)} onPointerMove={move} onPointerUp={end} onPointerCancel={()=>cancel('Spostamento annullato.')} onLostPointerCapture={()=>{if(gesture.current)cancel('Spostamento annullato.');}}
   onClick={e=>{if(!consumeClick(e,source.key)&&canMove)onChooseUnplaced?.(object);}}
   onKeyDown={e=>{if(e.key==='Escape'&&gesture.current){e.preventDefault();cancel('Spostamento annullato.');}else if((e.key===' '||e.key==='Enter')&&canMove&&!gesture.current){e.preventDefault();onChooseUnplaced?.(object);}}}>{object.name}</button></div>;
 })}</div>,trayTarget)}</>;
}
