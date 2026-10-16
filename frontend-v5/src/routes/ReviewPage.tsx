import { useState } from 'react';
import { useUpdateFocus } from '../components/useUpdateFocus';
import { Link } from 'react-router';
import { isApiError, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../api/queryKeys';
import type { ReviewItem } from '../api/types';
import { Banner, ErrorState, Loading, cx, ui, useDocumentTitle } from '../components/ui';
import { FIELD_LABEL, PERSONAL_LABEL, m3ErrorMessage } from '../lib/review';
import { ProposalCard } from '../review/components';
import { useConfirm, useRefreshAsset, useReview } from '../review/hooks';
import review from '../review/review.module.css';
import { useCurrentHome } from './HomePages';
import styles from './pages.module.css';
import { ReceiptComparisons } from '../receipt-integration/Surfaces';

/** Da rivedere: soltanto verifiche aperte, raggruppate per scheda. */
export function ReviewPage() {
  const home = useCurrentHome();
  useDocumentTitle(`Da rivedere · ${home.name}`);
  const query = useReview(home.id);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const openCount = query.data?.pages[0]?.openCount ?? 0;
  const statusRef = useUpdateFocus<HTMLParagraphElement>(home.id, query.data?.pages[0]?.openCount);
  const canEdit = home.permissions.includes('edit');

  const groups = new Map<string, ReviewItem[]>();
  for (const item of items) {
    const list = groups.get(item.assetId) ?? [];
    list.push(item);
    groups.set(item.assetId, list);
  }

  return (
    <>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>{home.name}</span>
          <h1 tabIndex={-1}>Da rivedere</h1>
          <p className={styles.lead}>
            Dati proposti dai documenti da confermare, correggere o non applicare. Confermare un dato non certifica il
            documento né l’impianto.
          </p>
        </div>
      </div>
      <ReceiptComparisons />
      {query.data && <p ref={statusRef} tabIndex={-1} role="status" className={styles.spaced}>
        <strong>{openCount}</strong> {openCount === 1 ? 'verifica aperta' : 'verifiche aperte'}. Le decisioni salvate restano nelle schede e nella storia.
      </p>}
      {query.isPending ? (
        <Loading label="Caricamento delle verifiche…" />
      ) : query.isError && !query.data ? (
        <ErrorState error={query.error} message={m3ErrorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      ) : items.length === 0 ? (
        <div className={cx(ui.card, styles.unavailable)}>
          <h2 className={styles.cardTitle}>Nessuna verifica aperta</h2>
          <p className={styles.muted}>
            Le decisioni prese restano nelle schede e nella loro storia.{' '}
            <Link to={`/home/${encodeURIComponent(home.id)}/attivita`}>Vai ad Attività</Link>
          </p>
        </div>
      ) : (
        <>
          <div className={styles.spaced}>
            {[...groups.entries()].map(([assetId, group]) => (
              <section key={assetId} className={review.group} aria-labelledby={`g-${assetId}`}>
                <div className={review.groupHeader}>
                  <h2 id={`g-${assetId}`}>
                    <Link to={`/home/${encodeURIComponent(home.id)}/impianti/${encodeURIComponent(assetId)}`}>{group[0]!.assetName}</Link>
                  </h2>
                  <span className={styles.small}>{PERSONAL_LABEL}</span>
                </div>
                {canEdit && <BatchConfirm homeId={home.id} items={group} />}
                {group.map((item) => (
                  <ProposalCard
                    key={item.proposal.id}
                    proposal={item.proposal}
                    homeId={home.id}
                    assetVersion={item.assetVersion}
                    canEdit={canEdit}
                  />
                ))}
              </section>
            ))}
          </div>
          {query.hasNextPage && (
            <p>
              <button type="button" className={ui.btn} onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                Mostra altre verifiche
              </button>
            </p>
          )}
        </>
      )}
    </>
  );
}

/**
 * Conferma insieme, atomica per scheda/versione, consentita solo per marca e
 * modello con un unico valore proposto e nessun valore già confermato.
 * La potenza non è mai inclusa: richiede una decisione puntuale con nota.
 */
function BatchConfirm({ homeId, items }: { homeId: string; items: ReviewItem[] }) {
  const assetId = items[0]!.assetId;
  const confirm = useConfirm(homeId, assetId);
  const refresh = useRefreshAsset(homeId, assetId);
  const eligible = items.filter(
    (i) => i.proposal.fieldKey !== 'power' && i.proposal.candidates.length === 1 && !i.proposal.currentConfirmed,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [key, setKey] = useState(newIdempotencyKey);
  if (eligible.length < 2) return null;
  const version = Math.max(...items.map((i) => i.assetVersion));
  const chosen = eligible.filter((i) => selected.includes(i.proposal.id));
  const ambiguous = confirm.isError && isApiError(confirm.error) && confirm.error.kind === 'service';

  const submit = () => {
    if (confirm.isPending || chosen.length === 0) return;
    confirm.mutate(
      {
        input: {
          expectedVersion: version,
          decisions: chosen.map((i) => ({ proposalId: i.proposal.id, action: 'accept', candidateId: i.proposal.candidates[0]!.id })),
        },
        idempotencyKey: key,
      },
      {
        onSuccess: () => {
          setSelected([]);
          setKey(newIdempotencyKey());
        },
        onError: (err) => {
          if (isApiError(err) && err.kind === 'http') {
            setKey(newIdempotencyKey());
            setSelected([]);
            void refresh();
          }
        },
      },
    );
  };

  return (
    <div className={review.batch} role="group" aria-label="Conferma insieme marca e modello">
      <strong>Conferma insieme i dati descrittivi</strong>
      {eligible.map((i) => (
        <label key={i.proposal.id} className={review.checkLine}>
          <input
            type="checkbox"
            checked={selected.includes(i.proposal.id)}
            disabled={confirm.isPending}
            onChange={(e) =>
              setSelected((prev) => (e.target.checked ? [...prev, i.proposal.id] : prev.filter((x) => x !== i.proposal.id)))
            }
          />
          <span>
            {FIELD_LABEL[i.proposal.fieldKey]}: <strong>{i.proposal.candidates[0]!.value}</strong>
          </span>
        </label>
      ))}
      <span className={styles.small}>La potenza si conferma a parte, con una decisione e una nota.</span>
      {confirm.isError && (
        <Banner tone={ambiguous ? 'error' : 'warning'} role="alert" title={ambiguous ? 'Esito non confermato' : 'Conferma non eseguita'}>
          <p>
            {userMessage(confirm.error)}
            {ambiguous ? ' Riprova: la stessa richiesta non viene duplicata.' : ' Ho riletto i dati: rivedi la selezione.'}
          </p>
        </Banner>
      )}
      <div className={review.actions}>
        <button type="button" className={cx(ui.btn, ui.small, ui.dark)} disabled={chosen.length === 0 || confirm.isPending} onClick={submit}>
          {confirm.isPending ? 'Conferma in corso…' : `Conferma selezionati (${chosen.length})`}
        </button>
      </div>
    </div>
  );
}
