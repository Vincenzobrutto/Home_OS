import {useEffect,useRef,useState} from 'react';
import {useInfiniteQuery,useQueryClient} from '@tanstack/react-query';
import {Link,useLocation} from 'react-router';
import {MagnifyingGlass} from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import {X} from '@phosphor-icons/react/dist/csr/X';
import {Phone} from '@phosphor-icons/react/dist/csr/Phone';
import {Envelope} from '@phosphor-icons/react/dist/csr/Envelope';
import {CaretRight} from '@phosphor-icons/react/dist/csr/CaretRight';
import {isApiError} from '../api/errors';
import {useAccount,useApi} from '../session/session';
import {ErrorState,Loading,Tag,cx,ui} from '../components/ui';
import {contactBase,type Contact,type ContactPage} from './api';
import {useContactNavigationState} from './navigation';
import styles from './contacts.module.css';

type View={q:string;state:'active'|'archived'|'all';pages:number;y:number;focus?:string};
export function ContactCatalog({homeId}:{homeId:string}){
 const account=useAccount(),api=useApi(),cache=useQueryClient(),location=useLocation(),contactState=useContactNavigationState(homeId);
 const viewKey=['account',account.id,'home',homeId,'contacts-view'];
 const [initial]=useState(()=>cache.getQueryData<View>(viewKey));
 const [search,setSearch]=useState(initial?.q??''),[q,setQ]=useState(initial?.q??''),[state,setState]=useState<View['state']>(initial?.state??'active');
 const restore=useRef(initial),restored=useRef(false),searchInput=useRef<HTMLInputElement>(null);
 const list=useInfiniteQuery({queryKey:['account',account.id,'home',homeId,'contacts','catalog',q,state],initialPageParam:null as string|null,
  queryFn:({pageParam,signal})=>api.callJson<ContactPage>(contactBase(homeId)+'?'+new URLSearchParams({q,state,...(pageParam?{cursor:pageParam}:{})}),{accountId:account.id,signal}),
  getNextPageParam:last=>last.nextCursor,retry:false});
 const denied=isApiError(list.error)&&list.error.status===403;
 useEffect(()=>{if(denied)cache.removeQueries({queryKey:['account',account.id,'home',homeId,'contacts-view'],exact:true});},[denied,cache,account.id,homeId]);
 const {data,hasNextPage,isFetchingNextPage,isFetchNextPageError,fetchNextPage}=list;
 const items=Array.from(new Map((data?.pages.flatMap(p=>p.items)??[]).map(c=>[c.id,c])).values());
 useEffect(()=>{const timer=setTimeout(()=>setQ(search.trim()),300);return()=>clearTimeout(timer);},[search]);
 useEffect(()=>{if(!restore.current||restored.current||!data||(list.isError&&(!isFetchNextPageError||denied)))return;
  if(data.pages.length<restore.current.pages&&hasNextPage&&!isFetchNextPageError){if(!isFetchingNextPage)void fetchNextPage();return;}
  const target=restore.current,frame=requestAnimationFrame(()=>{restored.current=true;if(target.focus)document.getElementById(target.focus)?.focus({preventScroll:true});window.scrollTo(0,Math.max(0,target.y));});return()=>cancelAnimationFrame(frame);
 },[data,hasNextPage,isFetchingNextPage,isFetchNextPageError,fetchNextPage,list.isError,denied,location.key]);
 function change(next:string,nextState=state){restore.current=undefined;restored.current=true;setSearch(next);setState(nextState);if(nextState!==state||!next)setQ(next.trim());cache.setQueryData<View>(viewKey,{q:next.trim(),state:nextState,pages:1,y:0});}
 function remember(contact:Contact){cache.setQueryData<View>(viewKey,{q:search.trim(),state,pages:search.trim()===q?data?.pages.length??1:1,y:search.trim()===q?window.scrollY:0,focus:'contact-'+contact.id});}
 return <>
  <form className={styles.catalogTools} role="search" aria-label="Cerca nella rubrica" onSubmit={e=>{e.preventDefault();setQ(search.trim());}}>
   <div className={styles.searchBox}><MagnifyingGlass size={20} aria-hidden="true"/><input ref={searchInput} type="search" aria-label="Cerca nome o mestiere" placeholder="Cerca nome o mestiere" autoComplete="off" value={search} maxLength={120} onChange={e=>change(e.target.value)}/>{search&&<button type="button" aria-label="Azzera ricerca" onClick={()=>{change('');searchInput.current?.focus();}}><X size={20} aria-hidden="true"/></button>}</div>
   <label className={styles.stateFilter}><span className="visually-hidden">Mostra contatti</span><select value={state} onChange={e=>change(search,e.target.value as View['state'])}><option value="active">Attivi</option><option value="archived">Archiviati</option><option value="all">Tutti</option></select></label>
  </form>
  <div aria-live="polite" className={styles.searchStatus}>{search.trim()!==q||list.isPending?'Ricerca in corso…':q&&!list.isError?items.length+(items.length===1?' contatto trovato':' contatti trovati')+(hasNextPage?' finora':''):''}</div>
  {list.isPending?<Loading label="Caricamento rubrica…"/>:list.isError&&(!isFetchNextPageError||denied)?<ErrorState error={list.error} onRetry={()=>void list.refetch()}/>:<section className={styles.catalogList} aria-label="Elenco contatti" aria-busy={list.isFetching||search.trim()!==q}>
   {items.length?<ul className={styles.rows}>{items.map(c=><li key={c.id} className={styles.row}>
    <div className={styles.identity}><Link id={'contact-'+c.id} to={'/home/'+encodeURIComponent(homeId)+'/rubrica/'+encodeURIComponent(c.id)} state={contactState} onClick={()=>remember(c)} className={styles.contactName}>{c.name}</Link><span>{c.profession??'Contatto della casa'}</span>{c.state==='archived'&&<Tag>Archiviato</Tag>}</div>
    <div className={styles.recapiti}>{c.phone&&<span><Phone size={18} aria-hidden="true"/>{c.phone}</span>}{c.email&&<span className={styles.emailText}><Envelope size={18} aria-hidden="true"/>{c.email}</span>}{!c.phone&&!c.email&&<span>Nessun recapito inserito</span>}</div>
    <div className={styles.rowActions}>{c.phone&&<a className={cx(ui.btn,styles.contactAction)} href={'tel:'+c.phone.replace(/[^\d+]/g,'')} aria-label={'Chiama '+c.name}><Phone size={18} aria-hidden="true"/>Chiama</a>}{c.email&&<a className={cx(ui.btn,styles.contactAction)} href={'mailto:'+encodeURIComponent(c.email)} aria-label={'Email a '+c.name}><Envelope size={18} aria-hidden="true"/>Email</a>}</div>
    <Link className={styles.detailArrow} aria-label={'Apri dettaglio di '+c.name} to={'/home/'+encodeURIComponent(homeId)+'/rubrica/'+encodeURIComponent(c.id)} state={contactState} onClick={()=>remember(c)}><CaretRight size={20} aria-hidden="true"/></Link>
   </li>)}</ul>:<div className={styles.empty}><h2>{q?'Nessun contatto trovato':state==='archived'?'Nessun contatto archiviato':'Non ci sono ancora contatti'}</h2><p>{q?'Prova un altro nome o mestiere, oppure azzera la ricerca.':state==='archived'?'Qui troverai i contatti che hai archiviato.':'Aggiungi chi ti aiuta con la casa: idraulico, elettricista o altri professionisti.'}</p>{q&&<button className={ui.btn} onClick={()=>change('')}>Azzera ricerca</button>}</div>}
   {isFetchNextPageError&&<ErrorState error={list.error} title="Altri contatti non caricati" onRetry={()=>void fetchNextPage()}/>}
   {hasNextPage&&<div className={styles.listFooter}><button className={ui.btn} disabled={isFetchingNextPage} onClick={()=>void fetchNextPage()}>{isFetchingNextPage?'Caricamento…':'Mostra altri contatti'}</button></div>}
  </section>}
 </>;
}
