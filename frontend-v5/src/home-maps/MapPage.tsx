import {useState,useRef,useEffect,useMemo,useId} from 'react';
import {Link,useParams} from 'react-router';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAccount,useApi} from '../session/session';
import {useCurrentHome} from '../routes/HomePages';
import {useDocumentFile} from '../documents/hooks';
import {ui,Loading,ErrorState,useDocumentTitle} from '../components/ui';
import {isApiError} from '../api/errors';
import {OriginalMap} from './OriginalMap';
import {DeviceLayer} from './DeviceLayer';
import {deviceScene,polygonPath} from './spatial';
import type {MapView,Point} from './api';
import styles from './map.module.css';

export function MapPage(){
 const {mapId}=useParams(),home=useCurrentHome();useDocumentTitle('Mappa · '+home.name);
 return mapId?<HomeMapEditor key={home.id+mapId} id={mapId}/>:<MapLinks/>;
}
export function MapLinks(){
 const home=useCurrentHome(),account=useAccount(),api=useApi();
 const query=useQuery({queryKey:['account',account.id,'home',home.id,'digital-maps'],queryFn:({signal})=>api.homeMaps.list(home.id,account.id,signal),retry:false});
 return <section className={ui.card}><h2>La mappa della tua casa</h2>{query.isPending?<Loading label="Caricamento mappa…"/>:query.isError?<ErrorState error={query.error} onRetry={()=>void query.refetch()}/>:query.data.items.length?<><p>I vani digitalizzati della casa sono già qui: puoi aggiungere i tuoi elettrodomestici senza ripetere l’analisi AI.</p>{query.data.items.map(p=><p key={p.id}><Link className={ui.btn} to={'/home/'+home.id+'/mappa/'+p.id}>{p.name} · {p.roomCount} vani</Link></p>)}</>:<p>Nessuna mappa digitale disponibile. Le planimetrie originali restano nell’archivio Documenti.</p>}</section>;
}
export function HomeMapEditor({id,embedded=false}:{id:string;embedded?:boolean}){
 const home=useCurrentHome(),account=useAccount(),api=useApi(),cache=useQueryClient(),key=['account',account.id,'home',home.id,'digital-map',id];
 const q=useQuery({queryKey:key,queryFn:({signal})=>api.homeMaps.get(home.id,id,account.id,signal),retry:false});
 return <>{!embedded&&<><Link to={'/home/'+home.id+'/ambienti'}>← Ambienti</Link><h1>La mappa della tua casa</h1></>}{q.isPending?<Loading label="Caricamento mappa…"/>:q.isError?<ErrorState error={q.error} onRetry={()=>void q.refetch()}/>:<Workspace key={account.id+home.id+id} data={q.data} homeId={home.id} send={(op,body,k)=>api.homeMaps.mutate(home.id,id,account.id,op,body,k)} refresh={async()=>{await cache.invalidateQueries({queryKey:['account',account.id,'home',home.id]},{throwOnError:true});}}/>}</>;
}
export function Workspace({data,homeId,send,refresh}:{data:MapView;homeId:string;send:(op:'pins'|'geometry',body:unknown,key:string)=>Promise<unknown>;refresh:()=>Promise<void>}){
 const [regionId,setRegion]=useState(data.rooms[0]?.id??''),[objectId,setObject]=useState(''),[point,setPoint]=useState<Point|null>(null),[points,setPoints]=useState<Point[]|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[uncertain,setUncertain]=useState(false),[needsRefresh,setNeedsRefresh]=useState(false),[denied,setDenied]=useState(false),[zoom,setZoom]=useState(1),[pointsBase,setPointsBase]=useState(data.version);
 const inputId=useId(),lock=useRef(false),alive=useRef(true);
 const request=useRef<{op:'pins'|'geometry';body:unknown;key:string;success:string}|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const region=data.rooms.find(r=>r.id===regionId),object=data.objects.find(o=>o.id===objectId),f=data.layout.frame;
 const file=useDocumentFile(homeId,data.document.id,true),scene=useMemo(()=>deviceScene(data),[data]);
 async function updateView(){try{await refresh();if(alive.current){setNeedsRefresh(false);setError('');}}catch{if(alive.current){setNeedsRefresh(true);setError('Non riesco ad aggiornare i dati. Ricarica prima di altre modifiche.');}}}
 async function dispatch(){
  if(lock.current||!request.current||!data.canEdit)return;lock.current=true;setBusy(true);setError('');
  const pending=request.current;
  try{
   try{await send(pending.op,pending.body,pending.key);}
   catch(e){
    if(!alive.current)return;
    if(isApiError(e)&&[400,401,403,404,409,422].includes(e.status)){
     request.current=null;setUncertain(false);
     if(e.status===401||e.status===403||e.status===404){setDenied(true);void refresh().catch(()=>{});}
     setNeedsRefresh(e.status===409);
     setError(e.status===409?'La mappa o la stanza sono cambiate. Aggiorna i dati prima di riprovare.':e.status===422?'Posizione non salvata: scegli un punto dentro il vano, fuori dai muri e dai vuoti.':'Accesso alla mappa non disponibile.');
    }else{setUncertain(true);setError('Esito da verificare. Puoi riprovare lo stesso invio oppure verificare i dati sul server. Nessun nuovo spostamento viene inviato automaticamente.');}
    return;
   }
   request.current=null;
   if(alive.current){setUncertain(false);setPoint(null);if(pending.op==='geometry')setPoints(null);setNotice(pending.success);}
   await updateView();
  }finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 function run(op:'pins'|'geometry',body:unknown,success='Modifica salvata.'){
  if(lock.current||request.current||needsRefresh||!data.canEdit)return;
  request.current={op,body:structuredClone(body),key:crypto.randomUUID(),success};return dispatch();
 }
 const select=(id:string)=>{setRegion(id);setPoint(null);setPoints(null);};
 const blocked=busy||uncertain||needsRefresh||denied;
 if(denied)return <ErrorState message="Accesso alla mappa non disponibile. Nessuna modifica viene ripetuta." error={null}/>;
 return <div className={styles.page}>
  <p>Trascina un elettrodomestico per sistemarlo sulla planimetria. Se lo porti in un’altra stanza, anche la sua associazione all’ambiente viene aggiornata.</p>
  {scene.markers.some(m=>m.indicative)&&<p className={styles.legend}><span className={styles.legendDot}/>I segnaposti tratteggiati sono disposti in modo indicativo nella stanza già associata, non indicano la posizione reale. Trascinali per precisarla.</p>}
  {scene.markers.some(m=>m.multipleRooms)&&<p>Un oggetto associato a più ambienti può comparire in ciascuno. Trascinandolo viene assegnato al solo ambiente di arrivo.</p>}
  <p><Link to={'/home/'+homeId+'/documenti/'+data.document.id}>Apri originale e provenienza</Link> · <Link to={'/home/'+homeId+'/oggetti'}>Aggiungi o gestisci un elettrodomestico</Link></p>
  <p role="note">{data.layout.caveats[0]}</p>
  <details><summary>Misure e limiti · {data.layout.qualification==='estimated'?'scala stimata':data.layout.qualification==='reviewed'?'scala revisionata':'scala da verificare'}</summary><ul>{data.layout.caveats.slice(1).map((v,i)=><li key={i}>{v}</li>)}</ul></details>
  {notice&&<p role="status" className={styles.notice}>{notice}</p>}{error&&<p role="alert">{error}</p>}
  {(uncertain||needsRefresh)&&<div className={styles.toolbar}>{uncertain&&<button className={ui.btn} disabled={busy} onClick={()=>void dispatch()}>Riprova lo stesso invio</button>}<button className={ui.btn} disabled={busy} onClick={()=>void updateView()}>{uncertain?'Verifica dati sul server':'Aggiorna dati'}</button></div>}
  <div className={styles.columns}>
   <section className={ui.card}>
    <div className={styles.toolbar}><h2>Planimetria · pagina {data.layout.source.page}</h2><button className={ui.btn} onClick={()=>setZoom(z=>Math.max(1,z-.5))} disabled={zoom===1||busy}>Riduci</button><button className={ui.btn} onClick={()=>setZoom(z=>Math.min(3,z+.5))} disabled={zoom===3||busy}>Ingrandisci</button></div>
    <div className={styles.scroll} data-map-viewport><div style={{width:zoom*100+'%'}}>
     {file.isPending?<Loading label="Caricamento mappa…"/>:file.isError?<ErrorState error={file.error} onRetry={()=>void file.refetch()}/>:<OriginalMap
      blob={file.data.blob} mime={data.document.mimeType} page={data.layout.source.page} width={f.width} height={f.height}
      onPoint={(x,y)=>{if(data.canEdit&&!blocked&&objectId&&!points)setPoint([x,y]);}}
      overlay={<DeviceLayer data={data} markers={scene.markers} homeId={homeId} canMove={data.canEdit&&!blocked&&!points}
       onDrop={(body,message)=>run('pins',body,message)} onMessage={setNotice}
       onChoose={marker=>{setRegion(marker.regionId);setObject(marker.objectId);setPoint(marker.point);setPoints(null);setNotice('Usa i campi posizione e premi Salva posizione nella stanza per confermare.');}}/>}>
      {data.rooms.map(r=><path key={r.id} d={polygonPath(r.id===regionId&&points?{points,holes:r.holes}:r)} fillRule="evenodd" className={r.id===regionId?styles.selected:styles.region} onClick={()=>{if(!blocked&&!objectId&&!points)select(r.id);}}/>)}
      {point&&<circle cx={point[0]} cy={point[1]} r={f.width*.013} className={styles.pending}/>}
     </OriginalMap>}
    </div></div>
    <p>Un clic sul segnaposto apre la scheda dell’oggetto. Puoi anche usare i controlli posizione qui sotto; dalla tastiera, spazio sul segnaposto li seleziona.</p>
   </section>
   <section className={ui.card}>
    <h2>Vani e oggetti</h2>
    <fieldset disabled={blocked||!data.canEdit}>
     <label htmlFor={inputId+'-room'}>Ambiente</label><select id={inputId+'-room'} value={regionId} onChange={e=>select(e.target.value)}>{data.rooms.map(r=><option key={r.id} value={r.id} disabled={r.state!=='active'}>{r.name}</option>)}</select>
     <label htmlFor={inputId+'-object'}>Il tuo elettrodomestico</label><select id={inputId+'-object'} value={objectId} onChange={e=>{setObject(e.target.value);setPoint(null);setPoints(null);}}><option value="">Scegli un oggetto già censito</option>{data.objects.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
     {!data.objects.length&&<p>Prima aggiungi un elettrodomestico dalla pagina Oggetti, poi torna sulla mappa.</p>}
     {object&&<><p>Salvando, {object.name} sarà associato all’ambiente {region?.name}. La precedente associazione agli ambienti sarà sostituita.</p><div className={styles.coords}><label>Posizione X<input type="number" min={0} max={f.width} step="any" value={point?.[0]??''} onChange={e=>setPoint([Number(e.target.value),point?.[1]??0])}/></label><label>Posizione Y<input type="number" min={0} max={f.height} step="any" value={point?.[1]??''} onChange={e=>setPoint([point?.[0]??0,Number(e.target.value)])}/></label></div><button className={ui.btn} disabled={!point||!region} onClick={()=>run('pins',{expectedVersion:data.version,objectId:object.id,regionId,x:point![0],y:point![1],expectedPositionVersion:object.positionVersion},'Posizione di '+object.name+' salvata in '+region?.name+'.')}>Salva posizione nella stanza</button></>}
 {!objectId&&region&&<details><summary>Correggi il contorno di {region.name}</summary><p>Puoi aggiungere punti e correggere le coordinate. Il salvataggio invalida le misure precedenti e richiede di riconfermare i segnaposti; non li sposta.</p><button className={ui.btn} onClick={()=>{setPointsBase(data.version);setPoints(structuredClone(region.points));}}>Modifica contorno</button>{points&&<><button className={ui.btn} onClick={()=>setPoints(null)}>Annulla modifica contorno</button>{pointsBase!==data.version&&<p role="alert">La mappa è cambiata. Annulla questo contorno e riparti dalla geometria aggiornata.</p>}<ol>{points.map((p,i)=><li key={i}><div className={styles.coords}>{([0,1] as const).map(axis=><label key={axis}>{axis===0?'X':'Y'} punto {i+1}<input type="number" step="any" min={0} max={axis===0?f.width:f.height} value={p[axis]} onChange={e=>setPoints(prev=>prev!.map((v,j)=>j===i?axis===0?[Number(e.target.value),v[1]]:[v[0],Number(e.target.value)]:v))}/></label>)}</div><button className={ui.btn} onClick={()=>setPoints(prev=>{const next=structuredClone(prev!),a=next[i]!,b=next[(i+1)%next.length]!;next.splice(i+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);return next;})}>Aggiungi punto dopo {i+1}</button></li>)}</ol><button className={ui.btn} disabled={pointsBase!==data.version} onClick={()=>void run('geometry',{expectedVersion:pointsBase,regionId,geometry:{points,holes:region.holes}})}>Salva contorno e invalida le misure</button></>}</details>}
    </fieldset>
    <h3>Oggetti sulla mappa</h3>
    {scene.markers.map(m=><p key={m.key}><Link to={'/home/'+homeId+'/oggetti/object/'+m.objectId}>{m.name}</Link> · {m.roomName}{m.indicative?' · posizione indicativa':''}{m.needsReview?' · posizione da riconfermare':''}</p>)}
    {!!scene.unplaced.length&&<><h3>Da collocare sulla planimetria</h3><p>Questi oggetti non hanno una stanza rappresentata sulla mappa. Scegli ambiente e posizione dai controlli; nessuna stanza viene indovinata.</p>{scene.unplaced.map(o=><p key={o.id}><Link to={'/home/'+homeId+'/oggetti/object/'+o.id}>{o.name}</Link></p>)}</>}
   </section>
  </div>
 </div>;
}
