import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {useLocation,useNavigate,useSearchParams} from 'react-router';
import {useQueryClient} from '@tanstack/react-query';
import {GridFour} from '@phosphor-icons/react/dist/csr/GridFour';
import {List} from '@phosphor-icons/react/dist/csr/List';
import {MagnifyingGlass} from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import {Funnel} from '@phosphor-icons/react/dist/csr/Funnel';
import {Plus} from '@phosphor-icons/react/dist/csr/Plus';
import type {CatalogFilters,Home,ObjectCapabilities,ObjectRef} from '../api/types';
import {useAccount} from '../session/session';
import {useCatalog,useForgetObjects,useRooms} from './hooks';
import {ObjectForm} from './components';
import {catalogFiltersFromParams,catalogFiltersToParams,isForbidden,objectPath,objectsErrorMessage,validateQuery,OBJECT_TYPE_LABEL} from '../lib/objects';
import {cx,ui,Loading,ErrorState} from '../components/ui';
import {CatalogTile} from './CatalogTile';
import styles from './catalog.module.css';
type Restore={scope:string;y:number;pages:number;focus:string};

export function CatalogContent({home,caps}:{home:Home;caps:ObjectCapabilities}){
 const account=useAccount(),navigate=useNavigate(),location=useLocation(),cache=useQueryClient(),[params,setParams]=useSearchParams(),id=useId();
 const filters=useMemo(()=>catalogFiltersFromParams(params),[params]),creating=params.get('nuovo')==='1',list=params.get('vista')==='elenco',expanded=params.get('filtri')==='1';
 const canEdit=home.permissions.includes('edit'),[draft,setDraft]=useState(filters.q),[basis,setBasis]=useState(filters.q),[queryError,setQueryError]=useState<string>();
 if(basis!==filters.q){setBasis(filters.q);setDraft(filters.q);}
 const rooms=useRooms(home.id,{state:'active'}),catalog=useCatalog(home.id,filters),forget=useForgetObjects(home.id),forbidden=catalog.isError&&isForbidden(catalog.error);
 useEffect(()=>{if(forbidden)forget();/* one cleanup for each denial */
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[forbidden]);
 const visibleData=forbidden?undefined:catalog.data;
 const items=visibleData?.pages.flatMap(p=>p.items)??[],meta=visibleData?.pages[0],roomItems=forbidden?[]:rooms.data?.pages.flatMap(p=>p.items)??[];
 const roomOptions=meta?.facets?.rooms??roomItems.map(r=>({id:r.id,name:r.name,count:undefined}));
 const filtered=!!(filters.q||filters.type||filters.roomId||filters.placement==='unplaced'||filters.state!=='active');
 const canonical=()=>{const next=catalogFiltersToParams(filters);if(list)next.set('vista','elenco');if(expanded)next.set('filtri','1');return next;};
 const search=canonical().toString(),scope=[account.id,home.id,search].join(':'),returnKey=['account',account.id,'home',home.id,'g1','catalog-return',search];
 const restore=useRef(cache.getQueryData<Restore>(returnKey)),restored=useRef(false);
 const {data,hasNextPage,isFetchingNextPage,isFetchNextPageError,fetchNextPage}=catalog;
 useEffect(()=>{
  if(restore.current?.scope!==scope||restored.current||!data)return;
  if(data.pages.length<restore.current.pages&&hasNextPage&&!isFetchNextPageError){if(!isFetchingNextPage)void fetchNextPage();return;}
  const target=restore.current;
  const frame=requestAnimationFrame(()=>{restored.current=true;document.getElementById(target.focus)?.focus({preventScroll:true});window.scrollTo(0,Math.max(0,target.y));});return()=>cancelAnimationFrame(frame);
 },[scope,data,hasNextPage,isFetchingNextPage,isFetchNextPageError,fetchNextPage,location.key]);
 const remember=(ref:ObjectRef)=>cache.setQueryData(returnKey,{scope,y:window.scrollY,pages:data?.pages.length??1,focus:`catalog-${ref.kind}-${ref.id}`});
 const returnState={objectsSearch:search,objectsAccountId:account.id};
 const apply=(next:CatalogFilters)=>{const p=catalogFiltersToParams(next);if(list)p.set('vista','elenco');if(expanded)p.set('filtri','1');if(creating)p.set('nuovo','1');restore.current=undefined;restored.current=true;setParams(p);};
 const toggle=(key:string,value:string|null)=>{const p=new URLSearchParams(params);if(value)p.set(key,value);else p.delete(key);setParams(p);};
 const setWhere=(v:string)=>apply({...filters,roomId:v&&v!=='unplaced'?v:null,placement:v==='unplaced'?'unplaced':'all'});
 const where=filters.roomId??(filters.placement==='unplaced'?'unplaced':'');
 return <div className={styles.catalog}>
  <div className={styles.searchBar}><form role="search" aria-label="Cerca tra i tuoi oggetti" onSubmit={e=>{e.preventDefault();const q=draft.normalize('NFC').trim(),problem=validateQuery(q);setQueryError(problem);if(!problem)apply({...filters,q});}}>
   <label className="visually-hidden" htmlFor={`${id}-q`}>Cerca nome, marca o modello</label><MagnifyingGlass size={22} aria-hidden="true"/>
   <input id={`${id}-q`} type="search" placeholder="Cerca nome, marca o modello" autoComplete="off" value={draft} aria-invalid={!!queryError} aria-describedby={queryError?`${id}-error`:undefined} onChange={e=>setDraft(e.target.value)}/><button className={ui.btn} type="submit">Cerca</button>
  </form>{canEdit&&!forbidden&&!creating&&<button className={cx(ui.btn,ui.primary,styles.add)} onClick={()=>toggle('nuovo','1')}><Plus size={20} aria-hidden="true"/> Aggiungi oggetto</button>}</div>
  {queryError&&<p id={`${id}-error`} role="alert" className={ui.fieldError}>{queryError}</p>}
  {!canEdit&&<p>Con il tuo ruolo puoi consultare i tuoi oggetti, non modificarli.</p>}
  {canEdit&&!forbidden&&creating&&<ObjectForm home={home} capabilities={caps} presetRoomId={filters.roomId&&roomOptions.some(r=>r.id===filters.roomId)?filters.roomId:null} onCancel={()=>toggle('nuovo',null)} onDone={o=>navigate(objectPath(home.id,o.ref),{state:returnState})}/>}
  <div className={styles.controls}><div className={styles.chips} role="group" aria-label="Filtra per ambiente">
   <button className={styles.chip} aria-pressed={!where} onClick={()=>setWhere('')}>Tutti {meta?.facets&&<span>{meta.facets.all}</span>}</button>
   {roomOptions.map(room=><button key={room.id} className={styles.chip} aria-pressed={where===room.id} onClick={()=>setWhere(room.id)}>{room.name} {room.count!==undefined&&<span>{room.count}</span>}</button>)}
   <button className={styles.chip} aria-pressed={where==='unplaced'} onClick={()=>setWhere('unplaced')}>Da collocare {meta?.facets&&<span>{meta.facets.unplaced}</span>}</button>
  </div><div className={styles.viewControls}><button className={ui.btn} aria-expanded={expanded} aria-controls={`${id}-filters`} onClick={()=>toggle('filtri',expanded?null:'1')}><Funnel size={18} aria-hidden="true"/> Filtri{filters.type||filters.state!=='active'?' attivi':''}</button><div className={styles.segment} role="group" aria-label="Rappresentazione oggetti"><button aria-pressed={!list} onClick={()=>toggle('vista',null)}><GridFour size={18} aria-hidden="true"/> Schede</button><button aria-pressed={list} onClick={()=>toggle('vista','elenco')}><List size={18} aria-hidden="true"/> Elenco</button></div></div></div>
  {expanded&&<div className={styles.filters} id={`${id}-filters`} role="group" aria-label="Filtri degli oggetti">
   <label>Dove<select value={where} onChange={e=>setWhere(e.target.value)}><option value="">Tutti gli ambienti</option><option value="unplaced">Da collocare</option>{filters.roomId&&!roomOptions.some(r=>r.id===filters.roomId)&&<option value={filters.roomId}>Ambiente selezionato</option>}{roomOptions.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
   <label>Tipo<select value={filters.type??''} onChange={e=>apply({...filters,type:(e.target.value||null) as CatalogFilters['type']})}><option value="">Tutti i tipi</option>{[...caps.types,'boiler' as const].map(t=><option value={t} key={t}>{OBJECT_TYPE_LABEL[t]}</option>)}</select></label>
   <label>Stato<select value={filters.state} onChange={e=>apply({...filters,state:e.target.value as CatalogFilters['state']})}><option value="active">Attivi</option><option value="archived">Archiviati</option><option value="all">Tutti</option></select></label>
   {filtered&&<button className={ui.btn} onClick={()=>{setDraft('');apply({state:'active',q:'',type:null,roomId:null,placement:'all',sort:filters.sort});}}>Azzera filtri</button>}
   {!meta?.facets&&rooms.hasNextPage&&<button className={ui.btn} disabled={rooms.isFetchingNextPage} onClick={()=>void rooms.fetchNextPage()}>Carica altri ambienti nel filtro</button>}
  </div>}
  <div className={styles.results}><p role="status">{catalog.isPending?'Caricamento…':forbidden||catalog.isError&&!data?'Catalogo non disponibile':meta?.total!==undefined?`${meta.total} ${meta.total===1?'oggetto':'oggetti'}${filtered?(meta.total===1?' trovato':' trovati'):''}`:`${items.length} oggetti caricati`}</p><label><span className="visually-hidden">Ordina oggetti</span><select value={filters.sort??'name'} onChange={e=>apply({...filters,sort:e.target.value as 'name'|'recent'})}><option value="name">Nome A–Z</option><option value="recent">Più recenti</option></select></label></div>
  {catalog.isPending?<Loading label="Caricamento degli oggetti…"/>:forbidden||catalog.isError&&!data?<ErrorState title="Oggetti non disponibili" error={catalog.error} message={objectsErrorMessage(catalog.error)} onRetry={forbidden?undefined:()=>void catalog.refetch()}/>:!items.length?<div className={styles.empty} role="status"><h2>{filtered?'Nessun oggetto corrisponde a questi filtri':'Non hai ancora oggetti in questa casa'}</h2><p>{filtered?'Prova a cambiare ricerca o ambiente.':'Aggiungi un oggetto oppure completa i documenti già caricati.'}</p>{filtered&&<button className={ui.btn} onClick={()=>apply({state:'active',q:'',type:null,roomId:null,placement:'all',sort:filters.sort})}>Azzera filtri</button>}</div>:<ul className={cx(styles.grid,list&&styles.list)} aria-label="Oggetti">{items.map(item=><CatalogTile key={`${item.ref.kind}:${item.ref.id}`} homeId={home.id} item={item} state={returnState} today={meta?.today} onOpen={()=>remember(item.ref)}/>)}</ul>}
  {catalog.isError&&data&&!forbidden&&<ErrorState title="Aggiornamento del catalogo non riuscito" error={catalog.error} onRetry={()=>void catalog.refetch()}/>}
  {!forbidden&&catalog.hasNextPage&&<button className={cx(ui.btn,styles.more)} disabled={catalog.isFetchingNextPage} onClick={()=>void catalog.fetchNextPage()}>{catalog.isFetchingNextPage?'Caricamento…':'Mostra altri oggetti'}</button>}
 </div>;
}
