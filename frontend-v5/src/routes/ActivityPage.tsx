import { useId, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { isApiError } from '../api/errors';
import { newIdempotencyKey } from '../api/queryKeys';
import type { AnalysisJob, Home } from '../api/types';
import { Icon } from '../components/Icon';
import { Banner, ErrorState, Field, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { useDocuments } from '../documents/hooks';
import { formatDate } from '../lib/files';
import {
  BOILER_STATE_LABEL,
  JOB_STATE_LABEL,
  PERSONAL_LABEL,
  SIMULATION_LABEL,
  jobErrorMessage,
  m3ErrorMessage,
  validateBoilerName,
} from '../lib/review';
import { SimulationBadge } from '../review/components';
import {
  isActive,
  useAssets,
  useCapabilities,
  useCreateBoiler,
  useJobProgress,
  useJobs,
  useRetryJob,
  useReview,
  useStartAnalysis,
} from '../review/hooks';
import styles from './pages.module.css';
import review from '../review/review.module.css';
import { useCurrentHome } from './HomePages';


export const EXAMPLE_PDFS = [
  { file: 'libretto-caldaia-demo.pdf', label: 'A — Libretto caldaia (sintetico)' },
  { file: 'scheda-tecnica-caldaia-demo.pdf', label: 'B — Scheda tecnica (sintetica)' },
  { file: 'rapporto-caldaia-demo-conflitto.pdf', label: 'C — Rapporto con dato in conflitto (sintetico)' },
];

/** Download statici dei tre PDF sintetici; il caricamento passa sempre da Documenti (M2). */
export function ExamplePdfs({ homeId }: { homeId: string }) {
  return (
    <section className={cx(ui.card, ui.tint, review.examples)} aria-labelledby="esempi-title">
      <h2 id="esempi-title" className={styles.cardTitle}>
        Documenti di esempio per l’analisi di test
      </h2>
      <p className={styles.small}>
        PDF interamente sintetici, non documenti reali di produttori. Il provider di test riconosce solo questi tre file:
        scaricali e caricali in <Link to={`/home/${encodeURIComponent(homeId)}/documenti`}>Documenti</Link>.
      </p>
      <ul>
        {EXAMPLE_PDFS.map((e) => (
          <li key={e.file}>
            <a href={`/m3-examples/${e.file}`} download={e.file}>
              {e.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ActivityPage() {
  const home = useCurrentHome();
  useDocumentTitle(`Attività · ${home.name}`);
  const [params, setParams] = useSearchParams();
  const focusJob = params.get('job');
  const analyze = params.get('analizza');
  const targetFromUrl = params.get('scheda');
  const canEdit = home.permissions.includes('edit');

  return (
    <>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>{home.name}</span>
          <h1 tabIndex={-1}>Attività</h1>
          <p className={styles.lead}>
            Analisi dei documenti e verifiche da rivedere. Le analisi di questa versione sono di test: nessuna AI reale.
          </p>
        </div>
      </div>
      <div className={styles.stack}>
        <ReviewSummary homeId={home.id} />
        {canEdit && (
          <StartAnalysis
            // Nuova richiesta di avvio (link «Analizza…») = pannello nuovo, anche restando su Attività.
            key={`${analyze ?? "-"}|${targetFromUrl ?? "-"}`}
            home={home}
            initialOpen={analyze !== null}
            preselect={analyze && analyze !== '1' ? analyze : null}
            preTarget={targetFromUrl}
            onStarted={(job) => setParams({ job: job.id }, { replace: true })}
            onClose={() => setParams({}, { replace: true })}
          />
        )}
        {focusJob && <JobProgress key={focusJob} homeId={home.id} jobId={focusJob} />}
        <JobsList homeId={home.id} canEdit={canEdit} onRetried={(job) => setParams({ job: job.id }, { replace: true })} />
        <BoilersSection home={home} />
        <ExamplePdfs homeId={home.id} />
      </div>
    </>
  );
}

function ReviewSummary({ homeId }: { homeId: string }) {
  const reviewQuery = useReview(homeId);
  const count = reviewQuery.data?.pages[0]?.openCount;
  return (
    <section className={ui.card} aria-labelledby="da-rivedere-title">
      <h2 id="da-rivedere-title" className={styles.cardTitle}>
        Da rivedere
      </h2>
      {reviewQuery.isPending ? (
        <Loading label="Conteggio delle verifiche…" />
      ) : reviewQuery.isError ? (
        <ErrorState
          error={reviewQuery.error}
          message={m3ErrorMessage(reviewQuery.error)}
          onRetry={() => void reviewQuery.refetch()}
          retrying={reviewQuery.isFetching}
        />
      ) : (
        <>
          <p>
            <span className={review.counter}>{count}</span>{' '}
            {count === 1 ? 'verifica aperta' : 'verifiche aperte'}
          </p>
          <p className={styles.spaced}>
            <Link to={`/home/${encodeURIComponent(homeId)}/review`} className={ui.btn}>
              Apri Da rivedere
            </Link>
          </p>
        </>
      )}
    </section>
  );
}

/**
 * Avvio esplicito di un'analisi di test: 1–2 PDF leggibili della casa, scelti
 * dall'utente; destinazione visibile (nuova scheda o scheda esistente).
 * Mai avviata al caricamento, al montaggio o all'apertura di un PDF.
 */
function StartAnalysis(props: {
  home: Home;
  initialOpen: boolean;
  preselect: string | null;
  preTarget: string | null;
  onStarted: (job: AnalysisJob) => void;
  onClose: () => void;
}) {
  const { home } = props;
  const [open, setOpen] = useState(props.initialOpen);
  const panelId = useId();
  if (!open) {
    return (
      <div>
        <button
          type="button"
          className={cx(ui.btn, ui.primary)}
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
        >
          <Icon name="plus" />
          Nuova analisi di test
        </button>
      </div>
    );
  }
  return (
    <section id={panelId} className={ui.card} aria-labelledby={`${panelId}-title`}>
      <StartAnalysisForm
        home={home}
        titleId={`${panelId}-title`}
        preselect={props.preselect}
        preTarget={props.preTarget}
        onStarted={(job) => {
          setOpen(false);
          props.onStarted(job);
        }}
        onCancel={() => {
          setOpen(false);
          props.onClose();
        }}
      />
    </section>
  );
}

function StartAnalysisForm(props: {
  home: Home;
  titleId: string;
  preselect: string | null;
  preTarget: string | null;
  onStarted: (job: AnalysisJob) => void;
  onCancel: () => void;
}) {
  const { home } = props;
  const capabilities = useCapabilities(home.id);
  const documents = useDocuments(home.id);
  const assets = useAssets(home.id);
  const start = useStartAnalysis(home.id);
  const [selected, setSelected] = useState<string[]>(() => (props.preselect ? [props.preselect] : []));
  // Una rianalisi della scheda passa sempre il suo target: mai una scheda ricreata per errore.
  const [target, setTarget] = useState(props.preTarget ?? '');
  const [key, setKey] = useState(newIdempotencyKey);
  const [error, setError] = useState<string | null>(null);

  const max = capabilities.data?.maxDocuments ?? 0;
  const docs = useMemo(() => {
    const formats = capabilities.data?.formats ?? [];
    return (documents.data?.pages.flatMap((p) => p.items) ?? []).filter((d) => formats.includes(d.mimeType));
  }, [documents.data, capabilities.data]);
  const myBoilers = (assets.data?.pages.flatMap((p) => p.items) ?? []).filter((a) => a.permissions.includes('edit'));
  const targetName = myBoilers.find((b) => b.id === target)?.name;

  if (capabilities.isPending) return <Loading label="Verifica delle analisi disponibili…" />;
  if (capabilities.isError) {
    return (
      <ErrorState
        title="Analisi non disponibili"
        error={capabilities.error}
        message={m3ErrorMessage(capabilities.error)}
        onRetry={() => void capabilities.refetch()}
        retrying={capabilities.isFetching}
      />
    );
  }
  if (!capabilities.data.enabled) {
    return (
      <Banner tone="warning" title="Analisi di test non attiva">
        <p>Il servizio non consente ora di avviare analisi. Puoi sempre inserire i dati a mano in una scheda.</p>
      </Banner>
    );
  }

  const toggle = (id: string) => {
    setError(null);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < max ? [...prev, id] : prev));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (start.isPending) return;
    if (selected.length < 1 || selected.length > max) {
      setError(`Scegli da 1 a ${max} documenti PDF.`);
      return;
    }
    start.mutate(
      { documentIds: selected, targetAssetId: target || undefined, idempotencyKey: key },
      {
        onSuccess: (job) => props.onStarted(job),
        onError: (err) => {
          if (isApiError(err) && err.kind === 'http') setKey(newIdempotencyKey());
        },
      },
    );
  };

  const ambiguous = start.isError && isApiError(start.error) && start.error.kind === 'service';

  return (
    <form className={cx(styles.form)} onSubmit={onSubmit} noValidate aria-labelledby={props.titleId}>
      <div>
        <h2 id={props.titleId} tabIndex={-1}>
          Nuova analisi di test
        </h2>
        <p className={styles.spaced}>
          <SimulationBadge />
        </p>
        <p className={cx(styles.small, styles.muted, styles.spaced)}>
          Provider di test: riconosce solo i tre PDF di esempio. Su altri documenti l’analisi non produce dati e resta
          l’inserimento manuale. Puoi scegliere fino a {max} PDF.
        </p>
      </div>
      <fieldset className={review.options} disabled={start.isPending}>
        <legend>Documenti da analizzare</legend>
        {documents.isPending ? (
          <Loading label="Caricamento dei documenti…" />
        ) : documents.isError ? (
          <ErrorState error={documents.error} onRetry={() => void documents.refetch()} retrying={documents.isFetching} />
        ) : docs.length === 0 ? (
          <p className={styles.muted}>
            Nessun PDF leggibile in questa casa. Carica prima un documento in{' '}
            <Link to={`/home/${encodeURIComponent(home.id)}/documenti`}>Documenti</Link>.
          </p>
        ) : (
          docs.map((d) => (
            <label key={d.id} className={review.option}>
              <input
                type="checkbox"
                checked={selected.includes(d.id)}
                disabled={!selected.includes(d.id) && selected.length >= max}
                onChange={() => toggle(d.id)}
              />
              <span className={review.optionBody}>
                <span className={review.value}>{d.name}</span>
                <span className={styles.small}>{d.originalFilename}</span>
              </span>
            </label>
          ))
        )}
        {documents.hasNextPage && (
          <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void documents.fetchNextPage()}>
            Mostra altri documenti
          </button>
        )}
      </fieldset>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${props.titleId}-target`}>
          Destinazione dei risultati
        </label>
        <select
          id={`${props.titleId}-target`}
          className={review.select}
          value={target}
          disabled={start.isPending}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">Nuova scheda caldaia personale</option>
          {myBoilers.map((b) => (
            <option key={b.id} value={b.id}>
              Scheda esistente: {b.name}
            </option>
          ))}
        </select>
      </div>
      <p className={styles.small}>
        Destinazione: <strong>{targetName ? `scheda «${targetName}»` : 'una nuova scheda caldaia'}</strong> in{' '}
        <strong>{home.name}</strong>. {PERSONAL_LABEL}: non viene condivisa con le altre persone della casa.
      </p>
      {error && (
        <Banner tone="error" role="alert">
          <p>{error}</p>
        </Banner>
      )}
      {start.isError && (
        <Banner tone="error" role="alert" title={ambiguous ? 'Esito non confermato' : 'Analisi non avviata'}>
          <p>
            {m3ErrorMessage(start.error)}
            {ambiguous ? ' Riprova: la stessa richiesta non avvia un’analisi doppia.' : ''}
          </p>
        </Banner>
      )}
      <div className={styles.formActions}>
        <button type="submit" className={cx(ui.btn, ui.primary)} disabled={start.isPending || selected.length === 0}>
          {start.isPending ? 'Avvio in corso…' : ambiguous ? 'Riprova avvio' : 'Avvia analisi di test'}
        </button>
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onCancel} disabled={start.isPending}>
          Annulla
        </button>
      </div>
    </form>
  );
}

function JobProgress({ homeId, jobId }: { homeId: string; jobId: string }) {
  const progress = useJobProgress(homeId, jobId);
  const job = progress.data;
  return (
    <section className={ui.card} aria-labelledby="job-progress-title" aria-live="polite">
      <h2 id="job-progress-title" className={styles.cardTitle}>
        Analisi avviata
      </h2>
      {progress.isPending ? (
        <Loading label="Lettura dello stato dell’analisi…" />
      ) : progress.isError ? (
        <ErrorState
          error={progress.error}
          message={m3ErrorMessage(progress.error)}
          onRetry={() => void progress.refresh()}
          retrying={progress.isFetching}
        />
      ) : job ? (
        <JobOutcome homeId={homeId} job={job} expired={progress.expired} onRefresh={() => void progress.refresh()} refreshing={progress.isFetching} />
      ) : null}
    </section>
  );
}

function JobOutcome(props: { homeId: string; job: AnalysisJob; expired: boolean; onRefresh: () => void; refreshing: boolean }) {
  const { job, homeId } = props;
  return (
    <div className={styles.stack}>
      <p>
        <Tag tone={job.state === 'failed' ? 'warn' : 'blue'}>{JOB_STATE_LABEL[job.state]}</Tag> <SimulationBadge />
      </p>
      {isActive(job) && !props.expired && <Loading label="Analisi di test in corso…" />}
      {isActive(job) && props.expired && (
        <Banner title="Analisi in corso: puoi tornare più tardi">
          <p>Il risultato resta disponibile in Attività. Puoi aggiornare quando vuoi.</p>
        </Banner>
      )}
      {isActive(job) && props.expired && (
        <p>
          <button type="button" className={ui.btn} onClick={props.onRefresh} disabled={props.refreshing}>
            {props.refreshing ? 'Aggiornamento…' : 'Aggiorna'}
          </button>
        </p>
      )}
      {job.state === 'succeeded' && (
        <p>
          {job.outcome === 'no_changes'
            ? 'Nessuna novità: i dati coincidono con quelli già confermati o con decisioni già prese.'
            : `Proposte create: ${job.openReviewCount ?? 0} ${job.openReviewCount === 1 ? 'verifica aperta' : 'verifiche aperte'}.`}{' '}
          {job.assetId && (
            <Link to={`/home/${encodeURIComponent(homeId)}/impianti/${encodeURIComponent(job.assetId)}`}>Apri la scheda</Link>
          )}{' '}
          · <Link to={`/home/${encodeURIComponent(homeId)}/review`}>Da rivedere</Link>
        </p>
      )}
      {job.state === 'failed' && (
        <Banner tone="warning" title="Analisi non riuscita">
          <p>{jobErrorMessage(job)}</p>
        </Banner>
      )}
    </div>
  );
}

function JobsList({ homeId, canEdit, onRetried }: { homeId: string; canEdit: boolean; onRetried: (job: AnalysisJob) => void }) {
  const jobs = useJobs(homeId);
  const items = jobs.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section aria-labelledby="analisi-title">
      <h2 id="analisi-title" className={styles.cardTitle}>
        Le tue analisi
      </h2>
      {jobs.isPending ? (
        <Loading label="Caricamento delle analisi…" />
      ) : jobs.isError && !jobs.data ? (
        <ErrorState error={jobs.error} message={m3ErrorMessage(jobs.error)} onRetry={() => void jobs.refetch()} retrying={jobs.isFetching} />
      ) : items.length === 0 ? (
        <p className={styles.muted}>Nessuna analisi avviata in questa casa.</p>
      ) : (
        <ul className={review.jobList}>
          {items.map((job) => (
            <JobRow key={job.id} homeId={homeId} job={job} canEdit={canEdit} onRetried={onRetried} />
          ))}
        </ul>
      )}
      {jobs.hasNextPage && (
        <p className={styles.spaced}>
          <button type="button" className={ui.btn} onClick={() => void jobs.fetchNextPage()} disabled={jobs.isFetchingNextPage}>
            Mostra altre analisi
          </button>
        </p>
      )}
    </section>
  );
}

function JobRow({ homeId, job, canEdit, onRetried }: { homeId: string; job: AnalysisJob; canEdit: boolean; onRetried: (job: AnalysisJob) => void }) {
  const retry = useRetryJob(homeId);
  const [key, setKey] = useState(newIdempotencyKey);
  const ambiguous = retry.isError && isApiError(retry.error) && retry.error.kind === 'service';
  return (
    <li className={review.job}>
      <div className={review.jobHead}>
        <Tag tone={job.state === 'failed' ? 'warn' : 'blue'}>{JOB_STATE_LABEL[job.state]}</Tag>
        <span className={styles.small}>
          {job.documentIds.length} {job.documentIds.length === 1 ? 'documento' : 'documenti'} · avviata {formatDate(job.createdAt)}
          {job.finishedAt ? ` · conclusa ${formatDate(job.finishedAt)}` : ''}
        </span>
      </div>
      <span className={styles.small}>{SIMULATION_LABEL}</span>
      {job.parentJobId && <span className={styles.small}>Nuovo tentativo di un’analisi non riuscita.</span>}
      {job.state === 'failed' && (
        <p className={styles.small}>
          <strong>Errore:</strong> {jobErrorMessage(job)} <span className={styles.muted}>({job.error?.code})</span>
        </p>
      )}
      {job.state === 'succeeded' && (
        <p className={styles.small}>
          {job.outcome === 'no_changes' ? 'Nessuna novità.' : `Verifiche create: ${job.openReviewCount ?? 0}.`}
        </p>
      )}
      <div className={review.actions}>
        {job.assetId && (
          <Link to={`/home/${encodeURIComponent(homeId)}/impianti/${encodeURIComponent(job.assetId)}`} className={cx(ui.btn, ui.small)}>
            Apri la scheda
          </Link>
        )}
        {isActive(job) && (
          <Link to={`?job=${encodeURIComponent(job.id)}`} className={cx(ui.btn, ui.small)}>
            Segui l’avanzamento
          </Link>
        )}
        {job.state === 'failed' && canEdit && (
          <button
            type="button"
            className={cx(ui.btn, ui.small)}
            disabled={retry.isPending}
            onClick={() =>
              retry.mutate(
                { jobId: job.id, idempotencyKey: key },
                {
                  onSuccess: (newJob) => {
                    setKey(newIdempotencyKey());
                    onRetried(newJob);
                  },
                  onError: (err) => {
                    if (isApiError(err) && err.kind === 'http') setKey(newIdempotencyKey());
                  },
                },
              )
            }
          >
            {retry.isPending ? 'Nuovo tentativo…' : ambiguous ? 'Riprova di nuovo' : 'Nuovo tentativo'}
          </button>
        )}
      </div>
      {retry.isError && (
        <Banner tone="error" role="alert" title="Nuovo tentativo non avviato">
          <p>{m3ErrorMessage(retry.error)}</p>
        </Banner>
      )}
    </li>
  );
}

function BoilersSection({ home }: { home: Home }) {
  const assets = useAssets(home.id);
  const items = assets.data?.pages.flatMap((p) => p.items) ?? [];
  const canEdit = home.permissions.includes('edit');
  const [creating, setCreating] = useState(false);
  return (
    <section className={ui.card} aria-labelledby="schede-title">
      <h2 id="schede-title" className={styles.cardTitle}>
        Le tue schede caldaia
      </h2>
      <p className={cx(styles.small, styles.muted)}>{PERSONAL_LABEL}.</p>
      {assets.isPending ? (
        <Loading label="Caricamento delle schede…" />
      ) : assets.isError && !assets.data ? (
        <ErrorState error={assets.error} message={m3ErrorMessage(assets.error)} onRetry={() => void assets.refetch()} retrying={assets.isFetching} />
      ) : items.length === 0 ? (
        <p className={cx(styles.muted, styles.spaced)}>Nessuna scheda caldaia.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((a) => (
            <li key={a.id}>
              <Link to={`/home/${encodeURIComponent(home.id)}/impianti/${encodeURIComponent(a.id)}`}>{a.name}</Link> —{' '}
              {BOILER_STATE_LABEL[a.state]}
              {a.openReviewCount > 0 ? ` · ${a.openReviewCount} da rivedere` : ''}
            </li>
          ))}
        </ul>
      )}
      {canEdit &&
        (creating ? (
          <CreateBoilerForm homeId={home.id} onCancel={() => setCreating(false)} />
        ) : (
          <p className={styles.spaced}>
            <button type="button" className={ui.btn} onClick={() => setCreating(true)}>
              Crea una scheda caldaia a mano
            </button>
          </p>
        ))}
    </section>
  );
}

function CreateBoilerForm({ homeId, onCancel }: { homeId: string; onCancel: () => void }) {
  const navigate = useNavigate();
  const create = useCreateBoiler(homeId);
  const [name, setName] = useState('Caldaia');
  const [error, setError] = useState<string | undefined>();
  const [key, setKey] = useState(newIdempotencyKey);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (create.isPending) return;
    const e = validateBoilerName(name);
    setError(e);
    if (e) return;
    create.mutate(
      { name: name.trim(), idempotencyKey: key },
      {
        onSuccess: (asset) => navigate(`/home/${encodeURIComponent(homeId)}/impianti/${encodeURIComponent(asset.id)}`),
        onError: (err) => {
          if (isApiError(err) && err.kind === 'http') setKey(newIdempotencyKey());
        },
      },
    );
  };
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate aria-label="Nuova scheda caldaia">
      <Field label="Nome della scheda" name="boilerName" value={name} onChange={(e) => setName(e.target.value)} error={error} disabled={create.isPending} />
      <p className={cx(styles.small, styles.muted)}>Dopo la creazione potrai inserire marca, modello e potenza a mano.</p>
      {create.isError && (
        <Banner tone="error" role="alert" title="Scheda non creata">
          <p>{m3ErrorMessage(create.error)}</p>
        </Banner>
      )}
      <div className={styles.formActions}>
        <button type="submit" className={cx(ui.btn, ui.primary)} disabled={create.isPending}>
          {create.isPending ? 'Creazione…' : 'Crea scheda'}
        </button>
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={onCancel} disabled={create.isPending}>
          Annulla
        </button>
      </div>
    </form>
  );
}
