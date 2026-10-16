import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Field, cx, ui } from '../components/ui';
import {
  COLLECTIONS, KINDS, KIND_LABEL, MAX_PARTS, TITLE_MAX, chooseKeep, chooseUpdate, collectionLabel, consentSignature, displayName, draftParts,
  formatCents, hasConflict, hasReplaceConsent, kindCollection, needsKeepOrUpdate, partLabel, replacesConfirmed, validateReviewDraft, visibleItem,
  type CandidatePage, type ClassificationPart, type DocumentKind, type IntakeItem, type ReviewDraft, type ReviewErrors,
} from './model';
import styles from './intake.module.css';

export type ReviewWriteState =
  | { status: 'idle' } | { status: 'saving' } | { status: 'rejected'; message: string }
  | { status: 'uncertain'; message: string; reloadOnly?: { version: IntakeItem['version'] } } | { status: 'recovering' }
  | { status: 'not_found'; resend?: boolean };

/** Contenitore modale: Esc sul documento, Tab confinato, focus iniziale e restituzione al controllo di partenza. */
export function Modal(props: { labelledBy: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onClose = useRef(props.onClose);
  useEffect(() => { onClose.current = props.onClose; });
  useEffect(() => {
    const returnTo = document.activeElement;
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const focusables = () => [...(ref.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])') ?? [])].filter(e => !e.hasAttribute('disabled') && !e.closest('details:not([open]) > :not(summary)'));
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
  /** Bozza diversa dallo stato di partenza: chiudere chiede di scartare le modifiche. */
  dirty?: boolean;
  /** `onOrganize` fornito dal container: senza, «Conferma e organizza» resta disabilitato con il motivo. */
  organizeAvailable?: boolean;
  unavailableReason?: string;
  preview: (page: number | null) => ReactNode;
  openState: { status: 'idle' | 'opening' } | { status: 'error'; message: string };
  onOpenOriginal: (page: number | null) => void;
  onDraft: (draft: ReviewDraft) => void;
  onLoadCandidates: (more: boolean) => void;
  /** Conferma e organizza (applicazione diretta, singolo). */
  onSave: () => void;
  onDefer: () => void;
  /** Copia o conflitto: mantieni invariato, senza riscrivere organizzazione o collegamenti. */
  onResolveDuplicate: () => void;
  onRecover: () => void;
  onResend?: () => void;
  onOpenReceiptFlow?: () => void;
  onClose: () => void;
};

const pageValue = (v: string): number | null => (v.trim() === '' ? null : Number(v));

function KindOptions() {
  return COLLECTIONS.map(c => (
    <optgroup key={c.id} label={c.label}>
      {KINDS.filter(k => kindCollection(k) === c.id).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
    </optgroup>
  ));
}

/** Contenuti inseriti dall'utente: un tipo (nessuno preselezionato) o più parti con intervallo facoltativo. */
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
    focusNext.current = rest.length ? `${id}-k${Math.min(i, rest.length - 1)}` : `${id}-k0`;
    props.onChange(rest);
  };
  const add = () => { focusNext.current = `${id}-k${props.parts.length}`; props.onChange([...props.parts, { kind: 'other', pageFrom: null, pageTo: null }]); };
  const single = props.parts.length <= 1;
  if (props.parts.length === 0) {
    // Nessun tipo preselezionato: «Altro» è una classificazione, non un valore di comodo.
    return (
      <div className={styles.partKind}>
        <label htmlFor={`${id}-k0`} className={styles.legend}>Tipo di documento</label>
        <select id={`${id}-k0`} className={styles.select} value="" disabled={props.disabled}
          onChange={(e) => { if (e.target.value) props.onChange([{ kind: e.target.value as DocumentKind, pageFrom: null, pageTo: null }]); }}>
          <option value="">Scegli il tipo…</option>
          <KindOptions />
        </select>
      </div>
    );
  }
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{single ? 'Tipo di documento' : 'Contenuti del documento'}</legend>
      {props.parts.map((p, i) => (
        <div key={i} className={cx(styles.partRow, single && styles.partRowSingle)}>
          <div className={styles.partKind}>
            <label htmlFor={`${id}-k${i}`} className={single ? 'visually-hidden' : styles.hint}>{single ? 'Tipo di documento' : `Tipo del contenuto ${i + 1}`}</label>
            <select id={`${id}-k${i}`} className={styles.select} value={p.kind} disabled={props.disabled} onChange={(e) => set(i, { kind: e.target.value as DocumentKind })}>
              <KindOptions />
            </select>
          </div>
          <details className={styles.partPageOptions} open={p.pageFrom !== null || p.pageTo !== null || undefined}>
            <summary>Pagine (facoltative)</summary>
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
          </details>
          {!single && (
            <button type="button" className={styles.linkButton} disabled={props.disabled} onClick={() => remove(i)}>Rimuovi il contenuto {i + 1}</button>
          )}
        </div>
      ))}
      {props.parts.length < MAX_PARTS && (
        <button type="button" id={`${id}-add`} className={styles.linkButton} disabled={props.disabled} onClick={add}>
          {single ? 'Il PDF contiene altri documenti? Aggiungi un contenuto' : 'Aggiungi un contenuto'}
        </button>
      )}
      <p className={styles.note}>Senza pagine il contenuto riguarda l’intero documento. Tipo e pagine sono indicati da te: nessuna fonte viene attribuita al documento.</p>
    </fieldset>
  );
}

/** Confronto: DATI ATTUALI (già confermati) distinti dalla PROPOSTA DAL DOCUMENTO. */
function Compare({ item }: { item: IntakeItem }) {
  const org = item.confirmedOrganization;
  const p = item.proposal;
  const where = (parts: ClassificationPart[]) => [...new Set(parts.map(x => collectionLabel(kindCollection(x.kind))))].join(' · ');
  return (
    <div className={styles.compare}>
      <div>
        <span className={styles.compareLabel}>Dati attuali</span>
        <span className={styles.hint}>Già confermati da te</span>
        {org ? <><strong>{org.title}</strong><span className={styles.hint}>{org.parts.map(partLabel).join(' + ')} · {where(org.parts)}</span></>
          : <span>Nessuna organizzazione: il documento è in «Da organizzare».</span>}
      </div>
      <div className={styles.compareProposed}>
        <span className={styles.compareLabel}>Proposta dal documento</span>
        <span className={styles.hint}>Da controllare prima di sostituire i dati attuali</span>
        {p ? <><strong>{p.title}</strong><span className={styles.hint}>{p.parts.map(partLabel).join(' + ')} · {where(p.parts)}</span></>
          : <span>Nessuna proposta: il tipo lo indichi tu.</span>}
      </div>
    </div>
  );
}

/** Revisione di un singolo file (V2): Conferma e organizza applica direttamente; Decidi più avanti rinvia. */
export function ReviewDialog(props: Props) {
  const item = visibleItem(props.item);
  const titleId = useId(), group = useId();
  const [showErrors, setShowErrors] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const [page, setPage] = useState<number | null>(item.proposal?.sources[0]?.page ?? null);
  const [originalOpen, setOriginalOpen] = useState(false);
  const discardRef = useRef<HTMLButtonElement>(null);
  const { draft } = props;
  const locked = props.write.status === 'saving' || props.write.status === 'uncertain' || props.write.status === 'recovering' || props.write.status === 'not_found' && !!props.write.resend;
  const errors: ReviewErrors = showErrors ? validateReviewDraft(draft, item) : {};
  const set = (patch: Partial<ReviewDraft>) => { setAskDiscard(false); props.onDraft({ ...draft, ...patch }); };
  const isCopy = item.uploadState === 'duplicate';
  const choice = needsKeepOrUpdate(item);
  const conflict = hasConflict(item);
  const keeping = choice && draft.duplicateMode === 'reuse';
  const editing = !choice || draft.duplicateMode === 'organize';
  const manual = draft.manualParts !== null;
  const isReceipt = item.proposal?.parts.some(p => p.kind === 'receipt' || p.kind === 'invoice') ?? false;
  const opening = props.openState.status === 'opening';
  const org = item.confirmedOrganization;
  const replacing = editing && replacesConfirmed(draft, item);
  const needsOrganize = !(isCopy && keeping);
  const blockedByService = needsOrganize && !props.organizeAvailable;
  useEffect(() => { if (askDiscard) discardRef.current?.focus(); }, [askDiscard]);

  const requestClose = () => { if (props.dirty && !locked && !props.onlyOriginal) setAskDiscard(true); else props.onClose(); };
  const save = () => {
    setShowErrors(true);
    if (Object.keys(validateReviewDraft(draft, item)).length) { document.getElementById(`${group}-err`)?.focus(); return; }
    if (keeping) props.onResolveDuplicate(); else props.onSave();
  };
  const sources = item.proposal?.sources ?? [];
  const candidates = props.candidates;
  const firstError = errors.duplicate ?? errors.title ?? errors.parts ?? errors.target ?? errors.replace ?? '';
  const parts = draftParts(draft, item);
  const heading = props.onlyOriginal ? 'Originale' : isCopy ? 'File già presente' : conflict ? 'Controlla i dati diversi' : !item.proposal ? 'Indica il tipo di documento' : 'Controlla la proposta';
  const primary = choice && draft.duplicateMode === null ? 'Scegli come procedere' : isCopy && keeping ? 'Mantieni invariato' : keeping ? 'Mantieni i dati attuali' : 'Conferma e organizza';

  return (
    <Modal labelledBy={titleId} onClose={requestClose}>
      <div className={styles.dialogHead}>
        <div>
          <p className={styles.crumb}>{displayName(item)}{item.pageCount ? ` · ${item.pageCount} ${item.pageCount === 1 ? 'pagina' : 'pagine'}` : ''} · Solo io</p>
          <h2 id={titleId}>{heading}</h2>
        </div>
        <button type="button" className={cx(ui.btn, ui.small)} onClick={requestClose} data-autofocus>Chiudi</button>
      </div>
      <div className={styles.dialogBody}>
        <section aria-label="La tua scelta" className={styles.decision}>
          {props.onlyOriginal ? (
            <p>{item.selection?.action === 'organize' ? `Organizzazione attuale: ${item.selection.title}` : 'Nessuna organizzazione.'}</p>
          ) : (
            <>
              {isCopy && (
                <div className={styles.notice}>
                  <strong>Questo file è già nei tuoi Documenti{item.duplicate?.document ? ` («${item.duplicate.document.name}»)` : ''}.</strong>
                  <p className={styles.note}>Useremo lo stesso originale: scegli se mantenerlo com’è o aggiornare come è archiviato.</p>
                </div>
              )}
              {conflict && !isCopy && <><h3>Quali dati vuoi usare?</h3><p className={styles.note}>La proposta è diversa da ciò che hai già confermato.</p></>}
              {choice && (
                <>
                  <Compare item={item} />
                  <fieldset className={styles.fieldset}>
                    <legend className="visually-hidden">Come procedere</legend>
                    <label className={styles.choice}>
                      <input type="radio" name={`${group}-d`} checked={draft.duplicateMode === 'reuse'} disabled={locked} onChange={() => set(chooseKeep(item))} />
                      <span><strong>{isCopy ? 'Mantieni invariato' : 'Mantieni i dati attuali'}</strong>
                        <span className={styles.hint}>{isCopy ? 'Titolo e tipo restano come sono. Nessun secondo originale, nessun nuovo collegamento.' : 'Titolo e tipo rimangono invariati.'}</span></span>
                    </label>
                    <label className={styles.choice}>
                      <input type="radio" name={`${group}-d`} checked={draft.duplicateMode === 'organize'} disabled={locked} onChange={() => set(chooseUpdate(item))} />
                      <span><strong>{isCopy ? 'Aggiorna titolo o tipo' : 'Usa la proposta e controlla i valori'}</strong>
                        <span className={styles.hint}>Un solo originale. Vedrai il risultato prima di confermare.</span></span>
                    </label>
                  </fieldset>
                  {draft.duplicateMode === null && <p className={styles.note}>Scegli come procedere. Nessuna opzione è preselezionata.</p>}
                </>
              )}
              {editing && (
                <>
                  {item.selectionStale && <p className={styles.formError}>Il documento o la scheda sono cambiati dopo la tua scelta: rivedila prima di confermare.</p>}
                  {!item.proposal && !isCopy && (
                    <div className={styles.notice}>
                      <strong>Che documento è?</strong>
                      <p className={styles.note}>{item.analysisState === 'unreadable' || item.analysisState === 'unsupported' ? 'Non riusciamo a leggere il testo di questo file.' : 'Il testo non indica un tipo con sufficiente chiarezza.'} Il tipo lo indichi tu, consultando l’originale; non aggiungiamo fonti inventate.</p>
                    </div>
                  )}
                  <Field label="Titolo del documento" name="title" value={draft.title} maxLength={TITLE_MAX * 2} disabled={locked} error={errors.title}
                    hint={`${item.proposal && !org ? 'Proposto dal testo: puoi correggerlo. ' : ''}Vale solo per te: non rinomina il file originale.`} onChange={(e) => set({ title: e.target.value })} />

                  {!manual && item.proposal && item.proposal.parts.length > 1 && (
                    <fieldset className={styles.fieldset}>
                      <legend className={styles.legend}>Contenuti nello stesso PDF</legend>
                      {item.proposal.parts.map((p, i) => (
                        <label key={i} className={styles.check}>
                          <input type="checkbox" checked={draft.partIndexes.includes(i)} disabled={locked}
                            onChange={(e) => set({ partIndexes: e.target.checked ? [...draft.partIndexes, i] : draft.partIndexes.filter(x => x !== i) })} />
                          <span>{partLabel(p)}<span className={styles.hint}>Raccolta: {collectionLabel(kindCollection(p.kind))}</span></span>
                        </label>
                      ))}
                      <p className={styles.note}>Un solo originale, anche quando contiene più tipi: le pagine restano riferimenti nello stesso PDF.</p>
                    </fieldset>
                  )}
                  {!manual && item.proposal && item.proposal.parts.length === 1 && (
                    <div className={styles.partKind}>
                      <label htmlFor={`${group}-kind`} className={styles.legend}>Tipo di documento</label>
                      <select id={`${group}-kind`} className={styles.select} value={item.proposal.parts[0]!.kind} disabled={locked}
                        onChange={(e) => set({ manualParts: [{ ...item.proposal!.parts[0]!, kind: e.target.value as DocumentKind }] })}>
                        <KindOptions />
                      </select>
                    </div>
                  )}
                  {manual && <ManualParts parts={draft.manualParts ?? []} pageCount={item.pageCount} disabled={locked} onChange={(next) => set({ manualParts: next })} />}
                  {item.proposal && (
                    <button type="button" className={styles.linkButton} disabled={locked}
                      onClick={() => set(manual ? { manualParts: null } : { manualParts: parts.map(p => ({ ...p })) })}>
                      {manual ? 'Torna alla proposta' : 'Indica tu contenuti e pagine'}
                    </button>
                  )}

                  <div className={styles.destination}>
                    <span className={styles.hint}>Lo troverai in</span>
                    <strong>{parts.length ? [...new Set(parts.map(p => collectionLabel(kindCollection(p.kind))))].join(' + ') : 'Scegli prima il tipo'}</strong>
                    <span className={styles.hint}>Solo io · Classificare non condivide il documento</span>
                  </div>

                  {org && replacing && (
                    <label className={cx(styles.choice, styles.consent)}>
                      <input type="checkbox" checked={hasReplaceConsent(draft, item)} disabled={locked}
                        onChange={(e) => set({ replaceConsent: e.target.checked ? consentSignature(draft, item) : null })} />
                      <span><strong>Sostituisci i dati già confermati con questa scelta</strong>
                        <span className={styles.hint}>Prima: {org.title} · {org.parts.map(partLabel).join(' + ')}. L’originale resta lo stesso, i permessi non cambiano.</span></span>
                    </label>
                  )}
                  {org && !replacing && !choice && <p className={styles.note}>La scelta coincide con i dati già confermati: nessuna sostituzione.</p>}

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
                      <button type="button" className={styles.linkButton} onClick={() => props.onLoadCandidates(false)} disabled={locked}>Collega a una scheda esistente</button>
                    ) : candidates.hasMore ? (
                      <button type="button" className={styles.linkButton} onClick={() => props.onLoadCandidates(true)} disabled={candidates.status === 'loading' || locked}>{candidates.status === 'loading' ? 'Caricamento…' : 'Mostra altre schede'}</button>
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
                      <p className={styles.note}>Qui archivi la ricevuta. Registrare l’acquisto o la spesa è una scelta separata.</p>
                      {props.onOpenReceiptFlow && <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onOpenReceiptFlow}>Apri nella ricevuta assistita</button>}
                    </div>
                  )}
                </>
              )}
              <p id={`${group}-err`} tabIndex={-1} className={styles.formError} role={firstError ? 'alert' : undefined}>{firstError}</p>
            </>
          )}
          <WriteStatus state={props.write} onRecover={props.onRecover} onResend={props.onResend} />
        </section>

        <details className={styles.original} open={originalOpen || undefined} onToggle={(e) => setOriginalOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>Vedi documento e fonte</summary>
          <section aria-label="Documento originale">
            {sources.length > 0 ? (
              <>
                {sources.map((s, i) => (
                  <div key={i}>
                    <button type="button" className={styles.linkButton} aria-pressed={page === s.page} onClick={() => setPage(s.page)}>Fonte · pagina {s.page}</button>
                    <p className={styles.excerpt}>{s.excerpt}</p>
                  </div>
                ))}
                <p className={styles.note}>La proposta va controllata. Il tipo non certifica validità o regolarità.</p>
              </>
            ) : (
              <p className={styles.note}>{item.analysisState === 'unreadable' || item.analysisState === 'unsupported' ? 'Originale consultabile: nessun testo estratto e nessun dato ricostruito.' : 'Nessuna fonte proposta per questo file.'}</p>
            )}
            {/* L'anteprima si carica solo quando l'utente apre questa sezione (su mobile non scarica il file in anticipo). */}
            {originalOpen && props.preview(page)}
            <button type="button" className={ui.btn} aria-disabled={opening || undefined} onClick={() => { if (!opening) props.onOpenOriginal(page); }}>
              {opening ? 'Apertura…' : 'Apri l’originale'}
            </button>
            {props.openState.status === 'error' && <p className={styles.formError} role="alert">{props.openState.message}</p>}
          </section>
        </details>
      </div>
      <div className={styles.dialogFoot}>
        {askDiscard ? (
          <div className={styles.discard} role="alert">
            <p>Hai modifiche non confermate. Vuoi scartarle?</p>
            <div className={styles.actionGroup}>
              <button type="button" className={ui.btn} onClick={() => setAskDiscard(false)}>Continua a modificare</button>
              <button type="button" ref={discardRef} className={cx(ui.btn, ui.primary)} onClick={props.onClose}>Scarta le modifiche</button>
            </div>
          </div>
        ) : !props.onlyOriginal && item.permissions.review ? (
          <>
            <button type="button" className={styles.linkButton} onClick={props.onDefer} disabled={locked}>Decidi più avanti</button>
            <div className={styles.primaryBox}>
              {blockedByService && <p className={styles.note}>{props.unavailableReason}</p>}
              <button type="button" className={cx(ui.btn, ui.primary)} disabled={locked || blockedByService || choice && draft.duplicateMode === null} onClick={save}>
                {props.write.status === 'saving' ? 'Organizzazione…' : primary}
              </button>
            </div>
          </>
        ) : (
          <button type="button" className={ui.btn} onClick={props.onClose}>Chiudi</button>
        )}
      </div>
    </Modal>
  );
}

function WriteStatus(props: { state: ReviewWriteState; onRecover: () => void; onResend?: () => void }) {
  const s = props.state;
  if (s.status === 'rejected') return <p className={styles.formError} role="alert">Non applicato: {s.message} La tua scelta è ancora qui.</p>;
  if (s.status === 'uncertain' || s.status === 'recovering') {
    return (
      <div className={styles.conflict} role="alert">
        <strong>Esito non confermato</strong>
        <p className={styles.note}>{s.status === 'uncertain' ? s.message : 'Verifica in corso.'} La scelta non viene inviata di nuovo automaticamente.</p>
        {!(s.status === 'uncertain' && s.reloadOnly) && <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onRecover} disabled={s.status === 'recovering'}>{s.status === 'recovering' ? 'Verifica…' : 'Verifica l’esito'}</button>}
      </div>
    );
  }
  if (s.status === 'not_found' && s.resend) {
    return (
      <div className={styles.conflict} role="alert">
        <strong>Richiesta non registrata</strong>
        <p className={styles.note}>Il servizio non ha registrato questa conferma. Puoi inviarla di nuovo con le stesse scelte.</p>
        {props.onResend && <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onResend}>Invia di nuovo la stessa conferma</button>}
      </div>
    );
  }
  if (s.status === 'not_found') return <p className={styles.formError} role="alert">La scelta non risulta salvata: puoi ripeterla.</p>;
  return null;
}
