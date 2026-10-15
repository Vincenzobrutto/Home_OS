import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import type { AmountCandidate, Billing, Category, CandidateExpense, ConfirmDraft, EconomicDraft, EconomyCapabilities, ExpenseValues, Provider, SourceCitation } from '../api/economyTypes';
import type { Home } from '../api/types';
import act from '../activities/activities.module.css';
import { Dialog, NoteField } from '../activities/components';
import { Banner, ErrorState, Field, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { economyExpensePath, economyStyles as styles } from '../economy/components';
import { useDocuments } from '../documents/hooks';
import {
  useDraftCandidates,
  useEconomicDraft,
  useEconomicDrafts,
  useEconomicJob,
  useEconomyCapabilities,
  useEconomyOperation,
  useForgetEconomy,
  useRefreshEconomy,
  useWorks,
  type EconomyResult,
} from '../economy/hooks';
import { formatCalendarDate, formatTimestamp } from '../lib/activities';
import {
  DOCUMENT_KIND_LABEL,
  DRAFT_CONFLICTS,
  DRAFT_STATE_LABEL,
  PROPOSED_FIELD_LABEL,
  REASON_LABEL,
  ROLE_HINT,
  ROLE_LABEL,
  BILLING_STATE_LABEL,
  analysisAvailability,
  providerAvailabilityMessage,
  formatUsd,
  isRealProvider,
  draftErrorMessage,
  jobErrorText,
  jobRetryUseful,
} from '../lib/economicDrafts';
import { categoryLabel, familyLabel, isAmbiguousError, isForbiddenError, isNotActiveError, isUuid, optionalText, previewFamily, validateCompetence, validateOptionalDate, validateOptionalText } from '../lib/economy';
import { centsToInput, formatCents, normalizeNote, normalizeText, parseAmount, validateNote, validateSpentOn, validateTitle } from '../lib/expenses';
import { isApiError } from '../api/errors';
import { useCatalog } from '../objects/hooks';
import { useAccount } from '../session/session';
import { UploadForm } from './DocumentsPages';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';

// S1c — percorso «Da documento»: scelta dell'originale, avvio esplicito, stato del job,
// bozza con fonti, scelta dell'importo, possibili costi esistenti, conferma atomica,
// accantonamento e ripresa. Nessuna analisi automatica, nessun dato inventato.

const SIMULATION_LABEL = 'Prova su PDF sintetici · nessun modello AI';
/** «ad Anthropic», «a Mistral»: preposizione corretta davanti al nome del provider. */
const toProvider = (label: string) => (/^[aeiou]/i.test(label) ? `ad ${label}` : `a ${label}`);

/** Ritorno a Spese con vista/famiglia/periodo di partenza, solo se dello stesso account. */
type Ret = { accountId?: string; expensesSearch?: string; economyQ?: string } | null;

function useReturn() {
  const location = useLocation();
  const account = useAccount();
  const home = useCurrentHome();
  const saved = location.state as Ret;
  const ok = saved?.accountId === account.id && typeof saved.expensesSearch === 'string';
  const state = ok ? { accountId: account.id, expensesSearch: saved!.expensesSearch, economyQ: saved!.economyQ } : { accountId: account.id };
  const spese = `/home/${encodeURIComponent(home.id)}/spese${ok && saved!.expensesSearch ? `?${saved!.expensesSearch}` : ''}`;
  return { state, spese, backState: ok ? { accountId: account.id, economyQ: saved!.economyQ } : undefined };
}

export const draftsPath = (homeId: string, draftId?: string) => `/home/${encodeURIComponent(homeId)}/spese/bozze${draftId ? `/${encodeURIComponent(draftId)}` : ''}`;
const jobPath = (homeId: string, jobId: string) => `/home/${encodeURIComponent(homeId)}/spese/analisi/${encodeURIComponent(jobId)}`;

function useS1cCaps(home: Home) {
  const caps = useEconomyCapabilities(home.id);
  const forget = useForgetEconomy(home.id);
  const forbidden = caps.isError && isForbiddenError(caps.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una pulizia per ogni 403
  }, [forbidden]);
  return caps;
}

function Gate(props: { home: Home; title: string; caps: ReturnType<typeof useEconomyCapabilities>; back: ReactNode; children: (caps: EconomyCapabilities) => ReactNode }) {
  useDocumentTitle(`${props.title} · ${props.home.name}`);
  const { caps } = props;
  if (caps.isPending) return <>{props.back}<Loading label="Verifica del servizio…" /></>;
  if (caps.isError) {
    return (
      <>
        {props.back}
        <h1 tabIndex={-1}>{props.title}</h1>
        {isNotActiveError(caps.error) ? (
          <p className={pages.muted}>Lo storico economico non è attivo su questo servizio.</p>
        ) : (
          <ErrorState error={caps.error} message={draftErrorMessage(caps.error)} onRetry={isForbiddenError(caps.error) ? undefined : () => void caps.refetch()} />
        )}
      </>
    );
  }
  return <>{props.children(caps.data)}</>;
}

/** Esito di un'operazione S1c: esito ignoto con riprova identica, conflitti con rilettura. */
function DraftFeedback(props: { op: ReturnType<typeof useEconomyOperation>; homeId: string; title: string; onRetry: () => void }) {
  const refresh = useRefreshEconomy(props.homeId);
  const { mutation } = props.op;
  if (!mutation.isError) return null;
  if (isAmbiguousError(mutation.error)) {
    return (
      <Banner tone="error" role="alert" title="Esito non confermato" actions={<button type="button" className={cx(ui.btn, ui.small)} onClick={props.onRetry} disabled={mutation.isPending}>Riprova invio</button>}>
        <p>Non sappiamo se l’operazione è stata salvata (rete o servizio non raggiungibile). «Riprova invio» ripete la stessa richiesta, senza duplicarla.</p>
      </Banner>
    );
  }
  const conflict = isApiError(mutation.error) && DRAFT_CONFLICTS.includes(mutation.error.code);
  return (
    <Banner
      tone="warning"
      role="alert"
      title={props.title}
      actions={conflict && <button type="button" className={cx(ui.btn, ui.small)} onClick={() => { props.op.reset(); void refresh(); }}>Rileggi i dati</button>}
    >
      <p>{draftErrorMessage(mutation.error)}</p>
    </Banner>
  );
}

// ---------------------------------------------------------------------------------
// 1. Da documento: scelta dell'originale e avvio esplicito
// ---------------------------------------------------------------------------------

export function FromDocumentPage() {
  const home = useCurrentHome();
  const account = useAccount();
  const caps = useS1cCaps(home);
  const ret = useReturn();
  const back = <Link to={ret.spese} state={ret.backState} className={pages.spaced}>← Spese</Link>;
  // Chiave per account e casa: scelte e consenso non sopravvivono a un cambio di contesto.
  return (
    <Gate home={home} title="Spesa da documento" caps={caps} back={back}>
      {(c) => <FromDocument key={`${account.id}:${home.id}`} home={home} caps={c} back={back} />}
    </Gate>
  );
}

function FromDocument({ home, caps, back }: { home: Home; caps: EconomyCapabilities; back: ReactNode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ret = useReturn();
  const id = useId();
  const availability = analysisAvailability(caps);
  const documents = useDocuments(home.id);
  const docs = (documents.data?.pages.flatMap((p) => p.items) ?? []).filter((d) => d.permissions.includes('read'));
  const preset = params.get('documentId');
  const [chosen, setChosen] = useState<string>(isUuid(preset) ? preset : '');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const options = availability.mode === 'on' ? [...availability.real, ...(availability.fixture ? [availability.fixture] : [])] : [];
  // Con un solo provider disponibile la scelta è implicita; con più provider resta vuota finché l'utente non sceglie.
  const [providerChoice, setProviderChoice] = useState<Provider | ''>('');
  const provider = options.length === 1 ? options[0]! : options.find((p) => p.id === providerChoice) ?? null;
  // Consenso e presa d'atto valgono solo per la coppia documento/provider per cui sono stati dati:
  // cambiando l'uno o l'altro la casella torna vuota. Solo stato locale, mai URL o storage.
  const pair = `${chosen}|${provider?.id ?? ''}`;
  const [consentFor, setConsentFor] = useState<string | null>(null);
  const [understoodFor, setUnderstoodFor] = useState<string | null>(null);
  const real = !!provider && !provider.isSimulation;
  const consent = real && consentFor === pair;
  const understood = !!provider && provider.isSimulation && understoodFor === pair;
  const op = useEconomyOperation(home.id);
  // Durante l'invio o con esito ignoto la richiesta resta quella già spedita: scelte bloccate.
  const frozen = op.mutation.isPending || op.locked;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const canEdit = home.permissions.includes('edit');
  const chosenDoc = docs.find((d) => d.id === chosen);
  const chosenName = chosenDoc?.name ?? (chosen && uploadedName) ?? null;
  const isPdf = !chosenDoc || chosenDoc.mimeType === 'application/pdf';
  const manualHref = `/home/${encodeURIComponent(home.id)}/spese?nuova-spesa=1${chosen ? `&documentId=${encodeURIComponent(chosen)}` : ''}`;
  const toJob = (res: EconomyResult) => {
    if ('job' in res) navigate(jobPath(home.id, res.job.id), { state: ret.state });
  };
  // Rifiuto definito: il consenso dato per quella richiesta non vale per un nuovo invio.
  const forgetConsent = () => {
    setConsentFor(null);
    setUnderstoodFor(null);
  };
  // Ogni cambio di documento o provider richiede un consenso nuovo, anche tornando a una scelta precedente.
  const pickDocument = (docId: string) => {
    forgetConsent();
    setChosen(docId);
  };
  const start = () => {
    if (!chosen || !provider || (real ? !consent : !understood)) return;
    const body = real ? { documentId: chosen, provider: provider.id, consentToProviderTransfer: true as const } : { documentId: chosen, provider: provider.id };
    op.run({ kind: 'analysisStart', body }, toJob, forgetConsent);
  };
  return (
    <>
      {back}
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>{home.name} · Spese</span>
          <h1 ref={heading} tabIndex={-1}>Spesa da documento</h1>
          <p className={pages.lead}>Scegli l’originale. I dati proposti vanno sempre controllati e confermati da te: nessun costo viene registrato da solo.</p>
        </div>
      </div>
      <div className={pages.stack}>
        <section className={ui.card} aria-labelledby={`${id}-doc`}>
          <h2 id={`${id}-doc`} className={pages.cardTitle}>1. Documento originale</h2>
          {documents.isPending ? (
            <Loading label="Caricamento dei documenti…" />
          ) : documents.isError ? (
            <ErrorState error={documents.error} onRetry={() => void documents.refetch()} title="Documenti non disponibili" />
          ) : (
            <fieldset style={{ border: 0, padding: 0, margin: 0 }} disabled={frozen}>
              <legend className="visually-hidden">Documento da usare</legend>
              {docs.length === 0 && <p className={pages.muted}>Nessun documento nella casa: caricane uno.</p>}
              <ul className={act.list} aria-label="Documenti disponibili">
                {docs.map((d) => (
                  <li key={d.id} className={act.item}>
                    <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                      <input type="radio" name={`${id}-doc-choice`} value={d.id} checked={chosen === d.id} onChange={() => pickDocument(d.id)} />
                      <span>
                        <strong>{d.name}</strong>
                        <span className={act.meta} style={{ display: 'block' }}>{d.mimeType === 'application/pdf' ? 'PDF' : 'Immagine: non analizzabile, solo inserimento manuale'} · caricato il {formatTimestamp(d.createdAt)}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {documents.hasNextPage && (
                <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void documents.fetchNextPage()} disabled={documents.isFetchingNextPage}>Altri documenti</button>
              )}
            </fieldset>
          )}
          {canEdit && !uploadOpen && !frozen && (
            <p className={pages.spaced}>
              <button type="button" className={ui.btn} onClick={() => setUploadOpen(true)}>Carica un nuovo documento</button>
            </p>
          )}
          {uploadOpen && (
            <div className={pages.spaced}>
              <UploadForm
                home={home}
                titleId={`${id}-upload`}
                onCancel={() => setUploadOpen(false)}
                onUploaded={(d) => {
                  setUploadOpen(false);
                  setUploadedName(d.name);
                  pickDocument(d.id);
                }}
              />
              <p className={act.meta}>Il file viene conservato in Documenti come ogni altro originale. Il caricamento non avvia nessuna analisi.</p>
            </div>
          )}
          {uploadedName && <Banner role="status"><p>«{uploadedName}» caricato in Documenti e selezionato.</p></Banner>}
        </section>

        <section className={ui.card} aria-labelledby={`${id}-how`}>
          <h2 id={`${id}-how`} className={pages.cardTitle}>2. Come procedere</h2>
          {availability.mode === 'off' ? (
            <p className={pages.muted}>{availability.reason}</p>
          ) : (
            <>
              {options.length > 1 && (
                <fieldset style={{ border: 0, padding: 0, margin: 0 }} disabled={frozen}>
                  <legend className={act.meta}>Scegli come leggere il documento:</legend>
                  <ul className={act.list} aria-label="Modalità di analisi">
                    {options.map((p) => (
                      <li key={p.id} className={act.item}>
                        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                          <input type="radio" name={`${id}-provider`} value={p.id} checked={provider?.id === p.id} onChange={() => { forgetConsent(); setProviderChoice(p.id); }} />
                          <span>
                            <strong>{p.isSimulation ? SIMULATION_LABEL : `Analisi con ${p.label}`}</strong>
                            <span className={act.meta} style={{ display: 'block' }}>
                              {p.isSimulation ? 'Valori preimpostati, nessun invio a servizi esterni.' : `Il testo del documento viene inviato ${toProvider(p.label)}${p.model ? ` (modello ${p.model})` : ''}.`}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              )}
              {provider?.isSimulation && (
                <>
                  <p><Tag tone="warn">{SIMULATION_LABEL}</Tag></p>
                  <p className={act.meta}>
                    Qui puoi provare il percorso con due PDF di esempio e valori preimpostati.
                    Non legge le tue bollette con un modello AI e non invia testo a servizi esterni. Per i documenti ordinari usa l’inserimento manuale.
                  </p>
                  <label className={act.meta} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
                    <input type="checkbox" checked={understood} disabled={frozen} onChange={(e) => setUnderstoodFor(e.target.checked ? pair : null)} />
                    <span>Voglio avviare la prova sintetica su questo documento, sapendo che non è un’analisi reale.</span>
                  </label>
                </>
              )}
              {provider && !provider.isSimulation && (
                <>
                  <p className={act.meta}>
                    Analisi con {provider.label}{provider.model ? ` · modello ${provider.model}` : ''}. Ogni analisi può avere un costo per il servizio: non è una spesa della casa e non entra nei totali.
                  </p>
                  {chosen && isPdf ? (
                    <label className={act.meta} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
                      <input type="checkbox" checked={consent} disabled={frozen} onChange={(e) => setConsentFor(e.target.checked ? pair : null)} />
                      <span>
                        Invia {toProvider(provider.label)} il testo di «{chosenName ?? 'documento scelto'}» per proporre i dati della spesa. Le proposte non vengono registrate da sole: dovrò controllarle e confermarle io.
                      </span>
                    </label>
                  ) : (
                    <p className={act.meta}>Scegli un PDF: prima dell’invio ti chiederemo un consenso esplicito per quel documento.</p>
                  )}
                </>
              )}
            </>
          )}
          {availability.disabled.length > 0 && (
            <ul className={act.meta}>
              {availability.disabled.map((p) => (
                <li key={p.id}>{p.label}: {providerAvailabilityMessage(p.disabledReason)}</li>
              ))}
            </ul>
          )}
          {!isPdf && <Banner tone="warning"><p>Il documento scelto non è un PDF: l’analisi non è possibile. Puoi inserire il costo a mano.</p></Banner>}
          <DraftFeedback op={op} homeId={home.id} title="Analisi non avviata" onRetry={() => op.retry(toJob, forgetConsent)} />
          <p className={act.actions}>
            {canEdit && provider && !op.locked && (
              <button
                type="button"
                className={cx(ui.btn, ui.primary)}
                disabled={!chosen || !isPdf || op.mutation.isPending || (real ? !consent : !understood)}
                onClick={start}
              >
                {op.mutation.isPending ? 'Avvio…' : real ? `Invia ${toProvider(provider.label)} e proponi i dati` : 'Avvia la prova sintetica'}
              </button>
            )}
            <Link to={manualHref} state={ret.state} className={ui.btn}>Inserisci il costo a mano{chosenName ? ` con «${chosenName}»` : ''}</Link>
            <Link to={draftsPath(home.id)} state={ret.state} className={ui.btn}>Bozze</Link>
          </p>
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------
// 2. Stato dell'analisi (polling sul job reale, ripresa senza nuovo POST)
// ---------------------------------------------------------------------------------

const JOB_STATE = { queued: 'In coda', running: 'Lettura del documento in corso', succeeded: 'Proposta pronta', failed: 'Analisi non riuscita' } as const;
const PROVIDER_LABEL: Record<string, string> = { anthropic: 'Anthropic', test_fixture_v1: 'Prova con PDF sintetici' };

export function AnalysisJobPage() {
  const home = useCurrentHome();
  const account = useAccount();
  const { jobId = '' } = useParams();
  // Un nuovo tentativo crea un nuovo job: la pagina si rimonta e non conserva consenso o esiti del precedente.
  return <AnalysisJob key={`${account.id}:${home.id}:${jobId}`} home={home} jobId={jobId} />;
}

/** Costo dell'analisi (servizio), mai una spesa della casa: nessuna somma con importi in euro. */
function AnalysisBilling({ billing }: { billing: Billing }) {
  const max = formatUsd(billing.maxReservedUsd);
  const actual = formatUsd(billing.actualUsd);
  return (
    <div className={act.meta} role="group" aria-label="Costo dell’analisi">
      <p><strong>Costo dell’analisi</strong> (servizio di lettura, non una spesa della casa: non entra in Spese, nei totali o nel grafico)</p>
      <ul>
        <li>Stato: {BILLING_STATE_LABEL[billing.state]}</li>
        {max && <li>Riserva massima: {max}</li>}
        <li>Costo effettivo: {actual ?? (billing.state === 'uncertain' ? 'non ancora confermato' : 'non ancora disponibile')}</li>
      </ul>
    </div>
  );
}

function AnalysisJob({ home, jobId }: { home: Home; jobId: string }) {
  const ret = useReturn();
  const navigate = useNavigate();
  const job = useEconomicJob(home.id, jobId);
  const forget = useForgetEconomy(home.id);
  const op = useEconomyOperation(home.id);
  const [retryOpen, setRetryOpen] = useState(false);
  const [retryConsent, setRetryConsent] = useState(false);
  useDocumentTitle(`Analisi del documento · ${home.name}`);
  const forbidden = job.isError && isForbiddenError(job.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una pulizia per ogni 403
  }, [forbidden]);
  const back = <Link to={ret.spese} state={ret.backState} className={pages.spaced}>← Spese</Link>;
  const j = job.data;
  const real = !!j && isRealProvider(j);
  // Il nuovo tentativo crea un NUOVO job: si segue quello restituito, anche dopo «Riprova invio».
  const toNewJob = (res: EconomyResult) => {
    if ('job' in res) navigate(jobPath(home.id, res.job.id), { state: ret.state });
  };
  const retry = () => {
    if (!j || (real && !retryConsent)) return;
    const body = real ? { expectedVersion: j.version, consentToProviderTransfer: true as const } : { expectedVersion: j.version };
    op.run({ kind: 'analysisRetry', jobId: j.id, body }, toNewJob, () => setRetryConsent(false));
  };
  const closeRetry = () => {
    setRetryOpen(false);
    setRetryConsent(false);
  };
  const docName = j?.documentLink.state === 'linked' ? j.documentLink.document.name : null;
  return (
    <>
      {back}
      <h1 tabIndex={-1}>Analisi del documento</h1>
      <div className={pages.stack}>
        {job.isPending ? (
          <Loading label="Lettura dello stato…" />
        ) : !j ? (
          <ErrorState
            title={forbidden ? 'Analisi non accessibile' : 'Stato non disponibile'}
            error={job.error}
            message={forbidden ? draftErrorMessage(job.error) : 'Non riusciamo a leggere lo stato. L’analisi potrebbe essere ancora in corso: aggiorna tra poco.'}
            onRetry={forbidden ? undefined : () => void job.refetch()}
            retrying={job.isFetching}
          />
        ) : (
          <section className={ui.card} aria-labelledby="job-stato" aria-live="polite">
            <h2 id="job-stato" className={pages.cardTitle}>{JOB_STATE[j.state]}</h2>
            {j.isSimulation && <p><Tag tone="warn">{SIMULATION_LABEL}</Tag></p>}
            <p className={act.meta}>
              Documento: {docName ?? 'non più disponibile per il tuo account'}
            </p>
            {real && (
              <p className={act.meta}>Provider: {PROVIDER_LABEL[j.provider] ?? j.provider}{j.model ? ` · modello ${j.model}` : ''}</p>
            )}
            {j.billing && <AnalysisBilling billing={j.billing} />}
            {(j.state === 'queued' || j.state === 'running') && <Loading label="Aggiornamento automatico dello stato…" />}
            {job.isError && j && !forbidden && (
              <Banner tone="warning" role="status" actions={<button type="button" className={cx(ui.btn, ui.small)} onClick={() => void job.refetch()}>Aggiorna</button>}>
                <p>Ultimo aggiornamento non riuscito: lo stato mostrato potrebbe non essere attuale. Non significa che l’analisi sia fallita.</p>
              </Banner>
            )}
            {j.state === 'succeeded' && (
              j.draftId ? (
                <p className={act.actions}>
                  <Link to={draftsPath(home.id, j.draftId)} state={ret.state} className={cx(ui.btn, ui.primary)}>Rivedi la proposta</Link>
                </p>
              ) : (
                <p className={pages.muted}>La bozza prodotta non è più accessibile dal tuo account.</p>
              )
            )}
            {j.state === 'failed' && (
              <>
                <Banner tone="warning" role="alert"><p>{jobErrorText(j)} Nessuna spesa è stata registrata nella casa.</p></Banner>
                {!retryOpen && <DraftFeedback op={op} homeId={home.id} title="Nuovo tentativo non avviato" onRetry={() => op.retry(toNewJob)} />}
                <p className={act.actions}>
                  {jobRetryUseful(j) && home.permissions.includes('edit') && !op.locked && (
                    <button
                      type="button"
                      className={ui.btn}
                      disabled={op.mutation.isPending}
                      onClick={() => (real ? setRetryOpen(true) : retry())}
                    >
                      Riprova l’analisi
                    </button>
                  )}
                  <Link
                    to={`/home/${encodeURIComponent(home.id)}/spese?nuova-spesa=1${j.documentLink.state === 'linked' ? `&documentId=${encodeURIComponent(j.documentLink.document.id)}` : ''}`}
                    state={ret.state}
                    className={cx(ui.btn, ui.primary)}
                  >
                    Inserisci il costo a mano
                  </Link>
                  <button type="button" className={ui.btn} onClick={() => navigate(`/home/${encodeURIComponent(home.id)}/spese/da-documento`, { state: ret.state })}>Scegli un altro documento</button>
                </p>
              </>
            )}
          </section>
        )}
      </div>
      {retryOpen && j && (
        <Dialog title="Nuova analisi del documento" onClose={closeRetry} dismissDisabled={op.mutation.isPending}>
          <p>
            Sarà una <strong>nuova analisi</strong>, distinta da quella non riuscita: il testo di «{docName ?? 'documento'}» sarà inviato di nuovo {toProvider(PROVIDER_LABEL[j.provider] ?? j.provider)}
            {j.model ? ` (modello ${j.model})` : ''} e l’analisi potrebbe avere un nuovo costo per il servizio, che non entra nelle spese della casa.
          </p>
          <label className={act.meta} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
            <input type="checkbox" checked={retryConsent} disabled={op.mutation.isPending || op.locked} onChange={(e) => setRetryConsent(e.target.checked)} />
            <span>Invia di nuovo il testo del documento per proporre i dati della spesa. Le proposte andranno controllate e confermate da me.</span>
          </label>
          <DraftFeedback op={op} homeId={home.id} title="Nuovo tentativo non avviato" onRetry={() => op.retry(toNewJob, () => setRetryConsent(false))} />
          <p className={act.actions}>
            {!op.locked && (
              <button type="button" className={cx(ui.btn, ui.primary)} disabled={!retryConsent || op.mutation.isPending} onClick={retry}>
                {op.mutation.isPending ? 'Avvio…' : 'Avvia la nuova analisi'}
              </button>
            )}
            <button type="button" className={ui.btn} onClick={closeRetry} disabled={op.mutation.isPending}>Annulla</button>
          </p>
        </Dialog>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------
// 3. Bozze recuperabili
// ---------------------------------------------------------------------------------

type DraftTab = 'open' | 'parked' | 'confirmed';

export function DraftsPage() {
  const home = useCurrentHome();
  const caps = useS1cCaps(home);
  const ret = useReturn();
  const back = <Link to={ret.spese} state={ret.backState} className={pages.spaced}>← Spese</Link>;
  return (
    <Gate home={home} title="Bozze da documento" caps={caps} back={back}>
      {() => <Drafts home={home} back={back} />}
    </Gate>
  );
}

function Drafts({ home, back }: { home: Home; back: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const ret = useReturn();
  const tab = (['open', 'parked', 'confirmed'] as const).find((t) => t === params.get('stato')) ?? 'open';
  const list = useEconomicDrafts(home.id, tab);
  const forget = useForgetEconomy(home.id);
  const forbidden = list.isError && isForbiddenError(list.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una pulizia per ogni 403
  }, [forbidden]);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const labels: Record<DraftTab, string> = { open: 'Da confermare', parked: 'Accantonate', confirmed: 'Confermate' };
  return (
    <>
      {back}
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>{home.name} · Spese</span>
          <h1 tabIndex={-1}>Bozze da documento</h1>
          <p className={pages.lead}>Proposte lette da un documento e non ancora confermate. Non contano nei totali finché non le confermi.</p>
        </div>
      </div>
      <div className={pages.stack}>
        <div className={styles.split} role="group" aria-label="Stato delle bozze">
          {(Object.keys(labels) as DraftTab[]).map((t) => (
            <button key={t} type="button" aria-pressed={tab === t} onClick={() => setParams(t === 'open' ? {} : { stato: t }, { state: ret.state })}>{labels[t]}</button>
          ))}
        </div>
        <section className={ui.card} aria-label={labels[tab]}>
          {list.isPending ? (
            <Loading label="Caricamento delle bozze…" />
          ) : list.isError && !list.data ? (
            <ErrorState error={list.error} message={draftErrorMessage(list.error)} onRetry={forbidden ? undefined : () => void list.refetch()} />
          ) : items.length === 0 ? (
            <p className={pages.muted}>{tab === 'open' ? 'Nessuna bozza da confermare.' : tab === 'parked' ? 'Nessuna bozza accantonata.' : 'Nessuna bozza confermata.'}</p>
          ) : (
            <ul className={act.list} aria-label="Bozze">
              {items.map((d) => (
                <li key={d.id} className={act.item}>
                  <div className={act.itemHead}>
                    <Link to={draftsPath(home.id, d.id)} state={ret.state} className={act.title}>
                      {d.documentLink.state === 'linked' ? d.documentLink.document.name : 'Documento non più disponibile'}
                    </Link>
                    <Tag tone={d.state === 'open' ? 'blue' : 'neutral'}>{DRAFT_STATE_LABEL[d.state]}</Tag>
                  </div>
                  <span className={act.meta}>
                    {DOCUMENT_KIND_LABEL[d.documentKind]} · aggiornata il {formatTimestamp(d.updatedAt)}
                    {d.isSimulation ? ` · ${SIMULATION_LABEL}` : ''}
                    {d.state === 'confirmed' && d.expenseLink.state === 'linked' ? ` · costo: ${d.expenseLink.value.title}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {list.hasNextPage && (
            <button type="button" className={ui.btn} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>Mostra altre bozze</button>
          )}
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------
// 4. Revisione della bozza
// ---------------------------------------------------------------------------------

export function DraftPage() {
  const home = useCurrentHome();
  const caps = useS1cCaps(home);
  const ret = useReturn();
  const { draftId = '' } = useParams();
  const back = <Link to={draftsPath(home.id)} state={ret.state} className={pages.spaced}>← Bozze</Link>;
  return (
    <Gate home={home} title="Proposta da confermare" caps={caps} back={back}>
      {(c) => <DraftLoader home={home} caps={c} draftId={draftId} back={back} />}
    </Gate>
  );
}

function DraftLoader(props: { home: Home; caps: EconomyCapabilities; draftId: string; back: ReactNode }) {
  const draft = useEconomicDraft(props.home.id, props.draftId);
  const forget = useForgetEconomy(props.home.id);
  const forbidden = draft.isError && isForbiddenError(draft.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una pulizia per ogni 403
  }, [forbidden]);
  if (draft.isPending) return <>{props.back}<Loading label="Caricamento della bozza…" /></>;
  if (draft.isError) {
    return (
      <>
        {props.back}
        <h1 tabIndex={-1}>Proposta da confermare</h1>
        <ErrorState error={draft.error} message={draftErrorMessage(draft.error)} onRetry={forbidden ? undefined : () => void draft.refetch()} />
      </>
    );
  }
  // Chiave sulla versione: dopo accantona/riprendi/rilettura il modulo riparte dai dati del server.
  return <DraftView key={`${draft.data.id}:${draft.data.version}`} {...props} draft={draft.data} />;
}

function Citation({ s }: { s: SourceCitation }) {
  return (
    <span className={act.meta} style={{ display: 'block' }}>
      Fonte: pagina {s.page} · «{s.excerpt}» · versione {s.documentVersion} dell’originale
    </span>
  );
}

type AmountChoice = { mode: 'candidate'; id: string } | { mode: 'manual' } | null;

function DraftView(props: { home: Home; caps: EconomyCapabilities; draft: EconomicDraft; back: ReactNode }) {
  const { home, caps, draft } = props;
  const navigate = useNavigate();
  const ret = useReturn();
  const id = useId();
  const op = useEconomyOperation(home.id);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  useDocumentTitle(`Proposta da confermare · ${home.name}`);
  const canEdit = home.permissions.includes('edit') && draft.permissions.includes('edit');
  const sourceOk = draft.documentLink.state === 'linked';
  const p = draft.proposedFields;
  const pv = (k: keyof typeof p) => (p[k]?.value as string | undefined) ?? '';

  // Preselezione solo quando il server non chiede una scelta e c'è un unico totale corrente.
  const current = draft.amountCandidates.filter((c) => c.role === 'current_document_total');
  const initialChoice: AmountChoice = !draft.amountSelectionRequired && current.length === 1 ? { mode: 'candidate', id: current[0]!.id } : null;
  const [choice, setChoice] = useState<AmountChoice>(initialChoice);
  const [amount, setAmount] = useState(initialChoice ? centsToInput(current[0]!.amountCents) : '');
  const [title, setTitle] = useState(pv('title'));
  const [spentOn, setSpentOn] = useState('');
  const [category, setCategory] = useState(pv('category'));
  const [supplier, setSupplier] = useState(pv('supplier'));
  const [documentNumber, setDocumentNumber] = useState(pv('documentNumber'));
  const [documentDate, setDocumentDate] = useState(pv('documentDate'));
  const [competenceFrom, setCompetenceFrom] = useState(pv('competenceFrom'));
  const [competenceTo, setCompetenceTo] = useState(pv('competenceTo'));
  const [dueOn, setDueOn] = useState(pv('dueOn'));
  const [objectKey, setObjectKey] = useState('');
  const [workId, setWorkId] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [dialog, setDialog] = useState<'none' | 'park' | { link: CandidateExpense }>('none');
  const [dirty, setDirty] = useState(false);
  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  };
  const disabled = op.mutation.isPending || op.locked;
  const goToExpense = (expenseId: string) => navigate(economyExpensePath(home.id, expenseId), { state: { accountId: ret.state.accountId, expensesSearch: (ret.state as { expensesSearch?: string }).expensesSearch ?? '', economyQ: (ret.state as { economyQ?: string }).economyQ } });

  const candidates = useDraftCandidates(home.id, draft.id, draft.state === 'open' && sourceOk);
  const candidateItems = candidates.data?.pages.flatMap((pg) => pg.items) ?? [];
  const catalog = useCatalog(home.id, { state: 'active', q: '', type: null, roomId: null, placement: 'all' });
  const works = useWorks(home.id, { state: 'active', q: '' });

  const pickCandidate = (c: AmountCandidate) => {
    setChoice({ mode: 'candidate', id: c.id });
    setAmount(centsToInput(c.amountCents));
    setDirty(true);
  };
  const onAmountChange = (v: string) => {
    setAmount(v);
    setDirty(true);
    // Un importo diverso da quello del candidato è dichiarato da te: niente provenienza estratta.
    if (choice?.mode === 'candidate') {
      const c = draft.amountCandidates.find((x) => x.id === choice.id);
      const parsed = parseAmount(v, caps.limits.amountMaxCents);
      if (!c || parsed.cents !== c.amountCents) setChoice({ mode: 'manual' });
    }
  };

  const confirmCreate = () => {
    const parsed = parseAmount(amount, caps.limits.amountMaxCents);
    const errs: Record<string, string | undefined> = {
      choice: choice ? undefined : 'Scegli quale importo registrare, oppure «Inserisco un importo diverso».',
      title: validateTitle(title, caps.limits.titleMaxCodePoints),
      amount: choice ? parsed.error : undefined,
      spentOn: validateSpentOn(spentOn, caps.today),
      supplier: validateOptionalText(supplier, 120),
      documentNumber: validateOptionalText(documentNumber, 80),
      documentDate: validateOptionalDate(documentDate),
      competence: validateCompetence(competenceFrom, competenceTo),
      dueOn: validateOptionalDate(dueOn),
      note: validateNote(note, caps.limits.noteMaxCodePoints),
    };
    if (choice?.mode === 'candidate' && !parsed.error) {
      const c = draft.amountCandidates.find((x) => x.id === choice.id);
      if (!c || c.amountCents !== parsed.cents) errs.amount = 'L’importo non corrisponde più al candidato scelto: scegli «Inserisco un importo diverso».';
    }
    setErrors(errs);
    const first = Object.keys(errs).find((k) => errs[k]);
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    const [kind, oid] = objectKey.split(':');
    const values: ExpenseValues = {
      title: normalizeText(title),
      amountCents: parsed.cents!,
      spentOn,
      ...(category ? { category: category as Category } : {}),
      ...(optionalText(supplier) ? { supplier: optionalText(supplier) } : {}),
      ...(optionalText(documentNumber) ? { documentNumber: optionalText(documentNumber) } : {}),
      ...(documentDate ? { documentDate } : {}),
      ...(competenceFrom && competenceTo ? { competenceFrom, competenceTo } : {}),
      ...(dueOn ? { dueOn } : {}),
      ...(normalizeNote(note) ? { note: normalizeNote(note) } : {}),
      ...((kind === 'object' || kind === 'boiler') && oid ? { objectRef: { kind, id: oid } } : {}),
      ...(workId ? { workId } : {}),
    };
    const body: ConfirmDraft = {
      expectedVersion: draft.version,
      mode: 'create',
      values,
      amountSelection: choice!.mode === 'candidate' ? { mode: 'candidate', candidateId: choice!.id } : { mode: 'manual' },
    };
    op.run({ kind: 'draftConfirm', draftId: draft.id, body }, (res) => 'expense' in res && goToExpense(res.expense.id));
  };

  const confirmLink = (c: CandidateExpense) => {
    op.run(
      { kind: 'draftConfirm', draftId: draft.id, body: { expectedVersion: draft.version, mode: 'link_existing', expenseId: c.expense.id, expectedExpenseVersion: c.expense.version } },
      (res) => 'expense' in res && goToExpense(res.expense.id),
    );
  };

  const header = (
    <>
      {props.back}
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>{home.name} · {DOCUMENT_KIND_LABEL[draft.documentKind]}</span>
          <h1 ref={heading} tabIndex={-1}>{draft.state === 'confirmed' ? 'Proposta confermata' : draft.state === 'parked' ? 'Proposta accantonata' : 'Proposta da confermare'}</h1>
          <p className={act.actions}>
            <Tag tone={draft.state === 'open' ? 'blue' : 'neutral'}>{DRAFT_STATE_LABEL[draft.state]}</Tag>
            {draft.isSimulation && <Tag tone="warn">{SIMULATION_LABEL}</Tag>}
          </p>
        </div>
      </div>
      <section className={ui.card} aria-labelledby={`${id}-src`}>
        <h2 id={`${id}-src`} className={pages.cardTitle}>Documento originale</h2>
        {sourceOk ? (
          <p>
            <Link to={`/home/${encodeURIComponent(home.id)}/documenti/${encodeURIComponent((draft.documentLink as { document: { id: string } }).document.id)}`}>
              {(draft.documentLink as { document: { name: string } }).document.name}
            </Link>
            <span className={act.meta} style={{ display: 'block' }}>Le proposte qui sotto citano pagina ed estratto dell’originale. Controllale prima di confermare.</span>
          </p>
        ) : (
          <Banner tone="warning" role="alert">
            <p>L’originale non è più disponibile per il tuo account: fonti e proposte non sono mostrate e la bozza non si può confermare. Puoi inserire il costo a mano.</p>
          </Banner>
        )}
      </section>
    </>
  );

  if (draft.state === 'confirmed') {
    return (
      <>
        {header}
        <section className={ui.card}>
          <p>La bozza è confermata: il costo registrato è uno solo.</p>
          {draft.expenseLink.state === 'linked' ? (
            <p><Link to={economyExpensePath(home.id, draft.expenseLink.value.id)} state={ret.state} className={cx(ui.btn, ui.primary)}>Apri il costo «{draft.expenseLink.value.title}»</Link></p>
          ) : (
            <p className={pages.muted}>Il costo collegato non è più disponibile per il tuo account.</p>
          )}
        </section>
      </>
    );
  }

  if (draft.state === 'parked') {
    return (
      <>
        {header}
        <section className={ui.card} aria-labelledby={`${id}-parked`}>
          <h2 id={`${id}-parked`} className={pages.cardTitle}>Accantonata</h2>
          <p className={act.meta}>Originale e proposte sono conservati sul server. Riprendila per rivederla e confermarla.</p>
          <DraftFeedback op={op} homeId={home.id} title="Bozza non ripresa" onRetry={() => op.retry()} />
          {canEdit && !op.locked && (
            <p className={act.actions}>
              <button type="button" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending} onClick={() => op.run({ kind: 'draftReopen', draftId: draft.id, body: { expectedVersion: draft.version } })}>
                {op.mutation.isPending ? 'Ripresa…' : 'Riprendi la bozza'}
              </button>
            </p>
          )}
        </section>
      </>
    );
  }

  const err = (k: string) => (errors[k] ? <span id={`${id}-${k}-error`} className={ui.fieldError}>{errors[k]}</span> : null);
  const proposedNote = (k: keyof typeof p) => (p[k] ? p[k]!.sources.map((s, i) => <Citation key={i} s={s} />) : null);
  const dateInput = (k: string, label: string, value: string, set: (v: string) => void, errKey = k, hint?: string, src?: ReactNode) => (
    <div className={ui.field}>
      <label className={ui.label} htmlFor={`${id}-${k}`}>{label}</label>
      {hint && <span className={ui.hint}>{hint}</span>}
      <input id={`${id}-${k}`} className={ui.input} type="date" value={value} max={k === 'spentOn' ? caps.today : undefined} disabled={disabled || !sourceOk} onChange={(e) => touch(set)(e.target.value)} aria-invalid={errors[errKey] ? true : undefined} aria-describedby={errors[errKey] ? `${id}-${errKey}-error` : undefined} />
      {src}
    </div>
  );
  const objects = catalog.data?.pages.flatMap((pg) => pg.items) ?? [];
  const workList = works.data?.pages.flatMap((pg) => pg.items) ?? [];

  return (
    <>
      {header}
      <div className={pages.stack}>
        {sourceOk && (
          <section className={ui.card} aria-labelledby={`${id}-dup`}>
            <h2 id={`${id}-dup`} className={pages.cardTitle}>Possibile costo già registrato</h2>
            <p className={act.meta}>Somiglianze, non duplicati certi. Se è lo stesso costo, collega il documento: importo, categoria e data del costo non cambiano.</p>
            {candidates.isPending ? (
              <Loading label="Ricerca di costi simili…" />
            ) : candidates.isError && !candidates.data ? (
              <ErrorState error={candidates.error} message={draftErrorMessage(candidates.error)} onRetry={() => void candidates.refetch()} title="Costi simili non disponibili" />
            ) : candidateItems.length === 0 ? (
              <p className={pages.muted}>Nessun costo simile trovato.</p>
            ) : (
              <ul className={act.list} aria-label="Costi simili">
                {candidateItems.map((c) => (
                  <li key={c.expense.id} className={act.item}>
                    <div className={act.itemHead}>
                      <Link to={economyExpensePath(home.id, c.expense.id)} className={act.title}>{c.expense.title}</Link>
                      <strong style={{ marginLeft: 'auto' }}>{formatCents(c.expense.amountCents)}</strong>
                    </div>
                    <span className={act.meta}>{formatCalendarDate(c.expense.spentOn)} · possibile corrispondenza: {c.reasons.map((r) => REASON_LABEL[r]).join(', ') || 'somiglianza'}</span>
                    {canEdit && (
                      <span><button type="button" className={cx(ui.btn, ui.small)} disabled={disabled} onClick={() => setDialog({ link: c })}>Collega al costo esistente</button></span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {candidates.hasNextPage && <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void candidates.fetchNextPage()} disabled={candidates.isFetchingNextPage}>Altri costi simili</button>}
          </section>
        )}

        <form
          className={act.panel}
          noValidate
          aria-labelledby={`${id}-form`}
          onSubmit={(e) => {
            e.preventDefault();
            confirmCreate();
          }}
        >
          <h2 id={`${id}-form`}>Registra come nuovo costo</h2>
          <p className={act.meta}>Niente viene salvato finché non confermi. Le modifiche a questo modulo non vengono conservate se esci o accantoni.</p>

          <fieldset className={ui.field} style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={errors.choice ? `${id}-choice-error` : undefined}>
            <legend className={ui.label} id={`${id}-choice`} tabIndex={-1}>Quale importo registri?</legend>
            {draft.amountSelectionRequired && <span className={ui.hint}>Il documento contiene importi diversi: scegli tu quale registrare. Nessuno è preselezionato e gli importi non vengono sommati.</span>}
            {draft.amountCandidates.map((c) => (
              <label key={c.id} className={act.item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="radio" name={`${id}-amount-choice`} checked={choice?.mode === 'candidate' && choice.id === c.id} disabled={disabled || !sourceOk} onChange={() => pickCandidate(c)} />
                <span>
                  <strong>{formatCents(c.amountCents)}</strong> · {ROLE_LABEL[c.role]}{c.label ? ` («${c.label}»)` : ''}
                  {ROLE_HINT[c.role] && <span className={act.meta} style={{ display: 'block' }}>{ROLE_HINT[c.role]}</span>}
                  {c.sources.map((s, i) => <Citation key={i} s={s} />)}
                </span>
              </label>
            ))}
            <label className={act.item} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
              <input type="radio" name={`${id}-amount-choice`} checked={choice?.mode === 'manual'} disabled={disabled || !sourceOk} onChange={() => { setChoice({ mode: 'manual' }); setDirty(true); }} />
              <span>Inserisco un importo diverso</span>
            </label>
            {err('choice')}
          </fieldset>
          {choice && (
            <div className={ui.field}>
              <label className={ui.label} htmlFor={`${id}-amount`}>Importo in euro</label>
              <span className={ui.hint} id={`${id}-amount-hint`}>
                {choice.mode === 'candidate' ? 'Importo del candidato scelto. Se lo modifichi diventa un importo dichiarato da te.' : 'Importo dichiarato da te, non preso dal documento.'}
              </span>
              <input id={`${id}-amount`} className={ui.input} inputMode="decimal" value={amount} disabled={disabled || !sourceOk} onChange={(e) => onAmountChange(e.target.value)} aria-invalid={errors.amount ? true : undefined} aria-describedby={`${id}-amount-hint${errors.amount ? ` ${id}-amount-error` : ''}`} />
              {err('amount')}
            </div>
          )}

          <Field id={`${id}-title`} label="Descrizione" value={title} disabled={disabled || !sourceOk} onChange={(e) => touch(setTitle)(e.target.value)} error={errors.title} autoComplete="off" />
          {proposedNote('title')}

          {dateInput(
            'spentOn',
            'Data di riferimento',
            spentOn,
            setSpentOn,
            'spentOn',
            'Decide in quale periodo compare il costo. Non è la data di pagamento né la scadenza.',
            <>
              {err('spentOn')}
              {pv('documentDate') && !spentOn && (
                <button type="button" className={styles.linkButton} disabled={disabled || !sourceOk} onClick={() => touch(setSpentOn)(pv('documentDate') <= caps.today ? pv('documentDate') : '')}>
                  Usa la data del documento ({formatCalendarDate(pv('documentDate'))})
                </button>
              )}
            </>,
          )}

          <div className={ui.field}>
            <label className={ui.label} htmlFor={`${id}-category`}>Categoria</label>
            <select id={`${id}-category`} className={act.select} value={category} disabled={disabled || !sourceOk} onChange={(e) => touch(setCategory)(e.target.value)}>
              <option value="">Non classificata</option>
              {caps.categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            {proposedNote('category')}
            <span className={styles.preview}>Famiglia prevista: <strong>{familyLabel(previewFamily(category ? (category as Category) : null, !!workId), caps)}</strong>. La calcola il servizio.</span>
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor={`${id}-object`}>Oggetto (facoltativo)</label>
            <select id={`${id}-object`} className={act.select} value={objectKey} disabled={disabled || !sourceOk} onChange={(e) => touch(setObjectKey)(e.target.value)}>
              <option value="">Nessun oggetto</option>
              {objects.map((o) => <option key={`${o.ref.kind}:${o.ref.id}`} value={`${o.ref.kind}:${o.ref.id}`}>{o.name}</option>)}
            </select>
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor={`${id}-work`}>Lavoro (facoltativo)</label>
            <select id={`${id}-work`} className={act.select} value={workId} disabled={disabled || !sourceOk} onChange={(e) => touch(setWorkId)(e.target.value)}>
              <option value="">Nessun lavoro</option>
              {workList.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <details className={styles.details} open>
            <summary>Dati del documento</summary>
            <Field id={`${id}-supplier`} label="Fornitore" value={supplier} disabled={disabled || !sourceOk} onChange={(e) => touch(setSupplier)(e.target.value)} error={errors.supplier} autoComplete="off" />
            {proposedNote('supplier')}
            <Field id={`${id}-documentNumber`} label="Numero del documento" value={documentNumber} disabled={disabled || !sourceOk} onChange={(e) => touch(setDocumentNumber)(e.target.value)} error={errors.documentNumber} autoComplete="off" />
            {proposedNote('documentNumber')}
            {dateInput('documentDate', 'Data del documento', documentDate, setDocumentDate, 'documentDate', undefined, <>{err('documentDate')}{proposedNote('documentDate')}</>)}
            <fieldset className={ui.field} style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className={ui.label}>Periodo di competenza</legend>
              <div className={styles.range}>
                {dateInput('competence', 'Dal', competenceFrom, setCompetenceFrom, 'competence', undefined, proposedNote('competenceFrom'))}
                {dateInput('competenceTo', 'Al', competenceTo, setCompetenceTo, 'competence', undefined, proposedNote('competenceTo'))}
              </div>
              {err('competence')}
            </fieldset>
            {dateInput('dueOn', 'Scadenza indicata sul documento', dueOn, setDueOn, 'dueOn', 'Solo un dato del documento: non crea promemoria né attesta un pagamento.', <>{err('dueOn')}{proposedNote('dueOn')}</>)}
          </details>
          <NoteField id={`${id}-note`} value={note} onChange={touch(setNote)} error={errors.note} disabled={disabled || !sourceOk} label="Nota (facoltativa)" />
          {Object.keys(p).filter((k) => !(k in PROPOSED_FIELD_LABEL)).length > 0 && <p className={act.meta}>Altri dati proposti non sono usati in questa versione.</p>}

          {/* Con un dialogo aperto l'esito si mostra solo lì: un solo avviso per volta. */}
          {dialog === 'none' && <DraftFeedback op={op} homeId={home.id} title="Bozza non confermata" onRetry={() => op.retry((res) => 'expense' in res && goToExpense(res.expense.id))} />}
          <div className={act.actions}>
            {canEdit && !op.locked && (
              <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending || !sourceOk}>
                {op.mutation.isPending ? 'Conferma in corso…' : 'Conferma e registra il costo'}
              </button>
            )}
            {canEdit && !op.locked && (
              <button type="button" className={ui.btn} disabled={op.mutation.isPending} onClick={() => setDialog('park')}>Accantona</button>
            )}
            <Link to={draftsPath(home.id)} state={ret.state} className={cx(ui.btn, ui.ghost)}>Esci senza confermare</Link>
          </div>
          <p className={act.meta}>Uscire non conferma e non cancella la bozza: resta tra quelle da confermare.</p>
        </form>
      </div>

      {dialog === 'park' && (
        <Dialog title="Accantona la bozza" onClose={() => setDialog('none')} dismissDisabled={op.mutation.isPending}>
          <p className={act.meta}>
            La bozza resta sul server con l’originale e le proposte, e la ritrovi fra le accantonate.
            {dirty ? ' Le modifiche che hai fatto a questo modulo non vengono salvate.' : ''}
          </p>
          <DraftFeedback op={op} homeId={home.id} title="Bozza non accantonata" onRetry={() => op.retry(() => setDialog('none'))} />
          <div className={act.actions}>
            {!op.locked && (
              <button type="button" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending} onClick={() => op.run({ kind: 'draftPark', draftId: draft.id, body: { expectedVersion: draft.version } }, () => setDialog('none'))}>
                {dirty ? 'Accantona senza salvare le modifiche' : 'Accantona'}
              </button>
            )}
            <button type="button" className={cx(ui.btn, ui.ghost)} onClick={() => setDialog('none')} disabled={op.mutation.isPending || op.locked}>Torna alla bozza</button>
          </div>
        </Dialog>
      )}
      {typeof dialog === 'object' && (
        <Dialog title="Collega al costo esistente" onClose={() => setDialog('none')} dismissDisabled={op.mutation.isPending}>
          <p className={act.meta}>
            Il documento viene collegato a «{dialog.link.expense.title}» ({formatCents(dialog.link.expense.amountCents)}, {formatCalendarDate(dialog.link.expense.spentOn)}).
            Importo, categoria e data del costo restano quelli attuali; non viene creato un secondo costo.
          </p>
          <DraftFeedback op={op} homeId={home.id} title="Collegamento non eseguito" onRetry={() => op.retry((res) => 'expense' in res && goToExpense(res.expense.id))} />
          <div className={act.actions}>
            {!op.locked && (
              <button type="button" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending} onClick={() => confirmLink(dialog.link)}>
                {op.mutation.isPending ? 'Collegamento…' : 'Collega il documento a questo costo'}
              </button>
            )}
            <button type="button" className={cx(ui.btn, ui.ghost)} onClick={() => setDialog('none')} disabled={op.mutation.isPending || op.locked}>Torna alla bozza</button>
          </div>
        </Dialog>
      )}
    </>
  );
}

export { categoryLabel };
