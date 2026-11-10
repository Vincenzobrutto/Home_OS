import {useQuery} from '@tanstack/react-query';
import {useSearchParams,Link} from 'react-router';
import {useAccount,useApi} from '../session/session';
import {useCurrentHome} from '../routes/HomePages';
import {ui,Loading,ErrorState} from '../components/ui';
import {HomeMapEditor} from './MapPage';
export default function RoomsPlanView(){
 const account=useAccount(),api=useApi(),home=useCurrentHome(),[params,setParams]=useSearchParams();
 const query=useQuery({queryKey:['account',account.id,'home',home.id,'digital-maps'],queryFn:({signal})=>api.homeMaps.list(home.id,account.id,signal),retry:false});
 if(query.isPending)return <Loading label="Caricamento della planimetria…"/>;
 if(query.isError)return <ErrorState error={query.error} onRetry={()=>void query.refetch()}/>;
 if(!query.data.items.length)return <section className={ui.card}><h2>Planimetria non ancora disponibile</h2><p>Qui vedrai la mappa digitale della casa. Puoi continuare a usare le schede degli ambienti e i tuoi oggetti.</p><Link to={'/home/'+home.id+'/documenti'}>Apri i documenti della casa</Link></section>;
 const selected=query.data.items.find(p=>p.id===params.get('mappa'))??query.data.items[0]!;
 return <section aria-label="Vista planimetrica degli ambienti">
  {query.data.items.length>1&&<label>Planimetria della casa<select value={selected.id} onChange={e=>{const next=new URLSearchParams(params);next.set('mappa',e.target.value);setParams(next);}}>{query.data.items.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
  <HomeMapEditor key={account.id+home.id+selected.id} id={selected.id} embedded/>
 </section>;
}
