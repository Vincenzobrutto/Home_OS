import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { isApiError, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../api/queryKeys';
import type {
  Candidate,
  ConfirmedField,
  Decision,
  FieldValue,
  Measurement,
  ProposedField,
  ProviderId,
  QuantityCode,
  SourceRef,
} from '../api/types';
import { Banner, Tag, cx, ui } from '../components/ui';
import { useDocument } from '../documents/hooks';
import {
  FIELD_LABEL,
  ORIGIN_LABEL,
  QUANTITY_OPTIONS,
  AI_LABEL,
  SIMULATION_LABEL,
  SOURCE_CHECK_NOTE,
  fieldValueText,
  measurementText,
  normalizePower,
  validateNote,
  validatePower,
  validateQuantityLabel,
  validateText,
} from '../lib/review';
import { useConfirm, useRefreshAsset } from './hooks';
import styles from './review.module.css';

/** Provider effettivo di un'analisi o di una proposta: test o Anthropic, mai dedotto dalla configurazione. */
export function ProviderBadge({ provider, model }: { provider: ProviderId | undefined; model?: string | null }) {
  if (provider !== 'anthropic') return <SimulationBadge />;
  return (
    <span className={styles.ai}>
      {AI_LABEL}
      {model ? <span className={styles.aiModel}> · {model}</span> : null}
    </span>
  );
}

export function SimulationBadge() {
  return <span className={styles.simulation}>{SIMULATION_LABEL}</span>;
}

function SourceName({ homeId, documentId }: { homeId: string; documentId: string }) {
  const document = useDocument(homeId, documentId);
  return <strong>{document.data?.name ?? 'Documento originale'}</strong>;
}

/** Fonti di un valore: estratto e pagina; l'originale si apre col flusso autenticato M2. */
export function SourceList({ sources, homeId }: { sources: SourceRef[]; homeId: string }) {
  if (sources.length === 0) return <p className={styles.source}>Nessuna fonte documentale.</p>;
  return (
    <ul className={styles.sources}>
      {sources.map((s, i) => (
        <li key={`${s.documentId}-${i}`} className={styles.source}>
          <SourceName homeId={homeId} documentId={s.documentId} /> ·{' '}
          <q>{s.excerpt}</q> — pagina {s.page}, versione {s.documentVersion}, impronta{' '}
          <span title={s.documentSha256}>{s.documentSha256.slice(0, 8)}…</span> ·{' '}
          <Link to={`/home/${encodeURIComponent(homeId)}/documenti/${encodeURIComponent(s.documentId)}`}>
            Apri l’originale
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Valore confermato con origine e, per la potenza, fonti per ogni misura. */
export function FieldValueView({ value, homeId }: { value: FieldValue; homeId: string }) {
  if (value.kind === 'text') return <span className={styles.value}>{value.text}</span>;
  return (
    <ul className={styles.sources}>
      {value.measurements.map((m, i) => (
        <li key={i}>
          <span className={styles.value}>{measurementText(m)}</span>{' '}
          <span className={styles.source}>({ORIGIN_LABEL[m.origin] ?? m.origin})</span>
          {m.sources.length > 0 && <SourceList sources={m.sources} homeId={homeId} />}
        </li>
      ))}
    </ul>
  );
}

export function ConfirmedFieldView({ field, homeId }: { field: ConfirmedField; homeId: string }) {
  return (
    <div className={styles.confirmedField}>
      <span className={styles.fieldName}>{FIELD_LABEL[field.fieldKey]}</span>
      <FieldValueView value={field.value} homeId={homeId} />
      <span className={styles.source}>
        Origine: {ORIGIN_LABEL[field.origin] ?? field.origin}
        {field.note ? ` · Nota: ${field.note}` : ''}
      </span>
      {field.value.kind === 'text' && field.sources.length > 0 && <SourceList sources={field.sources} homeId={homeId} />}
    </div>
  );
}

type Choice =
  | { mode: 'candidate'; candidateId: string }
  | { mode: 'keep_distinct' }
  | { mode: 'correct' }
  | { mode: 'discard' }
  | null;

type MeasureDraft = { value: string; quantityCode: QuantityCode; quantityLabel: string };

const emptyMeasure = (): MeasureDraft => ({
  value: '',
  quantityCode: 'useful_heating',
  quantityLabel: QUANTITY_OPTIONS[0]!.label,
});

/** Messaggio per gli esiti di conferma, secondo i codici stabili di review-v1. */
function confirmationErrorMessage(error: unknown): { title: string; text: string } {
  if (isApiError(error) && error.kind === 'http') {
    switch (error.code) {
      case 'asset_version_conflict':
        return {
          title: 'La scheda è cambiata',
          text: 'Nel frattempo la scheda è stata aggiornata. Ho riletto i dati: rivedi la scelta prima di salvarla.',
        };
      case 'proposal_already_resolved':
        return { title: 'Verifica già risolta', text: 'Questa verifica è già stata chiusa. Ho riletto i dati.' };
      case 'confirmed_value_exists':
        return {
          title: 'Valore già confermato',
          text: 'Esiste già un valore confermato: per sostituirlo indica esplicitamente la sostituzione e scrivi una nota.',
        };
      case 'idempotency_conflict':
        return {
          title: 'Richiesta in conflitto',
          text: 'Una richiesta precedente con dati diversi risulta già registrata. Ho riletto i dati: invia la scelta come nuova richiesta.',
        };
    }
  }
  return { title: 'Decisione non salvata', text: userMessage(error) };
}

/**
 * Decisione su una proposta. Marca/modello: candidato, correzione con nota o
 * «Non applicare» con nota. Potenza: decisione puntuale con nota; «Conserva le
 * due grandezze» solo quando le grandezze sono davvero diverse (A+B), mai per
 * un conflitto sulla stessa grandezza (A+C). «Rimanda» non invia nulla.
 */
export function ProposalCard(props: {
  proposal: ProposedField;
  homeId: string;
  assetVersion: number;
  canEdit: boolean;
  heading?: ReactNode;
}) {
  const { proposal, homeId } = props;
  const confirm = useConfirm(homeId, proposal.assetId);
  const refresh = useRefreshAsset(homeId, proposal.assetId);
  const baseId = useId();
  const [choice, setChoice] = useState<Choice>(null);
  const [correction, setCorrection] = useState('');
  const [measures, setMeasures] = useState<MeasureDraft[]>(() => [emptyMeasure()]);
  const [note, setNote] = useState('');
  const [replace, setReplace] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [key, setKey] = useState(newIdempotencyKey);
  const [locked, setLocked] = useState(false);
  const [postponed, setPostponed] = useState(false);

  const isPower = proposal.fieldKey === 'power';
  const textKey = proposal.fieldKey === 'power' ? null : proposal.fieldKey;
  // Una grandezza «other» è ambigua: non si presume che sia diversa dalle altre (analysis-v2).
  const ambiguousQuantity = isPower && proposal.candidates.some((c) => c.measurement?.quantityCode === 'other');
  const distinctQuantities =
    isPower &&
    !ambiguousQuantity &&
    proposal.kind === 'quantity_interpretation' &&
    new Set(proposal.candidates.map((c) => c.measurement?.quantityCode)).size === proposal.candidates.length &&
    proposal.candidates.length > 1;
  const isAi = proposal.provider === 'anthropic';
  const sourceName = isAi ? 'dall’analisi AI' : 'dall’analisi di test';
  const current = proposal.currentConfirmed;

  const reset = () => {
    setChoice(null);
    setCorrection('');
    setMeasures([emptyMeasure()]);
    setNote('');
    setReplace(false);
    setErrors({});
    setLocked(false);
    setKey(newIdempotencyKey());
  };

  // Valore che risulterebbe dalla scelta, per mostrare prima/dopo.
  const afterText = (() => {
    if (!choice) return null;
    if (choice.mode === 'discard') return null;
    if (choice.mode === 'candidate') {
      const c = proposal.candidates.find((x) => x.id === choice.candidateId);
      return c ? (c.measurement ? measurementText(c.measurement) : c.value) : null;
    }
    if (choice.mode === 'keep_distinct') {
      return proposal.candidates.map((c) => (c.measurement ? measurementText(c.measurement) : c.value)).join(' · ');
    }
    if (isPower) {
      return measures
        .filter((m) => m.value.trim())
        .map((m) => `${normalizePower(m.value)} kW — ${m.quantityLabel.trim()}`)
        .join(' · ');
    }
    return correction.trim();
  })();
  const needsReplace = !!current && afterText !== null && afterText !== fieldValueText(current.value);
  const noteRequired = isPower || choice?.mode === 'correct' || choice?.mode === 'discard' || needsReplace;

  const buildDecision = (): Decision | null => {
    const errs: Record<string, string | undefined> = {};
    if (!choice) errs.choice = 'Scegli cosa fare con questa proposta.';
    const noteError = validateNote(note, noteRequired);
    if (noteError) errs.note = noteError;
    if (needsReplace && !replace) errs.replace = 'Conferma esplicitamente la sostituzione del valore già confermato.';
    if (choice?.mode === 'correct') {
      if (textKey) {
        const e = validateText(textKey, correction);
        if (e) errs.correction = e;
      } else {
        measures.forEach((m, i) => {
          const ev = validatePower(m.value);
          if (ev) errs[`m${i}value`] = ev;
          const el = validateQuantityLabel(m.quantityLabel);
          if (el) errs[`m${i}label`] = el;
        });
        const labels = measures.map((m) => m.quantityLabel.trim().toLowerCase());
        if (new Set(labels).size !== labels.length) errs.m1label = 'Le due misure devono avere denominazioni diverse.';
      }
    }
    setErrors(errs);
    if (Object.values(errs).some(Boolean) || !choice) return null;
    const trimmedNote = note.trim();
    const replaceFlag = needsReplace ? { replaceConfirmed: true } : {};
    if (choice.mode === 'discard') return { proposalId: proposal.id, action: 'discard', note: trimmedNote };
    if (!isPower) {
      if (choice.mode === 'candidate') {
        return {
          proposalId: proposal.id,
          action: 'accept',
          candidateId: choice.candidateId,
          ...(trimmedNote ? { note: trimmedNote } : {}),
          ...replaceFlag,
        };
      }
      return { proposalId: proposal.id, action: 'correct', value: correction.trim(), note: trimmedNote, ...replaceFlag };
    }
    if (choice.mode === 'keep_distinct') {
      return {
        proposalId: proposal.id,
        action: 'resolve_power',
        mode: 'keep_distinct',
        measurements: proposal.candidates.map((c) => ({ ...(c.measurement as Measurement), candidateId: c.id })),
        note: trimmedNote,
        ...replaceFlag,
      };
    }
    if (choice.mode === 'candidate') {
      const c = proposal.candidates.find((x) => x.id === choice.candidateId)!;
      return {
        proposalId: proposal.id,
        action: 'resolve_power',
        mode: 'choose_one',
        measurements: [{ ...(c.measurement as Measurement), candidateId: c.id }],
        note: trimmedNote,
        ...replaceFlag,
      };
    }
    return {
      proposalId: proposal.id,
      action: 'resolve_power',
      mode: 'correct',
      measurements: measures.map((m) => ({
        value: normalizePower(m.value),
        unit: 'kW',
        quantityCode: m.quantityCode,
        quantityLabel: m.quantityLabel.trim(),
      })),
      note: trimmedNote,
      ...replaceFlag,
    };
  };

  const submit = (sameKey: boolean) => {
    if (confirm.isPending) return;
    const decision = buildDecision();
    if (!decision) return;
    const idempotencyKey = sameKey ? key : newIdempotencyKey();
    if (!sameKey) setKey(idempotencyKey);
    confirm.mutate(
      { input: { expectedVersion: props.assetVersion, decisions: [decision] }, idempotencyKey },
      {
        onError: (error) => {
          if (isApiError(error) && error.kind === 'service') {
            // Esito sconosciuto: stessa chiave per riprovare, nessuna modifica nel frattempo.
            setLocked(true);
            return;
          }
          if (isApiError(error)) {
            const fieldErrors = error.fieldErrors;
            if (Object.keys(fieldErrors).length) setErrors((e) => ({ ...e, server: Object.values(fieldErrors).join(' ') }));
            if (
              ['asset_version_conflict', 'proposal_already_resolved', 'confirmed_value_exists', 'idempotency_conflict'].includes(
                error.code,
              )
            ) {
              // Rilettura e nuova scelta: nessun reinvio automatico di valori obsoleti.
              void refresh();
              setChoice(null);
              setReplace(false);
            }
            setKey(newIdempotencyKey());
          }
        },
      },
    );
  };

  const errorInfo = confirm.isError && !(isApiError(confirm.error) && confirm.error.kind === 'service')
    ? confirmationErrorMessage(confirm.error)
    : null;
  const ambiguous = confirm.isError && isApiError(confirm.error) && confirm.error.kind === 'service';
  const disabled = locked || confirm.isPending || !props.canEdit;
  const nameFor = `${baseId}-choice`;

  const candidateLabel = (c: Candidate) => (c.measurement ? measurementText(c.measurement) : c.value);

  return (
    <article className={styles.proposal} aria-labelledby={`${baseId}-title`}>
      <div className={styles.proposalHead}>
        <h3 id={`${baseId}-title`}>{props.heading ?? FIELD_LABEL[proposal.fieldKey]}</h3>
        <ProviderBadge provider={proposal.provider} model={proposal.model} />
      </div>
      <p className={styles.explain}>
        {isPower && ambiguousQuantity
          ? 'Almeno una grandezza non è identificata con certezza: non viene trattata come diversa dalle altre. Scegli un valore o correggi indicando la denominazione.'
          : isPower
          ? distinctQuantities
            ? 'I documenti riportano due grandezze diverse con denominazioni diverse. Puoi conservarle entrambe, ognuna con il suo nome, oppure usarne una sola.'
            : proposal.kind === 'value_conflict'
              ? 'I documenti riportano valori diversi per la stessa grandezza: scegli quale vale, con una motivazione, oppure correggi.'
              : `Valore proposto ${sourceName}: confermalo con una nota o correggilo.`
          : proposal.kind === 'value_conflict'
            ? 'I documenti propongono valori diversi: scegli quello corretto o correggi.'
            : `Valore proposto ${sourceName}.`}
      </p>
      {isAi && <p className={styles.explain}>{SOURCE_CHECK_NOTE}</p>}
      {current && (
        <p className={styles.explain}>
          Valore già confermato: <strong>{fieldValueText(current.value)}</strong>
        </p>
      )}
      {postponed && (
        <Banner role="status">
          <p>Rimandata: la verifica resta aperta in Da rivedere.</p>
        </Banner>
      )}

      <fieldset className={styles.options} disabled={disabled} aria-describedby={errors.choice ? `${baseId}-choice-error` : undefined}>
        <legend>Cosa vuoi fare</legend>
        {distinctQuantities && (
          <label className={styles.option}>
            <input
              type="radio"
              name={nameFor}
              checked={choice?.mode === 'keep_distinct'}
              onChange={() => setChoice({ mode: 'keep_distinct' })}
            />
            <span className={styles.optionBody}>
              <span className={styles.value}>Conserva le due grandezze</span>
              {proposal.candidates.map((c) => (
                <span key={c.id}>{candidateLabel(c)}</span>
              ))}
            </span>
          </label>
        )}
        {proposal.candidates.map((c) => (
          <label key={c.id} className={styles.option}>
            <input
              type="radio"
              name={nameFor}
              checked={choice?.mode === 'candidate' && choice.candidateId === c.id}
              onChange={() => setChoice({ mode: 'candidate', candidateId: c.id })}
            />
            <span className={styles.optionBody}>
              <span className={styles.value}>
                {isPower && proposal.candidates.length > 1 ? `Usa solo ${candidateLabel(c)}` : `Usa ${candidateLabel(c)}`}
              </span>
              <SourceList sources={c.sources} homeId={homeId} />
            </span>
          </label>
        ))}
        <label className={styles.option}>
          <input type="radio" name={nameFor} checked={choice?.mode === 'correct'} onChange={() => setChoice({ mode: 'correct' })} />
          <span className={styles.optionBody}>
            <span className={styles.value}>Correggi</span>
            <span>Inserisci il valore giusto: resterà distinto dal testo dell’originale.</span>
          </span>
        </label>
        <label className={styles.option}>
          <input type="radio" name={nameFor} checked={choice?.mode === 'discard'} onChange={() => setChoice({ mode: 'discard' })} />
          <span className={styles.optionBody}>
            <span className={styles.value}>Non applicare</span>
            <span>Chiude solo questa proposta, con una motivazione. Valori confermati e originali restano invariati.</span>
          </span>
        </label>
        {errors.choice && (
          <span id={`${baseId}-choice-error`} className={ui.fieldError}>
            {errors.choice}
          </span>
        )}
      </fieldset>

      {choice?.mode === 'correct' && textKey && (
        <div className={ui.field}>
          <label className={ui.label} htmlFor={`${baseId}-correction`}>
            {FIELD_LABEL[textKey]}: valore corretto
          </label>
          <input
            id={`${baseId}-correction`}
            className={ui.input}
            value={correction}
            disabled={disabled}
            onChange={(e) => setCorrection(e.target.value)}
            aria-invalid={errors.correction ? true : undefined}
            aria-describedby={errors.correction ? `${baseId}-correction-error` : undefined}
          />
          {errors.correction && (
            <span id={`${baseId}-correction-error`} className={ui.fieldError}>
              {errors.correction}
            </span>
          )}
        </div>
      )}
      {choice?.mode === 'correct' && isPower && (
        <MeasurementEditor
          idPrefix={baseId}
          measures={measures}
          onChange={setMeasures}
          errors={errors}
          disabled={disabled}
        />
      )}

      {needsReplace && current && (
        <>
          <dl className={styles.beforeAfter} aria-label="Sostituzione del valore confermato">
            <dt>Prima</dt>
            <dd>{fieldValueText(current.value)}</dd>
            <dt>Dopo</dt>
            <dd>{afterText}</dd>
          </dl>
          <label className={styles.checkLine}>
            <input
              type="checkbox"
              checked={replace}
              disabled={disabled}
              onChange={(e) => setReplace(e.target.checked)}
              aria-invalid={errors.replace ? true : undefined}
            />
            <span>Sostituisci il valore confermato</span>
          </label>
          {errors.replace && <span className={ui.fieldError}>{errors.replace}</span>}
        </>
      )}

      {choice && (
        <div className={ui.field}>
          <label className={ui.label} htmlFor={`${baseId}-note`}>
            Nota {noteRequired ? '(obbligatoria)' : '(facoltativa)'}
          </label>
          <textarea
            id={`${baseId}-note`}
            className={styles.textarea}
            value={note}
            disabled={disabled}
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={errors.note ? `${baseId}-note-error` : undefined}
          />
          {errors.note && (
            <span id={`${baseId}-note-error`} className={ui.fieldError}>
              {errors.note}
            </span>
          )}
        </div>
      )}

      {ambiguous && (
        <Banner
          tone="error"
          role="alert"
          title="Esito non confermato"
          actions={
            <>
              <button type="button" className={cx(ui.btn, ui.small)} onClick={() => submit(true)} disabled={confirm.isPending}>
                Riprova invio
              </button>
              <button type="button" className={cx(ui.btn, ui.small)} onClick={reset} disabled={confirm.isPending}>
                Ricomincia la scelta
              </button>
            </>
          }
        >
          <p>
            {userMessage(confirm.error)} La decisione potrebbe essere già stata salvata: «Riprova invio» ripete la
            stessa richiesta senza duplicarla.
          </p>
        </Banner>
      )}
      {errorInfo && (
        <Banner tone="warning" role="alert" title={errorInfo.title}>
          <p>{errorInfo.text}</p>
          {errors.server && <p>{errors.server}</p>}
        </Banner>
      )}

      {props.canEdit ? (
        <div className={styles.actions}>
          {!locked && (
            <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => submit(true)} disabled={confirm.isPending}>
              {confirm.isPending ? 'Salvataggio…' : 'Salva decisione'}
            </button>
          )}
          <button
            type="button"
            className={cx(ui.btn, ui.ghost)}
            disabled={confirm.isPending || locked}
            onClick={() => {
              reset();
              confirm.reset();
              setPostponed(true);
            }}
          >
            Rimanda
          </button>
        </div>
      ) : (
        <p className={styles.explain}>Con il tuo ruolo puoi consultare questa verifica, non deciderla.</p>
      )}
    </article>
  );
}

export function MeasurementEditor(props: {
  idPrefix: string;
  measures: MeasureDraft[];
  onChange: (next: MeasureDraft[]) => void;
  errors: Record<string, string | undefined>;
  disabled?: boolean;
}) {
  const { measures, onChange, errors, idPrefix } = props;
  const update = (i: number, patch: Partial<MeasureDraft>) =>
    onChange(measures.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <div className={styles.fieldGrid}>
      {measures.map((m, i) => (
        <div key={i} className={styles.measureRow} role="group" aria-label={`Misura ${i + 1}`}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor={`${idPrefix}-m${i}-value`}>
              Valore (kW)
            </label>
            <input
              id={`${idPrefix}-m${i}-value`}
              className={ui.input}
              inputMode="decimal"
              value={m.value}
              disabled={props.disabled}
              onChange={(e) => update(i, { value: e.target.value })}
              aria-invalid={errors[`m${i}value`] ? true : undefined}
              aria-describedby={errors[`m${i}value`] ? `${idPrefix}-m${i}-value-error` : undefined}
            />
            {errors[`m${i}value`] && (
              <span id={`${idPrefix}-m${i}-value-error`} className={ui.fieldError}>
                {errors[`m${i}value`]}
              </span>
            )}
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor={`${idPrefix}-m${i}-code`}>
              Grandezza
            </label>
            <select
              id={`${idPrefix}-m${i}-code`}
              className={styles.select}
              value={m.quantityCode}
              disabled={props.disabled}
              onChange={(e) => {
                const code = e.target.value as QuantityCode;
                const option = QUANTITY_OPTIONS.find((o) => o.code === code)!;
                update(i, { quantityCode: code, quantityLabel: code === 'other' ? '' : option.label });
              }}
            >
              {QUANTITY_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={cx(ui.field, styles.wide)}>
            <label className={ui.label} htmlFor={`${idPrefix}-m${i}-label`}>
              Denominazione
            </label>
            <input
              id={`${idPrefix}-m${i}-label`}
              className={ui.input}
              value={m.quantityLabel}
              disabled={props.disabled}
              onChange={(e) => update(i, { quantityLabel: e.target.value })}
              aria-invalid={errors[`m${i}label`] ? true : undefined}
              aria-describedby={errors[`m${i}label`] ? `${idPrefix}-m${i}-label-error` : undefined}
            />
            {errors[`m${i}label`] && (
              <span id={`${idPrefix}-m${i}-label-error`} className={ui.fieldError}>
                {errors[`m${i}label`]}
              </span>
            )}
          </div>
        </div>
      ))}
      <div className={styles.actions}>
        {measures.length < 2 ? (
          <button
            type="button"
            className={cx(ui.btn, ui.small)}
            disabled={props.disabled}
            onClick={() => onChange([...measures, { value: '', quantityCode: 'reported_nominal', quantityLabel: QUANTITY_OPTIONS[1]!.label }])}
          >
            Aggiungi una seconda grandezza
          </button>
        ) : (
          <button
            type="button"
            className={cx(ui.btn, ui.small)}
            disabled={props.disabled}
            onClick={() => onChange(measures.slice(0, 1))}
          >
            Togli la seconda grandezza
          </button>
        )}
      </div>
    </div>
  );
}

export { emptyMeasure, type MeasureDraft };

export function StateTag({ children }: { children: ReactNode }) {
  return <Tag tone="blue">{children}</Tag>;
}
