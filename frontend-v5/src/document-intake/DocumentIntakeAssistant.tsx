import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Banner, Loading, cx, ui } from '../components/ui';
import { ReviewDialog, type ReviewWriteState } from './ReviewDialog';
import {
  STATUS_LABEL, STATUS_TONE, buildConfirmPayload, buildReviewPayload, buildSummary, collectionLabel, contextKeyString, deferPayload, displayName, formatBytes, sourceLost,
  initialReviewDraft, itemStatus, matchesReviewFilter, partLabel, reviewable, visibleItem,
  type CandidatePage, type ConfirmBatchOutcome, type ConfirmBatchPayload, type IntakeAnalysisPanel, type IntakeBatch, type IntakeCapabilities,
  type IntakeContextKey, type IntakeItem, type IntakeLoadState, type ItemConfirmResult, type ItemStatus, type OpaqueId,
  type RecoverBatchOutcome, type ReviewDraft, type ReviewFilter, type ReviewPayload, type WriteOutcome,
} from './model';
import styles from './intake.module.css';

/** Props del componente integrabile. Il container Codex fornisce dati e callback reali; qui nessun fetch. */
export type DocumentIntakeAssistantProps = {
  contextKey: IntakeContextKey;
  load: IntakeLoadState;
  capabilities: IntakeCapabilities | null;
  batch: IntakeBatch | null;
  /** Permesso di scrittura sulla casa (oltre ai permessi del lotto). */
  canEdit: boolean;
  homeName: string;
  analysis?: IntakeAnalysisPanel;
  onStartAnalysis?: (itemIds: OpaqueId[]) => void;
  candidates: Readonly<Record<OpaqueId, CandidatePage | undefined>>;
  loadCandidates: (itemId: OpaqueId, more: boolean) => void;
  /** Solo i File scelti: il componente non legge né invia contenuti. */
  onSelectFiles: (files: File[]) => void;
  addingFiles?: boolean;
  onRetryUpload: (itemId: OpaqueId) => Promise<WriteOutcome>;
  onCancelUpload: (itemId: OpaqueId) => Promise<WriteOutcome>;
  onSaveReview: (payload: ReviewPayload) => Promise<WriteOutcome>;
  onRecoverReview: (payload: ReviewPayload) => Promise<WriteOutcome | { status: 'not_found' }>;
  onResolveDuplicate: (itemId: OpaqueId, expectedVersion: IntakeItem['version']) => Promise<WriteOutcome>;
  onConfirm: (payload: ConfirmBatchPayload) => Promise<ConfirmBatchOutcome>;
  onRecoverConfirmation: (payload: ConfirmBatchPayload) => Promise<RecoverBatchOutcome>;
  openOriginal: (itemId: OpaqueId, page: number | null) => Promise<void>;
  renderPreview?: (itemId: OpaqueId, page: number | null) => ReactNode;
  onOpenReceiptFlow?: (itemId: OpaqueId) => void;
  renderOutcomeLinks?: (results: ItemConfirmResult[]) => ReactNode;
  onRetryLoad?: () => void;
};

/** Cambio di account/casa/lotto: rimontaggio completo, nessuna scelta o risposta tardiva passa di contesto. */
export function DocumentIntakeAssistant(props: DocumentIntakeAssistantProps) {
  return <Inner key={contextKeyString(props.contextKey)} {...props} />;
}

type Step = 'ingresso' | 'lotto' | 'proposte' | 'riepilogo' | 'esito';
type ConfirmState =
  | { status: 'idle' } | { status: 'submitting'; payload: ConfirmBatchPayload } | { status: 'rejected'; message: string }
  | { status: 'uncertain'; payload: ConfirmBatchPayload; message: string } | { status: 'recovering'; payload: ConfirmBatchPayload }
  | { status: 'not_found'; payload: ConfirmBatchPayload };
type Dialog = { itemId: OpaqueId; onlyOriginal: boolean } | null;

const TONE_CLASS = { ok: styles.badgeOk, warn: styles.badgeWarn, neutral: styles.badgeNeutral, error: styles.badgeError } as const;
export function StatusBadge({ status }: { status: ItemStatus }) {
  return <span className={cx(styles.badge, TONE_CLASS[STATUS_TONE[status]])}>{STATUS_LABEL[status]}</span>;
}

const FILTERS: Array<[ReviewFilter, string]> = [['all', 'Tutti'], ['ready', 'Pronti'], ['needs_choice', 'Da scegliere'], ['duplicate', 'Copie'], ['unreadable', 'Non leggibili'], ['decided', 'Decisi']];

function Inner(props: DocumentIntakeAssistantProps) {
  const { batch, load, capabilities } = props;
  const [stepChoice, setStep] = useState<Step | null>(null);
  const step: Step = stepChoice ?? (batch ? 'lotto' : 'ingresso');
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [drafts, setDrafts] = useState<Record<OpaqueId, ReviewDraft>>({});
  const [writes, setWrites] = useState<Record<OpaqueId, ReviewWriteState>>({});
  const [pendingReview, setPendingReview] = useState<Record<OpaqueId, ReviewPayload>>({});
  const [uploadMessages, setUploadMessages] = useState<Record<OpaqueId, string>>({});
  const [openState, setOpenState] = useState<{ status: 'idle' | 'opening' } | { status: 'error'; message: string }>({ status: 'idle' });
  const [excluded, setExcluded] = useState<ReadonlySet<OpaqueId>>(new Set());
  const [checked, setChecked] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ status: 'idle' });
  const [results, setResults] = useState<ItemConfirmResult[] | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputId = useId();
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { headingRef.current?.focus(); }, [step]);
  const items = useMemo(() => (batch?.items ?? []).map(visibleItem), [batch]);
  const summary = useMemo(() => (batch ? buildSummary(batch, excluded) : null), [batch, excluded]);

  if (load.status === 'loading') return <Loading label="Caricamento del lotto…" />;
  if (load.status === 'unavailable') {
    return (
      <div className={styles.stack}>
        <h1 tabIndex={-1}>Lotto non disponibile</h1>
        <Banner tone="warning" role="alert"><p>Questo account non ha accesso al lotto richiesto, oppure non è più disponibile.</p></Banner>
      </div>
    );
  }
  if (load.status === 'error') {
    return (
      <Banner tone="error" role="alert" title="Impossibile caricare il lotto"
        actions={load.retryable && props.onRetryLoad && <button type="button" className={ui.btn} onClick={props.onRetryLoad}>Riprova</button>}>
        <p>{load.message}</p>
      </Banner>
    );
  }

  const canUpload = props.canEdit && !!capabilities?.enabled && (batch ? batch.permissions.upload : true);
  const canReview = props.canEdit && (batch?.permissions.review ?? false);
  const canConfirm = props.canEdit && (batch?.permissions.confirm ?? false);
  const safe = <T,>(fn: () => T) => { if (alive.current) fn(); };
  // La bozza è legata al documento letto: con la fonte persa non si mostra (né riappare per un altro documento).
  const draftKey = (item: IntakeItem) => `${item.id}|${item.documentLink.document?.id ?? ''}`;
  const getDraft = (item: IntakeItem) => (sourceLost(item) ? initialReviewDraft(item) : drafts[draftKey(item)] ?? initialReviewDraft(item));
  const setWrite = (id: OpaqueId, w: ReviewWriteState) => safe(() => setWrites(prev => ({ ...prev, [id]: w })));
  // Riuso di una copia con esito incerto: non esiste un recupero dedicato, quindi resta bloccato finché il container
  // non ricarica l'elemento con una versione nuova (lo stato reale); mai reinviato da solo.
  const writeOf = (id: OpaqueId): ReviewWriteState => {
    const w = writes[id];
    if (w?.status === 'uncertain' && w.reloadOnly && items.find(i => i.id === id)?.version !== w.reloadOnly.version) return { status: 'idle' };
    return w ?? { status: 'idle' };
  };
  const lockedItems = new Set(Object.keys(writes).filter(id => ['uncertain', 'recovering', 'saving'].includes(writeOf(id).status)));
  const busy = confirm.status === 'submitting' || confirm.status === 'uncertain' || confirm.status === 'recovering';

  const applyWrite = (id: OpaqueId, outcome: WriteOutcome | { status: 'not_found' }, closeOnSuccess: boolean) => {
    if (outcome.status === 'confirmed') {
      setWrite(id, { status: 'idle' });
      safe(() => { setPendingReview(prev => { const next = { ...prev }; delete next[id]; return next; }); if (closeOnSuccess) setDialog(null); });
    } else if (outcome.status === 'rejected') setWrite(id, { status: 'rejected', message: outcome.message });
    else if (outcome.status === 'not_found') setWrite(id, { status: 'not_found' });
    else setWrite(id, { status: 'uncertain', message: outcome.message ?? 'Non sappiamo se la scelta è stata salvata.' });
  };
  const sendReview = async (payload: ReviewPayload) => {
    setWrite(payload.itemId, { status: 'saving' });
    setPendingReview(prev => ({ ...prev, [payload.itemId]: payload }));
    try { applyWrite(payload.itemId, await props.onSaveReview(payload), true); }
    catch { applyWrite(payload.itemId, { status: 'uncertain' }, true); }
  };
  const recoverReview = async (id: OpaqueId) => {
    const payload = pendingReview[id]; if (!payload) return;
    setWrite(id, { status: 'recovering' });
    try { applyWrite(id, await props.onRecoverReview(payload), true); }
    catch { applyWrite(id, { status: 'uncertain' }, true); }
  };
  const uploadAction = async (id: OpaqueId, action: (id: OpaqueId) => Promise<WriteOutcome>) => {
    safe(() => setUploadMessages(prev => ({ ...prev, [id]: '' })));
    let outcome: WriteOutcome;
    try { outcome = await action(id); } catch { outcome = { status: 'uncertain' }; }
    if (outcome.status === 'rejected') safe(() => setUploadMessages(prev => ({ ...prev, [id]: outcome.message })));
    if (outcome.status === 'uncertain') safe(() => setUploadMessages(prev => ({ ...prev, [id]: 'Esito non noto: ricarica il lotto per vedere lo stato reale di questo file.' })));
  };
  const openOriginal = async (id: OpaqueId, page: number | null) => {
    setOpenState({ status: 'opening' });
    try { await props.openOriginal(id, page); safe(() => setOpenState({ status: 'idle' })); }
    catch { safe(() => setOpenState({ status: 'error', message: 'Non è stato possibile aprire l’originale. Riprova tra poco.' })); }
  };

  const applyConfirm = (outcome: ConfirmBatchOutcome | RecoverBatchOutcome, sent: ConfirmBatchPayload) => safe(() => {
    if (outcome.status === 'done') { setResults(outcome.results); setConfirm({ status: 'idle' }); setStep('esito'); }
    else if (outcome.status === 'rejected') setConfirm({ status: 'rejected', message: outcome.message });
    else if (outcome.status === 'not_found') setConfirm({ status: 'not_found', payload: sent });
    else setConfirm({ status: 'uncertain', payload: sent, message: outcome.message ?? 'Non sappiamo se la conferma è stata registrata.' });
  });
  const submit = async (payload: ConfirmBatchPayload) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setConfirm({ status: 'submitting', payload });
    try { applyConfirm(await props.onConfirm(payload), payload); } catch { applyConfirm({ status: 'uncertain' }, payload); } finally { inFlight.current = false; }
  };
  const recover = async (payload: ConfirmBatchPayload) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setConfirm({ status: 'recovering', payload });
    try { applyConfirm(await props.onRecoverConfirmation(payload), payload); } catch { applyConfirm({ status: 'uncertain' }, payload); } finally { inFlight.current = false; }
  };

  const heading = (text: ReactNode, lead?: string) => (<><h1 ref={headingRef} tabIndex={-1}>{text}</h1>{lead && <p className={styles.lead}>{lead}</p>}</>);
  const steps = (
    <ol className={styles.steps} aria-label="Passaggi">
      {([['Carica', ['ingresso', 'lotto']], ['Rivedi le proposte', ['proposte']], ['Conferma', ['riepilogo', 'esito']]] as const).map(([label, s], i) => (
        <li key={label} className={cx(styles.step, (s as readonly Step[]).includes(step) && styles.stepActive)} aria-current={(s as readonly Step[]).includes(step) ? 'step' : undefined}>
          <span className={styles.stepNum} aria-hidden="true">{i + 1}</span>{label}
        </li>
      ))}
    </ol>
  );
  const found = dialog ? items.find(i => i.id === dialog.itemId) : undefined;
  // Fonte revocata a dialogo aperto: il dialogo non si mostra più, nessun dato della cache resta a schermo.
  const dialogItem = found && !sourceLost(found) && found.documentLink.state === 'linked' ? found : undefined;
  const reviewDialog = dialog && dialogItem && (
    <ReviewDialog
      item={dialogItem} draft={getDraft(dialogItem)} candidates={props.candidates[dialogItem.id]} write={writeOf(dialogItem.id)} onlyOriginal={dialog.onlyOriginal || !canReview}
      preview={(page) => props.renderPreview?.(dialogItem.id, page)} openState={openState}
      onOpenOriginal={(page) => void openOriginal(dialogItem.id, page)}
      onDraft={(d) => setDrafts(prev => ({ ...prev, [draftKey(dialogItem)]: d }))}
      onLoadCandidates={(more) => props.loadCandidates(dialogItem.id, more)}
      onSave={() => {
        const payload = buildReviewPayload(getDraft(dialogItem), dialogItem, props.candidates[dialogItem.id]?.items ?? []);
        if (payload) void sendReview(payload);
      }}
      onDefer={() => void sendReview(deferPayload(dialogItem))}
      onResolveDuplicate={async () => {
        setWrite(dialogItem.id, { status: 'saving' });
        const { id, version } = dialogItem;
        let outcome: WriteOutcome;
        try { outcome = await props.onResolveDuplicate(id, version); } catch { outcome = { status: 'uncertain' }; }
        if (outcome.status === 'uncertain') setWrite(id, { status: 'uncertain', reloadOnly: { version }, message: 'Non sappiamo se l’originale esistente è stato collegato. Ricarica il lotto per vedere lo stato reale: la scelta non viene inviata di nuovo.' });
        else applyWrite(id, outcome, true);
      }}
      onRecover={() => void recoverReview(dialogItem.id)}
      onOpenReceiptFlow={props.onOpenReceiptFlow ? () => props.onOpenReceiptFlow?.(dialogItem.id) : undefined}
      onClose={() => { setDialog(null); setOpenState({ status: 'idle' }); }}
    />
  );

  const row = (item: IntakeItem, mode: 'lotto' | 'proposte') => {
    const raw = itemStatus(item);
    const write = writeOf(item.id);
    const status: ItemStatus = write.status === 'uncertain' || write.status === 'recovering' ? 'uncertain' : raw;
    const decision = item.selection?.action === 'organize' ? item.selection : null;
    return (
      <article key={item.id} className={styles.row}>
        <span className={styles.fileIcon} aria-hidden="true">{item.mimeType === 'application/pdf' ? 'PDF' : item.mimeType ? 'IMG' : '—'}</span>
        <div className={styles.rowMain}>
          <h3>{mode === 'proposte' && item.proposal ? item.proposal.title : displayName(item)}</h3>
          {raw !== 'unavailable' && (
            <p>
              {mode === 'proposte' && item.proposal ? `${displayName(item)} · ` : ''}
              {item.byteSize !== null ? formatBytes(item.byteSize) : ''}{item.pageCount ? ` · ${item.pageCount} ${item.pageCount === 1 ? 'pagina' : 'pagine'}` : ''} · Solo io
            </p>
          )}
          <p><StatusBadge status={status} /></p>
          {decision && <p>{decision.parts.map(partLabel).join(' + ')} · {decision.target.kind === 'home' ? 'solo casa' : 'scheda esistente'}</p>}
          {raw === 'duplicate' && <p>{item.duplicate?.document ? `Stesso contenuto di «${item.duplicate.document.name}».` : 'Stesso contenuto di un altro file.'} Nessun originale viene eliminato.</p>}
          {raw === 'unavailable' && <p>Il documento non è più accessibile con questo account.</p>}
          {item.error && raw === 'upload_failed' && <p role="status">{item.error.message}</p>}
          {uploadMessages[item.id] && <p role="alert">{uploadMessages[item.id]}</p>}
        </div>
        <div className={styles.rowActions}>
          {raw === 'upload_failed' && canUpload && <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void uploadAction(item.id, props.onRetryUpload)}>Riprova questo file</button>}
          {(raw === 'pending' || raw === 'uploading') && canUpload && <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void uploadAction(item.id, props.onCancelUpload)}>Annulla</button>}
          {mode === 'proposte' && reviewable(item) && (
            <button type="button" className={cx(ui.btn, ui.small)} aria-label={`${raw === 'saved' || raw === 'deferred' ? 'Modifica scelta' : 'Rivedi'} ${displayName(item)}`} onClick={() => setDialog({ itemId: item.id, onlyOriginal: false })}>
              {raw === 'saved' || raw === 'deferred' ? 'Modifica scelta' : 'Rivedi'}
            </button>
          )}
          {mode === 'proposte' && raw === 'confirmed' && (
            <button type="button" className={cx(ui.btn, ui.small)} aria-label={`Vedi originale ${displayName(item)}`} onClick={() => setDialog({ itemId: item.id, onlyOriginal: true })}>Vedi originale</button>
          )}
        </div>
      </article>
    );
  };

  // ------------------------------------------------------------------ Esito
  if (step === 'esito' && results && batch) {
    const done = results.filter(r => r.status === 'confirmed');
    const failed = results.filter(r => r.status === 'rejected');
    const remaining = items.filter(i => i.reviewState !== 'confirmed' && !done.some(r => r.itemId === i.id)).length;
    return (
      <div className={styles.stack}>
        {heading(done.length ? 'Più ordine, senza moltiplicare le schede.' : 'Nessuna decisione applicata.', `${done.length} ${done.length === 1 ? 'decisione applicata' : 'decisioni applicate'}. Nessun nuovo oggetto e nessuna nuova spesa.`)}
        <div className={styles.layout}>
          <section className={ui.card}>
            <h2>Esito per file</h2>
            {results.map(r => {
              const item = items.find(i => i.id === r.itemId);
              return (
                <div key={r.itemId} className={styles.summaryLine}>
                  <span>{item?.selection?.action === 'organize' ? item.selection.title : item?.filename ?? 'File non più disponibile'}</span>
                  <strong>{r.status === 'confirmed' ? 'Organizzato' : `Non applicato${r.message ? `: ${r.message}` : ''}`}</strong>
                </div>
              );
            })}
            {props.renderOutcomeLinks && <div className={styles.actions}>{props.renderOutcomeLinks(results)}</div>}
          </section>
          <section className={ui.card}>
            <h2>Il resto non si perde</h2>
            <p>{remaining} {remaining === 1 ? 'file resta' : 'file restano'} da rivedere nel lotto{failed.length ? `, compresi ${failed.length} non applicati` : ''}.</p>
            <p className={styles.note}>Gli originali restano disponibili. Classificare non condivide i documenti e non ne certifica validità o regolarità.</p>
            <button type="button" className={ui.btn} onClick={() => { setResults(null); setChecked(false); setStep('proposte'); }}>Riprendi le decisioni rimaste</button>
          </section>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ Ingresso
  if (step === 'ingresso' || !batch) {
    const limits = batch?.limits ?? capabilities?.limits;
    return (
      <div className={styles.stack}>
        <p className={styles.crumb}>Documenti / Carica documenti</p>
        {steps}
        {heading(batch ? 'Aggiungi documenti al lotto.' : 'Tutti i tuoi documenti. Ognuno al suo posto.', batch ? `${batch.items.length} file già present${batch.items.length === 1 ? 'e' : 'i'}. I nuovi documenti si aggiungono qui, mantenendo quelli caricati e le scelte salvate.` : 'Carica uno o più file della casa: dopo il caricamento puoi rivedere le proposte e decidere come organizzarli.')}
        <div className={styles.layout}>
          <section className={ui.card}>
            {!capabilities?.enabled ? (
              <Banner><p>Il caricamento documenti non è disponibile su questo servizio. I documenti già presenti restano consultabili.</p></Banner>
            ) : !canUpload ? (
              <Banner><p>Con il tuo ruolo puoi consultare i documenti, ma non caricarne di nuovi.</p></Banner>
            ) : (
              <div className={styles.drop} role="region" aria-label="Carica documenti"
                aria-busy={props.addingFiles || undefined}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = props.addingFiles ? 'none' : 'copy'; }}
                onDrop={e => {
                  e.preventDefault();
                  if (props.addingFiles) return;
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length) { props.onSelectFiles(files); if (batch) setStep('lotto'); }
                }}>
                <h2>Trascina qui uno o più documenti</h2>
                <p>Oppure selezionali da una cartella del tuo dispositivo.</p>
                <label htmlFor={inputId} className={styles.legend}>File</label>
                <input id={inputId} className={styles.fileInput} type="file" multiple disabled={props.addingFiles} accept={limits?.acceptedMimeTypes.join(',')}
                  onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; if (files.length) { props.onSelectFiles(files); if (batch) setStep('lotto'); } e.target.value = ''; }} />
                {limits && <p className={styles.note}>Fino a {limits.maxFiles} file, {formatBytes(limits.maxFileBytes)} ciascuno e {formatBytes(limits.maxTotalBytes)} in totale. PDF, JPEG o PNG.</p>}
              </div>
            )}
            <p className={styles.note}>Un file può contenere più documenti; più file possono riguardare la stessa scheda.</p>
            {batch && <div className={styles.actions}><span /><button type="button" className={ui.btn} onClick={() => setStep('lotto')}>Vedi il lotto →</button></div>}
          </section>
          <aside className={styles.aside}>
            <section className={cx(ui.card, ui.tint)}>
              <h2>Prima di iniziare</h2>
              <p><strong>{props.homeName}</strong><br /><span className={styles.note}>Destinazione del lotto</span></p>
              <p><strong>Solo io</strong><br /><span className={styles.note}>Classificare un documento come condominiale non lo condivide con nessuno.</span></p>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ Lotto
  if (step === 'lotto') {
    const analyzable = items.filter(i => i.uploadState === 'stored' && i.analysisState === 'not_started').map(i => i.id);
    return (
      <div className={styles.stack}>
        <p className={styles.crumb}>Documenti / Carica documenti</p>
        {steps}
        {heading('Il lotto è pronto da organizzare.', 'Il caricamento conserva gli originali. L’analisi propone come organizzarli; le scelte vengono dopo.')}
        <div className={styles.layout}>
          <section className={ui.card} aria-label="File del lotto">
            <h2>{items.length} {items.length === 1 ? 'file' : 'file'} nel lotto</h2>
            <div className={styles.rows}>{items.map(i => row(i, 'lotto'))}</div>
            {canUpload && <div className={styles.actions}>
              <button type="button" className={ui.btn} disabled={props.addingFiles} onClick={() => setStep('ingresso')}>+ Aggiungi documenti</button>
            </div>}
          </section>
          <aside className={styles.aside}>
            {props.analysis && props.onStartAnalysis ? (
              <AnalysisPanel panel={props.analysis} disabled={!canReview || analyzable.length === 0} count={analyzable.length} onStart={() => props.onStartAnalysis?.(analyzable)} />
            ) : (
              <section className={ui.card}><h2>Organizzazione</h2><p className={styles.note}>L’analisi assistita non è attiva: puoi organizzare ogni file manualmente.</p></section>
            )}
            <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setStep('proposte')}>Rivedi le proposte →</button>
          </aside>
        </div>
        {reviewDialog}
      </div>
    );
  }

  // ------------------------------------------------------------------ Riepilogo
  if (step === 'riepilogo' && summary) {
    const payload = buildConfirmPayload(batch, summary);
    const saved = [...summary.included, ...summary.excluded];
    return (
      <div className={styles.stack}>
        {steps}
        {heading('Applichiamo solo le tue scelte.', 'Solo le decisioni salvate e incluse qui verranno applicate. Le altre restano da rivedere.')}
        <div className={styles.layout}>
          <section className={ui.card} aria-label="Decisioni pronte">
            <h2>{summary.included.length} {summary.included.length === 1 ? 'decisione pronta' : 'decisioni pronte'}</h2>
            {saved.length === 0 && <p>Nessuna decisione pronta. Torna alle proposte.</p>}
            {saved.map(item => {
              const sel = item.selection?.action === 'organize' ? item.selection : null;
              const included = !summary.excluded.includes(item);
              return (
                <label key={item.id} className={styles.check}>
                  <input type="checkbox" checked={included} disabled={busy} onChange={(e) => {
                    setExcluded(prev => { const next = new Set(prev); if (e.target.checked) next.delete(item.id); else next.add(item.id); return next; });
                  }} />
                  <span><strong>{sel?.title}</strong>
                    <span className={styles.hint}>{sel?.parts.map(partLabel).join(' + ')} · {sel?.target.kind === 'home' ? 'solo casa' : 'scheda esistente'} · Solo io</span>
                  </span>
                </label>
              );
            })}
          </section>
          <section className={ui.card}>
            <h2>Il risultato</h2>
            {summary.byCollection.map(c => <div key={c.collection} className={styles.summaryLine}><span>{collectionLabel(c.collection)}</span><strong>{c.count}</strong></div>)}
            <div className={styles.summaryLine}><span>Nuovi oggetti / spese</span><strong>0 / 0</strong></div>
            <div className={styles.summaryLine}><span>Da rivedere più avanti</span><strong>{summary.remaining}</strong></div>
            <p className={styles.note}>Gli originali restano disponibili anche per i file rimandati.</p>
            <ConfirmStatus state={confirm} onRecover={(p) => void recover(p)} onResend={(p) => void submit(p)} />
            {canConfirm && (
              <>
                <label className={styles.check}>
                  <input type="checkbox" checked={checked} disabled={busy} onChange={(e) => setChecked(e.target.checked)} />
                  <span>Ho controllato queste decisioni e voglio applicarle.</span>
                </label>
                <div className={styles.actions}>
                  <button type="button" className={cx(ui.btn, ui.primary)} disabled={!payload || !checked || busy || confirm.status === 'not_found'}
                    onClick={() => {
                      const frozen = confirm.status === 'rejected' || confirm.status === 'idle' ? payload : null;
                      if (frozen) void submit(frozen);
                    }}>
                    {confirm.status === 'submitting' ? 'Conferma in corso…' : 'Conferma le scelte'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
        <div className={styles.actions}><button type="button" className={ui.btn} onClick={() => setStep('proposte')} disabled={busy}>← Modifica le scelte</button></div>
      </div>
    );
  }

  // ------------------------------------------------------------------ Proposte
  const visible = items.filter(i => matchesReviewFilter(i, filter));
  const savedCount = summary?.included.length ?? 0;
  return (
    <div className={styles.stack}>
      {steps}
      {heading('Una casa, documenti diversi.', 'Controlla i casi chiari e scegli come gestire gli altri: niente viene applicato finché non confermi.')}
      {!canReview && <Banner><p>Con il tuo ruolo puoi consultare le proposte, ma non salvare decisioni.</p></Banner>}
      <div className={styles.toolbar} role="group" aria-label="Filtra i file">
        {FILTERS.map(([f, label]) => (
          <button key={f} type="button" className={styles.filter} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {label} · {items.filter(i => matchesReviewFilter(i, f)).length}
          </button>
        ))}
      </div>
      <div className={styles.layout}>
        <section className={ui.card} aria-label="Proposte">
          {visible.length ? <div className={styles.rows}>{visible.map(i => row(i, 'proposte'))}</div> : <p>Nessun file in questo filtro.</p>}
        </section>
        <aside className={styles.aside}>
          <section className={ui.card}>
            <h2>Le tue scelte</h2>
            <div className={styles.stat}>{savedCount}<span className={styles.note}> / {items.length}</span></div>
            <p className={styles.note}>File con una decisione pronta. Il resto può rimanere da rivedere.</p>
            {lockedItems.size > 0 && <p className={styles.formError}>{lockedItems.size === 1 ? 'Una scelta ha' : `${lockedItems.size} scelte hanno`} un esito da verificare.</p>}
            <div className={styles.actions}>
              <button type="button" className={cx(ui.btn, ui.primary)} disabled={!savedCount} onClick={() => setStep('riepilogo')}>Controlla il riepilogo →</button>
            </div>
          </section>
          <button type="button" className={ui.btn} onClick={() => setStep('lotto')}>← Vedi il lotto</button>
        </aside>
      </div>
      {reviewDialog}
    </div>
  );
}

function AnalysisPanel(props: { panel: IntakeAnalysisPanel; disabled: boolean; count: number; onStart: () => void }) {
  const [consent, setConsent] = useState(false);
  const { panel } = props;
  return (
    <section className={ui.card}>
      <h2>Analisi del lotto</h2>
      <p className={styles.note}>{panel.consentText}</p>
      {panel.costText && <p className={styles.note}>{panel.costText}</p>}
      {panel.limitsText && <p className={styles.note}>{panel.limitsText}</p>}
      {panel.state.status === 'blocked' && <Banner tone="warning"><p>{panel.state.message}</p></Banner>}
      {panel.state.status === 'running' ? <Loading label="Analisi in corso…" /> : (
        <>
          <label className={styles.check}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={props.disabled || panel.state.status === 'blocked'} />
            <span>Autorizzo l’analisi dei {props.count} file indicati.</span>
          </label>
          <div className={styles.actions}>
            <button type="button" className={cx(ui.btn, ui.primary)} disabled={!consent || props.disabled || panel.state.status === 'blocked'} onClick={props.onStart}>Avvia l’analisi</button>
          </div>
        </>
      )}
    </section>
  );
}

function ConfirmStatus(props: { state: ConfirmState; onRecover: (p: ConfirmBatchPayload) => void; onResend: (p: ConfirmBatchPayload) => void }) {
  const s = props.state;
  if (s.status === 'rejected') return <Banner tone="error" role="alert" title="Conferma non registrata"><p>{s.message} Le tue scelte sono ancora qui.</p></Banner>;
  if (s.status === 'uncertain' || s.status === 'recovering') {
    return (
      <Banner tone="warning" role="alert" title="Esito non confermato"
        actions={<button type="button" className={ui.btn} disabled={s.status === 'recovering'} onClick={() => props.onRecover(s.payload)}>{s.status === 'recovering' ? 'Verifica in corso…' : 'Verifica l’esito'}</button>}>
        <p>{s.status === 'uncertain' ? s.message : 'Verifica in corso.'} Le scelte restano bloccate e non vengono inviate di nuovo automaticamente.</p>
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
