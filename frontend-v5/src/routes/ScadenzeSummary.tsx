import {Link} from 'react-router';
import type {Home} from '../api/types';
import {useActivitySummary} from '../activities/hooks';
import {ErrorState,Loading,cx,ui} from '../components/ui';
import {Icon} from '../components/Icon';
import {activityErrorMessage} from '../lib/activities';
import pages from './pages.module.css';
import casa from './casa.module.css';
/** Conteggi completi delle attività aperte dal server; errori distinti dallo zero. */
export function ScadenzeSummary({home}:{home:Home}){
 const summary=useActivitySummary(home.id),data=summary.data,base=`/home/${encodeURIComponent(home.id)}/attivita`;
 return <section className={cx(ui.card,pages.wide)} aria-labelledby="casa-scadenze"><h2 id="casa-scadenze" className={pages.cardTitle}>Le tue scadenze</h2>
 {summary.isPending?<Loading label="Caricamento delle scadenze…"/>:summary.isError||!data?<ErrorState title="Scadenze non disponibili" error={summary.error} message={activityErrorMessage(summary.error)} onRetry={()=>void summary.refetch()} retrying={summary.isFetching}/>:<>
 <div aria-label="Conteggi delle attività aperte">{([['overdue','Scadute'],['today','Oggi'],['upcoming','In programma']] as const).map(([due,label])=><Link key={due} className={casa.summaryRow} to={base+'?state=open&due='+due}><strong>{label}</strong>{' '}<span className={casa.counter}>{data.counts[due]}</span><Icon name="arrow"/></Link>)}</div>
 {Object.values(data.counts).every(n=>n===0)&&<p className={pages.small}>Nessuna attività aperta.</p>}
 <p className={cx(pages.small,casa.deadlineLinks)}><Link to={base}>Tutte le attività</Link>{data.counts.undated>0&&<Link to={base+'?state=open&due=undated'}>Senza data: {data.counts.undated}</Link>}{home.permissions.includes('edit')&&<Link to={base+'?nuova-attivita=1'}>Nuova attività</Link>}</p>
 </>}
 <p className={cx(pages.small,pages.muted)}>Promemoria personali, non scadenze di legge.</p></section>;
}
