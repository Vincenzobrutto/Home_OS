import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Field, cx, ui } from '../components/ui';
import {
  COLLECTIONS, KINDS, KIND_LABEL, MAX_PARTS, TITLE_MAX, collectionLabel, consentSignature, displayName, draftParts, formatCents,
  hasReplaceConsent, kindCollection, partLabel, replacesConfirmed, validateReviewDraft, visibleItem,
  type CandidatePage, type ClassificationPart, type DocumentKind, type IntakeItem, type ReviewDraft, type ReviewErrors,
} from './model';
import styles from './intake.module.css';

export type ReviewWriteState =
  | { status: 'idle' } | { status: 'saving' } | { status: 'rejected'; message: string }
  | { status: 'uncertain'; message: string; reloadOnly?: { version: IntakeItem['version'] } } | { status: 'recovering' } | { status: 'not_found' };

/** Contenitore modale: Esc sul documento, Tab confinato, focus iniziale e restituzione al controllo di partenza. */
export function Modal(props: { labelledBy: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onClose = useRef(props.onClose);
  useEffect(() => { onClose.current = props.onClose; });
  useEffect(() => {
    const returnTo = document.activeElement;
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const focusables = () => [...(ref.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter(e => !e.hasAttribute('disabled'));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose.current(); return; }
      if (e.key !== 'Tab') return;
      const list = focusables(); if (!list.length) return;
      const first = list[0]!, last = list[list.length - 1]!;
      if (!ref.current?.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (returnTo instanceof HTMLElement) returnTo.focus(); };
  }, []);
  return (
    <div className={styles.backdrop}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={props.labelledBy} className={styles.dialog}>{props.children}</div>
    </div>
  );
}

type Props = {
  item: IntakeItem;
  draft: ReviewDraft;
  candidates: CandidatePage | undefined;
  write: ReviewWriteState;
  onlyOriginal?: boolean;
  preview: (page: number | null) => ReactNode;
  openState: { status: 'idle' | 'opening' } | { status: 'error'; message: string };
  onOpenOriginal: (page: number | null) => void;
  onDraft: (draft: ReviewDraft) => void;
  onLoadCandidates: (more: boolean) => void;
  onSave: () => void;
  onDefer: () => void;
  onResolveDuplicate: () => void;
  onRecover: () => void;
  onOpenReceiptFlow?: () => void;
  onClose: () => void;
};

const pageValue = (v: string): number | null => (v.trim() === '' ? null : Number(v));

/** Contenuti inseriti dall'utente: più parti, ciascuna con tipo e intervallo facoltativo. */
function ManualParts(props: { parts: ClassificationPart[]; pageCount: number | null; disabled: boolean; onChange: (parts: ClassificationPart[]) => void }) {
  const id = useId();
  const set = (i: number, patch: Partial<ClassificationPart>) => props.onChange(props.parts.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  // Da tastiera il focus segue l'azione: sul contenuto aggiunto, oppure sul contenuto vicino (o su «Aggiungi») dopo una rimozione.
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (focusNext.current) { document.getElementById(focusNext.current)?.focus(); focusNext.current = null; }
  }, [props.parts.length]);
  const remove = (i: number) => {
    const rest = props.parts.filter((_, j) => j !== i);
    focusNext.current = rest.length ? `${id}-k${Math.min(i, rest.length - 1)}` : `${id}-add`;
    props.onChange(rest);
  };
  const add = () => { focusNext.current = `${id}-k${props.parts.length}`; props.onChange([...props.parts, { kind: 'other', pageFrom: null, pageTo: null }]); };
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Contenuti del documento</legend>
      {props.parts.map((p, i) => (
        <div key={i} className={styles.partRow}>
          <div className={styles.partKind}>
            <label htmlFor={`${id}-k${i}`} className={styles.hint}>Tipo del contenuto {i + 1}</label>
            <select id={`${id}-k${i}`} className={styles.select} value={p.kind} disabled={props.disabled} onChange={(e) => set(i, { kind: e.target.value as DocumentKind })}>
              {COLLECTIONS.map(c => (
                <optgroup key={c.id} label={c.label}>
                  {KINDS.filter(k => kindCollection(k) === c.id).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className={styles.partPages}>
            <label className={styles.hint}>Da pagina
              <input className={styles.select} type="number" min={1} max={props.pageCount ?? undefined} inputMode="numeric" value={p.pageFrom ?? ''} disabled={props.disabled}
                aria-label={`Contenuto ${i + 1}: da pagina`} onChange={(e) => set(i, { pageFrom: pageValue(e.target.value) })} />
            </label>
            <label className={styles.hint}>A pagina
              <input className={styles.select} type="number" min={1} max={props.pageCount ?? undefined} inputMode="numeric" value={p.pageTo ?? ''} disabled={props.disabled}
                aria-label={`Contenuto ${i + 1}: a pagina`} onChange={(e) => set(i, { pageTo: pageValue(e.target.value) })} />
            </label>
          </div>
          <button type="button" className={styles.linkButton} disabled={props.disabled} onClick={() => remove(i)}>
            Rimuovi il contenuto {i + 1}
          </button>
        </div>
      ))}
      {props.parts.length < MAX_PARTS && (
        <button type="button" id={`${id}-add`} className={cx(ui.btn, ui.small)} disabled={props.disabled} onClick={add}>
          Aggiungi un contenuto
        </button>
      )}
      <p className={styles.note}>Senza pagine il contenuto riguarda l’intero documento. Tipo e pagine sono indicati da te: nessuna fonte viene attribuita al documento.</p>
    </fieldset>
  );
}

/** Revisione di un singolo file. Salvare registra solo una decisione: nessuna scheda, costo o organizzazione applicati. */
export function ReviewDialog(props: Props) {
  const item = visibleItem(props.item);
  const titleId = useId(), group = useId();
  const [showErrors, setShowErrors] = useState(false);
  const [page, setPage] = useState<number | null>(item.proposal?.sources[0]?.page ?? null);
  const { draft } = props;
  const locked = props.write.status === 'saving' || props.write.status === 'uncertain' || props.write.status === 'recovering';
  const errors: ReviewErrors = showErrors ? validateReviewDraft(draft, item) : {};
  const set = (patch: Partial<ReviewDraft>) => props.onDraft({ ...draft, ...patch });
  const isDuplicate = item.uploadState === 'duplicate';
  const organizing = !isDuplicate || draft.duplicateMode === 'organize';
  const manual = draft.manualParts !== null;
  const isReceipt = item.proposal?.parts.some(p => p.kind === 'receipt' || p.kind === 'invoice') ?? false;
  const opening = props.openState.status === 'opening';
  const org = item.confirmedOrganization;
  const replacing = organizing && replacesConfirmed(draft, item);
  const save = () => {
    setShowErrors(true);
    if (Object.keys(validateReviewDraft(draft, item)).length) { document.getElementById(`${group}-err`)?.focus(); return; }
    if (isDuplicate && draft.duplicateMode === 'reuse') props.onResolveDuplicate(); else props.onSave();
  };
  const sources = item.proposal?.sources ?? [];
  const candidates = props.candidates;
  const firstError = errors.duplicate ?? errors.parts ?? errors.target ?? errors.replace ?? '';

  return (
    <Modal labelledBy={titleId} onClose={props.onClose}>
      <div className={styles.dialogHead}>
        <div>
          <p className={styles.crumb}>{props.onlyOriginal ? 'Originale' : 'Rivedi il documento'}</p>
          <h2 id={titleId}>{item.proposal?.title ?? org?.title ?? displayName(item)}</h2>
          <p className={styles.note}>{displayName(item)}{item.pageCount ? ` · ${item.pageCount} ${item.pageCount === 1 ? 'pagina' : 'pagine'}` : ''}</p>
        </div>
        <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onClose} data-autofocus>Chiudi</button>
      </div>
      <div className={styles.dialogBody}>
        <section aria-label="Documento originale">
          <h3>Documento originale</h3>
          {props.preview(page)}
          {sources.length > 0 ? (
            <>
              {sources.map((s, i) => (
                <div key={i}>
                  <button type="button" className={styles.linkButton} aria-pressed={page === s.page} onClick={() => setPage(s.page)}>Fonte · pagina {s.page}</button>
                  <p className={styles.excerpt}>{s.excerpt}</p>
                </div>
              ))}
              <p className={styles.note}>L’estratto documenta la proposta. Nomi e scelte inseriti da te non vengono attribuiti al documento.</p>
            </>
          ) : (
            <p className={styles.note}>{item.analysisState === 'unreadable' || item.analysisState === 'unsupported' ? 'Originale consultabile: nessun testo estratto e nessun dato ricostruito.' : 'Nessuna fonte proposta per questo file.'}</p>
          )}
          <button type="button" className={ui.btn} aria-disabled={opening || undefined} onClick={() => { if (!opening) props.onOpenOriginal(page); }}>
            {opening ? 'Apertura…' : 'Apri l’originale'}
          </button>
          {props.openState.status === 'error' && <p className={styles.formError} role="alert">{props.openState.message}</p>}
        </section>

        <section aria-label="Decisione">
          {props.onlyOriginal ? (
            <p>{item.selection?.action === 'organize' ? `Organizzazione salvata: ${item.selection.title}` : 'Nessuna organizzazione salvata.'}</p>
          ) : (
            <>
              {isDuplicate && (
                <fieldset className={styles.fieldset}>
                  <legend className={styles.legend}>Lo stesso contenuto è già presente</legend>
                  <p>{item.duplicate?.document ? `«${item.duplicate.document.name}» ha gli stessi byte di questo file.` : 'Un altro file del lotto ha gli stessi byte di questo file.'}</p>
                  <label className={styles.choice}>
                    <input type="radio" name={`${group}-d`} checked={draft.duplicateMode === 'reuse'} disabled={locked} onChange={() => set({ duplicateMode: 'reuse' })} />
                    <span><strong>Usa solo il riferimento all’originale esistente</strong><span className={styles.hint}>Nessuna seconda copia, nessuna eliminazione. L’organizzazione del documento esistente non cambia.</span></span>
                  </label>
                  <label className={styles.choice}>
                    <input type="radio" name={`${group}-d`} checked={draft.duplicateMode === 'organize'} disabled={locked} onChange={() => set({ duplicateMode: 'organize' })} />
                    <span><strong>Organizza il documento esistente</strong><span className={styles.hint}>Scegli nome e contenuti del documento già archiviato. Nessun nuovo originale, scheda o costo.</span></span>
                  </label>
                </fieldset>
              )}
              {organizing && (
                <>
                  <h3>{manual ? 'Organizza manualmente' : 'La proposta da controllare'}</h3>
                  {item.selectionStale && <p className={styles.formError}>Il documento o la scheda sono cambiati dopo la tua scelta: rivedila prima di salvarla di nuovo.</p>}
                  <Field label="Nome da mostrare" name="title" value={draft.title} maxLength={TITLE_MAX * 2} disabled={locked} error={errors.title}
                    hint={`Massimo ${TITLE_MAX} caratteri. Vale solo per te: non rinomina il file per altri.`} onChange={(e) => set({ title: e.target.value })} />

                  {!manual && item.proposal && (
                    <fieldset className={styles.fieldset}>
                      <legend className={styles.legend}>{item.proposal.parts.length > 1 ? 'Contenuti nello stesso originale' : 'Tipo di documento'}</legend>
                      {item.proposal.parts.map((p, i) => (
                        <label key={i} className={styles.check}>
                          <input type="checkbox" checked={draft.partIndexes.includes(i)} disabled={locked}
                            onChange={(e) => set({ partIndexes: e.target.checked ? [...draft.partIndexes, i] : draft.partIndexes.filter(x => x !== i) })} />
                          <span>{partLabel(p)}<span className={styles.hint}>Raccolta: {collectionLabel(kindCollection(p.kind))}</span></span>
                        </label>
                      ))}
                      {item.proposal.parts.length > 1 && <p className={styles.note}>Le pagine restano riferimenti nello stesso PDF: nessuna copia o divisione del file. Non deduciamo esito o regolarità della pratica.</p>}
                    </fieldset>
                  )}
                  {manual && (
                    <ManualParts parts={draft.manualParts ?? []} pageCount={item.pageCount} disabled={locked} onChange={(parts) => set({ manualParts: parts })} />
                  )}
                  {item.proposal && (
                    <button type="button" className={styles.linkButton} disabled={locked}
                      onClick={() => set(manual ? { manualParts: null } : { manualParts: draftParts(draft, item).map(p => ({ ...p })) })}>
                      {manual ? 'Torna alla proposta' : 'Indica tu i contenuti'}
                    </button>
                  )}

                  {org && (
                    <div className={styles.conflict}>
                      <strong>Organizzazione già confermata</strong>
                      <p className={styles.note}>{org.title} · {org.parts.map(partLabel).join(' + ')}</p>
                      {replacing ? (
                        <>
                          <p className={styles.note}>La tua scelta è diversa: {draft.title.trim() || '—'} · {draftParts(draft, item).map(partLabel).join(' + ') || '—'}. Nulla viene sostituito senza il tuo consenso.</p>
                          <label className={styles.check}>
                            <input type="checkbox" checked={hasReplaceConsent(draft, item)} disabled={locked}
                              onChange={(e) => set({ replaceConsent: e.target.checked ? consentSignature(draft, item) : null })} />
                            <span>Sostituisci l’organizzazione confermata con questa scelta</span>
                          </label>
                          <button type="button" className={styles.linkButton} disabled={locked}
                            onClick={() => set({ title: org.title, manualParts: org.parts.map(p => ({ ...p })), partIndexes: [], replaceConsent: null })}>
                            Mantieni l’organizzazione confermata
                          </button>
                        </>
                      ) : (
                        <p className={styles.note}>La tua scelta coincide: nessuna sostituzione.</p>
                      )}
                    </div>
                  )}

                  <fieldset className={styles.fieldset}>
                    <legend className={styles.legend}>Dove va collegato?</legend>
                    {item.analysisState === 'needs_choice' && <p className={styles.note}>Non ci sono elementi sufficienti per scegliere una scheda: decidi tu.</p>}
                    <label className={styles.choice}>
                      <input type="radio" name={`${group}-t`} checked={draft.target?.kind === 'home'} disabled={locked} onChange={() => set({ target: { kind: 'home' } })} />
                      <span><strong>Solo alla casa</strong><span className={styles.hint}>Nessun oggetto o costo necessario.</span></span>
                    </label>
                    {candidates?.items.map(c => (
                      <label key={`${c.kind}:${c.id}`} className={styles.choice}>
                        <input type="radio" name={`${group}-t`} checked={draft.target?.kind === c.kind && draft.target.id === c.id} disabled={locked} onChange={() => set({ target: { kind: c.kind, id: c.id } })} />
                        <span><strong>{c.name}{c.roomName ? ` · ${c.roomName}` : ''}</strong><span className={styles.hint}>{c.kind === 'boiler' ? 'Scheda caldaia esistente' : 'Oggetto esistente'}: collegala solo se è proprio questa.</span></span>
                      </label>
                    ))}
                    {candidates?.status === 'error' && <p className={styles.formError} role="alert">Schede non caricate. <button type="button" className={styles.linkButton} onClick={() => props.onLoadCandidates(false)}>Riprova</button></p>}
                    {!candidates ? (
                      <button type="button" className={cx(ui.btn, ui.small)} onClick={() => props.onLoadCandidates(false)} disabled={locked}>Mostra le schede esistenti</button>
                    ) : candidates.hasMore ? (
                      <button type="button" className={cx(ui.btn, ui.small)} onClick={() => props.onLoadCandidates(true)} disabled={candidates.status === 'loading' || locked}>{candidates.status === 'loading' ? 'Caricamento…' : 'Mostra altre schede'}</button>
                    ) : null}
                    <p className={styles.note}>Nessuna nuova scheda viene creata da questa scelta.</p>
                  </fieldset>

                  {isReceipt && (
                    <div className={styles.fieldset}>
                      {item.existingLinks && (item.existingLinks.objects.length > 0 || item.existingLinks.expenses.length > 0) && (
                        <p>
                          Già collegata a {item.existingLinks.objects.map(o => `${o.name}${o.roomName ? ` · ${o.roomName}` : ''}`).join(', ') || 'nessun oggetto'}
                          {item.existingLinks.expenses.length > 0 && ` e alla spesa ${item.existingLinks.expenses.map(e => formatCents(e.amountCents)).join(', ')}`}. Nessuna nuova registrazione.
                        </p>
                      )}
                      <p className={styles.note}>Classificare la ricevuta non crea oggetti né spese. Per registrare l’acquisto usa il percorso dedicato.</p>
                      {props.onOpenReceiptFlow && <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onOpenReceiptFlow}>Apri nella ricevuta assistita</button>}
                    </div>
                  )}
                </>
              )}
              <p id={`${group}-err`} tabIndex={-1} className={styles.formError} role={firstError ? 'alert' : undefined}>{firstError}</p>
            </>
          )}
          <WriteStatus state={props.write} onRecover={props.onRecover} />
        </section>
      </div>
      <div className={styles.dialogFoot}>
        <button type="button" className={ui.btn} onClick={props.onClose}>Chiudi senza modificare</button>
        {!props.onlyOriginal && item.permissions.review && (
          <div className={styles.actionGroup}>
            <button type="button" className={styles.linkButton} onClick={props.onDefer} disabled={locked}>Decidi più avanti</button>
            <button type="button" className={cx(ui.btn, ui.primary)} disabled={locked} onClick={save}>
              {props.write.status === 'saving' ? 'Salvataggio…' : isDuplicate && draft.duplicateMode === 'reuse' ? 'Usa l’originale esistente' : 'Usa questa organizzazione'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function WriteStatus(props: { state: ReviewWriteState; onRecover: () => void }) {
  const s = props.state;
  if (s.status === 'rejected') return <p className={styles.formError} role="alert">{s.message} La tua scelta è ancora qui.</p>;
  if (s.status === 'uncertain' || s.status === 'recovering') {
    return (
      <div className={styles.conflict} role="alert">
        <strong>Esito non confermato</strong>
        <p className={styles.note}>{s.status === 'uncertain' ? s.message : 'Verifica in corso.'} La scelta non viene inviata di nuovo automaticamente.</p>
        {!(s.status === 'uncertain' && s.reloadOnly) && <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onRecover} disabled={s.status === 'recovering'}>{s.status === 'recovering' ? 'Verifica…' : 'Verifica l’esito'}</button>}
      </div>
    );
  }
  if (s.status === 'not_found') return <p className={styles.formError} role="alert">La scelta non risulta salvata: puoi salvarla di nuovo.</p>;
  return null;
}
