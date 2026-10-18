import {Link} from 'react-router';
import {useDocumentSearch} from '../documents/hooks';
import {EMPTY_FILTERS} from '../lib/documentSearch';
import {ErrorState,Loading} from '../components/ui';
import {DocumentWorkflowStatus} from '../documents/DocumentWorkflowStatus';
import casa from './casa.module.css';
export function CasaDocumentsSummary({homeId}:{homeId:string}){
 const query=useDocumentSearch(homeId,{...EMPTY_FILTERS,workflow:'pending'},true),base=`/home/${encodeURIComponent(homeId)}/documenti`;
 const items=query.data?.pages.flatMap(p=>p.items)??[];
 return <section aria-label="Documenti da completare"><h3>Documenti da completare</h3>{query.isPending?<Loading label="Caricamento documenti…"/>:query.isError?<ErrorState error={query.error} onRetry={()=>void query.refetch()}/>:!items.length?<p>Nessun documento da completare.</p>:<><ul className={casa.documentList}>{items.slice(0,3).map(item=><li key={item.id}><Link to={base+'/'+encodeURIComponent(item.id)}>{item.name}</Link><DocumentWorkflowStatus state={item.workflowState}/></li>)}</ul><Link to={base+'?workflow=pending'}>Vedi tutti i documenti da completare</Link></>}</section>;
}
