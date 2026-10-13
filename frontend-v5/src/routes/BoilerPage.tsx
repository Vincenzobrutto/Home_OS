import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { isApiError, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../api/queryKeys';
import type { BoilerDetail, FieldKey, FieldValue, HistoryEvent, ManualField, ProposedField } from '../api/types';
import { Banner, ErrorState, Field, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { formatDate } from '../lib/files';
import {
  BOILER_STATE_LABEL,
  FIELD_LABEL,
  HISTORY_KIND_LABEL,
  HISTORY_ACTION_LABEL,
  HISTORY_ORIGIN_LABEL,
  PERSONAL_LABEL,
  confirmedFieldOf,
  fieldValueText,
  m3ErrorMessage,
  measurementText,
  normalizePower,
  validateNote,
  validatePower,
  validateQuantityLabel,
  validateText,
} from '../lib/review';
import {
  ConfirmedFieldView,
  MeasurementEditor,
  ProposalCard,
  ProviderBadge,
  SourceList,
  emptyMeasure,
  type MeasureDraft,
} from '../review/components';
import { useAsset, useHistory, useManualConfirm, useRefreshAsset } from '../review/hooks';
import review from '../review/review.module.css';
import { useCurrentHome } from './HomePages';
import styles from './pages.module.css';

export function BoilerPage() {
  const home = useCurrentHome();
  const { assetId = '' } = useParams();
  const asset = useAsset(home.id, assetId);
  const back = (
    <Link to={`/home/${encodeURIComponent(home.id)}/attivita`} className={styles.spaced}>
      ← Attività
    </Link>
  );

  if (asset.isPending) {
    return (
      <>
        {back}
        <h1 className="visually-hidden" data-pending="">
          Scheda caldaia
        </h1>
        <Loading label="Caricamento della scheda…" />
      </>
    );
  }
  if (asset.isError) {
    const status = isApiError(asset.error) && asset.error.kind === 'http' ? asset.error.status : 0;
    if (status === 403 || status === 422) {
      return (
        <Unavailable back={back} title={status === 403 ? 'Scheda non disponibile' : 'Indirizzo non valido'}>
          {status === 403
            ? 'Questo account non ha accesso alla scheda richiesta.'
            : 'L’indirizzo non corrisponde a una scheda valida.'}
        </Unavailable>
      );
    }
    return (
      <>
        {back}
        <h1 tabIndex={-1}>Scheda caldaia</h1>
        <div className={styles.spaced}>
          <ErrorState error={asset.error} message={m3ErrorMessage(asset.error)} onRetry={() => void asset.refetch()} retrying={asset.isFetching} />
        </div>
      </>
    );
  }
  return <BoilerView asset={asset.data} homeId={home.id} homeName={home.name} homeCanEdit={home.permissions.includes('edit')} back={back} />;
}

function Unavailable(props: { back: ReactNode; title: string; children: string }) {
  useDocumentTitle(props.title);
  return (
    <div className={styles.stack}>
      <div>
        {props.back}
        <h1 tabIndex={-1}>{props.title}</h1>
      </div>
      <Banner tone="warning" role="alert">
        <p>{props.children}</p>
      </Banner>
    </div>
  );
}

const FIELD_ORDER: FieldKey[] = ['brand', 'model', 'power'];

function BoilerView(props: { asset: BoilerDetail; homeId: string; homeName: string; homeCanEdit: boolean; back: ReactNode }) {
  const { asset, homeId } = props;
  useDocumentTitle(`${asset.name} · ${props.homeName}`);
  const canEdit = props.homeCanEdit && asset.permissions.includes('edit');
  const open = asset.proposals.filter((p) => p.state === 'open');
  // Provider effettivi della scheda: analysis-v2 li elenca; con un servizio M3 si ricavano dalle proposte.
  // Scheda solo manuale: nessuna etichetta di analisi.
  const providers = asset.analysisProviders ?? [...new Set(asset.proposals.map((p) => p.provider))];

  return (
    <>
      {props.back}
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>{props.homeName}</span>
          <h1 tabIndex={-1}>{asset.name}</h1>
          <div className={review.actions}>
            <Tag tone="blue">{BOILER_STATE_LABEL[asset.state]}</Tag>
            <Tag>{PERSONAL_LABEL}</Tag>
            {providers.map((p) => (
              <ProviderBadge key={p} provider={p} />
            ))}
          </div>
          <p className={cx(styles.small, styles.muted, styles.spaced)}>
            Lo stato riguarda i dati della scheda, non la regolarità tecnica della caldaia.
          </p>
        </div>
      </div>
      <div className={styles.stack}>
        <section className={ui.card} aria-labelledby="confermati-title">
          <h2 id="confermati-title" className={styles.cardTitle}>
            Dati confermati
          </h2>
          {FIELD_ORDER.map((key) => {
            const field = confirmedFieldOf(asset, key);
            return field ? (
              <ConfirmedFieldView key={key} field={field} homeId={homeId} />
            ) : (
              <div key={key} className={review.confirmedField}>
                <span className={review.fieldName}>{FIELD_LABEL[key]}</span>
                <span className={styles.muted}>Non ancora confermato</span>
              </div>
            );
          })}
        </section>

        <section aria-labelledby="aperte-title">
          <h2 id="aperte-title" className={styles.cardTitle}>
            Verifiche aperte ({open.length})
          </h2>
          {open.length === 0 ? (
            <p className={styles.muted}>Nessuna verifica aperta per questa scheda.</p>
          ) : (
            <div className={review.group}>
              {open.map((p) => (
                <ProposalCard key={p.id} proposal={p} homeId={homeId} assetVersion={asset.version} canEdit={canEdit} />
              ))}
            </div>
          )}
        </section>

        {canEdit && (
          <section className={ui.card} aria-labelledby="manuale-title">
            <h2 id="manuale-title" className={styles.cardTitle}>
              Inserisci o correggi a mano
            </h2>
            <p className={cx(styles.small, styles.muted)}>
              Sempre disponibile, anche senza analisi: i dati inseriti a mano hanno origine «inserito a mano» e nessuna
              fonte documentale. Le verifiche aperte restano tali, a meno che tu non scelga di chiuderle.
            </p>
            <div className={review.fieldGrid}>
              <ManualTextForm asset={asset} homeId={homeId} />
              <ManualPowerForm asset={asset} homeId={homeId} />
            </div>
            <p className={cx(styles.small, styles.spaced)}>
              <Link to={`/home/${encodeURIComponent(homeId)}/attivita?analizza=1&scheda=${encodeURIComponent(asset.id)}`}>
                Analizza altri documenti per questa scheda
              </Link>
            </p>
          </section>
        )}

        <HistorySection homeId={homeId} assetId={asset.id} />
      </div>
    </>
  );
}

/** Errori di conferma manuale: conflitti → rilettura, mai reinvio automatico. */
function manualErrorText(error: unknown) {
  if (isApiError(error) && error.kind === 'http') {
    if (error.code === 'asset_version_conflict') return 'La scheda è cambiata nel frattempo: ho riletto i dati, controlla e salva di nuovo.';
    if (error.code === 'confirmed_value_exists') return 'Esiste già un valore confermato: per sostituirlo spunta la sostituzione e scrivi una nota.';
    if (error.code === 'idempotency_conflict') return 'Una richiesta precedente con dati diversi risulta già registrata: ho riletto i dati.';
  }
  return userMessage(error);
}

function useManualSubmit(asset: BoilerDetail, homeId: string) {
  const manual = useManualConfirm(homeId, asset.id);
  const refresh = useRefreshAsset(homeId, asset.id);
  const [key, setKey] = useState(newIdempotencyKey);
  const submit = (fields: ManualField[], onDone: () => void) => {
    if (manual.isPending) return;
    manual.mutate(
      { input: { expectedVersion: asset.version, fields }, idempotencyKey: key },
      {
        onSuccess: () => {
          setKey(newIdempotencyKey());
          onDone();
        },
        onError: (err) => {
          if (isApiError(err) && err.kind === 'http') {
            setKey(newIdempotencyKey());
            if (['asset_version_conflict', 'confirmed_value_exists', 'idempotency_conflict'].includes(err.code)) void refresh();
          }
        },
      },
    );
  };
  const ambiguous = manual.isError && isApiError(manual.error) && manual.error.kind === 'service';
  return { manual, submit, ambiguous };
}

function CloseProposals(props: { proposals: ProposedField[]; selected: string[]; onChange: (ids: string[]) => void; disabled: boolean }) {
  if (props.proposals.length === 0) return null;
  return (
    <fieldset className={review.options} disabled={props.disabled}>
      <legend>Verifiche aperte su questo dato (restano aperte se non le scegli)</legend>
      {props.proposals.map((p) => (
        <label key={p.id} className={review.checkLine}>
          <input
            type="checkbox"
            checked={props.selected.includes(p.id)}
            onChange={(e) => props.onChange(e.target.checked ? [...props.selected, p.id] : props.selected.filter((x) => x !== p.id))}
          />
          <span>
            Chiudi anche la verifica su {FIELD_LABEL[p.fieldKey].toLowerCase()} (
            {p.candidates.map((c) => (c.measurement ? measurementText(c.measurement) : c.value)).join(' / ')})
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function ReplaceNotice(props: { before: FieldValue; after: string; checked: boolean; onChange: (v: boolean) => void; error?: string; disabled: boolean }) {
  return (
    <>
      <dl className={review.beforeAfter} aria-label="Sostituzione del valore confermato">
        <dt>Prima</dt>
        <dd>{fieldValueText(props.before)}</dd>
        <dt>Dopo</dt>
        <dd>{props.after}</dd>
      </dl>
      <label className={review.checkLine}>
        <input type="checkbox" checked={props.checked} disabled={props.disabled} onChange={(e) => props.onChange(e.target.checked)} />
        <span>Sostituisci il valore confermato</span>
      </label>
      {props.error && <span className={ui.fieldError}>{props.error}</span>}
    </>
  );
}

function ManualTextForm({ asset, homeId }: { asset: BoilerDetail; homeId: string }) {
  const id = useId();
  const { manual, submit, ambiguous } = useManualSubmit(asset, homeId);
  const [values, setValues] = useState({ brand: '', model: '' });
  const [note, setNote] = useState('');
  const [replace, setReplace] = useState({ brand: false, model: false });
  const [close, setClose] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saved, setSaved] = useState(false);
  const disabled = manual.isPending || ambiguous;
  const keys = (['brand', 'model'] as const).filter((k) => values[k].trim());
  const openFor = asset.proposals.filter((p) => p.state === 'open' && (p.fieldKey === 'brand' || p.fieldKey === 'model'));

  const send = () => {
    setSaved(false);
    const errs: Record<string, string | undefined> = {};
    if (keys.length === 0) errs.form = 'Inserisci almeno marca o modello.';
    for (const k of keys) {
      errs[k] = validateText(k, values[k]);
      const current = confirmedFieldOf(asset, k);
      if (current && fieldValueText(current.value) !== values[k].trim() && !replace[k]) {
        errs[`${k}Replace`] = 'Conferma esplicitamente la sostituzione.';
      }
    }
    errs.note = validateNote(note);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    const fields: ManualField[] = keys.map((k) => {
      const current = confirmedFieldOf(asset, k);
      const replacing = !!current && fieldValueText(current.value) !== values[k].trim();
      return {
        fieldKey: k,
        value: { kind: 'text', text: values[k].trim() },
        note: note.trim(),
        ...(replacing ? { replaceConfirmed: true } : {}),
        proposalIdsToClose: close.filter((pid) => openFor.find((p) => p.id === pid)?.fieldKey === k),
      };
    });
    submit(fields, () => {
      setValues({ brand: '', model: '' });
      setNote('');
      setReplace({ brand: false, model: false });
      setClose([]);
      setSaved(true);
    });
  };

  return (
    <form className={review.proposal} onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); send(); }} noValidate aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`}>Marca e modello</h3>
      {(['brand', 'model'] as const).map((k) => {
        const current = confirmedFieldOf(asset, k);
        const replacing = !!current && !!values[k].trim() && fieldValueText(current.value) !== values[k].trim();
        return (
          <div key={k} className={review.fieldGrid}>
            <Field
              label={FIELD_LABEL[k]}
              name={`manual-${k}`}
              value={values[k]}
              disabled={disabled}
              hint={current ? `Confermato: ${fieldValueText(current.value)}` : undefined}
              onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
              error={errors[k]}
            />
            {replacing && current && (
              <ReplaceNotice
                before={current.value}
                after={values[k].trim()}
                checked={replace[k]}
                disabled={disabled}
                onChange={(v) => setReplace((r) => ({ ...r, [k]: v }))}
                error={errors[`${k}Replace`]}
              />
            )}
          </div>
        );
      })}
      <CloseProposals proposals={openFor} selected={close} onChange={setClose} disabled={disabled} />
      <NoteField id={`${id}-note`} value={note} onChange={setNote} error={errors.note} disabled={disabled} />
      {errors.form && <span className={ui.fieldError}>{errors.form}</span>}
      <ManualFeedback manual={manual} ambiguous={ambiguous} saved={saved} onRetry={send} />
      <div className={review.actions}>
        <button type="submit" className={cx(ui.btn, ui.primary)} disabled={manual.isPending}>
          {manual.isPending ? 'Salvataggio…' : 'Salva marca e modello'}
        </button>
      </div>
    </form>
  );
}

function ManualPowerForm({ asset, homeId }: { asset: BoilerDetail; homeId: string }) {
  const id = useId();
  const { manual, submit, ambiguous } = useManualSubmit(asset, homeId);
  const [measures, setMeasures] = useState<MeasureDraft[]>(() => [emptyMeasure()]);
  const [note, setNote] = useState('');
  const [replace, setReplace] = useState(false);
  const [close, setClose] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saved, setSaved] = useState(false);
  const disabled = manual.isPending || ambiguous;
  const current = confirmedFieldOf(asset, 'power');
  const openFor = asset.proposals.filter((p) => p.state === 'open' && p.fieldKey === 'power');
  const afterText = measures
    .filter((m) => m.value.trim())
    .map((m) => `${normalizePower(m.value)} kW — ${m.quantityLabel.trim()}`)
    .join(' · ');
  const replacing = !!current && !!afterText && fieldValueText(current.value) !== afterText;

  const send = () => {
    setSaved(false);
    const errs: Record<string, string | undefined> = {};
    measures.forEach((m, i) => {
      errs[`m${i}value`] = validatePower(m.value);
      errs[`m${i}label`] = validateQuantityLabel(m.quantityLabel);
    });
    const labels = measures.map((m) => m.quantityLabel.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) errs.m1label = 'Le due misure devono avere denominazioni diverse.';
    errs.note = validateNote(note);
    if (replacing && !replace) errs.replace = 'Conferma esplicitamente la sostituzione.';
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    // Potenza da sola nella richiesta, come chiede il contratto.
    submit(
      [
        {
          fieldKey: 'power',
          value: {
            kind: 'power',
            measurements: measures.map((m) => ({
              value: normalizePower(m.value),
              unit: 'kW',
              quantityCode: m.quantityCode,
              quantityLabel: m.quantityLabel.trim(),
            })),
          },
          note: note.trim(),
          ...(replacing ? { replaceConfirmed: true } : {}),
          proposalIdsToClose: close,
        },
      ],
      () => {
        setMeasures([emptyMeasure()]);
        setNote('');
        setReplace(false);
        setClose([]);
        setSaved(true);
      },
    );
  };

  return (
    <form className={review.proposal} onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); send(); }} noValidate aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`}>Potenza</h3>
      {current && <p className={styles.small}>Confermata: {fieldValueText(current.value)}</p>}
      <MeasurementEditor idPrefix={id} measures={measures} onChange={setMeasures} errors={errors} disabled={disabled} />
      {replacing && current && (
        <ReplaceNotice before={current.value} after={afterText} checked={replace} disabled={disabled} onChange={setReplace} error={errors.replace} />
      )}
      <CloseProposals proposals={openFor} selected={close} onChange={setClose} disabled={disabled} />
      <NoteField id={`${id}-note`} value={note} onChange={setNote} error={errors.note} disabled={disabled} />
      <ManualFeedback manual={manual} ambiguous={ambiguous} saved={saved} onRetry={send} />
      <div className={review.actions}>
        <button type="submit" className={cx(ui.btn, ui.primary)} disabled={manual.isPending}>
          {manual.isPending ? 'Salvataggio…' : 'Salva potenza'}
        </button>
      </div>
    </form>
  );
}

function NoteField(props: { id: string; value: string; onChange: (v: string) => void; error?: string; disabled: boolean }) {
  return (
    <div className={ui.field}>
      <label className={ui.label} htmlFor={props.id}>
        Nota (obbligatoria)
      </label>
      <textarea
        id={props.id}
        className={review.textarea}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${props.id}-error` : undefined}
      />
      {props.error && (
        <span id={`${props.id}-error`} className={ui.fieldError}>
          {props.error}
        </span>
      )}
    </div>
  );
}

function ManualFeedback(props: {
  manual: ReturnType<typeof useManualConfirm>;
  ambiguous: boolean;
  saved: boolean;
  onRetry: () => void;
}) {
  if (props.saved) {
    return (
      <Banner role="status">
        <p>Dati salvati nella scheda.</p>
      </Banner>
    );
  }
  if (!props.manual.isError) return null;
  return (
    <Banner
      tone={props.ambiguous ? 'error' : 'warning'}
      role="alert"
      title={props.ambiguous ? 'Esito non confermato' : 'Dati non salvati'}
      actions={
        props.ambiguous && (
          <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onRetry} disabled={props.manual.isPending}>
            Riprova invio
          </button>
        )
      }
    >
      <p>
        {manualErrorText(props.manual.error)}
        {props.ambiguous ? ' «Riprova invio» ripete la stessa richiesta senza duplicarla.' : ''}
      </p>
    </Banner>
  );
}

function HistorySection({ homeId, assetId }: { homeId: string; assetId: string }) {
  const history = useHistory(homeId, assetId);
  const events = history.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className={ui.card} aria-labelledby="storia-title">
      <h2 id="storia-title" className={styles.cardTitle}>
        Storia della scheda
      </h2>
      {history.isPending ? (
        <Loading label="Caricamento della storia…" />
      ) : history.isError && !history.data ? (
        <ErrorState error={history.error} message={m3ErrorMessage(history.error)} onRetry={() => void history.refetch()} retrying={history.isFetching} />
      ) : events.length === 0 ? (
        <p className={styles.muted}>Ancora nessun evento.</p>
      ) : (
        <ol className={review.history}>
          {events.map((ev) => (
            <HistoryItem key={ev.id} event={ev} homeId={homeId} />
          ))}
        </ol>
      )}
      {history.hasNextPage && (
        <p className={styles.spaced}>
          <button type="button" className={ui.btn} onClick={() => void history.fetchNextPage()} disabled={history.isFetchingNextPage}>
            Mostra eventi precedenti
          </button>
        </p>
      )}
    </section>
  );
}

function HistoryItem({ event, homeId }: { event: HistoryEvent; homeId: string }) {
  return (
    <li className={review.historyEvent}>
      <strong>{HISTORY_KIND_LABEL[event.kind] ?? event.kind}</strong>
      <span className={styles.small}>
        {formatDate(event.at)} · {HISTORY_ORIGIN_LABEL[event.origin] ?? 'tua decisione'}
      </span>
      {event.note && <span className={styles.small}>Nota: {event.note}</span>}
      {event.changes.map((c, i) => (
        <div key={i} className={review.historyChange}>
          <strong>{FIELD_LABEL[c.fieldKey]}</strong> ({HISTORY_ACTION_LABEL[c.action] ?? 'Aggiornamento'}): {fieldValueText(c.before)} → {fieldValueText(c.after)}
          {c.sources.length > 0 && <SourceList sources={c.sources} homeId={homeId} />}
        </div>
      ))}
    </li>
  );
}
