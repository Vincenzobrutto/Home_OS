import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Banner, Loading, cx, ui } from '../components/ui';
import { ExpenseSection, ObjectSection } from './ChoiceSections';
import { FIELD_LABEL } from './ReceiptFields';
import { ReceiptSummaryView } from './ReceiptSummary';
import { SourceDialog, type SourceRequest } from './SourceDialog';
import {
  allExpenses, allObjects, buildConfirmationPayload, buildSummary, contextKeyString, fieldSources, initialFormState, validateForm,
  type CandidatePage, type ConfirmOutcome, type ConfirmationPayload, type ConfirmationResult, type ExpenseRef, type FormField,
  type ObjectRef, type OpaqueId, type ParkOutcome, type PersistedComparison, type ReceiptCapabilities, type ReceiptContextKey,
  type ReceiptDraft, type ReceiptFormState, type ReceiptJobState, type ReceiptLoadState, type ReceiptOriginal, type RecoverOutcome,
} from './model';
import styles from './receipt.module.css';

/** Props del componente integrabile. Il container Codex fornisce dati reali e callback; nessun fetch qui. */
export type ReceiptAssistantProps = {
  contextKey: ReceiptContextKey;
  load: ReceiptLoadState;
  capabilities: ReceiptCapabilities | null;
  original: ReceiptOriginal;
  draft: ReceiptDraft | null;
  job: ReceiptJobState;
  objectCandidates: CandidatePage<ObjectRef>;
  expenseCandidates: CandidatePage<ExpenseRef>;
  /** Giorno corrente Europe/Rome dal server (YYYY-MM-DD). */
  today: string;
  canEdit: boolean;
  onStartAnalysis: (input: { providerId: OpaqueId; consentToProviderTransfer: boolean }) => void;
  onStartManual: () => void;
  /** Apre l'originale nel visualizzatore del container; se rifiuta, il componente mostra l'errore. */
  openOriginal: () => Promise<void>;
  /** Slot facoltativo per un'anteprima fornita dal container (nessun iframe o URL inventato qui). */
  renderOriginalPreview?: () => ReactNode;
  loadMoreCandidates: (kind: 'object' | 'expense') => void;
  /** Notifica all'apertura del riepilogo con il payload corrente. */
  onReview?: (payload: ConfirmationPayload) => void;
  /** Il container gestisce Idempotency-Key e trasporto; una promessa rifiutata vale come esito non noto. */
  onConfirm: (payload: ConfirmationPayload) => Promise<ConfirmOutcome>;
  onRecoverOutcome: (payload: ConfirmationPayload) => Promise<RecoverOutcome>;
  onPark: (payload: ConfirmationPayload) => Promise<ParkOutcome>;
  onResumeDraft?: () => Promise<{ status: 'resumed' } | { status: 'rejected'; message: string }>;
  onReopenComparison?: (comparison: PersistedComparison) => void;
  onRetryLoad?: () => void;
  /** Collegamenti di navigazione dopo l'esito (forniti dal container con il router dell'app). */
  renderOutcomeLinks?: (result: ConfirmationResult) => ReactNode;
};

/** Ogni cambio di account/casa/documento/bozza rimonta l'interno: nessuno stato o citazione passa di contesto. */
export function ReceiptAssistant(props: ReceiptAssistantProps) {
  return <AssistantInner key={contextKeyString(props.contextKey)} {...props} />;
}

type Step = 'documento' | 'proposte' | 'riepilogo' | 'esito';
type ConfirmState =
  | { status: 'idle' }
  | { status: 'submitting'; payload: ConfirmationPayload }
  | { status: 'rejected'; message: string }
  | { status: 'unknown'; payload: ConfirmationPayload; message: string }
  | { status: 'recovering'; payload: ConfirmationPayload }
  | { status: 'not_found'; payload: ConfirmationPayload };

const STEP_TITLE: Record<Step, string> = { documento: 'Documento', proposte: 'Proposte', riepilogo: 'Riepilogo', esito: 'Esito' };

function AssistantInner(props: ReceiptAssistantProps) {
  const { draft, load, original, today } = props;
  const canEdit = props.canEdit && draft?.state !== 'parked';
  // Passo scelto dall'utente; senza scelta, una bozza aperta porta alle proposte.
  const [stepChoice, setStep] = useState<Step | null>(null);
  const step: Step = stepChoice ?? (draft?.confirmation && ['confirmed', 'partially_resolved'].includes(draft.state) ? 'esito' : draft && draft.state !== 'confirmed' ? 'proposte' : 'documento');
  // Form modificato dall'utente; finché è null il form segue bozza e candidati (nessuna preselezione).
  const [userForm, setUserForm] = useState<ReceiptFormState | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [source, setSource] = useState<SourceRequest | null>(null);
  const [openState, setOpenState] = useState<{ status: 'idle' | 'opening' } | { status: 'error'; message: string }>({ status: 'idle' });
  const [confirm, setConfirm] = useState<ConfirmState>({ status: 'idle' });
  const [localResult, setResult] = useState<ConfirmationResult | null>(null);
  const result = localResult ?? draft?.confirmation ?? null;
  const [resume, setResume] = useState<{ status: 'idle' | 'resuming' } | { status: 'error'; message: string }>({ status: 'idle' });
  const [park, setPark] = useState<{ status: 'idle' | 'parking' | 'parked' } | { status: 'error'; message: string }>({ status: 'idle' });
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const objects = useMemo(() => (draft ? allObjects(draft, props.objectCandidates.items) : []), [draft, props.objectCandidates.items]);
  const expenses = useMemo(() => (draft ? allExpenses(draft, props.expenseCandidates.items) : []), [draft, props.expenseCandidates.items]);

  const derivedForm = useMemo(
    () => (draft ? initialFormState(draft, props.objectCandidates.items, props.expenseCandidates.items) : null),
    [draft, props.objectCandidates.items, props.expenseCandidates.items],
  );
  const form = userForm ?? derivedForm;
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  if (load.status === 'loading') return <Loading label="Caricamento della ricevuta…" />;
  if (load.status === 'unavailable') {
    return (
      <div className={styles.stack}>
        <h1 tabIndex={-1}>Ricevuta non disponibile</h1>
        <Banner tone="warning" role="alert"><p>Questo account non ha accesso al documento richiesto, oppure non è più disponibile.</p></Banner>
      </div>
    );
  }
  if (load.status === 'error') {
    return (
      <Banner tone="error" role="alert" title="Impossibile caricare la ricevuta"
        actions={load.retryable && props.onRetryLoad && <button type="button" className={ui.btn} onClick={props.onRetryLoad}>Riprova</button>}>
        <p>{load.message}</p>
      </Banner>
    );
  }

  const validation = draft && form ? validateForm(form, draft, objects, today, expenses) : null;
  const payload = draft && form ? buildConfirmationPayload(form, draft, objects, expenses, today) : null;
  const locked = confirm.status === 'submitting' || confirm.status === 'unknown' || confirm.status === 'recovering' || park.status === 'parking' || resume.status === 'resuming';

  const openOriginal = async () => {
    setOpenState({ status: 'opening' });
    try { await props.openOriginal(); setOpenState({ status: 'idle' }); }
    catch { setOpenState({ status: 'error', message: 'Non è stato possibile aprire l’originale. Riprova tra poco.' }); }
  };
  const showSource = (field: FormField) => {
    if (!draft) return;
    setSource({ kind: 'field', label: FIELD_LABEL[field], sources: fieldSources(draft, field) });
  };
  const changeForm = (next: ReceiptFormState) => {
    setUserForm(next);
    // Un esito certo (rifiuto o conferma non trovata) non blocca nuove correzioni.
    if (confirm.status === 'rejected' || confirm.status === 'not_found') setConfirm({ status: 'idle' });
  };

  const goSummary = () => {
    setShowErrors(true);
    if (!validation?.valid || !payload) {
      document.getElementById('receipt-form-errors')?.focus();
      return;
    }
    props.onReview?.(payload);
    setStep('riepilogo');
  };

  const applyOutcome = (outcome: ConfirmOutcome | RecoverOutcome, sent: ConfirmationPayload) => {
    if (outcome.status === 'confirmed') { setResult(outcome.result); setConfirm({ status: 'idle' }); setStep('esito'); }
    else if (outcome.status === 'rejected') setConfirm({ status: 'rejected', message: outcome.message });
    else if (outcome.status === 'not_found') setConfirm({ status: 'not_found', payload: sent });
    else setConfirm({ status: 'unknown', payload: sent, message: outcome.message ?? 'Non sappiamo se la conferma è stata registrata.' });
  };
  const submit = async (toSend: ConfirmationPayload) => {
    if (inFlight.current) return; // blocco del doppio clic
    inFlight.current = true;
    setConfirm({ status: 'submitting', payload: toSend });
    try { applyOutcome(await props.onConfirm(toSend), toSend); }
    catch { applyOutcome({ status: 'unknown' }, toSend); }
    finally { inFlight.current = false; }
  };
  const recover = async (sent: ConfirmationPayload) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setConfirm({ status: 'recovering', payload: sent });
    try { applyOutcome(await props.onRecoverOutcome(sent), sent); }
    catch { applyOutcome({ status: 'unknown' }, sent); }
    finally { inFlight.current = false; }
  };
  const doPark = async () => {
    if (!payload || inFlight.current) return;
    inFlight.current = true;
    setPark({ status: 'parking' });
    try {
      const outcome = await props.onPark(payload);
      setPark(outcome.status === 'parked' ? { status: 'parked' } : { status: 'error', message: outcome.message });
    } catch { setPark({ status: 'error', message: 'Non sappiamo se la bozza è stata rimandata. Ricarica la pagina per verificarlo.' }); }
    finally { inFlight.current = false; }
  };
  const doResume = async () => {
    if (!props.onResumeDraft || inFlight.current) return;
    inFlight.current = true; setResume({ status: 'resuming' });
    try {
      const outcome = await props.onResumeDraft();
      if (outcome.status === 'resumed') { setResume({ status: 'idle' }); setPark({ status: 'idle' }); }
      else setResume({ status: 'error', message: outcome.message });
    } catch { setResume({ status: 'error', message: 'Non sappiamo se la bozza è stata ripresa. Ricarica per verificarlo.' }); }
    finally { inFlight.current = false; }
  };

  const heading = (text: string, lead?: string) => (
    <>
      <h1 ref={headingRef} tabIndex={-1}>{text}</h1>
      {lead && <p className={styles.note}>{lead}</p>}
    </>
  );
  const steps = (
    <ol className={styles.steps} aria-label="Passaggi">
      {(['documento', 'proposte', 'riepilogo'] as const).map((s, i) => (
        <li key={s} className={cx(styles.step, (step === s || (step === 'esito' && s === 'riepilogo')) && styles.stepActive)} aria-current={step === s ? 'step' : undefined}>
          <span className={styles.stepNum} aria-hidden="true">{i + 1}</span>{STEP_TITLE[s]}
        </li>
      ))}
    </ol>
  );
  const originalCard = (
    <section className={cx(ui.card, ui.tint)} aria-label="Documento originale">
      <div className={styles.file}>
        <span className={styles.fileIcon} aria-hidden="true">PDF</span>
        <div className={styles.fileName}><strong>{original.name}</strong></div>
      </div>
      {original.status === 'available' ? (
        <button type="button" className={styles.linkButton} onClick={() => setSource({ kind: 'original' })}>Vedi documento originale</button>
      ) : (
        <p className={styles.note}>L’originale non è disponibile in questo momento.</p>
      )}
      <p className={styles.note}>La fonte documenta la proposta: non certifica proprietà, validità fiscale o garanzia.</p>
    </section>
  );
  const dialog = source && (
    <SourceDialog request={source} original={original} openState={openState} preview={props.renderOriginalPreview?.()}
      onOpenOriginal={() => void openOriginal()} onClose={() => { setSource(null); setOpenState({ status: 'idle' }); }} />
  );

  // ---------------------------------------------------------------- Esito
  if (step === 'esito' && result) {
    return (
      <div className={styles.stack}>
        {heading(result.newObjects || result.newExpenses ? 'Tutto al suo posto.' : 'Nessun doppione. Solo le integrazioni scelte.')}
        <section className={ui.card}>
          <div className={styles.counts}>
            <div><div className={styles.countNumber}>{result.newObjects}</div><p className={styles.note}>{result.newObjects === 1 ? 'nuovo oggetto' : 'nuovi oggetti'}</p></div>
            <div><div className={styles.countNumber}>{result.newExpenses}</div><p className={styles.note}>{result.newExpenses === 1 ? 'nuova spesa' : 'nuove spese'}</p></div>
          </div>
          {result.openComparisons > 0 && (
            <Banner tone="warning"><p>{result.openComparisons === 1 ? '1 confronto resta aperto' : `${result.openComparisons} confronti restano aperti`}: lo ritrovi nella scheda dell’oggetto e in Da rivedere. I valori confermati sono conservati.</p></Banner>
          )}
          <p>La ricevuta resta in Documenti. Le scelte escluse non hanno eliminato né scollegato nulla.</p>
          {props.renderOutcomeLinks && <div className={styles.actions}>{props.renderOutcomeLinks(result)}</div>}
        </section>
      </div>
    );
  }

  // ---------------------------------------------------------------- Documento
  if (step === 'documento' || !draft || !form) {
    return (
      <div className={styles.stack}>
        {steps}
        {heading('Una ricevuta, il resto in ordine.', 'Dalla ricevuta puoi registrare l’acquisto e collegarlo all’oggetto, senza ricopiare i dati.')}
        <div className={styles.layout}>
          <div className={styles.stack}>
            <DocumentStep {...props} canEdit={canEdit} onOpenOriginalDialog={() => setSource({ kind: 'original' })} />
          </div>
          <aside className={styles.aside}>{originalCard}</aside>
        </div>
        {dialog}
      </div>
    );
  }

  // ---------------------------------------------------------------- Riepilogo
  if (step === 'riepilogo') {
    const summary = buildSummary(form, draft, objects, expenses);
    return (
      <div className={styles.stack}>
        {steps}
        {heading('Solo quello che hai scelto.', 'Un ultimo controllo. Nessun dato esistente verrà sovrascritto.')}
        <div className={styles.layout}>
          <div className={styles.stack}>
            <ReceiptSummaryView summary={summary} />
            <ConfirmStatus state={confirm} onRecover={recover} onResend={(p) => void submit(p)} />
            {park.status === 'parked' && <Banner role="status"><p>Bozza rimandata: la ritrovi dal documento quando vuoi riprenderla.</p></Banner>}
            {park.status === 'error' && <Banner tone="error" role="alert"><p>{park.message}</p></Banner>}
            <div className={styles.actions}>
              <button type="button" className={ui.btn} onClick={() => setStep('proposte')} disabled={locked}>← Modifica le scelte</button>
              {canEdit && (
                <div className={styles.actionGroup}>
                  <button type="button" className={ui.btn} onClick={() => void doPark()} disabled={!payload || locked || park.status === 'parking' || park.status === 'parked'}>
                    {park.status === 'parking' ? 'Rinvio…' : 'Rimanda'}
                  </button>
                  <button type="button" className={cx(ui.btn, ui.primary)} disabled={!payload || locked || confirm.status === 'not_found' || park.status === 'parked'}
                    onClick={() => payload && void submit(payload)}>
                    {confirm.status === 'submitting' ? 'Conferma in corso…' : 'Conferma'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <aside className={styles.aside}>{originalCard}</aside>
        </div>
        {dialog}
      </div>
    );
  }

  // ---------------------------------------------------------------- Proposte
  const errors = showErrors && validation ? validation.errors : {};
  const errorCount = Object.keys(errors).length;
  return (
    <div className={styles.stack}>
      {steps}
      {heading(draft.origin === 'manual' ? 'Inserisci quello che conosci.' : 'Abbiamo trovato un acquisto per la casa.',
        draft.origin === 'manual' ? 'Compilazione manuale: nessun dato è stato estratto.' : 'Controlla oggetto e spesa: puoi decidere separatamente che cosa salvare.')}
      {draft.state === 'parked' ? <Banner title="Bozza in pausa" actions={props.canEdit && props.onResumeDraft ? <button type="button" className={ui.btn} disabled={resume.status === 'resuming'} onClick={() => void doResume()}>{resume.status === 'resuming' ? 'Ripresa…' : 'Riprendi le scelte salvate'}</button> : undefined}><p>Le scelte del riepilogo sono conservate. Riprendi la bozza prima di modificarle o confermarle.</p></Banner> : !canEdit && <Banner><p>Con il tuo ruolo puoi consultare le proposte, ma non salvarle.</p></Banner>}
      {resume.status === 'error' && <Banner tone="error" role="alert"><p>{resume.message}</p></Banner>}
      {draft.review && draft.state !== 'parked' && <Banner tone={draft.review.staleTargets.length ? 'warning' : 'info'}><p>{draft.review.staleTargets.length ? 'Alcuni elementi sono cambiati: scegli nuovamente a cosa collegare la ricevuta. I valori inseriti sono conservati.' : 'Abbiamo ripreso le scelte salvate. Controllale prima di confermare.'}</p></Banner>}
      {draft.openComparisons.length > 0 && (
        <Banner tone="warning" title="Confronti rimandati">
          <ul>
            {draft.openComparisons.map(c => (
              <li key={c.id}>
                {c.objectName} · {FIELD_LABEL[c.field]}: «{c.existing}» oppure «{c.proposed.value}».{' '}
                {props.onReopenComparison && <button type="button" className={styles.linkButton} onClick={() => props.onReopenComparison?.(c)}>Riapri il confronto</button>}
              </li>
            ))}
          </ul>
        </Banner>
      )}
      <div className={styles.layout}>
        <div className={styles.stack}>
          <ObjectSection draft={draft} state={form} errors={errors} today={today} canEdit={canEdit && !locked} onChange={changeForm} onShowSource={showSource}
            objects={objects} candidates={props.objectCandidates} onLoadMore={() => props.loadMoreCandidates('object')} />
          <ExpenseSection draft={draft} state={form} errors={errors} today={today} canEdit={canEdit && !locked} onChange={changeForm} onShowSource={showSource}
            expenses={expenses} candidates={props.expenseCandidates} onLoadMore={() => props.loadMoreCandidates('expense')} />
          <p id="receipt-form-errors" tabIndex={-1} className={styles.formError} role={errorCount ? 'alert' : undefined}>
            {errorCount ? 'Controlla i punti segnalati prima di continuare.' : ''}
          </p>
          <div className={styles.actions}>
            <button type="button" className={ui.btn} onClick={() => setStep('documento')}>← Documento</button>
            <button type="button" className={cx(ui.btn, ui.primary)} disabled={draft.state === 'parked'} onClick={goSummary}>Controlla il riepilogo →</button>
          </div>
        </div>
        <aside className={styles.aside}>{originalCard}</aside>
      </div>
      {dialog}
    </div>
  );
}

function ConfirmStatus(props: { state: ConfirmState; onRecover: (p: ConfirmationPayload) => void; onResend: (p: ConfirmationPayload) => void }) {
  const s = props.state;
  if (s.status === 'rejected') return <Banner tone="error" role="alert" title="Conferma non registrata"><p>{s.message} Le tue scelte sono ancora qui.</p></Banner>;
  if (s.status === 'unknown' || s.status === 'recovering') {
    return (
      <Banner tone="warning" role="alert" title="Esito non confermato"
        actions={<button type="button" className={ui.btn} disabled={s.status === 'recovering'} onClick={() => props.onRecover(s.payload)}>{s.status === 'recovering' ? 'Verifica in corso…' : 'Verifica l’esito'}</button>}>
        <p>{s.status === 'unknown' ? s.message : 'Verifica in corso.'} Non inviamo di nuovo la conferma automaticamente: verifica prima l’esito.</p>
      </Banner>
    );
  }
  if (s.status === 'not_found') {
    return (
      <Banner tone="warning" role="alert" title="Conferma non trovata"
        actions={<button type="button" className={ui.btn} onClick={() => props.onResend(s.payload)}>Invia di nuovo la stessa conferma</button>}>
        <p>Il servizio non ha registrato la conferma. Puoi inviarla di nuovo con le stesse scelte.</p>
      </Banner>
    );
  }
  return null;
}

function DocumentStep(props: ReceiptAssistantProps & { onOpenOriginalDialog: () => void }) {
  const caps = props.capabilities;
  const name = useId();
  const providers = caps?.enabled ? caps.providers : [];
  const [providerId, setProviderId] = useState<OpaqueId | null>(providers.length === 1 && providers[0] ? providers[0].id : null);
  const [consent, setConsent] = useState(false);
  const provider = providers.find(p => p.id === providerId);
  const job = props.job;
  const busy = job.status === 'starting' || job.status === 'queued' || job.status === 'running';
  const canAnalyze = props.canEdit && !!provider && (!provider.requiresConsent || consent) && !busy && props.original.status === 'available';
  return (
    <>
      {busy && <Loading label={job.status === 'starting' ? 'Avvio dell’analisi…' : 'Analisi in corso…'} />}
      {job.status === 'failed' && (
        <Banner tone="warning" role="alert" title={job.reason === 'read_failed' ? 'Non siamo riusciti a leggere i dati' : 'Analisi non completata'}
          actions={<button type="button" className={ui.btn} onClick={props.onOpenOriginalDialog}>Vedi documento originale</button>}>
          <p>{job.message} Nessun oggetto o costo è stato creato. L’originale resta in Documenti.</p>
        </Banner>
      )}
      {job.status === 'uncertain' && (
        <Banner tone="warning" role="alert" title="Esito dell’analisi non noto"><p>{job.message} Non viene avviata una seconda analisi automaticamente.</p></Banner>
      )}
      {!props.canEdit && <Banner><p>Con il tuo ruolo puoi consultare il documento, ma non avviare analisi o salvare dati.</p></Banner>}
      {props.canEdit && caps?.enabled && providers.length > 0 && (
        <section className={ui.card} aria-labelledby={`${name}-a`}>
          <h2 id={`${name}-a`}>Analisi del documento</h2>
          <p className={styles.note}>L’analisi propone oggetto, marca, modello e costo solo se leggibili. Prima di salvare rivedrai tutto.</p>
          {providers.length > 1 && (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Servizio di analisi</legend>
              {providers.map(p => (
                <label key={p.id} className={styles.choice}>
                  <input type="radio" name={`${name}-p`} checked={providerId === p.id} onChange={() => { setProviderId(p.id); setConsent(false); }} />
                  <span><strong>{p.label}</strong></span>
                </label>
              ))}
            </fieldset>
          )}
          {provider && (
            <>
              <p className={styles.note}>{provider.consentText}</p>
              {provider.costNote && <p className={styles.note}>{provider.costNote}</p>}
              {provider.requiresConsent && (
                <label className={styles.check}>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>Autorizzo l’invio del contenuto necessario del documento a {provider.label} per l’analisi.</span>
                </label>
              )}
            </>
          )}
          <div className={styles.actions}>
            <span className={styles.note}>Nessun salvataggio automatico.</span>
            <button type="button" className={cx(ui.btn, ui.primary)} disabled={!canAnalyze}
              onClick={() => provider && props.onStartAnalysis({ providerId: provider.id, consentToProviderTransfer: provider.requiresConsent ? consent : false })}>
              Avvia l’analisi
            </button>
          </div>
        </section>
      )}
      {props.canEdit && caps && !caps.enabled && <Banner><p>L’analisi assistita non è attiva su questo servizio.</p></Banner>}
      {props.canEdit && caps?.manualEnabled && (
        <section className={ui.card} aria-labelledby={`${name}-m`}>
          <h2 id={`${name}-m`}>Compila a mano</h2>
          <p className={styles.note}>Inserisci tu i dati consultando l’originale. Nessuna analisi viene avviata e i valori restano tuoi, non estratti.</p>
          <div className={styles.actions}>
            <span />
            <button type="button" className={ui.btn} disabled={busy} onClick={props.onStartManual}>Compila a mano</button>
          </div>
        </section>
      )}
    </>
  );
}
