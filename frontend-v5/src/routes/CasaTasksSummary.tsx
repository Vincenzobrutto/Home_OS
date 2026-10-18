import { Link } from 'react-router';
import { ErrorState, Loading, cx, ui } from '../components/ui';
import { m3ErrorMessage } from '../lib/review';
import { useReview } from '../review/hooks';
import styles from './pages.module.css';
import casa from './casa.module.css';
import {Icon} from '../components/Icon';

export function CasaReviewSummary({ homeId,compact=false }: { homeId: string;compact?:boolean }) {
  const review = useReview(homeId);
  const count = review.data?.pages[0]?.openCount;
  if(compact)return <section aria-label="Da rivedere">{review.isPending?<Loading label="Caricamento conteggio verifiche…"/>:review.isError||count===undefined?<ErrorState error={review.error??new Error('Conteggio non disponibile.')} onRetry={()=>void review.refetch()}/>:<Link className={casa.summaryRow} to={`/home/${encodeURIComponent(homeId)}/review`}><strong>Verifiche da rivedere</strong>{' '}<span className={casa.counter}>{count}</span><Icon name="arrow"/></Link>}</section>;
  if (review.isSuccess && count === 0) return <section className={cx(ui.card, styles.quietSummary)} aria-labelledby="casa-verifiche"><h2 id="casa-verifiche" className={styles.cardTitle}>Da rivedere</h2><p>Nessuna verifica aperta. <Link to={`/home/${encodeURIComponent(homeId)}/review`}>Apri verifiche</Link></p></section>;
  return (
    <section className={cx(ui.card, styles.wide)} aria-labelledby="casa-verifiche">
      <h2 id="casa-verifiche" className={styles.cardTitle}>Da rivedere</h2>
      {review.isPending ? <Loading label="Caricamento delle verifiche…" /> : review.isError ? (
        <ErrorState error={review.error} message={m3ErrorMessage(review.error)} onRetry={() => void review.refetch()} retrying={review.isFetching} />
      ) : (
        <>
          <p>{count === 0 ? 'Nessuna verifica aperta.' : count === 1 ? '1 verifica da rivedere' : `${count} verifiche da rivedere`}</p>
          <p className={cx(styles.small, styles.muted)}>I dati proposti diventano confermati solo quando li approvi tu.</p>
          <p className={styles.spaced}><Link className={ui.btn} to={`/home/${encodeURIComponent(homeId)}/review`}>Apri le verifiche</Link></p>
        </>
      )}
    </section>
  );
}

