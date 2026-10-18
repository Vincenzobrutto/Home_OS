import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useAccount, useApi } from '../session/session';
import { ErrorState, Loading, ui } from '../components/ui';
import { IntakeClient } from './client';
import styles from './integration.module.css';

export function PendingUploads({homeId,id}:{homeId:string;id:string}) {
  const account=useAccount(),api=useApi();
  const client=useMemo(()=>new IntakeClient(api,account.id,homeId),[api,account.id,homeId]);
  const result=useInfiniteQuery({queryKey:['account',account.id,'home',homeId,'intake','pending'],queryFn:({pageParam,signal})=>client.list(pageParam??undefined,signal,'open'),initialPageParam:null as string|null,getNextPageParam:p=>p.nextCursor,retry:false});
  const items=result.data?.pages.flatMap(p=>p.items)??[];
  return <section id={id} className={ui.card} aria-label="Caricamenti da completare"><h2>Caricamenti da completare</h2>
    {result.isPending?<Loading label="Cerco i caricamenti da completare…"/>:result.isError?<ErrorState error={result.error} onRetry={()=>void result.refetch()}/>:<>
      {items.length?<ul className={styles.pendingUploads}>{items.map(b=><li key={b.id}><Link className={ui.btn} to={'/home/'+encodeURIComponent(homeId)+'/documenti/organizza?lotto='+encodeURIComponent(b.id)}><span><strong>Riprendi il caricamento</strong><span>{new Date(b.createdAt).toLocaleString('it-IT',{day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'})} · {b.itemCount} file</span></span></Link></li>)}</ul>:<p role="status">Nessun caricamento da completare.</p>}
      {result.hasNextPage&&<button type="button" className={ui.btn} disabled={result.isFetchingNextPage} onClick={()=>void result.fetchNextPage()}>Altri caricamenti da completare</button>}
    </>}
  </section>;
}
