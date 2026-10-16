import { Link } from 'react-router';
import { ErrorState, Loading, cx, ui } from '../components/ui';
import { m3ErrorMessage } from '../lib/review';
import { useReview } from '../review/hooks';
import styles from './pages.module.css';

export function CasaReviewSummary({ homeId }: { homeId: string }) {
  const review = useReview(homeId);
  const count = review.data?.pages[0]?.openCount;
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

