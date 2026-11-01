import {useState,useRef,useEffect} from 'react';
import {Link,useParams} from 'react-router';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAccount,useApi} from '../session/session';
import {useCurrentHome} from '../routes/HomePages';
import {useDocumentFile} from '../documents/hooks';
import {ui,Loading,ErrorState} from '../components/ui';
import {OriginalMap} from './OriginalMap';
import type {MapView,Point} from './api';
import styles from './map.module.css';
export function MapPage(){const {mapId}=useParams(),home=useCurrentHome();return mapId?<Editor key={home.id+mapId} id={mapId}/>:<MapLinks/>;}
export function MapLinks(){
 const home=useCurrentHome(),account=useAccount(),api=useApi();
 const query=useQuery({queryKey:['account',account.id,'home',home.id,'digital-maps'],queryFn:({signal})=>api.homeMaps.list(home.id,account.id,signal),retry:false});
 return <section className={ui.card}><h2>La mappa della tua casa</h2>{query.isPending?<Loading label="Caricamento mappa…"/>:query.isError?<ErrorState error={query.error} onRetry={()=>void query.refetch()}/>:query.data.items.length?<><p>I vani digitalizzati dall’agenzia sono già qui: puoi aggiungere i tuoi elettrodomestici senza ripetere l’analisi AI.</p>{query.data.items.map(p=><p key={p.id}><Link className={ui.btn} to={'/home/'+home.id+'/mappa/'+p.id}>{p.name} · {p.roomCount} vani</Link></p>)}</>:<p>Nessuna mappa digitale ricevuta. Le planimetrie originali restano nell’archivio Documenti.</p>}</section>;
}
function Editor({id}:{id:string}){
 const home=useCurrentHome(),account=useAccount(),api=useApi(),cache=useQueryClient(),key=['account',account.id,'home',home.id,'digital-map',id];
 const q=useQuery({queryKey:key,queryFn:({signal})=>api.homeMaps.get(home.id,id,account.id,signal),retry:false});
 return <><Link to={'/home/'+home.id+'/ambienti'}>← Ambienti</Link><h1>La mappa della tua casa</h1>{q.isPending?<Loading label="Caricamento mappa…"/>:q.isError?<ErrorState error={q.error} onRetry={()=>void q.refetch()}/>:<Workspace key={q.data.version} data={q.data} homeId={home.id} send={(op,body,k)=>api.homeMaps.mutate(home.id,id,account.id,op,body,k)} refresh={async()=>{await cache.invalidateQueries({queryKey:['account',account.id,'home',home.id]});}}/>}</>;
}
export function Workspace({data,homeId,send,refresh}:{data:MapView;homeId:string;send:(op:'pins'|'geometry',body:unknown,key:string)=>Promise<unknown>;refresh:()=>Promise<void>}){
 const [regionId,setRegion]=useState(data.rooms[0]?.id??''),[objectId,setObject]=useState(''),[point,setPoint]=useState<Point|null>(null),[points,setPoints]=useState<Point[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false),[zoom,setZoom]=useState(1);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const request=useRef<{op:'pins'|'geometry';body:unknown;key:string}|null>(null),alive=useRef(true);
 const region=data.rooms.find(r=>r.id===regionId),object=data.objects.find(o=>o.id===objectId),f=data.layout.frame;
 const file=useDocumentFile(homeId,data.document.id,true);
 async function run(op:'pins'|'geometry',body:unknown){
  if(busy||!data.canEdit)return;setBusy(true);setError('');request.current??={op,body,key:crypto.randomUUID()};
  try{const r=request.current;await send(r.op,r.body,r.key);request.current=null;setUncertain(false);await refresh();}
  catch{if(alive.current){setError('Esito da verificare. Puoi riprovare lo stesso invio oppure ricaricare la mappa prima di altre modifiche.');setUncertain(true);}}finally{if(alive.current)setBusy(false);}
 }
 const select=(id:string)=>{setRegion(id);setPoint(null);setPoints(null);};
 const path=(r:{points:Point[];holes:Point[][]})=>[r.points,...r.holes].map(p=>'M '+p.map(v=>v.join(',')).join(' L ')+' Z').join(' ');
 return <div className={styles.page}>
 <p>Una copia indipendente ricevuta dall’agenzia. Le tue modifiche e i tuoi oggetti restano nella tua casa.</p>
 <p><Link to={'/home/'+homeId+'/documenti/'+data.document.id}>Apri originale e provenienza</Link> · <Link to={'/home/'+homeId+'/oggetti'}>Aggiungi o gestisci un elettrodomestico</Link></p>
 <details><summary>Misure e limiti · {data.layout.qualification==='estimated'?'scala stimata':data.layout.qualification==='reviewed'?'scala revisionata':'scala da verificare'}</summary><ul>{data.layout.caveats.map((v,i)=><li key={i}>{v}</li>)}</ul></details>
 {error&&<p role="alert">{error}</p>}{uncertain&&<div><button className={ui.btn} disabled={busy} onClick={()=>void run(request.current!.op,request.current!.body)}>Riprova lo stesso invio</button><button className={ui.btn} disabled={busy} onClick={()=>{request.current=null;setBusy(true);void refresh().then(()=>{if(alive.current){setUncertain(false);setError('');}}).finally(()=>{if(alive.current)setBusy(false);});}}>Ricarica mappa</button></div>}
 <div className={styles.columns}><section className={ui.card}><div className={styles.toolbar}><h2>Planimetria · pagina {data.layout.source.page}</h2><button className={ui.btn} onClick={()=>setZoom(z=>Math.max(1,z-.5))} disabled={zoom===1}>Riduci</button><button className={ui.btn} onClick={()=>setZoom(z=>Math.min(3,z+.5))} disabled={zoom===3}>Ingrandisci</button></div><div className={styles.scroll}><div style={{width:zoom*100+'%'}}>
 {file.isPending?<Loading label="Caricamento mappa…"/>:file.isError?<ErrorState error={file.error} onRetry={()=>void file.refetch()}/>:<OriginalMap blob={file.data.blob} mime={data.document.mimeType} page={data.layout.source.page} width={f.width} height={f.height} onPoint={(x,y)=>{if(data.canEdit&&!busy&&!uncertain&&objectId&&!points)setPoint([x,y]);}}>
 {data.rooms.map(r=><path key={r.id} d={path(r.id===regionId&&points?{points,holes:r.holes}:r)} fillRule="evenodd" className={r.id===regionId?styles.selected:styles.region} onClick={()=>{if(!busy&&!uncertain&&!objectId)select(r.id);}}/>)}
 {data.pins.map(p=><a key={p.objectId} href={'/home/'+homeId+'/oggetti/object/'+p.objectId} onClick={e=>e.stopPropagation()} aria-label={'Apri '+data.objects.find(o=>o.id===p.objectId)?.name}><g className={p.needsReview?styles.stale:styles.pin}><circle cx={p.x} cy={p.y} r={f.width*.06} style={{fill:'transparent',stroke:'none'}}/><circle cx={p.x} cy={p.y} r={f.width*.018}/><text x={p.x+f.width*.023} y={p.y} style={{fontSize:f.width*.035}}>{data.objects.find(o=>o.id===p.objectId)?.name}{p.needsReview?' · da riconfermare':''}</text></g></a>)}
 {point&&<circle cx={point[0]} cy={point[1]} r={f.width*.013} className={styles.pending}/>}
 </OriginalMap>}</div></div><p>Tocca la mappa per scegliere la posizione dell’oggetto selezionato. Il salvataggio richiede conferma.</p></section>
 <section className={ui.card}><h2>Vani e oggetti</h2><fieldset disabled={busy||uncertain||!data.canEdit}><label>Ambiente<select value={regionId} onChange={e=>select(e.target.value)}>{data.rooms.map(r=><option key={r.id} value={r.id} disabled={r.state!=='active'}>{r.name}</option>)}</select></label><label>Il tuo elettrodomestico<select value={objectId} onChange={e=>{setObject(e.target.value);setPoint(null);setPoints(null);}}><option value="">Scegli un oggetto già censito</option>{data.objects.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
 {!data.objects.length&&<p>Prima aggiungi un elettrodomestico dalla pagina Oggetti, poi torna sulla mappa.</p>}
 {object&&<><p>Salvando, {object.name} sarà associato all’ambiente {region?.name}. La precedente associazione agli ambienti sarà sostituita.</p><div className={styles.coords}><label>Posizione X<input type="number" min={0} max={f.width} step="any" value={point?.[0]??''} onChange={e=>setPoint([Number(e.target.value),point?.[1]??0])}/></label><label>Posizione Y<input type="number" min={0} max={f.height} step="any" value={point?.[1]??''} onChange={e=>setPoint([point?.[0]??0,Number(e.target.value)])}/></label></div><button className={ui.btn} disabled={!point||!region} onClick={()=>void run('pins',{expectedVersion:data.version,objectId:object.id,regionId,x:point![0],y:point![1],expectedPositionVersion:object.positionVersion})}>Salva posizione nella stanza</button></>}
 {!objectId&&region&&<details><summary>Correggi il contorno di {region.name}</summary><p>Puoi aggiungere punti e correggere le coordinate. Il salvataggio invalida le misure precedenti e richiede di riconfermare i segnaposti; non li sposta.</p><button className={ui.btn} onClick={()=>setPoints(structuredClone(region.points))}>Modifica contorno</button>{points&&<><ol>{points.map((p,i)=><li key={i}><div className={styles.coords}>{([0,1] as const).map(axis=><label key={axis}>{axis===0?'X':'Y'} punto {i+1}<input type="number" step="any" min={0} max={axis===0?f.width:f.height} value={p[axis]} onChange={e=>setPoints(prev=>prev!.map((v,j)=>j===i?axis===0?[Number(e.target.value),v[1]]:[v[0],Number(e.target.value)]:v))}/></label>)}</div><button className={ui.btn} onClick={()=>setPoints(prev=>{const next=structuredClone(prev!),a=next[i]!,b=next[(i+1)%next.length]!;next.splice(i+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);return next;})}>Aggiungi punto dopo {i+1}</button></li>)}</ol><button className={ui.btn} onClick={()=>void run('geometry',{expectedVersion:data.version,regionId,geometry:{points,holes:region.holes}})}>Salva contorno e invalida le misure</button></>}</details>}
 </fieldset><h3>Oggetti sulla mappa</h3>{data.pins.map(p=><p key={p.objectId}><Link to={'/home/'+homeId+'/oggetti/object/'+p.objectId}>{data.objects.find(o=>o.id===p.objectId)?.name}</Link>{p.needsReview&&' · posizione da riconfermare'}</p>)}</section></div></div>;
}
