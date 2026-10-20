import {Link} from 'react-router';
import {useQuery} from '@tanstack/react-query';
import {useAccount,useApi} from '../session/session';
import {ErrorState,Loading} from '../components/ui';
import {Icon} from '../components/Icon';
import casa from './casa.module.css';
type Summary={counts:Record<'to_compile'|'review'|'analyzing'|'attention'|'completed',number>};
export function useCasaDocumentCounts(homeId:string){
 const account=useAccount(),api=useApi();
 return useQuery({queryKey:['account',account.id,'home',homeId,'documents','workflow-summary'],queryFn:({signal})=>api.callJson<Summary>(`/homes/${encodeURIComponent(homeId)}/documents/workflow-summary`,{accountId:account.id,signal}),gcTime:0,refetchInterval:q=>q.state.data?.counts.analyzing?2000:false});
 }
export function CasaDocumentsSummary({homeId}:{homeId:string}){
 const query=useCasaDocumentCounts(homeId),base=`/home/${encodeURIComponent(homeId)}/documenti`;
 return <section aria-label="Documenti da completare">{query.isPending?<Loading label="Caricamento conteggi documenti…"/>:query.isError?<ErrorState error={query.error} onRetry={()=>void query.refetch()}/>:<>{([['to_compile','Documenti da compilare'],['review','Documenti da controllare']] as const).map(([state,label])=><Link key={state} className={casa.summaryRow} to={base+'?workflow='+state}><strong>{label}</strong>{' '}<span className={casa.counter}>{query.data.counts[state]}</span><Icon name="arrow"/></Link>)}{(query.data.counts.analyzing>0||query.data.counts.attention>0)&&<p className={casa.otherStates}><Link to={base+'?workflow=pending'}>{query.data.counts.analyzing} in analisi · {query.data.counts.attention} richiedono attenzione</Link></p>}</>}</section>;
}
