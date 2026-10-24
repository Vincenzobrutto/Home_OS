import type { Draft, Form } from './model';
import { ui } from '../components/ui';
import styles from './compilationSteps.module.css';

/** One row per article: only the direction is chosen here. Native radios, drawn as pills (keyboard arrows still work). */
export function CompilationContent({ draft, forms, disabled, change, add }: { draft: Draft; forms: Record<string, Form>; disabled: boolean; change: (id: string, form: Form) => void; add: () => void }) {
  const invoice = draft.houseExpenses?.some(expense => expense.documentKind === 'simple_invoice');
  return <div className={styles.stack}>
    {draft.items.filter(item => !item.decision || item.decision.state === 'deferred').map((item, index) => {
      const form = forms[item.id]!;
      return <fieldset key={item.id} disabled={disabled} className={styles.row}><legend className={styles.rowTitle}>Articolo {index + 1} · {form.name || 'Da identificare'}</legend>
        <div className={styles.directions}>{([
          ['create', 'Nuovo oggetto'], ['link', 'Collega a un oggetto'],
          ...(invoice ? [['document_only', 'Solo spesa, nessun oggetto']] : ['conformity_declaration', 'house_document'].includes(draft.documentKind) ? [['document_only', 'Solo documento, nessun oggetto']] : []),
          ['skip', 'Non riguarda la casa'],
        ] as Array<[Form['action'], string]>).map(([action, label]) => <label key={action} className={styles.pill}><input className={styles.pillInput} type="radio" name={'direction-' + draft.id + '-' + item.id} checked={form.action === action} onChange={() => change(item.id, { ...form, action })} />{label}</label>)}</div>
        {form.action === 'create' && <p className={styles.rowHint}>La prossima scheda prepara un nuovo oggetto da confermare alla fine.</p>}
        {form.action === 'link' && <p className={styles.rowHint}>Sceglierai una scheda già presente: i dati confermati non vengono sovrascritti automaticamente.</p>}
        {form.action === 'skip' && <p className={styles.rowHint}>Questo articolo non crea oggetti né costi.</p>}
        {form.action === 'document_only' && <p className={styles.rowHint}>{invoice ? 'Il costo complessivo si controlla nella scheda Spese, una sola volta per il documento.' : 'Conservi il documento senza creare una scheda.'}</p>}
      </fieldset>;
    })}
    <button type="button" className={`${ui.btn} ${styles.add}`} disabled={disabled || draft.items.length >= 20} onClick={add}>Aggiungi un altro articolo</button>
  </div>;
}
