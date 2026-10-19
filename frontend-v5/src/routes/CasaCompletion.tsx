import {Link} from 'react-router';
import {useReview} from '../review/hooks';
import {CasaDocumentsSummary,useCasaDocumentCounts} from './CasaDocumentsSummary';
import {CasaReviewSummary} from './CasaTasksSummary';
import casa from './casa.module.css';
export function CasaCompletion({homeId}:{homeId:string}){
 const docs=useCasaDocumentCounts(homeId),review=useReview(homeId);
 const empty=docs.isSuccess&&!docs.isError&&review.isSuccess&&!review.isError&&review.data.pages[0]?.openCount===0&&(['to_compile','review','analyzing','attention'] as const).every(k=>docs.data.counts[k]===0);
 const counts=<div className={casa.todoCounts}><CasaDocumentsSummary homeId={homeId}/><CasaReviewSummary homeId={homeId} compact/></div>;
 return <section className={casa.todo} aria-label="Da completare"><h2>Da completare</h2>{empty?<><div className={casa.quietLine}><p role="status">Tutto completato.</p><Link to={`/home/${homeId}/documenti`}>Apri documenti</Link><Link to={`/home/${homeId}/review`}>Apri verifiche</Link></div></>:counts}</section>;
}
