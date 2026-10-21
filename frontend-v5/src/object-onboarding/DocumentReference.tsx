import {useEffect,useRef} from 'react';
import {useInfiniteQuery,useQuery} from '@tanstack/react-query';
import type {ApiClient} from '../api/client';
import {ui} from '../components/ui';
import styles from './onboarding.module.css';

import type {DocumentTarget} from './model';
export type {DocumentTarget} from './model';
/** A reference only: selecting it never creates an object or writes a document link. */
export function DocumentReference({api,accountId,homeId,target,disabled,onChange,onValidity}:{api:ApiClient;accountId:string;homeId:string;target:DocumentTarget|null;disabled:boolean;onChange:(target:DocumentTarget|null)=>void;onValidity:(valid:boolean)=>void}){
 const catalog=useInfiniteQuery({queryKey:['account',accountId,'home',homeId,'document-reference-catalog'],initialPageParam:null as string|null,queryFn:({signal,pageParam})=>api.listObjects(homeId,{state:'active',q:'',type:null,roomId:null,placement:'all',sort:'name'},{limit:20,cursor:pageParam},signal,accountId),getNextPageParam:p=>p.nextCursor??undefined,retry:false,gcTime:0});
 const selected=useQuery({queryKey:['account',accountId,'home',homeId,'document-reference',target?.kind,target?.id],queryFn:({signal})=>api.getObject(homeId,{kind:target!.kind,id:target!.id},signal,accountId),enabled:!!target,retry:false,gcTime:0});
 const rows=catalog.data?.pages.flatMap(p=>p.items)??[],valid=!target||selected.isSuccess&&selected.data.state==='active'&&selected.data.version===target.expectedVersion;
 const notified=useRef<boolean|null>(null);useEffect(()=>{if(notified.current!==valid){notified.current=valid;onValidity(valid);}},[valid,onValidity]);
 const options=selected.data&&!rows.some(o=>o.ref.kind===selected.data.ref.kind&&o.ref.id===selected.data.ref.id)?[selected.data,...rows]:rows;
 const value=target?target.kind+':'+target.id:'';
 return <section aria-label="Collegamento del documento" className={styles.resource}><label className={styles.field}>A cosa si riferisce?<select className={ui.input} disabled={disabled} value={value} onChange={e=>{const row=options.find(o=>o.ref.kind+':'+o.ref.id===e.target.value);onChange(row&&typeof row.version==='number'?{...row.ref,expectedVersion:row.version,name:row.name}:null);}}><option value="">Solo alla casa · nessun oggetto</option>{options.map(o=><option disabled={!Number.isInteger(o.version)} key={o.ref.kind+':'+o.ref.id} value={o.ref.kind+':'+o.ref.id}>{o.name}</option>)}{target&&!options.some(o=>o.ref.kind+':'+o.ref.id===value)&&<option value={value}>Collegamento da verificare</option>}</select></label>
 <p className={ui.hint}>{target?'Il documento sarà consultabile anche dalla scheda scelta. Nessun nuovo oggetto o costo.':'Puoi conservarlo nella casa oppure collegarlo a un oggetto o impianto esistente.'}</p>
 {target&&!valid&&<p role="status">{selected.isPending?'Verifica del collegamento…':'Il collegamento è cambiato o non è disponibile. Sceglilo di nuovo oppure lascia il documento solo nella casa.'}</p>}
 {selected.isError&&<button type="button" className={ui.btn} onClick={()=>void selected.refetch()}>Riprova collegamento</button>}
 {catalog.isError&&<button type="button" className={ui.btn} onClick={()=>void catalog.refetch()}>Riprova elenco oggetti</button>}
 {catalog.hasNextPage&&<button type="button" className={ui.btn} disabled={catalog.isFetchingNextPage} onClick={()=>void catalog.fetchNextPage()}>Carica altri oggetti e impianti</button>}
 </section>;
}
