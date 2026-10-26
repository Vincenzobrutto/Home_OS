import { useId } from 'react';
import { Tag, cx, ui } from '../components/ui';
import { ComparisonField, ReceiptFieldInput } from './ReceiptFields';
import {
  formatCents, formatDate, pendingComparisons,
  type CandidatePage, type CandidateReason, type ExpenseChoice, type ExpenseRef, type FormField, type ObjectChoice,
  type ObjectRef, type ReceiptDraft, type ReceiptFormState, type ValidationResult,
} from './model';
import styles from './receipt.module.css';

const REASON: Record<string, string> = {
  same_document: 'Questa ricevuta è già collegata alla scheda.',
  same_brand_model: 'Stessa marca e modello letti nella ricevuta.',
  same_original: 'Una copia dello stesso originale è già collegata.',
};
const reasonText = (reasons: CandidateReason[]) => reasons.map(r => REASON[r] ?? 'Possibile corrispondenza: controlla che sia lo stesso.').join(' ');

type SectionProps = {
  draft: ReceiptDraft;
  state: ReceiptFormState;
  errors: ValidationResult['errors'];
  today: string;
  canEdit: boolean;
  onChange: (next: ReceiptFormState) => void;
  onShowSource: (field: FormField) => void;
};

function Choice(props: { name: string; checked: boolean; disabled: boolean; title: string; hint: string; onSelect: () => void }) {
  return (
    <label className={styles.choice}>
      <input type="radio" name={props.name} checked={props.checked} disabled={props.disabled} onChange={props.onSelect} />
      <span><strong>{props.title}</strong><span className={styles.choiceHint}>{props.hint}</span></span>
    </label>
  );
}

function MoreCandidates(props: { page: CandidatePage<unknown>; label: string; onLoadMore: () => void }) {
  if (props.page.status === 'error') {
    return (
      <p className={styles.formError} role="alert">
        Non è stato possibile caricare altri elementi.{' '}
        <button type="button" className={styles.linkButton} onClick={props.onLoadMore}>Riprova</button>
      </p>
    );
  }
  if (!props.page.hasMore) return null;
  return (
    <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onLoadMore} disabled={props.page.status === 'loading'}>
      {props.page.status === 'loading' ? 'Caricamento…' : props.label}
    </button>
  );
}

/** 1. A quale oggetto appartiene? Collegamenti espliciti prima, candidati senza preselezione. */
export function ObjectSection(props: SectionProps & { objects: ObjectRef[]; candidates: CandidatePage<ObjectRef>; onLoadMore: () => void }) {
  const { draft, state, errors } = props;
  const name = useId();
  const linked = props.objects.filter(o => o.linkedToDocument);
  const ambiguous = state.object.kind === 'unset' && props.objects.length > 1;
  const set = (object: ObjectChoice) => props.onChange({ ...state, object });
  const setValue = (field: FormField, value: string) => props.onChange({ ...state, values: { ...state.values, [field]: value } });
  const reuseId = state.object.kind === 'reuse' ? state.object.id : null;
  const selected = props.objects.find(o => o.id === reuseId);
  const comparisons = pendingComparisons(state, draft, props.objects);
  const disabled = !props.canEdit;
  const tag = linked.length ? 'Già collegato' : ambiguous ? 'Serve una scelta' : draft.origin === 'manual' ? 'Scheda manuale' : 'Proposta';
  return (
    <section className={ui.card} aria-labelledby={`${name}-title`}>
      <div className={styles.sectionHead}>
        <h2 id={`${name}-title`}>1. A quale oggetto appartiene?</h2>
        <Tag tone={linked.length ? 'blue' : ambiguous ? 'warn' : 'neutral'}>{tag}</Tag>
      </div>
      {ambiguous && <p className={styles.note}>Puoi scegliere una scheda già presente. Il nome da solo non basta: collegala soltanto se riguarda questo acquisto.</p>}
      <fieldset className={styles.fieldset} aria-invalid={errors.object ? true : undefined} aria-describedby={errors.object ? `${name}-err` : undefined}>
        <legend className="visually-hidden">Oggetto</legend>
        {props.objects.map(o => (
          <Choice key={o.id} name={name} disabled={disabled} checked={reuseId === o.id} onSelect={() => set({ kind: 'reuse', id: o.id })}
            title={`${o.name}${o.roomName ? ` · ${o.roomName}` : ''}`}
            hint={o.linkedToDocument ? 'Ricevuta già collegata: riutilizziamo la scheda senza duplicare il collegamento.' : `Già presente nella casa. ${reasonText(o.reasons)} Collegala solo se è lo stesso oggetto.`} />
        ))}
        <MoreCandidates page={props.candidates} label="Mostra altri oggetti" onLoadMore={props.onLoadMore} />
        {linked.length === 0 && (
          <Choice name={name} disabled={disabled} checked={state.object.kind === 'create'} onSelect={() => set({ kind: 'create' })}
            title="Crea un nuovo oggetto" hint="Solo se l’oggetto non è già presente nella casa." />
        )}
        <Choice name={name} disabled={disabled} checked={state.object.kind === 'skip'} onSelect={() => set({ kind: 'skip' })}
          title={linked.length ? 'Non modificare la scheda dell’oggetto' : 'Non associare un oggetto adesso'}
          hint={linked.length ? 'I collegamenti esistenti restano invariati.' : 'Puoi occuparti solo della spesa e collegarla più avanti.'} />
      </fieldset>
      {errors.object && <p id={`${name}-err`} className={styles.formError}>{errors.object}</p>}

      {state.object.kind === 'create' && (
        <div className={styles.fields}>
          <ReceiptFieldInput {...props} field="name" wide error={errors.name} disabled={disabled} onValue={setValue} />
          <ReceiptFieldInput {...props} field="brand" error={errors.brand} disabled={disabled} onValue={setValue} />
          <ReceiptFieldInput {...props} field="model" error={errors.model} disabled={disabled} onValue={setValue} />
          <p className={cx(styles.note, styles.wide)}>Oggetto personale. Ambiente da scegliere in seguito dalla scheda.</p>
        </div>
      )}

      {selected && draft.origin === 'extraction' && (
        <>
          <label className={styles.check}>
            <input type="checkbox" checked={state.enrich} disabled={disabled} onChange={(e) => props.onChange({ ...state, enrich: e.target.checked })} />
            <span>
              <strong>{comparisons.length ? 'Rivedi le differenze con la scheda' : 'Completa i campi vuoti con i dati della ricevuta'}</strong>
              <span className={styles.choiceHint}>I valori già confermati non vengono sovrascritti.</span>
            </span>
          </label>
          {state.enrich && (
            <>
              {comparisons.length > 0 && (
                <p className={styles.note}>La ricevuta e la scheda non coincidono. Controlla che siano lo stesso oggetto: nessun valore confermato viene sostituito.</p>
              )}
              {comparisons.map(c => (
                <ComparisonField key={c.key} comparison={c} decision={state.decisions[c.key]} disabled={disabled}
                  onDecide={(key, decision) => props.onChange({ ...state, decisions: { ...state.decisions, [key]: decision } })}
                  onShowSource={props.onShowSource} />
              ))}
              {errors.comparisons && <p className={styles.formError}>{errors.comparisons}</p>}
              {(!selected.brand || !selected.model) && (
                <div className={styles.fields}>
                  {!selected.brand && <ReceiptFieldInput {...props} field="brand" error={errors.brand} disabled={disabled} onValue={setValue} />}
                  {!selected.model && <ReceiptFieldInput {...props} field="model" error={errors.model} disabled={disabled} onValue={setValue} />}
                </div>
              )}
              <p className={styles.note}>Se la scheda è sbagliata, correggila con una modifica esplicita dalla scheda dell’oggetto.</p>
            </>
          )}
        </>
      )}
    </section>
  );
}

/** 2. Che cosa facciamo con la spesa? Una spesa collegata si riusa senza nuova registrazione. */
export function ExpenseSection(props: SectionProps & { expenses: ExpenseRef[]; candidates: CandidatePage<ExpenseRef>; onLoadMore: () => void }) {
  const { draft, state, errors } = props;
  const name = useId();
  const linked = props.expenses.filter(e => e.linkedToDocument);
  const set = (expense: ExpenseChoice) => props.onChange({ ...state, expense });
  const setValue = (field: FormField, value: string) => props.onChange({ ...state, values: { ...state.values, [field]: value } });
  const reuseId = state.expense.kind === 'reuse' ? state.expense.id : null;
  const disabled = !props.canEdit;
  return (
    <section className={ui.card} aria-labelledby={`${name}-title`}>
      <div className={styles.sectionHead}>
        <h2 id={`${name}-title`}>2. Che cosa facciamo con la spesa?</h2>
        <Tag tone={linked.length ? 'blue' : 'neutral'}>{linked.length ? 'Spesa già collegata' : draft.origin === 'manual' ? 'Compilazione manuale' : 'Proposta da confermare'}</Tag>
      </div>
      <fieldset className={styles.fieldset} aria-invalid={errors.expense ? true : undefined} aria-describedby={errors.expense ? `${name}-err` : undefined}>
        <legend className="visually-hidden">Spesa</legend>
        {props.expenses.map(e => (
          <Choice key={e.id} name={name} disabled={disabled} checked={reuseId === e.id} onSelect={() => set({ kind: 'reuse', id: e.id })}
            title={`${e.linkedToDocument ? 'Mantieni la spesa già registrata' : 'Usa questa spesa'}: ${e.title}`}
            hint={`${formatCents(e.amountCents)} · ${formatDate(e.spentOn)}. ${e.linkedToDocument ? 'Nessuna nuova registrazione, nessun importo sovrascritto.' : `${reasonText(e.reasons)} Collegala solo se è lo stesso acquisto.`}`} />
        ))}
        <MoreCandidates page={props.candidates} label="Mostra altre spese" onLoadMore={props.onLoadMore} />
        {linked.length === 0 && (
          <Choice name={name} disabled={disabled} checked={state.expense.kind === 'create'} onSelect={() => set({ kind: 'create' })}
            title="Registra il costo d’acquisto" hint="Una sola registrazione in Spese, collegata a questa ricevuta." />
        )}
        <Choice name={name} disabled={disabled} checked={state.expense.kind === 'skip'} onSelect={() => set({ kind: 'skip' })}
          title={linked.length ? 'Non intervenire sulla spesa' : 'Non registrare il costo adesso'}
          hint={linked.length ? 'La spesa esistente resta conservata e collegata.' : 'Puoi occuparti solo dell’oggetto.'} />
      </fieldset>
      {errors.expense && <p id={`${name}-err`} className={styles.formError}>{errors.expense}</p>}
      {state.expense.kind === 'create' && (
        <div className={styles.fields}>
          <ReceiptFieldInput {...props} field="title" wide error={errors.title} disabled={disabled} onValue={setValue} />
          <ReceiptFieldInput {...props} field="amount" error={errors.amount} disabled={disabled} onValue={setValue} />
          <ReceiptFieldInput {...props} field="date" error={errors.date} disabled={disabled} onValue={setValue} />
          <ReceiptFieldInput {...props} field="supplier" wide error={errors.supplier} disabled={disabled} onValue={setValue} />
          <p className={cx(styles.note, styles.wide)}>Categoria: Acquisti. Registrare un costo non equivale a dichiarare un pagamento.</p>
        </div>
      )}
    </section>
  );
}
