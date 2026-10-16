import { useId } from 'react';
import { Field, cx } from '../components/ui';
import {
  LIMITS, decisionKey, fieldOrigin, fieldSources,
  type ComparisonDecision, type FieldComparison, type FormField, type ReceiptDraft, type ReceiptFormState,
} from './model';
import styles from './receipt.module.css';

export const FIELD_LABEL: Record<FormField, string> = {
  name: 'Nome dell’oggetto', brand: 'Marca', model: 'Modello',
  title: 'Descrizione', amount: 'Importo in euro', date: 'Data di riferimento', supplier: 'Venditore',
};

const ORIGIN_LABEL = { document: 'Dal documento', edited: 'Modificato da te', manual: 'Inserito da te', empty: 'Da completare' } as const;

/** Campo del form con origine (documento / modificato / manuale) e accesso alla fonte, se esiste. */
export function ReceiptFieldInput(props: {
  field: FormField;
  state: ReceiptFormState;
  draft: ReceiptDraft;
  today: string;
  error?: string;
  wide?: boolean;
  disabled?: boolean;
  onValue: (field: FormField, value: string) => void;
  onShowSource: (field: FormField) => void;
}) {
  const { field, state, draft } = props;
  const origin = fieldOrigin(state, draft, field);
  const sources = fieldSources(draft, field);
  const max = field === 'amount' || field === 'date' ? undefined : LIMITS[field];
  return (
    <div className={cx(props.wide && styles.wide)}>
      <Field
        label={FIELD_LABEL[field]}
        name={field}
        value={state.values[field]}
        error={props.error}
        disabled={props.disabled}
        type={field === 'date' ? 'date' : 'text'}
        inputMode={field === 'amount' ? 'decimal' : undefined}
        max={field === 'date' ? props.today : undefined}
        hint={field === 'amount' ? 'Per esempio 179,90.' : max ? `Massimo ${max} caratteri.` : undefined}
        autoComplete="off"
        onChange={(e) => props.onValue(field, e.target.value)}
      />
      <div className={styles.fieldMeta}>
        <span>
          {ORIGIN_LABEL[origin]}
          {origin === 'document' && sources[0] ? ` · pagina ${sources[0].page}` : ''}
        </span>
        {sources.length > 0 && origin === 'document' && (
          <button type="button" className={styles.linkButton} onClick={() => props.onShowSource(field)}>
            Vedi fonte<span className="visually-hidden"> · {FIELD_LABEL[field]}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Confronto fra valore confermato e valore letto: nessuna scelta predefinita, nessuna sovrascrittura. */
export function ComparisonField(props: {
  comparison: FieldComparison;
  decision: ComparisonDecision | undefined;
  disabled?: boolean;
  onDecide: (key: string, decision: ComparisonDecision) => void;
  onShowSource: (field: 'brand' | 'model') => void;
}) {
  const { comparison: c } = props;
  const name = useId();
  const label = FIELD_LABEL[c.field];
  return (
    <fieldset className={cx(styles.fieldset, styles.compare)}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.facts}>
        <div className={styles.fact}><span>Già confermato da te</span><strong>{c.existing}</strong></div>
        <div className={styles.fact}><span>Letto nella ricevuta{c.proposed.sources[0] ? ` · pagina ${c.proposed.sources[0].page}` : ''}</span><strong>{c.proposed.value}</strong></div>
      </div>
      {c.proposed.sources.length > 0 && (
        <button type="button" className={styles.linkButton} onClick={() => props.onShowSource(c.field)}>
          Vedi fonte · {label}
        </button>
      )}
      <label className={styles.choice}>
        <input type="radio" name={name} value="keep_existing" checked={props.decision === 'keep_existing'} disabled={props.disabled} onChange={() => props.onDecide(decisionKey(c.objectId, c.field), 'keep_existing')} />
        <span><strong>Mantieni «{c.existing}»</strong><span className={styles.choiceHint}>Conserva il valore confermato e chiudi il confronto.</span></span>
      </label>
      <label className={styles.choice}>
        <input type="radio" name={name} value="defer" checked={props.decision === 'defer'} disabled={props.disabled} onChange={() => props.onDecide(decisionKey(c.objectId, c.field), 'defer')} />
        <span><strong>Decidi più avanti</strong><span className={styles.choiceHint}>Il valore attuale resta; il confronto rimane aperto nella scheda e in Da rivedere.</span></span>
      </label>
    </fieldset>
  );
}
