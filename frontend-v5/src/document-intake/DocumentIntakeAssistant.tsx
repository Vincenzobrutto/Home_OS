import { FilePicker } from '../components/FilePicker';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Banner, Loading, cx, ui } from '../components/ui';
import { ReviewDialog, type ReviewWriteState } from './ReviewDialog';
import {
  STATUS_LABEL, STATUS_TONE, buildOrganizePayload, buildReviewPayload, bulkEligible, bulkItem, canonical, collectionLabel, contextKeyString,
  deferPayload, displayName, draftChanged, formatBytes, hasConflict, initialReviewDraft, itemStatus, kindCollection, matchesWorkFilter, partLabel,
  houseDocumentKind, supportsObjectProposals, reviewable, rowTitle, selectionCollections, sourceLost, visibleItem, workGroup,
  type CandidatePage, type ConfirmBatchOutcome, type ConfirmBatchPayload, type IntakeAnalysisPanel, type IntakeBatch, type IntakeCapabilities,
  type IntakeContextKey, type IntakeItem, type IntakeLoadState, type ItemConfirmResult, type ItemStatus, type OpaqueId, type OpaqueVersion,
  type OrganizeBatchPayload, type RecoverBatchOutcome, type ReviewDraft, type ReviewPayload, type WorkFilter, type WriteOutcome,
} from './model';
import styles from './intake.module.css';

/** Props del componente integrabile. Il container Codex fornisce dati e callback reali; qui nessun fetch. */
export type DocumentIntakeAssistantProps = {
  focused?: boolean;
  focusedAi?: boolean;
  contextKey: IntakeContextKey;
  load: IntakeLoadState;
  capabilities: IntakeCapabilities | null;
  batch: IntakeBatch | null;
  /** Permesso di scrittura sulla casa (oltre ai permessi del lotto). */
  canEdit: boolean;
  homeName: string;
  /** V1, non più mostrato: la lettura locale parte dal container dopo ogni acquisizione (V2, nessun pulsante Analizza). */
  analysis?: IntakeAnalysisPanel;
  /** V1, non più usato dall'interfaccia V2. Conservato per la compatibilità del container. */
  onStartAnalysis?: (itemIds: OpaqueId[]) => void;
  candidates: Readonly<Record<OpaqueId, CandidatePage | undefined>>;
  loadCandidates: (itemId: OpaqueId, more: boolean) => void;
  /** Solo i File scelti: il componente non legge né invia contenuti. */
  onSelectFiles: (files: File[]) => void;
  addingFiles?: boolean;
  onReorganizeDocument?: (itemId: OpaqueId) => Promise<void>;
  onRetryUpload: (itemId: OpaqueId) => Promise<WriteOutcome>;
  onRemoveItem?: (itemId:OpaqueId)=>Promise<WriteOutcome>;
  onCancelUpload: (itemId: OpaqueId) => Promise<WriteOutcome>;
  /** V2: usato solo per «Decidi più avanti» (action defer). */
  onSaveReview: (payload: ReviewPayload) => Promise<WriteOutcome>;
  onRecoverReview: (payload: ReviewPayload) => Promise<WriteOutcome | { status: 'not_found' }>;
  /** V2: «Mantieni invariato» per una copia già presente. */
  onResolveDuplicate: (itemId: OpaqueId, expectedVersion: IntakeItem['version']) => Promise<WriteOutcome>;
  /** V1, non più esposto nell'interfaccia V2 (nessun riepilogo supplementare). Conservato per compatibilità. */
  onConfirm: (payload: ConfirmBatchPayload) => Promise<ConfirmBatchOutcome>;
  /** V1, come sopra. */
  onRecoverConfirmation: (payload: ConfirmBatchPayload) => Promise<RecoverBatchOutcome>;
  /**
   * V2: applicazione diretta (singolo o selezione multipla). Il container conserva chiave stabile e corpo.
   * Assente: le azioni di organizzazione restano disabilitate con il motivo, nessun successo simulato.
   */
  onOrganize?: (payload: OrganizeBatchPayload) => Promise<ConfirmBatchOutcome>;
  /** V2: recupero dell'esito di una richiesta diretta con lo stesso payload (GET della ricevuta). */
  onRecoverOrganization?: (payload: OrganizeBatchPayload) => Promise<RecoverBatchOutcome>;
  openOriginal: (itemId: OpaqueId, page: number | null) => Promise<void>;
  renderPreview?: (itemId: OpaqueId, page: number | null) => ReactNode;
  onOpenReceiptFlow?: (itemId: OpaqueId) => void;
  objectProposalItemId?:string|null;
  renderCompilationActions?: (itemId: string) => ReactNode;
  renderObjectProposals?:(itemId:string,reviewDocument:()=>void)=>ReactNode;
  renderOutcomeLinks?: (results: ItemConfirmResult[]) => ReactNode;
  onRetryLoad?: () => void;
};

/** Cambio di account/casa/lotto: rimontaggio completo, nessuna scelta, selezione o risposta tardiva passa di contesto. */
export function DocumentIntakeAssistant(props: DocumentIntakeAssistantProps) {
  return <Inner key={contextKeyString(props.contextKey)} {...props} />;
}

type View = 'ingresso' | 'lavoro';
type Dialog = { itemId: OpaqueId; onlyOriginal: boolean } | null;
/** Una richiesta diretta in volo o con esito da chiarire. Il payload resta congelato per recupero e reinvio. */
type OrganizeOp = { key: string; payload: OrganizeBatchPayload; status: 'submitting' | 'uncertain' | 'recovering' | 'not_found'; message?: string };
type Notice = { tone: 'success' | 'warning'; text: string; failures: Array<{ id: OpaqueId; name: string; message: string }> } | null;

const TONE_CLASS = { ok: styles.badgeOk, warn: styles.badgeWarn, neutral: styles.badgeNeutral, error: styles.badgeError } as const;
export function StatusBadge({ status }: { status: ItemStatus }) {
  return <span className={cx(styles.badge, TONE_CLASS[STATUS_TONE[status]])}>{STATUS_LABEL[status]}</span>;
}
function Badge({ tone, children }: { tone: keyof typeof TONE_CLASS; children: ReactNode }) {
  return <span className={cx(styles.badge, TONE_CLASS[tone])}>{children}</span>;
}

const FILTERS: Array<[WorkFilter, string]> = [['all', 'Tutti'], ['review', 'Da rivedere'], ['later', 'Più tardi'], ['done', 'Completati']];
export const ORGANIZE_UNAVAILABLE = 'La conferma diretta non è ancora disponibile in questo servizio: puoi decidere più avanti.';
const IN_FLIGHT: ReadonlyArray<ReviewWriteState['status']> = ['saving', 'uncertain', 'recovering'];

function Inner(props: DocumentIntakeAssistantProps) {
  const { batch, load, capabilities } = props;
  const [removal,setRemoval]=useState<string|null>(null);
  const [viewChoice, setView] = useState<View | null>(null);
  const view: View = viewChoice ?? (batch ? 'lavoro' : 'ingresso');
  const [filter, setFilter] = useState<WorkFilter>('all');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  function reviewDocument(item:IntakeItem) {
    const kind=houseDocumentKind(item);
    if(kind&&!item.proposal&&!item.confirmedOrganization&&!item.selection&&item.uploadState!=='duplicate')setDrafts(old=>({...old,[draftKey(item)]:old[draftKey(item)]??{...initialReviewDraft(item),title:(item.filename??item.documentLink.document?.name??'Documento della casa').replace(/\.[^.]+$/u,''),manualParts:[{kind,pageFrom:null,pageTo:null}],target:{kind:'home'}}}));
    setDialog({itemId:item.id,onlyOriginal:false});
  }
  const [writes, setWrites] = useState<Record<OpaqueId, ReviewWriteState>>({});
  const [pendingReview, setPendingReview] = useState<Record<OpaqueId, ReviewPayload>>({});
  const [ops, setOps] = useState<OrganizeOp[]>([]);
  const [itemErrors, setItemErrors] = useState<Record<OpaqueId, { version: OpaqueVersion; message: string }>>({});
  // Selezione multipla: id → versione vista. Vale solo finché versione, filtro e idoneità restano gli stessi.
  const [picked, setPicked] = useState<Record<OpaqueId, OpaqueVersion>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [results, setResults] = useState<ItemConfirmResult[]>([]);
  const [uploadMessages, setUploadMessages] = useState<Record<OpaqueId, string>>({});
  const [openState, setOpenState] = useState<{ status: 'idle' | 'opening' } | { status: 'error'; message: string }>({ status: 'idle' });
  const inFlight = useRef(new Set<string>());
  const alive = useRef(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { headingRef.current?.focus(); }, [view]);
  const items = useMemo(() => (batch?.items ?? []).map(visibleItem), [batch]);

  if (load.status === 'loading') return <Loading label="Caricamento dei documenti…" />;
  if (load.status === 'unavailable') {
    return (
      <div className={styles.stack}>
        <h1 tabIndex={-1}>Caricamento non disponibile</h1>
        <Banner tone="warning" role="alert"><p>Questo account non ha accesso a questo caricamento, oppure non è più disponibile.</p></Banner>
      </div>
    );
  }
  if (load.status === 'error') {
    return (
      <Banner tone="error" role="alert" title="Impossibile caricare i documenti"
        actions={load.retryable && props.onRetryLoad && <button type="button" className={ui.btn} onClick={props.onRetryLoad}>Riprova</button>}>
        <p>{load.message}</p>
      </Banner>
    );
  }

  const canUpload = props.canEdit && !!capabilities?.enabled && (batch ? batch.permissions.upload : true);
  const canReview = props.canEdit && (batch?.permissions.review ?? false);
  const canOrganize = canReview && !!props.onOrganize;
  const safe = <T,>(fn: () => T) => { if (alive.current) fn(); };
  // La bozza è legata al documento letto: con la fonte persa non si mostra (né riappare per un altro documento).
  const draftKey = (item: IntakeItem) => `${item.id}|${item.documentLink.document?.id ?? ''}`;
  const getDraft = (item: IntakeItem) => (sourceLost(item) ? initialReviewDraft(item) : drafts[draftKey(item)] ?? initialReviewDraft(item));
  const dropDraft = (item: IntakeItem) => setDrafts(prev => { const next = { ...prev }; delete next[draftKey(item)]; return next; });
  const setWrite = (id: OpaqueId, w: ReviewWriteState) => safe(() => setWrites(prev => ({ ...prev, [id]: w })));
  const versionOf = (id: OpaqueId) => items.find(i => i.id === id)?.version;
  const opOf = (id: OpaqueId) => ops.find(o => o.payload.items.some(i => i.itemId === id));
  /** Stato di scrittura visibile per elemento: richiesta diretta, poi rinvio/copia, poi rifiuto del singolo. */
  const writeOf = (id: OpaqueId): ReviewWriteState => {
    const op = opOf(id);
    if (op) {
      if (op.status === 'submitting') return { status: 'saving' };
      if (op.status === 'recovering') return { status: 'recovering' };
      if (op.status === 'not_found') return { status: 'not_found', resend: true };
      const message = op.message ?? 'Non sappiamo se il documento è stato organizzato.';
      return props.onRecoverOrganization ? { status: 'uncertain', message } : { status: 'uncertain', message, reloadOnly: { version: versionOf(id) ?? '' } };
    }
    const w = writes[id];
    // Riuso di una copia con esito incerto: resta bloccato finché il container non porta una versione nuova.
    if (w?.status === 'uncertain' && w.reloadOnly && versionOf(id) !== w.reloadOnly.version) return { status: 'idle' };
    if (w && w.status !== 'idle') return w;
    const err = itemErrors[id];
    if (err && versionOf(id) === err.version) return { status: 'rejected', message: err.message };
    return { status: 'idle' };
  };
  /** Nessuna nuova scrittura su un elemento con richiesta in volo o esito da chiarire. */
  const locked = (id: OpaqueId) => !!opOf(id) || IN_FLIGHT.includes(writeOf(id).status);
  const selectable = (item: IntakeItem) => canOrganize && bulkEligible(item) && !locked(item.id);
  const visible = items.filter(i => matchesWorkFilter(i, filter));
  // Selezione valida soltanto per elementi visibili nel filtro, idonei e alla stessa versione vista.
  const selected = visible.filter(i => picked[i.id] !== undefined && picked[i.id] === i.version && selectable(i));
  const available = visible.filter(selectable);

  // ------------------------------------------------------------------ scritture
  const applyWrite = (id: OpaqueId, outcome: WriteOutcome | { status: 'not_found' }, closeOnSuccess: boolean) => {
    if (outcome.status === 'confirmed') {
      setWrite(id, { status: 'idle' });
      safe(() => {
        setPendingReview(prev => { const next = { ...prev }; delete next[id]; return next; });
        if (closeOnSuccess) { const it = items.find(i => i.id === id); if (it) dropDraft(it); setDialog(null); }
      });
    } else if (outcome.status === 'rejected') setWrite(id, { status: 'rejected', message: outcome.message });
    else if (outcome.status === 'not_found') setWrite(id, { status: 'not_found' });
    else setWrite(id, { status: 'uncertain', message: outcome.message ?? 'Non sappiamo se la scelta è stata salvata.' });
  };
  const sendReview = async (payload: ReviewPayload) => {
    setWrite(payload.itemId, { status: 'saving' });
    setPendingReview(prev => ({ ...prev, [payload.itemId]: payload }));
    let outcome: WriteOutcome;
    try { outcome = await props.onSaveReview(payload); } catch { outcome = { status: 'uncertain' }; }
    applyWrite(payload.itemId, outcome, true);
    if (outcome.status === 'confirmed' && payload.selection.action === 'defer') {
      safe(() => setNotice({ tone: 'success', text: 'Documento spostato in «Più tardi». Potrai riprendere la scelta da questa lista.', failures: [] }));
    }
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
    if (outcome.status === 'uncertain') safe(() => setUploadMessages(prev => ({ ...prev, [id]: 'Esito non noto: ricarica la pagina per vedere lo stato reale di questo file.' })));
  };
  const openOriginal = async (id: OpaqueId, page: number | null) => {
    setOpenState({ status: 'opening' });
    try { await props.openOriginal(id, page); safe(() => setOpenState({ status: 'idle' })); }
    catch { safe(() => setOpenState({ status: 'error', message: 'Non è stato possibile aprire l’originale. Riprova tra poco.' })); }
  };

  /** Esito di una richiesta diretta: per file, mai un successo implicito; i non applicati restano da rivedere. */
  const applyOrganize = (key: string, payload: OrganizeBatchPayload, outcome: ConfirmBatchOutcome | RecoverBatchOutcome) => safe(() => {
    const ids = payload.items.map(i => i.itemId);
    const nameOf = (id: OpaqueId) => { const it = items.find(i => i.id === id); return it ? rowTitle(it) : 'Documento non disponibile'; };
    if (outcome.status === 'uncertain') {
      setOps(prev => prev.map(o => (o.key === key ? { ...o, status: 'uncertain', message: outcome.message ?? 'Non sappiamo se la richiesta è stata registrata.' } : o)));
      return;
    }
    if (outcome.status === 'not_found') { setOps(prev => prev.map(o => (o.key === key ? { ...o, status: 'not_found' } : o))); return; }
    if (outcome.status === 'rejected') {
      setOps(prev => prev.filter(o => o.key !== key));
      setItemErrors(prev => ({ ...prev, ...Object.fromEntries(payload.items.map(i => [i.itemId, { version: i.expectedVersion, message: outcome.message }])) }));
      if (payload.mode === 'multiple') setNotice({ tone: 'warning', text: `Nessun documento organizzato: ${outcome.message}`, failures: [] });
      return;
    }
    const byId = new Map(outcome.results.map(r => [r.itemId, r]));
    if (ids.some(id => !byId.has(id))) {
      // Registrata solo in parte: si chiarisce con lo stesso payload, nessun nuovo invio con un'altra chiave.
      setOps(prev => prev.map(o => (o.key === key ? { ...o, status: 'uncertain', message: 'Una parte è registrata. Verifica l’esito per riprendere gli elementi restanti.' } : o)));
      return;
    }
    setOps(prev => prev.filter(o => o.key !== key));
    const done = outcome.results.filter(r => r.status === 'confirmed');
    const failed = outcome.results.filter(r => r.status === 'rejected');
    setResults(prev => [...prev.filter(r => !byId.has(r.itemId)), ...outcome.results]);
    setPicked(prev => { const next = { ...prev }; for (const id of ids) delete next[id]; return next; });
    setItemErrors(prev => {
      const next = { ...prev };
      for (const r of done) delete next[r.itemId];
      for (const r of failed) {
        const sent = payload.items.find(i => i.itemId === r.itemId);
        if (sent) next[r.itemId] = { version: sent.expectedVersion, message: r.message ?? 'Non applicato: rileggi questo documento.' };
      }
      return next;
    });
    if (done.length) {
      setDialog(prev => (prev && done.some(r => r.itemId === prev.itemId) ? null : prev));
      setDrafts(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !done.some(r => k.startsWith(`${r.itemId}|`)))));
    }
    const one = payload.mode === 'single' ? payload.items[0] : undefined;
    if (one && !done.length) return; // rifiuto del singolo: resta nel dialogo come errore dell'elemento
    setNotice({
      tone: failed.length ? 'warning' : 'success',
      text: one
        ? `Documento organizzato in ${selectionCollections(one.selection).map(collectionLabel).join(' e ')}.`
        : done.length
          ? `${done.length} ${done.length === 1 ? 'documento organizzato' : 'documenti organizzati'}.${failed.length ? ` ${failed.length} non ${failed.length === 1 ? 'applicato: resta' : 'applicati: restano'} da rivedere.` : ''}`
          : 'Nessun documento organizzato: restano da rivedere.',
      failures: failed.map(r => ({ id: r.itemId, name: nameOf(r.itemId), message: r.message ?? 'Non applicato.' })),
    });
  });
  const runOrganize = async (payload: OrganizeBatchPayload, recover = false) => {
    const key = canonical(payload);
    const call = recover ? props.onRecoverOrganization : props.onOrganize;
    if (!call || inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setNotice(null);
    setOps(prev => [...prev.filter(o => o.key !== key), { key, payload, status: recover ? 'recovering' : 'submitting' }]);
    let outcome: ConfirmBatchOutcome | RecoverBatchOutcome;
    try { outcome = await call(payload); } catch { outcome = { status: 'uncertain' }; }
    inFlight.current.delete(key);
    applyOrganize(key, payload, outcome);
  };

  const heading = (text: ReactNode, lead?: ReactNode) => (<><h1 ref={headingRef} tabIndex={-1}>{text}</h1>{lead && <p className={styles.lead}>{lead}</p>}</>);
  const found = dialog ? items.find(i => i.id === dialog.itemId) : undefined;
  // Fonte revocata a dialogo aperto: il dialogo non si mostra più, nessun dato della cache resta a schermo.
  const dialogItem = found && !sourceLost(found) && found.documentLink.state === 'linked' ? found : undefined;
  const closeDialog = () => { if (dialogItem) dropDraft(dialogItem); setDialog(null); setOpenState({ status: 'idle' }); };
  const reviewDialog = dialog && dialogItem && batch && (
    <ReviewDialog
      item={dialogItem} draft={getDraft(dialogItem)} candidates={props.candidates[dialogItem.id]} write={writeOf(dialogItem.id)} onlyOriginal={dialog.onlyOriginal || !canReview}
      dirty={draftChanged(getDraft(dialogItem), dialogItem)} organizeAvailable={!!props.onOrganize} unavailableReason={ORGANIZE_UNAVAILABLE}
      preview={(page) => props.renderPreview?.(dialogItem.id, page)} openState={openState}
      onOpenOriginal={(page) => void openOriginal(dialogItem.id, page)}
      onDraft={(d) => setDrafts(prev => ({ ...prev, [draftKey(dialogItem)]: d }))}
      onLoadCandidates={(more) => props.loadCandidates(dialogItem.id, more)}
      onSave={() => {
        const review = buildReviewPayload(getDraft(dialogItem), dialogItem, props.candidates[dialogItem.id]?.items ?? []);
        const payload = review && buildOrganizePayload(batch, 'single', [review]);
        if (payload) {
          setItemErrors(prev => { const next = { ...prev }; delete next[dialogItem.id]; return next; });
          void runOrganize(payload);
        }
      }}
      onDefer={() => void sendReview(deferPayload(dialogItem))}
      onResolveDuplicate={async () => {
        setWrite(dialogItem.id, { status: 'saving' });
        const { id, version } = dialogItem;
        let outcome: WriteOutcome;
        try { outcome = await props.onResolveDuplicate(id, version); } catch { outcome = { status: 'uncertain' }; }
        if (outcome.status === 'uncertain') setWrite(id, { status: 'uncertain', reloadOnly: { version }, message: 'Non sappiamo se il file è stato mantenuto. Ricarica la pagina per vedere lo stato reale: la scelta non viene inviata di nuovo.' });
        else {
          applyWrite(id, outcome, true);
          if (outcome.status === 'confirmed') safe(() => setNotice({ tone: 'success', text: 'Documento mantenuto invariato. Non è stato creato un secondo originale.', failures: [] }));
        }
      }}
      onRecover={() => { const op = opOf(dialogItem.id); if (op) void runOrganize(op.payload, true); else void recoverReview(dialogItem.id); }}
      onResend={() => { const op = opOf(dialogItem.id); if (op) void runOrganize(op.payload); }}
      onOpenReceiptFlow={!props.renderObjectProposals&&props.onOpenReceiptFlow ? () => props.onOpenReceiptFlow?.(dialogItem.id) : undefined}
      onClose={closeDialog}
    />
  );

  // ------------------------------------------------------------------ Ingresso
  if (view === 'ingresso' || !batch) {
    const limits = batch?.limits ?? capabilities?.limits;
    const choose = (files: File[]) => { if (files.length) { props.onSelectFiles(files); if (batch) setView('lavoro'); } };
    return (
      <div className={styles.stack}>
        <p className={styles.crumb}>Documenti / Carica documenti</p>
        {heading(batch ? 'Aggiungi documenti.' : 'Carica i documenti della casa.', batch
          ? `${batch.items.length} ${batch.items.length === 1 ? 'documento già presente' : 'documenti già presenti'}: restano qui con i risultati già ottenuti.`
          : 'Fatture, bollette e foto: ti proponiamo come organizzarle.')}
        <div className={styles.layout}>
          <section className={ui.card}>
            {!capabilities?.enabled ? (
              <Banner><p>Il caricamento documenti non è disponibile su questo servizio. I documenti già presenti restano consultabili.</p></Banner>
            ) : !canUpload ? (
              <Banner><p>Con il tuo ruolo puoi consultare i documenti, ma non caricarne di nuovi.</p></Banner>
            ) : (
              <div className={styles.drop} role="region" aria-label="Carica documenti" aria-busy={props.addingFiles || undefined}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = props.addingFiles ? 'none' : 'copy'; }}
                onDrop={e => { e.preventDefault(); if (!props.addingFiles) choose(Array.from(e.dataTransfer.files)); }}>
                <h2>Scegli uno o più documenti</h2>
                <p>Seleziona i file dal dispositivo oppure trascinali qui.</p>
                <FilePicker onFiles={choose} disabled={props.addingFiles} accept={limits?.acceptedMimeTypes.join(',')}/>
                {limits && <p className={styles.note}>Fino a {limits.maxFiles} file, {formatBytes(limits.maxFileBytes)} ciascuno e {formatBytes(limits.maxTotalBytes)} in totale. PDF, JPEG o PNG.</p>}
              </div>
            )}
            {batch && <div className={styles.actions}><span /><button type="button" className={ui.btn} onClick={() => setView('lavoro')}>Torna ai documenti caricati</button></div>}
          </section>
          <aside className={styles.aside}>
            <section className={cx(ui.card, ui.tint)}>
              <h2>Tu mantieni il controllo</h2>
              <p><strong>{props.homeName}</strong><br /><span className={styles.note}>Casa di destinazione</span></p>
              <p className={styles.note}>Solo io · Classificare un documento non lo condivide e non crea schede o spese.</p>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ Area di lavoro unica
  const count = (f: WorkFilter) => items.filter(i => matchesWorkFilter(i, f)).length;
  const reading = items.some(i => i.analysisState === 'queued' || i.analysisState === 'running');
  const complete = items.length > 0 && items.every(i => workGroup(i) === 'done');
  const multi = items.length > 1;
  const doneCount = count('done');
  const bulkOps = ops.filter(o => o.payload.mode === 'multiple');
  const showBulk = !props.renderCompilationActions && multi && canReview && !complete && (available.length > 0 || selected.length > 0 || bulkOps.length > 0);
  const bulkPayload = selected.length ? buildOrganizePayload(batch, 'multiple', selected.flatMap(i => { const b = bulkItem(i); return b ? [b] : []; })) : null;

  const row = (item: IntakeItem) => {
    const raw = itemStatus(item);
    const write = writeOf(item.id);
    const group = workGroup(item);
    const copy = item.uploadState === 'duplicate';
    const conflict = hasConflict(item);
    const decision = item.selection?.action === 'organize' ? item.selection : null;
    const manual = !copy && !item.proposal && !decision && ['stored', 'ready', 'unreadable', 'unsupported', 'analysis_failed'].includes(raw);
    const canSelect = !props.renderCompilationActions && multi && selectable(item);
    const checked = canSelect && picked[item.id] === item.version;
    const name = displayName(item);
    const title = rowTitle(item);
    let badge: ReactNode;
    if (write.status === 'uncertain' || write.status === 'recovering') badge = <Badge tone="warn">Esito non noto</Badge>;
    else if (group === 'done') badge = <Badge tone="ok">{decision ? `In ${selectionCollections(decision).map(collectionLabel).join(' e ')}` : 'Mantenuto invariato'}</Badge>;
    else if (group === 'later') badge = <Badge tone="warn">Da riprendere</Badge>;
    else if (['unavailable', 'pending', 'uploading', 'upload_failed', 'analysis_waiting', 'analysis_running'].includes(raw)) badge = <StatusBadge status={raw} />;
    else if (copy) badge = <Badge tone="warn">File già presente</Badge>;
    else if (conflict) badge = <Badge tone="warn">Dati diversi</Badge>;
    else if (manual) badge = <Badge tone="warn">Tipo da indicare</Badge>;
    else badge = <StatusBadge status={raw} />;
    const proposal = group === 'review' && !copy && !conflict && raw !== 'unavailable' ? item.proposal : null;
    const actionLabel = group === 'later' ? 'Riprendi' : manual ? 'Indica il tipo' : 'Rivedi';
    return (
      <article key={item.id} className={cx(styles.row, checked && styles.rowSelected)}>
        <span className={styles.rowCheck}>
          {canSelect && <input type="checkbox" checked={checked} aria-label={`Seleziona ${title}`}
            onChange={(e) => { const on = e.target.checked; setPicked(prev => { const next = { ...prev }; if (on) next[item.id] = item.version; else delete next[item.id]; return next; }); }} />}
        </span>
        <div className={styles.rowMain}>
          <h3>{title}</h3>
          {raw !== 'unavailable' && (
            <p>{title !== name ? `${name} · ` : ''}{item.byteSize !== null ? formatBytes(item.byteSize) : ''}{item.pageCount ? ` · ${item.pageCount} ${item.pageCount === 1 ? 'pagina' : 'pagine'}` : ''} · Solo io</p>
          )}
          <p>{badge}</p>
          {proposal && (
            <>
              <p>Tipo: <strong>{proposal.parts.map(partLabel).join(' + ')}</strong></p>
              <p>Destinazione: <strong>{[...new Set(proposal.parts.map(p => collectionLabel(kindCollection(p.kind))))].join(' + ')}</strong>{item.analysisState === 'needs_choice' ? ' · scheda da scegliere' : ' · Solo alla casa'}</p>
              {proposal.parts.some(p => p.kind === 'receipt' || p.kind === 'invoice') && <p>{props.renderObjectProposals?'':'Archivi soltanto la ricevuta: non viene creata una spesa.'}</p>}
            </>
          )}
          {group === 'done' && decision && <p>{decision.parts.map(partLabel).join(' + ')} · {decision.target.kind === 'home' ? 'solo casa' : 'scheda esistente'}</p>}
          {group === 'review' && copy && raw !== 'unavailable' && <p>{item.duplicate?.document ? `Stesso contenuto di «${item.duplicate.document.name}». ` : ''}Apri il documento per scegliere quali dati mantenere.</p>}
          {group === 'review' && conflict && !copy && <p>La proposta è diversa dai dati già confermati: apri il documento per scegliere.</p>}
          {group === 'review' && manual && raw !== 'unavailable' && <p>{props.renderCompilationActions?'La lettura locale non trova testo utilizzabile. Puoi compilare manualmente o tramite AI.':item.mimeType?.startsWith('image/') ? 'La lettura locale non interpreta la foto. Puoi indicare il tipo oppure riconoscere gli oggetti presenti.' : raw === 'unreadable' || raw === 'unsupported' ? 'Il testo non è leggibile: indica il tipo consultando l’originale.' : 'Nessuna proposta: indica il tipo consultando l’originale.'}</p>}
          {raw === 'unavailable' && <p>Il documento non è più accessibile con questo account.</p>}
          {item.error && raw === 'upload_failed' && <p role="status">{item.error.message}</p>}
          {write.status === 'rejected' && <p className={styles.formError}>Non applicato: {write.message}</p>}
          {uploadMessages[item.id] && <p role="alert">{uploadMessages[item.id]}</p>}
        </div>
        <div className={styles.rowActions}>
          {item.canRemove&&props.onRemoveItem&&canUpload&&<button type="button" className={ui.btn} disabled={props.addingFiles} aria-label={'Rimuovi '+name} onClick={()=>setRemoval(item.id)}>Rimuovi</button>}
          {removal===item.id&&<div role="group" aria-label={'Conferma rimozione '+name}><p>{copy?'Rimuovere questa copia dal caricamento? Il documento già presente sarà conservato.':'Rimuovere il documento caricato per errore? L’originale sarà eliminato e non verrà analizzato.'}</p><button type="button" className={ui.btn} onClick={()=>setRemoval(null)}>Mantieni</button><button type="button" className={ui.btn} onClick={()=>{setRemoval(null);void uploadAction(item.id,props.onRemoveItem!);}}>Conferma rimozione</button></div>}
          {raw === 'upload_failed' && canUpload && <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void uploadAction(item.id, props.onRetryUpload)}>Riprova questo file</button>}
          {(raw === 'pending' || raw === 'uploading') && canUpload && <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void uploadAction(item.id, props.onCancelUpload)}>Annulla</button>}
          {canReview && item.documentLink.state==='linked' && props.renderCompilationActions && (houseDocumentKind(item)?<button type="button" className={ui.btn} onClick={()=>reviewDocument(item)}>Rivedi documento della casa</button>:props.renderCompilationActions(item.id))}
          {!props.renderCompilationActions && canReview && item.documentLink.state==='linked' && props.onOpenReceiptFlow && supportsObjectProposals(item) && !(props.renderObjectProposals&&(copy||conflict)) && <button type="button" className={cx(ui.btn,ui.small)} disabled={props.addingFiles} aria-label={props.renderObjectProposals?`Rivedi proposta per ${name}`:`Riconosci gli oggetti in ${name}`} onClick={()=>props.onOpenReceiptFlow?.(item.id)}>{props.renderObjectProposals?'Rivedi proposta':'Riconosci gli oggetti'}</button>}
          {group !== 'done' && reviewable(item) && !(props.renderCompilationActions&&manual) && !(props.renderCompilationActions&&houseDocumentKind(item)) && !(props.renderObjectProposals&&props.onOpenReceiptFlow&&supportsObjectProposals(item)&&!copy&&!conflict) && (
            <button type="button" className={cx(ui.btn, ui.small, ui.primary)} aria-label={`${actionLabel} ${name}`} onClick={() => setDialog({ itemId: item.id, onlyOriginal: false })}>{actionLabel}</button>
          )}
          {group === 'done' && raw !== 'unavailable' && (canReview && item.permissions.review && props.onReorganizeDocument
            ? <button type="button" className={cx(ui.btn, ui.small)} aria-label={`Modifica ${name}`} disabled={props.addingFiles} onClick={() => void props.onReorganizeDocument?.(item.id)}>Modifica</button>
            : <button type="button" className={cx(ui.btn, ui.small)} aria-label={`Vedi originale ${name}`} onClick={() => setDialog({ itemId: item.id, onlyOriginal: true })}>Vedi originale</button>)}
        </div>
      {canReview&&(props.renderCompilationActions||supportsObjectProposals(item))&&props.objectProposalItemId===item.id&&props.renderObjectProposals&&<section className={styles.objectProposals} aria-label={'Proposte oggetti e spesa per '+name}>{houseDocumentKind(item)?<><h3>Documento della casa</h3><p>Riguarda l’immobile: nessun oggetto o spesa da creare.</p><button type="button" className={ui.btn} onClick={()=>reviewDocument(item)}>Rivedi titolo e tipo</button></>:props.renderObjectProposals(item.id,()=>setDialog({itemId:item.id,onlyOriginal:false}))}</section>}
      </article>
    );
  };

  if(props.focused){const item=items.find(i=>i.id===props.objectProposalItemId);return <div className={styles.stack}>{notice&&<p role="status">{notice.text}</p>}{item?(houseDocumentKind(item)&&!props.focusedAi?<section className={ui.card}><h3>Documento della casa</h3><p>Nessun oggetto o spesa da creare.</p><button type="button" className={ui.btn} onClick={()=>reviewDocument(item)}>Rivedi titolo e tipo</button></section>:props.renderObjectProposals?.(item.id,()=>reviewDocument(item))):<Loading label="Apertura della scheda…"/>}{reviewDialog}</div>;}
  return (
    <div className={cx(styles.stack, showBulk && styles.withBar)}>
      <p className={styles.crumb}>Documenti / Carica documenti</p>
      <div className={styles.pageHead}>
        <div>
          {heading(reading ? 'Stiamo preparando le proposte…' : complete ? (props.renderObjectProposals&&props.batch?.items.some(supportsObjectProposals)?'Documenti archiviati.':'Hai finito questo caricamento.') : 'Controlla e organizza.',
            reading ? 'Lettura locale dei PDF con testo: nessun file viene inviato all’esterno. Puoi già iniziare dai documenti pronti.'
              : complete ? `${doneCount} ${doneCount === 1 ? 'documento completato' : 'documenti completati'}. Gli originali restano privati.`
                : props.renderCompilationActions ? 'Apri un documento, scegli come compilare la scheda e conferma i dati.' : multi ? 'Controlla le proposte qui sotto, seleziona quelle corrette e organizzale con una sola conferma.'
                  : 'Apri la proposta e conferma: il documento sarà subito organizzato.')}
        </div>
        {props.renderOutcomeLinks && <div className={styles.headActions}>{props.renderOutcomeLinks(results)}</div>}
      </div>
      {!canReview && <Banner><p>Con il tuo ruolo puoi consultare i documenti caricati, ma non organizzarli.</p></Banner>}
      {canReview && !props.onOrganize && <Banner tone="warning"><p>{ORGANIZE_UNAVAILABLE}</p></Banner>}
      <div role="status" aria-live="polite">
        {notice && (
          <Banner tone={notice.tone === 'success' ? 'info' : 'warning'}>
            <p>{notice.text}</p>
            {notice.failures.length > 0 && <ul className={styles.failures}>{notice.failures.map(f => <li key={f.id}><strong>{f.name}</strong>: {f.message}</li>)}</ul>}
          </Banner>
        )}
      </div>
      {bulkOps.map(op => <OrganizeStatus key={op.key} op={op} canRecover={!!props.onRecoverOrganization} onRecover={() => void runOrganize(op.payload, true)} onResend={() => void runOrganize(op.payload)} />)}
      {multi && !complete && canReview && <p className={styles.note}>Le caselle compaiono solo sulle proposte pronte da organizzare insieme. Per copie, dati diversi o documenti rimandati, usa «Rivedi» o «Riprendi».</p>}
      <div className={styles.toolbar} role="group" aria-label="Stato dei documenti">
        {FILTERS.map(([f, label]) => (
          <button key={f} type="button" className={styles.filter} aria-pressed={filter === f} onClick={() => { setFilter(f); setPicked({}); }}>
            {label} · {count(f)}
          </button>
        ))}
      </div>
      {showBulk && (
        <div className={styles.bulkTools}>
          <p className={styles.note}>Copie, dati diversi e tipi da indicare si rivedono singolarmente.</p>
          {available.length > 0 && selected.length < available.length && (
            <button type="button" className={styles.linkButton} onClick={() => setPicked(prev => ({ ...prev, ...Object.fromEntries(available.map(i => [i.id, i.version])) }))}>
              {available.length === 1 ? 'Seleziona la proposta disponibile' : `Seleziona le ${available.length} proposte disponibili`}
            </button>
          )}
          {selected.length > 0 && <button type="button" className={styles.linkButton} onClick={() => setPicked({})}>Annulla selezione</button>}
        </div>
      )}
      <div className={styles.layout}>
        <section className={ui.card} aria-label="Documenti caricati">
          {visible.length ? <div className={styles.rows}>{visible.map(row)}</div> : <p>Nessun documento in questo filtro.</p>}
          {canUpload && (
            <div className={styles.addBox}>
              <button type="button" className={ui.btn} disabled={props.addingFiles} onClick={() => setView('ingresso')}>+ Aggiungi documenti</button>
              <p className={styles.note}>Resti qui: documenti e risultati già presenti vengono mantenuti.</p>
            </div>
          )}
        </section>
        <aside className={styles.aside}>
          <section className={ui.card}>
            <h2>Questo caricamento</h2>
            <div className={styles.stat}>{doneCount}<span className={styles.note}> / {items.length}</span></div>
            <p className={styles.note}>Documenti completati</p>
            <div className={styles.summaryLine}><span>Da rivedere</span><strong>{count('review')}</strong></div>
            <div className={styles.summaryLine}><span>Più tardi</span><strong>{count('later')}</strong></div>
            <p className={styles.note}>{props.renderCompilationActions?'Apri ogni documento e scegli come compilare la scheda.':'Le caselle servono a scegliere cosa organizzare. I documenti cambiano solo quando confermi.'}</p>
          </section>
        </aside>
      </div>
      {showBulk && (
        <div className={styles.bulkBar} role="region" aria-label="Documenti selezionati">
          <div>
            <strong>{selected.length} {selected.length === 1 ? 'documento selezionato' : 'documenti selezionati'}</strong>
            <p className={styles.note}>{selected.length ? 'La conferma li organizza subito. Gli altri restano da rivedere.' : 'Seleziona nell’elenco le proposte che vuoi organizzare.'}</p>
          </div>
          <button type="button" className={cx(ui.btn, ui.primary)} disabled={!bulkPayload || bulkOps.length > 0}
            onClick={() => { if (bulkPayload) void runOrganize(bulkPayload); }}>
            {selected.length ? `Organizza ${selected.length} ${selected.length === 1 ? 'documento selezionato' : 'documenti selezionati'}` : 'Organizza selezionati'}
          </button>
        </div>
      )}
      {reviewDialog}
    </div>
  );
}

function OrganizeStatus(props: { op: OrganizeOp; canRecover: boolean; onRecover: () => void; onResend: () => void }) {
  const { op } = props;
  const n = op.payload.items.length;
  const what = `${n} ${n === 1 ? 'documento' : 'documenti'}`;
  if (op.status === 'submitting') return <p role="status" className={styles.note}>Organizzazione di {what} in corso…</p>;
  if (op.status === 'not_found') {
    return (
      <Banner tone="warning" role="alert" title="Richiesta non registrata"
        actions={<button type="button" className={ui.btn} onClick={props.onResend}>Invia di nuovo la stessa richiesta</button>}>
        <p>Il servizio non ha registrato l’organizzazione di {what}. Puoi inviarla di nuovo con le stesse scelte.</p>
      </Banner>
    );
  }
  return (
    <Banner tone="warning" role="alert" title="Esito non confermato"
      actions={props.canRecover && <button type="button" className={ui.btn} disabled={op.status === 'recovering'} onClick={props.onRecover}>{op.status === 'recovering' ? 'Verifica in corso…' : 'Verifica l’esito'}</button>}>
      <p>{op.status === 'uncertain' ? op.message : 'Verifica in corso.'} I documenti coinvolti ({what}) restano bloccati e la richiesta non viene inviata di nuovo automaticamente.{props.canRecover ? '' : ' Ricarica la pagina per vedere lo stato reale.'}</p>
    </Banner>
  );
}
